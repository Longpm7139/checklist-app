'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Database, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { backupAllData } from '@/lib/firebase';
import { saveAs } from 'file-saver';
import { useUser } from '@/providers/UserProvider';

export default function BackupPage() {
    const router = useRouter();
    const { user } = useUser();
    const [exporting, setExporting] = useState(false);
    const [done, setDone] = useState(false);

    const handleBackup = async () => {
        if (!window.confirm('Hệ thống sẽ tải xuống toàn bộ dữ liệu từ Firebase dưới dạng file JSON. Bạn có muốn tiếp tục?')) return;
        
        setExporting(true);
        try {
            const data = await backupAllData();
            const blob = new Blob([data], { type: 'application/json' });
            const filename = `FULL_BACKUP_CHECKLIST_${new Date().toISOString().split('T')[0]}.json`;
            saveAs(blob, filename);
            setDone(true);
            setTimeout(() => setDone(false), 5000);
        } catch (error) {
            console.error(error);
            alert('Lỗi khi sao lưu dữ liệu!');
        } finally {
            setExporting(false);
        }
    };

    if (user?.role !== 'ADMIN') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center border border-slate-100">
                    <ShieldAlert size={64} className="mx-auto text-red-500 mb-6" />
                    <h1 className="text-2xl font-black text-slate-800 mb-4">KHÔNG CÓ QUYỀN TRUY CẬP</h1>
                    <p className="text-slate-500 font-medium mb-8">Tính năng sao lưu dữ liệu chỉ dành cho Quản trị viên (ADMIN).</p>
                    <button onClick={() => router.push('/')} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition">
                        QUAY LẠI TRANG CHỦ
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
            <div className="max-w-2xl mx-auto">
                <header className="flex items-center gap-4 mb-12">
                    <button onClick={() => router.push('/')} className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 hover:bg-slate-100 transition">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black uppercase text-slate-800 tracking-tight">Sao Lưu Dữ Liệu</h1>
                        <p className="text-slate-500 text-sm font-medium">Backup toàn bộ cơ sở dữ liệu hệ thống</p>
                    </div>
                </header>

                <div className="bg-white rounded-3xl shadow-xl border border-slate-200/60 overflow-hidden">
                    <div className="p-8 text-center bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
                        <div className="w-20 h-20 bg-sky-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-sky-600 shadow-inner">
                            <Database size={40} />
                        </div>
                        <h2 className="text-xl font-black text-slate-800 mb-2">Full System Backup</h2>
                        <p className="text-slate-500 text-sm font-medium px-8 leading-relaxed">
                            File sao lưu sẽ bao gồm toàn bộ: Danh sách thiết bị, Lịch sử bảo trì, Nhật ký sự cố, Danh sách người dùng và các báo cáo PBB/PCCC.
                        </p>
                    </div>

                    <div className="p-8">
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-8 flex items-start gap-4">
                            <ShieldAlert className="text-amber-600 shrink-0" size={24} />
                            <div className="text-sm text-amber-800 leading-relaxed">
                                <b className="block mb-1">Lưu ý bảo mật:</b>
                                File backup chứa thông tin nhạy cảm của hệ thống. Vui lòng bảo quản an toàn và không chia sẻ file này cho người không có thẩm quyền.
                            </div>
                        </div>

                        <button
                            onClick={handleBackup}
                            disabled={exporting}
                            className={`w-full py-5 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-lg hover:scale-[1.02] active:scale-95 disabled:opacity-50 ${
                                done ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-sky-600 text-white shadow-sky-500/20 hover:bg-sky-700'
                            }`}
                        >
                            {exporting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ĐANG TRÍCH XUẤT...
                                </>
                            ) : done ? (
                                <>
                                    <CheckCircle2 size={24} />
                                    ĐÃ TẢI XUỐNG THÀNH CÔNG!
                                </>
                            ) : (
                                <>
                                    <Download size={24} />
                                    TẢI FILE BACKUP (.JSON)
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Định dạng file</p>
                        <p className="text-lg font-black text-slate-700">JSON</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phạm vi</p>
                        <p className="text-lg font-black text-slate-700">Toàn bộ</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
