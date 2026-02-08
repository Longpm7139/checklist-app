'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Package, CheckCircle, Clock, History as HistoryIcon } from 'lucide-react';
import { useUser } from '@/providers/UserProvider';
import { ChecklistItem, SystemCheck } from '@/lib/types';

interface MaterialRequest {
    systemId: string;
    systemName: string;
    itemId: string;
    itemContent: string;
    materialName: string;
    requester: string;
    timestamp: string;
}

interface MaterialHistoryItem extends MaterialRequest {
    approvedAt: string;
    approver?: string;
}

export default function MaterialsPage() {
    const router = useRouter();
    const { user: currentUser } = useUser();
    const [requests, setRequests] = useState<MaterialRequest[]>([]);
    const [history, setHistory] = useState<MaterialHistoryItem[]>([]);
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

    useEffect(() => {
        // Protect Route
        if (currentUser && currentUser.role !== 'ADMIN') {
            router.push('/');
            return;
        }

        const systems: SystemCheck[] = JSON.parse(localStorage.getItem('checklist_systems') || '[]');
        const allDetails: Record<string, ChecklistItem[]> = JSON.parse(localStorage.getItem('checklist_details') || '{}');
        const storedHistory: MaterialHistoryItem[] = JSON.parse(localStorage.getItem('checklist_material_history') || '[]');

        const newRequests: MaterialRequest[] = [];

        systems.forEach(sys => {
            const items = allDetails[sys.id];
            if (items) {
                items.forEach(item => {
                    if (item.materialRequest) {
                        newRequests.push({
                            systemId: sys.id,
                            systemName: sys.name,
                            itemId: item.id,
                            itemContent: item.content,
                            materialName: item.materialRequest,
                            requester: item.inspectorName || 'Unknown',
                            timestamp: item.timestamp || ''
                        });
                    }
                });
            }
        });

        setRequests(newRequests);
        setHistory(storedHistory.sort((a, b) => new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime()));
    }, [currentUser, router]);

    const handleApprove = (req: MaterialRequest) => {
        if (!confirm(`Xác nhận đã cấp phát "${req.materialName}"? Mục này sẽ chuyển sang trạng thái "Fixing" và được lưu vào lịch sử.`)) return;

        const allDetails: Record<string, ChecklistItem[]> = JSON.parse(localStorage.getItem('checklist_details') || '{}');

        if (allDetails[req.systemId]) {
            allDetails[req.systemId] = allDetails[req.systemId].map(d => {
                if (d.id === req.itemId) {
                    return {
                        ...d,
                        materialRequest: undefined, // Clear request
                        status: 'NOK', // Still NOK
                        note: `Đã cấp vật tư: ${req.materialName}. Đang sửa chữa.` // Update note
                    };
                }
                return d;
            });
            localStorage.setItem('checklist_details', JSON.stringify(allDetails));

            // Save to History
            const historyItem: MaterialHistoryItem = {
                ...req,
                approvedAt: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
                approver: currentUser?.name || 'Admin'
            };
            const currentHistory = JSON.parse(localStorage.getItem('checklist_material_history') || '[]');
            const newHistory = [historyItem, ...currentHistory];
            localStorage.setItem('checklist_material_history', JSON.stringify(newHistory));

            // Refresh lists
            setRequests(prev => prev.filter(r => r.itemId !== req.itemId));
            setHistory(newHistory);

            alert("Đã xác nhận cấp phát và lưu vào lịch sử!");
        }
    };

    if (currentUser?.role !== 'ADMIN') return null;

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
            <div className="max-w-6xl mx-auto">
                <header className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.push('/')} className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-100">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold uppercase text-slate-800 flex items-center gap-2">
                            <Package className="text-amber-600" />
                            Quản lý Yêu Cầu Vật Tư
                        </h1>
                        <p className="text-slate-500 text-sm">Theo dõi và cấp phát vật tư sửa chữa</p>
                    </div>
                </header>

                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2 ${activeTab === 'pending'
                            ? 'bg-amber-600 text-white shadow-md'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                    >
                        <Package size={16} />
                        Yêu cầu mới
                        {requests.length > 0 && (
                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{requests.length}</span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2 ${activeTab === 'history'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                    >
                        <CheckCircle size={16} />
                        Lịch sử cấp phát
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
                    {activeTab === 'pending' ? (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-amber-50 text-amber-900 uppercase text-xs font-bold border-b border-amber-100">
                                <tr>
                                    <th className="p-4 w-16 text-center">STT</th>
                                    <th className="p-4">Vật tư yêu cầu</th>
                                    <th className="p-4">Hệ thống / Lỗi</th>
                                    <th className="p-4">Người yêu cầu</th>
                                    <th className="p-4 text-center">Thời gian</th>
                                    <th className="p-4 text-center">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {requests.map((req, idx) => (
                                    <tr key={`${req.systemId}_${req.itemId}`} className="hover:bg-amber-50/30 transition">
                                        <td className="p-4 text-center font-bold text-slate-500">{idx + 1}</td>
                                        <td className="p-4 font-bold text-amber-700 text-lg">
                                            {req.materialName}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-semibold text-slate-800">{req.systemName}</div>
                                            <div className="text-sm text-slate-500">{req.itemContent}</div>
                                        </td>
                                        <td className="p-4 font-medium text-blue-600">
                                            {req.requester}
                                        </td>
                                        <td className="p-4 text-center font-mono text-xs text-slate-500">
                                            {req.timestamp}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => handleApprove(req)}
                                                className="px-3 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 flex items-center gap-2 text-sm font-bold mx-auto transition transform hover:scale-105"
                                            >
                                                <CheckCircle size={16} /> Cấp phát
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {requests.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-slate-500 italic flex flex-col items-center gap-2">
                                            <Package size={48} className="text-slate-200" />
                                            <span>Hiện không có yêu cầu vật tư nào cần xử lý.</span>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-blue-50 text-blue-900 uppercase text-xs font-bold border-b border-blue-100">
                                <tr>
                                    <th className="p-4 w-16 text-center">STT</th>
                                    <th className="p-4">Vật tư đã cấp</th>
                                    <th className="p-4">Hệ thống áp dụng</th>
                                    <th className="p-4">Người yêu cầu</th>
                                    <th className="p-4 text-center">Ngày cấp phát</th>
                                    <th className="p-4 text-center">Người cấp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {history.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-4 text-center font-bold text-slate-500">{idx + 1}</td>
                                        <td className="p-4 font-bold text-slate-700">
                                            {item.materialName}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-semibold text-slate-800">{item.systemName}</div>
                                            <div className="text-xs text-slate-500">{item.itemContent}</div>
                                        </td>
                                        <td className="p-4 text-slate-600">
                                            {item.requester}
                                        </td>
                                        <td className="p-4 text-center font-mono text-sm text-slate-600">
                                            <div className="flex items-center justify-center gap-1">
                                                <Clock size={14} className="text-green-600" />
                                                {item.approvedAt}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center font-bold text-blue-800 text-sm bg-blue-50/50">
                                            {item.approver}
                                        </td>
                                    </tr>
                                ))}
                                {history.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-slate-500 italic flex flex-col items-center gap-2">
                                            <HistoryIcon size={48} className="text-slate-200" />
                                            <span>Chưa có lịch sử cấp phát nào.</span>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
