import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  // 1. Look for the "Authorization" header in the incoming Postman request
  const authHeader = req.headers.authorization;

  // 2. If it's missing, or doesn't start with the standard "Bearer " prefix, reject them
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Access Denied: No valid token provided." });
  }

  // 3. Extract just the token string (dropping the "Bearer " part)
  const token = authHeader.split(" ")[1];

  try {
    // 4. Cryptographically verify the token against your secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 5. Attach the decoded operator data (id, clearance_level) directly to the request
    // This allows your controllers to know EXACTLY who is making the request
    req.user = decoded;

    // 6. Token is valid! Pass them through to the controller.
    next();
  } catch (error) {
    // If the token is fake, altered, or expired (past the 8-hour shift)
    res.status(403).json({ message: "Forbidden: Invalid or expired token." });
  }
};
