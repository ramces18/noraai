import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { conversations, messages, users } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

const BASE_PROMPT=`Eres Nora, una compañera de apoyo emocional cálida y respetuosa. Responde en español, de manera natural y concisa. Escucha, valida y haz como máximo una pregunta amable. Puedes sugerir respiración, escritura y autorregulación, pero nunca diagnostiques ni prescribas. No eres psicóloga y no sustituyes ayuda profesional. Si hay riesgo de suicidio, autolesión, abuso o peligro inmediato, expresa cuidado, recomienda contactar ahora a emergencias locales o una línea de crisis y buscar a una persona cercana de confianza. No prometas confidencialidad absoluta.`;
export async function POST(request:Request){
 try{
  const user=await getChatGPTUser();if(!user)return Response.json({error:"Debes iniciar sesión."},{status:401});
  const apiKey=process.env.OPENROUTER_API_KEY;if(!apiKey)return Response.json({error:"Nora aún no tiene configurada su conexión segura."},{status:503});
  const body=await request.json() as {conversationId?:string;message?:string};const text=body.message?.trim().slice(0,4000);if(!body.conversationId||!text)return Response.json({error:"Mensaje inválido."},{status:400});
  const db=getDb();const [conversation]=await db.select().from(conversations).where(and(eq(conversations.id,body.conversationId),eq(conversations.userId,user.userId))).limit(1);if(!conversation)return Response.json({error:"Conversación no encontrada."},{status:404});
  const [profile]=await db.select().from(users).where(eq(users.id,user.userId)).limit(1);const tone=profile?.tone==="serious"?"Usa un tono sereno y directo.":profile?.tone==="gentle"?"Usa un tono especialmente tierno y suave.":"Usa un tono cercano y cálido.";
  const now=Date.now();await db.insert(messages).values({id:crypto.randomUUID(),conversationId:conversation.id,role:"user",content:text,createdAt:now});
  const history=await db.select({role:messages.role,content:messages.content}).from(messages).where(eq(messages.conversationId,conversation.id)).orderBy(asc(messages.createdAt)).limit(30);
  const upstream=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json","HTTP-Referer":new URL(request.url).origin,"X-Title":"Nora"},body:JSON.stringify({model:"inclusionai/ling-3.0-flash-sante:free",messages:[{role:"system",content:`${BASE_PROMPT}\n${tone}`},...history],temperature:.75,max_tokens:700})});
  if(!upstream.ok){console.error("OpenRouter",upstream.status,(await upstream.text()).slice(0,300));return Response.json({error:"Nora no pudo responder ahora. Inténtalo en unos minutos."},{status:502})}
  const result=await upstream.json() as {choices?:Array<{message?:{content?:string}}>};const answer=result.choices?.[0]?.message?.content?.trim();if(!answer)return Response.json({error:"Nora no recibió una respuesta válida."},{status:502});
  const title=conversation.title==="Nueva conversación"?text.slice(0,48)+(text.length>48?"…":""):conversation.title;const assistant={id:crypto.randomUUID(),conversationId:conversation.id,role:"assistant",content:answer,createdAt:Date.now()};await db.batch([db.insert(messages).values(assistant),db.update(conversations).set({title,updatedAt:Date.now()}).where(eq(conversations.id,conversation.id))]);return Response.json({message:assistant,title});
 }catch(error){console.error("Nora chat",error);return Response.json({error:"No pudimos conectar con Nora."},{status:500})}
}
