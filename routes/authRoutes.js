import express from "express";
import { loginOperator } from "../controllers/authController.js";
import { validateData } from "../middleware/validateMiddleware.js";
import { loginSchema } from "../schemas/authSchema.js";

const router = express.Router();

// POST request to verify credentials and get a token
router.post("/login", validateData(loginSchema), loginOperator);

export default router;
