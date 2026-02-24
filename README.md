# MedFlow

QR-based patient check-in and visit flow. Customer scans a QR code, signs in with Google, chooses procedures, pays via QR, and follows procedure status; workers use a dashboard to execute and update status. Data is stored in a cloud database.

## Workflow

- **Customer arrives** → Scans QR code at the place.
- **Login** → Signs in with a Google account.
- **Choose procedures** → Patient selects the procedures they need.
- **Pay** → Payment is done through QR code.
- **Follow procedures** → Procedures are shown for the user to follow (e.g. order and status per procedure).
- **Worker dashboard** → Paid procedures are shown on the worker dashboard so staff can follow and execute them (e.g. mark in progress or done).
- **Cloud database** → All data is stored in a cloud-based database.
- **Analytics dashboard** → Interactive revenue analytics page with time-series charts (Recharts) powered by live data from the database.

## Project structure

```
.
├── database/
│   ├── schema.sql              # PostgreSQL schema
│   ├── migrations/             # Schema migrations
│   ├── run-migration.js       # Run a migration (DATABASE_URL)
│   └── package.json
├── n8n-workflows/
│   ├── check-in.json
│   ├── procedure-selection.json
│   ├── cart-checkout.json
│   ├── payment.json
│   ├── cart-payment.json
│   ├── sepay-ipn.json
│   ├── worker-orders.json
│   ├── update-item-status.json
│   └── README.md
├── frontend/                   # Customer app (Next.js)
│   ├── src/
│   │   ├── app/               # Pages, API routes
│   │   ├── components/
│   │   └── lib/
│   └── package.json
├── worker-dashboard/           # Staff app
│   └── src/
├── DEPLOYMENT.md
├── SETUP.md
└── README.md
```
