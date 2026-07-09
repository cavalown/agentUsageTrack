import * as vscode from 'vscode';
import { AgentUsageDashboardProvider } from './dashboardView';
import { CodexCommandProvider } from './providers/codexCommandProvider';
import { StaticUnavailableProvider } from './providers/staticUnavailableProvider';
import { AgentUsageStatusBar } from './statusBar';
import { UsageService } from './usageService';

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel('Agent Usage');
  output.appendLine(`[${new Date().toISOString()}] Agent Usage extension activated.`);

  const usageService = new UsageService([
    new CodexCommandProvider({
      getCommand: () => vscode.workspace.getConfiguration('agentUsage').get<string>('codex.command', ''),
      getEnableAppServerStatus: () => vscode.workspace.getConfiguration('agentUsage').get<boolean>('codex.enableAppServerStatus', true),
      getCliPath: () => vscode.workspace.getConfiguration('agentUsage').get<string>('codex.cliPath', ''),
      getTimeoutMs: () => vscode.workspace.getConfiguration('agentUsage').get<number>('codex.timeoutMs', 5000)
    }),
    new StaticUnavailableProvider('claude-code', 'Claude Code provider is not connected in the MVP.'),
    new StaticUnavailableProvider('antigravity', 'Antigravity provider is not connected in the MVP.')
  ]);

  const dashboard = new AgentUsageDashboardProvider(context.extensionUri, usageService);
  const statusBar = new AgentUsageStatusBar(context, usageService);

  const runSafely = async (label: string, task: () => Promise<void>): Promise<void> => {
    try {
      await task();
    } catch (error) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      output.appendLine(`[${new Date().toISOString()}] ${label} failed`);
      output.appendLine(message);
      vscode.window.showErrorMessage(`Agent Usage: ${label} failed. See "Agent Usage" output for details.`);
    }
  };

  context.subscriptions.push(
    output,
    vscode.window.registerWebviewViewProvider(AgentUsageDashboardProvider.viewType, dashboard),
    vscode.commands.registerCommand('agentUsage.setActiveAgent', async () => {
      await runSafely('Set Active Agent', async () => {
        await statusBar.chooseActiveAgent();
      });
    }),
    vscode.commands.registerCommand('agentUsage.refresh', async () => {
      await runSafely('Refresh', async () => {
        await usageService.refreshAll();
        statusBar.updateFromLatest();
        dashboard.render();
      });
    }),
    vscode.commands.registerCommand('agentUsage.openDashboard', async () => {
      await runSafely('Open Dashboard', async () => {
        await vscode.commands.executeCommand('workbench.view.extension.agentUsage');
        await vscode.commands.executeCommand(`${AgentUsageDashboardProvider.viewType}.focus`);
      });
    }),
    vscode.commands.registerCommand('agentUsage.showLogs', () => {
      output.show(true);
    })
  );

  statusBar.start();
  void runSafely('Initial Refresh', async () => {
    await usageService.refreshAll();
    statusBar.updateFromLatest();
    dashboard.render();
  });
}

export function deactivate(): void {}
