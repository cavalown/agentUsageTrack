import type { CodexUsageCommandOutput, ValidationResult } from '../validation';
import { isValidPercent } from '../validation';

interface RateLimitWindow {
  usedPercent: number;
  resetsAt?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readWindow(value: unknown): RateLimitWindow | undefined {
  if (!isRecord(value) || !isValidPercent(value.usedPercent)) {
    return undefined;
  }

  const resetsAt = typeof value.resetsAt === 'number' && Number.isFinite(value.resetsAt) ? value.resetsAt : undefined;
  return { usedPercent: value.usedPercent, resetsAt };
}

export function formatResetsAt(resetsAtSeconds: number | undefined, nowMs: number): string {
  if (resetsAtSeconds === undefined) {
    return 'unknown';
  }

  const remainingMinutes = Math.ceil((resetsAtSeconds * 1000 - nowMs) / 60000);
  if (remainingMinutes <= 0) {
    return 'now';
  }

  const days = Math.floor(remainingMinutes / (60 * 24));
  const hours = Math.floor((remainingMinutes % (60 * 24)) / 60);
  const minutes = remainingMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `in ${days}d ${hours}h` : `in ${days}d`;
  }
  if (hours > 0) {
    return minutes > 0 ? `in ${hours}h ${minutes}m` : `in ${hours}h`;
  }
  return `in ${minutes}m`;
}

export function parseCodexAppServerRateLimits(value: unknown, nowMs = Date.now()): ValidationResult<CodexUsageCommandOutput> {
  if (!isRecord(value) || !isRecord(value.rateLimits)) {
    return { ok: false, error: 'Codex app-server response did not include rate limits.' };
  }

  const primary = readWindow(value.rateLimits.primary);
  const secondary = readWindow(value.rateLimits.secondary);

  if (!primary || !secondary) {
    return { ok: false, error: 'Codex app-server response did not include complete usage limits.' };
  }

  return {
    ok: true,
    value: {
      remainingPercent: Math.max(0, Math.min(100, 100 - primary.usedPercent)),
      resetIn: formatResetsAt(primary.resetsAt, nowMs),
      weekPercent: Math.max(0, Math.min(100, 100 - secondary.usedPercent)),
      source: 'codex-app-server',
      updatedAt: new Date(nowMs).toISOString()
    }
  };
}
