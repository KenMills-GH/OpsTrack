import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Importing the database connection test (Notice the .js extension!)
import { pool } from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();

/* ---- MIDDLEWARE ---- */
// Middleware: Allows your future frontend to talk to this API
app.use(cors());
// Middleware: Allows Express to read incoming JSON data
app.use(express.json());

/* ---- ROUTES ---- */
// A simple test route to verify the server is listening
app.get("/", (req, res) => {
  res.json({ message: "OpsTrack API is live and secure." });
});

app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/auth", authRoutes);
app.use(errorHandler);

// Booting up the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`OpsTrack Server is running on port ${PORT}`);
});
