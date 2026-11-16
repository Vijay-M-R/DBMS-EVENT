# DBMS Event 1: Phase 1 Demo Guide

**Course:** Database Management Systems (24CS520)  
**Project:** Freelance Service Marketplace  
**Target RDBMS:** PostgreSQL 16+  
**Script File:** [`database/phase1_queries.sql`](file:///c:/Users/Vijay%20M%20R/DBMS-EVENT/database/phase1_queries.sql)  
**Test Suite:** `backend/tests/phase1-queries.test.js`

---

## Guideline Checklist & Verification Matrix

| Guideline Requirement (Page 1) | Specification | Implementation in Project | Verified Status |
| :--- | :--- | :--- | :---: |
| **Real World Scenario** | Selected Scenario | Freelance Service Marketplace (Customer, Provider, Admin) |  PASS |
| **RDBMS Engine** | PostgreSQL 16+ | PostgreSQL on Windows/Linux |  PASS |
| **Minimum 6 Tables** | At least 6 tables with PK, FK | **10 Tables** with explicit PK and FK constraints |  PASS |
| **Minimum 5 Attributes/Table** | At least 5 columns per table | **All 10 tables** have 6 to 11 attributes |  PASS |
| **Simple Queries** | Exactly 5 simple queries | Section 1 (Queries 1.1 to 1.5) |  PASS |
| **Nested Queries** | Exactly 5 nested subqueries | Section 2 (Queries 2.1 to 2.5) |  PASS |
| **SET Operations** | At least 2 set operations | Section 3 (`UNION`, `INTERSECT`, `EXCEPT`) |  PASS |
| **GROUP BY** | Exactly 2 grouping queries | Section 4 (Queries 4.1 & 4.2) |  PASS |
| **HAVING** | Exactly 2 post-aggregate filters | Section 5 (Queries 5.1 & 5.2) |  PASS |
| **Pattern Matching** | 3 queries using `LIKE` & `BETWEEN` | Section 6 (Queries 6.1, 6.2, 6.3) |  PASS |

---

## 1. Simple Queries (5 Queries)

### Query 1.1: Active Service Categories
- **Purpose:** Projection and alphabetical ordering of service categories.
```sql
SELECT category_id, category_name, description 
FROM categories 
ORDER BY category_name ASC;
```

### Query 1.2: Experienced Verified Providers
- **Purpose:** Multi-condition filtering on verification status and experience threshold.
```sql
SELECT provider_id, experience_years, service_city, average_rating 
FROM provider_profiles 
WHERE verification_status = 'VERIFIED' 
  AND experience_years >= 5 
ORDER BY experience_years DESC;
```

### Query 1.3: Budget-Friendly Services (< ₹1,500)
- **Purpose:** Numeric inequality comparison and ascending price order.
```sql
SELECT service_id, service_name, price, estimated_duration 
FROM services 
WHERE price < 1500 
ORDER BY price ASC;
```

### Query 1.4: Completed Bookings
- **Purpose:** Exact state matching for finished jobs.
```sql
SELECT booking_id, customer_id, service_id, service_price, booking_status 
FROM bookings 
WHERE booking_status = 'COMPLETED' 
ORDER BY booking_id ASC;
```

### Query 1.5: Default Customer Addresses
- **Purpose:** Boolean predicate matching for primary customer delivery/service points.
```sql
SELECT address_id, customer_id, address_line, city, pincode 
FROM addresses 
WHERE is_default = TRUE 
ORDER BY address_id ASC;
```

---

## 2. Nested Queries (5 Queries)

### Query 2.1: Scalar Subquery in WHERE Clause
- **Concept:** Compare service prices against dynamic average calculated across the table.
```sql
SELECT service_id, service_name, price 
FROM services 
WHERE price > (SELECT AVG(price) FROM services) 
ORDER BY price DESC;
```

### Query 2.2: Subquery with `IN` Membership
- **Concept:** Filter customers whose booking history includes the 'Electrical' category.
```sql
SELECT customer_id, user_id 
FROM customer_profiles 
WHERE customer_id IN (
    SELECT b.customer_id 
    FROM bookings b 
    JOIN services s ON b.service_id = s.service_id 
    JOIN categories c ON s.category_id = c.category_id 
    WHERE c.category_name = 'Electrical'
);
```

### Query 2.3: Subquery with `NOT IN`
- **Concept:** Identify registered customers who have never initiated a booking.
```sql
SELECT customer_id, date_of_birth, gender 
FROM customer_profiles 
WHERE customer_id NOT IN (
    SELECT DISTINCT customer_id 
    FROM bookings
);
```

### Query 2.4: Subquery with `MAX` Aggregate
- **Concept:** Dynamically identify the provider offering the highest-priced service.
```sql
SELECT provider_id, service_name, price 
FROM services 
WHERE price = (SELECT MAX(price) FROM services);
```

### Query 2.5: Derived Table (Subquery in `FROM` Clause)
- **Concept:** Aggregate data inside an inline view and apply outer filtering.
```sql
SELECT category_name, avg_price 
FROM (
    SELECT c.category_name, ROUND(AVG(s.price), 2) AS avg_price 
    FROM categories c 
    JOIN services s ON c.category_id = s.category_id 
    GROUP BY c.category_name
) AS cat_summary 
WHERE avg_price > 1000 
ORDER BY avg_price DESC;
```

---

## 3. SET Operations (UNION, INTERSECT, EXCEPT)

### Query 3.1: `UNION` (Consolidated User Directory)
- **Concept:** Combines tuples from two roles into one unique roster.
```sql
SELECT user_id, full_name, email, role 
FROM users 
WHERE role = 'CUSTOMER' 
UNION 
SELECT user_id, full_name, email, role 
FROM users 
WHERE role = 'PROVIDER' 
ORDER BY full_name ASC;
```

### Query 3.2: `INTERSECT` (Common Cities)
- **Concept:** Determines overlap between customer locations and active provider service cities.
```sql
SELECT city 
FROM addresses 
INTERSECT 
SELECT service_city AS city 
FROM provider_profiles 
WHERE verification_status = 'VERIFIED';
```

### Query 3.3: `EXCEPT` (Unbooked Users)
- **Concept:** Identifies registered user IDs that have neither placed nor received any booking.
```sql
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
```

---

## 4. GROUP BY Queries (2 Queries)

### Query 4.1: Service Distribution and Average Price per Category
- **Concept:** Group by category to analyze catalog density and average pricing.
```sql
SELECT c.category_id, c.category_name, COUNT(s.service_id) AS total_services, ROUND(AVG(s.price), 2) AS avg_price 
FROM categories c 
LEFT JOIN services s ON c.category_id = s.category_id 
GROUP BY c.category_id, c.category_name 
ORDER BY total_services DESC;
```

### Query 4.2: Completed Bookings and Gross Revenue per Provider
- **Concept:** Group by provider to aggregate order volume and total revenue generated.
```sql
SELECT pp.provider_id, u.full_name AS provider_name, COUNT(b.booking_id) AS completed_bookings, SUM(b.service_price) AS total_revenue 
FROM provider_profiles pp 
JOIN users u ON pp.user_id = u.user_id 
JOIN services s ON pp.provider_id = s.provider_id 
JOIN bookings b ON s.service_id = b.service_id 
WHERE b.booking_status = 'COMPLETED' 
GROUP BY pp.provider_id, u.full_name 
ORDER BY total_revenue DESC;
```

---

## 5. HAVING Queries (2 Queries)

### Query 5.1: Categories with High Average Pricing
- **Concept:** Filters aggregated groups to categories having services with an average price above ₹1,000.
```sql
SELECT c.category_id, c.category_name, COUNT(s.service_id) AS service_count, ROUND(AVG(s.price), 2) AS avg_price 
FROM categories c 
JOIN services s ON c.category_id = s.category_id 
GROUP BY c.category_id, c.category_name 
HAVING COUNT(s.service_id) >= 1 
   AND AVG(s.price) > 1000 
ORDER BY avg_price DESC;
```

### Query 5.2: Top-Rated Providers with Reviews
- **Concept:** Filters providers who have received reviews and maintain an average rating of at least 4.0.
```sql
SELECT pp.provider_id, u.full_name AS provider_name, COUNT(r.review_id) AS review_count, ROUND(AVG(r.rating), 2) AS avg_rating 
FROM provider_profiles pp 
JOIN users u ON pp.user_id = u.user_id 
JOIN services s ON pp.provider_id = s.provider_id 
JOIN bookings b ON s.service_id = b.service_id 
JOIN reviews r ON b.booking_id = r.booking_id 
GROUP BY pp.provider_id, u.full_name 
HAVING COUNT(r.review_id) >= 1 
   AND AVG(r.rating) >= 4.0 
ORDER BY avg_rating DESC;
```

---

## 6. Pattern Matching Queries (LIKE & BETWEEN - 3 Queries)

### Query 6.1: Domain Pattern Match (`LIKE`)
- **Concept:** Wildcard pattern matching on email address suffixes.
```sql
SELECT user_id, full_name, email, role 
FROM users 
WHERE email LIKE '%.demo@example.test' 
ORDER BY user_id ASC;
```

### Query 6.2: Keyword Substring Match (`ILIKE`)
- **Concept:** Case-insensitive substring search across service names and descriptions.
```sql
SELECT service_id, service_name, description, price 
FROM services 
WHERE service_name ILIKE '%repair%' 
   OR description ILIKE '%clean%' 
ORDER BY price ASC;
```

### Query 6.3: Closed Numerical Range (`BETWEEN`)
- **Concept:** Filtering services within an inclusive price bracket of ₹800 to ₹2,000.
```sql
SELECT service_id, service_name, price, estimated_duration 
FROM services 
WHERE price BETWEEN 800 AND 2000 
ORDER BY price ASC;
```

---

## How to Run & Verify

1. **In PostgreSQL (psql / pgAdmin):**
   ```bash
   psql -U postgres -d freelance_marketplace -f database/phase1_queries.sql
   ```

2. **Automated Test Suite (Node.js):**
   ```bash
   cd backend
   npm test
   ```
   All 30 automated backend tests (including the 6 Page 1 query validation suites) will execute and pass.
