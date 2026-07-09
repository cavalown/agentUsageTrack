import type { AgentId } from './agents';

export interface UsageSnapshot {
  agentId: AgentId;
  remainingPercent: number;
  resetIn: string;
  weekPercent: number;
  source: string;
  updatedAt: string;
}

export interface ConnectedUsageResult {
  status: 'connected';
  snapshot: UsageSnapshot;
}

export interface NotConnectedUsageResult {
  status: 'notConnected';
  agentId: AgentId;
  reason: string;
  updatedAt: string;
}

export type UsageResult = ConnectedUsageResult | NotConnectedUsageResult;

export interface UsageProvider {
  readonly id: AgentId;
  refresh(): Promise<UsageResult>;
}

export function notConnected(agentId: AgentId, reason: string): NotConnectedUsageResult {
  return {
    status: 'notConnected',
    agentId,
    reason,
    updatedAt: new Date().toISOString()
  };
}
