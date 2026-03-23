import pg from "pg";
import dotenv from "dotenv";

// Initialize dotenv to read your .env file
dotenv.config();

const { Pool } = pg;

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

// Export the pool using ES Module syntax
export { pool };
