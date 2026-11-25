import { z } from "zod";
import {
  date,
  id,
  reference,
  positiveMilli,
  listQuery,
  withPeriod,
} from "./common.dto.js";
export const paymentSchema = z.object({
  installmentId: id,
  amountMilli: positiveMilli,
  paidAt: date,
  method: z.enum(["virement", "cheque", "especes"]),
  reference,
});
export const reverseSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});
export const paymentQuery = withPeriod(
  listQuery.extend({
    installmentId: id.optional(),
    caseId: id.optional(),
    status: z.enum(["valide", "annule"]).optional(),
    from: date.optional(),
    to: date.optional(),
  }),
);
