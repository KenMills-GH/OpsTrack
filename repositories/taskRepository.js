import { pool } from "../config/db.js";

export const findAllTasks = async ({ limit, offset }) => {
  // We don't need a 'client' here because there is no transaction
  const result = await pool.query(
    `SELECT
       t.id,
       t.title,
       t.description,
       t.status,
       t.priority_level,
       t.assigned_to,
       t.created_at,
       u.name as assignee_name
     FROM tasks t 
     LEFT JOIN users u ON t.assigned_to = u.id 
     ORDER BY t.created_at DESC
     LIMIT $1 OFFSET $2;`,
    [limit, offset],
  );
  return result.rows;
};

export const countTasks = async () => {
  const result = await pool.query("SELECT COUNT(*)::int AS total FROM tasks;");
  return result.rows[0].total;
};

export const createTask = async (client, taskData) => {
  const { title, description, priority_level, assigned_to } = taskData;

  const result = await client.query(
    `INSERT INTO tasks (title, description, priority_level, assigned_to) 
     VALUES ($1, $2, $3, $4) RETURNING *;`,
    [title, description, priority_level, assigned_to],
  );

  return result.rows[0];
};

export const updateTask = async (client, id, updateData) => {
  const { status, priority_level, assigned_to } = updateData;

  const result = await client.query(
    `UPDATE tasks 
     SET status = COALESCE($1, status), 
         priority_level = COALESCE($2, priority_level), 
         assigned_to = COALESCE($3, assigned_to) 
     WHERE id = $4 
     RETURNING *;`,
    [status, priority_level, assigned_to, id],
  );

  return result.rows[0];
};

export const removeTask = async (client, id) => {
  const result = await client.query(
    "DELETE FROM tasks WHERE id = $1 RETURNING *;",
    [id],
  );
  return result.rows[0];
};
