import { pool } from "../config/db.js";

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
    const updatedTask = await pool.query(
      "UPDATE tasks SET status = $1, priority_level = $2, assigned_to = $3 WHERE id = $4 RETURNING *;",
      [status, priority_level, assigned_to, id],
    );

    if (updatedTask.rows.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

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

    res.status(200).json({
      message: "Task successfully deleted",
      deleted_task: deletedTask.rows[0],
    });
  } catch (error) {
    next(error);
  }
};
