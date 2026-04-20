'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Search, FileText, Calendar, Clock, User, Trash2, PenTool } from 'lucide-react';
import { subscribeToPbbReports, deletePbbReport } from '@/lib/firebase';
import { useUser } from '@/providers/UserProvider';
import clsx from 'clsx';

export default function PbbMaintenanceListPage() {
    const router = useRouter();
    const { user } = useUser();
    const [reports, setReports] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const unsub = subscribeToPbbReports(setReports);
        return () => unsub();
    }, []);

    const filteredReports = reports.filter(r => 
        r.inspectorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.systemId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.date?.includes(searchTerm)
    );

    const handleDelete = async (id: string) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa bản ghi này?')) return;
        try {
            await deletePbbReport(id);
            alert('Đã xóa thành công!');
        } catch (e) {
            alert('Lỗi khi xóa!');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900 pb-20">
            <div className="max-w-5xl mx-auto">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/')} className="p-3 bg-white rounded-xl shadow border border-slate-200 hover:bg-slate-100 transition">
                            <ArrowLeft size={20} className="text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black uppercase text-slate-800 flex items-center gap-2 tracking-tight">
                                <PenTool className="text-sky-600" /> Bảo Dưỡng Cầu HK (JBT)
                            </h1>
                            <p className="text-slate-500 text-sm font-medium">Danh sách các phiếu bảo dưỡng định kỳ</p>
                        </div>
                    </div>
                    <button
                        onClick={() => router.push('/pbb-maintenance/new')}
                        className="py-3 px-6 bg-sky-600 text-white font-black rounded-xl shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2 hover:bg-sky-700 active:scale-95"
                    >
                        <Plus size={20} /> TẠO PHIẾU MỚI
                    </button>
                </header>

                <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden mb-6 p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm theo tên nhân viên, ngày hoặc loại bảo dưỡng..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-200 font-medium transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    {filteredReports.length > 0 ? (
                        filteredReports.map((report) => (
                            <div 
                                key={report.id} 
                                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all flex flex-col md:flex-row justify-between gap-6 cursor-pointer"
                                onClick={() => router.push(`/pbb-maintenance/${report.id}`)}
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="bg-sky-100 text-sky-700 font-black px-2 py-1 rounded text-[10px] uppercase">
                                            Bảo dưỡng {report.type || '1T'}
                                        </div>
                                        <span className="text-slate-400 text-xs font-mono">{report.id}</span>
                                    </div>
                                    <h3 className="text-lg font-black text-slate-800 mb-1 flex items-center gap-2">
                                        <Calendar size={16} className="text-slate-400" />
                                        {report.date} <span className="text-slate-300 font-normal ml-2">|</span> <Clock size={16} className="text-slate-400 ml-2" /> {report.time}
                                    </h3>
                                    <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-600 mb-4">
                                        <span className="flex items-center gap-1"><User size={14} /> Người thực hiện: <b className="text-slate-800">{report.inspectorName}</b></span>
                                        <span className="flex items-center gap-1"><FileText size={14} /> Cửa bến/Vị trí: <b className="text-slate-800">{report.systemId || 'Chưa rõ'}</b></span>
                                    </div>
                                    {report.notes && (
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm text-slate-500 italic">
                                            <b className="text-slate-700 not-italic block mb-1 uppercase text-[10px] tracking-wider">Ghi chú:</b>
                                            {report.notes}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-row md:flex-col justify-end gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <button 
                                        onClick={() => router.push(`/pbb-maintenance/${report.id}`)}
                                        className="flex-1 md:flex-none py-3 px-6 rounded-xl font-black text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        <FileText size={18} /> {user?.role === 'ADMIN' ? 'SỬA / CHI TIẾT' : 'CHI TIẾT'}
                                    </button>
                                    {user?.role === 'ADMIN' && (
                                        <button 
                                            onClick={() => handleDelete(report.id)}
                                            className="flex-1 md:flex-none py-3 px-6 rounded-xl font-black text-sm text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Trash2 size={18} /> XÓA
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white p-20 text-center rounded-[2.5rem] border border-slate-200 border-dashed">
                             <div className="flex flex-col items-center gap-4 grayscale opacity-40">
                                <PenTool size={48} className="text-slate-300" />
                                <p className="font-black text-slate-500 uppercase text-xs tracking-[0.2em]">Chưa có phiếu bảo dưỡng nào</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
