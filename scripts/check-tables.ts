import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  // Check tables
  const tables = await c.query(`
    SELECT table_schema, table_name FROM information_schema.tables 
    WHERE table_schema IN ('crm', 'security', 'public')
    ORDER BY table_schema, table_name
  `);
  console.log('=== Tables ===');
  tables.rows.forEach(r => console.log(r.table_schema + '.' + r.table_name));

  // Check contacts columns
  const contactCols = await c.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'crm' AND table_name = 'contacts'
  `);
  console.log('\n=== crm.contacts columns ===');
  contactCols.rows.forEach(r => console.log('  ' + r.column_name));

  // Check if user_preferences exists
  const prefTables = await c.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'security' AND table_name = 'user_preferences'
  `);
  console.log('\n=== user_preferences exists:', prefTables.rows.length > 0 ? 'YES' : 'NO');

  await c.end();
}

run().catch(e => { console.error(e); process.exit(1); });
