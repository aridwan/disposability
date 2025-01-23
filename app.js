const express = require('express');
const { Pool } = require('pg'); // PostgreSQL client
const app = express();

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW()'); // Simple DB query
    res.status(200).send(`DB Connected: ${dbResult.rows[0].now}`);
  } catch (err) {
    res.status(500).send('DB Connection Failed');
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
