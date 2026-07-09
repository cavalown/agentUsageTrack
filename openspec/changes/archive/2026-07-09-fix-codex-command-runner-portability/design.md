## Context

The Codex provider executes a user-configured command and parses JSON from stdout. The current implementation uses `execFile(shell, [shellFlag, command])`, where Unix always uses `-lc` and Windows uses `'/d /s /c'` as a single argument. This is not portable.

## Goals / Non-Goals

**Goals:**

- Use platform-compatible shell arguments for configured commands.
- Keep timeout and max-buffer behavior.
- Keep command output parsing and validation unchanged.

**Non-Goals:**

- Change the configured command JSON schema.
- Add native Codex `/status` integration.
- Add shell-specific user configuration.

## Decisions

- Introduce a small shell command builder that returns `{ shell, args }`.
- Use `['-lc', command]` only when the selected Unix shell is bash or zsh.
- Use `['-c', command]` for generic Unix shells such as `/bin/sh`.
- Use `['/d', '/s', '/c', command]` for Windows `cmd.exe`.
- Keep `execFile` instead of switching to `exec` so timeout/maxBuffer behavior remains explicit and testable.

## Risks / Trade-offs

- Users relying on login-shell startup files with `/bin/sh` fallback will not get login behavior -> VS Code-launched extension processes should prefer correctness over assuming login shell semantics.
- Shell command strings remain user-provided and shell-interpreted -> This is expected behavior for the configured command feature.
