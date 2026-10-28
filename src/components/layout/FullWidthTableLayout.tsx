import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FullWidthTableLayoutProps {
  header?: ReactNode;
  table: ReactNode;
  footer?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  tableWrapperClassName?: string;
  footerClassName?: string;
  footerStyle?: React.CSSProperties;
}

export function FullWidthTableLayout({
  header,
  table,
  footer,
  className,
  style,
  tableWrapperClassName = "mt-2 border-top",
  footerClassName,
  footerStyle,
}: FullWidthTableLayoutProps) {
  return (
    <div className={cn("d-flex flex-column h-100", className)} style={style}>
      {header && (
        <div className="px-2 px-md-3 pt-2 pb-0 flex-shrink-0">
          {header}
        </div>
      )}

      {/* Table section with no padding to span edge-to-edge */}
      <style>{`
        .full-width-table-wrapper thead th {
          background-color: var(--background) !important;
          border-bottom: 1px solid rgba(0,0,0,0.08) !important;
        }
        .full-width-table-wrapper tbody tr {
          background-color: #fff;
        }
        .full-width-table-wrapper tbody td {
          background-color: transparent !important;
        }
        .full-width-table-wrapper thead tr:first-child th:first-child,
        .full-width-table-wrapper tbody td:first-child {
          padding-left: 1.5rem !important;
        }
        .full-width-table-wrapper thead tr:first-child th:last-child,
        .full-width-table-wrapper tbody td:last-child {
          padding-right: 1.5rem !important;
        }
        @media (max-width: 768px) {
          .full-width-table-wrapper {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch;
            margin-top: 0.25rem !important;
          }
          .full-width-table-wrapper thead tr:first-child th:first-child,
          .full-width-table-wrapper tbody td:first-child {
            padding-left: 0.5rem !important;
          }
          .full-width-table-wrapper thead tr:first-child th:last-child,
          .full-width-table-wrapper tbody td:last-child {
            padding-right: 0.5rem !important;
          }
        }
      `}</style>
      <div className={cn("full-width-table-wrapper d-flex flex-column", tableWrapperClassName)} style={{ flexGrow: 1, overflow: "auto", minHeight: 0 }}>
        {table}
      </div>

      {footer && (
        <div className={cn("d-flex align-items-center border-top mt-auto flex-shrink-0", footerClassName || "justify-content-end gap-2")} style={footerStyle || { padding: "19px 16px", backgroundColor: "#f8f9fa" }}>
          {footer}
        </div>
      )}
    </div>
  );
}
