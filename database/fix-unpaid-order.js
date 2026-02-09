/**
 * Mark paid order(s) as paid in Railway when the webhook didn't update them.
 * Uses DATABASE_URL (e.g. set in Railway or .env).
 *
 * Usage:
 *   node fix-unpaid-order.js [order_number]     # e.g. node fix-unpaid-order.js 20260207-0006
 *   node fix-unpaid-order.js --id 57            # fix by order id
 *   railway run node fix-unpaid-order.js 20260207-0006
 */

const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (_) {}
const { Client } = require('pg');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL is not set. Set it or use: railway run node fix-unpaid-order.js [order_number]');
  process.exit(1);
}

const arg = process.argv[2];
const arg2 = process.argv[3];
const byId = arg === '--id' && arg2;
const orderNumber = byId ? null : (arg || '20260207-0006');
const orderId = byId ? parseInt(arg2, 10) : null;

async function run() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    await client.query("SET timezone = 'Asia/Ho_Chi_Minh'");

    if (orderId != null && !isNaN(orderId)) {
      const res = await client.query(
        `UPDATE orders
         SET payment_status = 'paid', status = 'paid', paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP),
             payment_intent_id = COALESCE(NULLIF(TRIM(payment_intent_id), ''), 'sepay:manual-fix')
         WHERE id = $1 AND payment_status != 'paid'
         RETURNING id, order_number, payment_status, status`,
        [orderId]
      );
      if (res.rowCount === 0) {
        console.log('No row updated (id not found or already paid):', orderId);
        return;
      }
      console.log('Updated by id:', res.rows);
      return;
    }

    const res = await client.query(
      `UPDATE orders
       SET payment_status = 'paid', status = 'paid', paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP),
           payment_intent_id = COALESCE(NULLIF(TRIM(payment_intent_id), ''), 'sepay:manual-fix')
       WHERE order_number = $1 AND payment_status != 'paid'
       RETURNING id, order_number, payment_status, status`,
      [orderNumber]
    );
    if (res.rowCount === 0) {
      console.log('No row updated (order_number not found or already paid):', orderNumber);
      return;
    }
    console.log('Updated by order_number:', res.rows);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
