# Hospital Testing Service Center System (n8n)

A comprehensive QR-based patient check-in system built with n8n, PostgreSQL, and modern web technologies.

## System Overview

This system automates the entire patient journey from check-in to test completion:

1. **QR Code Check-in** → Patient scans QR code to enter system
2. **Google Sign-In** → Secure authentication and data collection
3. **Procedure Selection** → Choose medical test/service
4. **Payment Processing** → Secure payment via Stripe
5. **Email Confirmation** → Automated order confirmation emails
6. **Room Assignment** → Automatic queue number and room assignment
7. **Audio Guidance** → Text-to-speech directions for patients
8. **Worker Dashboard** → Staff interface to mark tests as completed
9. **Real-time Updates** → Live status synchronization

## Tech Stack

- **Workflow Engine**: n8n (self-hosted or cloud)
- **Database**: PostgreSQL (Railway)
- **Frontend**: Next.js + React
- **Authentication**: Google OAuth
- **Payment**: Stripe (test mode)
- **Email**: SMTP/Gmail/SendGrid
- **Analytics**: Azure Data Factory + Power BI
- **Deployment**: Vercel (frontend), Railway (database)

## Project Structure

```
.
├── database/
│   └── schema.sql          # PostgreSQL database schema
├── n8n-workflows/
│   ├── check-in.json       # QR check-in workflow
│   ├── procedure-selection.json
│   ├── payment.json
│   ├── email-confirmation.json
│   └── status-update.json
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js app directory
│   │   ├── components/     # React components
│   │   └── lib/            # Utilities
│   └── public/             # Static assets
├── worker-dashboard/
│   └── src/                # Staff dashboard app
├── analytics/              # Analytics layer (ADF + Power BI)
│   ├── adf-pipelines/      # Azure Data Factory pipelines
│   ├── azure-sql/          # Analytics database schema
│   └── power-bi/           # Power BI dashboards
└── README.md
```

## Quick Start

### 1. Database Setup (Railway)

1. Create a new PostgreSQL database on [Railway](https://railway.app)
2. Copy the connection string
3. Run the schema:

```bash
psql $DATABASE_URL -f database/schema.sql
```

Or use Railway's SQL editor to paste and run `database/schema.sql`

### 2. n8n Setup

1. Install n8n (self-hosted or use n8n.cloud):
   ```bash
   npm install n8n -g
   n8n start
   ```

2. Import workflows from `n8n-workflows/` directory

3. Configure credentials:
   - PostgreSQL connection
   - Google OAuth
   - Stripe API keys
   - Email service (SMTP/Gmail)

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Set environment variables:
```env
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
NEXT_PUBLIC_DATABASE_URL=your-postgres-connection-string
```

### 4. Worker Dashboard

```bash
cd worker-dashboard
npm install
npm run dev
```

## Workflow Details

### Check-in Workflow
- Receives QR scan data
- Creates/updates user record
- Returns user session

### Procedure Selection
- Lists available procedures
- Creates order record
- Generates order number

### Payment Workflow
- Processes Stripe payment
- Updates order status
- Triggers email confirmation

### Email Confirmation
- Sends order details
- Includes room number and queue number
- Provides instructions

### Status Update
- Worker marks test as completed
- Updates database
- Notifies patient (real-time)

## Environment Variables

### n8n
- `DB_POSTGRES_HOST`
- `DB_POSTGRES_DATABASE`
- `DB_POSTGRES_USER`
- `DB_POSTGRES_PASSWORD`
- `STRIPE_SECRET_KEY`
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`

### Frontend
- `NEXT_PUBLIC_N8N_WEBHOOK_URL`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_DATABASE_URL`

## Features

- QR code-based check-in
- Google OAuth authentication
- Procedure selection with pricing
- Stripe payment integration
- Automated email notifications
- Queue number generation
- Room assignment logic
- Audio guidance (Text-to-Speech)
- Real-time status updates
- Worker dashboard for staff
- Analytics pipeline (ADF + Power BI)
- Automated business intelligence dashboards

## CV Highlights

This project demonstrates:
- **Event-driven architecture** with n8n workflows
- **Full-stack development** (frontend + backend + database)
- **API integration** (OAuth, payment, email)
- **Real-time synchronization** between multiple interfaces
- **Workflow automation** for healthcare processes
- **Database design** and optimization

## License

MIT
