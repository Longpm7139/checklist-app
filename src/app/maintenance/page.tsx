'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Wrench, Calendar, CheckSquare, Plus, User as UserIcon, Clock, AlertTriangle, Camera, X, Image as ImageIcon, Loader2, Trash2, Edit2, PenTool, ChevronDown, ChevronUp, Search, Filter, FileDown } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, AlignmentType, WidthType } from 'docx';
import { useUser } from '@/providers/UserProvider';
import { IMESafeInput, IMESafeTextArea } from '@/components/IMESafeInput';
import { MaintenanceTask, VdgsChecklistItem, User, SystemCheck, SystemCategory } from '@/lib/types';

// Dữ liệu checklist VDGS theo cấp bảo dưỡng (từ tài liệu ADB Safegate)
const VDGS_CHECKLIST: Record<string, { stt: number; noiDung: string }[]> = {
    '1 tháng': [
        { stt: 1, noiDung: 'Kiểm tra, vệ sinh các cửa sổ phía trước và phía hông của bộ quét laser và các tấm gương phản xạ, gương bảo vệ của hệ thống laser' },
        { stt: 2, noiDung: 'Kiểm tra vệ sinh bảng điều khiển OP' },
        { stt: 3, noiDung: 'Kiểm tra, vệ sinh phần mặt kính màn hình hiển thị OP, PD' },
    ],
    '6 tháng': [
        { stt: 1, noiDung: 'Kiểm tra, vệ sinh các cửa sổ phía trước và phía hông của bộ quét laser và các tấm gương phản xạ, gương bảo vệ của hệ thống laser' },
        { stt: 2, noiDung: 'Kiểm tra vệ sinh bảng điều khiển OP' },
        { stt: 3, noiDung: 'Kiểm tra, vệ sinh phần mặt kính màn hình hiển thị OP, PD' },
        { stt: 4, noiDung: 'Kiểm tra roăn cửa bộ quét laser' },
        { stt: 5, noiDung: 'Vệ sinh ống kính laser' },
        { stt: 6, noiDung: 'Kiểm tra chức năng tự động hiệu chuẩn của bộ quét laser' },
        { stt: 7, noiDung: 'Kiểm tra thay thế các gương (nếu kiểm tra thấy hư hỏng)' },
        { stt: 8, noiDung: 'Kiểm tra chức năng nút dừng khẩn cấp Emergency-Stop' },
        { stt: 9, noiDung: 'Kiểm tra tấm phim phủ bề mặt OP' },
        { stt: 10, noiDung: 'Kiểm tra hoạt động các phím chức năng tại OP' },
        { stt: 11, noiDung: 'Kiểm tra hoạt động cảm biến nhiệt độ bằng OP' },
        { stt: 12, noiDung: 'Walktest với các loại tàu bay được kẻ vạch dừng tại cầu dẫn hành khách' },
    ],
    '12 tháng': [
        { stt: 1, noiDung: 'Kiểm tra, vệ sinh các cửa sổ phía trước và phía hông của bộ quét laser và các tấm gương phản xạ, gương bảo vệ của hệ thống laser' },
        { stt: 2, noiDung: 'Kiểm tra vệ sinh bảng điều khiển OP' },
        { stt: 3, noiDung: 'Kiểm tra, vệ sinh phần mặt kính màn hình hiển thị OP, PD' },
        { stt: 4, noiDung: 'Kiểm tra roăn cửa bộ quét laser' },
        { stt: 5, noiDung: 'Vệ sinh ống kính laser' },
        { stt: 6, noiDung: 'Kiểm tra chức năng tự động hiệu chuẩn của bộ quét laser' },
        { stt: 7, noiDung: 'Kiểm tra thay thế các gương (nếu kiểm tra thấy hư hỏng)' },
        { stt: 8, noiDung: 'Kiểm tra chức năng nút dừng khẩn cấp Emergency-Stop' },
        { stt: 9, noiDung: 'Kiểm tra tấm phim phủ bề mặt OP' },
        { stt: 10, noiDung: 'Kiểm tra hoạt động các phím chức năng tại OP' },
        { stt: 11, noiDung: 'Kiểm tra hoạt động cảm biến nhiệt độ bằng OP' },
        { stt: 12, noiDung: 'Walktest với các loại tàu bay được kẻ vạch dừng tại cầu dẫn hành khách' },
        { stt: 13, noiDung: 'Vệ sinh hút bụi bên trong thiết bị' },
        { stt: 14, noiDung: 'Thay thế bộ lọc ở cửa gió vào và cửa ra gió cho hệ thống thông gió của màn hình. Vật tư theo danh sách phụ tùng ADB Safegate. (được trang bị đối với hệ thống loại T1)' },
    ],
};
import clsx from 'clsx';
import { subscribeToMaintenance, saveMaintenance, uploadImage, deleteMaintenance, subscribeToSystems, subscribeToCategories } from '@/lib/firebase';

export default function MaintenancePage() {
    const router = useRouter();
    const { user: currentUser } = useUser();
    const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
    const [viewMode, setViewMode] = useState<'LIST' | 'CREATE'>('LIST');
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);
    const [availableSystems, setAvailableSystems] = useState<SystemCheck[]>([]);
    const [categories, setCategories] = useState<SystemCategory[]>([]);
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
    const [listSearch, setListSearch] = useState('');

    // Form State
    const [title, setTitle] = useState('');
    const [selectedSystemIds, setSelectedSystemIds] = useState<string[]>([]);
    const [systemSearch, setSystemSearch] = useState('');
    const [taskType, setTaskType] = useState<'MAINTENANCE' | 'PROJECT'>('MAINTENANCE');
    const [desc, setDesc] = useState('');
    const [deadline, setDeadline] = useState('');
    const [beforeImageFile, setBeforeImageFile] = useState<File | null>(null);
    const [beforeImagePreview, setBeforeImagePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

    // New: Multi-select state
    const [selectedUserCodes, setSelectedUserCodes] = useState<string[]>([]);
    const [selectedSupervisorCodes, setSelectedSupervisorCodes] = useState<string[]>([]);

    // VDGS checklist state
    const [maintenanceLevel, setMaintenanceLevel] = useState<'1 tháng' | '6 tháng' | '12 tháng' | ''>('');
    const [vdgsChecklist, setVdgsChecklist] = useState<VdgsChecklistItem[]>([]);

    // Level chọn khi xuất Word từ modal (dùng khi task cũ chưa có maintenanceLevel)
    const [exportLevel, setExportLevel] = useState<'1 tháng' | '6 tháng' | '12 tháng' | ''>('');
    // Level chọn trực tiếp trên card (taskId → level)
    const [cardExportLevel, setCardExportLevel] = useState<Record<string, string>>({});
    // Checklist nhân viên điền khi báo cáo hoàn thành
    const [completeModalChecklist, setCompleteModalChecklist] = useState<VdgsChecklistItem[]>([]);
    const [completeModalLevel, setCompleteModalLevel] = useState<'1 tháng' | '6 tháng' | '12 tháng' | ''>('');

    // Complete Modal State
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [completeNote, setCompleteNote] = useState('');
    const [remainingIssues, setRemainingIssues] = useState('');
    const [afterImageFile, setAfterImageFile] = useState<File | null>(null);
    const [afterImagePreview, setAfterImagePreview] = useState<string | null>(null);
    const [isCompleting, setIsCompleting] = useState(false);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [completedAtInput, setCompletedAtInput] = useState('');

    // Edit Completion Report State
    const [editCompletedNote, setEditCompletedNote] = useState('');
    const [editRemainingIssues, setEditRemainingIssues] = useState('');
    const [editAfterImagePreview, setEditAfterImagePreview] = useState<string | null>(null);
    const [editAfterImageFile, setEditAfterImageFile] = useState<File | null>(null);

    useEffect(() => {
        const unsub = subscribeToMaintenance((data) => {
            // Sort by createdAt desc
            const sorted = (data as MaintenanceTask[]).sort((a, b) => {
                // Parse date string "HH:mm dd/MM/yyyy"
                const parseDate = (d: string) => {
                    const [time, date] = d.split(' ');
                    const [hh, mm] = time.split(':');
                    const [D, M, Y] = date.split('/');
                    return new Date(`${Y}-${M}-${D}T${hh}:${mm}:00`).getTime();
                };
                try {
                    return parseDate(b.createdAt || '') - parseDate(a.createdAt || '');
                } catch (e) {
                    return 0;
                }
            });
            setTasks(sorted);
            
            // Auto-expand the group of the most recent task if no groups are expanded
            setExpandedGroups(prev => {
                if (prev.length > 0) return prev;
                if (sorted.length === 0) return [];
                const firstTask = sorted[0];
                const dateParts = (firstTask.deadline || '').split('-'); // YYYY-MM-DD
                if (dateParts.length === 3) {
                    return [`Tháng ${dateParts[1]}/${dateParts[0]}`];
                }
                return [];
            });
        });

        // Load users for selection from API
        const fetchUsers = async () => {

            try {
                const res = await fetch('/api/users');
                const data = await res.json();
                if (data.users) {
                    setAvailableUsers(data.users);
                }
            } catch (err) {
                console.error("Failed to load users:", err);
            }
        };
        fetchUsers();

        const unsubSystems = subscribeToSystems((data) => {
            setAvailableSystems(data as SystemCheck[]);
        });

        const unsubCategories = subscribeToCategories((data) => {
            setCategories(data as SystemCategory[]);
        });

        return () => {
            unsub();
            unsubSystems();
            unsubCategories();
        };
    }, []);

    const handleBeforeImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setBeforeImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setBeforeImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const removeBeforeImage = () => {
        setBeforeImageFile(null);
        setBeforeImagePreview(null);
    };

    const handleAfterImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAfterImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setAfterImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const removeAfterImage = () => {
        setAfterImageFile(null);
        setAfterImagePreview(null);
    };

    const toggleUserSelection = (code: string) => {
        setSelectedUserCodes(prev =>
            prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
        );
    };

    const toggleSupervisorSelection = (code: string) => {
        setSelectedSupervisorCodes(prev =>
            prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
        );
    };

    const handleMaintenanceLevelChange = (level: '1 tháng' | '6 tháng' | '12 tháng' | '') => {
        setMaintenanceLevel(level);
        if (level && VDGS_CHECKLIST[level]) {
            setVdgsChecklist(VDGS_CHECKLIST[level].map(item => ({
                stt: item.stt,
                noiDung: item.noiDung,
                kiemTra: false,
                tinhTrang: '',
                ghiChu: '',
            })));
        } else {
            setVdgsChecklist([]);
        }
    };

    const updateModalChecklistItem = (index: number, field: keyof VdgsChecklistItem, value: string | boolean) => {
        setCompleteModalChecklist(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    const handleCompleteModalLevelChange = (level: '1 tháng' | '6 tháng' | '12 tháng' | '') => {
        setCompleteModalLevel(level);
        if (level) {
            const tmpl = VDGS_CHECKLIST[level] || [];
            setCompleteModalChecklist(tmpl.map(item => ({ ...item, kiemTra: false, tinhTrang: '', ghiChu: '' })));
        } else {
            setCompleteModalChecklist([]);
        }
    };

    const toggleSystemSelection = (id: string) => {
        if (isEditMode) {
            setSelectedSystemIds([id]);
            // Reset VDGS checklist nếu hệ thống mới chọn không phải VDGS
            const sys = availableSystems.find(s => s.id === id);
            if (!sys?.name?.toUpperCase().includes('VDGS')) {
                setMaintenanceLevel('');
                setVdgsChecklist([]);
            }
            return;
        }
        setSelectedSystemIds(prev => {
            const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
            // Reset checklist nếu không còn hệ thống VDGS nào được chọn
            const hasVdgs = next.some(sid => {
                const s = availableSystems.find(s => s.id === sid);
                return s?.name?.toUpperCase().includes('VDGS');
            });
            if (!hasVdgs) {
                setMaintenanceLevel('');
                setVdgsChecklist([]);
            }
            return next;
        });
    };

    const selectAllSystems = () => {
        const filteredIds = availableSystems
            .filter(sys => sys.name.toLowerCase().includes(systemSearch.toLowerCase()) || sys.id.toLowerCase().includes(systemSearch.toLowerCase()))
            .map(sys => sys.id);
        
        setSelectedSystemIds(prev => {
            const newIds = [...new Set([...prev, ...filteredIds])];
            return newIds;
        });
    };

    const deselectAllSystems = () => {
        const filteredIds = availableSystems
            .filter(sys => sys.name.toLowerCase().includes(systemSearch.toLowerCase()) || sys.id.toLowerCase().includes(systemSearch.toLowerCase()))
            .map(sys => sys.id);
        
        setSelectedSystemIds(prev => prev.filter(id => !filteredIds.includes(id)));
    };

    const handleCreate = async () => {
        if (!title || selectedSystemIds.length === 0 || (selectedUserCodes.length === 0 && selectedSupervisorCodes.length === 0) || !deadline) {
            alert("Vui lòng nhập Tên, chọn ít nhất 1 Hệ thống, ít nhất 1 Người (Thực hiện hoặc Giám sát) và Hạn chót!");
            return;
        }

        setIsUploading(true);
        let uploadedBeforeUrl = beforeImagePreview;
        let uploadedAfterUrl = editAfterImagePreview;

        try {
            if (beforeImageFile) {
                const path = `maintenance/before/${Date.now()}_${beforeImageFile.name}`;
                uploadedBeforeUrl = await uploadImage(beforeImageFile, path);
            }

            if (editAfterImageFile) {
                const path = `maintenance/after/${Date.now()}_${editAfterImageFile.name}`;
                uploadedAfterUrl = await uploadImage(editAfterImageFile, path);
            }

            // Create a task for each selected system
            const promises = selectedSystemIds.map(async (sysId, index) => {
                const system = availableSystems.find(s => s.id === sysId);
                
                // Get names for selected codes
                const selectedNames = selectedUserCodes.map(code =>
                    availableUsers.find(u => u.code === code)?.name || code
                );

                const selectedSupervisorNames = selectedSupervisorCodes.map(code =>
                    availableUsers.find(u => u.code === code)?.name || code
                );

                const newTask: MaintenanceTask = {
                    id: isEditMode && editingTaskId ? editingTaskId : `${Date.now()}_${index}`,
                    title,
                    type: taskType,
                    description: desc,
                    deadline,
                    assignees: selectedUserCodes,
                    assigneeNames: selectedNames,
                    supervisors: selectedSupervisorCodes,
                    supervisorNames: selectedSupervisorNames,
                    assignedByName: currentUser?.name || 'Admin',
                    status: isEditMode && editingTaskId ? (tasks.find(t => t.id === editingTaskId)?.status || 'PENDING') : 'PENDING',
                    createdAt: isEditMode && editingTaskId ? (tasks.find(t => t.id === editingTaskId)?.createdAt || '') : new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false }),
                    beforeImageUrl: uploadedBeforeUrl || undefined,
                    completedAt: isEditMode && editingTaskId ? (tasks.find(t => t.id === editingTaskId)?.completedAt || '') : '',
                    completedNote: isEditMode && editingTaskId ? editCompletedNote : '',
                    remainingIssues: isEditMode && editingTaskId ? editRemainingIssues : '',
                    afterImageUrl: (isEditMode && editingTaskId ? uploadedAfterUrl : '') || undefined,
                    systemId: sysId,
                    systemName: system?.name || '',
                    maintenanceLevel: maintenanceLevel || undefined,
                    vdgsChecklist: vdgsChecklist.length > 0 ? vdgsChecklist : undefined,
                };

                return saveMaintenance(newTask);
            });

            await Promise.all(promises);

            // Reset
            setTitle('');
            setTaskType('MAINTENANCE');
            setDesc('');
            setDeadline('');
            setSelectedUserCodes([]);
            setSelectedSupervisorCodes([]);
            setSelectedSystemIds([]);
            setSystemSearch('');
            setBeforeImageFile(null);
            setBeforeImagePreview(null);
            setMaintenanceLevel('');
            setVdgsChecklist([]);
            setIsEditMode(false);
            setEditingTaskId(null);
            setViewMode('LIST');
            alert(isEditMode ? "Đã cập nhật kế hoạch bảo trì thành công!" : `Đã giao việc bảo trì thành công cho ${selectedSystemIds.length} hệ thống!`);
        } catch (error) {
            console.error("Failed to create maintenance task", error);
            alert("Lỗi khi lập kế hoạch. Vui lòng thử lại!");
        } finally {
            setIsUploading(false);
        }
    };

    const openCompleteModal = (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        setSelectedTaskId(taskId);
        setCompleteNote('');
        setRemainingIssues('');
        setExportLevel('');

        // Load checklist để nhân viên điền kiểm tra / tình trạng / ghi chú
        const isVdgs = task?.systemName?.toUpperCase().includes('VDGS');
        if (isVdgs) {
            const level = task?.maintenanceLevel || '';
            setCompleteModalLevel(level as '1 tháng' | '6 tháng' | '12 tháng' | '');
            if (task?.vdgsChecklist?.length) {
                setCompleteModalChecklist(task.vdgsChecklist.map(item => ({ ...item, kiemTra: false, tinhTrang: '', ghiChu: '' })));
            } else if (level) {
                const tmpl = VDGS_CHECKLIST[level] || [];
                setCompleteModalChecklist(tmpl.map(item => ({ ...item, kiemTra: false, tinhTrang: '', ghiChu: '' })));
            } else {
                setCompleteModalChecklist([]);
            }
        } else {
            setCompleteModalLevel('');
            setCompleteModalChecklist([]);
        }

        // Init với giờ hiện tại
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const localISO = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
        setCompletedAtInput(localISO);

        setIsCompleteModalOpen(true);
    };

    const handleConfirmComplete = async () => {
        if (!selectedTaskId || !completeNote.trim()) {
            alert("Vui lòng nhập Ghi chú hoàn thành!");
            return;
        }

        // Validate checklist VDGS: Không đạt / N/A bắt buộc có Ghi chú
        if (completeModalChecklist.length > 0) {
            const missingNote = completeModalChecklist.find(
                item => (item.tinhTrang === 'Không đạt' || item.tinhTrang === 'N/A') && !item.ghiChu.trim()
            );
            if (missingNote) {
                alert(`Hạng mục ${missingNote.stt}: bắt buộc nhập Ghi chú khi tình trạng "${missingNote.tinhTrang}"!`);
                return;
            }
        }

        setIsCompleting(true);
        let uploadedAfterUrl = '';

        try {
            if (afterImageFile) {
                const path = `maintenance/after/${Date.now()}_${afterImageFile.name}`;
                uploadedAfterUrl = await uploadImage(afterImageFile, path);
            }

            const taskToUpdate = tasks.find(t => t.id === selectedTaskId);
            if (taskToUpdate) {
                // Convert YYYY-MM-DDTHH:mm back to HH:mm dd/MM/yyyy
                const d = new Date(completedAtInput);
                const pad = (n: number) => n.toString().padStart(2, '0');
                const formattedCompletedAt = completedAtInput 
                    ? `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
                    : new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false });

                const updatedTask: MaintenanceTask = {
                    ...taskToUpdate,
                    status: 'COMPLETED',
                    completedAt: formattedCompletedAt,
                    completedNote: completeNote,
                    remainingIssues: remainingIssues,
                    afterImageUrl: uploadedAfterUrl,
                    vdgsChecklist: completeModalChecklist.length > 0 ? completeModalChecklist : taskToUpdate.vdgsChecklist,
                };
                await saveMaintenance(updatedTask);
                alert("Đã báo cáo hoàn thành bảo dưỡng!");
                setIsCompleteModalOpen(false);
                setSelectedTaskId(null);
                setAfterImageFile(null);
                setAfterImagePreview(null);
            }
        } catch (error) {
            console.error("Failed to complete task", error);
            alert("Lỗi khi báo cáo hoàn thành. Vui lòng thử lại!");
        } finally {
            setIsCompleting(false);
        }
    };

    const handleDeleteTask = async (id: string) => {
        if (!window.confirm("Bạn có chắc chắn muốn XÓA kế hoạch bảo trì này không? Thao tác này không thể hoàn tác.")) return;
        try {
            await deleteMaintenance(id);
            alert("Đã xóa kế hoạch thành công!");
        } catch (error) {
            console.error("Failed to delete task", error);
            alert("Lỗi khi xóa kế hoạch!");
        }
    };

    const handleEditTask = (task: MaintenanceTask) => {
        setEditingTaskId(task.id);
        setIsEditMode(true);
        setTitle(task.title);
        setTaskType(task.type || 'MAINTENANCE');
        setDesc(task.description || '');
        setDeadline(task.deadline || '');
        setSelectedUserCodes(task.assignees || []);
        setSelectedSupervisorCodes(task.supervisors || []);
        setSelectedSystemIds(task.systemId ? [task.systemId] : []);
        setBeforeImagePreview(task.beforeImageUrl || null);
        setMaintenanceLevel(task.maintenanceLevel || '');
        setVdgsChecklist(task.vdgsChecklist ? [...task.vdgsChecklist] : []);

        // Populate completion fields if they exist
        setEditCompletedNote(task.completedNote || '');
        setEditRemainingIssues(task.remainingIssues || '');
        setEditAfterImagePreview(task.afterImageUrl || null);
        setEditAfterImageFile(null);

        setViewMode('CREATE');
    };

    const cancelEdit = () => {
        setIsEditMode(false);
        setEditingTaskId(null);
        setTitle('');
        setTaskType('MAINTENANCE');
        setDesc('');
        setDeadline('');
        setSelectedUserCodes([]);
        setSelectedSupervisorCodes([]);
        setSelectedSystemIds([]);
        setSystemSearch('');
        setBeforeImageFile(null);
        setBeforeImagePreview(null);
        setMaintenanceLevel('');
        setVdgsChecklist([]);
        setEditCompletedNote('');
        setEditRemainingIssues('');
        setEditAfterImagePreview(null);
        setEditAfterImageFile(null);
        setViewMode('LIST');
    };

    // True khi ít nhất 1 hệ thống VDGS được chọn
    const isVdgsSelected = selectedSystemIds.some(id => {
        const sys = availableSystems.find(s => s.id === id);
        return sys?.name?.toUpperCase().includes('VDGS');
    });

    const exportVdgsWordReport = async (
        task: MaintenanceTask,
        level: string,
        completedDateStr: string,
        remainingIssuesText: string
    ) => {
        if (!level) { alert('Vui lòng chọn cấp bảo dưỡng để xuất file Word!'); return; }

        // Dùng checklist đã lưu hoặc lấy từ template nếu task cũ chưa có
        const checklist: VdgsChecklistItem[] = task.vdgsChecklist?.length
            ? task.vdgsChecklist
            : (VDGS_CHECKLIST[level] || []).map(item => ({ stt: item.stt, noiDung: item.noiDung, kiemTra: false, tinhTrang: '', ghiChu: '' }));

        const levelCode = level === '1 tháng' ? '1T' : level === '6 tháng' ? '6T' : '12T';
        const levelLabel = `CHI TIẾT KIỂM TRA BẢO DƯỠNG ${levelCode}`;

        // Format deadline date
        const deadlineParts = (task.deadline || '').split('-'); // YYYY-MM-DD
        const deadlineFormatted = deadlineParts.length === 3 ? `${deadlineParts[0]}-${deadlineParts[1]}-${deadlineParts[2]}` : task.deadline;

        const singleBorder = { style: BorderStyle.SINGLE, size: 1, color: '000000' };
        const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

        const cell = (text: string, opts: { bold?: boolean; center?: boolean; width?: number; italic?: boolean; size?: number } = {}) =>
            new TableCell({
                width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
                children: [new Paragraph({
                    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
                    children: [new TextRun({ text, bold: opts.bold, italics: opts.italic, size: opts.size ?? 20 })],
                })],
            });

        const assigneeList = (task.assigneeNames || []).join(', ') || '...............';
        const supervisorList = (task.supervisorNames || []).join(', ') || '...............';

        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    // ── HEADER TABLE ──
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: { top: singleBorder, bottom: singleBorder, left: singleBorder, right: singleBorder, insideHorizontal: singleBorder, insideVertical: singleBorder },
                        rows: [new TableRow({ children: [
                            new TableCell({
                                width: { size: 22, type: WidthType.PERCENTAGE },
                                children: [
                                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ACV', bold: true, size: 24 })] }),
                                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'TỔNG CÔNG TY CẢNG HÀNG KHÔNG VIỆT NAM - CTCP', size: 16 })] }),
                                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'AIRPORTS CORPORATION OF VIETNAM', size: 16, italics: true })] }),
                                ],
                            }),
                            new TableCell({
                                width: { size: 50, type: WidthType.PERCENTAGE },
                                children: [
                                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'QUY TRÌNH BẢO DƯỠNG VÀ SỬA CHỮA TTBMB', bold: true, size: 20 })] }),
                                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'PROCEDURE OF GSE MAINTENANCE AND REPAIR', italics: true, size: 18 })] }),
                                ],
                            }),
                            new TableCell({
                                width: { size: 28, type: WidthType.PERCENTAGE },
                                children: [
                                    new Paragraph({ children: [new TextRun({ text: 'Ký hiệu: QT01/ACV-KTCN-TB', size: 16 })] }),
                                    new Paragraph({ children: [new TextRun({ text: 'Code: QT01/ACV-KTCN-TB', size: 16 })] }),
                                    new Paragraph({ children: [new TextRun({ text: 'Lần ban hành/sửa đổi: 02/00', size: 16 })] }),
                                    new Paragraph({ children: [new TextRun({ text: 'Ngày hiệu lực: 01/4/2026', size: 16 })] }),
                                ],
                            }),
                        ]})]
                    }),

                    // ── TITLE ──
                    new Paragraph({ spacing: { before: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Biểu mẫu/Form: B06.53.QT01/KTCN-TB', size: 18 })] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'PHIẾU CÔNG TÁC BẢO DƯỠNG', bold: true, underline: {}, size: 28 })] }),
                    new Paragraph({ spacing: { after: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MAINTENANCE CHECKLIST', bold: true, italics: true, size: 22 })] }),

                    // ── SECTION 1 ──
                    new Paragraph({ children: [new TextRun({ text: '1. TRANG THIẾT BỊ BẢO DƯỠNG/ EQUIPMENT:', bold: true, size: 22 })] }),
                    new Paragraph({ children: [new TextRun({ text: '   1.1. Chủng loại / Type: Hệ thống dẫn đỗ tàu bay VDGS', size: 20 })] }),
                    new Paragraph({ children: [new TextRun({ text: `   1.2. Số đăng ký / Registration No.: ${task.systemName}          Thời gian HĐ / Operating time: ${completedDateStr}`, size: 20 })] }),
                    new Paragraph({ children: [new TextRun({ text: `   1.3. Phiếu công tác bảo dưỡng số / Checklist no: ${(task.systemId || '').replace(/\D/g, '').padStart(5, '0') || '00001'}          Ngày/ date: ${deadlineFormatted}`, size: 20 })] }),
                    new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: `   1.4. Cấp bảo dưỡng TTB / Maintenance level: ${levelCode}`, size: 20 })] }),

                    // ── SECTION 2 ──
                    new Paragraph({ children: [new TextRun({ text: '2. NGƯỜI THỰC HIỆN / CHECKED BY:', bold: true, size: 22 })] }),
                    new Paragraph({ children: [new TextRun({ text: `   2.1. ${assigneeList}          Ngày nhận công việc / date: ${deadlineFormatted}`, size: 20 })] }),
                    new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: `   2.2. ${supervisorList}          Ngày nhận công việc / date: ${deadlineFormatted}`, size: 20 })] }),

                    // ── SECTION 3 ──
                    new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: '3. NỘI DUNG BẢO DƯỠNG (ĐÍNH KÈM) / MAINTENANCE TASKS (ATTACHED)', bold: true, size: 22 })] }),

                    // ── SECTION 4 ──
                    new Paragraph({ children: [new TextRun({ text: '4. PHÁT SINH KHÁC / ARISING PROBLEM:', bold: true, size: 22 })] }),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: { top: singleBorder, bottom: singleBorder, left: singleBorder, right: singleBorder, insideHorizontal: singleBorder, insideVertical: singleBorder },
                        rows: [
                            new TableRow({ children: [
                                cell('No', { bold: true, center: true, width: 8 }),
                                cell('Nội dung phát sinh / Arising content', { bold: true, center: true, width: 62 }),
                                cell('Ghi chú / Remark', { bold: true, center: true, width: 30 }),
                            ]}),
                            new TableRow({ children: [
                                cell('1', { center: true }),
                                cell(remainingIssuesText || '...'),
                                cell(''),
                            ]}),
                            new TableRow({ children: [cell('2', { center: true }), cell(''), cell('')] }),
                        ]
                    }),

                    // ── SECTION 5 ──
                    new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: '5. NGHIỆM THU / CHECK AND TAKE OVER', bold: true, size: 22 })] }),
                    new Paragraph({ children: [new TextRun({ text: `   5.1 Người thực hiện / checked by (ký/signature): ${assigneeList}`, size: 20 })] }),
                    new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: '   5.2. Xác nhận của đơn vị sử dụng / Approved by used unit', size: 20 })] }),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: { top: singleBorder, bottom: singleBorder, left: singleBorder, right: singleBorder, insideHorizontal: noBorder, insideVertical: noBorder },
                        rows: [new TableRow({ children: [
                            new TableCell({ children: [new Paragraph({ children: [
                                new TextRun({ text: 'Kết luận:   - Đạt YCKT, đưa TTB vào khai thác  [X]      - Không đạt  [  ]', bold: true, size: 20 }),
                            ]})] }),
                        ]})]
                    }),

                    // ── FOOTER ──
                    new Paragraph({ spacing: { before: 200 } }),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
                        rows: [
                            new TableRow({ children: [
                                cell('PHÒNG/ĐỘI PVMB-KT/ GHS-TECH. DIVISION/TEAM', { bold: true, center: true, width: 50, size: 18 }),
                                cell(`Ngày/ Date: ${deadlineFormatted}`, { center: true, width: 50, size: 18 }),
                            ]}),
                            new TableRow({ children: [
                                cell('(ký tên/ signature)', { center: true, italic: true, size: 18 }),
                                cell('ĐỘI/TỔ VHTTBMD/GSE OP. TEAM', { bold: true, center: true, size: 18 }),
                            ]}),
                            new TableRow({ children: [
                                cell('', { width: 50 }),
                                cell('(ký tên/ signature)', { center: true, italic: true, size: 18 }),
                            ]}),
                        ]
                    }),

                    // ── PAGE BREAK → PAGE 2 ──
                    new Paragraph({ pageBreakBefore: true, children: [new TextRun({ text: '' })] }),

                    // ── PAGE 2 TITLE ──
                    new Paragraph({ spacing: { before: 200, after: 300 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: levelLabel, bold: true, size: 28 })] }),

                    // ── CHECKLIST TABLE ──
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: { top: singleBorder, bottom: singleBorder, left: singleBorder, right: singleBorder, insideHorizontal: singleBorder, insideVertical: singleBorder },
                        rows: [
                            new TableRow({ tableHeader: true, children: [
                                cell('Stt', { bold: true, center: true, width: 6 }),
                                cell('Hạng mục kiểm tra', { bold: true, center: true, width: 50 }),
                                cell('Kiểm tra', { bold: true, center: true, width: 12 }),
                                cell('Tình trạng', { bold: true, center: true, width: 16 }),
                                cell('Ghi chú', { bold: true, center: true, width: 16 }),
                            ]}),
                            ...checklist.map(item => new TableRow({ children: [
                                cell(item.stt.toString(), { center: true }),
                                cell(item.noiDung),
                                cell(item.kiemTra ? '✓' : '', { center: true }),
                                cell(item.tinhTrang, { center: true }),
                                cell(item.ghiChu),
                            ]})),
                        ]
                    }),
                ]
            }]
        });

        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const sysName = (task.systemName || 'VDGS').replace(/\s+/g, '_');
        a.href = url;
        a.download = `PhieuBaoDuong_${sysName}_${levelCode}_${deadlineFormatted.replace(/\//g, '-')}.docx`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Helper: Group tasks by month
    const groupTasksByMonth = (taskList: MaintenanceTask[]) => {
        const groups: Record<string, MaintenanceTask[]> = {};
        taskList.forEach(task => {
            const dateParts = (task.deadline || '').split('-'); // YYYY-MM-DD
            const monthYear = dateParts.length === 3 ? `Tháng ${dateParts[1]}/${dateParts[0]}` : 'Khác';
            if (!groups[monthYear]) groups[monthYear] = [];
            groups[monthYear].push(task);
        });
        return groups;
    };

    const toggleGroup = (group: string) => {
        setExpandedGroups(prev =>
            prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
        );
    };

    const filteredTasks = tasks.filter(task => {
        const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter;
        const matchesSearch = listSearch === '' || 
            task.title.toLowerCase().includes(listSearch.toLowerCase()) ||
            (task.systemName || '').toLowerCase().includes(listSearch.toLowerCase()) ||
            (task.description || '').toLowerCase().includes(listSearch.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const groupedTasks = groupTasksByMonth(filteredTasks);
    // Sort group keys by Year/Month descending
    const sortedGroupKeys = Object.keys(groupedTasks).sort((a, b) => {
        if (a === 'Khác') return 1;
        if (b === 'Khác') return -1;
        const [mA, yA] = a.replace('Tháng ', '').split('/').map(Number);
        const [mB, yB] = b.replace('Tháng ', '').split('/').map(Number);
        if (yA !== yB) return yB - yA;
        return mB - mA;
    });

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900 overflow-x-hidden">
            <div className="max-w-4xl mx-auto">
                <header className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/')} className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-100">
                            <ArrowLeft size={20} className="text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold uppercase text-blue-800 flex items-center gap-2">
                                <Wrench className="text-blue-600" />
                                Bảo Trì & Bảo Dưỡng
                            </h1>
                            <p className="text-slate-500 text-sm">Quản lý các kế hoạch bảo trì định kỳ</p>
                        </div>
                    </div>
                    {currentUser?.role === 'ADMIN' && viewMode === 'LIST' && (
                        <button
                            onClick={() => {
                                cancelEdit();
                                setViewMode('CREATE');
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 flex items-center gap-2 font-bold transition-all active:scale-95"
                        >
                            <Plus size={20} /> Lập Kế Hoạch
                        </button>
                    )}
                </header>

                {viewMode === 'LIST' && (
                    <div className="mb-6 space-y-4">
                        {/* Search & Filter Toolbar */}
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Tìm tên, hệ thống, mô tả..."
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    value={listSearch}
                                    onChange={(e) => setListSearch(e.target.value)}
                                />
                            </div>
                            
                            <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto">
                                <button
                                    onClick={() => setStatusFilter('ALL')}
                                    className={clsx(
                                        "flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                                        statusFilter === 'ALL' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    Tất cả ({tasks.length})
                                </button>
                                <button
                                    onClick={() => setStatusFilter('PENDING')}
                                    className={clsx(
                                        "flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                                        statusFilter === 'PENDING' ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    Cần làm ({tasks.filter(t => t.status === 'PENDING').length})
                                </button>
                                <button
                                    onClick={() => setStatusFilter('COMPLETED')}
                                    className={clsx(
                                        "flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                                        statusFilter === 'COMPLETED' ? "bg-white text-green-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    Đã xong ({tasks.filter(t => t.status === 'COMPLETED').length})
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === 'CREATE' && (
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 mb-6">
                        <h2 className="font-bold text-lg mb-4 text-slate-800 border-b pb-2">
                            {isEditMode ? 'Chỉnh sửa Kế hoạch Bảo trì' : 'Giao việc Bảo trì Mới'}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Loại công việc *</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="taskType"
                                            value="MAINTENANCE"
                                            checked={taskType === 'MAINTENANCE'}
                                            onChange={() => setTaskType('MAINTENANCE')}
                                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-bold text-slate-700">Bảo dưỡng định kỳ <span className="text-slate-500 font-normal">(8 điểm KPI)</span></span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="taskType"
                                            value="PROJECT"
                                            checked={taskType === 'PROJECT'}
                                            onChange={() => setTaskType('PROJECT')}
                                            className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                                        />
                                        <span className="text-sm font-bold text-slate-700">Dự án / Thi công <span className="text-slate-500 font-normal">(10 điểm KPI)</span></span>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên công việc *</label>
                                <IMESafeInput
                                    className="w-full border border-slate-300 rounded p-2 focus:border-blue-500 outline-none"
                                    placeholder="VD: Cầu A1..."
                                    value={title}
                                    onChangeValue={(val: string) => setTitle(val)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Hệ thống / Thiết bị {isEditMode ? '*' : '(Có thể chọn nhiều) *'}
                                </label>
                                
                                {!isEditMode && (
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            placeholder="Tìm nhanh hệ thống..."
                                            className="flex-1 text-sm border border-slate-300 rounded px-3 py-1.5 focus:border-blue-500 outline-none"
                                            value={systemSearch}
                                            onChange={(e) => setSystemSearch(e.target.value)}
                                        />
                                        <button 
                                            type="button"
                                            onClick={selectAllSystems}
                                            className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100"
                                        >
                                            CHỌN HẾT
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={deselectAllSystems}
                                            className="text-[10px] font-bold bg-slate-50 text-slate-600 px-2 py-1 rounded border border-slate-100 hover:bg-slate-100"
                                        >
                                            BỎ HẾT
                                        </button>
                                    </div>
                                )}

                                <div className="border border-slate-300 rounded max-h-60 overflow-y-auto p-2 bg-slate-50">
                                    {categories.length === 0 ? (
                                        <div className="space-y-1">
                                            {availableSystems
                                                .filter(sys => sys.name.toLowerCase().includes(systemSearch.toLowerCase()) || sys.id.toLowerCase().includes(systemSearch.toLowerCase()))
                                                .map(sys => (
                                                    <label key={sys.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer transition-colors">
                                                        <input
                                                            type={isEditMode ? "radio" : "checkbox"}
                                                            name={isEditMode ? "systemRadio" : undefined}
                                                            checked={selectedSystemIds.includes(sys.id)}
                                                            onChange={() => toggleSystemSelection(sys.id)}
                                                            className={clsx("w-4 h-4 text-blue-600", isEditMode ? "" : "rounded")}
                                                        />
                                                        <span className="text-sm font-bold text-slate-700">[{sys.id}]</span>
                                                        <span className="text-sm text-slate-600">{sys.name}</span>
                                                    </label>
                                                ))}
                                        </div>
                                    ) : (
                                        categories.map(cat => {
                                            const catSystems = availableSystems.filter(s => s.categoryId === cat.id && (s.name.toLowerCase().includes(systemSearch.toLowerCase()) || s.id.toLowerCase().includes(systemSearch.toLowerCase())));
                                            if (catSystems.length === 0) return null;
                                            return (
                                                <div key={cat.id} className="mb-4 last:mb-0">
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1 flex justify-between items-center">
                                                        <span>{cat.name}</span>
                                                        <span className="bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">{catSystems.length}</span>
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        {catSystems.map(sys => (
                                                            <label key={sys.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer transition-colors">
                                                                <input
                                                                    type={isEditMode ? "radio" : "checkbox"}
                                                                    name={isEditMode ? "systemRadio" : undefined}
                                                                    checked={selectedSystemIds.includes(sys.id)}
                                                                    onChange={() => toggleSystemSelection(sys.id)}
                                                                    className={clsx("w-4 h-4 text-blue-600", isEditMode ? "" : "rounded")}
                                                                />
                                                                <span className="text-sm font-bold text-slate-700">[{sys.id}]</span>
                                                                <span className="text-sm text-slate-600">{sys.name}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    {availableSystems.filter(sys => !sys.categoryId && (sys.name.toLowerCase().includes(systemSearch.toLowerCase()) || sys.id.toLowerCase().includes(systemSearch.toLowerCase()))).length > 0 && (
                                        <div className="mt-4">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1">Khác</div>
                                            <div className="space-y-0.5">
                                                {availableSystems
                                                    .filter(sys => !sys.categoryId && (sys.name.toLowerCase().includes(systemSearch.toLowerCase()) || sys.id.toLowerCase().includes(systemSearch.toLowerCase())))
                                                    .map(sys => (
                                                        <label key={sys.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer transition-colors">
                                                            <input
                                                                type={isEditMode ? "radio" : "checkbox"}
                                                                name={isEditMode ? "systemRadio" : undefined}
                                                                checked={selectedSystemIds.includes(sys.id)}
                                                                onChange={() => toggleSystemSelection(sys.id)}
                                                                className={clsx("w-4 h-4 text-blue-600", isEditMode ? "" : "rounded")}
                                                            />
                                                            <span className="text-sm font-bold text-slate-700">[{sys.id}]</span>
                                                            <span className="text-sm text-slate-600">{sys.name}</span>
                                                        </label>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {!isEditMode && (
                                    <p className="text-[10px] text-blue-600 mt-1 font-medium">
                                        Đã chọn: {selectedSystemIds.length} hệ thống
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả chi tiết</label>
                                <IMESafeTextArea
                                    className="w-full border border-slate-300 rounded p-2 focus:border-blue-500 outline-none"
                                    rows={3}
                                    placeholder="Nội dung cần làm..."
                                    value={desc}
                                    onChangeValue={(val: string) => setDesc(val)}
                                />
                            </div>

                            {/* VDGS Checklist Section — chỉ hiện khi chọn hệ thống VDGS */}
                            {isVdgsSelected && <div className="border border-blue-200 rounded-xl bg-blue-50/40 p-4">
                                <label className="block text-sm font-bold text-blue-800 mb-2 uppercase tracking-wide">
                                    📋 Checklist bảo dưỡng VDGS
                                </label>
                                <select
                                    className="w-full border border-blue-300 rounded-lg p-2 focus:border-blue-500 outline-none bg-white text-sm mb-3"
                                    value={maintenanceLevel}
                                    onChange={e => handleMaintenanceLevelChange(e.target.value as '1 tháng' | '6 tháng' | '12 tháng' | '')}
                                >
                                    <option value="">-- Chọn cấp bảo dưỡng --</option>
                                    <option value="1 tháng">Bảo dưỡng 1 tháng (3 hạng mục)</option>
                                    <option value="6 tháng">Bảo dưỡng 6 tháng (12 hạng mục)</option>
                                    <option value="12 tháng">Bảo dưỡng 12 tháng (14 hạng mục)</option>
                                </select>

                                {vdgsChecklist.length > 0 && (
                                    <div className="rounded-lg border border-blue-200 shadow-sm overflow-hidden">
                                        <table className="w-full text-sm border-collapse">
                                            <thead>
                                                <tr className="bg-blue-700 text-white text-xs">
                                                    <th className="border border-blue-600 px-2 py-2 text-center w-10">STT</th>
                                                    <th className="border border-blue-600 px-3 py-2 text-left">Nội dung kiểm tra</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {vdgsChecklist.map((item, idx) => (
                                                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'}>
                                                        <td className="border border-blue-100 px-2 py-2 text-center font-bold text-slate-600">{item.stt}</td>
                                                        <td className="border border-blue-100 px-3 py-2 text-slate-700 leading-snug">{item.noiDung}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="px-3 py-1.5 bg-blue-50 text-[10px] text-blue-600 font-medium border-t border-blue-100">
                                            ℹ️ Nhân viên sẽ điền Kiểm tra / Tình trạng / Ghi chú khi Báo cáo Hoàn thành
                                        </div>
                                    </div>
                                )}
                            </div>}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Giao cho nhân viên (Chọn nhiều) *</label>
                                    <div className="border border-slate-300 rounded max-h-48 overflow-y-auto p-2 bg-slate-50">
                                        {availableUsers.length === 0 ? (
                                            <p className="text-slate-400 text-sm">Chưa có danh sách nhân viên.</p>
                                        ) : (
                                            availableUsers.map(u => (
                                                <label key={u.code} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedUserCodes.includes(u.code)}
                                                        onChange={() => toggleUserSelection(u.code)}
                                                        className="w-4 h-4 text-blue-600 rounded"
                                                    />
                                                    <span className="text-sm font-medium">{u.name}</span>
                                                    <span className="text-xs text-slate-500">({u.code})</span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                    <p className="text-xs text-blue-600 mt-1">
                                        Đã chọn: {selectedUserCodes.length} người
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Người Giám Sát (Hưởng điểm Giám Sát)</label>
                                    <div className="border border-slate-300 rounded max-h-48 overflow-y-auto p-2 bg-slate-50">
                                        {availableUsers.length === 0 ? (
                                            <p className="text-slate-400 text-sm">Chưa có danh sách nhân viên.</p>
                                        ) : (
                                            availableUsers.map(u => (
                                                <label key={u.code} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSupervisorCodes.includes(u.code)}
                                                        onChange={() => toggleSupervisorSelection(u.code)}
                                                        className="w-4 h-4 text-purple-600 rounded"
                                                    />
                                                    <span className="text-sm font-medium">{u.name}</span>
                                                    <span className="text-xs text-slate-500">({u.code})</span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                    <p className="text-xs text-purple-600 mt-1">
                                        Đã chọn: {selectedSupervisorCodes.length} người
                                    </p>
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Hạn chót (Deadline) *</label>
                                    <input
                                        type="date"
                                        className="w-full border border-slate-300 rounded p-2 focus:border-blue-500 outline-none"
                                        value={deadline}
                                        onChange={e => setDeadline(e.target.value)}
                                    />
                                    <div className="mt-4 bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800 border border-yellow-200 shadow-sm">
                                        <div className="font-bold flex items-center gap-1 mb-1">
                                            <AlertTriangle size={14} className="text-yellow-600" /> Cơ chế KPI:
                                        </div>
                                        <ul className="list-disc ml-5 space-y-1 mt-1">
                                            <li><span className="font-bold">Bảo dưỡng định kỳ:</span> Người thực hiện nhận <span className="font-bold text-blue-700">8 điểm</span>.</li>
                                            <li><span className="font-bold">Dự án / Thi công:</span> Người thực hiện nhận <span className="font-bold text-orange-700">10 điểm</span>.</li>
                                            <li><span className="font-bold">Người giám sát:</span> Nhận <span className="font-bold text-purple-700">6 điểm</span> cho cả hai loại.</li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="col-span-1 md:col-span-2 pt-2 border-t border-slate-100">
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2 uppercase tracking-wider">
                                        <Camera size={18} className="text-blue-600" /> Ảnh hiện trạng thiết bị (Trước khi bảo trì)
                                    </label>
                                    <div className="flex flex-wrap gap-4 items-center">
                                        {!beforeImagePreview ? (
                                            <label className="flex flex-col items-center justify-center w-32 h-32 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:bg-blue-50 transition group">
                                                <Camera size={28} className="text-slate-400 group-hover:text-blue-600 mb-1" />
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">Chụp ảnh</span>
                                                <input 
                                                    type="file" 
                                                    className="hidden" 
                                                    accept="image/*" 
                                                    capture="environment"
                                                    onChange={handleBeforeImageChange}
                                                />
                                            </label>
                                        ) : (
                                            <div className="relative w-32 h-32 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                                <img src={beforeImagePreview} alt="Before" className="w-full h-full object-cover" />
                                                <button onClick={removeBeforeImage} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-md">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        )}
                                        <p className="text-xs text-slate-500 italic max-w-sm">
                                            Chụp ảnh hiện trạng thiết bị trước khi tiến hành bảo trì để lưu làm bằng chứng báo cáo sau này.
                                        </p>
                                    </div>
                                </div>

                                {isEditMode && tasks.find(t => t.id === editingTaskId)?.status === 'COMPLETED' && (
                                    <div className="col-span-1 md:col-span-2 pt-6 border-t border-slate-100 bg-green-50/30 -mx-6 px-6 mt-4">
                                        <h3 className="text-sm font-black text-green-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <CheckSquare size={18} /> Chỉnh sửa Báo cáo Hoàn thành
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Kết quả bảo dưỡng *</label>
                                                <IMESafeTextArea
                                                    className="w-full border border-slate-300 rounded p-2 focus:border-green-500 outline-none bg-white"
                                                    rows={3}
                                                    value={editCompletedNote}
                                                    onChangeValue={(val: string) => setEditCompletedNote(val)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Cần tồn tại (Nếu có)</label>
                                                <IMESafeTextArea
                                                    className="w-full border border-slate-300 rounded p-2 focus:border-yellow-500 outline-none bg-white"
                                                    rows={2}
                                                    value={editRemainingIssues}
                                                    onChangeValue={(val: string) => setEditRemainingIssues(val)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Ảnh kết quả (Sau bảo trì)</label>
                                                <div className="flex items-center gap-4">
                                                    {!editAfterImagePreview ? (
                                                        <label className="flex flex-col items-center justify-center w-32 h-32 rounded-xl border-2 border-dashed border-slate-300 bg-white cursor-pointer hover:bg-green-50 transition group">
                                                            <Camera size={28} className="text-slate-400 group-hover:text-green-600 mb-1" />
                                                            <input 
                                                                type="file" 
                                                                className="hidden" 
                                                                accept="image/*" 
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        setEditAfterImageFile(file);
                                                                        const reader = new FileReader();
                                                                        reader.onloadend = () => setEditAfterImagePreview(reader.result as string);
                                                                        reader.readAsDataURL(file);
                                                                    }
                                                                }}
                                                            />
                                                        </label>
                                                    ) : (
                                                        <div className="relative w-32 h-32 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                                            <img src={editAfterImagePreview} alt="After" className="w-full h-full object-cover" />
                                                            <button 
                                                                onClick={() => { setEditAfterImageFile(null); setEditAfterImagePreview(null); }} 
                                                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-md"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <button
                                    onClick={cancelEdit}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded"
                                    disabled={isUploading}
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleCreate}
                                    className="px-6 py-2 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700 flex items-center gap-2"
                                    disabled={isUploading}
                                >
                                    {isUploading ? <Loader2 className="animate-spin" size={18} /> : (
                                        <>
                                            {isEditMode ? <CheckSquare size={20} /> : <Plus size={20} />} 
                                            {isEditMode ? 'Cập Nhật' : 'Giao Việc'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    {tasks.length === 0 && (
                        <div className="text-center p-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                            Chưa có kế hoạch bảo trì nào.
                        </div>
                    )}

                    {viewMode === 'LIST' && sortedGroupKeys.map(groupKey => (
                        <div key={groupKey} className="space-y-3">
                            <button
                                onClick={() => toggleGroup(groupKey)}
                                className="w-full flex items-center justify-between p-3 bg-slate-200/50 hover:bg-slate-200 rounded-lg transition-colors group"
                            >
                                <div className="flex items-center gap-2">
                                    <h2 className="font-black text-slate-700 text-sm uppercase tracking-widest">{groupKey}</h2>
                                    <span className="bg-white text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-bold border border-slate-300">
                                        {groupedTasks[groupKey].length} công việc
                                    </span>
                                </div>
                                {expandedGroups.includes(groupKey) ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
                            </button>

                            {expandedGroups.includes(groupKey) && (
                                <div className="grid grid-cols-1 gap-4">
                                    {groupedTasks[groupKey].map(task => (
                                        <div key={task.id} className={clsx(
                                            "bg-white rounded-xl shadow-sm border transition relative overflow-hidden group/item",
                                            task.status === 'COMPLETED' ? "border-green-100" : "border-slate-200 hover:border-blue-300"
                                        )}>
                                            <div className="p-4 md:p-5">
                                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                                            <div className="bg-blue-100 text-blue-700 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">{task.systemId}</div>
                                                            <h3 className="font-bold text-base text-slate-800 leading-tight">
                                                                {task.title}
                                                                {task.systemName && <span className="font-medium inline-block ml-1 text-slate-500"> - {task.systemName}</span>}
                                                            </h3>
                                                            {task.status === 'COMPLETED' ? (
                                                                <span className="bg-green-50 text-green-700 text-[9px] font-black px-2 py-0.5 rounded-full border border-green-200 uppercase tracking-tight shadow-sm">ĐÃ XONG</span>
                                                            ) : (
                                                                <span className="bg-blue-50 text-blue-700 text-[9px] font-black px-2 py-0.5 rounded-full border border-blue-200 uppercase tracking-tight">CẦN LÀM</span>
                                                            )}
                                                            {currentUser?.role === 'ADMIN' && (
                                                                <div className="flex gap-2 ml-auto opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleEditTask(task); }}
                                                                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-600/10 rounded-lg transition-all shadow-sm border border-slate-200 bg-white"
                                                                        title="Sửa kế hoạch"
                                                                    >
                                                                        <PenTool size={14} />
                                                                    </button>
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                                                                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-600/10 rounded-lg transition-all shadow-sm border border-slate-200 bg-white"
                                                                        title="Xóa kế hoạch"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="space-y-1">
                                                            <div className="text-[11px] text-slate-600 font-medium flex items-start gap-2">
                                                                <UserIcon size={12} className="mt-0.5 text-blue-400 shrink-0" />
                                                                <div className="leading-snug">
                                                                    <span className="text-slate-400">Nhân viên:</span> <span className="text-slate-700 font-bold">{
                                                                        [...(task.assigneeNames || []), ...(task.supervisorNames || [])]
                                                                            .filter((v, i, a) => a.indexOf(v) === i)
                                                                            .join(', ') || 'Chưa giao'
                                                                    }</span>
                                                                </div>
                                                            </div>
                                                            <div className="text-[11px] text-slate-600 font-medium flex items-center gap-2">
                                                                <Calendar size={12} className="text-red-400 shrink-0" />
                                                                <span className="text-slate-400">Hạn chót:</span> <span className="text-red-600 font-bold">{task.deadline}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {task.status === 'PENDING' && (
                                                        (task.assignees?.includes(currentUser?.code || '') || task.supervisors?.includes(currentUser?.code || '') || currentUser?.role === 'ADMIN')
                                                    ) && (
                                                            <button
                                                                onClick={() => openCompleteModal(task.id)}
                                                                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white text-xs font-black rounded-lg shadow-md hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                                                            >
                                                                <CheckSquare size={14} /> Báo cáo Xong
                                                            </button>
                                                        )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="bg-slate-50/80 p-3 rounded-lg text-slate-600 text-[13px] border border-slate-100 italic leading-relaxed">
                                                        <span className="font-black block text-[9px] text-slate-400 uppercase mb-1 tracking-widest">Nội dung:</span>
                                                        {task.description || 'Không có mô tả chi tiết.'}
                                                    </div>
                                                    {task.beforeImageUrl && (
                                                        <div className="relative aspect-[16/5] rounded-lg overflow-hidden border border-slate-200 shadow-sm cursor-pointer hover:opacity-90 group"
                                                             onClick={() => setViewingImage(task.beforeImageUrl || null)}>
                                                            <img src={task.beforeImageUrl} alt="Trước bảo trì" className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                                                <Camera size={18} className="text-white" />
                                                            </div>
                                                            <div className="absolute top-1 left-2 text-[9px] text-white font-bold bg-blue-600/80 px-1.5 py-0.5 rounded shadow-sm">ẢNH TRƯỚC</div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* VDGS Checklist display */}
                                                {task.vdgsChecklist && task.vdgsChecklist.length > 0 && (
                                                    <div className="mt-3 border border-blue-200 rounded-xl overflow-hidden">
                                                        <div className="bg-blue-700 text-white px-3 py-1.5 flex items-center justify-between">
                                                            <span className="text-[10px] font-black uppercase tracking-widest">📋 Checklist VDGS — {task.maintenanceLevel}</span>
                                                            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
                                                                ✅ {task.vdgsChecklist.filter(i => i.kiemTra).length}/{task.vdgsChecklist.length} hạng mục
                                                            </span>
                                                        </div>
                                                        {/* Mobile: card list */}
                                                        <div className="md:hidden divide-y divide-blue-100">
                                                            {task.vdgsChecklist.map((item, idx) => (
                                                                <div key={idx} className={`px-3 py-2 ${idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'}`}>
                                                                    <div className="text-[11px] font-medium text-slate-700 leading-snug mb-1">
                                                                        <span className="font-black text-blue-700 mr-1">{item.stt}.</span>{item.noiDung}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className={`text-[10px] font-bold ${item.kiemTra ? 'text-green-600' : 'text-slate-400'}`}>
                                                                            {item.kiemTra ? '✓ Đã kiểm tra' : '— Chưa kiểm tra'}
                                                                        </span>
                                                                        {item.tinhTrang && (
                                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${item.tinhTrang === 'Đạt' ? 'bg-green-100 text-green-700' : item.tinhTrang === 'Không đạt' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                                                                                {item.tinhTrang}
                                                                            </span>
                                                                        )}
                                                                        {item.ghiChu && <span className="text-[10px] text-slate-500 italic">"{item.ghiChu}"</span>}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {/* Desktop: table */}
                                                        <div className="hidden md:block overflow-x-auto">
                                                            <table className="w-full text-xs border-collapse min-w-[500px]">
                                                                <thead>
                                                                    <tr className="bg-blue-50 text-slate-600">
                                                                        <th className="border border-blue-100 px-2 py-1.5 text-center w-8">STT</th>
                                                                        <th className="border border-blue-100 px-2 py-1.5 text-left">Nội dung</th>
                                                                        <th className="border border-blue-100 px-2 py-1.5 text-center w-16">Kiểm tra</th>
                                                                        <th className="border border-blue-100 px-2 py-1.5 text-center w-24">Tình trạng</th>
                                                                        <th className="border border-blue-100 px-2 py-1.5 text-left w-32">Ghi chú</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {task.vdgsChecklist.map((item, idx) => (
                                                                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/20'}>
                                                                            <td className="border border-blue-100 px-2 py-1 text-center font-bold text-slate-500">{item.stt}</td>
                                                                            <td className="border border-blue-100 px-2 py-1 text-slate-700 leading-snug">{item.noiDung}</td>
                                                                            <td className="border border-blue-100 px-2 py-1 text-center">
                                                                                {item.kiemTra ? <span className="text-green-600 font-black">✓</span> : <span className="text-slate-300">—</span>}
                                                                            </td>
                                                                            <td className="border border-blue-100 px-2 py-1 text-center">
                                                                                {item.tinhTrang ? (
                                                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${item.tinhTrang === 'Đạt' ? 'bg-green-100 text-green-700' : item.tinhTrang === 'Không đạt' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                                                                                        {item.tinhTrang}
                                                                                    </span>
                                                                                ) : <span className="text-slate-300">—</span>}
                                                                            </td>
                                                                            <td className="border border-blue-100 px-2 py-1 text-slate-600 italic">{item.ghiChu || '—'}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}

                                                {task.status === 'COMPLETED' && (
                                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                                        <div className="bg-green-50/30 p-3 rounded-lg border border-green-100/50">
                                                            <div className="flex items-center gap-2 text-green-800 font-black text-[9px] uppercase tracking-wider mb-2">
                                                                <Clock size={12} /> Hoàn thành lúc {task.completedAt}
                                                            </div>
                                                            <div className="text-sm text-slate-700 font-medium italic mb-2 leading-relaxed">
                                                                "Kết quả: {task.completedNote}"
                                                            </div>
                                                            {task.remainingIssues && (
                                                                <div className="p-2 bg-white border border-yellow-200 rounded-lg shadow-sm mb-2">
                                                                    <div className="flex items-center gap-1.5 text-yellow-700 font-black text-[9px] uppercase mb-1">
                                                                        <AlertTriangle size={10} /> Tồn tại sau bảo dưỡng
                                                                    </div>
                                                                    <div className="text-[11px] text-slate-600 font-medium">
                                                                        {task.remainingIssues}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {task.afterImageUrl && (
                                                                <div className="relative aspect-video max-h-48 rounded-lg overflow-hidden border border-green-100 shadow-sm cursor-pointer hover:opacity-90 group"
                                                                     onClick={() => setViewingImage(task.afterImageUrl || null)}>
                                                                    <img src={task.afterImageUrl} alt="Sau bảo trì" className="w-full h-full object-cover" />
                                                                    <div className="absolute inset-x-0 bottom-0 bg-black/40 text-white p-2 text-center text-[10px] font-bold flex items-center justify-center gap-2">
                                                                        <Camera size={12} /> XEM ẢNH KẾT QUẢ
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Nút xuất Word cho task VDGS đã hoàn thành */}
                                                            {task.systemName?.toUpperCase().includes('VDGS') && (
                                                                <div className="mt-3 flex items-center gap-2 flex-wrap">
                                                                    {!task.maintenanceLevel && (
                                                                        <select
                                                                            value={cardExportLevel[task.id] || ''}
                                                                            onChange={e => setCardExportLevel(prev => ({ ...prev, [task.id]: e.target.value }))}
                                                                            className="text-xs border border-slate-300 rounded px-2 py-1.5 outline-none bg-white"
                                                                        >
                                                                            <option value="">-- Chọn cấp BD --</option>
                                                                            <option value="1 tháng">1 tháng</option>
                                                                            <option value="6 tháng">6 tháng</option>
                                                                            <option value="12 tháng">12 tháng</option>
                                                                        </select>
                                                                    )}
                                                                    <button
                                                                        onClick={() => {
                                                                            const lv = task.maintenanceLevel || cardExportLevel[task.id] || '';
                                                                            // task.completedAt format: "HH:mm dd/MM/yyyy" → take date part
                                                                            const cdStr = task.completedAt ? (task.completedAt.split(' ')[1] || '') : '';
                                                                            exportVdgsWordReport(task, lv, cdStr, task.remainingIssues || '');
                                                                        }}
                                                                        className={`px-3 py-1.5 font-bold rounded shadow flex items-center gap-1.5 text-sm text-white transition-all ${(task.maintenanceLevel || cardExportLevel[task.id]) ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300 cursor-not-allowed'}`}
                                                                        disabled={!(task.maintenanceLevel || cardExportLevel[task.id])}
                                                                    >
                                                                        <FileDown size={15} /> Xuất ra file Word
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Complete Task Modal */}
            {isCompleteModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
                    <div className="flex min-h-full items-start justify-center p-4 py-8">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
                        <div className="mb-4 border-b pb-2">
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Báo cáo Hoàn thành</h3>
                            {(() => {
                                const task = tasks.find(t => t.id === selectedTaskId);
                                if (!task) return null;
                                return (
                                    <div className="mt-1 flex flex-col gap-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded leading-none">{task.systemId}</span>
                                            <span className="text-blue-700 font-bold text-xs uppercase">{task.systemName}</span>
                                        </div>
                                        <div className="text-[11px] text-slate-500 font-medium italic truncate">
                                            {task.title}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Thời gian hoàn thành thực tế *
                                </label>
                                <input
                                    type="datetime-local"
                                    className="w-full border border-slate-300 rounded p-2 focus:border-blue-500 outline-none"
                                    value={completedAtInput}
                                    onChange={e => setCompletedAtInput(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Kết quả bảo dưỡng (Đã làm được gì?) *
                                </label>
                                <IMESafeTextArea
                                    className="w-full border border-slate-300 rounded p-2 focus:border-blue-500 outline-none"
                                    rows={3}
                                    placeholder="Nhập ghi chú kết quả..."
                                    value={completeNote}
                                    onChangeValue={(val: string) => setCompleteNote(val)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Nội dung tồn tại (Nếu có)
                                </label>
                                <IMESafeTextArea
                                    className="w-full border border-yellow-300 bg-yellow-50 rounded p-2 focus:border-yellow-500 outline-none"
                                    rows={2}
                                    placeholder="Nhập các vấn đề còn tồn tại sau bảo dưỡng..."
                                    value={remainingIssues}
                                    onChangeValue={(val: string) => setRemainingIssues(val)}
                                />
                            </div>

                            {/* Checklist VDGS — luôn hiện cho task VDGS, nhân viên điền */}
                            {(() => {
                                const modalTask = tasks.find(t => t.id === selectedTaskId);
                                const isVdgs = modalTask?.systemName?.toUpperCase().includes('VDGS');
                                if (!isVdgs) return null;
                                return (
                                    <div className="border border-blue-200 rounded-xl bg-blue-50/30 p-3">
                                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                                            <div className="text-sm font-bold text-blue-800 uppercase tracking-wide">
                                                📋 Checklist bảo dưỡng VDGS — Nhân viên điền
                                            </div>
                                            {/* Level selector: hiện khi task chưa có maintenanceLevel */}
                                            {!modalTask?.maintenanceLevel && (
                                                <select
                                                    value={completeModalLevel}
                                                    onChange={e => handleCompleteModalLevelChange(e.target.value as '1 tháng' | '6 tháng' | '12 tháng' | '')}
                                                    className="text-xs border border-blue-300 rounded px-2 py-1.5 outline-none bg-white font-medium"
                                                >
                                                    <option value="">-- Chọn cấp bảo dưỡng --</option>
                                                    <option value="1 tháng">1 tháng (3 hạng mục)</option>
                                                    <option value="6 tháng">6 tháng (12 hạng mục)</option>
                                                    <option value="12 tháng">12 tháng (14 hạng mục)</option>
                                                </select>
                                            )}
                                        </div>

                                        {completeModalChecklist.length === 0 ? (
                                            <div className="text-center py-6 text-blue-400 text-sm font-medium">
                                                Vui lòng chọn cấp bảo dưỡng để hiển thị checklist
                                            </div>
                                        ) : (
                                            <>
                                                {/* Nút thao tác nhanh */}
                                                <div className="flex gap-2 mb-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setCompleteModalChecklist(prev => prev.map(item => ({ ...item, kiemTra: true, tinhTrang: 'Đạt' })))}
                                                        className="flex-1 px-3 py-2 bg-green-600 text-white text-xs font-bold rounded-lg shadow hover:bg-green-700 active:scale-95 transition-all"
                                                    >
                                                        ✓ Tất cả Đạt
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setCompleteModalChecklist(prev => prev.map(item => ({ ...item, kiemTra: false, tinhTrang: '', ghiChu: '' })))}
                                                        className="px-3 py-2 bg-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-300 active:scale-95 transition-all"
                                                    >
                                                        ↺ Xóa hết
                                                    </button>
                                                </div>

                                                <div className="text-center text-[10px] text-blue-500 font-medium py-1">
                                                    ↕ Cuộn lên/xuống để xem tất cả {completeModalChecklist.length} hạng mục
                                                </div>
                                                <div
                                                    className="space-y-2 max-h-[45vh] overflow-y-scroll rounded-lg border border-blue-100 p-1"
                                                    style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin', scrollbarColor: '#3b82f6 #e2e8f0' }}
                                                >
                                                    {completeModalChecklist.map((item, idx) => {
                                                        const needNote = item.tinhTrang === 'Không đạt' || item.tinhTrang === 'N/A';
                                                        const missing = needNote && !item.ghiChu.trim();
                                                        return (
                                                            <div key={idx} className={clsx(
                                                                "rounded-lg border p-3",
                                                                missing ? "border-red-300 bg-red-50/30" : "border-blue-100 bg-white"
                                                            )}>
                                                                <div className="text-xs font-bold text-slate-600 mb-2 leading-snug">
                                                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-700 text-white text-[10px] mr-1.5 shrink-0">{item.stt}</span>
                                                                    {item.noiDung}
                                                                </div>
                                                                <div className="flex gap-2 items-center flex-wrap">
                                                                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={item.kiemTra}
                                                                            onChange={e => updateModalChecklistItem(idx, 'kiemTra', e.target.checked)}
                                                                            className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                                                                        />
                                                                        Đã kiểm tra
                                                                    </label>
                                                                    <select
                                                                        value={item.tinhTrang}
                                                                        onChange={e => updateModalChecklistItem(idx, 'tinhTrang', e.target.value)}
                                                                        className={clsx(
                                                                            "flex-1 text-xs border rounded px-2 py-2 outline-none bg-white min-w-[110px]",
                                                                            (item.tinhTrang === 'Không đạt' || item.tinhTrang === 'N/A') ? "border-red-400 text-red-700 font-bold"
                                                                                : item.tinhTrang === 'Đạt' ? "border-green-400 text-green-700 font-bold"
                                                                                    : "border-slate-300"
                                                                        )}
                                                                    >
                                                                        <option value="">-- Tình trạng --</option>
                                                                        <option value="Đạt">Đạt</option>
                                                                        <option value="Không đạt">Không đạt</option>
                                                                        <option value="N/A">N/A</option>
                                                                    </select>
                                                                </div>
                                                                {(needNote || item.ghiChu) && (
                                                                    <input
                                                                        type="text"
                                                                        value={item.ghiChu}
                                                                        onChange={e => updateModalChecklistItem(idx, 'ghiChu', e.target.value)}
                                                                        placeholder={missing ? '⚠ Bắt buộc nhập ghi chú...' : 'Ghi chú...'}
                                                                        className={clsx(
                                                                            "w-full mt-2 text-xs border rounded px-2 py-2 outline-none",
                                                                            missing ? "border-red-500 bg-red-50 placeholder-red-400 animate-pulse"
                                                                                : "border-green-300 bg-green-50"
                                                                        )}
                                                                    />
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <div className="mt-1.5 text-[10px] text-blue-600 font-medium">
                                                    ✅ Đã kiểm tra: {completeModalChecklist.filter(i => i.kiemTra).length}/{completeModalChecklist.length} hạng mục
                                                    &nbsp;|&nbsp; Đạt: {completeModalChecklist.filter(i => i.tinhTrang === 'Đạt').length}
                                                    &nbsp;|&nbsp; Không đạt: {completeModalChecklist.filter(i => i.tinhTrang === 'Không đạt').length}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })()}

                            <div className="pt-2">
                                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <Camera size={18} className="text-green-600" /> Ảnh kết quả (Sau khi bảo trì)
                                </label>
                                <div className="flex items-center gap-4">
                                    {!afterImagePreview ? (
                                        <label className="flex flex-col items-center justify-center w-28 h-28 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:bg-green-50 transition group">
                                            <Camera size={26} className="text-slate-400 group-hover:text-green-600 mb-1" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Chụp ảnh</span>
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                accept="image/*" 
                                                capture="environment"
                                                onChange={handleAfterImageChange}
                                            />
                                        </label>
                                    ) : (
                                        <div className="relative w-28 h-28 rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                                            <img src={afterImagePreview} alt="After" className="w-full h-full object-cover" />
                                            <button onClick={removeAfterImage} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-md">
                                                <X size={12} />
                                            </button>
                                        </div>
                                    )}
                                    <p className="text-[10px] text-slate-500 italic flex-1">
                                        Chụp ảnh bằng chứng thiết bị đã được bảo trì sạch sẽ, đúng kỹ thuật.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mt-6">
                            {/* Nút xuất Word — chỉ hiện với task VDGS có checklist */}
                            {(() => {
                                const task = tasks.find(t => t.id === selectedTaskId);
                                const isVdgs = task?.systemName?.toUpperCase().includes('VDGS');
                                if (!isVdgs) return <span />;
                                const hasLevel = !!(task?.maintenanceLevel || exportLevel);
                                return (
                                    <div className="flex items-center gap-2">
                                        {!task?.maintenanceLevel && (
                                            <select
                                                value={exportLevel}
                                                onChange={e => setExportLevel(e.target.value as '1 tháng' | '6 tháng' | '12 tháng' | '')}
                                                className="text-xs border border-slate-300 rounded px-2 py-1.5 outline-none bg-white"
                                            >
                                                <option value="">-- Chọn cấp BD --</option>
                                                <option value="1 tháng">1 tháng</option>
                                                <option value="6 tháng">6 tháng</option>
                                                <option value="12 tháng">12 tháng</option>
                                            </select>
                                        )}
                                        <button
                                            onClick={() => {
                                                if (!task) return;
                                                const lv = (task.maintenanceLevel || exportLevel) as string;
                                                const d = new Date(completedAtInput);
                                                const pad = (n: number) => n.toString().padStart(2, '0');
                                                const cdStr = completedAtInput
                                                    ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
                                                    : '';
                                                exportVdgsWordReport(task, lv, cdStr, remainingIssues);
                                            }}
                                            className={`px-3 py-1.5 font-bold rounded shadow flex items-center gap-1.5 text-sm text-white ${hasLevel ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300 cursor-not-allowed'}`}
                                            disabled={isCompleting || !hasLevel}
                                        >
                                            <FileDown size={15} /> Xuất Word
                                        </button>
                                    </div>
                                );
                            })()}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsCompleteModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded"
                                    disabled={isCompleting}
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    onClick={handleConfirmComplete}
                                    className="px-6 py-2 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700 flex items-center gap-2"
                                    disabled={isCompleting}
                                >
                                    {isCompleting ? <Loader2 className="animate-spin" size={18} /> : 'Xác nhận Hoàn thành'}
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            )}
            {/* Image Viewer Overlay */}
            {viewingImage && (
                <div 
                    className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setViewingImage(null)}
                >
                    <button className="absolute top-6 right-6 text-white bg-white/10 p-2 rounded-full hover:bg-white/20 transition">
                        <X size={32} />
                    </button>
                    <img 
                        src={viewingImage} 
                        alt="Full view" 
                        className="max-w-full max-h-full object-contain rounded shadow-2xl animate-scale-in"
                    />
                </div>
            )}
        </div >
    );
}
