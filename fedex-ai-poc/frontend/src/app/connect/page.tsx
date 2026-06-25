import loadDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const ConnectContent = loadDynamic(() => import("./ConnectContent"), { ssr: false });

export default function ConnectPage() {
  return <ConnectContent />;
}
