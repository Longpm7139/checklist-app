'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SystemCheck, Status, SystemCategory, MaintenanceTask } from '@/lib/types';
import {
  Save, AlertCircle, Edit2, Trash2, Plus, Check, X, RotateCcw, History as HistoryIcon,
  CheckCheck, Search, LogOut, Users, Lock, ClipboardList, BarChart2, Package,
  Wrench, QrCode, Key, UserCheck, FileText, ArrowRight, CheckCircle, Filter
} from 'lucide-react';
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
  { id: 'A1', categoryId: 'CAT1', name: 'Cầu số 1', status: 'NA', note: '' },
  { id: 'A2', categoryId: 'CAT1', name: 'Cầu số 2', status: 'NA', note: '' },
  { id: 'A3', categoryId: 'CAT1', name: 'Cầu số 3', status: 'NA', note: '' },
  { id: 'A4', categoryId: 'CAT1', name: 'Cầu số 4', status: 'NA', note: '' },
  { id: 'A5', categoryId: 'CAT1', name: 'Cầu số 5', status: 'NA', note: '' },

  { id: 'B1', categoryId: 'CAT2', name: 'Dẫn đỗ D1', status: 'NA', note: '' },
  { id: 'B2', categoryId: 'CAT2', name: 'Dẫn đỗ D2', status: 'NA', note: '' },

  { id: 'C1', categoryId: 'CAT3', name: 'Máy soi 1', status: 'NA', note: '' },
  { id: 'C2', categoryId: 'CAT3', name: 'Máy soi 2', status: 'NA', note: '' },

  { id: 'D1', categoryId: 'CAT4', name: 'Cổng từ 1', status: 'NA', note: '' },
  { id: 'D2', categoryId: 'CAT4', name: 'Cổng từ 2', status: 'NA', note: '' },

  { id: 'E1', categoryId: 'CAT5', name: 'TDS 1', status: 'NA', note: '' },
  { id: 'E2', categoryId: 'CAT5', name: 'TDS 2', status: 'NA', note: '' },

  { id: 'F1', categoryId: 'CAT6', name: 'ACS 1', status: 'NA', note: '' },
  { id: 'F2', categoryId: 'CAT6', name: 'ACS 2', status: 'NA', note: '' },

  { id: 'G1', categoryId: 'CAT7', name: 'TEL 1', status: 'NA', note: '' },
  { id: 'G2', categoryId: 'CAT7', name: 'TEL 2', status: 'NA', note: '' },

  { id: 'H1', categoryId: 'CAT8', name: 'CCTV 1', status: 'NA', note: '' },
  { id: 'H2', categoryId: 'CAT8', name: 'CCTV 2', status: 'NA', note: '' },

  { id: 'I1', categoryId: 'CAT9', name: 'ETC 1', status: 'NA', note: '' },
  { id: 'I2', categoryId: 'CAT9', name: 'ETC 2', status: 'NA', note: '' },

  { id: 'J1', categoryId: 'CAT10', name: 'Thu phí XM 1', status: 'NA', note: '' },
  { id: 'J2', categoryId: 'CAT10', name: 'Thu phí XM 2', status: 'NA', note: '' },

  { id: 'K1', categoryId: 'CAT11', name: 'Cửa trượt 1', status: 'NA', note: '' },
  { id: 'K2', categoryId: 'CAT11', name: 'Cửa trượt 2', status: 'NA', note: '' },
];

import { subscribeToSystems, saveSystem, deleteSystem, subscribeToIncidents, backupAllData, subscribeToDuties, addLog, subscribeToMaintenance } from '@/lib/firebase';

export default function Home() {
  const router = useRouter();
  const [categories, setCategories] = useState<SystemCategory[]>(DEFAULT_CATEGORIES);
  const [systems, setSystems] = useState<SystemCheck[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [duties, setDuties] = useState<any[]>([]);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
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

    // 3. Subscribe to Duties
    const unsubDuties = subscribeToDuties((data) => {
      setDuties(data);
    });

    // 4. Subscribe to Maintenance Tasks
    const unsubTasks = subscribeToMaintenance((data) => {
      setTasks(data as MaintenanceTask[]);
    });

    return () => {
      unsubSys();
      unsubInc();
      unsubDuties();
      unsubTasks();
    };
  }, []);

  const nowD = new Date();
  const shiftD = new Date(nowD);
  if (shiftD.getHours() < 7) {
    shiftD.setDate(shiftD.getDate() - 1);
  }
  const shiftDateStr = `${shiftD.getFullYear()}-${String(shiftD.getMonth() + 1).padStart(2, '0')}-${String(shiftD.getDate()).padStart(2, '0')}`;
  const dayDuty = duties.find(d => d.date === shiftDateStr);
  const isUserOnDuty = dayDuty?.assignments?.some((a: any) => a.userCode === user?.code);

  // Collective categories for the whole team today
  const teamCategoryIds = dayDuty?.assignments?.reduce((acc: string[], a: any) => {
    const ids = a.categoryIds || [];
    return [...acc, ...ids];
  }, []) || [];

  const teamAssignedCategories = categories.filter(c => teamCategoryIds.includes(c.id));

  const handleStatusChange = async (id: string, status: Status) => {
    if (!isUserOnDuty) {
      alert("Chỉ nhân viên trong ca trực mới được phép cập nhật tình trạng!");
      return;
    }
    const now = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
    const target = systems.find(s => s.id === id);
    if (target) {
      const updated = { ...target, status, timestamp: now, inspectorName: user?.name, inspectorCode: user?.code };
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
    if (!isUserOnDuty) return;
    const now = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
    const target = systems.find(s => s.id === id);
    if (target) {
      const updated = { ...target, note, timestamp: now, inspectorName: user?.name, inspectorCode: user?.code };
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
      status: 'NA',
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
    if (!isUserOnDuty) {
      alert("Chỉ nhân viên trong ca trực mới được phép thao tác!");
      return;
    }
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
      if (s.status === 'NA' || !s.status) {
        await saveSystem(s.id, {
          ...s,
          status: 'OK',
          timestamp: now,
          inspectorName: user?.name,
          inspectorCode: user?.code
        });

        // ADD LOG to ensure KPI points are counted!
        await addLog({
          id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
          timestamp: now,
          inspectorName: user?.name || 'Unknown',
          inspectorCode: user?.code || 'UNKNOWN',
          systemId: s.id,
          systemName: s.name,
          result: 'OK',
          note: 'Đã kiểm tra nhanh',
          duration: 30 // Set to exactly 30 to avoid fast-check penalties
        });
      }
    });
    // No need to setSystems, the listener will update it.

    // Clear errors for items that became OK
    setErrors(prev => {
      const next = new Set(prev);
      systems.forEach(s => {
        if (s.status === 'NA') next.delete(s.id); // If we set it to OK, remove error
      });
      return next;
    });
  };

  const handleStartNewShift = async () => {
    if (!isUserOnDuty) {
      alert('Chỉ nhân viên được phân công trong ca trực (07:00 hôm nay - 07:00 hôm sau) mới được phép Bắt đầu ca trực!');
      return;
    }
    if (confirm('Bắt đầu ca trực mới? Thao tác này sẽ reset các trạng thái OK về NA, nhưng GIỮ NGUYÊN các lỗi chưa sửa và MỞ KHÓA để ca sau có thể tiếp tục làm việc.')) {
      const promises = systems.map(s => {
        const isNOK = s.status === 'NOK';
        return saveSystem(s.id, {
          ...s,
          status: isNOK ? 'NOK' : 'NA',
          // Only clear note if it was OK or NA. Keep notes for NOK.
          note: isNOK ? s.note : '',
          timestamp: isNOK ? s.timestamp : '',
          // CLEAR inspector info to UNLOCK for the next shift
          inspectorName: null,
          inspectorCode: null
        });
      });
      await Promise.all(promises);
      alert('Đã giao ca thành công! Các lỗi chưa sửa đã được giữ lại và mở khóa cho ca mới.');
    }
  };

  const handleSaveChecklist = () => {
    // 1. Validate NOK and NA notes
    const newErrors = new Set<string>();
    // Filter for NOK only (NA is default)
    const itemsRequiringNote = systems.filter(s => s.status === 'NOK');

    itemsRequiringNote.forEach(s => {
      if (!s.note.trim()) {
        newErrors.add(s.id);
      }
    });

    if (newErrors.size > 0) {
      setErrors(newErrors);
      alert('Vui lòng nhập ghi chú cho các mục NOK!');
      return;
    }

    // 1.5 Validate that ALL systems in a CATEGORY are checked if the category was started
    const uncheckedCategories: string[] = [];
    const checkedCountTotal = systems.filter(s => s.status && s.status !== 'NA').length;

    if (checkedCountTotal === 0) {
      alert('Vui lòng thực hiện kiểm tra ít nhất một hệ thống trước khi Lưu!');
      return;
    }

    categories.forEach(cat => {
      const catSystems = systems.filter(s => s.categoryId === cat.id);
      const isAnyChecked = catSystems.some(s => s.status && s.status !== 'NA');
      const allChecked = catSystems.every(s => s.status && s.status !== 'NA');

      if (isAnyChecked && !allChecked) {
        uncheckedCategories.push(cat.name);
      }
    });

    if (uncheckedCategories.length > 0) {
      alert(`Bạn đang kiểm tra dở dang các nhóm sau:\n${uncheckedCategories.map(name => `• ${name}`).join('\n')}\n\nVui lòng hoàn thành tất cả hệ thống trong nhóm đã chọn để Lưu!`);
      return;
    }

    // 2. Save is already handled by individual updates.

    // 3. Redirect logic: Link to first NOK reported by CURRENT USER
    const myNokItems = systems.filter(s => s.status === 'NOK' && s.inspectorCode === user?.code);

    if (myNokItems.length > 0) {
      // Go to the first NOK system reported by this user
      router.push(`/check/${myNokItems[0].id}`);
    } else {
      // All of my systems are OK or I checked nothing -> Summary
      router.push('/summary');
    }
  };

  const hasErrors = systems.some(s => s.status === 'NOK');

  // Compute failed category names for the button
  const failedCategoryIds = Array.from(new Set(
    systems
      .filter(s => s.status === 'NOK')
      .map(s => s.categoryId)
  ));

  const failedCategoryNames = failedCategoryIds.map(id => {
    return categories.find(c => c.id === id)?.name || id;
  }).join(', ');

  const buttonText = hasErrors ? `${failedCategoryNames}` : "Tất cả hệ thống";

  const removeAccents = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  };

  const highlightText = (text: string | undefined, query: string) => {
    if (!text) return text;
    if (!query.trim()) return text;

    const normalizedText = removeAccents(text.toLowerCase());
    const normalizedQuery = removeAccents(query.toLowerCase());

    if (!normalizedText.includes(normalizedQuery)) return <>{text}</>;

    const parts = [];
    let currentIndex = 0;
    let matchIndex = normalizedText.indexOf(normalizedQuery, currentIndex);

    while (matchIndex !== -1) {
      if (matchIndex > currentIndex) {
        parts.push(<span key={`text-${currentIndex}`}>{text.slice(currentIndex, matchIndex)}</span>);
      }
      parts.push(
        <mark key={`mark-${matchIndex}`} className="bg-yellow-300 text-slate-900 rounded px-1 font-bold">
          {text.slice(matchIndex, matchIndex + query.length)}
        </mark>
      );
      currentIndex = matchIndex + query.length;
      matchIndex = normalizedText.indexOf(normalizedQuery, currentIndex);
    }

    if (currentIndex < text.length) {
      parts.push(<span key={`text-${currentIndex}`}>{text.slice(currentIndex)}</span>);
    }

    return <>{parts}</>;
  };

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
          {isUserOnDuty && teamAssignedCategories.length > 0 && (
            <div className="mb-4 bg-indigo-600 text-white p-4 rounded-lg shadow-md animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 bg-white/20 rounded-full">
                    <UserCheck size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold uppercase tracking-widest opacity-80">Đội trực hôm nay</div>
                    <div className="text-lg font-bold">
                      Nhóm hệ thống cần kiểm tra:
                      <div className="flex flex-wrap gap-2 mt-1">
                        {teamAssignedCategories.map(cat => (
                          <span
                            key={cat.id}
                            className="text-sm bg-white/20 px-2 py-0.5 rounded border border-white/30 font-medium"
                          >
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right w-full md:w-auto flex flex-col items-end gap-2">
                  <span className="text-xs font-medium opacity-70 italic">* Bạn và đồng đội hỗ trợ nhau kiểm tra các nhóm trên.</span>
                  <button
                    onClick={handleStartNewShift}
                    className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg border border-white/40 text-sm font-bold flex items-center gap-2 transition active:scale-95 shadow-sm"
                  >
                    <RotateCcw size={16} /> Bắt đầu ca trực mới
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isUserOnDuty && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => alert('Chỉ nhân viên được phân công trong ca trực (07:00 hôm nay - 07:00 hôm sau) mới được phép Bắt đầu ca trực!')}
                className="bg-slate-200 text-slate-400 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm border border-slate-300 cursor-not-allowed"
                title="Bạn không được phân công trong ca trực này"
              >
                <RotateCcw size={18} /> Bắt đầu ca trực mới
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Progress Card */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tiến độ kiểm tra</h3>
                  <div className="text-2xl font-bold text-slate-800 flex items-baseline gap-1">
                    {Math.round((systems.filter(s => s.status && s.status !== 'NA').length / systems.length) * 100) || 0}%
                    <span className="text-sm font-normal text-slate-500">
                      ({systems.filter(s => s.status && s.status !== 'NA').length}/{systems.length})
                    </span>
                  </div>
                </div>
                <div className={clsx(
                  "p-2 rounded-lg transition-colors",
                  systems.every(s => s.status !== 'NA') ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                )}>
                  {systems.every(s => s.status !== 'NA') ? <CheckCheck size={20} /> : <ClipboardList size={20} />}
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
                <div
                  className={clsx("h-2.5 rounded-full transition-all duration-500",
                    systems.every(s => s.status !== 'NA') ? "bg-green-500" : "bg-blue-600"
                  )}
                  style={{ width: `${(systems.filter(s => s.status !== 'NA').length / systems.length) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs font-medium">
                <span className="text-blue-600">Đã kiểm: {systems.filter(s => s.status !== 'NA').length}</span>
                <span className="text-slate-400">Chưa kiểm: {systems.filter(s => s.status === 'NA').length}</span>
              </div>
            </div>

            {/* Incidents Card */}
            <div
              onClick={() => router.push('/incidents')}
              className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-red-300 transition-all active:scale-95 group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider group-hover:text-red-600 transition-colors">Sự cố chờ xử lý</h3>
                  <div className="text-2xl font-bold text-slate-800">
                    {incidents.filter((i: any) => i.status === 'OPEN').length}
                  </div>
                </div>
                <div className="p-2 bg-red-100 text-red-600 rounded-lg animate-pulse">
                  <AlertCircle size={20} />
                </div>
              </div>
              <div className="mt-4 text-xs text-red-600 font-medium flex items-center gap-1">
                Cần khắc phục ngay! <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-0 group-hover:translate-x-1" />
              </div>
            </div>

            {/* Maintenance Card */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Bảo trì định kỳ</h3>
                  <div className="text-2xl font-bold text-slate-800">
                    {tasks.filter((t) => t.status === 'PENDING').length}
                  </div>
                </div>
                <div className={clsx("p-2 rounded-lg transition-colors", tasks.some(t => t.status === 'PENDING') ? "bg-cyan-100 text-cyan-600" : "bg-green-100 text-green-600")}>
                  {tasks.some(t => t.status === 'PENDING') ? <Wrench size={20} /> : <CheckCheck size={20} />}
                </div>
              </div>
              <div className="mt-4 text-xs text-slate-400 font-medium">
                {tasks.some(t => t.status === 'PENDING') ? "Cần hoàn thành bảo dưỡng" : "Đã xong lịch bảo dưỡng"}
              </div>
            </div>

            {/* Issues Card */}
            <div
              onClick={() => router.push('/summary')}
              className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-amber-300 transition-all active:scale-95 group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider group-hover:text-amber-600 transition-colors">Lỗi phát hiện hôm nay</h3>
                  <div className="text-2xl font-bold text-slate-800">
                    {systems.filter(s => s.status === 'NOK').length}
                  </div>
                </div>
                <div className={clsx("p-2 rounded-lg transition-colors", systems.some(s => s.status === 'NOK') ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600")}>
                  {systems.some(s => s.status === 'NOK') ? <AlertCircle size={20} /> : <CheckCheck size={20} />}
                </div>
              </div>
              <div className="mt-4 text-xs text-slate-400 flex items-center justify-between">
                <span>{systems.filter(s => s.status === 'NOK').length > 0 ? "Bấm để xem danh sách lỗi" : "Hệ thống ổn định"}</span>
                {systems.some(s => s.status === 'NOK') && <ArrowRight size={12} className="text-amber-500 opacity-50 group-hover:opacity-100 transition-all transform translate-x-0 group-hover:translate-x-1" />}
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

        {/* RESPONSIVE SYSTEMS LIST */}
        <div className="w-full">
          {/* Mobile Card View (hidden on md-up) */}
          <div className="block md:hidden">
            {categories.map(cat => {
              const catSystems = systems.filter(s => {
                const matchesCategory = s.categoryId === cat.id;
                if (!matchesCategory) return false;
                if (!searchQuery.trim()) return true;
                const q = removeAccents(searchQuery.toLowerCase());
                return (
                  removeAccents((s.name ?? '').toLowerCase()).includes(q) ||
                  removeAccents((s.note ?? '').toLowerCase()).includes(q) ||
                  removeAccents((s.id ?? '').toLowerCase()).includes(q) ||
                  removeAccents((s.status ?? '').toLowerCase()).includes(q)
                );
              });

              if (catSystems.length === 0) return null;

              return (
                <div key={cat.id} className="mb-6">
                  <div className="bg-blue-600 text-white px-4 py-2 font-bold uppercase text-sm tracking-widest shadow-sm rounded-t-lg">
                    {cat.name}
                  </div>
                  <div className="bg-white border-x border-b border-slate-200 rounded-b-lg overflow-hidden divide-y divide-slate-100 shadow-sm">
                    {catSystems.map(sys => (
                      <div key={sys.id} className="p-4 active:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            {isEditMode ? (
                              <input
                                value={sys.name}
                                onChange={(e) => handleUpdateSystemName(sys.id, e.target.value)}
                                className="border border-slate-300 rounded px-2 py-1 w-full text-sm font-bold focus:border-blue-500 outline-none"
                              />
                            ) : (
                              <div className="font-bold text-slate-800 flex items-center justify-between gap-2 w-full">
                                <div className="flex items-center gap-2">
                                  {highlightText(sys.name, searchQuery)} <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 uppercase font-mono">{highlightText(sys.id, searchQuery)}</span>
                                </div>
                                {sys.status !== 'NA' && sys.inspectorCode && sys.inspectorCode !== user?.code && (
                                  <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                                    Locked: {sys.inspectorName}
                                  </span>
                                )}
                                {sys.status === 'NA' && systems.some(s => s.categoryId === sys.categoryId && s.status !== 'NA' && s.inspectorCode && s.inspectorCode !== user?.code) && (
                                  <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                                    Locked by {systems.find(s => s.categoryId === sys.categoryId && s.status !== 'NA' && s.inspectorCode && s.inspectorCode !== user?.code)?.inspectorName}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {isEditMode && (
                            <div className="flex gap-1 ml-2">
                              <button onClick={() => handleDeleteSystem(sys.id)} className="p-2 text-red-500 bg-red-50 rounded">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Status Selection (Mobile optimized) */}
                        <div className={clsx(
                          "grid grid-cols-3 gap-2 mb-3",
                          (!isUserOnDuty || isEditMode ||
                            (sys.status !== 'NA' && sys.inspectorCode && sys.inspectorCode !== user?.code) ||
                            (sys.status === 'NA' && systems.some(s => s.categoryId === sys.categoryId && s.status !== 'NA' && s.inspectorCode && s.inspectorCode !== user?.code))
                          ) && "opacity-50 pointer-events-none"
                        )}>
                          {(['OK', 'NOK', 'NA'] as Status[]).map(st => (
                            <button
                              key={st}
                              onClick={() => handleStatusChange(sys.id, st)}
                              className={clsx(
                                "py-3 rounded-lg font-bold text-sm border shadow-sm transition active:scale-95 flex items-center justify-center",
                                sys.status === st || (st === 'NA' && !sys.status)
                                  ? (st === 'OK' ? "bg-green-600 text-white border-green-700" :
                                    st === 'NOK' ? "bg-red-600 text-white border-red-700" :
                                      "bg-slate-600 text-white border-slate-700")
                                  : "bg-white text-slate-500 border-slate-300"
                              )}
                            >
                              {st}
                            </button>
                          ))}
                        </div>

                        {/* Note Input */}
                        <div className="relative">
                          {(() => {
                            const isLocked = !!(!isUserOnDuty || isEditMode ||
                              sys.status === 'OK' ||
                              (sys.status !== 'NA' && sys.inspectorCode && sys.inspectorCode !== user?.code) ||
                              (sys.status === 'NA' && systems.some(s => s.categoryId === sys.categoryId && s.status !== 'NA' && s.inspectorCode && s.inspectorCode !== user?.code)));
                            return (
                              <input
                                disabled={isLocked}
                                className={clsx(
                                  "w-full p-3 border rounded-lg text-sm outline-none transition-all",
                                  errors.has(sys.id) ? "border-red-500 bg-red-50 ring-2 ring-red-200" : "border-slate-200 focus:border-blue-500 bg-slate-50/50",
                                  isLocked && "bg-slate-100 text-slate-400 cursor-not-allowed opacity-60"
                                )}
                                placeholder={errors.has(sys.id) ? "⚠️ Bắt buộc nhập ghi chú!" : (sys.status === 'OK' ? "✅ OK - Không ghi chú" : "📝 Ghi chú...")}
                                value={sys.note}
                                onChange={(e) => handleNoteChange(sys.id, e.target.value)}
                              />
                            );
                          })()}
                        </div>
                      </div>
                    ))}
                    {isEditMode && (
                      <button
                        onClick={() => handleAddSystem(cat.id)}
                        className="w-full py-4 text-blue-600 font-bold text-sm bg-slate-50 hover:bg-blue-50 transition border-t border-slate-100 flex items-center justify-center gap-2"
                      >
                        <Plus size={18} /> Thêm hệ thống mới
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (hidden on small screens) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-slate-200 text-slate-700 font-bold uppercase text-sm">
                <tr>
                  <th className="p-3 border border-slate-300 w-1/3">Hệ thống</th>
                  <th className="p-3 border border-slate-300 text-center w-1/3">Status</th>
                  <th className="p-3 border border-slate-300 w-1/3">Note</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(cat => {
                  const catSystems = systems.filter(s => {
                    const matchesCategory = s.categoryId === cat.id;
                    if (!matchesCategory) return false;
                    if (!searchQuery.trim()) return true;
                    const q = removeAccents(searchQuery.toLowerCase());
                    return (
                      removeAccents((s.name ?? '').toLowerCase()).includes(q) ||
                      removeAccents((s.note ?? '').toLowerCase()).includes(q) ||
                      removeAccents((s.id ?? '').toLowerCase()).includes(q) ||
                      removeAccents((s.status ?? '').toLowerCase()).includes(q)
                    );
                  });

                  if (catSystems.length === 0) return null;

                  return (
                    <React.Fragment key={cat.id}>
                      <tr className="bg-blue-50">
                        <td colSpan={3} className="p-3 border border-slate-300 font-bold text-blue-800">
                          {cat.name}
                        </td>
                      </tr>
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
                                <button onClick={() => handleDeleteSystem(sys.id)} className="text-red-500 hover:text-red-700 p-1">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ) : (
                              <span>{highlightText(sys.name, searchQuery)} <span className="text-xs text-slate-400 font-normal">({highlightText(sys.id, searchQuery)})</span></span>
                            )}
                          </td>
                          <td className="p-3 border border-slate-300 text-center">
                            {(() => {
                              const otherInspector = systems.find(s => s.categoryId === sys.categoryId && s.status !== 'NA' && s.inspectorCode && s.inspectorCode !== user?.code)?.inspectorName;
                              const isCategoryLocked = !!otherInspector;

                              return (
                                <>
                                  {isCategoryLocked && (
                                    <div className="text-[10px] text-amber-600 font-bold mb-1">Locked by {otherInspector}</div>
                                  )}
                                  <div className={clsx(
                                    "flex gap-1 justify-center",
                                    (!isUserOnDuty || isEditMode || isCategoryLocked || (sys.status !== 'NA' && sys.inspectorCode && sys.inspectorCode !== user?.code)) && "opacity-50 pointer-events-none"
                                  )}>
                                    {(['OK', 'NOK', 'NA'] as Status[]).map(st => (
                                      <button
                                        key={st}
                                        onClick={() => handleStatusChange(sys.id, st)}
                                        className={clsx(
                                          "px-2 py-1 rounded text-xs font-bold border transition w-10 shadow-sm",
                                          (sys.status === st || (st === 'NA' && !sys.status))
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
                                </>
                              );
                            })()}
                          </td>
                          <td className="p-3 border border-slate-300">
                            {(() => {
                              const isLocked = !!(!isUserOnDuty || isEditMode ||
                                sys.status === 'OK' ||
                                (sys.status !== 'NA' && sys.inspectorCode && sys.inspectorCode !== user?.code) ||
                                (sys.status === 'NA' && systems.some(s => s.categoryId === sys.categoryId && s.status !== 'NA' && s.inspectorCode && s.inspectorCode !== user?.code)));
                              return (
                                <input
                                  disabled={isLocked}
                                  className={clsx(
                                    "w-full p-2 border rounded text-sm outline-none",
                                    errors.has(sys.id) ? "border-red-500 bg-red-50 placeholder-red-300" : "border-slate-200 focus:border-blue-500",
                                    isLocked && "bg-slate-100 text-slate-400 cursor-not-allowed"
                                  )}
                                  placeholder={errors.has(sys.id) ? "Bắt buộc nhập ghi chú!" : (sys.status === 'OK' ? "OK không cần ghi chú" : "Ghi chú...")}
                                  value={sys.note}
                                  onChange={(e) => handleNoteChange(sys.id, e.target.value)}
                                />
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                      {isEditMode && (
                        <tr className="bg-slate-50 border-b border-slate-300">
                          <td colSpan={3} className="p-2 text-center" onClick={() => handleAddSystem(cat.id)}>
                            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center justify-center gap-1 mx-auto py-1 px-3 border border-dashed border-blue-300 rounded hover:bg-blue-50 w-full">
                              <Plus size={14} /> Thêm hệ thống mới
                            </button>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

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
