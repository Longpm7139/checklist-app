'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart2, Medal, TrendingUp, UserCheck, Calendar, AlertTriangle, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import { useUser } from '@/providers/UserProvider';
import { subscribeToLogs, subscribeToHistory, subscribeToIncidents, subscribeToMaintenance, getUsers, resetKPIData } from '@/lib/firebase';

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
    FAULT_FOUND: 2, // New: Inspector who found the issue
    FIX: 2,
    INCIDENT: 5,
    PROJECT_EXEC: 10, // Was Maintenance
    PROJECT_SUP: 5,   // New: Supervision
    NEGLIGENCE: -5    // Fast check
};

export default function KPIPage() {
    const router = useRouter();
    const { user: currentUser } = useUser();
    const [stats, setStats] = useState<KPIRow[]>([]);
    const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

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

        return () => {
            unsubLogs();
            unsubHistory();
            unsubIncidents();
            unsubMaintenance();
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
                    if (datePart.includes('/')) {
                        [d, m, y] = datePart.split('/');
                    } else {
                        [y, m, d] = datePart.split('-');
                    }
                    return Number(m) === Number(month) && Number(y) === Number(year);
                });

                const filteredHistory = history.filter((h: any) => {
                    if (!h.resolvedAt) return false;
                    const parts = h.resolvedAt.split(' ');
                    const datePart = parts.find((p: string) => p.includes('/') || p.includes('-'));
                    if (!datePart) return false;

                    let d, m, y;
                    if (datePart.includes('/')) {
                        [d, m, y] = datePart.split('/');
                    } else {
                        [y, m, d] = datePart.split('-');
                    }
                    return Number(m) === Number(month) && Number(y) === Number(year);
                });

                const filteredIncidents = incidents.filter((i: any) => {
                    if (!i.resolvedAt || i.status !== 'RESOLVED') return false;
                    const parts = i.resolvedAt.split(' ');
                    const datePart = parts.find((p: string) => p.includes('/') || p.includes('-'));
                    if (!datePart) return false;

                    let d, m, y;
                    if (datePart.includes('/')) {
                        [d, m, y] = datePart.split('/');
                    } else {
                        [y, m, d] = datePart.split('-');
                    }
                    return Number(m) === Number(month) && Number(y) === Number(year);
                });

                const filteredTasks = tasks.filter((t: any) => {
                    if (!t.completedAt || t.status !== 'COMPLETED') return false;
                    const parts = t.completedAt.split(' ');
                    const datePart = parts.find((p: string) => p.includes('/') || p.includes('-'));
                    if (!datePart) return false;

                    let d, m, y;
                    if (datePart.includes('/')) {
                        [d, m, y] = datePart.split('/');
                    } else {
                        [y, m, d] = datePart.split('-');
                    }
                    return Number(m) === Number(month) && Number(y) === Number(year);
                });

                // Calculate Stats per User
                const calculatedStats = allUsers.map(u => {
                    // 1. Inspections
                    const userInspections = filteredLogs.filter((l: any) =>
                        (l.inspectorCode === u.code) || (l.inspectorName === u.name)
                    ).length;

                    // 2. Faults Found
                    const userFaultsFound = filteredHistory.filter((h: any) =>
                        (h.inspectorName === u.name)
                    ).length;

                    // 3. Fixes
                    const userFixes = filteredHistory.filter((h: any) =>
                        (h.resolverName === u.name)
                    ).length;

                    // 4. Incidents
                    const userIncidents = filteredIncidents.filter((i: any) =>
                        (i.resolvedBy === u.name) || (i.participants && i.participants.includes(u.name))
                    ).length;

                    // 5. Project Execution
                    const userProjectExec = filteredTasks.filter((t: any) =>
                        (t.assignees && t.assignees.includes(u.code)) ||
                        (t.assignedTo === u.code)
                    ).length;

                    // 6. Project Supervision
                    const userProjectSup = filteredTasks.filter((t: any) =>
                        (t.supervisors && t.supervisors.includes(u.code))
                    ).length;

                    // 7. Negligence (Fast Checks)
                    const fastChecks = filteredLogs.filter((l: any) =>
                        ((l.inspectorCode === u.code) || (l.inspectorName === u.name)) &&
                        l.duration !== undefined && l.duration < 30
                    ).length;

                    return {
                        userId: u.id,
                        code: u.code,
                        name: u.name,
                        inspectionCount: userInspections,
                        fixCount: userFixes,
                        incidentCount: userIncidents,
                        maintenanceCount: userProjectExec,
                        faultFoundCount: userFaultsFound,
                        projectExecCount: userProjectExec,
                        projectSupCount: userProjectSup,
                        fastCheckCount: fastChecks,
                        score: (userInspections * SCORING_RULES.INSPECTION) +
                            (userFaultsFound * SCORING_RULES.FAULT_FOUND) +
                            (userFixes * SCORING_RULES.FIX) +
                            (userIncidents * SCORING_RULES.INCIDENT) +
                            (userProjectExec * SCORING_RULES.PROJECT_EXEC) +
                            (userProjectSup * SCORING_RULES.PROJECT_SUP) +
                            (fastChecks * SCORING_RULES.NEGLIGENCE)
                    };
                });

                // Sort by Score DESC
                calculatedStats.sort((a, b) => b.score - a.score);
                setStats(calculatedStats);

            } catch (err) {
                console.error("Error calculating KPI:", err);
            }
        };

        calculateStats();

    }, [monthFilter, allUsers, logs, history, incidents, tasks]);

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

                {/* Top Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                            <UserCheck size={24} />
                        </div>
                        <div>
                            <div className="text-sm text-slate-500 font-medium">Tổng lượt kiểm tra</div>
                            <div className="text-2xl font-bold text-slate-800">
                                {stats.reduce((acc, curr) => acc + curr.inspectionCount, 0)}
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-full">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <div className="text-sm text-slate-500 font-medium">Tổng lỗi đã sửa</div>
                            <div className="text-2xl font-bold text-slate-800">
                                {stats.reduce((acc, curr) => acc + curr.fixCount, 0)}
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-amber-100 text-amber-600 rounded-full">
                            <Medal size={24} />
                        </div>
                        <div>
                            <div className="text-sm text-slate-500 font-medium">Nhân viên xuất sắc</div>
                            <div className="text-lg font-bold text-slate-800 truncate max-w-[150px]" title={stats[0]?.name}>
                                {stats.length > 0 ? stats[0].name : '-'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* SCORING RULES TABLE */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                    <div className="p-4 bg-slate-100 border-b border-slate-200 font-bold text-slate-700 flex items-center gap-2">
                        Cơ cấu tính điểm KPI
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-px bg-slate-200">
                        <div className="bg-white p-3 text-center">
                            <div className="text-xs text-slate-500 uppercase font-bold">Kiểm tra</div>
                            <div className="text-blue-600 font-bold text-lg">+{SCORING_RULES.INSPECTION}</div>
                        </div>
                        <div className="bg-white p-3 text-center">
                            <div className="text-xs text-slate-500 uppercase font-bold">Phát hiện lỗi</div>
                            <div className="text-indigo-600 font-bold text-lg">+{SCORING_RULES.FAULT_FOUND}</div>
                        </div>
                        <div className="bg-white p-3 text-center">
                            <div className="text-xs text-slate-500 uppercase font-bold">Sửa lỗi</div>
                            <div className="text-green-600 font-bold text-lg">+{SCORING_RULES.FIX}</div>
                        </div>
                        <div className="bg-white p-3 text-center">
                            <div className="text-xs text-slate-500 uppercase font-bold">Sự cố</div>
                            <div className="text-purple-600 font-bold text-lg">+{SCORING_RULES.INCIDENT}</div>
                        </div>
                        <div className="bg-white p-3 text-center">
                            <div className="text-xs text-slate-500 uppercase font-bold">Thực hiện DA</div>
                            <div className="text-amber-600 font-bold text-lg">+{SCORING_RULES.PROJECT_EXEC}</div>
                        </div>
                        <div className="bg-white p-3 text-center">
                            <div className="text-xs text-slate-500 uppercase font-bold">Giám sát DA</div>
                            <div className="text-teal-600 font-bold text-lg">+{SCORING_RULES.PROJECT_SUP}</div>
                        </div>
                        <div className="bg-white p-3 text-center">
                            <div className="text-xs text-slate-500 uppercase font-bold text-red-600">Làm ẩu</div>
                            <div className="text-red-600 font-bold text-lg">{SCORING_RULES.NEGLIGENCE}</div>
                        </div>
                    </div>
                    <div className="p-2 bg-slate-50 text-xs text-slate-500 text-center italic border-t border-slate-200">
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

                {/* Leaderboard Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
                                <th className="p-4 text-center text-amber-600">Thi công</th>
                                <th className="p-4 text-center text-teal-600">Giám sát</th>
                                <th className="p-4 text-center text-red-600">Làm ẩu</th>
                                <th className="p-4 text-center">Tổng điểm</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {stats.map((row, idx) => (
                                <tr key={row.userId} className={clsx("hover:bg-slate-50 transition", idx < 3 ? "bg-amber-50/30" : "")}>
                                    <td className="p-4 text-center">
                                        <div className={clsx(
                                            "w-8 h-8 rounded-full flex items-center justify-center font-bold mx-auto",
                                            idx === 0 ? "bg-yellow-400 text-white shadow-sm" :
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
                                    <td className="p-4 text-center font-bold text-amber-600">{row.projectExecCount || '-'}</td>
                                    <td className="p-4 text-center font-bold text-teal-600">{row.projectSupCount || '-'}</td>
                                    <td className="p-4 text-center font-bold text-red-500">{row.fastCheckCount || '-'}</td>
                                    <td className="p-4 text-center font-bold text-slate-900 text-lg">{row.score}</td>
                                </tr>
                            ))}
                            {stats.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-500 italic">Chưa có dữ liệu cho tháng này.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4 text-xs text-slate-400 italic text-right">
                    * Bảng điểm được cập nhật tự động theo cơ cấu điểm ở trên.
                </div>
            </div>
        </div>
    );
}
