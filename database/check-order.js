// Simple helper script to check an order by order_number in Postgres.
// Usage:
//   1) Fill in the connection details below from your Railway Postgres.
//   2) Optionally change ORDER_NUMBER.
//   3) Run: node check-order.js

const { Client } = require('pg');

// TODO: replace these with your actual Railway Postgres credentials
const client = new Client({
  host: 'postgres.railway.internal',
  port: 5432,
  database: 'railway',
  user: 'postgres',
  password: 'crzgAzOEsgipEXstIUNrovONVRMhutWl',
  ssl: { rejectUnauthorized: false }, // Railway usually requires SSL
});

// Change this if you want to check a different order
const ORDER_NUMBER = '20260204-0025';

async function main() {
  try {
    await client.connect();
    console.log('Connected to Postgres');

    const query = `
      SELECT id, order_number, payment_status, status, created_at
      FROM orders
      WHERE order_number = $1
    `;

    const res = await client.query(query, [ORDER_NUMBER]);

    console.log(`Results for order_number = ${ORDER_NUMBER}:`);
    console.log(res.rows);
  } catch (err) {
    console.error('Error running query:', err);
  } finally {
    await client.end().catch(() => {});
  }
}

main();

