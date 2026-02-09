-- Set default timezone to Vietnam (UTC+7) for all connections to this database.
-- Affects CURRENT_TIMESTAMP, now(), and how timestamps are displayed in Railway SQL, n8n, etc.
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone TO ''Asia/Ho_Chi_Minh''', current_database());
END $$;
