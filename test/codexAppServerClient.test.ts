import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAppServerInvocation } from '../src/providers/codexAppServerClient';

test('app-server invocation quotes the CLI path through a login shell on macOS', () => {
  const invocation = buildAppServerInvocation('/Users/me/my tools/codex', { platform: 'darwin', shell: '/bin/zsh' });

  assert.equal(invocation.command, '/bin/zsh');
  assert.deepEqual(invocation.args, ['-lc', "exec '/Users/me/my tools/codex' app-server"]);
  assert.equal(invocation.windowsVerbatimArguments, false);
});

test('app-server invocation escapes single quotes in the CLI path', () => {
  const invocation = buildAppServerInvocation("/tmp/o'brien/codex", { platform: 'linux', shell: '/bin/sh' });

  assert.deepEqual(invocation.args, ['-c', `exec '/tmp/o'\\''brien/codex' app-server`]);
});

test('app-server invocation quotes spaced Windows paths for cmd.exe', () => {
  const invocation = buildAppServerInvocation('C:\\Program Files\\Codex\\codex.exe', {
    platform: 'win32',
    comSpec: 'C:\\Windows\\System32\\cmd.exe'
  });

  assert.equal(invocation.command, 'C:\\Windows\\System32\\cmd.exe');
  assert.deepEqual(invocation.args, ['/d', '/s', '/c', '""C:\\Program Files\\Codex\\codex.exe" app-server"']);
  assert.equal(invocation.windowsVerbatimArguments, true);
});

test('app-server invocation rejects Windows CLI paths containing quotes', () => {
  assert.throws(() => buildAppServerInvocation('C:\\evil" & del *.*', { platform: 'win32' }));
});
