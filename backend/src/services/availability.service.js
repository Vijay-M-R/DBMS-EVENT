import { query } from '../config/database.js';

export class AvailabilityService {
  /**
   * Provider: Create a bookable time slot with overlap detection
   */
  static async createSlot(providerId, { slot_date, start_time, end_time }) {
    // 1. Check for overlapping slot interval for this provider on the given date
    const overlapCheck = await query(
      `SELECT slot_id FROM availability_slots
       WHERE provider_id = $1 
         AND slot_date = $2
         AND slot_status <> 'CANCELLED'
         AND NOT (end_time <= $3 OR start_time >= $4)`,
      [providerId, slot_date, start_time, end_time]
    );

    if (overlapCheck.rowCount > 0) {
      const err = new Error('This time slot overlaps with an existing slot for this date');
      err.statusCode = 409;
      throw err;
    }

    const res = await query(
      `INSERT INTO availability_slots (provider_id, slot_date, start_time, end_time, slot_status)
       VALUES ($1, $2, $3, $4, 'AVAILABLE')
       RETURNING *`,
      [providerId, slot_date, start_time, end_time]
    );

    return res.rows[0];
  }

  /**
   * Provider: Delete an unbooked slot
   */
  static async deleteSlot(providerId, slotId) {
    // Check if slot has active booking
    const slotRes = await query(
      'SELECT slot_status FROM availability_slots WHERE slot_id = $1 AND provider_id = $2',
      [slotId, providerId]
    );

    if (slotRes.rowCount === 0) {
      const err = new Error('Slot not found or unauthorized');
      err.statusCode = 404;
      throw err;
    }

    if (slotRes.rows[0].slot_status === 'BOOKED') {
      const err = new Error('Cannot delete a slot that is currently booked');
      err.statusCode = 400;
      throw err;
    }

    const res = await query(
      'DELETE FROM availability_slots WHERE slot_id = $1 AND provider_id = $2 RETURNING *',
      [slotId, providerId]
    );

    return res.rows[0];
  }

  /**
   * Public: Get available slots for a provider (e.g. for customer booking)
   */
  static async getAvailableSlots(providerId, startDate, endDate) {
    const today = new Date().toISOString().split('T')[0];
    const start = startDate || today;

    const conditions = [
      'provider_id = $1',
      "slot_status = 'AVAILABLE'",
      'slot_date >= $2',
    ];
    const params = [providerId, start];

    if (endDate) {
      conditions.push('slot_date <= $3');
      params.push(endDate);
    }

    const res = await query(
      `SELECT slot_id, slot_date, start_time, end_time, slot_status
       FROM availability_slots
       WHERE ${conditions.join(' AND ')}
       ORDER BY slot_date ASC, start_time ASC`,
      params
    );

    return res.rows;
  }

  /**
   * Provider: Get all slots (available, booked, blocked) for their dashboard
   */
  static async getProviderSlots(providerId, startDate) {
    const today = new Date().toISOString().split('T')[0];
    const start = startDate || today;

    const res = await query(
      `SELECT a.*, b.booking_id, b.booking_status, u.full_name AS customer_name
       FROM availability_slots a
       LEFT JOIN bookings b ON a.slot_id = b.slot_id AND b.booking_status IN ('PENDING', 'ACCEPTED')
       LEFT JOIN customer_profiles cp ON b.customer_id = cp.customer_id
       LEFT JOIN users u ON cp.user_id = u.user_id
       WHERE a.provider_id = $1 AND a.slot_date >= $2
       ORDER BY a.slot_date ASC, a.start_time ASC`,
      [providerId, start]
    );

    return res.rows;
  }
}
