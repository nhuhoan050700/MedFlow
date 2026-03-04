-- One-off: mark a paid order as paid when the webhook/confirm didn't update it.
-- The app uses unpaid_orders + paid_orders (not the old orders table).
-- Run in Railway's SQL tab (or psql) against your database.

-- Replace 'YOUR_ORDER_NUMBER' with the real order number (e.g. 20260223-0001).

-- Option A: Full fix in one go (mark unpaid_orders paid + create paid_orders rows from pending_procedures).
WITH upd AS (
  UPDATE unpaid_orders
  SET
    payment_status = 'paid',
    paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP),
    payment_intent_id = COALESCE(NULLIF(TRIM(payment_intent_id), ''), 'manual-fix')
  WHERE order_number = 'YOUR_ORDER_NUMBER'
    AND payment_status != 'paid'
  RETURNING id, paid_at, pending_procedures
),
expanded AS (
  SELECT u.id, u.paid_at,
         (e->>'id')::int AS procedure_id,
         COALESCE(e->>'name', e->>'procedure_name', 'Procedure') AS procedure_name,
         COALESCE(e->>'room', e->>'room_number', '') AS room_number,
         COALESCE((e->>'price')::numeric, 0) AS amount
  FROM upd u, jsonb_array_elements(u.pending_procedures) AS e
)
INSERT INTO paid_orders (order_id, procedure_id, procedure_name, room_number, amount, paid_at, state)
SELECT id, procedure_id, procedure_name, room_number, amount, paid_at, 'pending'
FROM expanded e
WHERE NOT EXISTS (SELECT 1 FROM paid_orders po WHERE po.order_id = e.id);

-- Option B: Only mark unpaid_orders as paid (if paid_orders rows already exist).
-- UPDATE unpaid_orders
-- SET payment_status = 'paid', paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP),
--     payment_intent_id = COALESCE(NULLIF(TRIM(payment_intent_id), ''), 'manual-fix')
-- WHERE order_number = 'YOUR_ORDER_NUMBER' AND payment_status != 'paid'
-- RETURNING id, order_number, payment_status, paid_at;

-- Fix by id (e.g. 57): replace order_number in the WITH above with: WHERE id = 57 AND payment_status != 'paid'
