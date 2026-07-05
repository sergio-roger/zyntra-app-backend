import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function bootstrap() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('\n🗑️  Resetting database (dropping all tables)...\n');

  // Drop and recreate schemas to ensure a completely clean slate
  const schemas = ['crm', 'security', 'public'];

  for (const schema of schemas) {
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    console.log(`  🗑  Dropped schema: ${schema}`);
    await client.query(`CREATE SCHEMA "${schema}"`);
    console.log(`  ✨ Recreated schema: ${schema}`);
  }

  await client.end();
  console.log(
    '\n✅ All tables dropped. TypeORM will recreate them on next start.\n',
  );
}

bootstrap().catch((err) => {
  console.error('\n❌ Reset failed:', err);
  process.exit(1);
});
