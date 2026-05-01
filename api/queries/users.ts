import type { User } from "@db/schema";
import { collections, getNextId, nowIso } from "./connection";
import { env } from "../lib/env";

export async function findUserByUnionId(unionId: string) {
  return await (await collections.users()).findOne({ unionId });
}

export async function upsertUser(data: Partial<User>) {
  const users = await collections.users();
  const values = { ...data };
  const updateSet: Partial<User> = {
    lastSignInAt: nowIso(),
    updatedAt: nowIso(),
    ...data,
  };

  if (
    values.role === undefined &&
    values.unionId &&
    values.unionId === env.ownerUnionId
  ) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  const existing = values.unionId ? await users.findOne({ unionId: values.unionId }) : null;

  if (existing) {
    await users.updateOne({ id: existing.id }, { $set: updateSet });
    return;
  }

  const id = await getNextId("users");
  await users.insertOne({
    id,
    role: "user",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    lastSignInAt: nowIso(),
    ...values,
  });
}
