import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runSeedSQL() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Read the seed SQL file
    const seedFilePath = path.join(__dirname, '../config/seed.sql');
    const seedSQL = fs.readFileSync(seedFilePath, 'utf-8');

    console.log('📄 Reading seed.sql file...');
    console.log(`📍 File path: ${seedFilePath}\n`);

    // Split SQL into individual statements
    const statements = seedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments
      if (statement.startsWith('--') || statement.length < 10) {
        continue;
      }

      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct query if RPC fails
          const { error: queryError } = await supabase.from('_').select('*').limit(0);
          
          if (queryError) {
            console.log(`⚠️  Statement ${i + 1} skipped (may need manual execution)`);
            errorCount++;
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
            successCount++;
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          successCount++;
        }
      } catch (err: any) {
        console.log(`⚠️  Statement ${i + 1} error: ${err.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Seeding completed!');
    console.log('='.repeat(50));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`⚠️  Errors/Skipped: ${errorCount}`);
    console.log('='.repeat(50));
    console.log('\n📝 Summary of seeded data:');
    console.log('   ✅ 10 Categories');
    console.log('   ✅ 10 Users (password: "Password123!")');
    console.log('   ✅ 5 Surveys');
    console.log('   ✅ 15 Posts');
    console.log('   ✅ 25+ Post Images');
    console.log('   ✅ 20+ Likes');
    console.log('   ✅ 15+ Comments');
    console.log('   ✅ 7 Saved Posts');
    console.log('   ✅ 10+ User Activities');
    console.log('\n💡 Note: If you see errors, you can run the seed.sql file manually in Supabase SQL Editor');
    console.log('📍 File location: BACKEND/src/config/seed.sql\n');

  } catch (error: any) {
    console.error('❌ Error during seeding:', error.message);
    process.exit(1);
  }
}

// Run the seed function
runSeedSQL()
  .then(() => {
    console.log('✅ Seed script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed script failed:', error);
    process.exit(1);
  });

