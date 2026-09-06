import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { users, wellbeingEntries } from "../../../db/schema";
import { ACTIVITY_LABELS, CARE_ACTIVITIES, companionMessage, EMOTION_LABELS, EMOTIONS } from "../../companion/catalog";
import { ensureCompanion, parseItems, preserveCompanionProgress } from "../../companion-server";
import { getChatGPTUser } from "../../chatgpt-auth";

const ACTIVITY_VALUES = new Set<string>(CARE_ACTIVITIES.map(item => item.value));
const EMOTION_VALUES = new Set<string>(EMOTIONS.map(item => item.value));

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  const db = getDb();
  const [profile] = await db.select({ statsEnabled: users.wellbeingStatsEnabled }).from(users).where(eq(users.id, identity.userId)).limit(1);
  const entries = await db.select().from(wellbeingEntries).where(eq(wellbeingEntries.userId, identity.userId)).orderBy(desc(wellbeingEntries.happenedAt)).limit(180);
  const monthStart = new Date();
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthEntries = entries.filter(entry => entry.happenedAt >= monthStart.getTime());
  const byActivity: Record<string, number> = {};
  for (const entry of monthEntries) if (entry.activity) byActivity[entry.activity] = (byActivity[entry.activity] ?? 0) + 1;
  const stats = profile?.statsEnabled === false ? null : {
    monthTotal: monthEntries.length,
    careTotal: monthEntries.filter(entry => entry.kind === "care").length,
    checkinTotal: monthEntries.filter(entry => entry.kind === "checkin").length,
    byActivity,
  };
  return Response.json({ entries, stats });
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  if (Number(request.headers.get("content-length") || 0) > 20_000) return Response.json({ error: "La solicitud es demasiado grande." }, { status: 413 });
  let body: { kind?: string; activity?: string; emotion?: string; note?: string; allowNora?: boolean; happenedAt?: number };
  try { body = await request.json() as typeof body; }
  catch { return Response.json({ error: "No pudimos leer el registro." }, { status: 400 }); }
  const kind = body.kind === "care" || body.kind === "checkin" ? body.kind : null;
  if (!kind) return Response.json({ error: "El tipo de registro no es válido." }, { status: 400 });
  const activity = kind === "care" && ACTIVITY_VALUES.has(body.activity ?? "") ? body.activity! : "";
  const emotion = kind === "checkin" && EMOTION_VALUES.has(body.emotion ?? "") ? body.emotion! : "";
  if (kind === "care" && !activity) return Response.json({ error: "Elige la acción que quieres reconocer." }, { status: 400 });
  if (kind === "checkin" && !emotion) return Response.json({ error: "Elige cómo quieres describir el día." }, { status: 400 });
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
  const now = Date.now();
  const earliest = now - 2 * 365 * 86_400_000;
  const happenedAt = typeof body.happenedAt === "number" && body.happenedAt >= earliest && body.happenedAt <= now + 86_400_000 ? Math.floor(body.happenedAt) : now;
  const companion = await ensureCompanion(identity);
  const [profile] = await getDb().select({ companionUseWellbeing: users.companionUseWellbeing }).from(users).where(eq(users.id, identity.userId)).limit(1);
  const entry = { id: crypto.randomUUID(), userId: identity.userId, kind, activity, emotion, note, allowNora: body.allowNora === true, happenedAt, createdAt: now };
  await getDb().insert(wellbeingEntries).values(entry);
  const updatedCompanion = profile?.companionUseWellbeing === false ? companion : await preserveCompanionProgress(identity.userId) ?? companion;
  const message = profile?.companionUseWellbeing === false ? "" : companionMessage({ kind, activity, emotion, seed: entry.id, style: companion.communicationStyle });
  return Response.json({ entry, companion: { ...updatedCompanion, unlockedItems: parseItems(updatedCompanion.unlockedItems) }, companionMessage: message, label: activity ? ACTIVITY_LABELS[activity] : EMOTION_LABELS[emotion] }, { status: 201 });
}
