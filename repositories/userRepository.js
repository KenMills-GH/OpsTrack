import { pool } from "../config/db.js";

export const findAllUsers = async ({ limit, offset }) => {
  const result = await pool.query(
    `SELECT id, name, rank, clearance_level, email, is_active
     FROM users
     ORDER BY id ASC
     LIMIT $1 OFFSET $2;`,
    [limit, offset],
  );
  return result.rows;
};

export const countUsers = async () => {
  const result = await pool.query("SELECT COUNT(*)::int AS total FROM users;");
  return result.rows[0].total;
};

export const createUser = async (client, userData) => {
  const { name, email, password, rank, clearance_level } = userData;

  const result = await client.query(
    `INSERT INTO users (name, email, password, rank, clearance_level) 
     VALUES ($1, $2, crypt($3, gen_salt('bf', 10)), $4, $5) 
     RETURNING id, name, email, rank, clearance_level, is_active;`,
    [name, email, password, rank, clearance_level],
  );

  return result.rows[0];
};

export const updateUser = async (client, id, userData) => {
  const { name, rank, clearance_level, email, is_active } = userData;
  const result = await client.query(
    `UPDATE users 
     SET name = COALESCE($1, name), 
         rank = COALESCE($2, rank), 
         clearance_level = COALESCE($3, clearance_level), 
         email = COALESCE($4, email), 
         is_active = COALESCE($5, is_active) 
     WHERE id = $6 
     RETURNING id, name, rank, clearance_level, email, is_active;`,
    [name, rank, clearance_level, email, is_active, id],
  );
  return result.rows[0];
};

export const removeUser = async (client, id) => {
  const result = await client.query(
    "DELETE FROM users WHERE id = $1 RETURNING id, name, rank;",
    [id],
  );
  return result.rows[0];
};
