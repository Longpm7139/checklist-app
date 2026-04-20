'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { IMESafeInput, IMESafeTextArea } from '@/components/IMESafeInput';
import {
    Package,
    CheckCircle,
    Clock,
    Trash2,
    Search,
    ArrowLeft,
    History as HistoryIcon,
    User as UserIcon,
    ChevronLeft,
    ChevronRight,
    FileText,
    Settings,
    ShieldCheck,
    CheckSquare,
    Save,
    RotateCcw,
    Wrench
} from 'lucide-react';
import clsx from 'clsx';
import { subscribeToSystems, getAllDetails, saveHistoryItem, saveSystem, saveChecklist, getUsers } from '@/lib/firebase';
import { useUser } from '@/providers/UserProvider';
import { ChecklistItem, SystemCheck, User } from '@/lib/types';

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
    imageUrl?: string;
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
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [zaloModalMessage, setZaloModalMessage] = useState<string | null>(null);

    const sendZaloMessage = (message: string) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(message).then(() => {
                alert('Đã lưu lịch sử và ĐÃ SAO CHÉP báo cáo vào Clipboard! Dán (Ctrl+V) vào nhóm Zalo.');
                router.push('/fixed');
            }).catch(() => {
                setZaloModalMessage(message);
            });
        } else {
            setZaloModalMessage(message);
        }
    };

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
                                imageUrl: item.imageUrl || sys.imageUrl
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
                return {
                    ...r,
                    fixStatus: status,
                    // Only keep executor/action data when Fixed; clear them otherwise
                    executorNames: status === 'Fixed' ? r.executorNames : [],
                    actionDescription: status === 'Fixed' ? r.actionDescription : ''
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

        // Validation: Fixed rows must have actionDescription
        const invalidRows = rows.filter(r => r.fixStatus === 'Fixed' && !r.actionDescription.trim());
        if (invalidRows.length > 0) {
            alert(`Vui lòng nhập nội dung xử lý cho ${invalidRows.length} mục đã chọn 'Fixed'!`);
            return;
        }

        const fixedRows = rows.filter(r => r.fixStatus === 'Fixed');
        const materialRows = rows.filter(r => r.fixStatus === 'Pending Material');

        if (fixedRows.length === 0) {
            alert("Bạn chưa chọn mục nào là 'Fixed' để lưu. Các mục đang 'Fixing' hoặc 'Chờ vật tư' sẽ được giữ nguyên trạng thái lỗi.");
            return;
        }

        try {
            if (fixedRows.length > 0) {
                alert(`Đang bắt đầu lưu ${fixedRows.length} mục vào Lịch sử sửa chữa...`);
            }

            const historyPromises = fixedRows.map(async (r) => {
                try {
                    // Calculate sDateStr to match CheckPage's ID logic
                    const todayD = new Date();
                    const currentH = todayD.getHours();
                    const sD = new Date(todayD);
                    if (currentH < 7) {
                        sD.setDate(sD.getDate() - 1);
                    }
                    const sDateStr = `${sD.getFullYear()}-${String(sD.getMonth() + 1).padStart(2, '0')}-${String(sD.getDate()).padStart(2, '0')}`;
                    const historyId = `${r.systemId}_${r.detailId}_${sDateStr}`;

                    await saveHistoryItem(historyId, {
                        id: historyId,
                        systemId: r.systemId,
                        systemName: r.systemName,
                        issueContent: r.issueContent,
                        timestamp: r.timestamp,
                        inspectorName: r.inspectorName,
                        resolvedAt: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false }),
                        actionNote: r.actionDescription || '',
                        resolverName: r.executorNames.join(', ') || 'Unknown',
                        imageUrl: r.imageUrl || '',
                        fixStatus: 'Fixed'
                    });
                } catch (err: any) {
                    console.error(`Lỗi khi lưu mục ${r.id}:`, err);
                    throw new Error(`Không thể lưu mục ${r.systemName}: ${err.message}`);
                }
            });
            await Promise.all(historyPromises);

            if (fixedRows.length > 0) {
                console.log(`${fixedRows.length} history items saved.`);
            }

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
                    const newStatus = hasRemainingErrors ? 'NOK' : 'NA';
                    const newNote = hasRemainingErrors ? 'Có lỗi chi tiết' : '';

                    await saveSystem(sysId, {
                        status: newStatus,
                        note: newNote,
                        ...(newStatus === 'NA' ? { inspectorName: null, inspectorCode: null } : {})
                    });
                }
            }
            // Build Zalo message for all fixed & material rows
            const actionableRows = [...fixedRows, ...materialRows];
            let zaloText = "[THÔNG BÁO XỬ LÝ LỖI] 🛠\n";
            actionableRows.forEach((r, idx) => {
                zaloText += `${idx + 1}. Hệ thống: ${r.systemName}
🚨 Lỗi: ${r.issueContent}
⚙️ Trạng thái: ${r.fixStatus === 'Pending Material' ? 'Chờ vật tư' : 'Đã khắc phục'}
📝 Nội dung: ${r.actionDescription || 'Chưa nhập chi tiết'}
👤 Người thực hiện: ${r.executorNames.length > 0 ? r.executorNames.join(', ') : 'Chưa nhập'}\n\n`;
            });
            zaloText += `🕒 Thời gian tổng hợp: ${new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}`;

            sendZaloMessage(zaloText);

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
                                        <div className="flex items-start gap-2 mt-1">
                                            <div className="flex-1 text-red-600 text-sm italic font-medium">{row.issueContent}</div>
                                            {row.imageUrl && (
                                                <img
                                                    src={row.imageUrl}
                                                    alt="Lỗi"
                                                    className="w-12 h-12 object-cover rounded shadow-sm border border-slate-200"
                                                    onClick={() => setViewingImage(row.imageUrl || null)}
                                                />
                                            )}
                                        </div>
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
                                                            "px-2 py-2 rounded-lg text-xs font-bold border transition-all active:scale-95",
                                                            row.fixStatus === opt.label ? `${opt.cls} text-white` : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
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
                                                    row.fixStatus === 'Fixed'
                                                        ? "bg-blue-50 border-blue-200 text-blue-700 active:bg-blue-100 cursor-pointer"
                                                        : "bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed select-none"
                                                )}
                                                onClick={() => row.fixStatus === 'Fixed' && setActiveRowSelector(activeRowSelector === row.id ? null : row.id)}
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

                                        {/* Action Description - only enabled when Fixed */}
                                        <div className="space-y-2">
                                            <div className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                                                {row.fixStatus === 'Fixed' ? (
                                                    <span className="text-green-600">✅ Nội dung thực hiện (bắt buộc)</span>
                                                ) : (
                                                    <span className="text-slate-400">Nội dung thực hiện</span>
                                                )}
                                            </div>
                                            {row.fixStatus !== 'Fixed' ? (
                                                <div className="w-full p-3 rounded-lg border border-slate-100 bg-slate-50 text-slate-300 text-sm italic cursor-not-allowed select-none min-h-[5rem] flex items-center justify-center">
                                                    🔒 Chỉ nhập khi chọn Fixed
                                                </div>
                                            ) : (
                                                <IMESafeTextArea
                                                    className="w-full p-3 rounded-lg border text-sm outline-none transition-all focus:ring-2 focus:ring-blue-100 bg-white border-slate-300 focus:border-blue-500"
                                                    rows={2}
                                                    placeholder="Nhập chi tiết công việc đã thực hiện..."
                                                    value={row.actionDescription}
                                                    onChangeValue={(val: string) => handleActionChange(row.id, val)}
                                                />
                                            )}
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
                                            <div className="flex items-start gap-3">
                                                <div className="flex-1">
                                                    <div className="text-blue-800">{row.systemName}</div>
                                                    <div className="text-red-600 text-sm mt-1 italic">{row.issueContent}</div>
                                                </div>
                                                {row.imageUrl && (
                                                    <img
                                                        src={row.imageUrl}
                                                        alt="Lỗi"
                                                        className="w-12 h-12 object-cover rounded shadow-sm border border-slate-200 hover:scale-110 transition cursor-pointer"
                                                        onClick={() => setViewingImage(row.imageUrl || null)}
                                                    />
                                                )}
                                            </div>
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
                                                            "px-2 py-1 rounded text-xs font-bold border transition",
                                                            row.fixStatus === opt.label ? `${opt.cls} text-white` : "bg-slate-200 border-slate-300 text-slate-600 hover:bg-slate-300"
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
                                                    row.fixStatus === 'Fixed'
                                                        ? "cursor-pointer hover:bg-slate-100 text-blue-600 font-bold"
                                                        : "cursor-not-allowed opacity-40 text-slate-400"
                                                )}
                                                onClick={() => row.fixStatus === 'Fixed' && setActiveRowSelector(activeRowSelector === row.id ? null : row.id)}
                                                title={row.fixStatus !== 'Fixed' ? 'Chỉ có thể chọn người sửa khi trạng thái là Fixed' : 'Nhấn để chọn người sửa chữa'}
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
                                                                <UserIcon size={14} className="text-slate-400" />
                                                                <span className="text-sm font-medium">{u.name}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 border border-slate-300">
                                            <div className="relative">
                                            {row.fixStatus !== 'Fixed' ? (
                                                <div
                                                    className="w-full bg-slate-50 text-slate-300 text-sm italic cursor-not-allowed px-2 py-1 min-h-[2rem] flex items-center"
                                                    title="Chỉ nhập khi chọn Fixed"
                                                >
                                                    🔒 Chỉ nhập khi Fixed
                                                </div>
                                            ) : (
                                                <IMESafeInput
                                                    className="w-full bg-transparent outline-none text-slate-800"
                                                    placeholder="Nhập nội dung xử lý..."
                                                    value={row.actionDescription}
                                                    onChangeValue={(val: string) => handleActionChange(row.id, val)}
                                                />
                                            )}
                                        </div>
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
                        <Save size={20} /> Lưu & Cập Nhật Lịch Sử & ZCopy
                    </button>
                </div>
            </div>

            {/* Image Modal */}
            {viewingImage && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setViewingImage(null)}
                >
                    <div className="relative max-w-4xl max-h-full">
                        <button 
                            className="absolute -top-12 right-0 text-white hover:text-slate-300 flex items-center gap-2 font-bold"
                            onClick={() => setViewingImage(null)}
                        >
                            <span className="text-sm">ĐÓNG</span> <span className="text-2xl">&times;</span>
                        </button>
                        <img 
                            src={viewingImage} 
                            alt="Full view" 
                            className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl"
                        />
                    </div>
                </div>
            )}

            {/* Zalo Fallback Modal */}
            {zaloModalMessage && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in slide-in-from-bottom-4 duration-300">
                        <div className="p-4 bg-blue-600 rounded-t-2xl flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl font-black text-white">Z</span>
                                <div>
                                    <div className="text-white font-bold text-sm">Gửi báo cáo Zalo</div>
                                    <div className="text-blue-200 text-[11px]">Sao chép và dán vào nhóm Zalo</div>
                                </div>
                            </div>
                            <button onClick={() => { setZaloModalMessage(null); router.push('/fixed'); }} className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/20 transition">
                                <span className="text-xl">×</span>
                            </button>
                        </div>
                        <div className="p-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 max-h-48 overflow-y-auto">
                                <pre className="text-sm text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">{zaloModalMessage}</pre>
                            </div>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        if (navigator.clipboard && navigator.clipboard.writeText) {
                                            navigator.clipboard.writeText(zaloModalMessage!).then(() => {
                                                alert('Đã sao chép! Hãy mở Zalo và dán vào nhóm chat.');
                                            }).catch(() => {
                                                alert('Hãy bôi đen và sao chép đoạn văn bản trên, sau đó dán vào Zalo.');
                                            });
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
                                    onClick={() => { setZaloModalMessage(null); router.push('/fixed'); }}
                                    className="w-full py-3 bg-green-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 active:scale-95 transition-all shadow-md text-center"
                                >
                                    <span className="text-xl font-black">Z</span> Mở Zalo
                                </a>
                                <button onClick={() => { setZaloModalMessage(null); router.push('/fixed'); }} className="w-full py-2 text-slate-500 hover:text-slate-700 font-medium text-sm">
                                    Bỏ qua &amp; Xem lịch sử
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
