import { query, withTransaction } from '../config/database.js';

export class ProviderService {
  /**
   * Get provider profile by user ID
   */
  static async getProfileByUserId(userId) {
    const res = await query(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.role, u.account_status,
              p.provider_id, p.experience_years, p.professional_bio, p.verification_status,
              p.average_rating, p.total_reviews, p.service_city, p.service_pincode,
              p.created_at, p.updated_at
       FROM users u
       JOIN provider_profiles p ON u.user_id = p.user_id
       WHERE u.user_id = $1`,
      [userId]
    );

    if (res.rowCount === 0) {
      const err = new Error('Provider profile not found');
      err.statusCode = 404;
      throw err;
    }
    return res.rows[0];
  }

  /**
   * Update provider profile details
   */
  static async updateProfile(userId, updateData) {
    const { full_name, phone, experience_years, professional_bio, service_city, service_pincode } = updateData;

    return withTransaction(async (client) => {
      if (full_name || phone) {
        await client.query(
          `UPDATE users 
           SET full_name = COALESCE($1, full_name),
               phone = COALESCE($2, phone)
           WHERE user_id = $3`,
          [full_name || null, phone || null, userId]
        );
      }

      const res = await client.query(
        `UPDATE provider_profiles
         SET experience_years = COALESCE($1, experience_years),
             professional_bio = COALESCE($2, professional_bio),
             service_city = COALESCE($3, service_city),
             service_pincode = COALESCE($4, service_pincode)
         WHERE user_id = $5
         RETURNING *`,
        [experience_years ?? null, professional_bio || null, service_city || null, service_pincode || null, userId]
      );

      if (res.rowCount === 0) {
        const err = new Error('Provider profile not found');
        err.statusCode = 404;
        throw err;
      }
      return res.rows[0];
    });
  }

  /**
   * Public provider profile with active service listings and recent reviews
   */
  static async getPublicProviderProfile(providerId) {
    const providerRes = await query(
      `SELECT u.full_name, p.provider_id, p.experience_years, p.professional_bio,
              p.verification_status, p.average_rating, p.total_reviews, p.service_city, p.service_pincode
       FROM provider_profiles p
       JOIN users u ON p.user_id = u.user_id
       WHERE p.provider_id = $1 AND u.account_status = 'ACTIVE'`,
      [providerId]
    );

    if (providerRes.rowCount === 0) {
      const err = new Error('Provider not found or account is inactive');
      err.statusCode = 404;
      throw err;
    }

    const provider = providerRes.rows[0];

    // Fetch active services
    const servicesRes = await query(
      `SELECT s.service_id, s.service_name, s.description, s.price, s.estimated_duration,
              c.category_id, c.category_name
       FROM services s
       JOIN categories c ON s.category_id = c.category_id
       WHERE s.provider_id = $1 AND s.service_status = 'ACTIVE'`,
      [providerId]
    );

    // Fetch reviews for this provider
    const reviewsRes = await query(
      `SELECT r.review_id, r.rating, r.comment, r.created_at, u.full_name AS customer_name
       FROM reviews r
       JOIN bookings b ON r.booking_id = b.booking_id
       JOIN services s ON b.service_id = s.service_id
       JOIN customer_profiles cp ON r.customer_id = cp.customer_id
       JOIN users u ON cp.user_id = u.user_id
       WHERE s.provider_id = $1
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [providerId]
    );

    return {
      ...provider,
      services: servicesRes.rows,
      reviews: reviewsRes.rows,
    };
  }

  /**
   * Discover and filter verified providers
   */
  static async searchProviders({ city, minRating = 0, page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const conditions = ["u.account_status = 'ACTIVE'", "p.verification_status = 'VERIFIED'"];
    const params = [];
    let paramIndex = 1;

    if (city) {
      conditions.push(`p.service_city ILIKE $${paramIndex++}`);
      params.push(`%${city}%`);
    }

    if (minRating > 0) {
      conditions.push(`p.average_rating >= $${paramIndex++}`);
      params.push(minRating);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*) FROM provider_profiles p JOIN users u ON p.user_id = u.user_id ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await query(
      `SELECT p.provider_id, u.full_name, p.experience_years, p.professional_bio,
              p.average_rating, p.total_reviews, p.service_city, p.service_pincode
       FROM provider_profiles p
       JOIN users u ON p.user_id = u.user_id
       ${whereClause}
       ORDER BY p.average_rating DESC, p.total_reviews DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    return {
      providers: dataRes.rows,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
