import express from "express";
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";

const router = express.Router();

// When a GET request hits the base of this route, run getAllUsers
router.get("/", getAllUsers);

// POST request to add a new user
router.post("/", createUser);

// PUT request to update a user
router.put("/:id", updateUser);

// DELETE request to delete a user
router.delete("/:id", deleteUser);

export default router;
