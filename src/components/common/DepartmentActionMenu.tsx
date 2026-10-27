import React, { useState, useRef, useEffect } from 'react';
import { ThreeDotsVertical } from 'react-bootstrap-icons';
import { useDepartment } from '../../context/DepartmentContext';

export interface DepartmentActionMenuItem {
  id?: string;
  icon: React.ReactNode | string;
  title: string;
  description?: string;
  onClick?: () => void;
  menuKey?: string;
  danger?: boolean;
}

export interface DepartmentActionMenuProps {
  /** Danh sách mục tuỳ biến (nếu không truyền, hiển thị danh mục tiện ích chuẩn) */
  items?: DepartmentActionMenuItem[];
  /** Bổ sung mục vào cuối danh sách tiện ích chuẩn */
  extraItems?: DepartmentActionMenuItem[];
  /** ClassName bổ sung cho container */
  className?: string;
  /** Nút trigger tuỳ biến thay cho nút 3 chấm mặc định */
  trigger?: React.ReactNode;
  /** Tiêu đề tooltip của nút trigger */
  title?: string;
  /** Căn lề dropdown: 'right' (mặc định) hoặc 'left' */
  align?: 'right' | 'left';
  /** Độ rộng dropdown class (mặc định 'w-56') */
  dropdownWidth?: string;
  /** Không hiển thị viền (border) cho nút 3 chấm (mặc định: true) */
  noBorder?: boolean;
}

/**
 * Component Dropdown Menu 3 chấm dùng chung cho các phân hệ phòng ban
 * Chuẩn thiết kế Enterprise Deco Door: Giao diện bo tròn, bóng đổ mịn, tự động đóng khi click ngoài
 */
export const DepartmentActionMenu: React.FC<DepartmentActionMenuProps> = ({
  items,
  extraItems,
  className = '',
  trigger,
  title = 'Tùy chọn thao tác',
  align = 'right',
  dropdownWidth = 'w-56',
  noBorder = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { setActiveMenuKey } = useDepartment();

  // Đóng dropdown khi click ra ngoài hoặc bấm Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Các mục tiện ích chuẩn chung cho các phòng ban
  const defaultItems: DepartmentActionMenuItem[] = [
    {
      id: 'documents',
      icon: <i className="bi bi-archive text-indigo-600 text-[15px] shrink-0" />,
      title: 'Thư viện tài liệu',
      description: 'Kho tài liệu, ấn phẩm & ISO',
      menuKey: 'documents',
    },
    {
      id: 'notebook',
      icon: <i className="bi bi-journal-bookmark-fill text-amber-600 text-[15px] shrink-0" />,
      title: 'Sổ ghi chép',
      description: 'Ghi chép điều hành & cuộc họp',
      menuKey: 'notebook',
    },
    {
      id: 'requests_approvals',
      icon: <i className="bi bi-clipboard2-check text-rose-600 text-[15px] shrink-0" />,
      title: 'Yêu cầu và duyệt yêu cầu',
      description: 'Tờ trình & kiến nghị phòng ban',
      menuKey: 'requests_approvals',
    },
  ];

  const menuItems = items || (extraItems ? [...defaultItems, ...extraItems] : defaultItems);

  const handleItemClick = (item: DepartmentActionMenuItem) => {
    if (item.onClick) {
      item.onClick();
    }
    if (item.menuKey) {
      setActiveMenuKey(item.menuKey);
    }
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {trigger ? (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="cursor-pointer"
        >
          {trigger}
        </div>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className={
            noBorder
              ? `w-9 h-9 p-0 rounded-full border-0 bg-transparent flex items-center justify-center transition-all cursor-pointer ${
                  isOpen
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`
              : `w-9 h-9 p-0 rounded-2xl border flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                  isOpen
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300'
                }`
          }
          title={title}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <ThreeDotsVertical size={noBorder ? 16 : 15} />
        </button>
      )}

      {isOpen && (
        <div
          className={`absolute ${
            align === 'left' ? 'left-0' : 'right-0'
          } top-full mt-2 ${dropdownWidth} bg-white rounded-xl shadow-xl border border-slate-200/90 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 select-none`}
        >
          {menuItems.map((item, index) => {
            return (
              <button
                key={item.id || index}
                type="button"
                onClick={() => handleItemClick(item)}
                className={`w-full px-3.5 py-2.5 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2.5 transition-colors cursor-pointer border-0 bg-transparent font-medium ${
                  item.danger ? 'hover:bg-rose-50 text-rose-600' : ''
                }`}
              >
                {typeof item.icon === 'string' ? (
                  <i className={`bi ${item.icon} text-[15px] shrink-0`} />
                ) : (
                  item.icon
                )}
                <div className="flex flex-col min-w-0">
                  <span
                    className={`font-bold text-xs truncate ${
                      item.danger ? 'text-rose-600' : 'text-slate-800'
                    }`}
                  >
                    {item.title}
                  </span>
                  {item.description && (
                    <span className="text-[11px] text-slate-400 truncate">
                      {item.description}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DepartmentActionMenu;
