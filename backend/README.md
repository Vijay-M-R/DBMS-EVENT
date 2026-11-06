# Freelance Service Marketplace - Native Node.js & PostgreSQL Backend

A modular, framework-free backend architecture and PostgreSQL database system built for a multi-role Freelance Service Marketplace platform connecting customers with vetted local service providers.

---

## 1. Architectural Highlights

- **Pure Native HTTP Pipeline:** Built strictly with Node.js native `http` module and ES Modules (`import`/`export`).
- **No Third-Party Web Frameworks:** Zero dependencies on Express.js, Fastify, NestJS, Koa, or Hono.
- **Custom Parametric Router:** High-performance regex router supporting dynamic path params (`:id`), query parameters, sub-router mounting, and middleware chaining.
- **Raw Parameterized PostgreSQL Queries:** Powered by `pg.Pool` without ORM tools (No Prisma, Sequelize, or Mongoose).
- **ACID Transaction Management:** Dedicated connection acquisition (`BEGIN`, `COMMIT`, `ROLLBACK`, `SAVEPOINT`) with row-level locking (`SELECT ... FOR UPDATE`) to prevent double-booking race conditions.
- **Role-Based Access Control (RBAC):** Strict segregation between `CUSTOMER`, `PROVIDER`, and `ADMIN`.
- **Zero Dummy Records:** Clean, academic-grade schema ready for live production use without mock data pollution.

---

## 2. Directory Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js          # pg.Pool & withTransaction helper
│   │   └── environment.js       # Validated environment configuration
│   ├── routes/
│   │   ├── auth.routes.js       # Register, login, token check
│   │   ├── user.routes.js       # Base user profile
│   │   ├── customer.routes.js   # Customer profile & addresses
│   │   ├── provider.routes.js   # Provider profile & directory search
│   │   ├── category.routes.js   # Service category taxonomy
│   │   ├── service.routes.js    # Service offerings catalog & filters
│   │   ├── availability.routes.js # Time slots & schedule lookup
│   │   ├── booking.routes.js    # Reservation state machine
│   │   ├── review.routes.js     # Post-service ratings & reviews
│   │   └── admin.routes.js      # Dashboard stats, moderation, audit logs
│   ├── controllers/             # HTTP req/res coordination
│   ├── services/                # Business logic & parameterized SQL
│   ├── middleware/              # Auth, RBAC, CORS, logger
│   ├── validators/              # Entity payload validations
│   ├── utils/                   # Router, body parser, password, jwt
│   ├── app.js                  # Native HTTP request handler
│   └── server.js               # Entry point with graceful shutdown
├── database/
│   ├── schema.sql               # Exactly 10 tables DDL script
│   ├── migrate.js               # DDL migration execution script
│   ├── ER_DIAGRAM.md            # Mermaid entity-relationship diagram
│   ├── DATA_DICTIONARY.md       # Column definitions & types
│   ├── RELATIONSHIPS.md         # Relationship cardinalities & integrity
│   ├── NORMALIZATION.md         # 1NF, 2NF, 3NF & academic DBMS mappings
│   └── INDEX_DESIGN.md          # Indexing strategy & partial indexes
├── tests/
│   ├── router.test.js           # Router unit tests
│   ├── security.test.js         # Bcrypt & JWT unit tests
│   ├── validators.test.js       # Validation unit tests
│   └── app.test.js              # Native HTTP integration tests
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 3. Database Design (Exactly 10 Tables)

| # | Table Name | Primary Key | Critical Constraints & Partial Indexes |
|---|---|---|---|
| **1** | `users` | `user_id` | `email` (UK), `phone` (UK), `role` (`CUSTOMER`, `PROVIDER`, `ADMIN`), `account_status` (`ACTIVE`, `SUSPENDED`, `DEACTIVATED`) |
| **2** | `customer_profiles`| `customer_id` | `user_id` (1:1 FK to `users`), `date_of_birth` ($\le$ CURRENT_DATE), `gender` |
| **3** | `provider_profiles`| `provider_id` | `user_id` (1:1 FK to `users`), `verification_status` (`PENDING`, `VERIFIED`, `REJECTED`, `SUSPENDED`), `average_rating`, `total_reviews` |
| **4** | `categories` | `category_id` | `category_name` (UK), `category_status` (`ACTIVE`, `INACTIVE`) |
| **5** | `services` | `service_id` | `provider_id` (FK), `category_id` (FK), `price` ($\ge 0$), `estimated_duration` ($> 0$), `service_status` |
| **6** | `availability_slots`| `slot_id` | `provider_id` (FK), `slot_date`, `start_time`, `end_time` ($>$ start_time), `slot_status`, `UNIQUE (provider_id, slot_date, start_time, end_time)` |
| **7** | `bookings` | `booking_id` | `customer_id` (FK), `service_id` (FK), `slot_id` (FK), `service_price` (Price snapshot), `booking_status`. **Partial Unique Index:** `uq_active_slot_booking ON (slot_id) WHERE booking_status IN ('PENDING', 'ACCEPTED')` |
| **8** | `reviews` | `review_id` | `booking_id` (UK FK), `customer_id` (FK), `rating` ($1 \le x \le 5$). Enforced via trigger for `COMPLETED` bookings only. |
| **9** | `addresses` | `address_id` | `customer_id` (FK), `is_default`. **Partial Unique Index:** `uq_customer_default_address ON (customer_id) WHERE is_default = TRUE` |
| **10**| `admin_logs` | `log_id` | `admin_id` (FK to `users`), `action_type`, `target_type`, `target_id`, `description`, `created_at` |

---

## 4. Getting Started

### Prerequisites
- Node.js v18.0.0 or later (v24+ recommended)
- PostgreSQL 16 or later running locally or in Docker

### Environment Configuration
Copy `.env.example` to `.env` and configure your PostgreSQL database credentials:
```bash
cp .env.example .env
```

### Installation
```bash
cd backend
npm install
```

### Running the Database DDL Migration
To execute the schema DDL against your configured PostgreSQL database (without inserting dummy data):
```bash
node database/migrate.js
```

### Running Tests
Execute the native Node.js test suite:
```bash
npm test
```

### Starting the Server
```bash
# Production mode
npm start

# Development mode (with live reload)
npm run dev
```

---

## 5. REST API Documentation (`/api/v1`)

### Authentication & Identity (`/api/v1/auth`)

#### 1. Register User
- **Method / Endpoint:** `POST /api/v1/auth/register`
- **Access:** Public
- **Request Body:**
```json
{
  "full_name": "Vijay Kumar",
  "email": "vijay@example.com",
  "password": "StrongPassword123!",
  "phone": "+919876543210",
  "role": "CUSTOMER"
}
```
*(For `PROVIDER` role, optional `service_city` and `service_pincode` can be passed).*
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "user_id": 1,
      "full_name": "Vijay Kumar",
      "email": "vijay@example.com",
      "phone": "+919876543210",
      "role": "CUSTOMER",
      "account_status": "ACTIVE"
    },
    "profile": { "customer_id": 1 },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 2. User Login
- **Method / Endpoint:** `POST /api/v1/auth/login`
- **Access:** Public
- **Request Body:**
```json
{
  "email": "vijay@example.com",
  "password": "StrongPassword123!"
}
```
- **Response (200 OK):** Returns JWT token and profile identity.

#### 3. Current User Context
- **Method / Endpoint:** `GET /api/v1/auth/me`
- **Access:** Authenticated (Bearer Token)

---

### Customer Module (`/api/v1/customers`)

| Method | Endpoint | Access | Purpose |
|:---|:---|:---|:---|
| `GET` | `/profile` | CUSTOMER | View customer profile |
| `PUT` | `/profile` | CUSTOMER | Update profile (`date_of_birth`, `gender`, `profile_image`, `full_name`, `phone`) |
| `GET` | `/addresses` | CUSTOMER | View saved addresses |
| `POST` | `/addresses` | CUSTOMER | Add address (`address_line`, `city`, `state`, `pincode`, `landmark`, `address_type`, `is_default`) |
| `PATCH`| `/addresses/:id/default`| CUSTOMER | Set address as primary default |
| `DELETE`| `/addresses/:id` | CUSTOMER | Remove address |

---

### Provider Module (`/api/v1/providers`)

| Method | Endpoint | Access | Purpose |
|:---|:---|:---|:---|
| `GET` | `/search?city=Bangalore&minRating=4.0` | Public | Search verified providers by city and rating |
| `GET` | `/:id/public` | Public | View public provider profile with services & reviews |
| `GET` | `/profile` | PROVIDER | View authenticated provider profile |
| `PUT` | `/profile` | PROVIDER | Update provider details (`experience_years`, `professional_bio`, `service_city`, `service_pincode`) |

---

### Service Categories (`/api/v1/categories`)

| Method | Endpoint | Access | Purpose |
|:---|:---|:---|:---|
| `GET` | `/` | Public | List all active categories |
| `GET` | `/all` | ADMIN | List all categories with service counts |
| `POST` | `/` | ADMIN | Create new category (`category_name`, `description`, `category_status`) |
| `PUT` | `/:id` | ADMIN | Update category |

---

### Service Catalog (`/api/v1/services`)

| Method | Endpoint | Access | Purpose |
|:---|:---|:---|:---|
| `GET` | `/search?search=ac&categoryId=1&city=Bangalore&minPrice=100&maxPrice=1000&sortBy=price_asc` | Public | Filtered service search with pagination |
| `GET` | `/:id` | Public | View single service listing details |
| `GET` | `/provider/my-services` | PROVIDER | View provider's published services |
| `POST` | `/` | PROVIDER | Publish service offering (`category_id`, `service_name`, `description`, `price`, `estimated_duration`) |
| `PUT` | `/:id` | PROVIDER | Update service details |
| `DELETE`| `/:id` | PROVIDER | Delete service |

---

### Availability Slots (`/api/v1/availability`)

| Method | Endpoint | Access | Purpose |
|:---|:---|:---|:---|
| `GET` | `/provider/:providerId?startDate=2026-11-10` | Public | Customer checking provider available slots |
| `GET` | `/my-slots?startDate=2026-11-10` | PROVIDER | View schedule |
| `POST` | `/` | PROVIDER | Create slot (`slot_date`, `start_time`, `end_time`) with overlap detection |
| `DELETE`| `/:id` | PROVIDER | Delete unbooked slot |

---

### Bookings & Lifecycle Management (`/api/v1/bookings`)

| Method | Endpoint | Access | Purpose |
|:---|:---|:---|:---|
| `POST` | `/` | CUSTOMER | Create booking reserving an available slot (atomic transaction) |
| `GET` | `/customer/history?status=PENDING` | CUSTOMER | Customer booking history |
| `GET` | `/provider/history?status=PENDING` | PROVIDER | Provider incoming bookings |
| `GET` | `/:id` | Authenticated | View booking details |
| `PATCH`| `/:id/status` | CUSTOMER / PROVIDER | Status transition (`ACCEPTED`, `REJECTED`, `COMPLETED`, `CANCELLED`) |

#### Booking Status Transition Matrix:
- **Customer:** May transition `PENDING` $\rightarrow$ `CANCELLED` or `ACCEPTED` $\rightarrow$ `CANCELLED` (with required `cancellation_reason`). Releases slot to `AVAILABLE`.
- **Provider:** May transition `PENDING` $\rightarrow$ `ACCEPTED`, `PENDING` $\rightarrow$ `REJECTED`, or `ACCEPTED` $\rightarrow$ `COMPLETED`. Rejection releases slot to `AVAILABLE`.

---

### Reviews & Ratings (`/api/v1/reviews`)

| Method | Endpoint | Access | Purpose |
|:---|:---|:---|:---|
| `POST` | `/` | CUSTOMER | Submit review (`booking_id`, `rating`, `comment`) for completed booking |
| `GET` | `/provider/:providerId` | Public | List reviews and testimonials for provider |

---

### Admin Module (`/api/v1/admin`)

| Method | Endpoint | Access | Purpose |
|:---|:---|:---|:---|
| `GET` | `/dashboard` | ADMIN | Aggregated system metrics (user counts, revenue, booking distribution) |
| `GET` | `/customers` | ADMIN | View registered customers with pagination |
| `GET` | `/providers` | ADMIN | View providers with verification status filter |
| `PATCH`| `/providers/:id/verification` | ADMIN | Approve, reject, or suspend provider (`VERIFIED`, `REJECTED`, `SUSPENDED`) |
| `PATCH`| `/users/:id/status` | ADMIN | Moderate user status (`ACTIVE`, `SUSPENDED`, `DEACTIVATED`) |
| `GET` | `/bookings` | ADMIN | Monitor all platform bookings |
| `GET` | `/logs` | ADMIN | Inspect immutable administrative audit trail (`admin_logs`) |

---

## 6. Concurrency & Safety Controls

1. **Double-Booking Prevention:**
   - Database level: `uq_active_slot_booking` partial unique index.
   - Transaction level: `SELECT ... FOR UPDATE` acquires row-level pessimistic write lock on target availability slot.
2. **Immutable Pricing:**
   - `bookings.service_price` stores the price snapshot at booking time to protect billing integrity against future provider price adjustments.
3. **Cross-Table Integrity:**
   - Automated trigger `trg_validate_booking_integrity` asserts `services.provider_id = availability_slots.provider_id` before allowing booking creation.
4. **Automated Provider Metrics:**
   - Automated trigger `trg_update_provider_ratings` and `ReviewService` compute running average rating and total reviews without race conditions.
