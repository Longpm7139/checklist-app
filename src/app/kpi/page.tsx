'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart2, Medal, TrendingUp, UserCheck, Calendar, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { useUser } from '@/providers/UserProvider';

interface KPIRow {
    userId: number;
    code: string;
    name: string;
    inspectionCount: number;
    fixCount: number;
    incidentCount: number;
    maintenanceCount: number;
    fastCheckCount: number; // Warning count
    score: number; // Simple score for ranking
}

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

    useEffect(() => {
        if (!monthFilter) return;

        // 1. Data Loading
        // Since we are using API for users but LocalStorage for logs, we might need to fetch users from API or LocalStorage?
        // Actually, we can just use localStorage 'checklist_logs' and 'checklist_fixed_history' and aggregate by name/code.
        // But to list ALL users (even those who did nothing), we need the user list.
        // Let's fetch /api/users to get the full roster.

        const fetchAndCalculate = async () => {
            try {
                // Get Users
                const res = await fetch('/api/users');
                const data = await res.json();
                const allUsers: any[] = data.users || [];

                // Get Logs and History
                const logs = JSON.parse(localStorage.getItem('checklist_logs') || '[]');
                const history = JSON.parse(localStorage.getItem('checklist_fixed_history') || '[]');
                const incidents = JSON.parse(localStorage.getItem('checklist_incidents') || '[]');

                // Filter by Month
                const [year, month] = monthFilter.split('-');

                const filteredLogs = logs.filter((l: any) => {
                    // timestamp format "HH:mm dd/MM/yyyy"
                    const datePart = l.timestamp.split(' ')[1];
                    const [d, m, y] = datePart.split('/');
                    return m === month && y === year;
                });

                const filteredHistory = history.filter((h: any) => {
                    // resolvedAt format "HH:mm dd/MM/yyyy"
                    if (!h.resolvedAt) return false;
                    const datePart = h.resolvedAt.split(' ')[1];
                    const [d, m, y] = datePart.split('/');
                    return m === month && y === year;
                });

                const filteredIncidents = incidents.filter((i: any) => {
                    // resolvedAt format "HH:mm dd/MM/yyyy"
                    if (!i.resolvedAt || i.status !== 'RESOLVED') return false;
                    const datePart = i.resolvedAt.split(' ')[1];
                    const [d, m, y] = datePart.split('/');
                    return m === month && y === year;
                });

                const tasks = JSON.parse(localStorage.getItem('checklist_maintenance') || '[]');
                const filteredTasks = tasks.filter((t: any) => {
                    if (!t.completedAt || t.status !== 'COMPLETED') return false;
                    const datePart = t.completedAt.split(' ')[1];
                    const [d, m, y] = datePart.split('/');
                    return m === month && y === year;
                });

                // Calculate Stats per User
                const calculatedStats = allUsers.map(u => {
                    // Match by name or code. Logs mainly saved name/code.
                    // Ideally use code if available logs have it.
                    // Currently logs save: inspectorName, inspectorCode (from my earlier edit).
                    // If inspectorCode is missing (old logs), fallback to name.

                    const userInspections = filteredLogs.filter((l: any) =>
                        (l.inspectorCode === u.code) || (l.inspectorName === u.name)
                    ).length;

                    const userFixes = filteredHistory.filter((h: any) =>
                        (h.inspectorName === u.name) // History might not have code yet, relies on name
                    ).length;


                    // NEW: Incident Fixes matching User Name
                    // Check if user is the main resolver OR in the participants list
                    const userIncidents = filteredIncidents.filter((i: any) =>
                        (i.resolvedBy === u.name) || (i.participants && i.participants.includes(u.name))
                    ).length;

                    // NEW: Maintenance Tasks (Check if u.code is in assignees array)
                    const userMaintenance = filteredTasks.filter((t: any) =>
                        (t.assignees && t.assignees.includes(u.code)) || // New array check
                        (t.assignedTo === u.code) // Fallback for old single assign tasks
                    ).length;

                    // WARNING: Fast Checks (< 30s)
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
                        maintenanceCount: userMaintenance,
                        fastCheckCount: fastChecks,
                        score: (userInspections * 1) + (userFixes * 2) + (userIncidents * 5) + (userMaintenance * 10) - (fastChecks * 5) // Maintenance = 10 pts
                    };
                });

                // Sort by Score DESC
                calculatedStats.sort((a, b) => b.score - a.score);

                setStats(calculatedStats);

            } catch (err) {
                console.error("Error calculating KPI:", err);
            }
        };

        fetchAndCalculate();

    }, [monthFilter]);

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

                    <div className="w-full md:w-auto bg-white p-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                        <Calendar size={18} className="text-slate-500 ml-2" />
                        <span className="text-sm font-semibold text-slate-700">Tháng:</span>
                        <input
                            type="month"
                            value={monthFilter}
                            onChange={(e) => setMonthFilter(e.target.value)}
                            className="outline-none text-slate-800 font-bold bg-transparent"
                        />
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
                                <th className="p-4 text-center">Mã NV</th>
                                <th className="p-4 text-center">Lượt kiểm tra</th>
                                <th className="p-4 text-center">Lỗi đã sửa</th>
                                <th className="p-4 text-center text-purple-600">Sự cố xử lý</th>
                                <th className="p-4 text-center text-blue-800">Bảo trì</th>
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
                                    <td className="p-4 font-bold text-slate-800">{row.name}</td>
                                    <td className="p-4 text-center font-mono text-xs text-slate-500">{row.code}</td>
                                    <td className="p-4 text-center font-medium text-blue-600">{row.inspectionCount}</td>
                                    <td className="p-4 text-center font-medium text-green-600">{row.fixCount}</td>
                                    <td className="p-4 text-center font-bold text-purple-600">{row.incidentCount > 0 ? row.incidentCount : '-'}</td>
                                    <td className="p-4 text-center font-bold text-blue-800">{row.maintenanceCount > 0 ? row.maintenanceCount : '-'}</td>
                                    <td className="p-4 text-center font-bold text-red-500">{row.fastCheckCount > 0 ? row.fastCheckCount : '-'}</td>
                                    <td className="p-4 text-center font-bold text-slate-900">{row.score}</td>
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
                    * Công thức điểm: Kiểm tra = 1, Sửa lỗi = 2, Sự cố = 5, Bảo trì = 10, Làm ẩu = -5.
                </div>
            </div>
        </div>
    );
}
