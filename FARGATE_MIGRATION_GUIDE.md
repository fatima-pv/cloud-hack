# 🚀 Fargate Migration Guide

## Overview
This guide walks you through migrating your Cloud Hack application from pure Lambda to a **Hybrid Architecture**:
- **Fargate ECS**: REST API endpoints (app.py, auth.py, users.py)
- **Lambda**: WebSocket handlers (connect/disconnect)
- **DynamoDB**: Managed by existing serverless.yml

## Why Hybrid?
- ✅ Simplest migration path
- ✅ WebSocket still works (Lambda is perfect for this)
- ✅ REST API runs in a container (Fargate)
- ✅ No need to rewrite WebSocket logic
- ✅ Demo-ready in minutes

---

## Architecture Before & After

### BEFORE (100% Serverless)
```
Frontend (Amplify)
    ↓
API Gateway → Lambda Functions → DynamoDB
    ↓
WebSocket API → Lambda (WS) → DynamoDB
```

### AFTER (Hybrid)
```
Frontend (Amplify)
    ↓
Application Load Balancer → Fargate (ECS) → DynamoDB
    ↓
WebSocket API → Lambda (WS) → DynamoDB (unchanged)
```

---

## Prerequisites

1. **AWS CLI** configured
2. **Docker** installed locally
3. **AWS Account** with permissions for:
   - ECS (Fargate)
   - ECR (Container Registry)
   - VPC, ALB, Security Groups
   - IAM roles

---

## Step-by-Step Migration

### Step 1: Update Dockerfile (Fixed)

Your current Dockerfile is good but needs minor adjustments:

```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY src/ ./src/

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80/health || exit 1

# Run with gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:80", "src.server:app", "--workers", "2", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-"]
```

### Step 2: Update server.py (Fixed)

Your `server.py` is correct! Just ensure CORS headers are properly set.

### Step 3: Update requirements.txt

Add missing dependencies:

```txt
Flask==2.2.5
gunicorn==20.1.0
boto3
Werkzeug==2.2.3
```

### Step 4: Keep WebSocket in Lambda

**DO NOT MIGRATE** `connect.py` and `disconnect.py` to Fargate. They stay in Lambda via serverless.yml.

Update your `serverless.yml` to remove REST API functions (keep only WebSocket):

```yaml
functions:
  # Remove: api, auth, users functions
  
  # KEEP THESE:
  wsConnect:
    handler: src/connect.lambda_handler
    description: Handle WebSocket connections
    events:
      - websocket:
          route: $connect
    environment:
      CONNECTIONS_TABLE: ${self:custom.connectionsTableName}

  wsDisconnect:
    handler: src/disconnect.lambda_handler
    description: Handle WebSocket disconnections
    events:
      - websocket:
          route: $disconnect
    environment:
      CONNECTIONS_TABLE: ${self:custom.connectionsTableName}
```

### Step 5: Deploy Infrastructure

#### 5.1 Build Docker Image

```bash
# Build image
docker build -t cloud-hack-api .

# Test locally
docker run -p 8080:80 \
  -e TABLE_NAME=ReportsTable-dev \
  -e CONNECTIONS_TABLE=ConnectionsTable-dev \
  -e USERS_TABLE=UsersTable-dev \
  -e AWS_ACCESS_KEY_ID=your_key \
  -e AWS_SECRET_ACCESS_KEY=your_secret \
  -e AWS_DEFAULT_REGION=us-east-1 \
  cloud-hack-api

# Test endpoint
curl http://localhost:8080/health
```

#### 5.2 Push to ECR

```bash
# Create ECR repository
aws ecr create-repository --repository-name cloud-hack-api --region us-east-1

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Tag image
docker tag cloud-hack-api:latest <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/cloud-hack-api:latest

# Push to ECR
docker push <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/cloud-hack-api:latest
```

#### 5.3 Create ECS Cluster & Service

Use the AWS Console or CloudFormation (I'll create a template for you).

**Via Console:**
1. Go to ECS → Create Cluster
2. Choose "Networking only" (Fargate)
3. Name: `cloud-hack-cluster`
4. Create

Then create Task Definition:
1. Choose Fargate
2. Task memory: 1GB
3. Task CPU: 0.5 vCPU
4. Container definition:
   - Image: Your ECR URL
   - Port: 80
   - Environment variables:
     - TABLE_NAME
     - CONNECTIONS_TABLE
     - USERS_TABLE
     - AWS_REGION
     - WS_API_ID (from serverless output)
     - WS_STAGE

5. Create Service:
   - Launch type: Fargate
   - Number of tasks: 1
   - Load balancer: Application Load Balancer
   - Health check: `/health`

### Step 6: Update Frontend

Update `frontend/auth.js` and `frontend/app.js`:

```javascript
// Replace API Gateway REST URL with ALB URL
const API_BASE_URL = 'http://your-alb-url.us-east-1.elb.amazonaws.com';

// WebSocket URL stays the same (from Lambda/API Gateway)
const WS_URL = 'wss://xxxxx.execute-api.us-east-1.amazonaws.com/dev';
```

---

## Testing

### 1. Test REST API (Fargate)
```bash
# Health check
curl http://your-alb-url/health

# Register
curl -X POST http://your-alb-url/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Test","email":"test@utec.edu.pe","password":"test123"}'

# Login
curl -X POST http://your-alb-url/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@utec.edu.pe","password":"test123"}'

# List incidents
curl http://your-alb-url/incidentes \
  -H "X-User-Email: test@utec.edu.pe"
```

### 2. Test WebSocket (Lambda - unchanged)
Should work exactly as before via API Gateway WebSocket URL.

---

## Cost Comparison (Estimated)

**Lambda (Current)**
- Pay per request
- ~$0.20 per million requests
- Free tier: 1M requests/month

**Fargate (Hybrid)**
- Pay per hour of running
- ~$30/month for 1 task (0.5 vCPU, 1GB) running 24/7
- WebSocket still on Lambda (cheap)

**For Demo**: Fargate is fine, stop tasks when not in use.

---

## Troubleshooting

### Issue: Container won't start
**Check logs:**
```bash
aws logs tail /ecs/cloud-hack-task --follow
```

### Issue: Health check failing
**Verify:**
- Container is listening on port 80
- `/health` endpoint returns 200
- Security group allows ALB to reach container

### Issue: DynamoDB access denied
**Fix:** Add IAM policy to ECS Task Role:
```json
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:PutItem",
    "dynamodb:GetItem",
    "dynamodb:Scan",
    "dynamodb:Query",
    "dynamodb:UpdateItem"
  ],
  "Resource": "arn:aws:dynamodb:us-east-1:*:table/ReportsTable-*"
}
```

### Issue: Can't send WebSocket messages from Fargate
**Fix:** Add permission for `execute-api:ManageConnections`:
```json
{
  "Effect": "Allow",
  "Action": [
    "execute-api:ManageConnections",
    "execute-api:Invoke"
  ],
  "Resource": "arn:aws:execute-api:us-east-1:*:*/dev/*"
}
```

---

## Quick Start Commands

```bash
# 1. Deploy DynamoDB and WebSocket (Lambda)
sls deploy --stage dev

# 2. Build and push Docker image
docker build -t cloud-hack-api .
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
docker tag cloud-hack-api:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/cloud-hack-api:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/cloud-hack-api:latest

# 3. Create ECS cluster and service (via Console or CloudFormation)

# 4. Update frontend URLs
# Edit frontend/auth.js and app.js with new ALB URL

# 5. Deploy frontend to Amplify
# Push changes to your git repo connected to Amplify
```

---

## Next Steps After Demo

If you want to go **100% Fargate** (no Lambda at all):
1. Implement WebSocket in Flask using Flask-SocketIO
2. Use Redis for connection management
3. Deploy WebSocket on separate Fargate service
4. More complex, not needed for demo

---

## Files Modified

✅ `Dockerfile` - Updated
✅ `server.py` - Already correct
✅ `requirements.txt` - Add Werkzeug
✅ `serverless.yml` - Remove REST functions, keep WebSocket
✅ `frontend/auth.js` - Update API_BASE_URL
✅ `frontend/app.js` - Update API_BASE_URL

---

## Summary

This hybrid approach gives you:
- ✅ Fargate experience (containerized REST API)
- ✅ Working WebSocket (still on Lambda)
- ✅ Same DynamoDB setup
- ✅ Minimal code changes
- ✅ Demo-ready quickly

**Estimated time**: 1-2 hours for someone familiar with AWS.

Good luck! 🚀
