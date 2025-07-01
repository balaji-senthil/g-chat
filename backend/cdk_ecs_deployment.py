#!/usr/bin/env python3
"""
AWS CDK deployment script for AI Chat Backend on ECS
Optimized for AWS Free Tier usage
"""

import os
from aws_cdk import (
    App,
    Stack,
    Environment,
    Duration,
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_ecs_patterns as ecs_patterns,
    aws_ecr as ecr,
    aws_logs as logs,
    aws_iam as iam,
    aws_ssm as ssm,
    aws_elasticloadbalancingv2 as elbv2,
    aws_certificatemanager as acm,
    aws_route53 as route53,
    RemovalPolicy,
    CfnOutput,
)
from constructs import Construct


class AiChatEcsStack(Stack):
    """
    ECS Stack for AI Chat Backend optimized for AWS Free Tier

    Key Free Tier Benefits:
    - ECS is always free (pay only for compute resources)
    - EC2 t2.micro: 750 hours/month free for 12 months
    - ECR: 500 MB storage free for 12 months
    - ALB: 750 hours/month free for 12 months
    """

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Environment variables
        self.account_id = self.account
        self.current_region = self.region

        # Create VPC (free within limits)
        self.vpc = self._create_vpc()

        # Create ECS Cluster (always free)
        self.cluster = self._create_ecs_cluster()

        # Create ECR Repository (500MB free) or import existing one
        self.ecr_repo = self._create_ecr_repository()

        # Create IAM Roles
        self.execution_role, self.task_role = self._create_iam_roles()

        # Create placeholder secrets if they don't exist
        self._create_placeholder_secrets()

        # Create ECS Service with Fargate (free tier optimized)
        # This will create its own load balancer automatically
        self.service = self._create_ecs_service()

        # Output important values
        self._create_outputs()

    def _create_vpc(self) -> ec2.Vpc:
        """Create VPC with public subnets only (free tier optimized)"""
        return ec2.Vpc(
            self,
            "AiChatVpc",
            max_azs=2,  # Minimum for ALB
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name="PublicSubnet",
                    subnet_type=ec2.SubnetType.PUBLIC,
                    cidr_mask=24,
                )
            ],
            enable_dns_hostnames=True,
            enable_dns_support=True,
        )

    def _create_ecs_cluster(self) -> ecs.Cluster:
        """Create ECS Cluster (always free)"""
        return ecs.Cluster(
            self,
            "AiChatCluster",
            cluster_name="ai-chat-app-cluster",
            vpc=self.vpc,
            enable_fargate_capacity_providers=True,
        )

    def _create_ecr_repository(self) -> ecr.Repository:
        """Create ECR Repository (500MB free) or import existing one"""
        return ecr.Repository.from_repository_name(
            self, "AiChatEcrRepo", repository_name="ai-chat-backend"
        )

    def _create_iam_roles(self) -> tuple[iam.Role, iam.Role]:
        """Create IAM roles for ECS tasks"""

        # Task Execution Role (required for Fargate)
        execution_role = iam.Role(
            self,
            "EcsTaskExecutionRole",
            role_name="ai-chat-ecs-execution-role",
            assumed_by=iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AmazonECSTaskExecutionRolePolicy"
                ),
            ],
        )

        # Add SSM permissions for secrets
        execution_role.add_to_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=[
                    "ssm:GetParameters",
                    "ssm:GetParameter",
                    "ssm:GetParametersByPath",
                ],
                resources=[
                    f"arn:aws:ssm:{self.current_region}:{self.account_id}:parameter/ai-chat-app/*"
                ],
            )
        )

        # Task Role (for application permissions)
        task_role = iam.Role(
            self,
            "EcsTaskRole",
            role_name="ai-chat-ecs-task-role",
            assumed_by=iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "AmazonSSMReadOnlyAccess"
                ),
            ],
        )

        return execution_role, task_role

    def _create_placeholder_secrets(self):
        """Create placeholder secrets if they don't exist"""
        import boto3
        from botocore.exceptions import ClientError

        ssm_client = boto3.client("ssm", region_name=self.current_region)

        secrets = {
            "/ai-chat-app/database-url": "postgresql://placeholder:placeholder@localhost:5432/placeholder",
            "/ai-chat-app/google-api-key": "placeholder-google-api-key-update-after-deployment",
            "/ai-chat-app/secret-key": "placeholder-secret-key-change-me-to-something-secure-32-chars-minimum",
        }

        for param_name, default_value in secrets.items():
            try:
                # Check if parameter exists
                ssm_client.get_parameter(Name=param_name)
                print(f"✅ Parameter {param_name} already exists")
            except ClientError as e:
                if e.response["Error"]["Code"] == "ParameterNotFound":
                    # Create the parameter
                    ssm_client.put_parameter(
                        Name=param_name,
                        Value=default_value,
                        Type="SecureString",
                        Description=f"AI Chat App parameter - {param_name.split('/')[-1]}",
                    )
                    print(f"🔧 Created placeholder parameter: {param_name}")
                else:
                    print(f"❌ Error checking parameter {param_name}: {e}")

    def _create_ecs_service(self) -> ecs_patterns.ApplicationLoadBalancedFargateService:
        """Create ECS Fargate service optimized for free tier"""

        # Use the high-level ApplicationLoadBalancedFargateService pattern
        # This automatically creates the load balancer, target group, and wires everything together
        service = ecs_patterns.ApplicationLoadBalancedFargateService(
            self,
            "AiChatFargateService",
            cluster=self.cluster,
            memory_limit_mib=512,  # Minimum for Fargate
            cpu=256,  # Minimum for Fargate
            desired_count=1,  # Keep minimal for free tier
            task_image_options=ecs_patterns.ApplicationLoadBalancedTaskImageOptions(
                image=ecs.ContainerImage.from_ecr_repository(
                    repository=self.ecr_repo, tag="latest"
                ),
                container_name="ai-chat-backend",
                container_port=8000,
                environment={
                    # Non-sensitive environment variables
                    "PORT": "8000",
                    "HOST": "0.0.0.0",
                    "DEBUG": "false",
                    "ALLOWED_ORIGINS": "https://ai-chat-app-jqav.vercel.app,https://balaji-senthil.github.io,http://localhost:5173,http://localhost:3000",
                    "ALGORITHM": "HS256",
                    "ACCESS_TOKEN_EXPIRE_MINUTES": "30",
                    "RATE_LIMIT_ENABLED": "true",
                    # Temporary placeholder values - update these after deployment
                    "DATABASE_URL": "postgresql://placeholder:placeholder@localhost:5432/placeholder",
                    "GOOGLE_API_KEY": "placeholder-google-api-key-update-after-deployment",
                    "SECRET_KEY": "placeholder-secret-key-change-me-to-something-secure-32-chars-minimum",
                },
                log_driver=ecs.LogDrivers.aws_logs(
                    stream_prefix="ecs",
                    log_group=logs.LogGroup(
                        self,
                        "AiChatLogGroup",
                        log_group_name="/ecs/ai-chat-app-backend",
                        retention=logs.RetentionDays.ONE_WEEK,  # Keep costs minimal
                        removal_policy=RemovalPolicy.DESTROY,
                    ),
                ),
                execution_role=self.execution_role,
                task_role=self.task_role,
            ),
            public_load_balancer=True,
            platform_version=ecs.FargatePlatformVersion.LATEST,
            assign_public_ip=True,
        )

        # Configure health check on the target group
        service.target_group.configure_health_check(
            path="/health",
            healthy_http_codes="200",
            interval=Duration.seconds(60),
            timeout=Duration.seconds(30),
            healthy_threshold_count=2,
            unhealthy_threshold_count=5,
        )

        return service

    def _create_outputs(self) -> None:
        """Create CloudFormation outputs"""
        CfnOutput(
            self,
            "LoadBalancerDns",
            value=self.service.load_balancer.load_balancer_dns_name,
            description="DNS name of the load balancer",
        )

        CfnOutput(
            self,
            "LoadBalancerUrl",
            value=f"http://{self.service.load_balancer.load_balancer_dns_name}",
            description="URL of the deployed application",
        )

        CfnOutput(
            self,
            "EcrRepositoryUri",
            value=self.ecr_repo.repository_uri,
            description="ECR repository URI for container images",
        )

        CfnOutput(
            self,
            "ClusterName",
            value=self.cluster.cluster_name,
            description="ECS cluster name",
        )

        CfnOutput(
            self,
            "UpdateSecretsCommand",
            value=f"aws ssm put-parameter --name '/ai-chat-app/database-url' --value 'your-real-database-url' --type 'SecureString' --overwrite --region {self.current_region}",
            description="Command to update database URL secret",
        )


def main():
    """Main CDK app"""
    app = App()

    # Get environment from context or environment variables
    account = app.node.try_get_context("account") or os.environ.get(
        "CDK_DEFAULT_ACCOUNT"
    )
    region = app.node.try_get_context("region") or os.environ.get(
        "CDK_DEFAULT_REGION", "us-east-1"
    )

    if not account:
        raise ValueError(
            "AWS account ID must be provided via CDK_DEFAULT_ACCOUNT or --context account=123456789012"
        )

    AiChatEcsStack(
        app,
        "AiChatEcsStack",
        env=Environment(account=account, region=region),
        description="AI Chat Backend on ECS Fargate (Free Tier Optimized)",
    )

    app.synth()


if __name__ == "__main__":
    main()
