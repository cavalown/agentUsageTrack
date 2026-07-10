## MODIFIED Requirements

### Requirement: Codex snapshot includes required display fields

The Codex provider SHALL require usage sources to include the Codex display fields needed by the Status Bar: remaining percentage, reset text, and weekly remaining percentage.

#### Scenario: Required fields are present

- **WHEN** a usage source provides valid remaining percentage, reset text, and weekly remaining percentage
- **THEN** the Codex provider exposes those values to the dashboard and Status Bar

#### Scenario: Required fields are missing

- **WHEN** a usage source omits a required display field
- **THEN** the Codex provider rejects the output and reports Codex as `not connected`

## ADDED Requirements

### Requirement: Codex provider uses Codex app-server rate limits when enabled

The Codex provider SHALL use the Codex CLI app-server `account/rateLimits/read` request as the preferred trusted usage source before falling back to the configured JSON command when app-server status collection is enabled.

#### Scenario: App-server returns complete usage limits

- **WHEN** app-server status collection is enabled and Codex CLI is installed, authenticated, and `account/rateLimits/read` returns primary and secondary limit windows with valid percentages
- **THEN** the Codex provider returns a trusted Codex usage snapshot derived from the app-server response

#### Scenario: App-server status is unavailable

- **WHEN** app-server status collection is enabled and Codex CLI is unavailable, unauthenticated, times out, or returns a response that fails validation
- **THEN** the Codex provider falls back to the configured JSON command when one is configured

#### Scenario: App-server status collection is disabled

- **WHEN** app-server status collection is disabled
- **THEN** the Codex provider uses the configured JSON command path without launching Codex CLI

#### Scenario: No trusted Codex source is available

- **WHEN** app-server status is unavailable and no configured JSON command returns a valid snapshot
- **THEN** the Codex provider reports Codex as `not connected`

### Requirement: Codex app-server responses exclude private account data

The Codex provider SHALL read only usage-limit fields from app-server responses and SHALL NOT expose account email, account identifiers, plan type, credit balances, or raw process output in usage snapshots, logs, or user-visible error messages.

#### Scenario: App-server response includes account details

- **WHEN** the `account/rateLimits/read` response includes plan type, credits, or reset-credit details
- **THEN** the Codex provider ignores those details and exposes only remaining percentage, reset text, weekly percentage, and a generic Codex app-server source name

### Requirement: Codex app-server execution is bounded

The Codex provider SHALL bound app-server execution so refreshes do not hang the extension or overlap each other, and SHALL terminate the spawned app-server process when the exchange completes or times out.

#### Scenario: App-server request times out

- **WHEN** the app-server exchange does not complete within the configured timeout
- **THEN** the Codex provider terminates the app-server process, stops waiting, and continues with fallback behavior

#### Scenario: Previous Codex refresh is still running

- **WHEN** a Codex refresh is requested while the previous Codex refresh is still running
- **THEN** the provider avoids starting another app-server process or command execution
