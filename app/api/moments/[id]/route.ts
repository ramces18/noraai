import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { albumMoments } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  const { id } = await context.params;
  let body: { allowNora?: boolean };
  try { body = await request.json() as typeof body; }
  catch { return Response.json({ error: "No pudimos leer el cambio." }, { status: 400 }); }
  if (typeof body.allowNora !== "boolean") return Response.json({ error: "El permiso no es válido." }, { status: 400 });
  const result = await getDb().update(albumMoments).set({ allowNora: body.allowNora, updatedAt: Date.now() }).where(and(eq(albumMoments.id, id), eq(albumMoments.userId, identity.userId)));
  return Response.json({ ok: true, changed: result.meta.changes > 0 });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  const { id } = await context.params;
  const [moment] = await getDb().select({ id: albumMoments.id }).from(albumMoments).where(and(eq(albumMoments.id, id), eq(albumMoments.userId, identity.userId))).limit(1);
  if (!moment) return Response.json({ error: "Este momento ya no existe." }, { status: 404 });
  await getDb().delete(albumMoments).where(and(eq(albumMoments.id, id), eq(albumMoments.userId, identity.userId)));
  return Response.json({ ok: true });
}
