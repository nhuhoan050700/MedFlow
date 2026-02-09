# n8n query parameters: Get Order, Get Order By Number, Update Order (SePay)

These are the **Query Parameters** expressions you set in the Postgres node in n8n (under **Additional Fields → Query Parameters**). They map webhook data to the SQL `$1`, `$2`, etc.

---

## 1. Get Order (order-status)

**Postgres node – Query Parameters:**

```
={{ [$json.query?.order_id] }}
```

- **$1** = `order_id` from the GET query string (e.g. `?order_id=51`).
- Webhook: GET request; n8n puts query params in `$json.query`.

---

## 2. Get Order By Number (order-by-number)

**Postgres node – Query Parameters:**

```
={{ [$json.query?.order_number] }}
```

- **$1** = `order_number` from the GET query string (e.g. `?order_number=20260207-0001`).
- Webhook: GET request; query in `$json.query`.

---

## 3. Update Order (SePay)

The workflow uses a **Normalize Body** Code node after the webhook so the Postgres node always gets a consistent shape.

**Postgres node – Query Parameters** (input comes from Normalize Body, not the webhook):

```
={{ [$json.order_invoice_number, 'sepay:' + $json.transaction_id] }}
```

- **$1** = `order_invoice_number` (string; single or comma-separated, e.g. `20260207-0001` or `20260207-0001,20260207-0002`).
- **$2** = `transaction_id` (prefixed as `sepay:...` in the query).
- The **Normalize Body** node reads from `$json.body` or `$json` and supports both object and stringified JSON, and outputs `{ order_invoice_number, transaction_id }`.

---

## Copy-paste reference

| Workflow              | Query Parameters (paste in n8n Postgres node) |
|-----------------------|-----------------------------------------------|
| **Get Order**         | `={{ [$json.query?.order_id] }}` |
| **Get Order By Number** | `={{ [$json.query?.order_number] }}` |
| **Update Order (SePay)** (after Normalize Body node) | `={{ [$json.order_invoice_number, 'sepay:' + $json.transaction_id] }}` |
