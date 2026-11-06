import { query, withTransaction } from '../config/database.js';

export class AdminService {
  /**
   * Admin: Comprehensive platform dashboard statistics
   */
  static async getDashboardStats() {
    const userStats = await query(`
      SELECT 
        COUNT(*) AS total_users,
        COUNT(CASE WHEN role = 'CUSTOMER' THEN 1 END) AS total_customers,
        COUNT(CASE WHEN role = 'PROVIDER' THEN 1 END) AS total_providers,
        COUNT(CASE WHEN account_status = 'SUSPENDED' THEN 1 END) AS suspended_users
      FROM users
    `);

    const providerStats = await query(`
      SELECT 
        COUNT(CASE WHEN verification_status = 'PENDING' THEN 1 END) AS pending_providers,
        COUNT(CASE WHEN verification_status = 'VERIFIED' THEN 1 END) AS verified_providers,
        COUNT(CASE WHEN verification_status = 'SUSPENDED' THEN 1 END) AS suspended_providers
      FROM provider_profiles
    `);

    const bookingStats = await query(`
      SELECT 
        COUNT(*) AS total_bookings,
        COUNT(CASE WHEN booking_status = 'PENDING' THEN 1 END) AS pending_bookings,
        COUNT(CASE WHEN booking_status = 'ACCEPTED' THEN 1 END) AS accepted_bookings,
        COUNT(CASE WHEN booking_status = 'COMPLETED' THEN 1 END) AS completed_bookings,
        COUNT(CASE WHEN booking_status = 'CANCELLED' THEN 1 END) AS cancelled_bookings,
        COALESCE(SUM(CASE WHEN booking_status = 'COMPLETED' THEN service_price ELSE 0 END), 0) AS total_revenue
      FROM bookings
    `);

    const serviceStats = await query(`
      SELECT 
        COUNT(*) AS total_services,
        COUNT(CASE WHEN service_status = 'ACTIVE' THEN 1 END) AS active_services
      FROM services
    `);

    return {
      users: userStats.rows[0],
      providers: providerStats.rows[0],
      bookings: bookingStats.rows[0],
      services: serviceStats.rows[0],
    };
  }

  /**
   * Admin: List all registered customers
   */
  static async getCustomers({ status, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const conditions = ["u.role = 'CUSTOMER'"];
    const params = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`u.account_status = $${paramIndex++}`);
      params.push(status);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await query(
      `SELECT COUNT(*) FROM users u JOIN customer_profiles cp ON u.user_id = cp.user_id ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await query(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.account_status, u.created_at,
              cp.customer_id, cp.date_of_birth, cp.gender,
              COUNT(b.booking_id) AS total_bookings
       FROM users u
       JOIN customer_profiles cp ON u.user_id = cp.user_id
       LEFT JOIN bookings b ON cp.customer_id = b.customer_id
       ${whereClause}
       GROUP BY u.user_id, cp.customer_id
       ORDER BY u.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    return {
      customers: dataRes.rows,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin: Get single customer details with address and booking summary
   * Note: Excludes passwords, hashes, and sensitive authentication secrets.
   */
  static async getCustomerById(customerId) {
    const id = parseInt(customerId, 10);
    if (isNaN(id)) {
      const err = new Error('Invalid customer ID');
      err.statusCode = 400;
      throw err;
    }

    const custRes = await query(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.account_status, u.created_at, u.updated_at,
              cp.customer_id, cp.date_of_birth, cp.gender, cp.profile_image
       FROM customer_profiles cp
       JOIN users u ON cp.user_id = u.user_id
       WHERE cp.customer_id = $1`,
      [id]
    );

    if (custRes.rowCount === 0) {
      const err = new Error('Customer not found');
      err.statusCode = 404;
      throw err;
    }

    const customer = custRes.rows[0];

    // Customer addresses
    const addrRes = await query(
      `SELECT address_id, address_line, city, state, pincode, landmark, address_type, is_default, created_at
       FROM addresses
       WHERE customer_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [id]
    );

    // Aggregate booking stats
    const statsRes = await query(
      `SELECT 
         COUNT(*) AS total_bookings,
         COUNT(CASE WHEN booking_status = 'COMPLETED' THEN 1 END) AS completed_bookings,
         COUNT(CASE WHEN booking_status = 'PENDING' THEN 1 END) AS pending_bookings,
         COUNT(CASE WHEN booking_status = 'ACCEPTED' THEN 1 END) AS accepted_bookings,
         COUNT(CASE WHEN booking_status = 'CANCELLED' THEN 1 END) AS cancelled_bookings,
         COALESCE(SUM(CASE WHEN booking_status = 'COMPLETED' THEN service_price ELSE 0 END), 0) AS total_spent
       FROM bookings
       WHERE customer_id = $1`,
      [id]
    );

    // Recent 10 bookings
    const bookingsRes = await query(
      `SELECT b.booking_id, b.booking_date, b.booking_status, b.service_price, b.customer_notes, b.cancellation_reason, b.created_at,
              s.service_name,
              pu.full_name AS provider_name,
              a.slot_date, a.start_time, a.end_time
       FROM bookings b
       JOIN services s ON b.service_id = s.service_id
       JOIN provider_profiles pp ON s.provider_id = pp.provider_id
       JOIN users pu ON pp.user_id = pu.user_id
       JOIN availability_slots a ON b.slot_id = a.slot_id
       WHERE b.customer_id = $1
       ORDER BY b.created_at DESC
       LIMIT 10`,
      [id]
    );

    return {
      ...customer,
      stats: statsRes.rows[0],
      addresses: addrRes.rows,
      recent_bookings: bookingsRes.rows,
    };
  }

  /**
   * Admin: List all providers with filtering by verification status
   */
  static async getProviders({ verificationStatus, city, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (verificationStatus) {
      conditions.push(`p.verification_status = $${paramIndex++}`);
      params.push(verificationStatus);
    }

    if (city) {
      conditions.push(`p.service_city ILIKE $${paramIndex++}`);
      params.push(`%${city}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*) FROM provider_profiles p JOIN users u ON p.user_id = u.user_id ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await query(
      `SELECT p.provider_id, p.user_id, u.full_name, u.email, u.phone, u.account_status,
              p.experience_years, p.professional_bio, p.verification_status,
              p.average_rating, p.total_reviews, p.service_city, p.service_pincode,
              p.created_at
       FROM provider_profiles p
       JOIN users u ON p.user_id = u.user_id
       ${whereClause}
       ORDER BY p.created_at DESC
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

  /**
   * Admin: Get single provider details with services and booking summary
   * Note: Excludes passwords, hashes, and sensitive authentication secrets.
   */
  static async getProviderById(providerId) {
    const id = parseInt(providerId, 10);
    if (isNaN(id)) {
      const err = new Error('Invalid provider ID');
      err.statusCode = 400;
      throw err;
    }

    const provRes = await query(
      `SELECT p.provider_id, p.user_id, u.full_name, u.email, u.phone, u.account_status,
              p.experience_years, p.professional_bio, p.verification_status,
              p.average_rating, p.total_reviews, p.service_city, p.service_pincode,
              p.created_at, p.updated_at
       FROM provider_profiles p
       JOIN users u ON p.user_id = u.user_id
       WHERE p.provider_id = $1`,
      [id]
    );

    if (provRes.rowCount === 0) {
      const err = new Error('Provider not found');
      err.statusCode = 404;
      throw err;
    }

    const provider = provRes.rows[0];

    // Services offered by this provider
    const srvRes = await query(
      `SELECT s.service_id, s.service_name, s.description, s.price, s.estimated_duration,
              s.service_status, s.category_id, c.category_name, s.created_at
       FROM services s
       JOIN categories c ON s.category_id = c.category_id
       WHERE s.provider_id = $1
       ORDER BY s.created_at DESC`,
      [id]
    );

    // Aggregate booking stats for this provider
    const statsRes = await query(
      `SELECT 
         COUNT(b.booking_id) AS total_bookings,
         COUNT(CASE WHEN b.booking_status = 'COMPLETED' THEN 1 END) AS completed_bookings,
         COUNT(CASE WHEN b.booking_status = 'PENDING' THEN 1 END) AS pending_bookings,
         COUNT(CASE WHEN b.booking_status = 'ACCEPTED' THEN 1 END) AS accepted_bookings,
         COUNT(CASE WHEN b.booking_status = 'CANCELLED' THEN 1 END) AS cancelled_bookings,
         COALESCE(SUM(CASE WHEN b.booking_status = 'COMPLETED' THEN b.service_price ELSE 0 END), 0) AS total_earnings
       FROM bookings b
       JOIN services s ON b.service_id = s.service_id
       WHERE s.provider_id = $1`,
      [id]
    );

    // Recent 10 bookings
    const bookingsRes = await query(
      `SELECT b.booking_id, b.booking_date, b.booking_status, b.service_price,
              s.service_name,
              cu.full_name AS customer_name,
              a.slot_date, a.start_time, a.end_time
       FROM bookings b
       JOIN services s ON b.service_id = s.service_id
       JOIN customer_profiles cp ON b.customer_id = cp.customer_id
       JOIN users cu ON cp.user_id = cu.user_id
       JOIN availability_slots a ON b.slot_id = a.slot_id
       WHERE s.provider_id = $1
       ORDER BY b.created_at DESC
       LIMIT 10`,
      [id]
    );

    return {
      ...provider,
      stats: statsRes.rows[0],
      services: srvRes.rows,
      recent_bookings: bookingsRes.rows,
    };
  }

  /**
   * Admin: Update provider verification status (VERIFIED, REJECTED, SUSPENDED)
   * Note: Suspending a provider does NOT automatically cancel existing bookings.
   */
  static async updateProviderVerification(adminUserId, providerId, { verification_status, reason }) {
    const validStatuses = ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'];
    if (!validStatuses.includes(verification_status)) {
      const err = new Error(`verification_status must be one of: ${validStatuses.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    return withTransaction(async (client) => {
      const provRes = await client.query(
        `UPDATE provider_profiles
         SET verification_status = $1
         WHERE provider_id = $2
         RETURNING *`,
        [verification_status, providerId]
      );

      if (provRes.rowCount === 0) {
        const err = new Error('Provider not found');
        err.statusCode = 404;
        throw err;
      }

      // Record administrative audit log
      await client.query(
        `INSERT INTO admin_logs (admin_id, action_type, target_type, target_id, description)
         VALUES ($1, $2, 'provider_profiles', $3, $4)`,
        [
          adminUserId,
          `UPDATE_VERIFICATION_${verification_status}`,
          providerId,
          reason ? `Status set to ${verification_status}. Reason: ${reason}` : `Status updated to ${verification_status}`,
        ]
      );

      return provRes.rows[0];
    });
  }

  /**
   * Admin: Update user account status (ACTIVE, SUSPENDED, DEACTIVATED)
   * Protections:
   * 1. Cannot modify status of own admin account.
   * 2. Cannot modify status of another administrative account.
   */
  static async updateUserStatus(adminUserId, targetUserId, { account_status, reason }) {
    const validStatuses = ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'];
    if (!validStatuses.includes(account_status)) {
      const err = new Error(`account_status must be one of: ${validStatuses.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    // Protection 1: Prevent modifying own account
    if (parseInt(adminUserId, 10) === parseInt(targetUserId, 10)) {
      const err = new Error('Cannot modify account status of your own admin account');
      err.statusCode = 400;
      throw err;
    }

    return withTransaction(async (client) => {
      // Protection 2: Check target user role
      const checkUser = await client.query(
        'SELECT user_id, role, account_status FROM users WHERE user_id = $1 FOR UPDATE',
        [targetUserId]
      );

      if (checkUser.rowCount === 0) {
        const err = new Error('User not found');
        err.statusCode = 404;
        throw err;
      }

      if (checkUser.rows[0].role === 'ADMIN') {
        const err = new Error('Cannot modify account status of an administrative account');
        err.statusCode = 403;
        throw err;
      }

      const userRes = await client.query(
        `UPDATE users
         SET account_status = $1
         WHERE user_id = $2
         RETURNING user_id, full_name, email, role, account_status`,
        [account_status, targetUserId]
      );

      await client.query(
        `INSERT INTO admin_logs (admin_id, action_type, target_type, target_id, description)
         VALUES ($1, $2, 'users', $3, $4)`,
        [
          adminUserId,
          `UPDATE_USER_STATUS_${account_status}`,
          targetUserId,
          reason ? `Account set to ${account_status}. Reason: ${reason}` : `Account status set to ${account_status}`,
        ]
      );

      return userRes.rows[0];
    });
  }

  /**
   * Admin: Monitor all platform bookings
   */
  static async getAllBookings({ status, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`b.booking_status = $${paramIndex++}`);
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) FROM bookings b ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await query(
      `SELECT b.*, s.service_name,
              cu.full_name AS customer_name,
              pu.full_name AS provider_name,
              a.slot_date, a.start_time, a.end_time
       FROM bookings b
       JOIN services s ON b.service_id = s.service_id
       JOIN customer_profiles cp ON b.customer_id = cp.customer_id
       JOIN users cu ON cp.user_id = cu.user_id
       JOIN provider_profiles pp ON s.provider_id = pp.provider_id
       JOIN users pu ON pp.user_id = pu.user_id
       JOIN availability_slots a ON b.slot_id = a.slot_id
       ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    return {
      bookings: dataRes.rows,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin: Get single booking details with customer, provider, service, and review
   */
  static async getBookingById(bookingId) {
    const id = parseInt(bookingId, 10);
    if (isNaN(id)) {
      const err = new Error('Invalid booking ID');
      err.statusCode = 400;
      throw err;
    }

    const res = await query(
      `SELECT b.booking_id, b.customer_id, b.service_id, b.slot_id, b.booking_date, b.service_price,
              b.booking_status, b.customer_notes, b.cancellation_reason, b.created_at, b.updated_at,
              s.service_name, s.description AS service_description, s.estimated_duration, s.service_status,
              c.category_id, c.category_name,
              cu.user_id AS customer_user_id, cu.full_name AS customer_name, cu.email AS customer_email, cu.phone AS customer_phone,
              pp.provider_id, pu.user_id AS provider_user_id, pu.full_name AS provider_name, pu.email AS provider_email, pu.phone AS provider_phone,
              pp.service_city, pp.verification_status AS provider_verification_status,
              a.slot_date, a.start_time, a.end_time, a.slot_status,
              r.review_id, r.rating, r.comment AS review_comment, r.created_at AS review_created_at
       FROM bookings b
       JOIN services s ON b.service_id = s.service_id
       JOIN categories c ON s.category_id = c.category_id
       JOIN customer_profiles cp ON b.customer_id = cp.customer_id
       JOIN users cu ON cp.user_id = cu.user_id
       JOIN provider_profiles pp ON s.provider_id = pp.provider_id
       JOIN users pu ON pp.user_id = pu.user_id
       JOIN availability_slots a ON b.slot_id = a.slot_id
       LEFT JOIN reviews r ON b.booking_id = r.booking_id
       WHERE b.booking_id = $1`,
      [id]
    );

    if (res.rowCount === 0) {
      const err = new Error('Booking not found');
      err.statusCode = 404;
      throw err;
    }

    return res.rows[0];
  }

  /**
   * Admin: List all services across the platform with filtering, searching, and pagination
   */
  static async getAllServices({ status, categoryId, search, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`s.service_status = $${paramIndex++}`);
      params.push(status);
    }

    if (categoryId) {
      conditions.push(`s.category_id = $${paramIndex++}`);
      params.push(parseInt(categoryId, 10));
    }

    if (search) {
      conditions.push(`(s.service_name ILIKE $${paramIndex} OR u.full_name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*)
       FROM services s
       JOIN provider_profiles pp ON s.provider_id = pp.provider_id
       JOIN users u ON pp.user_id = u.user_id
       ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await query(
      `SELECT s.service_id, s.provider_id, s.category_id, s.service_name, s.description,
              s.price, s.estimated_duration, s.service_status, s.created_at, s.updated_at,
              c.category_name,
              u.full_name AS provider_name, u.email AS provider_email,
              pp.service_city, pp.verification_status AS provider_verification_status
       FROM services s
       JOIN categories c ON s.category_id = c.category_id
       JOIN provider_profiles pp ON s.provider_id = pp.provider_id
       JOIN users u ON pp.user_id = u.user_id
       ${whereClause}
       ORDER BY s.created_at DESC
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

  /**
   * Admin: Moderate service status (ACTIVE, INACTIVE) with audit logging
   */
  static async updateServiceStatus(adminUserId, serviceId, { service_status, reason }) {
    const validStatuses = ['ACTIVE', 'INACTIVE'];
    if (!validStatuses.includes(service_status)) {
      const err = new Error(`service_status must be one of: ${validStatuses.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    return withTransaction(async (client) => {
      const srvRes = await client.query(
        `UPDATE services
         SET service_status = $1
         WHERE service_id = $2
         RETURNING *`,
        [service_status, serviceId]
      );

      if (srvRes.rowCount === 0) {
        const err = new Error('Service not found');
        err.statusCode = 404;
        throw err;
      }

      const srv = srvRes.rows[0];

      // Record administrative audit log
      await client.query(
        `INSERT INTO admin_logs (admin_id, action_type, target_type, target_id, description)
         VALUES ($1, $2, 'services', $3, $4)`,
        [
          adminUserId,
          `UPDATE_SERVICE_STATUS_${service_status}`,
          serviceId,
          reason ? `Service "${srv.service_name}" set to ${service_status}. Reason: ${reason}` : `Service "${srv.service_name}" status set to ${service_status}`,
        ]
      );

      return srv;
    });
  }

  /**
   * Admin: View audit trail logs
   */
  static async getAuditLogs({ actionType, page = 1, limit = 50 }) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (actionType) {
      conditions.push(`al.action_type ILIKE $${paramIndex++}`);
      params.push(`%${actionType}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) FROM admin_logs al ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await query(
      `SELECT al.*, u.full_name AS admin_name, u.email AS admin_email
       FROM admin_logs al
       JOIN users u ON al.admin_id = u.user_id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    return {
      logs: dataRes.rows,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
