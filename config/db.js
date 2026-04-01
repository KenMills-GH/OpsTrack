import pg from "pg";
import dotenv from "dotenv";

// Initialize dotenv to read your .env file
dotenv.config();

const { Pool } = pg;

const databaseConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.DB_SSL === "true"
          ? { rejectUnauthorized: false }
          : undefined,
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_DATABASE,
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT || 5432),
    };

// Initialize the pool using your .env variables
const pool = new Pool({
  ...databaseConfig,
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
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

pool.on("error", (error) => {
  console.error("Unexpected idle database client error:", error);
});

// Export the pool using ES Module syntax
export { pool };
