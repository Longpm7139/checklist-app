'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Siren, CheckCircle, Plus, User, Clock, AlertTriangle } from 'lucide-react';
import { useUser } from '@/providers/UserProvider';
import { Incident } from '@/lib/types';

export default function IncidentsPage() {
    const router = useRouter();
    const { user: currentUser } = useUser();
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [viewMode, setViewMode] = useState<'LIST' | 'CREATE'>('LIST');

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
        // Load Incidents
        const saved = localStorage.getItem('checklist_incidents');
        if (saved) {
            setIncidents(JSON.parse(saved).reverse());
        }

        // Load Users for Multi-select
        fetch('/api/users')
            .then(res => res.json())
            .then(data => {
                if (data.users) setUsers(data.users);
            })
            .catch(err => console.error("Failed to load users", err));
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

        const updated = [newIncident, ...incidents];
        setIncidents(updated);
        localStorage.setItem('checklist_incidents', JSON.stringify(updated));

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

        const updated = incidents.map(inc => {
            if (inc.id === resolvingId) {
                return {
                    ...inc,
                    status: 'RESOLVED',
                    resolvedBy: currentUser?.name || 'Unknown',
                    resolvedAt: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
                    resolutionNote: resolutionNote,
                    participants: selectedParticipants
                } as Incident;
            }
            return inc;
        });

        setIncidents(updated);
        localStorage.setItem('checklist_incidents', JSON.stringify(updated));

        setResolvingId(null);
        alert("Đã xác nhận xử lý xong sự cố!");
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
            <div className="max-w-4xl mx-auto">
                <header className="flex items-center justify-between mb-8">
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
                        <button
                            onClick={() => setViewMode('CREATE')}
                            className="px-4 py-2 bg-red-600 text-white rounded shadow hover:bg-red-700 flex items-center gap-2 font-bold"
                        >
                            <Plus size={20} /> Báo Sự Cố Mới
                        </button>
                    )}
                </header>

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
                    {incidents.length === 0 && (
                        <div className="text-center p-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                            Chưa có sự cố nào được ghi nhận.
                        </div>
                    )}

                    {incidents.map(inc => (
                        <div key={inc.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                        {inc.title}
                                        {inc.status === 'OPEN' ? (
                                            <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full border border-red-200">ĐANG XỬ LÝ</span>
                                        ) : (
                                            <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full border border-green-200">ĐÃ XONG</span>
                                        )}
                                    </h3>
                                    <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                        <AlertTriangle size={14} /> {inc.systemName}
                                        <span className="text-slate-300">|</span>
                                        <Clock size={14} /> {inc.createdAt}
                                    </div>
                                </div>
                                {inc.status === 'OPEN' && (
                                    <button
                                        onClick={() => startResolve(inc.id)}
                                        className="px-3 py-1 bg-blue-600 text-white text-sm font-bold rounded shadow hover:bg-blue-700"
                                    >
                                        Báo cáo Xong
                                    </button>
                                )}
                            </div>

                            <div className="bg-slate-50 p-3 rounded text-slate-700 text-sm mb-3 border border-slate-100">
                                {inc.description || 'Không có mô tả chi tiết.'}
                            </div>

                            {inc.assignedTo && (
                                <div className="text-xs text-slate-500 flex items-center gap-1 mb-2">
                                    <User size={12} /> Giao cho: <span className="font-bold text-slate-700">{inc.assignedTo}</span>
                                </div>
                            )}

                            {inc.status === 'RESOLVED' && (
                                <div className="mt-3 border-t border-slate-100 pt-3">
                                    <div className="flex items-center gap-2 text-green-700 font-bold text-sm mb-1">
                                        <CheckCircle size={16} /> Đã khắc phục bởi {inc.resolvedBy}
                                    </div>
                                    <div className="text-sm text-slate-600 italic">
                                        "{inc.resolutionNote}"
                                    </div>
                                    {inc.participants && inc.participants.length > 0 && (
                                        <div className="text-xs text-slate-500 mt-1">
                                            Tham gia: <span className="font-bold">{inc.participants.join(', ')}</span>
                                        </div>
                                    )}
                                    <div className="text-xs text-slate-400 mt-1 text-right">
                                        Hoàn thành: {inc.resolvedAt}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
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
