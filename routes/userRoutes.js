import express from "express";
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";
import {
  verifyToken,
  checkClearance,
  checkRank,
} from "../middleware/authMiddleware.js";
import { validateData } from "../middleware/validateMiddleware.js";
import { createUserSchema, updateUserSchema } from "../schemas/userSchema.js";

const router = express.Router();

// 1. View Roster: Must be logged in and hold a SECRET clearance
router.get("/", verifyToken, checkClearance("SECRET"), getAllUsers);

// 2. Add Operator: Must be a Commander (CPT+ / TOP SECRET)
router.post(
  "/",
  verifyToken,
  checkClearance("TOP SECRET"),
  checkRank("CPT"),
  validateData(createUserSchema),
  createUser,
);

// 3. Edit Operator: Must be a Commander (CPT+ / TOP SECRET)
router.patch(
  "/:id",
  verifyToken,
  checkClearance("TOP SECRET"),
  checkRank("CPT"),
  validateData(updateUserSchema),
  updateUser,
);

// 4. Remove Operator: Must be a Commander (CPT+ / TOP SECRET)
router.delete(
  "/:id",
  verifyToken,
  checkClearance("TOP SECRET"),
  checkRank("CPT"),
  deleteUser,
);

export default router;
