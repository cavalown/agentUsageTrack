import assert from 'node:assert/strict';
import test from 'node:test';
import { formatResetsAt, parseCodexAppServerRateLimits } from '../src/providers/codexAppServerStatus';

const nowMs = Date.parse('2026-07-10T12:00:00.000Z');

function rateLimitsResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    rateLimits: {
      limitId: 'codex',
      primary: { usedPercent: 35, windowDurationMins: 300, resetsAt: Math.floor(nowMs / 1000) + 2 * 3600 + 15 * 60 },
      secondary: { usedPercent: 28, windowDurationMins: 10080, resetsAt: Math.floor(nowMs / 1000) + 5 * 24 * 3600 },
      credits: { hasCredits: false, unlimited: false, balance: '0' },
      planType: 'plus',
      ...overrides
    }
  };
}

test('parses a complete app-server rate limits response into a snapshot', () => {
  const parsed = parseCodexAppServerRateLimits(rateLimitsResponse(), nowMs);

  assert.equal(parsed.ok, true);
  assert.equal(parsed.value?.agentId, 'codex');
  assert.equal(parsed.value?.remainingPercent, 65);
  assert.equal(parsed.value?.weekPercent, 72);
  assert.equal(parsed.value?.resetIn, 'in 2h 15m');
  assert.equal(parsed.value?.source, 'codex-app-server');
  assert.equal(parsed.value?.updatedAt, new Date(nowMs).toISOString());
});

test('excludes account fields from the parsed output', () => {
  const parsed = parseCodexAppServerRateLimits(rateLimitsResponse(), nowMs);

  assert.equal(parsed.ok, true);
  const serialized = JSON.stringify(parsed.value);
  assert.ok(!serialized.includes('plus'));
  assert.ok(!serialized.includes('credits'));
  assert.ok(!serialized.includes('balance'));
});

test('rejects a response without rate limits', () => {
  assert.equal(parseCodexAppServerRateLimits({}, nowMs).ok, false);
  assert.equal(parseCodexAppServerRateLimits(undefined, nowMs).ok, false);
  assert.equal(parseCodexAppServerRateLimits('rate limits', nowMs).ok, false);
});

test('rejects a response missing a limit window', () => {
  const parsed = parseCodexAppServerRateLimits(rateLimitsResponse({ secondary: null }), nowMs);
  assert.equal(parsed.ok, false);
});

test('clamps overage usage to 0% remaining instead of rejecting', () => {
  const parsed = parseCodexAppServerRateLimits(rateLimitsResponse({ primary: { usedPercent: 100.4 } }), nowMs);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.value?.remainingPercent, 0);
});

test('rejects invalid percentages', () => {
  const notNumber = parseCodexAppServerRateLimits(rateLimitsResponse({ primary: { usedPercent: '35' } }), nowMs);
  assert.equal(notNumber.ok, false);

  const negative = parseCodexAppServerRateLimits(rateLimitsResponse({ primary: { usedPercent: -5 } }), nowMs);
  assert.equal(negative.ok, false);

  const infinite = parseCodexAppServerRateLimits(rateLimitsResponse({ primary: { usedPercent: Number.POSITIVE_INFINITY } }), nowMs);
  assert.equal(infinite.ok, false);
});

test('handles a window without a reset timestamp', () => {
  const parsed = parseCodexAppServerRateLimits(rateLimitsResponse({ primary: { usedPercent: 35 } }), nowMs);

  assert.equal(parsed.ok, true);
  assert.equal(parsed.value?.resetIn, 'unknown');
});

test('formats reset timestamps as human-readable durations', () => {
  const second = 1000;
  const nowSeconds = Math.floor(nowMs / 1000);

  assert.equal(formatResetsAt(nowSeconds - 60, nowMs), 'now');
  assert.equal(formatResetsAt(Math.floor((nowMs + 30 * second) / 1000), nowMs), 'in 1m');
  assert.equal(formatResetsAt(nowSeconds + 45 * 60, nowMs), 'in 45m');
  assert.equal(formatResetsAt(nowSeconds + 3 * 3600, nowMs), 'in 3h');
  assert.equal(formatResetsAt(nowSeconds + 5 * 24 * 3600 + 3 * 3600, nowMs), 'in 5d 3h');
  assert.equal(formatResetsAt(nowSeconds + 7 * 24 * 3600, nowMs), 'in 7d');
});
