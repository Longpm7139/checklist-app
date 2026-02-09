'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChecklistItem, SystemCheck } from '@/lib/types';
import { ArrowLeft, Save, RotateCcw, History as HistoryIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { subscribeToSystems, getAllDetails, addHistoryItem, saveSystem, saveChecklist } from '@/lib/firebase';
import { useUser } from '@/providers/UserProvider';

interface SummaryRow {
    id: string;
    systemName: string;
    issueContent: string;
    timestamp: string;
    fixStatus: 'Fixed' | 'Fixing' | 'No Fix' | 'Pending Material';
    actionDescription: string;
    inspectorName?: string;
    // Helper to know where this came from
    systemId: string;
    detailId?: string;
}

export default function SummaryPage() {
    const router = useRouter();
    const { user } = useUser();
    const [rows, setRows] = useState<SummaryRow[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Load data from Firebase
        // 1. Subscribe to Systems to check for NOK statuses
        const unsub = subscribeToSystems(async (systems: any[]) => {

            // 2. Fetch details for all systems (or just NOK ones)
            // For simplicity and correctness, we fetch all details to check specific items
            const newRows: SummaryRow[] = [];

            const allDetails = await getAllDetails(); // This is a one-time fetch helper we created

            systems.forEach((sys: SystemCheck) => {
                const detItems = allDetails[sys.id];
                if (detItems) {
                    detItems.forEach((item: any) => {
                        if (item.status === 'NOK') {
                            newRows.push({
                                id: `${sys.id}_${item.id}`,
                                systemName: `${sys.name} > ${item.content}`,
                                issueContent: item.note || 'Lỗi chi tiết',
                                timestamp: item.timestamp || '',
                                fixStatus: item.materialRequest ? 'Pending Material' : 'Fixing',
                                actionDescription: item.materialRequest || '',
                                inspectorName: item.inspectorName,
                                systemId: sys.id,
                                detailId: item.id
                            });
                        }
                    });
                }
            });

            setRows(newRows);
            setIsLoaded(true);
        });

        return () => unsub();
    }, []);

    const handleStatusChange = (id: string, status: SummaryRow['fixStatus']) => {
        setRows(prev => prev.map(r => {
            if (r.id === id) {
                return {
                    ...r,
                    fixStatus: status,
                    actionDescription: status === 'Fixed' ? r.actionDescription : '' // Clear if not Fixed
                };
            }
            return r;
        }));
    };

    const handleActionChange = (id: string, val: string) => {
        setRows(prev => prev.map(r => r.id === id ? { ...r, actionDescription: val } : r));
    };

    // Pagination Logic
    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    const currentItems = rows.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(rows.length / ITEMS_PER_PAGE);

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(prev => prev - 1);
    };

    const handleSaveReport = async () => {
        // 0. Check if there are no errors at all
        if (rows.length === 0) {
            router.push('/fixed');
            return;
        }

        // 0.5. Validation for Pending Material
        const invalidMaterial = rows.filter(r => r.fixStatus === 'Pending Material' && !r.actionDescription.trim());
        if (invalidMaterial.length > 0) {
            alert(`Vui lòng nhập tên VẬT TƯ cần thay thế cho ${invalidMaterial.length} mục đã chọn 'Pending Material'!`);
            return;
        }

        // 1. Validation
        const invalidRows = rows.filter(r => r.fixStatus === 'Fixed' && !r.actionDescription.trim());
        if (invalidRows.length > 0) {
            alert(`Vui lòng nhập nội dung xử lý cho ${invalidRows.length} mục đã chọn 'Fixed'!`);
            return;
        }

        const fixedRows = rows.filter(r => r.fixStatus === 'Fixed');
        const materialRows = rows.filter(r => r.fixStatus === 'Pending Material');

        if (fixedRows.length === 0 && materialRows.length === 0) {
            alert("Bạn chưa chọn mục nào là 'Fixed' hoặc cần 'Chờ vật tư' để lưu.");
            return;
        }

        try {
            // 2. Save fixed items to History
            const historyPromises = fixedRows.map(r => addHistoryItem({
                // systemId + detailId helps tracing but history is flat log
                originalId: r.id,
                systemName: r.systemName,
                issueContent: r.issueContent,
                timestamp: r.timestamp || '',
                resolvedAt: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
                actionNote: r.actionDescription || '',
                inspectorName: r.inspectorName || 'Unknown',
                resolverName: user?.name || 'Unknown'
            }));
            await Promise.all(historyPromises);

            // 3. Update Source Data (Firebase)
            // We need to update DETAILS and potentially SYSTEMS status.

            // Group actions by System ID to minimize writes
            const affectedSystemIds = new Set<string>();
            [...fixedRows, ...materialRows].forEach(r => affectedSystemIds.add(r.systemId));

            // Fetch latest details (or use what we have, but fetching safer)
            const allDetails = await getAllDetails();

            for (const sysId of Array.from(affectedSystemIds)) {
                let currentItems = allDetails[sysId] || [];
                let modified = false;

                // Apply fixes
                currentItems = currentItems.map((item: any) => {
                    const fixedRow = fixedRows.find(r => r.systemId === sysId && r.detailId === item.id);
                    const materialRow = materialRows.find(r => r.systemId === sysId && r.detailId === item.id);

                    if (fixedRow) {
                        modified = true;
                        const { materialRequest, ...rest } = item;
                        return { ...rest, status: 'OK', note: '' }; // Reset to OK and remove materialRequest
                    }
                    if (materialRow) {
                        modified = true;
                        return { ...item, materialRequest: materialRow.actionDescription };
                    }
                    return item;
                });

                if (modified) {
                    await saveChecklist(sysId, currentItems);

                    // Re-evaluate System Status
                    const hasRemainingErrors = currentItems.some((d: any) => d.status === 'NOK');
                    const newStatus = hasRemainingErrors ? 'NOK' : 'OK';
                    const newNote = hasRemainingErrors ? 'Có lỗi chi tiết' : '';

                    await saveSystem(sysId, { status: newStatus, note: newNote });
                }
            }

            alert("Đã lưu các lỗi đã sửa vào lịch sử và cập nhật trạng thái hệ thống!");
            router.push('/fixed');

        } catch (error) {
            console.error("Error saving report:", error);
            alert("Đã xảy ra lỗi khi lưu.");
        }
    };

    if (!isLoaded) return <div className="p-8 text-center">Đang tải dữ liệu...</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-900">
            <div className="max-w-6xl mx-auto bg-white border border-slate-300 shadow-sm">
                <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push('/')} className="p-1 hover:bg-white/10 rounded">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="font-bold text-lg uppercase">Bảng Tổng Hợp Lỗi</h1>
                    </div>
                    <button
                        onClick={() => router.push('/fixed')}
                        className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded flex items-center gap-2 text-sm font-medium transition"
                    >
                        <HistoryIcon size={18} /> Lịch Sử
                    </button>
                </div>

                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-200 text-slate-700 font-bold uppercase text-sm">
                        <tr>
                            <th className="p-3 border border-slate-300 w-16 text-center">STT</th>
                            <th className="p-3 border border-slate-300 w-1/4">Hệ thống / Lỗi</th>
                            <th className="p-3 border border-slate-300 text-center w-64">Trạng thái (Fixed/Fixing/No Fix)</th>
                            <th className="p-3 border border-slate-300 w-32 text-center">Thời gian</th>
                            <th className="p-3 border border-slate-300 w-32 text-center">Người thực hiện</th>
                            <th className="p-3 border border-slate-300">Nội dung thực hiện (Giải pháp)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.map((row, idx) => (
                            <tr key={row.id} className="hover:bg-slate-50">
                                <td className="p-3 border border-slate-300 text-center font-bold text-slate-500">{indexOfFirstItem + idx + 1}</td>
                                <td className="p-3 border border-slate-300 font-medium">
                                    <div className="text-blue-800">{row.systemName}</div>
                                    <div className="text-red-600 text-sm mt-1 italic">{row.issueContent}</div>
                                </td>
                                <td className="p-3 border border-slate-300 text-center">
                                    <div className="flex gap-1 justify-center flex-wrap">
                                        {[
                                            { label: 'Fixed', cls: 'bg-green-600 border-green-700' },
                                            { label: 'Fixing', cls: 'bg-blue-600 border-blue-700' },
                                            { label: 'No Fix', cls: 'bg-red-600 border-red-700' },
                                            { label: 'Pending Material', cls: 'bg-amber-500 border-amber-600' }
                                        ].map(opt => (
                                            <button
                                                key={opt.label}
                                                onClick={() => handleStatusChange(row.id, opt.label as any)}
                                                className={clsx(
                                                    "px-2 py-1 rounded text-xs font-bold border text-white transition",
                                                    row.fixStatus === opt.label ? opt.cls : "bg-slate-300 border-slate-400 text-slate-600"
                                                )}
                                            >
                                                {opt.label === 'Pending Material' ? 'Chờ vật tư' : opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </td>
                                <td className="p-3 border border-slate-300 text-center font-mono text-sm">
                                    <div>{row.timestamp}</div>
                                </td>
                                <td className="p-3 border border-slate-300 text-center font-bold text-blue-600 text-sm">
                                    {row.inspectorName || '-'}
                                </td>
                                <td className="p-3 border border-slate-300">
                                    <input
                                        disabled={row.fixStatus !== 'Fixed' && row.fixStatus !== 'Pending Material'}
                                        className={clsx(
                                            "w-full bg-transparent outline-none",
                                            row.fixStatus !== 'Fixed' && "cursor-not-allowed text-slate-400"
                                        )}
                                        placeholder={
                                            row.fixStatus === 'Fixed' ? "Nhập nội dung xử lý..." :
                                                row.fixStatus === 'Pending Material' ? "Nhập tên vật tư..." :
                                                    "Chỉ nhập khi Fixed hoặc cần Vật tư"
                                        }
                                        value={row.actionDescription}
                                        onChange={(e) => handleActionChange(row.id, e.target.value)}
                                    />
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                                    Hệ thống hoạt động bình thường, không có lỗi.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>


                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 p-4 border-t border-slate-200 bg-white">
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

                <div className="p-4 bg-slate-100 border-t border-slate-300 flex justify-end">
                    <button
                        className="px-6 py-3 bg-blue-700 text-white font-bold uppercase rounded shadow hover:bg-blue-800 flex items-center gap-2"
                        onClick={handleSaveReport}
                    >
                        <Save size={20} /> Lưu & Cập Nhật Lịch Sử
                    </button>
                </div>
            </div>

        </div>
    );
}
