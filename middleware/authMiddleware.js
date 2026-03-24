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

// Middleware to enforce Role-Based Access Control (RBAC)
export const checkClearance = (requiredLevel) => {
  return (req, res, next) => {
    // Define the official clearance hierarchy
    const hierarchy = ["UNCLASSIFIED", "SECRET", "TOP SECRET"];

    // Grab the user's clearance from the JWT payload (set by verifyToken)
    const userClearance = req.user.clearance_level;

    // Find the mathematical rank of both clearances
    const userRank = hierarchy.indexOf(userClearance);
    const requiredRank = hierarchy.indexOf(requiredLevel);

    // If the user's clearance isn't in our array, or it's too low, reject them
    if (userRank === -1 || userRank < requiredRank) {
      return res.status(403).json({
        message: `Command Denied: ${requiredLevel} clearance required for this operation.`,
      });
    }

    // Clearance verified. Allow the command to execute.
    next();
  };
};

// Middleware to enforce Rank-Based Access Control
export const checkRank = (minimumRank) => {
  return (req, res, next) => {
    // A standard rank progression from E1 to O10
    const armyRanks = [
      "PVT",
      "PV2",
      "PFC",
      "SPC",
      "CPL", // Junior Enlisted (0-4)
      "SGT",
      "SSG",
      "SFC",
      "MSG",
      "1SG",
      "SGM",
      "CSM", // NCOs (5-11)
      "WO1",
      "CW2",
      "CW3",
      "CW4",
      "CW5", // Warrant Officers (12-16)
      "2LT",
      "1LT",
      "CPT",
      "MAJ",
      "LTC",
      "COL",
      "GEN", // Commissioned Officers (17-23)
    ];

    // Grab the user's rank from the newly updated JWT payload
    const userRank = req.user.rank;

    const userRankIndex = armyRanks.indexOf(userRank);
    const requiredRankIndex = armyRanks.indexOf(minimumRank);

    // If the rank isn't recognized, or is too low, reject the command
    if (userRankIndex === -1 || userRankIndex < requiredRankIndex) {
      return res.status(403).json({
        message: `Chain of Command Violation: Minimum rank of ${minimumRank} required.`,
      });
    }

    next();
  };
};
