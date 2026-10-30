import React, { useState, useEffect } from "react";
import { Offcanvas } from "@/components/common/Offcanvas";
import { Input } from "@/components/common/Input";
import { Select } from "@/components/common/Select";
import { Button } from "@/components/common/Button";
import { CheckCircle } from "react-bootstrap-icons";

interface Props {
  show: boolean;
  onClose: () => void;
  itemName: string;
  initialCost: number;
  costLabel?: string;
  initialPrice: number;
  initialMarginPct?: number;
  initialMarginType?: string;
  isBulkOnly?: boolean;
  onSaveSingle: (finalPrice: number, marginPct: number, marginType: string) => Promise<void>;
  onSaveAll?: (marginPct: number, marginType: string) => Promise<void>;
  applyAllLabel?: string;
}

export default function UpdatePriceOffcanvas({
  show,
  onClose,
  itemName,
  initialCost,
  costLabel = "Giá vốn vật tư",
  initialPrice,
  initialMarginPct,
  initialMarginType,
  isBulkOnly,
  onSaveSingle,
  onSaveAll,
  applyAllLabel,
}: Props) {
  const [priceSetup, setPriceSetup] = useState({
    cost: initialCost,
    marginPct: initialMarginPct || 30,
    marginType: initialMarginType || "cost",
    finalPrice: 0,
    calculatedPrice: initialPrice,
  });
  const [finalPriceInput, setFinalPriceInput] = useState("");
  const [applyAllPrice, setApplyAllPrice] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (show) {
      const marginPct = initialMarginPct !== undefined ? initialMarginPct : 30;
      const marginType = initialMarginType || "cost";

      const calculatedPrice =
        marginType === "revenue"
          ? marginPct < 100
            ? Math.round(initialCost / (1 - marginPct / 100) / 1000) * 1000
            : 0
          : Math.round((initialCost * (1 + marginPct / 100)) / 1000) * 1000;

      setPriceSetup({
        cost: initialCost,
        marginPct,
        marginType,
        finalPrice: 0,
        calculatedPrice,
      });
      setFinalPriceInput("");
      setApplyAllPrice(false);
    }
  }, [show, initialCost, initialPrice, itemName, initialMarginPct, initialMarginType]);

  const hasFinalPrice = finalPriceInput.trim() !== "" && Number(finalPriceInput) > 0;
  const isSaveDisabled = !isBulkOnly && !hasFinalPrice;

  return (
    <Offcanvas
      isOpen={show}
      onClose={onClose}
      title="Tính và cập nhật giá bán"
      description={itemName || "Thiết lập tỷ suất lợi nhuận và giá bán thành phẩm"}
      icon={<i className="bi bi-tag text-lg" />}
      width="400px"
      footer={
        <div className="flex flex-col gap-2.5 w-full">
          {onSaveAll && (
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                checked={isBulkOnly ? true : applyAllPrice}
                disabled={isBulkOnly}
                onChange={(e) => setApplyAllPrice(e.target.checked)}
              />
              <span>{applyAllLabel || "Áp dụng cho tất cả sản phẩm"}</span>
            </label>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="md" onClick={onClose} disabled={isProcessing}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<CheckCircle size={15} />}
              disabled={isSaveDisabled || isProcessing}
              isLoading={isProcessing}
              onClick={async () => {
                if (isSaveDisabled) return;
                setIsProcessing(true);
                try {
                  if ((applyAllPrice || isBulkOnly) && onSaveAll) {
                    await onSaveAll(priceSetup.marginPct, priceSetup.marginType);
                  } else {
                    await onSaveSingle(
                      priceSetup.finalPrice,
                      priceSetup.marginPct,
                      priceSetup.marginType
                    );
                  }
                } finally {
                  setIsProcessing(false);
                }
              }}
            >
              Lưu giá bán
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3.5 text-[13px]">
        <div className="grid grid-cols-12 gap-3">
          {!isBulkOnly && (
            <div className="col-span-6">
              <Input
                label={costLabel}
                disabled
                value={`${Math.round(priceSetup.cost).toLocaleString("vi-VN")} đ`}
              />
            </div>
          )}
          <div className={isBulkOnly ? "col-span-12" : "col-span-6"}>
            <Input
              label="Lợi nhuận kỳ vọng (%)"
              type="number"
              step="0.1"
              value={priceSetup.marginPct}
              onChange={(e) => {
                const val = Number(e.target.value);
                const calculated =
                  priceSetup.marginType === "revenue"
                    ? val < 100
                      ? Math.round(priceSetup.cost / (1 - val / 100) / 1000) * 1000
                      : 0
                    : Math.round((priceSetup.cost * (1 + val / 100)) / 1000) * 1000;
                setPriceSetup((prev) => ({
                  ...prev,
                  marginPct: val,
                  calculatedPrice: calculated,
                }));
              }}
            />
          </div>
        </div>

        <Select
          label="Phương pháp tính lợi nhuận"
          value={priceSetup.marginType}
          onChange={(e) => {
            const newType = e.target.value;
            const calculated =
              newType === "revenue"
                ? priceSetup.marginPct < 100
                  ? Math.round(priceSetup.cost / (1 - priceSetup.marginPct / 100) / 1000) * 1000
                  : 0
                : Math.round((priceSetup.cost * (1 + priceSetup.marginPct / 100)) / 1000) * 1000;
            setPriceSetup((prev) => ({
              ...prev,
              marginType: newType,
              calculatedPrice: calculated,
            }));
          }}
          options={[
            {
              value: "cost",
              label: "Trên giá vốn (Giá bán = Giá vốn × (1 + %Lợi nhuận))",
            },
            {
              value: "revenue",
              label: "Trên doanh thu (Giá bán = Giá vốn / (1 - %Lợi nhuận))",
            },
          ]}
        />

        {!isBulkOnly && (
          <>
            <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200/80 flex items-center justify-between">
              <span className="text-xs font-semibold text-sky-800">Giá bán tính toán đề xuất:</span>
              <span className="text-sm font-extrabold text-sky-700 font-mono">
                {(priceSetup.calculatedPrice || 0).toLocaleString("vi-VN")} đ
              </span>
            </div>

            <div>
              <Input
                label="Giá bán chính thức áp dụng *"
                placeholder="Nhập giá bán chính thức..."
                suffix="đ"
                value={finalPriceInput ? Number(finalPriceInput).toLocaleString("vi-VN") : ""}
                onChange={(e) => {
                  const rawDigits = e.target.value.replace(/[^0-9]/g, "");
                  setFinalPriceInput(rawDigits);
                  setPriceSetup((prev) => ({
                    ...prev,
                    finalPrice: rawDigits ? Number(rawDigits) : 0,
                  }));
                }}
              />
              <div className="text-[11px] text-slate-500 mt-1.5 font-mono bg-slate-50 p-2 rounded-lg border border-slate-200/70">
                <strong>Công thức:</strong>{" "}
                {priceSetup.marginType === "revenue"
                  ? `${priceSetup.cost.toLocaleString("vi-VN")} đ / (1 - ${priceSetup.marginPct}%) = ${(priceSetup.calculatedPrice || 0).toLocaleString("vi-VN")} đ`
                  : `${priceSetup.cost.toLocaleString("vi-VN")} đ × (1 + ${priceSetup.marginPct}%) = ${(priceSetup.calculatedPrice || 0).toLocaleString("vi-VN")} đ`}
              </div>
            </div>
          </>
        )}
      </div>
    </Offcanvas>
  );
}
