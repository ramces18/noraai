import { headers } from "next/headers";
import { readCookie, requireChatGPTUser } from "../chatgpt-auth";
import ChatApp from "./ChatApp";
export const dynamic="force-dynamic";
export default async function ChatPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requireChatGPTUser("/chat");
  const params = await searchParams;
  const requestHeaders = await headers();
  const cookieWelcome = readCookie(requestHeaders.get("cookie"), "nora_google_welcome") === "1";
  return <ChatApp user={{ name: user.displayName, email: user.email }} googleWelcome={params.welcome === "google" || cookieWelcome}/>;
}
