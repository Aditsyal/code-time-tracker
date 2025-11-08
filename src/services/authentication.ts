import * as vscode from 'vscode';

export class AuthenticationService {
    private static readonly GITHUB_AUTH_PROVIDER_ID = 'github';
    private static readonly SCOPES = ['read:user', 'user:email'];
    private static instance: AuthenticationService;

    private constructor() {}

    public static getInstance(): AuthenticationService {
        if (!AuthenticationService.instance) {
            AuthenticationService.instance = new AuthenticationService();
        }
        return AuthenticationService.instance;
    }

    async login(): Promise<vscode.AuthenticationSession> {
        try {
            const session = await vscode.authentication.getSession(
                AuthenticationService.GITHUB_AUTH_PROVIDER_ID,
                AuthenticationService.SCOPES,
                { createIfNone: true }
            );

            if (!session) {
                throw new Error('Failed to get GitHub session');
            }

            // Verify the token works
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                    'User-Agent': 'VSCode-Time-Tracker'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to verify GitHub token');
            }

            await vscode.commands.executeCommand('setContext', 'timeTracker.isLoggedIn', true);
            return session;
        } catch (error) {
            console.error('Authentication error:', error);
            vscode.window.showErrorMessage(`GitHub login failed: ${error}`);
            throw error;
        }
    }
}