# Agent Usage Track

Agent Usage Track is a VS Code extension that shows trusted coding-agent usage in two places:

- An Agent Usage dashboard with cards for Codex, Claude Code, and Antigravity.
- A Status Bar indicator for the manually selected active agent.

Codex usage is collected automatically through the Codex CLI app-server (`account/rateLimits/read`) when Codex CLI is installed and authenticated. A user-configured command remains available as a fallback/debug source. Claude Code and Antigravity are shown as `not connected` until trusted providers are added.

## Codex Command Contract

Configure `agentUsage.codex.command` with a command that prints one JSON object to stdout:

```json
{
  "remainingPercent": 42,
  "resetIn": "1h",
  "weekPercent": 31,
  "source": "codex-status",
  "updatedAt": "2026-07-09T10:00:00.000Z"
}
```

Required fields:

- `remainingPercent`: number from 0 to 100, the 5h-limit percentage remaining.
- `resetIn`: non-empty string shown after `reset`.
- `weekPercent`: number from 0 to 100, the weekly-limit percentage remaining.

Optional fields:

- `source`: non-empty string describing the trusted source. Defaults to `configured-command`.
- `updatedAt`: valid date string. Defaults to the time the extension accepted the command output.

If the command is missing, times out, exits with an error, emits invalid JSON, or omits required fields, Codex is shown as `not connected`.

## Configuration

Set the command in VS Code settings:

```json
{
  "agentUsage.codex.command": "codex-usage",
  "agentUsage.codex.timeoutMs": 5000
}
```

Example local command for testing:

```sh
node -e 'console.log(JSON.stringify({remainingPercent:42,resetIn:"1h",weekPercent:31,source:"sample"}))'
```

## Commands

- `Agent Usage: Open Dashboard`
- `Agent Usage: Refresh`
- `Agent Usage: Set Active Agent`

## Privacy

The extension does not read browser cookies, authenticated browser sessions, private extension storage, or unverified account data. Usage is displayed only when a provider returns a trusted, validated snapshot.

## MVP Limitations

- Codex is the only provider with a real data path.
- Claude Code and Antigravity cards intentionally show `not connected`.
- Active-agent selection is manual.
- Direct Codex `/status` integration is a future investigation.
- Automatic active-agent detection is a future investigation.
