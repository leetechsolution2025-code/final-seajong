"use client";

import React, { useState, useEffect } from "react";
import { Lightbulb, Trash } from "react-bootstrap-icons";
import { Offcanvas } from "@/components/common/Offcanvas";
import { Input } from "@/components/common/Input";
import { Button } from "@/components/common/Button";

interface AddStrategyOffcanvasProps {
  open: boolean;
  onClose: () => void;
  onAdd?: (data: any) => void;
  onDelete?: () => void;
  initialData?: any;
}

export function AddStrategyOffcanvas({
  open,
  onClose,
  onAdd,
  onDelete,
  initialData,
}: AddStrategyOffcanvasProps) {
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");

  const handleSave = () => {
    if (!name.trim()) return;
    onAdd?.({ name, detail });
    setName("");
    setDetail("");
    onClose();
  };

  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name || "");
        setDetail(initialData.detail || "");
      } else {
        setName("");
        setDetail("");
      }
    }
  }, [open, initialData]);

  return (
    <Offcanvas
      isOpen={open}
      onClose={onClose}
      title={initialData ? "Cập nhật chiến lược" : "Thêm chiến lược hành động"}
      description="Chi tiết kế hoạch triển khai"
      icon={<Lightbulb size={22} />}
      width="420px"
      confirmText={initialData ? "Cập nhật" : "Tiếp tục"}
      cancelText="Hủy"
      onConfirm={handleSave}
      footerLeft={
        initialData ? (
          <Button
            type="button"
            variant="danger"
            size="sm"
            leftIcon={<Trash size={14} />}
            onClick={() => {
              onDelete?.();
              onClose();
            }}
          >
            Xóa
          </Button>
        ) : undefined
      }
      bodyStyle={{ display: "flex", flexDirection: "column", gap: "16px" }}
    >
      <div className="form-group">
        <label className="form-label">
          Mục tiêu chiến lược <span className="text-red-500">*</span>
        </label>
        <Input
          type="text"
          placeholder="Nhập mục tiêu..."
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="form-group flex-1 flex flex-col" style={{ minHeight: 0 }}>
        <label className="form-label">
          Hành động thực thi <span className="text-red-500">*</span>
        </label>
        <textarea
          className="form-input custom-scrollbar flex-1"
          style={{
            height: "100%",
            minHeight: "220px",
            padding: "10px 12px",
            lineHeight: 1.5,
            resize: "none",
          }}
          placeholder="Nhập hành động cần làm..."
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
        />
      </div>
    </Offcanvas>
  );
}
