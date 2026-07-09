## 1. Extension Project Setup

- [x] 1.1 Create a TypeScript VS Code extension project structure in the repository.
- [x] 1.2 Add package metadata, activation events, commands, configuration contributions, and view contributions.
- [x] 1.3 Add TypeScript, lint/build scripts, and extension development configuration.

## 2. Usage Snapshot Model

- [x] 2.1 Define supported agent identifiers for Codex, Claude Code, and Antigravity.
- [x] 2.2 Define the trusted usage snapshot model used by both dashboard and Status Bar.
- [x] 2.3 Define unavailable/not-connected provider results.
- [x] 2.4 Add validation helpers for required snapshot fields and percentage ranges.

## 3. Codex Command Provider

- [x] 3.1 Add the `agentUsage.codex.command` configuration setting.
- [x] 3.2 Implement Codex provider command execution with timeout handling.
- [x] 3.3 Parse command stdout as JSON and reject invalid JSON.
- [x] 3.4 Validate required Codex display fields: remaining percentage, reset text, and weekly usage percentage.
- [x] 3.5 Prevent overlapping Codex command refreshes.
- [x] 3.6 Return `not connected` when command configuration, execution, or validation fails.

## 4. Provider Aggregation

- [x] 4.1 Implement a usage service that refreshes provider snapshots.
- [x] 4.2 Add placeholder providers for Claude Code and Antigravity that report `not connected`.
- [x] 4.3 Store the latest provider results for dashboard rendering and Status Bar updates.

## 5. Status Bar

- [x] 5.1 Add a Status Bar item for Agent Usage.
- [x] 5.2 Default the active Status Bar agent to Codex.
- [x] 5.3 Add an `Agent Usage: Set Active Agent` command with Codex, Claude Code, and Antigravity options.
- [x] 5.4 Render connected Codex usage as `Codex · <remaining>% left · reset <reset> · week <week>%`.
- [x] 5.5 Render unavailable selected agents as `<agent> · not connected`.
- [x] 5.6 Refresh the Status Bar every 30 seconds while the extension is active.
- [x] 5.7 Open the Agent Usage dashboard when the Status Bar item is activated.

## 6. Dashboard

- [x] 6.1 Add an Agent Usage dashboard view.
- [x] 6.2 Render cards for Codex, Claude Code, and Antigravity.
- [x] 6.3 Show `not connected` for providers without trusted snapshots.
- [x] 6.4 Show remaining usage, reset information, weekly usage, source, and last update time for connected snapshots.
- [x] 6.5 Add a manual refresh command for the dashboard.

## 7. Documentation

- [x] 7.1 Document the Codex command JSON contract.
- [x] 7.2 Document how to configure `agentUsage.codex.command`.
- [x] 7.3 Document privacy constraints: no cookie scraping, browser session reads, or private extension storage reads.
- [x] 7.4 Document known MVP limitations and future investigations.

## 8. Verification

- [x] 8.1 Add unit tests for Codex JSON parsing and validation.
- [x] 8.2 Add unit tests for not-connected fallback behavior.
- [x] 8.3 Add unit tests for Status Bar formatting.
- [x] 8.4 Run the TypeScript build.
- [x] 8.5 Manually test the extension with a sample Codex command that returns valid JSON.
- [x] 8.6 Manually test the extension with missing, invalid, and timing-out Codex commands.
