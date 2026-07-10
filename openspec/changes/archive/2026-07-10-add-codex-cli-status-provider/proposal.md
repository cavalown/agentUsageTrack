## Why

The extension currently requires users to configure a custom JSON command before Codex usage can be shown. Codex CLI exposes trusted account-limit information through its `codex app-server` JSON-RPC interface (`account/rateLimits/read`), so the extension should use that structured source directly when Codex CLI is installed and authenticated.

An earlier iteration of this change attempted to drive the interactive TUI `/status` command through PTY automation. That approach proved unreliable (see `docs/codex-cli-usage-research-retrospective.md`) and is abandoned in favor of the app-server protocol, which returns the same limit data as structured JSON.

## What Changes

- Add an automatic Codex usage source that launches `codex app-server`, performs the JSON-RPC initialize handshake, and calls `account/rateLimits/read` to obtain 5h and weekly limit usage plus reset times.
- Keep the existing configured JSON command as a fallback/debug path.
- Report Codex as `not connected` when Codex CLI is unavailable, unauthenticated, times out, or returns a response that cannot be validated.
- Avoid displaying or storing private account details such as email, account identifiers, plan type, or credit balances.
- Remove the experimental TUI `/status` PTY runner and terminal-output parser introduced during investigation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `codex-usage-provider`: Add Codex app-server rate-limit reads as the preferred trusted source before the configured JSON command fallback.

## Impact

- Affected code: Codex usage provider, app-server client, configuration handling, tests.
- Affected runtime behavior: Codex usage displays automatically when Codex CLI is installed and authenticated, without requiring a custom command.
- Dependencies: Codex CLI with the `app-server` subcommand (verified against codex-cli 0.143.0). No native modules or external automation tools.
