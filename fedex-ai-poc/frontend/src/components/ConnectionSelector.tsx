"use client";

import { useEffect, useState } from "react";
import { api, ConnectionMeta } from "@/lib/api";

interface Props {
  activeConnectionId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

const DB_ICONS: Record<string, string> = {
  postgres: "🐘", mysql: "🐬", mssql: "🪟", snowflake: "❄️", sqlite: "📁",
};

export default function ConnectionSelector({ activeConnectionId, onSelect, onAdd }: Props) {
  const [connections, setConnections] = useState<ConnectionMeta[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.listConnections().then(setConnections).catch(() => {});
  }, []);

  const active = connections.find(c => c.connection_id === activeConnectionId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-sm transition-colors"
      >
        <span>{active ? DB_ICONS[active.db_type] ?? "🗄️" : "🗄️"}</span>
        <span className="max-w-[140px] truncate font-medium">
          {active ? active.display_name : "No DB connected"}
        </span>
        <svg className="w-3 h-3 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-lg z-50">
          <div className="p-2 space-y-1">
            {connections.map(c => (
              <button
                key={c.connection_id}
                onClick={() => { onSelect(c.connection_id); setOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                  c.connection_id === activeConnectionId
                    ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                    : "hover:bg-[var(--bg-secondary)]"
                }`}
              >
                <span>{DB_ICONS[c.db_type] ?? "🗄️"}</span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.display_name}</p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">{c.database ?? c.host}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="border-t border-[var(--border-color)] p-2">
            <button
              onClick={() => { onAdd(); setOpen(false); }}
              className="w-full px-3 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors text-left flex items-center gap-2"
            >
              <span>＋</span> Connect new database
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
