import { z } from "zod";
import {
  date,
  id,
  reference,
  positiveMilli,
  listQuery,
  withPeriod,
} from "./common.dto.js";
export const auditQuery = withPeriod(
  listQuery.extend({
    entityType: z.string().max(50).optional(),
    from: date.optional(),
    to: date.optional(),
  }),
);
