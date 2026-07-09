import type { AgentId } from '../agents';
import type { UsageProvider, UsageResult } from '../usageTypes';
import { notConnected } from '../usageTypes';

export class StaticUnavailableProvider implements UsageProvider {
  public constructor(
    public readonly id: AgentId,
    private readonly reason = 'Provider is not connected.'
  ) {}

  public async refresh(): Promise<UsageResult> {
    return notConnected(this.id, this.reason);
  }
}
