-- Add status to order_items so each procedure has its own state: pending, in_progress, completed.
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- Backfill from parent order status for existing rows.
UPDATE order_items oi
SET status = COALESCE(o.status, 'pending')
FROM orders o
WHERE oi.order_id = o.id AND (oi.status IS NULL OR oi.status = '');

CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(status);
