import loadDynamic from "next/dynamic";
export const dynamic = "force-dynamic";
const LoginContent = loadDynamic(() => import("./LoginContent"), { ssr: false });
export default function LoginPage() { return <LoginContent />; }
