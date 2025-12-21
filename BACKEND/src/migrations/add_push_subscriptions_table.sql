-- ========================================
-- PUSH SUBSCRIPTIONS TABLE
-- ========================================
-- Stores user push notification subscriptions
-- ========================================

CREATE TABLE IF NOT EXISTS user_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL, -- PushSubscription object
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_push_subscriptions_user_id ON user_push_subscriptions(user_id);

-- Enable RLS
ALTER TABLE user_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only manage their own subscriptions
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON user_push_subscriptions;
CREATE POLICY "Users can manage their own subscriptions" ON user_push_subscriptions
  FOR ALL USING (user_id::text = auth.uid()::text);

-- Add comment
COMMENT ON TABLE user_push_subscriptions IS 'User push notification subscriptions for web push notifications';
























