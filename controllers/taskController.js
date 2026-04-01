import {
  getAllTasks as getAllTasksService,
  getAllAuditLogs as getAllAuditLogsService,
  getTaskById as getTaskByIdService,
  getTaskAuditLogs as getTaskAuditLogsService,
  createTask as createTaskService,
  updateTask as updateTaskService,
  removeTask as removeTaskService,
} from "../services/taskService.js";
import { parsePagination } from "../utils/pagination.js";
import { ERROR_CODES } from "../constants/errorCodes.js";
import { Logger } from "../utils/logger.js";

// Get all tasks WITH the assigned operator's details
export const getAllTasks = async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query, {
      limit: 50,
      max: 100,
    });

    const VALID_SORT_FIELDS = new Set([
      "id",
      "status",
      "priority",
      "title",
      "assignee",
    ]);
    const sort = VALID_SORT_FIELDS.has(req.query.sort) ? req.query.sort : "id";
    const direction = req.query.direction === "desc" ? "desc" : "asc";

    // 1. Grab the operator's data that the auth middleware attached
    const user = req.user;
    const tasks = await getAllTasksService(user, {
      limit,
      offset,
      sort,
      direction,
    });
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

export const getTaskAuditLogs = async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query, {
      limit: 20,
      max: 100,
    });
    const logs = await getTaskAuditLogsService(req.params.id, req.user, {
      limit,
      offset,
    });

    res.status(200).json(logs);
  } catch (error) {
    if (error.message === "TASK_NOT_FOUND") {
      Logger.warn("Task not found", {
        taskId: req.params.id,
        userId: req.user.id,
        requestId: res.locals.requestId,
      });
      return res.status(404).json({
        success: false,
        code: ERROR_CODES.RES_NOT_FOUND,
        message: "Task not found",
      });
    }
    next(error);
  }
};

export const getAllAuditLogs = async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query, {
      limit: 20,
      max: 100,
    });
    const logs = await getAllAuditLogsService(req.user, { limit, offset });

    res.status(200).json(logs);
  } catch (error) {
    if (error.message === "FORBIDDEN_AUDIT_ACCESS") {
      Logger.warn("Audit access denied: non-admin user", {
        userId: req.user.id,
        requestId: res.locals.requestId,
      });
      return res.status(403).json({
        success: false,
        code: ERROR_CODES.AUTHZ_INSUFFICIENT_ROLE,
        message: "Command Denied: Admin role required for full audit access.",
      });
    }
    next(error);
  }
};

export const getTaskById = async (req, res, next) => {
  try {
    const task = await getTaskByIdService(req.params.id, req.user);
    res.status(200).json(task);
  } catch (error) {
    if (error.message === "TASK_NOT_FOUND") {
      Logger.warn("Task not found", {
        taskId: req.params.id,
        userId: req.user.id,
        requestId: res.locals.requestId,
      });
      return res.status(404).json({
        success: false,
        code: ERROR_CODES.RES_NOT_FOUND,
        message: "Task not found",
      });
    }
    next(error);
  }
};

// Create a new task and assign it
export const createTask = async (req, res, next) => {
  try {
    // 1. Extract network data
    const taskData = req.body;
    const operatorId = req.user.id; // Extracted from your JWT auth middleware

    // 2. Hand off to the Business Layer
    const newTask = await createTaskService(taskData, operatorId);

    // 3. Send the HTTP response
    res.status(201).json(newTask);
  } catch (error) {
    next(error); // Pass to your global error handler
  }
};

// Update a task (e.g., changing status or reassigning)
export const updateTask = async (req, res, next) => {
  try {
    const updatedTask = await updateTaskService(
      req.params.id,
      req.body,
      req.user.id,
    );
    res.status(200).json(updatedTask);
  } catch (error) {
    if (error.message === "INVALID_TASK_ID") {
      Logger.warn("Invalid task id during update", {
        taskId: req.params.id,
        userId: req.user.id,
        requestId: res.locals.requestId,
      });
      return res.status(400).json({
        success: false,
        code: ERROR_CODES.VAL_INVALID_PAYLOAD,
        message: "Invalid task id",
      });
    }

    if (error.message === "TASK_NOT_FOUND") {
      Logger.warn("Task not found during update", {
        taskId: req.params.id,
        userId: req.user.id,
        requestId: res.locals.requestId,
      });
      return res.status(404).json({
        success: false,
        code: ERROR_CODES.RES_NOT_FOUND,
        message: "Task not found",
      });
    }
    next(error);
  }
};

// Delete a task
export const deleteTask = async (req, res, next) => {
  try {
    await removeTaskService(req.params.id, req.user.id);
    res.status(200).json({ message: "Task successfully purged from system." });
  } catch (error) {
    if (error.message === "INVALID_TASK_ID") {
      Logger.warn("Invalid task id during delete", {
        taskId: req.params.id,
        userId: req.user.id,
        requestId: res.locals.requestId,
      });
      return res.status(400).json({
        success: false,
        code: ERROR_CODES.VAL_INVALID_PAYLOAD,
        message: "Invalid task id",
      });
    }

    if (error.message === "TASK_NOT_FOUND") {
      Logger.warn("Task not found during delete", {
        taskId: req.params.id,
        userId: req.user.id,
        requestId: res.locals.requestId,
      });
      return res.status(404).json({
        success: false,
        code: ERROR_CODES.RES_NOT_FOUND,
        message: "Task not found",
      });
    }
    next(error);
  }
};
