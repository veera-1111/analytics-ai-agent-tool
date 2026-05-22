## 1. Project Scaffold

- [ ] 1.1 Create the `fedex-ai-poc/` implementation root with `frontend/`, `backend/`, `database/`, `infrastructure/`, and `scripts/` directories
- [ ] 1.2 Add root `.env.example`, `README.md`, and update `LOCAL_RUN.md` to match implemented commands
- [ ] 1.3 Add Docker Compose service definitions for frontend, backend, Redis, and NGINX with mounted database volume
- [ ] 1.4 Add frontend and backend Dockerfiles with local development defaults
- [ ] 1.5 Add NGINX local reverse proxy configuration for `/ai/*` and `/api/*`

## 2. Database Models and Peewee Setup

- [ ] 2.1 Set up SQLite database connection using Peewee ORM in FastAPI backend
- [ ] 2.2 Define Peewee database models for `Hub`, `Order`, `TrackingEvent`, `Payment`, and `SavedReport`
- [ ] 2.3 Implement SQLite database schemas with proper indices on foreign keys and commonly filtered columns to support 2M+ rows
- [ ] 2.4 Implement sample synthetic data generation profile to seed SQLite database with demo data (100 hubs, 25k orders, etc.)
- [ ] 2.5 Implement full synthetic data generation profile to seed database with full target counts (100 hubs, 500k orders, 2M tracking events, 500k payments)
- [ ] 2.6 Encode required data correlations (monsoon delays, express costs, COD tier-2 cities, heavy package delays, underperforming hubs, and regional SLA variances)
- [ ] 2.7 Add deterministic seed support for repeatable database generation

## 3. Backend Foundation

- [ ] 3.1 Create FastAPI application structure under `backend/app/`
- [ ] 3.2 Add Pydantic settings for SQLite database path, Redis, AI provider, AWS Bedrock region and model id, host origins, and default context configuration
- [ ] 3.3 Add health endpoints for application, database file connection, and Redis checks
- [ ] 3.4 Establish a single implicit user role pattern (no authorization middleware, token verification, or context parsing required)
- [ ] 3.5 Allow unrestricted access to all endpoints, regions, and hubs

## 4. Semantic Analytics Workflow

- [ ] 4.1 Define semantic query Pydantic schemas for metric, dimensions, filters, visualization, sort, and limit
- [ ] 4.2 Implement supported metric definitions for total shipments, delayed shipments, sla_breach_percent, cod_revenue, total_revenue, avg_delivery_time, and delivery success rate
- [ ] 4.3 Implement supported dimension definitions for city, state, region, hub, shipment type, payment type, date, week, and month
- [ ] 4.4 Implement semantic query validation that rejects unsupported metrics, dimensions, filters, sort fields, and visualization types
- [ ] 4.5 Implement controlled Peewee SQL query builders from validated semantic query JSON
- [ ] 4.6 Implement LangGraph workflow nodes for intent extraction, missing input detection, clarification, semantic query creation, database execution, and report metadata creation
- [ ] 4.7 Implement deterministic mock AI provider behavior for supported demo prompts
- [ ] 4.8 Implement AWS Bedrock provider integration behind `AI_PROVIDER=bedrock`
- [ ] 4.9 Reject raw SQL returned by any AI provider before Peewee query builder execution
- [ ] 4.10 Add clear configuration errors for missing AWS Bedrock settings or credentials

## 5. Report APIs and Persistence

- [ ] 5.1 Implement `POST /api/chat` for conversational analytics and clarification responses
- [ ] 5.2 Implement `POST /api/reports/generate` to save report metadata to SQLite database and return a report URL
- [ ] 5.3 Implement `GET /api/reports/{id}` to return report metadata from database without authentication checks
- [ ] 5.4 Implement `GET /api/reports/{id}/data` to rerun saved semantic queries against live SQLite database
- [ ] 5.5 Implement `GET /api/users/reports` to list all saved reports for the PHP navigation menu
- [ ] 5.6 Store report config JSON, title, layout metadata, and creation timestamp in the `SavedReport` table
- [ ] 5.7 Prevent storage of report result snapshots in the database (always run live queries)
- [ ] 5.8 Ensure all saved reports are globally accessible to the single user role

## 6. Frontend Chat Widget

- [ ] 6.1 Create Next.js 14 frontend app with TypeScript, Tailwind CSS, and shadcn/ui setup
- [ ] 6.2 Implement `/ai/chat` route with embedded panel and fullscreen modes
- [ ] 6.3 Remove route context parameter parsing and access check gates
- [ ] 6.4 Implement chat history, loading states, markdown rendering, and follow-up question UI
- [ ] 6.5 Apply neutral logistics analytics copy and avoid FedEx branding or logos
- [ ] 6.6 Add responsive light and dark mode support with placeholder theme tokens for future OpenDhi styling

## 7. Report UI and Exports

- [ ] 7.1 Implement `/ai/reports/{report_id}` report page
- [ ] 7.2 Render table reports with AG Grid using live report data
- [ ] 7.3 Enable AG Grid sorting, filtering, grouping, and export controls
- [ ] 7.4 Render `bar_chart`, `line_chart`, and `pie_chart` reports with Apache ECharts
- [ ] 7.5 Display report title, metadata, filters, and generated timestamp on report pages
- [ ] 7.6 Implement Excel export endpoint using live report data
- [ ] 7.7 Implement PDF export endpoint using rendered report pages
- [ ] 7.8 Remove authorization checks for Excel and PDF exports (allow global access)

## 8. CodeIgniter Host Integration

- [ ] 8.1 Add iframe embedding example for the CodeIgniter host application (pointing to `/ai/chat`)
- [ ] 8.2 Add previous reports menu API integration example for the PHP left panel (fetching all saved reports)
- [ ] 8.3 Configure CORS for the trusted PHP host origin and localhost development
- [ ] 8.4 Configure frame embedding headers to allow only trusted host origins

## 9. Local Container Validation

- [ ] 9.1 Verify `docker compose build` succeeds from `fedex-ai-poc/`
- [ ] 9.2 Verify `docker compose up -d redis` starts runtime dependencies
- [ ] 9.3 Verify SQLite database initializes and schema tables are created successfully
- [ ] 9.4 Verify sample seed command writes demo data into the SQLite database
- [ ] 9.5 Verify `docker compose up -d` starts the full local stack
- [ ] 9.6 Verify `/api/health`, `/api/health/db`, and `/api/health/redis` through NGINX
- [ ] 9.7 Verify embedded chat iframe route loads correctly
- [ ] 9.8 Verify demo prompts generate reports or clarification questions as expected
- [ ] 9.9 Verify saved report URLs rerun live data queries against SQLite
- [ ] 9.10 Verify list reports API returns saved reports
- [ ] 9.11 Verify Excel and PDF exports download successfully
- [ ] 9.12 Verify `AI_PROVIDER=mock` works without AWS credentials
- [ ] 9.13 Verify `AI_PROVIDER=bedrock` fails clearly when Bedrock configuration is missing

## 10. Quality Checks

- [ ] 10.1 Set up local lint and typecheck commands for frontend and backend
- [ ] 10.2 Document known POC limitations and demo assumptions in `README.md`


## 11. ECS Fargate Deployment Assets

- [ ] 11.1 Prepare ECR build and push scripts for frontend and backend images
- [ ] 11.2 Add ECS task definition templates for frontend, backend, and NGINX routing with database volume mappings
- [ ] 11.3 Add ECS service configuration notes for networking, environment variables, secrets, and AWS Bedrock IAM permissions
- [ ] 11.4 Add security group and load balancer routing documentation for `/ai/*` and `/api/*`
- [ ] 11.5 Add ECS deployment instructions that depend on passing local Docker validation first

