import loadDynamic from "next/dynamic";
export const dynamic = "force-dynamic";
const RootRedirect = loadDynamic(() => import("./RootRedirect"), { ssr: false });
export default function Home() { return <RootRedirect />; }
