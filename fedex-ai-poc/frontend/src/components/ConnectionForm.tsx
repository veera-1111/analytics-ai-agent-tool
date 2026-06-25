"use client";

import { useState } from "react";

export type DbType = "postgres" | "mysql" | "mssql" | "snowflake" | "sqlite";

interface Props {
  dbType: DbType;
  onChange: (field: string, value: string | number) => void;
  values: Record<string, string | number>;
}

const FIELD_HINTS: Record<DbType, { label: string; placeholder: string }[]> = {
  postgres: [
    { label: "Host", placeholder: "db.example.com" },
    { label: "Port", placeholder: "5432" },
    { label: "Database", placeholder: "mydb" },
    { label: "Username", placeholder: "postgres" },
    { label: "Password", placeholder: "••••••••" },
  ],
  mysql: [
    { label: "Host", placeholder: "db.example.com" },
    { label: "Port", placeholder: "3306" },
    { label: "Database", placeholder: "mydb" },
    { label: "Username", placeholder: "root" },
    { label: "Password", placeholder: "••••••••" },
  ],
  mssql: [
    { label: "Host", placeholder: "server.database.windows.net" },
    { label: "Port", placeholder: "1433" },
    { label: "Database", placeholder: "mydb" },
    { label: "Username", placeholder: "sa" },
    { label: "Password", placeholder: "••••••••" },
  ],
  snowflake: [
    { label: "Account", placeholder: "xy12345.us-east-1" },
    { label: "Database", placeholder: "MY_DB" },
    { label: "Username", placeholder: "user@example.com" },
    { label: "Password", placeholder: "••••••••" },
  ],
  sqlite: [
    { label: "File Path", placeholder: "/path/to/database.db" },
  ],
};

const FIELD_KEYS: Record<DbType, string[]> = {
  postgres: ["host", "port", "database", "username", "password"],
  mysql: ["host", "port", "database", "username", "password"],
  mssql: ["host", "port", "database", "username", "password"],
  snowflake: ["host", "database", "username", "password"],
  sqlite: ["host"],
};

export default function ConnectionForm({ dbType, onChange, values }: Props) {
  const fields = FIELD_HINTS[dbType] || [];
  const keys = FIELD_KEYS[dbType] || [];

  return (
    <div className="space-y-4">
      {fields.map((field, i) => {
        const key = keys[i];
        const isPassword = field.label === "Password";
        const isPort = field.label === "Port";
        return (
          <div key={key}>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              {field.label}
            </label>
            <input
              type={isPassword ? "password" : "text"}
              placeholder={field.placeholder}
              value={values[key] as string ?? ""}
              onChange={e => onChange(key, isPort ? Number(e.target.value) : e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>
        );
      })}
    </div>
  );
}
