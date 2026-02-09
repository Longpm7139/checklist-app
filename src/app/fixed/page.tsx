'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Download, ChevronLeft, ChevronRight, Search, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { subscribeToHistory, deleteHistoryItem } from '@/lib/firebase';
import { useUser } from '@/providers/UserProvider';

interface HistoryItem {
    id: string;
    systemName: string;
    issueContent: string;
    timestamp: string;
    resolvedAt: string;
    actionNote: string;
    inspectorName?: string;
    resolverName?: string;
}

export default function FixedPage() {
    const router = useRouter();
    const { user } = useUser();
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        const unsub = subscribeToHistory((data) => {
            setHistory(data as HistoryItem[]);
        });
        return () => unsub();
    }, []);

    // Search and Pagination Logic
    const filteredHistory = history.filter(item => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            item.systemName.toLowerCase().includes(q) ||
            item.issueContent.toLowerCase().includes(q) ||
            item.actionNote.toLowerCase().includes(q)
        );
    });

    // Reset page when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    const currentItems = filteredHistory.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(prev => prev - 1);
    };

    const handleExport = () => {
        const header = ["STT", "Hệ thống", "Lỗi", "Thời gian lỗi", "Thời gian sửa", "Nội dung sửa", "Người sửa"];
        const rows = history.map((h, index) => [
            `"${index + 1}"`,
            `"${h.systemName}"`,
            `"${h.issueContent}"`,
            `"${h.timestamp}"`,
            `"${h.resolvedAt}"`,
            `"${h.actionNote}"`,
            `"${h.inspectorName || ''}"`
        ]);
        const csv = "\uFEFF" + [header.join(','), ...rows.map(r => r.join(','))].join('\n');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        link.download = `history_${Date.now()}.csv`;
        link.click();
    };

    const handleDelete = async (id: string) => {
        if (confirm('Bạn có chắc chắn muốn xóa mục lịch sử này không? Hành động này không thể hoàn tác.')) {
            try {
                await deleteHistoryItem(id);
                // Data will update automatically via subscription
            } catch (error) {
                console.error("Error deleting history item:", error);
                alert("Đã xảy ra lỗi khi xóa.");
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900">
            <div className="max-w-5xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button onClick={() => router.push('/')} className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-100">
                            <ArrowLeft size={20} className="text-slate-600" />
                        </button>
                        <h1 className="text-2xl font-bold">Lịch Sử Sửa Chữa</h1>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <input
                                type="text"
                                placeholder="Tìm kiếm lịch sử..."
                                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:border-blue-500 outline-none text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        </div>
                        <button onClick={handleExport} className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm flex gap-2 items-center justify-center hover:bg-green-700 shadow-sm whitespace-nowrap">
                            <Download size={16} /> Xuất Excel
                        </button>
                    </div>
                </header>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                                <tr>
                                    <th className="p-4 w-16 text-center">STT</th>
                                    <th className="p-4">Hệ thống</th>
                                    <th className="p-4">Lỗi</th>
                                    <th className="p-4">Thời gian</th>
                                    <th className="p-4">Người thực hiện</th>
                                    <th className="p-4">Khắc phục</th>
                                    {user?.role === 'ADMIN' && <th className="p-4 text-center">Hành động</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {currentItems.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-4 text-center font-bold text-slate-500">
                                            {indexOfFirstItem + idx + 1}
                                        </td>
                                        <td className="p-4 font-medium">{item.systemName}</td>
                                        <td className="p-4 text-red-600">{item.issueContent}</td>
                                        <td className="p-4 text-slate-500">
                                            <div>Err: {item.timestamp}</div>
                                            <div className="text-green-600">Fix: {item.resolvedAt}</div>
                                        </td>
                                        <td className="p-4 text-blue-600 font-bold text-sm">
                                            {item.resolverName || item.inspectorName || '-'}
                                        </td>
                                        <td className="p-4 text-slate-700">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle size={16} className="text-green-500" />
                                                {item.actionNote}
                                            </div>
                                        </td>
                                        {user?.role === 'ADMIN' && (
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded transition"
                                                    title="Xóa mục lịch sử"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {currentItems.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                                            {searchQuery ? 'Không tìm thấy kết quả nào phù hợp.' : 'Chưa có lịch sử sửa chữa nào.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-6">
                        <button
                            onClick={handlePrevPage}
                            disabled={currentPage === 1}
                            className={clsx(
                                "p-2 rounded-full border transition",
                                currentPage === 1
                                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-sm"
                            )}
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-slate-600 font-medium">
                            Trang {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages}
                            className={clsx(
                                "p-2 rounded-full border transition",
                                currentPage === totalPages
                                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-sm"
                            )}
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </div>
        </div >
    );
}
