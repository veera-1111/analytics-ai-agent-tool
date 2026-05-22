## ADDED Requirements

### Requirement: Local Docker Compose environment
The project SHALL provide a Docker Compose environment for running the complete POC locally before ECS deployment.

#### Scenario: Local stack starts
- **WHEN** `docker compose up -d` is run from `fedex-ai-poc/`
- **THEN** frontend, backend, Redis, and NGINX services start with configured networking and a mounted database volume

#### Scenario: Local health checks pass
- **WHEN** the local stack is running
- **THEN** backend, database connection, and Redis health endpoints report successful status through the NGINX route

### Requirement: Local run documentation
The project SHALL document containerized local setup, environment variables, SQLite database initialization, sample data seeding, URLs, health checks, exports, full data generation, reset steps, and troubleshooting.

#### Scenario: Developer follows local runbook
- **WHEN** a developer follows `fedex-ai-poc/LOCAL_RUN.md`
- **THEN** the developer has all commands needed to run and validate the local POC

### Requirement: NGINX reverse proxy routing
NGINX SHALL route `/ai/*` traffic to the frontend and `/api/*` traffic to the FastAPI backend.

#### Scenario: Chat route requested
- **WHEN** a browser requests `/ai/chat`
- **THEN** NGINX proxies the request to the frontend service

#### Scenario: API route requested
- **WHEN** a client requests `/api/health`
- **THEN** NGINX proxies the request to the backend service

### Requirement: Local embedding and CORS headers
The local stack MUST configure CORS and frame embedding headers for the trusted CodeIgniter host origin and localhost development.

#### Scenario: Trusted iframe host embeds widget
- **WHEN** the configured host origin embeds `/ai/chat`
- **THEN** frame embedding is allowed by the response headers

#### Scenario: Untrusted iframe host embeds widget
- **WHEN** an unconfigured origin embeds `/ai/chat`
- **THEN** frame embedding is denied by the response headers

### Requirement: ECS Fargate deployment assets
The project SHALL provide ECS Fargate deployment assets after the local containerized environment is functional.

#### Scenario: ECS assets generated
- **WHEN** deployment assets are prepared
- **THEN** the repository contains ECR build and push scripts, ECS task definitions, service configuration, AWS Bedrock runtime permission notes, environment templates, security group notes, and NGINX configuration

#### Scenario: EC2 deployment requested
- **WHEN** deployment documentation is reviewed
- **THEN** ECS Fargate is presented as the target deployment path rather than EC2 scripts

