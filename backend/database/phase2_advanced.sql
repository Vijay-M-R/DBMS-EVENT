-- ============================================================================
-- FREELANCE SERVICE MARKETPLACE - DBMS EVENT 1: PHASE 2 DEMO SQL SCRIPT
-- Course: Database Management Systems (24CS520)
-- Target RDBMS: PostgreSQL 16+
-- Guidelines Reference: Page 2 (Dr. Trisiladevi C. Nagavi, CSE, SJCE, JSS STU)
-- ============================================================================
-- Page 2 Requirements Covered:
-- 1. Correlated queries - 1
-- 2. Views - 2 (v_provider_performance, v_customer_booking_summary)
-- 3. Exists, not exist - each 1(2)
-- 4. Aggregate function (4) - COUNT, SUM, AVG, MIN, MAX
-- 5. Trigger - 2 (trg_sync_slot_status, trg_update_provider_ratings)
-- 6. Stored procedure - 2 (complete_booking, cancel_booking)
-- 7. Suitable front end with min 5 forms (Customer, Provider, Admin, Login)
-- 8. 2 Report generation (Financial Revenue Report & Provider Performance Audit Report)
-- ============================================================================

-- ============================================================================
-- SECTION 1: VIEWS (2 Required Views)
-- ============================================================================

-- View 1: Provider Performance & Rating Metrics
-- Purpose: Virtualizes provider business metrics, review aggregates, and service counts
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

-- Query View 1:
SELECT * FROM v_provider_performance ORDER BY average_rating DESC, provider_id ASC;


-- View 2: Customer Comprehensive Booking Summary
-- Purpose: Virtualizes booking details across customers, providers, categories, and reviews
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

-- Query View 2:
SELECT * FROM v_customer_booking_summary ORDER BY booking_id DESC;


-- ============================================================================
-- SECTION 2: STORED PROCEDURES (2 Required Stored Procedures)
-- ============================================================================

-- Stored Procedure 1: complete_booking
-- Purpose: Safely transitions an ACCEPTED booking into COMPLETED with transactional timestamping
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

-- Stored Procedure 2: cancel_booking
-- Purpose: Cancels a booking, records reason, and synchronizes availability slot back to AVAILABLE
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

    -- Update booking status and log reason
    UPDATE bookings 
    SET booking_status = 'CANCELLED',
        cancellation_reason = p_reason,
        updated_at = CURRENT_TIMESTAMP
    WHERE booking_id = p_booking_id;

    -- Release availability slot
    IF v_slot_id IS NOT NULL THEN
        UPDATE availability_slots
        SET slot_status = 'AVAILABLE',
            updated_at = CURRENT_TIMESTAMP
        WHERE slot_id = v_slot_id;
    END IF;
END;
$$;


-- ============================================================================
-- SECTION 3: CORRELATED SUBQUERY (1 Required Query)
-- ============================================================================

-- Correlated Query: Providers whose average rating exceeds the average rating of their specific service city
-- Purpose: The inner subquery references the outer query tuple attribute (pp.service_city)
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


-- ============================================================================
-- SECTION 4: EXISTS AND NOT EXISTS (2 Required Queries)
-- ============================================================================

-- 4.1 EXISTS: Customers who have successfully completed at least one booking
-- Purpose: Semi-join existence test terminating on first match
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

-- 4.2 NOT EXISTS: Verified service providers who currently offer NO active services
-- Purpose: Anti-join non-existence test to detect idle provider profiles
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


-- ============================================================================
-- SECTION 5: AGGREGATE FUNCTIONS (Demonstrating COUNT, SUM, AVG, MIN, MAX)
-- ============================================================================

-- Multi-Aggregate Analytics Query: Platform-wide service and pricing overview
-- Purpose: Demonstrates 5 aggregate functions in a single executive summary query
SELECT 
    COUNT(service_id)            AS total_active_services,
    SUM(price)                   AS total_catalog_value,
    ROUND(AVG(price), 2)         AS average_service_price,
    MIN(price)                   AS minimum_service_price,
    MAX(price)                   AS maximum_service_price,
    ROUND(AVG(estimated_duration), 0) AS average_duration_minutes
FROM services 
WHERE service_status = 'ACTIVE';


-- ============================================================================
-- SECTION 6: TRIGGERS (2 Required Business Triggers Demonstration)
-- ============================================================================

-- 6.1 Trigger 1: trg_sync_slot_status (defined in database/schema.sql)
-- Automatically sets availability_slots.slot_status = 'BOOKED' upon booking creation,
-- and releases it back to 'AVAILABLE' when booking is cancelled or rejected.

-- 6.2 Trigger 2: trg_update_provider_ratings (defined in database/schema.sql)
-- Automatically recalculates provider_profiles.average_rating and total_reviews
-- whenever a review is inserted, updated, or deleted.

-- Verification Query: Check provider ratings maintained by trigger
SELECT provider_id, average_rating, total_reviews 
FROM provider_profiles 
ORDER BY provider_id ASC;
