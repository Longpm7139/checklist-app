'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart2, Medal, TrendingUp, UserCheck, Calendar, AlertTriangle, RotateCcw, Settings } from 'lucide-react';
import clsx from 'clsx';
import { useUser } from '@/providers/UserProvider';
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
    const [systems, setSystems] = useState<SystemCheck[]>([]);
    const [diagInfo, setDiagInfo] = useState<string[]>([]);
    const lastProcessed = useRef("");

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const users = await getUsers();
                setAllUsers(users || []);
            } catch (e) {
                console.error("Failed to load users", e);
            }
        };
        fetchUsers();

        const unsubLogs = subscribeToLogs((data) => setLogs(data));
        const unsubHistory = subscribeToHistory((data) => setHistory(data));
        const unsubIncidents = subscribeToIncidents((data) => setIncidents(data));
        const unsubMaintenance = subscribeToMaintenance((data) => setTasks(data));
        const unsubDuties = subscribeToDuties((data) => setDuties(data));
        const unsubSystems = subscribeToSystems((data) => setSystems(data as SystemCheck[]));

        return () => {
            unsubLogs(); unsubHistory(); unsubIncidents(); unsubMaintenance(); unsubDuties(); unsubSystems();
        };
    }, []);

    useEffect(() => {
        if (!monthFilter || allUsers.length === 0) return;

        const calculateStats = () => {
            const dataState = JSON.stringify({ monthFilter, userCount: allUsers.length, logCount: logs.length, dutyCount: duties.length });
            if (lastProcessed.current === dataState) return;
            lastProcessed.current = dataState;

            try {
                const diag: string[] = [];
                const removeAccents = (str: string) => (str || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
                const normalize = (val: any) => {
                    const s = (val || '').toString().trim().toLowerCase();
                    return removeAccents(s).normalize('NFC').replace(/[\s\-_]/g, '');
                };
                const isMatch = (val1: any, val2: any) => {
                    if (!val1 || !val2) return false;
                    const n1 = normalize(val1); const n2 = normalize(val2);
                    if (n1 === '' || n2 === '') return false;
                    if (n1 === n2 || n1.includes(n2) || n2.includes(n1)) return true;
                    const num1 = n1.replace(/\D/g, ''); const num2 = n2.replace(/\D/g, '');
                    return num1 !== '' && num1 === num2;
                };

                const [fY, fM] = monthFilter.split('-');
                const targetM = Number(fM); const targetY = Number(fY);

                const parseTimestamp = (ts: string) => {
                    if (!ts || typeof ts !== 'string') return null;
                    const s = ts.trim();
                    let d = -1, m = -1, y = -1, h = 0, min = 0;
                    const dateMatch = s.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/) || s.match(/(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})/);
                    if (dateMatch) {
                        if (dateMatch[1].length === 4) { y = Number(dateMatch[1]); m = Number(dateMatch[2]); d = Number(dateMatch[3]); }
                        else { d = Number(dateMatch[1]); m = Number(dateMatch[2]); y = Number(dateMatch[3]); }
                    } else {
                        const nums = s.match(/\d+/g);
                        if (nums && nums.length >= 3) { d = Number(nums[0]); m = Number(nums[1]); y = Number(nums[2]); if (y < 100) y += 2000; }
                        else return null;
                    }
                    const timeMatch = s.match(/(\d{1,2})[:](\d{1,2})/);
                    if (timeMatch) { h = Number(timeMatch[1]); min = Number(timeMatch[2]); }
                    const sLow = s.toLowerCase();
                    if ((sLow.includes('ch') || sLow.includes('chiều') || /pm/i.test(s)) && h < 12) h += 12;
                    if ((sLow.includes('sa') || sLow.includes('sáng') || /am/i.test(s)) && h === 12) h = 0;
                    if (y < 100) y += 2000;
                    return d === -1 || m === -1 || y === -1 ? null : { d, m, y, h, min };
                };

                const toDateStr = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
                const filteredLogs = logs.filter((l: any) => { const p = parseTimestamp(l.timestamp); return p ? (p.m === targetM && p.y === targetY) : false; });
                const filteredHistory = history.filter((h: any) => h.resolvedAt && (parseTimestamp(h.resolvedAt)?.m === targetM));
                const filteredIncidents = incidents.filter((i: any) => i.resolvedAt && (parseTimestamp(i.resolvedAt)?.m === targetM));
                const filteredTasks = tasks.filter((t: any) => t.completedAt && (parseTimestamp(t.completedAt)?.m === targetM));

                const groupActivity = (data: any[], field: string) => {
                    const map: { [key: string]: any[] } = {};
                    data.forEach(item => {
                        const p = parseTimestamp(item[field]); if (!p) return;
                        const logDate = new Date(p.y, p.m - 1, p.d);
                        const candidates = [{ ds: toDateStr(logDate), st: p.h >= 4 && p.h <= 22 ? 'DAY' : null }, { ds: toDateStr(logDate), st: p.h >= 16 ? 'NIGHT' : null }];
                        if (p.h <= 12) { const prev = new Date(logDate); prev.setDate(prev.getDate() - 1); candidates.push({ ds: toDateStr(prev), st: 'NIGHT' }); }
                        candidates.filter(c => c.st).forEach(c => {
                            const k = `${c.ds}_${c.st}`; if (!map[k]) map[k] = []; map[k].push(item);
                        });
                    });
                    return map;
                };

                const logsByDuty = groupActivity(filteredLogs, 'timestamp');
                const historyByDuty = groupActivity(history, 'timestamp');
                const incidentsByDuty = groupActivity(incidents, 'timestamp');
                const mByDuty = groupActivity(tasks, 'timestamp');

                const calculatedStats = allUsers.map((u: any) => {
                    let userInspections = 0, fastChecksCount = 0;
                    duties.forEach(dayDuty => {
                        const dateStr = dayDuty.date;
                        ['DAY', 'NIGHT'].forEach(st => {
                            const crew = dayDuty.assignments?.filter((a: any) => {
                                const aS = normalize(a.shift || '');
                                if (!(aS.includes('ngay') || aS.includes('dem') || aS === normalize(st))) return false;
                                return isMatch(a.userCode, u.code) || isMatch(a.userName, u.name);
                            }) || [];
                            if (crew.length === 0) return;
                            const key = `${dateStr}_${st}`;
                            const hasAct = (logsByDuty[key] || []).length > 0 || (historyByDuty[key] || []).length > 0 || (incidentsByDuty[key] || []).length > 0 || (mByDuty[key] || []).length > 0;
                            if (hasAct) userInspections += 11;
                            (logsByDuty[key] || []).filter((l: any) => isMatch(l.inspectorCode, u.code)).forEach((l: any) => { if (l.duration < 30) fastChecksCount++; });
                        });
                    });
                    return {
                        userId: u.id, code: u.code, name: u.name, inspectionCount: userInspections,
                        fixCount: filteredHistory.filter((h: any) => isMatch(h.resolverCode, u.code)).length,
                        incidentCount: filteredIncidents.filter((i: any) => isMatch(i.resolvedByCode, u.code)).length,
                        maintenanceCount: filteredTasks.filter((t: any) => (Array.isArray(t.assignees) ? t.assignees : [t.assignees]).some((a: any) => isMatch(a, u.code))).length,
                        faultFoundCount: history.filter((h: any) => isMatch(h.inspectorCode, u.code)).length,
                        projectExecCount: 0, projectSupCount: 0, fastCheckCount: fastChecksCount,
                        score: (userInspections * SCORING_RULES.INSPECTION) + (fastChecksCount * SCORING_RULES.NEGLIGENCE)
                    };
                });

                calculatedStats.sort((a: any, b: any) => b.score - a.score);
                setStats(calculatedStats);
                setDiagInfo(diag);
                setTotalInspectionsCount(Object.keys(logsByDuty).length * 11);
            } catch (e: any) { console.error("KPI Error", e); setDiagInfo(["Crash: " + e.message]); }
        };
        calculateStats();
    }, [monthFilter, allUsers, logs, history, incidents, tasks, duties, systems]);

    if (currentUser?.role !== 'ADMIN') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-2">Truy cập bị từ chối</h1>
                    <p className="text-slate-600 mb-4">Bạn không có quyền xem trang này.</p>
                    <button onClick={() => router.push('/')} className="px-4 py-2 bg-blue-600 text-white rounded">Về trang chủ</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
            <div className="max-w-5xl mx-auto">
                <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button onClick={() => router.push('/')} className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-100">
                            <ArrowLeft size={20} className="text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold uppercase text-slate-800 flex items-center gap-2">
                                <BarChart2 className="text-blue-600" />
                                Dashboard KPI (STABLE V18.0)
                            </h1>
                            <p className="text-slate-500 text-sm">Thống kê hiệu suất làm việc nhân viên</p>
                        </div>
                    </div>
                    <div className="w-full md:w-auto flex items-center gap-2">
                        <button onClick={async () => {
                            if (confirm("CẢNH BÁO: Hành động này sẽ XÓA TOÀN BỘ dữ liệu KPI.\nBạn có chắc chắn muốn tiếp tục không?")) {
                                try { await resetKPIData(); alert("Đã xóa toàn bộ dữ liệu."); } catch (e) { alert("Lỗi khi reset"); }
                            }
                        }} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm">
                            <RotateCcw size={16} /> Reset
                        </button>
                        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                            <Calendar size={18} className="text-slate-500 ml-2" />
                            <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="outline-none text-slate-800 font-bold bg-transparent" />
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-full shrink-0"><UserCheck size={24} /></div>
                        <div><div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Tổng kiểm tra</div><div className="text-2xl font-black text-slate-800">{totalInspectionsCount}</div></div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-full shrink-0"><TrendingUp size={24} /></div>
                        <div><div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Lỗi đã sửa</div><div className="text-2xl font-black text-slate-800">{stats.reduce((acc, curr) => acc + curr.fixCount, 0)}</div></div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 sm:col-span-2 lg:col-span-1">
                        <div className="p-3 bg-amber-100 text-amber-600 rounded-full shrink-0"><Medal size={24} /></div>
                        <div><div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Hạt giống xuất sắc</div><div className="text-lg font-bold text-slate-800 truncate tracking-tighter">{stats.length > 0 ? stats[0].name : '-'}</div></div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                    <div className="p-4 bg-slate-100 border-b border-slate-200 font-bold text-slate-700 flex items-center gap-2"><Settings size={14} className="text-slate-400" /> Cơ cấu tính điểm</div>
                    <div className="overflow-x-auto"><div className="grid grid-cols-4 lg:grid-cols-8 min-w-[700px] gap-px bg-slate-200">
                        {Object.entries(SCORING_RULES).map(([k, v]) => (
                            <div key={k} className="bg-white p-3 text-center">
                                <div className="text-[10px] text-slate-400 uppercase font-black">{k}</div>
                                <div className={clsx("font-black text-lg", v < 0 ? "text-red-600" : "text-blue-600")}>{v > 0 ? `+${v}` : v}</div>
                            </div>
                        ))}
                    </div></div>
                </div>

                <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-slate-600 uppercase text-xs font-bold border-b border-slate-200">
                            <tr>
                                <th className="p-4 w-16 text-center">Hạng</th>
                                <th className="p-4">Nhân viên</th>
                                <th className="p-4 text-center">Kiểm tra</th>
                                <th className="p-4 text-center">Sửa lỗi</th>
                                <th className="p-4 text-center">Bảo dưỡng</th>
                                <th className="p-4 text-center">Làm ẩu</th>
                                <th className="p-4 text-center">Tổng điểm</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {stats.map((row, idx) => (
                                <tr key={row.userId} className={clsx("hover:bg-slate-50 transition", idx < 3 ? "bg-amber-50/10" : "")}>
                                    <td className="p-4 text-center"><div className={clsx("w-8 h-8 rounded-full flex items-center justify-center font-bold mx-auto shadow-sm", idx === 0 ? "bg-yellow-400 text-white" : idx === 1 ? "bg-slate-300 text-white" : idx === 2 ? "bg-amber-600 text-white" : "text-slate-400")}>{idx + 1}</div></td>
                                    <td className="p-4 font-bold text-slate-800">{row.name}<div className="text-xs font-normal text-slate-400">{row.code}</div></td>
                                    <td className="p-4 text-center font-medium text-blue-600">{row.inspectionCount}</td>
                                    <td className="p-4 text-center font-medium text-green-600">{row.fixCount}</td>
                                    <td className="p-4 text-center font-bold text-cyan-600">{row.maintenanceCount || '-'}</td>
                                    <td className="p-4 text-center font-bold text-red-500">{row.fastCheckCount || '-'}</td>
                                    <td className="p-4 text-center font-bold text-slate-900 text-lg">{row.score}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}