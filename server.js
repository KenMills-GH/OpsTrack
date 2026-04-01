import express from "express";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { fileURLToPath } from "url";

// Route Imports
import userRoutes from "./routes/userRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { pool } from "./config/db.js";
import { requestIdMiddleware } from "./middleware/requestIdMiddleware.js";
import { Logger } from "./utils/logger.js";

dotenv.config();

const app = express();

const REQUIRED_ENV_VARS = [
  "DB_USER",
  "DB_HOST",
  "DB_DATABASE",
  "DB_PASSWORD",
  "JWT_SECRET",
];

const validateEnvironment = () => {
  const missingVariables = REQUIRED_ENV_VARS.filter(
    (envKey) => !process.env[envKey],
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVariables.join(", ")}`,
    );
  }
};

validateEnvironment();

/* ---- 1. SECURITY & PERIMETER DEFENSE ---- */
// Helmet: Secures HTTP headers by hiding Express architecture
app.use(helmet());

// Request ID: Attach correlation IDs for request tracing
app.use(requestIdMiddleware);

// Morgan: High-level request logging (complements structured Winston logging)
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// CORS: Restrict cross-origin traffic strictly to the frontend dashboard
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  }),
);

// Rate Limiting: Global Perimeter Defense (Max 100 requests / 15 mins)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message:
      "Network traffic anomalous. IP temporarily blocked for 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate Limiting: High-Security Chokepoint (Max 5 login attempts / 15 mins)
const isAutomatedTestRun =
  process.execArgv.includes("--test") ||
  process.env.NODE_ENV === "test" ||
  process.env.npm_lifecycle_event === "test";
const authLimiterMax = isAutomatedTestRun ? 100 : 5;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: authLimiterMax,
  message: {
    success: false,
    message:
      "Too many failed authentication attempts. Account locked for 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply the global limiter to all routes that start with /api
app.use("/api", globalLimiter);

/* ---- 2. PARSERS ---- */
// Allows Express to read incoming JSON payloads
app.use(express.json({ limit: "10kb" }));

/* ---- 3. ROUTES ---- */
// Base health check route
app.get("/", (req, res) => {
  res.json({ message: "OpsTrack API is live and secure." });
});

app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/readyz", async (req, res) => {
  try {
    await pool.query("SELECT 1;");
    res.status(200).json({ status: "ready" });
  } catch (error) {
    res.status(503).json({ status: "not_ready" });
  }
});

// Apply the strict auth limiter ONLY to the login route before it hits the authRouter
app.use("/api/auth/login", authLimiter);

// Mount standard routes
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/auth", authRoutes);

/* ---- 4. ERROR HANDLING ---- */
// The global error handler must always be the very last piece of middleware
app.use(errorHandler);

/* ---- 5. SERVER BOOT ---- */
const PORT = process.env.PORT || 5000;

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const server = app.listen(PORT, () => {
    Logger.info(`OpsTrack Server is running on port ${PORT}`, {
      port: PORT,
      environment: process.env.NODE_ENV,
    });
  });

  const shutdown = async (signal) => {
    Logger.info(`${signal} received. Shutting down gracefully...`, {
      signal,
    });

    server.close(async (serverError) => {
      if (serverError) {
        Logger.error("Error while closing HTTP server", {
          error: serverError.message,
          stack: serverError.stack,
        });
      }

      try {
        await pool.end();
        Logger.info("Database pool closed successfully");
      } catch (poolError) {
        Logger.error("Error while closing database pool", {
          error: poolError.message,
          stack: poolError.stack,
        });
      }

      process.exit(serverError ? 1 : 0);
    });
  };

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
}

export { app };
