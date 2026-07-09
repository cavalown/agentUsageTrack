import * as vscode from 'vscode';
import type { AgentId } from './agents';
import { agents, getAgentLabel, isAgentId } from './agents';
import { formatStatusBarText } from './statusBarFormat';
import type { UsageResult } from './usageTypes';
import type { UsageService } from './usageService';

const activeAgentKey = 'agentUsage.activeAgent';
const refreshIntervalMs = 30_000;

export class AgentUsageStatusBar {
  private readonly item: vscode.StatusBarItem;
  private refreshTimer: NodeJS.Timeout | undefined;
  private activeAgent: AgentId;

  public constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly usageService: UsageService
  ) {
    const storedAgent = context.globalState.get<string>(activeAgentKey);
    this.activeAgent = isAgentId(storedAgent) ? storedAgent : 'codex';

    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.name = 'Agent Usage';
    this.item.command = 'agentUsage.openDashboard';
    this.item.show();

    this.context.subscriptions.push(this.item);
  }

  public start(): void {
    this.updateFromLatest();
    void this.refresh();
    this.refreshTimer = setInterval(() => {
      void this.refresh();
    }, refreshIntervalMs);

    this.context.subscriptions.push({
      dispose: () => {
        if (this.refreshTimer) {
          clearInterval(this.refreshTimer);
          this.refreshTimer = undefined;
        }
      }
    });
  }

  public async chooseActiveAgent(): Promise<void> {
    const selected = await vscode.window.showQuickPick(
      agents.map((agent) => ({
        label: agent.label,
        agentId: agent.id
      })),
      {
        title: 'Agent Usage: Set Active Agent',
        placeHolder: 'Select the agent shown in the Status Bar'
      }
    );

    if (!selected) {
      return;
    }

    this.activeAgent = selected.agentId;
    await this.context.globalState.update(activeAgentKey, this.activeAgent);
    await this.refresh();
  }

  public async refresh(): Promise<void> {
    const result = await this.usageService.refreshAgent(this.activeAgent);
    this.update(result);
  }

  public updateFromLatest(): void {
    this.update(this.usageService.getSnapshot(this.activeAgent));
  }

  private update(result: UsageResult): void {
    this.item.text = formatStatusBarText(this.activeAgent, result);
    if (result.status === 'connected') {
      this.item.tooltip = [
        `${getAgentLabel(this.activeAgent)} usage`,
        `Source: ${result.snapshot.source}`,
        `Updated: ${result.snapshot.updatedAt}`
      ].join('\n');
      return;
    }

    this.item.tooltip = `${getAgentLabel(this.activeAgent)} usage\n${result.reason}`;
  }
}
