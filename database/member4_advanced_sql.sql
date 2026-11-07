-- DBMS-EVENT / Member 4 sample data and advanced SQL
-- Target: PostgreSQL 16+. Run schema.sql first, then this file in a fresh database.
-- Demo passwords below are placeholders only; never use them for a real account.
-- This script uses explicit IDs for easy classroom joins. Use a fresh schema/database.

BEGIN;

-- 1) Seed parent tables first. Six customers, six providers, and one administrator.
INSERT INTO users (user_id, full_name, email, password_hash, phone, role, account_status) VALUES
(1,'Ananya Rao','ananya.demo@example.test','DEMO_HASH_ONLY','9000000001','CUSTOMER','ACTIVE'),
(2,'Ravi Kumar','ravi.demo@example.test','DEMO_HASH_ONLY','9000000002','CUSTOMER','ACTIVE'),
(3,'Meera Shah','meera.demo@example.test','DEMO_HASH_ONLY','9000000003','CUSTOMER','ACTIVE'),
(4,'Arjun Das','arjun.demo@example.test','DEMO_HASH_ONLY','9000000004','CUSTOMER','ACTIVE'),
(5,'Nisha Patel','nisha.demo@example.test','DEMO_HASH_ONLY','9000000005','CUSTOMER','ACTIVE'),
(6,'Kiran Joseph','kiran.demo@example.test','DEMO_HASH_ONLY','9000000006','CUSTOMER','ACTIVE'),
(7,'Suresh Electrician','suresh.demo@example.test','DEMO_HASH_ONLY','9000000007','PROVIDER','ACTIVE'),
(8,'Lakshmi Plumber','lakshmi.demo@example.test','DEMO_HASH_ONLY','9000000008','PROVIDER','ACTIVE'),
(9,'Farhan Tutor','farhan.demo@example.test','DEMO_HASH_ONLY','9000000009','PROVIDER','ACTIVE'),
(10,'Divya Cleaner','divya.demo@example.test','DEMO_HASH_ONLY','9000000010','PROVIDER','ACTIVE'),
(11,'Manoj Carpenter','manoj.demo@example.test','DEMO_HASH_ONLY','9000000011','PROVIDER','ACTIVE'),
(12,'Pooja Photographer','pooja.demo@example.test','DEMO_HASH_ONLY','9000000012','PROVIDER','ACTIVE'),
(13,'Marketplace Admin','admin.demo@example.test','DEMO_HASH_ONLY','9000000013','ADMIN','ACTIVE');

INSERT INTO customer_profiles (customer_id,user_id,date_of_birth,gender) VALUES
(1,1,'2001-04-12','FEMALE'),(2,2,'1999-09-23','MALE'),(3,3,'2000-01-18','FEMALE'),
(4,4,'1998-06-04','MALE'),(5,5,'2002-11-30','FEMALE'),(6,6,'1997-02-15','PREFER_NOT_TO_SAY');

INSERT INTO provider_profiles (provider_id,user_id,experience_years,professional_bio,verification_status,service_city,service_pincode) VALUES
(1,7,8,'Residential electrical repairs','VERIFIED','Bengaluru','560001'),
(2,8,6,'Plumbing and leak repair','VERIFIED','Bengaluru','560002'),
(3,9,5,'Mathematics tutoring','VERIFIED','Bengaluru','560003'),
(4,10,4,'Home cleaning services','VERIFIED','Bengaluru','560004'),
(5,11,9,'Furniture repair and carpentry','VERIFIED','Bengaluru','560005'),
(6,12,7,'Family and event photography','PENDING','Bengaluru','560006');

INSERT INTO categories (category_id,category_name,description) VALUES
(1,'Electrical','Electrical installation and repair'),(2,'Plumbing','Water and pipe services'),
(3,'Tutoring','Academic tutoring'),(4,'Cleaning','Residential cleaning'),
(5,'Carpentry','Furniture and woodwork'),(6,'Photography','Portrait and event photography');

INSERT INTO services (service_id,provider_id,category_id,service_name,description,price,estimated_duration) VALUES
(1,1,1,'Electrical safety check','Inspection of household wiring and sockets',1200,90),
(2,2,2,'Tap and pipe repair','Repair of leaking taps and small pipe faults',850,60),
(3,3,3,'Mathematics lesson','One-to-one school mathematics lesson',700,60),
(4,4,4,'Apartment deep clean','Deep cleaning of a small apartment',2500,180),
(5,5,5,'Furniture repair','Repair of one chair or small table',1600,120),
(6,6,6,'Portrait session','One-hour outdoor portrait session',3000,60);

-- Dates are in the past so completed bookings and reviews make sense in a demo.
INSERT INTO availability_slots (slot_id,provider_id,slot_date,start_time,end_time,slot_status) VALUES
(1,1,CURRENT_DATE-INTERVAL '30 days','09:00','10:30','BOOKED'),
(2,2,CURRENT_DATE-INTERVAL '25 days','10:00','11:00','BOOKED'),
(3,3,CURRENT_DATE-INTERVAL '20 days','11:00','12:00','BOOKED'),
(4,4,CURRENT_DATE-INTERVAL '15 days','13:00','16:00','BOOKED'),
(5,5,CURRENT_DATE-INTERVAL '10 days','14:00','16:00','BOOKED'),
(6,6,CURRENT_DATE-INTERVAL '5 days','16:00','17:00','BOOKED');

INSERT INTO bookings (booking_id,customer_id,service_id,slot_id,booking_date,service_price,booking_status,customer_notes) VALUES
(1,1,1,1,CURRENT_TIMESTAMP-INTERVAL '30 days',1200,'COMPLETED','Please check the kitchen socket.'),
(2,2,2,2,CURRENT_TIMESTAMP-INTERVAL '25 days',850,'COMPLETED','The bathroom tap is leaking.'),
(3,3,3,3,CURRENT_TIMESTAMP-INTERVAL '20 days',700,'COMPLETED','Algebra revision.'),
(4,4,4,4,CURRENT_TIMESTAMP-INTERVAL '15 days',2500,'COMPLETED','Focus on kitchen and bathroom.'),
(5,5,5,5,CURRENT_TIMESTAMP-INTERVAL '10 days',1600,'COMPLETED','Repair the dining chair.'),
(6,6,6,6,CURRENT_TIMESTAMP-INTERVAL '5 days',3000,'COMPLETED','Outdoor family portraits.');

INSERT INTO reviews (review_id,booking_id,customer_id,rating,comment) VALUES
(1,1,1,5,'Careful and professional.'),(2,2,2,4,'Leak fixed quickly.'),(3,3,3,5,'Clear explanations.'),
(4,4,4,4,'Thorough cleaning.'),(5,5,5,5,'The chair is sturdy again.'),(6,6,6,5,'Beautiful photographs.');

INSERT INTO addresses (address_id,customer_id,address_line,city,state,pincode,address_type,is_default) VALUES
(1,1,'10 Lake Road','Bengaluru','Karnataka','560001','HOME',TRUE),
(2,2,'22 Park Street','Bengaluru','Karnataka','560002','HOME',TRUE),
(3,3,'5 Temple Lane','Bengaluru','Karnataka','560003','HOME',TRUE),
(4,4,'18 Green Avenue','Bengaluru','Karnataka','560004','HOME',TRUE),
(5,5,'7 Market Road','Bengaluru','Karnataka','560005','HOME',TRUE),
(6,6,'31 Hill View','Bengaluru','Karnataka','560006','HOME',TRUE);

INSERT INTO admin_logs (log_id,admin_id,action_type,target_type,target_id,description) VALUES
(1,13,'VERIFY_PROVIDER','PROVIDER',1,'Demo provider verification'),
(2,13,'VERIFY_PROVIDER','PROVIDER',2,'Demo provider verification'),
(3,13,'VERIFY_PROVIDER','PROVIDER',3,'Demo provider verification'),
(4,13,'VERIFY_PROVIDER','PROVIDER',4,'Demo provider verification'),
(5,13,'VERIFY_PROVIDER','PROVIDER',5,'Demo provider verification'),
(6,13,'CREATE_CATEGORY','CATEGORY',6,'Demo category creation');

COMMIT;

-- Explicit IDs were inserted into IDENTITY columns. Advance sequences to avoid
-- collisions when the application next inserts a row without an explicit ID.
SELECT setval(pg_get_serial_sequence('users','user_id'), (SELECT MAX(user_id) FROM users));
SELECT setval(pg_get_serial_sequence('customer_profiles','customer_id'), (SELECT MAX(customer_id) FROM customer_profiles));
SELECT setval(pg_get_serial_sequence('provider_profiles','provider_id'), (SELECT MAX(provider_id) FROM provider_profiles));
SELECT setval(pg_get_serial_sequence('categories','category_id'), (SELECT MAX(category_id) FROM categories));
SELECT setval(pg_get_serial_sequence('services','service_id'), (SELECT MAX(service_id) FROM services));
SELECT setval(pg_get_serial_sequence('availability_slots','slot_id'), (SELECT MAX(slot_id) FROM availability_slots));
SELECT setval(pg_get_serial_sequence('bookings','booking_id'), (SELECT MAX(booking_id) FROM bookings));
SELECT setval(pg_get_serial_sequence('reviews','review_id'), (SELECT MAX(review_id) FROM reviews));
SELECT setval(pg_get_serial_sequence('addresses','address_id'), (SELECT MAX(address_id) FROM addresses));
SELECT setval(pg_get_serial_sequence('admin_logs','log_id'), (SELECT MAX(log_id) FROM admin_logs));

-- A. Multi-table join plus GROUP BY / HAVING: providers with at least one review.
SELECT pp.provider_id, u.full_name AS provider_name, c.category_name,
       COUNT(DISTINCT b.booking_id) AS completed_jobs,
       ROUND(AVG(r.rating),2) AS demo_average_rating,
       SUM(b.service_price) AS completed_revenue
FROM provider_profiles pp
JOIN users u ON u.user_id=pp.user_id
JOIN services s ON s.provider_id=pp.provider_id
JOIN categories c ON c.category_id=s.category_id
JOIN bookings b ON b.service_id=s.service_id AND b.booking_status='COMPLETED'
JOIN reviews r ON r.booking_id=b.booking_id
GROUP BY pp.provider_id,u.full_name,c.category_name
HAVING COUNT(r.review_id)>=1
ORDER BY demo_average_rating DESC,completed_revenue DESC;

-- B. Nested subquery: services priced above the marketplace average.
SELECT service_id,service_name,price
FROM services
WHERE price > (SELECT AVG(price) FROM services)
ORDER BY price DESC;

-- C. Correlated subquery: providers whose rating is higher than their city's average.
SELECT pp.provider_id,u.full_name,pp.service_city,pp.average_rating
FROM provider_profiles pp JOIN users u ON u.user_id=pp.user_id
WHERE pp.average_rating > (
  SELECT AVG(pp2.average_rating) FROM provider_profiles pp2
  WHERE pp2.service_city=pp.service_city
);

-- D. EXISTS: customers who have completed at least one booking.
SELECT cp.customer_id,u.full_name
FROM customer_profiles cp JOIN users u ON u.user_id=cp.user_id
WHERE EXISTS (SELECT 1 FROM bookings b WHERE b.customer_id=cp.customer_id AND b.booking_status='COMPLETED');

-- E. NOT EXISTS: active providers with no service listing.
SELECT pp.provider_id,u.full_name
FROM provider_profiles pp JOIN users u ON u.user_id=pp.user_id
WHERE pp.verification_status='VERIFIED'
AND NOT EXISTS (SELECT 1 FROM services s WHERE s.provider_id=pp.provider_id AND s.service_status='ACTIVE');

-- F. ANY: services more expensive than at least one Electrical service.
SELECT service_name,price FROM services
WHERE price > ANY (SELECT price FROM services s JOIN categories c USING(category_id) WHERE c.category_name='Electrical');

-- G. ALL: services more expensive than every Tutoring service.
SELECT service_name,price FROM services
WHERE price > ALL (SELECT price FROM services s JOIN categories c USING(category_id) WHERE c.category_name='Tutoring');

-- H. UNION: one common-shaped list of customers and providers.
SELECT user_id,full_name,'CUSTOMER' AS person_type FROM users WHERE role='CUSTOMER'
UNION
SELECT user_id,full_name,'PROVIDER' AS person_type FROM users WHERE role='PROVIDER'
ORDER BY person_type,full_name;

-- I. View: reusable provider performance summary.
CREATE OR REPLACE VIEW v_provider_performance AS
SELECT pp.provider_id,u.full_name,pp.service_city,pp.verification_status,
       COUNT(DISTINCT s.service_id) AS service_count,
       COUNT(DISTINCT b.booking_id) FILTER (WHERE b.booking_status='COMPLETED') AS completed_booking_count,
       pp.average_rating,pp.total_reviews
FROM provider_profiles pp JOIN users u ON u.user_id=pp.user_id
LEFT JOIN services s ON s.provider_id=pp.provider_id
LEFT JOIN bookings b ON b.service_id=s.service_id
GROUP BY pp.provider_id,u.full_name,pp.service_city,pp.verification_status,pp.average_rating,pp.total_reviews;

SELECT * FROM v_provider_performance ORDER BY average_rating DESC,provider_id;

-- J. Function: count completed bookings for a customer profile.
CREATE OR REPLACE FUNCTION completed_booking_count(p_customer_id BIGINT)
RETURNS BIGINT LANGUAGE SQL STABLE AS $$
  SELECT COUNT(*) FROM bookings WHERE customer_id=p_customer_id AND booking_status='COMPLETED';
$$;
SELECT customer_id,completed_booking_count(customer_id) FROM customer_profiles ORDER BY customer_id;

-- K. Procedure: safely complete an accepted booking. It uses its own transaction
-- boundary in the caller; invalid IDs/statuses raise an error.
CREATE OR REPLACE PROCEDURE complete_booking(p_booking_id BIGINT)
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE bookings SET booking_status='COMPLETED',updated_at=CURRENT_TIMESTAMP
  WHERE booking_id=p_booking_id AND booking_status='ACCEPTED';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % does not exist or is not ACCEPTED',p_booking_id;
  END IF;
END;
$$;
-- Example only, with a rollback so demo data is unchanged:
-- BEGIN; CALL complete_booking(booking_id); ROLLBACK;

-- L. Trigger demo: schema trigger maintains updated_at. This transaction rolls back.
BEGIN;
UPDATE categories SET description='Temporary trigger demonstration' WHERE category_id=1;
SELECT category_id,updated_at FROM categories WHERE category_id=1;
ROLLBACK;

-- M. TCL examples: COMMIT / ROLLBACK / SAVEPOINT. Safe demonstration; no lasting change.
BEGIN;
SAVEPOINT before_demo_change;
UPDATE services SET price=price+1 WHERE service_id=1;
ROLLBACK TO SAVEPOINT before_demo_change;
ROLLBACK;

-- N. DCL examples (run only by a database owner/admin; replace role as needed).
-- CREATE ROLE marketplace_reader LOGIN PASSWORD 'replace-with-secret';
-- GRANT CONNECT ON DATABASE marketplace_db TO marketplace_reader;
-- GRANT USAGE ON SCHEMA public TO marketplace_reader;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO marketplace_reader;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO marketplace_reader;
-- REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM marketplace_reader;

-- O. Integrity/coverage checks. Expect 6 rows per business table except users=13.
SELECT 'users' AS table_name,COUNT(*) AS row_count FROM users
UNION ALL SELECT 'customer_profiles',COUNT(*) FROM customer_profiles
UNION ALL SELECT 'provider_profiles',COUNT(*) FROM provider_profiles
UNION ALL SELECT 'categories',COUNT(*) FROM categories
UNION ALL SELECT 'services',COUNT(*) FROM services
UNION ALL SELECT 'availability_slots',COUNT(*) FROM availability_slots
UNION ALL SELECT 'bookings',COUNT(*) FROM bookings
UNION ALL SELECT 'reviews',COUNT(*) FROM reviews
UNION ALL SELECT 'addresses',COUNT(*) FROM addresses
UNION ALL SELECT 'admin_logs',COUNT(*) FROM admin_logs
ORDER BY table_name;

-- Check the denormalized provider rating cache against source reviews; expect no rows.
SELECT pp.provider_id,pp.average_rating AS stored_rating,ROUND(AVG(r.rating),2) AS calculated_rating,
       pp.total_reviews,COUNT(r.review_id) AS calculated_reviews
FROM provider_profiles pp
JOIN services s ON s.provider_id=pp.provider_id
JOIN bookings b ON b.service_id=s.service_id
JOIN reviews r ON r.booking_id=b.booking_id
GROUP BY pp.provider_id,pp.average_rating,pp.total_reviews
HAVING pp.average_rating<>ROUND(AVG(r.rating),2) OR pp.total_reviews<>COUNT(r.review_id);
