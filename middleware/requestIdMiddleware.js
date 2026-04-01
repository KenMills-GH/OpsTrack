import { v4 as uuidv4 } from "uuid";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeIncomingRequestId = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length > 64) return null;
  if (!UUID_V4_REGEX.test(trimmed)) return null;
  return trimmed;
};

/**
 * Middleware: Attach unique request ID for correlation across logs
 * - Checks for X-Request-ID header (from upstream services/load balancers)
 * - Generates new UUID if not present
 * - Attaches to res.locals for access in route handlers/logger
 */
export function requestIdMiddleware(req, res, next) {
  const incomingRequestId = normalizeIncomingRequestId(req.get("X-Request-ID"));
  const requestId = incomingRequestId || uuidv4();
  res.locals.requestId = requestId;

  // Optional: add to response header for client reference
  res.set("X-Request-ID", requestId);

  next();
}
