import loadDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const ChatContent = loadDynamic(() => import("./ChatContent"), { ssr: false });

export default function ChatPage() {
  return <ChatContent />;
}
