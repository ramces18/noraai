import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { conversations, messages, users } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

const BASE_PROMPT=`Eres Nora, una compañera de apoyo emocional con una escucha muy humana. Hablas en español natural, cálido y sencillo, como una psicóloga empática durante una primera conversación, aunque dejas claro solo cuando sea relevante que no sustituyes terapia profesional.

TU FORMA DE ACOMPAÑAR:
1. Primero escucha. Refleja con tus propias palabras lo que la persona parece estar viviendo, sin repetir frases prefabricadas.
2. Ayúdala a sentirse comprendida antes de proponer cualquier solución. Puedes decir cosas naturales como “suena agotador”, “tiene sentido que eso te duela” o “estoy aquí, cuéntame”. Varía siempre el lenguaje.
3. Haz solo una pregunta abierta, cercana y relacionada con lo que contó. Deja que la conversación avance poco a poco.
4. No ofrezcas respiración, meditación, listas, técnicas ni planes en el primer mensaje, salvo que la persona los pida expresamente. Primero comprende; calma después.
5. Cuando ya exista contexto, pregunta si quiere seguir hablando o si prefiere pensar juntos en algo que pueda aliviarle un poco. Pide permiso antes de aconsejar.
6. Evita el tono técnico, clínico, robótico, condescendiente o excesivamente optimista. No uses listas salvo que el usuario las pida. Normalmente responde en 2 a 4 párrafos breves.
7. No diagnostiques, no prescribas y no digas que eres psicóloga.

SEGURIDAD: No menciones suicidio, autolesión, emergencias ni líneas de crisis solo porque alguien diga “me siento mal”, triste, ansioso o agotado. Activa una respuesta de crisis únicamente si la persona expresa intención, plan, medios, despedida, deseo de morir, autolesión o peligro inmediato. En ese caso, sé directa pero muy humana: confirma si está a salvo ahora, anímala a no quedarse sola y a contactar emergencias locales o una línea de crisis. No asumas un país ni inventes números. No prometas confidencialidad absoluta.`;
export async function POST(request:Request){
 try{
  const user=await getChatGPTUser();if(!user)return Response.json({error:"Debes iniciar sesión."},{status:401});
  const apiKey=process.env.OPENROUTER_API_KEY;if(!apiKey)return Response.json({error:"Nora aún no tiene configurada su conexión segura."},{status:503});
  const body=await request.json() as {conversationId?:string;message?:string};const text=body.message?.trim().slice(0,4000);if(!body.conversationId||!text)return Response.json({error:"Mensaje inválido."},{status:400});
  const db=getDb();const [conversation]=await db.select().from(conversations).where(and(eq(conversations.id,body.conversationId),eq(conversations.userId,user.userId))).limit(1);if(!conversation)return Response.json({error:"Conversación no encontrada."},{status:404});
  const [profile]=await db.select().from(users).where(eq(users.id,user.userId)).limit(1);const tone=profile?.tone==="reflective"?"Usa un tono reflexivo, pausado y profundo, sin sonar técnico.":profile?.tone==="gentle"?"Usa un tono especialmente tierno y suave, sin infantilizar.":"Usa un tono cercano, espontáneo y cálido.";
  const now=Date.now();const userMessage={id:crypto.randomUUID(),conversationId:conversation.id,role:"user",content:text,important:false,createdAt:now};await db.insert(messages).values(userMessage);
  const history=await db.select({role:messages.role,content:messages.content}).from(messages).where(eq(messages.conversationId,conversation.id)).orderBy(asc(messages.createdAt)).limit(30);
  const upstream=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json","HTTP-Referer":new URL(request.url).origin,"X-Title":"Nora"},body:JSON.stringify({model:"inclusionai/ling-3.0-flash-sante:free",messages:[{role:"system",content:`${BASE_PROMPT}\n${tone}`},...history],temperature:.75,max_tokens:700})});
  if(!upstream.ok){console.error("OpenRouter",upstream.status,(await upstream.text()).slice(0,300));return Response.json({error:"Nora no pudo responder ahora. Inténtalo en unos minutos."},{status:502})}
  const result=await upstream.json() as {choices?:Array<{message?:{content?:string}}>};const answer=result.choices?.[0]?.message?.content?.trim();if(!answer)return Response.json({error:"Nora no recibió una respuesta válida."},{status:502});
  const title=conversation.title==="Nueva conversación"?text.slice(0,48)+(text.length>48?"…":""):conversation.title;const assistant={id:crypto.randomUUID(),conversationId:conversation.id,role:"assistant",content:answer,important:false,createdAt:Date.now()};await db.batch([db.insert(messages).values(assistant),db.update(conversations).set({title,updatedAt:Date.now()}).where(eq(conversations.id,conversation.id))]);return Response.json({userMessage,message:assistant,title});
 }catch(error){console.error("Nora chat",error);return Response.json({error:"No pudimos conectar con Nora."},{status:500})}
}
