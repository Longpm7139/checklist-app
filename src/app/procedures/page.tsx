'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
    BookOpen, Plus, ArrowLeft, Search, Trash2, FileText, 
    Folder, FolderOpen, Upload, Download, Loader2, X, 
    CheckCircle, AlertCircle, Calendar, ShieldCheck, Wrench,
    Settings, Edit2
} from 'lucide-react';
import { useUser } from '@/providers/UserProvider';
import { IMESafeInput, IMESafeTextArea } from '@/components/IMESafeInput';
import { 
    subscribeToProcedures, saveProcedure, deleteProcedure, uploadImage,
    subscribeToLicenseCategories, saveLicenseCategory, deleteLicenseCategory
} from '@/lib/firebase';
import { Procedure, LicenseCategory } from '@/lib/types';
import clsx from 'clsx';

export default function ProceduresPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user: currentUser } = useUser();
    const [procedures, setProcedures] = useState<Procedure[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'LIST' | 'CREATE'>('LIST');
    const [activeTab, setActiveTab] = useState<'OPERATING' | 'MAINTENANCE' | 'LICENSE'>('OPERATING');
    const [licenseCategories, setLicenseCategories] = useState<LicenseCategory[]>([]);
    const [licenseSubTab, setLicenseSubTab] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isManagingCategories, setIsManagingCategories] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategory, setEditingCategory] = useState<LicenseCategory | null>(null);

    // Form State
    const [type, setType] = useState<string>('OPERATING');
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
    const [licenseName, setLicenseName] = useState('');
    const [licensingAuthority, setLicensingAuthority] = useState('');
    const [userOrganization, setUserOrganization] = useState('');
    const [purposeOfUse, setPurposeOfUse] = useState('');
    const [installationLocation, setInstallationLocation] = useState('');
    const [inspectionDate, setInspectionDate] = useState('');
    const [expirationDate, setExpirationDate] = useState('');
    const [expirationWarningDays, setExpirationWarningDays] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [editId, setEditId] = useState('');

    const isLicense = type.startsWith('LICENSE_');

    useEffect(() => {
        const unsub = subscribeToProcedures((data) => {
            setProcedures(data as Procedure[]);
            setLoading(false);
        });
        
        const unsubCats = subscribeToLicenseCategories((data) => {
            setLicenseCategories(data as LicenseCategory[]);
            if (data.length > 0 && !licenseSubTab) {
                setLicenseSubTab(data[0].id);
            }
        });

        return () => {
            unsub();
            unsubCats();
        };
    }, []);

    // Đọc query param ?tab= để tự động chuyển tab khi được gọi từ trang khác
    useEffect(() => {
        const tabParam = searchParams?.get('tab');
        if (tabParam === 'LICENSE') {
            setActiveTab('LICENSE');
            // Đảm bảo licenseSubTab được đặt nếu đã có dữ liệu
            if (licenseCategories.length > 0 && !licenseSubTab) {
                setLicenseSubTab(licenseCategories[0].id);
            }
        } else if (tabParam === 'OPERATING') {
            setActiveTab('OPERATING');
        } else if (tabParam === 'MAINTENANCE') {
            setActiveTab('MAINTENANCE');
        }
    }, [searchParams]);

    // Seeding default categories if empty
    useEffect(() => {
        if (!loading && licenseCategories.length === 0) {
            const defaults = [
                { id: 'LICENSE_CDHK', name: 'Cầu dẫn hành khách' },
                { id: 'LICENSE_VDGS', name: 'Dẫn đỗ tàu bay' },
                { id: 'LICENSE_MAYSOI', name: 'Máy soi an ninh' }
            ];
            defaults.forEach(cat => saveLicenseCategory(cat));
        }
    }, [loading, licenseCategories]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileFile(file);
            setFileName(file.name);
        }
    };

    const handleSave = async () => {
        if (!isLicense) {
            if (!ticketNumber || !documentName || !documentSymbol || !date) {
                alert("Vui lòng nhập đầy đủ thông tin bắt buộc!");
                return;
            }
        }

        if (!fileFile && !fileUrl) {
            alert("Vui lòng chọn file đính kèm!");
            return;
        }

        setIsSaving(true);
        try {
            let uploadedUrl = fileUrl;
            if (fileFile) {
                // Chỉ sử dụng thư mục 'procedures/' để tránh lỗi phân quyền thư mục con
                const path = `procedures/${Date.now()}_${fileFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                uploadedUrl = await uploadImage(fileFile, path);
            }

            const finalFileName = fileFile?.name || fileName || '';
            const finalDocName = isLicense ? (licenseName.trim() || finalFileName || 'Giấy phép') : documentName;
            const newProc: Procedure = {
                id: isEditMode ? editId : `${Date.now()}`,
                type,
                ticketNumber: isLicense ? 'GIẤY PHÉP' : ticketNumber,
                formCode: 'B01.QT01/DAD',
                department: isLicense ? '' : department,
                documentName: finalDocName,
                documentSymbol: isLicense ? '---' : documentSymbol,
                revision: isLicense ? '---' : revision,
                reason: isLicense ? '' : reason,
                date: isLicense ? new Date().toLocaleDateString('vi-VN') : date.split('-').reverse().join('/'),
                fileUrl: uploadedUrl,
                fileName: finalFileName,
                creatorName: currentUser?.name || 'Unknown',
                creatorCode: currentUser?.code || 'UNKNOWN',
                createdAt: isEditMode ? procedures.find(p => p.id === editId)?.createdAt || '' : new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false }),
                licensingAuthority,
                userOrganization,
                purposeOfUse,
                installationLocation,
                inspectionDate,
                expirationDate,
                expirationWarningDays
            };

            await saveProcedure(newProc);
            alert(isEditMode ? "Đã cập nhật!" : (isLicense ? "Đã tải giấy phép lên thành công!" : "Đã lưu quy trình thành công!"));
            resetForm();
            setViewMode('LIST');
        } catch (error) {
            console.error("Save error:", error);
            alert("Lỗi khi lưu!");
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
        setLicenseName('');
        setLicensingAuthority('');
        setUserOrganization('');
        setPurposeOfUse('');
        setInstallationLocation('');
        setInspectionDate('');
        setExpirationDate('');
        setExpirationWarningDays('');
        setIsEditMode(false);
        setEditId('');
    };

    const handleSaveCategory = async () => {
        if (!newCategoryName.trim()) return;
        const id = editingCategory ? editingCategory.id : `LICENSE_${Date.now()}`;
        try {
            await saveLicenseCategory({ id, name: newCategoryName.trim() });
            setNewCategoryName('');
            setEditingCategory(null);
        } catch (error) { alert("Lỗi khi lưu loại giấy phép!"); }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa?")) return;
        try { await deleteLicenseCategory(id); } catch (error) { alert("Lỗi khi xóa!"); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa không?")) return;
        try { await deleteProcedure(id); } catch (error) { alert("Lỗi khi xóa!"); }
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
        const dateParts = p.date.split('/');
        if (dateParts.length === 3) setDate(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
        setFileUrl(p.fileUrl || '');
        setFileName(p.fileName || '');
        if (p.type.startsWith('LICENSE_')) setLicenseName(p.documentName || '');
        setLicensingAuthority(p.licensingAuthority || '');
        setUserOrganization(p.userOrganization || '');
        setPurposeOfUse(p.purposeOfUse || '');
        setInstallationLocation(p.installationLocation || '');
        setInspectionDate(p.inspectionDate || '');
        setExpirationDate(p.expirationDate || '');
        setExpirationWarningDays(p.expirationWarningDays || '');
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
            <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm px-4 py-3 md:px-8">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/')} className="p-2 hover:bg-slate-100 rounded-full transition"><ArrowLeft size={20} className="text-slate-600" /></button>
                        <div>
                            <h1 className="text-lg md:text-xl font-black text-violet-800 uppercase flex items-center gap-2"><BookOpen size={24} className="text-violet-600" /> Quy trình Vận hành & Bảo dưỡng</h1>
                            <p className="text-[10px] md:text-xs text-slate-500 font-medium">Bản quyền thuộc Trung tâm Khai thác ga Đà Nẵng</p>
                        </div>
                    </div>
                    {viewMode === 'LIST' && (
                        <button onClick={() => { resetForm(); setViewMode('CREATE'); setType(activeTab === 'LICENSE' ? licenseSubTab : activeTab as any); }} className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg transition-all active:scale-95 font-bold text-sm">
                            <Plus size={18} /> <span className="hidden sm:inline">Thêm mới</span>
                        </button>
                    )}
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-4 md:p-8">
                {viewMode === 'LIST' ? (
                    <div className="space-y-6">
                        <div className="flex p-1 bg-slate-200 rounded-2xl w-fit mx-auto shadow-inner">
                            {['OPERATING', 'MAINTENANCE', 'LICENSE'].map(t => (
                                <button key={t} onClick={() => setActiveTab(t as any)} className={clsx("px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2", activeTab === t ? "bg-white text-violet-700 shadow-sm scale-105" : "text-slate-500 hover:text-slate-700")}>
                                    {t === 'OPERATING' && <Folder size={16} />}
                                    {t === 'MAINTENANCE' && <Wrench size={16} />}
                                    {t === 'LICENSE' && <ShieldCheck size={16} />}
                                    {t === 'OPERATING' ? 'Vận Hành' : t === 'MAINTENANCE' ? 'Bảo Dưỡng' : 'Giấy Phép'}
                                </button>
                            ))}
                        </div>
                        
                        {activeTab === 'LICENSE' && (
                            <div className="space-y-4 mb-6">
                                <div className="flex flex-wrap gap-2 justify-center mt-3">
                                    {licenseCategories.map(cat => (
                                        <button key={cat.id} onClick={() => setLicenseSubTab(cat.id)} className={clsx("px-4 py-2 rounded-lg text-[11px] font-bold transition-all border flex items-center gap-2", licenseSubTab === cat.id ? "bg-violet-100 text-violet-700 border-violet-200" : "bg-white text-slate-500 border-slate-200 hover:border-violet-200")}>{cat.name}</button>
                                    ))}
                                    {currentUser?.role === 'ADMIN' && <button onClick={() => setIsManagingCategories(!isManagingCategories)} className={clsx("p-2 rounded-lg transition-all border", isManagingCategories ? "bg-slate-800 text-white" : "bg-white text-slate-400 border-slate-200")}><Settings size={16} /></button>}
                                </div>
                                {isManagingCategories && currentUser?.role === 'ADMIN' && (
                                    <div className="max-w-2xl mx-auto bg-slate-100 p-6 rounded-2xl border border-slate-200 font-bold">
                                        <div className="flex items-center justify-between mb-4"><h3 className="text-xs uppercase">Quản lý loại giấy phép</h3><button onClick={() => setIsManagingCategories(false)}><X size={16} /></button></div>
                                        <div className="flex gap-2 mb-4"><input type="text" placeholder="Tên loại..." className="flex-1 px-4 py-2 rounded-xl border text-sm" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} /><button onClick={handleSaveCategory} className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs">{editingCategory ? 'Sửa' : 'Thêm'}</button></div>
                                        <div className="space-y-1">{licenseCategories.map(cat => (<div key={cat.id} className="flex items-center justify-between bg-white px-4 py-1.5 rounded-lg border text-sm"><span>{cat.name}</span><div className="flex gap-2"><button onClick={() => { setEditingCategory(cat); setNewCategoryName(cat.name); }} className="text-slate-400 hover:text-violet-600"><Edit2 size={14} /></button><button onClick={() => handleDeleteCategory(cat.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button></div></div>))}</div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input type="text" placeholder="Tìm kiếm..." className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-violet-400 text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>

                        {loading ? <div className="py-20 text-center"><Loader2 size={40} className="mx-auto text-violet-500 animate-spin" /></div> : filteredProcedures.length === 0 ? <div className="py-24 bg-white rounded-3xl border-2 border-dashed text-center text-slate-400 font-bold"><FolderOpen size={64} className="mx-auto mb-4 opacity-50" /> Trống</div> : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredProcedures.map(proc => {
                                    const isLic = proc.type.startsWith('LICENSE_');
                                    return (
                                        <div key={proc.id} className="bg-white rounded-3xl border p-6 hover:shadow-xl transition-all group relative overflow-hidden">
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={clsx("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border flex items-center gap-1", isLic ? "bg-violet-50 text-violet-600 border-violet-100" : "bg-slate-50 text-slate-500 border-slate-100")}>{isLic ? <ShieldCheck size={12} /> : <FileText size={12} />} {isLic ? 'Giấy Phép' : proc.ticketNumber}</div>
                                                    <div className="flex gap-1">
                                                        {(currentUser?.role === 'ADMIN' || currentUser?.code === proc.creatorCode) && <button onClick={() => handleEdit(proc)} className="p-1.5 text-slate-400 hover:text-violet-600"><Edit2 size={16} /></button>}
                                                        {currentUser?.role === 'ADMIN' && <button onClick={() => handleDelete(proc.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>}
                                                    </div>
                                                </div>
                                                <h3 className="font-black text-slate-800 text-base mb-2 uppercase">{proc.documentName}</h3>
                                                {proc.department && <div className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full mb-3 inline-block uppercase">{proc.department}</div>}
                                                <div className="space-y-1.5 mb-6 text-xs text-slate-500">
                                                    {!isLic && <div className="flex justify-between"><span>Ký hiệu:</span><span className="font-bold text-slate-700">{proc.documentSymbol}</span></div>}
                                                    {!isLic && <div className="flex justify-between"><span>Lần ban hành:</span><span className="font-bold text-slate-700">{proc.revision}</span></div>}
                                                    <div className="flex justify-between"><span>Ngày:</span><span className="font-bold text-slate-700">{proc.date}</span></div>
                                                </div>
                                                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                                    <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-bold uppercase">Người thực hiện</span><span className="text-[11px] font-bold text-slate-600">{proc.creatorName}</span></div>
                                                    {proc.fileUrl ? <a href={proc.fileUrl} target="_blank" rel="noopener noreferrer" className="p-3 bg-violet-600 text-white rounded-2xl hover:bg-violet-700 transition active:scale-95"><Download size={20} /></a> : <div className="p-3 bg-slate-100 text-slate-400 rounded-2xl"><FileText size={20} /></div>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden">
                        <div className="bg-violet-800 p-8 text-white relative text-center">
                            <button onClick={() => setViewMode('LIST')} className="absolute top-8 left-8 p-2 bg-white/10 rounded-full hover:bg-white/20 transition"><X size={20} /></button>
                            <h2 className="text-xl md:text-2xl font-black uppercase">{isLicense ? "Cập Nhật Thông Tin Giấy Phép" : "Phiếu Đề Nghị Ban Hành / Sửa Đổi"}</h2>
                            <p className="text-violet-300 font-medium text-xs">{isLicense ? "(Giấy phép, Chứng nhận, Kiểm định)" : "(Tài liệu tầng 2)"}</p>
                        </div>

                        <div className="p-8 space-y-8">
                            {!isLicense ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mẫu biểu</label><input type="text" readOnly value="B01.QT01/DAD" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-500" /></div>
                                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số phiếu *</label><IMESafeInput value={ticketNumber} onChangeValue={setTicketNumber} placeholder="Số phiếu..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800" /></div>
                                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Đơn vị / Bộ phận</label><IMESafeInput value={department} onChangeValue={setDepartment} placeholder="Đơn vị..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800" /></div>
                                    </div>
                                    <div className="bg-violet-50/50 p-6 rounded-3xl space-y-6 border border-violet-100">
                                        <div className="flex items-center gap-2 mb-2"><div className="w-1.5 h-6 bg-violet-600 rounded-full" /><h3 className="font-black text-violet-800 text-sm uppercase">Phần I: Đề nghị ban hành / sửa đổi</h3></div>
                                        <div className="space-y-4">
                                            <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên tài liệu / Quy trình *</label><IMESafeInput value={documentName} onChangeValue={setDocumentName} placeholder="Tên..." className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 uppercase" /></div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ký hiệu *</label><IMESafeInput value={documentSymbol} onChangeValue={setDocumentSymbol} placeholder="Ký hiệu..." className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800" /></div>
                                                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lần ban hành / Phiên bản</label><IMESafeInput value={revision} onChangeValue={setRevision} placeholder="01/00..." className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800" /></div>
                                            </div>
                                            <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lý do biên soạn *</label><IMESafeTextArea value={reason} onChangeValue={setReason} placeholder="Mô tả..." className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 min-h-[100px]" /></div>
                                        </div>
                                    </div>
                                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngày lập phiếu *</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800" /></div>
                                </>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-violet-50 p-6 rounded-3xl border border-violet-100 flex items-center gap-4">
                                        <ShieldCheck size={36} className="text-violet-400 shrink-0" />
                                        <div>
                                            <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Loại giấy phép</p>
                                            <p className="font-black text-violet-700 uppercase text-sm">{licenseCategories.find(c => c.id === type)?.name}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1 md:col-span-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên giấy phép / Chứng nhận *</label>
                                            <IMESafeInput
                                                value={licenseName}
                                                onChangeValue={setLicenseName}
                                                placeholder="Ví dụ: Giấy phép vận hành cầu dẫn số 01/2024..."
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-violet-400 outline-none"
                                            />
                                            <p className="text-[10px] text-slate-400 ml-1 italic">Tên này sẽ hiển thị trong danh sách và hỗ trợ tìm kiếm</p>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Đơn vị cấp phép</label>
                                            <IMESafeInput value={licensingAuthority} onChangeValue={setLicensingAuthority} placeholder="Đơn vị cấp phép..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-violet-400 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tổ chức, cá nhân sử dụng</label>
                                            <IMESafeInput value={userOrganization} onChangeValue={setUserOrganization} placeholder="Tổ chức, cá nhân sử dụng..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-violet-400 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mục đích sử dụng</label>
                                            <IMESafeInput value={purposeOfUse} onChangeValue={setPurposeOfUse} placeholder="Mục đích sử dụng..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-violet-400 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Địa điểm lắp đặt</label>
                                            <IMESafeInput value={installationLocation} onChangeValue={setInstallationLocation} placeholder="Địa điểm lắp đặt..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-violet-400 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngày kiểm định/kiểm tra</label>
                                            <IMESafeInput value={inspectionDate} onChangeValue={setInspectionDate} placeholder="dd/mm/yyyy (VD: 30/04/2026)" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-violet-400 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hiệu lực của giấy phép</label>
                                            <IMESafeInput value={expirationDate} onChangeValue={setExpirationDate} placeholder="dd/mm/yyyy (VD: 30/04/2026)" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-violet-400 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cảnh báo hết hạn (Số ngày)</label>
                                            <IMESafeInput value={expirationWarningDays} onChangeValue={setExpirationWarningDays} placeholder="Ví dụ: 30" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-violet-400 outline-none" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{isLicense ? 'Tải giấy phép lên (File đính kèm) *' : 'Tài liệu đính kèm *'}</label>
                                <div className="flex items-center gap-3">
                                    <label className="flex-1 border-2 border-dashed border-slate-200 rounded-2xl p-6 hover:border-violet-400 hover:bg-violet-50 cursor-pointer transition group">
                                        <input type="file" onChange={handleFileChange} className="hidden" />
                                        <div className="flex items-center gap-3 text-slate-500 font-bold">
                                            <div className="p-2 bg-slate-100 group-hover:bg-violet-100 group-hover:text-violet-600 rounded-xl transition"><Upload size={24} /></div>
                                            <div className="text-left"><p className="text-sm">{fileName || 'Chọn file... (PDF, Word, Ảnh)'}</p><p className="text-[10px] font-medium text-slate-400 italic">Dung lượng ưu tiên dưới 2MB</p></div>
                                        </div>
                                    </label>
                                    {fileName && <button onClick={() => { setFileFile(null); setFileName(''); setFileUrl(''); }} className="p-5 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition"><X size={24} /></button>}
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button onClick={() => setViewMode('LIST')} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition">Hủy bỏ</button>
                                <button disabled={isSaving} onClick={handleSave} className="flex-[2] py-4 bg-violet-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-violet-200 hover:bg-violet-700 transition active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2">
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                    {isEditMode ? 'Cập nhật' : (isLicense ? 'Tải Lên Giấy Phép' : 'Lưu quy trình')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
