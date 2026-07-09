export const agentIds = ['codex', 'claude-code', 'antigravity'] as const;

export type AgentId = (typeof agentIds)[number];

export interface AgentDefinition {
  id: AgentId;
  label: string;
}

export const agents: readonly AgentDefinition[] = [
  { id: 'codex', label: 'Codex' },
  { id: 'claude-code', label: 'Claude Code' },
  { id: 'antigravity', label: 'Antigravity' }
];

export function getAgentLabel(agentId: AgentId): string {
  return agents.find((agent) => agent.id === agentId)?.label ?? agentId;
}

export function isAgentId(value: unknown): value is AgentId {
  return typeof value === 'string' && agentIds.includes(value as AgentId);
}
