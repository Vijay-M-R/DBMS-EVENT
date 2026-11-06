import { query, withTransaction } from '../config/database.js';

export class CustomerService {
  /**
   * Get customer profile by user ID
   */
  static async getProfileByUserId(userId) {
    const res = await query(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.role, u.account_status,
              c.customer_id, c.date_of_birth, c.gender, c.profile_image, c.created_at, c.updated_at
       FROM users u
       JOIN customer_profiles c ON u.user_id = c.user_id
       WHERE u.user_id = $1`,
      [userId]
    );

    if (res.rowCount === 0) {
      const err = new Error('Customer profile not found');
      err.statusCode = 404;
      throw err;
    }
    return res.rows[0];
  }

  /**
   * Update customer profile
   */
  static async updateProfile(userId, { full_name, phone, date_of_birth, gender, profile_image }) {
    return withTransaction(async (client) => {
      // 1. Update basic user info if provided
      if (full_name || phone) {
        await client.query(
          `UPDATE users 
           SET full_name = COALESCE($1, full_name),
               phone = COALESCE($2, phone)
           WHERE user_id = $3`,
          [full_name || null, phone || null, userId]
        );
      }

      // 2. Update customer profile info
      const res = await client.query(
        `UPDATE customer_profiles
         SET date_of_birth = COALESCE($1, date_of_birth),
             gender = COALESCE($2, gender),
             profile_image = COALESCE($3, profile_image)
         WHERE user_id = $4
         RETURNING *`,
        [date_of_birth || null, gender || null, profile_image || null, userId]
      );

      if (res.rowCount === 0) {
        const err = new Error('Customer profile not found');
        err.statusCode = 404;
        throw err;
      }
      return res.rows[0];
    });
  }

  /**
   * List all addresses for a customer
   */
  static async getAddresses(customerId) {
    const res = await query(
      `SELECT * FROM addresses 
       WHERE customer_id = $1 
       ORDER BY is_default DESC, created_at DESC`,
      [customerId]
    );
    return res.rows;
  }

  /**
   * Add a new address with atomic single-default enforcement
   */
  static async addAddress(customerId, addressData) {
    const { address_line, city, state, pincode, landmark, address_type, is_default } = addressData;

    return withTransaction(async (client) => {
      // If setting as default, clear any existing default address for this customer
      if (is_default) {
        await client.query(
          `UPDATE addresses SET is_default = FALSE WHERE customer_id = $1`,
          [customerId]
        );
      }

      // Check if this is the customer's first address, make default if true
      const countRes = await client.query(
        `SELECT COUNT(*) FROM addresses WHERE customer_id = $1`,
        [customerId]
      );
      const shouldBeDefault = is_default || parseInt(countRes.rows[0].count, 10) === 0;

      const res = await client.query(
        `INSERT INTO addresses (customer_id, address_line, city, state, pincode, landmark, address_type, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'HOME'), $8)
         RETURNING *`,
        [customerId, address_line.trim(), city.trim(), state.trim(), pincode.trim(), landmark || null, address_type, shouldBeDefault]
      );
      return res.rows[0];
    });
  }

  /**
   * Set an address as the default
   */
  static async setDefaultAddress(customerId, addressId) {
    return withTransaction(async (client) => {
      const verify = await client.query(
        `SELECT address_id FROM addresses WHERE address_id = $1 AND customer_id = $2`,
        [addressId, customerId]
      );

      if (verify.rowCount === 0) {
        const err = new Error('Address not found or unauthorized');
        err.statusCode = 404;
        throw err;
      }

      await client.query(
        `UPDATE addresses SET is_default = FALSE WHERE customer_id = $1`,
        [customerId]
      );

      const res = await client.query(
        `UPDATE addresses SET is_default = TRUE WHERE address_id = $1 AND customer_id = $2 RETURNING *`,
        [addressId, customerId]
      );
      return res.rows[0];
    });
  }

  /**
   * Delete an address
   */
  static async deleteAddress(customerId, addressId) {
    const res = await query(
      `DELETE FROM addresses WHERE address_id = $1 AND customer_id = $2 RETURNING *`,
      [addressId, customerId]
    );

    if (res.rowCount === 0) {
      const err = new Error('Address not found or unauthorized');
      err.statusCode = 404;
      throw err;
    }
    return res.rows[0];
  }
}
