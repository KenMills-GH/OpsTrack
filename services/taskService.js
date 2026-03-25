import { pool } from "../config/db.js";
import { logAction } from "../utils/auditLogger.js";
import {
  findAllTasks,
  countTasks,
  createTask as createTaskInDb,
  updateTask as updateTaskInDb,
  removeTask as removeTaskFromDb,
} from "../repositories/taskRepository.js";

export const getAllTasks = async (user, { limit, offset }) => {
  const [tasks, total] = await Promise.all([
    findAllTasks(user, { limit, offset }),
    countTasks(),
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
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const updatedTask = await updateTaskInDb(client, id, updateData);
    if (!updatedTask) throw new Error("TASK_NOT_FOUND");

    await logAction(
      client,
      operatorId,
      "UPDATE",
      `Task #${id}`,
      `Status: ${updatedTask.status} | Priority: ${updatedTask.priority_level}`,
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
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const deletedTask = await removeTaskFromDb(client, id);
    if (!deletedTask) throw new Error("TASK_NOT_FOUND");

    await logAction(
      client,
      operatorId,
      "DELETE",
      `Task #${id}`,
      `Mission Scrubbed: ${deletedTask.title}`,
    );

    await client.query("COMMIT");
    return deletedTask;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
