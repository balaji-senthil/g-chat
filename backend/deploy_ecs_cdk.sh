#!/bin/bash

# AI Chat App - One-Time ECS CDK Deployment Script
# This script automates the complete deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGION=${AWS_DEFAULT_REGION:-us-east-1}
REPOSITORY_NAME="ai-chat-backend"
STACK_NAME="AiChatEcsStack"

echo -e "${BLUE}🚀 AI Chat App - AWS ECS CDK Deployment${NC}"
echo -e "${BLUE}=====================================\n${NC}"

# Function to print status messages
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Prerequisites check
echo -e "${BLUE}📋 Checking Prerequisites...${NC}"

# Check Python
if command_exists python3; then
    PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
    print_status "Python ${PYTHON_VERSION} found"
    PYTHON_CMD="python3"
elif command_exists python; then
    PYTHON_VERSION=$(python --version 2>&1 | cut -d' ' -f2)
    print_status "Python ${PYTHON_VERSION} found"
    PYTHON_CMD="python"
else
    print_error "Python not found. Please install Python 3.9+"
    exit 1
fi

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    print_status "Node.js ${NODE_VERSION} found"
else
    print_error "Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check AWS CLI
if command_exists aws; then
    AWS_VERSION=$(aws --version 2>&1 | cut -d' ' -f1)
    print_status "${AWS_VERSION} found"
else
    print_error "AWS CLI not found. Please install AWS CLI"
    exit 1
fi

# Check Docker
if command_exists docker; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | tr -d ',')
    print_status "Docker ${DOCKER_VERSION} found"
else
    print_error "Docker not found. Please install Docker"
    exit 1
fi

# Check AWS credentials
print_info "Checking AWS credentials..."
if aws sts get-caller-identity > /dev/null 2>&1; then
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    AWS_USER=$(aws sts get-caller-identity --query Arn --output text)
    print_status "AWS credentials configured for account: ${ACCOUNT_ID}"
    print_info "User: ${AWS_USER}"
else
    print_error "AWS credentials not configured. Run 'aws configure'"
    exit 1
fi

echo ""

# Install dependencies
echo -e "${BLUE}📦 Installing Dependencies...${NC}"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    print_info "Creating Python virtual environment..."
    $PYTHON_CMD -m venv venv
fi

# Activate virtual environment
print_info "Activating virtual environment..."
source venv/bin/activate

# Install Python dependencies
print_info "Installing Python dependencies..."
pip install -q -r requirements.txt
pip install -q -r cdk_requirements.txt
print_status "Python dependencies installed"

# Install CDK CLI if not present
if ! command_exists cdk; then
    print_info "Installing AWS CDK CLI..."
    npm install -g aws-cdk
    print_status "AWS CDK CLI installed"
else
    CDK_VERSION=$(cdk --version)
    print_status "AWS CDK CLI ${CDK_VERSION} found"
fi

echo ""

# Bootstrap CDK if needed
echo -e "${BLUE}🔧 CDK Bootstrap Check...${NC}"
print_info "Checking if CDK is bootstrapped in region ${REGION}..."

# Check if bootstrap stack exists
if aws cloudformation describe-stacks --stack-name CDKToolkit --region $REGION > /dev/null 2>&1; then
    print_status "CDK already bootstrapped in ${REGION}"
else
    print_warning "CDK not bootstrapped in ${REGION}. Bootstrapping now..."
    cdk bootstrap --region $REGION
    print_status "CDK bootstrapped successfully"
fi

echo ""

# Create ECR repository
echo -e "${BLUE}🏗️  Setting up ECR Repository...${NC}"

if aws ecr describe-repositories --repository-names $REPOSITORY_NAME --region $REGION > /dev/null 2>&1; then
    print_status "ECR repository '${REPOSITORY_NAME}' already exists"
else
    print_info "Creating ECR repository '${REPOSITORY_NAME}'..."
    aws ecr create-repository --repository-name $REPOSITORY_NAME --region $REGION > /dev/null
    print_status "ECR repository created"
fi

echo ""

# Build and push Docker image
echo -e "${BLUE}🐳 Building and Pushing Docker Image...${NC}"

print_info "Building Docker image..."
docker build -t $REPOSITORY_NAME . --quiet

print_info "Logging into ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

print_info "Tagging image for ECR..."
docker tag ${REPOSITORY_NAME}:latest ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPOSITORY_NAME}:latest

print_info "Pushing image to ECR..."
docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPOSITORY_NAME}:latest > /dev/null

print_status "Docker image pushed to ECR successfully"

echo ""

# Validate CDK app
echo -e "${BLUE}🔍 Validating CDK Application...${NC}"
print_info "Running CDK synthesis check..."
if cdk synth > /dev/null 2>&1; then
    print_status "CDK application validated successfully"
else
    print_error "CDK synthesis failed. Please check your CDK code"
    exit 1
fi

echo ""

# Deploy with CDK
echo -e "${BLUE}🚀 Deploying Infrastructure with CDK...${NC}"
print_warning "This will create AWS resources. Continuing in 5 seconds..."
sleep 5

print_info "Deploying CDK stack '${STACK_NAME}'..."
echo -e "${YELLOW}Note: You may be prompted to approve security changes. Type 'y' to continue.${NC}"
echo ""

# Deploy with approval
if cdk deploy --require-approval never; then
    print_status "CDK deployment completed successfully!"
else
    print_error "CDK deployment failed"
    exit 1
fi

echo ""

# Get deployment outputs
echo -e "${BLUE}📋 Deployment Summary...${NC}"

LOAD_BALANCER_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerUrl`].OutputValue' \
    --output text \
    --region $REGION)

ECR_URI=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`EcrRepositoryUri`].OutputValue' \
    --output text \
    --region $REGION)

CLUSTER_NAME=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`ClusterName`].OutputValue' \
    --output text \
    --region $REGION)

echo ""
print_status "🎉 Deployment Complete!"
echo ""
echo -e "${GREEN}📡 Application URL:${NC} ${LOAD_BALANCER_URL}"
echo -e "${GREEN}📦 ECR Repository:${NC} ${ECR_URI}"
echo -e "${GREEN}🖥️  ECS Cluster:${NC} ${CLUSTER_NAME}"
echo ""

# Wait for service to be stable
echo -e "${BLUE}⏳ Waiting for ECS service to stabilize...${NC}"
print_info "This may take a few minutes..."

SERVICE_NAME=$(aws ecs list-services \
    --cluster $CLUSTER_NAME \
    --query 'serviceArns[0]' \
    --output text \
    --region $REGION | cut -d'/' -f3)

if aws ecs wait services-stable \
    --cluster $CLUSTER_NAME \
    --services $SERVICE_NAME \
    --region $REGION; then
    print_status "ECS service is running and healthy!"
else
    print_warning "Service may still be starting. Check ECS console for status."
fi

echo ""

# Test health endpoint
echo -e "${BLUE}🔍 Testing Application Health...${NC}"
print_info "Waiting for load balancer to be ready..."
sleep 30

if curl -s --max-time 10 "${LOAD_BALANCER_URL}/health" > /dev/null 2>&1; then
    HEALTH_RESPONSE=$(curl -s "${LOAD_BALANCER_URL}/health")
    print_status "Health check passed: ${HEALTH_RESPONSE}"
else
    print_warning "Health check failed. The application may still be starting."
    print_info "Try again in a few minutes: curl ${LOAD_BALANCER_URL}/health"
fi

echo ""

# Next steps
echo -e "${BLUE}📝 Next Steps:${NC}"
echo ""
echo "1. 🔐 Update your secrets (IMPORTANT):"
echo -e "   ${YELLOW}# Database URL${NC}"
echo "   aws ssm put-parameter --name '/ai-chat-app/database-url' \\"
echo "     --value 'your-actual-database-url' --type 'SecureString' \\"
echo "     --overwrite --region ${REGION}"
echo ""
echo -e "   ${YELLOW}# Google API Key${NC}"
echo "   aws ssm put-parameter --name '/ai-chat-app/google-api-key' \\"
echo "     --value 'your-actual-google-api-key' --type 'SecureString' \\"
echo "     --overwrite --region ${REGION}"
echo ""
echo -e "   ${YELLOW}# Secret Key${NC}"
echo "   aws ssm put-parameter --name '/ai-chat-app/secret-key' \\"
echo "     --value 'your-super-secure-secret-key-32-chars-minimum' --type 'SecureString' \\"
echo "     --overwrite --region ${REGION}"
echo ""
echo "2. 🔄 Restart the service after updating secrets:"
echo "   aws ecs update-service --cluster ${CLUSTER_NAME} \\"
echo "     --service ${SERVICE_NAME} --force-new-deployment \\"
echo "     --region ${REGION}"
echo ""
echo "3. 📊 Monitor your application:"
echo "   - View logs: aws logs tail /ecs/ai-chat-app-backend --follow --region ${REGION}"
echo "   - ECS Console: https://console.aws.amazon.com/ecs/home?region=${REGION}#/clusters/${CLUSTER_NAME}/services"
echo "   - Cost Explorer: https://console.aws.amazon.com/cost-management/home"
echo ""
echo "4. 🗑️  When you're done, clean up resources:"
echo "   cdk destroy"
echo ""

print_status "🎉 AI Chat App deployment completed successfully!"
print_info "Access your application at: ${LOAD_BALANCER_URL}"

echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}" 