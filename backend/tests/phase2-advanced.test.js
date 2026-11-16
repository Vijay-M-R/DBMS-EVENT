import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { query, pool } from '../src/config/database.js';
import { AdminService } from '../src/services/admin.service.js';

after(async () => {
  await pool.end();
});

test('Page 2 Requirement: Correlated query executes successfully', async () => {
  const sql = `
    SELECT pp.provider_id, u.full_name, pp.service_city, pp.average_rating 
    FROM provider_profiles pp 
    JOIN users u ON u.user_id = pp.user_id 
    WHERE pp.average_rating > (
      SELECT AVG(pp2.average_rating) 
      FROM provider_profiles pp2 
      WHERE pp2.service_city = pp.service_city
    )
    ORDER BY pp.average_rating DESC;
  `;
  const res = await query(sql);
  assert.ok(Array.isArray(res.rows), 'Correlated query should execute cleanly');
});

test('Page 2 Requirement: Exactly 2 Views exist and return valid datasets', async () => {
  // View 1: v_provider_performance
  const v1 = await query('SELECT * FROM v_provider_performance;');
  assert.ok(v1.rows.length >= 1, 'View 1 (v_provider_performance) should return provider rows');
  assert.ok('completed_bookings' in v1.rows[0], 'View 1 should contain completed_bookings column');
  assert.ok('average_rating' in v1.rows[0], 'View 1 should contain average_rating column');

  // View 2: v_customer_booking_summary
  const v2 = await query('SELECT * FROM v_customer_booking_summary;');
  assert.ok(v2.rows.length >= 1, 'View 2 (v_customer_booking_summary) should return booking rows');
  assert.ok('customer_name' in v2.rows[0], 'View 2 should contain customer_name column');
  assert.ok('provider_name' in v2.rows[0], 'View 2 should contain provider_name column');
  assert.ok('service_price' in v2.rows[0], 'View 2 should contain service_price column');
});

test('Page 2 Requirement: EXISTS and NOT EXISTS queries execute successfully', async () => {
  // EXISTS
  const existsSql = `
    SELECT cp.customer_id, u.full_name 
    FROM customer_profiles cp 
    JOIN users u ON u.user_id = cp.user_id 
    WHERE EXISTS (
      SELECT 1 FROM bookings b 
      WHERE b.customer_id = cp.customer_id 
        AND b.booking_status = 'COMPLETED'
    );
  `;
  const existsRes = await query(existsSql);
  assert.ok(existsRes.rows.length >= 1, 'EXISTS query should find customers with completed bookings');

  // NOT EXISTS
  const notExistsSql = `
    SELECT pp.provider_id, u.full_name 
    FROM provider_profiles pp 
    JOIN users u ON u.user_id = pp.user_id 
    WHERE pp.verification_status = 'VERIFIED' 
      AND NOT EXISTS (
        SELECT 1 FROM services s 
        WHERE s.provider_id = pp.provider_id 
          AND s.service_status = 'ACTIVE'
      );
  `;
  const notExistsRes = await query(notExistsSql);
  assert.ok(Array.isArray(notExistsRes.rows), 'NOT EXISTS query should execute cleanly');
});

test('Page 2 Requirement: 4 Aggregate functions (COUNT, SUM, AVG, MIN, MAX) execute successfully', async () => {
  const sql = `
    SELECT 
      COUNT(service_id) AS total_count,
      SUM(price) AS total_sum,
      ROUND(AVG(price), 2) AS price_avg,
      MIN(price) AS price_min,
      MAX(price) AS price_max
    FROM services;
  `;
  const res = await query(sql);
  assert.equal(res.rows.length, 1);
  const row = res.rows[0];
  assert.ok(row.total_count >= 1, 'COUNT should be positive');
  assert.ok(row.total_sum >= 1, 'SUM should be positive');
  assert.ok(row.price_avg >= 1, 'AVG should be positive');
  assert.ok(row.price_min >= 1, 'MIN should be positive');
  assert.ok(row.price_max >= row.price_min, 'MAX should be >= MIN');
});

test('Page 2 Requirement: Stored procedures (2) exist in database catalog', async () => {
  const res = await query(`
    SELECT proname, prokind 
    FROM pg_proc 
    WHERE proname IN ('complete_booking', 'cancel_booking');
  `);
  const names = res.rows.map((r) => r.proname);
  assert.ok(names.includes('complete_booking'), 'Procedure complete_booking should exist');
  assert.ok(names.includes('cancel_booking'), 'Procedure cancel_booking should exist');
});

test('Page 2 Requirement: Triggers (2+) exist on database tables', async () => {
  const res = await query(`
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE trigger_name IN ('trg_sync_slot_status', 'trg_update_provider_ratings');
  `);
  const names = res.rows.map((r) => r.trigger_name);
  assert.ok(names.includes('trg_sync_slot_status'), 'trg_sync_slot_status should be active');
  assert.ok(names.includes('trg_update_provider_ratings'), 'trg_update_provider_ratings should be active');
});

test('Page 2 Requirement: 2 Report Generations produce rich structured reports', async () => {
  // Report 1: Financial & Revenue Generation Report
  const finReport = await AdminService.getFinancialReport();
  assert.equal(finReport.report_title, 'Platform Financial & Revenue Generation Report');
  assert.ok(finReport.kpis, 'Financial report must contain KPIs');
  assert.ok('total_revenue' in finReport.kpis, 'Financial report must have total_revenue');
  assert.ok(Array.isArray(finReport.categories), 'Financial report must have category breakdown');
  assert.ok(Array.isArray(finReport.recent_transactions), 'Financial report must include recent transactions');

  // Report 2: Provider Performance & Rating Audit Report
  const provReport = await AdminService.getProviderPerformanceReport();
  assert.equal(provReport.report_title, 'Provider Performance & Quality Audit Report');
  assert.ok(provReport.kpis, 'Provider report must contain KPIs');
  assert.ok('platform_average_rating' in provReport.kpis, 'Provider report must have platform average rating');
  assert.ok(Array.isArray(provReport.providers), 'Provider report must have detailed provider rows');
  assert.ok(provReport.providers.length >= 1, 'Provider report should return provider data from v_provider_performance');
});
