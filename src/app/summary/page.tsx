'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChecklistItem, SystemCheck } from '@/lib/types';
import { ArrowLeft, Save, RotateCcw, History as HistoryIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { subscribeToSystems, getAllDetails, saveHistoryItem, saveSystem, saveChecklist, getUsers } from '@/lib/firebase';
import { useUser } from '@/providers/UserProvider';
import { User } from '@/lib/types'; // Assuming User type is in types.ts or adding it here if needed

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
    executorNames: string[];
}

export default function SummaryPage() {
    const router = useRouter();
    const { user } = useUser();
    const [rows, setRows] = useState<SummaryRow[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    const [isLoaded, setIsLoaded] = useState(false);
    const [activeRowSelector, setActiveRowSelector] = useState<string | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            const usersData = await getUsers();
            setUsers(usersData);
        };
        fetchUsers();
    }, []);

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
                                detailId: item.id,
                                executorNames: (item.materialRequest || item.status === 'Fixed') ? (item.executorNames || (item.executorName ? [item.executorName] : [])) : [],
                            });
                        }
                    });
                }
            });

            setRows(newRows);
            setIsLoaded(true);
        }, (err: any) => {
            console.error("Summary load error:", err);
            setIsLoaded(true);
        });

        return () => unsub();
    }, []);

    const handleStatusChange = (id: string, status: SummaryRow['fixStatus']) => {
        setRows(prev => prev.map(r => {
            if (r.id === id) {
                const isActionable = status === 'Fixed' || status === 'Pending Material';
                const defaultExecutors = isActionable ? (r.executorNames.length > 0 ? r.executorNames : [user?.name || '']) : [];
                return {
                    ...r,
                    fixStatus: status,
                    actionDescription: status === 'Fixed' ? r.actionDescription : (status === 'Pending Material' ? r.actionDescription : ''),
                    executorNames: defaultExecutors
                };
            }
            return r;
        }));
    };

    const handleToggleExecutor = (rowId: string, userName: string) => {
        setRows(prev => prev.map(r => {
            if (r.id === rowId) {
                const current = r.executorNames;
                if (current.includes(userName)) {
                    const next = current.filter(n => n !== userName);
                    return { ...r, executorNames: next };
                } else {
                    return { ...r, executorNames: [...current, userName] };
                }
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
            const historyPromises = fixedRows.map(r => saveHistoryItem(r.id, {
                // Merging resolution data into existing document (identified by r.id)
                resolvedAt: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
                actionNote: r.actionDescription || '',
                resolverName: r.executorNames.join(', ') || 'Unknown'
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
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { materialRequest, executorName, ...rest } = item;
                        return { ...rest, status: 'OK', note: '', executorNames: fixedRow.executorNames }; // Reset to OK and remove materialRequest
                    }
                    if (materialRow) {
                        modified = true;
                        return { ...item, materialRequest: materialRow.actionDescription, executorNames: materialRow.executorNames };
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

                <div className="w-full">
                    {/* Mobile Card View (hidden on md-up) */}
                    <div className="block md:hidden p-4 space-y-4">
                        {currentItems.length > 0 ? (
                            currentItems.map((row, idx) => (
                                <div key={row.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                                        <div className="flex justify-between items-start gap-2 mb-2">
                                            <span className="text-xs font-black text-slate-400">STT: {indexOfFirstItem + idx + 1}</span>
                                            <span className="text-[10px] font-mono text-slate-400">{row.timestamp}</span>
                                        </div>
                                        <div className="font-bold text-blue-800 leading-snug">{row.systemName}</div>
                                        <div className="text-red-600 text-sm mt-1 italic font-medium">{row.issueContent}</div>
                                    </div>

                                    <div className="p-4 space-y-4">
                                        {/* Status Selection */}
                                        <div className="space-y-2">
                                            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Trạng thái xử lý</div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {[
                                                    { label: 'Fixed', cls: 'bg-green-600 border-green-700', text: 'Fixed' },
                                                    { label: 'Fixing', cls: 'bg-blue-600 border-blue-700', text: 'Fixing' },
                                                    { label: 'No Fix', cls: 'bg-red-600 border-red-700', text: 'No Fix' },
                                                    { label: 'Pending Material', cls: 'bg-amber-500 border-amber-600', text: 'Chờ vật tư' }
                                                ].map(opt => (
                                                    <button
                                                        key={opt.label}
                                                        onClick={() => handleStatusChange(row.id, opt.label as any)}
                                                        className={clsx(
                                                            "px-2 py-2 rounded-lg text-xs font-bold border text-white transition-all active:scale-95",
                                                            row.fixStatus === opt.label ? opt.cls : "bg-slate-100 border-slate-200 text-slate-500"
                                                        )}
                                                    >
                                                        {opt.text}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Executor Selection */}
                                        <div className="space-y-2">
                                            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex justify-between items-center">
                                                Người thực hiện
                                                {row.inspectorName && <span className="normal-case font-medium text-slate-400 italic">Bởi: {row.inspectorName}</span>}
                                            </div>
                                            <div
                                                className={clsx(
                                                    "w-full p-3 rounded-lg border text-sm font-bold text-center transition-all",
                                                    (row.fixStatus === 'Fixed' || row.fixStatus === 'Pending Material')
                                                        ? "bg-blue-50 border-blue-200 text-blue-700 active:bg-blue-100"
                                                        : "bg-slate-50 border-slate-100 text-slate-300 opacity-50 cursor-not-allowed"
                                                )}
                                                onClick={() => (row.fixStatus === 'Fixed' || row.fixStatus === 'Pending Material') && setActiveRowSelector(activeRowSelector === row.id ? null : row.id)}
                                            >
                                                {row.executorNames.length > 0 ? row.executorNames.join(', ') : 'Nhấn để chọn người sửa'}
                                            </div>

                                            {activeRowSelector === row.id && (
                                                <div className="p-3 bg-white border border-blue-200 rounded-lg shadow-inner space-y-2">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[10px] font-bold text-blue-500">DANH SÁCH NHÂN VIÊN</span>
                                                        <button onClick={() => setActiveRowSelector(null)} className="text-slate-400 font-bold text-lg leading-none">&times;</button>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                                                        {users.map(u => (
                                                            <label key={u.id} className={clsx(
                                                                "flex items-center gap-2 p-2 rounded border text-xs font-medium transition",
                                                                row.executorNames.includes(u.name) ? "bg-blue-600 border-blue-700 text-white shadow-sm" : "bg-white border-slate-100 text-slate-600"
                                                            )}>
                                                                <input
                                                                    type="checkbox"
                                                                    className="hidden"
                                                                    checked={row.executorNames.includes(u.name)}
                                                                    onChange={() => handleToggleExecutor(row.id, u.name)}
                                                                />
                                                                <span className="truncate">{u.name}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Description */}
                                        <div className="space-y-2">
                                            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                                {row.fixStatus === 'Pending Material' ? 'Vật tư cần thay thế' : 'Nội dung thực hiện'}
                                            </div>
                                            <textarea
                                                disabled={row.fixStatus !== 'Fixed' && row.fixStatus !== 'Pending Material'}
                                                className={clsx(
                                                    "w-full p-3 rounded-lg border text-sm outline-none transition-all focus:ring-2 focus:ring-blue-100",
                                                    (row.fixStatus === 'Fixed' || row.fixStatus === 'Pending Material')
                                                        ? "bg-white border-slate-300 focus:border-blue-500"
                                                        : "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed"
                                                )}
                                                rows={2}
                                                placeholder={
                                                    row.fixStatus === 'Fixed' ? "Nhập chi tiết công việc..." :
                                                        row.fixStatus === 'Pending Material' ? "Nhập tên vật tư..." :
                                                            "Chỉ nhập khi Fixed hoặc cần Vật tư"
                                                }
                                                value={row.actionDescription}
                                                onChange={(e) => handleActionChange(row.id, e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
                                <span className="italic text-slate-400">Hệ thống hoạt động bình thường, không có lỗi.</span>
                            </div>
                        )}
                    </div>

                    {/* Desktop Table View (hidden on mobile) */}
                    <div className="hidden md:block">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-200 text-slate-700 font-bold uppercase text-sm">
                                <tr>
                                    <th className="p-3 border border-slate-300 w-16 text-center">STT</th>
                                    <th className="p-3 border border-slate-300 w-1/4">Hệ thống / Lỗi</th>
                                    <th className="p-3 border border-slate-300 text-center w-64">Trạng thái (Fixed/Fixing/No Fix)</th>
                                    <th className="p-3 border border-slate-300 w-32 text-center">Thời gian</th>
                                    <th className="p-3 border border-slate-300 w-32 text-center">Người phát hiện</th>
                                    <th className="p-3 border border-slate-300 w-32 text-center">Người sửa chữa</th>
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
                                        <td className="p-3 border border-slate-300 text-center font-medium text-slate-600 text-sm">
                                            {row.inspectorName || '-'}
                                        </td>
                                        <td className="p-3 border border-slate-300 text-center font-bold text-blue-600 text-sm relative">
                                            <div
                                                className={clsx(
                                                    "p-1 rounded transition-colors min-h-[2.5rem] flex items-center justify-center",
                                                    (row.fixStatus === 'Fixed' || row.fixStatus === 'Pending Material') ? "cursor-pointer hover:bg-slate-100" : "cursor-not-allowed opacity-50"
                                                )}
                                                onClick={() => (row.fixStatus === 'Fixed' || row.fixStatus === 'Pending Material') && setActiveRowSelector(activeRowSelector === row.id ? null : row.id)}
                                            >
                                                {row.executorNames.length > 0 ? row.executorNames.join(', ') : '-'}
                                            </div>

                                            {activeRowSelector === row.id && (
                                                <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 w-64 bg-white border border-slate-300 shadow-xl rounded-md overflow-hidden text-left font-normal text-slate-700">
                                                    <div className="p-2 bg-slate-100 border-b border-slate-200 font-bold text-xs uppercase flex justify-between items-center">
                                                        Chọn người thực hiện
                                                        <button onClick={() => setActiveRowSelector(null)} className="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
                                                    </div>
                                                    <div className="max-h-60 overflow-y-auto">
                                                        {users.map(u => (
                                                            <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0">
                                                                <input
                                                                    type="checkbox"
                                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                                    checked={row.executorNames.includes(u.name)}
                                                                    onChange={() => handleToggleExecutor(row.id, u.name)}
                                                                />
                                                                <span className="text-sm font-medium">{u.name}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
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
                            </tbody>
                        </table>
                    </div>
                </div>


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
