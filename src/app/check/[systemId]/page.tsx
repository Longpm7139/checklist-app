'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChecklistItem, Status, SystemCheck } from '@/lib/types';
import { Save, ArrowLeft, Clock, Settings, Plus, Trash2, X, MessageSquare, Send } from 'lucide-react';
import clsx from 'clsx';
import { subscribeToSystems, subscribeToChecklist, saveChecklist, saveSystem, addLog, saveHistoryItem, subscribeToDuties } from '@/lib/firebase';
import { useUser } from '@/providers/UserProvider';

const DEFAULT_TEMPLATE = [
    { id: '1', content: 'Kiểm tra ngoại quan thiết bị (Vỏ, dây cáp)' },
    { id: '2', content: 'Kiểm tra chức năng vận hành (Bật/Tắt)' },
    { id: '3', content: 'Kiểm tra đèn tín hiệu/Cảnh báo' },
    { id: '4', content: 'Kiểm tra kết nối hệ thống/Màn hình điều khiển' },
    { id: '5', content: 'Vệ sinh công nghiệp sau kiểm tra' },
];

export default function CheckPage() {
    const router = useRouter();
    const params = useParams();
    const systemId = (params.systemId as string)?.trim() || "";
    const { user } = useUser();

    // Data state
    const [systems, setSystems] = useState<SystemCheck[]>([]);
    const [items, setItems] = useState<ChecklistItem[]>([]);
    const [systemName, setSystemName] = useState('');
    const [duties, setDuties] = useState<any[]>([]);

    // UI state
    const [isEditing, setIsEditing] = useState(false);
    const [startTime, setStartTime] = useState<number>(Date.now());
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoaded, setIsLoaded] = useState(false);

    // NEW: Dirty check state
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (!systemId) {
            setErrorMessage("Mã hệ thống không hợp lệ hoặc bị thiếu.");
            setIsLoaded(true);
            return;
        }

        // 1. Subscribe to Systems (for name & navigation)
        const unsubSys = subscribeToSystems((data) => {
            setSystems(data as SystemCheck[]);
            const current = data.find(s => s.id === systemId);
            if (current) setSystemName(current.name);
        }, (err: any) => {
            console.error("Systems subscription error:", err);
        });

        // 2. Subscribe to Checklist Details
        const unsubChecklist = subscribeToChecklist(systemId, (data) => {
            if (data && data.length > 0) {
                setItems(data);
            } else {
                setItems(DEFAULT_TEMPLATE.map((t: any) => ({
                    id: t.id,
                    content: t.content,
                    status: 'NA',
                    note: '',
                    timestamp: ''
                })));
            }
            setIsLoaded(true);
        }, (err: any) => {
            console.error("Checklist subscription error:", err);
            setErrorMessage("Không thể tải dữ liệu chi tiết kiểm tra. Vui lòng kiểm tra kết nối mạng.");
            setIsLoaded(true);
        });

        // 3. Subscribe to Duties
        const unsubDuties = subscribeToDuties((data) => {
            setDuties(data);
        });

        return () => {
            unsubSys();
            unsubChecklist();
            unsubDuties();
        };
    }, [systemId]);

    const handleStatusChange = (id: string, val: Status) => {
        if (!isUserOnDuty) {
            alert("Chỉ nhân viên trong ca trực mới được phép cập nhật tình trạng!");
            return;
        }
        const now = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

        setItems(prev => prev.map(i => {
            if (i.id === id) {
                return {
                    ...i,
                    status: val,
                    timestamp: now,
                    // Preserve existing inspector if it's already set (to avoid overwriting detector with repairer who adds a note)
                    inspectorName: i.inspectorName || user?.name,
                    inspectorCode: i.inspectorCode || user?.code,
                    note: val === 'OK' ? '' : i.note // Clear note if OK
                };
            }
            return i;
        }));
        setIsDirty(true);
    };

    const handleNoteChange = (id: string, val: string) => {
        if (!isUserOnDuty) return;
        const now = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
        setItems(prev => prev.map(i => i.id === id ? { ...i, note: val, timestamp: now, inspectorName: i.inspectorName || user?.name, inspectorCode: i.inspectorCode || user?.code } : i));
        setIsDirty(true);
    };

    const handleAddItem = () => {
        const newId = Date.now().toString();
        setItems(prev => [...prev, {
            id: newId,
            content: '',
            status: 'NA',
            note: '',
            timestamp: ''
        }]);
        setIsDirty(true);
    };

    const handleDeleteItem = (id: string) => {
        if (confirm('Bạn có chắc chắn muốn xóa mục này?')) {
            setItems(prev => prev.filter(i => i.id !== id));
            setIsDirty(true);
        }
    };

    const handleUpdateContent = (id: string, newContent: string) => {
        setItems(prev => prev.map(i => i.id === id ? { ...i, content: newContent } : i));
        setIsDirty(true);
    };


    const handleSave = async () => {
        if (!isUserOnDuty && !isEditing) {
            alert('Bạn không nằm trong ca trực hiện tại nên không thể Lưu báo cáo!');
            return;
        }
        setErrorMessage(''); // Clear previous errors
        try {
            // 1. Validation
            const uncheckedItems = items.filter(i => i.status === 'NA');
            if (uncheckedItems.length > 0) {
                const missingIndices = items
                    .map((item, index) => item.status === 'NA' ? (index + 1) : null)
                    .filter(val => val !== null)
                    .join(', ');
                setErrorMessage(`Chưa chọn trạng thái các mục: ${missingIndices}`);
                return;
            }

            // Check validation for NOK notes
            const itemsRequiringNote = items.filter(i => i.status === 'NOK' && !(i.note || '').trim());
            if (itemsRequiringNote.length > 0) {
                const missingNoteIndices = items
                    .map((item, index) => (item.status === 'NOK' && !(item.note || '').trim()) ? (index + 1) : null)
                    .filter(val => val !== null)
                    .join(', ');
                setErrorMessage(`Thiếu ghi chép các mục lỗi: ${missingNoteIndices}`);
                return;
            }

            // 3. Consistency Check: If Parent System is NOK, Detailed Checklist MUST have at least one NOK item
            const currentSystem = systems.find(s => s.id === systemId);
            if (currentSystem && currentSystem.status === 'NOK') {
                const hasDetailedNOK = items.some(i => i.status === 'NOK');
                if (!hasDetailedNOK) {
                    setErrorMessage("Hệ thống đang báo Lỗi (NOK). Bảng chi tiết bắt buộc phải có ít nhất 1 mục NOK.");
                    return;
                }
            }

            // --- NEW: DIRTY CHECK REFINED ---
            // If system has status (already checked) AND no changes made (isDirty is false)
            // THEN skip saving and logging, regardless of who is accessing it.
            // This prevents team members from "claiming" each other's work by just clicking Save.
            const isFirstTime = !currentSystem?.status;

            if (!isFirstTime && !isDirty) {
                console.log("No changes detected. Skipping save and log for already-checked system.");
                // Proceed to navigation directly
            } else {
                // --- SAVE TO FIREBASE ---
                const now = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

                // --- PREPARE DATA FOR DB & ZALO ---
                const durationSeconds = Math.round((Date.now() - startTime) / 1000);
                const hasNOK = items.some(i => i.status === 'NOK');
                const summaryStatus = hasNOK ? 'NOK' : 'OK';
                const newNote = hasNOK ? 'Có lỗi chi tiết' : '';
                const nokItems = items.filter(i => i.status === 'NOK');
                const errorDetails = nokItems.map(i => i.content).join(', ');

                // Prepare Zalo message
                let zaloMessage = '';
                if (hasNOK) {
                    zaloMessage = `⚠️ [BÁO LỖI HỆ THỐNG]\n` +
                        `- Hệ thống: ${systemName}\n` +
                        `- Mã ID: ${systemId}\n` +
                        `- Chi tiết lỗi:\n${nokItems.map((item, idx) => `  ${idx + 1}. ${item.content}: ${item.note || 'Chưa có ghi chú'}`).join('\n')}\n` +
                        `- Người báo: ${user?.name || 'Nhân viên'}\n` +
                        `- Thời gian: ${now}`;
                }

                // 4. ATTEMPT CLIPBOARD COPY AS EARLY AS POSSIBLE (to stay within user gesture window)
                let copySuccess = false;
                if (hasNOK) {
                    try {
                        await navigator.clipboard.writeText(zaloMessage);
                        copySuccess = true;
                    } catch (e) {
                        console.error("Initial copy failed, will try fallback later if needed", e);
                    }
                }

                // 5. PERFORM DB WRITES IN PARALLEL
                const dbPromises = [];
                // 1. Save Details
                dbPromises.push(saveChecklist(systemId, items));
                // 2. Update System Status
                dbPromises.push(saveSystem(systemId, {
                    status: summaryStatus,
                    note: newNote,
                    timestamp: now,
                    inspectorName: user?.name || 'Unknown',
                    inspectorCode: user?.code || 'UNKNOWN'
                }));
                // 3. Sync to History
                for (const item of nokItems) {
                    dbPromises.push(saveHistoryItem(`${systemId}_${item.id}`, {
                        id: `${systemId}_${item.id}`,
                        systemId: systemId,
                        systemName: systemName,
                        issueContent: item.content,
                        itemId: item.id,
                        timestamp: now,
                        inspectorName: item.inspectorName || user?.name,
                        inspectorCode: user?.code,
                    }));
                }
                // 4. Add Log
                dbPromises.push(addLog({
                    id: Date.now().toString(),
                    timestamp: now,
                    inspectorName: user?.name || 'Unknown',
                    inspectorCode: user?.code || 'UNKNOWN',
                    systemId: systemId,
                    systemName: systemName,
                    result: summaryStatus,
                    note: hasNOK ? `Lỗi: ${errorDetails}` : `Hệ thống bình thường. ${items.find(i => i.note)?.note || ''}`,
                    duration: durationSeconds
                }));

                await Promise.all(dbPromises);

                // --- FEEDBACK ---
                if (hasNOK) {
                    if (copySuccess) {
                        alert('Đã lưu hệ thống và ĐÃ SAO CHÉP báo cáo lỗi!\nBạn có thể Dán (Ctrl+V) vào Zalo để gửi.');
                    } else {
                        // If it failed above, try one more time now (maybe slightly different timing helps)
                        try {
                            await navigator.clipboard.writeText(zaloMessage);
                            alert('Đã lưu hệ thống và ĐÃ SAO CHÉP báo cáo lỗi!\nBạn có thể Dán (Ctrl+V) vào Zalo để gửi.');
                        } catch (e2) {
                            alert('Đã lưu thành công nhưng sao chép Zalo tự động thất bại.\nVui lòng chụp màn hình hoặc copy thủ công.');
                        }
                    }
                } else {
                    alert('Đã lưu kết quả kiểm tra thành công!');
                }
            }

            // --- NAVIGATION ---
            // Find next NOK system
            let nextNokSystemId = null;
            try {
                const pendingStr = sessionStorage.getItem('pendingNokChecks');
                if (pendingStr) {
                    let pending: string[] = JSON.parse(pendingStr);
                    // Remove current system from queue
                    pending = pending.filter(id => id !== systemId);

                    if (pending.length > 0) {
                        nextNokSystemId = pending[0];
                        sessionStorage.setItem('pendingNokChecks', JSON.stringify(pending));
                    } else {
                        sessionStorage.removeItem('pendingNokChecks');
                    }
                }
            } catch (e) {
                console.error("Session storage tracking error:", e);
                sessionStorage.removeItem('pendingNokChecks');
            }

            if (nextNokSystemId) {
                router.push(`/check/${nextNokSystemId}`);
            } else {
                router.push('/summary');
            }

        } catch (error: any) {
            console.error(error);
            setErrorMessage("Lỗi hệ thống: " + (error?.message || "Không xác định"));
        }
    };

    const handleSaveConfig = async () => {
        // Just save the structure/items without changing status/logs
        try {
            await saveChecklist(systemId, items);
            setIsEditing(false);
            alert("Đã lưu cấu hình mới!");
        } catch (e) {
            alert("Lỗi khi lưu cấu hình");
        }
    };

    const nowD = new Date();
    const currentHour = nowD.getHours();
    const shiftD = new Date(nowD);
    if (currentHour < 7) {
        shiftD.setDate(shiftD.getDate() - 1);
    }
    const currentShiftType = (currentHour >= 7 && currentHour < 19) ? 'DAY' : 'NIGHT';
    const shiftDateStr = `${shiftD.getFullYear()}-${String(shiftD.getMonth() + 1).padStart(2, '0')}-${String(shiftD.getDate()).padStart(2, '0')}`;
    const dayDuty = duties.find(d => d.date === shiftDateStr);

    const currentShiftAssignments = dayDuty?.assignments?.filter((a: any) => a.shift === currentShiftType) || [];
    const isUserOnDuty = currentShiftAssignments.some((a: any) => a.userCode === user?.code) || user?.role === 'ADMIN';

    const currentSystem = systems.find(s => s.id === systemId);
    const isLockedByOther = !isUserOnDuty || !!(currentSystem && systems.some(s =>
        s.categoryId === currentSystem.categoryId &&
        s.status !== 'NA' &&
        s.inspectorCode &&
        s.inspectorCode !== user?.code
    ));


    if (!isLoaded) return <div className="p-8 text-center">Đang tải dữ liệu...</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-900">
            <div className="max-w-6xl mx-auto bg-white border border-slate-300 shadow-sm">
                {/* HEADER */}
                <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push('/')} className="p-1 hover:bg-white/10 rounded">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="font-bold text-lg uppercase">Bảng Kiểm Tra Chi Tiết: {systemName}</h1>
                        </div>
                    </div>
                    {user?.role === 'ADMIN' && (
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={clsx(
                                "px-3 py-1 rounded flex items-center gap-2 text-sm font-medium transition",
                                isEditing ? "bg-yellow-500 text-slate-900 hover:bg-yellow-400" : "bg-white/10 hover:bg-white/20 text-white"
                            )}
                        >
                            {isEditing ? <><X size={18} /> Đóng Cấu hình</> : <><Settings size={18} /> Cấu hình</>}
                        </button>
                    )}
                </div>

                {/* TABLE */}
                <div className="overflow-x-auto w-full">
                    {/* RESPONSIVE CHECKLIST CONTENT */}
                    <div className="w-full">
                        {/* Mobile Card View (hidden on md-up) */}
                        <div className="block md:hidden space-y-4 p-4">
                            {items.map((item, idx) => (
                                <div key={item.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Mục #{idx + 1}</span>
                                        {item.timestamp && <span className="text-[10px] font-mono text-slate-400">{item.timestamp}</span>}
                                        {isEditing && (
                                            <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-red-500 bg-red-50 rounded shadow-sm">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="p-4 space-y-4">
                                        {/* Content */}
                                        <div className="text-slate-800 font-medium leading-relaxed">
                                            {isEditing ? (
                                                <textarea
                                                    className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:border-blue-500 outline-none min-h-[80px]"
                                                    value={item.content}
                                                    onChange={(e) => handleUpdateContent(item.id, e.target.value)}
                                                    placeholder="Nội dung kiểm tra..."
                                                />
                                            ) : (
                                                item.content
                                            )}
                                        </div>

                                        {/* Status selection (only if not editing) */}
                                        {!isEditing && (
                                            <div className="grid grid-cols-3 gap-2">
                                                {(['OK', 'NOK', 'NA'] as Status[]).map(st => (
                                                    <button
                                                        key={st}
                                                        onClick={() => handleStatusChange(item.id, st)}
                                                        className={clsx(
                                                            "py-4 rounded-xl font-bold text-sm border shadow-sm transition active:scale-95 flex items-center justify-center",
                                                            item.status === st || (st === 'NA' && !item.status)
                                                                ? (st === 'OK' ? "bg-green-600 text-white border-green-700" :
                                                                    st === 'NOK' ? "bg-red-600 text-white border-red-700" :
                                                                        "bg-slate-600 text-white border-slate-700")
                                                                : "bg-white text-slate-500 border-slate-300"
                                                        )}
                                                        disabled={isLockedByOther}
                                                    >
                                                        {st}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Note field */}
                                        {!isEditing && (
                                            <div className="relative">
                                                <input
                                                    disabled={item.status === 'OK' || isLockedByOther}
                                                    className={clsx(
                                                        "w-full p-4 border rounded-xl text-sm outline-none transition-all pr-12",
                                                        (item.status === 'OK' || isLockedByOther) && "bg-slate-100 text-slate-400 cursor-not-allowed opacity-60",
                                                        (item.status === 'NOK' && !item.note.trim()) ? "border-red-500 bg-red-50 ring-2 ring-red-200" : "border-slate-200 focus:border-blue-500 bg-slate-50/50"
                                                    )}
                                                    placeholder={item.status === 'OK' ? "✅ OK - Không ghi chú" : "📝 Nhập ghi chú tại đây..."}
                                                    value={item.note}
                                                    onChange={(e) => handleNoteChange(item.id, e.target.value)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isEditing && (
                                <button
                                    onClick={handleAddItem}
                                    className="w-full py-5 border-2 border-dashed border-slate-300 text-slate-500 rounded-xl hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 flex justify-center items-center gap-2 font-bold transition-all shadow-sm"
                                >
                                    <Plus size={20} /> THÊM MỤC MỚI
                                </button>
                            )}
                        </div>

                        {/* Desktop Table View (hidden on mobile) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead className="bg-slate-200 text-slate-700 font-bold uppercase text-sm">
                                    <tr>
                                        <th className="p-3 border border-slate-300 w-16 text-center">STT</th>
                                        <th className="p-3 border border-slate-300">Nội dung kiểm tra</th>
                                        <th className="p-3 border border-slate-300 w-48 text-center">{isEditing ? 'Thao tác' : 'Status'}</th>
                                        <th className="p-3 border border-slate-300 w-1/4">Note</th>
                                        <th className="p-3 border border-slate-300 w-32 text-center">Thời gian</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => (
                                        <tr key={item.id} className="hover:bg-slate-50">
                                            <td className="p-3 border border-slate-300 text-center font-bold text-slate-500">
                                                {idx + 1}
                                            </td>
                                            <td className="p-3 border border-slate-300 font-medium text-slate-800">
                                                {isEditing ? (
                                                    <input
                                                        className="w-full border border-slate-300 rounded px-2 py-1 focus:border-blue-500 outline-none"
                                                        value={item.content}
                                                        onChange={(e) => handleUpdateContent(item.id, e.target.value)}
                                                        placeholder="Nhập nội dung kiểm tra..."
                                                    />
                                                ) : (
                                                    item.content
                                                )}
                                            </td>
                                            <td className="p-3 border border-slate-300 text-center">
                                                {isEditing ? (
                                                    <button
                                                        onClick={() => handleDeleteItem(item.id)}
                                                        className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200 shadow-sm"
                                                        title="Xóa mục này"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                ) : (
                                                    <div className="flex gap-1 justify-center">
                                                        {(['OK', 'NOK', 'NA'] as Status[]).map(st => (
                                                            <button
                                                                key={st}
                                                                onClick={() => handleStatusChange(item.id, st)}
                                                                disabled={isLockedByOther}
                                                                className={clsx(
                                                                    "px-3 py-1 rounded text-xs font-bold border transition w-12 shadow-sm",
                                                                    item.status === st || (st === 'NA' && !item.status)
                                                                        ? (st === 'OK' ? "bg-green-600 text-white border-green-700" :
                                                                            st === 'NOK' ? "bg-red-600 text-white border-red-700" :
                                                                                "bg-slate-600 text-white border-slate-700")
                                                                        : "bg-white text-slate-500 border-slate-300 hover:bg-slate-100"
                                                                )}
                                                            >
                                                                {st}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3 border border-slate-300">
                                                <input
                                                    disabled={item.status === 'OK' || isLockedByOther}
                                                    className={clsx(
                                                        "w-full p-2 border rounded text-sm outline-none",
                                                        (item.status === 'OK' || isLockedByOther) && "bg-slate-100 text-slate-400 cursor-not-allowed",
                                                        (item.status === 'NOK' && !item.note.trim()) ? "border-red-500 bg-red-50" : "border-slate-200 focus:border-blue-500"
                                                    )}
                                                    placeholder={item.status === 'OK' ? "OK không cần ghi chú" : "Nhập ghi chú..."}
                                                    value={item.note}
                                                    onChange={(e) => handleNoteChange(item.id, e.target.value)}
                                                />
                                            </td>
                                            <td className="p-3 border border-slate-300 text-center text-xs font-mono text-slate-500">
                                                {item.timestamp || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                {isEditing && (
                                    <tfoot>
                                        <tr>
                                            <td colSpan={5} className="p-2 border border-slate-300 bg-slate-50">
                                                <button
                                                    onClick={handleAddItem}
                                                    className="w-full py-2 border-2 border-dashed border-slate-300 text-slate-500 rounded hover:border-blue-400 hover:text-blue-500 flex justify-center items-center gap-2 font-medium transition-colors"
                                                >
                                                    <Plus size={18} /> Thêm dòng kiểm tra
                                                </button>
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="p-4 bg-slate-100 border-t border-slate-300 flex flex-col sm:flex-row justify-between items-center sticky bottom-0 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] gap-4">
                    <div className="w-full sm:flex-1">
                        {errorMessage && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded font-bold animate-pulse text-sm">
                                {errorMessage}
                            </div>
                        )}
                    </div>
                    <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                        <button
                            type="button"
                            onClick={isEditing ? handleSaveConfig : handleSave}
                            className={clsx(
                                "px-6 py-3 font-bold uppercase rounded shadow flex items-center justify-center gap-2 active:scale-95 transition-transform",
                                isEditing
                                    ? "bg-yellow-500 text-slate-900 hover:bg-yellow-400"
                                    : "bg-blue-700 text-white hover:bg-blue-800"
                            )}
                        >
                            {isEditing ? <><Save size={20} /> Lưu Cấu hình</> : <><Save size={20} /> Lưu & Báo cáo & Gửi Zalo</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
