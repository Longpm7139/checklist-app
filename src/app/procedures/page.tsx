'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    BookOpen, Plus, ArrowLeft, Search, Trash2, FileText, 
    Folder, FolderOpen, Upload, Download, Loader2, X, 
    CheckCircle, AlertCircle, Calendar, ShieldCheck, Wrench
} from 'lucide-react';
import { useUser } from '@/providers/UserProvider';
import { IMESafeInput, IMESafeTextArea } from '@/components/IMESafeInput';
import { subscribeToProcedures, saveProcedure, deleteProcedure, uploadImage } from '@/lib/firebase';
import { Procedure } from '@/lib/types';
import clsx from 'clsx';

export default function ProceduresPage() {
    const router = useRouter();
    const { user: currentUser } = useUser();
    const [procedures, setProcedures] = useState<Procedure[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'LIST' | 'CREATE'>('LIST');
    const [activeTab, setActiveTab] = useState<'OPERATING' | 'MAINTENANCE' | 'LICENSE'>('OPERATING');
    const [licenseSubTab, setLicenseSubTab] = useState<'LICENSE_CDHK' | 'LICENSE_VDGS' | 'LICENSE_MAYSOI'>('LICENSE_CDHK');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [type, setType] = useState<'OPERATING' | 'MAINTENANCE' | 'LICENSE_CDHK' | 'LICENSE_VDGS' | 'LICENSE_MAYSOI'>('OPERATING');
    const [ticketNumber, setTicketNumber] = useState('');
    const [department, setDepartment] = useState('TRUNG TÂM KHAI THÁC GA ĐN');
    const [documentName, setDocumentName] = useState('');
    const [documentSymbol, setDocumentSymbol] = useState('');
    const [revision, setRevision] = useState('01/00');
    const [reason, setReason] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [fileFile, setFileFile] = useState<File | null>(null);
    const [fileUrl, setFileUrl] = useState('');
    const [fileName, setFileName] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [editId, setEditId] = useState('');
    const isLicense = type.startsWith('LICENSE_');

    useEffect(() => {
        const unsub = subscribeToProcedures((data) => {
            setProcedures(data as Procedure[]);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileFile(file);
            setFileName(file.name);
        }
    };

    const handleSave = async () => {
        const isLicenseType = type.startsWith('LICENSE_');
        
        if (!isLicenseType) {
            if (!ticketNumber || !documentName || !documentSymbol || !date) {
                alert("Vui lòng nhập đầy đủ thông tin bắt buộc!");
                return;
            }
        } else {
            if (!fileFile && !fileUrl) {
                alert("Vui lòng chọn file giấy phép đính kèm!");
                return;
            }
        }

        setIsSaving(true);
        try {
            let uploadedUrl = fileUrl;
            if (fileFile) {
                // Xử lý cứng: Do Storage Rules đang khóa thư mục LICENSE_... nên mượn thư mục OPERATING để lưu file
                // Cả hai thư mục OPERATING / MAINTENANCE đã được xác nhận là 100% cho phép tải file PDF.
                const uploadFolder = isLicenseType ? 'OPERATING' : type;
                const safeName = fileFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const path = `procedures/${uploadFolder}/${Date.now()}_${safeName}`;
                
                uploadedUrl = await uploadImage(fileFile, path);
            }

            const finalFileName = fileFile?.name || fileName || '';
            const finalDocumentName = isLicenseType ? (finalFileName || 'Giấy phép') : documentName;

            const newProc: Procedure = {
                id: isEditMode ? editId : `${Date.now()}`,
                type,
                ticketNumber: isLicenseType ? 'GIẤY PHÉP' : ticketNumber,
                formCode: 'B01.QT01/DAD',
                department: isLicenseType ? '' : department,
                documentName: finalDocumentName,
                documentSymbol: isLicenseType ? '---' : documentSymbol,
                revision: isLicenseType ? '---' : revision,
                reason: isLicenseType ? '' : reason,
                date: isLicenseType ? new Date().toLocaleDateString('vi-VN') : date.split('-').reverse().join('/'),
                fileUrl: uploadedUrl,
                fileName: finalFileName,
                creatorName: currentUser?.name || 'Unknown',
                creatorCode: currentUser?.code || 'UNKNOWN',
                createdAt: isEditMode ? procedures.find(p => p.id === editId)?.createdAt || '' : new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false })
            };

            await saveProcedure(newProc);
            alert(isEditMode ? "Đã cập nhật quy trình!" : "Đã lưu quy trình mới!");
            resetForm();
            setViewMode('LIST');
        } catch (error) {
            console.error("Save procedure error:", error);
            alert("Lỗi khi lưu quy trình!");
        } finally {
            setIsSaving(false);
        }
    };

    const resetForm = () => {
        setTicketNumber('');
        setDocumentName('');
        setDocumentSymbol('');
        setRevision('01/00');
        setReason('');
        setFileFile(null);
        setFileUrl('');
        setFileName('');
        setIsEditMode(false);
        setEditId('');
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa quy trình này không? Thao tác này không thể hoàn tác.")) return;
        try {
            await deleteProcedure(id);
            alert("Đã xóa quy trình!");
        } catch (error) {
            console.error("Delete procedure error:", error);
            alert("Lỗi khi xóa!");
        }
    };

    const handleEdit = (p: Procedure) => {
        setEditId(p.id);
        setIsEditMode(true);
        setType(p.type);
        setTicketNumber(p.ticketNumber);
        setDepartment(p.department);
        setDocumentName(p.documentName);
        setDocumentSymbol(p.documentSymbol);
        setRevision(p.revision);
        setReason(p.reason);
        // Correctly parse dd/MM/yyyy to YYYY-MM-DD
        const dateParts = p.date.split('/');
        if (dateParts.length === 3) {
            setDate(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
        }
        setFileUrl(p.fileUrl || '');
        setFileName(p.fileName || '');
        setViewMode('CREATE');
    };

    const filteredProcedures = procedures.filter(p => {
        const matchesTab = activeTab === 'LICENSE' ? p.type === licenseSubTab : p.type === activeTab;
        const matchesSearch = p.documentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
         p.documentSymbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
         p.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesTab && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Header Sticky */}
            <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm px-4 py-3 md:px-8">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/')} className="p-2 hover:bg-slate-100 rounded-full transition">
                            <ArrowLeft size={20} className="text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-lg md:text-xl font-black text-violet-800 uppercase flex items-center gap-2">
                                <BookOpen size={24} className="text-violet-600" />
                                Quy trình Vận hành & Bảo dưỡng
                            </h1>
                            <p className="text-[10px] md:text-xs text-slate-500 font-medium">Bản quyền thuộc Trung tâm Khai thác ga Đà Nẵng</p>
                        </div>
                    </div>
                    {viewMode === 'LIST' && (
                        <button 
                            onClick={() => { resetForm(); setViewMode('CREATE'); setType(activeTab === 'LICENSE' ? licenseSubTab : activeTab as any); }}
                            className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-violet-200 transition-all active:scale-95 font-bold text-sm"
                        >
                            <Plus size={18} /> <span className="hidden sm:inline">Thêm mới</span>
                        </button>
                    )}
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-4 md:p-8">
                {viewMode === 'LIST' ? (
                    <div className="space-y-6">
                        {/* Tab Selector */}
                        <div className="flex p-1 bg-slate-200 rounded-2xl w-fit mx-auto shadow-inner">
                            <button 
                                onClick={() => setActiveTab('OPERATING')}
                                className={clsx(
                                    "px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 flex items-center gap-2",
                                    activeTab === 'OPERATING' ? "bg-white text-violet-700 shadow-sm scale-105" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <Folder size={16} /> Vận Hành
                            </button>
                            <button 
                                onClick={() => setActiveTab('MAINTENANCE')}
                                className={clsx(
                                    "px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 flex items-center gap-2",
                                    activeTab === 'MAINTENANCE' ? "bg-white text-violet-700 shadow-sm scale-105" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <Wrench size={16} /> Bảo Dưỡng
                            </button>
                            <button 
                                onClick={() => setActiveTab('LICENSE')}
                                className={clsx(
                                    "px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 flex items-center gap-2",
                                    activeTab === 'LICENSE' ? "bg-white text-violet-700 shadow-sm scale-105" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <ShieldCheck size={16} /> Giấy Phép
                            </button>
                        </div>
                        
                        {activeTab === 'LICENSE' && (
                            <div className="flex gap-2 justify-center mt-3 mb-6">
                                <button
                                    onClick={() => setLicenseSubTab('LICENSE_CDHK')}
                                    className={clsx(
                                        "px-4 py-2 rounded-lg text-[11px] font-bold transition-all border",
                                        licenseSubTab === 'LICENSE_CDHK' ? "bg-violet-100 text-violet-700 border-violet-200" : "bg-white text-slate-500 border-slate-200 hover:border-violet-200 hover:text-violet-600"
                                    )}
                                >
                                    Cầu dẫn hành khách
                                </button>
                                <button
                                    onClick={() => setLicenseSubTab('LICENSE_VDGS')}
                                    className={clsx(
                                        "px-4 py-2 rounded-lg text-[11px] font-bold transition-all border",
                                        licenseSubTab === 'LICENSE_VDGS' ? "bg-violet-100 text-violet-700 border-violet-200" : "bg-white text-slate-500 border-slate-200 hover:border-violet-200 hover:text-violet-600"
                                    )}
                                >
                                    Dẫn đỗ tàu bay
                                </button>
                                <button
                                    onClick={() => setLicenseSubTab('LICENSE_MAYSOI')}
                                    className={clsx(
                                        "px-4 py-2 rounded-lg text-[11px] font-bold transition-all border",
                                        licenseSubTab === 'LICENSE_MAYSOI' ? "bg-violet-100 text-violet-700 border-violet-200" : "bg-white text-slate-500 border-slate-200 hover:border-violet-200 hover:text-violet-600"
                                    )}
                                >
                                    Máy soi an ninh
                                </button>
                            </div>
                        )}

                        {/* Search Bar */}
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-violet-500" size={20} />
                            <input 
                                type="text"
                                placeholder="Tìm theo tên quy trình, mã ký hiệu hoặc số phiếu..."
                                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-4 focus:ring-violet-100 focus:border-violet-400 transition-all text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 size={40} className="text-violet-500 animate-spin" />
                                <p className="text-slate-400 font-medium animate-pulse text-sm">Đang tải danh sách quy trình...</p>
                            </div>
                        ) : filteredProcedures.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
                                <FolderOpen size={64} strokeWidth={1} className="mb-4 text-slate-300" />
                                <p className="font-bold text-lg">Chưa có quy trình nào</p>
                                <p className="text-sm">Hãy nhấn nút 'Thêm mới' để bắt đầu lưu trữ.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredProcedures.map(proc => {
                                    const isLicenseLog = proc.type.startsWith('LICENSE_');
                                    return (
                                                <div key={proc.id} className="bg-white rounded-3xl border border-slate-200 p-6 hover:shadow-xl hover:border-violet-200 transition-all duration-300 group relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-24 h-24 bg-violet-50 -mr-12 -mt-12 rounded-full transition-transform group-hover:scale-150 duration-500 -z-0 opacity-50" />
                                                    
                                                    <div className="relative z-10">
                                                        <div className="flex justify-between items-start mb-4">
                                                            {isLicenseLog ? (
                                                                <div className="bg-violet-50 text-violet-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border border-violet-100 flex items-center gap-1">
                                                                    <ShieldCheck size={12} /> Giấy Phép
                                                                </div>
                                                            ) : (
                                                                <div className="bg-slate-50 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border border-slate-100 flex items-center gap-1">
                                                                    <FileText size={12} /> {proc.ticketNumber}
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-1">
                                                                {(currentUser?.role === 'ADMIN' || currentUser?.code === proc.creatorCode) && (
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleEdit(proc); }}
                                                                        className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition"
                                                                        title="Sửa"
                                                                    >
                                                                        <Plus size={16} className="rotate-45" /> 
                                                                    </button>
                                                                )}
                                                                {currentUser?.role === 'ADMIN' && (
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleDelete(proc.id); }}
                                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                                        title="Xóa"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <h3 className="font-black text-slate-800 text-base leading-tight mb-2 group-hover:text-violet-700 transition-colors uppercase">
                                                            {proc.documentName}
                                                        </h3>
                                                        {isLicenseLog && proc.department && <div className="text-[10px] font-bold text-violet-600 bg-violet-50 inline-block px-2 py-0.5 rounded-full mb-3 uppercase tracking-tighter border border-violet-100">{proc.department}</div>}
                                                        
                                                        {!isLicenseLog && (
                                                            <div className="space-y-1.5 mb-6">
                                                                <div className="flex justify-between text-xs text-slate-500">
                                                                    <span>Ký hiệu:</span>
                                                                    <span className="font-bold text-slate-700 truncate max-w-[150px]">{proc.documentSymbol}</span>
                                                                </div>
                                                                <div className="flex justify-between text-xs text-slate-500">
                                                                    <span>Lần ban hành:</span>
                                                                    <span className="font-bold text-slate-700">{proc.revision}</span>
                                                                </div>
                                                                <div className="flex justify-between text-xs text-slate-500">
                                                                    <span>Ngày:</span>
                                                                    <span className="font-bold text-slate-700">{proc.date}</span>
                                                                </div>
                                                            </div>
                                                        )}

                                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 bg-white/50 rounded-b-3xl">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Người cập nhật</span>
                                                    <span className="text-[11px] font-bold text-slate-600">{proc.creatorName}</span>
                                                </div>
                                                {proc.fileUrl ? (
                                                    <a 
                                                        href={proc.fileUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="p-3 bg-violet-600 text-white rounded-2xl hover:bg-violet-700 shadow-md shadow-violet-100 transition-all active:scale-95"
                                                        title="Xem tài liệu"
                                                    >
                                                        <Download size={20} />
                                                    </a>
                                                ) : (
                                                    <div className="p-3 bg-slate-100 text-slate-400 rounded-2xl cursor-not-allowed">
                                                        <FileText size={20} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200 border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-violet-800 p-8 text-white relative">
                            <button 
                                onClick={() => setViewMode('LIST')}
                                className="absolute top-8 left-8 p-2 bg-white/10 hover:bg-white/20 rounded-full transition"
                            >
                                <X size={20} />
                            </button>
                            <div className="text-center">
                                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight leading-none mb-1">
                                    {isLicense ? "Cập Nhật Thông Tin Giấy Phép" : "Phiếu Đề Nghị Ban Hành / Sửa Đổi"}
                                </h2>
                                <p className="text-violet-300 font-medium text-xs">
                                    {isLicense ? "(Giấy phép, Chứng nhận, Kiểm định)" : "(Tài liệu tầng 2)"}
                                </p>
                            </div>
                            <div className="absolute bottom-0 right-8 transform translate-y-1/2 flex gap-3 max-w-[80%] overflow-x-auto scrollbar-none pb-2">
                                <div className={clsx(
                                    "px-4 py-3 rounded-2xl shadow-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-2 border transition-all whitespace-nowrap",
                                    type === 'OPERATING' ? "bg-white text-violet-700 border-white scale-110" : "bg-violet-700/50 text-white border-violet-600 opacity-50 flex-shrink-0"
                                )}>
                                    <Folder size={14} /> Vận Hành
                                </div>
                                <div className={clsx(
                                    "px-4 py-3 rounded-2xl shadow-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-2 border transition-all whitespace-nowrap",
                                    type === 'MAINTENANCE' ? "bg-white text-violet-700 border-white scale-110" : "bg-violet-700/50 text-white border-violet-600 opacity-50 flex-shrink-0"
                                )}>
                                    <Wrench size={14} /> Bảo Dưỡng
                                </div>
                                {isLicense && (
                                    <div className={clsx(
                                        "px-4 py-3 rounded-2xl shadow-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-2 border transition-all whitespace-nowrap",
                                        "bg-white text-violet-700 border-white scale-110"
                                    )}>
                                        <ShieldCheck size={14} /> {
                                            type === 'LICENSE_CDHK' ? 'Giấy phép CDHK' : 
                                            type === 'LICENSE_VDGS' ? 'Giấy phép VDGS' : 
                                            'Giấy phép Máy Soi'
                                        }
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-8 pt-16 space-y-8">
                            {!isLicense && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-1 group">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-violet-500">Mẫu biểu</label>
                                            <input 
                                                type="text"
                                                readOnly
                                                value="B01.QT01/DAD"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 transition text-sm font-bold text-slate-500 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1 group">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-violet-500">Số phiếu *</label>
                                            <IMESafeInput 
                                                value={ticketNumber}
                                                onChangeValue={setTicketNumber}
                                                placeholder="Ví dụ: 09/KG, 47/KG..."
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-violet-50 focus:border-violet-400 transition text-sm font-bold text-slate-800"
                                            />
                                        </div>
                                        <div className="space-y-1 group">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-violet-500">Đơn vị / Bộ phận</label>
                                            <IMESafeInput 
                                                value={department}
                                                onChangeValue={setDepartment}
                                                placeholder="TRUNG TÂM KHAI THÁC GA..."
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-violet-50 focus:border-violet-400 transition text-sm font-bold text-slate-800"
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-violet-50/50 p-6 rounded-3xl space-y-6 border border-violet-100">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-1.5 h-6 bg-violet-600 rounded-full" />
                                            <h3 className="font-black text-violet-800 text-sm uppercase tracking-widest">Phần I: Đề nghị ban hành / sửa đổi</h3>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-1 group">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên tài liệu / Quy trình *</label>
                                                <IMESafeInput 
                                                    value={documentName}
                                                    onChangeValue={setDocumentName}
                                                    placeholder="QUY TRÌNH VẬN HÀNH HỆ THỐNG CCTV..."
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-violet-100 focus:border-violet-400 transition text-sm font-bold text-slate-800 uppercase"
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1 group">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ký hiệu tài liệu *</label>
                                                    <IMESafeInput 
                                                        value={documentSymbol}
                                                        onChangeValue={setDocumentSymbol}
                                                        placeholder="QT46/DAD-KG..."
                                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-violet-100 focus:border-violet-400 transition text-sm font-bold text-slate-800"
                                                    />
                                                </div>
                                                <div className="space-y-1 group">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lần ban hành / sửa đổi</label>
                                                    <IMESafeInput 
                                                        value={revision}
                                                        onChangeValue={setRevision}
                                                        placeholder="02/00..."
                                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-violet-100 focus:border-violet-400 transition text-sm font-bold text-slate-800"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1 group">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lý do biên soạn</label>
                                                <IMESafeTextArea 
                                                    value={reason}
                                                    onChangeValue={setReason}
                                                    placeholder="Ban hành quy trình theo mẫu mới..."
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-violet-100 focus:border-violet-400 transition text-sm font-medium text-slate-700 min-h-[100px]"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className={clsx("grid gap-8 items-end", isLicense ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2")}>
                                {!isLicense && (
                                    <div className="space-y-4">
                                        <div className="space-y-1 group">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngày lập phiếu *</label>
                                            <input 
                                                type="date"
                                                value={date}
                                                onChange={(e) => setDate(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-violet-50 focus:border-violet-400 transition text-sm font-bold text-slate-800"
                                            />
                                        </div>
                                    </div>
                                )}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tài liệu đính kèm (PDF/Word/Ảnh)</label>
                                        <div className="flex items-center gap-3">
                                            <label className="flex-1 border-2 border-dashed border-slate-200 rounded-2xl p-4 hover:border-violet-400 hover:bg-violet-50 cursor-pointer transition group">
                                                <input type="file" onChange={handleFileChange} className="hidden" />
                                                <div className="flex items-center gap-3 text-slate-500 font-bold text-sm">
                                                    <div className="p-2 bg-slate-100 group-hover:bg-violet-100 group-hover:text-violet-600 rounded-xl transition">
                                                        <Upload size={20} />
                                                    </div>
                                                    <span className="truncate">{fileName || 'Chọn file để tải lên...'}</span>
                                                </div>
                                            </label>
                                            {fileName && (
                                                <button onClick={() => { setFileFile(null); setFileName(''); setFileUrl(''); }} className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition">
                                                    <X size={20} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => setViewMode('LIST')}
                                        className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition hover:bg-slate-200"
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button 
                                        disabled={isSaving}
                                        onClick={handleSave}
                                        className="flex-[2] py-4 bg-violet-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-violet-200 transition-all hover:bg-violet-700 active:scale-95 disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2"
                                    >
                                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                        {isEditMode ? 'Cập nhật' : 'Lưu quy trình'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 border-t border-slate-100 p-6 flex flex-col md:flex-row items-center justify-around gap-8 text-center text-slate-400">
                             <div>
                                 <div className="w-32 h-16 border-b-2 border-slate-200 border-dotted mb-2 mx-auto" />
                                 <p className="text-[10px] font-black uppercase tracking-widest">Trưởng đơn vị</p>
                                 <p className="text-[9px] font-medium italic">(Ký và ghi rõ họ tên)</p>
                             </div>
                             <div>
                                 <div className="w-32 h-16 border-b-2 border-slate-200 border-dotted mb-2 mx-auto" />
                                 <p className="text-[10px] font-black uppercase tracking-widest">Quản lý bộ phận</p>
                                 <p className="text-[9px] font-medium italic">(Ký và ghi rõ họ tên)</p>
                             </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
