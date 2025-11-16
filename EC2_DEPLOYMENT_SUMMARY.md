# 📋 EC2 Deployment Summary - All Files

## New Files Created for EC2 Deployment

### 1. **AWS_ACADEMY_EC2_DEPLOYMENT.md** 
Complete guide for deploying from EC2 in AWS Academy
- Prerequisites installation (Docker, AWS CLI, Node.js, Serverless)
- AWS Academy credential configuration
- Step-by-step deployment instructions
- Manual setup via AWS Console (if CloudFormation restricted)
- Troubleshooting AWS Academy-specific issues

### 2. **deploy-fargate-ec2.sh**
Automated deployment script optimized for EC2/AWS Academy
- Checks for AWS Academy LabRole
- Handles temporary credentials
- Validates prerequisites
- Provides fallback instructions if CloudFormation fails
- More verbose output for debugging

### 3. **QUICKSTART_EC2.md**
Quick reference for EC2 deployment
- One-page guide with all essential commands
- Fast setup and deployment steps
- Troubleshooting quick fixes

---

## Deployment Options from EC2

### Option 1: Automated (Recommended) ⭐

```bash
# One-time setup
sudo yum install -y docker git
sudo service docker start
sudo usermod -a -G docker ec2-user
newgrp docker

curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
sudo npm install -g serverless

# Configure AWS credentials (from AWS Academy)
mkdir -p ~/.aws
nano ~/.aws/credentials  # Paste credentials

# Clone and deploy
git clone https://github.com/fatima-pv/cloud-hack.git
cd cloud-hack
chmod +x deploy-fargate-ec2.sh
./deploy-fargate-ec2.sh
```

**Time:** 10-15 minutes

### Option 2: Manual Setup via AWS Console

If CloudFormation fails due to AWS Academy restrictions:

1. **Deploy DynamoDB + WebSocket** (via Serverless Framework) ✅
2. **Build and push Docker image** (via CLI) ✅
3. **Create ECS resources manually:**
   - ECS Cluster
   - Task Definition
   - Application Load Balancer
   - ECS Service

See `AWS_ACADEMY_EC2_DEPLOYMENT.md` for detailed steps.

**Time:** 30-40 minutes

---

## Key Differences: EC2 vs Local Deployment

| Aspect | Local (Windows) | EC2 (Linux) |
|--------|-----------------|-------------|
| **Script** | `deploy-fargate.bat` | `deploy-fargate-ec2.sh` |
| **Shell** | CMD/PowerShell | Bash |
| **Package Manager** | npm (manual install) | yum |
| **Docker** | Docker Desktop | Docker daemon |
| **AWS Credentials** | Permanent IAM user | AWS Academy (temporary) |
| **Permissions** | Full (personal account) | LabRole (restricted) |
| **Session** | Persistent | Expires ~4 hours |

---

## AWS Academy Specific Considerations

### ⚠️ Limitations

1. **Temporary Credentials**
   - Expire after ~4 hours
   - Must refresh from AWS Academy portal
   - Include session token

2. **LabRole Permissions**
   - May restrict some CloudFormation resources
   - VPC creation might be limited
   - Use default VPC instead

3. **Resource Cleanup**
   - Lab resets periodically
   - ECR repositories may need recreation
   - Save deployment commands for re-deployment

### ✅ What Works Well

- ✅ DynamoDB (via Serverless Framework)
- ✅ Lambda functions
- ✅ API Gateway (REST + WebSocket)
- ✅ ECR (Docker registry)
- ✅ ECS Fargate (usually works)
- ✅ Application Load Balancer (usually works)

### ⚠️ What Might Fail

- ⚠️ CloudFormation (permission restrictions)
- ⚠️ VPC creation (use default VPC)
- ⚠️ Some IAM role operations

---

## Complete File Structure

```
cloud-hack/
├── Deployment Scripts
│   ├── deploy-fargate.bat           # Windows local
│   ├── deploy-fargate.sh            # Linux/Mac local
│   └── deploy-fargate-ec2.sh        # EC2 (NEW) ⭐
│
├── Infrastructure
│   ├── fargate-stack.yml            # CloudFormation
│   ├── serverless-websocket-only.yml # Serverless (simplified)
│   └── serverless.yml               # Original (backup)
│
├── Docker
│   ├── Dockerfile                   # Container definition
│   └── requirements.txt             # Python dependencies
│
├── Application Code
│   ├── src/
│   │   ├── server.py               # Flask wrapper
│   │   ├── app.py                  # REST API
│   │   ├── auth.py                 # Authentication
│   │   ├── users.py                # User management
│   │   ├── connect.py              # WebSocket connect
│   │   └── disconnect.py           # WebSocket disconnect
│   └── frontend/
│       └── [frontend files]
│
├── Documentation (General)
│   ├── README_FARGATE.md           # Quick start (general)
│   ├── MIGRATION_FILE_SUMMARY.md   # What changed
│   ├── FARGATE_MIGRATION_GUIDE.md  # Detailed guide
│   ├── FARGATE_QUICK_REFERENCE.md  # Commands cheatsheet
│   └── ARCHITECTURE_DIAGRAMS.md    # Visual diagrams
│
└── Documentation (EC2/AWS Academy) (NEW)
    ├── AWS_ACADEMY_EC2_DEPLOYMENT.md ⭐ # Complete EC2 guide
    └── QUICKSTART_EC2.md              ⭐ # Quick EC2 reference
```

---

## Workflow for EC2 Deployment

```
┌─────────────────────┐
│  Connect to EC2     │
│  (SSH or Console)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  One-Time Setup     │
│  - Install Docker   │
│  - Install AWS CLI  │
│  - Install Node.js  │
│  - Install sls      │
│  - Configure creds  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Clone Project      │
│  from GitHub        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Run Deploy Script  │
│  ./deploy-fargate-  │
│  ec2.sh             │
└──────────┬──────────┘
           │
           ├─────────────────────┐
           │                     │
           ▼                     ▼
┌──────────────────┐   ┌──────────────────┐
│ CloudFormation   │   │  Manual Setup    │
│ Works ✅         │   │  via Console     │
│                  │   │  (if CF fails)   │
│ → Get URLs       │   │  → Create ECS    │
│ → Update frontend│   │  → Get ALB URL   │
└──────────────────┘   └──────────────────┘
           │                     │
           └─────────┬───────────┘
                     │
                     ▼
           ┌─────────────────┐
           │  Test API       │
           │  Update Frontend│
           │  Deploy to Demo │
           └─────────────────┘
```

---

## Quick Commands for EC2

```bash
# === SETUP (ONE TIME) ===

# Install prerequisites
sudo yum update -y
sudo yum install -y docker git
sudo service docker start
sudo usermod -a -G docker ec2-user
newgrp docker

curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
sudo npm install -g serverless

curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS (paste credentials from AWS Academy)
mkdir -p ~/.aws
nano ~/.aws/credentials

# === DEPLOY ===

# Clone project
cd ~
git clone https://github.com/fatima-pv/cloud-hack.git
cd cloud-hack
git checkout diego

# Deploy everything
chmod +x deploy-fargate-ec2.sh
./deploy-fargate-ec2.sh

# === TEST ===

# Get URLs
aws cloudformation describe-stacks --stack-name cloud-hack-fargate-dev \
  --query "Stacks[0].Outputs[?OutputKey=='LoadBalancerURL'].OutputValue" \
  --output text

# Test API
curl http://YOUR-ALB-URL/health

# === MANAGE ===

# Stop service (save money)
aws ecs update-service --cluster dev-cloud-hack-cluster \
  --service dev-cloud-hack-service --desired-count 0

# Start service
aws ecs update-service --cluster dev-cloud-hack-cluster \
  --service dev-cloud-hack-service --desired-count 1

# View logs
aws logs tail /ecs/dev-cloud-hack --follow

# === CLEANUP ===

# Delete everything
aws cloudformation delete-stack --stack-name cloud-hack-fargate-dev
sls remove --stage dev --config serverless-websocket-only.yml
aws ecr delete-repository --repository-name cloud-hack-api --force
```

---

## Troubleshooting on EC2

### Issue: Permission denied (docker)
```bash
sudo usermod -a -G docker $USER
newgrp docker
```

### Issue: AWS credentials expired
```bash
# Go to AWS Academy → AWS Details → Copy new credentials
nano ~/.aws/credentials
# Paste new credentials
```

### Issue: CloudFormation fails
```bash
# Use manual setup via AWS Console
# See AWS_ACADEMY_EC2_DEPLOYMENT.md section "Manual Setup via AWS Console"
```

### Issue: Can't connect to ALB
```bash
# Check security group allows HTTP (80) from 0.0.0.0/0
# Verify ALB is in public subnets
# Check ALB state: aws elbv2 describe-load-balancers
```

### Issue: Container won't start
```bash
# Check logs
aws logs tail /ecs/dev-cloud-hack --follow

# Check task status
aws ecs describe-tasks --cluster dev-cloud-hack-cluster \
  --tasks $(aws ecs list-tasks --cluster dev-cloud-hack-cluster --query 'taskArns[0]' --output text)
```

---

## Cost Management on AWS Academy

### During Development
```bash
# Stop when not using (saves ~$1-2/day)
aws ecs update-service --cluster dev-cloud-hack-cluster \
  --service dev-cloud-hack-service --desired-count 0
```

### After Demo
```bash
# Delete all resources
./cleanup.sh  # (or manual deletion)
```

### Session Management
- AWS Academy sessions expire after ~4 hours
- Lab budget is limited ($100 typically)
- Monitor usage in AWS Academy dashboard
- **Best practice:** Delete resources when not actively testing

---

## Documentation Priority

**For EC2 deployment, read in this order:**

1. **QUICKSTART_EC2.md** ⭐ (5 minutes)
   - Quick overview
   - Essential commands
   - Fast deployment path

2. **AWS_ACADEMY_EC2_DEPLOYMENT.md** ⭐⭐ (15 minutes)
   - Complete setup guide
   - Detailed instructions
   - Manual fallback steps
   - Troubleshooting

3. **FARGATE_MIGRATION_GUIDE.md** (optional)
   - Architecture explanation
   - Why hybrid approach
   - General concepts

4. **FARGATE_QUICK_REFERENCE.md** (reference)
   - Command cheatsheet
   - Troubleshooting tips

5. **ARCHITECTURE_DIAGRAMS.md** (optional)
   - Visual diagrams
   - Data flows
   - Cost breakdown

---

## Success Checklist

- [ ] EC2 instance launched in AWS Academy
- [ ] Docker installed and running
- [ ] AWS CLI v2 installed
- [ ] Node.js and Serverless Framework installed
- [ ] AWS credentials configured (from AWS Academy)
- [ ] Project cloned from GitHub
- [ ] Deployment script executed successfully
- [ ] DynamoDB tables created
- [ ] WebSocket API deployed
- [ ] Docker image in ECR
- [ ] ECS cluster, task, and service created
- [ ] Application Load Balancer configured
- [ ] Health check passing: `curl ALB-URL/health`
- [ ] Frontend updated with ALB URL
- [ ] Full end-to-end test completed

---

## Summary

**What's New:**
- ✅ EC2-specific deployment script (`deploy-fargate-ec2.sh`)
- ✅ Complete EC2 setup guide (`AWS_ACADEMY_EC2_DEPLOYMENT.md`)
- ✅ Quick reference for EC2 (`QUICKSTART_EC2.md`)

**What You Need:**
1. EC2 instance in AWS Academy
2. AWS Academy credentials (refresh every ~4 hours)
3. 30-40 minutes for first-time setup
4. 10-15 minutes for re-deployment

**Key Differences from Local:**
- Using Linux commands (yum, bash)
- Temporary AWS credentials
- May need manual AWS Console setup
- Session management required

**Ready to deploy from EC2?**
```bash
./deploy-fargate-ec2.sh
```

🚀 Good luck!
