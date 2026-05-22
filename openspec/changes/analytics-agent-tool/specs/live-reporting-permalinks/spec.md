## ADDED Requirements

### Requirement: Saved report metadata storage
The system SHALL store saved report metadata and configuration in the SQLite database while avoiding persisted report result snapshots.

#### Scenario: Report is saved
- **WHEN** a report is generated from a semantic query
- **THEN** the system stores report id, report configuration JSON, layout metadata, and creation timestamp in the database SavedReport table

#### Scenario: Report data persistence attempted
- **WHEN** a report is saved
- **THEN** the system does not store the tabular or chart result rows as a database snapshot

### Requirement: Permanent live report URLs
The system SHALL expose permanent report URLs that rerun the saved semantic query each time the report is opened.

#### Scenario: Open saved report URL
- **WHEN** a user opens `/ai/reports/{report_id}`
- **THEN** the report page loads database metadata and reruns the saved query against the current SQLite data

#### Scenario: Data changes after report creation
- **WHEN** logistics data changes after a report is saved
- **THEN** reopening the report URL reflects the latest database query results

### Requirement: Report API surface
The backend SHALL provide report generation, metadata, data, list reports, and export API endpoints without authentication checks.

#### Scenario: Generate report
- **WHEN** the frontend calls `POST /api/reports/generate` with a valid semantic query
- **THEN** the backend stores report metadata in the database and returns a report id and report URL

#### Scenario: Fetch report data
- **WHEN** the frontend calls `GET /api/reports/{id}/data`
- **THEN** the backend reruns the report query and returns rows plus visualization metadata

#### Scenario: Fetch previous reports
- **WHEN** the PHP host calls `GET /api/users/reports`
- **THEN** the backend returns report summaries for all saved reports

### Requirement: Report titles and navigation summaries
The system SHALL generate concise report titles and navigation summaries from database report metadata.

#### Scenario: Previous report displayed in PHP left panel
- **WHEN** the PHP host renders previous reports
- **THEN** each report item includes report id, title, creation timestamp, and report URL

