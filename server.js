import express from "express";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import { fileURLToPath } from "url";

// Route Imports
import userRoutes from "./routes/userRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { pool } from "./config/db.js";

dotenv.config();

const app = express();

/* ---- 1. SECURITY & PERIMETER DEFENSE ---- */
// Helmet: Secures HTTP headers by hiding Express architecture
app.use(helmet());

// CORS: Restrict cross-origin traffic strictly to the frontend dashboard
app.use(
  cors({
    origin: "http://localhost:5173",
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
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message:
      "Too many failed authentication attempts. Account locked for 15 minutes.",
  },
});

// Apply the global limiter to all routes that start with /api
app.use("/api", globalLimiter);

/* ---- 2. PARSERS ---- */
// Allows Express to read incoming JSON payloads
app.use(express.json());

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
  app.listen(PORT, () => {
    console.log(`OpsTrack Server is running on port ${PORT}`);
  });
}

export { app };
