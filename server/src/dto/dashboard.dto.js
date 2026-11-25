import { z } from "zod";
import {
  date,
  id,
  reference,
  positiveMilli,
  listQuery,
  withPeriod,
} from "./common.dto.js";
export const dashboardQuery = withPeriod(
  z.object({
    from: date.optional(),
    to: date.optional(),
    insuranceType: z
      .enum(["auto", "sante", "habitation", "vie", "professionnelle"])
      .optional(),
    agentId: id.optional(),
  }),
);
