## MedFlow Architecture & Flows

This document describes how the MedFlow system works end to end: how the frontend and worker dashboard talk to Next.js API routes, how those proxy to n8n webhooks, and how everything persists data in PostgreSQL.

---

## 1. High-level architecture

```mermaid
flowchart LR
  subgraph Client["Browsers"]
    U["Patient browser\nhttps://medflowio.vercel.app"]
    W["Worker browser\nhttps://medflowio.vercel.app/worker-dashboard"]
    A["Analytics browser\n/analytics"]
  end

  subgraph FE["Next.js Frontend (Vercel, `frontend/`)"]
    FEUI["React UI\n`page.tsx` + components"]
    FEAPI["API routes `/api/*`\n(serverless functions)"]
  end

  subgraph WD["Next.js Worker Dashboard (Vercel, `worker-dashboard/`)"]
    WUI["Worker UI"]
    WAPI["Worker API `/api/*`\n(serverless functions)"]
  end

  subgraph N8N["n8n (Cloud or self‑host)\nbase = NEXT_PUBLIC_N8N_WEBHOOK_URL + `/webhook`"]
    N_checkin["/check-in\n→ upsert `users`"]
    N_procs["/procedures\n→ list `procedures`"]
    N_cart["/cart-checkout\n→ insert `unpaid_orders`"]
    N_localbank["/local-bank-payment\n→ mark paid + `paid_orders`"]
    N_sepay["/sepay-ipn\n→ SePay IPN → paid + email"]
    N_worker["/worker-orders (legacy)"]
    N_updItem["/update-item-status (legacy)"]
    N_orderStatus["/order-status (legacy)"]
  end

  subgraph DB["PostgreSQL (Railway)"]
    T_users["`users`"]
    T_procs["`procedures`"]
    T_unpaid["`unpaid_orders`"]
    T_paid["`paid_orders`"]
  end

  extGoogle["Google OAuth\nuserinfo API"]
  extStripe["Stripe (optional, mostly disabled now)"]
  extSePay["SePay / Bank\nQR gateway"]
  extSMTP["SMTP email server"]

  U --> FEUI
  W --> WUI
  A --> FEUI

  FEUI -->|"fetch `/api/*`"| FEAPI
  WUI  -->|"fetch `/api/*`"| WAPI

  FEAPI -->|"proxy → n8n\n(check-in, procedures, cart-checkout,\nlocal-bank-payment, sepay-ipn/init)"| N8N
  FEAPI -->|"direct SQL via `pg`\n(my-orders, worker-orders,\nupdate-item-status, sepay/confirm, analytics)"| DB

  WAPI -->|"direct SQL via `pg`\n(worker-orders, update-item-status)"| DB

  N8N -->|"Postgres credentials"| DB

  FEUI -->|"OAuth implicit\n+ /userinfo"| extGoogle
  FEUI -->|"card tokenization\n(via Stripe JS, mostly off)"| extStripe
  N8N -->|"charge, webhooks\n(older Stripe flows)"| extStripe

  FEUI -->|"redirect to QR"| extSePay
  extSePay -->|"IPN callbacks"| N_sepay

  N8N -->|"payment emails"| extSMTP
```

---

## 2. Flow – Check-in & user creation

```mermaid
sequenceDiagram
  participant U as User browser
  participant FE as React UI (`page.tsx`)
  participant API as Next `/api/check-in`
  participant N8 as n8n `/webhook/check-in`
  participant DB as Postgres (`users`)

  U->>FE: Click "Continue with Google"
  FE->>extGoogle: Google OAuth implicit flow
  extGoogle-->>FE: access_token
  FE->>extGoogle: GET /userinfo (Authorization: Bearer)
  extGoogle-->>FE: {sub, email, name, ...}

  FE->>API: POST /api/check-in\n{google_id: sub, email, name, ...}
  API->>N8: POST {N8N_BASE}/check-in\n(body forwarded)
  N8->>DB: INSERT ... ON CONFLICT UPDATE\nINTO `users` (google_id, email, name, birthday, phone, address)
  DB-->>N8: user row

  N8-->>API: {success: true, user, sessionToken}
  API-->>FE: same JSON
  FE->>FE: save user + sessionToken in state/localStorage
  FE-->>U: Switch UI step from "Check in" → "Order"
```

Code locations:
- UI: `frontend/src/app/page.tsx`, `frontend/src/components/CheckIn.tsx`
- API: `frontend/src/app/api/check-in/route.ts`
- n8n: `n8n-workflows/check-in.json`

---

## 3. Flow – Procedure listing & cart checkout (creates `unpaid_orders`)

### 3.1 Load procedure list

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend UI
  participant APIp as Next `/api/procedures`
  participant Np as n8n `/webhook/procedures`
  participant DB as Postgres (`procedures`)

  U->>FE: Open "Order" tab
  FE->>APIp: GET /api/procedures?t=timestamp
  APIp->>Np: GET {N8N_BASE}/procedures
  Np->>DB: SELECT * FROM procedures ORDER BY name
  DB-->>Np: rows
  Np-->>APIp: {success:true, procedures:[{id,name,description,price,room_number,...}]}
  APIp-->>FE: same JSON
  FE->>FE: map to `Procedure` objects
  FE-->>U: Show 2‑column grid of procedures with room + price
```

### 3.2 Cart checkout → `unpaid_orders` via n8n

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend UI
  participant APIc as Next `/api/cart-checkout`
  participant Nc as n8n `/webhook/cart-checkout`
  participant DB as Postgres (`unpaid_orders`)

  U->>FE: "Review visit" → "Proceed to payment"
  FE->>APIc: POST /api/cart-checkout\n{user_id, procedures:[{id,name,price,room}]}
  APIc->>Nc: POST {N8N_BASE}/cart-checkout\n(body forwarded)

  Nc->>DB: SELECT generate_order_number()
  Nc->>Nc: compute total_amount\n+ JSON `pending_procedures` array
  Nc->>DB: INSERT INTO unpaid_orders\n(order_number, user_id, payment_status='unpaid', total_amount, pending_procedures JSONB)
  DB-->>Nc: inserted `unpaid_orders` row
  Nc-->>APIc: {success:true, order:{id, order_number, user_id, total_amount, procedure_name, room_number,...}}
  APIc-->>FE: same JSON

  FE->>FE: set `orders=[order]`, store selected procedures\nstep = "payment"
  FE-->>U: Show Payment screen (order number + summary)
```

Code locations:
- UI: `frontend/src/components/ProcedureSelection.tsx`
- APIs: `frontend/src/app/api/procedures/route.ts`, `frontend/src/app/api/cart-checkout/route.ts`
- n8n: `n8n-workflows/procedure-selection.json`, `n8n-workflows/cart-checkout.json`

---

## 4. Flow – Payments (manual bank + SePay)

### 4.1 Manual bank payment via n8n `local-bank-payment`

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Payment UI
  participant APIm as Next `/api/payment`
  participant Nbank as n8n `/webhook/local-bank-payment`
  participant DB as Postgres (`unpaid_orders`, `paid_orders`)

  U->>FE: Choose "Manual bank" → "I’ve paid by bank"
  FE->>APIm: POST /api/payment\n{payment_method:'bank', order_id(s), reference?}

  APIm->>Nbank: POST {N8N_BASE}/local-bank-payment\n(order_id or order_ids + reference)
  Nbank->>DB: UPDATE unpaid_orders\nSET payment_status='paid', paid_at = now()
  Nbank->>DB: INSERT INTO paid_orders\n(one row per procedure, state='pending')
  DB-->>Nbank: updated / inserted rows
  Nbank-->>APIm: {success:true, ...}
  APIm-->>FE: {success:true}

  FE->>FE: call `onSuccess()` → step = "process"
  FE-->>U: Redirect to "Process" tab to track status
```

### 4.2 SePay QR – IPN via n8n + fallback confirm route

Primary IPN path:

```mermaid
sequenceDiagram
  participant SePay as SePay gateway
  participant Nse as n8n `/webhook/sepay-ipn`
  participant DB as Postgres
  participant SMTP as SMTP server

  SePay->>Nse: POST sepay-ipn\n{order_invoice_number, transaction_id, ...}
  Nse->>Nse: normalize order_invoice_number → `YYYYMMDD-NNNN`
  Nse->>DB: SELECT unpaid_orders\nWHERE order_number = order_invoice_number\n  AND payment_status != 'paid'
  DB-->>Nse: unpaid row (with pending_procedures JSON)

  Nse->>DB: UPDATE unpaid_orders\nSET payment_status='paid', paid_at, payment_intent_id='sepay:'+transaction_id
  Nse->>DB: INSERT INTO paid_orders\n(one row per pending_procedures entry,\nstate='pending')
  Nse->>DB: SELECT order + user details\n(order_number, total_amount, room, email, ...)
  DB-->>Nse: data for email

  Nse->>SMTP: Send payment confirmation email\n(to user.email with room, amount, etc.)
  SMTP-->>Nse: OK
  Nse-->>SePay: {success:true, rows_updated:...}
```

Fallback success-page confirm route:

```mermaid
sequenceDiagram
  participant FE as Payment Success page
  participant APIs as Next `/api/payment/sepay/confirm`
  participant DB as Postgres
  participant Nse as n8n `/webhook/sepay-ipn` (if DB env missing)

  FE->>APIs: POST /api/payment/sepay/confirm\n{order_number}
  alt DATABASE_URL configured
    APIs->>DB: UPDATE unpaid_orders\nSET payment_status='paid', paid_at\nWHERE order_number = $1
    DB-->>APIs: unpaid row with pending_procedures
    APIs->>DB: INSERT INTO paid_orders\n(one row per pending_procedures item,\nstate='pending')
    APIs-->>FE: {success:true, rows_updated:1}
  else no DATABASE_URL
    APIs->>Nse: POST {N8N_BASE}/sepay-ipn\n{order_invoice_number: order_number,\n transaction_id:'success-page'}
    Nse->>DB: same UPDATE + INSERT logic as IPN
    Nse-->>APIs: {success, rows_updated}
    APIs-->>FE: {success, rows_updated}
  end
```

Code locations:
- UI: `frontend/src/components/Payment.tsx`, payment success page
- APIs: `frontend/src/app/api/payment/route.ts`, `frontend/src/app/api/payment/sepay/confirm/route.ts`, SePay init route
- n8n: `n8n-workflows/local-bank-payment.json`, `n8n-workflows/sepay-ipn.json`

---

## 5. Flow – Patient "Process" tab (my orders)

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend UI (Process tab)
  participant APImy as Next `/api/my-orders`
  participant DB as Postgres (`unpaid_orders` + `paid_orders`)

  U->>FE: Open "Process" tab or tap Refresh
  FE->>APImy: GET /api/my-orders?user_id={id}
  APImy->>DB: SELECT unpaid_orders uo\nJOIN users u\nJOIN paid_orders po\nWHERE uo.user_id = $1\nORDER BY uo.created_at DESC, po.id ASC
  DB-->>APImy: rows (one per paid_orders item)
  APImy-->>FE: {success:true, orders:[per-procedure rows]}
  FE->>FE: map each DB row → `Order` item\n(status from paid_orders.state)
  FE-->>U: Show list of procedures\nwith room and status badges
```

Code locations:
- UI: `frontend/src/app/page.tsx` (step `'process'`), `frontend/src/components/OrderStatus.tsx`
- API: `frontend/src/app/api/my-orders/route.ts`

---

## 6. Flow – Worker dashboard list & status updates

### 6.1 Worker sees queue of procedures

```mermaid
sequenceDiagram
  participant W as Worker
  participant WUI as Worker UI
  participant WAPI as Worker `/api/worker-orders`
  participant DB as Postgres

  W->>WUI: Open worker dashboard or change filter
  WUI->>WAPI: GET /api/worker-orders?status=pending|in_progress|completed|all
  WAPI->>DB: SELECT unpaid_orders uo\nJOIN users u\nJOIN paid_orders po\nWHERE (status filter)\nORDER BY uo.created_at DESC, uo.id ASC, po.id ASC
  DB-->>WAPI: rows (one per paid_orders item)
  WAPI-->>WUI: {success:true, orders:[...]}
  WUI-->>W: Table of items with room, patient, status
```

### 6.2 Worker updates a procedure item’s status

```mermaid
sequenceDiagram
  participant W as Worker
  participant WUI as Worker UI
  participant WUpd as Worker `/api/update-item-status`
  participant DB as Postgres (`paid_orders`)

  W->>WUI: Click "Start test" or "Mark completed"
  WUI->>WUpd: POST /api/update-item-status\n{item_id, status:'in_progress'|'completed'}
  WUpd->>DB: UPDATE paid_orders\nSET state = $status\nWHERE id = $item_id\nRETURNING id, order_id, procedure_name, room_number, state
  DB-->>WUpd: updated row
  WUpd-->>WUI: {success:true, item:{... status}}
  WUI-->>W: Update row in table

  Note over FE,DB: Patient's "Process" tab uses `/api/my-orders`\nso when refreshed, it reads the same `paid_orders.state`\nupdated by staff.
```

Code locations:
- UI: `worker-dashboard/src/app/page.tsx`, `worker-dashboard/src/components/OrderList.tsx`
- APIs (worker app): `worker-dashboard/src/app/api/worker-orders/route.ts`, `worker-dashboard/src/app/api/update-item-status/route.ts`
- APIs (main app mirrors): `frontend/src/app/api/worker-orders/route.ts`, `frontend/src/app/api/update-item-status/route.ts`
- n8n equivalents: `n8n-workflows/worker-orders.json`, `n8n-workflows/update-item-status.json`

