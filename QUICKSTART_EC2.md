# 🚀 Quick Start - Deploy from EC2 (AWS Academy)

## Connect to Your EC2 Instance

```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
# Or use EC2 Instance Connect in AWS Console
```

---

## One-Time Setup (First Time Only)

### 1. Install Prerequisites

```bash
# Update system
sudo yum update -y

# Install Docker
sudo yum install -y docker
sudo service docker start
sudo usermod -a -G docker ec2-user
newgrp docker  # Refresh group membership

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
sudo yum install -y unzip
unzip awscliv2.zip
sudo ./aws/install

# Install Node.js and Serverless
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
sudo npm install -g serverless

# Verify installations
docker --version
aws --version
node --version
sls --version
```

### 2. Configure AWS Credentials

```bash
# Get credentials from AWS Academy:
# 1. Go to AWS Academy Learner Lab
# 2. Click "AWS Details"
# 3. Copy the credentials

# Configure credentials
mkdir -p ~/.aws
nano ~/.aws/credentials
```

**Paste this (with your actual values):**
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

**Paste:**
```ini
[default]
region=us-east-1
output=json
```

**Test:**
```bash
aws sts get-caller-identity
# Should show your account and LabRole
```

### 3. Clone Your Project

```bash
cd ~
git clone https://github.com/fatima-pv/cloud-hack.git
cd cloud-hack
git checkout diego  # Your branch
```

---

## Deploy to Fargate (Every Time)

### Option 1: Automated Script (Recommended)

```bash
chmod +x deploy-fargate-ec2.sh
./deploy-fargate-ec2.sh
```

**⏱️ Total time:** ~10-15 minutes

### Option 2: Manual Steps

```bash
# 1. Deploy DynamoDB and WebSocket
sls deploy --stage dev --config serverless-websocket-only.yml

# 2. Get WebSocket API ID
WS_API_ID=$(aws cloudformation describe-stacks \
  --stack-name cloud-hack-websocket-dev \
  --query "Stacks[0].Outputs[?OutputKey=='WebSocketApiId'].OutputValue" \
  --output text)
echo "WS API ID: $WS_API_ID"

# 3. Build Docker image
docker build -t cloud-hack-api:latest .

# 4. Create ECR repository (first time only)
aws ecr create-repository --repository-name cloud-hack-api --region us-east-1

# 5. Push to ECR
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com

docker tag cloud-hack-api:latest \
  ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/cloud-hack-api:latest

docker push ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/cloud-hack-api:latest

# 6. Deploy Fargate (try CloudFormation first)
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

**If CloudFormation fails (common in AWS Academy):**
→ Follow manual setup in `AWS_ACADEMY_EC2_DEPLOYMENT.md`

---

## Get Your URLs

```bash
# REST API URL (ALB)
aws cloudformation describe-stacks \
  --stack-name cloud-hack-fargate-dev \
  --query "Stacks[0].Outputs[?OutputKey=='LoadBalancerURL'].OutputValue" \
  --output text

# Or from EC2 Console → Load Balancers → Copy DNS name

# WebSocket URL
aws cloudformation describe-stacks \
  --stack-name cloud-hack-websocket-dev \
  --query "Stacks[0].Outputs[?OutputKey=='WebSocketUrl'].OutputValue" \
  --output text
```

---

## Test Your Deployment

```bash
# Get ALB URL
ALB_URL="<your-alb-url>"

# Test health
curl http://${ALB_URL}/health

# Test registration
curl -X POST http://${ALB_URL}/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Test","email":"test@utec.edu.pe","password":"test123"}'

# Test login
curl -X POST http://${ALB_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@utec.edu.pe","password":"test123"}'
```

---

## Update Frontend

**Edit `frontend/auth.js`:**
```bash
nano frontend/auth.js
# Change line 2 to: const API_BASE_URL = 'http://YOUR-ALB-URL';
```

**Commit and push:**
```bash
git add frontend/auth.js
git commit -m "Update API URL for Fargate deployment"
git push origin diego
```

**Amplify will auto-deploy the updated frontend!**

---

## Troubleshooting

### Session Expired
```bash
# Go back to AWS Academy → "AWS Details" → Copy new credentials
nano ~/.aws/credentials
# Paste new credentials
```

### Docker Permission Denied
```bash
sudo usermod -a -G docker $USER
newgrp docker
```

### Check Logs
```bash
aws logs tail /ecs/dev-cloud-hack --follow
```

### Check ECS Status
```bash
aws ecs describe-services \
  --cluster dev-cloud-hack-cluster \
  --services dev-cloud-hack-service
```

---

## Stop Service (Save Money)

```bash
aws ecs update-service \
  --cluster dev-cloud-hack-cluster \
  --service dev-cloud-hack-service \
  --desired-count 0
```

## Start Service Again

```bash
aws ecs update-service \
  --cluster dev-cloud-hack-cluster \
  --service dev-cloud-hack-service \
  --desired-count 1
```

---

## Complete Cleanup

```bash
# Delete Fargate (if using CloudFormation)
aws cloudformation delete-stack --stack-name cloud-hack-fargate-dev

# Or delete manually via console:
# - ECS Service → Delete
# - ECS Cluster → Delete
# - Load Balancer → Delete
# - Target Group → Delete

# Delete WebSocket/DynamoDB
sls remove --stage dev --config serverless-websocket-only.yml

# Delete ECR
aws ecr delete-repository --repository-name cloud-hack-api --force
```

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `./deploy-fargate-ec2.sh` | Full automated deployment |
| `docker build -t cloud-hack-api .` | Build Docker image |
| `aws logs tail /ecs/dev-cloud-hack --follow` | View container logs |
| `curl http://ALB-URL/health` | Test API health |
| `aws ecs update-service ... --desired-count 0` | Stop service |
| `sls remove --config serverless-websocket-only.yml` | Delete serverless stack |

---

## Files You Need

- ✅ `AWS_ACADEMY_EC2_DEPLOYMENT.md` - Detailed guide
- ✅ `deploy-fargate-ec2.sh` - Automated script
- ✅ `serverless-websocket-only.yml` - Serverless config
- ✅ `fargate-stack.yml` - CloudFormation template
- ✅ `Dockerfile` - Container definition

---

## Summary

1. **One-time setup:** Install tools + configure credentials (~10 min)
2. **Deploy:** Run `./deploy-fargate-ec2.sh` (~10-15 min)
3. **Update frontend:** Edit `frontend/auth.js` with ALB URL
4. **Test:** Use curl or frontend
5. **Demo:** Show your working application!
6. **Cleanup:** Delete resources to avoid charges

**Estimated total time:** 25-30 minutes (first time)

---

**Need detailed help?** → See `AWS_ACADEMY_EC2_DEPLOYMENT.md`

**Ready to deploy?**
```bash
./deploy-fargate-ec2.sh
```

🚀 Good luck!
