'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Save, UserCheck, Folder, X, Plus, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { useUser } from '@/providers/UserProvider';
import { getUsers, saveDuty, subscribeToDuties } from '@/lib/firebase';
import clsx from 'clsx';

const DEFAULT_CATEGORIES = [
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

export default function DutiesPage() {
    const router = useRouter();
    const { user: currentUser } = useUser();

    const [users, setUsers] = useState<any[]>([]);
    const [allDuties, setAllDuties] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD

    const [assignments, setAssignments] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [openSelectIdx, setOpenSelectIdx] = useState<number | null>(null);

    // 1. Protect and Fetch Data
    useEffect(() => {
        if (currentUser?.role !== 'ADMIN') {
            const savedUser = localStorage.getItem('checklist_user');
            if (savedUser) {
                const u = JSON.parse(savedUser);
                if (u.role !== 'ADMIN') router.push('/');
            } else {
                router.push('/');
            }
        }

        const fetchData = async () => {
            const usersData = await getUsers();
            setUsers(usersData);

            const unsubDuties = subscribeToDuties((data) => setAllDuties(data));
            return () => unsubDuties();
        };
        fetchData();
    }, [currentUser, router]);

    // 2. Filter assignments for selected date
    useEffect(() => {
        const dutyForDate = allDuties.find(d => d.date === selectedDate);
        if (dutyForDate) {
            setAssignments(dutyForDate.assignments || []);
        } else {
            setAssignments([
                { userCode: '', categoryIds: [] },
                { userCode: '', categoryIds: [] }
            ]);
        }
    }, [selectedDate, allDuties]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const validAssignments = assignments
                .filter(a => a.userCode && a.categoryIds && a.categoryIds.length > 0);

            await saveDuty(selectedDate, validAssignments);
            alert("Đã lưu phân công trực!");
        } catch (e) {
            console.error(e);
            alert("Lỗi khi lưu phân công");
        } finally {
            setIsSaving(false);
        }
    };

    const updateAssignment = (idx: number, field: string, value: any) => {
        const next = [...assignments];
        next[idx] = { ...next[idx], [field]: value };

        if (field === 'userCode') {
            const userObj = users.find(u => u.code === value);
            next[idx].userName = userObj?.name || '';
        }

        setAssignments(next);
    };

    const toggleCategory = (idx: number, catId: string) => {
        const next = [...assignments];
        const currentIds = next[idx].categoryIds || [];
        if (currentIds.includes(catId)) {
            next[idx].categoryIds = currentIds.filter((id: string) => id !== catId);
        } else {
            next[idx].categoryIds = [...currentIds, catId];
        }
        setAssignments(next);
    };

    const addAssignment = () => {
        setAssignments([...assignments, { userCode: '', categoryIds: [] }]);
    };

    const removeAssignment = (idx: number) => {
        setAssignments(assignments.filter((_, i) => i !== idx));
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900">
            <div className="max-w-4xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/')} className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-100">
                            <ArrowLeft size={20} className="text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold uppercase text-slate-800">Phân Công Trực</h1>
                            <p className="text-slate-500 text-sm">Giao nhóm hệ thống kiểm tra cho đội trực</p>
                        </div>
                    </div>
                </header>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Date Selection */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Calendar size={20} className="text-blue-600" /> Chọn ngày trực
                        </h2>
                        <input
                            type="date"
                            className="w-full p-3 border border-slate-300 rounded-lg text-lg font-bold outline-none focus:border-blue-500"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>

                    {/* Assignment Form */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[400px]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <UserCheck size={20} className="text-green-600" /> Nhân viên trực ({selectedDate})
                            </h2>
                            <button
                                onClick={addAssignment}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title="Thêm người trực"
                            >
                                <Plus size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {assignments.map((as, idx) => (
                                <div key={idx} className="p-4 border border-slate-200 rounded-xl bg-slate-50 relative group">
                                    {assignments.length > 1 && (
                                        <button
                                            onClick={() => removeAssignment(idx)}
                                            className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 border border-red-200 opacity-0 group-hover:opacity-100 transition shadow-sm z-10"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Nhân viên trực</label>
                                            <select
                                                className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                                                value={as.userCode}
                                                onChange={(e) => updateAssignment(idx, 'userCode', e.target.value)}
                                            >
                                                <option value="">-- Chọn nhân viên --</option>
                                                {users.map(u => (
                                                    <option key={u.id} value={u.code}>{u.name} ({u.code})</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="relative">
                                            <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Các nhóm hệ thống</label>
                                            <button
                                                type="button"
                                                onClick={() => setOpenSelectIdx(openSelectIdx === idx ? null : idx)}
                                                className="w-full p-2 border border-slate-300 rounded-lg bg-white flex justify-between items-center text-sm"
                                            >
                                                <span className="truncate">
                                                    {as.categoryIds?.length > 0
                                                        ? `Đã chọn ${as.categoryIds.length} nhóm`
                                                        : '-- Chọn các nhóm hệ thống --'}
                                                </span>
                                                {openSelectIdx === idx ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            </button>

                                            {openSelectIdx === idx && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto p-1">
                                                    {DEFAULT_CATEGORIES.map(cat => {
                                                        const isSelected = as.categoryIds?.includes(cat.id);
                                                        return (
                                                            <button
                                                                key={cat.id}
                                                                type="button"
                                                                onClick={() => toggleCategory(idx, cat.id)}
                                                                className={clsx(
                                                                    "w-full flex items-center justify-between p-2 rounded text-left transition text-xs mb-1",
                                                                    isSelected ? "bg-blue-50 text-blue-700 font-bold" : "hover:bg-slate-50 text-slate-600"
                                                                )}
                                                            >
                                                                <span>{cat.name}</span>
                                                                {isSelected && <Check size={12} />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-1">
                                            {as.categoryIds?.map((cid: string) => {
                                                const cat = DEFAULT_CATEGORIES.find(c => c.id === cid);
                                                return (
                                                    <span key={cid} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">
                                                        {cat?.name.split('.')[0] || cid}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full mt-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
                        >
                            <Save size={20} />
                            {isSaving ? 'Đang lưu...' : 'Lưu Phân Công'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
