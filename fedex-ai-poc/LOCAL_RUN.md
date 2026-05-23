# Local Containerized Runbook

This is the required local run contract for the analytics AI agent POC. The implementation should satisfy these steps before ECS Fargate deployment work starts.

## 1. Prerequisites

- Docker Engine or Docker Desktop with Docker Compose v2.
- At least 8 GB RAM available to Docker for SQLite indexing operations.
- At least 10 GB free disk for normal local SQLite database development.
- At least 30 GB free disk before running the full SQLite database generation path.
- No local Node.js or Python installation is required for normal containerized execution.

Check Docker:

```bash
docker --version
docker compose version
```

## 2. Project Location

Run all local application commands from:

```bash
cd /home/veeranarayanamannam/node-projects/presearch/analytics-ai-agent-tool/fedex-ai-poc
```

Expected implementation structure:

```text
fedex-ai-poc/
+-- frontend/
+-- backend/
+-- database/
+-- infrastructure/
|   +-- nginx/
+-- scripts/
+-- docker-compose.yml
+-- .env.example
+-- .env
+-- README.md
+-- LOCAL_RUN.md
```

## 3. Local Environment File

Create a local environment file from the example:

```bash
cp .env.example .env
```

Minimum local values:

```bash
APP_ENV=local
COMPOSE_PROJECT_NAME=analytics_ai_poc

FRONTEND_PORT=3000
BACKEND_PORT=8000
NGINX_PORT=8080

DB_PATH=/app/database/analytics.db
REDIS_URL=redis://redis:6379/0

AI_PROVIDER=mock
AWS_REGION=ap-south-1
AWS_PROFILE=
BEDROCK_MODEL_ID=

HOST_APP_ORIGIN=http://localhost:8081
PUBLIC_APP_BASE_URL=http://localhost:8080
API_BASE_URL=http://localhost:8080/api
```

Use `AI_PROVIDER=mock` for reliable local demos without AWS credentials. To test live AI behavior through AWS Bedrock, configure AWS credentials for the backend container and set:

```bash
AI_PROVIDER=bedrock
AWS_REGION=us-east-1
AWS_PROFILE=anuruhu-dev
BEDROCK_MODEL_ID=us.meta.llama3-1-70b-instruct-v1:0
```



## 4. Build Images

Build every local service:

```bash
docker compose build
```

Expected services:

- `frontend`: Next.js application.
- `backend`: FastAPI application.
- `redis`: Redis cache/session support.
- `nginx`: Local reverse proxy for `/ai/*` and `/api/*`.

## 5. Start Runtime Services

Start Redis first:

```bash
docker compose up -d redis
```

Verify containers:

```bash
docker compose ps
```

## 6. Initialize SQLite Database

Initialize the SQLite database file and tables:

```bash
docker compose run --rm backend python -m app.database.init
```

The initializer must prepare:

- `database/analytics.db` with indexed tables `hub`, `order`, `trackingevent`, `payment`, and `savedreport`.

## 7. Seed Sample Data

Seed the fast local SQLite database dataset:

```bash
docker compose run --rm backend python -m app.database.seed --profile sample
```

Required sample dataset target:

- `hubs`: 100 rows
- `orders`: small local subset, for example 25k rows
- `tracking_events`: proportional local subset, for example 100k rows
- `payments`: proportional local subset, for example 25k rows

The sample data must include the required logistics correlations:

- higher delays during monsoon months
- higher cost for express shipments
- higher COD usage in tier-2 cities
- higher delay rates for heavy packages
- intentionally underperforming hubs
- regional SLA breach differences

## 8. Start Full Local Stack

Start all services:

```bash
docker compose up -d
```

Watch logs:

```bash
docker compose logs -f backend frontend nginx
```

## 9. Local URLs

Primary local entry point:

```text
http://localhost:8080
```

Embedded chat widget route:

```text
http://localhost:8080/ai/chat?mode=embedded
```

Fullscreen chat route:

```text
http://localhost:8080/ai/chat?mode=fullscreen
```

Backend API docs:

```text
http://localhost:8080/api/docs
```

Example report URL shape:

```text
http://localhost:8080/ai/reports/{report_id}
```

## 10. Health Checks

Run these checks after startup:

```bash
curl http://localhost:8080/api/health
```

Expected result: returns successful status, database connectivity confirmation, and Redis availability detail.

## 11. CodeIgniter Iframe Test

For local testing, the CodeIgniter app can embed the widget without authentication context:

```html
<iframe
  src="http://localhost:8080/ai/chat?mode=embedded"
  width="100%"
  height="720"
  frameborder="0"
  allow="clipboard-write">
</iframe>
```

The application operates under a single user role with full access to all aggregated data.

## 12. Previous Reports API Check

Create at least one report through the chat UI, then run:

```bash
curl "http://localhost:8080/api/users/reports"
```

Expected response shape:

```json
[
  {
    "report_id": "abc123",
    "title": "Delayed Shipments South Region",
    "created_at": "2026-05-22T00:00:00Z",
    "report_url": "/ai/reports/abc123"
  }
]
```

## 13. Report Flow Checks

Use the chat UI to test these prompts:

```text
Show delayed shipments in Bangalore for last 7 days
Compare COD revenue by state
Show top performing hubs this month
Which routes have maximum SLA breaches?
Show revenue report
```

Expected behavior:

- Specific prompts generate report URLs.
- Ambiguous prompts ask follow-up clarification questions.
- Saved report URLs rerun live database queries instead of loading stored result snapshots.
- Single user role allows full access to all regions.

## 14. Export Checks

After generating a report, test:

```bash
curl -o report.xlsx "http://localhost:8080/api/reports/{report_id}/export/excel"
curl -o report.pdf "http://localhost:8080/api/reports/{report_id}/export/pdf"
```

Expected result:

- Excel export downloads an `.xlsx` file with report data from SQLite.
- PDF export downloads a rendered report page as `.pdf`.

## 15. Full Dataset Generation

Do not run this as part of normal startup. Use it when the sample path is stable and the machine has enough resources:

```bash
docker compose run --rm backend python -m app.database.seed \
  --profile full \
  --orders 500000 \
  --tracking-events 2000000 \
  --payments 500000 \
  --hubs 100
```

After full generation, verify SQLite index efficiency and report query latency.

## 16. Stop Services

Stop containers while preserving SQLite database file:

```bash
docker compose down
```

## 17. Reset Local Data

This removes the local SQLite database file and Redis volumes. Use only when you want a clean local database environment:

```bash
docker compose down --volumes
rm -f database/analytics.db
docker compose up -d redis
docker compose run --rm backend python -m app.database.init
docker compose run --rm backend python -m app.database.seed --profile sample
docker compose up -d
```

## 18. Troubleshooting

Check service status:

```bash
docker compose ps
```

Check backend logs:

```bash
docker compose logs -f backend
```

Check frontend logs:

```bash
docker compose logs -f frontend
```

Check NGINX logs:

```bash
docker compose logs -f nginx
```

Inspect the database file inside the backend container:

```bash
docker compose exec backend ls -la /app/database
```

Common issues:

- AWS Bedrock credentials, region, or model id missing: keep `AI_PROVIDER=mock` for local demos, or configure `AI_PROVIDER=bedrock`, `AWS_REGION`, `BEDROCK_MODEL_ID`, and AWS credentials.
- iframe fails to load: check NGINX `Content-Security-Policy frame-ancestors` and `HOST_APP_ORIGIN`.
- API calls blocked: check CORS allowed origins and ensure requests go through `http://localhost:8080/api`.
- database missing: rerun database initialization and sample seed.
- exports fail: check Puppeteer/Chromium dependencies in the export-capable container.

## 12. Quality / Lint Commands

**Backend (Python)**:

```bash
docker compose exec backend flake8 app/
docker compose exec backend python -m mypy app/
```

**Frontend (TypeScript)**:

```bash
docker compose exec frontend npm run lint
docker compose exec frontend npx tsc --noEmit
```

**Automated Local Validation** (all Section 9 checks):

```bash
bash scripts/validate_local.sh
```


