# ECS Fargate Deployment Guide

> [!IMPORTANT]
> ECS deployment should only begin **after** the local Docker Compose environment passes
> all Section 9 validation checks (`bash scripts/validate_local.sh`).

---

## 1. Prerequisites

- AWS CLI installed and configured
- ECR repositories created for `ai-analytics-backend` and `ai-analytics-frontend`
- ECS cluster created (Fargate launch type)
- Application Load Balancer (ALB) created with listener rules for `/ai/*` and `/api/*`
- An EFS or EFS-backed volume for the SQLite database file (or migrate to RDS if scale requires)
- Bedrock model access granted in `us-east-1` for `us.meta.llama3-1-70b-instruct-v1:0`

---

## 2. Build & Push Images

```bash
cd fedex-ai-poc
bash scripts/build_and_push.sh <aws-account-id> us-east-1 v1.0.0
```

---

## 3. ECS Task Definitions

### Backend Task Definition (`ecs/backend-task-definition.json`)

```json
{
  "family": "ai-analytics-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::<ACCOUNT>:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::<ACCOUNT>:role/ai-analytics-task-role",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "<ACCOUNT>.dkr.ecr.us-east-1.amazonaws.com/ai-analytics-backend:latest",
      "portMappings": [{ "containerPort": 8000, "protocol": "tcp" }],
      "environment": [
        { "name": "AI_PROVIDER", "value": "bedrock" },
        { "name": "AWS_REGION",  "value": "us-east-1" },
        { "name": "BEDROCK_MODEL_ID", "value": "us.meta.llama3-1-70b-instruct-v1:0" },
        { "name": "DB_PATH",     "value": "/data/analytics.db" },
        { "name": "REDIS_URL",   "value": "redis://<ELASTICACHE-HOST>:6379/0" }
      ],
      "mountPoints": [
        { "sourceVolume": "db-data", "containerPath": "/data" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/ai-analytics-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8000/api/health || exit 1"],
        "interval": 30, "timeout": 5, "retries": 3
      }
    }
  ],
  "volumes": [
    {
      "name": "db-data",
      "efsVolumeConfiguration": {
        "fileSystemId": "<EFS-FS-ID>",
        "transitEncryption": "ENABLED"
      }
    }
  ]
}
```

### Frontend Task Definition (`ecs/frontend-task-definition.json`)

```json
{
  "family": "ai-analytics-frontend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::<ACCOUNT>:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "frontend",
      "image": "<ACCOUNT>.dkr.ecr.us-east-1.amazonaws.com/ai-analytics-frontend:latest",
      "portMappings": [{ "containerPort": 3000, "protocol": "tcp" }],
      "environment": [
        { "name": "NEXT_PUBLIC_API_BASE_URL", "value": "/api" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/ai-analytics-frontend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

---

## 4. IAM — Task Role Permissions

The **task role** (`ai-analytics-task-role`) needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/us.meta.llama3-1-70b-instruct-v1:0"
      ]
    }
  ]
}
```

---

## 5. ALB Routing Rules

| Priority | Path Pattern | Target Group       |
|----------|-------------|--------------------|
| 1        | `/api/*`    | `ai-backend-tg`    |
| 2        | `/ai/*`     | `ai-frontend-tg`   |
| 3        | `/_next/*`  | `ai-frontend-tg`   |

**Security Group**: Allow inbound 443 (HTTPS) from your CodeIgniter host IP or VPC CIDR only.

---

## 6. CORS & Frame Headers for Production

Update environment variables for the production CodeIgniter host URL:

```
ALLOWED_ORIGINS=https://your-codeigniter-host.com
FRAME_ANCESTORS=https://your-codeigniter-host.com
```

---

## 7. Deployment Checklist

- [ ] Local Docker Compose validation passes (`bash scripts/validate_local.sh`)
- [ ] ECR repositories created for `ai-analytics-backend` and `ai-analytics-frontend`
- [ ] Images built and pushed (`bash scripts/build_and_push.sh`)
- [ ] EFS file system created and mounted in task definition
- [ ] ElastiCache Redis cluster created
- [ ] Task definitions registered with correct image URIs
- [ ] ECS services created (desired count: 1 each)
- [ ] ALB listener rules configured for `/api/*` and `/ai/*`
- [ ] Bedrock model access granted to task role
- [ ] CORS origins updated to production CodeIgniter host URL
- [ ] Health checks pass through ALB
