-- Add preferences column to users table for dashboard customization
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN users.preferences IS 'User preferences including dashboard layout, widget visibility, and other customizations';

-- Create index for faster queries on preferences
CREATE INDEX IF NOT EXISTS idx_users_preferences ON users USING gin (preferences);
