@echo off
REM Fargate Migration Deployment Script for Windows
REM This script automates the deployment of Cloud Hack to Fargate

setlocal enabledelayedexpansion

REM Configuration
set AWS_REGION=us-east-1
set ENVIRONMENT=dev
set ECR_REPO_NAME=cloud-hack-api
set STACK_NAME=cloud-hack-fargate-%ENVIRONMENT%

echo ==================================
echo Cloud Hack - Fargate Migration
echo ==================================
echo.

REM Check prerequisites
echo Checking prerequisites...

where aws >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] AWS CLI not found. Please install it first.
    exit /b 1
)

where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Docker not found. Please install it first.
    exit /b 1
)

where sls >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Serverless Framework not found. Install with: npm install -g serverless
    exit /b 1
)

echo [OK] All prerequisites met
echo.

REM Get AWS Account ID
echo Getting AWS Account ID...
for /f %%i in ('aws sts get-caller-identity --query Account --output text') do set AWS_ACCOUNT_ID=%%i
echo [OK] AWS Account ID: %AWS_ACCOUNT_ID%
echo.

REM Step 1: Deploy DynamoDB and WebSocket (Lambda)
echo Step 1: Deploying DynamoDB tables and WebSocket Lambda...
call sls deploy --stage %ENVIRONMENT% --config serverless-websocket-only.yml

REM Get WebSocket API ID from stack outputs
for /f %%i in ('aws cloudformation describe-stacks --stack-name cloud-hack-websocket-%ENVIRONMENT% --query "Stacks[0].Outputs[?OutputKey=='WebSocketApiId'].OutputValue" --output text') do set WS_API_ID=%%i

echo [OK] WebSocket API ID: %WS_API_ID%
echo.

REM Step 2: Create ECR Repository (if it doesn't exist)
echo Step 2: Creating ECR repository...
aws ecr describe-repositories --repository-names %ECR_REPO_NAME% --region %AWS_REGION% >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] ECR repository already exists
) else (
    aws ecr create-repository --repository-name %ECR_REPO_NAME% --region %AWS_REGION%
    echo [OK] ECR repository created
)
echo.

REM Step 3: Build Docker image
echo Step 3: Building Docker image...
docker build -t %ECR_REPO_NAME%:latest .
echo [OK] Docker image built
echo.

REM Step 4: Login to ECR
echo Step 4: Logging in to ECR...
for /f %%i in ('aws ecr get-login-password --region %AWS_REGION%') do set ECR_PASSWORD=%%i
echo %ECR_PASSWORD% | docker login --username AWS --password-stdin %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com
echo [OK] Logged in to ECR
echo.

REM Step 5: Tag and push Docker image
echo Step 5: Pushing Docker image to ECR...
docker tag %ECR_REPO_NAME%:latest %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%ECR_REPO_NAME%:latest
docker push %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%ECR_REPO_NAME%:latest
echo [OK] Docker image pushed to ECR
echo.

REM Step 6: Deploy Fargate stack
echo Step 6: Deploying Fargate stack via CloudFormation...
set ECR_IMAGE_URI=%AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%ECR_REPO_NAME%:latest

aws cloudformation deploy ^
    --template-file fargate-stack.yml ^
    --stack-name %STACK_NAME% ^
    --parameter-overrides ^
        Environment=%ENVIRONMENT% ^
        ECRImageUri=%ECR_IMAGE_URI% ^
        ReportsTableName=ReportsTable-%ENVIRONMENT% ^
        ConnectionsTableName=ConnectionsTable-%ENVIRONMENT% ^
        UsersTableName=UsersTable-%ENVIRONMENT% ^
        WebSocketApiId=%WS_API_ID% ^
    --capabilities CAPABILITY_IAM ^
    --region %AWS_REGION%

echo [OK] Fargate stack deployed
echo.

REM Step 7: Get outputs
echo Step 7: Getting deployment outputs...

for /f %%i in ('aws cloudformation describe-stacks --stack-name %STACK_NAME% --query "Stacks[0].Outputs[?OutputKey=='LoadBalancerURL'].OutputValue" --output text') do set ALB_URL=%%i

for /f %%i in ('aws cloudformation describe-stacks --stack-name cloud-hack-websocket-%ENVIRONMENT% --query "Stacks[0].Outputs[?OutputKey=='WebSocketUrl'].OutputValue" --output text') do set WS_URL=%%i

echo.
echo ==================================
echo Deployment Complete!
echo ==================================
echo.
echo REST API URL (Fargate): %ALB_URL%
echo WebSocket URL (Lambda): %WS_URL%
echo.
echo Next Steps:
echo 1. Update frontend/auth.js with the REST API URL:
echo    const API_BASE_URL = '%ALB_URL%';
echo.
echo 2. Update frontend/app.js with the WebSocket URL:
echo    const WS_URL = '%WS_URL%';
echo.
echo 3. Test the REST API:
echo    curl %ALB_URL%/health
echo.
echo 4. Deploy frontend to Amplify or test locally
echo.
echo To test locally:
echo    cd frontend
echo    python -m http.server 8080
echo    Open http://localhost:8080 in your browser
echo.
echo Done! 🚀

endlocal
