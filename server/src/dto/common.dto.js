import { z } from "zod";

export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format YYYY-MM-DD")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Date calendaire invalide");
export const id = z.coerce.number().int().positive().safe();
export const idParams = z.object({ id });
export const positiveMilli = z
  .number()
  .int()
  .safe()
  .positive()
  .max(2_000_000_000, "Montant trop élevé");
export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(120).optional(),
});
export const reference = z.string().trim().min(1).max(60);
export function withPeriod(schema) {
  return schema.refine(
    (value) => !value.from || !value.to || value.from <= value.to,
    { message: "Période invalide", path: ["to"] },
  );
}
export const dateQuery = withPeriod(
  z.object({ from: date.optional(), to: date.optional() }),
);
