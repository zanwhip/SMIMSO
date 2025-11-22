const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runMigration() {
  try {
    console.log('🚀 Running migration: Adding caption column to posts table');

    // Add caption column
    const { error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE posts ADD COLUMN IF NOT EXISTS caption TEXT;'
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:');
      console.log('ALTER TABLE posts ADD COLUMN IF NOT EXISTS caption TEXT;');
      process.exit(1);
    }

    console.log('✅ Migration completed successfully!');
    console.log('✅ Caption column added to posts table');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:');
    console.log('ALTER TABLE posts ADD COLUMN IF NOT EXISTS caption TEXT;');
    process.exit(1);
  }
}

runMigration();

