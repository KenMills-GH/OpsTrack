export const logAction = async (
  client,
  operatorId,
  action,
  resource,
  details,
  taskId = null,
) => {
  try {
    await client.query(
      `INSERT INTO audit_logs (operator_id, task_id, action, resource, details) 
       VALUES ($1, $2, $3, $4, $5);`,
      [operatorId, taskId, action, resource, details],
    );
  } catch (error) {
    console.error("CRITICAL: Audit Log Failure:", error.message);
    // We MUST throw the error so the controller's try/catch block
    // detects the failure and triggers the ROLLBACK!
    throw error;
  }
};
