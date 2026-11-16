import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { query, pool } from '../src/config/database.js';

after(async () => {
  await pool.end();
});

test('Page 1 Requirement: 5 Simple Queries execute successfully', async () => {
  // Simple 1: All Categories sorted alphabetically
  const q1 = await query(
    'SELECT category_id, category_name, description FROM categories ORDER BY category_name ASC;'
  );
  assert.ok(q1.rows.length >= 1, 'Simple Query 1 should return categories');

  // Simple 2: Verified Providers with experience >= 5
  const q2 = await query(
    "SELECT provider_id, experience_years, service_city, average_rating FROM provider_profiles WHERE verification_status = 'VERIFIED' AND experience_years >= 5 ORDER BY experience_years DESC;"
  );
  assert.ok(q2.rows.length >= 1, 'Simple Query 2 should return verified providers');

  // Simple 3: Services under ₹1500
  const q3 = await query(
    'SELECT service_id, service_name, price, estimated_duration FROM services WHERE price < 1500 ORDER BY price ASC;'
  );
  assert.ok(q3.rows.length >= 1, 'Simple Query 3 should return affordable services');

  // Simple 4: Completed Bookings
  const q4 = await query(
    "SELECT booking_id, customer_id, service_id, service_price, booking_status FROM bookings WHERE booking_status = 'COMPLETED' ORDER BY booking_id ASC;"
  );
  assert.ok(q4.rows.length >= 1, 'Simple Query 4 should return completed bookings');

  // Simple 5: Default Customer Addresses
  const q5 = await query(
    'SELECT address_id, customer_id, address_line, city, pincode FROM addresses WHERE is_default = TRUE ORDER BY address_id ASC;'
  );
  assert.ok(q5.rows.length >= 1, 'Simple Query 5 should return default addresses');
});

test('Page 1 Requirement: 5 Nested Queries execute successfully', async () => {
  // Nested 1: Scalar subquery in WHERE
  const q1 = await query(
    'SELECT service_id, service_name, price FROM services WHERE price > (SELECT AVG(price) FROM services) ORDER BY price DESC;'
  );
  assert.ok(q1.rows.length >= 1, 'Nested Query 1 should return services priced above average');

  // Nested 2: Subquery with IN
  const q2 = await query(
    "SELECT customer_id, user_id FROM customer_profiles WHERE customer_id IN (SELECT b.customer_id FROM bookings b JOIN services s ON b.service_id = s.service_id JOIN categories c ON s.category_id = c.category_id WHERE c.category_name = 'Electrical');"
  );
  assert.ok(Array.isArray(q2.rows), 'Nested Query 2 (IN) should execute cleanly');

  // Nested 3: Subquery with NOT IN
  const q3 = await query(
    'SELECT customer_id, date_of_birth, gender FROM customer_profiles WHERE customer_id NOT IN (SELECT DISTINCT customer_id FROM bookings);'
  );
  assert.ok(Array.isArray(q3.rows), 'Nested Query 3 (NOT IN) should execute cleanly');

  // Nested 4: Subquery with MAX
  const q4 = await query(
    'SELECT provider_id, service_name, price FROM services WHERE price = (SELECT MAX(price) FROM services);'
  );
  assert.ok(q4.rows.length >= 1, 'Nested Query 4 (MAX) should return highest-priced service');

  // Nested 5: Subquery in FROM clause (Derived Table / Inline View)
  const q5 = await query(
    'SELECT category_name, avg_price FROM (SELECT c.category_name, ROUND(AVG(s.price), 2) AS avg_price FROM categories c JOIN services s ON c.category_id = s.category_id GROUP BY c.category_name) AS cat_summary WHERE avg_price > 1000 ORDER BY avg_price DESC;'
  );
  assert.ok(q5.rows.length >= 1, 'Nested Query 5 (Derived table) should execute cleanly');
});

test('Page 1 Requirement: SET operations (UNION, INTERSECT, EXCEPT) execute successfully', async () => {
  // Set 1: UNION
  const unionQ = await query(
    "SELECT user_id, full_name, email, role FROM users WHERE role = 'CUSTOMER' UNION SELECT user_id, full_name, email, role FROM users WHERE role = 'PROVIDER' ORDER BY full_name;"
  );
  assert.ok(unionQ.rows.length >= 2, 'UNION should combine customers and providers');

  // Set 2: INTERSECT
  const intersectQ = await query(
    "SELECT city FROM addresses INTERSECT SELECT service_city AS city FROM provider_profiles WHERE verification_status = 'VERIFIED';"
  );
  assert.ok(Array.isArray(intersectQ.rows), 'INTERSECT should return matching cities');

  // Set 3: EXCEPT
  const exceptQ = await query(
    "SELECT user_id, full_name FROM users WHERE role IN ('CUSTOMER', 'PROVIDER') EXCEPT (SELECT u.user_id, u.full_name FROM users u JOIN customer_profiles cp ON u.user_id = cp.user_id JOIN bookings b ON cp.customer_id = b.customer_id UNION SELECT u.user_id, u.full_name FROM users u JOIN provider_profiles pp ON u.user_id = pp.user_id JOIN services s ON pp.provider_id = s.provider_id JOIN bookings b ON s.service_id = b.service_id);"
  );
  assert.ok(Array.isArray(exceptQ.rows), 'EXCEPT should return unbooked users');
});

test('Page 1 Requirement: 2 GROUP BY queries execute successfully', async () => {
  // Group By 1: Service count & average price by category
  const q1 = await query(
    'SELECT c.category_id, c.category_name, COUNT(s.service_id) AS total_services, ROUND(AVG(s.price), 2) AS avg_price FROM categories c LEFT JOIN services s ON c.category_id = s.category_id GROUP BY c.category_id, c.category_name ORDER BY total_services DESC;'
  );
  assert.ok(q1.rows.length >= 1, 'GROUP BY 1 should summarize categories');

  // Group By 2: Completed bookings and total revenue by provider
  const q2 = await query(
    "SELECT pp.provider_id, u.full_name AS provider_name, COUNT(b.booking_id) AS completed_bookings, SUM(b.service_price) AS total_revenue FROM provider_profiles pp JOIN users u ON pp.user_id = u.user_id JOIN services s ON pp.provider_id = s.provider_id JOIN bookings b ON s.service_id = b.service_id WHERE b.booking_status = 'COMPLETED' GROUP BY pp.provider_id, u.full_name ORDER BY total_revenue DESC;"
  );
  assert.ok(q2.rows.length >= 1, 'GROUP BY 2 should summarize provider revenue');
});

test('Page 1 Requirement: 2 HAVING queries execute successfully', async () => {
  // Having 1: Categories with >= 1 service and avg price > 1000
  const q1 = await query(
    'SELECT c.category_id, c.category_name, COUNT(s.service_id) AS service_count, ROUND(AVG(s.price), 2) AS avg_price FROM categories c JOIN services s ON c.category_id = s.category_id GROUP BY c.category_id, c.category_name HAVING COUNT(s.service_id) >= 1 AND AVG(s.price) > 1000 ORDER BY avg_price DESC;'
  );
  assert.ok(q1.rows.length >= 1, 'HAVING 1 should filter categories by aggregated price');

  // Having 2: Providers with >= 1 review and avg rating >= 4.0
  const q2 = await query(
    'SELECT pp.provider_id, u.full_name AS provider_name, COUNT(r.review_id) AS review_count, ROUND(AVG(r.rating), 2) AS avg_rating FROM provider_profiles pp JOIN users u ON pp.user_id = u.user_id JOIN services s ON pp.provider_id = s.provider_id JOIN bookings b ON s.service_id = b.service_id JOIN reviews r ON b.booking_id = r.booking_id GROUP BY pp.provider_id, u.full_name HAVING COUNT(r.review_id) >= 1 AND AVG(r.rating) >= 4.0 ORDER BY avg_rating DESC;'
  );
  assert.ok(q2.rows.length >= 1, 'HAVING 2 should filter providers by aggregated rating');
});

test('Page 1 Requirement: 3 Pattern Matching queries (LIKE, BETWEEN) execute successfully', async () => {
  // Pattern 1: LIKE email domain
  const q1 = await query(
    "SELECT user_id, full_name, email, role FROM users WHERE email LIKE '%.demo@example.test' ORDER BY user_id ASC;"
  );
  assert.ok(q1.rows.length >= 1, 'Pattern 1 (LIKE email domain) should match users');

  // Pattern 2: LIKE text search (case-insensitive keyword match in service name/description)
  const q2 = await query(
    "SELECT service_id, service_name, description, price FROM services WHERE service_name ILIKE '%repair%' OR description ILIKE '%clean%' ORDER BY price ASC;"
  );
  assert.ok(q2.rows.length >= 1, 'Pattern 2 (LIKE keyword search) should match services');

  // Pattern 3: BETWEEN price range
  const q3 = await query(
    'SELECT service_id, service_name, price, estimated_duration FROM services WHERE price BETWEEN 800 AND 2000 ORDER BY price ASC;'
  );
  assert.ok(q3.rows.length >= 1, 'Pattern 3 (BETWEEN price range) should match services');
});
