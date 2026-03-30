import { pool } from "../config/db.js";

// OpsTrack-api/repositories/taskRepository.js

// Whitelist of allowed sort keys — values are converted to safe SQL below
const VALID_SORT_KEYS = new Set([
  "id",
  "status",
  "priority",
  "title",
  "assignee",
]);

const buildOrderClause = (sort, direction) => {
  const sortKey = VALID_SORT_KEYS.has(sort) ? sort : "id";
  const sortDir = direction === "desc" ? "DESC" : "ASC";

  if (sortKey === "status") {
    return `
      CASE UPPER(t.status)
        WHEN 'PENDING' THEN 1
        WHEN 'IN_PROGRESS' THEN 2
        WHEN 'ACTIVE' THEN 2
        WHEN 'COMPLETED' THEN 3
        WHEN 'RESOLVED' THEN 3
        WHEN 'ARCHIVED' THEN 4
        ELSE 99
      END ${sortDir},
      t.id ${sortDir}
    `;
  }

  if (sortKey === "priority") {
    return `
      CASE UPPER(t.priority_level)
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 99
      END ${sortDir},
      t.id ${sortDir}
    `;
  }

  if (sortKey === "title") {
    return `LOWER(COALESCE(t.title, '')) ${sortDir}, t.id ${sortDir}`;
  }

  if (sortKey === "assignee") {
    return `LOWER(COALESCE(u.name, '')) ${sortDir}, t.id ${sortDir}`;
  }

  return `t.id ${sortDir}`;
};

export const findAllTasks = async (
  user,
  { limit, offset, sort, direction },
) => {
  const orderClause = buildOrderClause(sort, direction);

  // BRANCH 1: The Commander's View (TOP_SECRET sees the entire board)
  if (user.role === "ADMIN") {
    const result = await pool.query(
      `SELECT 
        t.id, t.title, t.description, t.status, t.priority_level, 
        t.assigned_to, t.created_at, u.name as assignee_name
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       ORDER BY ${orderClause}
       LIMIT $1 OFFSET $2;`,
      [limit, offset],
    );
    return result.rows;
  }

  // BRANCH 2: The Operator's View (SECRET only sees their assigned missions)
  else {
    const result = await pool.query(
      `SELECT 
        t.id, t.title, t.description, t.status, t.priority_level, 
        t.assigned_to, t.created_at, u.name as assignee_name
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.assigned_to = $1
       ORDER BY ${orderClause}
       LIMIT $2 OFFSET $3;`,
      [user.id, limit, offset],
    );
    return result.rows;
  }
};

export const countTasks = async (user) => {
  if (user.role === "ADMIN") {
    const result = await pool.query(
      "SELECT COUNT(*)::int AS total FROM tasks;",
    );
    return result.rows[0].total;
  }

  const result = await pool.query(
    "SELECT COUNT(*)::int AS total FROM tasks WHERE assigned_to = $1;",
    [user.id],
  );
  return result.rows[0].total;
};

export const findTaskByIdForUser = async (user, id) => {
  if (!Number.isInteger(id)) {
    return null;
  }

  if (user.role === "ADMIN") {
    const result = await pool.query(
      `SELECT 
        t.id, t.title, t.description, t.status, t.priority_level,
        t.assigned_to, t.created_at, u.name as assignee_name
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.id = $1;`,
      [id],
    );
    return result.rows[0] || null;
  }

  const result = await pool.query(
    `SELECT 
      t.id, t.title, t.description, t.status, t.priority_level,
      t.assigned_to, t.created_at, u.name as assignee_name
     FROM tasks t
     LEFT JOIN users u ON t.assigned_to = u.id
     WHERE t.id = $1 AND t.assigned_to = $2;`,
    [id, user.id],
  );
  return result.rows[0] || null;
};

export const findTaskAuditLogs = async (taskId, { limit, offset }) => {
  const result = await pool.query(
    `SELECT 
      l.id,
      l.operator_id,
      l.task_id,
      l.action,
      l.resource,
      l.details,
      l.logged_at,
      u.name as operator_name
     FROM audit_logs l
     LEFT JOIN users u ON l.operator_id = u.id
     WHERE l.task_id = $1
     ORDER BY l.logged_at DESC
     LIMIT $2 OFFSET $3;`,
    [taskId, limit, offset],
  );

  return result.rows;
};

export const countTaskAuditLogs = async (taskId) => {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS total FROM audit_logs WHERE task_id = $1;",
    [taskId],
  );
  return result.rows[0].total;
};

export const findAllAuditLogs = async ({ limit, offset }) => {
  const result = await pool.query(
    `SELECT
      l.id,
      l.operator_id,
      l.task_id,
      l.action,
      l.resource,
      l.details,
      l.logged_at,
      u.name as operator_name
     FROM audit_logs l
     LEFT JOIN users u ON l.operator_id = u.id
     ORDER BY l.logged_at DESC
     LIMIT $1 OFFSET $2;`,
    [limit, offset],
  );

  return result.rows;
};

export const countAllAuditLogs = async () => {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS total FROM audit_logs;",
  );
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
