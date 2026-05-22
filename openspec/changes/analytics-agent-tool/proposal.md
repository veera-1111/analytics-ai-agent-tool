## Why

Operations, sales, and leadership users need a lightweight analytics chatbot that can answer logistics business questions without exposing unrestricted query execution. The POC should demonstrate embedded AI analytics inside the existing CodeIgniter PHP application while keeping the implementation dockerized, safe, database-backed with a lightweight ORM (Peewee with SQLite/PostgreSQL), and deployable to ECS Fargate.

## What Changes

- Add a nested `fedex-ai-poc/` implementation project containing the frontend, backend, database/data, infrastructure, scripts, and documentation.
- Build an embedded analytics chatbot UI that can run inside the CodeIgniter PHP application through iframe-first integration, with fullscreen and embedded panel modes.
- Remove authentication and role/region-based filtering entirely; the application operates with a single user role having access to all data.
- Implement a FastAPI backend with LangGraph-driven clarification flow that produces structured semantic query JSON only.
- Convert semantic query JSON into safe SQL queries using a lightweight ORM (Peewee) builder; do not implement unrestricted SQL or text-to-SQL.
- Store report metadata and semantic query configuration for permanent report URLs in the database, while rerunning live queries whenever reports are opened.
- Generate sample logistics data for local demos and provide a scalable generation path for the full dataset target of 500k orders, 2M tracking events, 500k payments, and 100 hubs.
- Provide AG Grid tables, ECharts visualizations, Excel export, PDF export, and previous report list APIs without authentication restrictions.
- Package frontend, backend, SQLite database volume, Redis, and NGINX with Docker Compose and include ECS Fargate deployment assets.
- Avoid FedEx names, logos, and branding in the product UI; use neutral logistics language and leave final visual theme details open for OpenDhi-inspired styling.

## Capabilities

## New Capabilities

- `embedded-chat-widget`: Defines the iframe-first embedded chatbot experience, host integration points, fullscreen/panel modes, and frontend behavior for chat history, loading states, markdown, and follow-up questions.
- `semantic-analytics-workflow`: Defines the LangGraph workflow, clarification handling, semantic query schema, supported metrics, supported dimensions, and safe semantic-query-to-database execution contract using the Peewee ORM.
- `live-reporting-permalinks`: Defines permanent report URLs, saved report metadata database storage, live rerender behavior, and previous reports API without authentication/ownership restrictions.
- `report-rendering-exports`: Defines dynamic table/chart rendering, AG Grid behavior, ECharts report types, Excel export, and PDF export from rendered report pages.
- `synthetic-logistics-data`: Defines the SQLite database schema, database models, sample dataset generation, full-scale dataset generation, and required operational correlations for believable demo analytics.
- `docker-ecs-deployment`: Defines the Docker Compose local environment, service boundaries, environment templates, NGINX routing, security headers, and ECS Fargate deployment assets.

### Modified Capabilities

- None. This standalone project has no existing project-local capabilities yet.

## Impact

- Creates a new implementation root at `analytics-ai-agent-tool/fedex-ai-poc/`.
- Adds a Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui, AG Grid, and ECharts frontend.
- Adds a Python 3.11, FastAPI, Pydantic, Peewee ORM (with SQLite backend), LangGraph, and AWS Bedrock-integrated backend.
- Adds SQLite database for logistics datasets (supporting 2M+ rows) and saved report metadata, Redis support, synthetic data scripts using Faker and Peewee, and report export dependencies such as ExcelJS and Puppeteer.
- Adds host integration examples for CodeIgniter/PHP iframe embedding, previous report navigation APIs, CORS, and frame embedding headers.
- Adds Dockerfiles, Docker Compose, environment examples, NGINX configuration, ECR build/push scripts, ECS task/service configuration, and README setup/deployment documentation.

