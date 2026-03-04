-- Add order_items table to store multiple procedures per order.
-- One order can have many order_items (procedure_id, procedure_name, room_number per item).

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    procedure_id INTEGER REFERENCES procedures(id) ON DELETE SET NULL,
    procedure_name VARCHAR(255),
    room_number VARCHAR(50),
    amount DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_procedure_id ON order_items(procedure_id);

-- Backfill: create one order_item per existing order from procedure_name, room_number
INSERT INTO order_items (order_id, procedure_id, procedure_name, room_number, amount)
SELECT o.id,
       (SELECT p.id FROM procedures p WHERE LOWER(TRIM(p.name)) = LOWER(TRIM(o.procedure_name)) LIMIT 1),
       o.procedure_name,
       o.room_number,
       o.total_amount
FROM orders o
WHERE o.procedure_name IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id);

-- For orders with no procedure_name, create a placeholder item so we don't lose the order
INSERT INTO order_items (order_id, procedure_name, room_number, amount)
SELECT o.id, 'Unknown', o.room_number, o.total_amount
FROM orders o
WHERE o.procedure_name IS NULL
  AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id);

-- Remove procedure_name and room_number from orders (now in order_items)
ALTER TABLE orders DROP COLUMN IF EXISTS procedure_name;
ALTER TABLE orders DROP COLUMN IF EXISTS room_number;
