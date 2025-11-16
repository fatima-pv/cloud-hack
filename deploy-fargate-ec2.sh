#!/bin/bash

# AWS Academy-Compatible Deployment Script for Fargate
# This version handles AWS Academy limitations and temporary credentials

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="us-east-1"
ENVIRONMENT="dev"
ECR_REPO_NAME="cloud-hack-api"
STACK_NAME="cloud-hack-fargate-${ENVIRONMENT}"

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}Cloud Hack - Fargate Deployment${NC}"
echo -e "${GREEN}AWS Academy Compatible Version${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""

# Check if running in AWS Academy
echo -e "${YELLOW}Checking AWS credentials...${NC}"
if aws sts get-caller-identity &>/dev/null; then
    CALLER_IDENTITY=$(aws sts get-caller-identity)
    echo -e "${GREEN}✓ AWS credentials are valid${NC}"
    echo "$CALLER_IDENTITY" | grep -q "LabRole" && echo -e "${BLUE}ℹ AWS Academy LabRole detected${NC}" || true
else
    echo -e "${RED}✗ AWS credentials not configured${NC}"
    echo ""
    echo "Please configure AWS credentials:"
    echo "1. Go to AWS Academy Learner Lab"
    echo "2. Click 'AWS Details'"
    echo "3. Copy credentials and paste into ~/.aws/credentials"
    echo ""
    echo "Example:"
    echo "  nano ~/.aws/credentials"
    echo ""
    echo "Then run this script again."
    exit 1
fi
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker not found${NC}"
    echo "Install with: sudo yum install -y docker && sudo service docker start"
    exit 1
fi
echo -e "${GREEN}✓ Docker found${NC}"

if ! command -v sls &> /dev/null; then
    echo -e "${RED}✗ Serverless Framework not found${NC}"
    echo "Install with: sudo npm install -g serverless"
    exit 1
fi
echo -e "${GREEN}✓ Serverless Framework found${NC}"

# Check if Docker daemon is running
if ! docker ps &> /dev/null; then
    echo -e "${YELLOW}⚠ Docker daemon not running. Starting...${NC}"
    sudo service docker start || {
        echo -e "${RED}✗ Failed to start Docker. Run: sudo service docker start${NC}"
        exit 1
    }
fi
echo -e "${GREEN}✓ Docker daemon running${NC}"
echo ""

# Get AWS Account ID
echo -e "${YELLOW}Getting AWS Account ID...${NC}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✓ AWS Account ID: ${AWS_ACCOUNT_ID}${NC}"
echo ""

# Step 1: Deploy DynamoDB and WebSocket (Lambda)
echo -e "${YELLOW}Step 1: Deploying DynamoDB tables and WebSocket Lambda...${NC}"
echo "This may take 2-3 minutes..."
sls deploy --stage ${ENVIRONMENT} --config serverless-websocket-only.yml

# Get WebSocket API ID from stack outputs
WS_API_ID=$(aws cloudformation describe-stacks \
    --stack-name cloud-hack-websocket-${ENVIRONMENT} \
    --query "Stacks[0].Outputs[?OutputKey=='WebSocketApiId'].OutputValue" \
    --output text 2>/dev/null || echo "")

if [ -z "$WS_API_ID" ]; then
    echo -e "${RED}✗ Failed to get WebSocket API ID${NC}"
    exit 1
fi

echo -e "${GREEN}✓ WebSocket API ID: ${WS_API_ID}${NC}"
echo ""

# Step 2: Create ECR Repository (if it doesn't exist)
echo -e "${YELLOW}Step 2: Setting up ECR repository...${NC}"
if aws ecr describe-repositories --repository-names ${ECR_REPO_NAME} --region ${AWS_REGION} &>/dev/null; then
    echo -e "${GREEN}✓ ECR repository already exists${NC}"
else
    aws ecr create-repository --repository-name ${ECR_REPO_NAME} --region ${AWS_REGION} &>/dev/null
    echo -e "${GREEN}✓ ECR repository created${NC}"
fi
echo ""

# Step 3: Build Docker image
echo -e "${YELLOW}Step 3: Building Docker image...${NC}"
echo "This may take 2-3 minutes..."
docker build -t ${ECR_REPO_NAME}:latest . || {
    echo -e "${RED}✗ Docker build failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Docker image built${NC}"
echo ""

# Step 4: Login to ECR
echo -e "${YELLOW}Step 4: Logging in to ECR...${NC}"
aws ecr get-login-password --region ${AWS_REGION} | \
    docker login --username AWS --password-stdin \
    ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com || {
    echo -e "${RED}✗ ECR login failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Logged in to ECR${NC}"
echo ""

# Step 5: Tag and push Docker image
echo -e "${YELLOW}Step 5: Pushing Docker image to ECR...${NC}"
echo "This may take 3-5 minutes..."
docker tag ${ECR_REPO_NAME}:latest \
    ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:latest

docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:latest || {
    echo -e "${RED}✗ Docker push failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Docker image pushed to ECR${NC}"
echo ""

# Step 6: Deploy Fargate stack
echo -e "${YELLOW}Step 6: Deploying Fargate stack via CloudFormation...${NC}"
echo -e "${BLUE}ℹ This may take 5-10 minutes...${NC}"
ECR_IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:latest"

# Try CloudFormation deployment
if aws cloudformation deploy \
    --template-file fargate-stack.yml \
    --stack-name ${STACK_NAME} \
    --parameter-overrides \
        Environment=${ENVIRONMENT} \
        ECRImageUri=${ECR_IMAGE_URI} \
        ReportsTableName=ReportsTable-${ENVIRONMENT} \
        ConnectionsTableName=ConnectionsTable-${ENVIRONMENT} \
        UsersTableName=UsersTable-${ENVIRONMENT} \
        WebSocketApiId=${WS_API_ID} \
    --capabilities CAPABILITY_IAM \
    --region ${AWS_REGION} 2>&1; then
    
    echo -e "${GREEN}✓ Fargate stack deployed via CloudFormation${NC}"
    
    # Step 7: Get outputs
    echo ""
    echo -e "${YELLOW}Step 7: Getting deployment outputs...${NC}"
    
    ALB_URL=$(aws cloudformation describe-stacks \
        --stack-name ${STACK_NAME} \
        --query "Stacks[0].Outputs[?OutputKey=='LoadBalancerURL'].OutputValue" \
        --output text 2>/dev/null || echo "")
    
    WS_URL=$(aws cloudformation describe-stacks \
        --stack-name cloud-hack-websocket-${ENVIRONMENT} \
        --query "Stacks[0].Outputs[?OutputKey=='WebSocketUrl'].OutputValue" \
        --output text 2>/dev/null || echo "")
    
    echo ""
    echo -e "${GREEN}==================================${NC}"
    echo -e "${GREEN}Deployment Complete!${NC}"
    echo -e "${GREEN}==================================${NC}"
    echo ""
    echo -e "${YELLOW}REST API URL (Fargate):${NC} ${ALB_URL}"
    echo -e "${YELLOW}WebSocket URL (Lambda):${NC} ${WS_URL}"
    echo ""
    echo -e "${GREEN}Next Steps:${NC}"
    echo "1. Test the API:"
    echo "   curl ${ALB_URL}/health"
    echo ""
    echo "2. Update frontend/auth.js with the REST API URL:"
    echo "   const API_BASE_URL = '${ALB_URL}';"
    echo ""
    echo "3. Update frontend/app.js with the WebSocket URL:"
    echo "   const WS_URL = '${WS_URL}';"
    echo ""
    echo -e "${YELLOW}To stop ECS service (save money):${NC}"
    echo "   aws ecs update-service --cluster dev-cloud-hack-cluster \\"
    echo "     --service dev-cloud-hack-service --desired-count 0"
    echo ""
    echo -e "${GREEN}Done! 🚀${NC}"
    
else
    # CloudFormation failed - likely AWS Academy restrictions
    echo ""
    echo -e "${YELLOW}⚠ CloudFormation deployment had issues${NC}"
    echo -e "${BLUE}This is common in AWS Academy due to permission restrictions.${NC}"
    echo ""
    echo -e "${YELLOW}==================================${NC}"
    echo -e "${YELLOW}Manual Setup Required${NC}"
    echo -e "${YELLOW}==================================${NC}"
    echo ""
    echo -e "${GREEN}✓ DynamoDB and WebSocket are deployed${NC}"
    echo -e "${GREEN}✓ Docker image is in ECR${NC}"
    echo ""
    echo -e "${YELLOW}Please complete Fargate setup manually via AWS Console:${NC}"
    echo ""
    echo "1. Create ECS Cluster:"
    echo "   - Go to ECS → Clusters → Create Cluster"
    echo "   - Type: Networking only (Fargate)"
    echo "   - Name: dev-cloud-hack-cluster"
    echo ""
    echo "2. Create Task Definition:"
    echo "   - Go to ECS → Task Definitions → Create"
    echo "   - Type: Fargate"
    echo "   - Name: dev-cloud-hack-task"
    echo "   - Task Role: LabRole"
    echo "   - Task Execution Role: LabRole"
    echo "   - Memory: 1GB, CPU: 0.5 vCPU"
    echo "   - Container:"
    echo "     - Name: cloud-hack-api"
    echo "     - Image: ${ECR_IMAGE_URI}"
    echo "     - Port: 80"
    echo "     - Environment variables:"
    echo "       TABLE_NAME=ReportsTable-dev"
    echo "       CONNECTIONS_TABLE=ConnectionsTable-dev"
    echo "       USERS_TABLE=UsersTable-dev"
    echo "       AWS_REGION=us-east-1"
    echo "       WS_API_ID=${WS_API_ID}"
    echo "       WS_STAGE=dev"
    echo ""
    echo "3. Create Application Load Balancer:"
    echo "   - Go to EC2 → Load Balancers → Create"
    echo "   - Type: Application Load Balancer"
    echo "   - Name: dev-cloud-hack-alb"
    echo "   - Internet-facing, IPv4"
    echo "   - Select default VPC and 2+ subnets"
    echo "   - Security group: Allow HTTP (80) from 0.0.0.0/0"
    echo "   - Target group: IP, HTTP, Port 80, Health check: /health"
    echo ""
    echo "4. Create ECS Service:"
    echo "   - Go to ECS → Cluster → dev-cloud-hack-cluster"
    echo "   - Create Service"
    echo "   - Launch type: Fargate"
    echo "   - Task definition: dev-cloud-hack-task"
    echo "   - Service name: dev-cloud-hack-service"
    echo "   - Number of tasks: 1"
    echo "   - VPC: Default, Subnets: 2+, Public IP: Enabled"
    echo "   - Load balancer: Select your ALB"
    echo "   - Container: cloud-hack-api:80"
    echo ""
    echo -e "${YELLOW}WebSocket Info (for frontend):${NC}"
    WS_URL=$(aws cloudformation describe-stacks \
        --stack-name cloud-hack-websocket-${ENVIRONMENT} \
        --query "Stacks[0].Outputs[?OutputKey=='WebSocketUrl'].OutputValue" \
        --output text 2>/dev/null || echo "")
    echo "WebSocket URL: ${WS_URL}"
    echo ""
    echo "See AWS_ACADEMY_EC2_DEPLOYMENT.md for detailed instructions."
    echo ""
    echo -e "${GREEN}Partial deployment completed! 🚀${NC}"
fi
