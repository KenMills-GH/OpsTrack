import express from "express";
import { loginOperator } from "../controllers/authController.js";

const router = express.Router();

// POST request to verify credentials and get a token
router.post("/login", loginOperator);

export default router;
