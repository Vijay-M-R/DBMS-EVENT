import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRegister } from '../src/validators/auth.validator.js';
import { validateCreateService } from '../src/validators/service.validator.js';
import { validateCreateSlot } from '../src/validators/availability.validator.js';
import { validateCreateBooking, validateUpdateBookingStatus } from '../src/validators/booking.validator.js';
import { validateCreateReview } from '../src/validators/review.validator.js';
import { validateCreateAddress } from '../src/validators/address.validator.js';

test('validateRegister validates required fields and formats', () => {
  const invalid = validateRegister({ email: 'bademail', role: 'INVALID' });
  assert.equal(invalid.isValid, false);
  assert.ok(invalid.errors.length >= 3);

  const valid = validateRegister({
    full_name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    phone: '+1234567890',
    role: 'CUSTOMER',
  });
  assert.equal(valid.isValid, true);
});

test('validateCreateService validates pricing and duration', () => {
  const invalid = validateCreateService({
    category_id: 'abc',
    service_name: 'Plumbing',
    description: 'Fixing pipes',
    price: -10,
    estimated_duration: 0,
  });
  assert.equal(invalid.isValid, false);

  const valid = validateCreateService({
    category_id: 1,
    service_name: 'Home AC Repair',
    description: 'Complete diagnostic and cleaning service for AC units',
    price: 49.99,
    estimated_duration: 60,
  });
  assert.equal(valid.isValid, true);
});

test('validateCreateSlot enforces chronological order', () => {
  const invalid = validateCreateSlot({
    slot_date: '2027-01-01',
    start_time: '14:00',
    end_time: '12:00', // End before start
  });
  assert.equal(invalid.isValid, false);

  const valid = validateCreateSlot({
    slot_date: '2027-01-01',
    start_time: '10:00',
    end_time: '12:00',
  });
  assert.equal(valid.isValid, true);
});

test('validateCreateReview enforces rating scale 1 to 5', () => {
  const invalid = validateCreateReview({ booking_id: 1, rating: 6 });
  assert.equal(invalid.isValid, false);

  const valid = validateCreateReview({ booking_id: 1, rating: 5, comment: 'Excellent work!' });
  assert.equal(valid.isValid, true);
});

test('validateUpdateBookingStatus enforces status transitions', () => {
  const invalid = validateUpdateBookingStatus({ booking_status: 'UNKNOWN' });
  assert.equal(invalid.isValid, false);

  const valid = validateUpdateBookingStatus({ booking_status: 'ACCEPTED' });
  assert.equal(valid.isValid, true);

  const cancelWithoutReason = validateUpdateBookingStatus({ booking_status: 'CANCELLED' });
  assert.equal(cancelWithoutReason.isValid, false);

  const cancelWithReason = validateUpdateBookingStatus({
    booking_status: 'CANCELLED',
    cancellation_reason: 'Emergency reschedule required',
  });
  assert.equal(cancelWithReason.isValid, true);
});
