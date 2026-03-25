import {
  getAllUsers as getAllUsersService,
  createUser as createUserService,
  updateUser as updateUserService,
  removeUser as removeUserService,
} from "../services/userService.js";

// Fetch all personnel
export const getAllUsers = async (req, res, next) => {
  try {
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 50, 1),
      100,
    );
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const roster = await getAllUsersService({ limit, offset });
    res.status(200).json(roster);
  } catch (error) {
    next(error);
  }
};

// Add a new operator (Secure Version)
export const createUser = async (req, res, next) => {
  try {
    const newUser = await createUserService(req.body, req.user.id);
    res.status(201).json(newUser);
  } catch (error) {
    // 23505 is the exact PostgreSQL error code for a Unique Constraint Violation
    if (error.code === "23505") {
      return res
        .status(400)
        .json({ message: "Email is already registered to an operator." });
    }
    next(error);
  }
};

// Update an existing operator (e.g., promotion or clearance upgrade)
export const updateUser = async (req, res, next) => {
  try {
    const updatedUser = await updateUserService(
      req.params.id,
      req.body,
      req.user.id,
    );
    res.status(200).json(updatedUser);
  } catch (error) {
    if (error.message === "USER_NOT_FOUND")
      return res.status(404).json({ message: "User not found" });
    next(error);
  }
};

// Remove an operator
export const deleteUser = async (req, res, next) => {
  try {
    await removeUserService(req.params.id, req.user.id);
    res.status(200).json({ message: "Operator successfully discharged." });
  } catch (error) {
    if (error.message === "USER_NOT_FOUND")
      return res.status(404).json({ message: "User not found" });
    next(error);
  }
};
