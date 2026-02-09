-- One-off: mark a paid order as paid in Railway when the webhook didn't update it.
-- Run this in Railway's SQL tab (or psql) against your orders database.

-- Fix a single order by order_number (e.g. 20260207-0006):
UPDATE orders
SET
  payment_status = 'paid',
  status = 'paid',
  paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP),
  payment_intent_id = COALESCE(NULLIF(TRIM(payment_intent_id), ''), 'sepay:manual-fix')
WHERE order_number = '20260207-0006'
  AND payment_status != 'paid'
RETURNING id, order_number, payment_status, status;

-- Or fix by id (e.g. 57):
-- UPDATE orders
-- SET payment_status = 'paid', status = 'paid', payment_intent_id = COALESCE(NULLIF(TRIM(payment_intent_id), ''), 'sepay:manual-fix')
-- WHERE id = 57 AND payment_status != 'paid'
-- RETURNING id, order_number, payment_status, status;
