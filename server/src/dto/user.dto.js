import { z } from "zod";
import {
  date,
  id,
  reference,
  positiveMilli,
  listQuery,
  withPeriod,
} from "./common.dto.js";
export const userCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(254),
  role: z.enum(["admin", "manager", "agent"]),
  password: z.string().min(12).max(200),
  active: z.boolean().optional(),
});
export const userUpdateSchema = userCreateSchema
  .partial()
  .refine((x) => Object.keys(x).length > 0, "Au moins un champ est requis");
export const userQuery = listQuery.extend({
  role: z.enum(["admin", "manager", "agent"]).optional(),
});
