# Member 4: Test Plan, Report Notes, and Viva Guide

## Project summary

DBMS-EVENT is a PostgreSQL 16+ database for a local freelance service marketplace. Customers discover and book services offered by providers; administrators manage categories and provider governance. The supplied schema contains 10 tables: `users`, `customer_profiles`, `provider_profiles`, `categories`, `services`, `availability_slots`, `bookings`, `reviews`, `addresses`, and `admin_logs`.

## Member 4 implementation

The accompanying `member4_advanced_sql.sql` seeds at least six records in every table, using parent-before-child insertion order. It demonstrates joins, nested and correlated subqueries, `EXISTS`, `NOT EXISTS`, `ANY`, `ALL`, `UNION`, aggregates, `GROUP BY`, `HAVING`, a view, a SQL function, a stored procedure, existing timestamp triggers, TCL commands, DCL examples, and row-count/integrity checks.

## Run instructions

1. Create a fresh PostgreSQL database and run the team's `database/schema.sql` first.
2. Run `member4_advanced_sql.sql` in the same database using pgAdmin Query Tool or `psql`.
3. Review each query result, especially the row-count output. Each table should have at least six rows (the shared `users` table has 13).
4. The final rating consistency check should return no rows.
5. DCL statements are commented because `CREATE ROLE` requires a database owner/admin. Use a throwaway class database and replace the example password with a secret if demonstrating them.

## Validation record

Execution status: **Not run in this workspace**. This environment did not provide a configured PostgreSQL database or the complete repository checkout. Therefore this file is a run plan, not a claim of successful execution. Record the PostgreSQL version, command/tool used, date, observed row counts, and any error/fix after running it locally. Capture screenshots of the query output only after you run it.

Suggested validation cases:

| Case | Action | Expected result |
|---|---|---|
| Seed coverage | Run the seed script on a fresh schema | All inserts and commit succeed; each listed table count is at least 6 |
| Provider rating trigger | Insert a valid review for a completed booking | Provider `average_rating` and `total_reviews` reflect reviews |
| Review validation | Attempt a review for a non-completed booking or wrong customer | Trigger rejects the row |
| Slot/provider validation | Attempt a booking where service and slot belong to different providers | Trigger rejects the row |
| Active slot uniqueness | Insert a second pending/accepted booking for the same slot | Partial unique index rejects it |
| Slot release | Change pending/accepted booking to cancelled/rejected | Slot returns to `AVAILABLE` |
| Default address | Add a second default address for one customer | Partial unique index rejects it |
| Updated timestamp | Update a row in a table with the timestamp trigger | `updated_at` advances |
| TCL rollback | Run the included savepoint demonstration | Temporary price update is rolled back |
| Rating consistency | Run the last query after seed | No result rows |

## Notes about the supplied schema

- `users.role` is checked, but the schema does not use a database constraint or trigger to ensure that a `customer_profiles` row belongs only to a `CUSTOMER`, or a `provider_profiles` row only to a `PROVIDER`. The backend should enforce this or the team can add a trigger.
- `provider_profiles` stores rating aggregates as well as the reviews table. The supplied trigger maintains those cached values when reviews change; the final query checks the cache against source data.
- The booking trigger checks service/slot provider matching and blocks suspended providers. It does not require `verification_status='VERIFIED'`, so pending providers are not blocked by this database trigger.
- A partial unique index allows at most one `PENDING`/`ACCEPTED` booking per slot. The included data uses completed bookings so six reviews can be demonstrated without occupying slots as active bookings.
- The demo `password_hash` values are literal placeholders and are not valid password hashes. Replace them with hashes created by the application's password hashing library for integration testing; never deploy demo credentials.
- The schema's function is invoked by its trigger and the supplied business functions/triggers already cover much of that requirement. The supplemental file adds a read function and a procedure for an accepted-to-completed transition.

## Viva questions and short answers

1. **What is a primary key?** A column (or column set) that uniquely identifies each row and cannot be null.
2. **What is a foreign key?** A constraint that requires a referenced value to exist in a related table, preserving referential integrity.
3. **Why separate `users` from customer/provider profiles?** Shared identity and login fields live once in `users`; role-specific attributes live in their own profile tables.
4. **What does 1NF mean?** Each field stores one atomic value and there are no repeating groups.
5. **What does 2NF mean?** The relation is in 1NF and each non-key attribute depends on the whole candidate key, not just part of a composite key.
6. **What does 3NF mean?** The relation is in 2NF and non-key attributes do not depend transitively on a key through another non-key attribute.
7. **What is a correlated subquery?** A subquery that refers to a row from the outer query and is evaluated in that outer-row context.
8. **How do `EXISTS` and `IN` differ?** `EXISTS` tests whether the subquery returns any row; it is useful for existence checks and can reference the outer row.
9. **What do `ANY` and `ALL` mean?** `ANY` is true if the comparison matches at least one returned value; `ALL` requires it to match every returned value.
10. **Why use `GROUP BY` and `HAVING`?** `GROUP BY` forms groups for aggregates; `HAVING` filters the groups after aggregation.
11. **What does the partial unique booking index enforce?** For a slot, no more than one booking can have status `PENDING` or `ACCEPTED` at a time.
12. **What is a trigger?** Database code that runs automatically on a defined table event, such as insert or update.
13. **What is a view?** A named query that presents data from underlying tables; it usually stores the query definition, not a separate copy of rows.
14. **What is a transaction?** A group of database operations treated as one unit. `COMMIT` keeps changes; `ROLLBACK` undoes uncommitted changes.
15. **What does ACID stand for?** Atomicity, Consistency, Isolation, Durability.
16. **What are DCL commands?** Commands such as `GRANT` and `REVOKE` that control database privileges.
17. **Why is the review linked to a booking?** It ties feedback to a real marketplace interaction; the trigger then checks completion and customer ownership.
18. **What is the difference between a function and a procedure here?** The function returns a value and can be used in a query; the procedure performs an operation via `CALL` and need not return a query value.

## GitHub teamwork: your contribution

1. Clone the shared repository or download it, then create your own branch, for example `member4-advanced-sql`.
2. Put the SQL and this document in the repository's agreed documentation/SQL folder. Ask teammates to agree on file names and avoid editing the same file at once.
3. Check `git status`, stage only your files, and commit with a clear message such as `Add Member 4 advanced SQL and test notes`.
4. Push your branch to GitHub and open a pull request targeting the team's main branch. Describe the files and how they were run; request a teammate review.
5. Resolve review comments on your branch, then let the team merge the pull request. Pull the updated main branch before starting the next task.

Useful commands (run from the repository folder):

```bash
git clone https://github.com/Vijay-M-R/DBMS-EVENT.git
cd DBMS-EVENT
git switch -c member4-advanced-sql
git status
git add database/member4_advanced_sql.sql database/member4_test_and_viva.md
git commit -m "Add Member 4 advanced SQL and test notes"
git push -u origin member4-advanced-sql
```

These commands assume you have write access to the repository. If GitHub rejects the push, ask the repository owner to add you as a collaborator or use a fork and pull request.
