/**
 * Booking Validators
 */

export const validateCreateBooking = (data) => {
  const errors = [];
  const { service_id, slot_id, customer_notes } = data || {};

  if (!service_id || isNaN(parseInt(service_id, 10))) {
    errors.push('service_id is required and must be an integer');
  }

  if (!slot_id || isNaN(parseInt(slot_id, 10))) {
    errors.push('slot_id is required and must be an integer');
  }

  if (customer_notes !== undefined && typeof customer_notes !== 'string') {
    errors.push('customer_notes must be a string');
  }

  return { isValid: errors.length === 0, errors };
};

export const validateUpdateBookingStatus = (data) => {
  const errors = [];
  const { booking_status, cancellation_reason } = data || {};

  const allowedStatuses = ['ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED'];
  if (!booking_status || !allowedStatuses.includes(booking_status)) {
    errors.push(`booking_status is required and must be one of: ${allowedStatuses.join(', ')}`);
  }

  if (['REJECTED', 'CANCELLED'].includes(booking_status)) {
    if (!cancellation_reason || typeof cancellation_reason !== 'string' || cancellation_reason.trim().length < 3) {
      errors.push('cancellation_reason is required when rejecting or cancelling a booking (min 3 chars)');
    }
  }

  return { isValid: errors.length === 0, errors };
};
