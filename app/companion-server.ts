import { desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { albumMoments, companions, users, wellbeingEntries } from "../db/schema";

type Identity = { userId: string; email: string; displayName: string };

export async function ensureCompanion(identity: Identity) {
  const db = getDb();
  const now = Date.now();
  await db.insert(users).values({ id: identity.userId, email: identity.email, displayName: identity.displayName, createdAt: now, lastLoginAt: now })
    .onConflictDoUpdate({ target: users.id, set: { email: identity.email, lastLoginAt: now } });
  await db.insert(companions).values({ userId: identity.userId, createdAt: now, updatedAt: now, lastInteractionAt: now })
    .onConflictDoNothing();
  const [companion] = await db.select().from(companions).where(eq(companions.userId, identity.userId)).limit(1);
  if (!companion) throw new Error("companion_not_available");
  return companion;
}

export async function preserveCompanionProgress(userId: string) {
  const db = getDb();
  const [companion] = await db.select().from(companions).where(eq(companions.userId, userId)).limit(1);
  if (!companion) return null;
  const [entries, moments] = await Promise.all([
    db.select({ activity: wellbeingEntries.activity }).from(wellbeingEntries).where(eq(wellbeingEntries.userId, userId)).orderBy(desc(wellbeingEntries.happenedAt)).limit(500),
    db.select({ id: albumMoments.id }).from(albumMoments).where(eq(albumMoments.userId, userId)).orderBy(desc(albumMoments.happenedAt)).limit(500),
  ]);
  const counts = new Map<string, number>();
  for (const entry of entries) if (entry.activity) counts.set(entry.activity, (counts.get(entry.activity) ?? 0) + 1);
  const items = new Set(parseItems(companion.unlockedItems));
  items.add("cushion");
  if ((counts.get("walk") ?? 0) >= 3) items.add("plant");
  if ((counts.get("journal") ?? 0) >= 3) items.add("notebook");
  if ((counts.get("sleep") ?? 0) + (counts.get("rest") ?? 0) >= 3) items.add("blanket");
  if ((counts.get("connect") ?? 0) + (counts.get("ask_help") ?? 0) >= 3) items.add("symbolic-photo");
  if ((counts.get("water") ?? 0) + (counts.get("eat") ?? 0) >= 3) items.add("cup");
  if (moments.length >= 3) items.add("memory-shelf");
  const total = entries.length + moments.length;
  if (total >= 5) items.add("rug");
  if (total >= 12) items.add("lamp");
  const sharedDays = Math.max(0, Math.floor((Date.now() - companion.createdAt) / 86_400_000));
  if (sharedDays >= 14) items.add("window-light");
  const calculatedStage = total >= 30 || sharedDays >= 90 ? 4 : total >= 15 || sharedDays >= 30 ? 3 : total >= 5 || sharedDays >= 7 ? 2 : 1;
  const bondStage = Math.max(companion.bondStage, calculatedStage);
  const now = Date.now();
  await db.update(companions).set({ unlockedItems: JSON.stringify([...items]), bondStage, updatedAt: now, lastInteractionAt: now }).where(eq(companions.userId, userId));
  return { ...companion, unlockedItems: JSON.stringify([...items]), bondStage, updatedAt: now, lastInteractionAt: now };
}

export function parseItems(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, 30) : ["cushion"];
  } catch {
    return ["cushion"];
  }
}
