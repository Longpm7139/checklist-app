import React from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/providers/UserProvider';
import {
  AlertCircle, Wrench, FileText, ClipboardList, BarChart2, Package,
  QrCode, Users, UserCheck, Save, Lock, LogOut, Search, History as HistoryIcon,
  Check, Edit2, RotateCcw
} from 'lucide-react';
import clsx from 'clsx';
import { backupAllData } from '@/lib/firebase';

interface HeaderProps {
  isUserOnDuty: boolean;
  currentShiftType: 'DAY' | 'NIGHT';
  isSearchOpen: boolean;
  setIsSearchOpen: (v: boolean) => void;
  setSearchQuery: (v: string) => void;
  isEditMode: boolean;
  setIsEditMode: (v: boolean) => void;
  handleResetDefaults: () => void;
  setIsChangePasswordOpen: (v: boolean) => void;
}

export default function Header({
  isUserOnDuty,
  currentShiftType,
  isSearchOpen,
  setIsSearchOpen,
  setSearchQuery,
  isEditMode,
  setIsEditMode,
  handleResetDefaults,
  setIsChangePasswordOpen
}: HeaderProps) {
  const router = useRouter();
  const { user, logout } = useUser();

  return (
    <header className="text-xl font-bold bg-slate-800 text-white p-4 text-center uppercase flex flex-col md:flex-row justify-between items-start md:items-center relative gap-4 rounded-t-lg">
      <div className="flex flex-col items-start gap-1 w-full md:w-auto">
        <span>Bảng Kiểm Tra Hệ Thống</span>
        {user && <span className="text-xs font-normal text-slate-300 normal-case truncate max-w-[90vw] md:max-w-none">Nhân viên: {user.name} ({user.code})</span>}
      </div>
      <div className="flex gap-2 flex-wrap justify-start md:justify-end w-full md:w-auto">
        <button
          onClick={() => router.push('/incidents')}
          className="p-2 rounded text-sm font-normal flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white transition"
          title="Sự Cố Đột Xuất (Báo ngay)"
        >
          <AlertCircle size={16} />
        </button>
        <button
          onClick={() => router.push('/maintenance')}
          className="p-2 rounded text-sm font-normal flex items-center gap-1 bg-blue-800 hover:bg-blue-900 text-white transition"
          title="Bảo Trì Định Kỳ"
        >
          <Wrench size={16} />
        </button>
        {user?.role === 'ADMIN' && (
          <>
            <button
              onClick={() => router.push('/export-report')}
              className="p-2 rounded text-sm font-normal flex items-center gap-1 bg-teal-600 hover:bg-teal-700 text-white transition"
              title="Xuất báo cáo định kỳ (Word)"
            >
              <FileText size={16} /> Báo cáo
            </button>
            <button
              onClick={() => router.push('/reports')}
              className="p-2 rounded text-sm font-normal flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white transition"
              title="Nhật ký hoạt động"
            >
              <ClipboardList size={16} />
            </button>
            <button
              onClick={() => router.push('/kpi')}
              className="p-2 rounded text-sm font-normal flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white transition"
              title="Đánh giá KPI"
            >
              <BarChart2 size={16} />
            </button>
            <button
              onClick={() => router.push('/materials')}
              className="p-2 rounded text-sm font-normal flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white transition"
              title="Quản lý Vật tư"
            >
              <Package size={16} />
            </button>
            <button
              onClick={() => router.push('/analytics')}
              className="p-2 rounded text-sm font-normal flex items-center gap-1 bg-indigo-800 hover:bg-indigo-900 text-white transition"
              title="Phân tích xu hướng lỗi"
            >
              <BarChart2 size={16} /> Phân tích
            </button>

            <button
              onClick={() => router.push('/qrs')}
              className="p-2 rounded text-sm font-normal flex items-center gap-1 bg-slate-800 hover:bg-black text-white transition"
              title="Mã QR Thiết bị"
            >
              <QrCode size={16} />
            </button>
            <button
              onClick={() => router.push('/users')}
              className="p-2 rounded text-sm font-normal flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white transition"
              title="Quản lý nhân viên"
            >
              <Users size={16} />
            </button>
            <button
              onClick={() => router.push('/duties')}
              className="p-2 rounded text-sm font-normal flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white transition"
              title="Phân công trực"
            >
              <UserCheck size={16} />
            </button>

            <button
              onClick={async () => {
                if (confirm('Bạn có muốn tải về bản sao lưu toàn bộ dữ liệu không?')) {
                  try {
                    const json = await backupAllData();
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const nowD = new Date();
                    const todayStr = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}-${String(nowD.getDate()).padStart(2, '0')}`;
                    a.download = `backup_full_${todayStr}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    alert('Đã tải xuống bản sao lưu thành công!');
                  } catch (e) {
                    console.error(e);
                    alert('Lỗi sao lưu dữ liệu!');
                  }
                }
              }}
              className="p-2 rounded text-sm font-normal flex items-center gap-1 bg-slate-600 hover:bg-slate-700 text-white transition"
              title="Sao lưu dữ liệu (Admin)"
            >
              <Save size={16} /> JSON
            </button>
          </>
        )}
        <button
          onClick={() => setIsChangePasswordOpen(true)}
          className="p-2 rounded text-sm font-normal flex items-center gap-1 bg-yellow-600 hover:bg-yellow-700 text-white transition"
          title="Đổi mật khẩu"
        >
          <Lock size={16} />
        </button>
        <button
          onClick={logout}
          className="p-2 rounded text-sm font-normal flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white transition"
          title="Đăng xuất"
        >
          <LogOut size={16} />
        </button>
        <button
          onClick={() => {
            setIsSearchOpen(!isSearchOpen);
            if (isSearchOpen) setSearchQuery('');
          }}
          className={clsx(
            "p-2 rounded text-sm font-normal flex items-center gap-1 transition",
            isSearchOpen ? "bg-blue-500 text-white" : "bg-slate-700 hover:bg-slate-600 text-slate-200"
          )}
          title="Tìm kiếm"
        >
          <Search size={16} />
        </button>
        {isUserOnDuty && (
          <button
            onClick={() => router.push(`/export-report?shift=${currentShiftType === 'DAY' ? 'Ca ngày' : 'Ca đêm'}`)}
            className="p-2 rounded text-sm font-bold flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
            title={`Báo cáo ${currentShiftType === 'DAY' ? 'Ca Ngày' : 'Ca Đêm'}`}
          >
            <FileText size={16} /> Báo cáo {currentShiftType === 'DAY' ? 'Ca Ngày' : 'Ca Đêm'}
          </button>
        )}
        <button
          onClick={() => router.push('/fixed')}
          className="p-2 rounded text-sm font-normal flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
          title="Xem lịch sử sửa chữa"
        >
          <HistoryIcon size={16} /> Lịch sử
        </button>
        {user?.role === 'ADMIN' && (
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={clsx(
              "p-2 rounded text-sm font-normal flex items-center gap-1 transition",
              isEditMode ? "bg-yellow-500 hover:bg-yellow-600 text-slate-900" : "bg-slate-700 hover:bg-slate-600 text-slate-200"
            )}
            title={isEditMode ? "Tắt chế độ chỉnh sửa" : "Bật chế độ chỉnh sửa"}
          >
            {isEditMode ? <Check size={16} /> : <Edit2 size={16} />}
            {isEditMode ? "Xong" : "Sửa"}
          </button>
        )}
        {isEditMode && user?.role === 'ADMIN' && (
          <button
            onClick={handleResetDefaults}
            className="p-2 rounded text-sm font-normal flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white transition"
            title="Khôi phục mặc định"
          >
            <RotateCcw size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
