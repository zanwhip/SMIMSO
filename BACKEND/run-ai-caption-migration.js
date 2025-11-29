require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function runMigration() {
  try {
    console.log('🚀 Running migration: Adding ai_caption and user_caption to post_images table');

    const migrationSQL = `
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
    `;

    // Try to execute via RPC if available
    const { error: rpcError } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (rpcError) {
      console.log('⚠️ RPC method not available, please run SQL manually');
      console.log('\n📝 Please run this SQL in Supabase SQL Editor:');
      console.log('='.repeat(60));
      console.log(migrationSQL);
      console.log('='.repeat(60));
      return;
    }

    console.log('✅ Migration completed successfully!');
    console.log('✅ ai_caption and user_caption columns added to post_images table');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:');
    console.log('='.repeat(60));
    const migrationSQL = `
ALTER TABLE post_images 
  ADD COLUMN IF NOT EXISTS ai_caption TEXT,
  ADD COLUMN IF NOT EXISTS user_caption TEXT;

UPDATE post_images 
SET ai_caption = caption 
WHERE caption IS NOT NULL AND ai_caption IS NULL;
    `;
    console.log(migrationSQL);
    console.log('='.repeat(60));
  }
}

runMigration();

