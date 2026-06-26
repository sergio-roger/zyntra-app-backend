/**
 * Migration: add business_id to security.permissions
 *
 * Changes:
 *  1. Add column business_id UUID NULL (templates keep NULL; per-business rows use the UUID)
 *  2. Drop old unique index on (role_id, menu_id)
 *  3. Create new unique index on (business_id, role_id, menu_id)
 *     PostgreSQL treats NULLs as distinct, so global templates (NULL) are deduplicated at app level.
 *  4. Create a separate partial unique index on (role_id, menu_id) WHERE business_id IS NULL
 *     to enforce uniqueness of global templates at DB level.
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('\n🔌 Connected to database');

  try {
    await client.query('BEGIN');

    // ── 1. Add business_id column if it doesn't exist ──────────────────────
    const colCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'security'
        AND table_name   = 'permissions'
        AND column_name  = 'business_id'
    `);

    if (colCheck.rowCount === 0) {
      await client.query(`
        ALTER TABLE security.permissions
          ADD COLUMN business_id UUID NULL DEFAULT NULL
      `);
      console.log('  ✅ Column business_id added');
    } else {
      console.log('  ⏭️  Column business_id already exists, skipping');
    }

    // ── 2. Drop old unique index on (role_id, menu_id) ────────────────────
    const oldIdxRow = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'security'
        AND tablename  = 'permissions'
        AND indexdef LIKE '%role_id%menu_id%'
        AND indexdef NOT LIKE '%business_id%'
        AND indexdef LIKE '%UNIQUE%'
    `);

    for (const row of oldIdxRow.rows) {
      await client.query(`DROP INDEX IF EXISTS security."${row.indexname}"`);
      console.log(`  ✅ Dropped old index: ${row.indexname}`);
    }

    // ── 3. Create new composite unique index (business_id, role_id, menu_id) ─
    const newIdxCheck = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'security'
        AND tablename  = 'permissions'
        AND indexdef LIKE '%business_id%role_id%menu_id%'
        AND indexdef LIKE '%UNIQUE%'
    `);

    if (newIdxCheck.rowCount === 0) {
      await client.query(`
        CREATE UNIQUE INDEX IDX_permissions_business_role_menu
          ON security.permissions (business_id, role_id, menu_id)
      `);
      console.log('  ✅ Created index IDX_permissions_business_role_menu');
    } else {
      console.log('  ⏭️  Composite unique index already exists, skipping');
    }

    // ── 4. Partial unique index for global templates (business_id IS NULL) ──
    const partialIdxCheck = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'security'
        AND tablename  = 'permissions'
        AND indexdef LIKE '%WHERE (business_id IS NULL)%'
    `);

    if (partialIdxCheck.rowCount === 0) {
      await client.query(`
        CREATE UNIQUE INDEX IDX_permissions_global_role_menu
          ON security.permissions (role_id, menu_id)
          WHERE business_id IS NULL
      `);
      console.log(
        '  ✅ Created partial index IDX_permissions_global_role_menu',
      );
    } else {
      console.log('  ⏭️  Partial unique index already exists, skipping');
    }

    await client.query('COMMIT');
    console.log('\n✨ Migration completed successfully!\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed, rolled back:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('\n❌ Unexpected error:', err);
  process.exit(1);
});
