import React, { useState, useEffect } from "react";
import { StandardPage } from "../../components/layout/StandardPage";
import { BrandButton } from "../../components/ui/BrandButton";

export const MarketingMarketAnalysisPage: React.FC = () => {
  const [formData, setFormData] = useState({
    campaignName: "",
    campaignDesc: "",
    products: [] as string[],
    targetSegment: "Cao cấp",
    channels: [] as string[],
    timeline: "",
    budget: "",
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"strategy" | "competitor" | "supply" | "chat">("strategy");

  // Dynamic competitors count & USD rate
  const [competitorsCount, setCompetitorsCount] = useState<number | null>(null);
  const [competitorNames, setCompetitorNames] = useState<string>("TOTO, Inax, ENIC...");
  const [usdRate, setUsdRate] = useState<number | null>(25460);

  const [dbCategories, setDbCategories] = useState<string[]>([
    "Sen vòi PVD",
    "Smart Toilet",
    "Smart Shower",
    "Chậu tích hợp",
    "Bồn tắm massage",
    "Gương LED cảm ứng"
  ]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Chatbot state
  const [chatMessages, setChatMessages] = useState<any[]>([
    {
      role: "assistant",
      content: "Xin chào! Tôi là Trợ lý AI Phân tích thị trường của Seajong. Bạn có câu hỏi nào về đối thủ cạnh tranh (TOTO, Inax, ENIC...), xu hướng tiêu dùng thiết bị phòng tắm hay chiến lược giá tại Việt Nam không?"
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  useEffect(() => {
    // Fetch competitors
    fetch("/api/competitors")
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setCompetitorsCount(data.data.length);
          const names = data.data.slice(0, 3).map((c: any) => c.name).join(", ");
          setCompetitorNames(names || "TOTO, Inax, ENIC");
        } else if (Array.isArray(data)) {
          setCompetitorsCount(data.length);
          const names = data.slice(0, 3).map((c: any) => c.name).join(", ");
          setCompetitorNames(names || "TOTO, Inax, ENIC");
        }
      })
      .catch(() => {
        setCompetitorsCount(5);
        setCompetitorNames("TOTO, Inax, ENIC...");
      });

    // Fetch USD rate
    fetch("/api/market-analysis/usd-rate")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.rate) {
          setUsdRate(data.rate);
        }
      })
      .catch(() => {
        setUsdRate(25460);
      });
  }, []);

  const handleProductChange = (prod: string) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.includes(prod)
        ? prev.products.filter(p => p !== prod)
        : [...prev.products, prod]
    }));
  };

  const handleChannelChange = (chan: string) => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.includes(chan)
        ? prev.channels.filter(c => c !== chan)
        : [...prev.channels, chan]
    }));
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/market-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignName: formData.campaignName,
          campaignDesc: formData.campaignDesc,
          products: formData.products,
          targetSegment: formData.targetSegment,
          channels: formData.channels,
          timeline: formData.timeline,
          budget: formData.budget,
        })
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        setActiveTab("strategy");
      } else {
        alert("Lỗi phân tích: " + (data.error || "Không rõ nguyên nhân."));
      }
    } catch (err) {
      alert("Lỗi kết nối khi phân tích chiến dịch.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendChat = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || sendingChat) return;

    const userMsg = { role: "user", content: text };
    setChatMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage("");
    setSendingChat(true);

    try {
      const res = await fetch("/api/market-analysis/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...chatMessages, userMsg] })
      });
      const data = await res.json();
      if (data.success) {
        setChatMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setChatMessages(prev => [...prev, { role: "assistant", content: "Lỗi kết nối AI phân tích." }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Lỗi kết nối mạng." }]);
    } finally {
      setSendingChat(false);
    }
  };

  return (
    <StandardPage
      title="Phân tích thị trường"
      description="Nghiên cứu quy mô ngành, theo dõi động thái giá đối thủ và phân tích chiến lược phát triển thị trường Seajong"
      icon="bi-graph-up"
      color="indigo"
      badge="MARKETING SEAJONG"
      useCard={false}
      background="#F8FAFC"
    >
      <div className="space-y-4 p-1">
        {/* Macro Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <i className="bi bi-bank text-lg" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                Quy mô thị trường VN
              </span>
              <span className="text-xl font-black text-slate-900 block leading-tight">~1.6 Tỷ USD</span>
              <span className="text-[11px] text-slate-500">Khoảng 40.000 tỷ đồng/năm</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <i className="bi bi-graph-up-arrow text-lg" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                Tốc độ tăng trưởng
              </span>
              <span className="text-xl font-black text-slate-900 block leading-tight">+6.8% / năm</span>
              <span className="text-[11px] text-emerald-600 font-semibold">Tăng trưởng kép (CAGR)</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <i className="bi bi-currency-exchange text-lg" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                Tỷ giá USD / VND
              </span>
              <span className="text-xl font-black text-slate-900 block leading-tight">
                {usdRate ? `${usdRate.toLocaleString("vi-VN")} đ` : '25.460 đ'}
              </span>
              <span className="text-[11px] text-amber-600 font-semibold">Cập nhật sàn tự do</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <i className="bi bi-binoculars text-lg" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                Đối thủ đang theo dõi
              </span>
              <span className="text-xl font-black text-slate-900 block leading-tight">
                {competitorsCount !== null ? `${competitorsCount} đối thủ` : '5 đối thủ'}
              </span>
              <span className="text-[11px] text-slate-500 truncate max-w-[170px] block" title={competitorNames}>
                {competitorNames}
              </span>
            </div>
          </div>
        </div>

        {/* Main Work Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Cột trái: Cấu hình chiến dịch (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="border-b border-slate-100 pb-3 mb-3.5">
                <h4 className="m-0 text-xs font-bold text-indigo-700 uppercase tracking-wide flex items-center gap-1.5">
                  <i className="bi bi-sliders2" />
                  <span>Cấu hình chiến dịch phân tích</span>
                </h4>
                <p className="m-0 text-[11px] text-slate-500 mt-0.5">
                  Thiết lập thông số để AI đối chiếu với thị trường thực tế
                </p>
              </div>

              <form id="campaign-form" onSubmit={handleAnalyze} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tên chiến dịch</label>
                  <input
                    type="text"
                    required
                    value={formData.campaignName}
                    onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mô tả mục tiêu chiến dịch</label>
                  <textarea
                    rows={3}
                    required
                    value={formData.campaignDesc}
                    onChange={(e) => setFormData({ ...formData, campaignDesc: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="relative">
                  <label className="font-bold text-slate-700 block mb-1">Dòng sản phẩm trọng tâm</label>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-left flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate">
                      {formData.products.length > 0 ? formData.products.join(", ") : "Chọn dòng sản phẩm..."}
                    </span>
                    <i className="bi bi-chevron-down text-slate-400 text-[10px]" />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 p-2 space-y-1 max-h-40 overflow-y-auto">
                      {dbCategories.map((p) => {
                        const active = formData.products.includes(p);
                        return (
                          <div
                            key={p}
                            onClick={() => handleProductChange(p)}
                            className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs"
                          >
                            <input type="checkbox" checked={active} readOnly className="rounded" />
                            <span className={active ? "font-bold text-indigo-600" : "text-slate-700"}>{p}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Phân khúc</label>
                    <select
                      value={formData.targetSegment}
                      onChange={(e) => setFormData({ ...formData, targetSegment: e.target.value })}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs outline-none"
                    >
                      <option value="Cao cấp">Cao cấp</option>
                      <option value="Trung cấp">Trung cấp</option>
                      <option value="Căn hộ dự án">Căn hộ dự án</option>
                      <option value="Khách sạn/Resort">Khách sạn/Resort</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Thời gian</label>
                    <input
                      type="text"
                      value={formData.timeline}
                      onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kênh phân phối chủ lực</label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Showroom", "Đại lý", "Nhà thầu/KTS", "Digital Marketing", "Sàn TMĐT"].map((ch) => {
                      const active = formData.channels.includes(ch);
                      return (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => handleChannelChange(ch)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                            active
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {ch}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </form>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100">
              <button
                type="submit"
                form="campaign-form"
                disabled={loading}
                className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer border-0 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" />
                    <span>Đang phân tích dữ liệu...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-stars" />
                    <span>Phân tích chiến lược AI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Cột phải: Kết quả phân tích chiến lược (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
            {/* Tab navigation */}
            <div className="flex border-b border-slate-100 px-4 bg-slate-50/50">
              {[
                { id: "strategy", label: "Chiến lược định vị", icon: "bi-bullseye" },
                { id: "competitor", label: "Đối thủ cạnh tranh", icon: "bi-shield-check" },
                { id: "supply", label: "Chuỗi cung ứng & Cảnh báo", icon: "bi-exclamation-triangle" },
                { id: "chat", label: "Trợ lý AI Seajong", icon: "bi-chat-dots" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer bg-transparent ${
                    activeTab === tab.id
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <i className={`bi ${tab.icon}`} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab contents */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
              {activeTab !== "chat" && !result && !loading && (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-slate-400">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 mb-3 shadow-xs">
                    <i className="bi bi-clipboard2-data text-2xl" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 m-0 mb-1">
                    Chưa có kết quả phân tích chiến dịch
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm leading-relaxed m-0">
                    Vui lòng nhập tên chiến dịch, mô tả và chọn các thông số ở cột <b>Cấu hình chiến dịch</b> bên trái, sau đó nhấn <b>&quot;Phân tích chiến lược AI&quot;</b> để hệ thống tiến hành đối chiếu và tổng hợp báo cáo.
                  </p>
                </div>
              )}

              {activeTab !== "chat" && loading && (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-slate-400">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 shadow-xs">
                    <span className="spinner-border text-indigo-600" role="status" style={{ width: 28, height: 28 }} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 m-0 mb-1">
                    Đang phân tích dữ liệu chiến dịch...
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm leading-relaxed m-0">
                    Hệ thống AI đang đối chiếu mục tiêu chiến dịch với xu hướng ngành thiết bị vệ sinh và dữ liệu đối thủ. Vui lòng đợi trong giây lát.
                  </p>
                </div>
              )}

              {activeTab === "strategy" && result && (
                <div className="space-y-4">
                  {/* Executive Summary */}
                  <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide flex items-center gap-1.5">
                        <i className="bi bi-stars text-indigo-600" />
                        <span>Tóm tắt chiến lược điều hành</span>
                      </span>
                      {result?.opportunityScore && (
                        <span className="text-[11px] font-black px-2 py-0.5 rounded bg-indigo-600 text-white">
                          Điểm cơ hội: {result.opportunityScore}/100
                        </span>
                      )}
                    </div>
                    <p className="m-0 text-xs leading-relaxed text-indigo-950 font-normal">
                      {result?.executiveSummary}
                    </p>
                  </div>

                  {/* Market Gap & Opportunity */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {result?.marketFit?.gapOpportunity && (
                      <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60">
                        <span className="font-bold text-slate-800 block mb-1 text-xs">
                          Khoảng trống đại dương xanh (Market Gap)
                        </span>
                        <p className="text-slate-600 leading-relaxed m-0 text-xs">
                          {result.marketFit.gapOpportunity}
                        </p>
                      </div>
                    )}

                    {result?.marketFit?.targetSegmentAnalysis && (
                      <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60">
                        <span className="font-bold text-slate-800 block mb-1 text-xs">
                          Đặc điểm phân khúc mục tiêu
                        </span>
                        <p className="text-slate-600 leading-relaxed m-0 text-xs">
                          {result.marketFit.targetSegmentAnalysis}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Plan */}
                  {result?.actionPlan && (
                    <div className="border border-slate-200/80 rounded-xl p-4 space-y-2.5">
                      <h5 className="m-0 text-xs font-bold text-slate-900 uppercase tracking-wide">
                        Kế hoạch triển khai gợi ý
                      </h5>
                      <div className="space-y-2 text-xs">
                        {Array.isArray(result.actionPlan.immediate) && result.actionPlan.immediate.map((item: string, i: number) => (
                          <div key={i} className="flex gap-2 items-start">
                            <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[11px] shrink-0">Ngay</span>
                            <span className="text-slate-700">{item}</span>
                          </div>
                        ))}
                        {Array.isArray(result.actionPlan.shortTerm) && result.actionPlan.shortTerm.map((item: string, i: number) => (
                          <div key={i} className="flex gap-2 items-start">
                            <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px] shrink-0">Ngắn hạn</span>
                            <span className="text-slate-700">{item}</span>
                          </div>
                        ))}
                        {Array.isArray(result.actionPlan.longTerm) && result.actionPlan.longTerm.map((item: string, i: number) => (
                          <div key={i} className="flex gap-2 items-start">
                            <span className="font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[11px] shrink-0">Dài hạn</span>
                            <span className="text-slate-700">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "competitor" && result && (
                <div className="space-y-3.5">
                  {result?.competitorIntel?.competitiveAdvantage && (
                    <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
                      <h5 className="m-0 mb-1.5 text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <i className="bi bi-shield-shaded" />
                        <span>Lợi thế cạnh tranh Seajong</span>
                      </h5>
                      <p className="m-0 text-xs text-blue-950 leading-relaxed">
                        {result.competitorIntel.competitiveAdvantage}
                      </p>
                    </div>
                  )}

                  {Array.isArray(result?.competitorIntel?.keyThreats) && (
                    <div className="space-y-2">
                      <h5 className="m-0 text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Đối chiếu các đối thủ trọng tâm
                      </h5>
                      <div className="space-y-2">
                        {result.competitorIntel.keyThreats.map((c: any, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex justify-between items-center text-xs">
                            <div>
                              <span className="font-bold text-slate-900">{c.brand}</span>
                              <span className="text-slate-500 block text-[11px] mt-0.5">{c.threat}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              c.level === 'Cao' ? 'bg-rose-100 text-rose-700' : c.level === 'Trung bình' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                            }`}>
                              Mức đe dọa: {c.level || 'Theo dõi'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "supply" && result && (
                <div className="space-y-3.5">
                  {result?.supplyChainAlert && (
                    <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl">
                      <h5 className="m-0 mb-1.5 text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <i className="bi bi-exclamation-triangle-fill text-amber-600" />
                        <span>Cảnh báo biến động chuỗi cung ứng & giá vật tư</span>
                      </h5>
                      <p className="m-0 text-xs text-amber-950 leading-relaxed">
                        {result.supplyChainAlert.procurementAdvice || "Đảm bảo mức tồn kho an toàn và chốt hợp đồng cung ứng dài hạn để giữ giá thành sản xuất ổn định."}
                      </p>
                    </div>
                  )}

                  {Array.isArray(result?.supplyChainAlert?.alerts) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {result.supplyChainAlert.alerts.map((al: any, idx: number) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1">
                          <span className="font-bold text-slate-800 block text-xs">{al.factor}</span>
                          <span className="text-[11px] text-slate-500 block">{al.impact}</span>
                          <span className="text-[10.5px] text-indigo-600 font-semibold block">Hành động: {al.action}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "chat" && (
                <div className="flex flex-col h-[380px] justify-between">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex gap-2 items-start ${
                          msg.role === "user" ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                            msg.role === "user"
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          <i className={`bi ${msg.role === "user" ? "bi-person-fill" : "bi-robot"}`} />
                        </div>
                        <div
                          className={`p-3 rounded-xl max-w-[85%] text-xs leading-relaxed ${
                            msg.role === "user"
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-100 text-slate-800 whitespace-pre-wrap"
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input & Suggested Prompts */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px]">
                      {[
                        "So sánh Seajong vs TOTO?",
                        "Xu hướng sen tắm âm tường 2026?",
                        "Cách tiếp cận Kiến trúc sư hiệu quả?"
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => handleSendChat(prompt)}
                          className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium shrink-0 cursor-pointer border-0 transition-colors"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Đặt câu hỏi về thị trường, đối thủ, sản phẩm..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                        className="flex-1 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendChat()}
                        disabled={sendingChat || !inputMessage.trim()}
                        className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer border-0 disabled:opacity-50"
                      >
                        {sendingChat ? "..." : "Gửi"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </StandardPage>
  );
};

export default MarketingMarketAnalysisPage;

