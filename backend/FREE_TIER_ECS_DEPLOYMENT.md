# AWS Free Tier ECS Deployment Guide

## 🆓 **Free Tier Benefits**

This deployment is optimized for AWS Free Tier usage based on [AWS Free Containers](https://aws.amazon.com/free/containers/):

- ✅ **Amazon ECS**: Always FREE (you only pay for underlying compute resources)
- ✅ **EC2 Instances**: 750 hours/month of t2.micro instances (12 months free)
- ✅ **Application Load Balancer**: 750 hours/month (12 months free)
- ✅ **Amazon ECR**: 500 MB storage/month (12 months free)
- ✅ **CloudWatch Logs**: 5 GB ingestion/month (always free)
- ✅ **VPC**: Free within reasonable limits

**Estimated Monthly Cost**: $0 for the first 12 months (within free tier limits)

## 📋 **Prerequisites**

### 1. AWS Account Setup
- Create an AWS account at [aws.amazon.com](https://aws.amazon.com)
- Verify your account (may require credit card for verification)
- Note your AWS Account ID (12-digit number)

### 2. Local Environment
Ensure you have these tools installed:
- **AWS CLI** v2 - [Installation Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop)
- **Node.js** (for AWS CDK) - [Download](https://nodejs.org/)
- **Python 3.8+** - [Download](https://www.python.org/downloads/)

### 3. AWS Configuration
```bash
# Configure AWS credentials
aws configure

# Enter your credentials:
# AWS Access Key ID: [Your Access Key]
# AWS Secret Access Key: [Your Secret Key]
# Default region name: us-east-1
# Default output format: json
```

## 🚀 **One-Click Deployment**

### Quick Start
```bash
cd backend
./deploy_cdk_ecs.sh
```

This script will:
1. ✅ Check all prerequisites
2. ✅ Install AWS CDK if needed
3. ✅ Bootstrap CDK in your AWS account
4. ✅ Set up Python environment
5. ✅ Guide you through secrets setup
6. ✅ Build and push Docker image to ECR
7. ✅ Deploy ECS infrastructure
8. ✅ Provide deployment URLs and information

## 🔐 **Secrets Configuration**

The deployment script will prompt you to set up these secrets in AWS Systems Manager Parameter Store:

### 1. Database URL
```bash
aws ssm put-parameter \
    --name "/ai-chat-app/database-url" \
    --value "postgresql://username:password@host:5432/database" \
    --type "SecureString"
```

### 2. Google API Key
```bash
aws ssm put-parameter \
    --name "/ai-chat-app/google-api-key" \
    --value "your-google-gemini-api-key" \
    --type "SecureString"
```

### 3. JWT Secret Key
```bash
aws ssm put-parameter \
    --name "/ai-chat-app/secret-key" \
    --value "your-jwt-secret-key-32-chars-min" \
    --type "SecureString"
```

## 🏗️ **What Gets Deployed**

### Infrastructure Components:
- **VPC**: Custom VPC with public subnets (free)
- **ECS Cluster**: Fargate-enabled cluster (always free)
- **ECR Repository**: Container registry (500 MB free)
- **Application Load Balancer**: Internet-facing ALB (750 hours free)
- **ECS Service**: Fargate service with 1 task (optimized for free tier)
- **CloudWatch Logs**: Application logging (5 GB free)
- **Security Groups**: Properly configured network security
- **IAM Roles**: Least privilege access for ECS tasks

### Container Configuration:
- **CPU**: 256 units (0.25 vCPU) - minimal for cost efficiency
- **Memory**: 512 MB - minimal for free tier
- **Desired Count**: 1 task - keeps costs minimal
- **Health Checks**: Automated health monitoring
- **Auto Scaling**: Disabled to control costs

## 📊 **Monitoring Free Tier Usage**

### AWS Cost Explorer
1. Go to [AWS Cost Management Console](https://console.aws.amazon.com/cost-management/)
2. Navigate to "Cost Explorer"
3. Set up billing alerts for $1-5 to monitor usage

### Free Tier Usage
1. Go to [AWS Billing Console](https://console.aws.amazon.com/billing/)
2. Click on "Free tier" in the left navigation
3. Monitor your usage against free tier limits

### Key Metrics to Watch:
- **EC2 Hours**: Stay under 750 hours/month
- **ALB Hours**: Stay under 750 hours/month  
- **ECR Storage**: Stay under 500 MB
- **CloudWatch Logs**: Stay under 5 GB ingestion/month

## 🛠️ **Manual Deployment Steps** (Alternative)

If you prefer to run steps manually:

### 1. Install Dependencies
```bash
cd backend

# Install CDK CLI
npm install -g aws-cdk

# Create Python environment
python3 -m venv cdk_venv
source cdk_venv/bin/activate
pip install -r cdk_requirements.txt
```

### 2. Bootstrap CDK
```bash
cdk bootstrap
```

### 3. Set up Secrets
```bash
# Set up your secrets (see section above)
```

### 4. Build and Push Container
```bash
# Get your account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region)

# Create ECR repo
aws ecr create-repository --repository-name ai-chat-backend

# Build and push
docker build -t ai-chat-backend .
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
docker tag ai-chat-backend:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/ai-chat-backend:latest
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/ai-chat-backend:latest
```

### 5. Deploy Infrastructure
```bash
source cdk_venv/bin/activate
python3 cdk_ecs_deployment.py
```

## 🌐 **Accessing Your Application**

After successful deployment, you'll receive:
- **Application URL**: `http://your-alb-dns-name.region.elb.amazonaws.com`
- **Health Check**: `http://your-alb-dns-name.region.elb.amazonaws.com/health`
- **API Documentation**: `http://your-alb-dns-name.region.elb.amazonaws.com/docs`

## 📱 **Frontend Integration**

Update your frontend configuration to point to the new ECS endpoint:

```javascript
// In your frontend config
const API_BASE_URL = 'http://your-alb-dns-name.region.elb.amazonaws.com/api';
```

## 🧹 **Cleanup (To Avoid Charges)**

To completely remove all resources:

```bash
# Destroy the CDK stack
cdk destroy AiChatEcsStack

# Delete ECR images (if needed)
aws ecr delete-repository --repository-name ai-chat-backend --force

# Remove secrets (optional)
aws ssm delete-parameter --name "/ai-chat-app/database-url"
aws ssm delete-parameter --name "/ai-chat-app/google-api-key"  
aws ssm delete-parameter --name "/ai-chat-app/secret-key"
```

## 🔧 **Troubleshooting**

### Common Issues:

#### 1. CDK Bootstrap Failed
```bash
# Check if you have permissions
aws sts get-caller-identity

# Try different region
cdk bootstrap aws://ACCOUNT-ID/us-west-2
```

#### 2. Docker Build Failed
```bash
# Make sure Docker is running
docker info

# Check Dockerfile exists
ls -la Dockerfile
```

#### 3. ECR Push Failed
```bash
# Re-authenticate
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT-ID.dkr.ecr.us-east-1.amazonaws.com
```

#### 4. ECS Service Unhealthy
- Check CloudWatch logs: `/ecs/ai-chat-app-backend`
- Verify secrets are set correctly
- Check security group rules

### Getting Help:
- **AWS Support**: Free basic support included
- **AWS Documentation**: [ECS Documentation](https://docs.aws.amazon.com/ecs/)
- **CDK Documentation**: [CDK Python Guide](https://docs.aws.amazon.com/cdk/v2/guide/)

## 💡 **Cost Optimization Tips**

1. **Monitor Usage**: Set up billing alarms
2. **Use Spot Instances**: For development (not production)
3. **Schedule Downtime**: Stop ECS service during off-hours
4. **Image Optimization**: Keep Docker images small
5. **Log Retention**: Use shorter retention periods for logs

## 📈 **Scaling Beyond Free Tier**

When you're ready to scale:
- Increase CPU/Memory for better performance
- Add auto-scaling policies
- Use multiple AZs for high availability
- Add HTTPS with ACM certificates
- Implement CI/CD with CodePipeline
- Add monitoring with CloudWatch dashboards

---

## 🎯 **Next Steps**

1. Deploy your backend using this guide
2. Update your frontend to use the ECS endpoint
3. Test the full application flow
4. Monitor your AWS usage
5. Consider production optimizations when ready

**Happy coding! 🚀** 