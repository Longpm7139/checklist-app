'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Siren, CheckCircle, Plus, User as UserIcon, Clock, AlertTriangle, Search, Download, Loader2, Camera, X, Image as ImageIcon, Trash2, Pencil } from 'lucide-react';

import { useUser } from '@/providers/UserProvider';
import { IMESafeInput, IMESafeTextArea } from '@/components/IMESafeInput';
import { Incident, User } from '@/lib/types';
import { subscribeToIncidents, saveIncident, uploadImage, deleteIncident, subscribeToSystems } from '@/lib/firebase';

import * as XLSX from 'xlsx';

export default function IncidentsPage() {
    const router = useRouter();
    const { user: currentUser } = useUser();
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [viewMode, setViewMode] = useState<'LIST' | 'CREATE'>('LIST');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Systems list for dropdown
    const [systems, setSystems] = useState<any[]>([]);
    const [selectedSystemIds, setSelectedSystemIds] = useState<string[]>([]);

    // Form State
    const [newTitle, setNewTitle] = useState('');
    const [newSystem, setNewSystem] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [assignee, setAssignee] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [customCreatedAt, setCustomCreatedAt] = useState<string>('');

    // Severity & auto-suggest
    const [newSeverity, setNewSeverity] = useState<'CRITICAL' | 'MEDIUM' | 'LOW'>('MEDIUM');
    const [suggestedIncidents, setSuggestedIncidents] = useState<Incident[]>([]);

    const [users, setUsers] = useState<User[]>([]);
    const [resolvingId, setResolvingId] = useState<string | null>(null);
    const [resolutionNote, setResolutionNote] = useState('');
    const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
    const [resImageFile, setResImageFile] = useState<File | null>(null);
    const [resImagePreview, setResImagePreview] = useState<string | null>(null);
    const [isResUploading, setIsResUploading] = useState(false);
    const [zaloModalMessage, setZaloModalMessage] = useState<string | null>(null);
    const [customResolvedAt, setCustomResolvedAt] = useState<string>('');
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [existingImageUrl, setExistingImageUrl] = useState<string>('');
    const [existingResImageUrl, setExistingResImageUrl] = useState<string>('');

    // Helper: Send Zalo message (works on both mobile and desktop)
    const sendZaloMessage = (message: string) => {
        // Try clipboard first (works on desktop / HTTPS)
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(message).then(() => {
                // Clipboard OK -> open Zalo
                window.open('https://zalo.me/', '_blank');
            }).catch(() => {
                // Clipboard failed (mobile) -> show fallback modal
                setZaloModalMessage(message);
            });
        } else {
            // No clipboard API -> show fallback modal directly
            setZaloModalMessage(message);
        }
    };

    useEffect(() => {
        // Subscribe to Systems for dropdown
        const unsubSystems = subscribeToSystems((data) => setSystems(data));
        // Subscribe to Incidents
        const unsub = subscribeToIncidents((data) => {
            // Sort by createdAt desc
            const sorted = (data as Incident[]).sort((a, b) => {
                const parseDate = (d: string) => {
                    if (!d) return 0;
                    const parts = d.split(' ');
                    const datePart = parts.find(p => p.includes('/'));
                    if (!datePart) return 0;
                    const [D, M, Y] = datePart.split('/');
                    return new Date(`${Y}-${M}-${D}`).getTime();
                };
                return parseDate(b.createdAt) - parseDate(a.createdAt);
            });
            setIncidents(sorted);
            setLoading(false);
        });

        // Load Users for Multi-select
        fetch('/api/users')
            .then(res => res.json())
            .then(data => {
                if (data.users) setUsers(data.users);
            })
            .catch(err => console.error("Failed to load users", err));

        return () => { unsub(); unsubSystems(); };
    }, []);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setExistingImageUrl('');
    };

    const handleEditStart = (inc: Incident) => {
        setIsEditing(true);
        setEditingId(inc.id);
        setNewTitle(inc.title);
        
        const ids = inc.systemId ? inc.systemId.split(',').filter(Boolean) : [];
        setSelectedSystemIds(ids);

        let customVal = inc.systemName || '';
        ids.forEach(id => {
            const s = systems.find(sys => sys.id === id);
            if (s) {
                customVal = customVal.replace(s.name, '');
            }
        });
        customVal = customVal.split(',').map(s => s.trim()).filter(Boolean).join(', ');
        
        setNewSystem(customVal);
        setNewDesc(inc.description);
        setNewSeverity(inc.severity || 'MEDIUM');
        setAssignee(inc.assignedTo || '');
        
        const parseToInput = (dateStr: string) => {
            if (!dateStr) return '';
            // Format is "HH:mm DD/MM/YYYY" -> "YYYY-MM-DDTHH:mm"
            const parts = dateStr.split(' ');
            if (parts.length < 2) return '';
            const [time, date] = parts;
            const [D, M, Y] = date.split('/');
            return `${Y}-${M}-${D}T${time}`;
        };
        
        setCustomCreatedAt(parseToInput(inc.createdAt));
        setExistingImageUrl(inc.imageUrl || '');
        setImagePreview(inc.imageUrl || null);

        if (inc.status === 'RESOLVED') {
            setResolutionNote(inc.resolutionNote || '');
            setCustomResolvedAt(parseToInput(inc.resolvedAt || ''));
            setSelectedParticipants(inc.participants || []);
            setExistingResImageUrl(inc.resolutionImageUrl || '');
            setResImagePreview(inc.resolutionImageUrl || null);
        } else {
            // Reset res states just in case
            setResolutionNote('');
            setCustomResolvedAt('');
            setSelectedParticipants([]);
            setExistingResImageUrl('');
            setResImagePreview(null);
        }

        setViewMode('CREATE');
    };

    const handleSaveIncident = async (notifyZalo: boolean = false) => {
        if (!newTitle || (!newSystem && selectedSystemIds.length === 0)) {
            alert("Vui lòng nhập Tên sự cố và chọn Hệ thống!");
            return;
        }

        setIsUploading(true);
        let uploadedUrl = existingImageUrl;
        let uploadedResUrl = existingResImageUrl;

        try {
            if (imageFile) {
                const path = `incidents/${Date.now()}_${imageFile.name}`;
                uploadedUrl = await uploadImage(imageFile, path);
            }

            if (resImageFile) {
                const path = `resolutions/${Date.now()}_${resImageFile.name}`;
                uploadedResUrl = await uploadImage(resImageFile, path);
            }

            const incidentDate = customCreatedAt 
                ? new Date(customCreatedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false })
                : new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false });

            const resolvedDate = customResolvedAt
                ? new Date(customResolvedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false })
                : '';

            const selectedSystemNames = selectedSystemIds.map(id => systems.find(s => s.id === id)?.name).filter(Boolean);
            const systemNameForIncident = [...selectedSystemNames, newSystem].filter(Boolean).join(', ');

            const incidentData: Incident = {
                id: isEditing && editingId ? editingId : Date.now().toString(),
                title: newTitle,
                systemName: systemNameForIncident,
                systemId: selectedSystemIds.length > 0 ? selectedSystemIds.join(',') : undefined,
                description: newDesc,
                status: isEditing && editingId ? (incidents.find(i => i.id === editingId)?.status || 'OPEN') : 'OPEN',
                severity: newSeverity,
                assignedTo: assignee,
                reportedBy: isEditing ? (incidents.find(i => i.id === editingId)?.reportedBy || currentUser?.name || 'Admin') : (currentUser?.name || 'Admin'),
                createdAt: incidentDate,
                imageUrl: uploadedUrl
            } as any;

            // If editing a resolved incident, preserve/update resolution details
            if (isEditing && incidentData.status === 'RESOLVED') {
                incidentData.resolutionNote = resolutionNote;
                incidentData.resolvedAt = resolvedDate;
                incidentData.participants = selectedParticipants;
                incidentData.resolutionImageUrl = uploadedResUrl;
                incidentData.resolvedBy = incidents.find(i => i.id === editingId)?.resolvedBy || currentUser?.name || 'Admin';
            }

            // Save to Firebase
            await saveIncident(incidentData);

            // Notification Logic (only for NEW incidents)
            if (notifyZalo && !isEditing) {
                const message = `[BÁO CÁO SỰ CỐ KHẨN CẤP] 🚨\n\n📌 Tên sự cố: ${newTitle}\n📍 Hệ thống/Khu vực: ${newSystem}\n🕒 Thời gian xảy ra: ${incidentDate}\n📝 Mô tả: ${newDesc || 'Không có mô tả'}\n👤 Người báo: ${currentUser?.name || 'Admin'}${uploadedUrl ? `\n🖼 Ảnh đính kèm: [Xem trong App]` : ''}\n\n👉 Đề nghị kiểm tra xử lý ngay!`;
                alert(isEditing ? "Đã cập nhật sự cố thành công!" : "Đã tạo sự cố thành công!");
                sendZaloMessage(message);
            } else {
                alert(isEditing ? "Đã cập nhật sự cố!" : "Đã tạo sự cố mới!");
            }

            // Reset
            setNewTitle('');
            setNewSystem('');
            setSelectedSystemIds([]);
            setNewDesc('');
            setAssignee('');
            setNewSeverity('MEDIUM');
            setSuggestedIncidents([]);
            setImageFile(null);
            setImagePreview(null);
            setCustomCreatedAt('');
            setResolutionNote('');
            setCustomResolvedAt('');
            setSelectedParticipants([]);
            setResImageFile(null);
            setResImagePreview(null);
            setExistingImageUrl('');
            setExistingResImageUrl('');
            setIsEditing(false);
            setEditingId(null);
            setViewMode('LIST');
        } catch (error) {
            console.error("Failed to save incident", error);
            alert("Lỗi khi lưu sự cố. Vui lòng thử lại!");
        } finally {
            setIsUploading(false);
        }
    };

    const startResolve = (id: string) => {
        setResolvingId(id);
        setResolutionNote('');
        setResImageFile(null);
        setResImagePreview(null);
        
        const now = new Date();
        const isoStr = now.getFullYear() + '-' + 
                     String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(now.getDate()).padStart(2, '0') + 'T' + 
                     String(now.getHours()).padStart(2, '0') + ':' + 
                     String(now.getMinutes()).padStart(2, '0');
        setCustomResolvedAt(isoStr);

        if (currentUser?.name) {
            setSelectedParticipants([currentUser.name]);
        } else {
            setSelectedParticipants([]);
        }
    };

    const handleResImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setResImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setResImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeResImage = () => {
        setResImageFile(null);
        setResImagePreview(null);
    };

    const toggleParticipant = (name: string) => {
        setSelectedParticipants(prev =>
            prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
        );
    };

    const handleDeleteIncident = async (id: string, title: string) => {
        if (!confirm(`Bạn có chắc chắn muốn xóa sự cố "${title}" không? Hành động này không thể hoàn tác.`)) {
            return;
        }

        try {
            await deleteIncident(id);
            alert("Đã xóa sự cố thành công!");
        } catch (error: any) {
            console.error("Lỗi khi xóa sự cố:", error);
            alert("Lỗi khi xóa sự cố: " + error.message);
        }
    };

    const submitResolve = async () => {
        if (!resolutionNote.trim()) {
            alert("Vui lòng nhập nội dung xử lý!");
            return;
        }
        if (selectedParticipants.length === 0) {
            alert("Vui lòng chọn ít nhất 1 người thực hiện!");
            return;
        }

        setIsResUploading(true);
        let uploadedUrl = '';

        try {
            if (resImageFile) {
                const path = `resolutions/${Date.now()}_${resImageFile.name}`;
                uploadedUrl = await uploadImage(resImageFile, path);
            }

            const incidentToUpdate = incidents.find(inc => inc.id === resolvingId);
            if (incidentToUpdate) {
                const updatedIncident: Incident = {
                    ...incidentToUpdate,
                    status: 'RESOLVED',
                    resolvedBy: currentUser?.name || 'Unknown',
                    resolvedAt: customResolvedAt 
                        ? new Date(customResolvedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false })
                        : new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false }),
                    resolutionNote: resolutionNote,
                    participants: selectedParticipants,
                    resolutionImageUrl: uploadedUrl
                };
                await saveIncident(updatedIncident);

                const message = `[THÔNG BÁO XỬ LÝ SỰ CỐ] ✅\n📌 Tên sự cố: ${updatedIncident.title}\n📍 Hệ thống: ${updatedIncident.systemName}\n📝 Nội dung xử lý: ${updatedIncident.resolutionNote}\n👤 Người tham gia: ${updatedIncident.participants?.join(', ') || updatedIncident.resolvedBy}\n🕒 Thời gian: ${updatedIncident.resolvedAt}`;

                sendZaloMessage(message);
            }

            setResolvingId(null);
        } catch (error) {
            console.error("Failed to resolve incident", error);
            alert("Lỗi khi gửi báo cáo xử lý. Vui lòng thử lại!");
        } finally {
            setIsResUploading(false);
        }
    };

    const handleExport = () => {
        const data = incidents.map(inc => ({
            "ID": inc.id,
            "Tên sự cố": inc.title,
            "Hệ thống": inc.systemName,
            "Mô tả": inc.description,
            "Trạng thái": inc.status === 'OPEN' ? 'Đang xử lý' : 'Đã xong',
            "Người báo": inc.reportedBy,
            "Thời gian báo": inc.createdAt,
            "Người được giao": inc.assignedTo,
            "Người xử lý": inc.resolvedBy,
            "Thời gian xử lý": inc.resolvedAt,
            "Nội dung xử lý": inc.resolutionNote,
            "Người tham gia": inc.participants?.join(', ')
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Danh sách sự cố");
        const nowD = new Date();
        const todayStr = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}-${String(nowD.getDate()).padStart(2, '0')}`;
        XLSX.writeFile(wb, `Su_co_bat_thuong_${todayStr}.xlsx`);
    };

    const filteredIncidents = incidents.filter(inc =>
        inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inc.systemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inc.description && inc.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900 overflow-x-hidden">
            <div className="max-w-4xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/')} className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-100">
                            <ArrowLeft size={20} className="text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold uppercase text-red-700 flex items-center gap-2">
                                <Siren className="animate-pulse" />
                                Quản lý Sự Cố Bất Thường
                            </h1>
                            <p className="text-slate-500 text-sm">Xử lý các sự cố khẩn cấp ngoài checklist</p>
                        </div>
                    </div>
                    {viewMode === 'LIST' && (
                        <div className="flex gap-2">
                            <button
                                onClick={handleExport}
                                className="px-3 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 flex items-center gap-2 font-bold text-sm"
                            >
                                <Download size={18} /> Xuất Excel
                            </button>
                            <button
                                onClick={() => {
                                    setViewMode('CREATE');
                                    const now = new Date();
                                    const isoStr = now.getFullYear() + '-' + 
                                                 String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                                                 String(now.getDate()).padStart(2, '0') + 'T' + 
                                                 String(now.getHours()).padStart(2, '0') + ':' + 
                                                 String(now.getMinutes()).padStart(2, '0');
                                    setCustomCreatedAt(isoStr);
                                }}
                                className="px-3 py-2 bg-red-600 text-white rounded shadow hover:bg-red-700 flex items-center gap-2 font-bold text-sm"
                            >
                                <Plus size={18} /> Báo Sự Cố Mới
                            </button>
                        </div>
                    )}
                </header>

                {viewMode === 'LIST' && (
                    <div className="mb-6 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <IMESafeInput
                            type="text"
                            placeholder="Tìm kiếm sự cố theo tên, hệ thống, mô tả..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 shadow-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 transition"
                            value={searchTerm}
                            onChangeValue={(val: string) => setSearchTerm(val)}
                            debounceMs={300}
                        />
                    </div>
                )}

                {viewMode === 'CREATE' && (
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-red-100 mb-6">
                        <div className="flex items-center justify-between mb-4 border-b pb-2">
                            <h2 className="font-bold text-lg text-slate-800">{isEditing ? 'Chỉnh sửa Sự cố' : 'Thông tin Sự cố mới'}</h2>
                            {isEditing && (
                                <button 
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditingId(null);
                                        setViewMode('LIST');
                                        // Reset fields
                                        setNewTitle('');
                                        setNewSystem('');
                                        setSelectedSystemIds([]);
                                        setNewDesc('');
                                        setAssignee('');
                                    }}
                                    className="text-xs font-bold text-red-600 hover:underline"
                                >
                                    Hủy Chỉnh sửa
                                </button>
                            )}
                        </div>
                        <div className="space-y-4">
                            {/* Severity */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Mức độ nghiêm trọng *</label>
                                <div className="flex gap-2 flex-wrap">
                                    {(['CRITICAL', 'MEDIUM', 'LOW'] as const).map(sev => (
                                        <label key={sev} className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition ${
                                            newSeverity === sev
                                                ? sev === 'CRITICAL' ? 'border-red-500 bg-red-50 text-red-700'
                                                    : sev === 'MEDIUM' ? 'border-amber-500 bg-amber-50 text-amber-700'
                                                        : 'border-green-500 bg-green-50 text-green-700'
                                                : 'border-slate-200 bg-white text-slate-500'
                                        }`}>
                                            <input
                                                type="radio"
                                                name="severity"
                                                value={sev}
                                                checked={newSeverity === sev}
                                                onChange={() => setNewSeverity(sev)}
                                                className="hidden"
                                            />
                                            <span className="text-sm font-bold">
                                                {sev === 'CRITICAL' ? '🔴 Khẩn cấp' : sev === 'MEDIUM' ? '🟡 Trung bình' : '🟢 Nhẹ'}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            {/* Date and Time Selection */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                                    <Clock size={16} className="text-red-500" /> Thời gian xảy ra sự cố *
                                </label>
                                <input
                                    type="datetime-local"
                                    className="w-full border border-slate-300 rounded p-2 focus:border-red-500 outline-none bg-white"
                                    value={customCreatedAt}
                                    onChange={(e) => setCustomCreatedAt(e.target.value)}
                                />
                                <p className="text-[10px] text-slate-500 mt-1 italic">
                                    Mặc định là thời gian hiện tại. Bạn có thể thay đổi nếu đang báo cáo sự cố đã xảy ra trước đó.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên sự cố *</label>
                                <IMESafeInput
                                    className="w-full border border-slate-300 rounded p-2 focus:border-red-500 outline-none"
                                    placeholder="VD: Cầu thang A5 bị kẹt..."
                                    value={newTitle}
                                    onChangeValue={(val: string) => {
                                        setNewTitle(val);
                                        // Auto-suggest: tìm sự cố tương tự
                                        if (val.trim().length > 2) {
                                            const q = val.toLowerCase();
                                            const matches = incidents
                                                .filter(i => i.status === 'RESOLVED' && i.resolutionNote && (
                                                    (i.title || '').toLowerCase().includes(q) ||
                                                    (i.systemName || '').toLowerCase().includes(q)
                                                ))
                                                .slice(0, 3);
                                            setSuggestedIncidents(matches);
                                        } else {
                                            setSuggestedIncidents([]);
                                        }
                                    }}
                                />
                                {/* Auto-suggest panel */}
                                {suggestedIncidents.length > 0 && (
                                    <div className="mt-2 border border-amber-200 bg-amber-50 rounded-xl overflow-hidden shadow-md">
                                        <div className="px-3 py-2 bg-amber-100 border-b border-amber-200">
                                            <p className="text-xs font-black text-amber-700 uppercase tracking-wider">💡 Gợi ý từ sổ tay kinh nghiệm</p>
                                        </div>
                                        {suggestedIncidents.map(sug => (
                                            <div key={sug.id} className="px-3 py-2.5 border-b border-amber-100 last:border-0">
                                                <p className="text-xs font-bold text-slate-700 mb-0.5">{sug.title} <span className="text-slate-400 font-normal">— {sug.systemName}</span></p>
                                                <p className="text-xs text-green-700 leading-relaxed line-clamp-2">✅ {sug.resolutionNote}</p>
                                                {sug.participants && <p className="text-[10px] text-slate-400 mt-0.5">👤 {sug.participants.join(', ')}</p>}
                                            </div>
                                        ))}
                                        <div className="px-3 py-1.5 text-center">
                                            <button onClick={() => window.open('/knowledge', '_blank')} className="text-[10px] font-bold text-amber-600 hover:text-amber-700">Xem đầy đủ sổ tay kinh nghiệm →</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Hệ thống / Thiết bị *</label>
                                {/* Dropdown chọn từ danh sách hệ thống → tự động link Lý Lịch TB */}
                                <select
                                    className="w-full border border-slate-300 rounded p-2 focus:border-red-500 outline-none bg-white text-sm mb-2"
                                    value=""
                                    onChange={e => {
                                        const id = e.target.value;
                                        if (!id) return;
                                        if (!selectedSystemIds.includes(id)) {
                                            setSelectedSystemIds(prev => [...prev, id]);
                                        }
                                    }}
                                >
                                    <option value="">-- Chọn thiết bị từ danh sách (có thể chọn nhiều) --</option>
                                    {[...systems].sort((a, b) => a.id.localeCompare(b.id)).map(s => (
                                        <option key={s.id} value={s.id}>{s.id} · {s.name}</option>
                                    ))}
                                </select>

                                {selectedSystemIds.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {selectedSystemIds.map(id => {
                                            const sys = systems.find(s => s.id === id);
                                            return (
                                                <span key={id} className="bg-blue-100 text-blue-800 text-[12px] px-2 py-1 rounded flex items-center gap-1 font-bold shadow-sm">
                                                    {sys?.id} · {sys?.name || id}
                                                    <X size={14} className="cursor-pointer hover:text-red-500 ml-1" onClick={() => {
                                                        setSelectedSystemIds(prev => prev.filter(x => x !== id));
                                                    }} />
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}

                                <IMESafeInput
                                    className="w-full border border-slate-300 rounded p-2 focus:border-red-500 outline-none mt-2"
                                    placeholder="Hệ thống ngoài danh sách (nhập tay)..."
                                    value={newSystem}
                                    onChangeValue={(val: string) => setNewSystem(val)}
                                />
                                <p className="text-[10px] text-blue-600 mt-1 italic">💡 Chọn từ danh sách để tự động link dữ liệu vào Sổ Lý Lịch Thiết Bị</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả chi tiết</label>
                                <IMESafeTextArea
                                    className="w-full border border-slate-300 rounded p-2 focus:border-red-500 outline-none"
                                    rows={3}
                                    placeholder="Mô tả hiện trạng..."
                                    value={newDesc}
                                    onChangeValue={(val: string) => setNewDesc(val)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Giao cho nhân viên (Mã NV) - Bỏ trống nếu chung</label>
                                <IMESafeInput
                                    className="w-full border border-slate-300 rounded p-2 focus:border-red-500 outline-none"
                                    placeholder="VD: NV001"
                                    value={assignee}
                                    onChangeValue={(val: string) => setAssignee(val)}
                                />
                            </div>

                            {/* Photo Upload Section */}
                            <div className="pt-2">
                                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <Camera size={18} className="text-red-600" /> Hình ảnh sự cố (Báo ngay)
                                </label>
                                
                                <div className="flex flex-wrap gap-4 items-center">
                                    {!imagePreview ? (
                                        <label className="flex flex-col items-center justify-center w-32 h-32 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:bg-slate-100 transition hover:border-red-400 group">
                                            <Camera size={28} className="text-slate-400 group-hover:text-red-500 mb-1" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Chụp ảnh</span>
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                accept="image/*" 
                                                capture="environment"
                                                onChange={handleImageChange}
                                            />
                                        </label>
                                    ) : (
                                        <div className="relative w-32 h-32 rounded-xl border border-slate-200 overflow-hidden shadow-sm group">
                                            <img 
                                                src={imagePreview} 
                                                alt="Preview" 
                                                className="w-full h-full object-cover"
                                            />
                                            <button 
                                                onClick={removeImage}
                                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 transition active:scale-90"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )}
                                    
                                    <div className="flex-1 min-w-[200px]">
                                        <p className="text-xs text-slate-500 leading-relaxed italic">
                                            - Chụp ảnh hiện trạng để lãnh đạo quan sát và đưa ra chỉ đạo kịp thời.<br/>
                                            - Định dạng cho phép: JPG, PNG.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {isEditing && incidents.find(i => i.id === editingId)?.status === 'RESOLVED' && (
                            <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                                <h3 className="text-sm font-black text-green-700 uppercase tracking-widest flex items-center gap-2">
                                    <CheckCircle size={16} /> Chỉnh sửa kết quả xử lý (Admin)
                                </h3>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Nội dung xử lý *</label>
                                    <IMESafeTextArea
                                        className="w-full border border-slate-300 rounded p-2 focus:border-green-500 outline-none bg-green-50/30"
                                        rows={3}
                                        placeholder="Mô tả công việc đã thực hiện..."
                                        value={resolutionNote}
                                        onChangeValue={(val: string) => setResolutionNote(val)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Thời gian khắc phục *</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full border border-slate-300 rounded p-2 focus:border-green-500 outline-none bg-green-50/30"
                                        value={customResolvedAt}
                                        onChange={(e) => setCustomResolvedAt(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Người tham gia xử lý:</label>
                                    <div className="max-h-32 overflow-y-auto border border-slate-200 rounded p-2 bg-slate-50 grid grid-cols-2 gap-2">
                                        {users.map(u => (
                                            <label key={u.id} className="flex items-center gap-2 p-1.5 bg-white rounded border border-slate-100 cursor-pointer hover:bg-blue-50">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedParticipants.includes(u.name)}
                                                    onChange={() => toggleParticipant(u.name)}
                                                    className="w-3 h-3 text-blue-600 rounded"
                                                />
                                                <span className="text-[11px] font-medium text-slate-700 truncate">{u.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                        <Camera size={18} className="text-green-600" /> Hình ảnh bằng chứng đã xong
                                    </label>
                                    <div className="flex items-center gap-4">
                                        {!resImagePreview ? (
                                            <label className="flex flex-col items-center justify-center w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:bg-blue-50 transition group">
                                                <Camera size={24} className="text-slate-400 group-hover:text-blue-500 mb-1" />
                                                <input 
                                                    type="file" 
                                                    className="hidden" 
                                                    accept="image/*" 
                                                    capture="environment"
                                                    onChange={handleResImageChange}
                                                />
                                            </label>
                                        ) : (
                                            <div className="relative w-24 h-24 rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                                                <img src={resImagePreview} className="w-full h-full object-cover" alt="Res Preview" />
                                                <button onClick={removeResImage} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"><X size={12} /></button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    setEditingId(null);
                                    setViewMode('LIST');
                                }}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded"
                                disabled={isUploading}
                            >
                                {isEditing ? 'Đóng' : 'Hủy'}
                            </button>
                            <button
                                onClick={() => handleSaveIncident(false)}
                                className="px-4 py-2 bg-red-600 text-white font-bold rounded shadow hover:bg-red-700 flex items-center gap-2"
                                disabled={isUploading}
                            >
                                {isUploading ? <Loader2 className="animate-spin" size={18} /> : (isEditing ? 'Lưu thay đổi' : 'Tạo Sự Cố')}
                            </button>
                            {!isEditing && (
                                <button
                                    onClick={() => handleSaveIncident(true)}
                                    className="px-4 py-2 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700 flex items-center gap-2"
                                    disabled={isUploading}
                                >
                                    {isUploading ? <Loader2 className="animate-spin" size={18} /> : (
                                        <>
                                            <span className="font-extrabold text-xl">Z</span> Tạo & Báo Zalo
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center p-12">
                            <Loader2 className="animate-spin mx-auto text-red-500 mb-2" size={32} />
                            <span className="text-slate-500">Đang tải dữ liệu...</span>
                        </div>
                    ) : filteredIncidents.length === 0 ? (
                        <div className="text-center p-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                            {searchTerm ? 'Không tìm thấy kết quả phù hợp.' : 'Chưa có sự cố nào được ghi nhận.'}
                        </div>
                    ) : (
                        filteredIncidents.map(inc => (
                            <div key={inc.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition group">
                                <div className="p-4 md:p-5">
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                                <h3 className="font-bold text-lg text-slate-800 leading-tight">
                                                    {inc.title}
                                                </h3>
                                                {inc.status === 'OPEN' ? (
                                                    <span className="bg-red-50 text-red-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-red-200 uppercase tracking-tighter">ĐANG XỬ LÝ</span>
                                                ) : (
                                                    <span className="bg-green-50 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-green-200 uppercase tracking-tighter shadow-sm">ĐÃ XONG</span>
                                                )}
                                                {currentUser?.role === 'ADMIN' && (
                                                    <div className="ml-auto flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleEditStart(inc)}
                                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Sửa sự cố (Chỉ Admin)"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteIncident(inc.id, inc.title)}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Xóa sự cố (Chỉ Admin)"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-slate-400 font-medium flex flex-wrap items-center gap-x-3 gap-y-1">
                                                <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                                    <AlertTriangle size={12} className="text-amber-500" /> {inc.systemName}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={12} /> {inc.createdAt}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <UserIcon size={12} /> {inc.reportedBy}
                                                </div>
                                            </div>
                                        </div>
                                        {inc.status === 'OPEN' && (
                                            <button
                                                onClick={() => startResolve(inc.id)}
                                                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white text-sm font-black rounded-lg shadow-md hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle size={16} /> Báo cáo Xong
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                        <div className="md:col-span-2 bg-slate-50/80 p-3 rounded-lg text-slate-700 text-sm border border-slate-100 italic leading-relaxed">
                                            {inc.description || 'Không có mô tả chi tiết.'}
                                        </div>
                                        {inc.imageUrl && (
                                            <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 shadow-sm cursor-pointer hover:opacity-90 transition"
                                                 onClick={() => setViewingImage(inc.imageUrl || null)}>
                                                <img 
                                                    src={inc.imageUrl} 
                                                    alt="Sự cố" 
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute top-1 right-1 bg-black/40 text-white p-1 rounded-full">
                                                    <Camera size={12} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {(inc.assignedTo || inc.status === 'RESOLVED') && (
                                        <div className="space-y-3 pt-3 border-t border-slate-100">
                                            {inc.assignedTo && (
                                                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                                    Giao cho: <span className="font-bold text-slate-700">{inc.assignedTo}</span>
                                                </div>
                                            )}
                                            {inc.status === 'RESOLVED' && (
                                                <div className="bg-green-50/50 p-3 rounded-lg border border-green-100/50">
                                                    <div className="flex items-center gap-2 text-green-700 font-black text-xs uppercase tracking-wider mb-2">
                                                        <CheckCircle size={14} /> Đã khắc phục bởi {inc.resolvedBy}
                                                    </div>
                                                    <div className="text-sm text-slate-700 font-medium leading-relaxed">
                                                        "{inc.resolutionNote}"
                                                    </div>
                                                    {inc.resolutionImageUrl && (
                                                        <div className="mt-2 w-32 h-24 rounded border overflow-hidden cursor-pointer hover:opacity-90"
                                                             onClick={() => setViewingImage(inc.resolutionImageUrl || null)}>
                                                            <img src={inc.resolutionImageUrl} className="w-full h-full object-cover" alt="Bằng chứng xử lý" />
                                                        </div>
                                                    )}
                                                    <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-[10px]">
                                                        {inc.participants && inc.participants.length > 0 && (
                                                            <div className="text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-100">
                                                                Tham gia: <span className="font-bold text-slate-700">{inc.participants.join(', ')}</span>
                                                            </div>
                                                        )}
                                                        <div className="text-slate-400 italic ml-auto">
                                                            Phút: {inc.resolvedAt}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
            {resolvingId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-fade-in">
                        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <CheckCircle className="text-green-600" />
                            Xác nhận xử lý xong
                        </h3>
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-slate-700 mb-2">1. Nội dung xử lý:</label>
                            <IMESafeTextArea
                                className="w-full border border-slate-300 rounded p-3 focus:border-blue-500 outline-none bg-slate-50"
                                rows={3}
                                placeholder="Mô tả công việc đã thực hiện..."
                                value={resolutionNote}
                                onChangeValue={(val: string) => setResolutionNote(val)}
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                <Clock size={16} className="text-green-600" /> 2. Thời gian khắc phục:
                            </label>
                            <input
                                type="datetime-local"
                                className="w-full border border-slate-300 rounded p-2 focus:border-green-500 outline-none bg-slate-50"
                                value={customResolvedAt}
                                onChange={(e) => setCustomResolvedAt(e.target.value)}
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-slate-700 mb-2">3. Người tham gia xử lý:</label>
                            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded p-2 bg-slate-50 grid grid-cols-2 gap-2">
                                {users.map(u => (
                                    <label key={u.id} className="flex items-center gap-2 p-2 bg-white rounded border border-slate-100 cursor-pointer hover:bg-blue-50">
                                        <input
                                            type="checkbox"
                                            checked={selectedParticipants.includes(u.name)}
                                            onChange={() => toggleParticipant(u.name)}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-slate-700 truncate">{u.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-slate-700 mb-2">4. Hình ảnh bằng chứng đã xong:</label>
                            <div className="flex items-center gap-4">
                                {!resImagePreview ? (
                                    <label className="flex flex-col items-center justify-center w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:bg-blue-50 transition group">
                                        <Camera size={24} className="text-slate-400 group-hover:text-blue-500 mb-1" />
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            accept="image/*" 
                                            capture="environment"
                                            onChange={handleResImageChange}
                                        />
                                    </label>
                                ) : (
                                    <div className="relative w-24 h-24 rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                                        <img src={resImagePreview} className="w-full h-full object-cover" alt="Res Preview" />
                                        <button onClick={removeResImage} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"><X size={12} /></button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setResolvingId(null)} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded font-medium" disabled={isResUploading}>Hủy bỏ</button>
                            <button onClick={submitResolve} className="px-6 py-2 bg-green-600 text-white font-bold rounded shadow hover:bg-green-700 flex items-center gap-2" disabled={isResUploading}>
                                {isResUploading ? <Loader2 className="animate-spin" size={18} /> : 'Xác nhận hoàn thành & ZCopy'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {viewingImage && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 cursor-pointer" onClick={() => setViewingImage(null)}>
                    <button className="absolute top-6 right-6 text-white bg-white/20 p-2 rounded-full hover:bg-white/40 transition"><X size={32} /></button>
                    <img src={viewingImage} alt="Full view" className="max-w-full max-h-full object-contain rounded shadow-2xl animate-scale-in" />
                </div>
            )}
            {zaloModalMessage && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in slide-in-from-bottom-4 duration-300">
                        <div className="p-4 bg-blue-600 rounded-t-2xl flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl font-black text-white">Z</span>
                                <div>
                                    <div className="text-white font-bold text-sm">Gửi tin nhắn Zalo</div>
                                    <div className="text-blue-200 text-[11px]">Sao chép và dán vào nhóm chat Zalo</div>
                                </div>
                            </div>
                            <button onClick={() => setZaloModalMessage(null)} className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/20 transition"><X size={20} /></button>
                        </div>
                        <div className="p-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 max-h-48 overflow-y-auto">
                                <pre className="text-sm text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">{zaloModalMessage}</pre>
                            </div>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        if (navigator.clipboard && navigator.clipboard.writeText) {
                                            navigator.clipboard.writeText(zaloModalMessage).then(() => alert('Đã sao chép! Hãy mở Zalo và dán vào nhóm chat.')).catch(() => alert('Hãy bôi đen và sao chép đoạn văn bản trên, sau đó dán vào Zalo.'));
                                        } else {
                                            alert('Hãy bôi đen và sao chép đoạn văn bản trên, sau đó dán vào Zalo.');
                                        }
                                    }}
                                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all shadow-md"
                                >
                                    📋 Sao chép nội dung
                                </button>
                                <a
                                    href="https://zalo.me/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => setZaloModalMessage(null)}
                                    className="w-full py-3 bg-green-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 active:scale-95 transition-all shadow-md text-center"
                                >
                                    <span className="text-xl font-black">Z</span> Mở Zalo
                                </a>
                                <button
                                    onClick={() => setZaloModalMessage(null)}
                                    className="w-full py-2 text-slate-500 hover:text-slate-700 font-medium text-sm"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
