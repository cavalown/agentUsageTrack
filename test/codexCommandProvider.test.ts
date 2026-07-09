import assert from 'node:assert/strict';
import test from 'node:test';
import type { CodexAppServerRunner } from '../src/providers/codexAppServerClient';
import { buildShellInvocation, CodexCommandProvider, type CommandRunner } from '../src/providers/codexCommandProvider';

const unavailableAppServerRunner: CodexAppServerRunner = {
  async readRateLimits() {
    throw new Error('Codex app-server status is unavailable.');
  }
};

function createProvider(commandRunner: CommandRunner, command = 'codex-usage', appServerRunner = unavailableAppServerRunner, enableAppServerStatus = false): CodexCommandProvider {
  return new CodexCommandProvider({
    getCommand: () => command,
    getEnableAppServerStatus: () => enableAppServerStatus,
    getCliPath: () => 'codex',
    getTimeoutMs: () => 50,
    commandRunner,
    appServerRunner
  });
}

test('Codex provider returns a connected snapshot for app-server rate limits', async () => {
  let commandRunCount = 0;
  const provider = createProvider({
    async run() {
      commandRunCount += 1;
      throw new Error('should not run command fallback');
    }
  }, 'codex-usage', {
    async readRateLimits() {
      return {
        rateLimits: {
          primary: { usedPercent: 35, windowDurationMins: 300, resetsAt: Math.floor(Date.now() / 1000) + 3600 },
          secondary: { usedPercent: 28, windowDurationMins: 10080, resetsAt: Math.floor(Date.now() / 1000) + 86400 },
          planType: 'plus'
        }
      };
    }
  }, true);

  const result = await provider.refresh();
  assert.equal(result.status, 'connected');
  assert.equal(commandRunCount, 0);
  if (result.status === 'connected') {
    assert.equal(result.snapshot.remainingPercent, 65);
    assert.equal(result.snapshot.resetIn, 'in 1h');
    assert.equal(result.snapshot.weekPercent, 72);
    assert.equal(result.snapshot.source, 'codex-app-server');
  }
});

test('Codex provider falls back to the configured command when app-server fails', async () => {
  const provider = createProvider({
    async run() {
      return JSON.stringify({
        remainingPercent: 42,
        resetIn: '1h',
        weekPercent: 31
      });
    }
  }, 'codex-usage', unavailableAppServerRunner, true);

  const result = await provider.refresh();
  assert.equal(result.status, 'connected');
  if (result.status === 'connected') {
    assert.equal(result.snapshot.source, 'configured-command');
  }
});

test('Codex provider returns a connected snapshot for valid command output', async () => {
  const provider = createProvider({
    async run() {
      return JSON.stringify({
        remainingPercent: 42,
        resetIn: '1h',
        weekPercent: 31,
        source: 'test-command',
        updatedAt: '2026-07-09T10:00:00.000Z'
      });
    }
  });

  const result = await provider.refresh();
  assert.equal(result.status, 'connected');
  if (result.status === 'connected') {
    assert.equal(result.snapshot.remainingPercent, 42);
    assert.equal(result.snapshot.resetIn, '1h');
    assert.equal(result.snapshot.weekPercent, 31);
    assert.equal(result.snapshot.source, 'test-command');
  }
});

test('Codex provider does not launch app-server when disabled', async () => {
  let appServerRunCount = 0;
  const provider = createProvider({
    async run() {
      return JSON.stringify({
        remainingPercent: 42,
        resetIn: '1h',
        weekPercent: 31
      });
    }
  }, 'codex-usage', {
    async readRateLimits() {
      appServerRunCount += 1;
      throw new Error('should not run app-server status');
    }
  }, false);

  const result = await provider.refresh();
  assert.equal(result.status, 'connected');
  assert.equal(appServerRunCount, 0);
});

test('Codex provider reports not connected when no command is configured', async () => {
  const provider = createProvider({
    async run() {
      throw new Error('should not run');
    }
  }, '');

  const result = await provider.refresh();
  assert.equal(result.status, 'notConnected');
});

test('Codex provider reports not connected for invalid command output', async () => {
  const provider = createProvider({
    async run() {
      return 'not json';
    }
  });

  const result = await provider.refresh();
  assert.equal(result.status, 'notConnected');
});

test('Codex provider reports not connected when command runner fails or times out', async () => {
  const provider = createProvider({
    async run() {
      throw new Error('Command timed out.');
    }
  });

  const result = await provider.refresh();
  assert.equal(result.status, 'notConnected');
  if (result.status === 'notConnected') {
    assert.equal(result.reason, 'Command timed out.');
  }
});

test('Codex provider reports not connected when app-server and command are unavailable', async () => {
  const provider = createProvider({
    async run() {
      throw new Error('should not run');
    }
  }, '', unavailableAppServerRunner, true);

  const result = await provider.refresh();
  assert.equal(result.status, 'notConnected');
  if (result.status === 'notConnected') {
    assert.equal(result.reason, 'Codex app-server status is unavailable.');
  }
});

test('Codex provider avoids overlapping command executions', async () => {
  let runCount = 0;
  let resolveRun: ((value: string) => void) | undefined;
  const provider = createProvider({
    run() {
      runCount += 1;
      return new Promise<string>((resolve) => {
        resolveRun = resolve;
      });
    }
  });

  const first = provider.refresh();
  const second = provider.refresh();
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
  assert.equal(runCount, 1);

  resolveRun?.(JSON.stringify({
    remainingPercent: 42,
    resetIn: '1h',
    weekPercent: 31
  }));

  const [firstResult, secondResult] = await Promise.all([first, second]);
  assert.equal(firstResult.status, 'connected');
  assert.equal(secondResult.status, 'connected');
  assert.equal(runCount, 1);
});

test('shell invocation uses -c for generic Unix sh', () => {
  const invocation = buildShellInvocation('codex-usage', {
    platform: 'linux',
    shell: '/bin/sh'
  });

  assert.equal(invocation.shell, '/bin/sh');
  assert.deepEqual(invocation.args, ['-c', 'codex-usage']);
});

test('shell invocation uses -lc for bash and zsh', () => {
  assert.deepEqual(buildShellInvocation('codex-usage', {
    platform: 'darwin',
    shell: '/bin/zsh'
  }).args, ['-lc', 'codex-usage']);

  assert.deepEqual(buildShellInvocation('codex-usage', {
    platform: 'linux',
    shell: '/usr/bin/bash'
  }).args, ['-lc', 'codex-usage']);
});

test('shell invocation passes Windows cmd switches separately', () => {
  const invocation = buildShellInvocation('codex-usage', {
    platform: 'win32',
    comSpec: 'C:\\Windows\\System32\\cmd.exe'
  });

  assert.equal(invocation.shell, 'C:\\Windows\\System32\\cmd.exe');
  assert.deepEqual(invocation.args, ['/d', '/s', '/c', 'codex-usage']);
});
