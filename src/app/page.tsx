'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { SystemCheck, Status, SystemCategory, MaintenanceTask } from '@/lib/types';
import {
  Save, AlertCircle, Edit2, Trash2, Plus, Check, X, RotateCcw, History as HistoryIcon,
  CheckCheck, Search, LogOut, Users, Lock, ClipboardList, BarChart2, Package,
  Wrench, QrCode, Key, UserCheck, FileText, ArrowRight, CheckCircle, Filter, AlertTriangle, Send
} from 'lucide-react';
import clsx from 'clsx';
import { useUser } from '@/providers/UserProvider';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import { IMESafeInput } from '@/components/IMESafeInput';
import { ImageUpload } from '@/components/ImageUpload';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle, HeadingLevel, VerticalAlign
} from 'docx';
import { saveAs } from 'file-saver';

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

import {
  subscribeToSystems,
  saveSystem,
  deleteSystem,
  subscribeToIncidents,
  backupAllData,
  subscribeToDuties,
  addLog,
  subscribeToMaintenance,
  subscribeToCategories,
  saveCategory,
  deleteCategory,
  subscribeToHistory
} from '@/lib/firebase';

// --- HELPER COMPONENT FOR IME-SAFE DEBOUNCED INPUT ---
// (Moved to shared components/IMESafeInput.tsx)

export default function Home() {
  const router = useRouter();

  // --- UTILS ---
  const parseVNTime = (date?: Date) => {
    const d = date || new Date();
    const utcTime = d.getTime() + (d.getTimezoneOffset() * 60000);
    const vnTime = new Date(utcTime + (3600000 * 7));
    return vnTime;
  };
  const [categories, setCategories] = useState<SystemCategory[]>([]);
  const [systems, setSystems] = useState<SystemCheck[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [duties, setDuties] = useState<any[]>([]);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionInteractedNokIds, setSessionInteractedNokIds] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<any[]>([]);
  const [isHandoffModalOpen, setIsHandoffModalOpen] = useState(false);
  const [showReminder, setShowReminder] = useState(true);

  // --- SHIFT REMINDER LOGIC ---
  const isLastHourOfShift = useMemo(() => {
    const now = parseVNTime();
    const hour = now.getHours();

    // Day Shift: 18:00 - 19:00
    const isDayShiftEnd = hour === 18;
    // Night Shift: 06:00 - 07:00
    const isNightShiftEnd = hour === 6;

    // Check if on-duty staff has any NA systems
    const hasUncheckedSystems = systems.some(s => s.status === 'NA');

    return (isDayShiftEnd || isNightShiftEnd) && hasUncheckedSystems;
  }, [systems]);

  const { user, logout } = useUser();

  // Determine Current Shift Type (Day: 07:00-19:00, Night: 19:00-07:00)
  const nowD = new Date();
  const currentHour = nowD.getHours();
  const currentShiftType = (currentHour >= 7 && currentHour < 19) ? 'DAY' : 'NIGHT';

  // Handle shift date (Night shift 19:00 - 07:00 spans two calendar days)
  // If hour is 00-06, we are still on the duty of the previous calendar day's NIGHT shift
  const shiftD = new Date(nowD);
  if (currentHour < 7) {
    shiftD.setDate(shiftD.getDate() - 1);
  }
  const shiftDateStr = `${shiftD.getFullYear()}-${String(shiftD.getMonth() + 1).padStart(2, '0')}-${String(shiftD.getDate()).padStart(2, '0')}`;

  const todayDuty = duties.find(d => d.date === shiftDateStr);

  // Filter assignments for the CURRENT shift of the determined duty date
  const currentShiftAssignments = todayDuty?.assignments?.filter((a: any) => a.shift === currentShiftType) || [];

  const isUserOnDuty = currentShiftAssignments.some((a: any) => a.userCode === user?.code) || user?.role === 'ADMIN';

  // Identify categories assigned to the user OR their teammates in the SAME current shift
  const teamAssignedCategories = categories.filter(cat =>
    currentShiftAssignments.some((a: any) =>
      a.categoryIds && a.categoryIds.includes(cat.id)
    )
  );

  const uncheckedCount = systems.filter(s => s.status === 'NA').length;
  const buttonText = uncheckedCount > 0 ? `Đánh dấu ${uncheckedCount}` : "Tất cả";

  useEffect(() => {
    const unsubSystems = subscribeToSystems((data) => {
      setSystems(data);
      setIsLoaded(true);
    });
    const unsubIncidents = subscribeToIncidents(setIncidents);
    const unsubDuties = subscribeToDuties(setDuties);
    const unsubMaintenance = subscribeToMaintenance(setTasks);
    const unsubHistory = subscribeToHistory(setHistory);
    const unsubCategories = subscribeToCategories(async (data) => {
      if (data.length === 0) {
        // Seed if empty
        for (const cat of DEFAULT_CATEGORIES) {
          await saveCategory(cat.id, cat);
        }
      } else {
        // Sort categories by ID if needed, or by name
        setCategories(data.sort((a, b) => {
          // Extract leading letter and number if possible for natural sort
          return a.id.localeCompare(b.id, undefined, { numeric: true });
        }));
      }
    });

    return () => {
      unsubSystems();
      unsubIncidents();
      unsubDuties();
      unsubMaintenance();
      unsubHistory();
      unsubCategories();
    };
  }, []);

  const handleStatusChange = async (id: string, status: Status) => {
    if (!isUserOnDuty) return;

    const now = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
    const target = systems.find(s => s.id === id);
    if (target) {
      const updated = { 
        ...target, 
        status, 
        timestamp: now, 
        inspectorName: user?.name, 
        inspectorCode: user?.code,
        imageUrl: status === 'OK' ? '' : target.imageUrl
      };
      await saveSystem(id, updated);

      if (status === 'NOK') {
        setSessionInteractedNokIds(prev => new Set(prev).add(id));
      } else {
        setSessionInteractedNokIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }

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

      if (target.status === 'NOK') {
        setSessionInteractedNokIds(prev => new Set(prev).add(id));
      }

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

  const handleAddCategory = async () => {
    const nameInput = prompt("Nhập tên nhóm hệ thống mới (ví dụ: I. Hệ thống Icute):");
    if (!nameInput || !nameInput.trim()) return;

    // Generate a simple ID based on existing categories length or similar
    const nextId = `CAT${categories.length + 1}`;
    await saveCategory(nextId, { id: nextId, name: nameInput.trim() });
  };

  const handleUpdateCategoryName = async (id: string, newName: string) => {
    await saveCategory(id, { name: newName });
  };

  const handleDeleteCategory = async (id: string) => {
    const systemsInCat = systems.filter(s => s.categoryId === id);
    if (systemsInCat.length > 0) {
      alert(`Không thể xóa nhóm này vì vẫn còn ${systemsInCat.length} hệ thống bên trong. Hãy xóa các hệ thống con trước.`);
      return;
    }
    if (confirm('Bạn có chắc chắn muốn xóa NHÓM hệ thống này không?')) {
      await deleteCategory(id);
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
      // Delete all current systems
      for (const s of systems) {
        await deleteSystem(s.id);
      }
      // Delete all current categories
      for (const c of categories) {
        await deleteCategory(c.id);
      }
      // Add defaults categories
      for (const c of DEFAULT_CATEGORIES) {
        await saveCategory(c.id, c);
      }
      // Add defaults systems
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

    systems.forEach(async (s) => {
      if (s.status === 'NA' || !s.status) {
        await saveSystem(s.id, {
          ...s,
          status: 'OK',
          timestamp: now,
          inspectorName: user?.name,
          inspectorCode: user?.code
        });

        await addLog({
          id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
          timestamp: now,
          inspectorName: user?.name || 'Unknown',
          inspectorCode: user?.code || 'UNKNOWN',
          systemId: s.id,
          systemName: s.name,
          result: 'OK',
          note: 'Đã kiểm tra nhanh',
          duration: 30
        });
      }
    });

    setErrors(prev => {
      const next = new Set(prev);
      systems.forEach(s => {
        if (s.status === 'NA') next.delete(s.id);
      });
      return next;
    });
  };

  const handleStartNewShift = async () => {
    if (!isUserOnDuty) {
      alert('Chỉ nhân viên được phân công trong ca trực hiện tại mới được phép Bắt đầu ca trực!');
      return;
    }

    // --- SMART PREVENTION: Check if shift already started ---
    const nowD = new Date();
    const currentHour = nowD.getHours();
    const shiftStart = new Date(nowD);
    shiftStart.setSeconds(0, 0);
    shiftStart.setMilliseconds(0);

    // Determine the exact boundary of the current shift (07:00 or 19:00)
    if (currentHour >= 7 && currentHour < 19) {
      shiftStart.setHours(7, 0, 0, 0);
    } else {
      shiftStart.setHours(19, 0, 0, 0);
      if (currentHour < 7) {
        shiftStart.setDate(shiftStart.getDate() - 1);
      }
    }

    // Check progress against shiftStart
    const hasProgressToday = systems.some(s => {
      if (!s.inspectorCode || !s.timestamp) return false;

      try {
        // Robust VI-VN parsing: handles "20:12 24/03/2026" or "24/03/2026 20:12"
        const parts = s.timestamp.split(/[/, : ]+/).filter(Boolean);
        const yearIdx = parts.findIndex(p => p.length === 4);
        if (yearIdx === -1) return false;

        let day, month, year, hour, minute;
        if (yearIdx === 4) { // Format: HH mm DD MM YYYY
          hour = parseInt(parts[0]);
          minute = parseInt(parts[1]);
          day = parseInt(parts[2]);
          month = parseInt(parts[3]) - 1;
          year = parseInt(parts[4]);
        } else { // Format: DD MM YYYY HH mm
          day = parseInt(parts[0]);
          month = parseInt(parts[1]) - 1;
          year = parseInt(parts[2]);
          hour = parseInt(parts[3]);
          minute = parseInt(parts[4]);
        }

        const systemTime = new Date(year, month, day, hour, minute);
        return systemTime >= shiftStart;
      } catch (e) {
        return false;
      }
    });

    if (hasProgressToday) {
      alert('Thông báo: Ca trực này đã được bắt đầu và đang có dữ liệu kiểm tra từ đồng nghiệp (hoặc từ chính bạn). Bạn không cần bấm "Bắt đầu ca trực" nữa, hãy tiếp tục thực hiện kiểm tra các hệ thống còn lại.');
      return;
    }
    // --- END SMART PREVENTION ---

    if (confirm('Bắt đầu ca trực mới? Thao tác này sẽ reset các trạng thái OK về NA, nhưng GIỮ NGUYÊN các lỗi chưa sửa và MỞ KHÓA để ca sau có thể tiếp tục làm việc.')) {
      const promises = systems.map(s => {
        const isNOK = s.status === 'NOK';
        return saveSystem(s.id, {
          ...s,
          status: isNOK ? 'NOK' : 'NA',
          note: isNOK ? s.note : '',
          timestamp: isNOK ? s.timestamp : '',
          inspectorName: null,
          inspectorCode: null
        });
      });
      await Promise.all(promises);
      alert('Đã giao ca thành công! Các lỗi chưa sửa đã được giữ lại và mở khóa cho ca mới.');
    }
  };

  const handleSaveChecklist = () => {
    const newErrors = new Set<string>();
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

    const uncheckedCategories: string[] = [];
    const checkedCountTotal = systems.filter(s => s.status && s.status !== 'NA' && !!s.inspectorCode).length;

    if (checkedCountTotal === 0) {
      alert('Vui lòng thực hiện kiểm tra ít nhất một hệ thống trước khi Lưu!');
      return;
    }

    const myNokItems = systems.filter(s => s.status === 'NOK' && s.inspectorCode === user?.code);
    const newlyInteractedNokItems = myNokItems.filter(s => sessionInteractedNokIds.has(s.id));

    if (newlyInteractedNokItems.length > 0) {
      sessionStorage.setItem('pendingNokChecks', JSON.stringify(newlyInteractedNokItems.map(s => s.id)));
      router.push(`/check/${newlyInteractedNokItems[0].id}`);
    } else if (myNokItems.length > 0) {
      sessionStorage.setItem('pendingNokChecks', JSON.stringify([myNokItems[0].id]));
      router.push(`/check/${myNokItems[0].id}`);
    } else {
      sessionStorage.removeItem('pendingNokChecks');
      router.push('/summary');
    }
  };

  const hasErrors = systems.some(s => s.status === 'NOK');

  const failedCategoryIds = Array.from(new Set(
    systems
      .filter(s => s.status === 'NOK')
      .map(s => s.categoryId)
  ));

  const failedCategoryNames = failedCategoryIds.map(id => {
    return categories.find(c => c.id === id)?.name || id;
  }).join(', ');

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
      <div className="max-w-4xl mx-auto bg-white border border-slate-300 shadow-sm relative pb-28">
        <h1 className="text-xl font-bold bg-slate-800 text-white p-4 text-center uppercase flex justify-between items-center relative">
          <div className="flex flex-col items-start gap-1">
            <span>Bảng Kiểm Tra Hệ Thống</span>
            {user && <span className="text-xs font-normal text-slate-300 normal-case">Nhân viên: {user.name} ({user.code})</span>}
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
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
        </h1>

        <div className="bg-slate-50 p-4 border-b border-slate-200">
          {/* Shift Reminder Banner */}
          {isLastHourOfShift && showReminder && (
            <div className="mb-4 bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500 shadow-sm">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2.5 bg-amber-100 text-amber-600 rounded-full animate-bounce h-fit">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Nhắc nhở hoàn tất ca trực</h4>
                  <p className="text-[11px] sm:text-xs text-amber-700 font-medium leading-tight">Vẫn còn một số hệ thống chưa được kiểm tra. Bạn hãy tranh thủ hoàn thành nốt trước khi hết ca nhé!</p>
                </div>
              </div>
              <button
                onClick={() => setShowReminder(false)}
                className="p-2 hover:bg-amber-100 text-amber-400 hover:text-amber-600 rounded-lg transition-colors flex-shrink-0"
                title="Đóng thông báo"
              >
                <X size={20} />
              </button>
            </div>
          )}

          {isUserOnDuty && teamAssignedCategories.length > 0 && (
            <div className="mb-4 bg-indigo-600 text-white p-4 rounded-lg shadow-md">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 bg-white/20 rounded-full">
                    <UserCheck size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold uppercase tracking-widest opacity-80 flex justify-between items-center">
                      <span>Đội trực: {currentShiftType === 'DAY' ? 'Ca Ngày (07:00 - 19:00)' : 'Ca Đêm (19:00 - 07:00)'}</span>
                      <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">Ngày: {shiftDateStr.split('-').reverse().join('/')}</span>
                    </div>
                    <div className="text-lg font-bold mb-1">
                      {currentShiftAssignments.map((a: any) => a.userName).join(' & ') || 'Chưa trực'}
                    </div>
                    <div className="text-[10px] font-medium opacity-90 border-t border-white/10 pt-1">
                      Phân công kiểm tra các nhóm:
                      <div className="flex flex-wrap gap-2 mt-1">
                        {teamAssignedCategories.map(cat => {
                          const catSystems = systems.filter(s => s.categoryId === cat.id);
                          const isDone = catSystems.length > 0 && catSystems.every(s => s.status && s.status !== 'NA');

                          return (
                            <button
                              key={cat.id}
                              onClick={() => {
                                const el = document.getElementById(`category-${cat.id}`);
                                if (el) {
                                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                              }}
                              className={clsx(
                                "text-xs px-2 py-1 rounded border font-bold transition-all active:scale-95 flex items-center gap-1 shadow-sm",
                                isDone
                                  ? "bg-green-500 text-white border-green-400 hover:bg-green-400"
                                  : "bg-white/20 text-white border-white/30 hover:bg-white/30"
                              )}
                            >
                              {isDone && <Check size={12} />}
                              {cat.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right w-full md:w-auto flex flex-col items-end gap-2">
                  <span className="text-xs font-medium opacity-70 italic">* Bạn và đồng đội hỗ trợ nhau kiểm tra các nhóm trên.</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setIsHandoffModalOpen(true)}
                      className="bg-green-500 hover:bg-green-400 text-white px-3 py-1.5 rounded-lg border border-green-400 text-sm font-bold flex items-center gap-2 transition active:scale-95 shadow-sm"
                    >
                      <FileText size={16} /> Bàn giao ca (Zalo)
                    </button>
                    <button
                      onClick={handleStartNewShift}
                      className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg border border-white/40 text-sm font-bold flex items-center gap-2 transition active:scale-95 shadow-sm"
                    >
                      <RotateCcw size={16} /> Bắt đầu ca trực mới
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isUserOnDuty && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => alert('Chỉ nhân viên được phân công trong ca trực hiện tại mới được phép thao tác!')}
                className="bg-slate-200 text-slate-400 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm border border-slate-300 cursor-not-allowed"
                title="Bạn không được phân công trong ca trực này"
              >
                <RotateCcw size={18} /> Bắt đầu ca trực mới
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                  <AlertCircle size={20} />
                </div>
              </div>
              <div className="mt-4 text-xs text-amber-600 font-medium flex items-center gap-1">
                Xem chi tiết & Gửi Zalo <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-0 group-hover:translate-x-1" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 col-span-2 md:col-span-1 lg:col-span-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider text-red-600">Nhóm hệ thống đang lỗi</h3>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {failedCategoryIds.length > 0 ? (
                      failedCategoryIds.map(id => {
                        const cat = categories.find(c => c.id === id);
                        return (
                          <span key={id} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-bold border border-red-200 whitespace-nowrap">
                            {cat?.name || id}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-xs text-green-600 font-medium italic">Tất cả hệ thống OK</span>
                    )}
                  </div>
                </div>
                <div className={clsx("p-2 rounded-lg transition-colors", failedCategoryIds.length > 0 ? "bg-red-100 text-red-600 animate-pulse" : "bg-green-100 text-green-600")}>
                  <AlertTriangle size={20} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {isSearchOpen && (
          <div className="p-4 bg-white border-b border-slate-200 animate-in slide-in-from-top-2 duration-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input
                autoFocus
                type="text"
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
                placeholder="Tìm hệ thống theo mã (A1, B2...), tên hoặc ghi chú..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="p-4 md:hidden">
          <div className="bg-pink-600 text-white p-4 font-black text-center mb-4 rounded-lg shadow-xl animate-pulse">
            📢 ĐÂY LÀ GIAO DIỆN DI ĐỘNG (MOBILE VIEW)
          </div>
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

            if (catSystems.length === 0 && !isEditMode) return null;

            return (
              <div key={cat.id} id={`category-${cat.id}`} className="mb-6 scroll-mt-20">
                <div className="bg-blue-600 text-white px-4 py-2 font-bold uppercase text-sm tracking-widest shadow-sm rounded-t-lg flex justify-between items-center group">
                  {isEditMode ? (
                    <div className="flex items-center gap-2 w-full">
                      <IMESafeInput
                        value={cat.name}
                        onChangeValue={(val: string) => handleUpdateCategoryName(cat.id, val)}
                        className="bg-blue-700 border-none text-white px-2 py-1 rounded w-full outline-none focus:ring-1 focus:ring-white/50"
                      />
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1 hover:bg-red-500 rounded transition-colors text-white/70 hover:text-white"
                        title="Xóa nhóm"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <span>{cat.name}</span>
                  )}
                </div>
                <div className="bg-white border-x border-b border-slate-200 rounded-b-lg overflow-hidden divide-y divide-slate-100 shadow-sm">
                  {catSystems.map(sys => (
                    <div key={sys.id} className="p-4 active:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          {isEditMode ? (
                            <IMESafeInput
                              value={sys.name}
                              onChangeValue={(val: string) => handleUpdateSystemName(sys.id, val)}
                              className="border border-slate-300 rounded px-2 py-1 w-full text-sm font-bold focus:border-blue-500 outline-none"
                            />
                          ) : (
                            <div className="font-bold text-slate-800 flex items-center justify-between gap-2 w-full">
                              <div className="flex items-center gap-2">
                                {highlightText(sys.name, searchQuery)} <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 uppercase font-mono">{highlightText(sys.id, searchQuery)}</span>
                              </div>
                              {sys.status === 'IN_PROGRESS' && (
                                <span className="text-[9px] bg-orange-100 text-orange-700 font-black px-2 py-0.5 rounded-full border border-orange-200 animate-pulse">
                                  Đang kiểm tra: {sys.inspectorName || 'Nối tiếp'}
                                </span>
                              )}
                              {sys.status !== 'NA' && sys.status !== 'IN_PROGRESS' && sys.inspectorCode && sys.inspectorCode !== user?.code && (
                                <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                                  Khóa: {sys.inspectorName}
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

                      <div className={clsx(
                        "grid grid-cols-3 gap-2 mb-3",
                        (!isUserOnDuty || isEditMode ||
                          (user?.role !== 'ADMIN' && (
                            (sys.status === 'NOK' && !sys.inspectorCode) ||
                            (sys.status === 'IN_PROGRESS' && sys.inspectorCode !== user?.code) ||
                            (sys.status !== 'NA' && sys.status !== 'IN_PROGRESS' && sys.inspectorCode && sys.inspectorCode !== user?.code) ||
                            (sys.status === 'NA' && systems.some(s => s.categoryId === sys.categoryId && s.status === 'IN_PROGRESS' && s.inspectorCode && s.inspectorCode !== user?.code))
                          ))
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

                      <div className="relative">
                        {(() => {
                          const isLocked = !!(!isUserOnDuty || isEditMode ||
                            (user?.role !== 'ADMIN' && (
                              sys.status === 'OK' ||
                              (sys.status === 'NOK' && !sys.inspectorCode) ||
                              (sys.status === 'IN_PROGRESS' && sys.inspectorCode !== user?.code) ||
                              (sys.status !== 'NA' && sys.status !== 'IN_PROGRESS' && sys.inspectorCode && sys.inspectorCode !== user?.code) ||
                              (sys.status === 'NA' && systems.some(s => s.categoryId === sys.categoryId && s.status === 'IN_PROGRESS' && s.inspectorCode && s.inspectorCode !== user?.code))
                            )));
                          return (
                            <IMESafeInput
                              disabled={isLocked}
                              className={clsx(
                                "w-full p-3 border rounded-lg text-sm outline-none transition-all",
                                errors.has(sys.id) ? "border-red-500 bg-red-50 ring-2 ring-red-200" : "border-slate-200 focus:border-blue-500 bg-slate-50/50",
                                isLocked && "bg-slate-100 text-slate-400 cursor-not-allowed opacity-60"
                              )}
                              placeholder={errors.has(sys.id) ? "⚠️ Bắt buộc nhập ghi chú!" : (sys.status === 'OK' ? "✅ OK - Không ghi chú" : "📝 [PHÂN TÍCH LỖI V4] Ghi chú & Chụp ảnh...")}
                              value={sys.note}
                              onChangeValue={(val: string) => handleNoteChange(sys.id, val)}
                            />
                          );
                        })()}
                      </div>
                      {sys.status === 'NOK' && (
                        <div className="mt-4 p-4 border-4 border-double border-red-600 bg-white rounded-xl">
                           <p className="text-red-600 font-black text-sm mb-2 text-center">👇 NÚT CHỤP ẢNH TEST V4 👇</p>
                           <input 
                              type="file" 
                              accept="image/*" 
                              capture="environment" 
                              id={`raw-camera-${sys.id}`}
                              className="hidden"
                              onChange={async (e) => {
                                 const file = e.target.files?.[0];
                                 if (!file) return;
                                 const url = await uploadImage(file, `systems/${sys.id}_${Date.now()}.jpg`);
                                 const target = systems.find(s => s.id === sys.id);
                                 if (target) await saveSystem(sys.id, { ...target, imageUrl: url });
                              }}
                           />
                           <button
                             type="button"
                             onClick={() => document.getElementById(`raw-camera-${sys.id}`)?.click()}
                             style={{ background: 'red', color: 'white', padding: '20px', borderRadius: '12px', fontWeight: 'bold', width: '100%', fontSize: '18px', boxShadow: '0 4px 15px rgba(255,0,0,0.3)' }}
                           >
                              Bấm Đây Để Mở Camera
                           </button>
                           {sys.imageUrl && (
                             <div className="mt-4 flex flex-col items-center">
                               <p className="text-[10px] text-green-600 font-bold mb-1">ẢNH ĐÃ TẢI LÊN:</p>
                               <img src={sys.imageUrl} className="w-24 h-24 object-cover rounded-lg border-2 border-green-500" />
                             </div>
                           )}
                        </div>
                      )}
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
          {isEditMode && (
            <button
              onClick={handleAddCategory}
              className="w-full py-4 mb-8 bg-white border-2 border-dashed border-blue-300 rounded-xl text-blue-600 font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition-all active:scale-95"
            >
              <Plus size={20} /> Thêm nhóm hệ thống mới
            </button>
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <div className="bg-cyan-600 text-white p-4 font-black text-center mb-4 rounded-lg shadow-xl">
            📢 ĐÂY LÀ GIAO DIỆN BẢNG MÁY TÍNH (DESKTOP TABLE)
          </div>
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead className="bg-slate-200 text-slate-700 font-bold uppercase text-sm">
              <tr>
                <th className="p-3 border border-slate-300 w-1/3">Hệ thống</th>
                <th className="p-3 border border-slate-300 text-center w-48">Status</th>
                <th className="p-3 border border-slate-300">Note</th>
                <th className="p-3 border border-slate-300 w-24">Ảnh</th>
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

                if (catSystems.length === 0 && !isEditMode) return null;

                return (
                  <React.Fragment key={cat.id}>
                    <tr id={`category-${cat.id}`} className="bg-blue-50 group scroll-mt-20">
                      <td colSpan={4} className="p-3 border border-slate-300 font-bold text-blue-800">
                        <div className="flex justify-between items-center">
                          {isEditMode ? (
                            <div className="flex items-center gap-2 w-full">
                              <IMESafeInput
                                value={cat.name}
                                onChangeValue={(val: string) => handleUpdateCategoryName(cat.id, val)}
                                className="bg-white border border-blue-200 rounded px-2 py-1 w-full max-w-md outline-none focus:border-blue-500"
                              />
                            </div>
                          ) : (
                            <span>{cat.name}</span>
                          )}
                          {isEditMode && (
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="text-red-500 hover:text-red-700 p-1 bg-red-50 rounded"
                              title="Xóa nhóm"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {catSystems.map(sys => (
                      <tr key={sys.id} className="hover:bg-slate-50">
                        <td className="p-3 border border-slate-300 font-medium pl-8">
                          {isEditMode ? (
                            <div className="flex items-center gap-2">
                              <IMESafeInput
                                value={sys.name}
                                onChangeValue={(val: string) => handleUpdateSystemName(sys.id, val)}
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
                            const isCategoryLocked = !!otherInspector && user?.role !== 'ADMIN';

                            return (
                              <>
                                {isCategoryLocked && (
                                  <div className="text-[10px] text-amber-600 font-bold mb-1">Locked by {otherInspector}</div>
                                )}
                                <div className={clsx(
                                  "flex gap-1 justify-center",
                                  (!isUserOnDuty || isEditMode || isCategoryLocked || (user?.role !== 'ADMIN' && ((sys.status === 'NOK' && !sys.inspectorCode) || (sys.status !== 'NA' && sys.inspectorCode && sys.inspectorCode !== user?.code)))) && "opacity-50 pointer-events-none"
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
                              (user?.role !== 'ADMIN' && (
                                sys.status === 'OK' ||
                                (sys.status === 'NOK' && !sys.inspectorCode) ||
                                (sys.status === 'IN_PROGRESS' && sys.inspectorCode !== user?.code) ||
                                (sys.status !== 'NA' && sys.status !== 'IN_PROGRESS' && sys.inspectorCode && sys.inspectorCode !== user?.code) ||
                                (sys.status === 'NA' && systems.some(s => s.categoryId === sys.categoryId && s.status === 'IN_PROGRESS' && s.inspectorCode && s.inspectorCode !== user?.code))
                              )));
                            return (
                              <IMESafeInput
                                disabled={isLocked}
                                className={clsx(
                                  "w-full p-2 border rounded text-sm outline-none",
                                  errors.has(sys.id) ? "border-red-500 bg-red-50 placeholder-red-300" : "border-slate-200 focus:border-blue-500",
                                  isLocked && "bg-slate-100 text-slate-400 cursor-not-allowed"
                                )}
                                placeholder={errors.has(sys.id) ? "Bắt buộc nhập ghi chú!" : (sys.status === 'OK' ? "OK không cần ghi chú" : "Ghi chú...")}
                                value={sys.note}
                                onChangeValue={(val) => handleNoteChange(sys.id, val)}
                              />
                            );
                          })()}
                        </td>
                        <td className="p-3 border border-slate-300 text-center">
                          {sys.status === 'NOK' ? (
                            <ImageUpload 
                              value={sys.imageUrl}
                              onChange={async (url) => {
                                const target = systems.find(s => s.id === sys.id);
                                if (target) {
                                  await saveSystem(sys.id, { ...target, imageUrl: url });
                                }
                              }}
                              path={`systems/${sys.id}_${Date.now()}.jpg`}
                              disabled={!isUserOnDuty || isEditMode}
                            />
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                     {isEditMode && (
                      <tr className="bg-slate-50">
                        <td colSpan={4} className="p-3 border border-slate-300 pl-8">
                          <button
                            onClick={() => handleAddSystem(cat.id)}
                            className="text-blue-600 font-bold text-sm flex items-center gap-2 hover:text-blue-800 transition shadow-sm bg-white border border-blue-200 px-3 py-1 rounded-md"
                          >
                            <Plus size={16} /> Thêm hệ thống mới
                          </button>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {isEditMode && (
                <tr>
                  <td colSpan={3} className="p-4 border border-slate-300 text-center">
                    <button
                      onClick={handleAddCategory}
                      className="w-full py-3 bg-white border-2 border-dashed border-blue-300 rounded-lg text-blue-600 font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition-all"
                    >
                      <Plus size={20} /> Thêm nhóm hệ thống mới
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!isUserOnDuty && (
          <div className="p-6 bg-slate-50 border-t border-slate-200 sticky bottom-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
            <div className="bg-amber-50 text-amber-700 p-4 rounded-xl border border-amber-200 flex items-center gap-3 w-full max-w-4xl mx-auto">
              <Lock size={24} className="flex-shrink-0" />
              <div className="text-sm font-medium"> Bạn không được phân công trực trong ca này. Chỉ được quyền Xem và Admin mới được thao tác. </div>
            </div>
          </div>
        )}
      </div>

      {isUserOnDuty && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
          {/* Label Tooltips for Desktop - ADMIN ONLY */}
          {user?.role === 'ADMIN' && (
            <button
              onClick={handleMarkAllOK}
              className="p-3 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-xl transition-all active:scale-90 flex items-center gap-2 pointer-events-auto group md:hover:pr-4 order-2"
              title="Đánh dấu tất cả OK (Dành cho Admin)"
            >
              <span className="hidden md:inline overflow-hidden max-w-0 group-hover:max-w-xs transition-all duration-300 font-bold text-sm whitespace-nowrap">
                {buttonText} OK (Admin)
              </span>
              <CheckCircle size={24} />
            </button>
          )}

          <button
            onClick={handleSaveChecklist}
            className="p-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-2xl transition-all active:scale-95 flex items-center gap-2 pointer-events-auto group md:hover:pr-5 order-3"
            title="Lưu & Báo cáo"
          >
            <span className="hidden md:inline overflow-hidden max-w-0 group-hover:max-w-xs transition-all duration-300 font-bold whitespace-nowrap border-r border-white/20 mr-1 pr-2">
              Lưu & Báo cáo
            </span>
            <Save size={28} />
          </button>
        </div>
      )}

      {isHandoffModalOpen && (
        <HandoffModal
          systems={systems}
          history={history}
          incidents={incidents}
          assignments={currentShiftAssignments}
          shiftType={currentShiftType}
          onClose={() => setIsHandoffModalOpen(false)}
        />
      )}

      {isChangePasswordOpen && (
        <ChangePasswordModal
          userCode={user?.code || ''}
          onClose={() => setIsChangePasswordOpen(false)}
        />
      )}
    </div>
  );
}

// --- NEW COMPONENT: HANDOFF MODAL ---
function HandoffModal({ systems, history, incidents, assignments, shiftType, onClose }: any) {
  const [copied, setCopied] = useState(false);

  // Determine shift start for filtering "new" items
  const nowD = new Date();
  const currentHour = nowD.getHours();
  const shiftStart = new Date(nowD);
  shiftStart.setSeconds(0, 0);
  shiftStart.setMilliseconds(0);

  if (currentHour >= 7 && currentHour < 19) {
    shiftStart.setHours(7, 0, 0, 0);
  } else {
    shiftStart.setHours(19, 0, 0, 0);
    if (currentHour < 7) {
      shiftStart.setDate(shiftStart.getDate() - 1);
    }
  }

  const parseVNTime = (t: string) => {
    if (!t) return null;
    try {
      const parts = t.split(/[/, : ]+/).filter(Boolean);
      const yearIdx = parts.findIndex(p => p.length === 4);
      if (yearIdx === -1) return null;
      let day, month, year, hour, minute;
      if (yearIdx === 4) { // HH mm DD MM YYYY
        hour = parseInt(parts[0]); minute = parseInt(parts[1]);
        day = parseInt(parts[2]); month = parseInt(parts[3]) - 1; year = parseInt(parts[4]);
      } else { // DD MM YYYY HH mm
        day = parseInt(parts[0]); month = parseInt(parts[1]) - 1; year = parseInt(parts[2]);
        hour = parseInt(parts[3]); minute = parseInt(parts[4]);
      }
      return new Date(year, month, day, hour, minute);
    } catch (e) { return null; }
  };

  // Calculate statistics for the current shift
  const checkedSystems = systems.filter((s: any) => s.status !== 'NA' && s.inspectorCode);

  const newNokItems = systems.filter((s: any) => {
    if (s.status !== 'NOK' || !s.timestamp) return false;
    const t = parseVNTime(s.timestamp);
    return t && t >= shiftStart;
  });

  const resolvedToday = history.filter((h: any) => {
    if (!h.resolvedAt) return false;
    const t = parseVNTime(h.resolvedAt);
    return t && t >= shiftStart;
  });

  const openIncidents = incidents.filter((i: any) => i.status === 'OPEN');

  const shiftDate = shiftStart.toLocaleDateString('vi-VN');
  const staffNames = assignments.map((a: any) => a.userName).join(' & ') || 'Chưa trực';

  const summaryText = `📋 [BÁO CÁO BÀN GIAO CA]
- Ca trực: ${shiftType === 'DAY' ? 'Ca Ngày' : 'Ca Đêm'}
- Ngày: ${shiftDate}
- Nhân viên: ${staffNames}
---------------------------
✅ TIẾN ĐỘ: ${checkedSystems.length}/${systems.length} hệ thống (${Math.round((checkedSystems.length / (systems.length || 1)) * 100)}%)
⚠️ LỖI PHÁT SINH MỚI: [${newNokItems.length}]
${newNokItems.map((s: any, i: number) => `   ${i + 1}. ${s.name}: ${s.note || 'Chưa có ghi chú'}`).join('\n') || '   (Không có)'}
🛠️ ĐÃ XỬ LÝ XONG: [${resolvedToday.length}]
${resolvedToday.map((h: any, i: number) => `   ${i + 1}. ${h.systemName}: ${h.actionNote || 'Đã sửa'}`).join('\n') || '   (Không có)'}
🚨 SỰ CỐ TỒN ĐỌNG: [${openIncidents.length}]
---------------------------
Chúc ca sau trực tốt!`;

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportWord = async () => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({ text: "BIÊN BẢN BÀN GIAO CA TRỰC", bold: true, size: 32, font: "Times New Roman" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Ngày báo cáo: ${shiftDate}`, bold: true, font: "Times New Roman" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Ca trực: ${shiftType === 'DAY' ? 'Ca Ngày' : 'Ca Đêm'}`, font: "Times New Roman" }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: `Nhân viên thực hiện: ${staffNames}`, font: "Times New Roman" }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({ text: "1. TIẾN ĐỘ KIỂM TRA HỆ THỐNG", bold: true, font: "Times New Roman", color: "2E75B6" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Tổng số hệ thống: ${systems.length}`, font: "Times New Roman" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Đã hoàn thành: ${checkedSystems.length}/${systems.length} (${Math.round((checkedSystems.length / (systems.length || 1)) * 100)}%)`, font: "Times New Roman" }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200 },
            children: [
              new TextRun({ text: "2. CÁC LỖI PHÁT SINH MỚI (NOK)", bold: true, font: "Times New Roman", color: "C00000" }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "STT", bold: true })] })] }),
                  new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Hệ thống", bold: true })] })] }),
                  new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Ghi chú lỗi", bold: true })] })] }),
                ]
              }),
              ...(newNokItems.length > 0
                ? newNokItems.map((s: any, i: number) => new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, text: (i + 1).toString() })] }),
                    new TableCell({ children: [new Paragraph(s.name)] }),
                    new TableCell({ children: [new Paragraph(s.note || "Chưa có ghi chú")] }),
                  ]
                }))
                : [new TableRow({
                  children: [
                    new TableCell({ columnSpan: 3, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "(Không có lỗi phát sinh mới)", italics: true })] })] }),
                  ]
                })])
            ]
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200 },
            children: [
              new TextRun({ text: "3. CÁC MỤC ĐÃ XỬ LÝ XONG (FIXED)", bold: true, font: "Times New Roman", color: "385723" }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "STT", bold: true })] })] }),
                  new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Hệ thống", bold: true })] })] }),
                  new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Nội dung sửa chữa", bold: true })] })] }),
                ]
              }),
              ...(resolvedToday.length > 0
                ? resolvedToday.map((h: any, i: number) => new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, text: (i + 1).toString() })] }),
                    new TableCell({ children: [new Paragraph(h.systemName)] }),
                    new TableCell({ children: [new Paragraph(h.actionNote || "Đã sửa")] }),
                  ]
                }))
                : [new TableRow({
                  children: [
                    new TableCell({ columnSpan: 3, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "(Trong ca trực chưa có mục nào được Fix)", italics: true })] })] }),
                  ]
                })])
            ]
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200 },
            children: [
              new TextRun({ text: "4. SỰ CỐ TỒN ĐỌNG", bold: true, font: "Times New Roman", color: "E36C09" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Số lượng sự cố đang mở: ${openIncidents.length}`, font: "Times New Roman" }),
            ],
          }),

          new Paragraph({ spacing: { before: 400 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "NHÂN VIÊN BÀN GIAO", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "NHÂN VIÊN TIẾP NHẬN", bold: true })] })] }),
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [new TextRun({ text: "(Ký và ghi rõ họ tên)", italics: true })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [new TextRun({ text: "(Ký và ghi rõ họ tên)", italics: true })] })] }),
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1000 }, text: staffNames })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1000 }, text: "..................................." })] }),
                ]
              }),
            ]
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `BaoCao_BanGiaoCa_${shiftDate.replace(/\//g, '-')}_${shiftType}.docx`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
          <h2 className="font-bold flex items-center gap-2"><FileText size={20} /> Tổng Hợp Bàn Giao Ca</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded"><X size={20} /></button>
        </div>
        <div className="p-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 group relative">
            <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-700">
              {summaryText}
            </pre>
            <button
              onClick={handleCopy}
              className={clsx(
                "absolute top-2 right-2 p-2 rounded-lg transition-all active:scale-95 flex items-center gap-1 text-xs font-bold",
                copied ? "bg-green-500 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 shadow-sm"
              )}
            >
              {copied ? <><CheckCheck size={14} /> Đã chép</> : <><Save size={14} /> Chép Zalo</>}
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <Send size={18} /> Chép Zalo
            </button>
            <button
              onClick={handleExportWord}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95"
            >
              <FileText size={18} /> Xuất File Word (.docx)
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all active:scale-95"
            >
              Đóng
            </button>
          </div>
          <p className="mt-4 text-[10px] text-slate-400 text-center italic">
            * Sau khi bấm "Sao chép", hãy mở Zalo nhóm và Dán (Ctrl+V) để gửi báo cáo.
          </p>
        </div>
      </div>
    </div>
  );
}
