import assert from 'node:assert/strict';
import test from 'node:test';
import { parseJsonObject, toCodexSnapshot, validateCodexUsageCommandOutput } from '../src/validation';

test('validates Codex command JSON and creates a snapshot', () => {
  const parsed = parseJsonObject('{"remainingPercent":42,"resetIn":"1h","weekPercent":31,"source":"test"}');
  assert.equal(parsed.ok, true);

  const validated = validateCodexUsageCommandOutput(parsed.value);
  assert.equal(validated.ok, true);
  assert.ok(validated.value);

  const snapshot = toCodexSnapshot(validated.value);
  assert.equal(snapshot.agentId, 'codex');
  assert.equal(snapshot.remainingPercent, 42);
  assert.equal(snapshot.resetIn, '1h');
  assert.equal(snapshot.weekPercent, 31);
  assert.equal(snapshot.source, 'test');
});

test('rejects invalid Codex command JSON', () => {
  const parsed = parseJsonObject('not json');
  assert.equal(parsed.ok, false);
});

test('rejects missing required Codex fields', () => {
  const validated = validateCodexUsageCommandOutput({
    remainingPercent: 42,
    resetIn: '1h'
  });

  assert.equal(validated.ok, false);
  assert.match(validated.error ?? '', /weekPercent/);
});

test('rejects percentage values outside the display range', () => {
  const validated = validateCodexUsageCommandOutput({
    remainingPercent: 101,
    resetIn: '1h',
    weekPercent: 31
  });

  assert.equal(validated.ok, false);
  assert.match(validated.error ?? '', /remainingPercent/);
});
