#!/usr/bin/env python3

import os
from aws_cdk import App, Environment
from cdk_ecs_deployment import AiChatEcsStack


def main():
    """Main CDK app entry point"""
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

    # Create the ECS stack
    AiChatEcsStack(
        app,
        "AiChatEcsStack",
        env=Environment(account=account, region=region),
        description="AI Chat Backend on ECS Fargate (Free Tier Optimized)",
    )

    app.synth()


if __name__ == "__main__":
    main()
