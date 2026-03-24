import { pool } from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const loginOperator = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // 1. Locate the operator by email
    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1;",
      [email],
    );

    // If no user comes back, the email is wrong
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = userResult.rows[0];

    // 2. Compare the provided password with the hashed database password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 3. Construct the JSON Web Token (The Keycard)
    // We embed their ID and clearance level directly into the token payload
    const payload = {
      id: user.id,
      clearance_level: user.clearance_level,
      rank: user.rank,
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "8h" }, // Token expires after an 8-hour shift
    );

    // 4. Return the token and the operator profile (strictly omitting the password)
    res.status(200).json({
      message: "Authentication successful",
      token: token,
      operator: {
        id: user.id,
        name: user.name,
        rank: user.rank,
        clearance_level: user.clearance_level,
      },
    });
  } catch (error) {
    next(error);
  }
};
