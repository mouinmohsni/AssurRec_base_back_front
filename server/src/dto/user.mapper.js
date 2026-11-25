import { iso, numberValue } from "../config/index.js";

export function publicUser(value) {
  const row = value?.dataValues ?? value ?? {};
  return {
    id: numberValue(row.id),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    role: row.role,
    active: row.active === true || row.active === 1 || row.active === "1",
    createdAt: iso(row.createdAt ?? row.created_at),
  };
}
export const toUserDto = publicUser;
export default publicUser;
