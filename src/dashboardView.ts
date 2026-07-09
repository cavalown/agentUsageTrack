import * as vscode from 'vscode';
import { getAgentLabel } from './agents';
import type { UsageResult } from './usageTypes';
import type { UsageService } from './usageService';

export class AgentUsageDashboardProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'agentUsage.dashboard';
  private view: vscode.WebviewView | undefined;

  public constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly usageService: UsageService
  ) {
    this.usageService.on('updated', () => {
      this.render();
    });
  }

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: false,
      localResourceRoots: [this.extensionUri]
    };
    this.render();
  }

  public render(): void {
    if (!this.view) {
      return;
    }

    this.view.webview.html = this.getHtml(this.usageService.getAllSnapshots());
  }

  private getHtml(results: UsageResult[]): string {
    const cards = results.map((result) => this.renderCard(result)).join('\n');
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agent Usage</title>
  <style>
    :root {
      color-scheme: light dark;
    }

    body {
      margin: 0;
      padding: 12px;
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    .dashboard {
      display: grid;
      gap: 10px;
    }

    .card {
      border: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
      border-radius: 6px;
      padding: 12px;
      background: var(--vscode-editor-background);
    }

    .header {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: baseline;
      margin-bottom: 10px;
    }

    .name {
      font-weight: 600;
    }

    .status {
      color: var(--vscode-descriptionForeground);
      font-size: 0.9em;
    }

    .metric {
      display: grid;
      grid-template-columns: minmax(72px, auto) 1fr;
      gap: 6px;
      margin: 5px 0;
    }

    .label {
      color: var(--vscode-descriptionForeground);
    }

    .value {
      overflow-wrap: anywhere;
    }
  </style>
</head>
<body>
  <main class="dashboard" aria-label="Agent Usage Dashboard">
    ${cards}
  </main>
</body>
</html>`;
  }

  private renderCard(result: UsageResult): string {
    const agentId = result.status === 'connected' ? result.snapshot.agentId : result.agentId;
    const label = this.escape(getAgentLabel(agentId));

    if (result.status !== 'connected') {
      return `<section class="card">
  <div class="header">
    <div class="name">${label}</div>
    <div class="status">not connected</div>
  </div>
  <div class="metric">
    <div class="label">Reason</div>
    <div class="value">${this.escape(result.reason)}</div>
  </div>
</section>`;
    }

    const snapshot = result.snapshot;
    return `<section class="card">
  <div class="header">
    <div class="name">${label}</div>
    <div class="status">connected</div>
  </div>
  <div class="metric">
    <div class="label">Remaining</div>
    <div class="value">${snapshot.remainingPercent}% left</div>
  </div>
  <div class="metric">
    <div class="label">Reset</div>
    <div class="value">${this.escape(snapshot.resetIn)}</div>
  </div>
  <div class="metric">
    <div class="label">Week</div>
    <div class="value">${snapshot.weekPercent}%</div>
  </div>
  <div class="metric">
    <div class="label">Source</div>
    <div class="value">${this.escape(snapshot.source)}</div>
  </div>
  <div class="metric">
    <div class="label">Updated</div>
    <div class="value">${this.escape(snapshot.updatedAt)}</div>
  </div>
</section>`;
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
