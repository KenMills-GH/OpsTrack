import {
  getAllUsers as getAllUsersService,
  getUserById as getUserByIdService,
  createUser as createUserService,
  updateUser as updateUserService,
  removeUser as removeUserService,
} from "../services/userService.js";
import { parsePagination } from "../utils/pagination.js";

// Fetch all personnel
export const getAllUsers = async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query, {
      limit: 50,
      max: 100,
    });
    const roster = await getAllUsersService({ limit, offset });
    res.status(200).json(roster);
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await getUserByIdService(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

// Add a new operator
export const createUser = async (req, res, next) => {
  try {
    const newUser = await createUserService(req.body, req.user?.id ?? null);
    res.status(201).json(newUser);
  } catch (error) {
    // 23505 is the exact PostgreSQL error code for a Unique Constraint Violation
    if (error.code === "23505") {
      return res
        .status(400)
        .json({
          success: false,
          message: "Email is already registered to an operator.",
        });
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
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    next(error);
  }
};

// Remove an operator
export const deleteUser = async (req, res, next) => {
  try {
    await removeUserService(req.params.id, req.user.id);
    res.status(200).json({ message: "Operator successfully deactivated." });
  } catch (error) {
    if (error.message === "USER_NOT_FOUND")
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    next(error);
  }
};
