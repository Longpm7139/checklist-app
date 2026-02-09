'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Filter, Download, Calendar, User, Search, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import { subscribeToLogs, subscribeToIncidents, subscribeToMaintenance, getUsers } from '@/lib/firebase'; // Added imports

interface LogEntry {
    id: string;
    timestamp: string;
    inspectorName: string;
    inspectorCode: string;
    systemId: string;
    systemName: string;
    result: 'OK' | 'NOK';
    note: string;
}

export default function ReportsPage() {
    const router = useRouter();

    // Data State
    const [logs, setLogs] = useState<any[]>([]);
    const [incidents, setIncidents] = useState<any[]>([]);
    const [maintenance, setMaintenance] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);

    // Filter State
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
    const [inspectorFilter, setInspectorFilter] = useState('');
    const [filteredLogs, setFilteredLogs] = useState<any[]>([]);

    // Load Data from Firebase
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const u = await getUsers();
                setUsers(u);
            } catch (err) {
                console.error("Failed to load users", err);
            }
        };
        fetchUsers();

        const unsubLogs = subscribeToLogs((data) => setLogs(data));
        const unsubIncidents = subscribeToIncidents((data) => setIncidents(data));
        const unsubMaintenance = subscribeToMaintenance((data) => setMaintenance(data));

        return () => {
            unsubLogs();
            unsubIncidents();
            unsubMaintenance();
        };
    }, []);

    // Filter Logic
    useEffect(() => {
        if (!dateFilter) return;
        const [filterYear, filterMonth, filterDay] = dateFilter.split('-');

        // Helper to parse date string "HH:mm dd/MM/yyyy" or ISO
        const isMatchDate = (timestamp: string) => {
            if (!timestamp) return false;
            // Handle "HH:mm dd/MM/yyyy"
            const parts = timestamp.split(' ');
            const datePart = parts.find(p => p.includes('/'));
            if (datePart) {
                const [d, m, y] = datePart.split('/');
                return d === filterDay && m === filterMonth && y === filterYear;
            }
            // Handle ISO or other formats if needed
            return false;
        };

        let result = logs.filter(l => isMatchDate(l.timestamp));

        if (inspectorFilter) {
            result = result.filter(l => l.inspectorName === inspectorFilter);
        }

        // Sort by timestamp desc
        result.sort((a, b) => {
            // quick sort by string comparison or better parsing if needed. 
            // "HH:mm dd/MM/yyyy" - for same day, just compare HH:mm
            const timeA = a.timestamp.split(' ')[0];
            const timeB = b.timestamp.split(' ')[0];
            return timeB.localeCompare(timeA);
        });

        setFilteredLogs(result);

    }, [logs, dateFilter, inspectorFilter]);

    // Statistics Calculation
    const stats = {
        totalChecks: filteredLogs.length,
        okCount: filteredLogs.filter(l => l.result === 'OK').length,
        nokCount: filteredLogs.filter(l => l.result === 'NOK').length,
        systems: new Set(filteredLogs.map(l => l.systemName)).size
    };

    const handleExport = () => {
        // Prepare Data for Excel
        const [filterYear, filterMonth] = dateFilter.split('-');

        // 1. Logs Sheet
        const logData = filteredLogs.map(l => ({
            "Thời gian": l.timestamp,
            "Người thực hiện": l.inspectorName,
            "Mã NV": l.inspectorCode,
            "Hệ thống": l.systemName,
            "Kết quả": l.result,
            "Ghi chú": l.note
        }));

        // 2. Incidents Sheet (Filtered by Month)
        const incidentData = incidents.filter(inc => {
            const parts = inc.createdAt.split(' ');
            const datePart = parts.find((p: string) => p.includes('/'));
            if (!datePart) return false;
            const [d, m, y] = datePart.split('/');
            return m === filterMonth && y === filterYear;
        }).map(inc => ({
            "Ngày báo": inc.createdAt,
            "Tên sự cố": inc.title,
            "Hệ thống": inc.systemName,
            "Người báo": inc.reportedBy,
            "Trạng thái": inc.status === 'RESOLVED' ? 'Đã xong' : 'Đang xử lý',
            "Người xử lý": inc.resolvedBy || '',
            "Ghi chú": inc.resolutionNote || ''
        }));

        // 3. Maintenance Sheet (Filtered by Month)
        const maintenanceData = maintenance.filter(task => {
            const [y, m, d] = task.deadline.split('-'); // deadline is YYYY-MM-DD
            return m === filterMonth && y === filterYear;
        }).map(task => ({
            "Công việc": task.title,
            "Hạn chót": task.deadline,
            "Trạng thái": task.status,
            "Giao cho": task.assigneeNames?.join(', '),
            "Hoàn thành lúc": task.completedAt || ''
        }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(logData), "NhatKy_KiemTra");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(incidentData), "SuCo_BatThuong");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(maintenanceData), "BaoTri_DinhKy");

        XLSX.writeFile(wb, `BaoCao_HoatDong_${dateFilter}.xlsx`);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-900">
            <div className="max-w-6xl mx-auto">
                <header className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/')} className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-100">
                            <ArrowLeft size={20} className="text-slate-600" />
                        </button>
                        <h1 className="text-2xl font-bold uppercase text-slate-800">Nhật Ký Hoạt Động</h1>
                    </div>
                </header>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1"><Calendar size={14} /> Chọn Ngày</label>
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1"><User size={14} /> Nhân viên</label>
                        <select
                            value={inspectorFilter}
                            onChange={(e) => setInspectorFilter(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">-- Tất cả nhân viên --</option>
                            {users.map(u => (
                                <option key={u.id} value={u.name}>{u.name} ({u.code})</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-end justify-end">
                        <button
                            onClick={handleExport}
                            className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2 shadow transition"
                        >
                            <Download size={18} /> Xuất Báo Cáo Excel
                        </button>
                    </div>
                </div>

                {/* Statistics Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="text-xs text-blue-600 font-bold uppercase mb-1">Tổng lượt kiểm tra</div>
                        <div className="text-2xl font-bold text-slate-800">{stats.totalChecks}</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                        <div className="text-xs text-purple-600 font-bold uppercase mb-1">Số hệ thống đã KT</div>
                        <div className="text-2xl font-bold text-slate-800">{stats.systems}</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                        <div className="text-xs text-green-600 font-bold uppercase mb-1">Kết quả tỐT (OK)</div>
                        <div className="text-2xl font-bold text-slate-800 max-w-[150px]">{stats.okCount}</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                        <div className="text-xs text-red-600 font-bold uppercase mb-1">Phát hiện lỗi (NOK)</div>
                        <div className="text-2xl font-bold text-slate-800">{stats.nokCount}</div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-xs border-b border-slate-200">
                            <tr>
                                <th className="p-4 w-40">Thời gian</th>
                                <th className="p-4 w-48">Người thực hiện</th>
                                <th className="p-4">Hệ thống / Thiết bị</th>
                                <th className="p-4 w-32 text-center">Kết quả</th>
                                <th className="p-4">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {filteredLogs.length > 0 ? (
                                filteredLogs.map((log, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-4 font-mono text-slate-600 whitespace-nowrap">{log.timestamp}</td>
                                        <td className="p-4 font-bold text-blue-800">
                                            {log.inspectorName}
                                            <div className="text-xs font-normal text-slate-400">{log.inspectorCode}</div>
                                        </td>
                                        <td className="p-4 font-medium">{log.systemName}</td>
                                        <td className="p-4 text-center">
                                            <span className={clsx(
                                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border",
                                                log.result === 'OK' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                                            )}>
                                                {log.result === 'OK' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                                {log.result}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-500 italic">
                                            {log.note || '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search size={32} className="text-slate-300" />
                                            <span className="italic">Không tìm thấy dữ liệu nào phù hợp.</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
