import { Logger } from "../utils/logger.js";
import { ERROR_CODES } from "../constants/errorCodes.js";

export const errorHandler = (err, req, res, next) => {
  // Extract request context for logging
  const requestId = res.locals.requestId || "unknown";
  const userId = req.user?.id || "anonymous";
  const environment = process.env.NODE_ENV || "development";

  // Log the full error with context
  Logger.error("Unhandled error", {
    error: err.message,
    code: err.code || ERROR_CODES.SYS_INTERNAL_ERROR,
    stack: err.stack,
    requestId,
    userId,
    method: req.method,
    path: req.path,
  });

  // Sanitize error response based on environment
  const clientMessage =
    environment === "production"
      ? "Internal Server Error. The engineering team has been notified."
      : err.message;

  // Send structured error response
  res.status(err.status || 500).json({
    success: false,
    code: err.code || ERROR_CODES.SYS_INTERNAL_ERROR,
    message: clientMessage,
    requestId, // Include request ID for client reference/support
  });
};
