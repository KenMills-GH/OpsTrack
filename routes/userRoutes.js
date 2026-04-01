import express from "express";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";
import {
  verifyToken,
  checkClearance,
  checkRole,
} from "../middleware/authMiddleware.js";
import { validateData } from "../middleware/validateMiddleware.js";
import { createUserSchema, updateUserSchema } from "../schemas/userSchema.js";

const router = express.Router();

// 1. View Roster: Must be logged in and hold a SECRET clearance
router.get("/", verifyToken, checkClearance("SECRET"), getAllUsers);

// 2. Add Operator: Admin only
router.post(
  "/",
  verifyToken,
  checkRole("ADMIN"),
  validateData(createUserSchema),
  createUser,
);

// 2b. View Single Operator: Admin only
router.get("/:id", verifyToken, checkRole("ADMIN"), getUserById);

// 3. Edit Operator: Admin only
router.patch(
  "/:id",
  verifyToken,
  checkRole("ADMIN"),
  validateData(updateUserSchema),
  updateUser,
);

// 4. Remove Operator: Admin only
router.delete("/:id", verifyToken, checkRole("ADMIN"), deleteUser);

export default router;
