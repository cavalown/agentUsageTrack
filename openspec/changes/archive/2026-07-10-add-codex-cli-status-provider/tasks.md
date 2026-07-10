## 1. App-Server Client

- [x] 1.1 Add a Codex app-server client that spawns `codex app-server`, performs the JSON-RPC initialize handshake, calls `account/rateLimits/read`, matches responses by request id, enforces a timeout, and terminates the process.
- [x] 1.2 Add a rate-limits response parser that validates primary/secondary windows, maps used percentages to remaining percentages, formats reset times, and drops all account fields.
- [x] 1.3 Add parser tests for complete responses, missing windows, invalid percentages, and reset-time formatting.

## 2. Provider Integration

- [x] 2.1 Update the Codex provider to prefer app-server snapshots before falling back to the configured JSON command.
- [x] 2.2 Update configuration: enable app-server status by default, keep CLI path and timeout settings, and keep the configured JSON command settings.
- [x] 2.3 Ensure plan type, credits, and raw app-server output are not included in snapshots, logs, or user-visible error messages.
- [x] 2.4 Preserve overlap protection so a Codex refresh cannot start multiple app-server or command executions at the same time.

## 3. Cleanup

- [x] 3.1 Remove the experimental TUI `/status` PTY runner and terminal-output parser plus their tests.

## 4. Verification

- [x] 4.1 Add provider tests for successful app-server status, app-server failure with command fallback, disabled app-server path, and no trusted source available.
- [x] 4.2 Run TypeScript compilation, unit tests, and OpenSpec validation.
- [x] 4.3 Verify the app-server client end-to-end against the locally installed Codex CLI.
