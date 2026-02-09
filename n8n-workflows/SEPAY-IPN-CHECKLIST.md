# SePay IPN: Webhook vs DB Update Checklist

Your flow can return `200` and `"Payment recorded"` while Railway still shows **unpaid** if the **database UPDATE** step doesn’t run or doesn’t match any row. This checklist matches that to our workflow and what to verify.

---

## Our flow order (must be this)

```
SePay → Webhook → Normalize Body → UPDATE order in DB (Railway) → Respond to Webhook
```

- **Respond runs only after** the Postgres “Update Order (SePay)” node.
- So “success” in the response does **not** guarantee the DB was updated; you must confirm the UPDATE node output.

---

## Checklist (map to our setup)

### 1. We do update the order in Railway

- **Node:** “Update Order (SePay)” (Postgres).
- **Query:**  
  `UPDATE orders SET payment_status = 'paid', status = 'paid', payment_intent_id = ... WHERE order_number IN (...) AND payment_status != 'paid' RETURNING id, order_number`
- If this node **errors** or is **skipped** → Railway stays unpaid.

### 2. Correct identifier mapping

- **SePay / our payload sends:** `order_invoice_number` (e.g. `"20260207-0001"`).
- **Our DB column:** `orders.order_number` (same value).
- **“Normalize Body”** node reads:
  - `order_invoice_number` from our payload, or
  - `order.order_invoice_number` from SePay’s nested payload,
  and passes it to the Postgres node as `$1`.
- **Check:** In n8n, open the **Normalize Body** output and confirm `order_invoice_number` is exactly the value you have in Railway for that order (e.g. `20260207-0001`). No typo, no extra field like `order_id` used in the WHERE.

### 3. UPDATE actually affects rows

- In n8n, open the **“Update Order (SePay)”** node output.
- You should see **RETURNING** data: at least one object with `id` and `order_number`.
- If the output is **empty** or **0 rows** → `WHERE` matched nothing (wrong `order_invoice_number` or already `payment_status = 'paid'`).

### 4. Respond runs after the DB update

- In our workflow, **Respond to Webhook** is the last node and is connected **from** “Update Order (SePay)”.
- So: Webhook → Normalize Body → **Update Order (SePay)** → **Respond Success**.  
  Respond never runs before the UPDATE.

### 5. Backend / UI read the same fields we set

- We set: `payment_status = 'paid'` and `status = 'paid'`.
- Worker dashboard and app filter by `payment_status = 'paid'` and use `status` for display.
- So Railway (and any backend) must read **these** columns; no mismatch like `paid = true` vs `status === 'PAID'`.

---

## What to do in n8n (quick verify)

1. **Run the workflow** (trigger with a test payment or your confirm API).
2. **Open “Normalize Body”** → check output: `order_invoice_number` and `transaction_id` present and correct.
3. **Open “Update Order (SePay)”** → check output: at least one row with `id` and `order_number` (from RETURNING).
4. **Check Railway:** that order’s `payment_status` and `status` should be `paid`.

If step 3 shows **no rows**, the problem is identifier mapping or the order was already paid; fix Normalize Body or the payload so `order_invoice_number` matches `orders.order_number` in Railway.

---

## Response body: truth from the DB (not from the Postgres node “success”)

The **Respond** node now responds **based on whether the UPDATE actually affected rows**:

- **When at least 1 row was updated:**
  ```json
  { "success": true, "message": "Order marked as paid", "rows_updated": 1 }
  ```
- **When 0 rows were updated** (order not found, or already paid):
  ```json
  { "success": false, "message": "Order not updated (not found or already paid)", "rows_updated": 0 }
  ```

So you can **stop trusting “success” from the Postgres node** — the HTTP response now reflects the real outcome. If you see `success: false` and `rows_updated: 0`, fix identifier mapping or check that the order isn’t already paid.

The **Update Order (SePay)** node’s RETURNING clause now includes `payment_status` and `status`, so in n8n you can open that node’s output and see the updated row (or no rows when nothing was updated).
