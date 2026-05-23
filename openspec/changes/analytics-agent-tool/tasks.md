## 1. Project Scaffold

- [x] 1.1 Create the `fedex-ai-poc/` implementation root with `frontend/`, `backend/`, `database/`, `infrastructure/`, and `scripts/` directories
- [x] 1.2 Add root `.env.example`, `README.md`, and update `LOCAL_RUN.md` to match implemented commands
- [x] 1.3 Add Docker Compose service definitions for frontend, backend, Redis, and NGINX with mounted database volume
- [x] 1.4 Add frontend and backend Dockerfiles with local development defaults
- [x] 1.5 Add NGINX local reverse proxy configuration for `/ai/*` and `/api/*`

## 2. Database Models and Peewee Setup

- [x] 2.1 Set up SQLite database connection using Peewee ORM in FastAPI backend
- [x] 2.2 Define Peewee database models for `Hub`, `Order`, `TrackingEvent`, `Payment`, and `SavedReport`
- [x] 2.3 Implement SQLite database schemas with proper indices on foreign keys and commonly filtered columns to support 2M+ rows
- [x] 2.4 Implement sample synthetic data generation profile to seed SQLite database with demo data (100 hubs, 25k orders, etc.)
- [x] 2.5 Implement full synthetic data generation profile to seed database with full target counts (100 hubs, 500k orders, 2M tracking events, 500k payments)
- [x] 2.6 Encode required data correlations (monsoon delays, express costs, COD tier-2 cities, heavy package delays, underperforming hubs, and regional SLA variances)
- [x] 2.7 Add deterministic seed support for repeatable database generation

## 3. Backend Foundation

- [x] 3.1 Create FastAPI application structure under `backend/app/`
- [x] 3.2 Add Pydantic settings for SQLite database path, Redis, AI provider, AWS Bedrock region and model id, host origins, and default context configuration
- [x] 3.3 Add health endpoints for application, database file connection, and Redis checks
- [x] 3.4 Establish a single implicit user role pattern (no authorization middleware, token verification, or context parsing required)
- [x] 3.5 Allow unrestricted access to all endpoints, regions, and hubs

## 4. Semantic Analytics Workflow

- [x] 4.1 Define semantic query Pydantic schemas for metric, dimensions, filters, visualization, sort, and limit
- [x] 4.2 Implement supported metric definitions for total shipments, delayed shipments, sla_breach_percent, cod_revenue, total_revenue, avg_delivery_time, and delivery success rate
- [x] 4.3 Implement supported dimension definitions for city, state, region, hub, shipment type, payment type, date, week, and month
- [x] 4.4 Implement semantic query validation that rejects unsupported metrics, dimensions, filters, sort fields, and visualization types
- [x] 4.5 Implement controlled Peewee SQL query builders from validated semantic query JSON
- [x] 4.6 Implement LangGraph workflow nodes for intent extraction, missing input detection, clarification, semantic query creation, database execution, and report metadata creation
- [x] 4.7 Implement deterministic mock AI provider behavior for supported demo prompts
- [x] 4.8 Implement AWS Bedrock provider integration behind `AI_PROVIDER=bedrock`
- [x] 4.9 Reject raw SQL returned by any AI provider before Peewee query builder execution
- [x] 4.10 Add clear configuration errors for missing AWS Bedrock settings or credentials

## 5. Report APIs and Persistence

- [x] 5.1 Implement `POST /api/chat` for conversational analytics and clarification responses
- [x] 5.2 Implement `POST /api/reports/generate` to save report metadata to SQLite database and return a report URL
- [x] 5.3 Implement `GET /api/reports/{id}` to return report metadata from database without authentication checks
- [x] 5.4 Implement `GET /api/reports/{id}/data` to rerun saved semantic queries against live SQLite database
- [x] 5.5 Implement `GET /api/users/reports` to list all saved reports for the PHP navigation menu
- [x] 5.6 Store report config JSON, title, layout metadata, and creation timestamp in the `SavedReport` table
- [x] 5.7 Prevent storage of report result snapshots in the database (always run live queries)
- [x] 5.8 Ensure all saved reports are globally accessible to the single user role

## 6. Frontend Chat Widget

- [x] 6.1 Create Next.js 14 frontend app with TypeScript, Tailwind CSS, and shadcn/ui setup
- [x] 6.2 Implement `/ai/chat` route with embedded panel and fullscreen modes
- [x] 6.3 Remove route context parameter parsing and access check gates
- [x] 6.4 Implement chat history, loading states, markdown rendering, and follow-up question UI
- [x] 6.5 Apply neutral logistics analytics copy and avoid FedEx branding or logos
- [x] 6.6 Add responsive light and dark mode support with placeholder theme tokens for future OpenDhi styling

## 7. Report UI and Exports

- [x] 7.1 Implement `/ai/reports/{report_id}` report page
- [x] 7.2 Render table reports with AG Grid using live report data
- [x] 7.3 Enable AG Grid sorting, filtering, grouping, and export controls
- [x] 7.4 Render `bar_chart`, `line_chart`, and `pie_chart` reports with Apache ECharts
- [x] 7.5 Display report title, metadata, filters, and generated timestamp on report pages
- [x] 7.6 Implement Excel export endpoint using live report data
- [x] 7.7 Implement PDF export endpoint using rendered report pages
- [x] 7.8 Remove authorization checks for Excel and PDF exports (allow global access)

## 8. CodeIgniter Host Integration

- [x] 8.1 Add iframe embedding example for the CodeIgniter host application (pointing to `/ai/chat`)
- [x] 8.2 Add previous reports menu API integration example for the PHP left panel (fetching all saved reports)
- [x] 8.3 Configure CORS for the trusted PHP host origin and localhost development
- [x] 8.4 Configure frame embedding headers to allow only trusted host origins

## 9. Local Container Validation

- [x] 9.1 Verify `docker compose build` succeeds from `fedex-ai-poc/`
- [x] 9.2 Verify `docker compose up -d redis` starts runtime dependencies
- [x] 9.3 Verify SQLite database initializes and schema tables are created successfully
- [x] 9.4 Verify sample seed command writes demo data into the SQLite database
- [x] 9.5 Verify `docker compose up -d` starts the full local stack
- [x] 9.6 Verify `/api/health`, `/api/health/db`, and `/api/health/redis` through NGINX
- [x] 9.7 Verify embedded chat iframe route loads correctly
- [x] 9.8 Verify demo prompts generate reports or clarification questions as expected
- [x] 9.9 Verify saved report URLs rerun live data queries against SQLite
- [x] 9.10 Verify list reports API returns saved reports
- [x] 9.11 Verify Excel and PDF exports download successfully
- [x] 9.12 Verify `AI_PROVIDER=mock` works without AWS credentials
- [x] 9.13 Verify `AI_PROVIDER=bedrock` fails clearly when Bedrock configuration is missing

## 10. Quality Checks

- [x] 10.1 Set up local lint and typecheck commands for frontend and backend
- [x] 10.2 Document known POC limitations and demo assumptions in `README.md`


## 11. ECS Fargate Deployment Assets

- [x] 11.1 Prepare ECR build and push scripts for frontend and backend images
- [x] 11.2 Add ECS task definition templates for frontend, backend, and NGINX routing with database volume mappings
- [x] 11.3 Add ECS service configuration notes for networking, environment variables, secrets, and AWS Bedrock IAM permissions
- [x] 11.4 Add security group and load balancer routing documentation for `/ai/*` and `/api/*`
- [x] 11.5 Add ECS deployment instructions that depend on passing local Docker validation first


## 12. Report Embedding & OpenDhi Branding Updates

- [x] 12.1 Embed report previews dynamically inside chat bubbles as interactive iframes using Next.js mode parameters
- [x] 12.2 Hide header metadata when report views are embedded in the chat bubble
- [x] 12.3 Add Maximize, Excel, and PDF controls to the embedded preview card
- [x] 12.4 Render the official OpenDhi SVG logo inside the main chat and HTML report page headers
- [x] 12.5 Programmatically draw the vector-based OpenDhi logo on PDF report exports
- [x] 12.6 Create interactive suggestion CTAs (chips) for visual format selection (Bar, Line, Pie, Table)
- [x] 12.7 Allow full-width usage of chat and report screens by expanding layout container width properties
- [x] 12.8 Prevent axis labels from getting clipped using ECharts grid containLabel configurations
- [x] 12.9 Persistently log all user prompts and agent responses to the SQLite database conversation_log table



