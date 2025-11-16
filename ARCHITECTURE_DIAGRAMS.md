# 📊 Fargate Migration - Architecture Diagrams

## Current Architecture (Before Migration)

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Cloud                               │
│                                                                 │
│  ┌──────────────┐                                              │
│  │   Amplify    │                                              │
│  │  (Frontend)  │                                              │
│  └──────┬───────┘                                              │
│         │                                                       │
│         │ HTTPS                                                │
│         │                                                       │
│         ├────────────────────────┬────────────────────────┐   │
│         │                        │                        │   │
│         ▼                        ▼                        ▼   │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────┐ │
│  │ API Gateway │         │ API Gateway │         │   API   │ │
│  │  (REST API) │         │ (WebSocket) │         │ Gateway │ │
│  └──────┬──────┘         └──────┬──────┘         └─────┬───┘ │
│         │                       │                       │     │
│         │                       │                       │     │
│         ▼                       ▼                       ▼     │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────┐ │
│  │   Lambda    │         │   Lambda    │         │  Lambda │ │
│  │   (API)     │         │  (Connect)  │         │  (Auth) │ │
│  │  app.py     │         │ connect.py  │         │ auth.py │ │
│  └──────┬──────┘         │ disconnect  │         │users.py │ │
│         │                └──────┬──────┘         └────┬────┘ │
│         │                       │                     │       │
│         │                       │                     │       │
│         └───────────────────────┴─────────────────────┘       │
│                                 │                             │
│                                 ▼                             │
│                     ┌──────────────────────┐                 │
│                     │     DynamoDB         │                 │
│                     │  ┌──────────────┐   │                 │
│                     │  │ ReportsTable │   │                 │
│                     │  ├──────────────┤   │                 │
│                     │  │ UsersTable   │   │                 │
│                     │  ├──────────────┤   │                 │
│                     │  │ Connections  │   │                 │
│                     │  └──────────────┘   │                 │
│                     └──────────────────────┘                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘

Pros:
✅ Fully serverless
✅ Pay per request (cheap for low traffic)
✅ Auto-scaling

Cons:
❌ Not using containers
❌ Cold starts
❌ Limited runtime control
```

---

## New Architecture (After Migration - Hybrid)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              AWS Cloud                                  │
│                                                                         │
│  ┌──────────────┐                                                      │
│  │   Amplify    │                                                      │
│  │  (Frontend)  │                                                      │
│  └──────┬───────┘                                                      │
│         │                                                               │
│         │ HTTPS                                                        │
│         │                                                               │
│         ├─────────────────────────────┬─────────────────────────────┐ │
│         │                             │                             │ │
│         ▼                             ▼                             │ │
│  ┌──────────────────┐          ┌─────────────┐                     │ │
│  │ Application Load │          │ API Gateway │                     │ │
│  │    Balancer      │          │ (WebSocket) │                     │ │
│  │   (Public)       │          └──────┬──────┘                     │ │
│  └────────┬─────────┘                 │                            │ │
│           │                           │                            │ │
│  ┌────────▼──────────────────┐        ▼                            │ │
│  │        VPC                │   ┌─────────────┐                   │ │
│  │  ┌──────────────────┐    │   │   Lambda    │                   │ │
│  │  │  Public Subnet   │    │   │  (Connect)  │                   │ │
│  │  │  ┌────────────┐  │    │   │ connect.py  │                   │ │
│  │  │  │    ECS     │  │    │   │ disconnect  │                   │ │
│  │  │  │  Fargate   │  │    │   └──────┬──────┘                   │ │
│  │  │  │            │  │    │          │                           │ │
│  │  │  │ ┌────────┐ │  │    │          │                           │ │
│  │  │  │ │ Task   │ │  │    │          │                           │ │
│  │  │  │ │        │ │  │    │          │                           │ │
│  │  │  │ │ Docker │ │  │    │          │                           │ │
│  │  │  │ │Container│ │  │    │          │                           │ │
│  │  │  │ │        │ │  │    │          │                           │ │
│  │  │  │ │server.py│ │  │    │          │                           │ │
│  │  │  │ │ app.py │ │  │    │          │                           │ │
│  │  │  │ │ auth.py│ │  │    │          │                           │ │
│  │  │  │ │users.py│ │  │    │          │                           │ │
│  │  │  │ └────────┘ │  │    │          │                           │ │
│  │  │  └────────┬───┘  │    │          │                           │ │
│  │  └───────────┼──────┘    │          │                           │ │
│  └──────────────┼───────────┘          │                           │ │
│                 │                       │                           │ │
│                 └───────────────────────┴───────────────────────────┘ │
│                                 │                                     │
│                                 ▼                                     │
│                     ┌──────────────────────┐                         │
│                     │     DynamoDB         │                         │
│                     │  ┌──────────────┐   │                         │
│                     │  │ ReportsTable │   │                         │
│                     │  ├──────────────┤   │                         │
│                     │  │ UsersTable   │   │                         │
│                     │  ├──────────────┤   │                         │
│                     │  │ Connections  │   │                         │
│                     │  └──────────────┘   │                         │
│                     └──────────────────────┘                         │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘

Pros:
✅ Uses Docker containers (requirement met!)
✅ Uses Fargate (requirement met!)
✅ No cold starts for REST API
✅ More control over runtime
✅ WebSocket still works (Lambda is perfect for this)

Cons:
❌ Costs ~$50/month if running 24/7
❌ Need to manage container images
```

---

## Data Flow Diagrams

### 1. User Registration/Login Flow

```
┌─────────┐
│ Browser │
│ (User)  │
└────┬────┘
     │
     │ 1. POST /auth/register
     │    {email, password, nombre}
     ▼
┌──────────────┐
│     ALB      │  2. Route to Fargate
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│  Fargate Container  │
│                     │
│  server.py          │  3. Parse Flask request
│     ↓               │
│  auth.py            │  4. Hash password (SHA-256)
│  lambda_handler()   │  5. Determine user type from email
│                     │     - @utec.edu.pe → estudiante
└──────┬──────────────┘     - @admin.utec.edu.pe → admin
       │                    - other → trabajador
       │ 6. Put item
       ▼
┌──────────────┐
│  DynamoDB    │
│ UsersTable   │  7. Store user data
└──────┬───────┘
       │
       │ 8. Return success
       ▼
┌─────────┐
│ Browser │  9. Show success message
└─────────┘
```

### 2. Create Incident Flow (Student)

```
┌─────────┐
│ Browser │
│(Student)│
└────┬────┘
     │
     │ 1. POST /incidentes
     │    Headers: X-User-Email
     │    Body: {titulo, descripcion, ...}
     ▼
┌──────────────┐
│     ALB      │  2. Route to Fargate
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│  Fargate Container  │
│                     │
│  server.py          │  3. Parse Flask request
│     ↓               │     Extract X-User-Email header
│  app.py             │  4. Validate user is 'estudiante'
│  lambda_handler()   │  5. Create incident with:
│                     │     - id: UUID
└──────┬──────────────┘     - estado: 'pendiente'
       │                    - creado_por: user email
       │ 6. Put item        - fecha_creacion: now
       ▼
┌──────────────┐
│  DynamoDB    │
│ReportsTable  │  7. Store incident
└──────┬───────┘
       │
       │ 8. Get all WebSocket connections
       ▼
┌──────────────┐
│  DynamoDB    │
│Connections   │  9. Fetch active connections
│    Table     │
└──────┬───────┘
       │
       │ 10. Send notification
       ▼
┌──────────────┐
│ API Gateway  │
│ (WebSocket)  │  11. Broadcast to all clients
└──────┬───────┘
       │
       │ 12. Real-time update
       ▼
┌─────────┐
│ Browser │  13. Show new incident in UI
│  (All)  │
└─────────┘
```

### 3. Assign Incident Flow (Admin)

```
┌─────────┐
│ Browser │
│ (Admin) │
└────┬────┘
     │
     │ 1. PUT /incidentes/{id}/asignar
     │    Headers: X-User-Email (admin)
     │    Body: {trabajador_email}
     ▼
┌──────────────┐
│     ALB      │  2. Route to Fargate
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│  Fargate Container  │
│                     │
│  server.py          │  3. Parse Flask request
│     ↓               │     Extract path: /asignar
│  app.py             │  4. Validate user is 'admin'
│  lambda_handler()   │  5. Get incident
│                     │  6. Verify trabajador exists
│                     │  7. Update incident:
└──────┬──────────────┘     - asignado_a: trabajador_email
       │                    - estado: 'asignado'
       │ 8. Put item        - fecha_asignacion: now
       ▼
┌──────────────┐
│  DynamoDB    │
│ReportsTable  │  9. Update incident
└──────┬───────┘
       │
       │ 10. Send notifications
       ▼
┌──────────────┐
│ API Gateway  │
│ (WebSocket)  │  11. Notify:
└──────┬───────┘      - Student (estado change)
       │              - Worker (nueva_asignacion)
       ▼
┌─────────┐
│ Browser │  12. Real-time notifications
│(Student &│      appear in both dashboards
│ Worker) │
└─────────┘
```

### 4. WebSocket Connection Flow

```
┌─────────┐
│ Browser │
│ (User)  │
└────┬────┘
     │
     │ 1. Connect to WSS URL
     │    wss://xxx.execute-api.us-east-1.amazonaws.com/dev
     ▼
┌──────────────┐
│ API Gateway  │
│ (WebSocket)  │  2. Trigger $connect route
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│  Lambda Function    │
│  (connect.py)       │  3. Extract connectionId
│                     │  4. Parse query params for userEmail
│  lambda_handler()   │
└──────┬──────────────┘
       │
       │ 5. Store connection
       ▼
┌──────────────┐
│  DynamoDB    │
│Connections   │  6. Save:
│    Table     │     - connectionId
└──────┬───────┘     - userEmail
       │             - timestamp
       │
       │ 7. Return 200 OK
       ▼
┌─────────┐
│ Browser │  8. WebSocket connected!
│         │     Can now receive real-time updates
└─────────┘

When user closes browser/tab:
┌─────────┐
│ Browser │  1. Disconnect
└────┬────┘
     │
     ▼
┌──────────────┐
│ API Gateway  │  2. Trigger $disconnect
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│  Lambda Function    │
│  (disconnect.py)    │  3. Extract connectionId
└──────┬──────────────┘
       │
       │ 4. Delete connection
       ▼
┌──────────────┐
│  DynamoDB    │
│Connections   │  5. Remove connectionId
│    Table     │
└──────────────┘
```

---

## Component Responsibility Matrix

| Component | Responsibilities | Technology | Deployed Where |
|-----------|-----------------|------------|----------------|
| **Frontend** | - User interface<br>- Form handling<br>- WebSocket client<br>- Display incidents | HTML/CSS/JS | AWS Amplify |
| **Application Load Balancer** | - Route HTTP traffic<br>- Health checks<br>- SSL termination (optional)<br>- Public endpoint | AWS ALB | VPC (public subnets) |
| **Fargate Container** | - REST API endpoints<br>- User authentication<br>- Incident CRUD<br>- Authorization logic | Python/Flask<br>Docker | ECS Fargate |
| **Lambda (WebSocket)** | - WebSocket connections<br>- Connection tracking<br>- Real-time notifications | Python | Lambda |
| **DynamoDB** | - Persist incidents<br>- Store users<br>- Track WS connections | NoSQL Database | AWS Managed |

---

## Security Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Internet                            │
└────────────────────────┬─────────────────────────────────┘
                         │
                         │ HTTPS (Port 443)
                         │ or HTTP (Port 80)
                         │
                ┌────────▼─────────┐
                │  Security Group  │
                │   (ALB-SG)       │
                │ Inbound:         │
                │  - Port 80: 0/0  │
                │  - Port 443: 0/0 │
                └────────┬─────────┘
                         │
                ┌────────▼─────────┐
                │       ALB        │
                └────────┬─────────┘
                         │
                ┌────────▼─────────┐
                │  Security Group  │
                │   (ECS-SG)       │
                │ Inbound:         │
                │  - Port 80:      │
                │    Source: ALB-SG│
                └────────┬─────────┘
                         │
                ┌────────▼─────────┐
                │  Fargate Task    │
                │  (Private IP)    │
                └────────┬─────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
  ┌───────▼────────┐ ┌──▼─────────┐ ┌──▼──────────┐
  │   DynamoDB     │ │ WebSocket  │ │ CloudWatch  │
  │ (IAM Role      │ │ API Gateway│ │   Logs      │
  │  Permissions)  │ │(IAM Role)  │ │ (IAM Role)  │
  └────────────────┘ └────────────┘ └─────────────┘

IAM Roles:
┌────────────────────────────────────────────────┐
│ ECS Task Execution Role:                      │
│  - Pull image from ECR                        │
│  - Write logs to CloudWatch                   │
├────────────────────────────────────────────────┤
│ ECS Task Role:                                │
│  - DynamoDB: GetItem, PutItem, Scan, Query   │
│  - WebSocket API: ManageConnections          │
│  - CloudWatch: PutMetricData (optional)      │
└────────────────────────────────────────────────┘
```

---

## Deployment Flow Diagram

```
┌─────────────┐
│ Developer   │
│   (You!)    │
└──────┬──────┘
       │
       │ 1. Run deploy-fargate.bat
       ▼
┌─────────────────────────────────────────┐
│ Step 1: Deploy WebSocket & DynamoDB    │
│                                         │
│ $ sls deploy --config                  │
│   serverless-websocket-only.yml        │
│                                         │
│ Creates:                                │
│  - DynamoDB tables (3)                  │
│  - Lambda functions (2)                 │
│  - WebSocket API Gateway                │
└──────┬──────────────────────────────────┘
       │
       │ 2. Get WebSocket API ID
       ▼
┌─────────────────────────────────────────┐
│ Step 2: Build Docker Image             │
│                                         │
│ $ docker build -t cloud-hack-api .     │
│                                         │
│ Creates:                                │
│  - Docker image with Flask app          │
│  - Contains: server.py, app.py,        │
│    auth.py, users.py                    │
└──────┬──────────────────────────────────┘
       │
       │ 3. Test locally (optional)
       ▼
┌─────────────────────────────────────────┐
│ Step 3: Push to ECR                    │
│                                         │
│ $ aws ecr create-repository ...        │
│ $ aws ecr get-login-password ...       │
│ $ docker tag ...                       │
│ $ docker push ...                      │
│                                         │
│ Creates:                                │
│  - ECR repository                       │
│  - Docker image in ECR                  │
└──────┬──────────────────────────────────┘
       │
       │ 4. Image URI ready
       ▼
┌─────────────────────────────────────────┐
│ Step 4: Deploy Fargate Stack           │
│                                         │
│ $ aws cloudformation deploy            │
│   --template-file fargate-stack.yml    │
│                                         │
│ Creates:                                │
│  - VPC (10.0.0.0/16)                   │
│  - 2 Public Subnets                    │
│  - Internet Gateway                     │
│  - Security Groups (2)                 │
│  - Application Load Balancer           │
│  - ECS Cluster                         │
│  - ECS Task Definition                 │
│  - ECS Service (1 task)                │
│  - IAM Roles (2)                       │
│  - CloudWatch Log Group                │
└──────┬──────────────────────────────────┘
       │
       │ 5. Wait for stack creation (~5-10 min)
       ▼
┌─────────────────────────────────────────┐
│ Step 5: Get Outputs                    │
│                                         │
│ ALB URL:                               │
│  http://dev-cloud-hack-alb-xxx.        │
│  us-east-1.elb.amazonaws.com           │
│                                         │
│ WebSocket URL:                         │
│  wss://xxx.execute-api.                │
│  us-east-1.amazonaws.com/dev           │
└──────┬──────────────────────────────────┘
       │
       │ 6. Update frontend with URLs
       ▼
┌─────────────────────────────────────────┐
│ Step 6: Test & Deploy Frontend         │
│                                         │
│ Update frontend/auth.js:               │
│  const API_BASE_URL = 'http://ALB_URL'│
│                                         │
│ Update frontend/app.js:                │
│  const WS_URL = 'wss://WS_URL'        │
│                                         │
│ Deploy to Amplify or test locally      │
└──────┬──────────────────────────────────┘
       │
       │ 7. Application ready!
       ▼
┌─────────────┐
│   Success!  │
│   🎉 🚀     │
└─────────────┘
```

---

## Resource Relationships

```
CloudFormation Stack: cloud-hack-fargate-dev
│
├── VPC (10.0.0.0/16)
│   ├── Internet Gateway
│   ├── Public Subnet 1 (10.0.1.0/24, us-east-1a)
│   ├── Public Subnet 2 (10.0.2.0/24, us-east-1b)
│   └── Route Table (routes to IGW)
│
├── Security Groups
│   ├── ALB-SG (allows 80, 443 from internet)
│   └── ECS-SG (allows 80 from ALB-SG only)
│
├── Application Load Balancer
│   ├── Listener (Port 80)
│   └── Target Group (Port 80, /health check)
│
├── ECS Cluster: dev-cloud-hack-cluster
│   ├── ECS Service: dev-cloud-hack-service
│   │   ├── Desired Count: 1
│   │   ├── Launch Type: Fargate
│   │   └── Load Balancer attached
│   │
│   └── Task Definition: dev-cloud-hack-task
│       ├── CPU: 512 (0.5 vCPU)
│       ├── Memory: 1024 (1 GB)
│       ├── Container: cloud-hack-api
│       │   ├── Image: ECR URI
│       │   ├── Port: 80
│       │   └── Environment Variables:
│       │       - TABLE_NAME
│       │       - CONNECTIONS_TABLE
│       │       - USERS_TABLE
│       │       - AWS_REGION
│       │       - WS_API_ID
│       │       - WS_STAGE
│       ├── Task Execution Role (for ECR, logs)
│       └── Task Role (for DynamoDB, WebSocket)
│
└── CloudWatch Log Group: /ecs/dev-cloud-hack


Serverless Stack: cloud-hack-websocket-dev
│
├── DynamoDB Tables
│   ├── ReportsTable-dev
│   ├── UsersTable-dev
│   └── ConnectionsTable-dev
│
├── WebSocket API Gateway
│   ├── Stage: dev
│   └── Routes:
│       ├── $connect → Lambda (connect.py)
│       └── $disconnect → Lambda (disconnect.py)
│
└── Lambda Functions
    ├── wsConnect
    └── wsDisconnect
```

---

## Cost Breakdown (Monthly, us-east-1)

### Fargate Stack
```
Component                 | Specs              | Cost/Month  | Note
--------------------------|--------------------|-------------|---------------------
Fargate Task             | 0.5 vCPU, 1GB     | ~$30        | 24/7 operation
Application Load Balancer| Standard           | ~$20        | Fixed cost + data
Data Transfer (Outbound) | ~10GB              | ~$1         | To internet
CloudWatch Logs          | ~1GB               | ~$1         | Log storage
NAT Gateway              | -                  | $0          | Using public subnets
--------------------------|--------------------|-------------|---------------------
Subtotal (Fargate)       |                    | ~$52/month  |
```

### Serverless Stack (WebSocket + DynamoDB)
```
Component                 | Usage              | Cost/Month  | Note
--------------------------|--------------------|-----------|-----------------------
Lambda (WebSocket)       | ~1000 invocations  | ~$0.00    | Free tier
DynamoDB                 | PAY_PER_REQUEST    | ~$1-5     | Depends on usage
API Gateway (WebSocket)  | ~1000 connections  | ~$0.35    | $0.25/M messages
--------------------------|--------------------|-----------|-----------------------
Subtotal (Serverless)    |                    | ~$1-6/month|
```

### Total Cost
```
Total (Running 24/7): ~$53-58/month

For Demo (4 hours/day): ~$10-15/month
  - Stop ECS service when not using
  - Lambda/DynamoDB charged per use
```

### Cost Optimization Tips
1. **Stop ECS when not using:**
   ```bash
   aws ecs update-service --cluster dev-cloud-hack-cluster \
     --service dev-cloud-hack-service --desired-count 0
   ```

2. **Use Fargate Spot:** Save up to 70% (may be interrupted)

3. **Delete stack after demo:** $0!

---

## Timeline Estimate

### Automated Deployment (Using Scripts)
```
Task                              | Time     | Notes
----------------------------------|----------|---------------------------
Read documentation                | 15 min   | This file + guides
Run deploy-fargate.bat           | 10 min   | Automated script
Wait for CloudFormation          | 5 min    | Stack creation
Update frontend URLs             | 2 min    | Edit 2 files
Test API                         | 3 min    | Run test script
Test frontend                    | 5 min    | Local testing
----------------------------------|----------|---------------------------
Total                            | 40 min   | First-time deployment
```

### Manual Deployment
```
Task                              | Time     | Notes
----------------------------------|----------|---------------------------
Deploy serverless (DynamoDB+WS)  | 5 min    | sls deploy
Build Docker image               | 3 min    | docker build
Create ECR repository            | 2 min    | AWS CLI
Push image to ECR                | 5 min    | docker push
Deploy CloudFormation stack      | 10 min   | Stack creation
Get outputs & update frontend    | 5 min    | Edit files
Test deployment                  | 10 min   | Manual testing
----------------------------------|----------|---------------------------
Total                            | 40 min   | With experience
```

---

## Key Takeaways

### ✅ Why This Architecture Works

1. **Hybrid is Best for Demo**
   - Fargate handles REST API (meets requirement)
   - Lambda handles WebSocket (simpler, already working)
   - No need to rewrite WebSocket logic

2. **Production-Ready**
   - Health checks
   - Auto-recovery
   - CloudWatch monitoring
   - Proper security groups

3. **Cost-Effective for Demo**
   - Can stop when not using
   - Only pay for running time
   - Delete after presentation

### 📝 What You Learned

1. **Docker Containerization**
   - Multi-stage builds
   - Health checks
   - Environment variables

2. **Fargate Deployment**
   - ECS tasks and services
   - Task definitions
   - Load balancing

3. **AWS Infrastructure**
   - VPC networking
   - Security groups
   - IAM roles and policies
   - CloudFormation IaC

4. **Hybrid Architecture**
   - Combining different AWS services
   - Making architectural trade-offs
   - Choosing the right tool for the job

---

**Ready to deploy? Start with:**
```bash
deploy-fargate.bat
```

**Good luck! 🚀**
