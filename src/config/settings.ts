import * as vscode from 'vscode';

export interface TimeTrackerConfig {
    supabaseUrl: string;
    supabaseKey: string;
    idleTimeout: number;
}

export function validateConfiguration(): { isValid: boolean; missing: string[] } {
    const config = vscode.workspace.getConfiguration('timeTracker');
    const missing: string[] = [];

    if (!config.get('supabaseUrl')) {
        missing.push('supabaseUrl');
    }
    if (!config.get('supabaseKey')) {
        missing.push('supabaseKey');
    }

    return { 
        isValid: missing.length === 0,
        missing 
    };
}

/**
 * Get the time tracker configuration from VS Code settings.
 * 
 * Note: The default values here should match the defaults in package.json
 * under "contributes.configuration.properties.timeTracker.*"
 * 
 * @returns TimeTrackerConfig with values from VS Code settings or defaults
 * @throws Error if required configuration is missing
 */
export function getConfiguration(): TimeTrackerConfig {
    const config = vscode.workspace.getConfiguration('timeTracker');
    const { isValid, missing } = validateConfiguration();
    
    if (!isValid) {
        throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
    
    // Get configuration values - no defaults for security (users must configure their own credentials)
    const supabaseUrl = config.get<string>('supabaseUrl');
    const supabaseKey = config.get<string>('supabaseKey');
    const idleTimeoutMinutes = config.get<number>('idleTimeoutMinutes', 5);
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing required configuration: supabaseUrl and supabaseKey must be set in VS Code settings');
    }
    
    return {
        supabaseUrl,
        supabaseKey,
        idleTimeout: idleTimeoutMinutes * 60 * 1000 // Convert to milliseconds
    };
}
