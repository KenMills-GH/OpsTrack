export const logAction = async (
  client,
  operatorId,
  action,
  resource,
  details,
) => {
  try {
    await client.query(
      `INSERT INTO audit_logs (operator_id, action, resource, details) 
       VALUES ($1, $2, $3, $4);`,
      [operatorId, action, resource, details],
    );
  } catch (error) {
    console.error("CRITICAL: Audit Log Failure:", error.message);
    // We MUST throw the error so the controller's try/catch block
    // detects the failure and triggers the ROLLBACK!
    throw error;
  }
};
