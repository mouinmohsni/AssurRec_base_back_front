import { z } from "zod";
import {
  date,
  id,
  reference,
  positiveMilli,
  listQuery,
  withPeriod,
} from "./common.dto.js";
export const caseCreateSchema = z.object({
  installmentId: id,
  agentId: id.nullable().optional(),
  priority: z.enum(["basse", "normale", "haute"]),
  notes: z.string().trim().max(2000).default(""),
});
export const caseUpdateSchema = z
  .object({
    agentId: id.nullable().optional(),
    priority: z.enum(["basse", "normale", "haute"]).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((x) => Object.keys(x).length > 0, "Au moins un champ est requis");
export const transitionSchema = z.object({
  status: z.enum(["nouveau", "en_cours", "promesse_paiement", "cloture"]),
  promiseDate: date.optional(),
});
export const caseQuery = withPeriod(
  listQuery.extend({
    status: z
      .enum(["nouveau", "en_cours", "promesse_paiement", "cloture"])
      .optional(),
    agentId: id.optional(),
    priority: z.enum(["basse", "normale", "haute"]).optional(),
    insuranceType: z
      .enum(["auto", "sante", "habitation", "vie", "professionnelle"])
      .optional(),
    from: date.optional(),
    to: date.optional(),
  }),
);
