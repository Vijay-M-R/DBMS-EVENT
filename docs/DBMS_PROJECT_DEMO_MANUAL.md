# DBMS-EVENT: Comprehensive Project Architecture, Requirements Mapping & Viva Demonstration Manual

**Course:** Database Management Systems (24CS520)  
**Academic Year:** 2026  
**Institution:** CSE, SJCE, JSS STU Mysuru  
**Project Title:** Taskora — Freelance Service Marketplace  
**Target RDBMS:** PostgreSQL 16+  
**Stack:** Native Node.js (Zero Express/Frameworks), Vanilla ES6+ HTML5/CSS3 (Vite), PostgreSQL 16+

---

## 1. Executive Project Overview & Architectural Topology

Taskora is a multi-sided relational database platform engineered to connect three primary platform actors:
1. **Customers:** Discover local freelance services, review verified credentials, book real-time availability slots, manage multi-address delivery endpoints, and submit authenticated post-service reviews.
2. **Service Providers:** Create and manage catalog listings, schedule discrete availability time windows, accept/reject booking reservations, and build reputation through trigger-calculated rating metrics.
3. **Platform Administrators:** Vague governance, provider background verification, user suspension/deactivation, service catalog moderation, immutable audit logging, and executive report generation.

```
       ┌────────────────────────────────────────────────────────┐
       │                   FRONTEND CLIENTS                     │
       │  • Landing Page (index.html)     • Login/Register      │
       │  • Customer Portal               • Provider Portal     │
       │  • Administrator Governance & Reports Portal           │
       └───────────────────────────┬────────────────────────────┘
                                   │ HTTP/JSON + JWT
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │             NATIVE NODE.JS BACKEND (HTTP)              │
       │  • Pure Node.js http.createServer (No Express/Fastify) │
       │  • Custom RegExp Routing Engine                        │
       │  • Role-Based Access Control Middleware (RBAC)         │
       │  • Parameter Validation & Sanitization Layer           │
       └───────────────────────────┬────────────────────────────┘
                                   │ Connection Pool (pg)
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │              POSTGRESQL 16+ DATABASE ENGINE            │
       │  • Exactly 10 Normalized Relational Tables (1NF to 3NF)│
       │  • Constraints (PK, FK, CHECK, UNIQUE, EXCLUDE)        │
       │  • Partial Unique Indexes (Double-Booking Elimination) │
       │  • 2 Views (v_provider_performance, v_customer_summary)│
       │  • 2 Stored Procedures (complete_booking, cancel_...)  │
       │  • Business Triggers (Rating Recalc, Slot State Sync)  │
       └────────────────────────────────────────────────────────┘
```

---

## 2. Page 1 Requirements: Implementation, Mapping & Terminal Commands

### 2.1 Schema Design: 10 Tables ($\ge 6$ Required) & 5+ Attributes/Table
- **Database Layer:** Exactly 10 tables defined in `database/schema.sql` (`users`, `customer_profiles`, `provider_profiles`, `categories`, `services`, `availability_slots`, `bookings`, `reviews`, `addresses`, `admin_logs`). Every table features synthetic `BIGINT IDENTITY` primary keys, foreign key cascading strategies, and 6 to 11 atomic attributes.
- **Backend Layer:** Native models and schema migration scripts (`backend/database/migrate.js`, `backend/database/seed.js`).
- **Terminal Verification:**
  ```sql
  -- Run in psql:
  SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
  -- Output: 10 rows (addresses, admin_logs, availability_slots, bookings, categories, customer_profiles, provider_profiles, reviews, services, users)
  ```

---

### 2.2 Simple Queries (5 Required)

#### Query 1.1: Active Service Categories Alphabetical Catalog
- **Purpose:** Standard table projection with ascending lexical sorting.
- **Backend Service:** `CategoryService.getAllCategories()`
- **Frontend Appearance:** Rendered in category filter pills on Customer (`/customer/index.html`) and Provider services modal.
- **SQL Statement:**
  ```sql
  SELECT category_id, category_name, description 
  FROM categories 
  ORDER BY category_name ASC;
  ```
- **Terminal Execution:**
  ```bash
  psql -U postgres -d freelance_marketplace -c "SELECT category_id, category_name, description FROM categories ORDER BY category_name ASC;"
  ```
- **Sample Output:**
  ```
   category_id | category_name |                  description                  
  -------------+---------------+-----------------------------------------------
             5 | Carpentry     | Furniture and woodwork
             4 | Cleaning      | Residential cleaning
             1 | Electrical    | Electrical installation and repair
             6 | Photography   | Portrait and event photography
             2 | Plumbing      | Water and pipe services
             3 | Tutoring      | Academic tutoring
  ```

#### Query 1.2: Experienced Verified Service Providers
- **Purpose:** Multi-condition filtering combining verification governance state with numerical experience threshold.
- **Backend Service:** `ProviderService.getProviders({ verificationStatus: 'VERIFIED' })`
- **Frontend Appearance:** Displayed as verified provider profile cards with verified badges in Customer browse section.
- **SQL Statement:**
  ```sql
  SELECT provider_id, experience_years, service_city, average_rating 
  FROM provider_profiles 
  WHERE verification_status = 'VERIFIED' 
    AND experience_years >= 5 
  ORDER BY experience_years DESC;
  ```
- **Terminal Execution:**
  ```bash
  psql -U postgres -d freelance_marketplace -c "SELECT provider_id, experience_years, service_city, average_rating FROM provider_profiles WHERE verification_status = 'VERIFIED' AND experience_years >= 5 ORDER BY experience_years DESC;"
  ```

#### Query 1.3: Budget-Friendly Services (< ₹1,500)
- **Purpose:** Numerical boundary filtering to identify entry-level, affordable service offerings.
- **Backend Service:** `ServiceService.getAllServices({ maxPrice: 1500 })`
- **Frontend Appearance:** Filtered marketplace service cards with prices formatted as green currency tags (`₹850`, `₹1,200`).
- **SQL Statement:**
  ```sql
  SELECT service_id, service_name, price, estimated_duration 
  FROM services 
  WHERE price < 1500 
  ORDER BY price ASC;
  ```
- **Terminal Execution:**
  ```bash
  psql -U postgres -d freelance_marketplace -c "SELECT service_id, service_name, price, estimated_duration FROM services WHERE price < 1500 ORDER BY price ASC;"
  ```

#### Query 1.4: Fulfilled / Completed Customer Bookings
- **Purpose:** State machine enumeration matching to pull concluded contracts for settlement and review authorization.
- **Backend Service:** `BookingService.getBookings({ status: 'COMPLETED' })`
- **Frontend Appearance:** "My Bookings" tab with green `COMPLETED` badges, revealing the "Leave Review" button.
- **SQL Statement:**
  ```sql
  SELECT booking_id, customer_id, service_id, service_price, booking_status 
  FROM bookings 
  WHERE booking_status = 'COMPLETED' 
  ORDER BY booking_id ASC;
  ```
- **Terminal Execution:**
  ```bash
  psql -U postgres -d freelance_marketplace -c "SELECT booking_id, customer_id, service_id, service_price, booking_status FROM bookings WHERE booking_status = 'COMPLETED' ORDER BY booking_id ASC;"
  ```

#### Query 1.5: Primary / Default Customer Addresses
- **Purpose:** Boolean predicate retrieval determining dispatch addresses for service orders.
- **Backend Service:** `CustomerService.getAddresses()`
- **Frontend Appearance:** Pre-selected default radio button on checkout booking modal.
- **SQL Statement:**
  ```sql
  SELECT address_id, customer_id, address_line, city, pincode 
  FROM addresses 
  WHERE is_default = TRUE 
  ORDER BY address_id ASC;
  ```
- **Terminal Execution:**
  ```bash
  psql -U postgres -d freelance_marketplace -c "SELECT address_id, customer_id, address_line, city, pincode FROM addresses WHERE is_default = TRUE ORDER BY address_id ASC;"
  ```

---

### 2.3 Nested Queries (5 Required)

#### Query 2.1: Scalar Subquery in WHERE Clause
- **Purpose:** Identifies services priced strictly above the aggregate platform-wide average price.
- **Relational Concept:** The inner query `(SELECT AVG(price) FROM services)` returns a single scalar float value evaluated once.
- **SQL Statement:**
  ```sql
  SELECT service_id, service_name, price 
  FROM services 
  WHERE price > (SELECT AVG(price) FROM services) 
  ORDER BY price DESC;
  ```
- **Terminal Execution:**
  ```bash
  psql -U postgres -d freelance_marketplace -c "SELECT service_id, service_name, price FROM services WHERE price > (SELECT AVG(price) FROM services) ORDER BY price DESC;"
  ```

#### Query 2.2: Subquery with `IN` Set Membership
- **Purpose:** Identifies customers who have engaged services within the 'Electrical' category domain.
- **Relational Concept:** Multi-row subquery returning an array of candidate keys evaluated via dynamic hash semi-join.
- **SQL Statement:**
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
- **Terminal Execution:**
  ```bash
  psql -U postgres -d freelance_marketplace -c "SELECT customer_id, user_id FROM customer_profiles WHERE customer_id IN (SELECT b.customer_id FROM bookings b JOIN services s ON b.service_id = s.service_id JOIN categories c ON s.category_id = c.category_id WHERE c.category_name = 'Electrical');"
  ```

#### Query 2.3: Subquery with `NOT IN` Non-Membership
- **Purpose:** Identifies registered customer profiles that have never initiated a booking transaction (churn / cold-start analysis).
- **SQL Statement:**
  ```sql
  SELECT customer_id, date_of_birth, gender 
  FROM customer_profiles 
  WHERE customer_id NOT IN (
      SELECT DISTINCT customer_id 
      FROM bookings
  );
  ```
- **Terminal Execution:**
  ```bash
  psql -U postgres -d freelance_marketplace -c "SELECT customer_id, date_of_birth, gender FROM customer_profiles WHERE customer_id NOT IN (SELECT DISTINCT customer_id FROM bookings);"
  ```

#### Query 2.4: Subquery with `MAX` Aggregate Operator
- **Purpose:** Locates the provider and listing offering the single highest-priced premium service without hardcoding figures.
- **SQL Statement:**
  ```sql
  SELECT provider_id, service_name, price 
  FROM services 
  WHERE price = (SELECT MAX(price) FROM services);
  ```
- **Terminal Execution:**
  ```bash
  psql -U postgres -d freelance_marketplace -c "SELECT provider_id, service_name, price FROM services WHERE price = (SELECT MAX(price) FROM services);"
  ```

#### Query 2.5: Derived Table / Subquery in FROM Clause (Inline View)
- **Purpose:** Computes category average service prices in a derived virtual relation, filtering only high-value categories ($> ₹1,000$).
- **SQL Statement:**
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
- **Terminal Execution:**
  ```bash
  psql -U postgres -d freelance_marketplace -c "SELECT category_name, avg_price FROM (SELECT c.category_name, ROUND(AVG(s.price), 2) AS avg_price FROM categories c JOIN services s ON c.category_id = s.category_id GROUP BY c.category_name) AS cat_summary WHERE avg_price > 1000 ORDER BY avg_price DESC;"
  ```

---

### 2.4 SET Operations (UNION, INTERSECT, EXCEPT)

#### Query 3.1: `UNION` (Consolidated Member Roster)
- **Mathematical Concept:** Set union ($R \cup S$) merging customer and provider user records, automatically eliminating duplicates.
- **SQL Statement:**
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
- **Terminal Execution:**
  ```bash
  psql -U postgres -d freelance_marketplace -c "SELECT user_id, full_name, email, role FROM users WHERE role = 'CUSTOMER' UNION SELECT user_id, full_name, email, role FROM users WHERE role = 'PROVIDER' ORDER BY full_name ASC;"
  ```

#### Query 3.2: `INTERSECT` (Geographical Service Overlap)
- **Mathematical Concept:** Set intersection ($R \cap S$) isolating cities where both demand (customers) and supply (verified providers) coexist.
- **SQL Statement:**
  ```sql
  SELECT city 
  FROM addresses 
  INTERSECT 
  SELECT service_city AS city 
  FROM provider_profiles 
  WHERE verification_status = 'VERIFIED';
  ```
- **Terminal Execution:**
  ```bash
  psql -U postgres -d freelance_marketplace -c "SELECT city FROM addresses INTERSECT SELECT service_city AS city FROM provider_profiles WHERE verification_status = 'VERIFIED';"
  ```

#### Query 3.3: `EXCEPT` (Inactive User Differential)
- **Mathematical Concept:** Set difference ($R \setminus S$) discovering users who have neither created a booking nor provided a booked service.
- **SQL Statement:**
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
- **Terminal Execution:**
  ```bash
  psql -U postgres -d freelance_marketplace -c "SELECT user_id, full_name FROM users WHERE role IN ('CUSTOMER', 'PROVIDER') EXCEPT (SELECT u.user_id, u.full_name FROM users u JOIN customer_profiles cp ON u.user_id = cp.user_id JOIN bookings b ON cp.customer_id = b.customer_id UNION SELECT u.user_id, u.full_name FROM users u JOIN provider_profiles pp ON u.user_id = pp.user_id JOIN services s ON pp.provider_id = s.provider_id JOIN bookings b ON s.service_id = b.service_id);"
  ```

---

### 2.5 GROUP BY Queries (2 Required)

#### Query 4.1: Service Distribution & Average Pricing per Category
- **Purpose:** Groups listings by category to assess marketplace depth and average tier pricing.
- **Frontend Appearance:** Admin Dashboard category overview table and Executive Financial Report table.
- **SQL Statement:**
  ```sql
  SELECT 
      c.category_id, 
      c.category_name, 
      COUNT(s.service_id) AS total_services, 
      ROUND(AVG(s.price), 2) AS avg_price 
  FROM categories c 
  LEFT JOIN services s ON c.category_id = s.category_id 
  GROUP BY c.category_id, c.category_name 
  ORDER BY total_services DESC;
  ```
- **Terminal Execution:**
  ```bash
  psql -U postgres -d freelance_marketplace -c "SELECT c.category_id, c.category_name, COUNT(s.service_id) AS total_services, ROUND(AVG(s.price), 2) AS avg_price FROM categories c LEFT JOIN services s ON c.category_id = s.category_id GROUP BY c.category_id, c.category_name ORDER BY total_services DESC;"
  ```

#### Query 4.2: Fulfilled Orders & Gross Revenue per Provider
- **Purpose:** Aggregates completed booking volume and total payout revenue earned per service professional.
- **Frontend Appearance:** Provider Portal Earnings overview card (`Completed Jobs: X`, `Revenue: ₹Y`).
- **SQL Statement:**
  ```sql
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
  ```
- **Terminal Execution:**
  ```bash
  psql -U postgres -d freelance_marketplace -c "SELECT pp.provider_id, u.full_name AS provider_name, COUNT(b.booking_id) AS completed_bookings, SUM(b.service_price) AS total_revenue FROM provider_profiles pp JOIN users u ON pp.user_id = u.user_id JOIN services s ON pp.provider_id = s.provider_id JOIN bookings b ON s.service_id = b.service_id WHERE b.booking_status = 'COMPLETED' GROUP BY pp.provider_id, u.full_name ORDER BY total_revenue DESC;"
  ```

---

### 2.6 HAVING Queries (2 Required)

#### Query 5.1: Categories with High-Value Catalog Pricing
- **Relational Concept:** Filtering aggregated groups post-projection. WHERE filters tuples before aggregation; HAVING filters groups after aggregate calculation.
- **SQL Statement:**
  ```sql
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
  ```
- **Terminal Execution:**
  ```bash
  psql -U postgres -d freelance_marketplace -c "SELECT c.category_id, c.category_name, COUNT(s.service_id) AS service_count, ROUND(AVG(s.price), 2) AS avg_price FROM categories c JOIN services s ON c.category_id = s.category_id GROUP BY c.category_id, c.category_name HAVING COUNT(s.service_id) >= 1 AND AVG(s.price) > 1000 ORDER BY avg_price DESC;"
  ```

#### Query 5.2: Elite Quality Providers (Reviews $\ge 1$ & Rating $\ge 4.0$)
- **Purpose:** Post-grouping filter isolating high-reputation providers who possess genuine customer feedback.
- **SQL Statement:**
  ```sql
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
  ```
- **Terminal Execution:**
  ```bash
  psql -U postgres -d freelance_marketplace -c "SELECT pp.provider_id, u.full_name AS provider_name, COUNT(r.review_id) AS review_count, ROUND(AVG(r.rating), 2) AS avg_rating FROM provider_profiles pp JOIN users u ON pp.user_id = u.user_id JOIN services s ON pp.provider_id = s.provider_id JOIN bookings b ON s.service_id = b.service_id JOIN reviews r ON b.booking_id = r.booking_id GROUP BY pp.provider_id, u.full_name HAVING COUNT(r.review_id) >= 1 AND AVG(r.rating) >= 4.0 ORDER BY avg_rating DESC;"
  ```

---

### 2.7 Pattern Matching: LIKE, ILIKE & BETWEEN (3 Required)

#### Query 6.1: Domain Wildcard Pattern (`LIKE`)
- **SQL Statement:**
  ```sql
  SELECT user_id, full_name, email, role 
  FROM users 
  WHERE email LIKE '%.demo@example.test' 
  ORDER BY user_id ASC;
  ```
- **Terminal Execution:**
  ```bash
  psql -U postgres -d freelance_marketplace -c "SELECT user_id, full_name, email, role FROM users WHERE email LIKE '%.demo@example.test' ORDER BY user_id ASC;"
  ```

#### Query 6.2: Case-Insensitive Substring Match (`ILIKE`)
- **Purpose:** Powers the global service search bar on the Customer Portal. Matches keywords anywhere inside service names or descriptions.
- **SQL Statement:**
  ```sql
  SELECT service_id, service_name, description, price 
  FROM services 
  WHERE service_name ILIKE '%repair%' 
     OR description ILIKE '%clean%' 
  ORDER BY price ASC;
  ```
- **Terminal Execution:**
  ```bash
  psql -U postgres -d freelance_marketplace -c "SELECT service_id, service_name, description, price FROM services WHERE service_name ILIKE '%repair%' OR description ILIKE '%clean%' ORDER BY price ASC;"
  ```

#### Query 6.3: Closed Numerical Interval (`BETWEEN`)
- **Purpose:** Powers the Customer Portal budget slider filter (`Min: ₹800`, `Max: ₹2000`).
- **SQL Statement:**
  ```sql
  SELECT service_id, service_name, price, estimated_duration 
  FROM services 
  WHERE price BETWEEN 800 AND 2000 
  ORDER BY price ASC;
  ```
- **Terminal Execution:**
  ```bash
  psql -U postgres -d freelance_marketplace -c "SELECT service_id, service_name, price, estimated_duration FROM services WHERE price BETWEEN 800 AND 2000 ORDER BY price ASC;"
  ```

---

## 3. Page 2 Requirements: Advanced Relational Constructs & UI

### 3.1 Correlated Subquery (1 Required)
- **Relational Concept:** Unlike a nested subquery that executes once globally, a correlated query re-evaluates the inner subquery for *every candidate tuple* in the outer query because it references outer attribute `pp.service_city`.
- **Purpose:** Identifies providers whose personal average customer rating beats their geographical city benchmark.
- **SQL Statement:**
  ```sql
  SELECT 
      pp.provider_id, 
      u.full_name AS provider_name, 
      pp.service_city, 
      pp.average_rating 
  FROM provider_profiles pp 
  JOIN users u ON u.user_id = pp.user_id 
  WHERE pp.average_rating > (
      SELECT AVG(pp2.average_rating) 
      FROM provider_profiles pp2 
      WHERE pp2.service_city = pp.service_city
  )
  ORDER BY pp.average_rating DESC;
  ```
- **Terminal Execution:**
  ```bash
  psql -U postgres -d freelance_marketplace -c "SELECT pp.provider_id, u.full_name, pp.service_city, pp.average_rating FROM provider_profiles pp JOIN users u ON u.user_id = pp.user_id WHERE pp.average_rating > (SELECT AVG(pp2.average_rating) FROM provider_profiles pp2 WHERE pp2.service_city = pp.service_city) ORDER BY pp.average_rating DESC;"
  ```

---

### 3.2 Database Views (2 Required)

#### View 1: `v_provider_performance`
- **Purpose:** Precomputes a consolidated, read-optimized virtualization of provider reputation, catalog size, and fulfillment record.
- **SQL Definition:**
  ```sql
  CREATE OR REPLACE VIEW v_provider_performance AS
  SELECT 
      pp.provider_id,
      u.full_name AS provider_name,
      pp.service_city,
      pp.verification_status,
      COUNT(DISTINCT s.service_id) AS total_services,
      COUNT(DISTINCT b.booking_id) FILTER (WHERE b.booking_status = 'COMPLETED') AS completed_bookings,
      pp.average_rating,
      pp.total_reviews
  FROM provider_profiles pp
  JOIN users u ON pp.user_id = u.user_id
  LEFT JOIN services s ON pp.provider_id = s.provider_id
  LEFT JOIN bookings b ON s.service_id = b.service_id
  GROUP BY pp.provider_id, u.full_name, pp.service_city, pp.verification_status, pp.average_rating, pp.total_reviews;
  ```
- **Terminal Querying:**
  ```bash
  psql -U postgres -d freelance_marketplace -c "SELECT * FROM v_provider_performance ORDER BY average_rating DESC;"
  ```

#### View 2: `v_customer_booking_summary`
- **Purpose:** Eliminates repetitive 6-table joins when querying full booking contract histories.
- **SQL Definition:**
  ```sql
  CREATE OR REPLACE VIEW v_customer_booking_summary AS
  SELECT 
      b.booking_id,
      b.customer_id,
      u_c.full_name AS customer_name,
      s.service_id,
      s.service_name,
      c.category_name,
      u_p.full_name AS provider_name,
      b.service_price,
      b.booking_status,
      b.booking_date,
      r.rating AS review_rating
  FROM bookings b
  JOIN customer_profiles cp ON b.customer_id = cp.customer_id
  JOIN users u_c ON cp.user_id = u_c.user_id
  JOIN services s ON b.service_id = s.service_id
  JOIN categories c ON s.category_id = c.category_id
  JOIN provider_profiles pp ON s.provider_id = pp.provider_id
  JOIN users u_p ON pp.user_id = u_p.user_id
  LEFT JOIN reviews r ON b.booking_id = r.booking_id;
  ```
- **Terminal Querying:**
  ```bash
  psql -U postgres -d freelance_marketplace -c "SELECT * FROM v_customer_booking_summary ORDER BY booking_id DESC LIMIT 5;"
  ```

---

### 3.3 EXISTS and NOT EXISTS (2 Required)

#### Query: `EXISTS` (Customers with Fulfilled History)
- **Concept:** Short-circuit evaluation that stops scanning rows immediately upon the first matching tuple ($O(1)$ per outer row).
- **SQL Statement:**
  ```sql
  SELECT cp.customer_id, u.full_name, u.email 
  FROM customer_profiles cp 
  JOIN users u ON u.user_id = cp.user_id 
  WHERE EXISTS (
      SELECT 1 FROM bookings b 
      WHERE b.customer_id = cp.customer_id 
        AND b.booking_status = 'COMPLETED'
  );
  ```
- **Terminal Execution:**
  ```bash
  psql -U postgres -d freelance_marketplace -c "SELECT cp.customer_id, u.full_name, u.email FROM customer_profiles cp JOIN users u ON u.user_id = cp.user_id WHERE EXISTS (SELECT 1 FROM bookings b WHERE b.customer_id = cp.customer_id AND b.booking_status = 'COMPLETED');"
  ```

#### Query: `NOT EXISTS` (Verified Providers without Catalog Listings)
- **Concept:** Anti-semijoin discovering verified accounts that have stalled onboarding without publishing services.
- **SQL Statement:**
  ```sql
  SELECT pp.provider_id, u.full_name, pp.service_city 
  FROM provider_profiles pp 
  JOIN users u ON u.user_id = pp.user_id 
  WHERE pp.verification_status = 'VERIFIED' 
    AND NOT EXISTS (
      SELECT 1 FROM services s 
      WHERE s.provider_id = pp.provider_id 
        AND s.service_status = 'ACTIVE'
  );
  ```
- **Terminal Execution:**
  ```bash
  psql -U postgres -d freelance_marketplace -c "SELECT pp.provider_id, u.full_name, pp.service_city FROM provider_profiles pp JOIN users u ON u.user_id = pp.user_id WHERE pp.verification_status = 'VERIFIED' AND NOT EXISTS (SELECT 1 FROM services s WHERE s.provider_id = pp.provider_id AND s.service_status = 'ACTIVE');"
  ```

---

### 3.4 Aggregate Functions (4 Required: COUNT, SUM, AVG, MIN, MAX)
- **Purpose:** Executive catalog analytical summary computed in a single query pass.
- **SQL Statement:**
  ```sql
  SELECT 
      COUNT(service_id)                 AS total_active_services,
      SUM(price)                        AS total_catalog_value,
      ROUND(AVG(price), 2)              AS average_service_price,
      MIN(price)                        AS minimum_service_price,
      MAX(price)                        AS maximum_service_price,
      ROUND(AVG(estimated_duration), 0) AS average_duration_minutes
  FROM services 
  WHERE service_status = 'ACTIVE';
  ```
- **Terminal Execution:**
  ```bash
  psql -U postgres -d freelance_marketplace -c "SELECT COUNT(service_id) AS total_active_services, SUM(price) AS total_catalog_value, ROUND(AVG(price), 2) AS average_service_price, MIN(price) AS minimum_service_price, MAX(price) AS maximum_service_price FROM services WHERE service_status = 'ACTIVE';"
  ```

---

### 3.5 Database Triggers (2 Required Business Triggers)

#### Trigger 1: `trg_sync_slot_status` on `bookings`
- **Purpose:** Guarantees two-way synchronization between availability slots and order lifecycle without relying on application-level code.
- **Mechanism:**
  - When `bookings.booking_status` is inserted or updated to `'PENDING'` or `'ACCEPTED'`, the referenced `availability_slots.slot_status` is automatically updated to `'BOOKED'`.
  - When a booking transitions to `'CANCELLED'` or `'REJECTED'`, the slot is automatically released back to `'AVAILABLE'`.
- **Definition in `schema.sql`:**
  ```sql
  CREATE OR REPLACE FUNCTION sync_slot_on_booking_change()
  RETURNS TRIGGER AS $$
  BEGIN
      IF (TG_OP = 'INSERT') OR (NEW.booking_status <> OLD.booking_status) THEN
          IF NEW.booking_status IN ('PENDING', 'ACCEPTED') THEN
              UPDATE availability_slots SET slot_status = 'BOOKED' WHERE slot_id = NEW.slot_id;
          ELSIF NEW.booking_status IN ('CANCELLED', 'REJECTED') THEN
              UPDATE availability_slots SET slot_status = 'AVAILABLE' WHERE slot_id = NEW.slot_id;
          END IF;
      END IF;
      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER trg_sync_slot_status
  AFTER INSERT OR UPDATE OF booking_status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION sync_slot_on_booking_change();
  ```

#### Trigger 2: `trg_update_provider_ratings` on `reviews`
- **Purpose:** Maintains a denormalized cache (`average_rating` and `total_reviews`) on `provider_profiles` to eliminate expensive real-time table scans during catalog browsing.
- **Mechanism:**
  - Fires after every `INSERT`, `UPDATE`, or `DELETE` on the `reviews` table.
  - Automatically walks the foreign keys: `review` $\to$ `booking` $\to$ `service` $\to$ `provider_id`.
  - Re-aggregates `AVG(rating)` and `COUNT(*)` for that provider and writes back the updated figures.

---

### 3.6 Stored Procedures (2 Required)

#### Procedure 1: `complete_booking(p_booking_id BIGINT)`
- **Purpose:** Executes safe transactional state progression for order fulfillment.
- **SQL Definition:**
  ```sql
  CREATE OR REPLACE PROCEDURE complete_booking(p_booking_id BIGINT)
  LANGUAGE plpgsql AS $$
  BEGIN
      UPDATE bookings 
      SET booking_status = 'COMPLETED',
          updated_at = CURRENT_TIMESTAMP
      WHERE booking_id = p_booking_id 
        AND booking_status = 'ACCEPTED';
        
      IF NOT FOUND THEN
          RAISE EXCEPTION 'Booking with ID % does not exist or is not in ACCEPTED status', p_booking_id;
      END IF;
  END;
  $$;
  ```
- **Terminal Invocation:**
  ```sql
  CALL complete_booking(1);
  ```

#### Procedure 2: `cancel_booking(p_booking_id BIGINT, p_reason TEXT)`
- **Purpose:** Performs multi-table cascading cancellation: marks order as cancelled, logs audit reason, and unlocks the schedule slot.
- **SQL Definition:**
  ```sql
  CREATE OR REPLACE PROCEDURE cancel_booking(p_booking_id BIGINT, p_reason TEXT)
  LANGUAGE plpgsql AS $$
  DECLARE
      v_slot_id BIGINT;
      v_current_status VARCHAR(20);
  BEGIN
      SELECT slot_id, booking_status INTO v_slot_id, v_current_status
      FROM bookings WHERE booking_id = p_booking_id;
      
      IF NOT FOUND THEN
          RAISE EXCEPTION 'Booking with ID % does not exist', p_booking_id;
      END IF;

      IF v_current_status IN ('COMPLETED', 'CANCELLED') THEN
          RAISE EXCEPTION 'Cannot cancel booking % because it is already in % status', p_booking_id, v_current_status;
      END IF;

      UPDATE bookings 
      SET booking_status = 'CANCELLED',
          cancellation_reason = p_reason,
          updated_at = CURRENT_TIMESTAMP
      WHERE booking_id = p_booking_id;

      IF v_slot_id IS NOT NULL THEN
          UPDATE availability_slots
          SET slot_status = 'AVAILABLE',
              updated_at = CURRENT_TIMESTAMP
          WHERE slot_id = v_slot_id;
      END IF;
  END;
  $$;
  ```
- **Terminal Invocation:**
  ```sql
  CALL cancel_booking(2, 'Customer had a schedule conflict');
  ```

---

### 3.7 Frontend Forms (Minimum 5 Forms Required)
Over 10 fully styled, validated HTML forms are implemented across the frontend:
1. **User Registration Form (`#register-form` in `frontend/login.html`):** Data entry for name, email, phone, password, role selection (Customer vs. Provider).
2. **User Login Form (`#login-form` in `frontend/login.html`):** Authentication credential submission.
3. **Customer Booking Creation Form (`#booking-form` in `frontend/customer/index.html`):** Data entry selecting slot, address, and special service notes.
4. **Customer Review Submission Form (`#review-form` in `frontend/customer/index.html`):** Data entry for 1-5 star rating and feedback comment.
5. **Customer Profile & Address Update Form (`#profile-form` in `frontend/customer/index.html`):** Update form for DOB, gender, and multi-address management.
6. **Provider Service Creation Form (`#service-form` in `frontend/provider/index.html`):** Data entry for title, description, category ID, price, and duration.
7. **Provider Availability Slot Form (`#slot-form` in `frontend/provider/index.html`):** Data entry for date, start time, and end time.
8. **Provider Profile Update Form (`#profile-form` in `frontend/provider/index.html`):** Update form for experience, bio, and service city.
9. **Admin Category Management Form (`#category-form` in `frontend/admin/index.html`):** Data entry/update for category title and description.
10. **Admin Moderation & Governance Form (`#action-confirm-form` in `frontend/admin/index.html`):** Mandatory reason submission for verification, suspension, or rejection.

---

### 3.8 Two Executive Report Generations (In Admin Portal)

Accessible directly under the **📑 Executive Reports (2)** sidebar navigation tab in the Admin portal (`frontend/admin/index.html`):

#### Report 1: Platform Financial & Revenue Summary Report
- **API Endpoint:** `GET /api/v1/admin/reports/financial`
- **Database Sourcing:** `bookings` table aggregates + View `v_customer_booking_summary`.
- **Contents:**
  - Executive KPI Cards: Realized Gross Revenue, Total Completed Bookings, Average Booking Value, Lost Cancelled Volume.
  - Category Fiscal Breakdown: Category ID, Name, Bookings Count, Completed Orders, Category Revenue, Mean Price.
  - Recent Settled Transactions Table with customer names, provider names, service titles, prices, and review scores.
- **Export Capabilities:** One-click **🖨️ Print / Save PDF** (clean print CSS formatting) and **📥 Export CSV** (`financial_revenue_report.csv`).

#### Report 2: Provider Performance & Quality Audit Report
- **API Endpoint:** `GET /api/v1/admin/reports/providers`
- **Database Sourcing:** Database View `v_provider_performance`.
- **Contents:**
  - Executive KPI Cards: Registered Providers, Verified Providers, Platform Average Star Rating, Total Trigger-Calculated Reviews.
  - Quality Audit Table: Provider ID, Name, City, Verification Badge, Active Services Count, Completed Orders, Trigger-Maintained Rating (★), Total Reviews.
- **Export Capabilities:** One-click **🖨️ Print / Save PDF** and **📥 Export CSV** (`provider_performance_report.csv`).

---

## 4. Master Viva Voce Training & Faculty Q&A

| Viva Question | Concise Academic Answer |
| :--- | :--- |
| **Q1: Why did your team use PostgreSQL instead of MySQL?** | "PostgreSQL offers advanced object-relational features required for enterprise grade DBMS design: partial unique indexes for double-booking prevention, advanced PL/pgSQL procedural language with explicit error trapping (`RAISE EXCEPTION`), flexible stored procedures (`CALL`) that manage independent transaction boundaries, rich window functions, and `FILTER (WHERE ...)` clauses within aggregate views." |
| **Q2: Explain how your schema satisfies 1NF, 2NF, and 3NF.** | • **1NF:** All attribute values are atomic (e.g., addresses are decomposed into line, city, state, pincode; timeslots into date, start_time, end_time), no repeating groups, and every table has a defined Primary Key.<br>• **2NF:** All primary keys are single-attribute synthetic keys (`BIGINT IDENTITY`), which mathematically precludes partial key dependencies.<br>• **3NF:** No non-prime attribute is transitively dependent on the primary key. Role-specific attributes are decoupled into 1:1 extension tables (`customer_profiles`, `provider_profiles`) rather than placing nullable columns in `users`." |
| **Q3: How does your database eliminate double-booking race conditions?** | "We enforce double-booking prevention at the schema level using a partial unique index: `CREATE UNIQUE INDEX uq_bookings_active_slot ON bookings (slot_id) WHERE booking_status IN ('PENDING', 'ACCEPTED');`. Even under concurrent HTTP threads, the PostgreSQL write-ahead log (WAL) rejects duplicate active reservations on the same slot with a constraint violation." |
| **Q4: What is the difference between a WHERE clause and a HAVING clause?** | "`WHERE` filters individual tuples *before* rows are grouped or aggregated. `HAVING` filters group summaries *after* the `GROUP BY` aggregation has evaluated. In our Query 5.1, `WHERE` can filter active services, while `HAVING AVG(price) > 1000` filters entire categories whose calculated mean price exceeds ₹1,000." |
| **Q5: What is the difference between a Nested Subquery and a Correlated Subquery?** | "In a **Nested Subquery**, the inner query executes once independently and returns a scalar or constant set to the outer query. In a **Correlated Subquery**, the inner query references an attribute from the outer query tuple (`WHERE pp2.service_city = pp.service_city`), meaning the inner query re-executes dynamically for each candidate record of the outer table." |
| **Q6: Why use a Stored Procedure instead of executing regular UPDATE statements in code?** | "A Stored Procedure (`CALL complete_booking(id)`) encapsulates complex business rules, validation logic, and timestamp updates directly inside the database engine. It reduces network round-trips, executes with pre-compiled plan efficiency, and ensures atomic transaction control independent of the client application." |
| **Q7: Explain the role of your two Triggers.** | "• `trg_sync_slot_status` ensures referential state consistency between bookings and provider slots. When a booking is created, the slot becomes `BOOKED`; if cancelled, it reverts to `AVAILABLE`.<br>• `trg_update_provider_ratings` automatically maintains cached summary attributes (`average_rating` and `total_reviews`) in `provider_profiles` whenever reviews are inserted or modified, avoiding expensive table-wide aggregation queries on every catalog page load." |

---

## 5. Ideal Step-by-Step Viva Demonstration Flow

To deliver a flawless viva demonstration, set up two windows side-by-side on your monitor:
- **Left Window:** Browser running the Taskora Web App (`http://localhost:5173`)
- **Right Window:** Terminal connected to PostgreSQL (`psql -U postgres -d freelance_marketplace`)

```
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│        BROWSER (Taskora UI)          │  │        TERMINAL (psql Database)      │
│                                      │  │                                      │
│  [Customer / Provider / Admin]       │  │  SELECT * FROM v_provider_performance│
│  - Book Service                      │  │  CALL complete_booking(1);           │
│  - Leave 5-Star Review               │  │  Watch trigger update ratings live   │
│  - Executive Reports (Print/CSV)     │  │                                      │
└──────────────────────────────────────┘  └──────────────────────────────────────┘
```

### Demonstration Script (Chronological Order)

#### Step 1: Demonstrate Schema Architecture & Table Count in Terminal
1. In the terminal, show the examiner that exactly 10 tables exist:
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;
   ```
2. Explain that all tables have $\ge 6$ attributes, satisfying Page 1 requirements.

#### Step 2: Demonstrate Phase 1 Core Queries in Terminal
1. Execute the Phase 1 script:
   ```bash
   \i database/phase1_queries.sql
   ```
2. Walk through the outputs:
   - Point out **Simple Query 1.1** (Alphabetical categories).
   - Point out **Nested Query 2.1** (Scalar subquery finding services above average price).
   - Point out **SET Operation 3.2** (`INTERSECT` showing matching cities between customers and providers).
   - Point out **HAVING Query 5.2** (Filtering providers having rating $\ge 4.0$).
   - Point out **Pattern Matching 6.2** (`ILIKE '%repair%'` keyword search).

#### Step 3: Demonstrate Database Views (Page 2)
1. Query View 1 (`v_provider_performance`):
   ```sql
   SELECT provider_id, provider_name, service_city, total_services, completed_bookings, average_rating, total_reviews 
   FROM v_provider_performance;
   ```
   *Explain to the faculty: "Notice Provider #1 (Suresh Electrician) currently has an average rating of 5.00 with 1 review."*
2. Query View 2 (`v_customer_booking_summary`):
   ```sql
   SELECT booking_id, customer_name, provider_name, service_name, service_price, booking_status 
   FROM v_customer_booking_summary 
   LIMIT 3;
   ```

#### Step 4: Live Frontend Action $\leftrightarrow$ Database Trigger Reflection
1. **In the Browser:** Log in as Customer (`ananya.demo@example.test` / password `Customer@1`).
2. Navigate to "My Bookings" and locate a completed booking.
3. Click **"Leave Review"**, select **5 Stars**, and write: *"Outstanding service, fixed immediately!"*
4. Click **Submit Review**.
5. **Immediately switch to the Terminal:**
   ```sql
   SELECT provider_id, average_rating, total_reviews 
   FROM provider_profiles 
   WHERE provider_id = 1;
   ```
   *Show the examiner:* **Trigger `trg_update_provider_ratings` automatically executed!** The review count incremented and the average rating was recalculated dynamically without any manual backend calculation.

#### Step 5: Demonstrate Stored Procedures (Page 2)
1. In the Terminal, query a booking currently in `ACCEPTED` status:
   ```sql
   SELECT booking_id, booking_status, updated_at FROM bookings WHERE booking_id = 6;
   ```
2. Call Stored Procedure 1:
   ```sql
   CALL complete_booking(6);
   ```
3. Re-query the booking:
   ```sql
   SELECT booking_id, booking_status, updated_at FROM bookings WHERE booking_id = 6;
   ```
   *Highlight that status transitioned to `COMPLETED` and `updated_at` was refreshed.*
4. Demonstrate Stored Procedure 2 (`cancel_booking`):
   ```sql
   CALL cancel_booking(2, 'Customer had a schedule conflict');
   ```
   *Show that booking status changed to `CANCELLED` and trigger `trg_sync_slot_status` automatically unlocked the availability slot back to `AVAILABLE`.*

#### Step 6: Demonstrate Administrator Portal & 2 Executive Reports
1. **In the Browser:** Log out and log in as Administrator (`admin.demo@example.test` / password `Admin@2026`).
2. In the Admin left sidebar, click on **📑 Executive Reports (2)**.
3. **Show Report 1 (Financial & Revenue Summary):**
   - Point out the KPI cards: Total Revenue, Completed Bookings, Average Booking Price.
   - Point out the Category Distribution Table showing real-time earnings per sector.
   - Click **📥 Export CSV** and open the downloaded `financial_revenue_report.csv`.
4. **Show Report 2 (Provider Performance & Quality Audit):**
   - Point out that this table is dynamically generated from Database View `v_provider_performance`.
   - Click **📥 Export CSV** (`provider_performance_report.csv`).
   - Click **🖨️ Print / Save PDF** to demonstrate the clean print preview.

#### Step 7: Demonstrate Automated Test Suite
In the terminal, run the test runner to prove all 37 tests pass:
```bash
cd backend
npm test
```
*Show the examiner 37 passing unit & integration tests covering all Phase 1 and Phase 2 requirements with 0 failures.*

---

## 6. Project File Inventory

| File Path | Description & Academic Purpose |
| :--- | :--- |
| [`database/schema.sql`](file:///c:/Users/Vijay%20M%20R/DBMS-EVENT/database/schema.sql) | DDL definition for all 10 tables, constraints, partial indexes, views, procedures, and triggers. |
| [`database/phase1_queries.sql`](file:///c:/Users/Vijay%20M%20R/DBMS-EVENT/database/phase1_queries.sql) | Standalone SQL script with all Page 1 queries (5 Simple, 5 Nested, 3 SET, 2 GROUP BY, 2 HAVING, 3 LIKE/BETWEEN). |
| [`database/phase2_advanced.sql`](file:///c:/Users/Vijay%20M%20R/DBMS-EVENT/database/phase2_advanced.sql) | Standalone SQL script with all Page 2 advanced queries (Correlated, 2 Views, EXISTS/NOT EXISTS, 4 Aggregates, 2 Procedures). |
| [`database/PHASE1_DEMO_GUIDE.md`](file:///c:/Users/Vijay%20M%20R/DBMS-EVENT/database/PHASE1_DEMO_GUIDE.md) | Viva guide for Phase 1 Demo. |
| [`database/PHASE2_DEMO_GUIDE.md`](file:///c:/Users/Vijay%20M%20R/DBMS-EVENT/database/PHASE2_DEMO_GUIDE.md) | Viva guide for Phase 2 Demo. |
| [`backend/tests/phase1-queries.test.js`](file:///c:/Users/Vijay%20M%20R/DBMS-EVENT/backend/tests/phase1-queries.test.js) | Automated unit tests verifying all Page 1 queries execute and return rows. |
| [`backend/tests/phase2-advanced.test.js`](file:///c:/Users/Vijay%20M%20R/DBMS-EVENT/backend/tests/phase2-advanced.test.js) | Automated integration tests verifying Page 2 Views, Procedures, Triggers, and Reports. |
| [`frontend/admin/index.html`](file:///c:/Users/Vijay%20M%20R/DBMS-EVENT/frontend/admin/index.html) | Admin portal UI containing the 2 Executive Reports tabs and export controls. |
| [`frontend/admin/admin.js`](file:///c:/Users/Vijay%20M%20R/DBMS-EVENT/frontend/admin/admin.js) | Controller logic for report fetching, DOM rendering, and CSV exports. |
