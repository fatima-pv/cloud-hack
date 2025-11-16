#!/bin/bash

# Fargate Migration Deployment Script
# This script automates the deployment of Cloud Hack to Fargate

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="us-east-1"
ENVIRONMENT="dev"
ECR_REPO_NAME="cloud-hack-api"
STACK_NAME="cloud-hack-fargate-${ENVIRONMENT}"

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}Cloud Hack - Fargate Migration${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI not found. Please install it first.${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker not found. Please install it first.${NC}"
    exit 1
fi

if ! command -v serverless &> /dev/null && ! command -v sls &> /dev/null; then
    echo -e "${RED}Serverless Framework not found. Install with: npm install -g serverless${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites met${NC}"
echo ""

# Get AWS Account ID
echo -e "${YELLOW}Getting AWS Account ID...${NC}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✓ AWS Account ID: ${AWS_ACCOUNT_ID}${NC}"
echo ""

# Step 1: Deploy DynamoDB and WebSocket (Lambda)
echo -e "${YELLOW}Step 1: Deploying DynamoDB tables and WebSocket Lambda...${NC}"
sls deploy --stage ${ENVIRONMENT} --config serverless-websocket-only.yml

# Get WebSocket API ID from stack outputs
WS_API_ID=$(aws cloudformation describe-stacks \
    --stack-name cloud-hack-websocket-${ENVIRONMENT} \
    --query "Stacks[0].Outputs[?OutputKey=='WebSocketApiId'].OutputValue" \
    --output text)

echo -e "${GREEN}✓ WebSocket API ID: ${WS_API_ID}${NC}"
echo ""

# Step 2: Create ECR Repository (if it doesn't exist)
echo -e "${YELLOW}Step 2: Creating ECR repository...${NC}"
if aws ecr describe-repositories --repository-names ${ECR_REPO_NAME} --region ${AWS_REGION} 2>/dev/null; then
    echo -e "${GREEN}✓ ECR repository already exists${NC}"
else
    aws ecr create-repository --repository-name ${ECR_REPO_NAME} --region ${AWS_REGION}
    echo -e "${GREEN}✓ ECR repository created${NC}"
fi
echo ""

# Step 3: Build Docker image
echo -e "${YELLOW}Step 3: Building Docker image...${NC}"
docker build -t ${ECR_REPO_NAME}:latest .
echo -e "${GREEN}✓ Docker image built${NC}"
echo ""

# Step 4: Login to ECR
echo -e "${YELLOW}Step 4: Logging in to ECR...${NC}"
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
echo -e "${GREEN}✓ Logged in to ECR${NC}"
echo ""

# Step 5: Tag and push Docker image
echo -e "${YELLOW}Step 5: Pushing Docker image to ECR...${NC}"
docker tag ${ECR_REPO_NAME}:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:latest
echo -e "${GREEN}✓ Docker image pushed to ECR${NC}"
echo ""

# Step 6: Deploy Fargate stack
echo -e "${YELLOW}Step 6: Deploying Fargate stack via CloudFormation...${NC}"
ECR_IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:latest"

aws cloudformation deploy \
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
    --region ${AWS_REGION}

echo -e "${GREEN}✓ Fargate stack deployed${NC}"
echo ""

# Step 7: Get outputs
echo -e "${YELLOW}Step 7: Getting deployment outputs...${NC}"

ALB_URL=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --query "Stacks[0].Outputs[?OutputKey=='LoadBalancerURL'].OutputValue" \
    --output text)

WS_URL=$(aws cloudformation describe-stacks \
    --stack-name cloud-hack-websocket-${ENVIRONMENT} \
    --query "Stacks[0].Outputs[?OutputKey=='WebSocketUrl'].OutputValue" \
    --output text)

echo ""
echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""
echo -e "${YELLOW}REST API URL (Fargate):${NC} ${ALB_URL}"
echo -e "${YELLOW}WebSocket URL (Lambda):${NC} ${WS_URL}"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "1. Update frontend/auth.js with the REST API URL:"
echo "   const API_BASE_URL = '${ALB_URL}';"
echo ""
echo "2. Update frontend/app.js with the WebSocket URL:"
echo "   const WS_URL = '${WS_URL}';"
echo ""
echo "3. Test the REST API:"
echo "   curl ${ALB_URL}/health"
echo ""
echo "4. Deploy frontend to Amplify or test locally"
echo ""
echo -e "${YELLOW}To test locally:${NC}"
echo "   cd frontend"
echo "   python -m http.server 8080"
echo "   Open http://localhost:8080 in your browser"
echo ""
echo -e "${GREEN}Done! 🚀${NC}"
