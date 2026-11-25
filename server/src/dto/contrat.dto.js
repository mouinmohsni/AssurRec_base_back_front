import { z } from "zod";
import {
  date,
  id,
  reference,
  positiveMilli,
  listQuery,
  withPeriod,
} from "./common.dto.js";
export const contractSchema = z
  .object({
    reference,
    insuredId: id,
    insuranceType: z.enum([
      "auto",
      "sante",
      "habitation",
      "vie",
      "professionnelle",
    ]),
    startDate: date,
    endDate: date,
    status: z.enum(["actif", "expire", "resilie"]),
  })
  .refine((x) => x.startDate <= x.endDate, {
    message: "La date de fin doit être postérieure ou égale au début",
    path: ["endDate"],
  });
export const contractQuery = listQuery.extend({
  insuredId: id.optional(),
  insuranceType: z
    .enum(["auto", "sante", "habitation", "vie", "professionnelle"])
    .optional(),
  status: z.enum(["actif", "expire", "resilie"]).optional(),
});
