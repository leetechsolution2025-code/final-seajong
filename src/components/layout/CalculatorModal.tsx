import React, { useState, useEffect } from 'react';
import { X, Delete, Calculator as CalcIcon } from 'lucide-react';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({ isOpen, onClose }) => {
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        inputDigit(e.key);
      } else if (['+', '-', '*', '/'].includes(e.key)) {
        e.preventDefault();
        performOperation(e.key);
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        performOperation('=');
      } else if (e.key === '.' || e.key === ',') {
        e.preventDefault();
        inputDecimal();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, display, prevValue, operator, waitingForOperand]);

  if (!isOpen) return null;

  const clearAll = () => {
    setDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleBackspace = () => {
    if (waitingForOperand) return;
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const performOperation = (nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(inputValue);
    } else if (operator) {
      const currentValue = prevValue || 0;
      let newValue = currentValue;

      switch (operator) {
        case '+':
          newValue = currentValue + inputValue;
          break;
        case '-':
          newValue = currentValue - inputValue;
          break;
        case '*':
          newValue = currentValue * inputValue;
          break;
        case '/':
          newValue = inputValue !== 0 ? currentValue / inputValue : 0;
          break;
        default:
          break;
      }

      setPrevValue(newValue);
      setDisplay(String(Number(newValue.toFixed(6))));
    }

    setWaitingForOperand(true);
    setOperator(nextOperator === '=' ? null : nextOperator);
  };

  const formatNumberDisplay = (numStr: string) => {
    const parts = numStr.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-2xs"
      onClick={onClose}
    >
      <div 
        className="w-72 bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-4 text-white animate-dropdown overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <CalcIcon className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-semibold text-slate-300">Máy tính Seajong (F2)</span>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Display Screen */}
        <div className="my-3 p-3 bg-slate-950/90 rounded-2xl border border-slate-800/80 text-right">
          <div className="text-[10px] text-slate-500 font-mono h-4 truncate">
            {prevValue !== null && `${prevValue} ${operator || ''}`}
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-white truncate">
            {formatNumberDisplay(display)}
          </div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-4 gap-2 text-sm font-semibold">
          <button
            type="button"
            onClick={clearAll}
            className="col-span-2 p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 transition-colors"
          >
            AC
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center transition-colors"
          >
            <Delete className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => performOperation('/')}
            className={`p-2.5 rounded-xl border transition-colors ${
              operator === '/' ? 'bg-sky-600 text-white border-sky-500' : 'bg-slate-800 text-sky-400 border-slate-700 hover:bg-slate-700'
            }`}
          >
            ÷
          </button>

          {['7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => inputDigit(d)}
              className="p-2.5 rounded-xl bg-slate-800/80 text-slate-100 hover:bg-slate-700 transition-colors font-mono"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={() => performOperation('*')}
            className={`p-2.5 rounded-xl border transition-colors ${
              operator === '*' ? 'bg-sky-600 text-white border-sky-500' : 'bg-slate-800 text-sky-400 border-slate-700 hover:bg-slate-700'
            }`}
          >
            ×
          </button>

          {['4', '5', '6'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => inputDigit(d)}
              className="p-2.5 rounded-xl bg-slate-800/80 text-slate-100 hover:bg-slate-700 transition-colors font-mono"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={() => performOperation('-')}
            className={`p-2.5 rounded-xl border transition-colors ${
              operator === '-' ? 'bg-sky-600 text-white border-sky-500' : 'bg-slate-800 text-sky-400 border-slate-700 hover:bg-slate-700'
            }`}
          >
            −
          </button>

          {['1', '2', '3'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => inputDigit(d)}
              className="p-2.5 rounded-xl bg-slate-800/80 text-slate-100 hover:bg-slate-700 transition-colors font-mono"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={() => performOperation('+')}
            className={`p-2.5 rounded-xl border transition-colors ${
              operator === '+' ? 'bg-sky-600 text-white border-sky-500' : 'bg-slate-800 text-sky-400 border-slate-700 hover:bg-slate-700'
            }`}
          >
            +
          </button>

          <button
            type="button"
            onClick={() => inputDigit('0')}
            className="col-span-2 p-2.5 rounded-xl bg-slate-800/80 text-slate-100 hover:bg-slate-700 transition-colors font-mono"
          >
            0
          </button>
          <button
            type="button"
            onClick={inputDecimal}
            className="p-2.5 rounded-xl bg-slate-800/80 text-slate-100 hover:bg-slate-700 transition-colors font-mono"
          >
            .
          </button>
          <button
            type="button"
            onClick={() => performOperation('=')}
            className="p-2.5 rounded-xl bg-sky-600 text-white hover:bg-sky-500 transition-colors shadow-md shadow-sky-600/30"
          >
            =
          </button>
        </div>
      </div>
    </div>
  );
};
