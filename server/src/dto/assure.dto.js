import { z } from "zod";
import {
  date,
  id,
  reference,
  positiveMilli,
  listQuery,
  withPeriod,
} from "./common.dto.js";
export const insuredSchema = z.object({
  reference,
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(3).max(40),
  address: z.string().trim().min(1).max(255),
  active: z.boolean().optional(),
});
export const insuredQuery = listQuery;
