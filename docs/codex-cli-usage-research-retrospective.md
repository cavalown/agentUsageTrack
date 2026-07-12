# Codex CLI Usage Research Retrospective

Date: 2026-07-10

This note records what the assistant did while researching Codex CLI usage collection for the VS Code extension, separating useful progress from unproductive loops.

## Context

Goal: determine whether Agent Usage Track can automatically collect Codex usage and remaining limits from Codex CLI, instead of relying only on a user-configured mock/JSON command.

Known constraint: the extension should show only trusted data. It should not read browser cookies, auth tokens, private prompt logs, or private account data.

## Useful Progress

### Verified that interactive `/status` contains the desired data

The assistant launched Codex CLI interactively with:

```bash
codex --no-alt-screen
```

Then sent `/status` manually through the PTY. This produced the important usage fields:

- 5h limit remaining percentage
- 5h reset time
- weekly limit remaining percentage
- weekly reset time

This proved that the data exists in Codex CLI's TUI output.

### Confirmed there is no documented `codex status` or `codex usage` subcommand

The assistant checked Codex CLI help and the official Codex manual. The relevant finding:

- `/status` and `/usage` are documented as TUI slash commands.
- There was no discovered documented non-interactive command such as `codex status --json`.

This was useful because it ruled out the simplest integration path.

### Confirmed `codex exec "/status"` is not equivalent

The assistant tested:

```bash
codex exec --json --sandbox read-only "/status"
```

Result: Codex treated `/status` as a normal prompt, not as a TUI slash command. The JSON output only included that run's token usage, not account quota/limit data.

This ruled out a misleading path.

### Added an OpenSpec change

Created:

```text
openspec/changes/add-codex-cli-status-provider/
```

Artifacts created:

- `proposal.md`
- `design.md`
- `specs/codex-usage-provider/spec.md`
- `tasks.md`

Validation passed:

```bash
openspec validate --changes
```

### Implemented parser and provider scaffolding

Added parser support for Codex CLI `/status`-style output:

- strips terminal escape sequences
- parses 5h limit
- parses weekly limit
- avoids exposing email/session/account details

Added provider support for an experimental CLI status path behind:

```json
"agentUsage.codex.enableCliStatus": false
```

The default remains disabled because automation was not proven reliable.

### Preserved safe fallback behavior

The provider still supports the existing configured JSON command path:

```json
"agentUsage.codex.command": "..."
```

This is still the reliable MVP path.

### Tests passed

Ran:

```bash
npm test
```

Result:

```text
24 tests passed
```

## Unproductive / Looping Behavior

### Spent too long trying to automate TUI input

The assistant repeatedly tried to drive Codex TUI automatically:

- `node-pty`
- macOS `script`
- `/usr/bin/expect`
- different Enter encodings
- slow-send typing
- waiting for different prompt text

These attempts did not produce a reliable automated `/status` run.

This became unproductive after the first few failures because the root problem was likely that Codex TUI expects a real terminal interaction/control-sequence environment, not just a basic PTY script.

### Tried `node-pty` even though native module risk was high

The assistant installed `node-pty`, then discovered it failed even for spawning `/bin/zsh` under the current Node 25 environment:

```text
posix_spawnp failed
```

The package was removed afterward, but the attempt cost time and was not a good fit for a VS Code extension without checking runtime compatibility first.

### Tried `script`, but stdin was not a terminal

The assistant tried using macOS `script` as a pseudo-tty wrapper. It failed with:

```text
script: tcgetattr/ioctl: Operation not supported on socket
```

This was a reasonable quick probe, but should have been abandoned immediately after that failure.

### Repeated expect attempts after the signal was clear

`expect` could launch Codex TUI, but `/status` stayed in the composer and did not reliably execute. The assistant kept changing timings and input encodings:

- `\r`
- `\n`
- `\015`
- newline plus carriage return
- slow-send typing

This was the clearest "spinning" part. The correct move should have been to stop earlier and mark TUI automation as unreliable.

### Tested `tui.status_line=["limits"]` late and without enough payoff

The assistant tested a config override hoping startup output could include limits:

```bash
codex -c 'tui.status_line=["limits"]' --no-alt-screen
```

Codex reported:

```text
Ignored invalid status line item: "limits".
```

This was a useful data point, but it happened after too much time had already been spent on PTY automation.

## Current State

The current branch contains useful scaffolding, but not a fully reliable automatic Codex usage provider.

What is reliable:

- configured JSON command path
- `/status` output parser tests
- provider fallback behavior
- OpenSpec artifacts

What is not reliable:

- automatically driving Codex TUI `/status`
- using TUI screen-scraping as a default refresh source

## Recommended Next Decision

Do not continue trying to screen-scrape Codex TUI for the default provider.

Recommended path:

1. Keep `agentUsage.codex.enableCliStatus` disabled by default.
2. Treat the CLI status runner as experimental or remove it before commit if we want the change to stay clean.
3. Continue using `agentUsage.codex.command` as the reliable MVP integration point.
4. Research Codex app-server or another structured API/event source before attempting automatic usage collection again.

## Behavior Assessment

OK:

- verified real `/status` output manually
- checked official docs and CLI help
- avoided reading auth files or private prompt bodies
- added parser tests and kept sensitive fields out of snapshots
- eventually admitted the TUI automation path was not reliable

Not OK:

- continued trying PTY automation after repeated evidence it was brittle
- changed implementation before proving the runner could work end to end
- allowed the investigation to drift into low-signal retries
- did not pause earlier to ask whether to keep or discard the experimental scaffold

**Codex Usage Retrieval**

- **Provider:** `CodexCommandProvider` — implements `UsageProvider` and is the primary codex usage provider used by the extension. See [src/providers/codexCommandProvider.ts](src/providers/codexCommandProvider.ts) for implementation.
- **App-server (preferred) path:** when enabled the provider first attempts to query the Codex app-server via `CodexAppServerClient.readRateLimits`. The client starts the CLI in `app-server` mode, performs a JSON-RPC `initialize` handshake and then calls `account/rateLimits/read`. See [src/providers/codexAppServerClient.ts](src/providers/codexAppServerClient.ts) for the protocol and timeout/error handling. A recent failed app-server call is cached and short-circuited for a backoff period (default 60_000ms).
- **CLI command (fallback) path:** if app-server is unavailable or disabled, the provider runs a configured CLI command (default `codex` or `agentUsage.codex.command`) using a `CommandRunner` (`ShellCommandRunner` uses `execFile`). The stdout is parsed as JSON (`parseJsonObject`), validated (`validateCodexUsageCommandOutput`), and converted to a `UsageSnapshot` (`toCodexSnapshot`). See [src/providers/codexCommandProvider.ts](src/providers/codexCommandProvider.ts) and the validator in [src/validation.ts](src/validation.ts).
- **Orchestration:** `UsageService` registers `UsageProvider`s, keeps the latest snapshots, and exposes `refreshAgent` / `refreshAll` which call each provider's `refresh()` and then emit an `updated` event with all snapshots. See [src/usageService.ts](src/usageService.ts).
- **Types / Shape:** the returned data is a `UsageResult` (either `connected` with a `UsageSnapshot`, or `notConnected` with a reason). See [src/usageTypes.ts](src/usageTypes.ts) for the exact fields.
- **Behavioral notes:** the implementation prefers structured app-server responses when available, falls back to a user-configured command, validates and sanitizes output before exposing it, and avoids repeatedly waiting on a failing app-server by using a short backoff.
