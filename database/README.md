# Database

PostgreSQL schema and migrations for Railway.

## CLI: run migrations (no psql required)

From the **system2** project root:

```bash
cd database
railway link
railway run npm install
railway run npm run migrate
```

This uses Node.js and the `pg` package to run `003_generate_queue_number_arr.sql`. `DATABASE_URL` is provided by Railway when you use `railway run`.

To run a different migration: `railway run node run-migration.js migrations/001_add_birthday_replace_age.sql`

---

## CLI: run migrations with psql

You need the Postgres connection string (from Railway → your Postgres service → Variables → `DATABASE_URL`).

**Run a single migration:**

```bash
psql "$DATABASE_URL" -f database/migrations/003_generate_queue_number_arr.sql
```

**Run all migrations (in order):**

```bash
psql "$DATABASE_URL" -f database/migrations/001_add_birthday_replace_age.sql
psql "$DATABASE_URL" -f database/migrations/002_add_address.sql
psql "$DATABASE_URL" -f database/migrations/003_generate_queue_number_arr.sql
# ... 004–009 as needed ...
psql "$DATABASE_URL" -f database/migrations/010_vietnam_timezone.sql   # use Vietnam time for all tables
```

**From project root (Windows PowerShell):**

```powershell
$env:DATABASE_URL = "postgresql://user:pass@host:port/railway"   # paste your URL from Railway
psql $env:DATABASE_URL -f database/migrations/003_generate_queue_number_arr.sql
```

**From project root (Windows CMD):**

```cmd
set DATABASE_URL=postgresql://user:pass@host:port/railway
psql %DATABASE_URL% -f database/migrations/003_generate_queue_number_arr.sql
```

**Using Railway CLI to get the URL:**

```bash
# Install: npm i -g @railway/cli
railway link
railway run psql $DATABASE_URL -f database/migrations/003_generate_queue_number_arr.sql
```

On Windows with Railway CLI you may need to run the migration in a shell that supports `$DATABASE_URL` (e.g. Git Bash) or set the variable first.

## Full schema (new database)

For a brand‑new database, run the full schema once:

```bash
psql "$DATABASE_URL" -f database/schema.sql
```

Then run any migrations that add columns/functions added after the schema (e.g. 002, 003) if they’re not already in your schema.sql.

## Timezone (Vietnam)

**All data in all tables on Railway should use Vietnam time** (Asia/Ho_Chi_Minh, UTC+7). To ensure that:

1. **Run migration 010** on your Railway database (once):
   ```bash
   railway run node run-migration.js migrations/010_vietnam_timezone.sql
   ```
   Or with psql: `psql "$DATABASE_URL" -f database/migrations/010_vietnam_timezone.sql`

2. This sets the **database default timezone**, so every connection (Railway SQL tab, n8n Postgres nodes, Node scripts) uses Vietnam time unless they override it. That means:
   - `CURRENT_TIMESTAMP`, `now()`, and all `created_at` / `updated_at` / `paid_at` defaults are in Vietnam time
   - Data you see in Railway and n8n is in Vietnam time

3. **New database from schema.sql**: The full schema already runs the same timezone setting at the end, so a fresh DB is already Vietnam time.

4. **Fallback**: Node.js scripts (`run-migration.js`, `fix-unpaid-order.js`, `fix-order-details.js`) also set `SET timezone = 'Asia/Ho_Chi_Minh'` on connect when running locally.
