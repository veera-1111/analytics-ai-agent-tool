## ADDED Requirements

### Requirement: Iframe-first embedded chat route
The system SHALL expose an iframe-compatible analytics chat route under `/ai/chat` that supports embedded panel and fullscreen modes.

#### Scenario: Open embedded chat from host application
- **WHEN** the CodeIgniter host renders an iframe pointing to `/ai/chat?mode=embedded`
- **THEN** the chat UI renders inside the iframe without login gates or role restrictions

#### Scenario: Open fullscreen chat
- **WHEN** a user opens `/ai/chat?mode=fullscreen`
- **THEN** the chat UI renders as a full-page analytics workspace

### Requirement: Direct widget usage
The chat widget SHALL allow immediate interaction without requiring external context passing.

#### Scenario: Submit chat message
- **WHEN** a user submits a chat message from the embedded widget
- **THEN** the frontend sends the message directly to the backend

### Requirement: Conversational chat experience
The chat UI SHALL provide chat history, loading states, markdown rendering, and follow-up question handling for ambiguous analytics requests.

#### Scenario: Ambiguous analytics request
- **WHEN** the user asks for a broad report such as "Show revenue report"
- **THEN** the chatbot asks for missing report inputs before generating a report URL

#### Scenario: Report-ready analytics request
- **WHEN** the user asks a complete question such as "Show delayed shipments in Bangalore for last 7 days"
- **THEN** the chatbot returns a report response with a permanent report URL

### Requirement: Responsive enterprise widget layout
The widget SHALL render a responsive enterprise analytics interface with light and dark theme support and neutral logistics language.

#### Scenario: Host resizes iframe
- **WHEN** the iframe width or height changes
- **THEN** the chat layout adjusts without clipping input controls, messages, or report links

#### Scenario: Theme is provided
- **WHEN** the host passes a supported theme mode
- **THEN** the widget applies the matching visual mode without using FedEx branding or logos

