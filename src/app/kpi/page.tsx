'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart2, Medal, TrendingUp, UserCheck, Calendar, AlertTriangle, RotateCcw, Settings } from 'lucide-react';
import clsx from 'clsx';
import { useUser } from '@/providers/UserProvider';
import { isMatch, normalize } from '@/lib/utils';
import { subscribeToLogs, subscribeToHistory, subscribeToIncidents, subscribeToMaintenance, getUsers, resetKPIData, subscribeToDuties, subscribeToSystems } from '@/lib/firebase';
import { SystemCheck } from '@/lib/types';

interface KPIRow {
    userId: string;
    code: string;
    name: string;
    inspectionCount: number;
    fixCount: number;
    incidentCount: number;
    maintenanceCount: number;
    faultFoundCount: number;
    projectExecCount: number;
    projectSupCount: number;
    fastCheckCount: number;
    score: number;
}

const SCORING_RULES = {
    INSPECTION: 1,
    FAULT_FOUND: 3,
    FIX: 4,
    INCIDENT: 5,
    MAINTENANCE: 8,
    PROJECT_EXEC: 10,
    PROJECT_SUP: 6,
    NEGLIGENCE: -10
};

const RULE_LABELS: Record<string, string> = {
    INSPECTION: 'Kiểm tra',
    FAULT_FOUND: 'Tìm thấy lỗi',
    FIX: 'Khắc phục',
    INCIDENT: 'Xử lý sự cố',
    MAINTENANCE: 'Bảo trì',
    PROJECT_EXEC: 'Thi công',
    PROJECT_SUP: 'Giám sát',
    NEGLIGENCE: 'Kiểm tra ẩu'
};

export default function KPIPage() {
    const router = useRouter();
    const { user: currentUser } = useUser();
    const [stats, setStats] = useState<KPIRow[]>([]);
    const [totalInspectionsCount, setTotalInspectionsCount] = useState(0);
    const nowD = new Date();
    const currentYearMonth = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}`;
    const [monthFilter, setMonthFilter] = useState(currentYearMonth);

    const [logs, setLogs] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [incidents, setIncidents] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [duties, setDuties] = useState<any[]>([]);
    const lastProcessed = useRef("");

    useEffect(() => {
        getUsers().then(u => setAllUsers(u || [])).catch(e => console.error(e));
        const unsubLogs = subscribeToLogs(setLogs);
        const unsubHistory = subscribeToHistory(setHistory);
        const unsubIncidents = subscribeToIncidents(setIncidents);
        const unsubMaintenance = subscribeToMaintenance(setTasks);
        const unsubDuties = subscribeToDuties(setDuties);
        const unsubSystems = subscribeToSystems((_s) => {}); // Placeholder

        return () => { unsubLogs(); unsubHistory(); unsubIncidents(); unsubMaintenance(); unsubDuties(); unsubSystems(); };
    }, []);

    useEffect(() => {
        if (!monthFilter || allUsers.length === 0) return;

        const calculateStats = () => {
            const dataState = JSON.stringify({ monthFilter, u: allUsers.length, l: logs.length, d: duties.length });
            if (lastProcessed.current === dataState) return;
            lastProcessed.current = dataState;

            try {
                const [fY, fM] = monthFilter.split('-');
                const targetM = Number(fM), targetY = Number(fY);

                const parseTS = (ts: string) => {
                    if (!ts || typeof ts !== 'string') return null;
                    const s = ts.trim();
                    let d = -1, m = -1, y = -1, h = 0;
                    const dateMatch = s.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/) || s.match(/(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})/);
                    if (dateMatch) {
                        if (dateMatch[1].length === 4) { y = Number(dateMatch[1]); m = Number(dateMatch[2]); d = Number(dateMatch[3]); }
                        else { d = Number(dateMatch[1]); m = Number(dateMatch[2]); y = Number(dateMatch[3]); }
                    } else {
                        const nums = s.match(/\d+/g); if (nums && nums.length >= 3) { d = Number(nums[0]); m = Number(nums[1]); y = Number(nums[2]); if (y < 100) y += 2000; } else return null;
                    }
                    const timeMatch = s.match(/(\d{1,2})[:](\d{1,2})/); if (timeMatch) h = Number(timeMatch[1]);
                    const sL = s.toLowerCase();
                    if ((sL.includes('ch') || sL.includes('chiều') || /pm/i.test(s)) && h < 12) h += 12;
                    if ((sL.includes('sa') || sL.includes('sáng') || /am/i.test(s)) && h === 12) h = 0;
                    if (y < 100) y += 2000;
                    return d === -1 || m === -1 || y === -1 ? null : { d, m, y, h };
                };

                const toDS = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
                const fLogs = logs.filter(l => { const p = parseTS(l.timestamp); return p ? (p.m === targetM && p.y === targetY) : false; });
                const fHis = history.filter(h => h.resolvedAt && (parseTS(h.resolvedAt)?.m === targetM));
                const fInc = incidents.filter(i => i.resolvedAt && (parseTS(i.resolvedAt)?.m === targetM));
                const fTks = tasks.filter(t => t.completedAt && (parseTS(t.completedAt)?.m === targetM));

                const groupAct = (data: any[], f: string) => {
                    const m: any = {};
                    data.forEach(it => {
                        const p = parseTS(it[f]); if (!p) return;
                        const lD = new Date(p.y, p.m - 1, p.d);
                        const candidates = [{ ds: toDS(lD), st: p.h >= 4 && p.h <= 22 ? 'DAY' : null }, { ds: toDS(lD), st: p.h >= 16 ? 'NIGHT' : null }];
                        if (p.h <= 12) { const prev = new Date(lD); prev.setDate(prev.getDate() - 1); candidates.push({ ds: toDS(prev), st: 'NIGHT' }); }
                        candidates.filter(c => c.st).forEach(c => { const k = `${c.ds}_${c.st}`; if (!m[k]) m[k] = []; m[k].push(it); });
                    });
                    return m;
                };

                const logsByD = groupAct(fLogs, 'timestamp');
                const hisByD = groupAct(history, 'timestamp');
                const incByD = groupAct(incidents, 'timestamp');
                const mByD = groupAct(tasks, 'timestamp');

                const cStats = allUsers.map(u => {
                    let uIn = 0, fCC = 0;
                    duties.forEach(dD => {
                        const dS = dD.date;
                        ['DAY', 'NIGHT'].forEach(st => {
                            const crew = dD.assignments?.filter((a: any) => {
                                const aS = normalize(a.shift || ''); if (!(aS.includes('ngay') || aS.includes('dem') || aS === normalize(st))) return false;
                                return isMatch(a.userCode, u.code) || isMatch(a.userName, u.name);
                            }) || [];
                            if (crew.length === 0) return;
                            const k = `${dS}_${st}`;
                            if ((logsByD[k]||[]).length > 0 || (hisByD[k]||[]).length > 0 || (incByD[k]||[]).length > 0 || (mByD[k]||[]).length > 0) uIn += 11;
                            (logsByD[k] || []).filter((l: any) => isMatch(l.inspectorCode, u.code)).forEach((l: any) => { if (l.duration < 30) fCC++; });
                        });
                    });
                    return {
                        userId: u.id, code: u.code, name: u.name, inspectionCount: uIn,
                        fixCount: fHis.filter(h => isMatch(h.resolverCode, u.code)).length,
                        incidentCount: fInc.filter(i => isMatch(i.resolvedByCode, u.code)).length,
                        maintenanceCount: fTks.filter(t => (Array.isArray(t.assignees) ? t.assignees : [t.assignees]).some((a: any) => isMatch(a, u.code))).length,
                        faultFoundCount: history.filter(h => isMatch(h.inspectorCode, u.code)).length,
                        projectExecCount: 0, projectSupCount: 0, fastCheckCount: fCC,
                        score: (uIn * SCORING_RULES.INSPECTION) + (fCC * SCORING_RULES.NEGLIGENCE)
                    };
                });

                cStats.sort((a, b) => b.score - a.score);
                setStats(cStats);
                setTotalInspectionsCount(Object.keys(logsByD).length * 11);
            } catch (e) { console.error("KPI Error", e); }
        };
        calculateStats();
    }, [monthFilter, allUsers, logs, history, incidents, tasks, duties]);

    if (currentUser?.role !== 'ADMIN') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="text-center max-w-sm">
                    <h1 className="text-2xl font-bold text-red-600 mb-2">Truy cập bị từ chối</h1>
                    <p className="text-slate-600 mb-6">Bạn không có quyền quản trị để truy cập dữ liệu này.</p>
                    <button onClick={() => router.push('/')} className="w-full py-3 bg-blue-600 text-white rounded-xl shadow-lg font-bold">Về trang chủ</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900 scroll-smooth">
            <div className="max-w-5xl mx-auto">
                <header className="mb-6 md:mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4 w-full">
                        <button onClick={() => router.push('/')} className="p-3 bg-white rounded-full border border-slate-200 shadow-sm active:scale-95 transition">
                            <ArrowLeft size={20} className="text-slate-600" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-xl md:text-2xl font-black uppercase text-slate-800 flex items-center gap-2 truncate">
                                <BarChart2 className="text-blue-600 shrink-0" />
                                <span className="truncate">Dashboard KPI Đội Ngũ</span>
                            </h1>
                            <p className="text-slate-500 text-xs md:text-sm font-medium">Báo cáo hiệu suất tự động</p>
                        </div>
                    </div>
                    <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-3">
                        <div className="w-full sm:w-auto bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex items-center">
                            <div className="p-2 text-slate-400"><Calendar size={18} /></div>
                            <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="w-full sm:w-32 outline-none text-slate-800 font-bold bg-transparent pr-4 py-2 cursor-pointer" />
                        </div>
                        <button onClick={async () => {
                            if (confirm("CẢNH BÁO: Hành động này sẽ XÓA TOÀN BỘ dữ liệu KPI.\nBạn có chắc chắn muốn tiếp tục không?")) {
                                try { await resetKPIData(); alert("Đã xóa toàn bộ dữ liệu."); } catch (e) { alert("Lỗi khi reset"); }
                            }
                        }} className="w-full sm:w-auto bg-red-50 hover:bg-red-100 text-red-600 px-4 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition active:scale-95">
                            <RotateCcw size={16} /> RESET DỮ LIỆU
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 transition hover:shadow-md cursor-default">
                        <div className="p-4 bg-blue-100 text-blue-600 rounded-2xl shrink-0"><UserCheck size={28} /></div>
                        <div><div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Tổng kiểm tra</div><div className="text-3xl font-black text-slate-800">{totalInspectionsCount}</div></div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 transition hover:shadow-md cursor-default">
                        <div className="p-4 bg-green-100 text-green-600 rounded-2xl shrink-0"><TrendingUp size={28} /></div>
                        <div><div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Lỗi đã sửa</div><div className="text-3xl font-black text-slate-800">{stats.reduce((acc, curr) => acc + curr.fixCount, 0)}</div></div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 sm:col-span-2 lg:col-span-1 border-b-4 border-b-amber-400 transition hover:shadow-md cursor-default">
                        <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl shrink-0"><Medal size={28} /></div>
                        <div className="min-w-0"><div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Nhân viên Top 1</div><div className="text-xl font-black text-slate-800 truncate">{stats.length > 0 ? stats[0].name : '-'}</div></div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 font-black text-xs text-slate-500 flex items-center gap-2 uppercase tracking-widest"><Settings size={14} /> Cơ cấu tính điểm</div>
                    <div className="overflow-x-auto scrollbar-hide"><div className="grid grid-cols-4 lg:grid-cols-8 min-w-[800px] gap-px bg-slate-100">
                        {Object.entries(SCORING_RULES).map(([k, v]) => (
                            <div key={k} className="bg-white p-4 text-center">
                                <div className="text-[9px] text-slate-400 uppercase font-black mb-1 truncate px-1">{RULE_LABELS[k] || k}</div>
                                <div className={clsx("font-black text-xl", v < 0 ? "text-red-500" : "text-blue-600")}>{v > 0 ? `+${v}` : v}</div>
                            </div>
                        ))}
                    </div></div>
                    <div className="p-3 bg-slate-50 text-[10px] text-slate-400 text-center italic border-t border-slate-200">Dữ liệu được lấy trực tiếp từ nhật ký hiện trường.</div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center px-4">
                        <h2 className="text-xs font-black uppercase text-slate-500 tracking-[0.2em]">Bảng Xếp Hạng Hiệu Suất</h2>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{stats.length} Nhân viên</span>
                    </div>
                    
                    {/* MOBILE CARD VIEW */}
                    <div className="md:hidden space-y-4 pb-12">
                        {stats.map((row, idx) => (
                            <div key={row.userId} className={clsx("bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition active:scale-[0.98]", idx === 0 ? "ring-2 ring-amber-400 border-transparent" : "")}>
                                <div className="p-5 flex items-center justify-between border-b border-slate-50 bg-slate-50/50">
                                    <div className="flex items-center gap-4">
                                        <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center font-black text-white shadow-lg", idx === 0 ? "bg-amber-400 rotate-12" : idx === 1 ? "bg-slate-400" : idx === 2 ? "bg-amber-700" : "bg-slate-200 text-slate-500 shadow-none")}>{idx + 1}</div>
                                        <div><div className="font-black text-slate-800 text-lg">{row.name}</div><div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{row.code}</div></div>
                                    </div>
                                    <div className="text-right"><div className="text-2xl font-black text-blue-700">{row.score}</div><div className="text-[8px] text-slate-400 uppercase font-bold tracking-tighter">Tổng điểm</div></div>
                                </div>
                                <div className="p-5 grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-3 rounded-xl"><div className="text-[9px] text-slate-400 font-black uppercase mb-1">Kiểm tra</div><div className="text-lg font-black text-blue-600">{row.inspectionCount}</div></div>
                                    <div className="bg-slate-50 p-3 rounded-xl"><div className="text-[9px] text-slate-400 font-black uppercase mb-1">Sửa lỗi</div><div className="text-lg font-black text-green-600">{row.fixCount}</div></div>
                                    <div className="bg-slate-50 p-3 rounded-xl"><div className="text-[9px] text-slate-400 font-black uppercase mb-1">Bảo dưỡng</div><div className="text-lg font-black text-cyan-600">{row.maintenanceCount || 0}</div></div>
                                    <div className="bg-slate-50 p-3 rounded-xl"><div className="text-[9px] text-slate-400 font-black uppercase mb-1">Làm ẩu</div><div className="text-lg font-black text-red-500">{row.fastCheckCount ? `-${row.fastCheckCount}` : '-'}</div></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* DESKTOP TABLE VIEW */}
                    <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-12">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] border-b border-slate-200">
                                <tr>
                                    <th className="p-6 w-20 text-center">Hạng</th>
                                    <th className="p-6">Nhân viên</th>
                                    <th className="p-6 text-center">Kiểm tra</th>
                                    <th className="p-6 text-center text-green-600">Sửa lỗi</th>
                                    <th className="p-6 text-center text-cyan-600">Bảo dưỡng</th>
                                    <th className="p-6 text-center text-red-500">Làm ẩu</th>
                                    <th className="p-6 text-right pr-8">Tổng điểm</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {stats.map((row, idx) => (
                                    <tr key={row.userId} className={clsx("hover:bg-slate-50/80 transition group", idx === 0 ? "bg-amber-50/30" : "")}>
                                        <td className="p-6 text-center"><div className={clsx("w-10 h-10 rounded-full flex items-center justify-center font-black mx-auto transition-transform group-hover:scale-110 shadow-sm", idx === 0 ? "bg-amber-400 text-white" : idx === 1 ? "bg-slate-300 text-white" : idx === 2 ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-400")}>{idx + 1}</div></td>
                                        <td className="p-6 font-black text-slate-800">{row.name}<div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{row.code}</div></td>
                                        <td className="p-6 text-center font-black text-blue-600 text-lg">{row.inspectionCount}</td>
                                        <td className="p-6 text-center font-black text-green-600 text-lg">{row.fixCount}</td>
                                        <td className="p-6 text-center font-black text-cyan-600 text-lg">{row.maintenanceCount || '-'}</td>
                                        <td className="p-6 text-center font-black text-red-500 text-lg">{row.fastCheckCount || '-'}</td>
                                        <td className="p-6 text-right pr-8 font-black text-slate-900 text-2xl">{row.score}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}