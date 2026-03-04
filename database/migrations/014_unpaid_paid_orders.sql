-- Replace orders + order_items with unpaid_orders and paid_orders.
-- unpaid_orders: one row per order before/until payment.
-- paid_orders: one row per procedure after payment (order_id = unpaid_orders.id).

-- 1. Create unpaid_orders (stores procedures in pending_procedures until paid)
CREATE TABLE IF NOT EXISTS unpaid_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_status VARCHAR(50) DEFAULT 'unpaid',
    payment_intent_id VARCHAR(255),
    total_amount DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP,
    pending_procedures JSONB
);
CREATE INDEX IF NOT EXISTS idx_unpaid_orders_user_id ON unpaid_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_unpaid_orders_order_number ON unpaid_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_unpaid_orders_payment_status ON unpaid_orders(payment_status);

-- 2. Create paid_orders (one row per procedure; state = pending | in_progress | done)
CREATE TABLE IF NOT EXISTS paid_orders (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES unpaid_orders(id) ON DELETE CASCADE,
    procedure_id INTEGER REFERENCES procedures(id) ON DELETE SET NULL,
    procedure_name VARCHAR(255),
    room_number VARCHAR(50),
    amount DECIMAL(10, 2),
    paid_at TIMESTAMP,
    state VARCHAR(50) DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS idx_paid_orders_order_id ON paid_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_paid_orders_state ON paid_orders(state);

-- 3. Migrate data: orders -> unpaid_orders (preserve id for order_updates and paid_orders.order_id)
-- Build pending_procedures only from order_items (no dependency on orders.pending_procedures column)
INSERT INTO unpaid_orders (id, order_number, user_id, payment_status, payment_intent_id, total_amount, created_at, paid_at, pending_procedures)
SELECT o.id, o.order_number, o.user_id, COALESCE(o.payment_status, 'unpaid'), o.payment_intent_id, o.total_amount, o.created_at, o.paid_at,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('id', oi.procedure_id, 'name', oi.procedure_name, 'room', oi.room_number, 'room_number', oi.room_number, 'price', oi.amount))
    FROM order_items oi WHERE oi.order_id = o.id),
    '[]'::jsonb
  )
FROM orders o;

-- Set sequence so new unpaid_orders get ids after max
SELECT setval(pg_get_serial_sequence('unpaid_orders', 'id'), COALESCE((SELECT MAX(id) FROM unpaid_orders), 1));

-- 4. Migrate paid order items -> paid_orders (only for orders that are paid)
INSERT INTO paid_orders (id, order_id, procedure_id, procedure_name, room_number, amount, paid_at, state)
SELECT oi.id, oi.order_id, oi.procedure_id, oi.procedure_name, oi.room_number, oi.amount, o.paid_at, COALESCE(NULLIF(oi.status, ''), 'pending')
FROM order_items oi
JOIN orders o ON o.id = oi.order_id AND o.payment_status = 'paid';

SELECT setval(pg_get_serial_sequence('paid_orders', 'id'), COALESCE((SELECT MAX(id) FROM paid_orders), 1));

-- 5. order_updates: point order_id to unpaid_orders (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_updates') THEN
    ALTER TABLE order_updates DROP CONSTRAINT IF EXISTS order_updates_order_id_fkey;
    ALTER TABLE order_updates ADD CONSTRAINT order_updates_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES unpaid_orders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 6. Generate order number from unpaid_orders
CREATE OR REPLACE FUNCTION generate_order_number() RETURNS VARCHAR(50) AS $$
DECLARE
    new_order_number VARCHAR(50);
    date_prefix VARCHAR(10);
    sequence_num INTEGER;
BEGIN
    date_prefix := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 10) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM unpaid_orders
    WHERE order_number LIKE date_prefix || '%';
    new_order_number := date_prefix || '-' || LPAD(sequence_num::TEXT, 4, '0');
    RETURN new_order_number;
END;
$$ LANGUAGE plpgsql;

-- 7. Drop old tables (order_items first due to FK to orders)
DROP TABLE IF EXISTS order_items;
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
DROP TABLE IF EXISTS orders;
