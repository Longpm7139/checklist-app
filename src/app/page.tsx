'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SystemCheck, Status, SystemCategory } from '@/lib/types';
import { Save, AlertCircle, Edit2, Trash2, Plus, Check, X, RotateCcw, History as HistoryIcon, CheckCheck, Search, LogOut, Users, Lock, ClipboardList, BarChart2, Package, Wrench, QrCode, Key } from 'lucide-react';
import clsx from 'clsx';
import { useUser } from '@/providers/UserProvider';
import ChangePasswordModal from '@/components/ChangePasswordModal';

const DEFAULT_CATEGORIES: SystemCategory[] = [
  { id: 'CAT1', name: 'A. Hệ thống Cầu hành khách' },
  { id: 'CAT2', name: 'B. Hệ thống Dẫn đỗ tàu bay' },
  { id: 'CAT3', name: 'C. Hệ thống Máy soi' },
  { id: 'CAT4', name: 'D. Hệ thống Cổng từ' },
  { id: 'CAT5', name: 'E. Hệ thống TDS' },
  { id: 'CAT6', name: 'F. Hệ thống ACS' },
  { id: 'CAT7', name: 'G. Hệ thống TEL' },
  { id: 'CAT8', name: 'H. Hệ thống CCTV' },
  { id: 'CAT9', name: 'I. Hệ thống Thu phí ETC' },
  { id: 'CAT10', name: 'J. Hệ thống thu phí xe máy' },
  { id: 'CAT11', name: 'K. Hệ thống Cửa trượt tự động' },
];

const DEFAULT_SYSTEMS: SystemCheck[] = [
  { id: 'A1', categoryId: 'CAT1', name: 'Cầu số 1', status: null, note: '' },
  { id: 'A2', categoryId: 'CAT1', name: 'Cầu số 2', status: null, note: '' },
  { id: 'A3', categoryId: 'CAT1', name: 'Cầu số 3', status: null, note: '' },
  { id: 'A4', categoryId: 'CAT1', name: 'Cầu số 4', status: null, note: '' },
  { id: 'A5', categoryId: 'CAT1', name: 'Cầu số 5', status: null, note: '' },

  { id: 'B1', categoryId: 'CAT2', name: 'Dẫn đỗ D1', status: null, note: '' },
  { id: 'B2', categoryId: 'CAT2', name: 'Dẫn đỗ D2', status: null, note: '' },

  { id: 'C1', categoryId: 'CAT3', name: 'Máy soi 1', status: null, note: '' },
  { id: 'C2', categoryId: 'CAT3', name: 'Máy soi 2', status: null, note: '' },

  { id: 'D1', categoryId: 'CAT4', name: 'Cổng từ 1', status: null, note: '' },
  { id: 'D2', categoryId: 'CAT4', name: 'Cổng từ 2', status: null, note: '' },

  { id: 'E1', categoryId: 'CAT5', name: 'TDS 1', status: null, note: '' },
  { id: 'E2', categoryId: 'CAT5', name: 'TDS 2', status: null, note: '' },

  { id: 'F1', categoryId: 'CAT6', name: 'ACS 1', status: null, note: '' },
  { id: 'F2', categoryId: 'CAT6', name: 'ACS 2', status: null, note: '' },

  { id: 'G1', categoryId: 'CAT7', name: 'TEL 1', status: null, note: '' },
  { id: 'G2', categoryId: 'CAT7', name: 'TEL 2', status: null, note: '' },

  { id: 'H1', categoryId: 'CAT8', name: 'CCTV 1', status: null, note: '' },
  { id: 'H2', categoryId: 'CAT8', name: 'CCTV 2', status: null, note: '' },

  { id: 'I1', categoryId: 'CAT9', name: 'ETC 1', status: null, note: '' },
  { id: 'I2', categoryId: 'CAT9', name: 'ETC 2', status: null, note: '' },

  { id: 'J1', categoryId: 'CAT10', name: 'Thu phí XM 1', status: null, note: '' },
  { id: 'J2', categoryId: 'CAT10', name: 'Thu phí XM 2', status: null, note: '' },

  { id: 'K1', categoryId: 'CAT11', name: 'Cửa trượt 1', status: null, note: '' },
  { id: 'K2', categoryId: 'CAT11', name: 'Cửa trượt 2', status: null, note: '' },
];

import { subscribeToSystems, saveSystem, deleteSystem, subscribeToIncidents, backupAllData } from '@/lib/firebase';

export default function Home() {
  const router = useRouter();
  const [categories, setCategories] = useState<SystemCategory[]>(DEFAULT_CATEGORIES);
  const [systems, setSystems] = useState<SystemCheck[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const { user, logout } = useUser();

  useEffect(() => {
    // 1. Subscribe to Systems
    const unsubSys = subscribeToSystems((data) => {
      if (data.length === 0) {
        // Seed defaults if empty (First run)
        console.log("Seeding default systems to Firebase...");
        DEFAULT_SYSTEMS.forEach(s => saveSystem(s.id, s));
      } else {
        console.log("Loaded systems from Firebase:", data.length);
        const sorted = (data as SystemCheck[]).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
        setSystems(sorted);
      }
      setIsLoaded(true);
    });

    // 2. Subscribe to Incidents (for the dashboard alert)
    const unsubInc = subscribeToIncidents((data) => {
      setIncidents(data);
    });

    return () => {
      unsubSys();
      unsubInc();
    };
  }, []);

  const handleStatusChange = async (id: string, status: Status) => {
    const now = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
    const target = systems.find(s => s.id === id);
    if (target) {
      const updated = { ...target, status, timestamp: now, inspectorName: user?.name };
      await saveSystem(id, updated);

      // Clear error
      if (status === 'OK') {
        setErrors(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    }
  };

  const handleNoteChange = async (id: string, note: string) => {
    const now = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
    const target = systems.find(s => s.id === id);
    if (target) {
      const updated = { ...target, note, timestamp: now, inspectorName: user?.name };
      await saveSystem(id, updated);
      if (note.trim()) {
        setErrors(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    }
  };

  const handleAddSystem = async (categoryId: string) => {
    const idInput = prompt("Nhập Mã định danh (ID) cho hệ thống (Ví dụ: A21, B01...)\nLưu ý: Mã này sẽ dùng để tạo QR Code cố định.");
    if (!idInput || !idInput.trim()) return;

    const cleanId = idInput.trim().toUpperCase();

    if (systems.some(s => s.id === cleanId)) {
      alert(`Mã ID "${cleanId}" đã tồn tại!`);
      return;
    }

    const nameInput = prompt("Nhập Tên hiển thị (Ví dụ: Cầu hành khách số 21):");
    if (!nameInput || !nameInput.trim()) return;

    const newSystem: SystemCheck = {
      id: cleanId,
      categoryId: categoryId,
      name: nameInput.trim(),
      status: null,
      note: ''
    };
    await saveSystem(cleanId, newSystem);
  };

  const handleDeleteSystem = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa hệ thống này không? Dữ liệu trên Cloud sẽ bị xóa.')) {
      await deleteSystem(id);
    }
  };

  const handleUpdateSystemName = async (id: string, newName: string) => {
    const target = systems.find(s => s.id === id);
    if (target) {
      await saveSystem(id, { ...target, name: newName });
    }
  };

  const handleUpdateSystemId = (oldId: string) => {
    alert("Tính năng Đổi ID đang được bảo trì trong quá trình chuyển đổi sang Cloud (Firebase). Vui lòng thử lại sau!");
  };

  const handleResetDefaults = async () => {
    if (confirm('Bạn có chắc chắn muốn khôi phục danh sách mặc định? Dữ liệu hiện tại trên Cloud sẽ bị xóa và thay thế.')) {
      // Delete all current
      for (const s of systems) {
        await deleteSystem(s.id);
      }
      // Add defaults
      for (const s of DEFAULT_SYSTEMS) {
        await saveSystem(s.id, s);
      }
    }
  };

  const handleMarkAllOK = () => {
    // Logic: Set ALL items to 'OK' if they are currently null.
    // If they are 'NOK' or 'NA', preserve them?
    // User request: "bình thường tất cả đều ở trạng thái OK, nếu có lỗi thì tự chọn NOK"
    // This implies a "reset to OK" or "fill with OK".
    // Safest approach: Fill NULLs with OK. If user wants to reset NOK, they can click OK manually or Reset.
    // Actually, widespread practice for "Check All" is usually "Set All". 
    // But let's be smart: If I have marked 5 NOKs, I don't want to lose them when I click "Check All" for the rest.
    // So: Only update items where status is null.

    const now = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

    // Check if any item is null. If yes, fill them being OK.
    // If ALL are already set (e.g. some OK, some NOK), maybe user wants to RESET everything to OK?
    // Let's stick to "Fill Empties" first. It's safer.
    // Wait, if I want to "Quick check", I might just click it at the start.
    // If I click it later, I probably want to fill.
    // Let's go with: Update item if status is NULL.

    // OPTION: If user really wants to force all OK, they can Delete All and start over, or we provide a clear "Force OK" button.
    // Let's assume "Fill Unchecked".

    // Iterate and save individually. Firestore batch is better but this is simpler for now.
    systems.forEach(async (s) => {
      if (!s.status) {
        await saveSystem(s.id, { ...s, status: 'OK', timestamp: now, inspectorName: user?.name });
      }
    });
    // No need to setSystems, the listener will update it.

    // Clear errors for items that became OK
    setErrors(prev => {
      const next = new Set(prev);
      systems.forEach(s => {
        if (!s.status) next.delete(s.id); // If we set it to OK, remove error
      });
      return next;
    });
  };

  const handleSaveChecklist = () => {
    // 1. Validate NOK and NA notes
    const newErrors = new Set<string>();
    // Filter for both NOK and NA
    const itemsRequiringNote = systems.filter(s => s.status === 'NOK' || s.status === 'NA');

    itemsRequiringNote.forEach(s => {
      if (!s.note.trim()) {
        newErrors.add(s.id);
      }
    });

    if (newErrors.size > 0) {
      setErrors(newErrors);
      alert('Vui lòng nhập ghi chú cho các mục NOK hoặc NA!');
      return;
    }

    // 1.5 Validate that ALL systems have a status selected (Mandatory Check)
    const uncheckedSystems = systems.filter(s => !s.status);
    if (uncheckedSystems.length > 0) {
      const missingNames = uncheckedSystems.map(s => s.name).join(', ');
      alert(`Bạn chưa kiểm tra các mục sau:\n${missingNames}\n\nVui lòng hoàn thành trạng thái cho tất cả hệ thống!`);
      return;
    }

    // 2. Save is already handled by individual updates.

    // 3. Redirect logic: Link to first NOK
    const nokItems = systems.filter(s => s.status === 'NOK');
    if (nokItems.length > 0) {
      // Go to the first NOK system found
      router.push(`/check/${nokItems[0].id}`);
    } else {
      // All OK -> Summary
      router.push('/summary');
    }
  };

  const hasErrors = systems.some(s => s.status === 'NOK' || s.status === 'NA');

  // Compute failed category names for the button
  const failedCategoryIds = Array.from(new Set(
    systems
      .filter(s => s.status === 'NOK' || s.status === 'NA')
      .map(s => s.categoryId)
  ));

  const failedCategoryNames = failedCategoryIds.map(id => {
    return categories.find(c => c.id === id)?.name || id;
  }).join(', ');

  const buttonText = hasErrors ? `${failedCategoryNames}` : "Tất cả OK";




  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto bg-white border border-slate-300 shadow-sm relative">
        <h1 className="text-xl font-bold bg-slate-800 text-white p-4 text-center uppercase flex justify-between items-center relative">
          <div className="flex flex-col items-start gap-1">
            <span>Bảng Kiểm Tra Hệ Thống</span>
            {user && <span className="text-xs font-normal text-slate-300 normal-case">Nhân viên: {user.name} ({user.code})</span>}
          </div>
          <div className="flex gap-2">
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
                  onClick={async () => {
                    if (confirm('Bạn có muốn tải về bản sao lưu toàn bộ dữ liệu không?')) {
                      try {
                        const json = await backupAllData();
                        const blob = new Blob([json], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `backup_full_${new Date().toISOString().slice(0, 10)}.json`;
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
                if (isSearchOpen) setSearchQuery(''); // Clear when closing
              }}
              className={clsx(
                "p-2 rounded text-sm font-normal flex items-center gap-1 transition",
                isSearchOpen ? "bg-blue-500 text-white" : "bg-slate-700 hover:bg-slate-600 text-slate-200"
              )}
              title="Tìm kiếm"
            >
              <Search size={16} />
            </button>
            <button
              onClick={() => router.push('/fixed')}
              className="p-2 rounded text-sm font-normal flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
              title="Xem lịch sử sửa chữa"
            >
              <HistoryIcon size={16} /> Lịch sử
            </button>
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
            {isEditMode && (
              <button
                onClick={handleResetDefaults}
                className="p-2 rounded text-sm font-normal flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white transition"
                title="Khôi phục mặc định"
              >
                <RotateCcw size={16} />
              </button>
            )}
          </div>
        </h1>

        {/* DASHBOARD ANALYTICS */}
        <div className="bg-slate-50 p-4 border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Progress Card */}
            {/* Progress Card */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tiến độ kiểm tra</h3>
                  <div className="text-2xl font-bold text-slate-800 flex items-baseline gap-1">
                    {Math.round((systems.filter(s => s.status).length / systems.length) * 100) || 0}%
                    <span className="text-sm font-normal text-slate-500">
                      ({systems.filter(s => s.status).length}/{systems.length})
                    </span>
                  </div>
                </div>
                <div className={clsx(
                  "p-2 rounded-lg transition-colors",
                  systems.every(s => s.status) ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                )}>
                  {systems.every(s => s.status) ? <CheckCheck size={20} /> : <ClipboardList size={20} />}
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
                <div
                  className={clsx("h-2.5 rounded-full transition-all duration-500",
                    systems.every(s => s.status) ? "bg-green-500" : "bg-blue-600"
                  )}
                  style={{ width: `${(systems.filter(s => s.status).length / systems.length) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs font-medium">
                <span className="text-blue-600">Đã kiểm: {systems.filter(s => s.status).length}</span>
                <span className="text-slate-400">Chưa kiểm: {systems.filter(s => !s.status).length}</span>
              </div>
            </div>

            {/* Incidents Card */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Sự cố chờ xử lý</h3>
                  <div className="text-2xl font-bold text-slate-800">
                    {incidents.filter((i: any) => i.status === 'OPEN').length}
                  </div>
                </div>
                <div className="p-2 bg-red-100 text-red-600 rounded-lg animate-pulse">
                  <AlertCircle size={20} />
                </div>
              </div>
              <div className="mt-4 text-xs text-red-600 font-medium">
                Cần khắc phục ngay!
              </div>
            </div>

            {/* Issues Card */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Lỗi phát hiện hôm nay</h3>
                  <div className="text-2xl font-bold text-slate-800">
                    {systems.filter(s => s.status === 'NOK').length}
                  </div>
                </div>
                <div className={clsx("p-2 rounded-lg", systems.some(s => s.status === 'NOK') ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600")}>
                  {systems.some(s => s.status === 'NOK') ? <AlertCircle size={20} /> : <CheckCheck size={20} />}
                </div>
              </div>
              <div className="mt-4 text-xs text-slate-400">
                {systems.some(s => s.status === 'NOK') ? "Vui lòng ghi chú chi tiết lỗi." : "Hệ thống hoạt động ổn định."}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Search Input */}
          <div className={clsx("w-full md:w-1/2 transition-all overflow-hidden", isSearchOpen ? "max-h-20 opacity-100" : "max-h-0 opacity-0")}>
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm theo tên hệ thống, ghi chú, trạng thái..."
                className="w-full p-2 pl-9 border border-slate-300 rounded shadow-sm focus:border-blue-500 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            </div>
          </div>

          <button
            onClick={handleMarkAllOK}
            className={clsx(
              "px-4 py-2 border rounded font-bold flex items-center gap-2 transition ml-auto max-w-md h-auto whitespace-normal text-left",
              hasErrors
                ? "bg-red-100 text-red-700 border-red-300 hover:bg-red-200"
                : "bg-green-100 text-green-700 border-green-300 hover:bg-green-200"
            )}
            title={hasErrors ? "Đang có lỗi (Click để điền OK các mục còn lại)" : "Chọn OK cho tất cả các mục chưa kiểm tra"}
          >
            {hasErrors ? <AlertCircle size={18} className="flex-shrink-0" /> : <CheckCheck size={18} className="flex-shrink-0" />}
            <span className="truncate-2-lines">{buttonText}</span>
          </button>
        </div>

        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-200 text-slate-700 font-bold uppercase text-sm">
            <tr>
              <th className="p-3 border border-slate-300 w-1/3">Hệ thống</th>
              <th className="p-3 border border-slate-300 text-center w-1/3">Status</th>
              <th className="p-3 border border-slate-300 w-1/3">Note</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => {
              // Filter logic included here
              const catSystems = systems.filter(s => {
                const matchesCategory = s.categoryId === cat.id;
                if (!matchesCategory) return false;

                if (!searchQuery.trim()) return true;

                const q = searchQuery.toLowerCase();
                return (
                  s.name.toLowerCase().includes(q) ||
                  s.note.toLowerCase().includes(q) ||
                  (s.status && s.status.toLowerCase().includes(q))
                );
              });

              if (catSystems.length === 0) return null; // Hide empty categories during search

              return (
                <div key={cat.id} style={{ display: 'contents' }}>
                  {/* Category Header Row */}
                  <tr key={cat.id} className="bg-blue-50">
                    <td colSpan={3} className="p-3 border border-slate-300 font-bold text-blue-800">
                      {cat.name}
                    </td>
                  </tr>
                  {/* System Rows */}
                  {catSystems.map(sys => (
                    <tr key={sys.id} className="hover:bg-slate-50">
                      <td className="p-3 border border-slate-300 font-medium pl-8">
                        {isEditMode ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={sys.name}
                              onChange={(e) => handleUpdateSystemName(sys.id, e.target.value)}
                              className="border border-slate-300 rounded px-2 py-1 w-full text-sm focus:border-blue-500 outline-none"
                            />
                            <button
                              onClick={() => handleUpdateSystemId(sys.id)}
                              className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                              title="Đổi Mã ID (Migrate ID)"
                            >
                              <Key size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteSystem(sys.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                              title="Xóa hệ thống"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : (
                          <span>{sys.name} <span className="text-xs text-slate-400 font-normal">({sys.id})</span></span>
                        )}
                      </td>
                      <td className="p-3 border border-slate-300 text-center">
                        <div className={clsx("flex gap-1 justify-center", isEditMode && "opacity-50 pointer-events-none")}>
                          {(['OK', 'NOK', 'NA'] as Status[]).map(st => (
                            <button
                              key={st}
                              onClick={() => handleStatusChange(sys.id, st)}
                              className={clsx(
                                "px-3 py-1 rounded font-bold text-xs border transition w-12",
                                sys.status === st
                                  ? (st === 'OK' ? "bg-green-600 text-white border-green-700" :
                                    st === 'NOK' ? "bg-red-600 text-white border-red-700" :
                                      "bg-slate-600 text-white border-slate-700")
                                  : "bg-white text-slate-500 border-slate-300 hover:bg-slate-100"
                              )}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 border border-slate-300">
                        <input
                          disabled={isEditMode || sys.status === 'OK'}
                          className={clsx(
                            "w-full p-2 border rounded text-sm outline-none",
                            errors.has(sys.id) ? "border-red-500 bg-red-50 placeholder-red-300" : "border-slate-200 focus:border-blue-500",
                            (isEditMode || sys.status === 'OK') && "bg-slate-100 text-slate-400 cursor-not-allowed"
                          )}
                          placeholder={errors.has(sys.id) ? "Bắt buộc nhập ghi chú!" : (sys.status === 'OK' ? "OK không cần ghi chú" : "Ghi chú...")}
                          value={sys.note}
                          onChange={(e) => handleNoteChange(sys.id, e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                  {/* Add System Button (Edit Mode Only) */}
                  {isEditMode && (
                    <tr className="bg-slate-50 border-b border-slate-300">
                      <td colSpan={3} className="p-2 text-center">
                        <button
                          onClick={() => handleAddSystem(cat.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center justify-center gap-1 mx-auto py-1 px-3 border border-dashed border-blue-300 rounded hover:bg-blue-50 w-full"
                        >
                          <Plus size={14} /> Thêm hệ thống vào {cat.name}
                        </button>
                      </td>
                    </tr>
                  )}
                </div>
              )
            })}
          </tbody>
        </table>

        {
          !isEditMode && (
            <div className="p-4 bg-slate-100 border-t border-slate-300 flex justify-end sticky bottom-0">
              <button
                onClick={handleSaveChecklist}
                className="px-6 py-3 bg-blue-700 text-white font-bold uppercase rounded shadow hover:bg-blue-800 flex items-center gap-2"
              >
                <Save size={20} /> Lưu Kiểm Tra
              </button>
            </div>
          )
        }

        {
          isChangePasswordOpen && user && (
            <ChangePasswordModal
              userCode={user.code}
              onClose={() => setIsChangePasswordOpen(false)}
            />
          )
        }
      </div >
    </div >
  );
}
