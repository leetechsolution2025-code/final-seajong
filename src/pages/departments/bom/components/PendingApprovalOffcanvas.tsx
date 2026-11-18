import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  FileEarmarkPdf,
  FileEarmarkText,
  CheckCircle,
  XCircle,
  Person,
  Buildings,
  CashStack,
  CalendarCheck,
  Paperclip,
  Download,
  ChatDots,
  ShieldCheck,
  BoxSeam,
  ChevronRight,
  Sliders,
  PencilSquare,
} from 'react-bootstrap-icons';
import { Offcanvas } from '../../../../components/common/Offcanvas';
import { Button } from '../../../../components/common/Button';
import { Badge } from '../../../../components/common/Badge';
import type { ApprovalDocument } from '../DocumentApprovalView';
import { DocumentChatSlide } from './DocumentChatSlide';
import { PurchaseOrderDetailSlide } from './PurchaseOrderDetailSlide';
import { documentChatService } from '../services/documentChatService';
import { openAttachmentInNewTab } from '../services/documentViewer';

export interface PendingApprovalOffcanvasProps {
  isOpen: boolean;
  onClose: () => void;
  document: ApprovalDocument | null;
  onApprove: (doc: ApprovalDocument, approveDeposit?: boolean, approvedAmount?: number) => void;
  onReject: (doc: ApprovalDocument) => void;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  initialOpenChat?: boolean;
  onUpdateDocument?: (doc: ApprovalDocument) => void;
}

export const PendingApprovalOffcanvas: React.FC<PendingApprovalOffcanvasProps> = ({
  isOpen,
  onClose,
  document,
  onApprove,
  onReject,
  onShowToast,
  initialOpenChat = false,
  onUpdateDocument,
}) => {
  const [activeSlide, setActiveSlide] = useState<'none' | 'chat' | 'orderDetail'>(initialOpenChat ? 'chat' : 'none');
  const [unreadCount, setUnreadCount] = useState(0);
  const [approveDeposit, setApproveDeposit] = useState(true);
  const [approvedAmountStr, setApprovedAmountStr] = useState<string>('');
  const [currentDoc, setCurrentDoc] = useState<ApprovalDocument | null>(document);

  useEffect(() => {
    setCurrentDoc(document);
  }, [document]);

  const activeDoc = currentDoc || document;

  // Mở chat nếu có yêu cầu mở thẳng từ thông báo/toast
  useEffect(() => {
    if (isOpen) {
      if (initialOpenChat) {
        setActiveSlide('chat');
      }
    } else {
      setActiveSlide('none');
    }
  }, [isOpen, initialOpenChat]);

  useEffect(() => {
    setApproveDeposit(true);
    setApprovedAmountStr(String(document?.value || 0));
  }, [document?.id, document?.value]);

  // Lắng nghe số tin nhắn chưa đọc của hồ sơ này
  useEffect(() => {
    if (!document) return;
    setUnreadCount(documentChatService.getUnreadCount(document.id));
    const unsubscribe = documentChatService.subscribeUnread((unreads) => {
      setUnreadCount(unreads[document.id] || 0);
    });
    return unsubscribe;
  }, [document?.id]);

  if (!isOpen || (!document && !activeDoc)) return null;
  const doc = activeDoc || document;
  if (!doc) return null;

  const isPurchaseOrder =
    String(doc.entityType || '').toLowerCase() === 'purchase_order' ||
    String(doc.entityType || '').toUpperCase() === 'PURCHASE_REQUEST' ||
    doc.docType === 'contract' ||
    String(doc.code || '').startsWith('PR-') ||
    String(doc.title || '').includes('mua hàng');
  const isProductionRequest =
    String(doc.entityType || '').toUpperCase() === 'PRODUCTION_REQUEST' ||
    doc.docType === 'technical' ||
    String(doc.code || '').startsWith('LSX-') ||
    String(doc.title || '').includes('Lệnh sản xuất');
  const isAdvanceDoc =
    doc.docType === 'advance' ||
    String(doc.entityType || '').toLowerCase().includes('advance') ||
    String(doc.code || '').startsWith('YC-') ||
    String(doc.code || '').startsWith('YCU-') ||
    String(doc.title || '').toLowerCase().includes('tạm ứng');
  const meta = doc.metadata || {};
  const poItemCount = Array.isArray(meta.items) ? meta.items.length : 0;
  const hasItemDetails =
    isPurchaseOrder ||
    isProductionRequest ||
    poItemCount > 0 ||
    String(doc.title || '').includes('mặt hàng');
  const datCocPct = Number(meta.datCocPct || 0);
  const tienDatCoc = Number(
    meta.tienDatCoc || (datCocPct > 0 ? Math.round((doc.value * datCocPct) / 100) : 0)
  );
  const parsedApprovedAmount =
    Number(String(approvedAmountStr || '').replace(/[^0-9]/g, '')) || doc.value || 0;

  return (
    <Offcanvas
      isOpen={isOpen}
      onClose={onClose}
      icon={<FileCheck size={22} style={{ color: 'var(--color-primary)' }} />}
      title="Hồ sơ chờ phê duyệt"
      description={`${doc.code} • ${doc.docTypeName}`}
      width="400px"
      className="bom-approval-offcanvas"
      slidePanel={
        activeSlide === 'chat' ? (
          <DocumentChatSlide
            isOpen={true}
            onClose={() => setActiveSlide('none')}
            document={doc}
          />
        ) : activeSlide === 'orderDetail' ? (
          <PurchaseOrderDetailSlide
            isOpen={true}
            onClose={() => setActiveSlide('none')}
            document={doc}
            onUpdateDocument={(updated) => {
              setCurrentDoc(updated);
              onUpdateDocument?.(updated);
              onShowToast?.('success', 'Đã cập nhật số lượng', `Đã cập nhật lại dự toán hồ sơ ${updated.code}`);
            }}
          />
        ) : undefined
      }
      footer={
        activeSlide === 'none' ? (
          <div className="bom-approval-offcanvas-footer" style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Button
              variant="secondary"
              size="md"
              leftIcon={<ChatDots size={16} />}
              onClick={() => setActiveSlide('chat')}
              title="Trao đổi công việc giữa BGĐ, Người trình duyệt và Người yêu cầu"
            >
              Trao đổi
              {unreadCount > 0 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '18px',
                    height: '18px',
                    padding: '0 4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    borderRadius: '9px',
                    backgroundColor: 'var(--color-primary, #3b82f6)',
                    color: '#ffffff',
                    marginLeft: '6px',
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </Button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="danger"
                size="md"
                leftIcon={<XCircle size={16} />}
                onClick={() => onReject(doc)}
              >
                Từ chối
              </Button>
              <Button
                variant="success"
                size="md"
                leftIcon={<CheckCircle size={16} />}
                onClick={() =>
                  onApprove(
                    doc,
                    isPurchaseOrder && datCocPct > 0 ? approveDeposit : false,
                    isAdvanceDoc ? parsedApprovedAmount : undefined
                  )
                }
              >
                Phê duyệt
              </Button>
            </div>
          </div>
        ) : undefined
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0' }}>
        {/* Header Card của tờ trình */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-2)',
            padding: '14px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span
              style={{
                fontFamily: 'monospace',
                fontWeight: 700,
                color: 'var(--color-primary)',
                backgroundColor: 'var(--bg-surface-1)',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.8125rem',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {doc.code}
            </span>
            <Badge variant="warning">Chờ phê duyệt</Badge>
          </div>
          <h3
            style={{
              fontSize: '0.9375rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: '0 0 8px 0',
              lineHeight: 1.4,
            }}
          >
            {doc.title}
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Buildings size={13} />
              {doc.department}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Person size={13} />
              {doc.submitter}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <CalendarCheck size={13} />
              Ngày trình: {doc.submitDate}
            </span>
            {doc.approverName && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  backgroundColor: 'rgba(37, 99, 235, 0.08)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                <ShieldCheck size={13} />
                Người duyệt: {doc.approverName} {doc.approverCode ? `[${doc.approverCode}]` : ''}
              </span>
            )}
          </div>
        </div>

        {/* Thông tin tài chính và Quy mô đề xuất */}
        {doc.value > 0 && (
          <div
            style={{
              backgroundColor: 'rgba(2, 132, 199, 0.05)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(2, 132, 199, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(2, 132, 199, 0.12)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CashStack size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {isAdvanceDoc ? 'Số tiền xin tạm ứng' : 'Giá trị dự toán / Hợp đồng'}
                </div>
                <div style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                  {doc.value.toLocaleString('vi-VN')} VNĐ
                </div>
              </div>
            </div>
            {isAdvanceDoc && (
              <div
                style={{
                  marginTop: '2px',
                  paddingTop: '10px',
                  borderTop: '1px dashed rgba(2, 132, 199, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                }}
              >
                <label
                  style={{
                    fontSize: '0.78125rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  Số tiền phê duyệt (VNĐ)
                </label>
                <input
                  type="text"
                  value={
                    approvedAmountStr
                      ? Number(approvedAmountStr.replace(/[^0-9]/g, '') || 0).toLocaleString('vi-VN')
                      : ''
                  }
                  onChange={(e) => setApprovedAmountStr(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Nhập số tiền phê duyệt..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #0284c7',
                    backgroundColor: '#ffffff',
                    fontSize: '0.9375rem',
                    fontWeight: 800,
                    color: '#0369a1',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                borderTop: '1px dashed rgba(2, 132, 199, 0.2)',
                paddingTop: '6px',
              }}
            >
              <span>Nguồn: Hệ thống Seajong</span>
              <span style={{ color: '#059669', fontWeight: 600 }}>Đã kiểm tra định mức</span>
            </div>
          </div>
        )}

        {/* Nút mở Slide danh mục hàng hoá & điều chỉnh số lượng (cho cả Đơn mua hàng PO/PR và Lệnh sản xuất LSX) */}
        {hasItemDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setActiveSlide('orderDetail')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1.5px solid #0284c7',
                backgroundColor: '#f0f9ff',
                color: '#0369a1',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 3px rgba(2, 132, 199, 0.08)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e0f2fe';
                e.currentTarget.style.borderColor = '#0369a1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f9ff';
                e.currentTarget.style.borderColor = '#0284c7';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Sliders size={18} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>
                      {isProductionRequest
                        ? 'Danh mục & Điều chỉnh SL sản xuất'
                        : isPurchaseOrder && String(doc.code || '').startsWith('PR-')
                        ? 'Danh mục & Điều chỉnh SL mua ngoài'
                        : 'Danh mục & Điều chỉnh SL hàng hoá'}
                    </span>
                    {poItemCount > 0 && (
                      <span style={{ fontSize: '0.6875rem', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', backgroundColor: '#0284c7', color: '#ffffff' }}>
                        {poItemCount} MH
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.71875rem', color: '#0284c7', fontWeight: 500, marginTop: '2px' }}>
                    Nhấn để xem chi tiết và tăng / giảm số lượng duyệt
                  </div>
                </div>
              </div>
              <ChevronRight size={16} style={{ color: '#0284c7', flexShrink: 0 }} />
            </button>

            {isPurchaseOrder && datCocPct > 0 && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${approveDeposit ? '#0284c7' : '#e2e8f0'}`,
                  backgroundColor: approveDeposit ? '#f0f9ff' : '#f8fafc',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={approveDeposit}
                  onChange={(e) => setApproveDeposit(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#0284c7', flexShrink: 0 }}
                />
                <span>
                  Duyệt chi tiền đặt cọc ({datCocPct}% — {tienDatCoc.toLocaleString('vi-VN')} đ)
                </span>
              </label>
            )}
          </div>
        )}

        {/* Nội dung chi tiết tờ trình */}
        <div>
          <h4
            style={{
              fontSize: '0.8125rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileEarmarkText size={15} />
            Nội dung đề xuất chi tiết
          </h4>
          <div
            style={{
              fontSize: '0.8125rem',
              lineHeight: 1.55,
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-surface-2)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              whiteSpace: 'pre-line',
            }}
          >
            {doc.content}
          </div>
        </div>

        {/* Tệp đính kèm văn bản */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px',
            }}
          >
            <h4
              style={{
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Paperclip size={15} />
              <span>
                Tệp hồ sơ đính kèm{' '}
                {doc.attachments && doc.attachments.length > 0
                  ? `(${doc.attachments.length})`
                  : doc.attachmentName
                    ? '(1)'
                    : '(0)'}
              </span>
            </h4>
            {(doc.attachments && doc.attachments.length > 0 || doc.attachmentName || doc.attachmentUrl) && (
              <button
                type="button"
                onClick={() => {
                  if (doc.attachments && doc.attachments.length > 0) {
                    onShowToast?.(
                      'info',
                      'Tải tài liệu',
                      `Đang tải toàn bộ ${doc.attachments.length} tệp đính kèm...`
                    );
                  } else {
                    onShowToast?.(
                      'info',
                      'Tải tài liệu',
                      `Đang tải ${doc.attachmentName || 'hồ sơ đính kèm'}`
                    );
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface-2)',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                }}
              >
                <Download size={13} />
                <span>{doc.attachments && doc.attachments.length > 1 ? 'Tải tất cả' : 'Tải về'}</span>
              </button>
            )}
          </div>

          {doc.attachments && doc.attachments.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {doc.attachments.map((att, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '8px 12px',
                    backgroundColor: 'var(--bg-surface-2)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    onClick={() => {
                      if (att.url) {
                        window.open(att.url, '_blank');
                      } else {
                        openAttachmentInNewTab(doc, att.name, att.url);
                      }
                    }}
                    title={`Nhấn để mở xem "${att.name}" ở tab mới`}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1, cursor: 'pointer' }}
                  >
                    <FileEarmarkPdf size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '0.8125rem',
                          color: 'var(--color-primary, #0284c7)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          textDecoration: 'underline',
                          textUnderlineOffset: '2px',
                        }}
                        title={att.name}
                      >
                        {att.name}
                      </div>
                      <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted)' }}>
                        {att.size || 'Tài liệu số'} • Nhấn để xem tài liệu gốc
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (att.url) {
                        window.open(att.url, '_blank');
                      } else {
                        onShowToast?.('info', 'Tải tệp', `Đang tải: ${att.name}`);
                      }
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Mở hoặc tải tệp này"
                  >
                    <Download size={13} />
                  </button>
                </div>
              ))}
            </div>
          ) : doc.attachmentName || doc.attachmentUrl ? (
            <div
              onClick={() => {
                if (doc.attachmentUrl) {
                  window.open(doc.attachmentUrl, '_blank');
                } else {
                  openAttachmentInNewTab(doc, doc.attachmentName, doc.attachmentUrl);
                }
              }}
              title="Nhấn để mở xem nội dung tài liệu này ở tab mới"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                backgroundColor: 'var(--bg-surface-2)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary, #0284c7)';
                e.currentTarget.style.backgroundColor = 'rgba(2, 132, 199, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.backgroundColor = 'var(--bg-surface-2)';
              }}
            >
              <FileEarmarkPdf size={24} style={{ color: '#ef4444', flexShrink: 0 }} />
              <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    color: 'var(--color-primary, #0284c7)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title={doc.attachmentName}
                >
                  <span>{doc.attachmentName || 'Tệp đính kèm'}</span>
                  <span style={{ fontSize: '0.6875rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7', fontWeight: 600 }}>Mở tab mới ↗</span>
                </div>
                <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted)' }}>
                  {doc.attachmentSize || 'Tài liệu số'}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--bg-surface-2)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--border-subtle)',
                color: 'var(--text-muted)',
                fontSize: '0.8125rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontStyle: 'italic',
              }}
            >
              <Paperclip size={14} style={{ opacity: 0.5 }} />
              <span>Hồ sơ không có tài liệu đính kèm</span>
            </div>
          )}
        </div>
      </div>
    </Offcanvas>
  );
};
