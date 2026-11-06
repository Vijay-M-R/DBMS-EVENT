import { withTransaction, query } from '../config/database.js';

export class BookingService {
  /**
   * Customer: Create a service booking inside an atomic transaction with row-level locking.
   */
  static async createBooking(customerId, { service_id, slot_id, customer_notes }) {
    return withTransaction(async (client) => {
      // 1. Fetch and validate Service
      const serviceRes = await client.query(
        `SELECT s.service_id, s.provider_id, s.price, s.service_status,
                p.verification_status, u.account_status AS provider_account_status
         FROM services s
         JOIN provider_profiles p ON s.provider_id = p.provider_id
         JOIN users u ON p.user_id = u.user_id
         WHERE s.service_id = $1`,
        [service_id]
      );

      if (serviceRes.rowCount === 0) {
        const err = new Error('Service not found');
        err.statusCode = 404;
        throw err;
      }

      const service = serviceRes.rows[0];

      if (service.service_status !== 'ACTIVE') {
        const err = new Error('Service is currently inactive and cannot be booked');
        err.statusCode = 400;
        throw err;
      }

      if (service.verification_status !== 'VERIFIED' || service.provider_account_status !== 'ACTIVE') {
        const err = new Error('Provider is currently suspended or not verified');
        err.statusCode = 403;
        throw err;
      }

      // 2. Lock the target availability slot with SELECT FOR UPDATE to prevent race conditions
      const slotRes = await client.query(
        `SELECT slot_id, provider_id, slot_date, start_time, end_time, slot_status
         FROM availability_slots
         WHERE slot_id = $1
         FOR UPDATE`,
        [slot_id]
      );

      if (slotRes.rowCount === 0) {
        const err = new Error('Selected availability slot not found');
        err.statusCode = 404;
        throw err;
      }

      const slot = slotRes.rows[0];

      // 3. Verify slot belongs to service's provider
      if (slot.provider_id !== service.provider_id) {
        const err = new Error('The selected availability slot does not belong to the service provider');
        err.statusCode = 400;
        throw err;
      }

      // 4. Verify slot is available
      if (slot.slot_status !== 'AVAILABLE') {
        const err = new Error(`Slot is no longer available (current status: ${slot.slot_status})`);
        err.statusCode = 409;
        throw err;
      }

      // 5. Insert booking (capturing service_price snapshot)
      const bookingRes = await client.query(
        `INSERT INTO bookings (customer_id, service_id, slot_id, service_price, booking_status, customer_notes)
         VALUES ($1, $2, $3, $4, 'PENDING', $5)
         RETURNING *`,
        [customerId, service_id, slot_id, service.price, customer_notes ? customer_notes.trim() : null]
      );

      // 6. Explicitly update slot status to BOOKED
      await client.query(
        `UPDATE availability_slots SET slot_status = 'BOOKED' WHERE slot_id = $1`,
        [slot_id]
      );

      return bookingRes.rows[0];
    });
  }

  /**
   * Update booking status with strict state machine validation and slot release logic.
   */
  static async updateBookingStatus(user, bookingId, { booking_status, cancellation_reason }) {
    return withTransaction(async (client) => {
      // Lock the booking row
      const bookingRes = await client.query(
        `SELECT b.*, s.provider_id, p.user_id AS provider_user_id, cp.user_id AS customer_user_id
         FROM bookings b
         JOIN services s ON b.service_id = s.service_id
         JOIN provider_profiles p ON s.provider_id = p.provider_id
         JOIN customer_profiles cp ON b.customer_id = cp.customer_id
         WHERE b.booking_id = $1
         FOR UPDATE`,
        [bookingId]
      );

      if (bookingRes.rowCount === 0) {
        const err = new Error('Booking not found');
        err.statusCode = 404;
        throw err;
      }

      const booking = bookingRes.rows[0];
      const currentStatus = booking.booking_status;
      const targetStatus = booking_status;

      // Authorization & state transition rules
      if (user.role === 'CUSTOMER') {
        if (booking.customer_user_id !== user.userId) {
          const err = new Error('Access denied: You do not own this booking');
          err.statusCode = 403;
          throw err;
        }

        if (targetStatus !== 'CANCELLED') {
          const err = new Error('Customers can only cancel eligible bookings');
          err.statusCode = 400;
          throw err;
        }

        if (!['PENDING', 'ACCEPTED'].includes(currentStatus)) {
          const err = new Error(`Cannot cancel booking in ${currentStatus} status`);
          err.statusCode = 400;
          throw err;
        }
      } else if (user.role === 'PROVIDER') {
        if (booking.provider_user_id !== user.userId) {
          const err = new Error('Access denied: This booking does not belong to your service offerings');
          err.statusCode = 403;
          throw err;
        }

        const validTransitions = {
          PENDING: ['ACCEPTED', 'REJECTED'],
          ACCEPTED: ['COMPLETED', 'CANCELLED'],
          REJECTED: [],
          COMPLETED: [],
          CANCELLED: [],
        };

        if (!validTransitions[currentStatus]?.includes(targetStatus)) {
          const err = new Error(`Invalid status transition from ${currentStatus} to ${targetStatus}`);
          err.statusCode = 400;
          throw err;
        }
      } else if (user.role !== 'ADMIN') {
        const err = new Error('Unauthorized role');
        err.statusCode = 403;
        throw err;
      }

      // Update booking
      const updateRes = await client.query(
        `UPDATE bookings
         SET booking_status = $1,
             cancellation_reason = COALESCE($2, cancellation_reason)
         WHERE booking_id = $3
         RETURNING *`,
        [targetStatus, cancellation_reason || null, bookingId]
      );

      // Release slot if booking was rejected or cancelled
      if (['CANCELLED', 'REJECTED'].includes(targetStatus)) {
        await client.query(
          `UPDATE availability_slots SET slot_status = 'AVAILABLE' WHERE slot_id = $1`,
          [booking.slot_id]
        );
      }

      return updateRes.rows[0];
    });
  }

  /**
   * Customer: View their booking history
   */
  static async getCustomerBookings(customerId, status) {
    const conditions = ['b.customer_id = $1'];
    const params = [customerId];

    if (status) {
      conditions.push('b.booking_status = $2');
      params.push(status);
    }

    const res = await query(
      `SELECT b.*, s.service_name, s.estimated_duration,
              u.full_name AS provider_name, pp.provider_id, pp.service_city,
              a.slot_date, a.start_time, a.end_time,
              r.review_id, r.rating, r.comment AS review_comment
       FROM bookings b
       JOIN services s ON b.service_id = s.service_id
       JOIN provider_profiles pp ON s.provider_id = pp.provider_id
       JOIN users u ON pp.user_id = u.user_id
       JOIN availability_slots a ON b.slot_id = a.slot_id
       LEFT JOIN reviews r ON b.booking_id = r.booking_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY b.created_at DESC`,
      params
    );

    return res.rows;
  }

  /**
   * Provider: View incoming and historical bookings
   */
  static async getProviderBookings(providerId, status) {
    const conditions = ['s.provider_id = $1'];
    const params = [providerId];

    if (status) {
      conditions.push('b.booking_status = $2');
      params.push(status);
    }

    const res = await query(
      `SELECT b.*, s.service_name, s.estimated_duration,
              u.full_name AS customer_name, u.phone AS customer_phone, u.email AS customer_email,
              a.slot_date, a.start_time, a.end_time,
              r.review_id, r.rating, r.comment AS review_comment
       FROM bookings b
       JOIN services s ON b.service_id = s.service_id
       JOIN customer_profiles cp ON b.customer_id = cp.customer_id
       JOIN users u ON cp.user_id = u.user_id
       JOIN availability_slots a ON b.slot_id = a.slot_id
       LEFT JOIN reviews r ON b.booking_id = r.booking_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY b.created_at DESC`,
      params
    );

    return res.rows;
  }

  /**
   * Get single booking details by ID
   */
  static async getBookingById(bookingId) {
    const res = await query(
      `SELECT b.*, s.service_name, s.description AS service_description,
              pu.full_name AS provider_name, pp.provider_id, pp.service_city,
              cu.full_name AS customer_name, cu.phone AS customer_phone,
              a.slot_date, a.start_time, a.end_time,
              r.review_id, r.rating, r.comment AS review_comment
       FROM bookings b
       JOIN services s ON b.service_id = s.service_id
       JOIN provider_profiles pp ON s.provider_id = pp.provider_id
       JOIN users pu ON pp.user_id = pu.user_id
       JOIN customer_profiles cp ON b.customer_id = cp.customer_id
       JOIN users cu ON cp.user_id = cu.user_id
       JOIN availability_slots a ON b.slot_id = a.slot_id
       LEFT JOIN reviews r ON b.booking_id = r.booking_id
       WHERE b.booking_id = $1`,
      [bookingId]
    );

    if (res.rowCount === 0) {
      const err = new Error('Booking not found');
      err.statusCode = 404;
      throw err;
    }

    return res.rows[0];
  }
}
