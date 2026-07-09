import { spawn } from 'child_process';
import * as os from 'os';
import * as readline from 'readline';

export interface CodexAppServerRunner {
  readRateLimits(cliPath: string, timeoutMs: number): Promise<unknown>;
}

const INITIALIZE_REQUEST_ID = 0;
const RATE_LIMITS_REQUEST_ID = 1;

interface JsonRpcMessage {
  id?: unknown;
  result?: unknown;
  error?: unknown;
}

function parseJsonRpcLine(line: string): JsonRpcMessage | undefined {
  try {
    const parsed: unknown = JSON.parse(line);
    if (typeof parsed === 'object' && parsed !== null) {
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
      const child = spawn(cliPath, ['app-server'], {
        stdio: ['pipe', 'pipe', 'ignore'],
        windowsHide: true,
        shell: os.platform() === 'win32'
      });

      let settled = false;
      const finish = (action: () => void): void => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
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
      child.on('exit', () => {
        fail('Codex app-server exited before returning rate limits.');
      });

      const send = (message: Record<string, unknown>): void => {
        try {
          child.stdin.write(`${JSON.stringify(message)}\n`);
        } catch {
          fail('Codex app-server is not accepting requests.');
        }
      };

      const lines = readline.createInterface({ input: child.stdout });
      lines.on('line', (line) => {
        const message = parseJsonRpcLine(line);
        if (!message) {
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
