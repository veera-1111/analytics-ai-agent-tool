## ADDED Requirements

### Requirement: Dynamic report page rendering
The frontend SHALL render saved reports as enterprise analytics pages with tables, charts, filters, and report metadata.

#### Scenario: Table report opened
- **WHEN** a saved report has visualization `table`
- **THEN** the report page renders an AG Grid table with current report rows

#### Scenario: Chart report opened
- **WHEN** a saved report has visualization `bar_chart`, `line_chart`, or `pie_chart`
- **THEN** the report page renders the corresponding ECharts visualization from current report data

### Requirement: AG Grid table interactions
Table reports MUST support sorting, filtering, grouping, and export controls.

#### Scenario: User sorts table
- **WHEN** the user sorts a table column
- **THEN** the visible table rows reorder without changing the saved report configuration

#### Scenario: User groups table
- **WHEN** the user groups by a supported dimension
- **THEN** the table displays grouped analytics rows for that dimension

### Requirement: Excel export
The system SHALL provide an Excel export endpoint that returns an `.xlsx` file for the current live report data.

#### Scenario: Export report to Excel
- **WHEN** a user calls `GET /api/reports/{id}/export/excel`
- **THEN** the system returns an `.xlsx` file generated from the latest report query result

### Requirement: PDF export
The system SHALL provide a PDF export endpoint that renders the report page and returns a `.pdf` file.

#### Scenario: Export report to PDF
- **WHEN** a user calls `GET /api/reports/{id}/export/pdf`
- **THEN** the system returns a PDF representation of the rendered report page

#### Scenario: PDF reflects latest data
- **WHEN** report data changes before PDF export
- **THEN** the exported PDF reflects the latest report query result

### Requirement: Neutral enterprise visual language
The report UI MUST use neutral logistics analytics language and MUST NOT use FedEx branding or logos.

#### Scenario: Report page rendered
- **WHEN** a user opens any report page
- **THEN** the page displays neutral logistics analytics labels and no FedEx brand assets

