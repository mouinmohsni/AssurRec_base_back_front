import { z } from "zod";
import {
  date,
  id,
  reference,
  positiveMilli,
  listQuery,
  withPeriod,
} from "./common.dto.js";
export const installmentSchema = z.object({
  reference,
  contractId: id,
  dueDate: date,
  amountMilli: positiveMilli,
});
export const installmentQuery = withPeriod(
  listQuery.extend({
    contractId: id.optional(),
    insuredId: id.optional(),
    status: z.enum(["a_venir", "impaye", "partiel", "regle"]).optional(),
    from: date.optional(),
    to: date.optional(),
  }),
);
