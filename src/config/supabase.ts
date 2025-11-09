import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getConfiguration } from './settings';

const isTestEnvironment = process.env.NODE_ENV === 'test';

let supabaseClient: SupabaseClient | null = null;

// Get fetch implementation - use undici fetch if available (Node 18+), otherwise use global fetch
function getFetch(): typeof fetch | undefined {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { fetch: undiciFetch } = require('undici');
        if (undiciFetch) {
            return undiciFetch as typeof fetch;
        }
    } catch {
        // undici not available, continue
    }
    
    if (typeof globalThis.fetch === 'function') {
        return globalThis.fetch;
    }
    
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const nodeFetch = require('node-fetch');
        return nodeFetch as typeof fetch;
    } catch {
        return undefined;
    }
}

function initializeSupabaseClient(): SupabaseClient {
    if (isTestEnvironment) {
        return createClient('http://localhost:54321', 'test-key');
    }

    try {
        const config = getConfiguration();
        const clientOptions = {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        };
        
        return createClient(config.supabaseUrl, config.supabaseKey, clientOptions);
    } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
        throw new Error(
            'Supabase configuration is required. Please set timeTracker.supabaseUrl and timeTracker.supabaseKey in VS Code settings. ' +
            'See README.md for setup instructions.'
        );
    }
}

export function getSupabaseClient(): SupabaseClient {
    if (!supabaseClient) {
        supabaseClient = initializeSupabaseClient();
    }
    return supabaseClient;
}

export function resetSupabaseClient(): void {
    supabaseClient = null;
}

/**
 * Test the Supabase connection by making a simple query
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; error?: string }> {
    try {
        const client = getSupabaseClient();
        // Try a simple query that doesn't require authentication
        const { error } = await client.from('users').select('count').limit(0);
        
        if (error) {
            // If it's a table not found error, that's okay - it means we can connect
            if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
                return { success: true };
            }
            return { success: false, error: error.message };
        }
        
        return { success: true };
    } catch (error) {
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        };
    }
}

// Export for backward compatibility
export const supabase = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        return getSupabaseClient()[prop as keyof SupabaseClient];
    }
});
