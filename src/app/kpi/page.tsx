'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart2, Medal, TrendingUp, UserCheck, Calendar, AlertTriangle, RotateCcw, Settings } from 'lucide-react';
import clsx from 'clsx';
import { useUser } from '@/providers/UserProvider';
import { subscribeToLogs, subscribeToHistory, subscribeToIncidents, subscribeToMaintenance, getUsers, resetKPIData, subscribeToDuties } from '@/lib/firebase';

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

        return () => {
            unsubLogs();
            unsubHistory();
            unsubIncidents();
            unsubMaintenance();
            unsubDuties();
        };
    }, []);

    // 2. Calculate Stats when Data or Filter Changes
    useEffect(() => {
        if (!monthFilter || allUsers.length === 0) return;

        const calculateStats = () => {
            try {
                // Filter by Month
                const [year, month] = monthFilter.split('-');

                const filteredLogs = logs.filter((l: any) => {
                    if (!l.timestamp) return false;
                    // Try to find parts looking like date dd/MM/yyyy or yyyy-MM-dd
                    const parts = l.timestamp.split(' ');
                    const datePart = parts.find((p: string) => p.includes('/') || p.includes('-'));
                    if (!datePart) return false;

                    let d, m, y;
                    const cleanDatePart = datePart.replace(/[^\d\/\-]/g, '');
                    if (cleanDatePart.includes('/')) {
                        [d, m, y] = cleanDatePart.split('/');
                    } else {
                        [y, m, d] = cleanDatePart.split('-');
                    }
                    return Number(m) === Number(month) && Number(y) === Number(year);
                });

                const filteredHistory = history.filter((h: any) => {
                    if (!h.resolvedAt) return false;
                    const parts = h.resolvedAt.split(' ');
                    const datePart = parts.find((p: string) => p.includes('/') || p.includes('-'));
                    if (!datePart) return false;

                    let d, m, y;
                    const cleanDatePart = datePart.replace(/[^\d\/\-]/g, '');
                    if (cleanDatePart.includes('/')) {
                        [d, m, y] = cleanDatePart.split('/');
                    } else {
                        [y, m, d] = cleanDatePart.split('-');
                    }
                    return Number(m) === Number(month) && Number(y) === Number(year);
                });

                const filteredHistoryCreated = history.filter((h: any) => {
                    if (!h.timestamp) return false;
                    const parts = h.timestamp.split(' ');
                    const datePart = parts.find((p: string) => p.includes('/') || p.includes('-'));
                    if (!datePart) return false;

                    let d, m, y;
                    const cleanDatePart = datePart.replace(/[^\d\/\-]/g, '');
                    if (cleanDatePart.includes('/')) {
                        [d, m, y] = cleanDatePart.split('/');
                    } else {
                        [y, m, d] = cleanDatePart.split('-');
                    }
                    return Number(m) === Number(month) && Number(y) === Number(year);
                });

                const filteredIncidents = incidents.filter((i: any) => {
                    if (!i.resolvedAt || i.status !== 'RESOLVED') return false;
                    const parts = i.resolvedAt.split(' ');
                    const datePart = parts.find((p: string) => p.includes('/') || p.includes('-'));
                    if (!datePart) return false;

                    let d, m, y;
                    const cleanDatePart = datePart.replace(/[^\d\/\-]/g, '');
                    if (cleanDatePart.includes('/')) {
                        [d, m, y] = cleanDatePart.split('/');
                    } else {
                        [y, m, d] = cleanDatePart.split('-');
                    }
                    return Number(m) === Number(month) && Number(y) === Number(year);
                });

                const filteredTasks = tasks.filter((t: any) => {
                    if (!t.completedAt || t.status !== 'COMPLETED') return false;
                    const parts = t.completedAt.split(' ');
                    const datePart = parts.find((p: string) => p.includes('/') || p.includes('-'));
                    if (!datePart) return false;

                    let d, m, y;
                    const cleanDatePart = datePart.replace(/[^\d\/\-]/g, '');
                    if (cleanDatePart.includes('/')) {
                        [d, m, y] = cleanDatePart.split('/');
                    } else {
                        [y, m, d] = cleanDatePart.split('-');
                    }
                    return Number(m) === Number(month) && Number(y) === Number(year);
                });

                // Calculate Stats per User
                const calculatedStats = allUsers.map(u => {
                    // 1. Inspections (TEAM-BASED LOGIC)
                    // Rule: For each day the user is on duty, they get 1 point per unique category inspected by ANY member of the duty team.
                    // Max points per day = 11 (Categories A through K).
                    // Non-duty staff can still inspect but get 0 inspection points.

                    // First, group logs by date
                    const logsByDate: { [date: string]: any[] } = {};
                    filteredLogs.forEach((l: any) => {
                        const datePart = l.timestamp.split(' ').find((p: string) => p.includes('/') || p.includes('-'));
                        if (!datePart) return;

                        let isoDate = "";
                        const cleanDatePart = datePart.replace(/[^\d\/\-]/g, '');
                        if (cleanDatePart.includes('/')) {
                            const [d, m, y] = cleanDatePart.split('/');
                            isoDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                        } else {
                            isoDate = cleanDatePart;
                        }

                        if (!logsByDate[isoDate]) logsByDate[isoDate] = [];
                        logsByDate[isoDate].push(l);
                    });

                    let userInspections = 0;
                    let fastChecksCount = 0;

                    Object.keys(logsByDate).forEach(dateStr => {
                        const dayDuty = duties.find(d => d.date === dateStr);
                        if (!dayDuty) return;

                        // Identify the assigned duty team for this date
                        const teamMembers = dayDuty.assignments?.map((a: any) => a.userCode) || [];
                        const isUserOnDutyToday = teamMembers.includes(u.code);

                        // If NOT on duty, skip inspection points for this day for this user
                        // and also skip fastCheck penalties (only score duty staff for these)
                        if (!isUserOnDutyToday) return;

                        // Count fast checks for this USER on days they are on duty
                        const userLogsOnDuty = logsByDate[dateStr].filter((l: any) =>
                            ((l.inspectorCode === u.code) || (l.inspectorName === u.name))
                        );

                        // Points are awarded: if the duty team created any logs today, both duty members get exactly 11 points.
                        const teamLogs = logsByDate[dateStr].filter((l: any) =>
                            teamMembers.includes(l.inspectorCode)
                        );

                        if (teamLogs.length > 0) {
                            userInspections += 11;
                        }
                    });

                    // 2. Faults Found
                    const userFaultsFound = filteredHistoryCreated.filter((h: any) => {
                        const codes = h.inspectorCode ? (Array.isArray(h.inspectorCode) ? h.inspectorCode : h.inspectorCode.split(',').map((s: string) => s.trim())) : [];
                        const names = h.inspectorName ? (Array.isArray(h.inspectorName) ? h.inspectorName : h.inspectorName.split(',').map((s: string) => s.trim())) : [];
                        return codes.includes(u.code) || names.includes(u.name) || h.inspectorCode === u.code || h.inspectorName === u.name;
                    }).length;

                    // 3. Fixes
                    const userFixes = filteredHistory.filter((h: any) => {
                        const codes = h.resolverCode ? (Array.isArray(h.resolverCode) ? h.resolverCode : h.resolverCode.split(',').map((s: string) => s.trim())) : [];
                        const names = h.resolverName ? (Array.isArray(h.resolverName) ? h.resolverName : h.resolverName.split(',').map((s: string) => s.trim())) : [];
                        return codes.includes(u.code) || names.includes(u.name) || h.resolverCode === u.code || h.resolverName === u.name;
                    }).length;

                    // 4. Incidents
                    const userIncidents = filteredIncidents.filter((i: any) => {
                        const codes = i.resolvedByCode ? (Array.isArray(i.resolvedByCode) ? i.resolvedByCode : i.resolvedByCode.split(',').map((s: string) => s.trim())) : [];
                        const names = i.resolvedBy ? (Array.isArray(i.resolvedBy) ? i.resolvedBy : i.resolvedBy.split(',').map((s: string) => s.trim())) : [];
                        const part = i.participants || [];
                        const partArray = Array.isArray(part) ? part : part.split(',').map((s: string) => s.trim());
                        return codes.includes(u.code) || names.includes(u.name) || partArray.includes(u.name) || partArray.includes(u.code) || i.resolvedByCode === u.code || i.resolvedBy === u.name;
                    }).length;

                    // 5a. Maintenance (Bảo dưỡng)
                    const userMaintenance = filteredTasks.filter((t: any) => {
                        if (t.type === 'PROJECT') return false; // Default undefined is Maintenance
                        const assignees = t.assignees || [];
                        const arr = Array.isArray(assignees) ? assignees : assignees.split(',').map((s: string) => s.trim());
                        return arr.includes(u.code) || arr.includes(u.name);
                    }).length;

                    // 5b. Project Execution (Thi công/Dự án)
                    const userProjectExec = filteredTasks.filter((t: any) => {
                        if (t.type !== 'PROJECT') return false;
                        const assignees = t.assignees || [];
                        const arr = Array.isArray(assignees) ? assignees : assignees.split(',').map((s: string) => s.trim());
                        return arr.includes(u.code) || arr.includes(u.name);
                    }).length;

                    // 6. Project Supervision
                    const userProjectSup = filteredTasks.filter((t: any) => {
                        const supervisors = t.supervisors || [];
                        const arr = Array.isArray(supervisors) ? supervisors : supervisors.split(',').map((s: string) => s.trim());
                        return arr.includes(u.code) || arr.includes(u.name);
                    }).length;

                    // 7. Negligence (Fast Checks) - Already counted above during duty checks
                    const fastChecks = fastChecksCount;

                    return {
                        userId: u.id,
                        code: u.code,
                        name: u.name,
                        inspectionCount: userInspections,
                        fixCount: userFixes,
                        incidentCount: userIncidents,
                        maintenanceCount: userMaintenance,
                        faultFoundCount: userFaultsFound,
                        projectExecCount: userProjectExec,
                        projectSupCount: userProjectSup,
                        fastCheckCount: fastChecks,
                        score: (userInspections * SCORING_RULES.INSPECTION) +
                            (userFaultsFound * SCORING_RULES.FAULT_FOUND) +
                            (userFixes * SCORING_RULES.FIX) +
                            (userIncidents * SCORING_RULES.INCIDENT) +
                            (userMaintenance * SCORING_RULES.MAINTENANCE) +
                            (userProjectExec * SCORING_RULES.PROJECT_EXEC) +
                            (userProjectSup * SCORING_RULES.PROJECT_SUP) +
                            (fastChecks * SCORING_RULES.NEGLIGENCE)
                    };
                });

                // Sort by Score DESC
                calculatedStats.sort((a, b) => b.score - a.score);
                setStats(calculatedStats);

                // --- Calculate Global Total Inspections (Unique categories per team per day) ---
                const logsByDate: { [date: string]: any[] } = {};
                filteredLogs.forEach((l: any) => {
                    const datePart = l.timestamp.split(' ').find((p: string) => p.includes('/') || p.includes('-'));
                    if (!datePart) return;

                    const cleanDatePart = datePart.replace(/[^\d\/\-]/g, '');
                    let isoDate = cleanDatePart.includes('/') ?
                        `${cleanDatePart.split('/')[2]}-${cleanDatePart.split('/')[1].padStart(2, '0')}-${cleanDatePart.split('/')[0].padStart(2, '0')}` :
                        cleanDatePart;

                    if (!logsByDate[isoDate]) logsByDate[isoDate] = [];
                    logsByDate[isoDate].push(l);
                });

                let globalInspections = 0;
                const categoryMap: any = {
                    'A': 'CAT1', 'B': 'CAT2', 'C': 'CAT3', 'D': 'CAT4', 'E': 'CAT5',
                    'F': 'CAT6', 'G': 'CAT7', 'H': 'CAT8', 'I': 'CAT9', 'J': 'CAT10', 'K': 'CAT11'
                };

                Object.keys(logsByDate).forEach(dateStr => {
                    const dayDuty = duties.find(d => d.date === dateStr);
                    if (!dayDuty) return;

                    const teamMembers = dayDuty.assignments?.map((a: any) => a.userCode) || [];
                    const teamLogs = logsByDate[dateStr].filter((l: any) => teamMembers.includes(l.inspectorCode));

                    if (teamLogs.length > 0) {
                        globalInspections += 11;
                    }
                });
                setTotalInspectionsCount(globalInspections);

            } catch (err) {
                console.error("Error calculating KPI:", err);
            }
        };

        calculateStats();

    }, [monthFilter, allUsers, logs, history, incidents, tasks, duties]);

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
                <div className="mt-4 text-xs text-slate-400 italic text-right">
                    * Bảng điểm được cập nhật tự động theo cơ cấu điểm ở trên.
                </div>
            </div>
        </div>
    );
}
