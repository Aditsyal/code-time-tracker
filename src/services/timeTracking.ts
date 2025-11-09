import * as vscode from 'vscode';
import { supabase } from '../config/supabase';
import { getConfiguration } from '../config/settings';

export class TimeTrackingService {
    private static _instance: TimeTrackingService;
    private currentSession: { 
        startTime: Date; 
        timer: NodeJS.Timeout;
        timeEntryId?: number;
        statusBarTimer?: NodeJS.Timeout;
    } | null = null;
    private lastActiveTime: Date = new Date();
    private config = getConfiguration();
    private isRefreshing = false;
    private statusBarItem!: vscode.StatusBarItem; // Initialized in initializeStatusBar()

    private constructor() {
        this.initializeStatusBar();
        this.setupActivityMonitoring();
        this.setupConfigurationWatcher();
        this.recoverActiveSessions().catch(error => {
            console.error('Failed to recover sessions:', error);
        });
    }

    public static getInstance(): TimeTrackingService {
        if (!TimeTrackingService._instance) {
            TimeTrackingService._instance = new TimeTrackingService();
        }
        return TimeTrackingService._instance;
    }

    private initializeStatusBar() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this.statusBarItem.command = 'code-time-tracker.startTracking';
        this.updateStatusBar();
        this.statusBarItem.show();
    }

    /**
     * Format elapsed time in hh:mm:ss format
     */
    private formatElapsedTime(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }

    /**
     * Calculate elapsed time from session start
     */
    private getElapsedTime(): number {
        if (!this.currentSession) {
            return 0;
        }
        const now = new Date();
        const elapsed = (now.getTime() - this.currentSession.startTime.getTime()) / 1000;
        return elapsed;
    }

    private updateStatusBar() {
        if (this.currentSession) {
            const elapsed = this.getElapsedTime();
            const formattedTime = this.formatElapsedTime(elapsed);
            this.statusBarItem.text = `$(clock) ${formattedTime}`;
            this.statusBarItem.tooltip = `Stop time tracking (${formattedTime} elapsed)`;
            this.statusBarItem.command = 'code-time-tracker.stopTracking';
        } else {
            this.statusBarItem.text = '$(play) Start Tracking';
            this.statusBarItem.tooltip = 'Start time tracking';
            this.statusBarItem.command = 'code-time-tracker.startTracking';
        }
    }

    /**
     * Start updating the status bar every second to show elapsed time
     */
    private startStatusBarTimer(): void {
        if (!this.currentSession) {
            return;
        }

        // Clear any existing timer
        if (this.currentSession.statusBarTimer) {
            clearInterval(this.currentSession.statusBarTimer);
        }

        // Update immediately
        this.updateStatusBar();

        // Update every second
        this.currentSession.statusBarTimer = setInterval(() => {
            this.updateStatusBar();
        }, 1000);
    }

    /**
     * Stop updating the status bar timer
     */
    private stopStatusBarTimer(): void {
        if (this.currentSession?.statusBarTimer) {
            clearInterval(this.currentSession.statusBarTimer);
            this.currentSession.statusBarTimer = undefined;
        }
    }

    private setupConfigurationWatcher() {
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('timeTracker')) {
                try {
                    const oldConfig = this.config;
                    this.config = getConfiguration();
                    
                    // Re-initialize idle checking with new timeout if changed
                    if (this.currentSession && oldConfig.idleTimeout !== this.config.idleTimeout) {
                        clearInterval(this.currentSession.timer);
                        this.currentSession.timer = setInterval(() => this.checkIdleTime(), 60000);
                    }
                } catch (error) {
                    console.error('Failed to update configuration:', error);
                    vscode.window.showErrorMessage('Failed to update time tracker configuration');
                }
            }
        });
    }

    private setupActivityMonitoring() {
        const updateActivity = () => {
            this.lastActiveTime = new Date();
            this.refreshTrackingIfNeeded().catch(error => {
                console.error('Failed to refresh tracking:', error);
            });
        };

        vscode.workspace.onDidChangeTextDocument(updateActivity);
        vscode.window.onDidChangeWindowState(updateActivity);
        setInterval(() => this.checkIdleTime(), 60000);
    }

    private async recoverActiveSessions() {
        try {
            const session = await vscode.authentication.getSession('github', ['read:user'], { silent: true });
            if (!session) {
                // No session, skip recovery
                return;
            }

            // Get user ID from database
            const githubUser = await this.fetchGitHubUserInfo(session.accessToken);
            const userId = await this.getOrCreateUser(githubUser.id, githubUser.login);

            const result = await supabase
                .from('time_entries')
                .select()
                .eq('is_active', true)
                .eq('user_id', userId)
                .limit(1);

            if (result.error) {
                console.warn('Error recovering sessions:', result.error.message);
                return;
            }

            if (result.data && result.data.length > 0) {
                const activeSession = result.data[0];
                this.currentSession = {
                    startTime: new Date(activeSession.start_time),
                    timer: setInterval(() => this.checkIdleTime(), 60000),
                    timeEntryId: activeSession.id
                };
                this.startStatusBarTimer();
                vscode.window.showInformationMessage('Recovered active time tracking session');
            }
        } catch (error) {
            // Log but don't fail initialization
            console.error('Failed to recover active sessions:', error);
        }
    }

    private async refreshTrackingIfNeeded() {
        if (this.isRefreshing || !this.currentSession) return;

        try {
            this.isRefreshing = true;
            await supabase
                .from('time_entries')
                .update({ last_active: new Date().toISOString() })
                .eq('id', this.currentSession.timeEntryId);
        } catch (error) {
            console.error('Failed to refresh tracking:', error);
        } finally {
            this.isRefreshing = false;
        }
    }

    private async checkIdleTime() {
        const now = new Date();
        const timeSinceLastActivity = now.getTime() - this.lastActiveTime.getTime();
        
        if (timeSinceLastActivity > this.config.idleTimeout && this.currentSession) {
            await this.stopTracking('inactivity');
        }
    }

    /**
     * Get or create a user in the database from GitHub session
     * Returns the user's UUID from the database
     */
    private async getOrCreateUser(githubId: string, username: string): Promise<string> {
        try {
            const client = supabase;
            const { data: existingUser, error: findError } = await client
                .from('users')
                .select('id')
                .eq('github_id', githubId)
                .single();

            if (findError) {
                if (findError.code === 'PGRST116' || findError.message?.includes('No rows')) {
                    // User not found, will create below
                } else {
                    console.error('Error finding user:', findError);
                    throw new Error(`Database error while looking up user: ${findError.message || 'Unknown error'}`);
                }
            }

            if (existingUser && !findError) {
                return existingUser.id;
            }

            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({
                    github_id: githubId,
                    username: username
                })
                .select('id')
                .single();

            if (createError || !newUser) {
                console.error('Error creating user:', createError);
                throw new Error(`Failed to create user in database: ${createError?.message || 'Unknown error'}. Please check your Supabase configuration and ensure the 'users' table exists.`);
            }

            return newUser.id;
        } catch (error) {
            console.error('Error in getOrCreateUser:', error);
            if (error instanceof Error) {
                if (error.message.includes('fetch failed') || error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                    throw new Error(`Network error connecting to Supabase: ${error.message}. Please check your internet connection and Supabase URL configuration.`);
                }
            }
            throw error;
        }
    }

    /**
     * Fetch GitHub user information using the access token
     */
    private async fetchGitHubUserInfo(accessToken: string): Promise<{ id: string; login: string }> {
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'User-Agent': 'VSCode-Time-Tracker',
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                console.error('GitHub API error:', response.status, response.statusText, errorText);
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            const userData = await response.json();
            return {
                id: String(userData.id),
                login: userData.login || userData.name || 'Unknown'
            };
        } catch (error) {
            console.error('Error fetching GitHub user info:', error);
            if (error instanceof Error) {
                if (error.message.includes('fetch failed') || error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                    throw new Error(`Network error connecting to GitHub API: ${error.message}. Please check your internet connection.`);
                }
            }
            throw new Error(`Failed to fetch GitHub user information: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    public async startTracking(): Promise<void> {
        if (this.currentSession) {
            vscode.window.showInformationMessage('Time tracking is already active');
            return;
        }

        try {
            const session = await vscode.authentication.getSession('github', ['read:user']);
            if (!session) {
                throw new Error('GitHub authentication required');
            }

            const githubUser = await this.fetchGitHubUserInfo(session.accessToken);
            const userId = await this.getOrCreateUser(githubUser.id, githubUser.login);

            const startTime = new Date();
            let workspaceName: string | undefined = vscode.workspace.name;
            
            if (!workspaceName && vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                const folder = vscode.workspace.workspaceFolders[0];
                workspaceName = folder.name;
                
                if (!workspaceName || workspaceName === '') {
                    const pathParts = folder.uri.fsPath.split(/[/\\]/);
                    workspaceName = pathParts[pathParts.length - 1] || undefined;
                }
            }
            
            if (!workspaceName && vscode.workspace.rootPath) {
                const rootPath = vscode.workspace.rootPath;
                const pathParts = rootPath.split(/[/\\]/);
                workspaceName = pathParts[pathParts.length - 1] || undefined;
            }
            
            if (!workspaceName || workspaceName === '') {
                workspaceName = 'No Workspace';
            }
            const result = await supabase
                .from('time_entries')
                .insert({
                    start_time: startTime.toISOString(),
                    workspace_name: workspaceName,
                    user_id: userId,
                    is_active: true,
                    last_active: startTime.toISOString()
                })
                .select()
                .single();

            if (!result || result.error || !result.data) {
                const errorMessage = result?.error?.message || 'Unknown error';
                const errorCode = result?.error?.code || 'UNKNOWN';
                console.error('Supabase error details:', {
                    error: result?.error,
                    code: errorCode,
                    message: errorMessage,
                    details: result?.error?.details,
                    hint: result?.error?.hint
                });
                
                // Provide more specific error messages
                if (errorCode === 'PGRST301' || errorMessage.includes('permission denied') || errorMessage.includes('RLS')) {
                    throw new Error(`Database permission error: ${errorMessage}. Please check your Supabase Row Level Security (RLS) policies.`);
                } else if (errorMessage.includes('fetch failed') || errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
                    throw new Error(`Network error connecting to Supabase: ${errorMessage}. Please check your internet connection and Supabase URL configuration.`);
                } else if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
                    throw new Error(`Database table not found: ${errorMessage}. Please ensure the 'time_entries' table exists in your Supabase database.`);
                }
                
                throw new Error(`Failed to create time entry: ${errorMessage}`);
            }

            this.currentSession = {
                startTime,
                timer: setInterval(() => this.checkIdleTime(), 60000),
                timeEntryId: result.data.id
            };

            this.startStatusBarTimer();
            vscode.window.showInformationMessage('Time tracking started');
        } catch (error) {
            console.error('Failed to start time tracking - Full error:', error);
            
            if (error instanceof Error) {
                let message = error.message;
                
                // Use the specific error message if it's already descriptive
                if (error.message === 'GitHub authentication required') {
                    message = 'Please sign in with GitHub to start time tracking';
                } else if (error.message.includes('Network error')) {
                    // Keep the detailed network error message
                    message = error.message;
                } else if (error.message.includes('Database') || error.message.includes('Supabase')) {
                    // Keep database-specific error messages
                    message = error.message;
                } else if (error.message.includes('fetch failed') || error.message.includes('Failed to fetch')) {
                    message = 'Network error: Please check your internet connection and Supabase configuration. Check the Developer Console for details.';
                }
                
                vscode.window.showErrorMessage(message);
            } else {
                vscode.window.showErrorMessage('Failed to start time tracking. Please try again.');
            }
            throw error;
        }
    }

    public async stopTracking(reason?: string): Promise<void> {
        if (!this.currentSession) {
            vscode.window.showInformationMessage('No active time tracking session');
            return;
        }

        const endTime = new Date();
        clearInterval(this.currentSession.timer);
        this.stopStatusBarTimer();

        try {
            const { error } = await supabase
                .from('time_entries')
                .update({
                    end_time: endTime.toISOString(),
                    is_active: false,
                    stop_reason: reason
                })
                .eq('id', this.currentSession.timeEntryId);

            if (error) throw error;

            this.currentSession = null;
            this.updateStatusBar();
            const message = reason === 'inactivity'
                ? 'Time tracking stopped due to inactivity'
                : 'Time tracking stopped';
            vscode.window.showInformationMessage(message);
        } catch (error) {
            console.error('Failed to stop time tracking:', error);
            vscode.window.showErrorMessage('Failed to stop time tracking. Some time may not be recorded.');
            throw error;
        }
    }

    public getStatus(): { isTracking: boolean; currentSessionStart?: Date } {
        return {
            isTracking: this.currentSession !== null,
            currentSessionStart: this.currentSession?.startTime
        };
    }
}
