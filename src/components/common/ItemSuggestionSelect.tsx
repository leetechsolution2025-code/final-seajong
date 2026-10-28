import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X, Check2, Search } from 'react-bootstrap-icons';

export interface ItemSuggestionOption {
  id: string;
  name: string;
  code?: string;
  donVi?: string;
  soLuong?: number;
  categoryName?: string;
}

export interface ItemSuggestionSelectProps {
  items: ItemSuggestionOption[];
  selectedId: string;
  onSelect: (item: ItemSuggestionOption | null) => void;
  placeholder?: string;
  minWidth?: string | number;
  width?: string | number;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

/**
 * Loại bỏ dấu tiếng Việt để tìm kiếm thông minh
 */
function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
}

/**
 * Component ItemSuggestionSelect: Ô nhập liệu tìm kiếm và chọn hàng hoá có gợi ý thời gian thực.
 * Tích hợp icon xoá nhanh nội dung ở cuối và dropdown chọn nhanh chuẩn Enterprise.
 */
export const ItemSuggestionSelect: React.FC<ItemSuggestionSelectProps> = ({
  items,
  selectedId,
  onSelect,
  placeholder = 'Gõ tên hoặc mã hàng...',
  minWidth = '280px',
  width,
  className = '',
  style,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Tìm item hiện tại theo selectedId
  const selectedItem = useMemo(() => {
    return items.find((it) => it.id === selectedId) || null;
  }, [items, selectedId]);

  // Đồng bộ giá trị hiển thị khi selectedItem thay đổi (nếu người dùng không đang tự gõ)
  useEffect(() => {
    if (!isTyping) {
      if (selectedItem) {
        setInputValue(selectedItem.name);
      } else {
        setInputValue('');
      }
    }
  }, [selectedItem, isTyping]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsTyping(false);
        // Khôi phục lại tên item đã chọn nếu người dùng bỏ dở
        if (selectedItem) {
          setInputValue(selectedItem.name);
        } else {
          setInputValue('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedItem]);

  // Lọc danh sách gợi ý theo ký tự nhập vào
  const filteredItems = useMemo(() => {
    if (!isTyping || !inputValue.trim()) {
      return items;
    }
    const cleanKeyword = removeVietnameseTones(inputValue);
    return items.filter((it) => {
      const matchName = removeVietnameseTones(it.name).includes(cleanKeyword);
      const matchCode = it.code ? removeVietnameseTones(it.code).includes(cleanKeyword) : false;
      const matchCategory = it.categoryName ? removeVietnameseTones(it.categoryName).includes(cleanKeyword) : false;
      return matchName || matchCode || matchCategory;
    });
  }, [items, inputValue, isTyping]);

  // Xử lý xoá nhanh nội dung
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputValue('');
    setIsTyping(true);
    setHighlightedIndex(-1);
    onSelect(null);
    inputRef.current?.focus();
    setIsOpen(true);
  };

  // Chọn một mặt hàng
  const handleSelectItem = (it: ItemSuggestionOption) => {
    onSelect(it);
    setInputValue(it.name);
    setIsTyping(false);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  // Phím điều hướng
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setHighlightedIndex((prev) => {
        const next = prev + 1;
        return next >= filteredItems.length ? 0 : next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setHighlightedIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? filteredItems.length - 1 : next;
      });
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredItems.length) {
        e.preventDefault();
        handleSelectItem(filteredItems[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setIsTyping(false);
    }
  };

  // Tự động cuộn đến phần tử được highlight
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const listElement = listRef.current;
      const targetElement = listElement.children[highlightedIndex] as HTMLElement;
      if (targetElement) {
        const listTop = listElement.scrollTop;
        const listBottom = listTop + listElement.clientHeight;
        const elementTop = targetElement.offsetTop;
        const elementBottom = elementTop + targetElement.clientHeight;

        if (elementTop < listTop) {
          listElement.scrollTop = elementTop;
        } else if (elementBottom > listBottom) {
          listElement.scrollTop = elementBottom - listElement.clientHeight;
        }
      }
    }
  }, [highlightedIndex]);

  return (
    <div
      ref={containerRef}
      className={`item-suggestion-select relative ${className}`}
      style={{
        minWidth: typeof minWidth === 'number' ? `${minWidth}px` : minWidth,
        width: typeof width === 'number' ? `${width}px` : width,
        flex: width ? '0 0 auto' : '1 1 auto',
        ...style,
      }}
    >
      {/* Khung Input tìm kiếm */}
      <div
        className={`flex items-center bg-white border rounded-lg transition-all shadow-2xs h-[38px] px-2.5 gap-1.5 ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20'
            : 'border-slate-200 hover:border-slate-300'
        } ${disabled ? 'bg-slate-50 opacity-60 cursor-not-allowed' : ''}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            inputRef.current?.focus();
          }
        }}
      >
        <Search size={13} className="text-slate-400 shrink-0" />

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsTyping(true);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent border-0 text-slate-800 text-[13px] font-medium p-0 focus:outline-hidden focus:ring-0 truncate"
        />

        {/* Nút xoá nhanh nội dung khi có text */}
        {inputValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
            title="Xoá nhanh để chọn mặt hàng khác"
          >
            <X size={15} />
          </button>
        )}

        {/* Mũi tên mở danh sách */}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) {
              setIsOpen((prev) => !prev);
              inputRef.current?.focus();
            }
          }}
          className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 cursor-pointer p-0.5"
        >
          <ChevronDown
            size={12}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Dropdown danh sách gợi ý */}
      {isOpen && !disabled && (
        <div
          className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden text-xs"
          style={{ minWidth: '340px' }}
        >
          {/* Header nhỏ hiển thị số kết quả */}
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>
              {isTyping && inputValue.trim()
                ? `Kết quả tìm kiếm: ${filteredItems.length} mặt hàng`
                : `Danh sách mặt hàng (${filteredItems.length})`}
            </span>
            <span className="text-[10px]">Nhấn Enter để chọn</span>
          </div>

          {/* Danh sách items */}
          <div
            ref={listRef}
            className="max-h-[280px] overflow-y-auto divide-y divide-slate-50"
            role="listbox"
          >
            {filteredItems.length === 0 ? (
              <div className="py-8 px-4 text-center text-slate-400">
                <Search size={20} className="mx-auto mb-1.5 opacity-40" />
                <p className="font-medium text-slate-600">Không tìm thấy mặt hàng phù hợp</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Thử tìm theo tên khác hoặc mã vật tư
                </p>
              </div>
            ) : (
              filteredItems.map((it, idx) => {
                const isSelected = it.id === selectedId;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={it.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectItem(it)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3 py-2.5 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-50 text-blue-900 font-semibold'
                        : isHighlighted
                        ? 'bg-slate-50 text-slate-900'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      {/* Dòng 1: Tên hàng hoá */}
                      <div className="text-[13px] text-slate-800 font-semibold truncate leading-tight">
                        {it.name}
                      </div>

                      {/* Dòng 2: Mã hàng hoá và danh mục bên dưới tên hàng */}
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                        {it.code && (
                          <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-blue-100/70 text-blue-700 font-bold border border-blue-200/50">
                            {it.code}
                          </span>
                        )}
                        {it.categoryName && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-400 truncate">{it.categoryName}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Tồn kho / Đơn vị & Icon check */}
                    <div className="shrink-0 flex items-center gap-2 text-right">
                      {it.soLuong !== undefined && (
                        <span className="text-[11px] font-mono text-slate-500">
                          Tồn: <strong className="text-slate-700">{it.soLuong.toLocaleString('vi-VN')}</strong> {it.donVi}
                        </span>
                      )}
                      {isSelected && (
                        <Check2 size={16} className="text-blue-600 font-bold" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemSuggestionSelect;
