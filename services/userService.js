import { pool } from "../config/db.js";
import bcrypt from "bcrypt";
import {
  findAllUsers,
  countUsers,
  createUser as createUserInDb,
  updateUser as updateUserInDb,
  removeUser as removeUserFromDb,
} from "../repositories/userRepository.js";
import { logAction } from "../utils/auditLogger.js";

export const getAllUsers = async ({ limit, offset }) => {
  const [users, total] = await Promise.all([
    findAllUsers({ limit, offset }),
    countUsers(),
  ]);

  return {
    data: users,
    meta: {
      total,
      limit,
      offset,
      has_next: offset + users.length < total,
    },
  };
};

export const createUser = async (userData, adminId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Business Logic: Hash the password before it ever touches the database
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    // Swap the plain-text password for the hashed one
    const newUserData = { ...userData, password: hashedPassword };

    // 2. Data Layer: Save to PostgreSQL
    const newUser = await createUserInDb(client, newUserData);

    // 3. Audit Log: Record the recruitment
    await logAction(
      client,
      adminId,
      "CREATE_USER",
      `User #${newUser.id}`,
      `Recruited ${newUser.rank} ${newUser.name}`,
    );

    await client.query("COMMIT");
    return newUser;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const updateUser = async (id, userData, adminId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const updatedUser = await updateUserInDb(client, id, userData);
    if (!updatedUser) throw new Error("USER_NOT_FOUND");

    await logAction(
      client,
      adminId,
      "UPDATE_USER",
      `User #${id}`,
      `Updated profile for ${updatedUser.name}`,
    );

    await client.query("COMMIT");
    return updatedUser;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const removeUser = async (id, adminId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const deletedUser = await removeUserFromDb(client, id);
    if (!deletedUser) throw new Error("USER_NOT_FOUND");

    await logAction(
      client,
      adminId,
      "DELETE_USER",
      `User #${id}`,
      `Removed ${deletedUser.rank} ${deletedUser.name} from roster`,
    );

    await client.query("COMMIT");
    return deletedUser;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
