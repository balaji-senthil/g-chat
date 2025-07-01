#!/bin/bash

# ECS Deployment Script for AI Chat App Backend
# Usage: ./deploy-ecs.sh [environment]

set -e

# Configuration
ENVIRONMENT=${1:-staging}
AWS_REGION=${AWS_REGION:-us-east-1}
CLUSTER_NAME="ai-chat-app-cluster"
SERVICE_NAME="ai-chat-backend-service"
TASK_DEFINITION_FAMILY="ai-chat-app-backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting ECS deployment for ${ENVIRONMENT} environment${NC}"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install it first.${NC}"
    exit 1
fi

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${YELLOW}📋 AWS Account ID: ${ACCOUNT_ID}${NC}"

# Build and push Docker image
echo -e "${YELLOW}🐳 Building Docker image...${NC}"
docker build -t ai-chat-backend .

# Tag for ECR
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/ai-chat-backend"
docker tag ai-chat-backend:latest ${ECR_URI}:latest
docker tag ai-chat-backend:latest ${ECR_URI}:${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S)

echo -e "${YELLOW}📤 Pushing to ECR...${NC}"
# Login to ECR
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_URI}

# Create ECR repository if it doesn't exist
aws ecr describe-repositories --repository-names ai-chat-backend --region ${AWS_REGION} 2>/dev/null || \
aws ecr create-repository --repository-name ai-chat-backend --region ${AWS_REGION}

# Push image
docker push ${ECR_URI}:latest

# Update task definition
echo -e "${YELLOW}📝 Updating task definition...${NC}"
TASK_DEFINITION=$(cat ecs-task-definition.json | \
    sed "s/{ACCOUNT_ID}/${ACCOUNT_ID}/g" | \
    sed "s/{REGION}/${AWS_REGION}/g")

# Register new task definition
NEW_TASK_DEFINITION=$(echo $TASK_DEFINITION | aws ecs register-task-definition --cli-input-json file:///dev/stdin)
NEW_REVISION=$(echo $NEW_TASK_DEFINITION | jq -r '.taskDefinition.revision')

echo -e "${GREEN}✅ New task definition revision: ${NEW_REVISION}${NC}"

# Update service
echo -e "${YELLOW}🔄 Updating ECS service...${NC}"
aws ecs update-service \
    --cluster ${CLUSTER_NAME} \
    --service ${SERVICE_NAME} \
    --task-definition ${TASK_DEFINITION_FAMILY}:${NEW_REVISION} \
    --region ${AWS_REGION}

# Wait for deployment to complete
echo -e "${YELLOW}⏳ Waiting for deployment to complete...${NC}"
aws ecs wait services-stable \
    --cluster ${CLUSTER_NAME} \
    --services ${SERVICE_NAME} \
    --region ${AWS_REGION}

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"

# Get service URL
LOAD_BALANCER_DNS=$(aws elbv2 describe-load-balancers \
    --query "LoadBalancers[?contains(LoadBalancerName, 'ai-chat')].DNSName" \
    --output text \
    --region ${AWS_REGION})

if [ ! -z "$LOAD_BALANCER_DNS" ]; then
    echo -e "${GREEN}🌐 Your backend is available at: https://${LOAD_BALANCER_DNS}${NC}"
else
    echo -e "${YELLOW}ℹ️  To get your backend URL, check your load balancer in AWS Console${NC}"
fi 