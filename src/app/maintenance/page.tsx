'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Wrench, Calendar, CheckSquare, Plus, User, Clock } from 'lucide-react';
import { useUser } from '@/providers/UserProvider';
import { MaintenanceTask } from '@/lib/types';
import clsx from 'clsx';
import { subscribeToMaintenance, saveMaintenance } from '@/lib/firebase';

export default function MaintenancePage() {
    const router = useRouter();
    const { user: currentUser } = useUser();
    const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
    const [viewMode, setViewMode] = useState<'LIST' | 'CREATE'>('LIST');
    const [availableUsers, setAvailableUsers] = useState<{ id: number, code: string, name: string }[]>([]);

    // Form State
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [deadline, setDeadline] = useState('');

    // New: Multi-select state
    const [selectedUserCodes, setSelectedUserCodes] = useState<string[]>([]);
    const [selectedSupervisorCodes, setSelectedSupervisorCodes] = useState<string[]>([]);

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

    const handleCreate = () => {
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

        const newTask: MaintenanceTask = {
            id: Date.now().toString(),
            title,
            description: desc,
            deadline,
            assignees: selectedUserCodes, // New field
            assigneeNames: selectedNames, // New field
            supervisors: selectedSupervisorCodes,
            supervisorNames: selectedSupervisorNames,
            assignedByName: currentUser?.name || 'Admin',
            status: 'PENDING',
            createdAt: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
        };

        // Save to Firebase
        saveMaintenance(newTask);

        // Reset
        setTitle('');
        setDesc('');
        setDeadline('');
        setSelectedUserCodes([]);
        setSelectedSupervisorCodes([]);
        setViewMode('LIST');
        alert("Đã giao việc bảo trì thành công!");
    };

    const handleComplete = (id: string) => {
        const note = prompt("Nhập ghi chú hoàn thành (kết quả bảo dưỡng):");
        if (!note) return;

        const taskToUpdate = tasks.find(t => t.id === id);
        if (taskToUpdate) {
            const updatedTask = {
                ...taskToUpdate,
                status: 'COMPLETED',
                completedAt: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
                completedNote: note
            };
            saveMaintenance(updatedTask);
            alert("Đã báo cáo hoàn thành bảo dưỡng!");
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
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên công việc *</label>
                                <input
                                    className="w-full border border-slate-300 rounded p-2 focus:border-blue-500 outline-none"
                                    placeholder="VD: Bảo dưỡng Cầu A1 tháng 10..."
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả chi tiết</label>
                                <textarea
                                    className="w-full border border-slate-300 rounded p-2 focus:border-blue-500 outline-none"
                                    rows={3}
                                    placeholder="Nội dung cần làm..."
                                    value={desc}
                                    onChange={e => setDesc(e.target.value)}
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
                                    <div className="mt-4 bg-yellow-50 p-3 rounded text-sm text-yellow-800 border border-yellow-200">
                                        <p className="font-bold mb-1">Cơ chế KPI:</p>
                                        Khi hoàn thành, <b>TẤT CẢ</b> nhân viên được chọn sẽ nhận được 10 điểm thưởng.
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <button
                                    onClick={() => setViewMode('LIST')}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleCreate}
                                    className="px-6 py-2 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700"
                                >
                                    Giao Việc
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
                            "bg-white rounded-xl shadow-sm border p-5 transition relative overflow-hidden",
                            task.status === 'COMPLETED' ? "border-green-200" : "border-slate-200 hover:border-blue-300"
                        )}>
                            {task.status === 'COMPLETED' && (
                                <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                                    ĐÃ HOÀN THÀNH
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">{task.title}</h3>
                                    <div className="text-sm text-slate-500 flex flex-col gap-1 mt-1">
                                        <div className="flex items-start gap-1">
                                            <User size={14} className="mt-0.5" />
                                            <div>
                                                Giao cho: <b className="text-slate-700">{
                                                    [...(task.assigneeNames || []), ...(task.supervisorNames || [])]
                                                        .filter((v, i, a) => a.indexOf(v) === i) // Unique
                                                        .join(', ') || 'Chưa giao'
                                                }</b>
                                            </div>
                                        </div>
                                        <span className="flex items-center gap-1"><Calendar size={14} /> Deadline: {task.deadline}</span>
                                    </div>
                                </div>
                                {task.status === 'PENDING' && (
                                    (task.assignees?.includes(currentUser?.code || '') || task.supervisors?.includes(currentUser?.code || '') || currentUser?.role === 'ADMIN')
                                ) && (
                                        <button
                                            onClick={() => handleComplete(task.id)}
                                            className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded shadow hover:bg-blue-700 flex items-center gap-2"
                                        >
                                            <CheckSquare size={16} /> Báo cáo Xong
                                        </button>
                                    )}
                            </div>

                            <div className="bg-slate-50 p-3 rounded text-slate-700 text-sm mb-3 border border-slate-100">
                                <span className="font-semibold block text-xs text-slate-400 uppercase mb-1">Nội dung:</span>
                                {task.description || 'Không có mô tả.'}
                            </div>

                            {task.status === 'COMPLETED' && (
                                <div className="mt-3 border-t border-slate-100 pt-3 bg-green-50 -mx-5 -mb-5 p-5">
                                    <div className="flex items-center gap-2 text-green-800 font-bold text-sm mb-1">
                                        <Clock size={16} /> Hoàn thành lúc: {task.completedAt}
                                    </div>
                                    <div className="text-sm text-slate-700 italic">
                                        "Kết quả: {task.completedNote}"
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div >
    );
}
