"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import QuantixLogo from "@/components/QuantixLogo";
import ConnectionForm, { DbType } from "@/components/ConnectionForm";
import { api } from "@/lib/api";

const DB_TYPES: { id: DbType; label: string; icon: string; desc: string }[] = [
  { id: "postgres",  label: "PostgreSQL",  icon: "🐘", desc: "PostgreSQL 12+" },
  { id: "mysql",     label: "MySQL",       icon: "🐬", desc: "MySQL 8 / MariaDB" },
  { id: "mssql",     label: "SQL Server",  icon: "🪟", desc: "MSSQL 2017+" },
  { id: "snowflake", label: "Snowflake",   icon: "❄️", desc: "Snowflake cloud DW" },
  { id: "sqlite",    label: "SQLite",      icon: "📁", desc: "Local SQLite file" },
];

type Step = "type" | "credentials" | "testing" | "success";

export default function ConnectPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("type");
  const [dbType, setDbType] = useState<DbType | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [fields, setFields] = useState<Record<string, string | number>>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ connection_id: string; table_count: number } | null>(null);

  const handleFieldChange = (key: string, value: string | number) => {
    setFields(f => ({ ...f, [key]: value }));
  };

  const handleConnect = async () => {
    setError(null);
    setStep("testing");
    try {
      const res = await api.saveConnection({
        display_name: displayName || `${dbType} database`,
        db_type: dbType,
        ...fields,
      });
      setResult({ connection_id: res.connection_id, table_count: res.table_count });
      localStorage.setItem("quantixai_connection_id", res.connection_id);
      localStorage.setItem("quantixai_connection_name", res.display_name);
      setStep("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Connection failed");
      setStep("credentials");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <QuantixLogo size="md" className="text-[var(--text-primary)]" />
        </div>

        {/* Security trust bar */}
        <div className="mb-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            <span className="text-sm font-semibold text-green-800 dark:text-green-300">Your data stays private</span>
          </div>
          <ul className="space-y-1.5">
            {[
              ["🔐", "Credentials encrypted with AES-256-GCM before storage — never stored in plain text"],
              ["🚫", "We never read, copy, or store the contents of your database"],
              ["⚡", "Queries run on-demand only when you ask a question — no background scanning"],
              ["🗑️", "You can delete your connection and all associated data at any time"],
            ].map(([icon, text]) => (
              <li key={text as string} className="flex items-start gap-2 text-xs text-green-700 dark:text-green-400">
                <span className="flex-shrink-0 mt-0.5">{icon}</span>
                <span>{text as string}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] shadow-sm p-6">

          {/* Step 1 — Choose DB type */}
          {step === "type" && (
            <>
              <h2 className="text-lg font-semibold mb-1">Connect your database</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6">Choose your database type to get started</p>
              <div className="space-y-2">
                {DB_TYPES.map(db => (
                  <button
                    key={db.id}
                    onClick={() => { setDbType(db.id); setStep("credentials"); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border-color)] hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-left"
                  >
                    <span className="text-2xl">{db.icon}</span>
                    <div>
                      <p className="font-medium text-sm">{db.label}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{db.desc}</p>
                    </div>
                    <svg className="ml-auto w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}

                {/* Divider */}
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-[var(--border-color)]" />
                  <span className="text-xs text-[var(--text-secondary)]">or</span>
                  <div className="flex-1 h-px bg-[var(--border-color)]" />
                </div>

                {/* Demo mode option */}
                <button
                  onClick={() => {
                    localStorage.setItem("quantixai_connection_id", "demo");
                    localStorage.setItem("quantixai_connection_name", "Demo — Sample Logistics Data");
                    router.push("/chat");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-primary-300 dark:border-primary-700 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-left"
                >
                  <span className="text-2xl">✨</span>
                  <div>
                    <p className="font-medium text-sm text-primary-700 dark:text-primary-300">I just want to explore</p>
                    <p className="text-xs text-[var(--text-secondary)]">Try with sample logistics data — no database needed</p>
                  </div>
                  <svg className="ml-auto w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </>
          )}

          {/* Step 2 — Credentials */}
          {step === "credentials" && dbType && (
            <>
              <button onClick={() => setStep("type")} className="text-sm text-[var(--text-secondary)] mb-4 flex items-center gap-1 hover:text-[var(--text-primary)]">
                ← Back
              </button>
              <h2 className="text-lg font-semibold mb-1">
                {DB_TYPES.find(d => d.id === dbType)?.icon} {DB_TYPES.find(d => d.id === dbType)?.label}
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mb-5">Enter your connection details</p>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Connection name</label>
                <input
                  type="text"
                  placeholder="e.g. Production DB, Analytics"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>

              <ConnectionForm dbType={dbType} onChange={handleFieldChange} values={fields} />

              {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}

              <button
                onClick={handleConnect}
                className="mt-6 w-full py-2.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
              >
                Connect securely →
              </button>

              <div className="mt-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700 p-3 space-y-2">
                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">How we protect your credentials</p>
                {[
                  ["🔐", "Encrypted with AES-256-GCM", "Your password and connection string are encrypted before being written to storage. The encryption key is never logged or exposed."],
                  ["🚫", "We never access your data", "QuantixAI only runs the SQL queries you explicitly ask for. We do not scan, copy, or retain any rows from your database."],
                  ["👁️", "Read-only access only", "All queries are strictly SELECT — QuantixAI cannot modify, delete, or insert data into your database."],
                  ["🗑️", "Delete anytime", "You can remove your connection at any time from the chat settings. All stored credentials are permanently deleted immediately."],
                ].map(([icon, title, desc]) => (
                  <div key={title as string} className="flex items-start gap-2">
                    <span className="text-sm flex-shrink-0 mt-0.5">{icon}</span>
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{title as string}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">{desc as string}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Step 3 — Testing */}
          {step === "testing" && (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="font-medium">Testing connection…</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">Reading schema and indexing tables</p>
            </div>
          )}

          {/* Step 4 — Success */}
          {step === "success" && result && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
              <h2 className="text-lg font-semibold mb-1">Connected!</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-1">{result.table_count} tables indexed</p>
              <p className="text-xs text-[var(--text-secondary)] mb-6">You can now ask questions about your data</p>
              <button
                onClick={() => router.push("/chat")}
                className="w-full py-2.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
              >
                Start chatting →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
