## Purpose

Define how the VS Code extension presents trusted agent usage snapshots in the dashboard and Status Bar.

## Requirements

### Requirement: Dashboard displays supported agent cards

The extension SHALL provide an Agent Usage dashboard in VS Code that displays separate cards for Codex, Claude Code, and Antigravity.

#### Scenario: Dashboard opens with all agent cards

- **WHEN** the user opens the Agent Usage dashboard
- **THEN** the dashboard displays cards for Codex, Claude Code, and Antigravity

#### Scenario: Provider has no trusted data

- **WHEN** an agent provider has no trusted usage snapshot
- **THEN** that agent card displays `not connected`

### Requirement: Dashboard displays trusted snapshot details

The dashboard SHALL display trusted usage snapshot details for connected agents, including remaining usage, reset information, weekly usage, source, and last update time when those fields are available.

#### Scenario: Codex has a valid trusted snapshot

- **WHEN** the Codex provider returns a valid trusted snapshot
- **THEN** the Codex card displays the remaining usage, reset information, weekly usage, source, and last update time from that snapshot

### Requirement: Status Bar displays the manually selected agent

The extension SHALL provide a VS Code Status Bar item that displays the manually selected active agent instead of automatically inferring the active agent.

#### Scenario: Codex is selected as active agent

- **WHEN** Codex is selected as the active agent and Codex has a valid trusted snapshot
- **THEN** the Status Bar displays Codex usage in the format `Codex · <remaining>% left · reset <reset> · week <week>%`

#### Scenario: Selected agent is not connected

- **WHEN** the selected active agent has no trusted usage snapshot
- **THEN** the Status Bar displays `<agent> · not connected`

### Requirement: User can change the active Status Bar agent

The extension SHALL provide a command that lets the user select which supported agent is shown in the Status Bar.

#### Scenario: User selects an active agent

- **WHEN** the user runs the active-agent selection command and chooses a supported agent
- **THEN** the Status Bar uses that agent for subsequent display refreshes

### Requirement: Status Bar refreshes every 30 seconds

The extension SHALL refresh the Status Bar usage display every 30 seconds while the extension is active.

#### Scenario: Refresh interval elapses

- **WHEN** 30 seconds have elapsed since the previous Status Bar refresh
- **THEN** the extension refreshes the selected agent's usage display

### Requirement: Status Bar opens dashboard on click

The extension SHALL open the Agent Usage dashboard when the user activates the Status Bar item.

#### Scenario: User clicks Status Bar item

- **WHEN** the user clicks the Agent Usage Status Bar item
- **THEN** the extension opens the Agent Usage dashboard
