const express = require('express');
const { Pool } = require('pg'); // PostgreSQL client
const { createClient } = require('redis'); // Redis client
const app = express();

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const REDIS_URL = process.env.REDIS_URL;

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
});

// Create a Redis client
const redisClient = createClient({
  url: REDIS_URL,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

// Connect to Redis
(async () => {
  await redisClient.connect();
})();

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // PostgreSQL health check
    const dbResult = await pool.query('SELECT NOW()');

    // Redis health check
    const redisPing = await redisClient.ping();

    res.status(200).json({
      dbStatus: `Connected: ${dbResult.rows[0].now}`,
      redisStatus: `Connected: ${redisPing}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Health check failed');
  }
});

// Hello World endpoint
app.get('/', (req, res) => {
  res.send('Hello, World!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
