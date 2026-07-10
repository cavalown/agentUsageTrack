import { spawn } from 'child_process';
import * as readline from 'readline';
import { buildShellInvocation, isWindowsPlatform, quoteForPosixShell } from './shellInvocation';
import { isRecord } from '../validation';

export interface CodexAppServerRunner {
  readRateLimits(cliPath: string, timeoutMs: number): Promise<unknown>;
}

export interface AppServerInvocation {
  command: string;
  args: string[];
  windowsVerbatimArguments: boolean;
}

const INITIALIZE_REQUEST_ID = 0;
const RATE_LIMITS_REQUEST_ID = 1;

export function buildAppServerInvocation(cliPath: string, options: { platform?: NodeJS.Platform; shell?: string; comSpec?: string } = {}): AppServerInvocation {
  const platform = options.platform ?? process.platform;

  if (isWindowsPlatform(platform)) {
    if (cliPath.includes('"')) {
      throw new Error('Codex CLI path is not usable.');
    }

    // /s strips the outer quotes, leaving the quoted path plus argument intact.
    return {
      command: options.comSpec || process.env.ComSpec || 'cmd.exe',
      args: ['/d', '/s', '/c', `""${cliPath}" app-server"`],
      windowsVerbatimArguments: true
    };
  }

  // A login shell resolves the same PATH the user's terminal has (nvm, homebrew, etc.);
  // exec replaces the shell so the spawned child is the codex process itself.
  const invocation = buildShellInvocation(`exec ${quoteForPosixShell(cliPath)} app-server`, { platform, shell: options.shell });
  return {
    command: invocation.shell,
    args: invocation.args,
    windowsVerbatimArguments: false
  };
}

interface JsonRpcMessage {
  id?: unknown;
  method?: unknown;
  result?: unknown;
  error?: unknown;
}

function parseJsonRpcLine(line: string): JsonRpcMessage | undefined {
  try {
    const parsed: unknown = JSON.parse(line);
    if (isRecord(parsed)) {
      return parsed as JsonRpcMessage;
    }
  } catch {
    // Ignore non-JSON output lines.
  }

  return undefined;
}

export class CodexAppServerClient implements CodexAppServerRunner {
  public readRateLimits(cliPath: string, timeoutMs: number): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let invocation: AppServerInvocation;
      try {
        invocation = buildAppServerInvocation(cliPath);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Codex CLI path is not usable.'));
        return;
      }

      const child = spawn(invocation.command, invocation.args, {
        stdio: ['pipe', 'pipe', 'ignore'],
        windowsHide: true,
        windowsVerbatimArguments: invocation.windowsVerbatimArguments
      });

      const lines = readline.createInterface({ input: child.stdout });

      let settled = false;
      const finish = (action: () => void): void => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        lines.close();
        child.stdin.destroy();
        child.stdout.destroy();
        child.kill();
        action();
      };
      const fail = (message: string): void => {
        finish(() => reject(new Error(message)));
      };

      const timer = setTimeout(() => {
        fail('Codex app-server request timed out.');
      }, timeoutMs);

      child.on('error', () => {
        fail('Codex app-server could not be launched.');
      });
      // 'close' fires after stdio has drained, so a response written just before exit is still delivered.
      child.on('close', (code) => {
        fail(code === 127 ? 'Codex app-server could not be launched.' : 'Codex app-server exited before returning rate limits.');
      });
      child.stdin.on('error', () => {
        fail('Codex app-server is not accepting requests.');
      });

      const send = (message: Record<string, unknown>): void => {
        try {
          child.stdin.write(`${JSON.stringify(message)}\n`);
        } catch {
          fail('Codex app-server is not accepting requests.');
        }
      };

      lines.on('line', (line) => {
        const message = parseJsonRpcLine(line);
        // Messages carrying a method are server-initiated requests/notifications, not our responses.
        if (!message || message.method !== undefined) {
          return;
        }

        if (message.id === INITIALIZE_REQUEST_ID) {
          if (message.error) {
            fail('Codex app-server rejected the handshake.');
            return;
          }
          send({ jsonrpc: '2.0', method: 'initialized' });
          send({ jsonrpc: '2.0', id: RATE_LIMITS_REQUEST_ID, method: 'account/rateLimits/read', params: {} });
          return;
        }

        if (message.id === RATE_LIMITS_REQUEST_ID) {
          if (message.error || message.result === undefined) {
            fail('Codex app-server did not return rate limits.');
            return;
          }
          const result = message.result;
          finish(() => resolve(result));
        }
      });

      send({
        jsonrpc: '2.0',
        id: INITIALIZE_REQUEST_ID,
        method: 'initialize',
        params: {
          clientInfo: {
            name: 'agent-usage-track',
            title: 'Agent Usage Track',
            version: '0.0.1'
          }
        }
      });
    });
  }
}
