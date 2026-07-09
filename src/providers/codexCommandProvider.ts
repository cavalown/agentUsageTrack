import { execFile } from 'child_process';
import * as os from 'os';
import type { UsageProvider, UsageResult } from '../usageTypes';
import { notConnected } from '../usageTypes';
import { parseJsonObject, toCodexSnapshot, validateCodexUsageCommandOutput } from '../validation';

export interface CommandRunner {
  run(command: string, timeoutMs: number): Promise<string>;
}

export interface CodexCommandProviderOptions {
  getCommand(): string;
  getTimeoutMs(): number;
  commandRunner?: CommandRunner;
}

export class ShellCommandRunner implements CommandRunner {
  public run(command: string, timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const shell = process.env.SHELL || (os.platform() === 'win32' ? process.env.ComSpec || 'cmd.exe' : '/bin/sh');
      const shellFlag = os.platform() === 'win32' ? '/d /s /c' : '-lc';
      const child = execFile(
        shell,
        [shellFlag, command],
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
  private pendingRefresh: Promise<UsageResult> | undefined;

  public constructor(private readonly options: CodexCommandProviderOptions) {
    this.commandRunner = options.commandRunner ?? new ShellCommandRunner();
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
    const timeoutMs = this.options.getTimeoutMs();

    if (!command) {
      return notConnected(this.id, 'Codex command is not configured.');
    }

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
