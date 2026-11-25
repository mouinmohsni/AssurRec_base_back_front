import { z } from "zod";
import {
  date,
  id,
  reference,
  positiveMilli,
  listQuery,
  withPeriod,
} from "./common.dto.js";
export const reminderSchema = z.object({
  caseId: id,
  channel: z.enum(["telephone", "email", "courrier", "sms"]),
  subject: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(4000),
  status: z.enum(["brouillon", "consigne"]),
  scheduledDate: date.nullable().optional(),
});
export const reminderQuery = listQuery.extend({
  caseId: id.optional(),
  status: z.enum(["brouillon", "consigne"]).optional(),
  channel: z.enum(["telephone", "email", "courrier", "sms"]).optional(),
});
