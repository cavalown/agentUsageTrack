import { execFile } from 'child_process';
import * as os from 'os';
import { type CodexAppServerRunner, CodexAppServerClient } from './codexAppServerClient';
import { parseCodexAppServerRateLimits } from './codexAppServerStatus';
import type { UsageProvider, UsageResult } from '../usageTypes';
import { notConnected } from '../usageTypes';
import { parseJsonObject, toCodexSnapshot, validateCodexUsageCommandOutput } from '../validation';

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
}

export interface ShellInvocation {
  shell: string;
  args: string[];
}

function isWindowsPlatform(platform = os.platform()): boolean {
  return platform === 'win32';
}

function isLoginShellCompatible(shell: string): boolean {
  const normalized = shell.toLowerCase();
  return normalized.endsWith('/bash') || normalized.endsWith('/zsh') || normalized.endsWith('\\bash.exe') || normalized.endsWith('\\zsh.exe');
}

export function buildShellInvocation(command: string, options: { platform?: NodeJS.Platform; shell?: string; comSpec?: string } = {}): ShellInvocation {
  const platform = options.platform ?? os.platform();

  if (isWindowsPlatform(platform)) {
    const shell = options.shell || options.comSpec || process.env.ComSpec || 'cmd.exe';
    return {
      shell,
      args: ['/d', '/s', '/c', command]
    };
  }

  const shell = options.shell || process.env.SHELL || '/bin/sh';
  return {
    shell,
    args: [isLoginShellCompatible(shell) ? '-lc' : '-c', command]
  };
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

export class CodexCommandProvider implements UsageProvider {
  public readonly id = 'codex' as const;
  private readonly commandRunner: CommandRunner;
  private readonly appServerRunner: CodexAppServerRunner;
  private pendingRefresh: Promise<UsageResult> | undefined;

  public constructor(private readonly options: CodexCommandProviderOptions) {
    this.commandRunner = options.commandRunner ?? new ShellCommandRunner();
    this.appServerRunner = options.appServerRunner ?? new CodexAppServerClient();
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
    try {
      const response = await this.appServerRunner.readRateLimits(cliPath, timeoutMs);
      const parsed = parseCodexAppServerRateLimits(response);
      if (!parsed.ok || !parsed.value) {
        return notConnected(this.id, parsed.error ?? 'Codex app-server response is invalid.');
      }

      return {
        status: 'connected',
        snapshot: toCodexSnapshot(parsed.value)
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      return notConnected(this.id, message || 'Codex app-server status is unavailable.');
    }
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
