import React, { useState, useEffect } from 'react';
import {
  JournalText,
  Trash,
  PencilSquare,
  ShieldCheck,
  CheckCircle,
  FileEarmarkText,
  CalendarDate,
  Tag,
  Person,
  Layers,
  ArrowRepeat,
} from 'react-bootstrap-icons';
import { Offcanvas } from '../../../components/common/Offcanvas';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Input } from '../../../components/common/Input';
import { NumberInput } from '../../../components/common/NumberInput';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { notifyFinanceUpdated } from '../../../services/financeSyncService';
import { numberToVietnameseWords } from './PaymentOrderOffcanvas';
import type { JournalEntry } from './GeneralJournalView';

export interface JournalEntryDetailOffcanvasProps {
  isOpen: boolean;
  onClose: () => void;
  entry: JournalEntry | null;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onSuccess?: () => void;
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  if (!d) return dateStr;
  return `${d}/${m}/${y}`;
};

export const JournalEntryDetailOffcanvas: React.FC<JournalEntryDetailOffcanvasProps> = ({
  isOpen,
  onClose,
  entry,
  onShowToast,
  onSuccess,
}) => {
  // Chế độ thao tác
  const [mode, setMode] = useState<'view' | 'edit' | 'reconcile'>('view');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Cập nhật
  const [editDescription, setEditDescription] = useState('');
  const [editEntryDate, setEditEntryDate] = useState('');
  const [editDocDate, setEditDocDate] = useState('');
  const [editRefCode, setEditRefCode] = useState('');

  // State Đối soát
  const [reconcileAmount, setReconcileAmount] = useState<number | string>(0);
  const [reconcileNote, setReconcileNote] = useState('');

  useEffect(() => {
    if (entry && isOpen) {
      setMode('view');
      setShowConfirmDelete(false);
      setEditDescription(entry.description || '');
      setEditEntryDate(entry.entryDate || '');
      setEditDocDate(entry.documentDate || entry.entryDate || '');
      setEditRefCode(entry.referenceCode || '');
      setReconcileAmount(entry.totalAmount || 0);
      setReconcileNote(`Đối soát khớp chứng từ ${entry.entryNumber}`);
    }
  }, [entry, isOpen]);

  if (!entry) return null;

  // Xoá chứng từ
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/finance/journal-entries/${entry.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Lỗi khi xóa chứng từ');
      }
      onShowToast?.('success', 'Xóa chứng từ', `Đã xóa chứng từ ${entry.entryNumber} khỏi Sổ nhật ký chung`);
      notifyFinanceUpdated('general_journal', 'delete');
      setShowConfirmDelete(false);
      onClose();
      onSuccess?.();
    } catch (err: any) {
      onShowToast?.('error', 'Lỗi thao tác', err?.message || 'Không thể xóa chứng từ');
    } finally {
      setIsDeleting(false);
    }
  };

  // Cập nhật chứng từ
  const handleUpdate = async () => {
    if (!editDescription.trim()) {
      onShowToast?.('warning', 'Thiếu diễn giải', 'Vui lòng nhập diễn giải nghiệp vụ');
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/finance/journal-entries/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryDate: editEntryDate,
          documentDate: editDocDate,
          referenceCode: editRefCode.trim() || undefined,
          description: editDescription.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Lỗi khi cập nhật chứng từ');
      }

      onShowToast?.('success', 'Cập nhật thành công', `Đã cập nhật chứng từ ${entry.entryNumber}`);
      notifyFinanceUpdated('general_journal', 'update');
      setMode('view');
      onSuccess?.();
    } catch (err: any) {
      onShowToast?.('error', 'Lỗi cập nhật', err?.message || 'Không thể cập nhật chứng từ');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lưu đối soát
  const handleReconcile = async () => {
    const nextAmount = Number(reconcileAmount);
    if (isNaN(nextAmount) || nextAmount < 0) {
      onShowToast?.('warning', 'Giá trị không hợp lệ', 'Số tiền đối soát không được âm');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/finance/journal-entries/${entry.id}/reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newAmount: nextAmount,
          note: reconcileNote.trim(),
        }),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resData.error || 'Lỗi khi đối soát chứng từ');
      }

      onShowToast?.(
        'success',
        'Đối soát hoàn tất',
        resData.message || `Chứng từ ${entry.entryNumber} đã được xác nhận đối soát thành công.`
      );
      notifyFinanceUpdated('general_journal', 'update');
      setMode('view');
      onSuccess?.();
    } catch (err: any) {
      onShowToast?.('error', 'Lỗi đối soát', err?.message || 'Không thể thực hiện đối soát');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render footer tùy thuộc theo mode
  const renderFooter = () => {
    if (mode === 'edit') {
      return (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', width: '100%' }}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMode('view')}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            onClick={handleUpdate}
            leftIcon={<CheckCircle size={14} />}
          >
            Lưu cập nhật
          </Button>
        </div>
      );
    }

    if (mode === 'reconcile') {
      return (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', width: '100%' }}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMode('view')}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            onClick={handleReconcile}
            leftIcon={<ShieldCheck size={14} />}
          >
            Lưu đối soát
          </Button>
        </div>
      );
    }

    // Default 'view' mode: Nút Xóa, Cập nhật, Đối soát ở footer
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', width: '100%' }}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          style={{ color: '#ef4444', borderColor: '#fca5a5' }}
          leftIcon={<Trash size={13} />}
          onClick={() => setShowConfirmDelete(true)}
        >
          Xoá
        </Button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<ShieldCheck size={13} />}
            onClick={() => setMode('reconcile')}
          >
            Đối soát
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<PencilSquare size={13} />}
            onClick={() => setMode('edit')}
          >
            Cập nhật
          </Button>
        </div>
      </div>
    );
  };

  const debitLines = entry.lines.filter((l) => l.type === 'DEBIT');
  const creditLines = entry.lines.filter((l) => l.type === 'CREDIT');

  return (
    <>
      <Offcanvas
        isOpen={isOpen}
        onClose={onClose}
        title="Chi tiết chứng từ"
        description={`Mã chứng từ: ${entry.entryNumber}`}
        icon={<JournalText size={20} />}
        width="400px"
        position="right"
        footer={renderFooter()}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8125rem' }}>
          {/* Header trạng thái & Phân hệ */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              backgroundColor: 'var(--bg-surface-2)',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Badge variant={entry.status === 'posted' ? 'success' : 'neutral'}>
                {entry.statusLabel || 'Đã ghi sổ'}
              </Badge>
              <Badge variant="brand">{entry.sourceLabel || 'Tổng hợp'}</Badge>
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              {formatDate(entry.entryDate)} {entry.entryTime ? `• ${entry.entryTime}` : ''}
            </span>
          </div>

          {/* Form Chế độ Đối soát */}
          {mode === 'reconcile' && (
            <div
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: '#1d4ed8', fontSize: '0.8125rem' }}>
                  Đối soát chứng từ
                </span>
                <span style={{ fontSize: '0.71875rem', color: 'var(--text-muted)' }}>
                  Gốc: {formatCurrency(entry.totalAmount)}
                </span>
              </div>
              <NumberInput
                label="Số tiền sau đối soát"
                required
                hideZero={false}
                suffix="₫"
                value={reconcileAmount}
                onValueChange={(val) => setReconcileAmount(val)}
              />
              <Input
                label="Ghi chú / Căn cứ đối soát"
                value={reconcileNote}
                onChange={(e) => setReconcileNote(e.target.value)}
                placeholder="Nhập nội dung đối soát..."
              />
            </div>
          )}

          {/* Form Chế độ Cập nhật */}
          {mode === 'edit' && (
            <div
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.05)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <span style={{ fontWeight: 700, color: '#b45309', fontSize: '0.8125rem' }}>
                Cập nhật thông tin chứng từ
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <Input
                  label="Ngày ghi sổ"
                  type="date"
                  value={editEntryDate}
                  onChange={(e) => setEditEntryDate(e.target.value)}
                />
                <Input
                  label="Ngày lập CT"
                  type="date"
                  value={editDocDate}
                  onChange={(e) => setEditDocDate(e.target.value)}
                />
              </div>
              <Input
                label="Số CT gốc / Tham chiếu"
                value={editRefCode}
                onChange={(e) => setEditRefCode(e.target.value)}
                placeholder="Ví dụ: PC-20261116-959"
              />
              <Input
                label="Diễn giải nghiệp vụ"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Nhập diễn giải..."
              />
            </div>
          )}

          {/* Khối tổng số tiền phát sinh */}
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'var(--bg-surface-1)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Tổng giá trị phát sinh:</div>
            <div
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--color-primary)',
                fontFamily: "'Roboto Condensed', monospace",
                marginTop: '2px',
              }}
            >
              {formatCurrency(entry.totalAmount)}
            </div>
            <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
              Bằng chữ: <strong>{numberToVietnameseWords(entry.totalAmount)}</strong>
            </div>
          </div>

          {/* Bảng thông tin chứng từ */}
          <div
            style={{
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '10px 12px',
              backgroundColor: 'var(--bg-surface-2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.71875rem' }}>Số chứng từ:</span>
              <strong style={{ color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                {entry.entryNumber}
              </strong>
            </div>
            {entry.referenceCode && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.71875rem' }}>Số CT gốc / Tham chiếu:</span>
                <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {entry.referenceCode}
                </strong>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.71875rem' }}>Ngày chứng từ:</span>
              <span style={{ color: 'var(--text-primary)' }}>{formatDate(entry.documentDate)}</span>
            </div>
            {entry.createdBy && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.71875rem' }}>Người lập:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{entry.createdBy}</span>
              </div>
            )}
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.71875rem', display: 'block', marginBottom: '2px' }}>
                Diễn giải nghiệp vụ:
              </span>
              <div style={{ color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.4 }}>
                {entry.description}
              </div>
            </div>
          </div>

          {/* Bảng định khoản hạch toán chi tiết */}
          <div
            style={{
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '10px 12px',
              backgroundColor: 'var(--bg-surface-2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Định khoản kế toán ({entry.lines.length} dòng)
              </span>
              <span style={{ fontSize: '0.6875rem', color: '#059669', fontWeight: 600 }}>
                Cân đối Nợ = Có
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* Danh sách dòng Nợ */}
              {debitLines.map((line, idx) => (
                <div
                  key={line.id || `debit-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    borderLeft: '3px solid #059669',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1, marginRight: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          color: '#059669',
                          padding: '1px 4px',
                          borderRadius: '3px',
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        }}
                      >
                        Nợ {line.accountCode}
                      </span>
                      <span style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {line.accountName}
                      </span>
                    </div>
                    {line.partner && (
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        Đối tượng: {line.partner}
                      </span>
                    )}
                  </div>
                  <strong style={{ fontSize: '0.8125rem', color: '#059669', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {formatCurrency(line.amount)}
                  </strong>
                </div>
              ))}

              {/* Danh sách dòng Có */}
              {creditLines.map((line, idx) => (
                <div
                  key={line.id || `credit-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(2, 132, 199, 0.08)',
                    borderLeft: '3px solid #0284c7',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1, marginRight: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          color: '#0284c7',
                          padding: '1px 4px',
                          borderRadius: '3px',
                          backgroundColor: 'rgba(2, 132, 199, 0.15)',
                        }}
                      >
                        Có {line.accountCode}
                      </span>
                      <span style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {line.accountName}
                      </span>
                    </div>
                    {line.partner && (
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        Đối tượng: {line.partner}
                      </span>
                    )}
                  </div>
                  <strong style={{ fontSize: '0.8125rem', color: '#0284c7', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {formatCurrency(line.amount)}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Offcanvas>

      {/* Modal xác nhận xóa */}
      <ConfirmDialog
        open={showConfirmDelete}
        variant="danger"
        title="Xóa chứng từ kế toán?"
        message={`Bạn có chắc chắn muốn xóa chứng từ "${entry.entryNumber}"? Bút toán này sẽ được xóa vĩnh viễn khỏi Sổ nhật ký chung.`}
        confirmLabel="Xác nhận xóa"
        loading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </>
  );
};

export default JournalEntryDetailOffcanvas;
