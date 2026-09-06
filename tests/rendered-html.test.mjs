import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("keeps credentials on the server and out of tracked source", async () => {
  const [chat, auth, config] = await Promise.all([read("app/api/chat/route.ts"), read("app/chatgpt-auth.ts"), read("wrangler.jsonc")]);
  assert.match(chat, /process\.env\.OPENROUTER_API_KEY/);
  assert.match(auth, /process\.env\.AUTH_SECRET/);
  assert.doesNotMatch(`${chat}\n${auth}\n${config}`, /sk-or-v1-[a-z0-9]{20,}/i);
  assert.doesNotMatch(config, /GOOGLE_CLIENT_SECRET|OPENROUTER_API_KEY\s*"\s*:/);
});

test("uses recent bounded context and user-controlled memory", async () => {
  const chat = await read("app/api/chat/route.ts");
  assert.match(chat, /orderBy\(desc\(messages\.createdAt\)\)\.limit\(28\)/);
  assert.match(chat, /fitRecentContext/);
  assert.match(chat, /profile\?\.memoryEnabled !== false/);
  assert.match(chat, /extractExplicitMemory/);
  assert.match(chat, /clientMessageId/);
});

test("separates facts from psychological interpretations", async () => {
  const chat = await read("app/api/chat/route.ts");
  assert.match(chat, /Distingue siempre los hechos de las interpretaciones/);
  assert.match(chat, /Nunca presentes como certeza una causa, intención, necesidad, consecuencia futura, diagnóstico o estado psicológico/);
  assert.match(chat, /Es preferible preguntar antes que completar los vacíos/);
  assert.match(chat, /No abras con órdenes o fórmulas alarmistas/);
  assert.match(chat, /\[nombre\], pará/);
});

test("offers responsive and accessible chat controls", async () => {
  const [app, css] = await Promise.all([read("app/chat/ChatApp.tsx"), read("app/chat/chat-app.css")]);
  assert.match(app, /aria-modal="true"/);
  assert.match(app, /aria-live="polite"/);
  assert.match(css, /height:100dvh/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /@media\(max-width:780px\)/);
  assert.match(css, /prefers-reduced-motion/);
});

test("discloses Nora's limits and data processing", async () => {
  const home = await read("app/page.tsx");
  assert.match(home, /(?:no|ni) sustituye/i);
  assert.match(home, /proveedor de IA/i);
  assert.match(home, /peligro inmediato/i);
  assert.match(home, /Brené Brown/);
});

test("implements an autonomous companion without streaks or emotional pressure", async () => {
  const [component, catalog, schema, migration, chat] = await Promise.all([
    read("app/companion/CompanionApp.tsx"), read("app/companion/catalog.ts"), read("db/schema.ts"),
    read("drizzle/0003_emotional_companion.sql"), read("app/api/chat/route.ts"),
  ]);
  assert.match(`${component}\n${catalog}`, /Ahora no quiero hacer nada/);
  assert.match(component, /Nunca se pierde|nunca pierde|Nada se pierde/i);
  assert.match(component, /noraUseCareData/);
  assert.match(component, /noraUseAlbumMoments/);
  assert.match(catalog, /No estoy contando días perfectos/);
  assert.match(chat, /Un recuerdo positivo nunca invalida una emoción actual/);
  assert.doesNotMatch(`${schema}\n${migration}`, /streak_(?:count|days)|score_(?:total|points)|penalty_count/i);
  assert.doesNotMatch(chat, /photoData/);
});
