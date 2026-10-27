import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  MessageSquare, 
  Send, 
  Search, 
  User, 
  CheckCheck, 
  Phone, 
  MoreVertical,
  Paperclip,
  Smile,
  Circle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderDept: string;
  text: string;
  time: string;
  isMe: boolean;
}

interface Conversation {
  id: string;
  name: string;
  role: string;
  department: string;
  departmentCode: string;
  avatarText: string;
  online: boolean;
  lastMessage: string;
  lastTime: string;
  unread: number;
}

interface MessageOffcanvasProps {
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    name: 'Lê Công Vụ',
    role: 'Tổng Giám đốc',
    department: 'Ban Giám đốc',
    departmentCode: 'board',
    avatarText: 'LC',
    online: true,
    lastMessage: 'Đã ký duyệt kế hoạch sản xuất sen vòi SJ-502 cho quý này.',
    lastTime: '10:25',
    unread: 1,
  },
  {
    id: 'c2',
    name: 'Trần Thị Linh',
    role: 'Trưởng phòng Kế toán',
    department: 'Tài chính – Kế toán',
    departmentCode: 'finance',
    avatarText: 'TL',
    online: true,
    lastMessage: 'Đã đối soát xong công nợ đại lý Miền Bắc đợt 2.',
    lastTime: '09:40',
    unread: 0,
  },
  {
    id: 'c3',
    name: 'Phạm Quang Việt',
    role: 'Trưởng phòng Kinh doanh',
    department: 'Kinh doanh',
    departmentCode: 'sales',
    avatarText: 'PV',
    online: false,
    lastMessage: 'Khách hàng dự án Ecohome hẹn ký hợp đồng vào thứ Năm tới.',
    lastTime: 'Hôm qua',
    unread: 0,
  },
  {
    id: 'c4',
    name: 'Hà Thị Thu',
    role: 'Trưởng phòng QA',
    department: 'Đảm bảo chất lượng',
    departmentCode: 'qa',
    avatarText: 'HT',
    online: true,
    lastMessage: 'Lô hàng sen tắm mới kiểm nghiệm áp lực nước đạt 100%.',
    lastTime: '17/10',
    unread: 0,
  },
  {
    id: 'c5',
    name: 'Ngô Hoàng Yến',
    role: 'Quản lý kho',
    department: 'Kho vận',
    departmentCode: 'logistics',
    avatarText: 'NY',
    online: true,
    lastMessage: 'Xe hàng đã xuất bến lúc 14:00 đi Hà Nội.',
    lastTime: '16/10',
    unread: 0,
  },
];

export const MessageOffcanvas: React.FC<MessageOffcanvasProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(INITIAL_CONVERSATIONS[0]);
  const [search, setSearch] = useState('');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Record<string, Message[]>>({
    c1: [
      {
        id: 'm1',
        senderId: 'c1',
        senderName: 'Lê Công Vụ',
        senderDept: 'Ban Giám đốc',
        text: 'Chào bạn, tiến độ kiểm định chỉ tiêu các phòng ban tuần này thế nào?',
        time: '10:15',
        isMe: false,
      },
      {
        id: 'm2',
        senderId: 'me',
        senderName: user?.name || 'Tôi',
        senderDept: user?.employee?.departmentName || 'Hệ thống',
        text: 'Dạ báo cáo Tổng Giám Đốc, toàn bộ 13 phòng ban đang vận hành đạt trên 96% KPI cam kết ạ.',
        time: '10:20',
        isMe: true,
      },
      {
        id: 'm3',
        senderId: 'c1',
        senderName: 'Lê Công Vụ',
        senderDept: 'Ban Giám đốc',
        text: 'Tốt lắm, đã ký duyệt kế hoạch sản xuất sen vòi SJ-502 cho quý này. Nhắc xưởng duy trì kiểm soát QA chặt chẽ nhé.',
        time: '10:25',
        isMe: false,
      },
    ],
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedConv]);

  if (!isOpen) return null;

  const currentMessages = selectedConv ? messages[selectedConv.id] || [] : [];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedConv) return;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      senderId: 'me',
      senderName: user?.name || 'Tôi',
      senderDept: user?.employee?.departmentName || 'Hệ thống',
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
    };

    setMessages((prev) => ({
      ...prev,
      [selectedConv.id]: [...(prev[selectedConv.id] || []), newMsg],
    }));

    // Update conversation last message
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConv.id
          ? { ...c, lastMessage: inputText.trim(), lastTime: 'Vừa xong' }
          : c
      )
    );

    setInputText('');
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slide-left">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center border border-indigo-200">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Hộp Thoại Nội Bộ</h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Kết nối trực tiếp giữa 13 phòng ban Seajong
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body: Split Layout (Contacts & Chat Box) */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* Left Column: Conversations List */}
            <div className="w-48 sm:w-56 border-r border-slate-200 flex flex-col bg-slate-50/40 shrink-0">
              {/* Search box */}
              <div className="p-2.5 border-b border-slate-200">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm đồng nghiệp..."
                    className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-hidden focus:border-pink-500"
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {filteredConversations.map((c) => {
                  const isSelected = selectedConv?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedConv(c);
                        setConversations((prev) =>
                          prev.map((item) =>
                            item.id === c.id ? { ...item, unread: 0 } : item
                          )
                        );
                      }}
                      className={`w-full text-left p-2.5 flex items-start gap-2.5 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-pink-50/60 border-l-3 border-pink-600'
                          : 'hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center">
                          {c.avatarText}
                        </div>
                        {c.online && (
                          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-800 truncate">
                            {c.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {c.lastTime}
                          </span>
                        </div>
                        <p className="text-[10px] text-pink-600 font-medium truncate">
                          {c.department}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {c.lastMessage}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Active Conversation */}
            <div className="flex-1 flex flex-col bg-white">
              {selectedConv ? (
                <>
                  {/* Chat Header */}
                  <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-linear-to-tr from-pink-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                        {selectedConv.avatarText}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-slate-900 leading-tight">
                            {selectedConv.name}
                          </h4>
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-1.5 py-0.2 rounded border border-slate-200">
                            {selectedConv.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                          <Circle className="w-1.5 h-1.5 fill-emerald-500 text-emerald-500" />
                          <span>{selectedConv.department}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/20">
                    {currentMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-[10px] font-bold text-slate-500">
                            {msg.senderName}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {msg.time}
                          </span>
                        </div>

                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-2xs ${
                            msg.isMe
                              ? 'bg-linear-to-r from-pink-600 to-purple-600 text-white rounded-br-xs'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat Input */}
                  <form onSubmit={handleSendMessage} className="p-2.5 border-t border-slate-200 bg-white flex items-center gap-2">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={`Nhắn tin cho ${selectedConv.name}...`}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-hidden focus:border-pink-500 focus:bg-white transition-all"
                    />

                    <button
                      type="submit"
                      disabled={!inputText.trim()}
                      className="p-2 rounded-xl bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                  Chọn một cuộc trò chuyện để bắt đầu
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
