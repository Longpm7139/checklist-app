'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Calendar, Save, RefreshCw,
    ChevronLeft, ChevronRight, Plus, X, Repeat, Edit3, Check
} from 'lucide-react';
import { useUser } from '@/providers/UserProvider';
import { getUsers, saveDuty, subscribeToDuties, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import clsx from 'clsx';

// ──────────────────────────────────────────
// Constants
// ──────────────────────────────────────────
const ALL_CATEGORY_IDS = [
    'CAT1', 'CAT2', 'CAT3', 'CAT4', 'CAT5',
    'CAT6', 'CAT7', 'CAT8', 'CAT9', 'CAT10', 'CAT11'
];

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────
interface RotationConfig {
    startDate: string;          // YYYY-MM-DD: date pair[0] starts
    pairs: { userCodes: string[] }[];
}

// ──────────────────────────────────────────
// Calendar helpers
// ──────────────────────────────────────────
function getDaysInMonth(year: number, month: number): Date[] {
    const days: Date[] = [];
    const d = new Date(year, month, 1);
    while (d.getMonth() === month) {
        days.push(new Date(d));
        d.setDate(d.getDate() + 1);
    }
    return days;
}

function getCalendarWeeks(year: number, month: number): (Date | null)[][] {
    const days = getDaysInMonth(year, month);
    const weeks: (Date | null)[][] = [];
    // Mon=0 … Sun=6
    let dow = days[0].getDay();
    dow = dow === 0 ? 6 : dow - 1;
    let week: (Date | null)[] = Array(dow).fill(null);
    for (const day of days) {
        week.push(day);
        if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length > 0) {
        while (week.length < 7) week.push(null);
        weeks.push(week);
    }
    return weeks;
}

function getPairIndex(dateStr: string, cfg: RotationConfig): number {
    if (!cfg.pairs.length || !cfg.startDate) return -1;
    const start = new Date(cfg.startDate + 'T00:00:00');
    const target = new Date(dateStr + 'T00:00:00');
    const diff = Math.floor((target.getTime() - start.getTime()) / 86400000);
    if (diff < 0) return -1;
    return diff % cfg.pairs.length;
}

function getLocalISODate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────
export default function DutiesPage() {
    const router = useRouter();
    const { user: currentUser } = useUser();

    const [tab, setTab] = useState<'monthly' | 'rotation'>('monthly');
    const [users, setUsers] = useState<any[]>([]);
    const [allDuties, setAllDuties] = useState<any[]>([]);

    // Rotation config
    const [rotationConfig, setRotationConfig] = useState<RotationConfig>({
        startDate: getLocalISODate(new Date()),
        pairs: [{ userCodes: ['', ''] }, { userCodes: ['', ''] }],
    });
    const [isSavingRotation, setIsSavingRotation] = useState(false);

    // Monthly view
    const now = new Date();
    const [viewYear, setViewYear] = useState(now.getFullYear());
    const [viewMonth, setViewMonth] = useState(now.getMonth());

    // monthAssignments: date -> [code1, code2]
    const [monthAssignments, setMonthAssignments] = useState<Record<string, string[]>>({});
    const [isSavingMonth, setIsSavingMonth] = useState(false);

    // Edit modal
    const [editDay, setEditDay] = useState<string | null>(null);
    const [editCodes, setEditCodes] = useState<string[]>(['', '']);

    // ── Auth ──
    useEffect(() => {
        const role = currentUser?.role ?? JSON.parse(localStorage.getItem('checklist_user') || '{}').role;
        if (role !== 'ADMIN') router.push('/');
    }, [currentUser, router]);

    // ── Fetch data ──
    useEffect(() => {
        const fetchData = async () => {
            setUsers(await getUsers());
            const snap = await getDoc(doc(db, 'duty_config', 'rotation'));
            if (snap.exists()) setRotationConfig(snap.data() as RotationConfig);
        };
        fetchData();
        const unsub = subscribeToDuties((data) => setAllDuties(data));
        return () => unsub();
    }, []);

    // ── Sync allDuties → monthAssignments when month changes ──
    useEffect(() => {
        const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
        const map: Record<string, string[]> = {};
        allDuties.forEach(duty => {
            if (duty.date?.startsWith(prefix)) {
                map[duty.date] = (duty.assignments || []).map((a: any) => a.userCode).filter(Boolean);
            }
        });
        setMonthAssignments(map);
    }, [allDuties, viewYear, viewMonth]);

    const getUserName = (code: string) => users.find(u => u.code === code)?.name ?? code;

    // ── Generate full month from rotation ──
    const handleGenerate = () => {
        if (!rotationConfig.pairs.length || !rotationConfig.startDate) {
            alert('Vui lòng thiết lập khuôn lịch xoay vòng trước!');
            setTab('rotation');
            return;
        }
        const map: Record<string, string[]> = {};
        getDaysInMonth(viewYear, viewMonth).forEach(d => {
            const dateStr = getLocalISODate(d);
            const idx = getPairIndex(dateStr, rotationConfig);
            if (idx >= 0) map[dateStr] = (rotationConfig.pairs[idx].userCodes || []).filter(Boolean);
        });
        setMonthAssignments(prev => ({ ...prev, ...map }));
        alert(`Đã tạo lịch tháng ${viewMonth + 1}/${viewYear}!\nKiểm tra lại rồi nhấn "Lưu lịch tháng".`);
    };

    // ── Save whole month ──
    const handleSaveMonth = async () => {
        setIsSavingMonth(true);
        try {
            for (const [date, codes] of Object.entries(monthAssignments)) {
                const valid = codes.filter(Boolean);
                if (!valid.length) continue;
                await saveDuty(date, valid.map(code => ({
                    userCode: code,
                    userName: getUserName(code),
                    categoryIds: ALL_CATEGORY_IDS,
                })));
            }
            alert(`✅ Đã lưu lịch tháng ${viewMonth + 1}/${viewYear}!`);
        } catch (e) {
            alert('Lỗi khi lưu lịch!');
        } finally {
            setIsSavingMonth(false);
        }
    };

    // ── Save rotation config ──
    const handleSaveRotation = async () => {
        setIsSavingRotation(true);
        try {
            await setDoc(doc(db, 'duty_config', 'rotation'), rotationConfig);
            alert('Đã lưu khuôn lịch xoay vòng!');
        } catch {
            alert('Lỗi khi lưu!');
        } finally {
            setIsSavingRotation(false);
        }
    };

    // ── Calendar nav ──
    const prevMonth = () => viewMonth === 0 ? (setViewYear(y => y - 1), setViewMonth(11)) : setViewMonth(m => m - 1);
    const nextMonth = () => viewMonth === 11 ? (setViewYear(y => y + 1), setViewMonth(0)) : setViewMonth(m => m + 1);

    const weeks = getCalendarWeeks(viewYear, viewMonth);
    const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
    const todayStr = getLocalISODate(now);

    // ── Pair label helper ──
    const getPairLabel = (dateStr: string) => {
        const idx = getPairIndex(dateStr, rotationConfig);
        return idx >= 0 ? `Ca ${idx + 1}` : '';
    };

    return (
        <div className="min-h-screen bg-slate-50 p-3 md:p-6 text-slate-900">
            <div className="max-w-5xl mx-auto">

                {/* Header */}
                <header className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.push('/')} className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-100">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Phân Công Trực</h1>
                        <p className="text-slate-500 text-sm">Lịch xoay vòng theo tháng • 11 hệ thống tự động</p>
                    </div>
                </header>

                {/* Tabs */}
                <div className="flex gap-1 mb-6 bg-slate-200 p-1 rounded-xl w-fit">
                    {[
                        { key: 'monthly', label: 'Lịch Tháng', icon: Calendar },
                        { key: 'rotation', label: 'Khuôn Xoay Vòng', icon: Repeat },
                    ].map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key as any)}
                            className={clsx(
                                'px-4 py-2 text-sm font-semibold rounded-lg transition flex items-center gap-1.5',
                                tab === key ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            )}
                        >
                            <Icon size={14} />{label}
                        </button>
                    ))}
                </div>

                {/* ══════════════ TAB: MONTHLY ══════════════ */}
                {tab === 'monthly' && (
                    <div>
                        {/* Controls */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-2">
                                <button onClick={prevMonth} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"><ChevronLeft size={18} /></button>
                                <h2 className="text-xl font-bold capitalize min-w-[180px] text-center">{monthLabel}</h2>
                                <button onClick={nextMonth} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"><ChevronRight size={18} /></button>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleGenerate}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition"
                                >
                                    <RefreshCw size={14} />Tạo lịch tự động
                                </button>
                                <button
                                    onClick={handleSaveMonth}
                                    disabled={isSavingMonth}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition disabled:opacity-50"
                                >
                                    <Save size={14} />{isSavingMonth ? 'Đang lưu...' : 'Lưu lịch tháng'}
                                </button>
                            </div>
                        </div>

                        {/* Calendar grid */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <div className="min-w-[600px]">
                                    {/* Day headers */}
                                    <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200">
                                        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, i) => (
                                            <div key={d} className={clsx('text-center text-xs font-bold py-2', i === 6 ? 'text-red-500' : 'text-slate-500')}>{d}</div>
                                        ))}
                                    </div>

                                    {weeks.map((week, wi) => (
                                        <div key={wi} className="grid grid-cols-7 border-b border-slate-100 last:border-b-0">
                                            {week.map((day, di) => {
                                                if (!day) return (
                                                    <div key={di} className="min-h-[88px] bg-slate-50/60 border-r border-slate-100 last:border-r-0" />
                                                );
                                                const dateStr = getLocalISODate(day);
                                                const isToday = dateStr === todayStr;
                                                const isSun = di === 6;
                                                const assignees = monthAssignments[dateStr] || [];
                                                const pairLabel = getPairLabel(dateStr);

                                                return (
                                                    <div
                                                        key={di}
                                                        className={clsx(
                                                            'min-h-[88px] p-1.5 border-r border-slate-100 last:border-r-0 cursor-pointer transition relative group',
                                                            isToday ? 'bg-blue-50' : isSun ? 'bg-red-50/40' : 'hover:bg-slate-50'
                                                        )}
                                                        onClick={() => {
                                                            setEditDay(dateStr);
                                                            const cur = monthAssignments[dateStr] || [];
                                                            setEditCodes([cur[0] || '', cur[1] || '']);
                                                        }}
                                                    >
                                                        {/* Day number */}
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className={clsx(
                                                                'text-xs font-bold inline-flex items-center justify-center w-5 h-5 rounded-full',
                                                                isToday ? 'bg-blue-600 text-white' : isSun ? 'text-red-500' : 'text-slate-600'
                                                            )}>{day.getDate()}</span>
                                                            {pairLabel && (
                                                                <span className="text-[9px] text-slate-400 font-medium">{pairLabel}</span>
                                                            )}
                                                        </div>
                                                        {/* Staff names */}
                                                        <div className="space-y-0.5">
                                                            {assignees.length > 0 ? assignees.slice(0, 2).map((code, i) => (
                                                                <div key={i} className={clsx(
                                                                    'text-[10px] px-1.5 py-0.5 rounded font-semibold truncate',
                                                                    i === 0 ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                                                )}>
                                                                    {getUserName(code)}
                                                                </div>
                                                            )) : (
                                                                <div className="text-[9px] text-slate-300 italic mt-1">Chưa phân công</div>
                                                            )}
                                                        </div>
                                                        <Edit3 size={8} className="absolute bottom-1 right-1 text-slate-200 group-hover:text-slate-400 transition" />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-slate-400 mt-2 text-center">
                            Nhấn vào ngày bất kỳ để điều chỉnh nhân viên trực (khi có người nghỉ/đổi ca)
                        </p>
                    </div>
                )}

                {/* ══════════════ TAB: ROTATION ══════════════ */}
                {tab === 'rotation' && (
                    <div className="max-w-md mx-auto space-y-5">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">

                            {/* Start date */}
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-400 block mb-1">
                                    Ngày bắt đầu — Ca 1 trực
                                </label>
                                <input
                                    type="date"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm"
                                    value={rotationConfig.startDate}
                                    onChange={e => setRotationConfig(prev => ({ ...prev, startDate: e.target.value }))}
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Từ ngày này, Ca 1 trực. Ca 2 trực ngày tiếp theo, v.v...
                                </p>
                            </div>

                            {/* Pairs list */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-xs font-bold uppercase text-slate-400">Danh sách các ca</label>
                                    <button
                                        onClick={() => setRotationConfig(prev => ({
                                            ...prev,
                                            pairs: [...prev.pairs, { userCodes: ['', ''] }]
                                        }))}
                                        className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline"
                                    >
                                        <Plus size={12} />Thêm ca
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {rotationConfig.pairs.map((pair, pIdx) => (
                                        <div key={pIdx} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
                                                    Ca {pIdx + 1}
                                                </span>
                                                {rotationConfig.pairs.length > 1 && (
                                                    <button
                                                        onClick={() => setRotationConfig(prev => ({
                                                            ...prev, pairs: prev.pairs.filter((_, i) => i !== pIdx)
                                                        }))}
                                                        className="text-red-400 hover:text-red-600"
                                                    ><X size={14} /></button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {[0, 1].map(slot => (
                                                    <select
                                                        key={slot}
                                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white text-sm outline-none focus:border-blue-500"
                                                        value={pair.userCodes[slot] || ''}
                                                        onChange={e => {
                                                            const newPairs = rotationConfig.pairs.map((p, i) => {
                                                                if (i !== pIdx) return p;
                                                                const codes = [...p.userCodes];
                                                                codes[slot] = e.target.value;
                                                                return { ...p, userCodes: codes };
                                                            });
                                                            setRotationConfig(prev => ({ ...prev, pairs: newPairs }));
                                                        }}
                                                    >
                                                        <option value="">-- NV {slot + 1} --</option>
                                                        {users.map(u => (
                                                            <option key={u.id} value={u.code}>{u.name}</option>
                                                        ))}
                                                    </select>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleSaveRotation}
                                disabled={isSavingRotation}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
                            >
                                <Save size={16} />{isSavingRotation ? 'Đang lưu...' : 'Lưu khuôn lịch'}
                            </button>
                        </div>

                        {/* Instructions */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <p className="text-xs font-bold text-amber-700 mb-2">💡 Cách sử dụng:</p>
                            <ol className="text-xs text-amber-600 space-y-1 list-decimal list-inside">
                                <li>Chọn ngày bắt đầu Ca 1</li>
                                <li>Thiết lập các ca & chọn nhân viên → Lưu khuôn lịch</li>
                                <li>Sang tab "Lịch Tháng" → nhấn <strong>Tạo lịch tự động</strong></li>
                                <li>Nhấn vào ngày cụ thể để chỉnh (có người nghỉ, đổi ca...)</li>
                                <li>Nhấn <strong>Lưu lịch tháng</strong></li>
                            </ol>
                        </div>
                    </div>
                )}
            </div>

            {/* ══════════════ EDIT DAY MODAL ══════════════ */}
            {editDay && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditDay(null)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-lg mb-0.5">Phân công ngày</h3>
                        <p className="text-sm text-slate-500 mb-5">
                            {new Date(editDay + 'T00:00:00').toLocaleDateString('vi-VN', {
                                weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
                            })}
                            {getPairLabel(editDay) && (
                                <span className="ml-2 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{getPairLabel(editDay)}</span>
                            )}
                        </p>

                        <div className="space-y-3 mb-4">
                            {[0, 1].map(slot => (
                                <div key={slot}>
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                                        <span className={clsx('inline-block w-2 h-2 rounded-full mr-1.5 mb-0.5', slot === 0 ? 'bg-blue-500' : 'bg-emerald-500')} />
                                        Nhân viên {slot + 1}
                                    </label>
                                    <select
                                        className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-sm outline-none focus:border-blue-500"
                                        value={editCodes[slot] || ''}
                                        onChange={e => {
                                            const next = [...editCodes];
                                            next[slot] = e.target.value;
                                            setEditCodes(next);
                                        }}
                                    >
                                        <option value="">-- Chọn nhân viên --</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.code}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>

                        <p className="text-[11px] text-slate-400 mb-5 bg-slate-50 p-2 rounded-lg">
                            ✅ Tất cả 11 hệ thống sẽ tự động gắn vào ca trực này khi lưu.
                        </p>

                        <div className="flex gap-2">
                            <button onClick={() => setEditDay(null)} className="flex-1 py-2.5 border border-slate-300 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50">
                                Hủy
                            </button>
                            <button
                                onClick={() => {
                                    if (editDay) {
                                        setMonthAssignments(prev => ({ ...prev, [editDay]: editCodes }));
                                    }
                                    setEditDay(null);
                                }}
                                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-1"
                            >
                                <Check size={14} />Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
