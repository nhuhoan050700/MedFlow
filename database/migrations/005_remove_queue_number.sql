-- Remove queue_number from orders. Order data is identified by user_id (purchaser) and total_amount (price).

ALTER TABLE orders DROP COLUMN IF EXISTS queue_number;

-- Optional: drop queue functions (no longer used)
DROP FUNCTION IF EXISTS generate_queue_number_arr(anyarray);
DROP FUNCTION IF EXISTS generate_queue_number(VARCHAR);
