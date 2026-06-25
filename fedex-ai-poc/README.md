# QuantixAI

Intelligent analytics powered by natural language. Ask questions about your data and get instant insights, reports, and visualizations — no SQL required.

> Domain: **quantixai.ai** (available)

## Architecture

```
┌──────────────────────────────────────────────────┐
│  CodeIgniter PHP Host (port 8081)                │
│  ┌──────────────────────────────────────────┐    │
│  │  <iframe src="/ai/chat?mode=embedded">   │    │
│  └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────┐
│  NGINX Reverse Proxy (port 8080)                 │
│  /ai/*  → Frontend (port 3000)                   │
│  /api/* → Backend  (port 8000)                   │
└──────────────────────────────────────────────────┘
          │                          │
          ▼                          ▼
┌──────────────────┐    ┌──────────────────────────┐
│  Next.js 14      │    │  FastAPI + Peewee ORM    │
│  React/TS        │    │  SQLite DB (analytics.db)│
│  Tailwind CSS    │    │  Redis Cache             │
│  shadcn/ui       │    │  LangGraph Agent         │
│  AG Grid         │    │  AWS Bedrock (Llama 3.1) │
│  Apache ECharts  │    │                          │
└──────────────────┘    └──────────────────────────┘
```

## Tech Stack

| Layer      | Technology                                       |
|------------|--------------------------------------------------|
| Frontend   | Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui, AG Grid, Apache ECharts |
| Backend    | Python 3.11, FastAPI, Pydantic, LangGraph        |
| ORM        | Peewee (lightweight)                             |
| Database   | SQLite (supports 2M+ rows with proper indexing)  |
| Cache      | Redis                                            |
| AI/LLM     | AWS Bedrock — Meta Llama 3.1 70B Instruct (default), with Anthropic Claude fallback |
| Infra      | Docker Compose (local), ECS Fargate (cloud)      |

## Quick Start

See [LOCAL_RUN.md](./LOCAL_RUN.md) for detailed setup instructions.

```bash
cd fedex-ai-poc

# Copy environment template
cp .env.example .env

# Build and start all services (Redis maps to host port 6389 to avoid local conflict)
docker compose build
docker compose up -d

# Initialize database and seed sample data (25,000 records)
docker compose exec backend python -m app.database.init
docker compose exec backend python -m app.database.seed --profile sample

# Run the automated verification/validation test suite
bash scripts/validate_local.sh

# Access the application
open http://localhost:8080/ai/chat
```

## Project Structure

```
analytics-ai-agent-tool/
├── requirement.txt              # Raw requirements document
├── openspec/                    # Planning & specification artifacts
│   ├── config.yaml
│   └── changes/analytics-agent-tool/
│       ├── proposal.md
│       ├── design.md
│       ├── tasks.md
│       └── specs/               # Feature specifications
└── fedex-ai-poc/                # Implementation root
    ├── LOCAL_RUN.md             # Local development runbook
    ├── .env.example             # Environment template
    ├── docker-compose.yml       # Service orchestration
    ├── backend/                 # FastAPI backend
    │   ├── Dockerfile
    │   ├── requirements.txt
    │   └── app/
    │       ├── main.py
    │       ├── database/        # Peewee models, init, seed
    │       ├── analytics/       # Semantic query builder
    │       ├── agent/           # LangGraph AI workflow
    │       └── routes/          # API endpoints
    ├── frontend/                # Next.js 14 frontend
    │   ├── Dockerfile
    │   └── src/
    │       └── app/
    │           ├── chat/        # Chat widget (/ai/chat)
    │           └── reports/     # Report permalink pages (/ai/reports/[id])
    ├── infrastructure/
    │   └── nginx/               # Reverse proxy config
    └── scripts/                 # Helper scripts
```

## Key Design Decisions

- **No Authentication**: Single implicit user role with unrestricted access to all data
- **Peewee ORM + SQLite**: Lightweight, zero-configuration database supporting 2M+ rows with proper indexing
- **Safe Semantic Queries**: LLM produces structured JSON, never raw SQL — backend translates via Peewee query builders
- **Mock AI Provider**: Deterministic local demos without AWS credentials (`AI_PROVIDER=mock`)
- **Port Conflict Safeguards**: Redis mapped to `6389` on host to prevent conflicts with standard host services

## Known POC Limitations

- SQLite is single-writer; concurrent write-heavy workloads may need PostgreSQL migration
- PDF export currently streams data JSON payload; full layout generation requires Puppeteer/Chromium container layer
- Final visual theme (OpenDhi-inspired) tokens are placeholders pending branding assets
- CodeIgniter iframe placement details are pending integration with CI view routing

## AWS ECS Fargate Deployment

A detailed step-by-step guide is available in [docs/ecs-deployment.md](./docs/ecs-deployment.md). Here is the deployment workflow:

1. **Build & Push Images**: Authenticate with AWS ECR and push the frontend and backend Docker images:
   ```bash
   bash scripts/build_and_push.sh <aws-account-id> <aws-region> <tag>
   ```
2. **Infrastructure Requirements**:
   - Create an **Amazon EFS** (Elastic File System) volume to persist the SQLite database.
   - Configure **Amazon ElastiCache Redis** for chat history tracking.
   - Provision an **Application Load Balancer (ALB)** with routing rules targeting the Fargate tasks.
3. **Register Task Definitions**: Update and register the task definitions located in `docs/ecs-deployment.md` mapping the EFS volume to `/data/analytics.db` in the backend task.
4. **IAM Permissions**: Attach a Bedrock invocation policy (`bedrock:InvokeModel`) to the ECS Task Role for model access.
5. **ALB Routing Config**:
   - Route `/api/*` requests to the Backend Service Target Group.
   - Route `/ai/*` and `/_next/*` requests to the Frontend Service Target Group.
6. **Production Configuration**: Update environment variables (`ALLOWED_ORIGINS` and `FRAME_ANCESTORS`) to match the production domain of your CodeIgniter host application.

