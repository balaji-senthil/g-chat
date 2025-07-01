#!/usr/bin/env python3
"""
AWS Free Tier Usage Monitor for ECS Deployment
Helps track usage against free tier limits to avoid unexpected charges
"""

import boto3
import json
from datetime import datetime, timedelta
from botocore.exceptions import ClientError, NoCredentialsError


class FreeTierMonitor:
    def __init__(self):
        """Initialize AWS clients"""
        try:
            self.ce_client = boto3.client("ce")  # Cost Explorer
            self.ec2_client = boto3.client("ec2")
            self.ecs_client = boto3.client("ecs")
            self.ecr_client = boto3.client("ecr")
            self.logs_client = boto3.client("logs")
            self.elbv2_client = boto3.client("elbv2")

            # Get account info
            sts_client = boto3.client("sts")
            self.account_id = sts_client.get_caller_identity()["Account"]
            self.region = boto3.Session().region_name

        except NoCredentialsError:
            print("❌ AWS credentials not configured. Run 'aws configure' first.")
            exit(1)
        except Exception as e:
            print(f"❌ Error initializing AWS clients: {e}")
            exit(1)

    def get_current_month_usage(self):
        """Get current month's usage for free tier services"""

        # Calculate date range for current month
        now = datetime.now()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        try:
            response = self.ce_client.get_cost_and_usage(
                TimePeriod={
                    "Start": start_of_month.strftime("%Y-%m-%d"),
                    "End": now.strftime("%Y-%m-%d"),
                },
                Granularity="MONTHLY",
                Metrics=["BlendedCost"],
                GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}],
            )

            services_cost = {}
            for result in response["ResultsByTime"]:
                for group in result["Groups"]:
                    service_name = group["Keys"][0]
                    cost = float(group["Metrics"]["BlendedCost"]["Amount"])
                    services_cost[service_name] = cost

            return services_cost

        except ClientError as e:
            print(f"⚠️  Could not fetch cost data: {e}")
            return {}

    def check_ecs_usage(self):
        """Check ECS cluster and service usage"""
        print("\n🐳 ECS Usage:")

        try:
            # List ECS clusters
            clusters = self.ecs_client.list_clusters()
            ai_chat_clusters = [
                c for c in clusters["clusterArns"] if "ai-chat" in c.lower()
            ]

            if not ai_chat_clusters:
                print("   ❌ No AI Chat ECS clusters found")
                return

            for cluster_arn in ai_chat_clusters:
                cluster_name = cluster_arn.split("/")[-1]
                print(f"   📊 Cluster: {cluster_name}")

                # Get services in cluster
                services = self.ecs_client.list_services(cluster=cluster_arn)

                for service_arn in services["serviceArns"]:
                    service_name = service_arn.split("/")[-1]

                    # Get service details
                    service_details = self.ecs_client.describe_services(
                        cluster=cluster_arn, services=[service_arn]
                    )

                    service = service_details["services"][0]
                    print(f"     🔧 Service: {service_name}")
                    print(f"        Desired: {service['desiredCount']} tasks")
                    print(f"        Running: {service['runningCount']} tasks")
                    print(f"        Status: {service['status']}")

                    # Get task definition details
                    task_def = self.ecs_client.describe_task_definition(
                        taskDefinition=service["taskDefinition"]
                    )

                    cpu = task_def["taskDefinition"]["cpu"]
                    memory = task_def["taskDefinition"]["memory"]
                    print(f"        CPU: {cpu} units, Memory: {memory} MB")

                    # Calculate approximate monthly hours
                    running_hours_per_day = service["runningCount"] * 24
                    estimated_monthly_hours = running_hours_per_day * 30

                    print(f"        📈 Est. monthly hours: {estimated_monthly_hours}")

                    if estimated_monthly_hours > 750:
                        print(
                            f"        ⚠️  WARNING: Exceeds free tier limit (750 hours/month)"
                        )
                    else:
                        print(f"        ✅ Within free tier limit")

        except Exception as e:
            print(f"   ❌ Error checking ECS usage: {e}")

    def check_ecr_usage(self):
        """Check ECR repository usage"""
        print("\n📦 ECR Usage:")

        try:
            repositories = self.ecr_client.describe_repositories()

            ai_chat_repos = [
                r
                for r in repositories["repositories"]
                if "ai-chat" in r["repositoryName"].lower()
            ]

            if not ai_chat_repos:
                print("   ❌ No AI Chat ECR repositories found")
                return

            total_size_mb = 0

            for repo in ai_chat_repos:
                repo_name = repo["repositoryName"]
                repo_size_bytes = repo.get("repositorySizeInBytes", 0)
                repo_size_mb = repo_size_bytes / (1024 * 1024)
                total_size_mb += repo_size_mb

                print(f"   📊 Repository: {repo_name}")
                print(f"      Size: {repo_size_mb:.2f} MB")
                print(f"      Images: {repo.get('imageTagMutability', 'Unknown')}")

            print(f"\n   📈 Total ECR usage: {total_size_mb:.2f} MB")

            if total_size_mb > 500:
                print("   ⚠️  WARNING: Exceeds free tier limit (500 MB)")
            else:
                remaining = 500 - total_size_mb
                print(f"   ✅ Within free tier limit ({remaining:.2f} MB remaining)")

        except Exception as e:
            print(f"   ❌ Error checking ECR usage: {e}")

    def check_alb_usage(self):
        """Check Application Load Balancer usage"""
        print("\n⚖️  Load Balancer Usage:")

        try:
            load_balancers = self.elbv2_client.describe_load_balancers()

            ai_chat_albs = [
                lb
                for lb in load_balancers["LoadBalancers"]
                if "ai-chat" in lb["LoadBalancerName"].lower()
            ]

            if not ai_chat_albs:
                print("   ❌ No AI Chat Load Balancers found")
                return

            for alb in ai_chat_albs:
                name = alb["LoadBalancerName"]
                state = alb["State"]["Code"]
                scheme = alb["Scheme"]
                created = alb["CreatedTime"]

                print(f"   📊 Load Balancer: {name}")
                print(f"      State: {state}")
                print(f"      Scheme: {scheme}")
                print(f"      Created: {created.strftime('%Y-%m-%d %H:%M:%S')}")

                # Calculate hours since creation this month
                now = datetime.now(created.tzinfo)
                start_of_month = now.replace(
                    day=1, hour=0, minute=0, second=0, microsecond=0
                )

                if created < start_of_month:
                    hours_this_month = (now - start_of_month).total_seconds() / 3600
                else:
                    hours_this_month = (now - created).total_seconds() / 3600

                print(f"      📈 Hours this month: {hours_this_month:.1f}")

                if hours_this_month > 750:
                    print("      ⚠️  WARNING: Exceeds free tier limit (750 hours/month)")
                else:
                    remaining = 750 - hours_this_month
                    print(
                        f"      ✅ Within free tier limit ({remaining:.1f} hours remaining)"
                    )

        except Exception as e:
            print(f"   ❌ Error checking ALB usage: {e}")

    def check_cloudwatch_logs(self):
        """Check CloudWatch Logs usage"""
        print("\n📊 CloudWatch Logs Usage:")

        try:
            log_groups = self.logs_client.describe_log_groups(
                logGroupNamePrefix="/ecs/ai-chat"
            )

            if not log_groups["logGroups"]:
                print("   ❌ No AI Chat log groups found")
                return

            total_stored_mb = 0

            for log_group in log_groups["logGroups"]:
                name = log_group["logGroupName"]
                stored_bytes = log_group.get("storedBytes", 0)
                stored_mb = stored_bytes / (1024 * 1024)
                total_stored_mb += stored_mb

                retention = log_group.get("retentionInDays", "Never")

                print(f"   📊 Log Group: {name}")
                print(f"      Stored: {stored_mb:.2f} MB")
                print(f"      Retention: {retention} days")

            print(f"\n   📈 Total logs stored: {total_stored_mb:.2f} MB")
            print("   ℹ️  Free tier includes 5 GB ingestion/month (not storage)")

        except Exception as e:
            print(f"   ❌ Error checking CloudWatch logs: {e}")

    def get_cost_summary(self):
        """Get overall cost summary"""
        print("\n💰 Cost Summary:")

        costs = self.get_current_month_usage()

        if not costs:
            print("   ⚠️  Could not retrieve cost data")
            return

        total_cost = sum(costs.values())
        print(f"   📈 Total month-to-date cost: ${total_cost:.2f}")

        # Show relevant services
        relevant_services = [
            "Amazon Elastic Container Service",
            "Amazon EC2-Instance",
            "Amazon Elastic Load Balancing",
            "Amazon EC2 Container Registry (ECR)",
            "Amazon CloudWatch Logs",
        ]

        for service in relevant_services:
            cost = costs.get(service, 0)
            if cost > 0:
                print(f"   💸 {service}: ${cost:.2f}")

        if total_cost == 0:
            print("   ✅ All services currently in free tier!")
        elif total_cost < 5:
            print("   ✅ Low cost - likely within free tier limits")
        else:
            print("   ⚠️  Cost detected - monitor usage carefully")

    def run_full_check(self):
        """Run complete free tier usage check"""
        print("🔍 AWS Free Tier Usage Monitor")
        print("=" * 50)
        print(f"Account: {self.account_id}")
        print(f"Region: {self.region}")
        print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        self.check_ecs_usage()
        self.check_ecr_usage()
        self.check_alb_usage()
        self.check_cloudwatch_logs()
        self.get_cost_summary()

        print("\n" + "=" * 50)
        print("💡 Tips to stay within free tier:")
        print("   • Keep ECS tasks under 750 hours/month")
        print("   • Monitor ECR storage (500 MB limit)")
        print("   • Use log retention policies")
        print("   • Set up billing alarms")
        print("   • Review AWS Free Tier dashboard regularly")


def main():
    """Main function"""
    monitor = FreeTierMonitor()
    monitor.run_full_check()


if __name__ == "__main__":
    main()
