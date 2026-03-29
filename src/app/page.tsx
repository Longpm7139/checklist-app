'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { SystemCheck, Status, SystemCategory, MaintenanceTask } from '@/lib/types';
import {
  Save, AlertCircle, Edit2, Trash2, Plus, Check, X, RotateCcw, History as HistoryIcon,
  CheckCheck, Search, LogOut, Users, Lock, ClipboardList, BarChart2, Package,
  Wrench, QrCode, Key, UserCheck, FileText, ArrowRight, CheckCircle, Filter, AlertTriangle, Send, Camera
} from 'lucide-react';
import clsx from 'clsx';
import { useUser } from '@/providers/UserProvider';
import { isMatch } from '@/lib/utils';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import { IMESafeInput } from '@/components/IMESafeInput';
import HandoffModal from '@/components/dashboard/HandoffModal';
import Header from '@/components/dashboard/Header';
import ActionButtons from '@/components/dashboard/ActionButtons';
import DashboardStats from '@/components/dashboard/DashboardStats';
import ShiftBanner from '@/components/dashboard/ShiftBanner';
import { ImageUpload } from '@/components/ImageUpload';

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
  subscribeToHistory,
  uploadImage
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

  const isUserOnDuty = currentShiftAssignments.some((a: any) => isMatch(a.userCode, user?.code) || isMatch(a.userName, user?.name)) || user?.role === 'ADMIN';

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

    const now = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false });
    const target = systems.find(s => s.id === id);
    if (target) {
      // NOTE: User requested points to be assigned when shifting status.
      // We only log if the status genuinely changes to keep logs clean and informative.
      const isStatusChanged = target.status !== status;

      const updated = { 
        ...target, 
        status, 
        timestamp: now, 
        inspectorName: user?.name, 
        inspectorCode: user?.code,
        imageUrl: status === 'OK' ? '' : target.imageUrl
      };
      
      const dbPromises = [];
      dbPromises.push(saveSystem(id, updated));

      if (isStatusChanged) {
        dbPromises.push(addLog({
          id: `${id}_${Date.now()}`,
          timestamp: now,
          inspectorName: user?.name || 'Unknown',
          inspectorCode: user?.code || 'UNKNOWN',
          systemId: target.id,
          systemName: target.name,
          result: status,
          note: `Thay đổi trạng thái nhanh: ${status}`,
          duration: 15 // Estimated 15 seconds to visually check
        }));
      }

      await Promise.all(dbPromises);

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
    const now = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false });
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
    const now = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false });

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

    // v1.1.5 Fix: Audit logs for all systems touched by THIS user to ensure KPI points
    const touchedSystems = systems.filter(s => s.inspectorCode === user?.code && s.status !== 'NA');
    if (touchedSystems.length > 0) {
      const nowStr = new Date().toLocaleString('vi-VN', { 
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false 
      });
      // Use a for...of loop for async sequence
      (async () => {
        for (const sys of touchedSystems) {
          await addLog({
            id: `SAVE_${sys.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            timestamp: nowStr,
            inspectorName: user?.name,
            inspectorCode: user?.code,
            systemId: sys.id,
            systemName: sys.name,
            result: sys.status,
            note: `Lưu kết quả kiểm tra: ${sys.status}`,
            duration: 15
          });
        }
      })();
    }

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
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 p-2 md:p-4 font-sans text-slate-900">
      <div className="w-full max-w-4xl mx-auto bg-white md:border border-slate-300 md:shadow-sm relative pb-28 md:rounded-lg">
        <Header
          isUserOnDuty={isUserOnDuty}
          currentShiftType={currentShiftType}
          isSearchOpen={isSearchOpen}
          setIsSearchOpen={setIsSearchOpen}
          setSearchQuery={setSearchQuery}
          isEditMode={isEditMode}
          setIsEditMode={setIsEditMode}
          handleResetDefaults={handleResetDefaults}
          setIsChangePasswordOpen={setIsChangePasswordOpen}
        />

        <div className="bg-slate-50 p-4 border-b border-slate-200">
          <ShiftBanner
            isLastHourOfShift={isLastHourOfShift}
            showReminder={showReminder}
            setShowReminder={setShowReminder}
            isUserOnDuty={isUserOnDuty}
            teamAssignedCategories={teamAssignedCategories}
            currentShiftType={currentShiftType}
            shiftDateStr={shiftDateStr}
            currentShiftAssignments={currentShiftAssignments}
            systems={systems}
            setIsHandoffModalOpen={setIsHandoffModalOpen}
            handleStartNewShift={handleStartNewShift}
            isEditMode={isEditMode}
          />
          <DashboardStats
            systems={systems}
            incidents={incidents}
            tasks={tasks}
            failedCategoryIds={failedCategoryIds}
            categories={categories}
          />
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
                            <div className="font-bold text-slate-800 flex flex-wrap items-center justify-between gap-2 w-full">
                              <div className="flex flex-wrap items-center gap-2 break-words max-w-full">
                                <span className="break-words">{highlightText(sys.name, searchQuery)}</span> <span className="flex-shrink-0 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 uppercase font-mono">{highlightText(sys.id, searchQuery)}</span>
                              </div>
                              {sys.status === 'IN_PROGRESS' && (
                                <span className="text-[9px] bg-orange-100 text-orange-700 font-black px-2 py-0.5 rounded-full border border-orange-200 animate-pulse">
                                  Đang kiểm tra: {sys.inspectorName || 'Nối tiếp'}
                                </span>
                              )}
                              {sys.status !== 'NA' && sys.status !== 'IN_PROGRESS' && sys.inspectorCode && !isMatch(sys.inspectorCode, user?.code) && (
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
                            (sys.status === 'IN_PROGRESS' && !isMatch(sys.inspectorCode, user?.code)) ||
                            (sys.status !== 'NA' && sys.status !== 'IN_PROGRESS' && sys.inspectorCode && !isMatch(sys.inspectorCode, user?.code))
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
                              (sys.status === 'IN_PROGRESS' && !isMatch(sys.inspectorCode, user?.code)) ||
                              (sys.status !== 'NA' && sys.status !== 'IN_PROGRESS' && sys.inspectorCode && !isMatch(sys.inspectorCode, user?.code))
                            )));
                          return (
                            <IMESafeInput
                              disabled={isLocked}
                              className={clsx(
                                "w-full p-3 border rounded-lg text-sm outline-none transition-all",
                                errors.has(sys.id) ? "border-red-500 bg-red-50 ring-2 ring-red-200" : "border-slate-200 focus:border-blue-500 bg-slate-50/50",
                                isLocked && "bg-slate-100 text-slate-400 cursor-not-allowed opacity-60"
                              )}
                              placeholder={errors.has(sys.id) ? "⚠️ Bắt buộc nhập ghi chú!" : (sys.status === 'OK' ? "✅ OK - Không ghi chú" : "📝 Ghi chú...")}
                              value={sys.note}
                              onChangeValue={(val: string) => handleNoteChange(sys.id, val)}
                            />
                          );
                        })()}
                      </div>
                      {sys.status === 'NOK' && (
                        <div className="mt-3 flex justify-center border-t border-slate-100 pt-3">
                           {sys.imageUrl ? (
                             <div className="flex flex-col items-center gap-1 animate-in fade-in zoom-in duration-300">
                               <img 
                                 src={sys.imageUrl} 
                                 alt="Ảnh lỗi" 
                                 className="w-20 h-20 object-cover rounded-lg border-2 border-slate-300 shadow-sm cursor-pointer hover:scale-105 transition-transform"
                                 onClick={() => window.open(sys.imageUrl, '_blank')}
                               />
                               <span className="text-[9px] text-slate-500 font-bold uppercase">Bằng chứng lỗi hiện tại</span>
                             </div>
                           ) : (
                             <ImageUpload 
                              value={sys.imageUrl}
                              onChange={async (url) => {
                                 const target = systems.find(s => s.id === sys.id);
                                 if (target) {
                                     try {
                                       await saveSystem(sys.id, { ...target, imageUrl: url });
                                     } catch (dbErr: any) {
                                       alert("Lỗi khi lưu link ảnh vào hệ thống: " + dbErr.message);
                                     }
                                  }
                              }}
                              path={`systems/${sys.id}_${Date.now()}.jpg`}
                              disabled={!isUserOnDuty || isEditMode}
                            />
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
                            sys.imageUrl ? (
                              <div className="flex flex-col items-center gap-1">
                                <img 
                                  src={sys.imageUrl} 
                                  alt="Preview" 
                                  className="w-10 h-10 object-cover rounded border border-slate-300 cursor-pointer hover:opacity-80"
                                  onClick={() => window.open(sys.imageUrl, '_blank')}
                                />
                                <span className="text-[8px] text-slate-400 uppercase font-bold">LOCKED</span>
                              </div>
                            ) : (
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
                            )
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

      <ActionButtons
        isUserOnDuty={isUserOnDuty}
        role={user?.role}
        handleMarkAllOK={handleMarkAllOK}
        handleSaveChecklist={handleSaveChecklist}
        buttonText={buttonText}
      />

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
