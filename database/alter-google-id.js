// One-off script to widen key users columns
// Usage:
//   1. Install dependency: npm install pg
//   2. Set DATABASE_URL to your Railway Postgres URL
//   3. Run: node alter-google-id.js

const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('Missing DATABASE_URL environment variable.');
    console.error('Set it to your Railway Postgres connection string and try again.');
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database, running ALTER TABLE ...');

    // Widen key text columns by removing strict length limits
    await client.query(`
      ALTER TABLE users
        ALTER COLUMN google_id TYPE TEXT,
        ALTER COLUMN email     TYPE TEXT,
        ALTER COLUMN name      TYPE TEXT,
        ALTER COLUMN phone     TYPE TEXT;
    `);

    console.log('Successfully updated users column types to TEXT.');
  } catch (err) {
    console.error('Error running ALTER TABLE:', err);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});