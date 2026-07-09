## MODIFIED Requirements

### Requirement: Codex provider uses configured command

The Codex provider SHALL read usage from a user-configured command and execute that command using shell arguments compatible with the current platform and selected shell.

#### Scenario: Command is configured

- **WHEN** the Codex usage command setting contains a command
- **THEN** the Codex provider executes that command to request a usage snapshot

#### Scenario: Command is not configured

- **WHEN** the Codex usage command setting is empty
- **THEN** the Codex provider reports Codex as `not connected`

#### Scenario: Unix fallback shell is generic sh

- **WHEN** the provider uses a generic Unix shell such as `/bin/sh`
- **THEN** it executes the configured command with shell arguments supported by that shell

#### Scenario: Windows shell is cmd

- **WHEN** the provider uses `cmd.exe`
- **THEN** it passes the command switch arguments as separate process arguments
