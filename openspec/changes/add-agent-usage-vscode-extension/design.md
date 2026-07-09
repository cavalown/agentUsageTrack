## Context

The repository is currently empty, so this change will introduce a new VS Code extension project rather than modifying an existing application. The extension will help developers monitor coding-agent usage from inside VS Code, starting with Codex as the only connected provider.

The main constraint is data trust. The extension must not infer quota from weak signals, scrape authenticated browser sessions, read private extension storage, or present mock data as real usage. Providers must either return validated trusted usage snapshots or report that they are not connected.

## Goals / Non-Goals

**Goals:**

- Provide a VS Code dashboard with cards for Codex, Claude Code, and Antigravity.
- Provide a Status Bar item for the manually selected active agent.
- Support Codex usage through a user-configured command that emits JSON.
- Validate provider output before displaying it.
- Refresh the Status Bar every 30 seconds.
- Show `not connected` when trusted data is unavailable.

**Non-Goals:**

- Automatically detect the currently used agent.
- Implement native Claude Code or Antigravity usage providers.
- Scrape web dashboards, cookies, browser sessions, or private extension state.
- Estimate usage from incomplete or untrusted signals.
- Publish the extension to the Marketplace as part of the MVP.

## Decisions

### Use a provider abstraction for usage snapshots

The extension will define an internal usage snapshot model shared by the dashboard and Status Bar. Each provider will return either a valid snapshot or an unavailable result.

Alternatives considered:

- Hard-code Codex directly into the UI. This is simpler initially but makes Claude Code and Antigravity harder to add later.
- Build a generic scraper layer. This conflicts with the trust and privacy constraints.

### Start Codex with a configurable command provider

Codex v1 will read usage from a user-configured command. The command must emit JSON with the fields needed by the UI, such as remaining percentage, reset text, weekly usage percentage, source, and update time. The extension will parse and validate the output before displaying it.

Alternatives considered:

- Directly integrate Codex `/status`. This remains a future investigation because it may be interactive-session-only and not stable as a non-interactive VS Code extension data source.
- Read OpenAI web usage pages. This would require authenticated browser/session access and is out of scope.
- Use mock data. This violates the requirement to show only trusted sources.

### Keep active-agent selection manual for MVP

The Status Bar will display the manually selected agent. The MVP default can be Codex because it is the only connected provider initially.

Alternatives considered:

- Display the most recently updated provider. This can be misleading because "latest refreshed" does not always mean "currently being used".
- Inspect terminals, processes, or extension activity. This is useful later but adds unreliable detection logic before the base product is working.

### Use a WebviewView for the dashboard and a StatusBarItem for the summary

The dashboard needs card-like presentation for multiple agents, source status, and refresh metadata, so a WebviewView is a reasonable fit. The Status Bar item is the native VS Code surface for the compact active-agent summary.

Alternatives considered:

- TreeView dashboard. More native and simpler, but less suitable for compact cards and progress-like presentation.
- Injecting UI into other agent chat sidebars. VS Code extensions cannot reliably insert UI into another extension's webview.

## Risks / Trade-offs

- Codex command output may be malformed or stale -> Validate required fields, apply a timeout, and show `not connected` or an error state instead of partial data.
- User-provided commands can be slow -> Run refreshes with a timeout and avoid overlapping executions.
- Status Bar text can become too long -> Keep a compact fixed format and put detailed metadata in the dashboard tooltip or card.
- The command provider shifts data-source setup to the user -> Document the expected JSON contract clearly in settings and README.
- Antigravity and Claude Code cards may look incomplete in MVP -> Label them as `not connected` and keep the provider architecture ready for future integrations.
- Usage semantics may vary across agents -> Normalize only display fields required by the UI and preserve provider source metadata.

## Migration Plan

This is a new project, so no data migration is required. Implementation can be rolled back by disabling or uninstalling the extension.

## Open Questions

- Can Codex `/status` be accessed through a stable non-interactive command path suitable for a native provider?
- Can a future version reliably detect the active agent from VS Code context, terminal processes, or extension activity?
- What trusted sources are available for Claude Code and Antigravity after the Codex MVP is working?
