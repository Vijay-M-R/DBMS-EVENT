import test from 'node:test';
import assert from 'node:assert/strict';
import { validateUpdateSlotStatus } from '../src/validators/availability.validator.js';
import { availabilityRouter } from '../src/routes/availability.routes.js';
import { reviewRouter } from '../src/routes/review.routes.js';

test('validateUpdateSlotStatus rejects invalid status types and values', () => {
  // Missing or non-string
  const missing = validateUpdateSlotStatus({});
  assert.equal(missing.isValid, false);
  assert.ok(missing.errors.some((e) => e.includes('required and must be a string')));

  const nullVal = validateUpdateSlotStatus({ slot_status: null });
  assert.equal(nullVal.isValid, false);

  const numberVal = validateUpdateSlotStatus({ slot_status: 123 });
  assert.equal(numberVal.isValid, false);

  // Statuses that are forbidden for manual provider toggling
  const booked = validateUpdateSlotStatus({ slot_status: 'BOOKED' });
  assert.equal(booked.isValid, false);
  assert.ok(booked.errors.some((e) => e.includes('only be updated to AVAILABLE or BLOCKED')));

  const cancelled = validateUpdateSlotStatus({ slot_status: 'CANCELLED' });
  assert.equal(cancelled.isValid, false);

  const unknown = validateUpdateSlotStatus({ slot_status: 'PENDING' });
  assert.equal(unknown.isValid, false);
});

test('validateUpdateSlotStatus accepts AVAILABLE and BLOCKED', () => {
  const available = validateUpdateSlotStatus({ slot_status: 'AVAILABLE' });
  assert.equal(available.isValid, true);
  assert.equal(available.errors.length, 0);

  const blocked = validateUpdateSlotStatus({ slot_status: 'BLOCKED' });
  assert.equal(blocked.isValid, true);
  assert.equal(blocked.errors.length, 0);
});

test('availabilityRouter has registered PATCH /:id/status route with authentication and authorization', () => {
  const statusRoute = availabilityRouter.routes.find(
    (r) => r.method === 'PATCH' && r.path === '/:id/status'
  );

  assert.ok(statusRoute, 'Route PATCH /:id/status must be registered');
  assert.ok(statusRoute.handlers.length >= 3, 'Route must have auth, RBAC, and controller handlers');
});

test('reviewRouter has registered GET /my-reviews route for authenticated providers', () => {
  const myReviewsRoute = reviewRouter.routes.find(
    (r) => r.method === 'GET' && r.path === '/my-reviews'
  );

  assert.ok(myReviewsRoute, 'Route GET /my-reviews must be registered');
  assert.ok(myReviewsRoute.handlers.length >= 3, 'Route must have auth, RBAC, and controller handlers');
});
