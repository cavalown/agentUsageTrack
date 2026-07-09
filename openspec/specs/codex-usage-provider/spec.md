## Purpose

Define how the Codex provider ingests trusted usage snapshots from a user-configured command.

## Requirements

### Requirement: Codex provider uses configured command

The Codex provider SHALL read usage from a user-configured command.

#### Scenario: Command is configured

- **WHEN** the Codex usage command setting contains a command
- **THEN** the Codex provider executes that command to request a usage snapshot

#### Scenario: Command is not configured

- **WHEN** the Codex usage command setting is empty
- **THEN** the Codex provider reports Codex as `not connected`

### Requirement: Codex command output is JSON

The Codex provider SHALL accept only JSON command output that satisfies the expected usage snapshot schema.

#### Scenario: Command returns valid JSON

- **WHEN** the configured command exits successfully and emits valid usage JSON
- **THEN** the Codex provider returns a trusted Codex usage snapshot

#### Scenario: Command returns invalid JSON

- **WHEN** the configured command emits invalid JSON
- **THEN** the Codex provider reports Codex as `not connected`

### Requirement: Codex snapshot includes required display fields

The Codex provider SHALL require command output to include the Codex display fields needed by the Status Bar: remaining percentage, reset text, and weekly usage percentage.

#### Scenario: Required fields are present

- **WHEN** command output includes valid remaining percentage, reset text, and weekly usage percentage
- **THEN** the Codex provider exposes those values to the dashboard and Status Bar

#### Scenario: Required fields are missing

- **WHEN** command output omits a required display field
- **THEN** the Codex provider rejects the output and reports Codex as `not connected`

### Requirement: Codex provider does not use untrusted account data

The Codex provider SHALL NOT read browser cookies, authenticated web sessions, private extension storage, or unverified account data to obtain usage.

#### Scenario: No configured command exists

- **WHEN** the configured Codex command is unavailable
- **THEN** the provider reports `not connected` without attempting to scrape account or browser data

### Requirement: Codex command execution is bounded

The Codex provider SHALL bound command execution so refreshes do not hang the extension.

#### Scenario: Command times out

- **WHEN** the configured command exceeds the provider timeout
- **THEN** the Codex provider stops waiting for the command and reports Codex as `not connected`

#### Scenario: Previous refresh is still running

- **WHEN** a Codex refresh is requested while the previous Codex command is still running
- **THEN** the provider avoids starting overlapping command executions
