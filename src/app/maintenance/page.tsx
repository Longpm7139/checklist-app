'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Wrench, Calendar, CheckSquare, Plus, User as UserIcon, Clock, AlertTriangle, Camera, X, Image as ImageIcon, Loader2, Trash2, Edit2, PenTool, ChevronDown, ChevronUp, Search, Filter } from 'lucide-react';
import { useUser } from '@/providers/UserProvider';
import { IMESafeInput, IMESafeTextArea } from '@/components/IMESafeInput';
import { MaintenanceTask, User, SystemCheck, SystemCategory } from '@/lib/types';
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

    // Complete Modal State
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [completeNote, setCompleteNote] = useState('');
    const [remainingIssues, setRemainingIssues] = useState('');
    const [afterImageFile, setAfterImageFile] = useState<File | null>(null);
    const [afterImagePreview, setAfterImagePreview] = useState<string | null>(null);
    const [isCompleting, setIsCompleting] = useState(false);
    const [viewingImage, setViewingImage] = useState<string | null>(null);

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

    const toggleSystemSelection = (id: string) => {
        if (isEditMode) {
            setSelectedSystemIds([id]);
            return;
        }
        setSelectedSystemIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
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
                    systemName: system?.name || ''
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
        setSelectedTaskId(taskId);
        setCompleteNote('');
        setRemainingIssues('');
        setIsCompleteModalOpen(true);
    };

    const handleConfirmComplete = async () => {
        if (!selectedTaskId || !completeNote.trim()) {
            alert("Vui lòng nhập Ghi chú hoàn thành!");
            return;
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
                const updatedTask: MaintenanceTask = {
                    ...taskToUpdate,
                    status: 'COMPLETED',
                    completedAt: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false }),
                    completedNote: completeNote,
                    remainingIssues: remainingIssues,
                    afterImageUrl: uploadedAfterUrl
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
        setEditCompletedNote('');
        setEditRemainingIssues('');
        setEditAfterImagePreview(null);
        setEditAfterImageFile(null);
        setViewMode('LIST');
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
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
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
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
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

                        <div className="flex justify-end gap-3 mt-6">
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
