# 🚀 Fargate Migration - Quick Reference

## One-Command Deployment

### Windows (CMD)
```cmd
deploy-fargate.bat
```

### Linux/Mac (Bash)
```bash
chmod +x deploy-fargate.sh
./deploy-fargate.sh
```

---

## Manual Step-by-Step (if script fails)

### 1. Deploy DynamoDB & WebSocket (Lambda)
```bash
sls deploy --stage dev --config serverless-websocket-only.yml
```

**Get WebSocket API ID:**
```bash
aws cloudformation describe-stacks \
  --stack-name cloud-hack-websocket-dev \
  --query "Stacks[0].Outputs[?OutputKey=='WebSocketApiId'].OutputValue" \
  --output text
```

### 2. Build & Push Docker Image

**Get Account ID:**
```bash
aws sts get-caller-identity --query Account --output text
```

**Create ECR repo (if needed):**
```bash
aws ecr create-repository --repository-name cloud-hack-api --region us-east-1
```

**Build image:**
```bash
docker build -t cloud-hack-api:latest .
```

**Test locally (optional):**
```bash
docker run -p 8080:80 \
  -e TABLE_NAME=ReportsTable-dev \
  -e CONNECTIONS_TABLE=ConnectionsTable-dev \
  -e USERS_TABLE=UsersTable-dev \
  -e AWS_ACCESS_KEY_ID=your_key \
  -e AWS_SECRET_ACCESS_KEY=your_secret \
  -e AWS_REGION=us-east-1 \
  -e WS_API_ID=your_ws_api_id \
  -e WS_STAGE=dev \
  cloud-hack-api

# Test: curl http://localhost:8080/health
```

**Login to ECR:**
```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
```

**Tag & Push:**
```bash
docker tag cloud-hack-api:latest \
  <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/cloud-hack-api:latest

docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/cloud-hack-api:latest
```

### 3. Deploy Fargate Stack

```bash
aws cloudformation deploy \
  --template-file fargate-stack.yml \
  --stack-name cloud-hack-fargate-dev \
  --parameter-overrides \
      Environment=dev \
      ECRImageUri=<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/cloud-hack-api:latest \
      ReportsTableName=ReportsTable-dev \
      ConnectionsTableName=ConnectionsTable-dev \
      UsersTableName=UsersTable-dev \
      WebSocketApiId=<WS_API_ID> \
  --capabilities CAPABILITY_IAM \
  --region us-east-1
```

### 4. Get Outputs

**ALB URL:**
```bash
aws cloudformation describe-stacks \
  --stack-name cloud-hack-fargate-dev \
  --query "Stacks[0].Outputs[?OutputKey=='LoadBalancerURL'].OutputValue" \
  --output text
```

**WebSocket URL:**
```bash
aws cloudformation describe-stacks \
  --stack-name cloud-hack-websocket-dev \
  --query "Stacks[0].Outputs[?OutputKey=='WebSocketUrl'].OutputValue" \
  --output text
```

---

## Testing Endpoints

### Health Check
```bash
curl http://<ALB_URL>/health
```

### Register User
```bash
curl -X POST http://<ALB_URL>/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Test Student",
    "email": "test@utec.edu.pe",
    "password": "test123"
  }'
```

### Login
```bash
curl -X POST http://<ALB_URL>/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@utec.edu.pe",
    "password": "test123"
  }'
```

### Create Incident
```bash
curl -X POST http://<ALB_URL>/incidentes \
  -H "Content-Type: application/json" \
  -H "X-User-Email: test@utec.edu.pe" \
  -d '{
    "titulo": "Test Incident",
    "descripcion": "Test description",
    "tipo": "Infraestructura",
    "piso": "1",
    "lugar_especifico": "Aula 101"
  }'
```

### List Incidents
```bash
curl http://<ALB_URL>/incidentes \
  -H "X-User-Email: test@utec.edu.pe"
```

---

## Update Frontend

### 1. Update `frontend/auth.js`
```javascript
// Line 2 - Update API_BASE_URL
const API_BASE_URL = 'http://<YOUR_ALB_URL>';
```

### 2. Update `frontend/app.js`
```javascript
// Around line 110 - Update WebSocket URL (or use input field)
const WS_URL = 'wss://<YOUR_WS_API_ID>.execute-api.us-east-1.amazonaws.com/dev';
```

### 3. Test Frontend Locally
```bash
cd frontend
python -m http.server 8080
# Open http://localhost:8080 in browser
```

---

## Monitoring & Debugging

### View ECS Logs
```bash
aws logs tail /ecs/dev-cloud-hack --follow
```

### Check ECS Service Status
```bash
aws ecs describe-services \
  --cluster dev-cloud-hack-cluster \
  --services dev-cloud-hack-service \
  --region us-east-1
```

### Check Task Status
```bash
aws ecs list-tasks \
  --cluster dev-cloud-hack-cluster \
  --region us-east-1
```

### View DynamoDB Tables
```bash
aws dynamodb scan --table-name ReportsTable-dev --limit 10
aws dynamodb scan --table-name UsersTable-dev --limit 10
aws dynamodb scan --table-name ConnectionsTable-dev --limit 10
```

---

## Cleanup (Delete Everything)

### Delete Fargate Stack
```bash
aws cloudformation delete-stack --stack-name cloud-hack-fargate-dev
```

### Delete WebSocket/DynamoDB Stack
```bash
sls remove --stage dev --config serverless-websocket-only.yml
```

### Delete ECR Images
```bash
aws ecr batch-delete-image \
  --repository-name cloud-hack-api \
  --image-ids imageTag=latest
```

### Delete ECR Repository
```bash
aws ecr delete-repository \
  --repository-name cloud-hack-api \
  --force
```

---

## Troubleshooting

### Container won't start
1. Check logs: `aws logs tail /ecs/dev-cloud-hack --follow`
2. Verify environment variables in task definition
3. Test Docker image locally first

### Health check failing
1. Ensure `/health` endpoint returns 200
2. Check security group allows ALB → ECS traffic
3. Verify container is listening on port 80

### DynamoDB access denied
1. Check ECS Task Role has DynamoDB permissions
2. Verify table names match environment variables
3. Check AWS region is correct

### WebSocket not working
1. WebSocket should still work via Lambda (unchanged)
2. Verify WS_API_ID is correct in Fargate environment
3. Check Task Role has `execute-api:ManageConnections` permission

### Can't connect to REST API
1. Check ALB security group allows inbound HTTP (port 80)
2. Verify ALB is in public subnets with internet gateway
3. Test with: `curl http://<ALB_URL>/health`

---

## Cost Optimization

**For Demo/Testing:**
- Stop ECS service when not in use:
  ```bash
  aws ecs update-service \
    --cluster dev-cloud-hack-cluster \
    --service dev-cloud-hack-service \
    --desired-count 0
  ```

- Start again:
  ```bash
  aws ecs update-service \
    --cluster dev-cloud-hack-cluster \
    --service dev-cloud-hack-service \
    --desired-count 1
  ```

**Estimated Costs (us-east-1, 24/7):**
- Fargate: ~$30/month (0.5 vCPU, 1GB)
- ALB: ~$20/month
- DynamoDB: Free tier / pay-per-request
- Lambda (WebSocket): Nearly free for demo usage
- **Total: ~$50/month** (vs ~$0 for pure serverless)

**Recommendation**: Delete stack when not using!

---

## Architecture Diagram

```
┌─────────────────┐
│  Frontend       │
│  (Amplify)      │
└────────┬────────┘
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌──────────────────┐  ┌──────────────┐
│ Application      │  │ WebSocket    │
│ Load Balancer    │  │ API Gateway  │
└────────┬─────────┘  └──────┬───────┘
         │                   │
         ▼                   ▼
┌──────────────────┐  ┌──────────────┐
│ ECS Fargate      │  │ Lambda       │
│ (REST API)       │  │ (WS Handlers)│
│ - app.py         │  │ - connect.py │
│ - auth.py        │  │ - disconnect │
│ - users.py       │  └──────┬───────┘
└────────┬─────────┘         │
         │                   │
         └───────────┬───────┘
                     │
                     ▼
          ┌──────────────────┐
          │   DynamoDB       │
          │ - Reports        │
          │ - Users          │
          │ - Connections    │
          └──────────────────┘
```

---

## Quick Commands Cheat Sheet

```bash
# Deploy everything
./deploy-fargate.sh

# Check container logs
aws logs tail /ecs/dev-cloud-hack --follow

# Get ALB URL
aws cloudformation describe-stacks --stack-name cloud-hack-fargate-dev \
  --query "Stacks[0].Outputs[?OutputKey=='LoadBalancerURL'].OutputValue" --output text

# Test health
curl $(aws cloudformation describe-stacks --stack-name cloud-hack-fargate-dev \
  --query "Stacks[0].Outputs[?OutputKey=='LoadBalancerURL'].OutputValue" --output text)/health

# Stop ECS (save money)
aws ecs update-service --cluster dev-cloud-hack-cluster \
  --service dev-cloud-hack-service --desired-count 0

# Start ECS
aws ecs update-service --cluster dev-cloud-hack-cluster \
  --service dev-cloud-hack-service --desired-count 1

# Delete everything
aws cloudformation delete-stack --stack-name cloud-hack-fargate-dev
sls remove --stage dev --config serverless-websocket-only.yml
```

---

**Ready to deploy? Run:**
```bash
./deploy-fargate.bat    # Windows
./deploy-fargate.sh     # Linux/Mac
```
