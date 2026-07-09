import assert from 'node:assert/strict';
import test from 'node:test';
import { formatStatusBarText } from '../src/statusBarFormat';
import type { UsageResult } from '../src/usageTypes';

test('formats connected Codex usage for the Status Bar', () => {
  const result: UsageResult = {
    status: 'connected',
    snapshot: {
      agentId: 'codex',
      remainingPercent: 42,
      resetIn: '1h',
      weekPercent: 31,
      source: 'test',
      updatedAt: '2026-07-09T10:00:00.000Z'
    }
  };

  assert.equal(formatStatusBarText('codex', result), 'Codex · 42% left · reset 1h · week 31%');
});

test('formats unavailable selected agent for the Status Bar', () => {
  const result: UsageResult = {
    status: 'notConnected',
    agentId: 'claude-code',
    reason: 'Not connected.',
    updatedAt: '2026-07-09T10:00:00.000Z'
  };

  assert.equal(formatStatusBarText('claude-code', result), 'Claude Code · not connected');
});
