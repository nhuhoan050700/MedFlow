# n8n Workflows

Your **website does not talk to Railway directly**. It only talks to n8n webhooks. So even when your `procedures` table has data, the frontend will show "Could not load procedures" until the Procedure Selection workflow is **imported, configured, and active** in n8n.

## Procedure Selection – Get it working

The frontend calls this URL (via `/api/procedures`):

```
GET {NEXT_PUBLIC_N8N_WEBHOOK_URL}/procedures
```

Example: `https://nhuhoang.app.n8n.cloud/webhook/procedures`

All 4 of these must be true:

| # | Requirement | You |
|---|-------------|-----|
| 1 | `procedures` table has data (Railway) | ✅ Done |
| 2 | Procedure Selection workflow exists in n8n | Import `procedure-selection.json` |
| 3 | Webhook path is exactly `procedures` (GET) | ✅ In the JSON |
| 4 | Workflow is **Active** (toggle ON) | Turn it on in n8n |

### Steps in n8n

1. **Import**  
   Workflows → Import from File → choose `procedure-selection.json`.  
   **Re-import** if you already have it — the workflow was updated to correctly read `procedure_id` from the webhook body (fixes orders with NULL procedure_name/room_number).

2. **Credentials**  
   Open the **Get Procedures** (Postgres) node → set credentials to your **PostgreSQL Railway** connection.

3. **Activate**  
   Top-right **Active** = **ON**.  
   If it’s off, the webhook URL will 404 and the site will show "Could not load procedures".

4. **Test in the browser**  
   Open:
   ```
   https://YOUR-N8N-DOMAIN/webhook/procedures
   ```
   You should see:
   ```json
   { "success": true, "procedures": [ { "id": 1, "name": "...", ... } ] }
   ```
   If that works, the website will work too.

### Flow (no shortcuts)

```
Website  →  GET /api/procedures  →  Next.js  →  GET {N8N_BASE}/procedures
                                                      ↓
                                              n8n Webhook (path: procedures)
                                                      ↓
                                              Postgres (SELECT * FROM procedures WHERE is_active = true)
                                                      ↓
                                              Respond to Webhook { success, procedures }
                                                      ↓
                                              Website shows procedure list
```

### If you still see "Could not load procedures"

- Confirm **Active** is ON for the Procedure Selection workflow.
- Open the test URL in a new tab; if you get 404 or an error, the workflow isn’t active or the path is wrong.
- In n8n, run the workflow manually (Execute Workflow) and check the **Get Procedures** and **Respond** nodes for errors or empty output.
- The workflow query is `SELECT * FROM procedures WHERE is_active = true`. If your table has no `is_active` column or rows have `is_active = false`, you’ll get an empty list. Add the column or set `is_active = true` for the rows you want to show.

## Payment: Stripe (card) and Local Bank

You can use **both** Stripe (card) and **local bank transfer**:

- **Stripe:** Import and activate `payment.json` (single order) and `cart-payment.json` (multiple orders). Configure **Stripe API** credentials in n8n and set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in the frontend. The frontend sends `order_id` / `order_ids`, `amount`, and `paymentMethodId` to `process-payment` or `cart-payment`.
- **Local bank:** Import and activate `local-bank-payment.json`. No Stripe needed. The frontend lets the user choose “Bank transfer” and then “I’ve paid by bank”; that calls the same `/api/payment` route with `payment_method: 'bank'`, which proxies to the **local-bank-payment** webhook.

### Local Bank Payment webhook

When the user confirms they paid by bank (or when your bank/backend calls the webhook), the frontend or your system sends:

```
POST {NEXT_PUBLIC_N8N_WEBHOOK_URL}/local-bank-payment
Body (single order):  { order_id: 123, reference: "optional ref" }
Body (multiple):     { order_ids: [1, 2, 3], reference: "optional ref" }
```

The workflow updates `orders` to `payment_status = 'paid'` and `status = 'paid'`, and stores a `payment_intent_id` like `bank:manual` or `bank:{reference}` for audit. You can call this URL from the app (via “I’ve paid by bank”) or from an external system (e.g. your bank’s callback) with the same JSON body.

1. **Import** `local-bank-payment.json` in n8n.
2. Set **PostgreSQL Railway** credentials on the Postgres nodes.
3. **Activate** the workflow.
4. Base URL is the same as other webhooks, e.g. `https://YOUR-N8N-DOMAIN/webhook/local-bank-payment`.

## Cart Payment (multi-procedure checkout, Stripe)

When users add multiple procedures to the cart and pay by **card**, the frontend calls:

```
POST {NEXT_PUBLIC_N8N_WEBHOOK_URL}/cart-payment
Body: { order_ids: [1, 2, 3], amount: 50000, paymentMethodId: "pm_xxx" }
```

Import and activate `cart-payment.json` (same credentials as Payment Processing). This workflow processes a single Stripe payment and updates all listed orders to `paid`.

## SePay (VietQR) and order status

- **SePay IPN** (`sepay-ipn.json`): When SePay sends a payment notification, the frontend forwards it to `POST {N8N_BASE}/sepay-ipn`. The workflow:
  1. Updates orders by `order_invoice_number` to `payment_status = 'paid'` and `status = 'paid'`
  2. **Sends a confirmation email** to the user (email from `users` table) with order details: order number, procedure, room, amount (VND), payment time
  - Import, set **Postgres** and **SMTP** credentials, and **activate**. Email is only sent if the user has an email address.
- When the user lands on the payment success page, the app also calls `/api/payment/sepay/confirm`, which forwards to the same `sepay-ipn` webhook so the order is marked paid even if the IPN was delayed.
- **Order by number** (`order-by-number.json`): `GET {N8N_BASE}/order-by-number?order_number=20260207-0001` returns one order with `procedure_name` for the success page and process tab. Import, set Postgres credentials, and activate.
- **My orders** (`my-orders.json`): `GET {N8N_BASE}/my-orders?user_id=42` returns paid orders for that user (for the frontend Process tab when the user has no orders in state). Uses LEFT JOIN procedures so orders with `procedure_id` NULL still appear. Import, set Postgres credentials, and activate.

## Update Profile (user details)

When a user clicks their avatar and saves name/birthday/phone/address, the frontend calls:

```
POST {NEXT_PUBLIC_N8N_WEBHOOK_URL}/update-profile
Body: { user_id: 123, name: "Jane", birthday: "1990-05-15", phone: "+1234567890", address: "123 Main St" }
```

Import and activate `update-profile.json`. Use the same Postgres credentials as Check-In. The workflow updates the `users` table in Railway (name, birthday, phone, address) and returns the updated user.

**Database:** The `users` table uses `birthday` (DATE) and `address` (TEXT). If you have an existing DB: run `database/migrations/001_add_birthday_replace_age.sql` and `database/migrations/002_add_address.sql` once.

## Payment confirmation email (SePay)

When a user pays via SePay and the IPN is received, the **SePay IPN** workflow sends an email to the user's address (from the `users` table). The email includes:

- Order number
- Procedure name
- Room number
- Amount (VND)
- Payment time (Vietnam timezone)

**Requirements:**
1. **SMTP credentials** in n8n: Credentials → Add → SMTP (e.g. Gmail with app password, or SendGrid, etc.)
2. The **Send Email** node in `sepay-ipn.json` uses `fromEmail: noreply@hospital.com` — update this in the workflow to match your domain (many SMTP providers require the sender to match your account).
3. Users must have an `email` in the `users` table (from Google sign-in or check-in).
