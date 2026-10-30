"use client";

import React, { useState, useEffect } from "react";
import { ListTask, Trash } from "react-bootstrap-icons";
import { Offcanvas } from "@/components/common/Offcanvas";
import { Input } from "@/components/common/Input";
import { Select } from "@/components/common/Select";
import { Button } from "@/components/common/Button";

interface AddOemTaskOffcanvasProps {
  open: boolean;
  onClose: () => void;
  onAdd?: (data: any) => void;
  onDelete?: () => void;
  initialData?: any;
}

export function AddOemTaskOffcanvas({
  open,
  onClose,
  onAdd,
  onDelete,
  initialData,
}: AddOemTaskOffcanvasProps) {
  const [name, setName] = useState("");
  const [assignee, setAssignee] = useState("");
  const [collaborator, setCollaborator] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState("Chưa thực hiện");
  const [detail, setDetail] = useState("");

  const handleSave = () => {
    if (!name.trim()) return;
    onAdd?.({ name, assignee, collaborator, deadline, status, detail });
    setName("");
    setAssignee("");
    setCollaborator("");
    setDeadline("");
    setStatus("Chưa thực hiện");
    setDetail("");
    onClose();
  };

  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name || "");
        setAssignee(initialData.assignee || "");
        setCollaborator(initialData.collaborator || "");
        setDeadline(initialData.deadline || "");
        setStatus(initialData.status || "Chưa thực hiện");
        setDetail(initialData.detail || "");
      } else {
        setName("");
        setAssignee("");
        setCollaborator("");
        setDeadline("");
        setStatus("Chưa thực hiện");
        setDetail("");
      }
    }
  }, [open, initialData]);

  return (
    <Offcanvas
      isOpen={open}
      onClose={onClose}
      title={initialData ? "Cập nhật công việc" : "Thêm công việc"}
      description="Các công việc cần thực hiện ngay"
      icon={<ListTask size={22} />}
      width="440px"
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
          Tên công việc <span className="text-red-500">*</span>
        </label>
        <Input
          type="text"
          placeholder="Nhập tên công việc..."
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="form-group">
          <label className="form-label">Người thực hiện</label>
          <Input
            type="text"
            placeholder="Nguyễn Văn A"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Người phối hợp</label>
          <Input
            type="text"
            placeholder="Trần Văn B"
            value={collaborator}
            onChange={(e) => setCollaborator(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="form-group">
          <label className="form-label">Hạn hoàn thành</label>
          <Input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Trạng thái</label>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="Chưa thực hiện">Chưa thực hiện</option>
            <option value="Đã hoàn thành">Đã hoàn thành</option>
          </Select>
        </div>
      </div>

      <div className="form-group flex-1 flex flex-col" style={{ minHeight: 0 }}>
        <label className="form-label">Nội dung chi tiết</label>
        <textarea
          className="form-input custom-scrollbar flex-1"
          style={{
            height: "100%",
            minHeight: "180px",
            padding: "10px 12px",
            lineHeight: 1.5,
            resize: "none",
          }}
          placeholder="Nhập chi tiết công việc..."
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
        />
      </div>
    </Offcanvas>
  );
}
