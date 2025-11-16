# 🎓 AWS Academy - Deploying from EC2

## Quick Guide: Deploy Cloud Hack to Fargate from EC2

---

## Prerequisites on Your EC2 Instance

### 1. Connect to Your EC2 Instance
```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
# or use AWS Academy's EC2 Instance Connect
```

### 2. Install Required Tools

#### Install Docker
```bash
# Update packages
sudo yum update -y

# Install Docker
sudo yum install -y docker

# Start Docker service
sudo service docker start

# Add ec2-user to docker group (so you don't need sudo)
sudo usermod -a -G docker ec2-user

# Log out and log back in for group changes to take effect
# Or run: newgrp docker

# Verify Docker installation
docker --version
```

#### Install AWS CLI v2
```bash
# Download AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"

# Install unzip if not present
sudo yum install -y unzip

# Unzip and install
unzip awscliv2.zip
sudo ./aws/install

# Verify installation
aws --version
```

#### Install Node.js and Serverless Framework
```bash
# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Verify Node.js and npm
node --version
npm --version

# Install Serverless Framework globally
sudo npm install -g serverless

# Verify installation
sls --version
```

#### Install Git (if not already installed)
```bash
sudo yum install -y git
git --version
```

---

## AWS Academy Configuration

### ⚠️ IMPORTANT: AWS Academy Limitations

AWS Academy has some restrictions:
1. **Session expires** after ~4 hours (you need to refresh credentials)
2. **LabRole permissions** are limited (but should work for this project)
3. **No permanent IAM users** (credentials are temporary)
4. **ECR repositories** may need to be recreated each session

### Get AWS Academy Credentials

1. Go to AWS Academy Learner Lab
2. Click **"AWS Details"**
3. Copy credentials (they look like this):
   ```
   [default]
   aws_access_key_id=ASIA...
   aws_secret_access_key=...
   aws_session_token=...
   ```

### Configure AWS CLI

```bash
# Create AWS credentials directory
mkdir -p ~/.aws

# Configure credentials (paste the credentials from AWS Academy)
nano ~/.aws/credentials
```

Paste this format:
```ini
[default]
aws_access_key_id=YOUR_ACCESS_KEY_ID
aws_secret_access_key=YOUR_SECRET_ACCESS_KEY
aws_session_token=YOUR_SESSION_TOKEN
```

**Configure region:**
```bash
nano ~/.aws/config
```

Paste:
```ini
[default]
region=us-east-1
output=json
```

**Test credentials:**
```bash
aws sts get-caller-identity
# Should show your account ID and LabRole
```

---

## Clone Your Project

```bash
# Clone your repository
cd ~
git clone https://github.com/fatima-pv/cloud-hack.git
cd cloud-hack

# Switch to your branch
git checkout diego
```

---

## Deploy to Fargate

### Option 1: Automated (Recommended)

```bash
# Make script executable
chmod +x deploy-fargate.sh

# Run deployment
./deploy-fargate.sh
```

**⚠️ Note:** The script may take 10-15 minutes.

### Option 2: Manual Deployment

#### Step 1: Deploy DynamoDB and WebSocket
```bash
# Deploy serverless stack
sls deploy --stage dev --config serverless-websocket-only.yml

# Get WebSocket API ID (save this!)
WS_API_ID=$(aws cloudformation describe-stacks \
  --stack-name cloud-hack-websocket-dev \
  --query "Stacks[0].Outputs[?OutputKey=='WebSocketApiId'].OutputValue" \
  --output text)

echo "WebSocket API ID: $WS_API_ID"
```

#### Step 2: Build and Push Docker Image

```bash
# Get your AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Account ID: $AWS_ACCOUNT_ID"

# Create ECR repository
aws ecr create-repository \
  --repository-name cloud-hack-api \
  --region us-east-1 || echo "Repository already exists"

# Build Docker image
docker build -t cloud-hack-api:latest .

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com

# Tag image
docker tag cloud-hack-api:latest \
  ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/cloud-hack-api:latest

# Push to ECR
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/cloud-hack-api:latest
```

#### Step 3: Deploy Fargate Stack

⚠️ **IMPORTANT:** AWS Academy might not allow CloudFormation with some resources (VPC creation, etc.)

**Try this first:**
```bash
aws cloudformation deploy \
  --template-file fargate-stack.yml \
  --stack-name cloud-hack-fargate-dev \
  --parameter-overrides \
      Environment=dev \
      ECRImageUri=${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/cloud-hack-api:latest \
      ReportsTableName=ReportsTable-dev \
      ConnectionsTableName=ConnectionsTable-dev \
      UsersTableName=UsersTable-dev \
      WebSocketApiId=${WS_API_ID} \
  --capabilities CAPABILITY_IAM \
  --region us-east-1
```

**If it fails with permission errors:**

You may need to create resources manually via AWS Console (see "Manual Setup via Console" below).

#### Step 4: Get Outputs

```bash
# Get ALB URL
ALB_URL=$(aws cloudformation describe-stacks \
  --stack-name cloud-hack-fargate-dev \
  --query "Stacks[0].Outputs[?OutputKey=='LoadBalancerURL'].OutputValue" \
  --output text)

# Get WebSocket URL
WS_URL=$(aws cloudformation describe-stacks \
  --stack-name cloud-hack-websocket-dev \
  --query "Stacks[0].Outputs[?OutputKey=='WebSocketUrl'].OutputValue" \
  --output text)

echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo "REST API URL: $ALB_URL"
echo "WebSocket URL: $WS_URL"
echo "========================================="
```

---

## Manual Setup via AWS Console (If CloudFormation Fails)

If AWS Academy restricts CloudFormation, create resources manually:

### 1. Create ECS Cluster
1. Go to **ECS** → **Clusters**
2. Click **Create Cluster**
3. Select **Networking only** (Fargate)
4. Name: `dev-cloud-hack-cluster`
5. **Uncheck** "Create VPC" (use default VPC)
6. Click **Create**

### 2. Create Task Definition
1. Go to **ECS** → **Task Definitions**
2. Click **Create new Task Definition**
3. Select **Fargate**
4. Configure:
   - Task Definition Name: `dev-cloud-hack-task`
   - Task Role: `LabRole`
   - Task Execution Role: `LabRole`
   - Task Memory: `1GB`
   - Task CPU: `0.5 vCPU`

5. Add Container:
   - Container name: `cloud-hack-api`
   - Image: `<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/cloud-hack-api:latest`
   - Port mappings: `80`
   - Environment variables:
     - `TABLE_NAME` = `ReportsTable-dev`
     - `CONNECTIONS_TABLE` = `ConnectionsTable-dev`
     - `USERS_TABLE` = `UsersTable-dev`
     - `AWS_REGION` = `us-east-1`
     - `WS_API_ID` = `<your_ws_api_id>`
     - `WS_STAGE` = `dev`
   - Log configuration:
     - awslogs-group: `/ecs/dev-cloud-hack`
     - awslogs-region: `us-east-1`
     - awslogs-stream-prefix: `ecs`

6. Click **Create**

### 3. Create Application Load Balancer
1. Go to **EC2** → **Load Balancers**
2. Click **Create Load Balancer**
3. Select **Application Load Balancer**
4. Configure:
   - Name: `dev-cloud-hack-alb`
   - Scheme: `internet-facing`
   - IP address type: `ipv4`
   - VPC: Select default VPC
   - Mappings: Select **at least 2** availability zones

5. Security Group:
   - Create new security group
   - Allow inbound: HTTP (80) from `0.0.0.0/0`

6. Configure Target Group:
   - Target type: `IP`
   - Protocol: `HTTP`
   - Port: `80`
   - Health check path: `/health`

7. Click **Create**

### 4. Create ECS Service
1. Go to **ECS** → **Clusters** → `dev-cloud-hack-cluster`
2. Click **Create** in Services tab
3. Configure:
   - Launch type: `Fargate`
   - Task Definition: `dev-cloud-hack-task:latest`
   - Service name: `dev-cloud-hack-service`
   - Number of tasks: `1`
   - Minimum healthy percent: `0` (for single task)
   - Maximum percent: `200`

4. Configure Network:
   - VPC: Default VPC
   - Subnets: Select **at least 2** public subnets
   - Security group: Create new
     - Allow inbound HTTP (80) from ALB security group
   - Public IP: `ENABLED`

5. Load Balancing:
   - Load balancer type: `Application Load Balancer`
   - Select your ALB
   - Container to load balance: `cloud-hack-api:80`
   - Target group: Select the one you created

6. Click **Create Service**

---

## Troubleshooting AWS Academy Issues

### Issue: "Access Denied" when deploying CloudFormation
**Solution:** Use manual setup via AWS Console (see above)

### Issue: "Cannot create VPC" 
**Solution:** Use default VPC instead. The CloudFormation template creates a new VPC, but you can skip this in AWS Academy.

### Issue: Session expired
**Solution:** 
1. Go back to AWS Academy
2. Click "Start Lab" again
3. Update credentials in `~/.aws/credentials`
4. Continue deployment

### Issue: ECR repository not found after session restart
**Solution:** 
```bash
# Recreate ECR repository
aws ecr create-repository --repository-name cloud-hack-api --region us-east-1

# Rebuild and push image
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/cloud-hack-api:latest
```

### Issue: Docker permission denied
**Solution:**
```bash
# Add user to docker group
sudo usermod -a -G docker $USER

# Log out and back in, or run:
newgrp docker

# Test
docker ps
```

### Issue: Task failing to start
**Solution:**
```bash
# Check logs
aws logs tail /ecs/dev-cloud-hack --follow

# Common issues:
# 1. Missing environment variables
# 2. Wrong ECR image URI
# 3. LabRole missing permissions
```

### Issue: Can't pull image from ECR
**Solution:**
Make sure Task Execution Role (LabRole) has these permissions:
- `ecr:GetAuthorizationToken`
- `ecr:BatchCheckLayerAvailability`
- `ecr:GetDownloadUrlForLayer`
- `ecr:BatchGetImage`

These should be included in LabRole, but verify in IAM console.

---

## Testing Your Deployment

### 1. Test Health Endpoint
```bash
# Get ALB URL
ALB_URL=$(aws cloudformation describe-stacks \
  --stack-name cloud-hack-fargate-dev \
  --query "Stacks[0].Outputs[?OutputKey=='LoadBalancerURL'].OutputValue" \
  --output text 2>/dev/null)

# If CloudFormation doesn't work, get from console:
# EC2 → Load Balancers → Copy DNS name

# Test health
curl http://${ALB_URL}/health
```

### 2. Test Registration
```bash
curl -X POST http://${ALB_URL}/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Test Student",
    "email": "test@utec.edu.pe",
    "password": "test123"
  }'
```

### 3. Test Login
```bash
curl -X POST http://${ALB_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@utec.edu.pe",
    "password": "test123"
  }'
```

---

## Update Frontend

Once deployed, update your frontend:

```bash
# Get the URLs
echo "ALB URL: $ALB_URL"
echo "WebSocket URL: $WS_URL"

# Update frontend/auth.js
nano frontend/auth.js
# Change line 2 to: const API_BASE_URL = 'http://YOUR_ALB_URL';

# Update frontend/app.js (if needed)
nano frontend/app.js
# Update WebSocket URL
```

---

## Save Money in AWS Academy

### Stop ECS Service when not using
```bash
aws ecs update-service \
  --cluster dev-cloud-hack-cluster \
  --service dev-cloud-hack-service \
  --desired-count 0
```

### Start ECS Service again
```bash
aws ecs update-service \
  --cluster dev-cloud-hack-cluster \
  --service dev-cloud-hack-service \
  --desired-count 1
```

### Delete Everything After Demo
```bash
# Delete Fargate stack (if using CloudFormation)
aws cloudformation delete-stack --stack-name cloud-hack-fargate-dev

# Or delete manually via console:
# 1. ECS Service
# 2. ECS Task Definition
# 3. ECS Cluster
# 4. Load Balancer
# 5. Target Group
# 6. Security Groups

# Delete WebSocket/DynamoDB
sls remove --stage dev --config serverless-websocket-only.yml

# Delete ECR
aws ecr delete-repository \
  --repository-name cloud-hack-api \
  --force
```

---

## Complete EC2 Deployment Checklist

- [ ] Install Docker on EC2
- [ ] Install AWS CLI v2
- [ ] Install Node.js and Serverless Framework
- [ ] Configure AWS Academy credentials
- [ ] Clone project from GitHub
- [ ] Deploy DynamoDB and WebSocket (serverless)
- [ ] Build Docker image
- [ ] Push image to ECR
- [ ] Deploy Fargate (CloudFormation or Manual)
- [ ] Test API endpoints
- [ ] Update frontend URLs
- [ ] Test complete application

---

## Quick Commands Summary

```bash
# 1. Install prerequisites
sudo yum install -y docker nodejs git
sudo service docker start
sudo usermod -a -G docker ec2-user
npm install -g serverless

# 2. Configure AWS
nano ~/.aws/credentials  # Paste AWS Academy credentials

# 3. Clone project
git clone https://github.com/fatima-pv/cloud-hack.git
cd cloud-hack

# 4. Deploy
chmod +x deploy-fargate.sh
./deploy-fargate.sh

# 5. Test
curl http://YOUR-ALB-URL/health
```

---

## Need Help?

**Check logs:**
```bash
aws logs tail /ecs/dev-cloud-hack --follow
```

**Check ECS service status:**
```bash
aws ecs describe-services \
  --cluster dev-cloud-hack-cluster \
  --services dev-cloud-hack-service
```

**Check task status:**
```bash
aws ecs list-tasks --cluster dev-cloud-hack-cluster
```

---

## Key Takeaways for AWS Academy

1. ✅ Session credentials expire every ~4 hours
2. ✅ Use LabRole for all IAM permissions
3. ✅ CloudFormation might have restrictions → use Console
4. ✅ Default VPC is easier than creating new one
5. ✅ ECR works fine in AWS Academy
6. ✅ Stop services when not using to avoid charges

**Good luck! 🚀**
