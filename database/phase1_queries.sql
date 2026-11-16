-- ============================================================================
-- FREELANCE SERVICE MARKETPLACE - DBMS EVENT 1: PHASE 1 DEMO SQL SCRIPT
-- Course: Database Management Systems (24CS520)
-- Target RDBMS: PostgreSQL 16+
-- Guidelines Reference: Page 1 (Dr. Trisiladevi C. Nagavi, CSE, SJCE, JSS STU)
-- ============================================================================
-- Page 1 Requirements Covered:
-- 1. 6 Tables minimum with PK, FK (Project has 10 tables)
-- 2. Minimum 5 attributes per table (All tables have 6-11 attributes)
-- 3. Simple queries - 5
-- 4. Nested queries - 5 (Scalar, IN, NOT IN, MAX, Inline View)
-- 5. SET operation - each 1(2) (UNION, INTERSECT, EXCEPT)
-- 6. Group by - 2
-- 7. Having - 2
-- 8. Like, between (pattern matching) - 3
-- ============================================================================

-- ============================================================================
-- SECTION 1: SIMPLE QUERIES (5 Queries)
-- ============================================================================

-- 1.1 Simple Query: Retrieve all service categories sorted alphabetically
-- Purpose: Basic projection and alphabetical ordering
SELECT 
    category_id, 
    category_name, 
    description 
FROM categories 
ORDER BY category_name ASC;

-- 1.2 Simple Query: List all verified service providers with 5 or more years of experience
-- Purpose: Multi-condition filtering using relational comparison operators
SELECT 
    provider_id, 
    experience_years, 
    service_city, 
    average_rating 
FROM provider_profiles 
WHERE verification_status = 'VERIFIED' 
  AND experience_years >= 5 
ORDER BY experience_years DESC;

-- 1.3 Simple Query: Find all affordable services priced strictly under ₹1,500
-- Purpose: Numeric range filtering and sorting by budget
SELECT 
    service_id, 
    service_name, 
    price, 
    estimated_duration 
FROM services 
WHERE price < 1500 
ORDER BY price ASC;

-- 1.4 Simple Query: Retrieve all completed bookings with prices and status
-- Purpose: Categorical state filtering
SELECT 
    booking_id, 
    customer_id, 
    service_id, 
    service_price, 
    booking_status 
FROM bookings 
WHERE booking_status = 'COMPLETED' 
ORDER BY booking_id ASC;

-- 1.5 Simple Query: Retrieve all primary/default customer addresses
-- Purpose: Boolean attribute filtering
SELECT 
    address_id, 
    customer_id, 
    address_line, 
    city, 
    pincode 
FROM addresses 
WHERE is_default = TRUE 
ORDER BY address_id ASC;


-- ============================================================================
-- SECTION 2: NESTED QUERIES (5 Queries)
-- ============================================================================

-- 2.1 Nested Query (Scalar Subquery): Services priced above the platform average
-- Purpose: Compares individual record prices to an aggregate scalar calculation
SELECT 
    service_id, 
    service_name, 
    price 
FROM services 
WHERE price > (
    SELECT AVG(price) 
    FROM services
) 
ORDER BY price DESC;

-- 2.2 Nested Query (IN Subquery): Customers who have booked an 'Electrical' service
-- Purpose: Membership test against a dynamic set generated across joins
SELECT 
    customer_id, 
    user_id 
FROM customer_profiles 
WHERE customer_id IN (
    SELECT b.customer_id 
    FROM bookings b 
    JOIN services s ON b.service_id = s.service_id 
    JOIN categories c ON s.category_id = c.category_id 
    WHERE c.category_name = 'Electrical'
);

-- 2.3 Nested Query (NOT IN Subquery): Customers who have never placed any booking
-- Purpose: Negative membership test to identify inactive/new customer accounts
SELECT 
    customer_id, 
    date_of_birth, 
    gender 
FROM customer_profiles 
WHERE customer_id NOT IN (
    SELECT DISTINCT customer_id 
    FROM bookings
);

-- 2.4 Nested Query (Subquery with MAX): Provider(s) offering the most expensive service
-- Purpose: Nested value comparison without hardcoding peak figures
SELECT 
    provider_id, 
    service_name, 
    price 
FROM services 
WHERE price = (
    SELECT MAX(price) 
    FROM services
);

-- 2.5 Nested Query (Derived Table / Subquery in FROM): Categories with average price > ₹1,000
-- Purpose: Aggregating in an inline view and querying the derived result set
SELECT 
    category_name, 
    avg_price 
FROM (
    SELECT 
        c.category_name, 
        ROUND(AVG(s.price), 2) AS avg_price 
    FROM categories c 
    JOIN services s ON c.category_id = s.category_id 
    GROUP BY c.category_name
) AS cat_summary 
WHERE avg_price > 1000 
ORDER BY avg_price DESC;


-- ============================================================================
-- SECTION 3: SET OPERATIONS (UNION, INTERSECT, EXCEPT)
-- ============================================================================

-- 3.1 SET Operation (UNION): Consolidated directory of all platform customers and providers
-- Purpose: Unifies tuples from two subsets into one deduplicated list
SELECT 
    user_id, 
    full_name, 
    email, 
    role 
FROM users 
WHERE role = 'CUSTOMER' 
UNION 
SELECT 
    user_id, 
    full_name, 
    email, 
    role 
FROM users 
WHERE role = 'PROVIDER' 
ORDER BY full_name ASC;

-- 3.2 SET Operation (INTERSECT): Cities where customers live AND verified providers operate
-- Purpose: Finds the mathematical intersection between customer locations and provider coverage
SELECT city 
FROM addresses 
INTERSECT 
SELECT service_city AS city 
FROM provider_profiles 
WHERE verification_status = 'VERIFIED';

-- 3.3 SET Operation (EXCEPT): Users who have never participated in any booking
-- Purpose: Mathematical difference between all users and active transaction participants
SELECT user_id, full_name 
FROM users 
WHERE role IN ('CUSTOMER', 'PROVIDER') 
EXCEPT (
    SELECT u.user_id, u.full_name 
    FROM users u 
    JOIN customer_profiles cp ON u.user_id = cp.user_id 
    JOIN bookings b ON cp.customer_id = b.customer_id 
    UNION 
    SELECT u.user_id, u.full_name 
    FROM users u 
    JOIN provider_profiles pp ON u.user_id = pp.user_id 
    JOIN services s ON pp.provider_id = s.provider_id 
    JOIN bookings b ON s.service_id = b.service_id
);


-- ============================================================================
-- SECTION 4: GROUP BY QUERIES (2 Queries)
-- ============================================================================

-- 4.1 GROUP BY: Total services listed and average price per category
-- Purpose: Aggregation by category dimension
SELECT 
    c.category_id, 
    c.category_name, 
    COUNT(s.service_id) AS total_services, 
    ROUND(AVG(s.price), 2) AS avg_price 
FROM categories c 
LEFT JOIN services s ON c.category_id = s.category_id 
GROUP BY c.category_id, c.category_name 
ORDER BY total_services DESC;

-- 4.2 GROUP BY: Total completed bookings and gross revenue per service provider
-- Purpose: Financial and performance aggregation per provider dimension
SELECT 
    pp.provider_id, 
    u.full_name AS provider_name, 
    COUNT(b.booking_id) AS completed_bookings, 
    SUM(b.service_price) AS total_revenue 
FROM provider_profiles pp 
JOIN users u ON pp.user_id = u.user_id 
JOIN services s ON pp.provider_id = s.provider_id 
JOIN bookings b ON s.service_id = b.service_id 
WHERE b.booking_status = 'COMPLETED' 
GROUP BY pp.provider_id, u.full_name 
ORDER BY total_revenue DESC;


-- ============================================================================
-- SECTION 5: HAVING QUERIES (2 Queries)
-- ============================================================================

-- 5.1 HAVING: Categories having at least 1 service AND average price strictly > ₹1,000
-- Purpose: Post-aggregation group filtering on count and average
SELECT 
    c.category_id, 
    c.category_name, 
    COUNT(s.service_id) AS service_count, 
    ROUND(AVG(s.price), 2) AS avg_price 
FROM categories c 
JOIN services s ON c.category_id = s.category_id 
GROUP BY c.category_id, c.category_name 
HAVING COUNT(s.service_id) >= 1 
   AND AVG(s.price) > 1000 
ORDER BY avg_price DESC;

-- 5.2 HAVING: Providers with at least 1 customer review having an average rating of 4.0 or above
-- Purpose: Post-aggregation group filtering on review count and satisfaction rating
SELECT 
    pp.provider_id, 
    u.full_name AS provider_name, 
    COUNT(r.review_id) AS review_count, 
    ROUND(AVG(r.rating), 2) AS avg_rating 
FROM provider_profiles pp 
JOIN users u ON pp.user_id = u.user_id 
JOIN services s ON pp.provider_id = s.provider_id 
JOIN bookings b ON s.service_id = b.service_id 
JOIN reviews r ON b.booking_id = r.booking_id 
GROUP BY pp.provider_id, u.full_name 
HAVING COUNT(r.review_id) >= 1 
   AND AVG(r.rating) >= 4.0 
ORDER BY avg_rating DESC;


-- ============================================================================
-- SECTION 6: PATTERN MATCHING QUERIES (LIKE & BETWEEN - 3 Queries)
-- ============================================================================

-- 6.1 Pattern Matching (LIKE): Filter users registered with demo email domain
-- Purpose: Wildcard suffix matching
SELECT 
    user_id, 
    full_name, 
    email, 
    role 
FROM users 
WHERE email LIKE '%.demo@example.test' 
ORDER BY user_id ASC;

-- 6.2 Pattern Matching (ILIKE): Keyword search in service names or descriptions
-- Purpose: Case-insensitive substring matching for marketplace search
SELECT 
    service_id, 
    service_name, 
    description, 
    price 
FROM services 
WHERE service_name ILIKE '%repair%' 
   OR description ILIKE '%clean%' 
ORDER BY price ASC;

-- 6.3 Pattern Matching / Range (BETWEEN): Services priced between ₹800 and ₹2,000
-- Purpose: Closed interval boundary matching
SELECT 
    service_id, 
    service_name, 
    price, 
    estimated_duration 
FROM services 
WHERE price BETWEEN 800 AND 2000 
ORDER BY price ASC;
