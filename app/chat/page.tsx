import { requireChatGPTUser } from "../chatgpt-auth";
import ChatApp from "./ChatApp";
export const dynamic="force-dynamic";
export default async function ChatPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requireChatGPTUser("/chat");
  const params = await searchParams;
  return <ChatApp user={{ name: user.displayName, email: user.email }} googleWelcome={params.welcome === "google"}/>;
}
