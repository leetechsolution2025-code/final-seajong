import React, { ReactNode } from "react";

interface SectionTitleProps {
  title: ReactNode;
  icon?: string;
  className?: string;
  style?: React.CSSProperties;
  action?: ReactNode; // Nếu muốn gắn thêm button nhỏ ở góc phải tiêu đề
}

export function SectionTitle({ title, icon, className = "", style, action }: SectionTitleProps) {
  const hasMargin = className.split(" ").some(c => 
    c.startsWith("m-") || c.startsWith("mb-") || c.startsWith("mt-") || 
    c.startsWith("my-") || c.startsWith("ms-") || c.startsWith("me-")
  );
  return (
    <div className={`d-flex align-items-center justify-content-between ${hasMargin ? "" : "mb-3"} ${className}`}>
      <h6 
        className="mb-0 fw-bold text-uppercase d-flex align-items-center gap-2" 
        style={{ color: "var(--muted-foreground)", fontSize: 11, letterSpacing: "0.05em", lineHeight: 1, ...style }}
      >
        {icon && <i className={`bi ${icon}`} style={{ fontSize: 13 }} />}
        {title}
      </h6>
      {action && <div>{action}</div>}
    </div>
  );
}

export default SectionTitle;
