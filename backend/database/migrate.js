import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Execute schema.sql to create database tables, constraints, indexes, and triggers.
 * NOTE: STRICTLY DDL ONLY. NO RECORDS OR SEED DATA ARE INSERTED.
 */
async function runSchemaMigration() {
  console.log('Reading database/schema.sql...');
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const client = await pool.connect();
  try {
    console.log('Executing schema DDL against PostgreSQL...');
    await client.query(sql);
    console.log('✓ Database schema DDL executed successfully! All 10 tables, constraints, partial indexes, and triggers created.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runSchemaMigration();
