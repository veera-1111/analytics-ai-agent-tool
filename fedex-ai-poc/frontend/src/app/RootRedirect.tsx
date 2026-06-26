"use client";
export const dynamic = "force-dynamic";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootRedirect() {
  const router = useRouter();
  useEffect(() => {
    const email = localStorage.getItem("quantixai_user_email");
    router.replace(email ? "/chat" : "/login");
  }, []);
  return null;
}
