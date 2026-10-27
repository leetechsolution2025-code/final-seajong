import React, { useState } from 'react';
import { Trash2 } from 'react-bootstrap-icons';
import { Button, type ButtonVariant, type ButtonSize } from './Button';
import { ConfirmDialog, type ConfirmDialogVariant } from './ConfirmDialog';

export type ConfirmDialogType = ConfirmDialogVariant;

export interface DeleteButtonProps {
  /** Hành động xoá được thực thi sau khi người dùng bấm xác nhận */
  onConfirm: () => void | Promise<void>;
  /** Số lượng mục được chọn cần xoá (khi xoá hàng loạt) */
  itemCount?: number;
  /** Nút có bị vô hiệu hoá không (mặc định: false) */
  disabled?: boolean;
  /** Tiêu đề hiển thị trên hộp thoại xác nhận */
  dialogTitle?: string;
  /** Nội dung thông báo hiển thị trên hộp thoại xác nhận */
  dialogMessage?: React.ReactNode;
  /** Nhãn của nút (mặc định: 'Xóa') */
  label?: string;
  /** Kích thước của nút (mặc định: 'md') */
  size?: ButtonSize;
  /** Biến thể màu sắc của nút (mặc định: 'danger') */
  variant?: ButtonVariant;
  /** Có hiển thị biểu tượng thùng rác không (mặc định: true) */
  showIcon?: boolean;
  /** Biểu tượng tuỳ biến thay thế biểu tượng mặc định */
  icon?: React.ReactNode;
  /** Loại thông báo của hộp thoại xác nhận (mặc định: 'danger') */
  dialogType?: ConfirmDialogType;
  /** Văn bản nút xác nhận trong hộp thoại (mặc định: 'Xác nhận xoá') */
  confirmText?: string;
  /** Văn bản nút huỷ trong hộp thoại (mặc định: 'Hủy bỏ') */
  cancelText?: string;
  /** Style tuỳ biến cho nút */
  style?: React.CSSProperties;
  className?: string;
  /** Tooltip hiển thị khi rê chuột */
  title?: string;
}

/**
 * Component DeleteButton dùng chung cho toàn bộ dự án decodoor / seajong.
 * Tích hợp sẵn hộp thoại xác nhận ConfirmDialog đẹp mắt, hiện đại thay thế cho window.confirm.
 */
export const DeleteButton: React.FC<DeleteButtonProps> = ({
  onConfirm,
  itemCount,
  disabled = false,
  dialogTitle = 'Xác nhận xoá dữ liệu',
  dialogMessage,
  label = 'Xóa',
  size = 'md',
  variant = 'danger',
  showIcon = true,
  icon,
  dialogType = 'danger',
  confirmText = 'Xác nhận xoá',
  cancelText = 'Hủy bỏ',
  style,
  className = '',
  title,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    setIsDialogOpen(true);
  };

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      await onConfirm();
      setIsDialogOpen(false);
    } catch (err) {
      console.error('Lỗi khi thực hiện thao tác xóa:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const hasCount = itemCount !== undefined && itemCount > 0;

  const defaultMessage = hasCount
    ? `Bạn có chắc chắn muốn xóa ${itemCount} mục đã chọn khỏi cơ sở dữ liệu? Hành động này không thể hoàn tác.`
    : 'Bạn có chắc chắn muốn xóa dữ liệu này khỏi cơ sở dữ liệu? Hành động này không thể hoàn tác.';

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={disabled || isDeleting}
        onClick={handleClick}
        leftIcon={showIcon ? (icon || <Trash2 size={15} />) : undefined}
        style={{
          fontFamily: "'Roboto Condensed', sans-serif",
          whiteSpace: 'nowrap',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          ...style,
        }}
        className={className}
        title={title}
      >
        <span>{label}</span>
        {hasCount && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '18px',
              height: '18px',
              padding: (itemCount ?? 0) >= 10 ? '0 5px' : '0 2px',
              borderRadius: '9999px',
              backgroundColor: '#ffffff',
              color: 'var(--color-danger, #e11d48)',
              fontSize: '0.72rem',
              fontWeight: 800,
              lineHeight: 1,
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
              marginLeft: '2px',
            }}
          >
            {itemCount}
          </span>
        )}
      </Button>

      <ConfirmDialog
        isOpen={isDialogOpen}
        onClose={() => !isDeleting && setIsDialogOpen(false)}
        onConfirm={handleConfirm}
        title={dialogTitle}
        message={dialogMessage || defaultMessage}
        confirmText={confirmText}
        cancelText={cancelText}
        type={dialogType}
        isLoading={isDeleting}
      />
    </>
  );
};
export default DeleteButton;
