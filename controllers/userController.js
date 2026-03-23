import { pool } from "../config/db.js";

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

// Add a new operator
export const createUser = async (req, res, next) => {
  const { name, rank, clearance_level } = req.body;
  try {
    // Securely insert the data using parameterized queries ($1, $2, $3)
    // RETURNING * tells PostgreSQL to hand us back the newly created row immediately
    const newOperator = await pool.query(
      "INSERT INTO users (name, rank, clearance_level) VALUES ($1, $2, $3) RETURNING *;",
      [name, rank, clearance_level],
    );
    // Send a 201 (Created) status code and the new operator's data
    res.status(201).json(newOperator.rows[0]);
  } catch (error) {
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
