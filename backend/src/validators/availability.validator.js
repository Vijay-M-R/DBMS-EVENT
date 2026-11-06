/**
 * Availability Slot Validators
 */

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export const validateCreateSlot = (data) => {
  const errors = [];
  const { slot_date, start_time, end_time } = data || {};

  if (!slot_date || !DATE_REGEX.test(slot_date)) {
    errors.push('slot_date is required in YYYY-MM-DD format');
  } else {
    const today = new Date().toISOString().split('T')[0];
    if (slot_date < today) {
      errors.push('slot_date cannot be in the past');
    }
  }

  if (!start_time || !TIME_REGEX.test(start_time)) {
    errors.push('start_time is required in HH:MM or HH:MM:SS format');
  }

  if (!end_time || !TIME_REGEX.test(end_time)) {
    errors.push('end_time is required in HH:MM or HH:MM:SS format');
  }

  if (start_time && end_time && start_time >= end_time) {
    errors.push('end_time must be chronologically after start_time');
  }

  return { isValid: errors.length === 0, errors };
};
