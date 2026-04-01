import jwt from "jsonwebtoken";
import {
  CLEARANCE_LEVELS,
  MILITARY_RANKS,
  normalizeClearanceLevel,
} from "../constants/authConstants.js";
import { ERROR_CODES } from "../constants/errorCodes.js";
import { Logger } from "../utils/logger.js";

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    Logger.warn("Access denied: no valid token provided", {
      requestId: res.locals.requestId,
    });
    return res.status(401).json({
      success: false,
      code: ERROR_CODES.AUTH_TOKEN_MISSING,
      message: "Access Denied: No valid token provided.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    req.user = decoded;
    next();
  } catch (error) {
    const errorCode =
      error.name === "TokenExpiredError"
        ? ERROR_CODES.AUTH_TOKEN_EXPIRED
        : ERROR_CODES.AUTH_TOKEN_INVALID;
    Logger.warn("Authentication failed", {
      error: error.message,
      code: errorCode,
      requestId: res.locals.requestId,
    });
    res.status(401).json({
      success: false,
      code: errorCode,
      message: "Forbidden: Invalid or expired token.",
    });
  }
};

export const checkClearance = (requiredLevel) => {
  return (req, res, next) => {
    const userClearance = normalizeClearanceLevel(req.user.clearance_level);
    const normalizedRequiredLevel = normalizeClearanceLevel(requiredLevel);
    const userRank = CLEARANCE_LEVELS.indexOf(userClearance);
    const requiredRank = CLEARANCE_LEVELS.indexOf(normalizedRequiredLevel);

    if (userRank === -1 || userRank < requiredRank) {
      Logger.warn("Access denied: insufficient clearance", {
        userId: req.user.id,
        userClearance,
        requiredClearance: normalizedRequiredLevel,
        requestId: res.locals.requestId,
      });
      return res.status(403).json({
        success: false,
        code: ERROR_CODES.AUTHZ_INSUFFICIENT_CLEARANCE,
        message: `Command Denied: ${normalizedRequiredLevel} clearance required for this operation.`,
      });
    }
    next();
  };
};

export const checkRank = (minimumRank) => {
  return (req, res, next) => {
    const userRank = req.user.rank;
    const userRankIndex = MILITARY_RANKS.indexOf(userRank);
    const requiredRankIndex = MILITARY_RANKS.indexOf(minimumRank);

    if (userRankIndex === -1 || userRankIndex < requiredRankIndex) {
      Logger.warn("Access denied: insufficient rank", {
        userId: req.user.id,
        userRank,
        minimumRank,
        requestId: res.locals.requestId,
      });
      return res.status(403).json({
        success: false,
        code: ERROR_CODES.AUTHZ_INSUFFICIENT_RANK,
        message: `Chain of Command Violation: Minimum rank of ${minimumRank} required.`,
      });
    }
    next();
  };
};

export const checkRole = (requiredRole) => {
  return (req, res, next) => {
    const userRole = (req.user.role || "").trim().toUpperCase();
    const normalizedRequiredRole = requiredRole.trim().toUpperCase();

    if (userRole !== normalizedRequiredRole) {
      Logger.warn("Access denied: insufficient role", {
        userId: req.user.id,
        userRole,
        requiredRole: normalizedRequiredRole,
        requestId: res.locals.requestId,
      });
      return res.status(403).json({
        success: false,
        code: ERROR_CODES.AUTHZ_INSUFFICIENT_ROLE,
        message: `Command Denied: ${normalizedRequiredRole} role required for this operation.`,
      });
    }
    next();
  };
};
