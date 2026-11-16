# DBMS Event 1: Phase 2 Demo Guide

**Course:** Database Management Systems (24CS520)  
**Project:** Freelance Service Marketplace  
**Target RDBMS:** PostgreSQL 16+  
**Script File:** [`database/phase2_advanced.sql`](file:///c:/Users/Vijay%20M%20R/DBMS-EVENT/database/phase2_advanced.sql)  
**Test Suite:** `backend/tests/phase2-advanced.test.js`

---

## Guideline Checklist & Verification Matrix

| Guideline Requirement (Page 2) | Specification | Implementation in Project | Verified Status |
| :--- | :--- | :--- | :---: |
| **Correlated Queries** | Minimum 1 correlated query | City-wide provider rating comparison query |  PASS |
| **Views** | Exactly 2 views | `v_provider_performance` & `v_customer_booking_summary` |  PASS |
| **Exists, Not Exist** | Each 1 (2 queries total) | `EXISTS` (completed bookings) & `NOT EXISTS` (idle providers) |  PASS |
| **Aggregate Functions** | 4 aggregate functions | Multi-aggregate executive query (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`) |  PASS |
| **Triggers** | Minimum 2 business triggers | `trg_sync_slot_status` & `trg_update_provider_ratings` |  PASS |
| **Stored Procedures** | Exactly 2 stored procedures | `complete_booking(id)` & `cancel_booking(id, reason)` |  PASS |
| **Frontend with Forms** | Minimum 5 forms (Main, Data entry, retrieval, update) | Over 10 forms across Customer, Provider, and Admin portals |  PASS |
| **2 Report Generation** | Exactly 2 executive reports | 1. Financial & Revenue Report<br>2. Provider Quality & Audit Report |  PASS |

---

## 1. Correlated Query (1 Query)

### Query 1.1: Providers Outperforming Their City's Average Rating
- **Concept:** The inner subquery references the outer query's attribute (`pp.service_city`), calculating the dynamic average for that specific city.
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

---

## 2. Views (2 Views)

### View 2.1: `v_provider_performance`
- **Purpose:** Aggregates provider service counts, completed bookings, average ratings, and reviews in one reusable virtual table.
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

### View 2.2: `v_customer_booking_summary`
- **Purpose:** Denormalizes full booking history joining customer profile, provider profile, service details, category, and review score.
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

---

## 3. EXISTS and NOT EXISTS (2 Queries)

### Query 3.1: `EXISTS` (Customers with Completed Bookings)
- **Concept:** Semi-join query to find customers who have successfully concluded at least one service appointment.
```sql
SELECT 
    cp.customer_id, 
    u.full_name AS customer_name,
    u.email
FROM customer_profiles cp 
JOIN users u ON u.user_id = cp.user_id 
WHERE EXISTS (
    SELECT 1 
    FROM bookings b 
    WHERE b.customer_id = cp.customer_id 
      AND b.booking_status = 'COMPLETED'
)
ORDER BY cp.customer_id ASC;
```

### Query 3.2: `NOT EXISTS` (Verified Providers without Active Listings)
- **Concept:** Anti-join query to audit verified providers who have not yet published an active service.
```sql
SELECT 
    pp.provider_id, 
    u.full_name AS provider_name,
    pp.service_city
FROM provider_profiles pp 
JOIN users u ON u.user_id = pp.user_id 
WHERE pp.verification_status = 'VERIFIED' 
  AND NOT EXISTS (
    SELECT 1 
    FROM services s 
    WHERE s.provider_id = pp.provider_id 
      AND s.service_status = 'ACTIVE'
)
ORDER BY pp.provider_id ASC;
```

---

## 4. Aggregate Functions (COUNT, SUM, AVG, MIN, MAX)

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

---

## 5. Stored Procedures (2 Procedures)

### Procedure 5.1: `complete_booking(p_booking_id BIGINT)`
- **Purpose:** Enforces safe state transition from `ACCEPTED` to `COMPLETED` and updates the timestamp.
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

### Procedure 5.2: `cancel_booking(p_booking_id BIGINT, p_reason TEXT)`
- **Purpose:** Cancels a booking, records cancellation reason, and synchronizes the associated `availability_slots` status back to `AVAILABLE`.
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

---

## 6. Triggers (2 Business Triggers)

1. **`trg_sync_slot_status` on `bookings`:**
   - Automatically synchronizes availability slots: marks slot as `BOOKED` when a booking is created, and releases it back to `AVAILABLE` if the booking is cancelled.
2. **`trg_update_provider_ratings` on `reviews`:**
   - Automatically recalculates `average_rating` and `total_reviews` in `provider_profiles` upon `INSERT`, `UPDATE`, or `DELETE` on the `reviews` table.

---

## 7. Frontend Forms Demonstration (5+ Forms)

- **Main Navigation:** [`frontend/index.html`](file:///c:/Users/Vijay%20M%20R/DBMS-EVENT/frontend/index.html)
- **Data Entry Form 1 (Auth):** User Registration form (`#register-form` in `frontend/login.html`)
- **Data Entry Form 2 (Customer Booking):** Service Booking form (`#booking-form` in `frontend/customer/index.html`)
- **Data Entry Form 3 (Customer Review):** Star rating and comment form (`#review-form` in `frontend/customer/index.html`)
- **Data Entry Form 4 (Provider Service Creation):** Create Service listing (`#service-form` in `frontend/provider/index.html`)
- **Data Entry Form 5 (Provider Slot Scheduling):** Availability slot creation (`#slot-form` in `frontend/provider/index.html`)
- **Update Form 1 (Customer Address & Profile):** Address and profile editing (`#profile-form` in `frontend/customer/index.html`)
- **Update Form 2 (Provider Profile):** Experience and bio editing (`#profile-form` in `frontend/provider/index.html`)
- **Update Form 3 (Admin Moderation):** Category creation and editing (`#category-form` in `frontend/admin/index.html`)
- **Retrieval & Querying:** Live search filters by category, keyword, status, and price across all portals.

---

## 8. Two Report Generations (In Admin Portal)

Accessible directly under the **Executive Reports (2)** sidebar navigation tab in the Admin portal (`frontend/admin/index.html`):

1. **Report 1: Platform Financial & Revenue Summary**
   - **Executive KPIs:** Total Realized Revenue, Completed Orders, Mean Booking Value, Lost Cancelled Volume.
   - **Category Distribution Table:** Real-time breakdown of volume and earnings by category.
   - **Audit View Table:** Sourced directly from View `v_customer_booking_summary`.
   - **Export Options:** **Print / Save as PDF** (`window.print()`) and **Export CSV** download.

2. **Report 2: Provider Performance & Quality Audit**
   - **Executive KPIs:** Total Providers, Verified Counts, Platform Average Star Rating, Total Reviews.
   - **Quality Audit Table:** Sourced directly from View `v_provider_performance`.
   - **Export Options:** **Print / Save as PDF** and **Export CSV** download.

---

## How to Run & Verify

1. **In PostgreSQL (psql / pgAdmin):**
   ```bash
   psql -U postgres -d freelance_marketplace -f database/phase2_advanced.sql
   ```

2. **Run Full Automated Test Suite:**
   ```bash
   cd backend
   npm test
   ```
   *(Executes all 37 unit and integration tests covering Phase 1, Phase 2, routers, and validators).*

3. **Open Frontend Admin Portal:**
   ```bash
   cd frontend
   npm run dev
   ```
   Navigate to `/admin/index.html` and click on **📑 Executive Reports (2)** in the left sidebar.
