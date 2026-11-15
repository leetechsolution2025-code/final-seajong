import React, { useState, useEffect, useRef } from 'react';
import {
  Buildings,
  GeoAlt,
  Telephone,
  Envelope,
  Globe,
  PersonBadge,
  FileEarmarkText,
  Image as ImageIcon,
  CloudArrowUp,
  Link45deg,
  Check2Circle,
  ArrowCounterclockwise,
} from 'react-bootstrap-icons';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { useCompanyInfo } from '../../hooks/useCompanyInfo';
import {
  saveCompanyInfoToServer,
  DEFAULT_COMPANY_INFO,
  type CompanyInfo,
} from '../../services/companyService';
import { useToast } from '../ui/Toast';

export interface CompanyInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompanyInfoModal: React.FC<CompanyInfoModalProps> = ({ isOpen, onClose }) => {
  const company = useCompanyInfo();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<CompanyInfo>(company);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({
        ...DEFAULT_COMPANY_INFO,
        ...company,
      });
    }
  }, [isOpen, company]);

  const handleChange = (field: keyof CompanyInfo, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.warning('Kích thước ảnh lớn', 'Vui lòng chọn tệp logo dưới 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleChange('logo_url', reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.company_name.trim()) {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập Tên doanh nghiệp.');
      return;
    }

    setSaving(true);
    try {
      const res = await saveCompanyInfoToServer(form, form);
      if (res.success) {
        toast.success(
          'Cập nhật thành công',
          'Đã lưu thông tin doanh nghiệp và đồng bộ toàn hệ thống.'
        );
        onClose();
      } else {
        toast.error('Lỗi cập nhật', res.message || 'Không thể lưu thông tin doanh nghiệp.');
      }
    } catch {
      toast.error('Lỗi kết nối', 'Không thể kết nối máy chủ để lưu thông tin doanh nghiệp.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="920px"
      padding="16px"
      headerIcon={<Buildings size={20} />}
      title={
        <div className="flex items-center gap-2">
          <span>Thông tin doanh nghiệp</span>
          <Badge variant="brand">QUẢN TRỊ HỆ THỐNG</Badge>
        </div>
      }
      description="Thiết lập hồ sơ pháp lý, nhận diện thương hiệu và thông tin liên hệ trên toàn hệ thống"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs font-medium text-slate-500">
            MST: <span className="font-bold text-slate-700 font-mono">{form.tax_code || '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
              Đóng
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSave()}
              isLoading={saving}
              leftIcon={<Check2Circle size={15} />}
            >
              Lưu thay đổi
            </Button>
          </div>
        </div>
      }
    >
      <form
        onSubmit={handleSave}
        style={{
          backgroundColor: '#f1f5f9',
          borderRadius: '12px',
          padding: '8px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 260px',
          gap: '8px',
          alignItems: 'stretch',
        }}
        className="max-md:!grid-cols-1"
      >
        {/* CỘT TRÁI: THÔNG TIN PHÁP LÝ & LIÊN HỆ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
          {/* CARD 1: THÔNG TIN PHÁP LÝ & THƯƠNG HIỆU */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '14px 16px',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
            }}
          >
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <FileEarmarkText size={14} />
                </div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Hồ sơ pháp lý &amp; Thương hiệu
                </span>
              </div>
              <Badge variant="info">Pháp nhân chính thức</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8">
                <Input
                  label="Tên doanh nghiệp *"
                  value={form.company_name}
                  onChange={(e) => handleChange('company_name', e.target.value)}
                  placeholder="Công ty cổ phần Seajong Việt Nam"
                  leftIcon={<Buildings size={14} />}
                />
              </div>

              <div className="sm:col-span-4">
                <Input
                  label="Tên viết tắt / Giao dịch"
                  value={form.short_name}
                  onChange={(e) => handleChange('short_name', e.target.value)}
                  placeholder="Seajong VietNam.,JSC"
                />
              </div>

              <div className="sm:col-span-4">
                <Input
                  label="Mã số thuế"
                  value={form.tax_code}
                  onChange={(e) => handleChange('tax_code', e.target.value)}
                  placeholder="0111509681"
                />
              </div>

              <div className="sm:col-span-4">
                <Input
                  label="Người đại diện pháp luật"
                  value={form.legal_rep}
                  onChange={(e) => handleChange('legal_rep', e.target.value)}
                  placeholder="Lê Công Vụ"
                  leftIcon={<PersonBadge size={14} />}
                />
              </div>

              <div className="sm:col-span-4">
                <Input
                  label="Tên miền hệ thống"
                  value={form.domain}
                  onChange={(e) => handleChange('domain', e.target.value)}
                  placeholder="seajong.com"
                  leftIcon={<Globe size={14} />}
                />
              </div>

              <div className="sm:col-span-6">
                <Input
                  label="Khẩu hiệu (Slogan)"
                  value={form.slogan}
                  onChange={(e) => handleChange('slogan', e.target.value)}
                  placeholder="Tiên phong kiến tạo giá trị thực"
                />
              </div>

              <div className="sm:col-span-6">
                <Input
                  label="Lĩnh vực hoạt động"
                  value={form.industry}
                  onChange={(e) => handleChange('industry', e.target.value)}
                  placeholder="Kinh doanh thiết bị phòng tắm, nhà bếp"
                />
              </div>
            </div>
          </div>

          {/* CARD 2: THÔNG TIN LIÊN HỆ & TRỤ SỞ */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '14px 16px',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
            }}
          >
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <GeoAlt size={14} />
                </div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Thông tin liên hệ &amp; Trụ sở
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-4">
                <Input
                  label="Số điện thoại / Hotline"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="0931339343 | 1900 633 862"
                  leftIcon={<Telephone size={14} />}
                />
              </div>

              <div className="sm:col-span-4">
                <Input
                  label="Email liên hệ"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="contact@seajong.com"
                  leftIcon={<Envelope size={14} />}
                />
              </div>

              <div className="sm:col-span-4">
                <Input
                  label="Website chính thức"
                  value={form.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://seajong.com"
                  leftIcon={<Globe size={14} />}
                />
              </div>

              <div className="sm:col-span-12">
                <Input
                  label="Địa chỉ trụ sở chính"
                  value={form.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Nhập địa chỉ đăng ký kinh doanh..."
                  leftIcon={<GeoAlt size={14} />}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: LOGO & NHẬN DIỆN THƯƠNG HIỆU */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '14px 16px',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <ImageIcon size={14} />
                </div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Logo thương hiệu
                </span>
              </div>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-44 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 hover:bg-slate-100/60 transition-colors flex flex-col items-center justify-center p-4 cursor-pointer overflow-hidden relative"
            >
              {form.logo_url ? (
                <img
                  src={form.logo_url}
                  alt={form.company_name}
                  className="max-h-28 max-w-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/logo.png';
                  }}
                />
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-slate-400">
                  <ImageIcon size={28} />
                  <span className="text-xs font-medium">Chưa có logo</span>
                </div>
              )}
            </div>

            <Input
              label="Đường dẫn Logo (URL)"
              value={form.logo_url?.startsWith('data:image/') ? '' : form.logo_url}
              onChange={(e) => handleChange('logo_url', e.target.value)}
              placeholder="/logo.png hoặc dán URL..."
              leftIcon={<Link45deg size={15} />}
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-center"
              leftIcon={<CloudArrowUp size={15} />}
              onClick={() => fileInputRef.current?.click()}
            >
              Tải logo từ máy tính
            </Button>

            {form.logo_url !== '/logo.png' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-center"
                leftIcon={<ArrowCounterclockwise size={13} />}
                onClick={() => handleChange('logo_url', '/logo.png')}
              >
                Khôi phục logo mặc định
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};

