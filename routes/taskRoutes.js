import express from "express";

import {
  getAllTasks,
  createTask,
  updateTask,
  deleteTask,
} from "../controllers/taskController.js";

import {
  verifyToken,
  checkClearance,
  checkRank,
} from "../middleware/authMiddleware.js";

import { validateData } from "../middleware/validateMiddleware.js";
import { createTaskSchema, updateTaskSchema } from "../schemas/taskSchema.js";

const router = express.Router();

// 1. Unclassified View: Anyone with a token can see the board
router.get("/", verifyToken, getAllTasks);

// 2. Ticket Creation: Anyone with a token can submit a new mission
router.post("/", verifyToken, validateData(createTaskSchema), createTask);

// 3. Status Updates: Must be an NCO (SGT or higher) AND have a SECRET clearance
router.patch(
  "/:id",
  verifyToken,
  checkClearance("SECRET"),
  checkRank("SGT"),
  validateData(updateTaskSchema),
  updateTask,
);

// 4. Deletion: Must be a Commander (CPT or higher) AND have a TOP SECRET clearance
router.delete(
  "/:id",
  verifyToken,
  checkClearance("TOP SECRET"),
  checkRank("CPT"),
  deleteTask,
);

export default router;
