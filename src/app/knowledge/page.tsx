'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, BookOpen, Search, Filter, Clock, User as UserIcon,
    CheckCircle, Camera, ChevronDown, ChevronUp, Siren, AlertTriangle, Zap, Info
} from 'lucide-react';
import { subscribeToIncidents } from '@/lib/firebase';
import { Incident } from '@/lib/types';

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
    CRITICAL: { label: '🔴 Khẩn cấp', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: Siren },
    MEDIUM:   { label: '🟡 Trung bình', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle },
    LOW:      { label: '🟢 Nhẹ', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', icon: Info },
};

function calcDuration(createdAt: string, resolvedAt: string): string {
    try {
        const parse = (s: string) => {
            const parts = s.split(/[/ :]+/);
            // "HH:mm dd/MM/yyyy" → parts: [HH, mm, dd, MM, yyyy]
            const [hh, mm, dd, mo, yyyy] = parts;
            return new Date(Number(yyyy), Number(mo) - 1, Number(dd), Number(hh), Number(mm)).getTime();
        };
        const diff = parse(resolvedAt) - parse(createdAt);
        if (isNaN(diff) || diff < 0) return '';
        const totalMin = Math.round(diff / 60000);
        if (totalMin < 60) return `${totalMin} phút`;
        const h = Math.floor(totalMin / 60), m = totalMin % 60;
        return m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`;
    } catch { return ''; }
}

function KnowledgeCard({ incident }: { incident: Incident & { severity?: string } }) {
    const [expanded, setExpanded] = useState(false);
    const sev = SEVERITY_CONFIG[incident.severity || 'MEDIUM'];
    const duration = incident.resolvedAt ? calcDuration(incident.createdAt, incident.resolvedAt) : '';

    return (
        <div className={`bg-white rounded-2xl shadow-sm border-l-4 ${sev.border} overflow-hidden transition-all duration-300`}>
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full text-left p-4 md:p-5 hover:bg-slate-50/60 transition-colors"
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${sev.bg} ${sev.color} border ${sev.border} uppercase tracking-wider`}>
                                {sev.label}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                {incident.systemName}
                            </span>
                        </div>
                        <h3 className="font-black text-slate-800 text-base leading-tight mb-1">{incident.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 font-medium">
                            <span className="flex items-center gap-1"><Clock size={11} /> {incident.resolvedAt || incident.createdAt}</span>
                            {duration && <span className="flex items-center gap-1"><Zap size={11} className="text-amber-500" /> Xử lý trong: <b className="text-amber-600">{duration}</b></span>}
                            {incident.participants && incident.participants.length > 0 && (
                                <span className="flex items-center gap-1"><UserIcon size={11} /> {incident.participants.join(', ')}</span>
                            )}
                        </div>
                    </div>
                    <div className="shrink-0 text-slate-400 mt-1">
                        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                </div>
            </button>

            {/* Expanded content */}
            {expanded && (
                <div className="border-t border-slate-100 p-4 md:p-5 space-y-4 animate-in fade-in duration-200">
                    {/* Description */}
                    {incident.description && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <Siren size={11} /> Mô tả sự cố
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed italic">{incident.description}</p>
                        </div>
                    )}

                    {/* Resolution Note — most important */}
                    {incident.resolutionNote && (
                        <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                            <div className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-2 flex items-center gap-1">
                                <CheckCircle size={12} /> ✅ Cách xử lý đã thực hiện
                            </div>
                            <p className="text-sm text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                                {incident.resolutionNote}
                            </p>
                        </div>
                    )}

                    {/* Photos */}
                    {(incident.imageUrl || incident.resolutionImageUrl) && (
                        <div className="flex flex-wrap gap-3">
                            {incident.imageUrl && (
                                <div className="relative">
                                    <img
                                        src={incident.imageUrl}
                                        alt="Ảnh sự cố"
                                        className="w-28 h-20 object-cover rounded-lg border-2 border-red-200 cursor-pointer hover:opacity-90 transition shadow-sm"
                                        onClick={() => window.open(incident.imageUrl, '_blank')}
                                    />
                                    <div className="absolute top-1 left-1 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded">TRƯỚC</div>
                                </div>
                            )}
                            {incident.resolutionImageUrl && (
                                <div className="relative">
                                    <img
                                        src={incident.resolutionImageUrl}
                                        alt="Ảnh sau xử lý"
                                        className="w-28 h-20 object-cover rounded-lg border-2 border-green-200 cursor-pointer hover:opacity-90 transition shadow-sm"
                                        onClick={() => window.open(incident.resolutionImageUrl, '_blank')}
                                    />
                                    <div className="absolute top-1 left-1 bg-green-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded">SAU</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Meta */}
                    <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                        <span>Người báo: <b className="text-slate-600">{incident.reportedBy}</b></span>
                        <span>Báo lúc: <b className="text-slate-600">{incident.createdAt}</b></span>
                        {incident.resolvedBy && <span>Xử lý bởi: <b className="text-slate-600">{incident.resolvedBy}</b></span>}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function KnowledgePage() {
    const router = useRouter();
    const [incidents, setIncidents] = useState<(Incident & { severity?: string })[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSystem, setFilterSystem] = useState('ALL');
    const [filterSeverity, setFilterSeverity] = useState('ALL');

    useEffect(() => {
        const unsub = subscribeToIncidents((data) => {
            const resolved = (data as (Incident & { severity?: string })[])
                .filter(i => i.status === 'RESOLVED' && i.resolutionNote)
                .sort((a, b) => {
                    const parseDate = (d: string) => {
                        if (!d) return 0;
                        const parts = d.split(/[/ :]+/);
                        const [hh, mm, dd, mo, yyyy] = parts;
                        return new Date(Number(yyyy), Number(mo) - 1, Number(dd), Number(hh), Number(mm)).getTime();
                    };
                    return parseDate(b.resolvedAt || b.createdAt) - parseDate(a.resolvedAt || a.createdAt);
                });
            setIncidents(resolved);
            setIsLoaded(true);
        });
        return () => unsub();
    }, []);

    const systemOptions = useMemo(() => {
        const names = [...new Set(incidents.map(i => i.systemName).filter(Boolean))].sort();
        return names;
    }, [incidents]);

    const normalize = (s: string) => s.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

    const filtered = useMemo(() => {
        return incidents.filter(inc => {
            if (filterSystem !== 'ALL' && inc.systemName !== filterSystem) return false;
            if (filterSeverity !== 'ALL' && (inc.severity || 'MEDIUM') !== filterSeverity) return false;
            if (!searchTerm.trim()) return true;
            const q = normalize(searchTerm);
            return (
                normalize(inc.title || '').includes(q) ||
                normalize(inc.systemName || '').includes(q) ||
                normalize(inc.description || '').includes(q) ||
                normalize(inc.resolutionNote || '').includes(q) ||
                (inc.participants || []).some(p => normalize(p).includes(q))
            );
        });
    }, [incidents, searchTerm, filterSystem, filterSeverity]);

    if (!isLoaded) return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-emerald-600" />
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20 p-4 md:p-8 font-sans">
            <div className="max-w-4xl mx-auto">

                {/* Header */}
                <header className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={() => router.push('/')}
                            className="p-2.5 bg-white rounded-2xl shadow-sm border border-slate-200 hover:bg-slate-50 transition active:scale-95"
                        >
                            <ArrowLeft size={22} className="text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                                <BookOpen className="text-emerald-600" size={26} />
                                Sổ Tay Kinh Nghiệm Xử Lý Sự Cố
                            </h1>
                            <p className="text-sm text-slate-500 font-medium mt-0.5">
                                Học từ mỗi sự cố — xử lý nhanh hơn lần sau
                            </p>
                        </div>
                    </div>

                    {/* Stats bar */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
                            <div className="text-2xl font-black text-emerald-600">{incidents.length}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bài học</div>
                        </div>
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
                            <div className="text-2xl font-black text-blue-600">{systemOptions.length}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hệ thống</div>
                        </div>
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
                            <div className="text-2xl font-black text-amber-600">{filtered.length}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kết quả</div>
                        </div>
                    </div>

                    {/* Search & Filter */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Tìm theo tên sự cố, hệ thống, cách xử lý, người tham gia..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 bg-slate-50 transition"
                            />
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                                <Filter size={14} className="text-slate-400 shrink-0" />
                                <select
                                    value={filterSystem}
                                    onChange={e => setFilterSystem(e.target.value)}
                                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-700 font-medium"
                                >
                                    <option value="ALL">Tất cả hệ thống</option>
                                    {systemOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-2 flex-1 min-w-[160px]">
                                <select
                                    value={filterSeverity}
                                    onChange={e => setFilterSeverity(e.target.value)}
                                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-700 font-medium"
                                >
                                    <option value="ALL">Tất cả mức độ</option>
                                    <option value="CRITICAL">🔴 Khẩn cấp</option>
                                    <option value="MEDIUM">🟡 Trung bình</option>
                                    <option value="LOW">🟢 Nhẹ</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Results */}
                <div className="space-y-3">
                    {filtered.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                            <BookOpen size={40} className="text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-400 font-medium text-sm">
                                {searchTerm || filterSystem !== 'ALL' || filterSeverity !== 'ALL'
                                    ? 'Không tìm thấy kết quả phù hợp.'
                                    : 'Chưa có sự cố nào được xử lý hoàn thành. Khi có sự cố được giải quyết, nó sẽ xuất hiện ở đây.'}
                            </p>
                        </div>
                    ) : (
                        filtered.map(inc => <KnowledgeCard key={inc.id} incident={inc} />)
                    )}
                </div>

                {/* Footer hint */}
                {filtered.length > 0 && (
                    <div className="mt-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                        <p className="text-xs text-emerald-700 font-medium">
                            💡 Bấm vào từng thẻ để xem chi tiết cách xử lý. Tổng hợp từ {incidents.length} sự cố đã được giải quyết.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
