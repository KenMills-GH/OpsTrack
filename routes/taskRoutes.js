import express from "express";

import {
  getAllTasks,
  getAllAuditLogs,
  getTaskById,
  getTaskAuditLogs,
  createTask,
  updateTask,
  deleteTask,
} from "../controllers/taskController.js";

import {
  verifyToken,
  checkClearance,
  checkRank,
  checkRole,
} from "../middleware/authMiddleware.js";

import { validateData } from "../middleware/validateMiddleware.js";
import { createTaskSchema, updateTaskSchema } from "../schemas/taskSchema.js";

const router = express.Router();

// 1. Unclassified View: Anyone with a token can see the board
router.get("/", verifyToken, getAllTasks);

// 1c. Full Audit View: Admin can inspect the entire system ledger
router.get("/audit-logs", verifyToken, getAllAuditLogs);

// 1b. Task Audit View: Anyone with a token can view authorized mission logs
router.get("/:id/audit-logs", verifyToken, getTaskAuditLogs);

// 1a. Mission Detail View: Anyone with a token can view an authorized mission
router.get("/:id", verifyToken, getTaskById);

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
router.delete("/:id", verifyToken, checkRole("ADMIN"), deleteTask);

export default router;
