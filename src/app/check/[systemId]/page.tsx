'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChecklistItem, Status, SystemCheck } from '@/lib/types';
import { Save, ArrowLeft, Clock, Settings, Plus, Trash2, X } from 'lucide-react';
import clsx from 'clsx';
import { subscribeToSystems, subscribeToChecklist, saveChecklist, saveSystem, addLog, saveHistoryItem } from '@/lib/firebase';
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
    const systemId = params.systemId as string;
    const { user } = useUser();

    // Data state
    const [systems, setSystems] = useState<SystemCheck[]>([]);
    const [items, setItems] = useState<ChecklistItem[]>([]);
    const [systemName, setSystemName] = useState('');

    // UI state
    const [isEditing, setIsEditing] = useState(false);
    const [startTime, setStartTime] = useState<number>(Date.now());
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoaded, setIsLoaded] = useState(false);

    // NEW: Dirty check state
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        // 1. Subscribe to Systems (for name & navigation)
        const unsubSys = subscribeToSystems((data) => {
            setSystems(data as SystemCheck[]);
            const current = data.find(s => s.id === systemId);
            if (current) setSystemName(current.name);
        });

        // 2. Subscribe to Checklist Details
        const unsubChecklist = subscribeToChecklist(systemId, (data) => {
            if (data && data.length > 0) {
                setItems(data);
            } else {
                setItems(DEFAULT_TEMPLATE.map((t: any) => ({
                    id: t.id,
                    content: t.content,
                    status: null,
                    note: '',
                    timestamp: ''
                })));
            }
            setIsLoaded(true);
        });

        return () => {
            unsubSys();
            unsubChecklist();
        };
    }, [systemId]);

    const handleStatusChange = (id: string, val: Status) => {
        const now = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

        setItems(prev => prev.map(i => {
            if (i.id === id) {
                return {
                    ...i,
                    status: val,
                    timestamp: now,
                    inspectorName: user?.name, // Save who checked this
                    note: val === 'OK' ? '' : i.note // Clear note if OK
                };
            }
            return i;
        }));
        setIsDirty(true);
    };

    const handleNoteChange = (id: string, val: string) => {
        const now = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
        setItems(prev => prev.map(i => i.id === id ? { ...i, note: val, timestamp: now, inspectorName: user?.name } : i));
        setIsDirty(true);
    };

    const handleAddItem = () => {
        const newId = Date.now().toString();
        setItems(prev => [...prev, {
            id: newId,
            content: '',
            status: null,
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
        setErrorMessage(''); // Clear previous errors
        try {
            // 1. Validation
            const uncheckedItems = items.filter(i => !i.status);
            if (uncheckedItems.length > 0) {
                const missingIndices = items
                    .map((item, index) => !item.status ? (index + 1) : null)
                    .filter(val => val !== null)
                    .join(', ');
                setErrorMessage(`Chưa chọn trạng thái các mục: ${missingIndices}`);
                return;
            }

            // Check validation for NOK/NA notes
            const itemsRequiringNote = items.filter(i => (i.status === 'NOK' || i.status === 'NA') && !(i.note || '').trim());
            if (itemsRequiringNote.length > 0) {
                const missingNoteIndices = items
                    .map((item, index) => ((item.status === 'NOK' || item.status === 'NA') && !(item.note || '').trim()) ? (index + 1) : null)
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
            // If system has status (already checked)
            // AND no changes made (isDirty is false)
            // AND the last inspector is the SAME as the current user
            // THEN skip saving and just navigate
            const isFirstTime = !currentSystem?.status;
            const isSameUser = currentSystem?.inspectorName === user?.name;

            if (!isFirstTime && !isDirty && isSameUser) {
                console.log("No changes detected by same user. Skipping save and log.");
                // Proceed to navigation directly
            } else {
                // --- SAVE TO FIREBASE ---

                // 1. Save Details
                await saveChecklist(systemId, items);

                // 2. Update System Status
                const hasErrors = items.some(i => i.status === 'NOK');

                const newStatus = hasErrors ? 'NOK' : 'OK';
                const newNote = hasErrors ? 'Có lỗi chi tiết' : '';

                // Update system
                await saveSystem(systemId, {
                    status: newStatus,
                    note: newNote,
                    inspectorName: user?.name,
                    timestamp: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
                });

                // 3. Log Inspection
                const durationSeconds = Math.round((Date.now() - startTime) / 1000);

                // Aggregate error details for the note
                const errorDetails = items
                    .filter(i => i.status === 'NOK')
                    .map(i => i.content)
                    .join(', ');

                // 4. Sync NOK items to History (Error Summary)
                const nokItems = items.filter(i => i.status === 'NOK');
                for (const item of nokItems) {
                    await saveHistoryItem(`${systemId}_${item.id}`, {
                        id: `${systemId}_${item.id}`, // Unique history ID
                        systemId: systemId,
                        systemName: systemName,
                        issueContent: item.content,
                        itemId: item.id,
                        timestamp: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
                        inspectorName: user?.name,
                        inspectorCode: user?.code,
                        // Leave resolved fields empty
                    });
                }

                const logEntry = {
                    id: Date.now().toString(),
                    timestamp: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
                    inspectorName: user?.name || 'Unknown',
                    inspectorCode: user?.code || 'UNKNOWN',
                    systemId: systemId,
                    systemName: systemName,
                    result: newStatus,
                    note: hasErrors ? `Lỗi: ${errorDetails}` : `Hệ thống bình thường. ${items.find(i => i.note)?.note || ''}`,
                    duration: durationSeconds
                };
                await addLog(logEntry);
            }

            // --- NAVIGATION ---
            // Find next NOK system
            const currentSystemIndex = systems.findIndex(s => s.id === systemId);
            let nextNokSystemId = null;

            if (currentSystemIndex !== -1) {
                // Search for the NEXT system ensuring we don't loop back to current
                for (let i = currentSystemIndex + 1; i < systems.length; i++) {
                    // Check if there is another NOK system ahead
                    if (systems[i].status === 'NOK') {
                        nextNokSystemId = systems[i].id;
                        break;
                    }
                }
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
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={clsx(
                            "px-3 py-1 rounded flex items-center gap-2 text-sm font-medium transition",
                            isEditing ? "bg-yellow-500 text-slate-900 hover:bg-yellow-400" : "bg-white/10 hover:bg-white/20 text-white"
                        )}
                    >
                        {isEditing ? <><X size={18} /> Đóng Cấu hình</> : <><Settings size={18} /> Cấu hình</>}
                    </button>
                </div>

                {/* TABLE */}
                <table className="w-full text-left border-collapse">
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
                                <td className="p-3 border border-slate-300 font-medium">
                                    {isEditing ? (
                                        <input
                                            className="w-full border border-slate-300 rounded px-2 py-1"
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
                                            className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
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
                                                    className={clsx(
                                                        "px-3 py-1 rounded text-xs font-bold border transition w-12",
                                                        item.status === st
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
                                        disabled={item.status === 'OK'}
                                        className={clsx(
                                            "w-full bg-transparent outline-none text-sm placeholder-slate-300",
                                            item.status === 'OK' && "text-slate-400 cursor-not-allowed"
                                        )}
                                        placeholder={item.status === 'OK' ? "OK không cần ghi chú" : ""}
                                        value={item.note}
                                        onChange={(e) => handleNoteChange(item.id, e.target.value)}
                                    />
                                </td>
                                <td className="p-3 border border-slate-300 text-center text-sm font-mono text-slate-600">
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
                                        className="w-full py-2 border-2 border-dashed border-slate-300 text-slate-500 rounded hover:border-blue-400 hover:text-blue-500 flex justify-center items-center gap-2 font-medium"
                                    >
                                        <Plus size={18} /> Thêm dòng kiểm tra
                                    </button>
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>

                {/* FOOTER */}
                <div className="p-4 bg-slate-100 border-t border-slate-300 flex justify-between items-center sticky bottom-0 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                    <div className="flex-1 mr-4">
                        {errorMessage && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded font-bold animate-pulse">
                                {errorMessage}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={isEditing ? handleSaveConfig : handleSave}
                        className={clsx(
                            "px-6 py-3 font-bold uppercase rounded shadow flex items-center gap-2 active:scale-95 transition-transform",
                            isEditing
                                ? "bg-yellow-500 text-slate-900 hover:bg-yellow-400"
                                : "bg-blue-700 text-white hover:bg-blue-800"
                        )}
                    >
                        {isEditing ? <><Save size={20} /> Lưu Cấu hình</> : <><Save size={20} /> Lưu & Vào Bảng Tổng Hợp</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
