import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  FileEarmarkPdf,
  FileEarmarkText,
  Printer,
  Person,
  Buildings,
  CashStack,
  CalendarCheck,
  ClockHistory,
  Paperclip,
  Download,
  ChatDots,
} from 'react-bootstrap-icons';
import { Offcanvas } from '../../../../components/common/Offcanvas';
import { Button } from '../../../../components/common/Button';
import { Badge } from '../../../../components/common/Badge';
import type { ApprovalDocument } from '../DocumentApprovalView';
import { DocumentChatSlide } from './DocumentChatSlide';
import { documentChatService } from '../services/documentChatService';
import { openAttachmentInNewTab } from '../services/documentViewer';

export interface ApprovedDocumentOffcanvasProps {
  isOpen: boolean;
  onClose: () => void;
  document: ApprovalDocument | null;
  onPrint?: (doc: ApprovalDocument) => void;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  initialOpenChat?: boolean;
}

export const ApprovedDocumentOffcanvas: React.FC<ApprovedDocumentOffcanvasProps> = ({
  isOpen,
  onClose,
  document,
  onPrint,
  onShowToast,
  initialOpenChat = false,
}) => {
  const [isChatOpen, setIsChatOpen] = useState(initialOpenChat);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      if (initialOpenChat) {
        setIsChatOpen(true);
      }
    } else {
      setIsChatOpen(false);
    }
  }, [isOpen, initialOpenChat]);

  useEffect(() => {
    if (!document) return;
    setUnreadCount(documentChatService.getUnreadCount(document.id));
    const unsubscribe = documentChatService.subscribeUnread((unreads: any) => {
      setUnreadCount(unreads[document.id] || 0);
    });
    return unsubscribe;
  }, [document?.id]);

  if (!document) return null;

  return (
    <Offcanvas
      isOpen={isOpen}
      onClose={onClose}
      icon={<CheckCircle size={22} style={{ color: 'var(--color-success, #10b981)' }} />}
      title="Hồ sơ đã phê duyệt"
      description={`${document.code} • ${document.docTypeName}`}
      width="400px"
      slidePanel={
        <DocumentChatSlide
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          document={document}
        />
      }
      footer={
        !isChatOpen ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Button
              variant="secondary"
              size="md"
              leftIcon={<ChatDots size={16} />}
              onClick={() => setIsChatOpen(true)}
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
                variant="secondary"
                size="md"
                leftIcon={<Printer size={16} />}
                onClick={() => {
                  if (onPrint) {
                    onPrint(document);
                  } else {
                    onShowToast?.('info', 'In tài liệu', `Đang xuất quyết định phê duyệt ${document.code}`);
                  }
                }}
              >
                In quyết định
              </Button>
              <Button variant="primary" size="md" onClick={onClose}>
                Đóng
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
              {document.code}
            </span>
            <Badge variant="success">Đã phê duyệt</Badge>
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
            {document.title}
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Buildings size={13} />
              {document.department}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Person size={13} />
              {document.submitter}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <CalendarCheck size={13} />
              Duyệt: {document.approvalDate || document.submitDate}
            </span>
          </div>
        </div>

        {/* Thông tin tài chính và Quy mô đề xuất */}
        {document.value > 0 && (
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
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Giá trị phê duyệt</div>
                <div style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                  {document.value.toLocaleString('vi-VN')} VNĐ
                </div>
              </div>
            </div>
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
              <span style={{ color: '#059669', fontWeight: 600 }}>Đã duyệt giải ngân</span>
            </div>
          </div>
        )}

        {/* Bút phê Ban Giám đốc */}
        {document.approvalNote && (
          <div
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.06)',
              borderLeft: '4px solid #10b981',
              padding: '12px 14px',
              borderRadius: '0 var(--radius-md) var(--radius-md) 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontWeight: 700, fontSize: '0.8125rem', marginBottom: '4px' }}>
              <CheckCircle size={14} />
              <span>Ý kiến bút phê của {document.approvedBy || 'Ban Giám đốc'} ({document.approvalDate})</span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              "{document.approvalNote}"
            </div>
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
            {document.content}
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
                {document.attachments && document.attachments.length > 0
                  ? `(${document.attachments.length})`
                  : document.attachmentName
                    ? '(1)'
                    : '(0)'}
              </span>
            </h4>
            {(document.attachments && document.attachments.length > 0 || document.attachmentName || document.attachmentUrl) && (
              <button
                type="button"
                onClick={() => {
                  if (document.attachments && document.attachments.length > 0) {
                    onShowToast?.(
                      'info',
                      'Tải tài liệu',
                      `Đang tải toàn bộ ${document.attachments.length} tệp đính kèm...`
                    );
                  } else {
                    onShowToast?.(
                      'info',
                      'Tải tài liệu',
                      `Đang tải ${document.attachmentName || 'hồ sơ đính kèm'}`
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
                <span>{document.attachments && document.attachments.length > 1 ? 'Tải tất cả' : 'Tải về'}</span>
              </button>
            )}
          </div>

          {document.attachments && document.attachments.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {document.attachments.map((att, idx) => (
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
                        openAttachmentInNewTab(document, att.name, att.url);
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
          ) : document.attachmentName || document.attachmentUrl ? (
            <div
              onClick={() => {
                if (document.attachmentUrl) {
                  window.open(document.attachmentUrl, '_blank');
                } else {
                  openAttachmentInNewTab(document, document.attachmentName, document.attachmentUrl);
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
              <FileEarmarkPdf size={22} style={{ color: '#ef4444', flexShrink: 0 }} />
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
                  title={document.attachmentName}
                >
                  {document.attachmentName || 'Tệp đính kèm'}
                </div>
                <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted)' }}>
                  {document.attachmentSize || 'Tài liệu số'} • Nhấn xem ở tab mới
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

        {/* Quy trình ký duyệt */}
        <div>
          <h4
            style={{
              fontSize: '0.8125rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ClockHistory size={15} />
            Tiến trình ký duyệt hồ sơ
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700, flexShrink: 0 }}>
                ✓
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>Khởi tạo tờ trình</div>
                <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted)' }}>{document.submitter} • {document.submitDate}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700, flexShrink: 0 }}>
                ✓
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>Trưởng đơn vị đề xuất xác nhận</div>
                <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted)' }}>Đã ký số duyệt thông qua</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700, flexShrink: 0 }}>
                ✓
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>Ban Giám đốc phê duyệt quyết định</div>
                <div style={{ fontSize: '0.71875rem', color: '#059669', fontWeight: 600 }}>
                  Đã duyệt bởi {document.approvedBy || 'Ban Giám đốc'} ({document.approvalDate})
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Offcanvas>
  );
};
