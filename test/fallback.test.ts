import assert from 'node:assert/strict';
import test from 'node:test';
import { StaticUnavailableProvider } from '../src/providers/staticUnavailableProvider';
import { notConnected } from '../src/usageTypes';

test('notConnected creates an unavailable result for an agent', () => {
  const result = notConnected('codex', 'No trusted data.');

  assert.equal(result.status, 'notConnected');
  assert.equal(result.agentId, 'codex');
  assert.equal(result.reason, 'No trusted data.');
  assert.ok(Date.parse(result.updatedAt));
});

test('static unavailable provider reports not connected', async () => {
  const provider = new StaticUnavailableProvider('antigravity', 'Not supported yet.');
  const result = await provider.refresh();

  assert.equal(result.status, 'notConnected');
  if (result.status === 'notConnected') {
    assert.equal(result.agentId, 'antigravity');
    assert.equal(result.reason, 'Not supported yet.');
  }
});
