## ADDED Requirements

### Requirement: LangGraph analytics workflow
The backend SHALL implement a LangGraph workflow that converts natural language analytics requests into validated semantic query JSON.

#### Scenario: Complete analytics request
- **WHEN** the user asks a complete logistics analytics question
- **THEN** the workflow extracts intent, metric, dimensions, filters, visualization, sort, and limit into semantic query JSON

#### Scenario: Ambiguous analytics request
- **WHEN** the user request lacks required filters, dimensions, or time range
- **THEN** the workflow returns clarification questions instead of generating a database query plan

### Requirement: Supported analytics contract
The semantic query validator MUST support the configured metrics, dimensions, visualization types, filters, sort fields, and limits.

#### Scenario: Supported metric and dimension
- **WHEN** the semantic query contains a supported metric such as `delayed_shipments` and a supported dimension such as `hub`
- **THEN** the validator accepts the query for Peewee query generation

#### Scenario: Unsupported metric
- **WHEN** the semantic query contains a metric outside the supported metric allowlist
- **THEN** the validator rejects the query before Peewee query generation

### Requirement: Safe semantic-query-to-Peewee builder
The backend MUST generate parameter-bound SQL queries using Peewee ORM models only from validated semantic query JSON.

#### Scenario: LLM returns raw SQL
- **WHEN** the LLM response contains raw SQL text instead of semantic query JSON
- **THEN** the backend rejects the response and does not execute SQL

#### Scenario: Filtered query generated
- **WHEN** the semantic query includes region and date range filters
- **THEN** the Peewee query builder applies parameters for region and date range

### Requirement: Required logistics metrics
The system SHALL support `total_shipments`, `delayed_shipments`, `sla_breach_percent`, `cod_revenue`, `total_revenue`, `avg_delivery_time`, and `delivery_success_rate`.

#### Scenario: Revenue comparison request
- **WHEN** the user asks to compare COD revenue by state
- **THEN** the semantic query uses `cod_revenue` as the metric and `state` as a dimension

#### Scenario: SLA breach request
- **WHEN** the user asks which routes have maximum SLA breaches
- **THEN** the semantic query uses an SLA breach metric and route-compatible dimensions

### Requirement: Mock and AWS Bedrock provider modes
The backend SHALL support a deterministic mock AI provider for local demos and an AWS Bedrock provider when AWS region, model id, and credentials or task role permissions are configured.

#### Scenario: Mock provider enabled
- **WHEN** `AI_PROVIDER=mock`
- **THEN** the system handles supported demo prompts without requiring AWS Bedrock credentials

#### Scenario: AWS Bedrock provider enabled
- **WHEN** `AI_PROVIDER=bedrock` and AWS Bedrock settings plus credentials are configured
- **THEN** the workflow uses AWS Bedrock integration while preserving semantic query validation

#### Scenario: AWS Bedrock configuration missing
- **WHEN** `AI_PROVIDER=bedrock` but required AWS Bedrock configuration is missing
- **THEN** the backend rejects live AI requests with a clear configuration error

