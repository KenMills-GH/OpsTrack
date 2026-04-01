import { pool } from "../config/db.js";
import { logAction } from "../utils/auditLogger.js";
import {
  findAllTasks,
  countTasks,
  findTaskByIdForUser,
  findTaskAuditLogs,
  countTaskAuditLogs,
  findAllAuditLogs,
  countAllAuditLogs,
  createTask as createTaskInDb,
  updateTask as updateTaskInDb,
  removeTask as removeTaskFromDb,
} from "../repositories/taskRepository.js";

export const getAllTasks = async (user, { limit, offset, sort, direction }) => {
  const [tasks, total] = await Promise.all([
    findAllTasks(user, { limit, offset, sort, direction }),
    countTasks(user),
  ]);

  return {
    data: tasks,
    meta: {
      total,
      limit,
      offset,
      has_next: offset + tasks.length < total,
    },
  };
};

export const getTaskById = async (id, user) => {
  const taskId = parseInt(id, 10);
  const task = await findTaskByIdForUser(user, taskId);

  if (!task) {
    throw new Error("TASK_NOT_FOUND");
  }

  return task;
};

export const getTaskAuditLogs = async (id, user, { limit, offset }) => {
  const taskId = parseInt(id, 10);
  const task = await findTaskByIdForUser(user, taskId);

  if (!task) {
    throw new Error("TASK_NOT_FOUND");
  }

  const [logs, total] = await Promise.all([
    findTaskAuditLogs(taskId, { limit, offset }),
    countTaskAuditLogs(taskId),
  ]);

  return {
    data: logs,
    meta: {
      total,
      limit,
      offset,
      has_next: offset + logs.length < total,
    },
  };
};

export const getAllAuditLogs = async (user, { limit, offset }) => {
  if (user.role !== "ADMIN") {
    const error = new Error("FORBIDDEN_AUDIT_ACCESS");
    error.status = 403;
    throw error;
  }

  const [logs, total] = await Promise.all([
    findAllAuditLogs({ limit, offset }),
    countAllAuditLogs(),
  ]);

  return {
    data: logs,
    meta: {
      total,
      limit,
      offset,
      has_next: offset + logs.length < total,
    },
  };
};

export const createTask = async (taskData, operatorId) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Save the task via the Repository
    const newTask = await createTaskInDb(client, taskData);

    // 2. Log the action
    await logAction(
      client,
      operatorId,
      "CREATE",
      `Task #${newTask.id}`,
      `Mission Title: ${newTask.title}`,
      newTask.id,
    );

    await client.query("COMMIT");

    // 3. Return the finished data back to the Controller
    return newTask;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error; // Throw the error up so the Controller's catch block can handle the HTTP response
  } finally {
    client.release();
  }
};

export const updateTask = async (id, updateData, operatorId) => {
  const taskId = parseInt(id, 10);
  if (!Number.isInteger(taskId) || taskId <= 0) {
    throw new Error("INVALID_TASK_ID");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const updatedTask = await updateTaskInDb(client, taskId, updateData);
    if (!updatedTask) throw new Error("TASK_NOT_FOUND");

    await logAction(
      client,
      operatorId,
      "UPDATE",
      `Task #${taskId}`,
      `Status: ${updatedTask.status} | Priority: ${updatedTask.priority_level}`,
      updatedTask.id,
    );

    await client.query("COMMIT");
    return updatedTask;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const removeTask = async (id, operatorId) => {
  const taskId = parseInt(id, 10);
  if (!Number.isInteger(taskId) || taskId <= 0) {
    throw new Error("INVALID_TASK_ID");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const taskLookupResult = await client.query(
      "SELECT id, title FROM tasks WHERE id = $1 FOR UPDATE;",
      [taskId],
    );
    const taskToDelete = taskLookupResult.rows[0];
    if (!taskToDelete) {
      throw new Error("TASK_NOT_FOUND");
    }

    await logAction(
      client,
      operatorId,
      "DELETE",
      `Task #${taskId}`,
      `Mission Scrubbed: ${taskToDelete.title}`,
      taskId,
    );

    const deletedTask = await removeTaskFromDb(client, taskId);
    if (!deletedTask) throw new Error("TASK_NOT_FOUND");

    await client.query("COMMIT");
    return deletedTask;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
