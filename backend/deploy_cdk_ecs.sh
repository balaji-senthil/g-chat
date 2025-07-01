#!/bin/bash

# AWS CDK ECS Deployment Script - Free Tier Optimized
# This script deploys the AI Chat Backend to AWS ECS using Fargate and free tier resources

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    # Check Node.js (required for CDK)
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install it first."
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 is not installed. Please install it first."
        exit 1
    fi
    
    log_success "All prerequisites are installed"
}

# Verify AWS credentials
check_aws_credentials() {
    log_info "Checking AWS credentials..."
    
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials are not configured or invalid"
        log_info "Please run: aws configure"
        exit 1
    fi
    
    # Get account info
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    REGION=$(aws configure get region || echo "us-east-1")
    
    log_success "AWS credentials verified"
    log_info "Account ID: $ACCOUNT_ID"
    log_info "Region: $REGION"
    
    export CDK_DEFAULT_ACCOUNT=$ACCOUNT_ID
    export CDK_DEFAULT_REGION=$REGION
}

# Install CDK CLI if not present
install_cdk() {
    if ! command -v cdk &> /dev/null; then
        log_info "Installing AWS CDK CLI..."
        npm install -g aws-cdk
        log_success "CDK CLI installed"
    else
        log_info "CDK CLI already installed: $(cdk --version)"
    fi
}

# Bootstrap CDK (required for first time deployment)
bootstrap_cdk() {
    log_info "Bootstrapping CDK in region $REGION..."
    
    # Check if already bootstrapped
    if aws cloudformation describe-stacks --stack-name CDKToolkit --region $REGION &> /dev/null; then
        log_info "CDK already bootstrapped in this region"
    else
        log_info "Bootstrapping CDK for the first time..."
        cdk bootstrap aws://$ACCOUNT_ID/$REGION
        log_success "CDK bootstrapped successfully"
    fi
}

# Create Python virtual environment for CDK
setup_python_env() {
    log_info "Setting up Python environment for CDK..."
    
    if [ ! -d "cdk_venv" ]; then
        python3 -m venv cdk_venv
    fi
    
    source cdk_venv/bin/activate
    pip install --upgrade pip
    pip install -r cdk_requirements.txt
    
    log_success "Python environment ready"
}

# Store secrets in AWS Systems Manager Parameter Store
setup_secrets() {
    log_info "Setting up secrets in AWS Systems Manager..."
    
    # Check if secrets already exist
    if aws ssm get-parameter --name "/ai-chat-app/database-url" --region $REGION &> /dev/null; then
        log_warning "Secrets already exist in Parameter Store. Skipping setup."
        log_info "If you need to update secrets, use: aws ssm put-parameter --name '/ai-chat-app/database-url' --value 'new-value' --type 'SecureString' --overwrite"
        return
    fi
    
    log_warning "⚠️  Secrets need to be set up in AWS Systems Manager Parameter Store"
    log_info "Please set the following parameters:"
    echo
    echo "1. Database URL:"
    echo "   aws ssm put-parameter --name '/ai-chat-app/database-url' --value 'postgresql://user:pass@host:5432/db' --type 'SecureString'"
    echo
    echo "2. Google API Key:"
    echo "   aws ssm put-parameter --name '/ai-chat-app/google-api-key' --value 'your-google-api-key' --type 'SecureString'"
    echo
    echo "3. Secret Key:"
    echo "   aws ssm put-parameter --name '/ai-chat-app/secret-key' --value 'your-jwt-secret-key' --type 'SecureString'"
    echo
    
    read -p "Have you set up these parameters? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "Please set up the required parameters and run the script again"
        exit 1
    fi
}

# Build and push Docker image to ECR
build_and_push_image() {
    log_info "Building and pushing Docker image to ECR..."
    
    # Create ECR repository if it doesn't exist
    ECR_REPO_NAME="ai-chat-backend"
    ECR_URI="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO_NAME"
    
    if ! aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $REGION &> /dev/null; then
        log_info "Creating ECR repository..."
        aws ecr create-repository --repository-name $ECR_REPO_NAME --region $REGION
    fi
    
    # Login to ECR
    log_info "Logging in to ECR..."
    aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_URI
    
    # Build image
    log_info "Building Docker image..."
    docker build -t $ECR_REPO_NAME .
    
    # Tag image
    docker tag $ECR_REPO_NAME:latest $ECR_URI:latest
    
    # Push image
    log_info "Pushing image to ECR..."
    docker push $ECR_URI:latest
    
    log_success "Image pushed to ECR: $ECR_URI:latest"
}

# Deploy infrastructure using CDK
deploy_infrastructure() {
    log_info "Deploying infrastructure with CDK..."
    
    # Activate Python environment
    source cdk_venv/bin/activate
    
    # Synthesize the stack first
    log_info "Synthesizing CDK stack..."
    python3 cdk_ecs_deployment.py
    
    # Deploy the stack
    log_info "Deploying ECS stack..."
    cdk deploy AiChatEcsStack --require-approval never
    
    log_success "Infrastructure deployed successfully!"
}

# Get deployment information
get_deployment_info() {
    log_info "Getting deployment information..."
    
    # Get ALB DNS name
    ALB_DNS=$(aws cloudformation describe-stacks \
        --stack-name AiChatEcsStack \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDns`].OutputValue' \
        --output text \
        --region $REGION)
    
    if [ -n "$ALB_DNS" ]; then
        log_success "🚀 Deployment Complete!"
        echo
        echo "📋 Deployment Information:"
        echo "  🌐 Application URL: http://$ALB_DNS"
        echo "  🏥 Health Check: http://$ALB_DNS/health"
        echo "  📚 API Docs: http://$ALB_DNS/docs"
        echo "  🏗️  ECS Cluster: ai-chat-app-cluster"
        echo "  🐳 ECR Repository: $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/ai-chat-backend"
        echo
        echo "💰 Free Tier Usage:"
        echo "  ✅ ECS Fargate: Always free (pay only for compute)"
        echo "  ✅ Application Load Balancer: 750 hours/month free"
        echo "  ✅ ECR: 500 MB storage free"
        echo "  ✅ CloudWatch Logs: 5 GB ingestion free"
        echo
        log_warning "⚠️  Remember to monitor your AWS usage to stay within free tier limits"
    else
        log_warning "Could not retrieve deployment information. Check AWS Console for details."
    fi
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    deactivate 2>/dev/null || true
}

# Set trap for cleanup
trap cleanup EXIT

# Main execution
main() {
    log_info "🚀 Starting AWS ECS deployment (Free Tier Optimized)"
    echo
    
    check_prerequisites
    check_aws_credentials
    install_cdk
    bootstrap_cdk
    setup_python_env
    setup_secrets
    build_and_push_image
    deploy_infrastructure
    get_deployment_info
    
    log_success "🎉 Deployment completed successfully!"
}

# Check if we're in the backend directory
if [ ! -f "Dockerfile" ]; then
    log_error "Please run this script from the backend directory"
    exit 1
fi

# Run main function
main "$@" 