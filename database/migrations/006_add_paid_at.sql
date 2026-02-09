-- Add paid_at so worker dashboard can sort by time paid (earliest first).

ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;

-- Backfill: orders already paid get paid_at = updated_at
UPDATE orders SET paid_at = updated_at WHERE payment_status = 'paid' AND paid_at IS NULL;
