import { withTransaction, query } from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';

/**
 * Authentication Service
 */
export class AuthService {
  /**
   * Register a new user and initialize corresponding profile atomically.
   */
  static async register({ full_name, email, password, phone, role, service_city, service_pincode }) {
    // 1. Check if user already exists
    const existing = await query(
      'SELECT user_id, email, phone FROM users WHERE email = $1 OR phone = $2',
      [email.toLowerCase().trim(), phone.trim()]
    );

    if (existing.rowCount > 0) {
      const match = existing.rows[0];
      if (match.email === email.toLowerCase().trim()) {
        const err = new Error('A user with this email address already exists');
        err.statusCode = 409;
        throw err;
      }
      const err = new Error('A user with this phone number already exists');
      err.statusCode = 409;
      throw err;
    }

    // 2. Hash password
    const passwordHash = await hashPassword(password);

    // 3. Atomically create user and profile
    return withTransaction(async (client) => {
      const userRes = await client.query(
        `INSERT INTO users (full_name, email, password_hash, phone, role, account_status)
         VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
         RETURNING user_id, full_name, email, phone, role, account_status, created_at`,
        [full_name.trim(), email.toLowerCase().trim(), passwordHash, phone.trim(), role]
      );
      const user = userRes.rows[0];

      let profile = null;
      if (role === 'CUSTOMER') {
        const custRes = await client.query(
          `INSERT INTO customer_profiles (user_id)
           VALUES ($1)
           RETURNING customer_id, user_id, created_at`,
          [user.user_id]
        );
        profile = custRes.rows[0];
      } else if (role === 'PROVIDER') {
        const provRes = await client.query(
          `INSERT INTO provider_profiles (user_id, service_city, service_pincode)
           VALUES ($1, $2, $3)
           RETURNING provider_id, user_id, verification_status, service_city, service_pincode, created_at`,
          [user.user_id, service_city || 'Not Specified', service_pincode || '000000']
        );
        profile = provRes.rows[0];
      }

      const token = generateToken({
        userId: user.user_id,
        role: user.role,
        email: user.email,
      });

      return {
        user,
        profile,
        token,
      };
    });
  }

  /**
   * Authenticate user credentials and return JWT token.
   */
  static async login({ email, password }) {
    const userRes = await query(
      `SELECT user_id, full_name, email, password_hash, phone, role, account_status
       FROM users
       WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (userRes.rowCount === 0) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    const user = userRes.rows[0];

    if (user.account_status !== 'ACTIVE') {
      const err = new Error(`Account is ${user.account_status.toLowerCase()}. Contact platform support.`);
      err.statusCode = 403;
      throw err;
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    // Fetch related profile ID
    let profile = null;
    if (user.role === 'CUSTOMER') {
      const res = await query('SELECT customer_id FROM customer_profiles WHERE user_id = $1', [user.user_id]);
      profile = res.rows[0] || null;
    } else if (user.role === 'PROVIDER') {
      const res = await query('SELECT provider_id, verification_status FROM provider_profiles WHERE user_id = $1', [user.user_id]);
      profile = res.rows[0] || null;
    }

    const token = generateToken({
      userId: user.user_id,
      role: user.role,
      email: user.email,
    });

    delete user.password_hash;

    return {
      user,
      profile,
      token,
    };
  }
}
