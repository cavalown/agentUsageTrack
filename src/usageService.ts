import { EventEmitter } from 'events';
import type { AgentId } from './agents';
import { agentIds } from './agents';
import type { UsageProvider, UsageResult } from './usageTypes';
import { notConnected } from './usageTypes';

export class UsageService extends EventEmitter {
  private readonly providers = new Map<AgentId, UsageProvider>();
  private readonly latest = new Map<AgentId, UsageResult>();

  public constructor(providers: UsageProvider[]) {
    super();

    for (const provider of providers) {
      this.providers.set(provider.id, provider);
      this.latest.set(provider.id, notConnected(provider.id, 'Provider has not refreshed yet.'));
    }
  }

  public getSnapshot(agentId: AgentId): UsageResult {
    return this.latest.get(agentId) ?? notConnected(agentId, 'Provider is not registered.');
  }

  public getAllSnapshots(): UsageResult[] {
    return agentIds.map((agentId) => this.getSnapshot(agentId));
  }

  public async refreshAgent(agentId: AgentId): Promise<UsageResult> {
    const provider = this.providers.get(agentId);
    if (!provider) {
      const result = notConnected(agentId, 'Provider is not registered.');
      this.latest.set(agentId, result);
      this.emit('updated', this.getAllSnapshots());
      return result;
    }

    let result: UsageResult;
    try {
      result = await provider.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Provider refresh failed.';
      result = notConnected(agentId, message || 'Provider refresh failed.');
    }

    this.latest.set(agentId, result);
    this.emit('updated', this.getAllSnapshots());
    return result;
  }

  public async refreshAll(): Promise<UsageResult[]> {
    const results = await Promise.all(agentIds.map((agentId) => this.refreshAgent(agentId)));
    this.emit('updated', this.getAllSnapshots());
    return results;
  }
}
