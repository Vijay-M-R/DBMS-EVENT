# PostgreSQL Data Dictionary

## Freelance Service Marketplace

This document details the exact metadata, data types, constraints, and operational purposes for all columns across the 10 tables in the Freelance Service Marketplace database.

---

### Table 1: `users`
**Purpose:** Core identity and authentication table storing system credentials and authorization roles for customers, providers, and admins.

| Column Name | PostgreSQL Data Type | Nullable | Primary Key | Foreign Key | Default Value | Constraints / Rules | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `user_id` | `BIGINT` | NO | YES | None | `IDENTITY` | Auto-incrementing identity | Primary identifier for system users |
| `full_name` | `VARCHAR(100)` | NO | NO | None | None | `NOT NULL` | Legal or displayed full name |
| `email` | `VARCHAR(255)` | NO | NO | None | None | `UNIQUE`, `NOT NULL` | Primary login email address |
| `password_hash` | `VARCHAR(255)` | NO | NO | None | None | `NOT NULL` | Bcrypt cryptographic password hash |
| `phone` | `VARCHAR(20)` | NO | NO | None | None | `UNIQUE`, `NOT NULL` | Primary contact number |
| `role` | `VARCHAR(20)` | NO | NO | None | None | `CHECK (role IN ('CUSTOMER', 'PROVIDER', 'ADMIN'))` | System access role |
| `account_status`| `VARCHAR(20)` | NO | NO | None | `'ACTIVE'` | `CHECK (account_status IN ('ACTIVE', 'SUSPENDED', 'DEACTIVATED'))` | Account lifecycle state |
| `created_at` | `TIMESTAMPTZ` | NO | NO | None | `CURRENT_TIMESTAMP` | Stored in UTC | Timestamp of user registration |
| `updated_at` | `TIMESTAMPTZ` | NO | NO | None | `CURRENT_TIMESTAMP` | Stored in UTC | Timestamp of last user record update |

---

### Table 2: `customer_profiles`
**Purpose:** Stores customer-specific demographic and preference attributes.

| Column Name | PostgreSQL Data Type | Nullable | Primary Key | Foreign Key | Default Value | Constraints / Rules | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `customer_id` | `BIGINT` | NO | YES | None | `IDENTITY` | Auto-incrementing identity | Primary identifier for customer entity |
| `user_id` | `BIGINT` | NO | NO | `users(user_id)` | None | `UNIQUE`, `ON DELETE CASCADE` | 1-to-1 link to user authentication account |
| `date_of_birth`| `DATE` | YES | NO | None | None | `CHECK (date_of_birth <= CURRENT_DATE)` | Customer birth date |
| `gender` | `VARCHAR(20)` | YES | NO | None | None | `CHECK (gender IN ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'))` | Customer identified gender |
| `profile_image` | `TEXT` | YES | NO | None | None | Valid URL/path string | Profile picture URL |
| `created_at` | `TIMESTAMPTZ` | NO | NO | None | `CURRENT_TIMESTAMP` | Stored in UTC | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NO | NO | None | `CURRENT_TIMESTAMP` | Stored in UTC | Profile last modified timestamp |

---

### Table 3: `provider_profiles`
**Purpose:** Stores professional qualifications, service locations, and verified metrics for service providers.

| Column Name | PostgreSQL Data Type | Nullable | Primary Key | Foreign Key | Default Value | Constraints / Rules | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `provider_id` | `BIGINT` | NO | YES | None | `IDENTITY` | Auto-incrementing identity | Primary identifier for provider entity |
| `user_id` | `BIGINT` | NO | NO | `users(user_id)` | None | `UNIQUE`, `ON DELETE CASCADE` | 1-to-1 link to user authentication account |
| `experience_years`| `INT` | NO | NO | None | `0` | `CHECK (experience_years BETWEEN 0 AND 70)` | Professional years in field |
| `professional_bio`| `TEXT` | YES | NO | None | None | None | Detailed biography and experience overview |
| `verification_status`| `VARCHAR(20)`| NO | NO | None | `'PENDING'` | `CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'))` | Administrative vetting status |
| `average_rating`| `NUMERIC(3,2)` | NO | NO | None | `0.00` | `CHECK (average_rating BETWEEN 0.00 AND 5.00)` | Aggregated customer rating score |
| `total_reviews`| `INT` | NO | NO | None | `0` | `CHECK (total_reviews >= 0)` | Aggregated completed review count |
| `service_city` | `VARCHAR(100)` | NO | NO | None | None | `NOT NULL` | Primary operating city |
| `service_pincode`| `VARCHAR(10)` | NO | NO | None | None | `NOT NULL` | Primary operating postal code |
| `created_at` | `TIMESTAMPTZ` | NO | NO | None | `CURRENT_TIMESTAMP` | Stored in UTC | Profile creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NO | NO | None | `CURRENT_TIMESTAMP` | Stored in UTC | Profile modification timestamp |

---

### Table 4: `categories`
**Purpose:** Defines distinct service domains managed by platform administrators.

| Column Name | PostgreSQL Data Type | Nullable | Primary Key | Foreign Key | Default Value | Constraints / Rules | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `category_id` | `BIGINT` | NO | YES | None | `IDENTITY` | Auto-incrementing identity | Primary identifier for category |
| `category_name`| `VARCHAR(100)` | NO | NO | None | None | `UNIQUE`, `NOT NULL` | Unique taxonomy title (e.g. Plumbing) |
| `description` | `TEXT` | YES | NO | None | None | None | Narrative explanation of category scope |
| `category_status`| `VARCHAR(20)`| NO | NO | None | `'ACTIVE'` | `CHECK (category_status IN ('ACTIVE', 'INACTIVE'))` | Administrative activation toggle |
| `created_at` | `TIMESTAMPTZ` | NO | NO | None | `CURRENT_TIMESTAMP` | Stored in UTC | Registration timestamp |
| `updated_at` | `TIMESTAMPTZ` | NO | NO | None | `CURRENT_TIMESTAMP` | Stored in UTC | Modification timestamp |

---

### Table 5: `services`
**Purpose:** Offerings listed by verified providers with fixed pricing and duration.

| Column Name | PostgreSQL Data Type | Nullable | Primary Key | Foreign Key | Default Value | Constraints / Rules | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `service_id` | `BIGINT` | NO | YES | None | `IDENTITY` | Auto-incrementing identity | Primary identifier for service item |
| `provider_id` | `BIGINT` | NO | NO | `provider_profiles(provider_id)` | None | `ON DELETE CASCADE` | Service owner provider |
| `category_id` | `BIGINT` | NO | NO | `categories(category_id)` | None | `ON DELETE RESTRICT` | Classification category |
| `service_name`| `VARCHAR(150)` | NO | NO | None | None | `NOT NULL` | Descriptive title of the service |
| `description` | `TEXT` | NO | NO | None | None | `NOT NULL` | Comprehensive deliverables description |
| `price` | `NUMERIC(10,2)`| NO | NO | None | None | `CHECK (price >= 0.00)` | Standard service rate |
| `estimated_duration`| `INT` | NO | NO | None | None | `CHECK (estimated_duration > 0)` | Expected duration in minutes |
| `service_status`| `VARCHAR(20)` | NO | NO | None | `'ACTIVE'` | `CHECK (service_status IN ('ACTIVE', 'INACTIVE'))` | Active visibility flag |
| `created_at` | `TIMESTAMPTZ` | NO | NO | None | `CURRENT_TIMESTAMP` | Stored in UTC | Listing timestamp |
| `updated_at` | `TIMESTAMPTZ` | NO | NO | None | `CURRENT_TIMESTAMP` | Stored in UTC | Update timestamp |

---

### Table 6: `availability_slots`
**Purpose:** Scheduled bookable time intervals published by providers.

| Column Name | PostgreSQL Data Type | Nullable | Primary Key | Foreign Key | Default Value | Constraints / Rules | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `slot_id` | `BIGINT` | NO | YES | None | `IDENTITY` | Auto-incrementing identity | Primary slot identifier |
| `provider_id` | `BIGINT` | NO | NO | `provider_profiles(provider_id)` | None | `ON DELETE CASCADE` | Provider owning the slot |
| `slot_date` | `DATE` | NO | NO | None | None | `NOT NULL` | Calendar date of availability |
| `start_time` | `TIME` | NO | NO | None | None | `NOT NULL` | Start time of slot window |
| `end_time` | `TIME` | NO | NO | None | None | `CHECK (end_time > start_time)` | End time of slot window |
| `slot_status` | `VARCHAR(20)` | NO | NO | None | `'AVAILABLE'` | `CHECK (slot_status IN ('AVAILABLE', 'BOOKED', 'BLOCKED', 'CANCELLED'))` | Slot allocation state |
| `created_at` | `TIMESTAMPTZ` | NO | NO | None | `CURRENT_TIMESTAMP` | Stored in UTC | Slot generation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NO | NO | None | `CURRENT_TIMESTAMP` | Stored in UTC | Slot update timestamp |

*Composite Unique Constraint:* `(provider_id, slot_date, start_time, end_time)` prevents overlapping duplicate definitions for the same provider.

---

### Table 7: `bookings`
**Purpose:** Service engagement agreement between a customer and provider for an allocated slot.

| Column Name | PostgreSQL Data Type | Nullable | Primary Key | Foreign Key | Default Value | Constraints / Rules | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `booking_id` | `BIGINT` | NO | YES | None | `IDENTITY` | Auto-incrementing identity | Primary reservation identifier |
| `customer_id` | `BIGINT` | NO | NO | `customer_profiles(customer_id)`| None | `ON DELETE RESTRICT` | Booking customer |
| `service_id` | `BIGINT` | NO | NO | `services(service_id)` | None | `ON DELETE RESTRICT` | Chosen service package |
| `slot_id` | `BIGINT` | NO | NO | `availability_slots(slot_id)` | None | `ON DELETE RESTRICT` | Reserved appointment slot |
| `booking_date`| `TIMESTAMPTZ` | NO | NO | None | `CURRENT_TIMESTAMP` | Stored in UTC | Moment reservation was initiated |
| `service_price`| `NUMERIC(10,2)`| NO | NO | None | None | `CHECK (service_price >= 0.00)` | Historical price captured at booking |
| `booking_status`| `VARCHAR(20)`| NO | NO | None | `'PENDING'` | `CHECK (booking_status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED'))` | Lifecycle status of booking |
| `customer_notes`| `TEXT` | YES | NO | None | None | None | Special customer instructions |
| `cancellation_reason`| `TEXT` | YES | NO | None | None | None | Mandatory reason upon cancellation/rejection |
| `created_at` | `TIMESTAMPTZ` | NO | NO | None | `CURRENT_TIMESTAMP` | Stored in UTC | Created timestamp |
| `updated_at` | `TIMESTAMPTZ` | NO | NO | None | `CURRENT_TIMESTAMP` | Stored in UTC | Updated timestamp |

*Partial Unique Index:* `uq_active_slot_booking ON bookings (slot_id) WHERE booking_status IN ('PENDING', 'ACCEPTED')` guarantees no double-booking per slot.

---

### Table 8: `reviews`
**Purpose:** Ratings and comments provided by customers for completed service bookings.

| Column Name | PostgreSQL Data Type | Nullable | Primary Key | Foreign Key | Default Value | Constraints / Rules | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `review_id` | `BIGINT` | NO | YES | None | `IDENTITY` | Auto-incrementing identity | Primary review identifier |
| `booking_id` | `BIGINT` | NO | NO | `bookings(booking_id)` | None | `UNIQUE`, `ON DELETE RESTRICT` | At most one review per booking |
| `customer_id`| `BIGINT` | NO | NO | `customer_profiles(customer_id)`| None | `ON DELETE RESTRICT` | Authoring customer |
| `rating` | `SMALLINT` | NO | NO | None | None | `CHECK (rating BETWEEN 1 AND 5)` | Quality rating scale 1 to 5 |
| `comment` | `TEXT` | YES | NO | None | None | None | Customer testimonial feedback |
| `created_at` | `TIMESTAMPTZ` | NO | NO | None | `CURRENT_TIMESTAMP` | Stored in UTC | Review submission timestamp |
| `updated_at` | `TIMESTAMPTZ` | NO | NO | None | `CURRENT_TIMESTAMP` | Stored in UTC | Review update timestamp |

---

### Table 9: `addresses`
**Purpose:** Customer delivery or on-site service location entries.

| Column Name | PostgreSQL Data Type | Nullable | Primary Key | Foreign Key | Default Value | Constraints / Rules | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `address_id` | `BIGINT` | NO | YES | None | `IDENTITY` | Auto-incrementing identity | Primary address identifier |
| `customer_id`| `BIGINT` | NO | NO | `customer_profiles(customer_id)`| None | `ON DELETE CASCADE` | Associated customer |
| `address_line`| `VARCHAR(255)`| NO | NO | None | None | `NOT NULL` | Street address, building, apartment |
| `city` | `VARCHAR(100)` | NO | NO | None | None | `NOT NULL` | Municipality / City |
| `state` | `VARCHAR(100)` | NO | NO | None | None | `NOT NULL` | Province / State |
| `pincode` | `VARCHAR(10)` | NO | NO | None | None | `NOT NULL` | Postal code |
| `landmark` | `VARCHAR(150)` | YES | NO | None | None | None | Nearby prominent geographical reference |
| `address_type`| `VARCHAR(20)` | NO | NO | None | `'HOME'` | `CHECK (address_type IN ('HOME', 'WORK', 'OTHER'))` | Address category |
| `is_default` | `BOOLEAN` | NO | NO | None | `FALSE` | Enforced at most one TRUE per customer via partial index | Default selection flag |
| `created_at` | `TIMESTAMPTZ` | NO | NO | None | `CURRENT_TIMESTAMP` | Stored in UTC | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NO | NO | None | `CURRENT_TIMESTAMP` | Stored in UTC | Record modification timestamp |

*Partial Unique Index:* `uq_customer_default_address ON addresses (customer_id) WHERE is_default = TRUE`.

---

### Table 10: `admin_logs`
**Purpose:** Immutable append-only audit trail capturing administrative interventions.

| Column Name | PostgreSQL Data Type | Nullable | Primary Key | Foreign Key | Default Value | Constraints / Rules | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `log_id` | `BIGINT` | NO | YES | None | `IDENTITY` | Auto-incrementing identity | Primary audit log identifier |
| `admin_id` | `BIGINT` | NO | NO | `users(user_id)` | None | `ON DELETE RESTRICT` | Admin user executing the action |
| `action_type` | `VARCHAR(50)` | NO | NO | None | None | `NOT NULL` | Category of event (e.g., VERIFY_PROVIDER) |
| `target_type` | `VARCHAR(50)` | NO | NO | None | None | `NOT NULL` | Target table (e.g., provider_profiles) |
| `target_id` | `BIGINT` | NO | NO | None | None | `NOT NULL` | Primary key identifier of target entity |
| `description` | `TEXT` | NO | NO | None | None | `NOT NULL` | Detailed rationale or change delta |
| `created_at` | `TIMESTAMPTZ` | NO | NO | None | `CURRENT_TIMESTAMP` | Stored in UTC | Immutable log event timestamp |
