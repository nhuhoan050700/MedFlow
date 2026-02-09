-- Ensure every order has a purchaser (user_id) so we know who purchased what.
-- If you have existing orders with user_id NULL, fix or delete them before running this:
--   SELECT id, order_number, user_id FROM orders WHERE user_id IS NULL;
--   Then UPDATE orders SET user_id = <valid_user_id> WHERE id IN (...); or delete those rows.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM orders WHERE user_id IS NULL LIMIT 1) THEN
    ALTER TABLE orders ALTER COLUMN user_id SET NOT NULL;
  ELSE
    RAISE EXCEPTION 'Cannot set user_id NOT NULL: some orders have user_id NULL. Fix those rows first.';
  END IF;
END $$;
