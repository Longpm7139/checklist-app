'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { SystemCheck, Status, SystemCategory, MaintenanceTask } from '@/lib/types';
import {
  Save, AlertCircle, Edit2, Trash2, Plus, Check, X, RotateCcw, History as HistoryIcon,
  CheckCheck, Search, LogOut, Users, Lock, ClipboardList, BarChart2, Package,
  Wrench, QrCode, Key, UserCheck, FileText, ArrowRight, CheckCircle, Filter, AlertTriangle, Send, Camera, Clock, Eye, EyeOff, Calendar
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
  uploadImage,
  subscribeToProcedures
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
  const [procedures, setProcedures] = useState<any[]>([]);
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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [customTimestamp, setCustomTimestamp] = useState<string>('');
  const [customDate, setCustomDate] = useState<string>('');
  const [customTime, setCustomTime] = useState<string>('');
  const [isDateFocused, setIsDateFocused] = useState(false);

  const displayCategories = useMemo(() => isEditMode ? categories : categories.filter(c => c.isActive !== false), [categories, isEditMode]);
  const displaySystems = useMemo(() => isEditMode ? systems : systems.filter(s => s.isActive !== false && displayCategories.some(c => c.id === s.categoryId)), [systems, displayCategories, isEditMode]);
  const activeCategoriesForLogic = useMemo(() => categories.filter(c => c.isActive !== false), [categories]);
  const activeSystemsForLogic = useMemo(() => systems.filter(s => s.isActive !== false && activeCategoriesForLogic.some(c => c.id === s.categoryId)), [systems, activeCategoriesForLogic]);

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  // --- SHIFT REMINDER LOGIC ---
  const isLastHourOfShift = useMemo(() => {
    const now = parseVNTime();
    const hour = now.getHours();

    // Day Shift: 18:00 - 19:00
    const isDayShiftEnd = hour === 18;
    // Night Shift: 06:00 - 07:00
    const isNightShiftEnd = hour === 6;

    // Check if on-duty staff has any NA systems
    const hasUncheckedSystems = activeSystemsForLogic.some(s => s.status === 'NA');

    return (isDayShiftEnd || isNightShiftEnd) && hasUncheckedSystems;
  }, [activeSystemsForLogic]);

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

  const uncheckedCount = activeSystemsForLogic.filter(s => s.status === 'NA').length;
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
    const unsubProcedures = subscribeToProcedures(setProcedures);

    // Initialize custom timestamp
    const now = new Date();
    const dateStr = now.getFullYear() + '-' + 
                 String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                 String(now.getDate()).padStart(2, '0');
    const timeStr = String(now.getHours()).padStart(2, '0') + ':' + 
                 String(now.getMinutes()).padStart(2, '0');
    setCustomDate(dateStr);
    setCustomTime(timeStr);
    setCustomTimestamp(dateStr + 'T' + timeStr);

    return () => {
      unsubSystems();
      unsubIncidents();
      unsubDuties();
      unsubMaintenance();
      unsubHistory();
      unsubCategories();
      unsubProcedures();
    };
  }, []);

  const handleStatusChange = async (id: string, status: Status) => {
    if (!isUserOnDuty) return;
    
    // Use customTimestamp if provided, otherwise fallback to current time
    const now = customTimestamp 
      ? new Date(customTimestamp).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false })
      : new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false });
    
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
    const now = customTimestamp 
      ? new Date(customTimestamp).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false })
      : new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false });
    
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

  const handleToggleSystemActive = async (id: string, currentStatus?: boolean) => {
    if (user?.role !== 'ADMIN') {
      alert("Chỉ Admin mới có quyền thao tác này!");
      return;
    }
    const target = systems.find(s => s.id === id);
    if (target) {
      await saveSystem(id, { ...target, isActive: currentStatus === false ? true : false });
    }
  };

  const handleToggleCategoryActive = async (id: string, currentStatus?: boolean) => {
    if (user?.role !== 'ADMIN') {
      alert("Chỉ Admin mới có quyền thao tác này!");
      return;
    }
    await saveCategory(id, { isActive: currentStatus === false ? true : false });
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
    const now = customTimestamp 
      ? new Date(customTimestamp).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false })
      : new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false });

    activeSystemsForLogic.forEach(async (s) => {
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
      activeSystemsForLogic.forEach(s => {
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
    const hasProgressToday = activeSystemsForLogic.some(s => {
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

  const handleSaveChecklist = async () => {
    const newErrors = new Set<string>();
    const itemsRequiringNote = activeSystemsForLogic.filter(s => s.status === 'NOK');

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
    const checkedCountTotal = activeSystemsForLogic.filter(s => s.status && s.status !== 'NA' && !!s.inspectorCode).length;

    if (checkedCountTotal === 0) {
      alert('Vui lòng thực hiện kiểm tra ít nhất một hệ thống trước khi Lưu!');
      return;
    }

    const myNokItems = activeSystemsForLogic.filter(s => s.status === 'NOK' && s.inspectorCode === user?.code);
    const newlyInteractedNokItems = myNokItems.filter(s => sessionInteractedNokIds.has(s.id));

    // FIX: Chỉ ghi log cho các hệ thống mà NGƯỜI HIỆN TẠI đã tự kiểm tra
    // Không ghi log cho NOK cũ từ ca trước (inspectorCode khác user hiện tại)
    // Điều này ngăn việc "thổi phồng" số lỗi trong KPI và Phân tích xu hướng
    const touchedSystems = activeSystemsForLogic.filter(s =>
      s.status && s.status !== 'NA' && s.inspectorCode === (user?.code || '')
    );
    if (touchedSystems.length > 0) {
      const nowStr = new Date().toLocaleString('vi-VN', { 
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false 
      });
      // v1.1.6: Crucial! Wait for all logs to be written BEFORE redirecting
      const logPromises = touchedSystems.map(sys => 
        addLog({
          id: `SAVE_${sys.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          timestamp: nowStr,
          inspectorName: user?.name || 'Unknown',
          inspectorCode: user?.code || 'UNKNOWN',
          systemId: sys.id,
          systemName: sys.name,
          result: sys.status,
          note: `Hoàn tất kiểm tra: ${sys.status}`,
          duration: 15
        })
      );
      await Promise.all(logPromises);
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

  const hasErrors = activeSystemsForLogic.some(s => s.status === 'NOK');

  const failedCategoryIds = Array.from(new Set(
    activeSystemsForLogic
      .filter(s => s.status === 'NOK')
      .map(s => s.categoryId)
  ));

  const failedCategoryNames = failedCategoryIds.map(id => {
    return categories.find(c => c.id === id)?.name || id;
  }).join(', ');

  const removeAccents = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  };

  const expiringLicenses = useMemo(() => {
    return procedures.filter(p => {
      if (!p.type?.startsWith('LICENSE_') || !p.expirationDate || !p.expirationWarningDays) return false;
      const parts = p.expirationDate.split('/'); // dd/mm/yyyy
      if (parts.length !== 3) return false;
      const expDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      const warningDays = parseInt(p.expirationWarningDays, 10);
      if (isNaN(warningDays)) return false;
      
      const now = new Date();
      // Reset hours to compare pure days
      now.setHours(0, 0, 0, 0);
      expDate.setHours(0, 0, 0, 0);
      
      const diffTime = expDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays <= warningDays;
    });
  }, [procedures]);

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
            systems={activeSystemsForLogic}
            setIsHandoffModalOpen={setIsHandoffModalOpen}
            handleStartNewShift={handleStartNewShift}
            isEditMode={isEditMode}
          />
          <DashboardStats
            systems={activeSystemsForLogic}
            incidents={incidents}
            tasks={tasks}
            failedCategoryIds={failedCategoryIds}
            categories={activeCategoriesForLogic}
            expiringLicenses={expiringLicenses}
          />
        </div>

        {/* Global Time Selector for Dashboard Reporting */}
        <div className="mx-4 mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-blue-600" />
            <div>
              <span className="font-bold text-slate-700 block text-sm">Thời gian ghi nhận kiểm tra:</span>
              <span className="text-[10px] text-slate-500 italic">Áp dụng cho tất cả các thao tác đánh dấu nhanh trên trang này.</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-[140px]">
              <input
                type={isDateFocused ? "date" : "text"}
                lang="vi"
                className="w-full border border-slate-300 rounded-lg p-2 focus:border-blue-500 outline-none bg-white font-medium text-sm"
                value={isDateFocused ? customDate : (customDate ? (() => {
                  const parts = customDate.split('-');
                  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : customDate;
                })() : '')}
                placeholder="dd/mm/yyyy"
                onFocus={() => setIsDateFocused(true)}
                onBlur={() => setIsDateFocused(false)}
                onChange={(e) => {
                  if (isDateFocused) {
                    setCustomDate(e.target.value);
                    setCustomTimestamp(e.target.value + 'T' + customTime);
                  }
                }}
              />
              {!isDateFocused && (
                <Calendar size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 pointer-events-none" />
              )}
            </div>
            <input
              type="time"
              lang="vi"
              className="border border-slate-300 rounded-lg p-2 focus:border-blue-500 outline-none bg-white font-medium text-sm w-[100px]"
              value={customTime}
              onChange={(e) => {
                setCustomTime(e.target.value);
                setCustomTimestamp(customDate + 'T' + e.target.value);
              }}
            />
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
          {/* Accordion selector: show category list first, then expand selected */}
          <div className="mb-4 rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
            {displayCategories.map((cat, idx) => {
              const catSystems = displaySystems.filter(s => s.categoryId === cat.id);
              if (catSystems.length === 0 && !isEditMode) return null;
              const okCount = catSystems.filter(s => s.status === 'OK').length;
              const nokCount = catSystems.filter(s => s.status === 'NOK').length;
              const naCount = catSystems.filter(s => s.status === 'NA' || !s.status).length;
              const isExpanded = expandedCategories.has(cat.id);
              const hasIssues = nokCount > 0;
              const allDone = naCount === 0 && catSystems.length > 0;

              return (
                <div key={cat.id} className={clsx("border-b border-slate-100 last:border-b-0", isExpanded && "bg-blue-50/30")}>
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={clsx(
                      "w-full flex items-center justify-between px-4 py-3 text-left transition-colors active:bg-blue-100",
                      isExpanded ? "bg-blue-600 text-white" : "bg-white text-slate-800 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={clsx(
                        "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black",
                        isExpanded ? "bg-white/20 text-white" :
                        hasIssues ? "bg-red-100 text-red-700" :
                        allDone ? "bg-green-100 text-green-700" :
                        "bg-slate-100 text-slate-500"
                      )}>
                        {cat.name.match(/^([A-K])/)?.[1] || (idx + 1)}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className={clsx("font-semibold text-sm truncate", isExpanded ? "text-white" : "text-slate-800")}>
                          {isEditMode ? (
                            <IMESafeInput
                              value={cat.name}
                              onChangeValue={(val: string) => handleUpdateCategoryName(cat.id, val)}
                              className="bg-transparent border-b border-white/50 text-white px-0 py-0 outline-none w-full"
                              onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            />
                          ) : cat.name}
                        </span>
                        <span className={clsx("text-[10px] font-medium", isExpanded ? "text-white/70" : "text-slate-400")}>
                          {catSystems.length} thiết bị
                          {okCount > 0 && <span className={clsx("ml-1.5", isExpanded ? "text-green-300" : "text-green-600")}>✓{okCount} OK</span>}
                          {nokCount > 0 && <span className={clsx("ml-1.5", isExpanded ? "text-red-300" : "text-red-600")}>✗{nokCount} NOK</span>}
                          {naCount > 0 && <span className={clsx("ml-1.5", isExpanded ? "text-white/50" : "text-slate-400")}>{naCount} chờ</span>}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {!allDone && naCount > 0 && !isExpanded && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                          {naCount} chưa KT
                        </span>
                      )}
                      {hasIssues && !isExpanded && (
                        <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full border border-red-200">
                          {nokCount} lỗi
                        </span>
                      )}
                      {isEditMode && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleCategoryActive(cat.id, cat.isActive); }}
                            className={clsx("p-1 rounded transition-colors", isExpanded ? "hover:bg-slate-500 text-white/70 hover:text-white" : "hover:bg-slate-200 text-slate-400 hover:text-slate-600")}
                            title={cat.isActive !== false ? "Ẩn nhóm (Không hiển thị ở trang chủ)" : "Hiện nhóm"}
                          >
                            {cat.isActive !== false ? <Eye size={14} /> : <EyeOff size={14} className="text-red-500" />}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                            className={clsx("p-1 rounded transition-colors", isExpanded ? "hover:bg-red-500 text-white/70 hover:text-white" : "hover:bg-red-100 text-slate-400 hover:text-red-600")}
                            title="Xóa nhóm"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                      <svg
                        className={clsx("w-5 h-5 transition-transform duration-200", isExpanded ? "rotate-180 text-white" : "text-slate-400")}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="bg-white border-t border-blue-100 divide-y divide-slate-100">
                      {catSystems.filter(s => {
                        if (!searchQuery.trim()) return true;
                        const q = removeAccents(searchQuery.toLowerCase());
                        return (
                          removeAccents((s.name ?? '').toLowerCase()).includes(q) ||
                          removeAccents((s.note ?? '').toLowerCase()).includes(q) ||
                          removeAccents((s.id ?? '').toLowerCase()).includes(q) ||
                          removeAccents((s.status ?? '').toLowerCase()).includes(q)
                        );
                      }).map(sys => (
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
                                <button onClick={() => handleToggleSystemActive(sys.id, sys.isActive)} className="p-2 text-slate-500 bg-slate-50 hover:bg-slate-200 rounded transition-colors" title={sys.isActive !== false ? "Ẩn hệ thống" : "Hiện hệ thống"}>
                                  {sys.isActive !== false ? <Eye size={16} /> : <EyeOff size={16} className="text-red-500" />}
                                </button>
                                <button onClick={() => handleDeleteSystem(sys.id)} className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded transition-colors" title="Xóa hệ thống">
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
                  )}
                </div>
              );
            })}
          </div>
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
              {displayCategories.map(cat => {
                const catSystems = displaySystems.filter(s => {
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

                const isExpandedDesktop = expandedCategories.has(cat.id);
                return (
                  <React.Fragment key={cat.id}>
                    <tr id={`category-${cat.id}`} className="bg-blue-600 text-white group scroll-mt-20 cursor-pointer select-none" onClick={() => toggleCategory(cat.id)}>
                      <td colSpan={4} className="p-3 border border-blue-700 font-bold">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <svg
                              className={clsx("w-4 h-4 transition-transform duration-200 flex-shrink-0", isExpandedDesktop ? "rotate-90" : "")}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                            {isEditMode ? (
                              <div className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
                                <IMESafeInput
                                  value={cat.name}
                                  onChangeValue={(val: string) => handleUpdateCategoryName(cat.id, val)}
                                  className="bg-blue-700 border border-blue-500 text-white rounded px-2 py-1 w-full max-w-md outline-none focus:border-blue-300"
                                />
                              </div>
                            ) : (
                              <span>{cat.name}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {(() => {
                              const total = catSystems.length;
                              const ok = catSystems.filter(s => s.status === 'OK').length;
                              const nok = catSystems.filter(s => s.status === 'NOK').length;
                              const na = catSystems.filter(s => s.status === 'NA' || !s.status).length;
                              return (
                                <div className="flex items-center gap-1.5 text-xs font-medium">
                                  <span className="bg-white/20 px-2 py-0.5 rounded-full">{total} thiết bị</span>
                                  {ok > 0 && <span className="bg-green-500 px-2 py-0.5 rounded-full">✓{ok}</span>}
                                  {nok > 0 && <span className="bg-red-400 px-2 py-0.5 rounded-full">✗{nok}</span>}
                                  {na > 0 && <span className="bg-white/30 px-2 py-0.5 rounded-full">{na} chờ</span>}
                                </div>
                              );
                            })()}
                            {isEditMode && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleToggleCategoryActive(cat.id, cat.isActive); }}
                                  className="text-white/70 hover:text-white hover:bg-slate-500 p-1 rounded transition-colors"
                                  title={cat.isActive !== false ? "Ẩn nhóm (Không hiển thị ở trang chủ)" : "Hiện nhóm"}
                                >
                                  {cat.isActive !== false ? <Eye size={16} /> : <EyeOff size={16} className="text-red-300" />}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                                  className="text-white/70 hover:text-white hover:bg-red-500 p-1 rounded transition-colors"
                                  title="Xóa nhóm"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                    {isExpandedDesktop && catSystems.map(sys => (
                      <tr key={sys.id} className="hover:bg-slate-50">
                        <td className="p-3 border border-slate-300 font-medium pl-8">
                          {isEditMode ? (
                            <div className="flex items-center gap-2">
                              <IMESafeInput
                                value={sys.name}
                                onChangeValue={(val: string) => handleUpdateSystemName(sys.id, val)}
                                className="border border-slate-300 rounded px-2 py-1 w-full text-sm focus:border-blue-500 outline-none"
                              />
                              <button onClick={() => handleToggleSystemActive(sys.id, sys.isActive)} className="text-slate-400 hover:text-slate-600 p-1" title={sys.isActive !== false ? "Ẩn hệ thống" : "Hiện hệ thống"}>
                                {sys.isActive !== false ? <Eye size={16} /> : <EyeOff size={16} className="text-red-500" />}
                              </button>
                              <button onClick={() => handleDeleteSystem(sys.id)} className="text-red-500 hover:text-red-700 p-1" title="Xóa hệ thống">
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
                    {isExpandedDesktop && isEditMode && (
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
