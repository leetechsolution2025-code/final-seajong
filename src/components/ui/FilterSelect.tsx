"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface Option { 
  label: string; 
  value: string; 
  isHeader?: boolean;
}

interface FilterSelectProps {
  options: Option[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  width?: number | string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}


export const SELECT_STYLE: React.CSSProperties = {
  fontSize: 13,
  padding: "7px 28px 7px 10px",
  flexShrink: 0,
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--card)",
  color: "var(--foreground)",
};

export function FilterSelect({ options, value, onChange, placeholder = "Tất cả", width, className, disabled, required }: FilterSelectProps) {
  return (
    <select
      value={value ?? ""}
      onChange={e => onChange?.(e.target.value)}
      className={cn("form-select form-select-sm", className)}
      disabled={disabled}
      required={required}
      style={{ 
        ...SELECT_STYLE, 
        width: width ?? "auto",
        height: 34,
        fontSize: 12.5,
        borderRadius: className?.includes("rounded-pill") ? 50 : 8
      }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => (
        <option 
          key={o.value} 
          value={o.value} 
          disabled={o.isHeader}
          style={o.isHeader ? { color: "#94a3b8", fontWeight: "600", backgroundColor: "#f8fafc" } : {}}
        >
          {o.label}
        </option>
      ))}
    </select>
  );
}
