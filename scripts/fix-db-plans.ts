const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL');

    // 1. Cambiar la columna a texto para evitar restricciones de ENUM momentáneamente
    console.log('🔄 Cambiando columna plan a texto...');
    await client.query('ALTER TABLE businesses ALTER COLUMN plan TYPE text');

    // 2. Actualizar los valores antiguos a los nuevos nombres de Zyntra
    console.log('📝 Actualizando registros antiguos...');
    await client.query(
      "UPDATE businesses SET plan = 'brandstart' WHERE plan = 'starter'",
    );
    await client.query(
      "UPDATE businesses SET plan = 'impulse_pro' WHERE plan = 'pro'",
    );
    await client.query(
      "UPDATE businesses SET plan = 'core_digital' WHERE plan = 'enterprise'",
    );

    // 3. Eliminar el tipo enum antiguo para que TypeORM lo recree limpio
    console.log('🗑️ Eliminando enum antiguo...');
    await client.query('DROP TYPE IF EXISTS businesses_plan_enum CASCADE');

    console.log(
      '✨ Base de datos reparada con éxito. Ahora puedes iniciar el backend.',
    );
  } catch (err) {
    console.error('❌ Error reparando la base de datos:', err);
  } finally {
    await client.end();
  }
}

fixDatabase();
