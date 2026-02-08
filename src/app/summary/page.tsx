'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChecklistItem, SystemCheck } from '@/lib/types';
import { ArrowLeft, Save, RotateCcw, History as HistoryIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface SummaryRow {
    id: string;
    systemName: string;
    issueContent: string;
    timestamp: string;
    fixStatus: 'Fixed' | 'Fixing' | 'No Fix' | 'Pending Material';
    actionDescription: string;
    inspectorName?: string;
}

export default function SummaryPage() {
    const router = useRouter();
    const [rows, setRows] = useState<SummaryRow[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        const systems: SystemCheck[] = JSON.parse(localStorage.getItem('checklist_systems') || '[]');
        const allDetails: Record<string, ChecklistItem[]> = JSON.parse(localStorage.getItem('checklist_details') || '{}');
        const newRows: SummaryRow[] = [];

        // 1. Collect NOK from System Main List
        systems.forEach(sys => {
            // User requested to hide System-level notes in Summary, only show Detailed notes.
            /*
            if (sys.status === 'NOK') {
                newRows.push({
                    id: sys.id,
                    systemName: sys.name,
                    issueContent: sys.note || 'Lỗi hệ thống chung',
                    timestamp: sys.timestamp || new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
                    fixStatus: 'Fixing',
                    actionDescription: ''
                });
            }
            */
            // 2. Collect NOK from Main Details
            const detItems = allDetails[sys.id];
            if (detItems) {
                detItems.forEach(item => {
                    if (item.status === 'NOK') {
                        newRows.push({
                            id: `${sys.id}_${item.id}`,
                            systemName: `${sys.name} > ${item.content}`,
                            issueContent: item.note || 'Lỗi chi tiết',
                            timestamp: item.timestamp || '',
                            fixStatus: item.materialRequest ? 'Pending Material' : 'Fixing',
                            actionDescription: item.materialRequest || '',
                            inspectorName: (item as any).inspectorName
                        });
                    }
                });
            }
        });
        setRows(newRows);
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

    const handleSaveReport = () => {
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

        // 2. Prepare History Items
        const historyItems = fixedRows.map(r => ({
            id: r.id,
            systemName: r.systemName,
            issueContent: r.issueContent,
            timestamp: r.timestamp,
            resolvedAt: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
            actionNote: r.actionDescription,
            inspectorName: r.inspectorName
        }));

        // 3. Save to History
        const currentHistory = JSON.parse(localStorage.getItem('checklist_fixed_history') || '[]');
        const newHistory = [...currentHistory, ...historyItems];
        localStorage.setItem('checklist_fixed_history', JSON.stringify(newHistory));

        // 4. Update Source Data
        let systems: SystemCheck[] = JSON.parse(localStorage.getItem('checklist_systems') || '[]');
        const allDetails: Record<string, ChecklistItem[]> = JSON.parse(localStorage.getItem('checklist_details') || '{}');

        // 4a. Update items in allDetails first
        fixedRows.forEach(row => {
            if (row.id.includes('_')) {
                const lastUnderscoreIndex = row.id.lastIndexOf('_');
                if (lastUnderscoreIndex !== -1) {
                    const sysId = row.id.substring(0, lastUnderscoreIndex);
                    const detId = row.id.substring(lastUnderscoreIndex + 1);

                    if (allDetails[sysId]) {
                        allDetails[sysId] = allDetails[sysId].map(d =>
                            d.id === detId ? { ...d, status: 'OK', note: '', materialRequest: undefined } : d
                        );
                    }
                }
            }
        });

        // 4b. Update Material Requests
        // materialRows is already defined above
        materialRows.forEach(row => {
            if (row.id.includes('_')) {
                const lastUnderscoreIndex = row.id.lastIndexOf('_');
                const sysId = row.id.substring(0, lastUnderscoreIndex);
                const detId = row.id.substring(lastUnderscoreIndex + 1);

                if (allDetails[sysId]) {
                    allDetails[sysId] = allDetails[sysId].map(d =>
                        d.id === detId ? { ...d, materialRequest: row.actionDescription } : d
                    );
                }
            }
        });

        // 4b. Re-evaluate System Status
        // For every system, check if it still has any NOK items in allDetails
        systems = systems.map(sys => {
            const sysDetails = allDetails[sys.id];
            if (sysDetails && sysDetails.length > 0) {
                const hasRemainingErrors = sysDetails.some(d => d.status === 'NOK');
                if (!hasRemainingErrors) {
                    // All clean -> System OK
                    return { ...sys, status: 'OK', note: '' };
                } else {
                    // Still has errors -> System NOK
                    // Ensure it stays NOK
                    return { ...sys, status: 'NOK' };
                }
            }
            // If no details (shouldn't happen for NOK system), trust current status or set OK?
            // If it was NOK but has no details, maybe set OK? 
            // Safest is to check if it was in fixedRows as a system-level error?
            // But we commented out system-level error rows in useEffect.
            // So we rely on details.
            return sys;
        });

        // 5. Save Source Data
        localStorage.setItem('checklist_systems', JSON.stringify(systems));
        localStorage.setItem('checklist_details', JSON.stringify(allDetails));

        alert("Đã lưu các lỗi đã sửa vào lịch sử và cập nhật trạng thái hệ thống!");
        router.push('/fixed'); // Navigate to Fixed page
    };

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
