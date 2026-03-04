-- Use Vietnam time for all tables: set database default timezone to Asia/Ho_Chi_Minh (UTC+7).
-- Ensures all data (created_at, updated_at, paid_at, etc.) is stored and shown in Vietnam time
-- in Railway SQL, n8n Postgres nodes, and any client that connects without overriding.
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone TO ''Asia/Ho_Chi_Minh''', current_database());
END $$;
