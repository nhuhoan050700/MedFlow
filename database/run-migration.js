/**
 * Run a migration file against DATABASE_URL (no psql required).
 * Usage: node run-migration.js [migration-file]
 * Example: node run-migration.js migrations/006_add_paid_at.sql
 * DATABASE_URL: set in env, or in database/.env (use public Railway URL when running locally).
 */

const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '.env') }); } catch (_) {}
const fs = require('fs');
const { Client } = require('pg');

const migrationFile = process.argv[2] || 'migrations/003_generate_queue_number_arr.sql';
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('DATABASE_URL is not set. Set it or use: railway run npm run migrate');
  process.exit(1);
}

const sqlPath = path.resolve(__dirname, migrationFile);
if (!fs.existsSync(sqlPath)) {
  console.error('File not found:', sqlPath);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');

async function run() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    await client.query("SET timezone = 'Asia/Ho_Chi_Minh'");
    await client.query(sql);
    console.log('Migration ran successfully:', migrationFile);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
