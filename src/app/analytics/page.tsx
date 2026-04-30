'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Calendar, BarChart2, TrendingUp, AlertTriangle,
    ChevronRight, Filter, Download, Info, Package, CheckCircle
} from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import {
    subscribeToLogs,
    subscribeToSystems,
    subscribeToCategories
} from '@/lib/firebase';
import { SystemCheck, SystemCategory } from '@/lib/types';

export default function AnalyticsPage() {
    const router = useRouter();

    // Data State
    const [logs, setLogs] = useState<any[]>([]);
    const [systems, setSystems] = useState<SystemCheck[]>([]);
    const [categories, setCategories] = useState<SystemCategory[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Filter State (Default to current month)
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

    useEffect(() => {
        const unsubLogs = subscribeToLogs(setLogs);
        const unsubSystems = subscribeToSystems(setSystems);
        const unsubCategories = subscribeToCategories(setCategories);

        // Initial load check
        const checkLoaded = setTimeout(() => setIsLoaded(true), 1000);

        return () => {
            unsubLogs();
            unsubSystems();
            unsubCategories();
            clearTimeout(checkLoaded);
        };
    }, []);

    // --- STATS CALCULATION ---
    const stats = useMemo(() => {
        const [year, month] = selectedMonth.split('-');

        // Helper: parse timestamp to Date
        const parseTS = (ts: string): Date | null => {
            if (!ts) return null;
            try {
                const parts = ts.split(/[/, : ]+/).filter(Boolean);
                const yearIdx = parts.findIndex(p => p.length === 4);
                if (yearIdx === -1) return null;
                let d: number, m: number, y: number, h = 0, min = 0;
                if (yearIdx === 4) {
                    h = parseInt(parts[0]); min = parseInt(parts[1]);
                    d = parseInt(parts[2]); m = parseInt(parts[3]) - 1; y = parseInt(parts[4]);
                } else {
                    d = parseInt(parts[0]); m = parseInt(parts[1]) - 1; y = parseInt(parts[2]);
                    h = parseInt(parts[3] || '0'); min = parseInt(parts[4] || '0');
                }
                return new Date(y, m, d, h, min);
            } catch { return null; }
        };

        // 1. Filter logs for the selected month
        const monthLogs = logs.filter(log => {
            if (!log.timestamp) return false;
            const parts = log.timestamp.split(' ');
            const datePart = parts.find((p: string) => p.includes('/'));
            if (datePart) {
                const [, m, y] = datePart.split('/');
                return m === month && y === year;
            }
            return false;
        });

        // FIX 1: Tổng lượt kiểm tra = số ca duy nhất × 11 (không phải số log)
        const shiftKeys = new Set<string>();
        monthLogs.forEach(log => {
            const d = parseTS(log.timestamp);
            if (!d) return;
            const h = d.getHours();
            const shift = (h >= 7 && h < 19) ? 'DAY' : 'NIGHT';
            // Ca đêm 00:00-06:59 thuộc ngày hôm trước
            const dayRef = new Date(d);
            if (h < 7) dayRef.setDate(dayRef.getDate() - 1);
            const key = `${dayRef.getFullYear()}-${String(dayRef.getMonth() + 1).padStart(2, '0')}-${String(dayRef.getDate()).padStart(2, '0')}_${shift}`;
            shiftKeys.add(key);
        });
        const totalInspections = shiftKeys.size * 11;

        // FIX 2: NOK logs chỉ lấy trong tháng
        const nokLogs = monthLogs.filter(log => log.result === 'NOK');

        // FIX 3: Mỗi hệ thống NOK chỉ tính cho người phát hiện ĐẦU TIÊN
        // (tránh đếm trùng khi nhiều người "Lưu" tạo log NOK dưới tên mình)
        const nokLogsSorted = [...nokLogs]
            .filter(l => l.systemId && l.timestamp)
            .sort((a, b) => {
                const da = parseTS(a.timestamp);
                const db = parseTS(b.timestamp);
                return (da?.getTime() || 0) - (db?.getTime() || 0);
            });

        // Map systemId → lần phát hiện đầu tiên (chỉ đếm 1 lần / hệ thống trong tháng)
        const firstNokOccurrence = new Map<string, { name: string; timestamp: string; categoryId: string }>();
        nokLogsSorted.forEach(log => {
            const sysId = log.systemId || 'unknown';
            if (!firstNokOccurrence.has(sysId)) {
                const sys = systems.find(s => s.id === sysId);
                firstNokOccurrence.set(sysId, {
                    name: log.systemName || sysId,
                    timestamp: log.timestamp,
                    categoryId: sys?.categoryId || ''
                });
            }
        });

        // FIX 4: Số lần phát hiện lỗi = số hệ thống duy nhất bị NOK (không phải số log)
        const uniqueNokCount = firstNokOccurrence.size;

        // FIX 5: Xếp hạng hệ thống theo số lần (unique occurrences per system, not log count)
        const sortedSystems = Array.from(firstNokOccurrence.entries()).map(([id, info]) => ({
            id,
            name: info.name,
            count: 1, // Mỗi hệ thống chỉ đếm 1 lần phát hiện trong tháng
            categoryId: info.categoryId,
            lastFault: info.timestamp
        })).sort((a, b) => b.count - a.count);

        // FIX 6: Thống kê nhóm = số hệ thống duy nhất bị NOK trong nhóm
        const catCounts: Record<string, { id: string, name: string, count: number }> = {};
        firstNokOccurrence.forEach((info) => {
            const catId = info.categoryId || 'unknown';
            if (!catCounts[catId]) {
                const cat = categories.find(c => c.id === catId);
                catCounts[catId] = { id: catId, name: cat?.name || 'Chưa phân loại', count: 0 };
            }
            catCounts[catId].count++;
        });

        const sortedCategories = Object.values(catCounts).sort((a, b) => b.count - a.count);

        return {
            monthLogsCount: totalInspections,    // Số ca × 11
            nokCount: uniqueNokCount,             // Số hệ thống NOK duy nhất
            sortedSystems,
            sortedCategories,
            topSystem: sortedSystems[0] || null,
            topCategory: sortedCategories[0] || null
        };
    }, [logs, systems, categories, selectedMonth]);

    const handleExport = () => {
        const wb = XLSX.utils.book_new();
        const data = stats.sortedSystems.map((s, idx) => ({
            "STT": idx + 1,
            "Tên Hệ Thống": s.name,
            "Nhóm": categories.find(c => c.id === s.categoryId)?.name || 'N/A',
            "Số lần lỗi (tháng)": s.count,
            "Lỗi gần nhất": s.lastFault
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Thống kê lỗi");
        XLSX.writeFile(wb, `BaoCao_XuHuongLoi_${selectedMonth}.xlsx`);
    };

    if (!isLoaded) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900 overflow-x-hidden">
            <div className="max-w-6xl mx-auto">
                <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/')}
                            className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 hover:bg-slate-100 transition-all active:scale-95"
                        >
                            <ArrowLeft size={24} className="text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                                <BarChart2 className="text-blue-600" /> Phân tích xu hướng lỗi
                            </h1>
                            <p className="text-sm text-slate-500 font-medium">Thống kê dữ liệu hỏng hóc và xuống cấp hệ thống</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:flex-none">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm w-full"
                            />
                        </div>
                        <button
                            onClick={handleExport}
                            className="p-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg shadow-green-100 transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
                        >
                            <Download size={18} /> <span className="hidden sm:inline">Xuất Excel</span>
                        </button>
                    </div>
                </header>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Tổng lượt kiểm tra</div>
                        <div className="flex items-end justify-between">
                            <div className="text-3xl font-black text-slate-800">{stats.monthLogsCount}</div>
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><CheckCircle size={20} /></div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <div className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">Số lần phát hiện lỗi</div>
                        <div className="flex items-end justify-between">
                            <div className="text-3xl font-black text-red-600">{stats.nokCount}</div>
                            <div className="p-2 bg-red-50 text-red-600 rounded-xl"><AlertTriangle size={20} /></div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <div className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">Hệ thống lỗi nhất</div>
                        <div className="flex items-end justify-between">
                            <div className="text-lg font-black text-slate-800 line-clamp-1">{stats.topSystem?.name || 'N/A'}</div>
                            <div className="text-sm font-bold text-amber-600 ml-2">({stats.topSystem?.count || 0})</div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <div className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Nhóm hay lỗi nhất</div>
                        <div className="flex items-end justify-between">
                            <div className="text-lg font-black text-slate-800 line-clamp-1">{stats.topCategory?.name || 'N/A'}</div>
                            <div className="text-sm font-bold text-purple-600 ml-2">({stats.topCategory?.count || 0})</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Top 10 Faulty Systems Chart */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-black text-slate-800 uppercase text-sm tracking-widest flex items-center gap-2">
                                <TrendingUp size={16} className="text-red-500" /> Hệ thống hỏng hóc cao nhất
                            </h2>
                            <span className="text-[10px] font-bold text-slate-400">Dữ liệu tháng {selectedMonth.split('-').reverse().join('/')}</span>
                        </div>

                        <div className="space-y-4">
                            {stats.sortedSystems.slice(0, 10).map((s, idx) => {
                                const maxCount = stats.sortedSystems[0]?.count || 1;
                                const percentage = (s.count / maxCount) * 100;

                                return (
                                    <div key={s.id} className="group">
                                        <div className="flex justify-between text-xs font-bold mb-1.5 gap-2">
                                            <span className="text-slate-700 truncate">{idx + 1}. {s.name}</span>
                                            <span className="text-slate-500 whitespace-nowrap">{s.count} lỗi</span>
                                        </div>
                                        <div className="h-6 w-full bg-slate-50 rounded-lg overflow-hidden flex items-center px-0.5 border border-slate-100">
                                            <div
                                                className={clsx(
                                                    "h-4 rounded-md transition-all duration-1000 ease-out flex items-center px-2",
                                                    idx === 0 ? "bg-red-500 shadow-sm shadow-red-100" :
                                                        idx < 3 ? "bg-orange-500 shadow-sm shadow-orange-100" :
                                                            "bg-amber-400"
                                                )}
                                                style={{ width: `${Math.max(percentage, 5)}%` }}
                                            >
                                                {percentage > 15 && <span className="text-[10px] text-white font-black">{Math.round(percentage)}%</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {stats.sortedSystems.length === 0 && (
                                <div className="py-20 text-center text-slate-400 italic text-sm">
                                    Không có dữ liệu lỗi trong tháng này.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Categorical Breakdown */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-black text-slate-800 uppercase text-sm tracking-widest flex items-center gap-2">
                                <Package size={16} className="text-indigo-500" /> Thống kê theo nhóm hệ thống
                            </h2>
                        </div>

                        <div className="space-y-6">
                            {stats.sortedCategories.map((c, idx) => {
                                const maxCatCount = stats.sortedCategories[0]?.count || 1;
                                const percentage = (c.count / maxCatCount) * 100;

                                return (
                                    <div key={c.id}>
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={clsx(
                                                    "w-2 h-2 rounded-full",
                                                    idx === 0 ? "bg-indigo-600" : idx === 1 ? "bg-indigo-400" : "bg-indigo-200"
                                                )}></div>
                                                <span className="text-sm font-bold text-slate-700">{c.name}</span>
                                            </div>
                                            <span className="text-xs font-black text-slate-400">{c.count} lỗi</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                            <div
                                                className="bg-indigo-600 h-full rounded-full"
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}

                            {stats.sortedCategories.length === 0 && (
                                <div className="py-20 text-center text-slate-400 italic text-sm">
                                    Dữ liệu chưa có.
                                </div>
                            )}
                        </div>

                        <div className="mt-8 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                            <div className="flex gap-3">
                                <div className="p-2 bg-indigo-600 text-white rounded-lg h-fit"><Info size={16} /></div>
                                <div>
                                    <div className="text-xs font-bold text-indigo-900 mb-1">Nhận xét nhanh:</div>
                                    <p className="text-xs text-indigo-700 leading-relaxed">
                                        {stats.sortedCategories.length > 0
                                            ? `Nhóm "${stats.sortedCategories[0].name}" có tỷ lệ hỏng hóc cao nhất với ${stats.sortedCategories[0].count} lần ghi nhận.`
                                            : "Hệ thống đang hoạt động ổn định, chưa ghi nhận lỗi tập trung."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detailed Table */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h2 className="font-black text-slate-800 uppercase text-sm tracking-widest flex items-center gap-2">
                            📅 Danh sách chi tiết các hệ thống xuống cấp
                        </h2>
                    </div>
                    <div className="overflow-x-auto pb-4">
                        <table className="w-full text-left min-w-[800px]">
                            <thead>
                                <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                    <th className="px-6 py-4">STT</th>
                                    <th className="px-6 py-4">Tên Hệ Thống</th>
                                    <th className="px-6 py-4">Nhóm</th>
                                    <th className="px-6 py-4 text-center">Số lượt lỗi</th>
                                    <th className="px-6 py-4 text-center">Trạng thái hiện tại</th>
                                    <th className="px-6 py-4">Lần lỗi cuối</th>
                                    <th className="px-6 py-4">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {stats.sortedSystems.map((s, idx) => {
                                    const currentSystem = systems.find(sys => sys.id === s.id);
                                    const isCurrentlyNok = currentSystem?.status === 'NOK';

                                    return (
                                        <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 text-xs font-bold text-slate-400">{idx + 1}</td>
                                            <td className="px-6 py-4 font-bold text-slate-800">{s.name}</td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                                                    {categories.find(c => c.id === s.categoryId)?.name || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={clsx(
                                                    "text-sm font-black",
                                                    s.count >= 5 ? "text-red-600" : s.count >= 3 ? "text-orange-600" : "text-slate-700"
                                                )}>
                                                    {s.count}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {isCurrentlyNok ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-black border border-red-200">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div>
                                                        ĐANG LỖI (NOK)
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-black border border-green-200">
                                                        <CheckCircle size={10} />
                                                        ĐÃ XỬ LÝ (OK)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-mono text-slate-500">{s.lastFault}</td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => router.push(`/check/${s.id}`)}
                                                    className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                                    title="Xem chi tiết thiết bị"
                                                >
                                                    <ChevronRight size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {stats.sortedSystems.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-slate-400 italic text-sm">Không có hệ thống nào gặp lỗi.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
