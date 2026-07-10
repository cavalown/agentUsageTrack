import { execFile } from 'child_process';
import { type CodexAppServerRunner, CodexAppServerClient } from './codexAppServerClient';
import { parseCodexAppServerRateLimits } from './codexAppServerStatus';
import { buildShellInvocation, type ShellInvocation } from './shellInvocation';
import type { UsageProvider, UsageResult } from '../usageTypes';
import { notConnected } from '../usageTypes';
import { parseJsonObject, toCodexSnapshot, validateCodexUsageCommandOutput } from '../validation';

export { buildShellInvocation, type ShellInvocation } from './shellInvocation';

export interface CommandRunner {
  run(command: string, timeoutMs: number): Promise<string>;
}

export interface CodexCommandProviderOptions {
  getCommand(): string;
  getEnableAppServerStatus(): boolean;
  getCliPath(): string;
  getTimeoutMs(): number;
  commandRunner?: CommandRunner;
  appServerRunner?: CodexAppServerRunner;
  appServerFailureBackoffMs?: number;
}

export class ShellCommandRunner implements CommandRunner {
  public run(command: string, timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const invocation = buildShellInvocation(command);
      const child = execFile(
        invocation.shell,
        invocation.args,
        {
          timeout: timeoutMs,
          maxBuffer: 1024 * 1024,
          windowsHide: true
        },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr.trim() || error.message));
            return;
          }
          resolve(stdout);
        }
      );

      child.on('error', reject);
    });
  }
}

const defaultAppServerFailureBackoffMs = 60_000;

export class CodexCommandProvider implements UsageProvider {
  public readonly id = 'codex' as const;
  private readonly commandRunner: CommandRunner;
  private readonly appServerRunner: CodexAppServerRunner;
  private readonly appServerFailureBackoffMs: number;
  private pendingRefresh: Promise<UsageResult> | undefined;
  private lastAppServerFailure: { at: number; reason: string } | undefined;

  public constructor(private readonly options: CodexCommandProviderOptions) {
    this.commandRunner = options.commandRunner ?? new ShellCommandRunner();
    this.appServerRunner = options.appServerRunner ?? new CodexAppServerClient();
    this.appServerFailureBackoffMs = options.appServerFailureBackoffMs ?? defaultAppServerFailureBackoffMs;
  }

  public refresh(): Promise<UsageResult> {
    if (this.pendingRefresh) {
      return this.pendingRefresh;
    }

    this.pendingRefresh = this.refreshInternal().finally(() => {
      this.pendingRefresh = undefined;
    });

    return this.pendingRefresh;
  }

  private async refreshInternal(): Promise<UsageResult> {
    const command = this.options.getCommand().trim();
    const cliPath = this.options.getCliPath().trim() || 'codex';
    const timeoutMs = this.options.getTimeoutMs();

    let appServerUnavailableReason: string | undefined;
    if (this.options.getEnableAppServerStatus()) {
      const appServerResult = await this.refreshFromAppServer(cliPath, timeoutMs);
      if (appServerResult.status === 'connected') {
        return appServerResult;
      }
      appServerUnavailableReason = appServerResult.reason;
    }

    if (!command) {
      return notConnected(this.id, appServerUnavailableReason ?? 'Codex command is not configured.');
    }

    return this.refreshFromCommand(command, timeoutMs);
  }

  private async refreshFromAppServer(cliPath: string, timeoutMs: number): Promise<UsageResult> {
    // A recent failure means codex is likely still unavailable; skip the attempt
    // so refreshes do not repeatedly pay the full app-server timeout.
    if (this.lastAppServerFailure && Date.now() - this.lastAppServerFailure.at < this.appServerFailureBackoffMs) {
      return notConnected(this.id, this.lastAppServerFailure.reason);
    }

    try {
      const response = await this.appServerRunner.readRateLimits(cliPath, timeoutMs);
      const parsed = parseCodexAppServerRateLimits(response);
      if (!parsed.ok || !parsed.value) {
        return this.recordAppServerFailure(parsed.error ?? 'Codex app-server response is invalid.');
      }

      this.lastAppServerFailure = undefined;
      return {
        status: 'connected',
        snapshot: parsed.value
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      return this.recordAppServerFailure(message || 'Codex app-server status is unavailable.');
    }
  }

  private recordAppServerFailure(reason: string): UsageResult {
    this.lastAppServerFailure = { at: Date.now(), reason };
    return notConnected(this.id, reason);
  }

  private async refreshFromCommand(command: string, timeoutMs: number): Promise<UsageResult> {
    try {
      const stdout = await this.commandRunner.run(command, timeoutMs);
      const json = parseJsonObject(stdout.trim());
      if (!json.ok || !json.value) {
        return notConnected(this.id, json.error ?? 'Codex command output is invalid.');
      }

      const validated = validateCodexUsageCommandOutput(json.value);
      if (!validated.ok || !validated.value) {
        return notConnected(this.id, validated.error ?? 'Codex command output failed validation.');
      }

      return {
        status: 'connected',
        snapshot: toCodexSnapshot(validated.value)
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Codex command failed.';
      return notConnected(this.id, message || 'Codex command failed.');
    }
  }
}
