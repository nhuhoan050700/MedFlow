-- Add procedure_name to orders so you can see it in the Railway table view.
-- Backfill room_number and procedure_name from procedures for existing orders.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS procedure_name VARCHAR(255);

-- Backfill from procedures where we have procedure_id
UPDATE orders o
SET
  room_number = COALESCE(o.room_number, p.room_number),
  procedure_name = COALESCE(o.procedure_name, p.name)
FROM procedures p
WHERE o.procedure_id = p.id;
