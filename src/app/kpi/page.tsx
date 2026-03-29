'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart2, Medal, TrendingUp, UserCheck, Calendar, AlertTriangle, RotateCcw, Settings } from 'lucide-react';
import clsx from 'clsx';
import { useUser } from '@/providers/UserProvider';
import { subscribeToLogs, subscribeToHistory, subscribeToIncidents, subscribeToMaintenance, getUsers, resetKPIData, subscribeToDuties, subscribeToSystems } from '@/lib/firebase';
import { SystemCheck } from '@/lib/types';

interface KPIRow {
    userId: number;
    code: string;
    name: string;
    inspectionCount: number;
    fixCount: number;
    incidentCount: number;
    maintenanceCount: number;
    faultFoundCount: number; // New
    projectExecCount: number; // New
    projectSupCount: number; // New
    fastCheckCount: number; // Warning count
    score: number; // Simple score for ranking
}

const SCORING_RULES = {
    INSPECTION: 1,
    FAULT_FOUND: 3, // Increased from 2
    FIX: 4,         // Increased from 2
    INCIDENT: 5,
    MAINTENANCE: 8, // New
    PROJECT_EXEC: 10,
    PROJECT_SUP: 6,   // Increased from 5
    NEGLIGENCE: -10    // Decreased from -5 (stricter penalty)
};

export default function KPIPage() {
    const router = useRouter();
    const { user: currentUser } = useUser();
    const [stats, setStats] = useState<KPIRow[]>([]);
    const [totalInspectionsCount, setTotalInspectionsCount] = useState(0);
    const nowD = new Date();
    const currentYearMonth = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}`;
    const [monthFilter, setMonthFilter] = useState(currentYearMonth); // YYYY-MM

    useEffect(() => {
        // Protect Route
        const checkAuth = async () => {
            // Basic protection, provider handles detailed redirect usually but safe to check
        };
        checkAuth();
    }, []);

    const [logs, setLogs] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [incidents, setIncidents] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [duties, setDuties] = useState<any[]>([]);
    const [systems, setSystems] = useState<SystemCheck[]>([]);
    const [diagInfo, setDiagInfo] = useState<string[]>([]);

    // 1. Subscribe to Data
    useEffect(() => {
        // Fetch Users (One-time or could be real-time too, but API is fine for now)
        const fetchUsers = async () => {
            try {
                const users = await getUsers();
                setAllUsers(users || []);
            } catch (e) {
                console.error("Failed to load users", e);
            }
        };
        fetchUsers();

        // Subscribe to Firebase Collections
        const unsubLogs = subscribeToLogs((data) => setLogs(data));
        const unsubHistory = subscribeToHistory((data) => setHistory(data));
        const unsubIncidents = subscribeToIncidents((data) => setIncidents(data));
        const unsubMaintenance = subscribeToMaintenance((data) => setTasks(data));
        const unsubDuties = subscribeToDuties((data) => setDuties(data));
        const unsubSystems = subscribeToSystems((data) => setSystems(data as SystemCheck[]));

        return () => {
            unsubLogs();
            unsubHistory();
            unsubIncidents();
            unsubMaintenance();
            unsubDuties();
            unsubSystems();
        };
    }, []);

    // 2. Calculate Stats when Data or Filter Changes
    useEffect(() => {
        if (!monthFilter || allUsers.length === 0) return;

                const calculateStats = () => {
            try {
                const diag: string[] = [];
                const removeAccents = (str: string) => (str || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

                const normalize = (val: any) => {
                    const s = (val || '').toString().trim().toLowerCase();
                    return removeAccents(s).normalize('NFC').replace(/[\s\-_]/g, '');
                };
                
                const isMatch = (val1: any, val2: any) => {
                    if (!val1 || !val2) return false;
                    const n1 = normalize(val1);
                    const n2 = normalize(val2);
                    if (n1 === '' || n2 === '') return false;
                    if (n1 === n2) return true;
                    // Partial matching for codes (0585 vs 0585VP)
                    if (n1.includes(n2) || n2.includes(n1)) return true;
                    // Numeric only check
                    const num1 = n1.replace(/\D/g, '');
                    const num2 = n2.replace(/\D/g, '');
                    if (num1 !== '' && num1 === num2) return true;
                    return false;
                };

                const [fY, fM] = monthFilter.split('-');
                const targetM = Number(fM);
                const targetY = Number(fY);

                const parseTimestamp = (ts: string): { d: number, m: number, y: number, h: number, min: number } | null => {
                    if (!ts || typeof ts !== 'string') return null;
                    const s = ts.trim();
                    let d = -1, m = -1, y = -1, h = 0, min = 0;
                    const dateMatch = s.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/) || 
                                      s.match(/(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})/);
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
                    const isPM = sLow.includes('ch') || sLow.includes('chiều') || /\bp\.?m\.?\b/i.test(s);
                    const isAM = sLow.includes('sa') || sLow.includes('sáng') || /\ba\.?m\.?\b/i.test(s);
                    if (isPM && h < 12) h += 12; else if (isAM && h === 12) h = 0;
                    if (y < 100) y += 2000;
                    if (d === -1 || m === -1 || y === -1) return null;
                    return { d, m, y, h, min };
                };

                const toDateStr = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
                
                const filteredLogs = logs.filter(l => {
                    const p = parseTimestamp(l.timestamp);
                    return p ? (p.m === targetM && p.y === targetY) : false;
                });
                const filteredHistory = history.filter(h => h.resolvedAt && (parseTimestamp(h.resolvedAt)?.m === targetM));
                const filteredIncidents = incidents.filter(i => i.resolvedAt && (parseTimestamp(i.resolvedAt)?.m === targetM));
                const filteredTasks = tasks.filter(t => t.completedAt && (parseTimestamp(t.completedAt)?.m === targetM));

                const getLogDutyCandidates = (timestamp: string) => {
                    const p = parseTimestamp(timestamp);
                    if (!p) return [];
                    const hh = p.h;
                    const candidates: { dutyDateStr: string, shift: 'DAY' | 'NIGHT' }[] = [];
                    const logDate = new Date(p.y, p.m - 1, p.d);
                    const ds = toDateStr(logDate);
                    // Broad window 
                    if (hh >= 4 && hh <= 22) candidates.push({ dutyDateStr: ds, shift: 'DAY' });
                    if (hh >= 16) candidates.push({ dutyDateStr: ds, shift: 'NIGHT' });
                    if (hh <= 12) {
                        const prev = new Date(logDate);
                        prev.setDate(prev.getDate() - 1);
                        candidates.push({ dutyDateStr: toDateStr(prev), shift: 'NIGHT' });
                    }
                    return candidates;
                };

                const groupActivity = (data: any[], dateField: string) => {
                    const map: { [key: string]: any[] } = {};
                    data.forEach(item => {
                        const ts = item[dateField];
                        if (!ts) return;
                        getLogDutyCandidates(ts).forEach(cand => {
                            const k = `${cand.dutyDateStr}_${cand.shift}`;
                            if (!map[k]) map[k] = [];
                            map[k].push(item);
                        });
                    });
                    return map;
                };

                const logsByDuty = groupActivity(filteredLogs, 'timestamp');
                const historyByDuty = groupActivity(history, 'timestamp');
                const incidentsByDuty = groupActivity(incidents, 'timestamp');
                const maintenanceByDuty = groupActivity(tasks, 'timestamp');

                diag.push(`Data: L:${filteredLogs.length} H:${filteredHistory.length} D:${duties.length}`);

                const calculatedStats = allUsers.map(u => {
                    let userInspections = 0;
                    let fastChecksCount = 0;

                    duties.forEach(dayDuty => {
                        const dateStr = dayDuty.date;
                        ['DAY', 'NIGHT'].forEach(st => {
                            // Find assignments for this shift - handle different shift names
                            const assignments = dayDuty.assignments?.filter((a: any) => {
                                const aShift = normalize(a.shift || '');
                                const targetShift = normalize(st === 'DAY' ? 'CA NGÀY' : 'CA ĐÊM');
                                // Also handle 'DAY' and 'NIGHT' directly
                                const isShiftMatch = aShift.includes('ngay') || aShift.includes('dem') || aShift === normalize(st);
                                if (!isShiftMatch) return false;
                                return isMatch(a.userCode, u.code) || isMatch(a.userName, u.name);
                            }) || [];

                            if (assignments.length === 0) return;

                            const key = `${dateStr}_${st}`;
                            const crew = dayDuty.assignments?.filter((a: any) => {
                                const aS = normalize(a.shift || '');
                                return aS.includes(st === 'DAY' ? 'ngay' : 'dem') || aS === normalize(st);
                            }) || [];
                            
                            const teamHasActivity = (logsByDuty[key] || []).some(l => crew.some(m => isMatch(m.userCode, l.inspectorCode) || isMatch(m.userName, l.inspectorName))) ||
                                                    (historyByDuty[key] || []).some(h => crew.some(m => isMatch(m.userCode, h.inspectorCode) || isMatch(m.userName, h.inspectorName))) ||
                                                    (incidentsByDuty[key] || []).some(i => {
                                                        const wrks = [...(Array.isArray(i.resolvedByCode)?i.resolvedByCode:[i.resolvedByCode]), ...(Array.isArray(i.participants)?i.participants:[i.participants])].filter(Boolean);
                                                        return crew.some(m => wrks.some(w => isMatch(m.userCode, w) || isMatch(m.userName, w)));
                                                    }) ||
                                                    (maintenanceByDuty[key] || []).some(t => {
                                                        const asgn = Array.isArray(t.assignees) ? t.assignees : [t.assignees];
                                                        return crew.some(m => asgn.some(a => isMatch(m.userCode, a) || isMatch(m.userName, a)));
                                                    });

                            if (teamHasActivity) userInspections += 11;
                            (logsByDuty[key] || []).filter(l => isMatch(l.inspectorCode, u.code)).forEach(l => { if (l.duration < 30) fastChecksCount++; });
                        });
                    });

                    return {
                        userId: u.id, code: u.code, name: u.name,
                        inspectionCount: userInspections, 
                        fixCount: filteredHistory.filter(h => isMatch(h.resolverCode, u.code)).length,
                        incidentCount: filteredIncidents.filter(i => isMatch(i.resolvedByCode, u.code)).length,
                        maintenanceCount: filteredTasks.filter(t => (Array.isArray(t.assignees) ? t.assignees : [t.assignees]).some(a => isMatch(a, u.code))).length,
                        faultFoundCount: history.filter(h => isMatch(h.inspectorCode, u.code)).length,
                        projectExecCount: 0, projectSupCount: 0, fastCheckCount: fastChecksCount,
                        score: (userInspections * SCORING_RULES.INSPECTION) + (fastChecksCount * SCORING_RULES.NEGLIGENCE)
                    };
                });

                calculatedStats.sort((a, b) => b.score - a.score);
                setStats(calculatedStats);
                setDiagInfo(diag);
                setTotalInspectionsCount(Object.keys(logsByDuty).length * 11);
            } catch (e: any) {
                console.error("KPI Error", e);
                setDiagInfo(["Crash: " + e.message]);
            }
        };

        calculateStats();
    , [monthFilter, allUsers, logs, history, incidents, tasks, duties, systems]);

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
                                Dashboard Đánh Giá KPI
                            </h1>
                            <p className="text-slate-500 text-sm">Thống kê hiệu suất làm việc nhân viên</p>
                        </div>
                    </div>



                    <div className="w-full md:w-auto flex items-center gap-2">
                        {currentUser?.role === 'ADMIN' && (
                            <button
                                onClick={async () => {
                                    if (confirm("CẢNH BÁO: Hành động này sẽ XÓA TOÀN BỘ dữ liệu kiểm tra, sửa lỗi, sự cố và bảo trì để làm lại từ đầu.\n\nBạn có chắc chắn muốn tiếp tục không?")) {
                                        try {
                                            await resetKPIData();
                                            alert("Đã xóa toàn bộ dữ liệu. Hệ thống đã được reset về trạng thái ban đầu.");
                                            // Optional: window.location.reload();
                                        } catch (e) {
                                            console.error(e);
                                            alert("Lỗi khi reset dữ liệu");
                                        }
                                    }
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm"
                            >
                                <RotateCcw size={16} /> Reset Dữ Liệu
                            </button>
                        )}
                        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                            <Calendar size={18} className="text-slate-500 ml-2" />
                            <span className="text-sm font-semibold text-slate-700">Tháng:</span>
                            <input
                                type="month"
                                value={monthFilter}
                                onChange={(e) => setMonthFilter(e.target.value)}
                                className="outline-none text-slate-800 font-bold bg-transparent"
                            />
                        </div>
                    </div>
                </header>

                {/* DIAGNOSTIC PANEL (DEBUG MODE) */}
                {currentUser?.role === 'ADMIN' && (
                    <div className="mb-6 bg-slate-900 text-white p-4 rounded-xl text-[10px] font-mono shadow-2xl border-2 border-yellow-500/50">
                        <div className="flex items-center gap-2 mb-2 text-yellow-400 font-bold uppercase text-[11px]">
                            <span className="animate-spin text-lg">⚙️</span> KPI Diagnostic Console (VERSION 5.0 - RESCUE READY)
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 opacity-80">
                            {diagInfo.map((info, i) => (
                                <div key={i} className="border-b border-slate-700 pb-1">{info}</div>
                            ))}
                        </div>
                        <div className="mt-4 pt-2 border-t border-slate-700 whitespace-nowrap overflow-x-auto text-[9px] text-blue-400">
                            <b>Sample Logs:</b> {logs.slice(0, 5).map(l => l.timestamp).join(' | ')}
                        </div>
                    </div>
                )}

                {/* Top Statistics Cards (Responsive Stack) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-full shrink-0">
                            <UserCheck size={24} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Tổng kiểm tra</div>
                            <div className="text-2xl font-black text-slate-800">
                                {totalInspectionsCount}
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-full shrink-0">
                            <TrendingUp size={24} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Lỗi đã sửa</div>
                            <div className="text-2xl font-black text-slate-800">
                                {stats.reduce((acc, curr) => acc + curr.fixCount, 0)}
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 sm:col-span-2 lg:col-span-1">
                        <div className="p-3 bg-amber-100 text-amber-600 rounded-full shrink-0">
                            <Medal size={24} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Nhân viên xuất sắc</div>
                            <div className="text-lg font-bold text-slate-800 truncate" title={stats[0]?.name}>
                                {stats.length > 0 ? stats[0].name : '-'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* SCORING RULES SECTION (Horizontal Scroll on Mobile) */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                    <div className="p-4 bg-slate-100 border-b border-slate-200 font-bold text-slate-700 flex items-center gap-2">
                        <div className="p-1 bg-white rounded border border-slate-200"><Settings size={14} className="text-slate-400" /></div>
                        Cơ cấu tính điểm KPI
                    </div>
                    <div className="overflow-x-auto">
                        <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-8 min-w-[700px] gap-px bg-slate-200">
                            <div className="bg-white p-3 text-center">
                                <div className="text-[10px] text-slate-400 uppercase font-black">Kiểm tra</div>
                                <div className="text-blue-600 font-black text-lg">+{SCORING_RULES.INSPECTION}</div>
                            </div>
                            <div className="bg-white p-3 text-center">
                                <div className="text-[10px] text-slate-400 uppercase font-black">Phát hiện lỗi</div>
                                <div className="text-indigo-600 font-black text-lg">+{SCORING_RULES.FAULT_FOUND}</div>
                            </div>
                            <div className="bg-white p-3 text-center">
                                <div className="text-[10px] text-slate-400 uppercase font-black">Sửa lỗi</div>
                                <div className="text-green-600 font-black text-lg">+{SCORING_RULES.FIX}</div>
                            </div>
                            <div className="bg-white p-3 text-center">
                                <div className="text-[10px] text-slate-400 uppercase font-black">Sự cố</div>
                                <div className="text-purple-600 font-black text-lg">+{SCORING_RULES.INCIDENT}</div>
                            </div>
                            <div className="bg-white p-3 text-center">
                                <div className="text-[10px] text-slate-400 uppercase font-black">Bảo dưỡng</div>
                                <div className="text-cyan-600 font-black text-lg">+{SCORING_RULES.MAINTENANCE}</div>
                            </div>
                            <div className="bg-white p-3 text-center">
                                <div className="text-[10px] text-slate-400 uppercase font-black">Thi công</div>
                                <div className="text-amber-600 font-black text-lg">+{SCORING_RULES.PROJECT_EXEC}</div>
                            </div>
                            <div className="bg-white p-3 text-center">
                                <div className="text-[10px] text-slate-400 uppercase font-black">Giám sát</div>
                                <div className="text-teal-600 font-black text-lg">+{SCORING_RULES.PROJECT_SUP}</div>
                            </div>
                            <div className="bg-white p-3 text-center">
                                <div className="text-[10px] text-red-400 uppercase font-black">Làm ẩu</div>
                                <div className="text-red-600 font-black text-lg">{SCORING_RULES.NEGLIGENCE}</div>
                            </div>
                        </div>
                    </div>
                    <div className="p-2 bg-slate-50 text-[10px] text-slate-400 text-center italic border-t border-slate-200 uppercase tracking-tighter">
                        * Điểm được tính tự động dựa trên nhật ký hoạt động của hệ thống.
                    </div>
                </div>

                {/* WARNING SECTION */}
                {stats.some(s => s.fastCheckCount > 0) && (
                    <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-red-700 font-bold uppercase">
                            <AlertTriangle size={20} /> Cảnh báo bất thường (Làm ẩu)
                        </div>
                        <div className="text-sm text-red-600">
                            Các nhân viên sau có thời gian kiểm tra quá nhanh (dưới 30 giây):
                        </div>
                        <ul className="list-disc list-inside">
                            {stats.filter(s => s.fastCheckCount > 0).map(s => (
                                <li key={s.userId} className="text-slate-800 font-medium">
                                    {s.name} ({s.code}): <span className="font-bold text-red-600">{s.fastCheckCount} lần</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Leaderboard Section (Responsive) */}
                <div className="w-full">
                    {/* Mobile Card View (hidden on md-up) */}
                    <div className="block md:hidden space-y-4">
                        <div className="p-2 text-slate-500 font-bold uppercase text-xs tracking-widest pl-4">Bảng Xếp Hạng Hiệu Suất</div>
                        {stats.map((row, idx) => (
                            <div key={row.userId} className={clsx("bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden", idx < 3 ? "ring-2 ring-amber-100" : "")}>
                                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={clsx(
                                            "w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-sm",
                                            idx === 0 ? "bg-yellow-400 text-white" :
                                                idx === 1 ? "bg-slate-300 text-white" :
                                                    idx === 2 ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-400"
                                        )}>
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800">{row.name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono italic uppercase tracking-tighter">{row.code}</div>
                                        </div>
                                    </div>
                                    <div className="text-blue-700 font-black text-2xl">{row.score}</div>
                                </div>
                                <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm italic">
                                    <div className="flex justify-between border-b border-slate-50">
                                        <span className="text-slate-400">Kiểm tra:</span>
                                        <span className="font-bold text-blue-600">{row.inspectionCount}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50">
                                        <span className="text-slate-400">Lỗi:</span>
                                        <span className="font-bold text-indigo-600">{row.faultFoundCount || 0}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50">
                                        <span className="text-slate-400">Sửa lỗi:</span>
                                        <span className="font-bold text-green-600">{row.fixCount}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50">
                                        <span className="text-slate-400">Sự cố:</span>
                                        <span className="font-bold text-purple-600">{row.incidentCount || 0}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50">
                                        <span className="text-slate-400">Bảo dưỡng:</span>
                                        <span className="font-bold text-cyan-600">{row.maintenanceCount || 0}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50">
                                        <span className="text-slate-400">Thi công:</span>
                                        <span className="font-bold text-amber-600">{row.projectExecCount || 0}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50">
                                        <span className="text-slate-400">Làm ẩu:</span>
                                        <span className="font-bold text-red-500">-{row.fastCheckCount || 0}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View (hidden on mobile) */}
                    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-lg text-slate-800 flex justify-between items-center">
                            <span>Bảng Xếp Hạng Hiệu Suất</span>
                        </div>
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-100 text-slate-600 uppercase text-xs font-bold border-b border-slate-200">
                                <tr>
                                    <th className="p-4 w-16 text-center">Hạng</th>
                                    <th className="p-4">Nhân viên</th>
                                    <th className="p-4 text-center">Kiểm tra</th>
                                    <th className="p-4 text-center text-indigo-600">Phát hiện lỗi</th>
                                    <th className="p-4 text-center text-green-600">Sửa lỗi</th>
                                    <th className="p-4 text-center text-purple-600">Sự cố</th>
                                    <th className="p-4 text-center text-cyan-600">Bảo dưỡng</th>
                                    <th className="p-4 text-center text-amber-600">Thi công</th>
                                    <th className="p-4 text-center text-red-600">Làm ẩu</th>
                                    <th className="p-4 text-center">Tổng điểm</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {stats.map((row, idx) => (
                                    <tr key={row.userId} className={clsx("hover:bg-slate-50 transition", idx < 3 ? "bg-amber-50/10" : "")}>
                                        <td className="p-4 text-center">
                                            <div className={clsx(
                                                "w-8 h-8 rounded-full flex items-center justify-center font-bold mx-auto shadow-sm",
                                                idx === 0 ? "bg-yellow-400 text-white" :
                                                    idx === 1 ? "bg-slate-300 text-white" :
                                                        idx === 2 ? "bg-amber-600 text-white" : "text-slate-400"
                                            )}>
                                                {idx + 1}
                                            </div>
                                        </td>
                                        <td className="p-4 font-bold text-slate-800">
                                            {row.name}
                                            <div className="text-xs font-normal text-slate-400">{row.code}</div>
                                        </td>
                                        <td className="p-4 text-center font-medium text-blue-600">{row.inspectionCount}</td>
                                        <td className="p-4 text-center font-medium text-indigo-600">{row.faultFoundCount || '-'}</td>
                                        <td className="p-4 text-center font-medium text-green-600">{row.fixCount}</td>
                                        <td className="p-4 text-center font-bold text-purple-600">{row.incidentCount || '-'}</td>
                                        <td className="p-4 text-center font-bold text-cyan-600">{row.maintenanceCount || '-'}</td>
                                        <td className="p-4 text-center font-bold text-amber-600">{row.projectExecCount || '-'}</td>
                                        <td className="p-4 text-center font-bold text-red-500">{row.fastCheckCount || '-'}</td>
                                        <td className="p-4 text-center font-bold text-slate-900 text-lg">{row.score}</td>
                                    </tr>
                                ))}
                                {stats.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="p-8 text-center text-slate-500 italic">Chưa có dữ liệu cho tháng này.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="mt-4 text-xs text-slate-400 italic text-right mb-8">
                    * Bảng điểm được cập nhật tự động theo cơ cấu điểm ở trên.
                </div>
            </div>
        </div>
    );
}