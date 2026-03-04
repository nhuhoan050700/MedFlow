# Setup Guide - MedFlow

This guide will walk you through setting up the entire system step by step.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (Railway recommended)
- n8n account (self-hosted or cloud)
- Google Cloud Console account (for OAuth)
- Stripe account (for payments - test mode is fine)

## Step 1: Database Setup (Railway)

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up/login

2. **Create PostgreSQL Database**
   - Click "New Project"
   - Select "Provision PostgreSQL"
   - Wait for database to be created

3. **Get Connection String**
   - Click on your PostgreSQL service
   - Go to "Variables" tab
   - Copy the `DATABASE_URL` or note down:
     - Host
     - Port
     - Database name
     - User
     - Password

4. **Run Schema**
   - Option A: Use Railway's SQL Editor
     - Click on PostgreSQL → "Query" tab
     - Paste contents of `database/schema.sql`
     - Click "Run"
   
   - Option B: Use psql command line
     ```bash
     psql $DATABASE_URL -f database/schema.sql
     ```

## Step 2: n8n Setup

### Option A: Self-Hosted n8n

1. **Install n8n**
   ```bash
   npm install n8n -g
   ```

2. **Start n8n on port 7035**
   ```bash
   .\start-n8n.bat
   ```
   Or manually:
   ```bash
   set N8N_PORT=7035 && n8n start
   ```
   - Access at `http://localhost:7035`

### Option B: n8n Cloud

1. Sign up at [n8n.cloud](https://n8n.cloud)
2. Create a new workspace

### Configure Credentials

1. **PostgreSQL Credentials**
   - Go to Credentials → Add Credential
   - Select "Postgres"
   - Enter your Railway database connection details:
     - Host: `your-db.railway.app`
     - Database: `railway`
     - User: `postgres`
     - Password: `your-password`
     - Port: `5432`
   - Name it: "PostgreSQL Railway"

2. **Stripe Credentials**
   - Go to Credentials → Add Credential
   - Select "Stripe API"
   - Enter your Stripe Secret Key (starts with `sk_test_`)
   - Name it: "Stripe API"

3. **SMTP Credentials** (for email)
   - Go to Credentials → Add Credential
   - Select "SMTP"
   - Enter your email service details:
     - Host: `smtp.gmail.com` (for Gmail)
     - Port: `587`
     - User: `your-email@gmail.com`
     - Password: `your-app-password`
   - Name it: "SMTP"

### Import Workflows

1. In n8n, go to "Workflows" → "Import from File"
2. Import each workflow from `n8n-workflows/`:
   - `check-in.json`
   - `procedure-selection.json`
   - `payment.json`
   - `cart-payment.json`
   - `local-bank-payment.json` (optional – for “Pay by bank”)
   - `email-confirmation.json`
   - `status-update.json`
   - `worker-orders.json`
   - `order-status.json`

3. **Activate Workflows**
   - Toggle each workflow to "Active"
   - Copy the webhook URLs (you'll need these for frontend)

4. **Note Webhook URLs**
   - Local (port 7035): `http://localhost:7035/webhook`
   - Format: `http://localhost:7035/webhook/check-in`
   - Use base URL `http://localhost:7035/webhook` in frontend `.env.local`

## Step 3: Google OAuth Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new project or select existing

2. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search "Google+ API" → Enable

3. **Create OAuth Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Authorized redirect URIs:
     - `http://localhost:3000` (for local dev)
     - `https://your-domain.com` (for production)
   - Copy the **Client ID** (you'll need this)

## Step 4: Stripe Setup

1. **Create Stripe Account**
   - Go to [stripe.com](https://stripe.com)
   - Sign up/login

2. **Get API Keys**
   - Go to "Developers" → "API keys"
   - Copy:
     - **Publishable key** (starts with `pk_test_`)
     - **Secret key** (starts with `sk_test_`)

3. **Test Cards**
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any CVC

## Step 5: Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create `.env.local` file**
   ```env
   NEXT_PUBLIC_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```
   - Access at `http://localhost:3000`

## Step 6: Worker Dashboard Setup

1. **Navigate to worker dashboard**
   ```bash
   cd worker-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create `.env.local` file**
   ```env
   NEXT_PUBLIC_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```
   - Access at `http://localhost:3001`

## Step 7: Testing the System

### Test Flow:

1. **Patient Check-in**
   - Open `http://localhost:3000`
   - Click "Sign in with Google"
   - Complete Google authentication

2. **Select Procedure**
   - Choose a medical procedure
   - Confirm order creation

3. **Payment**
   - Enter test card: `4242 4242 4242 4242`
   - Any expiry date, any CVC
   - Complete payment

4. **Check Email**
   - Check your email for confirmation
   - Note order number and room assignment

5. **Worker Dashboard**
   - Open `http://localhost:3001`
   - See the order in the list
   - Click "Start Test" → Status changes to "in_progress"
   - Patient's phone should show audio notification
   - Click "Mark Completed" → Status changes to "completed"
   - Patient's phone should update automatically

## Troubleshooting

### Database Connection Issues
- Verify Railway database is running
- Check connection string format
- Ensure IP whitelist allows your IP (if applicable)

### n8n Webhook Not Working
- Ensure workflows are activated
- Check webhook URLs are correct
- Verify credentials are set up properly

### Google OAuth Not Working
- Verify redirect URI matches exactly
- Check Client ID is correct
- Ensure Google+ API is enabled

### Stripe Payment Failing
- Use test mode keys (starts with `pk_test_` and `sk_test_`)
- Verify card details are correct
- Check Stripe dashboard for error logs
- You can still use **Pay by bank** without Stripe: import and activate `local-bank-payment.json` and use the “Bank transfer” option on the payment screen

### Frontend Not Updating
- Check browser console for errors
- Verify environment variables are set
- Ensure n8n webhooks are accessible

## Production Deployment

### Frontend (Vercel)
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Worker Dashboard (Vercel)
1. Same as frontend, deploy as separate project
2. Use port 3001 or different subdomain

### n8n
- Use n8n.cloud for production
- Or deploy self-hosted n8n on Railway/Heroku

### Database
- Railway PostgreSQL is production-ready
- Consider backups and monitoring

## Security Notes

- Never commit `.env` files
- Use environment variables for all secrets
- Enable HTTPS in production
- Set up proper authentication for worker dashboard
- Use Stripe webhooks for payment verification (recommended)

## Next Steps

- Add QR code scanning functionality
- Implement real-time WebSocket updates
- Add authentication to worker dashboard
- Set up email templates
- Add analytics and reporting
