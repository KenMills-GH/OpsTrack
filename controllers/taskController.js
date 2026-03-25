import {
  getAllTasks as getAllTasksService,
  createTask as createTaskService,
  updateTask as updateTaskService,
  removeTask as removeTaskService,
} from "../services/taskService.js";

// Get all tasks WITH the assigned operator's details
export const getAllTasks = async (req, res, next) => {
  try {
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 50, 1),
      100,
    );
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const tasks = await getAllTasksService({ limit, offset });
    res.status(200).json(tasks);
  } catch (error) {
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
    if (error.message === "TASK_NOT_FOUND") {
      return res.status(404).json({ message: "Task not found" });
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
    if (error.message === "TASK_NOT_FOUND") {
      return res.status(404).json({ message: "Task not found" });
    }
    next(error);
  }
};
