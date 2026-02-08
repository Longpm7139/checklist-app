'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Filter, Download, Calendar } from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx';

interface LogEntry {
    id: string;
    timestamp: string; // formatted string
    inspectorName: string;
    inspectorCode: string;
    systemId: string;
    systemName: string;
    result: 'OK' | 'NOK';
    note: string;
}

export default function ReportsPage() {
    const router = useRouter();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);

    // Filters
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]); // Default Today YYYY-MM-DD
    const [inspectorFilter, setInspectorFilter] = useState('');
    const [uniqueInspectorNames, setUniqueInspectorNames] = useState<string[]>([]);

    useEffect(() => {
        // Load logs
        const storedLogs = JSON.parse(localStorage.getItem('checklist_logs') || '[]');
        // Logs are stored as they are added, so likely in chronological order. Reverse to see newest first.
        const reversed = storedLogs.reverse();
        setLogs(reversed);

        // Extract unique inspectors for filter info
        const names = Array.from(new Set(reversed.map((l: LogEntry) => l.inspectorName))).filter(Boolean) as string[];
        setUniqueInspectorNames(names);
    }, []);

    useEffect(() => {
        // Filtering Logic
        let result = logs;

        if (dateFilter) {
            // Log timestamp format: "HH:mm dd/MM/yyyy"
            // Filter format: "yyyy-MM-dd"
            // Need to parse log timestamp to compare dates.
            const [filterYear, filterMonth, filterDay] = dateFilter.split('-');

            result = result.filter(log => {
                const parts = log.timestamp.split(' '); // ["HH:mm", "dd/MM/yyyy"]
                if (parts.length < 2) return false;
                const datePart = parts[1]; // "dd/MM/yyyy"
                const [d, m, y] = datePart.split('/');

                return d === filterDay && m === filterMonth && y === filterYear;
            });
        }

        if (inspectorFilter) {
            result = result.filter(log => log.inspectorName === inspectorFilter);
        }

        setFilteredLogs(result);
    }, [logs, dateFilter, inspectorFilter]);

    // ... existing code ...

    const handleExport = () => {
        // 1. Prepare Data

        // Logs (Already filtered by date)
        const logData = filteredLogs.map(l => ({
            "Thời gian": l.timestamp,
            "Người thực hiện": l.inspectorName,
            "Hệ thống": l.systemName,
            "Kết quả": l.result,
            "Ghi chú": l.note
        }));

        // Incidents (Fetch all and filter by Month of selected date)
        const allIncidents = JSON.parse(localStorage.getItem('checklist_incidents') || '[]');
        const [filterYear, filterMonth] = dateFilter.split('-');

        const incidentData = allIncidents.filter((inc: any) => {
            // Filter by Created Date (Month)
            const [time, date] = inc.createdAt.split(' ');
            const [d, m, y] = date.split('/');
            return m === filterMonth && y === filterYear;
        }).map((inc: any) => ({
            "Ngày báo": inc.createdAt,
            "Tên sự cố": inc.title,
            "Hệ thống": inc.systemName,
            "Người báo": inc.reportedBy,
            "Trạng thái": inc.status === 'RESOLVED' ? 'Đã xong' : 'Đang xử lý',
            "Người xử lý": inc.participants ? inc.participants.join(', ') : inc.resolvedBy,
            "Ghi chú xử lý": inc.resolutionNote || ''
        }));

        // Maintenance (Filter by Month)
        const allMaintenance = JSON.parse(localStorage.getItem('checklist_maintenance') || '[]');
        const maintenanceData = allMaintenance.filter((task: any) => {
            const [y, m, d] = task.deadline.split('-');
            return m === filterMonth && y === filterYear;
        }).map((task: any) => ({
            "Công việc": task.title,
            "Hạn chót": task.deadline,
            "Trạng thái": task.status === 'COMPLETED' ? 'Hoàn thành' : 'Chưa xong',
            "Người làm": task.assigneeNames ? task.assigneeNames.join(', ') : '',
            "Hoàn thành lúc": task.completedAt || '',
            "Ghi chú": task.completedNote || ''
        }));

        // 2. Create Workbook
        const wb = XLSX.utils.book_new();

        // Sheet 1: Logs
        const wsLogs = XLSX.utils.json_to_sheet(logData);
        XLSX.utils.book_append_sheet(wb, wsLogs, "NhatKy_KiemTra");

        // Sheet 2: Incidents
        const wsIncidents = XLSX.utils.json_to_sheet(incidentData);
        XLSX.utils.book_append_sheet(wb, wsIncidents, "SuCo_BatThuong");

        // Sheet 3: Maintenance
        const wsMaintenance = XLSX.utils.json_to_sheet(maintenanceData);
        XLSX.utils.book_append_sheet(wb, wsMaintenance, "BaoTri_DinhKy");

        // 3. Export
        XLSX.writeFile(wb, `BaoCao_TongHop_${dateFilter}.xlsx`);
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
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-end">
                    <div className="w-full md:w-auto">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Chọn Ngày</label>
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="w-full md:w-auto">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Nhân viên</label>
                        <select
                            value={inspectorFilter}
                            onChange={(e) => setInspectorFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-48"
                        >
                            <option value="">Tất cả</option>
                            {uniqueInspectorNames.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="w-full md:w-auto flex-1 flex justify-end">
                        <button
                            onClick={handleExport}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center gap-2 shadow transition"
                        >
                            <Download size={18} /> Xuất Excel
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-sm border-b border-slate-200">
                            <tr>
                                <th className="p-4 w-48">Thời gian</th>
                                <th className="p-4 w-48">Người thực hiện</th>
                                <th className="p-4">Hệ thống</th>
                                <th className="p-4 w-32 text-center">Kết quả</th>
                                <th className="p-4">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredLogs.length > 0 ? (
                                filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50">
                                        <td className="p-4 font-mono text-sm text-slate-600">{log.timestamp}</td>
                                        <td className="p-4 font-bold text-blue-800">{log.inspectorName}</td>
                                        <td className="p-4 font-medium">{log.systemName}</td>
                                        <td className="p-4 text-center">
                                            <span className={clsx(
                                                "px-2 py-1 rounded text-xs font-bold",
                                                log.result === 'OK' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                            )}>
                                                {log.result}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-500 italic text-sm">{log.note}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                                        Không có dữ liệu nào cho ngày đã chọn.
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
