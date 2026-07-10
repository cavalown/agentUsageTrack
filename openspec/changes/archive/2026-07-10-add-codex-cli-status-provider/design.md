## Context

The current Codex provider accepts only a user-configured command that emits trusted JSON. That is useful for testing and advanced users, but it leaves the default extension experience disconnected.

Local investigation confirmed two things:

1. Driving the interactive TUI `/status` command through PTY automation (`expect`, `script`, `node-pty`) is unreliable and unsuitable for a VS Code extension. This path is documented in `docs/codex-cli-usage-research-retrospective.md` and is abandoned.
2. Codex CLI ships an app-server protocol (`codex app-server`, JSON-RPC over stdio) whose `account/rateLimits/read` request returns structured limit data — primary (5h) and secondary (weekly) windows with `usedPercent`, `windowDurationMins`, and `resetsAt` epoch timestamps. Verified end-to-end against codex-cli 0.143.0. The protocol schema is inspectable via `codex app-server generate-json-schema`.

## Goals / Non-Goals

**Goals:**

- Use `codex app-server` `account/rateLimits/read` as the preferred trusted Codex usage source when the CLI is installed and authenticated.
- Preserve the existing configured JSON command as a fallback/debug source.
- Expose only the usage-limit fields needed by the dashboard and Status Bar.
- Bound execution time and avoid overlapping Codex refreshes.
- Avoid storing or showing private account data from app-server responses.

**Non-Goals:**

- Scraping ChatGPT web pages, browser cookies, auth files, or private VS Code extension storage.
- Driving or parsing the interactive Codex TUI.
- Implementing Claude Code or Antigravity providers.
- Consuming rate-limit reset credits (`account/rateLimitResetCredit/consume`).
- Maintaining a long-lived app-server connection or subscribing to `account/rateLimits/updated` notifications (possible future optimization).

## Decisions

1. Prefer app-server rate-limit reads before the configured JSON command.

   The automatic source gives a useful default experience for users who already use Codex CLI, so it is enabled by default. The configured command remains valuable for local testing, custom integrations, and environments where Codex CLI is not installed.

2. Use a short-lived `codex app-server` process per refresh.

   The client spawns `codex app-server`, speaks newline-delimited JSON-RPC over stdio (`initialize` request → `initialized` notification → `account/rateLimits/read`), then terminates the process. Responses are matched by request `id`, not arrival order — out-of-order delivery was observed during verification — and messages carrying a `method` field (server-initiated requests/notifications) are ignored rather than misread as responses. Process teardown is wired to the `close` event (after stdio drains) and `stdin` stream errors are handled so an early codex exit cannot raise an uncaught exception. A single overall timeout bounds the whole exchange and always kills the child process and closes its streams. The provider depends on a runner interface so refresh behavior can be tested without spawning Codex.

   Launching matches the portability of the configured-command runner: on macOS/Linux the CLI path is single-quoted and `exec`'d through the user's login shell so rc-file PATH entries (nvm, homebrew) apply; on Windows the quoted path runs through `cmd.exe /d /s /c` with verbatim arguments so paths containing spaces work and setting values are not shell-interpreted.

3. Validate and map the response into the shared snapshot model.

   From `GetAccountRateLimitsResponse.rateLimits` the provider reads only:
   - `primary.usedPercent` → `remainingPercent = max(0, 100 - usedPercent)`
   - `primary.resetsAt` → formatted into human-readable `resetIn` text
   - `secondary.usedPercent` → `weekPercent = max(0, 100 - usedPercent)`

   Both percentage fields mean "remaining", and the Status Bar and dashboard render them with an explicit `% left` qualifier. Overage responses (`usedPercent > 100`, possible at quota exhaustion) clamp to 0% remaining instead of failing the snapshot. The parser returns a `UsageSnapshot` directly rather than reusing the configured-command output DTO. `planType`, `credits`, `rateLimitResetCredits`, and any other account fields are ignored and never surfaced in snapshots, logs, or error messages. Responses missing either window or containing negative or non-numeric percentages are rejected.

4. Fall back gracefully.

   Any app-server failure (spawn error, handshake error, timeout, invalid response) degrades to the configured JSON command when one is set, otherwise to `not connected` with a generic reason. Raw process output is never included in error messages. Failures are remembered for a short backoff window (60s) so scheduled refreshes do not repeatedly pay the full app-server timeout while codex stays unavailable; a successful read clears the backoff.

## Risks / Trade-offs

- The app-server subcommand is marked experimental → Keep the response validation strict, keep the configured command fallback, and report `not connected` instead of showing guessed values if the protocol changes.
- Spawning a process per refresh adds latency (~1–3s observed) → Acceptable for scheduled/explicit refreshes; the existing overlap guard prevents concurrent spawns. A long-lived connection with `account/rateLimits/updated` notifications can be a follow-up.
- Response could include account details → The client extracts only the three usage fields; everything else is dropped before anything is logged or displayed.
