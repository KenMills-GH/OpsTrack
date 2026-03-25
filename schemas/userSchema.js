import { z } from "zod";
import {
  MILITARY_RANKS,
  CLEARANCE_LEVELS,
} from "../constants/authConstants.js";

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters for security protocols"),
  rank: z.enum(MILITARY_RANKS, {
    errorMap: () => ({
      message:
        "Invalid Rank designation. Must be an official recognized abbreviation.",
    }),
  }),
  clearance_level: z.enum(CLEARANCE_LEVELS, {
    errorMap: () => ({ message: "Invalid Clearance Level." }),
  }),
});

export const updateUserSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100)
      .optional(),
    email: z.string().email("Invalid email format").optional(),
    rank: z.enum(MILITARY_RANKS).optional(),
    clearance_level: z.enum(CLEARANCE_LEVELS).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one valid field must be provided for a roster update.",
  });
