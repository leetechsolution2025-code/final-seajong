import React from "react";

interface BrandButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: string;
  children: React.ReactNode;
  loading?: boolean;
  variant?: "primary" | "outline" | "danger" | "outline-danger";
}

export const BrandButton = ({
  icon,
  children,
  className = "",
  style,
  loading,
  variant = "primary",
  disabled,
  ...props
}: BrandButtonProps) => {
  const isOutline = variant.includes("outline");
  const isDanger = variant.includes("danger");

  const baseColor = isDanger ? "#dc3545" : "#0070bc";

  return (
    <button
      className={`btn shadow-sm rounded-3 px-3 d-flex align-items-center justify-content-center gap-2 ${isOutline ? (isDanger ? 'text-danger border-danger' : 'btn-outline-primary border') : 'text-white'} ${className}`}
      disabled={disabled || loading}
      style={{
        height: 36,
        fontSize: "13px",
        backgroundColor: isOutline ? "transparent" : baseColor,
        borderColor: baseColor,
        color: isOutline ? baseColor : "white",
        borderWidth: isOutline ? "1px" : "0px",
        borderStyle: isOutline ? "solid" : "none",
        fontWeight: 600,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.65 : 1,
        ...style
      }}
      {...props}
    >
      {loading ? (
        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      ) : (
        icon && <i className={`bi ${icon}`}></i>
      )}
      {children}
    </button>
  );
};

export default BrandButton;

