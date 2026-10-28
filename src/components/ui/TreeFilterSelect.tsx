import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface TreeOption {
  label: string;
  value: string;
  isHeader?: boolean;
  level?: number;
}

interface TreeFilterSelectProps {
  options: TreeOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  width?: number | string;
  className?: string;
  disabled?: boolean;
  dropdownPosition?: "top" | "bottom";
}

export const SELECT_STYLE: React.CSSProperties = {
  fontSize: 12.5,
  padding: "7px 28px 7px 10px",
  flexShrink: 0,
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--card)",
  color: "var(--foreground)",
  height: 34,
};

export function TreeFilterSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "Tất cả", 
  width, 
  className,
  disabled,
  dropdownPosition = "bottom"
}: TreeFilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [collapsedHeaders, setCollapsedHeaders] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => setIsOpen(!isOpen);

  const toggleHeader = (headerValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedHeaders(prev => 
      prev.includes(headerValue) ? prev.filter(v => v !== headerValue) : [...prev, headerValue]
    );
  };

  const handleSelect = (val: string) => {
    if (onChange) onChange(val);
    setIsOpen(false);
  };

  const displayLabel = () => {
    if (!value) return placeholder;
    const selectedOpt = options.find(o => o.value === value);
    return selectedOpt ? selectedOpt.label : placeholder;
  };

  // Determine which options are hidden due to collapsed headers
  const visibleOptions: TreeOption[] = [];
  let currentCollapsedLevel = Infinity;

  for (const opt of options) {
    const optLevel = opt.level || 0;
    
    // If we hit an item with level <= the collapsed level, we are out of the collapsed section
    if (optLevel <= currentCollapsedLevel) {
      currentCollapsedLevel = Infinity;
    }

    if (currentCollapsedLevel !== Infinity) {
      // This item is inside a collapsed section, hide it
      continue;
    }

    // If this is a header and it's collapsed, start a collapsed section
    if (opt.isHeader && collapsedHeaders.includes(opt.value)) {
      currentCollapsedLevel = optLevel;
    }

    visibleOptions.push(opt);
  }

  return (
    <div 
      ref={containerRef} 
      style={{ 
        position: "relative", 
        width: typeof width === "number" ? `${width}px` : width,
        flexShrink: 0 
      }}
      className={className}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        style={{
          ...SELECT_STYLE,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: disabled ? "not-allowed" : "pointer",
          outline: "none",
          padding: "7px 12px",
          color: disabled ? "var(--muted-foreground)" : (value ? "#003087" : "var(--foreground)"),
          fontWeight: value && !disabled ? 700 : 500,
          boxShadow: isOpen ? "0 0 0 2px rgba(0, 48, 135, 0.2)" : "none",
          transition: "all 0.15s",
          opacity: disabled ? 0.6 : 1
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>
          {displayLabel()}
        </span>
        <i className={`bi bi-chevron-${isOpen ? "up" : "down"}`} style={{ fontSize: 10, opacity: 0.7 }} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            [dropdownPosition === "top" ? "bottom" : "top"]: "100%",
            left: 0,
            right: 0,
            marginTop: dropdownPosition === "top" ? 0 : 4,
            marginBottom: dropdownPosition === "top" ? 4 : 0,
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
            zIndex: 1000,
            maxHeight: 250,
            overflowY: "auto",
            padding: "6px 0"
          }}
        >
          {/* Option: Tất cả */}
          <div
            onClick={() => handleSelect("")}
            style={{
              padding: "8px 12px",
              cursor: "pointer",
              fontSize: "12.5px",
              fontWeight: !value ? 700 : 500,
              background: !value ? "rgba(0, 48, 135, 0.04)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              transition: "background 0.1s"
            }}
            onMouseEnter={e => { if (value) e.currentTarget.style.background = "var(--muted)"; }}
            onMouseLeave={e => { if (value) e.currentTarget.style.background = "transparent"; }}
          >
            <span>{placeholder}</span>
            {!value && <i className="bi bi-check2 text-primary" style={{ fontSize: "14px", fontWeight: "bold" }} />}
          </div>

          {/* List Options */}
          {visibleOptions.map((opt, idx) => {
            if (opt.isHeader) {
              const isCollapsed = collapsedHeaders.includes(opt.value);
              return (
                <div
                  key={`${opt.value}-${idx}`}
                  onClick={(e) => toggleHeader(opt.value, e)}
                  style={{
                    padding: "8px 12px 6px 12px",
                    paddingLeft: `${12 + (opt.level || 0) * 12}px`,
                    margin: 0,
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "var(--foreground)",
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span>{opt.label}</span>
                  <i className={`bi bi-chevron-${isCollapsed ? "down" : "up"}`} style={{ fontSize: "10px", color: "var(--muted-foreground)" }} />
                </div>
              );
            }

            const isSelected = value === opt.value;
            return (
              <div
                key={`${opt.value}-${idx}`}
                onClick={() => handleSelect(opt.value)}
                style={{
                  padding: "6px 12px",
                  paddingLeft: `${12 + (opt.level || 0) * 12}px`,
                  cursor: "pointer",
                  fontSize: "12.5px",
                  fontWeight: isSelected ? 700 : 500,
                  background: isSelected ? "rgba(0, 48, 135, 0.04)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "background 0.1s"
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "var(--muted)"; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
              >
                <span>{opt.label}</span>
                {isSelected && <i className="bi bi-check2 text-primary" style={{ fontSize: "14px", fontWeight: "bold" }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
