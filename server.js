const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Importing the database connection test
const { pool } = require("./config/db");

const app = express();

// Middleware: Allows your future frontend to talk to this API
app.use(cors());
// Middleware: Allows Express to read incoming JSON data
app.use(express.json());

// A simple test route to verify the server is listening
app.get("/", (req, res) => {
  res.json({ message: "OpsTrack API is live and secure." });
});

// Booting up the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`OpsTrack Server is running on port ${PORT}`);
});
