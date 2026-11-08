import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEMO_ACCOUNTS = [
  { id: 1, name: 'Ananya Rao', role: 'CUSTOMER', email: 'ananya.demo@example.test', pass: 'Customer@1' },
  { id: 2, name: 'Ravi Kumar', role: 'CUSTOMER', email: 'ravi.demo@example.test', pass: 'Customer@2' },
  { id: 3, name: 'Meera Shah', role: 'CUSTOMER', email: 'meera.demo@example.test', pass: 'Customer@3' },
  { id: 4, name: 'Arjun Das', role: 'CUSTOMER', email: 'arjun.demo@example.test', pass: 'Customer@4' },
  { id: 5, name: 'Nisha Patel', role: 'CUSTOMER', email: 'nisha.demo@example.test', pass: 'Customer@5' },
  { id: 6, name: 'Kiran Joseph', role: 'CUSTOMER', email: 'kiran.demo@example.test', pass: 'Customer@6' },
  { id: 7, name: 'Suresh Electrician', role: 'PROVIDER', email: 'suresh.demo@example.test', pass: 'Provider@1' },
  { id: 8, name: 'Lakshmi Plumber', role: 'PROVIDER', email: 'lakshmi.demo@example.test', pass: 'Provider@2' },
  { id: 9, name: 'Farhan Tutor', role: 'PROVIDER', email: 'farhan.demo@example.test', pass: 'Provider@3' },
  { id: 10, name: 'Divya Cleaner', role: 'PROVIDER', email: 'divya.demo@example.test', pass: 'Provider@4' },
  { id: 11, name: 'Manoj Carpenter', role: 'PROVIDER', email: 'manoj.demo@example.test', pass: 'Provider@5' },
  { id: 12, name: 'Pooja Photographer', role: 'PROVIDER', email: 'pooja.demo@example.test', pass: 'Provider@6' },
  { id: 13, name: 'Marketplace Admin', role: 'ADMIN', email: 'admin.demo@example.test', pass: 'Admin@2026' },
];

async function runSeed() {
  const isFresh = process.argv.includes('--fresh') || process.argv.includes('--clean');
  
  const sqlPath = path.resolve(__dirname, '../../database/member4_advanced_sql.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error(`Error: Seed SQL file not found at: ${sqlPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = await pool.connect();

  try {
    if (isFresh) {
      console.log('Cleaning existing table data (--fresh specified)...');
      await client.query(`
        TRUNCATE TABLE 
          admin_logs,
          addresses,
          reviews,
          bookings,
          availability_slots,
          services,
          categories,
          provider_profiles,
          customer_profiles,
          users
        RESTART IDENTITY CASCADE;
      `);
      console.log('✓ Tables cleared and identities reset.');
    }

    console.log('Executing database/member4_advanced_sql.sql...');
    await client.query(sql);
    console.log('✓ Sample data and SQL objects loaded successfully!');

    // Verify row counts
    const tables = [
      'users',
      'customer_profiles',
      'provider_profiles',
      'categories',
      'services',
      'availability_slots',
      'bookings',
      'reviews',
      'addresses',
      'admin_logs'
    ];

    console.log('\n--- Current Database Table Counts ---');
    for (const table of tables) {
      const res = await client.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`  ${table.padEnd(20)} : ${res.rows[0].count} rows`);
    }
    console.log('-------------------------------------\n');

    console.log('========================================================================');
    console.log('DEMO ACCOUNTS & PASSWORDS:');
    console.log('========================================================================');
    console.log('CUSTOMERS:');
    DEMO_ACCOUNTS.filter(a => a.role === 'CUSTOMER').forEach(a => {
      console.log(`  Email: ${a.email.padEnd(28)} | Password: ${a.pass.padEnd(14)} | Name: ${a.name}`);
    });
    console.log('\nPROVIDERS:');
    DEMO_ACCOUNTS.filter(a => a.role === 'PROVIDER').forEach(a => {
      console.log(`  Email: ${a.email.padEnd(28)} | Password: ${a.pass.padEnd(14)} | Name: ${a.name}`);
    });
    console.log('\nADMIN:');
    DEMO_ACCOUNTS.filter(a => a.role === 'ADMIN').forEach(a => {
      console.log(`  Email: ${a.email.padEnd(28)} | Password: ${a.pass.padEnd(14)} | Name: ${a.name}`);
    });
    console.log('========================================================================\n');

  } catch (err) {
    if (err.code === '23505') {
      console.error('\n[Error] Duplicate key violation! Existing records were found with conflicting IDs.');
      console.error('Tip: Run with --fresh to clear existing test records before seeding:');
      console.error('     npm run seed -- --fresh\n');
    } else {
      console.error('Seed execution failed:', err.message);
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runSeed();
