import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SplitLayoutPage } from "../../components/layout/SplitLayoutPage";
import { BrandButton } from "../../components/ui/BrandButton";
import { Offcanvas } from "../../components/common/Offcanvas";
import { Input } from "../../components/common/Input";

export interface Competitor {
  id: string;
  name: string;
  website: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  instagramUrl?: string;
  shopeeUrl?: string;
  lazadaUrl?: string;
  status: string;
  automationStatus?: string;
  webhookToken?: string;
  swot?: string;
  metrics?: string;
  scores?: string;
  aiSummary?: string;
  strategySuggestions?: string;
  newsHighlights?: string;
  lastScan?: string;
  createdAt: string;
  updatedAt: string;
}

export const MarketingCompetitorsPage: React.FC = () => {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [newComp, setNewComp] = useState({
    name: "",
    website: "",
    facebookUrl: "",
    tiktokUrl: "",
    youtubeUrl: "",
    instagramUrl: "",
    shopeeUrl: "",
    lazadaUrl: "",
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    fetchCompetitors();
  }, []);

  const fetchCompetitors = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketing/competitors");
      const data = await res.json();
      if (Array.isArray(data)) {
        setCompetitors(data);
        if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
      }
    } catch (error) {
      console.error("Lỗi tải đối thủ:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (id: string) => {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`/api/marketing/competitors/${id}/analyze`, { method: "POST" });
      if (res.ok) {
        const updated = await res.json();
        showToast("Đã hoàn thành cập nhật phân tích AI");
        setCompetitors(prev => prev.map(c => c.id === id ? updated : c));
      } else {
        showToast("Phân tích AI thất bại");
      }
    } catch (error) {
      showToast("Lỗi kết nối");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOpenAdd = () => {
    setIsEdit(false);
    setNewComp({ name: "", website: "", facebookUrl: "", tiktokUrl: "", youtubeUrl: "", instagramUrl: "", shopeeUrl: "", lazadaUrl: "" });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (comp: Competitor) => {
    setIsEdit(true);
    setNewComp({
      name: comp.name,
      website: comp.website,
      facebookUrl: comp.facebookUrl || "",
      tiktokUrl: comp.tiktokUrl || "",
      youtubeUrl: comp.youtubeUrl || "",
      instagramUrl: comp.instagramUrl || "",
      shopeeUrl: comp.shopeeUrl || "",
      lazadaUrl: comp.lazadaUrl || "",
    });
    setIsAddOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComp.name.trim()) return;

    setIsSubmitting(true);
    try {
      const url = isEdit ? `/api/marketing/competitors/${selectedId}` : "/api/marketing/competitors";
      const method = isEdit ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newComp),
      });
      
      if (res.ok) {
        showToast(isEdit ? "Đã cập nhật thông tin đối thủ" : "Đã thêm đối thủ thành công");
        setIsAddOpen(false);
        fetchCompetitors();
      } else {
        showToast("Có lỗi xảy ra khi lưu đối thủ");
      }
    } catch (error) {
      showToast("Lỗi kết nối máy chủ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Bạn có chắc chắn muốn xóa đối thủ này khỏi danh sách theo dõi?")) return;
    
    try {
      const res = await fetch(`/api/marketing/competitors/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Đã xóa đối thủ khỏi danh sách theo dõi");
        if (selectedId === id) setSelectedId(null);
        fetchCompetitors();
      }
    } catch (error) {
      showToast("Lỗi khi xóa đối thủ");
    }
  };

  const filteredCompetitors = competitors.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.website.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCompetitor = competitors.find(c => c.id === selectedId) || competitors[0];

  // ── LEFT TOP: Search & Add Button ──
  const LeftHeader = (
    <div className="flex flex-col gap-2.5">
      <div className="flex justify-between items-center">
        <h3 className="m-0 text-sm font-bold text-slate-800">Danh sách theo dõi</h3>
        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          {competitors.length} đối thủ
        </span>
      </div>
      
      <div className="flex gap-2">
        <div className="relative flex-1">
          <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input 
            type="text" 
            placeholder="Tìm đối thủ..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" 
          />
        </div>
        <button 
          type="button"
          onClick={handleOpenAdd} 
          title="Thêm đối thủ mới"
          className="h-9 w-9 p-0 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center text-sm font-bold transition-all shadow-xs cursor-pointer border-0 shrink-0"
        >
          <i className="bi bi-plus-lg" />
        </button>
      </div>
    </div>
  );

  // ── LEFT CONTENT: Competitor List ──
  const LeftList = (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
          ))
        ) : filteredCompetitors.map((comp) => {
          const isSelected = selectedCompetitor?.id === comp.id;
          return (
            <div
              key={comp.id}
              onClick={() => setSelectedId(comp.id)}
              className={`p-3 rounded-xl cursor-pointer relative transition-all border ${
                isSelected
                  ? "bg-indigo-50/60 border-indigo-400 shadow-xs"
                  : "bg-white border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div className="flex justify-between items-start mb-1.5">
                <div>
                  <h4 className="m-0 text-xs font-bold text-slate-900">{comp.name}</h4>
                  <p className="m-0 text-[11px] text-slate-500 truncate max-w-[180px]">{comp.website}</p>
                </div>
                <button 
                  type="button"
                  onClick={(e) => handleDelete(comp.id, e)} 
                  className="border-0 bg-transparent text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors" 
                  title="Xóa đối thủ"
                >
                  <i className="bi bi-trash3 text-xs" />
                </button>
              </div>

              <div className="flex justify-between items-center mt-2">
                <div className="flex gap-2 items-center text-xs">
                  {comp.facebookUrl && <i className="bi bi-facebook text-blue-600" />}
                  {comp.tiktokUrl && <i className="bi bi-tiktok text-slate-900" />}
                  {comp.youtubeUrl && <i className="bi bi-youtube text-red-600" />}
                </div>
                <span className="text-[10px] text-slate-400">
                  {comp.lastScan ? new Date(comp.lastScan).toLocaleDateString('vi-VN') : 'Mới'}
                </span>
              </div>
            </div>
          );
        })}
        {!loading && filteredCompetitors.length === 0 && (
          <div className="text-center py-10 px-4 text-slate-400">
            <i className="bi bi-search text-2xl opacity-40 block mb-2" />
            <p className="text-xs m-0">Không tìm thấy đối thủ phù hợp</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-hidden relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2 animate-fade-in">
          <i className="bi bi-info-circle-fill text-indigo-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <SplitLayoutPage
        title="Theo dõi đối thủ"
        description="Theo dõi tự động định vị giá, phân tích SWOT và chiến lược truyền thông của các đối thủ cạnh tranh trên thị trường"
        icon="bi-binoculars"
        color="rose"
        leftCols={4}
        leftTopContent={LeftHeader}
        leftContent={LeftList}
        rightContent={
          <div className="flex-1 flex flex-col bg-white overflow-hidden rounded-xl border border-slate-200/80 shadow-xs h-full">
            {selectedCompetitor ? (() => {
              let swot: any = {};
              let metrics: any = {};
              let strategy: any = {};
              let highlights: string[] = [];

              try {
                swot = typeof selectedCompetitor.swot === 'string' ? JSON.parse(selectedCompetitor.swot || '{}') : (selectedCompetitor.swot || {});
              } catch (e) {}

              try {
                metrics = typeof selectedCompetitor.metrics === 'string' ? JSON.parse(selectedCompetitor.metrics || '{}') : (selectedCompetitor.metrics || {});
              } catch (e) {}

              try {
                strategy = typeof selectedCompetitor.strategySuggestions === 'string' ? JSON.parse(selectedCompetitor.strategySuggestions || '{}') : (selectedCompetitor.strategySuggestions || {});
              } catch (e) {}

              try {
                highlights = typeof selectedCompetitor.newsHighlights === 'string' ? JSON.parse(selectedCompetitor.newsHighlights || '[]') : (selectedCompetitor.newsHighlights || []);
              } catch (e) {}

              return (
                <>
                  {/* FIXED HEADER */}
                  <div className="px-5 py-3.5 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                    <div>
                      <h2 className="m-0 text-base font-black text-slate-900">{selectedCompetitor.name}</h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        <a 
                          href={selectedCompetitor.website} 
                          target="_blank" 
                          rel="noreferrer"
                          className="m-0 text-xs text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          {selectedCompetitor.website}
                          <i className="bi bi-box-arrow-up-right text-[10px]" />
                        </a>
                        {selectedCompetitor.lastScan && (
                          <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded text-slate-500">
                            Cập nhật: {new Date(selectedCompetitor.lastScan).toLocaleString("vi-VN")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <BrandButton 
                        variant="outline" 
                        icon="bi-stars" 
                        loading={isAnalyzing}
                        onClick={() => handleAnalyze(selectedCompetitor.id)} 
                        style={{ height: 32, fontSize: 12 }}
                      >
                        Phân tích AI
                      </BrandButton>
                      <BrandButton 
                        variant="outline" 
                        icon="bi-pencil-square" 
                        onClick={() => handleOpenEdit(selectedCompetitor)} 
                        style={{ height: 32, fontSize: 12 }}
                      >
                        Sửa
                      </BrandButton>
                    </div>
                  </div>

                  {/* SCROLLABLE BODY */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                    {/* Summary Section */}
                    <div>
                      {(() => {
                        const summary = selectedCompetitor.aiSummary;
                        if (!summary) return (
                          <div className="bg-indigo-50/50 p-3.5 rounded-xl border-l-4 border-indigo-500">
                            <p className="m-0 text-xs leading-relaxed text-slate-700 font-medium">
                              Chưa có bản tóm tắt phân tích đối thủ. Nhấn nút &apos;Phân tích AI&apos; để bắt đầu thu thập dữ liệu.
                            </p>
                          </div>
                        );

                        const compareKeyword = "SO SÁNH VỚI SEAJONG:";
                        const compareIndex = summary.indexOf(compareKeyword);

                        if (compareIndex !== -1) {
                          const generalSummary = summary.substring(0, compareIndex).trim();
                          const comparisonText = summary.substring(compareIndex + compareKeyword.length).trim();
                          
                          return (
                            <div className="space-y-3">
                              {generalSummary && (
                                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/60 border-l-4 border-l-indigo-600">
                                  <p className="m-0 text-xs leading-relaxed text-slate-800 text-justify">
                                    {generalSummary}
                                  </p>
                                </div>
                              )}
                              <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl">
                                <h4 className="m-0 mb-2 text-xs font-bold text-blue-900 flex items-center gap-1.5 uppercase tracking-wide">
                                  <i className="bi bi-boxes" />
                                  <span>So sánh trực tiếp với Seajong</span>
                                </h4>
                                <p className="m-0 text-xs leading-relaxed text-blue-950 text-justify font-normal">
                                  {comparisonText}
                                </p>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/60 border-l-4 border-l-indigo-600">
                            <p className="m-0 text-xs leading-relaxed text-slate-800 text-justify">
                              {summary}
                            </p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* SWOT Grid */}
                    {(swot.strengths?.length > 0 || swot.weaknesses?.length > 0 || swot.opportunities?.length > 0 || swot.threats?.length > 0) && (
                      <div>
                        <h4 className="text-[11px] font-bold mb-2.5 uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                          <i className="bi bi-grid-fill text-indigo-600" />
                          <span>Phân tích SWOT đối thủ</span>
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Strengths */}
                          {swot.strengths?.length > 0 && (
                            <div className="bg-emerald-50/60 border border-emerald-100 p-3 rounded-xl">
                              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs mb-2">
                                <i className="bi bi-plus-circle-fill text-emerald-600" />
                                <span>ĐIỂM MẠNH (STRENGTHS)</span>
                              </div>
                              <ul className="m-0 pl-4 text-xs text-slate-700 space-y-1">
                                {swot.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                              </ul>
                            </div>
                          )}

                          {/* Weaknesses */}
                          {swot.weaknesses?.length > 0 && (
                            <div className="bg-rose-50/60 border border-rose-100 p-3 rounded-xl">
                              <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs mb-2">
                                <i className="bi bi-dash-circle-fill text-rose-600" />
                                <span>ĐIỂM YẾU (WEAKNESSES)</span>
                              </div>
                              <ul className="m-0 pl-4 text-xs text-slate-700 space-y-1">
                                {swot.weaknesses.map((s: string, i: number) => <li key={i}>{s}</li>)}
                              </ul>
                            </div>
                          )}

                          {/* Opportunities */}
                          {swot.opportunities?.length > 0 && (
                            <div className="bg-blue-50/60 border border-blue-100 p-3 rounded-xl">
                              <div className="flex items-center gap-1.5 text-blue-800 font-bold text-xs mb-2">
                                <i className="bi bi-lightbulb-fill text-blue-600" />
                                <span>CƠ HỘI (OPPORTUNITIES)</span>
                              </div>
                              <ul className="m-0 pl-4 text-xs text-slate-700 space-y-1">
                                {swot.opportunities.map((s: string, i: number) => <li key={i}>{s}</li>)}
                              </ul>
                            </div>
                          )}

                          {/* Threats */}
                          {swot.threats?.length > 0 && (
                            <div className="bg-amber-50/60 border border-amber-100 p-3 rounded-xl">
                              <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs mb-2">
                                <i className="bi bi-exclamation-triangle-fill text-amber-600" />
                                <span>THÁCH THỨC (THREATS)</span>
                              </div>
                              <ul className="m-0 pl-4 text-xs text-slate-700 space-y-1">
                                {swot.threats.map((s: string, i: number) => <li key={i}>{s}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Strategy Suggestions: Dos & Donts */}
                    {(strategy.dos?.length > 0 || strategy.donts?.length > 0) && (
                      <div className="space-y-3">
                        <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1.5 m-0">
                          <i className="bi bi-shield-check text-indigo-600" />
                          <span>Chiến lược phản ứng cho Seajong</span>
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {strategy.dos?.length > 0 && (
                            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5">
                              <h5 className="m-0 mb-2 text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                                <i className="bi bi-check-circle-fill text-emerald-600" />
                                <span>NÊN LÀM (DOS)</span>
                              </h5>
                              <div className="space-y-1 text-xs text-emerald-950">
                                {strategy.dos.map((item: string, i: number) => (
                                  <div key={i} className="flex gap-1.5 items-start">
                                    <span className="font-bold">•</span>
                                    <span>{item}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {strategy.donts?.length > 0 && (
                            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5">
                              <h5 className="m-0 mb-2 text-xs font-bold text-rose-900 flex items-center gap-1.5">
                                <i className="bi bi-x-circle-fill text-rose-600" />
                                <span>KHÔNG NÊN LÀM (DONTS)</span>
                              </h5>
                              <div className="space-y-1 text-xs text-rose-950">
                                {strategy.donts.map((item: string, i: number) => (
                                  <div key={i} className="flex gap-1.5 items-start">
                                    <span className="font-bold">•</span>
                                    <span>{item}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Social / Digital Channels Activity */}
                    {Object.keys(metrics).length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-bold mb-2.5 uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                          <i className="bi bi-broadcast text-indigo-600" />
                          <span>Hoạt động truyền thông & kênh phân phối</span>
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(metrics).map(([channel, activity]) => {
                            if (!activity) return null;
                            let iconClass = "bi-globe";
                            let iconColor = "text-indigo-600";
                            if (channel.toLowerCase() === "facebook") { iconClass = "bi-facebook"; iconColor = "text-blue-600"; }
                            if (channel.toLowerCase() === "tiktok") { iconClass = "bi-tiktok"; iconColor = "text-slate-900"; }
                            if (channel.toLowerCase() === "youtube") { iconClass = "bi-youtube"; iconColor = "text-red-600"; }
                            if (channel.toLowerCase() === "shopee") { iconClass = "bi-bag-fill"; iconColor = "text-orange-600"; }

                            return (
                              <div key={channel} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-start gap-3 text-xs">
                                <i className={`bi ${iconClass} ${iconColor} text-base mt-0.5 shrink-0`} />
                                <div className="flex-1">
                                  <span className="font-bold text-slate-900 block">{channel}</span>
                                  <span className="text-slate-600 leading-relaxed mt-0.5 block">{String(activity)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              );
            })() : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs p-8 text-center">
                <div>
                  <i className="bi bi-binoculars text-4xl opacity-30 block mb-2" />
                  <p className="m-0 font-medium">Chọn một đối thủ bên trái để xem hồ sơ thông tin chi tiết</p>
                </div>
              </div>
            )}
          </div>
        }
      />

      {/* Offcanvas Thêm / Sửa đối thủ chuẩn AGENTS.md (width="400px") */}
      <Offcanvas
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={isEdit ? "Chỉnh sửa đối thủ" : "Thêm đối thủ mới"}
        width="400px"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white"
            >
              Hủy
            </button>
            <button
              type="submit"
              form="competitor-form"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? "Đang lưu..." : isEdit ? "Cập nhật" : "Lưu đối thủ"}
            </button>
          </div>
        }
      >
        <form id="competitor-form" onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Tên thương hiệu đối thủ *</label>
            <input
              type="text"
              required
              placeholder="Ví dụ: TOTO, Inax, Viglacera..."
              value={newComp.name}
              onChange={(e) => setNewComp({ ...newComp, name: e.target.value })}
              className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Website chính thức</label>
            <input
              type="text"
              placeholder="https://..."
              value={newComp.website}
              onChange={(e) => setNewComp({ ...newComp, website: e.target.value })}
              className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-indigo-500"
            />
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-2.5">
            <label className="font-bold text-slate-700 block">Kênh mạng xã hội & sàn TMĐT</label>
            <div>
              <span className="text-[11px] text-slate-500 mb-1 block">Facebook URL:</span>
              <input
                type="text"
                placeholder="https://facebook.com/..."
                value={newComp.facebookUrl}
                onChange={(e) => setNewComp({ ...newComp, facebookUrl: e.target.value })}
                className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 mb-1 block">TikTok URL:</span>
              <input
                type="text"
                placeholder="https://tiktok.com/@..."
                value={newComp.tiktokUrl}
                onChange={(e) => setNewComp({ ...newComp, tiktokUrl: e.target.value })}
                className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 mb-1 block">YouTube URL:</span>
              <input
                type="text"
                placeholder="https://youtube.com/@..."
                value={newComp.youtubeUrl}
                onChange={(e) => setNewComp({ ...newComp, youtubeUrl: e.target.value })}
                className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 mb-1 block">Shopee Mall URL:</span>
              <input
                type="text"
                placeholder="https://shopee.vn/..."
                value={newComp.shopeeUrl}
                onChange={(e) => setNewComp({ ...newComp, shopeeUrl: e.target.value })}
                className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </form>
      </Offcanvas>
    </div>
  );
};

export default MarketingCompetitorsPage;
