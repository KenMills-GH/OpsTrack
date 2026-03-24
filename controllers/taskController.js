import { pool } from "../config/db.js";
import { logAction } from "../utils/auditLogger.js";

// Get all tasks WITH the assigned operator's details
export const getAllTasks = async (req, res, next) => {
  try {
    const query =
      " SELECT tasks.id, tasks.title, tasks.status, tasks.priority_level, users.rank AS assignee_rank, users.name AS assignee_name FROM tasks LEFT JOIN users ON tasks.assigned_to = users.id ORDER BY tasks.id ASC;";

    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
};

// Create a new task and assign it
export const createTask = async (req, res, next) => {
  const { title, description, priority_level, assigned_to } = req.body;

  try {
    const newTask = await pool.query(
      `INSERT INTO tasks (title, description, priority_level, assigned_to) VALUES ($1, $2, $3, $4) RETURNING *;`,
      [title, description, priority_level, assigned_to],
    );

    // --> FIRE THE LOGGER <--
    await logAction(
      req.user.id,
      "CREATE",
      `Task #${newTask.rows[0].id}`,
      `Mission Title: ${title}`,
    );

    res.status(201).json(newTask[0]);
  } catch (error) {
    next(error);
  }
};

// Update a task (e.g., changing status or reassigning)
export const updateTask = async (req, res, next) => {
  const { id } = req.params;
  const { status, priority_level, assigned_to } = req.body;

  try {
    // 1. Use COALESCE to protect existing data during a partial update
    const updatedTask = await pool.query(
      `UPDATE tasks 
       SET status = COALESCE($1, status), 
           priority_level = COALESCE($2, priority_level), 
           assigned_to = COALESCE($3, assigned_to) 
       WHERE id = $4 
       RETURNING *;`,
      [status, priority_level, assigned_to, id],
    );

    if (updatedTask.rows.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    const finalTask = updatedTask.rows[0];

    // --> FIRE THE LOGGER <--
    await logAction(
      req.user.id,
      "UPDATE",
      `Task #${id}`,
      `Status: ${finalTask.status} | Priority: ${finalTask.priority_level} | Assigned to: ${finalTask.assigned_to}`,
    );

    res.status(200).json(updatedTask.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Delete a task
export const deleteTask = async (req, res, next) => {
  const { id } = req.params;

  try {
    const deletedTask = await pool.query(
      "DELETE FROM tasks WHERE id = $1 RETURNING *;",
      [id],
    );

    if (deletedTask.rows.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    // --> FIRE THE LOGGER <--
    await logAction(
      req.user.id,
      "DELETE",
      `Task #${id}`,
      `Permanently scrubbed mission: ${deletedTask.rows[0].title}`,
    );

    res.status(200).json({
      message: "Task successfully deleted",
      deleted_task: deletedTask.rows[0],
    });
  } catch (error) {
    next(error);
  }
};
