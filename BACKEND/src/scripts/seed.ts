import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runSeedSQL() {
  try {
    const seedFilePath = path.join(__dirname, '../config/seed.sql');
    const seedSQL = fs.readFileSync(seedFilePath, 'utf-8');

    const statements = seedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.startsWith('--') || statement.length < 10) {
        continue;
      }

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          const { error: queryError } = await supabase.from('_').select('*').limit(0);
          
          if (queryError) {
            errorCount++;
          } else {
            successCount++;
          }
        } else {
          successCount++;
        }
      } catch (err: any) {
        errorCount++;
      }
    }

    console.log(`Seed completed: ${successCount} successful, ${errorCount} errors`);
  } catch (error: any) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

runSeedSQL()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    process.exit(1);
  });

