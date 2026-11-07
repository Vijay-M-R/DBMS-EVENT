import { query, pool } from './src/config/database.js';

try {
  const result = await query(`
    SELECT
      current_database() AS database,
      current_user AS username,
      NOW() AS server_time
  `);

  console.log('PostgreSQL connection successful!');
  console.log(result.rows[0]);
} catch (error) {
  console.error('PostgreSQL connection failed:', error.message);
} finally {
  await pool.end();
}