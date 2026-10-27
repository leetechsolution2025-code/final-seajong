"use client";

import React from "react";

interface WorkflowCardProps {
  /** Component Stepper (thường là ModernStepper) */
  stepper?: React.ReactNode;
  /** Thanh công cụ (Tìm kiếm, Lọc, Tabs) */
  toolbar?: React.ReactNode;
  /** Class bổ sung cho vùng toolbar */
  toolbarClassName?: string;
  /** Nội dung chính (thường là Table) */
  children: React.ReactNode;
  /** Class bổ sung cho card */
  className?: string;
  /** Padding cho phần nội dung chính, mặc định là p-4 */
  contentPadding?: string;
  /** Thanh công cụ phía dưới (Nút bấm, Ghi chú...) */
  bottomToolbar?: React.ReactNode;
}

/**
 * WorkflowCard - Component khung chuẩn cho các trang quản trị quy trình
 * Bao gồm phần Stepper cố định phía trên và phần nội dung có thể cuộn bên dưới.
 */
export const WorkflowCard: React.FC<WorkflowCardProps> = ({
  stepper,
  toolbar,
  toolbarClassName,
  children,
  className = "",
  contentPadding = "p-4",
  bottomToolbar
}) => {
  return (
    <div
      className={`bg-card rounded-4 shadow-sm border flex-grow-1 d-flex flex-column overflow-hidden ${className}`}
      style={{ minHeight: 0 }}
    >
      {/* Header Area: Stepper */}
      {stepper && (
        <div className="px-4 py-1 border-bottom flex-shrink-0 bg-white workflow-card-stepper-container">
          {stepper}
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-grow-1 d-flex flex-column ${contentPadding}`} style={{ minHeight: 0 }}>
        {/* Toolbar Area */}
        {toolbar && (
          <div className={toolbarClassName ?? (contentPadding === "p-0" ? "flex-shrink-0" : "mb-3 pt-1 flex-shrink-0")}>
            {toolbar}
          </div>
        )}

        {/* Dynamic Content (Table, etc.) */}
        <div className="flex-grow-1 custom-scrollbar d-flex flex-column" style={{ overflowY: "auto", minHeight: 0, minWidth: 0, width: "100%" }}>
          {children}
        </div>

      </div>

      {/* Bottom Toolbar Area */}
      {bottomToolbar && (
        <div className="border-top flex-shrink-0 bg-light/30 px-3 py-2">
          {bottomToolbar}
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.4);
        }
        /* iPad responsive for stepper toolbar */
        @media (max-width: 1024px) {
          .workflow-card-stepper-container {
            padding-left: 12px !important;
            padding-right: 12px !important;
            padding-top: 4px !important;
            padding-bottom: 4px !important;
          }
        }
        @media (max-width: 640px) {
          .workflow-card-stepper-container {
            padding-left: 8px !important;
            padding-right: 8px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default WorkflowCard;
