# Analytics AI Agent Tool - POC

A proof-of-concept analytics AI agent that provides natural language querying of logistics data, embedded as a chat widget within a CodeIgniter PHP host application.

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

