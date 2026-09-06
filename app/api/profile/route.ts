import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { users } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

async function ensureProfile() {
  const identity = await getChatGPTUser();
  if (!identity) return null;
  const db = getDb(), now = Date.now();
  await db.insert(users).values({ id: identity.userId, email: identity.email, displayName: identity.displayName, createdAt: now, lastLoginAt: now })
    .onConflictDoUpdate({ target: users.id, set: { email: identity.email, lastLoginAt: now } });
  const [profile] = await db.select().from(users).where(eq(users.id, identity.userId)).limit(1);
  return profile ?? null;
}

export async function GET() {
  const profile = await ensureProfile();
  return profile ? Response.json({ profile }) : Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
}

export async function PATCH(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return Response.json({ error: "Datos inválidos." }, { status: 400 }); }

  const update: Record<string, string | boolean> = {};
  const choice = (key: string, allowed: string[]) => typeof body[key] === "string" && allowed.includes(body[key] as string) ? body[key] as string : undefined;
  const theme = choice("theme", ["light", "dark", "system"]);
  const tone = choice("tone", ["warm", "reflective", "gentle", "direct"]);
  const fontSize = choice("fontSize", ["small", "medium", "large"]);
  const responseLength = choice("responseLength", ["brief", "balanced", "deep"]);
  const chatWidth = choice("chatWidth", ["compact", "comfortable", "wide"]);
  if (theme) update.theme = theme;
  if (tone) update.tone = tone;
  if (fontSize) update.fontSize = fontSize;
  if (responseLength) update.responseLength = responseLength;
  if (chatWidth) update.chatWidth = chatWidth;
  for (const key of ["reduceMotion", "memoryEnabled", "enterToSend", "highContrast"] as const) if (typeof body[key] === "boolean") update[key] = body[key] as boolean;
  if (typeof body.displayName === "string") {
    const displayName = body.displayName.trim().replace(/\s+/g, " ").slice(0, 60);
    if (displayName.length < 2) return Response.json({ error: "El nombre debe tener al menos 2 caracteres." }, { status: 400 });
    update.displayName = displayName;
  }
  if (typeof body.pronouns === "string") update.pronouns = body.pronouns.trim().slice(0, 40);
  if (typeof body.aboutMe === "string") update.aboutMe = body.aboutMe.trim().slice(0, 500);
  if (!Object.keys(update).length) return Response.json({ error: "No hay cambios válidos." }, { status: 400 });
  await ensureProfile();
  await getDb().update(users).set(update).where(eq(users.id, identity.userId));
  const [profile] = await getDb().select().from(users).where(eq(users.id, identity.userId)).limit(1);
  return Response.json({ ok: true, profile });
}
