import loadDynamic from "next/dynamic";
export const dynamic = "force-dynamic";
const DashboardContent = loadDynamic(() => import("./DashboardContent"), { ssr: false });
export default function DashboardPage() { return <DashboardContent />; }
