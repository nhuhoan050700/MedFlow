# Still unpaid after paying – debug guide

If you paid but Railway still shows **unpaid**, work through this in order.

---

## 1. Check the **Update Order (SePay)** node output

In n8n, open the last run of the SePay IPN workflow.

- **Update Order (SePay) → Output**
  - **0 items** → The UPDATE matched **no rows**. So either the DB wasn’t updated, or n8n is talking to a different DB (see below).
  - **1 or more items** → The UPDATE **did** run and RETURNING returned rows. So that database **was** updated. If Railway still shows unpaid, n8n is almost certainly connected to a **different** database than the one you’re looking at in Railway.

So: **yes, it can be “due to” the output of the Update Order (SePay) node** — 0 items means “nothing was updated”. It can also be “something else” — 1+ items but a different DB.

---

## 2. Check the **Respond** node response

What did the webhook actually return?

- **`"success": false`, `"rows_updated": 0`** → Same as above: UPDATE matched 0 rows (wrong order_number, already paid, or wrong DB).
- **`"success": true`, `"rows_updated": 1`** → n8n thinks it updated one row. If Railway is still unpaid, the Postgres credentials in n8n are very likely pointing to a **different** Railway DB (or another Postgres entirely).

---

## 3. Most likely causes

### A) Update Order (SePay) returns **0 items** (no row updated)

- **order_number mismatch**  
  In Railway, the order has e.g. `order_number = '20260207-0004'`. The payload must send that **exact** value as `order_invoice_number`. Check **Normalize Body** output: is `order_invoice_number` exactly `20260207-0004` (no extra spaces, no different format)?

- **Already paid**  
  The row already has `payment_status = 'paid'`. The query has `AND payment_status != 'paid'`, so it correctly skips it. In Railway, confirm that row’s `payment_status` is still `unpaid` when the webhook runs.

- **Webhook not called**  
  The flow only runs when:
  - You land on the **payment success** page (frontend calls `/api/payment/sepay/confirm` → n8n), or
  - **SePay IPN** is configured and SePay calls your `/api/payment/sepay/ipn` → n8n.  
  If neither happens when you “pay”, the Update Order (SePay) node never runs.

### B) Update Order (SePay) returns **1 item** but Railway still unpaid

- **Different database**  
  n8n’s Postgres node is using credentials that point to **another** Postgres (e.g. local, or another Railway project). The UPDATE runs there, so that DB shows paid; the Railway project you’re looking at is a different DB, so it still shows unpaid.

**Fix:** In n8n, open the **Update Order (SePay)** node → Credentials. Ensure that credential uses the **same** Railway Postgres connection string (host, database name, user) as the Railway project where you’re checking the `orders` table.

---

## 4. Quick checks in Railway

1. Open the **orders** row for the order you paid.
2. Note:
   - **order_number** (e.g. `20260207-0004`) → must match what you send as `order_invoice_number`.
   - **payment_status** → if it’s already `paid`, the UPDATE will skip it by design.
3. Confirm you’re looking at the **same** Railway project (and same Postgres DB) that n8n’s Postgres credential uses.

---

## 5. Summary

| Update Order (SePay) output | Respond `rows_updated` | Meaning |
|-----------------------------|-------------------------|--------|
| 0 items                     | 0                       | No row updated: wrong `order_number`, already paid, or wrong DB. |
| 1+ items                    | 1+                      | A row was updated in the DB n8n is connected to. If Railway still unpaid → that’s a **different** DB; fix n8n credentials. |

So: **if the output of the Update Order (SePay) node is 0 items, that’s why it’s still unpaid** (no update). If it’s 1+ items and Railway is still unpaid, the cause is **something else**: almost always the **wrong database** in n8n’s Postgres credentials.
