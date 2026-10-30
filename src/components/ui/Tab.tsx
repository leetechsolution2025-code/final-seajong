"use client";

import React from "react";

export type TabKey = string;

export interface TabItem {
  key: TabKey;
  label: string;
}

interface Props {
  tabs: TabItem[];
  active: TabKey;
  onChange: (key: TabKey) => void;
}

export function Tab({ tabs, active, onChange }: Props) {
  return (
    <div style={{ display: "flex", gap: 0 }}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            background: "none",
            border: "none",
            borderRadius: 0,
            cursor: "pointer",
            padding: "0 0 8px",
            marginRight: 20,
            fontSize: 14,
            fontWeight: active === t.key ? 800 : 500,
            color: active === t.key ? "var(--foreground)" : "var(--muted-foreground)",
            borderBottom: active === t.key
              ? "2.5px solid var(--foreground)"
              : "2.5px solid transparent",
            transition: "all 0.15s",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

