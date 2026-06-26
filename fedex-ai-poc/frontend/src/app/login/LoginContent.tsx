"use client";
export const dynamic = "force-dynamic";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import QuantixLogo from "@/components/QuantixLogo";

export default function LoginContent() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("quantixai_user_email")) {
      router.replace("/chat");
    }
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    localStorage.setItem("quantixai_user_email", trimmed);
    router.push("/connect");
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <QuantixLogo size="md" className="text-[var(--text-primary)]" />
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] shadow-sm p-8">
          <h1 className="text-xl font-semibold mb-1 text-center">Welcome to QuantixAI</h1>
          <p className="text-sm text-[var(--text-secondary)] text-center mb-6">
            Enter your email to get started — we'll save your conversation history so you can pick up right where you left off.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="you@example.com"
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all"
              />
              {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors text-sm"
            >
              Continue →
            </button>
          </form>

          <p className="mt-5 text-xs text-center text-[var(--text-secondary)]">
            No password needed. Your email is used only to save your conversation history.
          </p>
        </div>
      </div>
    </div>
  );
}
