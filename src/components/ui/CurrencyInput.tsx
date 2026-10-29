"use client";
import React from "react";

export interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?:  (e: React.FocusEvent<HTMLInputElement>) => void;
  name?: string;
  disabled?: boolean;
  readOnly?: boolean;
  min?: number;
  className?: string;
}

/**
 * Input tiền tệ có định dạng phân cách hàng nghìn theo chuẩn Việt Nam (dấu chấm).
 * Ví dụ: 1.500.000
 * - Khi nhập: tự động thêm dấu chấm sau mỗi 3 chữ số
 * - Khi blur: format lại gọn gàng
 * - Trả về `value` là số nguyên thông qua `onChange`
 */
export function CurrencyInput({
  value,
  onChange,
  placeholder = "0",
  style,
  onFocus,
  onBlur,
  name,
  disabled,
  readOnly,
  className,
}: CurrencyInputProps) {
  const [focused, setFocused] = React.useState(false);
  // Hiển thị nội bộ dạng string đã format
  const [display, setDisplay] = React.useState<string>(() =>
    value > 0 ? value.toLocaleString("vi-VN") : ""
  );

  // Đồng bộ khi value bên ngoài thay đổi (ví dụ reset form)
  React.useEffect(() => {
    if (focused) {
      setDisplay(value > 0 ? String(value) : "");
    } else {
      setDisplay(value > 0 ? value.toLocaleString("vi-VN") : "");
    }
  }, [value, focused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Chỉ giữ lại chữ số
    const digits = raw.replace(/\D/g, "");
    if (digits === "") {
      setDisplay("");
      onChange(0);
      return;
    }
    const num = parseInt(digits, 10);
    setDisplay(focused ? String(num) : num.toLocaleString("vi-VN"));
    onChange(num);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    // Khi focus: chỉ hiển thị số thuần (không có dấu chấm) để dễ sửa
    if (value > 0) {
      setDisplay(String(value));
    } else {
      setDisplay("");
    }
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    // Khi blur: format lại với dấu chấm
    if (value > 0) {
      setDisplay(value.toLocaleString("vi-VN"));
    } else {
      setDisplay("");
    }
    onBlur?.(e);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      name={name}
      className={className}
      value={display}
      placeholder={focused ? "" : placeholder}
      disabled={disabled}
      readOnly={readOnly}
      style={style}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
}

export default CurrencyInput;
