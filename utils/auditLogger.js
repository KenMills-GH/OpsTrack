import { pool } from "../config/db.js";

export const logAction = async (operatorId, action, resource, details) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (operator_id, action, resource, details) 
       VALUES ($1, $2, $3, $4);`,
      [operatorId, action, resource, details],
    );
  } catch (error) {
    // If the logger fails, we don't want to crash the whole app,
    // but we do want the server admin to see it in the terminal.
    console.error("CRITICAL: Audit Log Failure:", error.message);
  }
};
