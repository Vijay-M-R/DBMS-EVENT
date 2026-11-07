import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateProviderVerification,
  validateUserStatus,
  validateServiceStatus,
} from '../src/validators/admin.validator.js';
import { adminRouter } from '../src/routes/admin.routes.js';
import { categoryRouter } from '../src/routes/category.routes.js';
import { AdminService } from '../src/services/admin.service.js';
import { CategoryService } from '../src/services/category.service.js';

test('validateProviderVerification validates verification status and required reasons', () => {
  // Missing or invalid
  const missing = validateProviderVerification({});
  assert.equal(missing.isValid, false);
  assert.ok(missing.errors.some((e) => e.includes('verification_status is required')));

  const invalid = validateProviderVerification({ verification_status: 'UNKNOWN' });
  assert.equal(invalid.isValid, false);
  assert.ok(invalid.errors.some((e) => e.includes('verification_status must be one of')));

  // VERIFIED without reason is valid
  const verified = validateProviderVerification({ verification_status: 'VERIFIED' });
  assert.equal(verified.isValid, true);
  assert.equal(verified.errors.length, 0);

  // REJECTED requires reason
  const rejectedNoReason = validateProviderVerification({ verification_status: 'REJECTED' });
  assert.equal(rejectedNoReason.isValid, false);
  assert.ok(rejectedNoReason.errors.some((e) => e.includes('reason of at least 3 characters is required')));

  const rejectedWithReason = validateProviderVerification({
    verification_status: 'REJECTED',
    reason: 'Incomplete documentation submitted',
  });
  assert.equal(rejectedWithReason.isValid, true);

  // SUSPENDED requires reason
  const suspendedNoReason = validateProviderVerification({ verification_status: 'SUSPENDED' });
  assert.equal(suspendedNoReason.isValid, false);

  const suspendedWithReason = validateProviderVerification({
    verification_status: 'SUSPENDED',
    reason: 'Terms of service violation',
  });
  assert.equal(suspendedWithReason.isValid, true);
});

test('validateUserStatus validates account status and required reasons', () => {
  // Missing or invalid
  const missing = validateUserStatus({});
  assert.equal(missing.isValid, false);
  assert.ok(missing.errors.some((e) => e.includes('account_status is required')));

  const invalid = validateUserStatus({ account_status: 'BLOCKED' });
  assert.equal(invalid.isValid, false);

  // ACTIVE is valid without reason
  const active = validateUserStatus({ account_status: 'ACTIVE' });
  assert.equal(active.isValid, true);

  // SUSPENDED requires reason
  const suspendedNoReason = validateUserStatus({ account_status: 'SUSPENDED' });
  assert.equal(suspendedNoReason.isValid, false);
  assert.ok(suspendedNoReason.errors.some((e) => e.includes('reason of at least 3 characters is required')));

  const suspendedWithReason = validateUserStatus({
    account_status: 'SUSPENDED',
    reason: 'Fraudulent activity reported',
  });
  assert.equal(suspendedWithReason.isValid, true);

  // DEACTIVATED requires reason
  const deactivatedNoReason = validateUserStatus({ account_status: 'DEACTIVATED' });
  assert.equal(deactivatedNoReason.isValid, false);

  const deactivatedWithReason = validateUserStatus({
    account_status: 'DEACTIVATED',
    reason: 'User requested account deletion',
  });
  assert.equal(deactivatedWithReason.isValid, true);
});

test('validateServiceStatus validates service moderation status and required reasons', () => {
  // Missing or invalid
  const missing = validateServiceStatus({});
  assert.equal(missing.isValid, false);
  assert.ok(missing.errors.some((e) => e.includes('service_status is required')));

  const invalid = validateServiceStatus({ service_status: 'PENDING' });
  assert.equal(invalid.isValid, false);

  // ACTIVE is valid without reason
  const active = validateServiceStatus({ service_status: 'ACTIVE' });
  assert.equal(active.isValid, true);

  // INACTIVE requires reason
  const inactiveNoReason = validateServiceStatus({ service_status: 'INACTIVE' });
  assert.equal(inactiveNoReason.isValid, false);
  assert.ok(inactiveNoReason.errors.some((e) => e.includes('reason of at least 3 characters is required')));

  const inactiveWithReason = validateServiceStatus({
    service_status: 'INACTIVE',
    reason: 'Pricing violates fair marketplace guidelines',
  });
  assert.equal(inactiveWithReason.isValid, true);
});

test('adminRouter has router-level middleware for authentication and ADMIN role', () => {
  assert.ok(adminRouter.middlewares.length >= 2, 'adminRouter must have at least 2 global middlewares (auth + rbac)');
});

test('adminRouter registers all expected Phase 3 Admin endpoints', () => {
  const expectedRoutes = [
    { method: 'GET', path: '/dashboard' },
    { method: 'GET', path: '/customers' },
    { method: 'GET', path: '/customers/:id' },
    { method: 'GET', path: '/providers' },
    { method: 'GET', path: '/providers/:id' },
    { method: 'PATCH', path: '/providers/:id/verification' },
    { method: 'PATCH', path: '/users/:id/status' },
    { method: 'GET', path: '/bookings' },
    { method: 'GET', path: '/bookings/:id' },
    { method: 'GET', path: '/services' },
    { method: 'PATCH', path: '/services/:id/status' },
    { method: 'GET', path: '/logs' },
  ];

  for (const expected of expectedRoutes) {
    const found = adminRouter.routes.find(
      (r) => r.method === expected.method && r.path === expected.path
    );
    assert.ok(found, `Expected route ${expected.method} ${expected.path} to be registered on adminRouter`);
  }
});

test('categoryRouter has registered DELETE /:id route with admin authorization', () => {
  const deleteRoute = categoryRouter.routes.find(
    (r) => r.method === 'DELETE' && r.path === '/:id'
  );

  assert.ok(deleteRoute, 'Route DELETE /:id must be registered on categoryRouter');
  assert.ok(deleteRoute.handlers.length >= 3, 'DELETE /:id must have authenticate, authorize, and controller handlers');
});

test('AdminService.updateUserStatus prevents self-suspension of currently logged-in admin', async () => {
  await assert.rejects(
    async () => {
      await AdminService.updateUserStatus(1, 1, {
        account_status: 'SUSPENDED',
        reason: 'Attempting self-suspension',
      });
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.ok(err.message.includes('Cannot modify account status of your own admin account'));
      return true;
    }
  );
});

test('AdminService parameter validation catches invalid IDs early', async () => {
  await assert.rejects(
    async () => {
      await AdminService.getCustomerById('abc');
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.equal(err.message, 'Invalid customer ID');
      return true;
    }
  );

  await assert.rejects(
    async () => {
      await AdminService.getProviderById('xyz');
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.equal(err.message, 'Invalid provider ID');
      return true;
    }
  );

  await assert.rejects(
    async () => {
      await AdminService.getBookingById('invalid');
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.equal(err.message, 'Invalid booking ID');
      return true;
    }
  );

  await assert.rejects(
    async () => {
      await CategoryService.deleteCategory(1, 'invalid');
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.equal(err.message, 'Invalid category ID');
      return true;
    }
  );
});

test('adminRouter regex distinguishes static vs parameterized routes', () => {
  const customersRoute = adminRouter.routes.find((r) => r.method === 'GET' && r.path === '/customers');
  const customerDetailRoute = adminRouter.routes.find((r) => r.method === 'GET' && r.path === '/customers/:id');

  assert.ok(customersRoute.regex.test('/customers'));
  assert.ok(!customersRoute.regex.test('/customers/42'));

  assert.ok(!customerDetailRoute.regex.test('/customers'));
  assert.ok(customerDetailRoute.regex.test('/customers/42'));
});
