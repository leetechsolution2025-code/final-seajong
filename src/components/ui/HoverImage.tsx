"use client";
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface HoverImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  previewSize?: number;
  images?: string[];
  fallback?: React.ReactNode;
  onPreviewClick?: (index: number, src: string) => void;
}

export function HoverImage({ previewSize = 300, images, fallback, onPreviewClick, ...props }: HoverImageProps) {
  const [hover, setHover] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0, size: previewSize });
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setDisplaySrc(null); // Reset when props.src changes
    setHasError(false);
  }, [props.src]);

  const rawImages = images && images.length > 0 ? images : (props.src ? [props.src] : []);
  const imageList = rawImages.filter((s): s is string => typeof s === "string" && s.trim().length > 0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (hover && !hasError && imageList.length > 1) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % imageList.length);
      }, 1500);
    } else {
      setCurrentIndex(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [hover, hasError, imageList.length]);

  const updatePreviewPosition = () => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect || typeof window === "undefined") return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw <= 768;
    const gap = isMobile ? 8 : 12;
    const margin = isMobile ? 8 : 10;

    // Ưu tiên đặt hình ảnh lớn nằm về bên phải hình ảnh nhỏ
    let x = rect.right + gap;
    const availableRight = vw - x - margin;
    let actualSize = previewSize;

    if (isMobile) {
      // Trên màn hình điện thoại: luôn đặt bên phải ảnh nhỏ và tự co kích thước để nằm gọn trong màn hình
      if (availableRight >= 120) {
        actualSize = Math.min(previewSize, availableRight);
      } else {
        actualSize = Math.min(previewSize, vw - margin * 2);
        x = Math.max(margin, vw - actualSize - margin);
      }
    } else {
      // Trên màn hình lớn: đặt bên phải, nếu tràn màn hình phải và bên trái đủ chỗ thì mới chuyển sang trái
      if (x + previewSize > vw - margin) {
        if (rect.left - previewSize - gap >= margin) {
          x = rect.left - previewSize - gap;
        } else if (availableRight >= 160) {
          actualSize = Math.min(previewSize, availableRight);
        } else {
          actualSize = Math.min(previewSize, vw - margin * 2);
          x = Math.max(margin, vw - actualSize - margin);
        }
      }
    }

    let y = rect.top - (actualSize / 2) + (rect.height / 2);
    if (y < margin) y = margin;
    if (y + actualSize > vh - margin) {
      y = Math.max(margin, vh - actualSize - margin);
    }

    setCoords({ x, y, size: actualSize });
  };

  useEffect(() => {
    if (!hover) return;
    const handleOutsideTouchOrClick = (e: Event) => {
      const target = e.target as Node | null;
      if (
        target &&
        !imgRef.current?.contains(target) &&
        !previewRef.current?.contains(target)
      ) {
        setHover(false);
      }
    };
    const handleScroll = () => {
      if (typeof window !== "undefined" && window.innerWidth <= 768) {
        setHover(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideTouchOrClick);
    document.addEventListener("touchstart", handleOutsideTouchOrClick, { passive: true });
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleOutsideTouchOrClick);
      document.removeEventListener("touchstart", handleOutsideTouchOrClick);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [hover]);

  const handleMouseEnter = () => {
    if (hasError || imageList.length === 0) return;
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    if (!hover) {
      updatePreviewPosition();
      setHover(true);
    }
  };

  const handleThumbnailClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      e.stopPropagation();
      if (!hasError && imageList.length > 0) {
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        updatePreviewPosition();
        setHover(true);
      }
    }
    if (props.onClick) {
      props.onClick(e);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => {
      setHover(false);
    }, 300);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    setHover(false);
    if (props.onError) {
      props.onError(e);
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const selectedSrc = imageList[currentIndex];
    if (selectedSrc) {
      setDisplaySrc(typeof selectedSrc === 'string' ? selectedSrc : String(selectedSrc));
    }
    if (onPreviewClick && selectedSrc) {
      onPreviewClick(currentIndex, selectedSrc);
    } else if (typeof window !== "undefined" && window.innerWidth <= 768 && imageList.length <= 1) {
      setHover(false);
    }
  };

  const targetWidth = props.style?.width;
  const targetHeight = props.style?.height;
  const isPercent = typeof targetWidth === "string" && targetWidth.endsWith("%");

  if (hasError || imageList.length === 0) {
    if (fallback) return <>{fallback}</>;
    const fallbackWidth = targetWidth ?? "100%";
    const fallbackHeight = targetHeight ?? "100%";
    return (
      <div 
        className={`d-flex align-items-center justify-content-center bg-light ${props.className || ""}`}
        style={{ 
          border: props.style?.border || "1px solid #e2e8f0",
          borderRadius: props.style?.borderRadius || 6,
          boxSizing: "border-box",
          ...props.style,
          width: fallbackWidth,
          height: fallbackHeight,
          ...(targetWidth && !isPercent ? {
            minWidth: targetWidth,
            maxWidth: targetWidth,
            flexShrink: 0
          } : {})
        }}
      >
        <i className="bi bi-box-seam text-muted opacity-50" style={{ fontSize: 16 }} />
      </div>
    );
  }

  const currentSrc = displaySrc || props.src;

  return (
    <>
      <img
        {...props}
        src={currentSrc}
        ref={imgRef}
        onError={handleError}
        onClick={handleThumbnailClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          boxSizing: "border-box",
          ...props.style,
          ...(targetWidth && !isPercent ? {
            minWidth: targetWidth,
            maxWidth: targetWidth,
            flexShrink: 0
          } : {})
        }}
      />
      {hover && !hasError && mounted && typeof document !== "undefined" && createPortal(
        <div 
          ref={previewRef}
          style={{
            position: "fixed",
            top: coords.y,
            left: coords.x,
            width: coords.size,
            height: coords.size,
            zIndex: 999999,
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
            backgroundColor: "#fff",
            border: "1px solid rgba(0,0,0,0.1)",
            pointerEvents: "auto",
            cursor: "pointer",
            animation: "fadeIn 0.2s ease-out"
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleImageClick}
        >
          {imageList.map((imgSrc, idx) => (
            <img 
              key={idx}
              src={imgSrc} 
              alt={props.alt || "Preview"} 
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
              style={{ 
                width: "100%", 
                height: "100%", 
                objectFit: "contain", 
                backgroundColor: "#f8f9fa",
                position: "absolute",
                top: 0,
                left: 0,
                opacity: currentIndex === idx ? 1 : 0,
                transition: "opacity 0.4s ease-in-out"
              }} 
            />
          ))}

          {imageList.length > 1 && (
            <>
              {/* Counter badge */}
              <div style={{
                position: "absolute",
                top: 8,
                right: 8,
                padding: "2px 8px",
                borderRadius: 99,
                backgroundColor: "rgba(15,23,42,0.75)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.5px",
                zIndex: 20,
                backdropFilter: "blur(4px)"
              }}>
                {currentIndex + 1} / {imageList.length}
              </div>

              {/* Prev button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
                }}
                style={{
                  position: "absolute",
                  left: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  backgroundColor: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(0,0,0,0.15)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  zIndex: 20,
                  color: "#0f172a",
                  fontSize: 18,
                  fontWeight: "bold",
                  lineHeight: 1
                }}
                title="Ảnh trước"
              >
                ‹
              </button>

              {/* Next button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentIndex((prev) => (prev + 1) % imageList.length);
                }}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  backgroundColor: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(0,0,0,0.15)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  zIndex: 20,
                  color: "#0f172a",
                  fontSize: 18,
                  fontWeight: "bold",
                  lineHeight: 1
                }}
                title="Ảnh tiếp theo"
              >
                ›
              </button>

              {/* Slide dots */}
              <div style={{
                position: "absolute",
                bottom: 12,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                gap: 4,
                zIndex: 20
              }}>
                {imageList.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCurrentIndex(idx);
                    }}
                    style={{
                      width: currentIndex === idx ? 16 : 6,
                      height: 6,
                      borderRadius: 99,
                      backgroundColor: currentIndex === idx ? "var(--primary, #0284c7)" : "rgba(0,0,0,0.3)",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      transition: "all 0.3s ease"
                    }}
                    title={`Ảnh ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
