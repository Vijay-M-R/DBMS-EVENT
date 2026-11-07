# Freelance Service Marketplace
## Database Management Systems Project Report

**Database:** PostgreSQL 16+  
**Project repository:** DBMS-EVENT  
**Prepared from:** the supplied `database/schema.sql` and README text  
**Status:** Member 4 supporting report; database execution remains to be completed by the team.

## Abstract

The Freelance Service Marketplace database supports a platform that connects customers with local service providers. It stores user identities and role-specific profiles, service categories and listings, provider availability, bookings, reviews, customer addresses, and administrator activity. PostgreSQL constraints, indexes, functions, and triggers support data integrity and common application operations. Member 4's accompanying SQL script supplies demonstration data and examples of advanced SQL topics required for the DBMS course.

## Problem statement

Customers need a consistent way to find and book nearby services. Providers need to publish services and availability, while administrators need to verify providers and monitor marketplace activity. A relational database can keep these connected records consistent and make reporting possible through joins and aggregate queries.

## Objectives

- Represent customer, provider, and administrator records in a relational schema.
- Store service listings, categories, provider slots, bookings, and reviews.
- Enforce key constraints and business rules at the database layer.
- Demonstrate subqueries, joins, aggregates, set operations, views, functions, procedures, triggers, DCL, and TCL.
- Prepare sample data and a repeatable validation plan for the project demonstration.

## Scope and assumptions

The schema defines exactly 10 tables. A shared `users` table stores login identity and role; `customer_profiles` and `provider_profiles` store role-specific data. Each service has one provider and one category. A booking points to one customer profile, service, and availability slot. A review points to one booking and one customer profile. Addresses belong to customer profiles; administrator actions are recorded in `admin_logs`.

The supplied schema text does not include payment processing, messaging, a separate provider-service-area table, or a category parent identifier. These are outside the implemented database scope unless the team expands the design.

## Relational design

| Table | Purpose | Key relationships |
|---|---|---|
| `users` | Shared identity, role, and account status | Parent of customer/provider profiles; referenced by admin logs |
| `customer_profiles` | Customer-specific details | References `users`; parent of addresses, bookings, and reviews |
| `provider_profiles` | Provider details, verification, and rating cache | References `users`; parent of services and slots |
| `categories` | Service classification | Parent of services |
| `services` | Provider service offer and price | References provider and category; parent of bookings |
| `availability_slots` | Provider appointment windows | References provider; parent of bookings |
| `bookings` | Customer reservation lifecycle | References customer, service, and slot; parent of reviews |
| `reviews` | Rating and feedback for completed work | References booking and customer |
| `addresses` | Customer service locations | References customer profile |
| `admin_logs` | Administrative audit records | References admin user |

## Normalization notes

The project README links a separate normalization proof, so this report summarizes the design rather than replacing that proof.

- **1NF:** Table columns contain single values; multi-valued details such as addresses and services are represented by separate rows.
- **2NF:** Every table uses a single-column primary key, so non-key attributes depend on the full primary key. Repeating customer/provider identity data is kept in `users` and role-specific profile tables.
- **3NF:** Category names are stored in `categories` and referenced from `services`; service details are stored in `services`; user identity attributes stay in `users`. This avoids storing descriptive data in unrelated rows.

The `average_rating` and `total_reviews` fields in `provider_profiles` are a deliberate cached aggregate for efficient reads. The review trigger keeps that cache synchronized; it is denormalized and should be checked against the source reviews.

## Integrity and performance mechanisms

The schema defines primary and foreign keys, `UNIQUE` constraints, status/rating/price/time `CHECK` constraints, and indexes on foreign keys and common search filters. A partial unique index on `bookings(slot_id)` applies while the booking is pending or accepted. Another partial unique index allows no more than one default address per customer.

Triggers update timestamps, check that service and slot providers match, maintain slot lifecycle state, validate review eligibility, and recompute provider rating aggregates. The SQL seed script includes test queries for these mechanisms and for cached rating consistency.

## Advanced SQL work

The accompanying `member4_advanced_sql.sql` contains six or more rows per table, advanced select queries, a provider performance view, a customer completed-booking function, a booking completion procedure, trigger demonstrations, DCL examples, and TCL examples. It uses placeholder passwords and must only be run on a disposable class database. The sample data uses explicit IDs for readability and advances identity sequences afterward.

## Testing and results

No PostgreSQL database was available in this workspace, so the SQL has **not been executed here** and no successful test result is claimed. The companion test guide lists commands/expected outcomes, including row coverage, review validation, slot conflicts, default address uniqueness, timestamp triggers, rating cache consistency, and transaction rollback. The team should run the script on a fresh PostgreSQL database and record actual version, date, outputs, and screenshots before submitting the final report.

## Design observations for discussion

- The schema does not itself verify that a `customer_profiles` row references a user whose role is `CUSTOMER`, or that a `provider_profiles` row belongs to a `PROVIDER`. The backend should enforce role correctness, or the database can add a trigger/other constraint strategy.
- Booking validation rejects suspended providers but currently does not require providers to be verified. The team should decide whether pending providers may accept bookings.
- The sample `password_hash` strings are placeholders only. Integration tests require hashes from the application's password-hashing library.
- The schema's rating cache is maintained by triggers. Any future bulk import or trigger disablement should be followed by a reconciliation query.

## Conclusion

The supplied schema models the core marketplace lifecycle and includes strong relational integrity mechanisms. Member 4's SQL and validation guide demonstrate the required DBMS constructs and provide a practical test sequence. Before final submission, the team should execute the scripts in PostgreSQL, save screenshots of real query output, complete the validation record, and merge the files into the shared GitHub repository through a reviewed branch.

## Presentation slide outline

1. Title: Freelance Service Marketplace — Database Management Systems Project
2. Marketplace data at a glance — users and the ten table domains
3. How the tables connect — identity, provider listings, bookings, and reviews
4. Integrity rules — foreign keys, checks, indexes, and triggers
5. Member 4 advanced SQL — query families, view, function, and procedure
6. Sample data and validation — row coverage and test plan; disclose that execution is pending
7. Suggested demonstration — load schema, seed data, run reporting queries, show rollback
8. Design checks and viva — role enforcement, provider verification, password placeholders, ACID and keys

## References

- DBMS-EVENT project README text supplied by the project owner.
- `database/schema.sql` text supplied for this task.
