import { query } from '../config/database.js';

export class ServiceService {
  /**
   * Provider: Create a new service offering
   */
  static async createService(providerId, serviceData) {
    const { category_id, service_name, description, price, estimated_duration } = serviceData;

    // Check provider verification status
    const provRes = await query(
      'SELECT verification_status FROM provider_profiles WHERE provider_id = $1',
      [providerId]
    );

    if (provRes.rowCount === 0) {
      const err = new Error('Provider profile not found');
      err.statusCode = 404;
      throw err;
    }

    if (provRes.rows[0].verification_status !== 'VERIFIED') {
      const err = new Error('Provider must be VERIFIED by an admin before publishing services');
      err.statusCode = 403;
      throw err;
    }

    // Verify category is active
    const catRes = await query(
      "SELECT category_id FROM categories WHERE category_id = $1 AND category_status = 'ACTIVE'",
      [category_id]
    );

    if (catRes.rowCount === 0) {
      const err = new Error('Selected category does not exist or is inactive');
      err.statusCode = 400;
      throw err;
    }

    const res = await query(
      `INSERT INTO services (provider_id, category_id, service_name, description, price, estimated_duration, service_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
       RETURNING *`,
      [providerId, category_id, service_name.trim(), description.trim(), price, estimated_duration]
    );

    return res.rows[0];
  }

  /**
   * Provider: Update their service
   */
  static async updateService(providerId, serviceId, updateData) {
    const { category_id, service_name, description, price, estimated_duration, service_status } = updateData;

    const res = await query(
      `UPDATE services
       SET category_id = COALESCE($1, category_id),
           service_name = COALESCE($2, service_name),
           description = COALESCE($3, description),
           price = COALESCE($4, price),
           estimated_duration = COALESCE($5, estimated_duration),
           service_status = COALESCE($6, service_status)
       WHERE service_id = $7 AND provider_id = $8
       RETURNING *`,
      [
        category_id || null,
        service_name ? service_name.trim() : null,
        description ? description.trim() : null,
        price ?? null,
        estimated_duration ?? null,
        service_status || null,
        serviceId,
        providerId,
      ]
    );

    if (res.rowCount === 0) {
      const err = new Error('Service not found or unauthorized');
      err.statusCode = 404;
      throw err;
    }
    return res.rows[0];
  }

  /**
   * Provider: Delete their service
   */
  static async deleteService(providerId, serviceId) {
    const res = await query(
      'DELETE FROM services WHERE service_id = $1 AND provider_id = $2 RETURNING *',
      [serviceId, providerId]
    );

    if (res.rowCount === 0) {
      const err = new Error('Service not found or unauthorized');
      err.statusCode = 404;
      throw err;
    }
    return res.rows[0];
  }

  /**
   * Provider: Get all services published by this provider
   */
  static async getProviderServices(providerId) {
    const res = await query(
      `SELECT s.*, c.category_name
       FROM services s
       JOIN categories c ON s.category_id = c.category_id
       WHERE s.provider_id = $1
       ORDER BY s.created_at DESC`,
      [providerId]
    );
    return res.rows;
  }

  /**
   * Public: Get service details by service ID
   */
  static async getServiceById(serviceId) {
    const res = await query(
      `SELECT s.*, c.category_name, p.provider_id, u.full_name AS provider_name,
              p.average_rating, p.total_reviews, p.service_city, p.service_pincode
       FROM services s
       JOIN categories c ON s.category_id = c.category_id
       JOIN provider_profiles p ON s.provider_id = p.provider_id
       JOIN users u ON p.user_id = u.user_id
       WHERE s.service_id = $1 AND s.service_status = 'ACTIVE' AND u.account_status = 'ACTIVE'`,
      [serviceId]
    );

    if (res.rowCount === 0) {
      const err = new Error('Service not found or currently unavailable');
      err.statusCode = 404;
      throw err;
    }
    return res.rows[0];
  }

  /**
   * Public: Marketplace search with filters (category, city, price range, search query)
   */
  static async searchServices({ search, categoryId, city, minPrice, maxPrice, sortBy = 'rating', page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const conditions = ["s.service_status = 'ACTIVE'", "u.account_status = 'ACTIVE'", "p.verification_status = 'VERIFIED'"];
    const params = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(s.service_name ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex})`);
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (categoryId) {
      conditions.push(`s.category_id = $${paramIndex++}`);
      params.push(categoryId);
    }

    if (city) {
      conditions.push(`p.service_city ILIKE $${paramIndex++}`);
      params.push(`%${city.trim()}%`);
    }

    if (minPrice !== undefined && minPrice !== '') {
      conditions.push(`s.price >= $${paramIndex++}`);
      params.push(minPrice);
    }

    if (maxPrice !== undefined && maxPrice !== '') {
      conditions.push(`s.price <= $${paramIndex++}`);
      params.push(maxPrice);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    let orderClause = 'ORDER BY p.average_rating DESC, s.created_at DESC';
    if (sortBy === 'price_asc') orderClause = 'ORDER BY s.price ASC';
    else if (sortBy === 'price_desc') orderClause = 'ORDER BY s.price DESC';
    else if (sortBy === 'newest') orderClause = 'ORDER BY s.created_at DESC';

    const countRes = await query(
      `SELECT COUNT(*)
       FROM services s
       JOIN categories c ON s.category_id = c.category_id
       JOIN provider_profiles p ON s.provider_id = p.provider_id
       JOIN users u ON p.user_id = u.user_id
       ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await query(
      `SELECT s.service_id, s.service_name, s.description, s.price, s.estimated_duration,
              c.category_id, c.category_name,
              p.provider_id, u.full_name AS provider_name, p.average_rating, p.total_reviews,
              p.service_city, p.service_pincode
       FROM services s
       JOIN categories c ON s.category_id = c.category_id
       JOIN provider_profiles p ON s.provider_id = p.provider_id
       JOIN users u ON p.user_id = u.user_id
       ${whereClause}
       ${orderClause}
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    return {
      services: dataRes.rows,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
