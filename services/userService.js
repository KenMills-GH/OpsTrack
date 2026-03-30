import { pool } from "../config/db.js";
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

    // 1. Build user data without clearance_level and password hashing
    // New users always start as UNCLASSIFIED (admins must patch to upgrade)
    const newUserData = {
      ...userData,
      clearance_level: "UNCLASSIFIED",
      // password will be hashed by the database via crypt()
    };

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
