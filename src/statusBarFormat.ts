import type { AgentId } from './agents';
import { getAgentLabel } from './agents';
import type { UsageResult } from './usageTypes';

export function formatStatusBarText(agentId: AgentId, result: UsageResult): string {
  const label = getAgentLabel(agentId);

  if (result.status !== 'connected') {
    return `${label} · not connected`;
  }

  const snapshot = result.snapshot;
  return `${label} · ${snapshot.remainingPercent}% left · reset ${snapshot.resetIn} · week ${snapshot.weekPercent}%`;
}
