import { withTransaction } from "../config/database.js";
import { requireActorRole } from "../utils/errors.js";
import { pagination, pageResult } from "../utils/pagination.js";
import { toReminderDto } from "../dto/relance.mapper.js";
import * as repository from "../repositories/relance.repository.js";

function inputPage(q = {}) {
  return { ...q, ...pagination(q) };
}

export async function listReminders(q = {}, actor) {
  const query = inputPage(q);
  const result = await repository.listReminders(query, actor);
  return pageResult(result.rows.map(toReminderDto), result.count, q);
}

export async function getReminder(id, actor, transaction) {
  return toReminderDto(
    await repository.getReminderById(id, actor, transaction),
  );
}

export async function saveReminder(actor, id, input) {
  requireActorRole(actor, "admin", "manager", "agent");
  return withTransaction(async (transaction) => {
    if (id == null)
      return toReminderDto(
        await repository.createReminder(input, actor, transaction),
      );
    return toReminderDto(
      await repository.updateReminder(id, input, actor, transaction),
    );
  });
}

export async function deleteReminder(actor, id) {
  requireActorRole(actor, "admin", "manager", "agent");
  return withTransaction(async (transaction) => {
    await repository.deleteReminder(id, actor, transaction);
    return { ok: true };
  });
}
