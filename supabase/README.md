# Supabase Database Setup

This directory contains database migrations for the Code Time Tracker extension.

## Migration Files

- `001_initial_schema.sql` - Initial database schema including:
  - `users` table for GitHub user information
  - `time_entries` table for time tracking entries
  - Indexes for performance optimization
  - Row Level Security (RLS) policies
  - Automatic `last_active` update trigger

## Setup Instructions

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `migrations/001_initial_schema.sql`
5. Click **Run** to execute the migration
6. Verify the tables were created by checking the **Table Editor**

### Option 2: Using Supabase CLI

1. Install Supabase CLI if not already installed:
   ```bash
   npm install -g supabase
   ```

2. Link to your Supabase project:
   ```bash
   supabase link --project-ref <your-project-ref>
   ```
   You can find your project ref in the Supabase dashboard URL: `https://supabase.com/dashboard/project/<project-ref>`

3. Run the migration:
   ```bash
   supabase db push
   ```

### Option 3: Using Supabase MCP

If you have the Supabase MCP server configured with proper authentication:

1. Ensure your MCP configuration includes your Supabase access token
2. Use the MCP tools to execute the SQL migration

## Verification

After running the migration, verify the setup:

1. Check that the `users` table exists with columns:
   - `id` (UUID, primary key)
   - `github_id` (TEXT, unique)
   - `username` (TEXT)
   - `created_at` (TIMESTAMP)

2. Check that the `time_entries` table exists with columns:
   - `id` (UUID, primary key)
   - `user_id` (UUID, foreign key to users)
   - `start_time` (TIMESTAMP)
   - `end_time` (TIMESTAMP)
   - `workspace_name` (TEXT)
   - `is_active` (BOOLEAN)
   - `last_active` (TIMESTAMP)
   - `stop_reason` (TEXT)
   - `created_at` (TIMESTAMP)

3. Verify indexes were created:
   - `idx_time_entries_is_active`
   - `idx_time_entries_user_id`
   - `idx_users_github_id`

4. Check that RLS is enabled on both tables

## Security Notes

The current RLS policies allow all operations for all requests. For production use, you should:

1. Restrict policies to authenticated users only
2. Add user-specific policies to ensure users can only access their own data
3. Consider using Supabase Auth for proper authentication

Example of more secure policies:

```sql
-- Only allow users to see their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT
    USING (auth.uid()::text = id::text);

-- Only allow users to insert their own time entries
CREATE POLICY "Users can insert own time entries" ON time_entries
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);
```

