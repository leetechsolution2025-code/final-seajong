import type { ApprovalDocument } from '../DocumentApprovalView';

export interface ChatMessage {
  id: string;
  senderName: string;
  senderRole: 'bom' | 'submitter' | 'requester';
  senderRoleLabel: string;
  roleBadgeColor: string;
  avatarBg: string;
  avatarText: string;
  content: string;
  timestamp: string;
  isCurrentUser?: boolean;
}

export interface DocumentUnreadSummary {
  documentId: string;
  documentCode: string;
  documentTitle: string;
  unreadCount: number;
  lastMessage: string;
  lastSender: string;
  lastTimestamp: string;
}

type MessageListener = (messages: ChatMessage[]) => void;
type UnreadListener = (summary: Record<string, number>) => void;

class DocumentChatService {
  private messagesByDoc: Record<string, ChatMessage[]> = {};
  private unreadByDoc: Record<string, number> = {};
  private documentMeta: Record<string, { code: string; title: string }> = {};
  private activeChatDocId: string | null = null;
  private messageListeners: Record<string, Set<MessageListener>> = {};
  private unreadListeners: Set<UnreadListener> = new Set();
  private toastHandler: ((type: 'info' | 'success' | 'warning' | 'error', title: string, message: string, durationMs?: number, onClick?: () => void, actionText?: string) => void) | null = null;

  constructor() {
    this.loadFromStorage();
  }

  public registerToastHandler(handler: (type: 'info' | 'success' | 'warning' | 'error', title: string, message: string, durationMs?: number, onClick?: () => void, actionText?: string) => void) {
    this.toastHandler = handler;
  }

  public setActiveChat(documentId: string | null) {
    this.activeChatDocId = documentId;
    if (documentId) {
      this.markAsRead(documentId);
    }
  }

  public getActiveChat(): string | null {
    return this.activeChatDocId;
  }

  public getMessages(document: ApprovalDocument): ChatMessage[] {
    const docId = document.id;
    this.documentMeta[docId] = { code: document.code, title: document.title };
    if (!this.messagesByDoc[docId]) {
      this.messagesByDoc[docId] = [];
    }
    // Tự động đồng bộ và tải toàn bộ tin nhắn từ CSDL SQLite
    this.fetchMessagesFromDB(document);
    return this.messagesByDoc[docId];
  }

  /**
   * Tải tin nhắn của tài liệu từ CSDL
   */
  public async fetchMessagesFromDB(document: ApprovalDocument): Promise<ChatMessage[]> {
    const docId = document.id;
    try {
      const res = await fetch(`/api/approval-document-comments?documentId=${encodeURIComponent(docId)}`);
      if (res.ok) {
        const data: ChatMessage[] = await res.json();
        this.messagesByDoc[docId] = Array.isArray(data) ? data : [];
        this.notifyMessageListeners(docId);
        this.saveToStorage();
        return this.messagesByDoc[docId];
      }
    } catch (err) {
      console.warn('Lỗi kết nối CSDL tin nhắn tờ trình:', err);
    }
    return this.messagesByDoc[docId] || [];
  }

  /**
   * Lưu tin nhắn vào CSDL SQLite qua API
   */
  public async saveCommentToDB(documentId: string, msg: ChatMessage) {
    try {
      await fetch('/api/approval-document-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: msg.id,
          documentId,
          senderName: msg.senderName,
          senderRole: msg.senderRole,
          senderRoleLabel: msg.senderRoleLabel,
          roleBadgeColor: msg.roleBadgeColor,
          avatarBg: msg.avatarBg,
          avatarText: msg.avatarText,
          content: msg.content,
          timestamp: msg.timestamp,
          isCurrentUser: !!msg.isCurrentUser,
        }),
      });
    } catch (err) {
      console.error('Lỗi lưu tin nhắn trao đổi vào CSDL:', err);
    }
  }

  public getUnreadCount(documentId: string): number {
    return this.unreadByDoc[documentId] || 0;
  }

  public getTotalUnreadCount(): number {
    return Object.values(this.unreadByDoc).reduce((acc, count) => acc + count, 0);
  }

  public getUnreadSummaries(): DocumentUnreadSummary[] {
    return Object.entries(this.unreadByDoc)
      .filter(([_, count]) => count > 0)
      .map(([docId, count]) => {
        const msgs = this.messagesByDoc[docId] || [];
        const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
        const meta = this.documentMeta[docId] || { code: docId, title: 'Hồ sơ văn bản' };
        return {
          documentId: docId,
          documentCode: meta.code,
          documentTitle: meta.title,
          unreadCount: count,
          lastMessage: lastMsg?.content || '',
          lastSender: lastMsg?.senderName || '',
          lastTimestamp: lastMsg?.timestamp || '',
        };
      });
  }

  public markAsRead(documentId: string) {
    if (this.unreadByDoc[documentId]) {
      delete this.unreadByDoc[documentId];
      this.notifyUnreadListeners();
      this.saveToStorage();
    }
  }

  public markAllAsRead() {
    this.unreadByDoc = {};
    this.notifyUnreadListeners();
    this.saveToStorage();
  }

  public sendMessage(document: ApprovalDocument, content: string, senderRole: 'bom' | 'submitter' | 'requester' = 'bom', senderName?: string, isCurrentUser: boolean = true) {
    const trimmed = content.trim();
    if (!trimmed) return;

    const docId = document.id;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}, Hôm nay`;

    const roleConfigs = {
      bom: { label: 'Ban Giám đốc', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.15)', text: 'BGĐ' },
      submitter: { label: 'Người trình duyệt', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.15)', text: (document.submitter || 'NT').slice(0, 2).toUpperCase() },
      requester: { label: 'Người yêu cầu / Hiện trường', color: '#d97706', bg: 'rgba(217, 119, 6, 0.15)', text: 'YC' },
    };

    const cfg = roleConfigs[senderRole];

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      senderName: senderName || (isCurrentUser ? 'Tôi' : (senderRole === 'submitter' ? document.submitter : 'KS. Trần Quốc Bảo')),
      senderRole,
      senderRoleLabel: cfg.label,
      roleBadgeColor: cfg.color,
      avatarBg: cfg.bg,
      avatarText: cfg.text,
      content: trimmed,
      timestamp: timeStr,
      isCurrentUser,
    };

    if (!this.messagesByDoc[docId]) {
      this.messagesByDoc[docId] = this.getInitialSeedMessages(document);
    }

    this.messagesByDoc[docId] = [...this.messagesByDoc[docId], newMsg];
    this.notifyMessageListeners(docId);
    this.saveToStorage();

    // Lưu vào CSDL SQLite qua API
    this.saveCommentToDB(docId, newMsg);

    // Nếu tin nhắn được gửi từ THÀNH VIÊN KHÁC (hoặc mô phỏng người khác phản hồi)
    if (!isCurrentUser) {
      // TH 1: Người dùng ĐANG MỞ đúng Offcanvas Chat của tờ trình này
      if (this.activeChatDocId === docId) {
        // Không bắn toast, không tăng số đếm quả chuông
        this.markAsRead(docId);
      } else {
        // TH 2: Người dùng ĐANG Ở TRANG KHÁC hoặc ĐÓNG CHAT
        // 1. Tăng số đếm chưa đọc gộp theo tờ trình
        this.unreadByDoc[docId] = (this.unreadByDoc[docId] || 0) + 1;
        this.notifyUnreadListeners();

        // 2. Bắn 1 Toast nhỏ 3s ở góc màn hình có nút bấm 1-click mở chat
        if (this.toastHandler) {
          const unreadNum = this.unreadByDoc[docId];
          const badgeText = unreadNum > 1 ? ` (+${unreadNum} tin mới)` : '';
          this.toastHandler(
            'info',
            `💬 Trao đổi mới: ${document.code}`,
            `${newMsg.senderName}${badgeText}: "${newMsg.content}"`,
            3500,
            () => this.openDocumentChat(docId),
            'Xem ngay'
          );
        }
      }
    }

    // Nếu người dùng vừa gửi tin nhắn: Mô phỏng phản hồi từ người trình duyệt hoặc người yêu cầu sau 3.5s để người dùng kiểm tra luồng
    if (isCurrentUser) {
      this.scheduleSimulatedReply(document, trimmed);
    }
  }

  /**
   * Kích hoạt mở Offcanvas và trượt mở Slide Chat của tờ trình tương ứng từ bất kỳ đâu (Toast hoặc Quả chuông)
   */
  public openDocumentChat(documentId: string) {
    this.markAsRead(documentId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('decodoor:open-document-chat', {
          detail: { documentId },
        })
      );
    }
  }

  public subscribeMessages(documentId: string, listener: MessageListener): () => void {
    if (!this.messageListeners[documentId]) {
      this.messageListeners[documentId] = new Set();
    }
    this.messageListeners[documentId].add(listener);

    return () => {
      this.messageListeners[documentId]?.delete(listener);
    };
  }

  public subscribeUnread(listener: UnreadListener): () => void {
    this.unreadListeners.add(listener);
    listener(this.unreadByDoc);
    return () => {
      this.unreadListeners.delete(listener);
    };
  }

  private notifyMessageListeners(documentId: string) {
    const list = this.messagesByDoc[documentId] || [];
    this.messageListeners[documentId]?.forEach((listener) => listener(list));
  }

  private notifyUnreadListeners() {
    this.unreadListeners.forEach((listener) => listener({ ...this.unreadByDoc }));
  }

  private scheduleSimulatedReply(document: ApprovalDocument, _userPrompt: string) {
    setTimeout(() => {
      const replies = [
        `Dạ vâng thưa Ban Giám đốc, bộ phận đã tiếp nhận ý kiến chỉ đạo và rà soát lại ngay ạ.`,
        `Em đã liên hệ với nhà máy và đối tác để đối soát theo đúng yêu cầu của anh.`,
        `Dạ hồ sơ và chứng thư kỹ thuật đính kèm đã được cập nhật bản mới nhất trên hệ thống ạ!`,
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      this.sendMessage(document, randomReply, 'submitter', document.submitter, false);
    }, 3800);
  }

  private getInitialSeedMessages(_document: ApprovalDocument): ChatMessage[] {
    return [];
  }

  private saveToStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('decodoor_document_chat_messages', JSON.stringify(this.messagesByDoc));
        localStorage.setItem('decodoor_document_chat_unread', JSON.stringify(this.unreadByDoc));
        localStorage.setItem('decodoor_document_chat_meta', JSON.stringify(this.documentMeta));
      }
    } catch {
      // Ignore storage errors
    }
  }

  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const savedMsgs = localStorage.getItem('decodoor_document_chat_messages');
        if (savedMsgs) {
          this.messagesByDoc = JSON.parse(savedMsgs);
        }
        const savedUnread = localStorage.getItem('decodoor_document_chat_unread');
        if (savedUnread) {
          this.unreadByDoc = JSON.parse(savedUnread);
        }
        const savedMeta = localStorage.getItem('decodoor_document_chat_meta');
        if (savedMeta) {
          this.documentMeta = JSON.parse(savedMeta);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }
}

export const documentChatService = new DocumentChatService();
