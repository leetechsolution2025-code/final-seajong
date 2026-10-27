/**
 * Finance Real-time Synchronization Service
 * Cung cấp cơ chế truyền tin thời gian thực (Zero-Reload) cho Phân hệ Tài chính Deco Door / Seajong
 * 
 * Sử dụng:
 * 1. CustomEvent trong cùng cửa sổ trình duyệt (Same-window instant reactivity)
 * 2. BroadcastChannel giữa các tab/cửa sổ khác nhau (Cross-tab instant sync)
 * 3. Window focus event (Auto-refresh khi người dùng quay lại tab phần mềm)
 * 4. Heartbeat Polling nền (Đồng bộ đa người dùng trong mạng nội bộ Intranet)
 */

import { useEffect, useRef } from 'react';

export const FINANCE_SYNC_EVENT = 'decodoor_finance_updated';
const CHANNEL_NAME = 'decodoor_finance_sync_channel';

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch {
  // Ignore fallback for older environments
}

export interface FinanceSyncPayload {
  source?: string;
  action?: 'create' | 'update' | 'delete' | 'close_period' | 'import';
  timestamp: number;
}

/**
 * Phát tín hiệu cập nhật tài chính cho toàn bộ hệ thống
 */
export function notifyFinanceUpdated(source = 'finance', action: FinanceSyncPayload['action'] = 'update') {
  if (typeof window === 'undefined') return;

  const payload: FinanceSyncPayload = {
    source,
    action,
    timestamp: Date.now(),
  };

  // 1. Phát sự kiện nội bộ cửa sổ hiện tại
  window.dispatchEvent(new CustomEvent(FINANCE_SYNC_EVENT, { detail: payload }));

  // 2. Phát qua BroadcastChannel cho các tab khác đang mở
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(payload);
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }
  }
}

/**
 * Kiểm tra xem người dùng có đang tương tác với Modal, PrintPreview, Offcanvas,
 * hoặc đang gõ phím / focus vào input/textarea/select hay không.
 * Nếu đang tương tác, việc tự động làm mới dữ liệu ngầm sẽ bị tạm hoãn để tránh đóng giao diện đột ngột hoặc mất dữ liệu nhập dở.
 */
export function isUserActivelyInteracting(): boolean {
  if (typeof document === 'undefined') return false;

  // 1. Kiểm tra có bất kỳ Modal, PrintPreview, Offcanvas, Dialog nào đang hiển thị
  const hasModalOrDialog = Boolean(
    document.querySelector(
      '.modal.show, [role="dialog"], .offcanvas.show, .print-preview-overlay, .print-preview-container, .portal-modal, .custom-modal-backdrop, [data-modal-open="true"]'
    )
  );
  if (hasModalOrDialog) return true;

  // 2. Kiểm tra người dùng có đang focus vào input, textarea, select hoặc contenteditable
  const activeEl = document.activeElement;
  if (
    activeEl &&
    (activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      activeEl.tagName === 'SELECT' ||
      activeEl.getAttribute('contenteditable') === 'true')
  ) {
    return true;
  }

  return false;
}

/**
 * Hook lắng nghe thay đổi thời gian thực cho các component trong Phân hệ Tài chính
 * @param onRefresh Callback được gọi khi có thay đổi dữ liệu hoặc khi tab được focus lại
 * @param enablePolling Có bật cơ chế heartbeat polling ngầm (mặc định 10s) cho mạng nội bộ không
 */
export function useFinanceRealtimeSync(onRefresh: () => void, enablePolling = true) {
  const savedCallback = useRef(onRefresh);

  useEffect(() => {
    savedCallback.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    let lastRefreshTime = Date.now();

    const triggerRefresh = (force = false) => {
      // Nếu không phải force, kiểm tra an toàn xem người dùng có đang thao tác trong modal/input không
      if (!force && isUserActivelyInteracting()) {
        return;
      }

      // Debounce ngắn 150ms tránh gọi dồn dập
      const now = Date.now();
      if (now - lastRefreshTime > 150) {
        lastRefreshTime = now;
        savedCallback.current();
      }
    };

    // 1. Lắng nghe CustomEvent nội bộ (nếu có modal thì bỏ qua để không giật màn hình)
    const handleCustomEvent = () => {
      triggerRefresh(false);
    };
    window.addEventListener(FINANCE_SYNC_EVENT, handleCustomEvent);

    // 2. Lắng nghe BroadcastChannel từ các tab khác
    const handleBroadcast = () => {
      triggerRefresh(false);
    };
    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', handleBroadcast);
    }

    // 3. Lắng nghe sự kiện Window Focus (Khi click chuột quay lại màn hình)
    const handleFocus = () => {
      triggerRefresh(false);
    };
    window.addEventListener('focus', handleFocus);

    // 4. Polling nhẹ nhàng 10 giây/lần cho đa người dùng (chỉ chạy khi tab đang mở và không bận)
    let pollTimer: any = null;
    if (enablePolling) {
      pollTimer = setInterval(() => {
        if (!document.hidden && !isUserActivelyInteracting()) {
          triggerRefresh(false);
        }
      }, 10000);
    }

    return () => {
      window.removeEventListener(FINANCE_SYNC_EVENT, handleCustomEvent);
      if (broadcastChannel) {
        broadcastChannel.removeEventListener('message', handleBroadcast);
      }
      window.removeEventListener('focus', handleFocus);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [enablePolling]);
}
