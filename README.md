# DBMS-EVENT: Freelance Service Marketplace

### College DBMS Project & Production-Grade Native Node.js Backend

A clean, modular, and secure backend architecture and complete PostgreSQL database schema design for a multi-role Freelance Service Marketplace platform connecting customers with vetted local service providers.

---

## Quick Navigation

- **Database Architecture & Documentation:**
  - [`database/schema.sql`](file:///c:/Users/Vijay%20M%20R/DBMS-EVENT/database/schema.sql): PostgreSQL 16+ DDL script (Exactly 10 Tables, Constraints, Triggers, Indexes)
  - [`database/ER_DIAGRAM.md`](file:///c:/Users/Vijay%20M%20R/DBMS-EVENT/database/ER_DIAGRAM.md): Mermaid Entity-Relationship Diagram
  - [`database/DATA_DICTIONARY.md`](file:///c:/Users/Vijay%20M%20R/DBMS-EVENT/database/DATA_DICTIONARY.md): Comprehensive Data Dictionary
  - [`database/RELATIONSHIPS.md`](file:///c:/Users/Vijay%20M%20R/DBMS-EVENT/database/RELATIONSHIPS.md): Detailed Relationship & Integrity Specifications
  - [`database/NORMALIZATION.md`](file:///c:/Users/Vijay%20M%20R/DBMS-EVENT/database/NORMALIZATION.md): 1NF, 2NF, 3NF Proofs & Academic DBMS Scenario Mappings
  - [`database/INDEX_DESIGN.md`](file:///c:/Users/Vijay%20M%20R/DBMS-EVENT/database/INDEX_DESIGN.md): Performance Indexing Strategy & Partial Unique Indexes

- **Backend Application (`backend/`):**
  - **Technology:** Native Node.js `http` module, ES Modules, `pg` connection pooling, `jsonwebtoken`, `bcrypt`.
  - **Frameworks:** Framework-free (Strictly No Express, Fastify, NestJS, Koa, or ORMs).
  - **Detailed API Documentation:** [`backend/README.md`](file:///c:/Users/Vijay%20M%20R/DBMS-EVENT/backend/README.md)

- **Frontend Application (`frontend/`):**
  - **Portals:** Provider Portal (`/provider/index.html`), Administrator Portal (`/admin/index.html`), Authentication & Register (`/login.html`), Gateway Router (`/index.html`).
  - **Tooling:** Vite development server with proxy to backend API (`http://localhost:5000`), zero-framework vanilla ES modules.
  - **Styling:** Custom modern responsive CSS stylesheet (`/css/styles.css`).

---

## Getting Started

### 1. Backend

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Run automated unit and integration tests
npm test

# Start the native HTTP server (serves both API and static frontend at http://localhost:5000)
npm run dev
```

### 2. Frontend Development (Optional Vite Dev Server)

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Vite dev server with Hot Module Reloading (HMR) & API proxy at http://localhost:3000
npm run dev

# Build production bundle
npm run build
```

