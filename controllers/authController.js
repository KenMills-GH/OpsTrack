import { pool } from "../config/db.js";
import jwt from "jsonwebtoken";
import { normalizeClearanceLevel } from "../constants/authConstants.js";
import { ERROR_CODES } from "../constants/errorCodes.js";
import { Logger } from "../utils/logger.js";

export const loginOperator = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // 1. Locate the operator by email and verify password using pgcrypto
    const userResult = await pool.query(
      `SELECT id, name, rank, role, clearance_level, password, is_active
       FROM users
       WHERE LOWER(email) = LOWER($1) AND password = crypt($2, password);`,
      [email, password],
    );

    // If no user comes back, the email is wrong or password doesn't match
    if (userResult.rows.length === 0) {
      Logger.warn("Login failed: invalid credentials", { email, requestId: res.locals.requestId });
      return res.status(401).json({
        success: false,
        code: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        message: "Invalid credentials",
      });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      Logger.warn("Login denied: account deactivated", { userId: user.id, requestId: res.locals.requestId });
      return res.status(403).json({
        success: false,
        code: ERROR_CODES.AUTH_ACCOUNT_DEACTIVATED,
        message: "Account deactivated. Contact your administrator.",
      });
    }
    const normalizedClearanceLevel = normalizeClearanceLevel(
      user.clearance_level,
    );

    // 3. Construct the JSON Web Token (The Keycard)
    // We embed their ID and clearance level directly into the token payload
    const payload = {
      id: user.id,
      clearance_level: normalizedClearanceLevel,
      role: user.role,
      rank: user.rank,
      name: user.name,
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "8h", algorithm: "HS256" }, // Token expires after an 8-hour shift
    );

    // 4. Return the token and the operator profile (strictly omitting the password)
    res.status(200).json({
      message: "Authentication successful",
      token: token,
      operator: {
        id: user.id,
        role: user.role,
        name: user.name,
        rank: user.rank,
        clearance_level: normalizedClearanceLevel,
      },
    });
  } catch (error) {
    next(error);
  }
};
