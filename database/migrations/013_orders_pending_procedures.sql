-- Store procedures on the order until payment; move to order_items only when paid.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS pending_procedures JSONB;

COMMENT ON COLUMN orders.pending_procedures IS 'Procedures (procedure_id, name, room, price) until payment; cleared when paid and copied to order_items.';
