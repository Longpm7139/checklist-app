'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Wrench, Calendar, CheckSquare, Plus, User as UserIcon, Clock, AlertTriangle, Camera, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useUser } from '@/providers/UserProvider';
import { IMESafeInput, IMESafeTextArea } from '@/components/IMESafeInput';
import { MaintenanceTask, User } from '@/lib/types';
import clsx from 'clsx';
import { subscribeToMaintenance, saveMaintenance, uploadImage } from '@/lib/firebase';

export default function MaintenancePage() {
    const router = useRouter();
    const { user: currentUser } = useUser();
    const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
    const [viewMode, setViewMode] = useState<'LIST' | 'CREATE'>('LIST');
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);

    // Form State
    const [title, setTitle] = useState('');
    const [taskType, setTaskType] = useState<'MAINTENANCE' | 'PROJECT'>('MAINTENANCE');
    const [desc, setDesc] = useState('');
    const [deadline, setDeadline] = useState('');
    const [beforeImageFile, setBeforeImageFile] = useState<File | null>(null);
    const [beforeImagePreview, setBeforeImagePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

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
                    return parseDate(b.createdAt) - parseDate(a.createdAt);
                } catch (e) {
                    return 0;
                }
            });
            setTasks(sorted);
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

        return () => unsub();
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

    const handleCreate = async () => {
        if (!title || (selectedUserCodes.length === 0 && selectedSupervisorCodes.length === 0) || !deadline) {
            alert("Vui lòng nhập Tên, chọn ít nhất 1 Người (Thực hiện hoặc Giám sát) và Hạn chót!");
            return;
        }

        // Get names for selected codes
        const selectedNames = selectedUserCodes.map(code =>
            availableUsers.find(u => u.code === code)?.name || code
        );

        const selectedSupervisorNames = selectedSupervisorCodes.map(code =>
            availableUsers.find(u => u.code === code)?.name || code
        );

        setIsUploading(true);
        let uploadedBeforeUrl = '';

        try {
            if (beforeImageFile) {
                const path = `maintenance/before/${Date.now()}_${beforeImageFile.name}`;
                uploadedBeforeUrl = await uploadImage(beforeImageFile, path);
            }

            const newTask: MaintenanceTask = {
                id: Date.now().toString(),
                title,
                type: taskType,
                description: desc,
                deadline,
                assignees: selectedUserCodes, 
                assigneeNames: selectedNames, 
                supervisors: selectedSupervisorCodes,
                supervisorNames: selectedSupervisorNames,
                assignedByName: currentUser?.name || 'Admin',
                status: 'PENDING',
                createdAt: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
                beforeImageUrl: uploadedBeforeUrl
            };

            // Save to Firebase
            await saveMaintenance(newTask);

            // Reset
            setTitle('');
            setTaskType('MAINTENANCE');
            setDesc('');
            setDeadline('');
            setSelectedUserCodes([]);
            setSelectedSupervisorCodes([]);
            setBeforeImageFile(null);
            setBeforeImagePreview(null);
            setViewMode('LIST');
            alert("Đã giao việc bảo trì thành công!");
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
                    completedAt: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
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
                            onClick={() => setViewMode('CREATE')}
                            className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 flex items-center gap-2 font-bold"
                        >
                            <Plus size={20} /> Lập Kế Hoạch
                        </button>
                    )}
                </header>

                {viewMode === 'CREATE' && (
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 mb-6">
                        <h2 className="font-bold text-lg mb-4 text-slate-800 border-b pb-2">Giao việc Bảo trì Mới</h2>
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
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <button
                                    onClick={() => setViewMode('LIST')}
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
                                            <Plus size={20} /> Giao Việc
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {tasks.length === 0 && (
                        <div className="text-center p-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                            Chưa có kế hoạch bảo trì nào.
                        </div>
                    )}

                    {tasks.map(task => (
                        <div key={task.id} className={clsx(
                            "bg-white rounded-xl shadow-sm border transition relative overflow-hidden group",
                            task.status === 'COMPLETED' ? "border-green-100" : "border-slate-200 hover:border-blue-300"
                        )}>
                            <div className="p-4 md:p-5">
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <h3 className="font-bold text-lg text-slate-800 leading-tight">{task.title}</h3>
                                            {task.status === 'COMPLETED' ? (
                                                <span className="bg-green-50 text-green-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-green-200 uppercase tracking-tight shadow-sm">ĐÃ XONG</span>
                                            ) : (
                                                <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-blue-200 uppercase tracking-tight">CẦN LÀM</span>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="text-[11px] text-slate-500 font-medium flex items-start gap-2">
                                                <UserIcon size={14} className="mt-0.5 text-blue-500 shrink-0" />
                                                <div className="leading-snug">
                                                    Giao cho: <span className="text-slate-700 font-bold">{
                                                        [...(task.assigneeNames || []), ...(task.supervisorNames || [])]
                                                            .filter((v, i, a) => a.indexOf(v) === i)
                                                            .join(', ') || 'Chưa giao'
                                                    }</span>
                                                </div>
                                            </div>
                                            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2">
                                                <Calendar size={14} className="text-red-500 shrink-0" />
                                                Hạn chót: <span className="text-red-600 font-bold">{task.deadline}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {task.status === 'PENDING' && (
                                        (task.assignees?.includes(currentUser?.code || '') || task.supervisors?.includes(currentUser?.code || '') || currentUser?.role === 'ADMIN')
                                    ) && (
                                            <button
                                                onClick={() => openCompleteModal(task.id)}
                                                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 text-white text-sm font-black rounded-lg shadow-md hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                                            >
                                                <CheckSquare size={16} /> Báo cáo Xong
                                            </button>
                                        )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-slate-50/80 p-3 rounded-lg text-slate-700 text-sm border border-slate-100 italic leading-relaxed">
                                        <span className="font-black block text-[10px] text-slate-400 uppercase mb-1 tracking-widest">Nội dung kế hoạch:</span>
                                        {task.description || 'Không có mô tả chi tiết.'}
                                    </div>
                                    {task.beforeImageUrl && (
                                        <div className="relative aspect-[16/6] rounded-lg overflow-hidden border border-slate-300 shadow-sm cursor-pointer hover:opacity-90 group"
                                             onClick={() => setViewingImage(task.beforeImageUrl || null)}>
                                            <img src={task.beforeImageUrl} alt="Trước bảo trì" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                                <Camera size={20} className="text-white" />
                                            </div>
                                            <div className="absolute top-1 left-2 text-[10px] text-white font-bold bg-blue-600 px-2 py-0.5 rounded shadow">ẢNH TRƯỚC</div>
                                        </div>
                                    )}
                                </div>

                                {task.status === 'COMPLETED' && (
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <div className="bg-green-50/50 p-3 rounded-lg border border-green-100/50">
                                            <div className="flex items-center gap-2 text-green-800 font-black text-[10px] uppercase tracking-wider mb-2">
                                                <Clock size={14} /> Hoàn thành lúc {task.completedAt}
                                            </div>
                                            <div className="text-sm text-slate-700 font-medium italic mb-3 leading-relaxed">
                                                "Kết quả: {task.completedNote}"
                                            </div>
                                            {task.remainingIssues && (
                                                <div className="p-3 bg-white border border-yellow-200 rounded-lg shadow-sm mb-3">
                                                    <div className="flex items-center gap-1.5 text-yellow-700 font-black text-[10px] uppercase mb-1.5">
                                                        <AlertTriangle size={12} /> Tồn tại sau bảo dưỡng
                                                    </div>
                                                    <div className="text-xs text-slate-600 font-medium">
                                                        {task.remainingIssues}
                                                    </div>
                                                </div>
                                            )}

                                            {task.afterImageUrl && (
                                                <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-green-200 shadow-md cursor-pointer hover:opacity-90 group"
                                                     onClick={() => setViewingImage(task.afterImageUrl || null)}>
                                                    <img src={task.afterImageUrl} alt="Sau bảo trì" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-x-0 bottom-0 bg-black/40 text-white p-2 text-center text-xs font-bold flex items-center justify-center gap-2">
                                                        <Camera size={14} /> XEM ẢNH KẾT QUẢ (SAU BẢO TRÌ)
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
            </div>

            {/* Complete Task Modal */}
            {isCompleteModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Báo cáo Hoàn thành</h3>

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
