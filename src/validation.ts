import type { UsageSnapshot } from './usageTypes';

export interface CodexUsageCommandOutput {
  remainingPercent: number;
  resetIn: string;
  weekPercent: number;
  source?: string;
  updatedAt?: string;
}

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isValidPercent(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidIsoDate(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

export function parseJsonObject(text: string): ValidationResult<Record<string, unknown>> {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!isRecord(parsed)) {
      return { ok: false, error: 'Command output must be a JSON object.' };
    }
    return { ok: true, value: parsed };
  } catch {
    return { ok: false, error: 'Command output is not valid JSON.' };
  }
}

export function validateCodexUsageCommandOutput(value: unknown): ValidationResult<CodexUsageCommandOutput> {
  if (!isRecord(value)) {
    return { ok: false, error: 'Command output must be a JSON object.' };
  }

  if (!isValidPercent(value.remainingPercent)) {
    return { ok: false, error: 'remainingPercent must be a number from 0 to 100.' };
  }

  if (!isNonEmptyString(value.resetIn)) {
    return { ok: false, error: 'resetIn must be a non-empty string.' };
  }

  if (!isValidPercent(value.weekPercent)) {
    return { ok: false, error: 'weekPercent must be a number from 0 to 100.' };
  }

  if (value.source !== undefined && !isNonEmptyString(value.source)) {
    return { ok: false, error: 'source must be a non-empty string when provided.' };
  }

  if (value.updatedAt !== undefined) {
    if (!isNonEmptyString(value.updatedAt) || !isValidIsoDate(value.updatedAt)) {
      return { ok: false, error: 'updatedAt must be a valid date string when provided.' };
    }
  }

  return {
    ok: true,
    value: {
      remainingPercent: value.remainingPercent,
      resetIn: value.resetIn.trim(),
      weekPercent: value.weekPercent,
      source: value.source?.trim(),
      updatedAt: value.updatedAt?.trim()
    }
  };
}

export function toCodexSnapshot(output: CodexUsageCommandOutput): UsageSnapshot {
  return {
    agentId: 'codex',
    remainingPercent: output.remainingPercent,
    resetIn: output.resetIn,
    weekPercent: output.weekPercent,
    source: output.source ?? 'configured-command',
    updatedAt: output.updatedAt ?? new Date().toISOString()
  };
}
