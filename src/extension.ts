import * as vscode from 'vscode';
import { TimeTrackingService } from './services/timeTracking';
import { resetSupabaseClient } from './config/supabase';
import { DashboardPanel } from './webviews/dashboard';
import { getConfiguration, validateConfiguration } from './config/settings';
import { AuthenticationService } from './services/authentication';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

    // Validate configuration first
    const { isValid, missing } = validateConfiguration();
    if (!missing.includes('supabaseUrl') && !missing.includes('supabaseKey')) {
        // Initialize Supabase with current config
        try {
            const config = getConfiguration();
            // Supabase client will be initialized on first use with this config
        } catch (error) {
            console.error('Configuration error:', error);
        }
    } else {
        // Show configuration guidance
        const configAction = 'Configure Now';
        const response = await vscode.window.showWarningMessage(
            `Please configure ${missing.join(' and ')} in settings to use Time Tracker.`,
            configAction
        );
        
        if (response === configAction) {
            await vscode.commands.executeCommand('workbench.action.openSettings', 'timeTracker');
            return;
        }
        return;
    }

    // Watch for configuration changes and reset Supabase client
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('timeTracker')) {
                resetSupabaseClient();
            }
        })
    );

    let timeTracker: TimeTrackingService;
    try {
        timeTracker = TimeTrackingService.getInstance();
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to initialize Time Tracker: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return;
    }

    let statusBarItem: vscode.StatusBarItem;

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBarItem.command = 'code-time-tracker.showDashboard';
    context.subscriptions.push(statusBarItem);

    // Register commands
	 const authService = AuthenticationService.getInstance();
    let loginCommand = vscode.commands.registerCommand('code-time-tracker.login', async () => {
        try {
            const statusBarItem = vscode.window.createStatusBarItem(
                vscode.StatusBarAlignment.Left
            );
            statusBarItem.text = "$(sync~spin) Logging in to GitHub...";
            statusBarItem.show();

            const session = await authService.login();
            
            statusBarItem.text = `$(check) Logged in as ${session.account.label}`;
            vscode.window.showInformationMessage('Successfully logged in to GitHub!');
            
            // Start time tracking after successful login
            await vscode.commands.executeCommand('code-time-tracker.startTracking');
        } catch (error) {
            vscode.window.showErrorMessage(
                'Failed to login to GitHub. Please try again or check your internet connection.'
            );
        }
    });

    const startTrackingCommand = vscode.commands.registerCommand('code-time-tracker.startTracking', async () => {
        await timeTracker.startTracking();
        // Status bar is updated by TimeTrackingService
    });

    const stopTrackingCommand = vscode.commands.registerCommand('code-time-tracker.stopTracking', async () => {
        await timeTracker.stopTracking();
        // Status bar is updated by TimeTrackingService
    });

    const showDashboardCommand = vscode.commands.registerCommand('code-time-tracker.showDashboard', () => {
        DashboardPanel.createOrShow(context.extensionUri);
    });

    function updateStatusBar(text: string) {
        statusBarItem.text = `$(clock) ${text}`;
        statusBarItem.show();
    }

    // Auto-login if possible
    vscode.commands.executeCommand('code-time-tracker.login');

    context.subscriptions.push(
        loginCommand,
        startTrackingCommand,
        stopTrackingCommand,
        showDashboardCommand,
        statusBarItem
    );
}

// This method is called when your extension is deactivated
export function deactivate() {
    // Stop tracking when extension is deactivated
    const timeTracker = TimeTrackingService.getInstance();
    timeTracker.stopTracking();
}
