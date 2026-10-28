import React, { useState, useEffect, useRef } from 'react';
import { X, Copy, VolumeUp, VolumeMute } from 'react-bootstrap-icons';

export interface CasioCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  onCopyResult?: (val: string) => void;
}

type RoundingMode = 'CUT' | 'UP' | '5/4';
type DecimalMode = 'F' | '4' | '2' | '1' | '0' | 'ADD2';

export const CasioCalculator: React.FC<CasioCalculatorProps> = ({
  isOpen,
  onClose,
  onCopyResult,
}) => {
  // Trạng thái hiển thị và tính toán
  const [display, setDisplay] = useState<string>('0');
  const [formulaText, setFormulaText] = useState<string>(''); // Dòng chữ nhỏ hiển thị phép tính bên dưới kết quả
  const [memory, setMemory] = useState<number>(0);
  const [grandTotal, setGrandTotal] = useState<number>(0);
  const [hasGrandTotal, setHasGrandTotal] = useState<boolean>(false);
  const [storedOperand, setStoredOperand] = useState<number | null>(null);
  const [pendingOperator, setPendingOperator] = useState<string | null>(null);
  const [isWaitingForOperand, setIsWaitingForOperand] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [isGtRecalled, setIsGtRecalled] = useState<boolean>(false);

  // Switch gạt cơ học
  const [roundingMode, setRoundingMode] = useState<RoundingMode>('5/4');
  const [decimalMode, setDecimalMode] = useState<DecimalMode>('F');

  // Âm thanh phím bấm (Web Audio API)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  // Vị trí mặc định ở góc dưới bên trái màn hình
  const getDefaultBottomLeftPosition = () => ({
    x: 24,
    y: Math.max(20, (typeof window !== 'undefined' ? window.innerHeight : 800) - 475),
  });

  const [position, setPosition] = useState<{ x: number; y: number }>(getDefaultBottomLeftPosition);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });

  // Audio Context cho tiếng click bấm phím cơ học nhẹ nhàng
  const playClickSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Bỏ qua lỗi audio nếu trình duyệt chặn
    }
  };

  // Helper format số theo phong cách Casio: Dấu phẩy ở mép trên phân cách hàng nghìn
  const formatCasioNumber = (val: number | string | null | undefined): string => {
    if (val === null || val === undefined || val === '') return '0';
    const str = String(val);
    const isNeg = str.startsWith('-');
    const absVal = isNeg ? str.slice(1) : str;
    const parts = absVal.split('.');
    const intPart = parts[0];
    const decPart = parts[1] !== undefined ? `.${parts[1]}` : '';

    let formattedInt = '';
    for (let i = 0; i < intPart.length; i++) {
      const fromRight = intPart.length - i;
      if (i > 0 && fromRight % 3 === 0) formattedInt += "'";
      formattedInt += intPart[i];
    }
    return (isNeg ? '-' : '') + formattedInt + decPart;
  };

  // Kéo thả di chuyển máy tính
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.calc-interactive')) return;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - dragStartRef.current.startX;
      const deltaY = e.clientY - dragStartRef.current.startY;
      const newX = Math.min(Math.max(10, dragStartRef.current.posX + deltaX), window.innerWidth - 350);
      const newY = Math.min(Math.max(10, dragStartRef.current.posY + deltaY), window.innerHeight - 500);
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Đặt vị trí mặc định ở góc dưới bên trái màn hình mỗi khi mở máy tính
  useEffect(() => {
    if (isOpen) {
      setPosition(getDefaultBottomLeftPosition());
    }
  }, [isOpen]);

  // Áp dụng định dạng theo switch làm tròn và chữ số thập phân
  const formatDecimalBySwitches = (num: number): number => {
    if (decimalMode === 'F' || !isFinite(num)) return num;

    const decimals = decimalMode === 'ADD2' ? 2 : parseInt(decimalMode, 10);
    const factor = Math.pow(10, decimals);

    if (roundingMode === 'CUT') {
      return num >= 0 ? Math.floor(num * factor) / factor : Math.ceil(num * factor) / factor;
    } else if (roundingMode === 'UP') {
      return num >= 0 ? Math.ceil(num * factor) / factor : Math.floor(num * factor) / factor;
    } else {
      // 5/4
      return Math.round(num * factor) / factor;
    }
  };

  // Xử lý phím số
  const handleDigit = (digit: string) => {
    playClickSound();
    if (isError) return;

    let nextVal = '';
    if (isWaitingForOperand || display === '0') {
      nextVal = digit === '00' ? '0' : digit;
      setDisplay(nextVal);
      setIsWaitingForOperand(false);
    } else {
      // Giới hạn 12 chữ số
      const rawDigits = display.replace(/[^0-9]/g, '');
      if (rawDigits.length >= 12) return;

      if (digit === '00' && rawDigits.length >= 11) {
        nextVal = display + '0';
      } else {
        nextVal = display + digit;
      }
      setDisplay(nextVal);
    }

    // Cập nhật phép tính đang gõ
    if (storedOperand !== null && pendingOperator) {
      setFormulaText(`${formatCasioNumber(storedOperand)} ${pendingOperator} ${formatCasioNumber(nextVal)}`);
    }
  };

  // Dấu chấm thập phân
  const handleDot = () => {
    playClickSound();
    if (isError) return;

    let nextVal = display;
    if (isWaitingForOperand) {
      nextVal = '0.';
      setDisplay('0.');
      setIsWaitingForOperand(false);
    } else if (!display.includes('.')) {
      nextVal = display + '.';
      setDisplay(nextVal);
    }

    if (storedOperand !== null && pendingOperator) {
      setFormulaText(`${formatCasioNumber(storedOperand)} ${pendingOperator} ${formatCasioNumber(nextVal)}`);
    }
  };

  // Phím xóa lùi 1 chữ số
  const handleBackspace = () => {
    playClickSound();
    if (isError || isWaitingForOperand) return;

    let newDisp = '0';
    if (display.length > 1) {
      newDisp = display.slice(0, -1);
      if (newDisp === '-' || newDisp === '') newDisp = '0';
    }
    setDisplay(newDisp);

    if (storedOperand !== null && pendingOperator) {
      setFormulaText(`${formatCasioNumber(storedOperand)} ${pendingOperator} ${formatCasioNumber(newDisp)}`);
    }
  };

  // Phím C (Clear)
  const handleClear = () => {
    playClickSound();
    setDisplay('0');
    setIsError(false);
    if (storedOperand !== null && pendingOperator) {
      setFormulaText(`${formatCasioNumber(storedOperand)} ${pendingOperator}`);
    } else {
      setFormulaText('');
    }
  };

  // Phím AC / ON (All Clear)
  const handleAllClear = () => {
    playClickSound();
    setDisplay('0');
    setFormulaText('');
    setStoredOperand(null);
    setPendingOperator(null);
    setIsWaitingForOperand(false);
    setIsError(false);
    setIsGtRecalled(false);
  };

  // Đổi dấu +/-
  const handleToggleSign = () => {
    playClickSound();
    if (isError || display === '0') return;
    const num = parseFloat(display);
    const nextVal = String(-num);
    setDisplay(nextVal);

    if (storedOperand !== null && pendingOperator) {
      setFormulaText(`${formatCasioNumber(storedOperand)} ${pendingOperator} ${formatCasioNumber(nextVal)}`);
    }
  };

  // Căn bậc hai
  const handleSqrt = () => {
    playClickSound();
    if (isError) return;
    const val = parseFloat(display);
    if (val < 0) {
      setIsError(true);
      setDisplay('0');
      setFormulaText(`√(${formatCasioNumber(val)}) = ERROR`);
      return;
    }
    const res = Math.sqrt(val);
    const formatted = formatDecimalBySwitches(res);
    setDisplay(String(formatted).slice(0, 12));
    setFormulaText(`√(${formatCasioNumber(val)}) =`);
    setIsWaitingForOperand(true);
  };

  // Phần trăm (%)
  const handlePercent = () => {
    playClickSound();
    if (isError) return;
    const current = parseFloat(display);

    if (storedOperand !== null && pendingOperator) {
      let calc = 0;
      if (pendingOperator === '+' || pendingOperator === '-') {
        calc = (storedOperand * current) / 100;
      } else {
        calc = current / 100;
      }
      calc = formatDecimalBySwitches(calc);
      setDisplay(String(calc).slice(0, 12));
      setFormulaText(`${formatCasioNumber(storedOperand)} ${pendingOperator} ${formatCasioNumber(current)}% =`);
    } else {
      const calc = formatDecimalBySwitches(current / 100);
      setDisplay(String(calc).slice(0, 12));
      setFormulaText(`${formatCasioNumber(current)}% =`);
    }
    setIsWaitingForOperand(true);
  };

  // Thực hiện phép tính toán tử
  const handleOperator = (op: string) => {
    playClickSound();
    if (isError) return;

    const currentVal = parseFloat(display);

    if (storedOperand === null) {
      setStoredOperand(currentVal);
      setFormulaText(`${formatCasioNumber(currentVal)} ${op}`);
    } else if (pendingOperator && !isWaitingForOperand) {
      const result = executeOperation(storedOperand, currentVal, pendingOperator);
      if (result === null) {
        setIsError(true);
        setDisplay('0');
        setFormulaText(`${formatCasioNumber(storedOperand)} ${pendingOperator} 0 = ERROR`);
        return;
      }
      const formatted = formatDecimalBySwitches(result);
      setStoredOperand(formatted);
      setDisplay(String(formatted).slice(0, 12));
      setFormulaText(`${formatCasioNumber(formatted)} ${op}`);
    } else {
      setFormulaText(`${formatCasioNumber(storedOperand)} ${op}`);
    }

    setPendingOperator(op);
    setIsWaitingForOperand(true);
  };

  const executeOperation = (a: number, b: number, op: string): number | null => {
    switch (op) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '×':
      case '*':
        return a * b;
      case '÷':
      case '/':
        return b === 0 ? null : a / b;
      default:
        return b;
    }
  };

  // Phím Bằng (=)
  const handleEquals = () => {
    playClickSound();
    if (isError || storedOperand === null || !pendingOperator) return;

    const currentVal = parseFloat(display);
    const result = executeOperation(storedOperand, currentVal, pendingOperator);

    if (result === null) {
      setIsError(true);
      setDisplay('0');
      setFormulaText(`${formatCasioNumber(storedOperand)} ${pendingOperator} 0 = ERROR`);
      return;
    }

    const formatted = formatDecimalBySwitches(result);
    setDisplay(String(formatted).slice(0, 12));

    // Hiển thị phép tính đầy đủ bên dưới kết quả
    setFormulaText(`${formatCasioNumber(storedOperand)} ${pendingOperator} ${formatCasioNumber(currentVal)} =`);

    // Cộng dồn vào Grand Total (GT)
    setGrandTotal((prev) => prev + formatted);
    setHasGrandTotal(true);

    setStoredOperand(null);
    setPendingOperator(null);
    setIsWaitingForOperand(true);
  };

  // Phím MU (Mark Up / Mark Down)
  const handleMarkUp = () => {
    playClickSound();
    if (isError || storedOperand === null || !pendingOperator) return;
    const currentVal = parseFloat(display);
    let result = 0;

    if (pendingOperator === '÷' || pendingOperator === '/') {
      // Giá bán = Giá vốn / (1 - Lãi gộp%)
      result = storedOperand / (1 - currentVal / 100);
      setFormulaText(`${formatCasioNumber(storedOperand)} ÷ ${formatCasioNumber(currentVal)} MU =`);
    } else if (pendingOperator === '×' || pendingOperator === '*') {
      // Lợi nhuận = Giá vốn * (Lãi%)
      result = storedOperand + (storedOperand * currentVal) / 100;
      setFormulaText(`${formatCasioNumber(storedOperand)} × ${formatCasioNumber(currentVal)} MU =`);
    } else {
      result = storedOperand + currentVal;
      setFormulaText(`${formatCasioNumber(storedOperand)} + ${formatCasioNumber(currentVal)} MU =`);
    }

    const formatted = formatDecimalBySwitches(result);
    setDisplay(String(formatted).slice(0, 12));
    setGrandTotal((prev) => prev + formatted);
    setHasGrandTotal(true);
    setStoredOperand(null);
    setPendingOperator(null);
    setIsWaitingForOperand(true);
  };

  // Bộ nhớ Memory: M+, M-, MR, MC
  const handleMemoryAdd = () => {
    playClickSound();
    if (isError) return;
    const val = parseFloat(display);
    const newMem = memory + val;
    setMemory(newMem);
    setFormulaText(`M+ ${formatCasioNumber(val)} (M = ${formatCasioNumber(newMem)})`);
    setIsWaitingForOperand(true);
  };

  const handleMemorySubtract = () => {
    playClickSound();
    if (isError) return;
    const val = parseFloat(display);
    const newMem = memory - val;
    setMemory(newMem);
    setFormulaText(`M− ${formatCasioNumber(val)} (M = ${formatCasioNumber(newMem)})`);
    setIsWaitingForOperand(true);
  };

  const handleMemoryRecall = () => {
    playClickSound();
    if (isError) return;
    const formatted = formatDecimalBySwitches(memory);
    setDisplay(String(formatted).slice(0, 12));
    setFormulaText(`MR = ${formatCasioNumber(formatted)}`);
    setIsWaitingForOperand(true);
  };

  const handleMemoryClear = () => {
    playClickSound();
    setMemory(0);
    setFormulaText('MC (Đã xóa bộ nhớ)');
  };

  // Grand Total (GT)
  const handleGrandTotal = () => {
    playClickSound();
    if (isError) return;
    if (isGtRecalled) {
      // Nhấn lần 2 -> Xóa GT
      setGrandTotal(0);
      setHasGrandTotal(false);
      setIsGtRecalled(false);
      setDisplay('0');
      setFormulaText('GT Cleared');
    } else {
      // Nhấn lần 1 -> Gọi lại GT
      const formatted = formatDecimalBySwitches(grandTotal);
      setDisplay(String(formatted).slice(0, 12));
      setIsGtRecalled(true);
      setFormulaText(`GT = ${formatCasioNumber(formatted)}`);
      setIsWaitingForOperand(true);
    }
  };

  // Sao chép kết quả
  const handleCopy = () => {
    navigator.clipboard.writeText(display);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 1500);
    onCopyResult?.(display);
  };

  // Hỗ trợ gõ bàn phím máy tính
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Tránh bắt phím khi đang nhập form bên ngoài trừ khi focus vào máy tính
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === '.') {
        handleDot();
      } else if (e.key === '+') {
        handleOperator('+');
      } else if (e.key === '-') {
        handleOperator('-');
      } else if (e.key === '*') {
        handleOperator('×');
      } else if (e.key === '/') {
        e.preventDefault();
        handleOperator('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleAllClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, display, storedOperand, pendingOperator, isWaitingForOperand, isError]);

  if (!isOpen) return null;

  // Định dạng số hiển thị trên màn LCD theo phong cách Casio: Dấu phẩy ở mép trên phân cách hàng nghìn
  const renderCasioDisplay = () => {
    const isNegative = display.startsWith('-');
    const absDisp = isNegative ? display.slice(1) : display;
    const parts = absDisp.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1] !== undefined ? `.${parts[1]}` : '';

    // Thêm dấu phẩy đỉnh trên ' giữa các nhóm 3 chữ số
    let formattedInt = '';
    for (let i = 0; i < integerPart.length; i++) {
      const fromRight = integerPart.length - i;
      if (i > 0 && fromRight % 3 === 0) {
        formattedInt += "'";
      }
      formattedInt += integerPart[i];
    }

    return {
      isNegative,
      text: formattedInt + decimalPart,
    };
  };

  const lcdInfo = renderCasioDisplay();

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 2500,
        width: '320px',
        userSelect: 'none',
        animation: 'casioPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.5)) drop-shadow(0 4px 8px rgba(0,0,0,0.25))',
      }}
    >
      <style>{`
        @keyframes casioPopIn {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .casio-key {
          user-select: none;
          outline: none;
          border: none;
          cursor: pointer;
          transition: transform 0.05s ease, filter 0.05s ease, box-shadow 0.05s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
        }
        .casio-key:active {
          transform: translateY(2px) scale(0.98) !important;
          box-shadow: 0 1px 1px rgba(0, 0, 0, 0.4) !important;
        }
      `}</style>

      {/* ── THÂN MÁY CASIO DX-120B CHÍNH HÃNG ── */}
      <div
        style={{
          width: '100%',
          backgroundColor: '#27282c',
          borderRadius: '24px',
          boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 2px 4px rgba(0, 0, 0, 0.4)',
          border: '1px solid #1a1a1c',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* ── THANH ĐIỀU HƯỚNG / KÉO THẢ TRÊN CÙNG ── */}
        <div
          onMouseDown={handleMouseDown}
          style={{
            height: '28px',
            backgroundColor: '#1c1d20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            cursor: isDragging ? 'grabbing' : 'grab',
            borderBottom: '1px solid #151618',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }} />
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }} />
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', marginLeft: '6px', letterSpacing: '0.04em' }}>
              CASIO DX-120B
            </span>
          </div>

          <div className="calc-interactive" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Tắt âm thanh phím' : 'Bật âm thanh phím'}
              style={{
                background: 'transparent',
                border: 'none',
                color: soundEnabled ? '#38bdf8' : '#64748b',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {soundEnabled ? <VolumeUp size={14} /> : <VolumeMute size={14} />}
            </button>
            <button
              onClick={handleCopy}
              title="Sao chép kết quả"
              style={{
                background: 'transparent',
                border: 'none',
                color: copyFeedback ? '#10b981' : '#94a3b8',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Copy size={13} />
            </button>
            <button
              onClick={onClose}
              title="Đóng máy tính"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── NỬA TRÊN: MÀN HÌNH LCD, TẤM PIN MẶT TRỜI, LOGO VÀ SWITCHES ── */}
        <div style={{ padding: '14px 16px 10px 16px', backgroundColor: '#26272b' }}>
          {/* Hàng Logo Casio, Pin năng lượng, Model */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            {/* Logo CASIO */}
            <span
              style={{
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '1.05rem',
                letterSpacing: '0.08em',
                fontFamily: "'Arial Black', sans-serif",
              }}
            >
              CASIO
            </span>

            {/* Solar Cell (Tấm pin mặt trời màu nâu sẫm bóng) */}
            <div
              style={{
                width: '74px',
                height: '24px',
                borderRadius: '4px',
                background: 'linear-gradient(180deg, #422513 0%, #2b160a 100%)',
                border: '1.5px solid #1a1b1d',
                boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.8), 0 1px 0 rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-evenly',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ width: '1px', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)' }} />
              <div style={{ width: '1px', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)' }} />
            </div>

            {/* Model DX-120B 12 DIGITS */}
            <div style={{ textAlign: 'right', color: '#cbd5e1', lineHeight: 1 }}>
              <div style={{ fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.04em' }}>DX-120B</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: '2px', marginTop: '2px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 900, color: '#ffffff', lineHeight: 0.9 }}>12</span>
                <span style={{ fontSize: '0.5rem', fontWeight: 700, color: '#94a3b8', lineHeight: 0.9 }}>DIGITS</span>
              </div>
            </div>
          </div>

          {/* ── MÀN HÌNH LCD KỸ THUẬT SỐ 12 CHỮ SỐ (CÓ DÒNG PHÉP TÍNH BÊN DƯỚI) ── */}
          <div
            onClick={handleCopy}
            title="Nhấp vào màn hình để sao chép kết quả"
            style={{
              height: '70px',
              backgroundColor: '#cdd7c8',
              borderRadius: '6px',
              border: '2px solid #17181a',
              boxShadow: 'inset 0 3px 6px rgba(0, 0, 0, 0.35), 0 1px 1px rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              position: 'relative',
              cursor: 'pointer',
            }}
          >
            {/* Phản quang mặt kính góc trên */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '40%',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 100%)',
                pointerEvents: 'none',
              }}
            />

            {/* Cột chỉ báo trạng thái: GT, M, -, E */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '100%',
                fontSize: '0.5625rem',
                fontWeight: 900,
                color: '#1a2218',
                lineHeight: 1,
                paddingRight: '6px',
                zIndex: 2,
              }}
            >
              <span style={{ opacity: hasGrandTotal ? 1 : 0.08 }}>GT</span>
              <span style={{ opacity: memory !== 0 ? 1 : 0.08 }}>M</span>
              <span style={{ opacity: lcdInfo.isNegative ? 1 : 0.08, fontSize: '0.75rem', lineHeight: 0.8 }}>−</span>
              <span style={{ opacity: isError ? 1 : 0.08 }}>E</span>
            </div>

            {/* Khối hiển thị kết quả và phép tính nhỏ bên dưới */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-end',
                flex: 1,
                minWidth: 0,
                zIndex: 2,
              }}
            >
              {/* Số hiển thị LCD 7 đoạn to */}
              <div
                style={{
                  textAlign: 'right',
                  width: '100%',
                  fontSize: '1.85rem',
                  lineHeight: 1.1,
                  fontWeight: 800,
                  fontFamily: "'Courier New', Courier, monospace",
                  letterSpacing: '0.04em',
                  color: '#152016',
                  textShadow: '0 0 1px rgba(0,0,0,0.5)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'clip',
                }}
              >
                {copyFeedback ? (
                  <span style={{ fontSize: '1.25rem', color: '#166534', fontFamily: 'sans-serif', fontWeight: 700 }}>
                    ĐÃ SAO CHÉP!
                  </span>
                ) : (
                  lcdInfo.text
                )}
              </div>

              {/* Dòng chữ nhỏ hiển thị phép tính bên dưới kết quả */}
              <div
                style={{
                  textAlign: 'right',
                  width: '100%',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  fontFamily: "'Courier New', Courier, monospace",
                  letterSpacing: '0.02em',
                  color: '#415243',
                  height: '16px',
                  lineHeight: '16px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginTop: '1px',
                  opacity: formulaText ? 0.95 : 0,
                }}
                title={formulaText}
              >
                {formulaText || ' '}
              </div>
            </div>
          </div>

          {/* ── HAI CẦN GẠT TRƯỢT CƠ HỌC (SLIDE SWITCHES) ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '10px',
              padding: '0 8px',
            }}
          >
            {/* Cần gạt 1: Làm tròn (CUT - UP - 5/4) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.5625rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.02em' }}>
                <span style={{ color: roundingMode === 'CUT' ? '#f8fafc' : '#64748b' }}>CUT</span>
                <span style={{ color: roundingMode === 'UP' ? '#f8fafc' : '#64748b' }}>UP</span>
                <span style={{ color: roundingMode === '5/4' ? '#f8fafc' : '#64748b' }}>5/4</span>
              </div>
              {/* Rãnh gạt cơ khí */}
              <div
                className="calc-interactive"
                style={{
                  width: '52px',
                  height: '10px',
                  backgroundColor: '#141517',
                  borderRadius: '5px',
                  position: 'relative',
                  marginTop: '3px',
                  cursor: 'pointer',
                  border: '1px solid #0f1011',
                }}
                onClick={() => {
                  playClickSound();
                  setRoundingMode((prev) => (prev === 'CUT' ? 'UP' : prev === 'UP' ? '5/4' : 'CUT'));
                }}
              >
                {/* Nút gạt nhựa đen khía nổi */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-3px',
                    left: roundingMode === 'CUT' ? '2px' : roundingMode === 'UP' ? '18px' : '34px',
                    width: '14px',
                    height: '14px',
                    backgroundColor: '#2b2d32',
                    borderRadius: '2px',
                    border: '1px solid #474a51',
                    boxShadow: '0 2px 3px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                    transition: 'left 0.15s ease',
                    backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, #1a1a1a 2px, #1a1a1a 3px)',
                  }}
                />
              </div>
            </div>

            {/* Cần gạt 2: Số chữ số thập phân (F - 4 - 2 - 1 - 0 - ADD2) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '6px', fontSize: '0.5625rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.02em' }}>
                <span style={{ color: decimalMode === 'F' ? '#f8fafc' : '#64748b' }}>F</span>
                <span style={{ color: decimalMode === '4' ? '#f8fafc' : '#64748b' }}>4</span>
                <span style={{ color: decimalMode === '2' ? '#f8fafc' : '#64748b' }}>2</span>
                <span style={{ color: decimalMode === '1' ? '#f8fafc' : '#64748b' }}>1</span>
                <span style={{ color: decimalMode === '0' ? '#f8fafc' : '#64748b' }}>0</span>
                <span style={{ color: decimalMode === 'ADD2' ? '#f8fafc' : '#64748b' }}>ADD₂</span>
              </div>
              {/* Rãnh gạt cơ khí */}
              <div
                className="calc-interactive"
                style={{
                  width: '94px',
                  height: '10px',
                  backgroundColor: '#141517',
                  borderRadius: '5px',
                  position: 'relative',
                  marginTop: '3px',
                  cursor: 'pointer',
                  border: '1px solid #0f1011',
                }}
                onClick={() => {
                  playClickSound();
                  const modes: DecimalMode[] = ['F', '4', '2', '1', '0', 'ADD2'];
                  const curIdx = modes.indexOf(decimalMode);
                  setDecimalMode(modes[(curIdx + 1) % modes.length]);
                }}
              >
                {/* Nút gạt */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-3px',
                    left:
                      decimalMode === 'F'
                        ? '2px'
                        : decimalMode === '4'
                        ? '18px'
                        : decimalMode === '2'
                        ? '36px'
                        : decimalMode === '1'
                        ? '54px'
                        : decimalMode === '0'
                        ? '70px'
                        : '80px',
                    width: '14px',
                    height: '14px',
                    backgroundColor: '#2b2d32',
                    borderRadius: '2px',
                    border: '1px solid #474a51',
                    boxShadow: '0 2px 3px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                    transition: 'left 0.15s ease',
                    backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, #1a1a1a 2px, #1a1a1a 3px)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── NỬA DƯỚI: MẶT KIM LOẠI BẠC VÀ BÀN PHÍM CASIO DX-120B ── */}
        <div
          style={{
            backgroundColor: '#c4c6cb',
            background: 'linear-gradient(180deg, #d3d5d9 0%, #b8babc 100%)',
            padding: '12px 14px 18px 14px',
            borderTop: '2px solid #8e9095',
            borderBottomLeftRadius: '24px',
            borderBottomRightRadius: '24px',
          }}
        >
          {/* LƯỚI PHÍM BẤM 6 CỘT CHUẨN CASIO */}
          <div
            className="calc-interactive"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gridTemplateRows: 'repeat(5, 38px)',
              gap: '6px',
            }}
          >
            {/* ── HÀNG 1: MU, M+, M-, MR, MC, GT ── */}
            <button
              className="casio-key"
              onClick={handleMarkUp}
              style={{
                backgroundColor: '#383a40',
                color: '#ffffff',
                fontSize: '0.8125rem',
                fontWeight: 700,
                boxShadow: '0 3px 0 #1e1f23, 0 4px 6px rgba(0,0,0,0.3)',
              }}
            >
              MU
            </button>
            <button
              className="casio-key"
              onClick={handleMemoryAdd}
              style={{
                backgroundColor: '#383a40',
                color: '#ffffff',
                fontSize: '0.8125rem',
                fontWeight: 700,
                boxShadow: '0 3px 0 #1e1f23, 0 4px 6px rgba(0,0,0,0.3)',
              }}
            >
              M+
            </button>
            <button
              className="casio-key"
              onClick={handleMemorySubtract}
              style={{
                backgroundColor: '#383a40',
                color: '#ffffff',
                fontSize: '0.8125rem',
                fontWeight: 700,
                boxShadow: '0 3px 0 #1e1f23, 0 4px 6px rgba(0,0,0,0.3)',
              }}
            >
              M−
            </button>
            <button
              className="casio-key"
              onClick={handleMemoryRecall}
              style={{
                backgroundColor: '#383a40',
                color: '#ffffff',
                fontSize: '0.8125rem',
                fontWeight: 700,
                boxShadow: '0 3px 0 #1e1f23, 0 4px 6px rgba(0,0,0,0.3)',
              }}
            >
              MR
            </button>
            <button
              className="casio-key"
              onClick={handleMemoryClear}
              style={{
                backgroundColor: '#383a40',
                color: '#ffffff',
                fontSize: '0.8125rem',
                fontWeight: 700,
                boxShadow: '0 3px 0 #1e1f23, 0 4px 6px rgba(0,0,0,0.3)',
              }}
            >
              MC
            </button>
            <button
              className="casio-key"
              onClick={handleGrandTotal}
              style={{
                backgroundColor: '#383a40',
                color: '#ffffff',
                fontSize: '0.8125rem',
                fontWeight: 700,
                boxShadow: '0 3px 0 #1e1f23, 0 4px 6px rgba(0,0,0,0.3)',
              }}
            >
              GT
            </button>

            {/* ── HÀNG 2: AC/ON, 7, 8, 9, %, √ ── */}
            <button
              className="casio-key"
              onClick={handleAllClear}
              style={{
                backgroundColor: '#42454c',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 800,
                boxShadow: '0 3px 0 #202226, 0 4px 6px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                lineHeight: 1,
              }}
            >
              <span>AC</span>
              <span style={{ fontSize: '0.5rem', textDecoration: 'overline', marginTop: '1px' }}>ON</span>
            </button>
            <button
              className="casio-key"
              onClick={() => handleDigit('7')}
              style={{
                backgroundColor: '#1a1b1e',
                color: '#ffffff',
                fontSize: '1.25rem',
                fontWeight: 800,
                boxShadow: '0 3px 0 #0d0d0f, 0 4px 6px rgba(0,0,0,0.35)',
              }}
            >
              7
            </button>
            <button
              className="casio-key"
              onClick={() => handleDigit('8')}
              style={{
                backgroundColor: '#1a1b1e',
                color: '#ffffff',
                fontSize: '1.25rem',
                fontWeight: 800,
                boxShadow: '0 3px 0 #0d0d0f, 0 4px 6px rgba(0,0,0,0.35)',
              }}
            >
              8
            </button>
            <button
              className="casio-key"
              onClick={() => handleDigit('9')}
              style={{
                backgroundColor: '#1a1b1e',
                color: '#ffffff',
                fontSize: '1.25rem',
                fontWeight: 800,
                boxShadow: '0 3px 0 #0d0d0f, 0 4px 6px rgba(0,0,0,0.35)',
              }}
            >
              9
            </button>
            <button
              className="casio-key"
              onClick={handlePercent}
              style={{
                backgroundColor: '#383a40',
                color: '#ffffff',
                fontSize: '1.05rem',
                fontWeight: 700,
                boxShadow: '0 3px 0 #1e1f23, 0 4px 6px rgba(0,0,0,0.3)',
              }}
            >
              %
            </button>
            <button
              className="casio-key"
              onClick={handleSqrt}
              style={{
                backgroundColor: '#383a40',
                color: '#ffffff',
                fontSize: '1.05rem',
                fontWeight: 700,
                boxShadow: '0 3px 0 #1e1f23, 0 4px 6px rgba(0,0,0,0.3)',
              }}
            >
              √
            </button>

            {/* ── HÀNG 3: +/-, 4, 5, 6, ×, ÷ ── */}
            <button
              className="casio-key"
              onClick={handleToggleSign}
              style={{
                backgroundColor: '#383a40',
                color: '#ffffff',
                fontSize: '1.05rem',
                fontWeight: 700,
                boxShadow: '0 3px 0 #1e1f23, 0 4px 6px rgba(0,0,0,0.3)',
              }}
            >
              +/–
            </button>
            <button
              className="casio-key"
              onClick={() => handleDigit('4')}
              style={{
                backgroundColor: '#1a1b1e',
                color: '#ffffff',
                fontSize: '1.25rem',
                fontWeight: 800,
                boxShadow: '0 3px 0 #0d0d0f, 0 4px 6px rgba(0,0,0,0.35)',
              }}
            >
              4
            </button>
            <button
              className="casio-key"
              onClick={() => handleDigit('5')}
              style={{
                backgroundColor: '#1a1b1e',
                color: '#ffffff',
                fontSize: '1.25rem',
                fontWeight: 800,
                boxShadow: '0 3px 0 #0d0d0f, 0 4px 6px rgba(0,0,0,0.35)',
              }}
            >
              5
            </button>
            <button
              className="casio-key"
              onClick={() => handleDigit('6')}
              style={{
                backgroundColor: '#1a1b1e',
                color: '#ffffff',
                fontSize: '1.25rem',
                fontWeight: 800,
                boxShadow: '0 3px 0 #0d0d0f, 0 4px 6px rgba(0,0,0,0.35)',
              }}
            >
              6
            </button>
            <button
              className="casio-key"
              onClick={() => handleOperator('×')}
              style={{
                backgroundColor: '#383a40',
                color: '#ffffff',
                fontSize: '1.25rem',
                fontWeight: 700,
                boxShadow: '0 3px 0 #1e1f23, 0 4px 6px rgba(0,0,0,0.3)',
              }}
            >
              ×
            </button>
            <button
              className="casio-key"
              onClick={() => handleOperator('÷')}
              style={{
                backgroundColor: '#383a40',
                color: '#ffffff',
                fontSize: '1.25rem',
                fontWeight: 700,
                boxShadow: '0 3px 0 #1e1f23, 0 4px 6px rgba(0,0,0,0.3)',
              }}
            >
              ÷
            </button>

            {/* ── HÀNG 4: ▶ (Backspace), 1, 2, 3, + (rowSpan 2), − ── */}
            <button
              className="casio-key"
              onClick={handleBackspace}
              style={{
                backgroundColor: '#383a40',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 700,
                boxShadow: '0 3px 0 #1e1f23, 0 4px 6px rgba(0,0,0,0.3)',
              }}
            >
              ▶
            </button>
            <button
              className="casio-key"
              onClick={() => handleDigit('1')}
              style={{
                backgroundColor: '#1a1b1e',
                color: '#ffffff',
                fontSize: '1.25rem',
                fontWeight: 800,
                boxShadow: '0 3px 0 #0d0d0f, 0 4px 6px rgba(0,0,0,0.35)',
              }}
            >
              1
            </button>
            <button
              className="casio-key"
              onClick={() => handleDigit('2')}
              style={{
                backgroundColor: '#1a1b1e',
                color: '#ffffff',
                fontSize: '1.25rem',
                fontWeight: 800,
                boxShadow: '0 3px 0 #0d0d0f, 0 4px 6px rgba(0,0,0,0.35)',
              }}
            >
              2
            </button>
            <button
              className="casio-key"
              onClick={() => handleDigit('3')}
              style={{
                backgroundColor: '#1a1b1e',
                color: '#ffffff',
                fontSize: '1.25rem',
                fontWeight: 800,
                boxShadow: '0 3px 0 #0d0d0f, 0 4px 6px rgba(0,0,0,0.35)',
              }}
            >
              3
            </button>
            {/* Phím + lớn (kéo dài xuống hàng 5) */}
            <button
              className="casio-key"
              onClick={() => handleOperator('+')}
              style={{
                gridRow: 'span 2',
                backgroundColor: '#383a40',
                color: '#ffffff',
                fontSize: '1.5rem',
                fontWeight: 700,
                boxShadow: '0 3px 0 #1e1f23, 0 4px 6px rgba(0,0,0,0.3)',
                height: 'calc(100% - 3px)',
              }}
            >
              +
            </button>
            <button
              className="casio-key"
              onClick={() => handleOperator('-')}
              style={{
                backgroundColor: '#383a40',
                color: '#ffffff',
                fontSize: '1.35rem',
                fontWeight: 700,
                boxShadow: '0 3px 0 #1e1f23, 0 4px 6px rgba(0,0,0,0.3)',
              }}
            >
              −
            </button>

            {/* ── HÀNG 5: C (màu cam Casio), 0, 00, ., (+ nối từ trên), = ── */}
            <button
              className="casio-key"
              onClick={handleClear}
              style={{
                backgroundColor: '#ea8a26',
                background: 'linear-gradient(180deg, #ea8a26 0%, #c8690e 100%)',
                color: '#ffffff',
                fontSize: '1.25rem',
                fontWeight: 800,
                boxShadow: '0 3px 0 #934c06, 0 4px 6px rgba(0,0,0,0.3)',
              }}
            >
              C
            </button>
            <button
              className="casio-key"
              onClick={() => handleDigit('0')}
              style={{
                backgroundColor: '#1a1b1e',
                color: '#ffffff',
                fontSize: '1.25rem',
                fontWeight: 800,
                boxShadow: '0 3px 0 #0d0d0f, 0 4px 6px rgba(0,0,0,0.35)',
              }}
            >
              0
            </button>
            <button
              className="casio-key"
              onClick={() => handleDigit('00')}
              style={{
                backgroundColor: '#1a1b1e',
                color: '#ffffff',
                fontSize: '1.05rem',
                fontWeight: 800,
                boxShadow: '0 3px 0 #0d0d0f, 0 4px 6px rgba(0,0,0,0.35)',
              }}
            >
              00
            </button>
            <button
              className="casio-key"
              onClick={handleDot}
              style={{
                backgroundColor: '#1a1b1e',
                color: '#ffffff',
                fontSize: '1.5rem',
                fontWeight: 800,
                boxShadow: '0 3px 0 #0d0d0f, 0 4px 6px rgba(0,0,0,0.35)',
                lineHeight: 0.5,
              }}
            >
              •
            </button>
            {/* Phím + đã chiếm vị trí cột 5 */}
            <button
              className="casio-key"
              onClick={handleEquals}
              style={{
                backgroundColor: '#383a40',
                color: '#ffffff',
                fontSize: '1.35rem',
                fontWeight: 700,
                boxShadow: '0 3px 0 #1e1f23, 0 4px 6px rgba(0,0,0,0.3)',
              }}
            >
              =
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
