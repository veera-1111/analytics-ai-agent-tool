## Context

The analytics AI agent is a new POC project under `analytics-ai-agent-tool/fedex-ai-poc/`. It must run locally with containers before any ECS Fargate deployment work is treated as ready. The application is embedded into an existing CodeIgniter PHP host application. No authentication checks are required, and the application assumes a single user role with full access.

The first local delivery target is a Docker Compose environment with frontend, backend, Redis, NGINX reverse proxy services, and a mounted database volume. The local environment must support sample logistics data for fast demos, while still providing a documented path for generating the full target dataset.

## Goals / Non-Goals

**Goals:**

- Make local containerized execution the first acceptance target before ECS Fargate work.
- Keep all implementation code inside `fedex-ai-poc/`.
- Provide a predictable Docker Compose setup for frontend, backend, Redis, NGINX, and database volumes.
- Support CodeIgniter embedding through iframe-first integration without authentication restrictions.
- Enforce safe semantic-query-to-SQL behavior using a lightweight ORM (Peewee) builder rather than unrestricted SQL or arbitrary text-to-SQL.
- Seed a smaller local database by default and provide explicit full-scale database generation commands.
- Document setup, environment variables, health checks, URLs, database reset steps, and troubleshooting.

**Non-Goals:**

- No ECS deployment until local Docker Compose execution is working.
- No Kubernetes, Kafka, RAG, vector database, Snowflake, dbt, or autonomous agent implementation.
- No authentication system, JWT token validation, user login pages, or multi-role access control.
- No FedEx branding, logo usage, or product naming in the UI.
- No final visual theme lock until the OpenDhi-inspired theme details are provided.

## Decisions

### Local-First Docker Compose

The first runnable environment will be Docker Compose. Services will include `frontend`, `backend`, `redis`, and `nginx`, with mounted local volumes for the SQLite database.

Rationale: Docker Compose gives a reproducible local environment that closely matches the future ECS service split.

### Nested Implementation Root

All generated code will live under `analytics-ai-agent-tool/fedex-ai-poc/`.

Rationale: The parent directory already contains OpenSpec artifacts and the requirement source. A nested implementation root keeps source code, Docker assets, and run documentation cleanly separated from planning artifacts.

### Lightweight ORM (Peewee) & SQLite Database

The POC will use a SQLite database file mapped to a Docker volume and process data using the lightweight Peewee ORM. The database will store the core tables (`hubs`, `orders`, `tracking_events`, `payments`) and report metadata (`saved_reports`).

Rationale: SQLite is a zero-configuration, lightweight SQL database that easily handles the target 2 million rows when indexed correctly. Peewee is a simple, highly readable ORM that provides database queries and safe SQL generation without the overhead of heavier ORMs like SQLAlchemy.

Alternative considered: Flat CSV/JSON files. This was rejected because executing queries over 2 million rows using in-memory CSV operations is slow, memory-intensive, and does not support standard database indexing.

Alternative considered: PostgreSQL. While PostgreSQL was originally requested, SQLite is much lighter weight for a local POC/demo and fully supports 2M rows with indexed Peewee queries.

### Removal of Authentication & Single User Role

No authentication, JWT validation, or session management is implemented. The application operates under a single implicit user role with unrestricted access to all data across all regions and hubs.

Rationale: Simplifies the POC integration scope and avoids complex multi-role or cross-region filtering logic.

### Safe Semantic Analytics Flow

The LLM will only produce structured semantic query JSON. Backend code will translate this JSON into safe, parameter-bound queries using a Peewee query builder for supported metrics, dimensions, filters, sort fields, and limits.

Rationale: This keeps the analytics surface demonstrable and prevents SQL injection risks or arbitrary database execution.

### AWS Bedrock AI Provider

The live AI provider will use AWS Bedrock through configurable region, model id, and AWS credentials or ECS task role permissions. Local development will keep a deterministic mock provider for demos without cloud credentials. The default configured open-source model is Meta Llama 3.1 70B Instruct (`us.meta.llama3-1-70b-instruct-v1:0`), with modular architecture supporting swapping to Anthropic Claude models (e.g. Claude 3.5 Sonnet) if output accuracy requires it.



### Sample Data First, Full Data On Demand

Local startup will use a smaller sample database dataset for fast setup. A separate documented command will generate the full target dataset of 500k orders, 2M tracking events, 500k payments, and 100 hubs into SQLite.

Rationale: Full-scale generation is useful for performance and demo realism, but it should not block every local start.

### NGINX Local Reverse Proxy

Local access will go through NGINX routes that mirror the deployment shape: `/ai/*` to the frontend and `/api/*` to the FastAPI backend.

Rationale: This validates iframe routing, CORS, frame headers, and API paths before ECS deployment.

## Risks / Trade-offs

- Running 2M rows in SQLite on a Docker volume -> Need proper indexes on foreign keys (e.g., `orders.hub_id`, `tracking_events.tracking_number`) to maintain fast query response times.
- PDF export with Puppeteer can increase image size and memory usage -> Isolate browser dependencies in the frontend/export container and document local resource requirements.
- AWS Bedrock credentials, region, model access, or service quotas can block live AI demos -> Provide a mock AI provider mode for deterministic local runs and use Bedrock only when AWS settings and permissions are configured.

## Migration Plan

1. Build the Docker Compose environment locally.
2. Verify SQLite database schema creation and sample database seeding.
3. Verify health checks for backend, database file, Redis, frontend, and NGINX.
4. Verify iframe chat route.
5. Verify report generation, saved report URL loading, live data rerun, and previous reports list API.
6. Verify Excel and PDF export locally.
7. Generate the full dataset in SQLite and verify query performance using Peewee indices.
8. Start ECS Fargate deployment assets after local acceptance checks pass.

## Open Questions

- Final OpenDhi-inspired theme tokens, colors, typography, and layout density are pending.
- Exact CodeIgniter route names and iframe placement in the PHP host are pending.
