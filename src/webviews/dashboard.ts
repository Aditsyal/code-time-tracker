import * as vscode from 'vscode';
import { supabase } from '../config/supabase';

export class DashboardPanel {
    public static currentPanel: DashboardPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._panel.webview.html = this._getWebviewContent();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(
            message => this._handleMessage(message),
            null,
            this._disposables
        );

        // Update content immediately and every 5 minutes
        this._updateContent();
        setInterval(() => this._updateContent(), 5 * 60 * 1000);
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (DashboardPanel.currentPanel) {
            DashboardPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'timeTrackerDashboard',
            'Time Tracker Dashboard',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        DashboardPanel.currentPanel = new DashboardPanel(panel, extensionUri);
    }

    private async _updateContent() {
        const session = await vscode.authentication.getSession('github', ['read:user']);
        if (!session) {
            this._panel.webview.html = this._getWebviewContent('Please login first');
            return;
        }

        const { data: timeEntries, error } = await supabase
            .from('time_entries')
            .select('*')
            .order('start_time', { ascending: false })
            .limit(20);

        if (error) {
            this._panel.webview.html = this._getWebviewContent('Error loading time entries');
            return;
        }

        const stats = this._calculateStats(timeEntries);
        this._panel.webview.html = this._getWebviewContent(this._generateDashboardHtml(timeEntries, stats));
    }

    private _calculateStats(entries: any[]) {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());

        return entries.reduce((acc: any, entry: any) => {
            const startTime = new Date(entry.start_time);
            const endTime = entry.end_time ? new Date(entry.end_time) : new Date();
            const duration = endTime.getTime() - startTime.getTime();

            if (startTime >= todayStart) {
                acc.todayTime += duration;
            }
            if (startTime >= weekStart) {
                acc.weekTime += duration;
            }
            acc.totalTime += duration;

            return acc;
        }, { todayTime: 0, weekTime: 0, totalTime: 0 });
    }

    private _formatDuration(ms: number): string {
        const minutes = Math.floor(ms / 60000);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }

    private _generateDashboardHtml(entries: any[], stats: any): string {
        return `
            <div class="dashboard">
                <div class="stats">
                    <div class="stat-card">
                        <h3>Today</h3>
                        <p>${this._formatDuration(stats.todayTime)}</p>
                    </div>
                    <div class="stat-card">
                        <h3>This Week</h3>
                        <p>${this._formatDuration(stats.weekTime)}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Total</h3>
                        <p>${this._formatDuration(stats.totalTime)}</p>
                    </div>
                </div>
                <div class="recent-entries">
                    <h2>Recent Activity</h2>
                    ${entries.map(entry => `
                        <div class="entry">
                            <div class="entry-header">
                                <strong>${entry.workspace_name || 'Unknown Workspace'}</strong>
                                <span>${new Date(entry.start_time).toLocaleDateString()}</span>
                            </div>
                            <div class="entry-time">
                                ${new Date(entry.start_time).toLocaleTimeString()} - 
                                ${entry.end_time ? new Date(entry.end_time).toLocaleTimeString() : 'In Progress'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    private _getWebviewContent(content: string = '') {
        return `<!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        padding: 20px;
                        color: var(--vscode-foreground);
                    }
                    .dashboard {
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    .stats {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 20px;
                        margin-bottom: 40px;
                    }
                    .stat-card {
                        background-color: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-widget-border);
                        border-radius: 6px;
                        padding: 20px;
                        text-align: center;
                    }
                    .stat-card h3 {
                        margin: 0 0 10px 0;
                        color: var(--vscode-foreground);
                    }
                    .stat-card p {
                        margin: 0;
                        font-size: 1.5em;
                        color: var(--vscode-textLink-foreground);
                    }
                    .recent-entries {
                        background-color: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-widget-border);
                        border-radius: 6px;
                        padding: 20px;
                    }
                    .entry {
                        padding: 10px;
                        border-bottom: 1px solid var(--vscode-widget-border);
                    }
                    .entry:last-child {
                        border-bottom: none;
                    }
                    .entry-header {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 5px;
                    }
                    .entry-time {
                        color: var(--vscode-descriptionForeground);
                        font-size: 0.9em;
                    }
                </style>
            </head>
            <body>
                ${content}
            </body>
            </html>`;
    }

    private _handleMessage(message: any) {
        switch (message.command) {
            case 'refresh':
                this._updateContent();
                break;
        }
    }

    public dispose() {
        DashboardPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
