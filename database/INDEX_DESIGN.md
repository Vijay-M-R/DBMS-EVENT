# Database Index Design & Performance Strategy

## Freelance Service Marketplace

This document provides a comprehensive indexing strategy for the Freelance Service Marketplace database. It details every B-tree index, unique constraint index, partial unique index, and query acceleration index, along with maintenance tradeoffs and execution plan considerations.

---

### Index Strategy Catalog

```sql
-- ============================================================================
-- FREELANCE SERVICE MARKETPLACE - INDEX SPECIFICATION
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PRIMARY & NATURAL UNIQUE KEY INDEXES (Implicitly Created by Postgres)
-- ----------------------------------------------------------------------------
-- users:           pk_users (user_id), uq_users_email (email), uq_users_phone (phone)
-- customer_profiles: pk_customer_profiles (customer_id), uq_customer_profiles_user_id (user_id)
-- provider_profiles: pk_provider_profiles (provider_id), uq_provider_profiles_user_id (user_id)
-- categories:      pk_categories (category_id), uq_categories_name (category_name)
-- services:        pk_services (service_id)
-- availability_slots: pk_availability_slots (slot_id), uq_provider_time_slot (provider_id, slot_date, start_time, end_time)
-- bookings:        pk_bookings (booking_id)
-- reviews:         pk_reviews (review_id), uq_reviews_booking_id (booking_id)
-- addresses:       pk_addresses (address_id)
-- admin_logs:      pk_admin_logs (log_id)

-- ----------------------------------------------------------------------------
-- 2. PARTIAL UNIQUE INDEXES (Crucial Business Rules)
-- ----------------------------------------------------------------------------

-- Enforces at most ONE active (PENDING or ACCEPTED) reservation per availability slot
CREATE UNIQUE INDEX uq_active_slot_booking 
ON bookings (slot_id) 
WHERE booking_status IN ('PENDING', 'ACCEPTED');

-- Enforces at most ONE default address per customer
CREATE UNIQUE INDEX uq_customer_default_address 
ON addresses (customer_id) 
WHERE is_default = TRUE;

-- ----------------------------------------------------------------------------
-- 3. FOREIGN KEY PERFORMANCE INDEXES
-- PostgreSQL does NOT automatically index foreign key columns. Unindexed FKs
-- cause table scans during parent updates/deletions and degrade JOIN efficiency.
-- ----------------------------------------------------------------------------

-- Foreign keys on services
CREATE INDEX idx_services_provider_id ON services (provider_id);
CREATE INDEX idx_services_category_id ON services (category_id);

-- Foreign keys on availability_slots
CREATE INDEX idx_availability_slots_provider_id ON availability_slots (provider_id);

-- Foreign keys on bookings
CREATE INDEX idx_bookings_customer_id ON bookings (customer_id);
CREATE INDEX idx_bookings_service_id ON bookings (service_id);
CREATE INDEX idx_bookings_slot_id ON bookings (slot_id);

-- Foreign keys on reviews
CREATE INDEX idx_reviews_customer_id ON reviews (customer_id);

-- Foreign keys on addresses
CREATE INDEX idx_addresses_customer_id ON addresses (customer_id);

-- Foreign keys on admin_logs
CREATE INDEX idx_admin_logs_admin_id ON admin_logs (admin_id);

-- ----------------------------------------------------------------------------
-- 4. MARKETPLACE SEARCH, FILTER & QUERY ACCELERATION INDEXES
-- ----------------------------------------------------------------------------

-- Accelerates service discovery filtered by status, category and sorted by price
CREATE INDEX idx_services_search_filter 
ON services (category_id, service_status, price);

-- Accelerates provider geo-lookup by city, verification status, and rating
CREATE INDEX idx_provider_geo_rating 
ON provider_profiles (service_city, verification_status, average_rating DESC);

-- Accelerates slot availability lookups for a provider on upcoming dates
CREATE INDEX idx_slots_provider_date_status 
ON availability_slots (provider_id, slot_date, slot_status);

-- Accelerates customer and provider booking history filtering by status and date
CREATE INDEX idx_bookings_status_date 
ON bookings (booking_status, created_at DESC);

-- Accelerates admin audit log lookups by target entity and action type
CREATE INDEX idx_admin_logs_target 
ON admin_logs (target_type, target_id, created_at DESC);
```

---

### Index Analysis & Optimization Matrix

| Index Name | Index Type | Target Columns | Primary Accelerated Query / Workflow | Cost vs. Benefit Trade-Off |
|:---|:---|:---|:---|:---|
| `uq_active_slot_booking` | Partial Unique B-Tree | `(slot_id)` where status IN ('PENDING','ACCEPTED') | Slot reservation concurrency checks. Instant rejection of double booking attempts. | **High Benefit, Negligible Cost**: Index only indexes active rows (small footprint). |
| `uq_customer_default_address` | Partial Unique B-Tree | `(customer_id)` where is_default = TRUE | Setting or retrieving default customer address. | **Minimal Cost**: Only stores at most 1 entry per customer. |
| `idx_services_search_filter` | Composite B-Tree | `(category_id, service_status, price)` | `SELECT * FROM services WHERE category_id = $1 AND service_status = 'ACTIVE' ORDER BY price ASC` | **High Benefit**: Eliminates external sort step (`Sort Key: price`); converts query into index scan. Moderate insert overhead. |
| `idx_provider_geo_rating` | Composite B-Tree | `(service_city, verification_status, average_rating DESC)` | Searching vetted providers in a specific city ranked by ratings. | **High Benefit**: Matches marketplace home/search landing queries. |
| `idx_slots_provider_date_status` | Composite B-Tree | `(provider_id, slot_date, slot_status)` | Calendar schedule view for customers selecting available provider slots. | **High Benefit**: Eliminates seq scan over past slots. |
| `idx_bookings_customer_id` | Single-Column B-Tree | `(customer_id)` | Customer viewing their order/booking history. | Prevents full table scan on `bookings` during customer dashboard queries. |
| `idx_bookings_status_date` | Composite B-Tree | `(booking_status, created_at DESC)` | Admin dashboard monitoring pending or completed bookings. | Speeds up pagination and status filter queries. |
| `idx_admin_logs_target` | Composite B-Tree | `(target_type, target_id, created_at DESC)` | Audit inspection of specific provider or customer profile history. | Essential for compliance audits without full scan of logs. |

---

### Write Overhead vs. Read Performance Guidelines

1. **Selective Indexing:**
   - Every additional index incurs an I/O and CPU overhead on `INSERT`, `UPDATE`, and `DELETE` operations.
   - We avoid indexing low-cardinality boolean columns (like `is_default`) globally; instead, we employ partial indexing (`WHERE is_default = TRUE`), indexing only the single active record per customer.
2. **HOT (Heap-Only Tuples) Updates:**
   - Columns that are frequently updated without modifying indexed attributes can take advantage of PostgreSQL's HOT optimization, avoiding index writes when updating fields like `customer_notes`.
3. **Foreign Key Locking Mitigation:**
   - Unindexed foreign keys in PostgreSQL can cause table-level locks on referenced child tables during parent deletes/updates. The provided FK indexes eliminate this bottleneck.
