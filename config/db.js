const { Pool } = require("pg");
require("dotenv").config();

// Initialize the pool using your .env variables
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Immediately test the connection upon boot
pool.connect((err, client, release) => {
  if (err) {
    console.error("Database Connection Error:", err.stack);
  } else {
    console.log("Successfully connected to the PostgreSQL database.");
  }
  if (client) release();
});

module.exports = { pool };
