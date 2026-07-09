## Why

The Codex usage command runner currently assumes zsh-compatible shell flags and passes Windows shell flags as one argument. This can make valid configured commands fail outside the local macOS/zsh development setup.

## What Changes

- Make Codex command execution portable across Unix fallback shells and Windows `cmd.exe`.
- Preserve command timeout behavior and trusted JSON validation.
- Add tests for shell argument selection.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `codex-usage-provider`: Clarify that configured command execution must use platform-compatible shell invocation.

## Impact

- Updates the Codex command runner implementation.
- Adds focused unit coverage for shell argument selection.
- Does not change the Codex usage JSON contract.
