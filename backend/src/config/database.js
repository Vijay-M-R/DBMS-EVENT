import pg from 'pg';
import { env } from './environment.js';

const { Pool } = pg;

export const pool = new Pool({
  host: env.DB.HOST,
  port: env.DB.PORT,
  database: env.DB.NAME,
  user: env.DB.USER,
  password: env.DB.PASSWORD,
  max: env.DB.POOL_MAX,
  idleTimeoutMillis: env.DB.IDLE_TIMEOUT,
  connectionTimeoutMillis: env.DB.CONNECTION_TIMEOUT,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]: Unexpected error on idle client', err);
});

/**
 * Execute a single parameterized query against the connection pool.
 * @param {string} text - SQL query text with parameter markers ($1, $2, etc.)
 * @param {Array<any>} [params] - Parameter values
 * @returns {Promise<pg.QueryResult>}
 */
export const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (env.NODE_ENV === 'development') {
      // Clean query logging
      console.log(`[DB Query] ${duration}ms | rows=${res.rowCount}`);
    }
    return res;
  } catch (error) {
    console.error(`[DB Query Error] Query: ${text} | Params:`, params, error.message);
    throw error;
  }
};

/**
 * Acquire a dedicated client from the pool for transactional executions.
 * @returns {Promise<pg.PoolClient>}
 */
export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

/**
 * Execute an atomic transaction with automatic BEGIN, COMMIT, and ROLLBACK.
 * @template T
 * @param {(client: pg.PoolClient) => Promise<T>} callback
 * @returns {Promise<T>}
 */
export const withTransaction = async (callback) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
