'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Siren, CheckCircle, Plus, User, Clock, AlertTriangle } from 'lucide-react';
import { useUser } from '@/providers/UserProvider';

import { Incident } from '@/lib/types';
import { subscribeToIncidents, saveIncident } from '@/lib/firebase';
import * as XLSX from 'xlsx';
import { Search, Download, Loader2 } from 'lucide-react';

export default function IncidentsPage() {
    const router = useRouter();
    const { user: currentUser } = useUser();
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [viewMode, setViewMode] = useState<'LIST' | 'CREATE'>('LIST');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [newTitle, setNewTitle] = useState('');
    const [newSystem, setNewSystem] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [assignee, setAssignee] = useState('');

    const [users, setUsers] = useState<{ id: number, name: string, code: string }[]>([]);
    const [resolvingId, setResolvingId] = useState<string | null>(null);
    const [resolutionNote, setResolutionNote] = useState('');
    const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

    useEffect(() => {
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

        return () => unsub();
    }, []);

    const handleCreate = (notifyZalo: boolean = false) => {
        if (!newTitle || !newSystem) {
            alert("Vui lòng nhập Tên sự cố và Hệ thống!");
            return;
        }



        const newIncident: Incident = {
            id: Date.now().toString(),
            title: newTitle,
            systemName: newSystem,
            description: newDesc,
            status: 'OPEN',
            assignedTo: assignee,
            reportedBy: currentUser?.name || 'Admin',
            createdAt: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
        };

        // Save to Firebase
        saveIncident(newIncident);

        // Notification Logic
        if (notifyZalo) {
            const message = `[BÁO CÁO SỰ CỐ KHẨN CẤP] 🚨\n\n📌 Tên sự cố: ${newTitle}\n📍 Hệ thống/Khu vực: ${newSystem}\n📝 Mô tả: ${newDesc || 'Không có mô tả'}\n👤 Người báo: ${currentUser?.name || 'Admin'}\n\n👉 Đề nghị kiểm tra xử lý ngay!`;

            navigator.clipboard.writeText(message).then(() => {
                alert("Đã tạo sự cố và COPY nội dung thông báo!\nTrang Zalo sẽ được mở ngay sau đây, hãy PASTE vào nhóm chat.");
                window.open('https://zalo.me/', '_blank');
            }).catch(() => {
                alert("Đã tạo sự cố nhưng không thể COPY tự động. Vui lòng kiểm tra lại.");
            });
        } else {
            alert("Đã tạo sự cố mới!");
        }

        // Reset
        setNewTitle('');
        setNewSystem('');
        setNewDesc('');
        setAssignee('');
        setViewMode('LIST');
    };

    const startResolve = (id: string) => {
        setResolvingId(id);
        setResolutionNote('');
        if (currentUser?.name) {
            setSelectedParticipants([currentUser.name]);
        } else {
            setSelectedParticipants([]);
        }
    };

    const toggleParticipant = (name: string) => {
        setSelectedParticipants(prev =>
            prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
        );
    };

    const submitResolve = () => {
        if (!resolutionNote.trim()) {
            alert("Vui lòng nhập nội dung xử lý!");
            return;
        }
        if (selectedParticipants.length === 0) {
            alert("Vui lòng chọn ít nhất 1 người thực hiện!");
            return;
        }

        const incidentToUpdate = incidents.find(inc => inc.id === resolvingId);
        if (incidentToUpdate) {
            const updatedIncident: Incident = {
                ...incidentToUpdate,
                status: 'RESOLVED',
                resolvedBy: currentUser?.name || 'Unknown',
                resolvedAt: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
                resolutionNote: resolutionNote,
                participants: selectedParticipants
            };
            saveIncident(updatedIncident);
        }

        setResolvingId(null);
        alert("Đã xác nhận xử lý xong sự cố!");
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
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
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
                    {currentUser?.role === 'ADMIN' && viewMode === 'LIST' && (
                        <div className="flex gap-2">
                            <button
                                onClick={handleExport}
                                className="px-3 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 flex items-center gap-2 font-bold text-sm"
                            >
                                <Download size={18} /> Xuất Excel
                            </button>
                            <button
                                onClick={() => setViewMode('CREATE')}
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
                        <input
                            type="text"
                            placeholder="Tìm kiếm sự cố theo tên, hệ thống, mô tả..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 shadow-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 transition"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                )}

                {viewMode === 'CREATE' && (
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-red-100 mb-6">
                        <h2 className="font-bold text-lg mb-4 text-slate-800 border-b pb-2">Thông tin Sự cố mới</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên sự cố *</label>
                                <input
                                    className="w-full border border-slate-300 rounded p-2 focus:border-red-500 outline-none"
                                    placeholder="VD: Cầu thang A5 bị kẹt..."
                                    value={newTitle}
                                    onChange={e => setNewTitle(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Hệ thống / Vị trí *</label>
                                <input
                                    className="w-full border border-slate-300 rounded p-2 focus:border-red-500 outline-none"
                                    placeholder="VD: Khu vực sân đỗ số 5"
                                    value={newSystem}
                                    onChange={e => setNewSystem(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả chi tiết</label>
                                <textarea
                                    className="w-full border border-slate-300 rounded p-2 focus:border-red-500 outline-none"
                                    rows={3}
                                    placeholder="Mô tả hiện trạng..."
                                    value={newDesc}
                                    onChange={e => setNewDesc(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Giao cho nhân viên (Mã NV) - Bỏ trống nếu chung</label>
                                <input
                                    className="w-full border border-slate-300 rounded p-2 focus:border-red-500 outline-none"
                                    placeholder="VD: NV001"
                                    value={assignee}
                                    onChange={e => setAssignee(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                onClick={() => setViewMode('LIST')}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => handleCreate(false)}
                                className="px-4 py-2 bg-red-600 text-white font-bold rounded shadow hover:bg-red-700"
                            >
                                Tạo Sự Cố
                            </button>
                            <button
                                onClick={() => handleCreate(true)}
                                className="px-4 py-2 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700 flex items-center gap-2"
                            >
                                <span className="font-extrabold text-xl">Z</span> Tạo & Báo Zalo
                            </button>
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
                                            </div>
                                            <div className="text-[11px] text-slate-400 font-medium flex flex-wrap items-center gap-x-3 gap-y-1">
                                                <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                                    <AlertTriangle size={12} className="text-amber-500" /> {inc.systemName}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={12} /> {inc.createdAt}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <User size={12} /> {inc.reportedBy}
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

                                    <div className="bg-slate-50/80 p-3 rounded-lg text-slate-700 text-sm mb-4 border border-slate-100 italic leading-relaxed">
                                        {inc.description || 'Không có mô tả chi tiết.'}
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

            {/* Resolve Modal */}
            {resolvingId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-fade-in">
                        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <CheckCircle className="text-green-600" />
                            Xác nhận xử lý xong
                        </h3>

                        <div className="mb-4">
                            <label className="block text-sm font-bold text-slate-700 mb-2">1. Nội dung xử lý:</label>
                            <textarea
                                className="w-full border border-slate-300 rounded p-3 focus:border-blue-500 outline-none bg-slate-50"
                                rows={3}
                                placeholder="Mô tả công việc đã thực hiện..."
                                value={resolutionNote}
                                onChange={e => setResolutionNote(e.target.value)}
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-bold text-slate-700 mb-2">2. Người tham gia xử lý (được cộng điểm KPI):</label>
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
                                {users.length === 0 && <div className="text-sm text-slate-400 p-2 col-span-2 text-center">Đang tải danh sách nhân viên...</div>}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setResolvingId(null)}
                                className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded font-medium"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={submitResolve}
                                className="px-6 py-2 bg-green-600 text-white font-bold rounded shadow hover:bg-green-700"
                            >
                                Xác nhận hoàn thành
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
