-- Remove procedure_id from orders. We store procedure_name and room_number on the order instead.

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_procedure_id_fkey;
ALTER TABLE orders DROP COLUMN IF EXISTS procedure_id;
