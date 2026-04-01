import { z } from "zod";

// Blueprint for creating a new mission
export const createTaskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(255),
  description: z.string().optional(),
  priority_level: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"], {
    errorMap: () => ({
      message: "Priority must be LOW, MEDIUM, HIGH, or CRITICAL",
    }),
  }),
  assigned_to: z.number().int().positive().optional(),
});

// Blueprint for updating a mission
export const updateTaskSchema = z
  .object({
    status: z
      .enum(["PENDING", "ACTIVE", "RESOLVED"])
      .optional(),
    priority_level: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
    assigned_to: z.number().int().positive().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one valid field must be provided for an update.",
  });
