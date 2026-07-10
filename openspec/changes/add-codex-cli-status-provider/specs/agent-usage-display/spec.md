## MODIFIED Requirements

### Requirement: Dashboard displays trusted snapshot details

The dashboard SHALL display trusted usage snapshot details for connected agents, including remaining usage, reset information, weekly remaining usage, source, and last update time when those fields are available.

#### Scenario: Codex has a valid trusted snapshot

- **WHEN** the Codex provider returns a valid trusted snapshot
- **THEN** the Codex card displays the remaining usage, reset information, weekly remaining usage, source, and last update time from that snapshot

### Requirement: Status Bar displays the manually selected agent

The extension SHALL provide a VS Code Status Bar item that displays the manually selected active agent instead of automatically inferring the active agent.

#### Scenario: Codex is selected as active agent

- **WHEN** Codex is selected as the active agent and Codex has a valid trusted snapshot
- **THEN** the Status Bar displays Codex usage in the format `Codex · <remaining>% left · reset <reset> · week <week>% left`

#### Scenario: Selected agent is not connected

- **WHEN** the selected active agent has no trusted usage snapshot
- **THEN** the Status Bar displays `<agent> · not connected`
