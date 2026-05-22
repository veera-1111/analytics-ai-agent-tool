## ADDED Requirements

### Requirement: SQLite logistics database schema
The system SHALL represent logistics datasets as SQLite database tables for orders, hubs, tracking events, payments, and saved report metadata.

#### Scenario: Database initialized
- **WHEN** local database initialization runs
- **THEN** the database file `analytics.db` is created with tables for `hub`, `order`, `trackingevent`, `payment`, and `savedreport`

#### Scenario: Order data linked to hubs
- **WHEN** orders are seeded
- **THEN** each order row references a valid hub ID in the database

### Requirement: Sample local dataset
The system SHALL provide a sample dataset generation profile for fast local Docker Compose demos, seeding the SQLite database.

#### Scenario: Sample seed command runs
- **WHEN** the local sample seed command is executed
- **THEN** the database is populated with enough orders, tracking events, payments, and hubs to demonstrate report generation

#### Scenario: Sample data supports demo prompts
- **WHEN** the sample dataset is loaded
- **THEN** the required demo prompts return non-empty database query results

### Requirement: Full-scale dataset generation
The system SHALL provide a full dataset generation profile for 500k orders, 2M tracking events, 500k payments, and 100 hubs, utilizing SQLite indexes to support fast query performance.

#### Scenario: Full seed command runs
- **WHEN** the full seed command is executed with the target row counts
- **THEN** the generator inserts the configured number of records for each logistics database table

#### Scenario: Full data generation is not default
- **WHEN** the local stack starts normally
- **THEN** the full-scale data generation profile does not run automatically

### Requirement: Realistic logistics correlations
Synthetic data MUST include operational correlations that make analytics reports believable.

#### Scenario: Monsoon delay pattern
- **WHEN** reports compare shipment delays by month
- **THEN** monsoon months show higher delayed shipment rates than baseline months

#### Scenario: Express shipment cost pattern
- **WHEN** reports compare revenue by shipment type
- **THEN** express shipments have higher average amount than standard shipments

#### Scenario: COD tier-2 city pattern
- **WHEN** reports compare payment type by city tier
- **THEN** tier-2 cities show higher COD usage than major metro cities

#### Scenario: Heavy package delay pattern
- **WHEN** reports compare delay rate by weight band
- **THEN** heavy packages show higher delay rates than light packages

#### Scenario: Underperforming hub pattern
- **WHEN** reports rank hubs by SLA breach rate
- **THEN** intentionally underperforming hubs appear among the worst performers

### Requirement: Reproducible data generation
The data generator SHALL accept deterministic configuration for repeatable local demos.

#### Scenario: Seed value provided
- **WHEN** the generator runs with a fixed seed value
- **THEN** repeated runs produce the same database aggregate report patterns

