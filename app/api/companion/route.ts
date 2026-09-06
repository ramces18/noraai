import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { companions } from "../../../db/schema";
import { ACCESSORIES, APPEARANCES, COMMUNICATION_STYLES, PERSONALITIES, PET_TYPES } from "../../companion/catalog";
import { ensureCompanion, parseItems } from "../../companion-server";
import { getChatGPTUser } from "../../chatgpt-auth";

const allowed = (values: ReadonlyArray<{ value: string }>) => new Set(values.map(item => item.value));
const PET_VALUES = allowed(PET_TYPES);
const APPEARANCE_VALUES = allowed(APPEARANCES);
const ACCESSORY_VALUES = allowed(ACCESSORIES);
const PERSONALITY_VALUES = allowed(PERSONALITIES);
const COMMUNICATION_VALUES = allowed(COMMUNICATION_STYLES);

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  try {
    const companion = await ensureCompanion(identity);
    return Response.json({ companion: { ...companion, unlockedItems: parseItems(companion.unlockedItems) } });
  } catch (error) {
    console.error(JSON.stringify({ event: "companion_get_failed", message: error instanceof Error ? error.message : "unknown" }));
    return Response.json({ error: "No pudimos abrir el espacio de tu compañero." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  if (Number(request.headers.get("content-length") || 0) > 20_000) return Response.json({ error: "La solicitud es demasiado grande." }, { status: 413 });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return Response.json({ error: "No pudimos leer la personalización." }, { status: 400 }); }
  await ensureCompanion(identity);
  const update: Record<string, string | boolean | number> = { updatedAt: Date.now() };
  if (typeof body.name === "string") {
    const name = body.name.trim().replace(/\s+/g, " ").slice(0, 24);
    if (name.length < 2) return Response.json({ error: "El nombre debe tener al menos 2 caracteres." }, { status: 400 });
    update.name = name;
  }
  if (typeof body.petType === "string" && PET_VALUES.has(body.petType)) update.petType = body.petType;
  if (typeof body.appearance === "string" && APPEARANCE_VALUES.has(body.appearance)) update.appearance = body.appearance;
  if (typeof body.accessory === "string" && ACCESSORY_VALUES.has(body.accessory)) update.accessory = body.accessory;
  if (typeof body.personality === "string" && PERSONALITY_VALUES.has(body.personality)) update.personality = body.personality;
  if (typeof body.communicationStyle === "string" && COMMUNICATION_VALUES.has(body.communicationStyle)) update.communicationStyle = body.communicationStyle;
  if (body.setupComplete === true) update.setupComplete = true;
  if (Object.keys(update).length === 1) return Response.json({ error: "No hay cambios válidos." }, { status: 400 });
  await getDb().update(companions).set(update).where(eq(companions.userId, identity.userId));
  const [companion] = await getDb().select().from(companions).where(eq(companions.userId, identity.userId)).limit(1);
  return Response.json({ ok: true, companion: companion ? { ...companion, unlockedItems: parseItems(companion.unlockedItems) } : null });
}
