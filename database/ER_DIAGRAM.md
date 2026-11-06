# Database Entity-Relationship (ER) Diagram

## Freelance Service Marketplace

This document visualizes the complete architectural entity-relationship model for the Freelance Service Marketplace. The model strictly adheres to the 10 core tables defined in the PostgreSQL database schema.

### Mermaid Entity-Relationship Diagram

```mermaid
erDiagram
    users ||--o| customer_profiles : "has"
    users ||--o| provider_profiles : "has"
    users ||--o{ admin_logs : "records"
    
    customer_profiles ||--o{ addresses : "maintains"
    customer_profiles ||--o{ bookings : "places"
    customer_profiles ||--o{ reviews : "authors"
    
    provider_profiles ||--o{ services : "offers"
    provider_profiles ||--o{ availability_slots : "schedules"
    
    categories ||--o{ services : "classifies"
    
    services ||--o{ bookings : "booked_in"
    availability_slots ||--o{ bookings : "reserved_by"
    
    bookings ||--o| reviews : "generates"

    users {
        bigint user_id PK
        varchar(100) full_name
        varchar(255) email UK
        varchar(255) password_hash
        varchar(20) phone UK
        varchar(20) role
        varchar(20) account_status
        timestamptz created_at
        timestamptz updated_at
    }

    customer_profiles {
        bigint customer_id PK
        bigint user_id FK,UK
        date date_of_birth
        varchar(20) gender
        text profile_image
        timestamptz created_at
        timestamptz updated_at
    }

    provider_profiles {
        bigint provider_id PK
        bigint user_id FK,UK
        int experience_years
        text professional_bio
        varchar(20) verification_status
        numeric(3,2) average_rating
        int total_reviews
        varchar(100) service_city
        varchar(10) service_pincode
        timestamptz created_at
        timestamptz updated_at
    }

    categories {
        bigint category_id PK
        varchar(100) category_name UK
        text description
        varchar(20) category_status
        timestamptz created_at
        timestamptz updated_at
    }

    services {
        bigint service_id PK
        bigint provider_id FK
        bigint category_id FK
        varchar(150) service_name
        text description
        numeric(10,2) price
        int estimated_duration
        varchar(20) service_status
        timestamptz created_at
        timestamptz updated_at
    }

    availability_slots {
        bigint slot_id PK
        bigint provider_id FK
        date slot_date
        time start_time
        time end_time
        varchar(20) slot_status
        timestamptz created_at
        timestamptz updated_at
    }

    bookings {
        bigint booking_id PK
        bigint customer_id FK
        bigint service_id FK
        bigint slot_id FK
        timestamptz booking_date
        numeric(10,2) service_price
        varchar(20) booking_status
        text customer_notes
        text cancellation_reason
        timestamptz created_at
        timestamptz updated_at
    }

    reviews {
        bigint review_id PK
        bigint booking_id FK,UK
        bigint customer_id FK
        smallint rating
        text comment
        timestamptz created_at
        timestamptz updated_at
    }

    addresses {
        bigint address_id PK
        bigint customer_id FK
        varchar(255) address_line
        varchar(100) city
        varchar(100) state
        varchar(10) pincode
        varchar(150) landmark
        varchar(20) address_type
        boolean is_default
        timestamptz created_at
        timestamptz updated_at
    }

    admin_logs {
        bigint log_id PK
        bigint admin_id FK
        varchar(50) action_type
        varchar(50) target_type
        bigint target_id
        text description
        timestamptz created_at
    }
```

### Key Structural Highlights

1. **Role Specialization (`users` table inheritance simulation):**
   - A single unified identity table `users` manages credentials, system roles, and account-level status.
   - Separate 1:1 extension tables (`customer_profiles` and `provider_profiles`) avoid NULL proliferation and enforce strict domain attribute isolation.
2. **Double-Booking Prevention at Schema Level:**
   - A partial unique index on `bookings (slot_id) WHERE booking_status IN ('PENDING', 'ACCEPTED')` guarantees that an availability slot cannot have more than one concurrent active reservation.
3. **Price Immutability:**
   - `bookings.service_price` captures the exact price snapshot at booking time to protect billing integrity against future service price updates.
4. **Single Default Address Enforcement:**
   - A partial unique index on `addresses (customer_id) WHERE is_default = TRUE` enforces that each customer can designate at most one primary address.
5. **Auditing and Observability:**
   - Every administrative intervention (provider verification, account suspension, category modification) is permanently recorded in `admin_logs`.
