import winston from "winston";
import fs from "fs";
import path from "path";

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const isProduction = process.env.NODE_ENV === "production";

/**
 * Winston logger instance with:
 * - Console output (dev format in dev, JSON in prod)
 * - File output (rotating, combined + error logs)
 * - Request correlation via requestId in metadata
 */
const logger = winston.createLogger({
  level: isProduction ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.metadata(),
  ),
  transports: [
    /**
     * Console: human-readable in dev, JSON in production
     */
    new winston.transports.Console({
      format: isProduction
        ? winston.format.combine(
            winston.format.json(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              return JSON.stringify({
                timestamp,
                level,
                message,
                ...meta,
              });
            }),
          )
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, meta }) => {
              const requestId = meta?.requestId ? ` [${meta.requestId}]` : "";
              return `${timestamp} [${level}]${requestId}: ${message}`;
            }),
          ),
    }),

    /**
     * Combined log file: all messages
     * Max 5 files of 10MB each, kept for 14 days
     */
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      format: winston.format.json(),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true,
    }),

    /**
     * Error log file: errors and above
     */
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      format: winston.format.json(),
      level: "error",
      maxsize: 10485760,
      maxFiles: 5,
      tailable: true,
    }),
  ],
});

/**
 * Helper: Log with correlation metadata
 * @param {string} level - log level (info, warn, error, debug)
 * @param {string} message - log message
 * @param {object} meta - optional metadata { requestId, userId, action, ... }
 */
export function log(level, message, meta = {}) {
  logger.log(level, message, { metadata: meta });
}

/**
 * Convenience methods
 */
export const Logger = {
  info: (msg, meta) => log("info", msg, meta),
  warn: (msg, meta) => log("warn", msg, meta),
  error: (msg, meta) => log("error", msg, meta),
  debug: (msg, meta) => log("debug", msg, meta),
};

export default logger;
