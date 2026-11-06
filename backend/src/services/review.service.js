import { withTransaction, query } from '../config/database.js';

export class ReviewService {
  /**
   * Customer: Submit a review for a completed service booking
   */
  static async createReview(customerId, { booking_id, rating, comment }) {
    return withTransaction(async (client) => {
      // 1. Verify booking existence, ownership, and COMPLETED status
      const bookingRes = await client.query(
        `SELECT b.booking_id, b.customer_id, b.booking_status, s.provider_id
         FROM bookings b
         JOIN services s ON b.service_id = s.service_id
         WHERE b.booking_id = $1`,
        [booking_id]
      );

      if (bookingRes.rowCount === 0) {
        const err = new Error('Booking not found');
        err.statusCode = 404;
        throw err;
      }

      const booking = bookingRes.rows[0];

      if (booking.customer_id !== customerId) {
        const err = new Error('Access denied: You can only review your own bookings');
        err.statusCode = 403;
        throw err;
      }

      if (booking.booking_status !== 'COMPLETED') {
        const err = new Error(`Reviews can only be submitted for COMPLETED bookings (current status: ${booking.booking_status})`);
        err.statusCode = 400;
        throw err;
      }

      // 2. Check if review already exists for this booking
      const existingRes = await client.query(
        'SELECT review_id FROM reviews WHERE booking_id = $1',
        [booking_id]
      );

      if (existingRes.rowCount > 0) {
        const err = new Error('A review has already been submitted for this booking');
        err.statusCode = 409;
        throw err;
      }

      // 3. Insert review
      const reviewRes = await client.query(
        `INSERT INTO reviews (booking_id, customer_id, rating, comment)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [booking_id, customerId, rating, comment ? comment.trim() : null]
      );

      // 4. Update provider rating statistics
      const statsRes = await client.query(
        `SELECT ROUND(AVG(r.rating), 2) AS avg_rating, COUNT(r.review_id) AS total_count
         FROM reviews r
         JOIN bookings b ON r.booking_id = b.booking_id
         JOIN services s ON b.service_id = s.service_id
         WHERE s.provider_id = $1`,
        [booking.provider_id]
      );

      const avgRating = statsRes.rows[0]?.avg_rating || rating;
      const totalCount = statsRes.rows[0]?.total_count || 1;

      await client.query(
        `UPDATE provider_profiles
         SET average_rating = $1, total_reviews = $2
         WHERE provider_id = $3`,
        [avgRating, totalCount, booking.provider_id]
      );

      return reviewRes.rows[0];
    });
  }

  /**
   * Public / General: Get reviews for a specific provider with pagination
   */
  static async getProviderReviews(providerId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const countRes = await query(
      `SELECT COUNT(r.review_id)
       FROM reviews r
       JOIN bookings b ON r.booking_id = b.booking_id
       JOIN services s ON b.service_id = s.service_id
       WHERE s.provider_id = $1`,
      [providerId]
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await query(
      `SELECT r.review_id, r.booking_id, r.rating, r.comment, r.created_at,
              u.full_name AS customer_name, s.service_name
       FROM reviews r
       JOIN bookings b ON r.booking_id = b.booking_id
       JOIN services s ON b.service_id = s.service_id
       JOIN customer_profiles cp ON r.customer_id = cp.customer_id
       JOIN users u ON cp.user_id = u.user_id
       WHERE s.provider_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [providerId, limit, offset]
    );

    // Fetch aggregate rating stats from provider profile
    const provRes = await query(
      `SELECT average_rating, total_reviews FROM provider_profiles WHERE provider_id = $1`,
      [providerId]
    );
    const profile = provRes.rows[0] || { average_rating: '0.00', total_reviews: 0 };

    return {
      reviews: dataRes.rows,
      average_rating: profile.average_rating,
      total_reviews: profile.total_reviews,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Provider: Get reviews for the currently authenticated provider
   */
  static async getMyProviderReviews(userId, page = 1, limit = 10) {
    const provRes = await query(
      `SELECT provider_id FROM provider_profiles WHERE user_id = $1`,
      [userId]
    );

    if (provRes.rowCount === 0) {
      const err = new Error('Provider profile not found');
      err.statusCode = 404;
      throw err;
    }

    const providerId = provRes.rows[0].provider_id;
    return this.getProviderReviews(providerId, page, limit);
  }
}
