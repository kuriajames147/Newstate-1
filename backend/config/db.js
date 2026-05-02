const { Pool } = require('pg');
require('dotenv').config();

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Log when connected
pool.on('connect', () => {
  console.log('✅ PostgreSQL database connected');
});

// Log errors
pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err.message);
});

module.exports = pool;