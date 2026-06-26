import loadDynamic from "next/dynamic";
export const dynamic = "force-dynamic";
const HomeContent = loadDynamic(() => import("./HomeContent"), { ssr: false });
export default function HomePage() { return <HomeContent />; }
