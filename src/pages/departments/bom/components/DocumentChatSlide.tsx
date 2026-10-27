import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Send,
  People,
} from 'react-bootstrap-icons';
import { Button } from '../../../../components/common/Button';
import type { ApprovalDocument } from '../DocumentApprovalView';
import { documentChatService, type ChatMessage } from '../services/documentChatService';

export interface DocumentChatSlideProps {
  isOpen: boolean;
  onClose: () => void;
  document: ApprovalDocument;
}

export const DocumentChatSlide: React.FC<DocumentChatSlideProps> = ({
  isOpen,
  onClose,
  document,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Đồng bộ trạng thái phòng chat đang mở (để tắt toast / chuông khi đang xem)
  useEffect(() => {
    if (isOpen && document) {
      documentChatService.setActiveChat(document.id);
    } else {
      documentChatService.setActiveChat(null);
    }
    return () => {
      documentChatService.setActiveChat(null);
    };
  }, [isOpen, document?.id]);

  // Tải tin nhắn và đăng ký lắng nghe tin nhắn thời gian thực
  useEffect(() => {
    if (!document) return;
    setMessages(documentChatService.getMessages(document));

    const unsubscribe = documentChatService.subscribeMessages(document.id, (newMsgs) => {
      setMessages(newMsgs);
    });

    return unsubscribe;
  }, [document?.id]);

  // Tự động cuộn xuống cuối khi có tin nhắn mới hoặc khi mở slide
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isOpen, messages]);

  const handleSendMessage = () => {
    const trimmed = inputText.trim();
    if (!trimmed || !document) return;

    documentChatService.sendMessage(document, trimmed, 'bom', 'Tôi', true);
    setInputText('');
    // Ngăn IME tiếng Việt chèn lại từ cuối cùng sau khi xóa input
    setTimeout(() => {
      setInputText('');
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Tránh gửi nhầm khi bộ gõ tiếng Việt (IME) đang gõ dở từ (isComposing hoặc keyCode 229)
    if (e.nativeEvent.isComposing || (e as any).keyCode === 229) {
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickReplies = [
    'Đã kiểm tra báo giá chiết khấu',
    'Cần bổ sung chứng chỉ CO/CQ',
    'Xác nhận thời gian giao hàng',
    'Đồng ý thông qua phương án',
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--bg-surface-1, #ffffff)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: isOpen ? 'auto' : 'none',
        boxShadow: isOpen ? '-8px 0 28px rgba(0, 0, 0, 0.25)' : 'none',
        overflow: 'hidden',
      }}
      aria-hidden={!isOpen}
    >
      {/* ── THANH ĐIỀU HƯỚNG DƯỚI TIÊU ĐỀ OFFCANVAS ── */}
      <div
        style={{
          padding: '8px 14px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface-1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '5px 10px',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-2)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8rem',
            fontWeight: 500,
            transition: 'all 0.15s ease',
          }}
          title="Quay lại chi tiết tờ trình"
        >
          <ArrowLeft size={14} />
          <span>Quay lại</span>
        </button>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.75rem',
            color: '#10b981',
            fontWeight: 600,
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            padding: '3px 8px',
            borderRadius: '12px',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
            }}
          />
          3 người trực tuyến
        </span>
      </div>

      {/* ── THANH THÀNH VIÊN THAM GIA TRAO ĐỔI ── */}
      <div
        style={{
          padding: '8px 14px',
          backgroundColor: 'var(--bg-subtle, #f8fafc)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.75rem',
          flexShrink: 0,
        }}
      >
        <People size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ fontWeight: 600, color: '#7c3aed' }}>BGĐ</span>
          <span style={{ color: 'var(--text-muted)' }}>•</span>
          <span style={{ fontWeight: 600, color: '#0284c7' }} title={document.submitter}>
            {document.submitter}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>•</span>
          <span style={{ fontWeight: 600, color: '#d97706' }}>Người yêu cầu</span>
        </div>
      </div>

      {/* ── DANH SÁCH TIN NHẮN (MESSAGE FEED) ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          backgroundColor: 'var(--bg-surface-1)',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            padding: '4px 0',
          }}
        >
          Kênh trao đổi nội bộ trực tiếp cho tờ trình {document.code}
        </div>

        {messages.map((msg) => {
          const isMe = msg.isCurrentUser;
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start',
                gap: '3px',
              }}
            >
              {/* Header của tin nhắn: Người gửi và Vai trò và Thời gian */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.72rem',
                  padding: '0 2px',
                }}
              >
                {isMe ? (
                  <>
                    <span
                      style={{
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                      }}
                    >
                      Tôi
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                      {msg.timestamp}
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      style={{
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {msg.senderName}
                    </span>
                    {msg.senderRole !== 'bom' && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          color: msg.roleBadgeColor,
                          backgroundColor: `${msg.roleBadgeColor}18`,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          border: `1px solid ${msg.roleBadgeColor}33`,
                        }}
                      >
                        {msg.senderRoleLabel}
                      </span>
                    )}
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                      {msg.timestamp}
                    </span>
                  </>
                )}
              </div>

              {/* Khối bong bóng tin nhắn */}
              <div
                style={{
                  maxWidth: '88%',
                  padding: '9px 12px',
                  borderRadius: isMe ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
                  backgroundColor: isMe
                    ? 'var(--color-primary, #3b82f6)'
                    : 'var(--bg-subtle, #f1f5f9)',
                  color: isMe ? '#ffffff' : 'var(--text-primary)',
                  border: isMe ? 'none' : '1px solid var(--border-color)',
                  fontSize: '0.82rem',
                  lineHeight: 1.45,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-line',
                }}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── GỢI Ý NHANH (QUICK PROMPT CHIPS) ── */}
      <div
        style={{
          padding: '6px 12px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-subtle)',
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          flexShrink: 0,
          whiteSpace: 'nowrap',
          scrollbarWidth: 'none',
        }}
      >
        {quickReplies.map((reply, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setInputText(reply)}
            style={{
              padding: '3px 8px',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface-1)',
              fontSize: '0.72rem',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            {reply}
          </button>
        ))}
      </div>

      {/* ── THANH NHẬP LIỆU (INPUT BAR) ── */}
      <div
        style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface-1)',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập ý kiến trao đổi (Enter để gửi)..."
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: '0.82rem',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-surface-2, #ffffff)',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
        />
        <Button
          variant="primary"
          size="sm"
          disabled={!inputText.trim()}
          onClick={handleSendMessage}
          leftIcon={<Send size={13} />}
          style={{ flexShrink: 0, height: '36px', padding: '0 12px' }}
        >
          Gửi
        </Button>
      </div>
    </div>
  );
};
