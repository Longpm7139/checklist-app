'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Search, ChevronRight, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useUser } from '@/providers/UserProvider';
import { subscribeToSystems, subscribeToDeviceLogs } from '@/lib/firebase';

export default function DeviceLogListPage() {
    const router = useRouter();
    const { user } = useUser();
    const [systems, setSystems] = useState<any[]>([]);
    const [deviceLogs, setDeviceLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categories, setCategories] = useState<any[]>([]);

    useEffect(() => {
        const unsubSystems = subscribeToSystems((data) => {
            setSystems(data);
            setLoading(false);
        });
        const unsubLogs = subscribeToDeviceLogs(setDeviceLogs);
        return () => { unsubSystems(); unsubLogs(); };
    }, []);

    const filteredSystems = systems.filter(s =>
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getLogStatus = (systemId: string) => {
        const log = deviceLogs.find(l => l.systemId === systemId);
        if (!log) return 'empty';
        const fields = [log.brand, log.serialNumber, log.location, log.purpose];
        const filled = fields.filter(f => f && f.trim()).length;
        if (filled === 0) return 'empty';
        if (filled < fields.length) return 'partial';
        return 'complete';
    };

    // Group systems by a rough category via ID prefix
    const grouped = filteredSystems.reduce((acc: Record<string, any[]>, s) => {
        const prefix = s.id?.match(/^([A-Z]+)/)?.[1] || '?';
        if (!acc[prefix]) acc[prefix] = [];
        acc[prefix].push(s);
        return acc;
    }, {});

    const statusConfig = {
        empty: { label: 'Chưa nhập', icon: <Clock size={14} />, color: 'text-slate-400 bg-slate-50 border-slate-200' },
        partial: { label: 'Đang nhập', icon: <AlertCircle size={14} />, color: 'text-amber-600 bg-amber-50 border-amber-200' },
        complete: { label: 'Hoàn tất', icon: <CheckCircle size={14} />, color: 'text-green-600 bg-green-50 border-green-200' },
    };

    const completedCount = systems.filter(s => getLogStatus(s.id) === 'complete').length;
    const partialCount = systems.filter(s => getLogStatus(s.id) === 'partial').length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 font-sans">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
                    <button
                        onClick={() => router.push('/')}
                        className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                    >
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <BookOpen size={18} className="text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-slate-800 text-base leading-tight">Sổ Lý Lịch Thiết Bị</h1>
                            <p className="text-[11px] text-slate-500">ACV-LLTB01 — Chọn thiết bị để xem hồ sơ</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-5">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="bg-white rounded-xl border border-slate-200 p-3 text-center shadow-sm">
                        <div className="text-2xl font-black text-slate-700">{systems.length}</div>
                        <div className="text-[10px] text-slate-500 font-medium">Tổng TB</div>
                    </div>
                    <div className="bg-white rounded-xl border border-green-200 p-3 text-center shadow-sm">
                        <div className="text-2xl font-black text-green-600">{completedCount}</div>
                        <div className="text-[10px] text-green-600 font-medium">Hoàn tất</div>
                    </div>
                    <div className="bg-white rounded-xl border border-amber-200 p-3 text-center shadow-sm">
                        <div className="text-2xl font-black text-amber-600">{partialCount}</div>
                        <div className="text-[10px] text-amber-600 font-medium">Đang nhập</div>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-5">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input
                        type="text"
                        placeholder="Tìm theo tên hoặc mã thiết bị (A1, B2...)..."
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Device List */}
                {loading ? (
                    <div className="text-center py-16 text-slate-400">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        Đang tải danh sách thiết bị...
                    </div>
                ) : (
                    <div className="space-y-5">
                        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([prefix, groupSystems]) => (
                            <div key={prefix} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-4 py-2.5 bg-gradient-to-r from-slate-700 to-slate-800 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-white font-black text-sm">{prefix}</span>
                                    <span className="text-white font-semibold text-sm">{groupSystems[0]?.categoryId || 'Nhóm ' + prefix}</span>
                                    <span className="ml-auto text-white/60 text-xs">{groupSystems.length} thiết bị</span>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {groupSystems.map(system => {
                                        const status = getLogStatus(system.id);
                                        const cfg = statusConfig[status as keyof typeof statusConfig];
                                        return (
                                            <button
                                                key={system.id}
                                                onClick={() => router.push(`/device-log/${system.id}`)}
                                                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50/50 transition-colors text-left group"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                                    {system.id}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-slate-800 text-sm truncate">{system.name}</div>
                                                    <div className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border mt-0.5 ${cfg.color}`}>
                                                        {cfg.icon}
                                                        {cfg.label}
                                                    </div>
                                                </div>
                                                <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        {filteredSystems.length === 0 && (
                            <div className="text-center py-12 text-slate-400">
                                <Search size={32} className="mx-auto mb-2 opacity-40" />
                                <p>Không tìm thấy thiết bị nào</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
