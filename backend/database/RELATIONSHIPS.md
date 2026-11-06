# Database Entity Relationships & Integrity Specifications

## Freelance Service Marketplace

This document provides complete documentation of the database relationships, cardinalities, referential integrity rules, and structural mechanisms that govern interactions between tables in the Freelance Service Marketplace.

---

### Detailed Relationship Catalog

| # | Parent Table | Child Table | Relationship Type | Foreign Key Column | Referential Action (ON DELETE) | Cardinality Constraint / Enforcement Mechanism |
|---|---|---|---|---|---|---|
| **1** | `users` | `customer_profiles` | One-to-One (1:1) | `customer_profiles.user_id` | `CASCADE` | Unique constraint on `customer_profiles.user_id` ensures at most one profile per user. |
| **2** | `users` | `provider_profiles` | One-to-One (1:1) | `provider_profiles.user_id` | `CASCADE` | Unique constraint on `provider_profiles.user_id` ensures at most one profile per user. |
| **3** | `provider_profiles` | `services` | One-to-Many (1:N) | `services.provider_id` | `CASCADE` | A provider can create multiple service listings; if provider is deleted, listings cascade. |
| **4** | `categories` | `services` | One-to-Many (1:N) | `services.category_id` | `RESTRICT` | Prevents deletion of active service categories if services are assigned to them. |
| **5** | `provider_profiles` | `availability_slots` | One-to-Many (1:N) | `availability_slots.provider_id` | `CASCADE` | Providers publish time slots. Composite unique `(provider_id, slot_date, start_time, end_time)`. |
| **6** | `customer_profiles` | `bookings` | One-to-Many (1:N) | `bookings.customer_id` | `RESTRICT` | Customers create multiple bookings. Customer record cannot be dropped while bookings exist. |
| **7** | `services` | `bookings` | One-to-Many (1:N) | `bookings.service_id` | `RESTRICT` | Bookings preserve link to original service definition. Deletion restricted if booked. |
| **8** | `availability_slots`| `bookings` | One-to-Many (1:N) | `bookings.slot_id` | `RESTRICT` | Historically 1:N (e.g., cancelled attempts), but **at most one active booking per slot** enforced via `uq_active_slot_booking`. |
| **9** | `bookings` | `reviews` | One-to-Zero-or-One (1:0..1) | `reviews.booking_id` | `RESTRICT` | Exactly one review allowed per booking via Unique constraint on `reviews.booking_id`. |
| **10**| `customer_profiles` | `addresses` | One-to-Many (1:N) | `addresses.customer_id` | `CASCADE` | Customer can have multiple delivery addresses. At most one default address enforced via partial index. |
| **11**| `users` (admin) | `admin_logs` | One-to-Many (1:N) | `admin_logs.admin_id` | `RESTRICT` | Admin operations are audited. Deletion of admin account with audit trail is restricted. |

---

### Deep-Dive Analysis of Critical Integrity Mechanisms

#### 1. Enforcing At Most One Active Booking Per Slot
- **Business Need:** Prevent race conditions and double bookings where two customers simultaneously book the same time slot.
- **Relational Strategy:** While a slot may historically have cancelled or rejected booking attempts, it can only have one *active* booking (`PENDING` or `ACCEPTED`).
- **Enforcement Implementation:**
  ```sql
  CREATE UNIQUE INDEX uq_active_slot_booking 
  ON bookings (slot_id) 
  WHERE booking_status IN ('PENDING', 'ACCEPTED');
  ```
- **Concurrency Protection:** In addition to this database constraint, the backend reservation engine issues `SELECT ... FOR UPDATE` row-level locks on the `availability_slots` table inside an explicit `SERIALIZABLE` or `READ COMMITTED` transaction.

#### 2. Cross-Table Provider Alignment Verification
- **Business Need:** A malicious or erroneous API payload could specify a `service_id` belonging to Provider A, but a `slot_id` belonging to Provider B.
- **Limitation of Standard SQL Constraints:** Standard table-level `CHECK` constraints cannot execute subqueries or lookups across different tables in PostgreSQL.
- **Enforcement Implementation:** Enforced in PostgreSQL via a `BEFORE INSERT OR UPDATE` trigger (`validate_booking_integrity`):
  ```sql
  SELECT provider_id INTO v_service_provider_id FROM services WHERE service_id = NEW.service_id;
  SELECT provider_id INTO v_slot_provider_id FROM availability_slots WHERE slot_id = NEW.slot_id;
  IF v_service_provider_id <> v_slot_provider_id THEN
      RAISE EXCEPTION 'Slot ID % belongs to provider %, but service ID % belongs to provider %.',
          NEW.slot_id, v_slot_provider_id, NEW.service_id, v_service_provider_id;
  END IF;
  ```

#### 3. Single Default Address Per Customer
- **Business Need:** A customer can maintain multiple addresses (e.g. Home, Work, Vacation), but only one can serve as the default billing/service delivery destination at any time.
- **Enforcement Implementation:**
  ```sql
  CREATE UNIQUE INDEX uq_customer_default_address 
  ON addresses (customer_id) 
  WHERE is_default = TRUE;
  ```
  This partial index permits infinite rows where `is_default = FALSE` for the same `customer_id`, but strictly prohibits more than one row where `is_default = TRUE`.

#### 4. Post-Service Review Authenticity
- **Business Need:** Reviews must strictly originate from the verified customer who booked the service, and only after the booking has reached the `COMPLETED` state.
- **Enforcement Implementation:**
  - Foreign key `reviews.booking_id -> bookings.booking_id` with `UNIQUE` constraint ensures each booking has at most one review.
  - Trigger `validate_review_eligibility` enforces `bookings.booking_status = 'COMPLETED'` and `bookings.customer_id = reviews.customer_id`.
  - Trigger `update_provider_rating_stats` automatically recalculates `average_rating` and `total_reviews` in `provider_profiles` on insert/update/delete.
