-- ========================================
-- ADDITIONAL CHAT FEATURES MIGRATION
-- ========================================
-- Adds reactions, online status, and other features
-- ========================================

-- 1. Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji VARCHAR(50) NOT NULL, -- emoji or reaction type
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- 2. Create user_online_status table
CREATE TABLE IF NOT EXISTS user_online_status (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create group_conversation_settings table
CREATE TABLE IF NOT EXISTS group_conversation_settings (
  conversation_id UUID PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  allow_member_add BOOLEAN DEFAULT TRUE,
  allow_member_remove BOOLEAN DEFAULT TRUE,
  allow_member_promote BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create conversation_roles table (for group admin/moderator)
CREATE TABLE IF NOT EXISTS conversation_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'moderator', 'member')),
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- 5. Add indexes
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_online_status_is_online ON user_online_status(is_online);
CREATE INDEX IF NOT EXISTS idx_conversation_roles_conversation_id ON conversation_roles(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_roles_user_id ON conversation_roles(user_id);

-- 6. Enable RLS
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_online_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_conversation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_roles ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
-- Message reactions: Users can see reactions on messages they can see
DROP POLICY IF EXISTS "Users can view reactions on their messages" ON message_reactions;
CREATE POLICY "Users can view reactions on their messages" ON message_reactions
  FOR SELECT USING (
    message_id IN (
      SELECT m.id FROM messages m
      JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE cp.user_id::text = auth.uid()::text
    )
  );

-- Users can add/remove their own reactions
DROP POLICY IF EXISTS "Users can manage their own reactions" ON message_reactions;
CREATE POLICY "Users can manage their own reactions" ON message_reactions
  FOR ALL USING (user_id::text = auth.uid()::text);

-- Online status: Users can see online status of others
DROP POLICY IF EXISTS "Users can view online status" ON user_online_status;
CREATE POLICY "Users can view online status" ON user_online_status
  FOR SELECT USING (true);

-- Users can only update their own status
DROP POLICY IF EXISTS "Users can update their own status" ON user_online_status;
CREATE POLICY "Users can update their own status" ON user_online_status
  FOR ALL USING (user_id::text = auth.uid()::text);

-- Group settings: Only admins can modify
DROP POLICY IF EXISTS "Admins can manage group settings" ON group_conversation_settings;
CREATE POLICY "Admins can manage group settings" ON group_conversation_settings
  FOR ALL USING (
    conversation_id IN (
      SELECT cr.conversation_id FROM conversation_roles cr
      WHERE cr.user_id::text = auth.uid()::text AND cr.role = 'admin'
    )
  );

-- Conversation roles: Users can see roles in their conversations
DROP POLICY IF EXISTS "Users can view roles in their conversations" ON conversation_roles;
CREATE POLICY "Users can view roles in their conversations" ON conversation_roles
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id::text = auth.uid()::text
    )
  );

-- Admins can assign roles
DROP POLICY IF EXISTS "Admins can assign roles" ON conversation_roles;
CREATE POLICY "Admins can assign roles" ON conversation_roles
  FOR ALL USING (
    conversation_id IN (
      SELECT cr.conversation_id FROM conversation_roles cr
      WHERE cr.user_id::text = auth.uid()::text AND cr.role = 'admin'
    )
  );

-- 8. Add comments
COMMENT ON TABLE message_reactions IS 'Emoji reactions on messages';
COMMENT ON TABLE user_online_status IS 'User online/offline status';
COMMENT ON TABLE group_conversation_settings IS 'Settings for group conversations';
COMMENT ON TABLE conversation_roles IS 'User roles in group conversations (admin, moderator, member)';















