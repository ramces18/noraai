import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { albumMoments, users } from "../../../db/schema";
import { companionMessage, EMOTIONS } from "../../companion/catalog";
import { ensureCompanion, parseItems, preserveCompanionProgress } from "../../companion-server";
import { getChatGPTUser } from "../../chatgpt-auth";

const EMOTION_VALUES = new Set<string>(EMOTIONS.map(item => item.value));
const PHOTO_PATTERN = /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i;

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  const moments = await getDb().select().from(albumMoments).where(eq(albumMoments.userId, identity.userId)).orderBy(desc(albumMoments.happenedAt)).limit(100);
  return Response.json({ moments });
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  if (Number(request.headers.get("content-length") || 0) > 450_000) return Response.json({ error: "La foto es demasiado grande." }, { status: 413 });
  let body: { text?: string; emotion?: string; photoData?: string | null; personalNote?: string; allowNora?: boolean; happenedAt?: number };
  try { body = await request.json() as typeof body; }
  catch { return Response.json({ error: "No pudimos leer el momento." }, { status: 400 }); }
  const text = body.text?.trim().replace(/\s+/g, " ").slice(0, 600);
  if (!text || text.length < 3) return Response.json({ error: "Escribe un poco sobre el momento que quieres guardar." }, { status: 400 });
  const emotion = EMOTION_VALUES.has(body.emotion ?? "") ? body.emotion! : "";
  const personalNote = typeof body.personalNote === "string" ? body.personalNote.trim().slice(0, 500) : "";
  const photoData = typeof body.photoData === "string" && body.photoData.length <= 360_000 && PHOTO_PATTERN.test(body.photoData) ? body.photoData : null;
  if (body.photoData && !photoData) return Response.json({ error: "La foto debe ser JPG, PNG o WebP y pesar menos de 250 KB después de comprimirla." }, { status: 400 });
  const now = Date.now();
  const earliest = now - 10 * 365 * 86_400_000;
  const happenedAt = typeof body.happenedAt === "number" && body.happenedAt >= earliest && body.happenedAt <= now + 86_400_000 ? Math.floor(body.happenedAt) : now;
  const companion = await ensureCompanion(identity);
  const reaction = companionMessage({ kind: "moment", seed: crypto.randomUUID(), style: companion.communicationStyle });
  const moment = { id: crypto.randomUUID(), userId: identity.userId, text, emotion, photoData, personalNote, allowNora: body.allowNora === true, petReaction: reaction, happenedAt, createdAt: now, updatedAt: now };
  await getDb().insert(albumMoments).values(moment);
  const [profile] = await getDb().select({ companionUseWellbeing: users.companionUseWellbeing }).from(users).where(eq(users.id, identity.userId)).limit(1);
  const updatedCompanion = profile?.companionUseWellbeing === false ? companion : await preserveCompanionProgress(identity.userId) ?? companion;
  return Response.json({ moment, companion: { ...updatedCompanion, unlockedItems: parseItems(updatedCompanion.unlockedItems) } }, { status: 201 });
}
