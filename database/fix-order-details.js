/**
 * Backfill procedure_name, room_number, total_amount for orders that were created
 * with NULL values (e.g. before the procedure-selection fix).
 *
 * Usage:
 *   node fix-order-details.js 62 Test     # order 62, use procedure name "Test"
 *   node fix-order-details.js 62 6        # order 62, use procedure id 6
 *   node fix-order-details.js 20260214-0003 Test   # by order_number
 */

const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (_) {}
const { Client } = require('pg');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const orderArg = process.argv[2];
const procedureArg = process.argv[3];
if (!orderArg || !procedureArg) {
  console.error('Usage: node fix-order-details.js <order_id_or_number> <procedure_name_or_id>');
  console.error('Example: node fix-order-details.js 62 Test');
  process.exit(1);
}

const byNumber = /^\d{8}-\d{4}$/.test(orderArg);
const orderId = byNumber ? null : parseInt(orderArg, 10);
const orderNumber = byNumber ? orderArg : null;

async function run() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    await client.query("SET timezone = 'Asia/Ho_Chi_Minh'");

    const procId = parseInt(procedureArg, 10);
    const procName = isNaN(procId) ? procedureArg : null;

    const procRes = procName
      ? await client.query('SELECT id, name, room_number, price FROM procedures WHERE LOWER(name) LIKE LOWER($1) LIMIT 1', [`%${procName}%`])
      : await client.query('SELECT id, name, room_number, price FROM procedures WHERE id = $1', [procId]);

    if (!procRes.rows[0]) {
      console.error('Procedure not found:', procedureArg);
      process.exit(1);
    }
    const proc = procRes.rows[0];

    const where = byNumber ? 'order_number = $1' : 'id = $1';
    const res = await client.query(
      `UPDATE orders SET procedure_name = $2, room_number = $3, total_amount = $4
       WHERE ${where} RETURNING id, order_number, procedure_name, room_number, total_amount`,
      byNumber ? [orderNumber, proc.name, proc.room_number, proc.price] : [orderId, proc.name, proc.room_number, proc.price]
    );

    if (res.rowCount === 0) {
      console.log('Order not found:', orderArg);
      return;
    }
    console.log('Updated:', res.rows[0]);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
