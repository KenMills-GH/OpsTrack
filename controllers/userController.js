import { pool } from "../config/db.js";
import bcrypt from "bcrypt";

// Fetch all personnel
export const getAllUsers = async (req, res, next) => {
  try {
    // Standard SQL query to fetch all rows from the users table
    const result = await pool.query("SELECT * FROM users ORDER BY id ASC;");

    // Send the rows back as a successful JSON response
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
};

// Add a new operator (Secure Version)
export const createUser = async (req, res, next) => {
  const { name, rank, clearance_level, email, password } = req.body;

  try {
    // 1. Generate a "salt" (random data added to the password before hashing)
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);

    // 2. Hash the plaintext password with the salt
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Save the HASHED password to the database, never the real one
    const newOperator = await pool.query(
      `INSERT INTO users (name, rank, clearance_level, email, password) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, rank, clearance_level, email, is_active;`,
      [name, rank, clearance_level, email, hashedPassword],
    );

    // Notice how we DO NOT return the password in the JSON response!
    res.status(201).json(newOperator.rows[0]);
  } catch (error) {
    // If the email already exists, PostgreSQL throws a unique constraint error (code 23505)
    if (error.code === "23505") {
      return res
        .status(400)
        .json({ message: "An operator with this email already exists." });
    }
    next(error);
  }
};

// Update an existing operator (e.g., promotion or clearance upgrade)
export const updateUser = async (req, res, next) => {
  const { id } = req.params; // Grabs the ID from the end of the URL
  const { rank, clearance_level } = req.body; // Grabs the new data from Postman

  try {
    const updatedOperator = await pool.query(
      "UPDATE users SET rank = $1, clearance_level = $2 WHERE id = $3 RETURNING *;",
      [rank, clearance_level, id],
    );

    // If no rows were updated, the ID doesn't exist
    if (updatedOperator.rows.length === 0) {
      return res.status(404).json({ message: "Operator not found" });
    }
    res.status(200).json(updatedOperator.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Remove an operator
export const deleteUser = async (req, res, next) => {
  const { id } = req.params;

  try {
    const deletedOperator = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING *;",
      [id],
    );

    if (deletedOperator.rows.length === 0) {
      return res.status(404).json({ message: "Operator not found" });
    }

    res.status(200).json({
      message: "Operator successfully removed from OpsTrack",
      removed_user: deletedOperator.rows[0],
    });
  } catch (error) {
    next(error);
  }
};
