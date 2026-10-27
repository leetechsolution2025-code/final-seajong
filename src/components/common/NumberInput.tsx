import React, { forwardRef } from 'react';
import { Input, type InputProps } from './Input';

export interface NumberInputProps extends Omit<InputProps, 'value' | 'onChange' | 'type'> {
  value?: number | string;
  onValueChange?: (numericValue: number, formattedValue: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  suffix?: React.ReactNode | string;
  allowNegative?: boolean;
  min?: number;
  max?: number;
}

/**
 * Component NumberInput: Ô nhập liệu số chuẩn hệ thống Deco Door
 * - Không mặc định hiển thị chữ số 0 (hiển thị trống khi 0 hoặc chưa nhập)
 * - Tự động định dạng nhóm phân tách hàng nghìn theo chuẩn Việt Nam (ví dụ 12.000.000)
 * - Chấp nhận cả dấu '.' và dấu ',' khi nhập số thập phân
 * - Tự động hiển thị đơn vị ở cuối ô nhập liệu (suffix)
 * - Bắn ra giá trị số nguyên bản qua onValueChange và onChange
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value,
      onValueChange,
      onChange,
      suffix,
      allowNegative = false,
      min,
      max,
      placeholder,
      hideZero = true,
      numberGroup = true,
      allowDecimal = true,
      ...props
    },
    ref
  ) => {
    return (
      <Input
        ref={ref}
        type="number"
        value={value}
        suffix={suffix}
        placeholder={placeholder}
        allowNegative={allowNegative}
        min={min}
        max={max}
        hideZero={hideZero}
        numberGroup={numberGroup}
        allowDecimal={allowDecimal}
        onChange={(e) => {
          if (onChange) onChange(e);
          const num = Number(e.target.value) || 0;
          if (onValueChange) onValueChange(num, e.target.value);
        }}
        onNumericChange={(num, raw) => {
          if (onValueChange) onValueChange(num, raw);
        }}
        {...props}
      />
    );
  }
);

NumberInput.displayName = 'NumberInput';
