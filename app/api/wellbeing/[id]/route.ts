import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { wellbeingEntries } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  const { id } = await context.params;
  const [entry] = await getDb().select({ id: wellbeingEntries.id }).from(wellbeingEntries).where(and(eq(wellbeingEntries.id, id), eq(wellbeingEntries.userId, identity.userId))).limit(1);
  if (!entry) return Response.json({ error: "Este registro ya no existe." }, { status: 404 });
  await getDb().delete(wellbeingEntries).where(and(eq(wellbeingEntries.id, id), eq(wellbeingEntries.userId, identity.userId)));
  return Response.json({ ok: true });
}
