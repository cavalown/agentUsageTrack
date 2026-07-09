## Why

Developers using multiple coding agents need a quick, trustworthy way to see current usage without leaving VS Code. The first version should avoid unreliable quota guesses and surface only data from explicit trusted sources.

## What Changes

- Add a VS Code extension that provides an Agent Usage dashboard with cards for Codex, Claude Code, and Antigravity.
- Add a VS Code Status Bar indicator for the manually selected active agent.
- Support Codex usage as the first real provider through a user-configured command that returns validated JSON.
- Display `not connected` when a provider has no trusted data instead of estimating or showing mock usage.
- Refresh the Status Bar every 30 seconds.
- Defer automatic active-agent detection and native Claude Code/Antigravity integrations until after the MVP.

## Capabilities

### New Capabilities

- `agent-usage-display`: Dashboard and Status Bar behavior for presenting agent usage snapshots in VS Code.
- `codex-usage-provider`: Trusted Codex usage ingestion through a user-configured command that returns validated JSON.

### Modified Capabilities

None.

## Impact

- Adds a new TypeScript-based VS Code extension project to this repository.
- Introduces VS Code contribution points for commands, configuration, a dashboard view, and a Status Bar item.
- Adds a provider abstraction for agent usage snapshots.
- Requires npm/Node tooling for extension development and validation.
- Does not read browser cookies, private extension storage, or unverified local account data.
