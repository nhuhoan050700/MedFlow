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

All timestamps are in **Vietnam time** (Asia/Ho_Chi_Minh, UTC+7). Run migration `010_vietnam_timezone.sql` to set the database default. This affects:

- `CURRENT_TIMESTAMP`, `now()`, `paid_at`, `created_at`, etc.
- Railway SQL Query tab, n8n Postgres node, and Node.js scripts

If the migration hasn't been applied, the Node.js scripts (`run-migration.js`, `fix-unpaid-order.js`) set the timezone on connect as a fallback.
