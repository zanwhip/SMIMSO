-- ========================================
-- MIGRATION: Add AI Caption and User Caption
-- ========================================
-- Run this in Supabase Dashboard → SQL Editor
-- ========================================

-- Add AI caption and user caption fields to post_images table
ALTER TABLE post_images 
  ADD COLUMN IF NOT EXISTS ai_caption TEXT,
  ADD COLUMN IF NOT EXISTS user_caption TEXT;

-- Update existing caption to ai_caption if exists
UPDATE post_images 
SET ai_caption = caption 
WHERE caption IS NOT NULL AND ai_caption IS NULL;

-- Add comments
COMMENT ON COLUMN post_images.ai_caption IS 'AI-generated caption using CLIP model';
COMMENT ON COLUMN post_images.user_caption IS 'User-provided caption';

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'post_images' 
  AND column_name IN ('ai_caption', 'user_caption');

