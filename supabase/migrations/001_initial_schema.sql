-- Initial schema for Code Time Tracker
-- This migration creates the users and time_entries tables

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    github_id TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create time_entries table
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    workspace_name TEXT,
    is_active BOOLEAN DEFAULT true,
    last_active TIMESTAMP WITH TIME ZONE,
    stop_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster active session queries
CREATE INDEX IF NOT EXISTS idx_time_entries_is_active 
ON time_entries(is_active) 
WHERE is_active = true;

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id 
ON time_entries(user_id);

-- Create index for faster user lookups by github_id
CREATE INDEX IF NOT EXISTS idx_users_github_id 
ON users(github_id);

-- Enable Row Level Security (RLS) on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations for authenticated users
-- Note: Adjust these policies based on your security requirements

-- Policy for users table: Allow all operations for authenticated requests
CREATE POLICY "Allow all operations on users" ON users
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Policy for time_entries table: Allow all operations for authenticated requests
CREATE POLICY "Allow all operations on time_entries" ON time_entries
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Optional: Create a function to automatically update last_active
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_active = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_active on time_entries updates
CREATE TRIGGER update_time_entry_last_active
    BEFORE UPDATE ON time_entries
    FOR EACH ROW
    WHEN (OLD.is_active = true AND NEW.is_active = true)
    EXECUTE FUNCTION update_last_active();

