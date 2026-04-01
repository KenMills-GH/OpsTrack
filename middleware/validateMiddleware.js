import { ERROR_CODES } from "../constants/errorCodes.js";
import { Logger } from "../utils/logger.js";

export const validateData = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errorMessages = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      Logger.warn("Validation failed", {
        code: ERROR_CODES.VAL_INVALID_PAYLOAD,
        errors: errorMessages,
        requestId: res.locals.requestId,
        userId: req.user?.id,
      });

      return res.status(400).json({
        success: false,
        code: ERROR_CODES.VAL_INVALID_PAYLOAD,
        message: "Payload validation failed",
        errors: errorMessages,
      });
    }

    req.body = result.data;
    next();
  };
};
