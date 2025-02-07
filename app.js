const express = require('express');
const { Pool } = require('pg'); // PostgreSQL client
const { createClient } = require('redis'); // Redis client
const { MongoClient } = require('mongodb'); // MongoDB client
const { Kafka } = require('kafkajs'); // Kafka client

const app = express();

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const REDIS_URL = process.env.REDIS_URL;
const MONGO_URL = process.env.MONGO_URL;
const KAFKA_BROKER = process.env.KAFKA_BROKER;

let pool, redisClient, mongoDb, kafkaProducer;

var isReady = false;
var isStarted = false;
var isHealthy = false;

var pendingTasks = 0;

// Initialize connections
async function initConnections() {
  try {
    // PostgreSQL connection pool
    pool = new Pool({ connectionString: DATABASE_URL });

    // Redis client
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on('error', (err) => console.error('Redis Client Error:', err));
    await redisClient.connect();

    // MongoDB client
    const mongoClient = new MongoClient(MONGO_URL);
    await mongoClient.connect();
    mongoDb = mongoClient.db("mydb");
    
    console.log('Connected to MongoDB');

    // Kafka producer
    const kafka = new Kafka({ brokers: [KAFKA_BROKER] });
    kafkaProducer = kafka.producer();
    await kafkaProducer.connect();
    console.log('Connected to Kafka');

  } catch (err) {
    console.error('Error initializing connections:', err);
    process.exit(1);
  }
}

// Close all connections
async function closeConnections() {
  try {
    // Close PostgreSQL pool
    await pool.end();
    console.log('PostgreSQL connection closed.');

    // Close Redis client
    await redisClient.quit();
    console.log('Redis connection closed.');

    // Close MongoDB connection
    if (mongoDb) {
      await mongoDb.client.close();
      console.log('MongoDB connection closed.');
    }

    // Close Kafka producer
    await kafkaProducer.disconnect();
    console.log('Kafka producer connection closed.');
    isReady = false;
    isStarted = false;
    isHealthy = false;
  } catch (err) {
    console.error('Error closing connections:', err);
  }
}

// API Routes
app.get('/health', handleHealthCheck);
app.get('/liveness', handleLivenessCheck);
app.get('/readiness', handleReadinessCheck);
app.get('/startup', handleStartupCheck);
app.get('/long-process', handleLongProcess);
app.post('/insert-mongo', handleInsertMongo);
app.get('/', (req, res) => res.send('Hello, World!'));

// Simulate long process
async function handleLongProcess(req, res) {
  try {
    pendingTasks++;
    const result = await pool.query('SELECT pg_sleep(10)');
    pendingTasks--;
    res.status(200).json({ message: 'Long process completed' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Long process failed');
  }
}

// Simulate sleep for 10 seconds
function simulateSleep() {
  const start = Date.now();
  pendingTasks++;
  console.log('Sleeping... 10 seconds');
  while (Date.now() - start < 10000) {
    // Do nothing
  }
  pendingTasks--;
}

// Insert a document in MongoDB
async function handleInsertMongo(req, res) {
  try {
    simulateSleep();
    console.log('Connected successfully to MongoDB');

    const collection = mongoDb.collection('users');

    const result = await collection.insertOne({ "test": "value" });
    console.log('Inserted document with ID:', result.insertedId);

    res.status(201).json({ message: `Document inserted with ID: ${result.insertedId}` });
  } catch (err) {
    console.error('Error inserting document:', err);
    res.status(500).json({ error: 'Error inserting document' });
  }
}

// Health Check Handlers
async function handleHealthCheck(req, res) {
  try {
    const dbResult = await pool.query('SELECT NOW()');
    const redisPing = await redisClient.ping();
    const mongoStatus = mongoDb ? 'Connected' : 'Not Connected';
    await kafkaProducer.send({
      topic: 'health-check',
      messages: [{ value: 'health-check' }],
    });

    isHealthy = true;
    res.status(200).json({
      dbStatus: `Connected: ${dbResult.rows[0].now}`,
      redisStatus: `Connected: ${redisPing}`,
      mongoStatus: mongoStatus,
      kafkaStatus: 'Connected',
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Health check failed');
  }
}

// Liveness Check - Service and services status check
async function handleLivenessCheck(req, res) {
  try {
    // Check PostgreSQL liveness
    await pool.query('SELECT NOW()');

    // Check Redis liveness
    await redisClient.ping();

    // Check MongoDB liveness
    if (!mongoDb) {
      throw new Error('MongoDB is not connected');
    }

    // Check Kafka liveness
    await kafkaProducer.send({
      topic: 'health-check',
      messages: [{ value: 'health-check' }],
    });
    
    res.status(200).send('All services are alive');
  } catch (err) {
    console.error('Liveness check failed:', err);
    res.status(500).send('One or more services are not alive');
  }
}

// Readiness Check - All services should be ready
async function handleReadinessCheck(req, res) {
  try {
    // Check if PostgreSQL is ready
    await pool.query('SELECT NOW()');

    // Check if Redis is ready
    await redisClient.ping();

    // Check if MongoDB is ready
    if (!mongoDb) {
      throw new Error('MongoDB is not connected');
    }

    // Check if Kafka is ready
    await kafkaProducer.send({
      topic: 'health-check',
      messages: [{ value: 'health-check' }],
    });

    isReady = true;
    res.status(200).send('Service is ready');
  } catch (err) {
    console.error('Readiness check failed:', err);
    res.status(500).send('Service is not ready');
  }
}

// Startup Check - Ensures all services are successfully started
function handleStartupCheck(req, res) {
  // Check if all services are connected
  if (pool && redisClient && mongoDb && kafkaProducer) {

    isStarted = true;
    res.status(200).send('Service has successfully started');
  } else {
    res.status(500).send('Service failed to start');
  }
}

// Gracefully handle process exit to close connections
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  while (pendingTasks > 0) {
    console.log(`Waiting for ${pendingTasks} task(s) to finish...`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before checking again
  }
  await closeConnections();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  while (pendingTasks > 0) {
    console.log(`Waiting for ${pendingTasks} task(s) to finish...`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before checking again
  }
  await closeConnections();
  process.exit(0);
});

// Start the server after initializing connections
(async () => {

  await initConnections();
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
})();
