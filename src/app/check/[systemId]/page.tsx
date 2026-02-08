'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChecklistItem, Status, SystemCheck } from '@/lib/types';
import { Save, ArrowLeft, Clock, Settings, Plus, Trash2, X } from 'lucide-react';
import clsx from 'clsx';

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
    const [systemName, setSystemName] = useState('');
    const [items, setItems] = useState<ChecklistItem[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [startTime, setStartTime] = useState<number>(Date.now());

    useEffect(() => {
        const systems: SystemCheck[] = JSON.parse(localStorage.getItem('checklist_systems') || '[]');
        const currentSys = systems.find(s => s.id === systemId);
        if (currentSys) setSystemName(currentSys.name);

        const allDetails = JSON.parse(localStorage.getItem('checklist_details') || '{}');
        const savedItems = allDetails[systemId];

        if (savedItems && savedItems.length > 0) {
            setItems(savedItems);
        } else {
            setItems(DEFAULT_TEMPLATE.map((t: any) => ({
                id: t.id,
                content: t.content,
                status: null,
                note: '',
                timestamp: ''
            })));
        }
    }, [systemId]);

    const handleStatusChange = (id: string, val: Status) => {
        const now = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
        const currentUser = JSON.parse(localStorage.getItem('checklist_user') || '{}');
        const inspectorName = currentUser.name || '';

        setItems(prev => prev.map(i => {
            if (i.id === id) {
                return {
                    ...i,
                    status: val,
                    timestamp: now,
                    inspectorName: inspectorName, // Save who checked this
                    note: val === 'OK' ? '' : i.note // Clear note if OK
                };
            }
            return i;
        }));
    };

    const handleNoteChange = (id: string, val: string) => {
        const now = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
        const currentUser = JSON.parse(localStorage.getItem('checklist_user') || '{}');
        const inspectorName = currentUser.name || '';
        setItems(prev => prev.map(i => i.id === id ? { ...i, note: val, timestamp: now, inspectorName } : i));
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
    };

    const handleDeleteItem = (id: string) => {
        if (confirm('Bạn có chắc chắn muốn xóa mục này?')) {
            setItems(prev => prev.filter(i => i.id !== id));
        }
    };

    const handleUpdateContent = (id: string, newContent: string) => {
        setItems(prev => prev.map(i => i.id === id ? { ...i, content: newContent } : i));
    };

    const [errorMessage, setErrorMessage] = useState('');

    const handleSave = () => {
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
            try {
                const currentSystems: SystemCheck[] = JSON.parse(localStorage.getItem('checklist_systems') || '[]');
                const parentSystem = currentSystems.find(s => s.id === systemId);

                if (parentSystem && parentSystem.status === 'NOK') {
                    const hasDetailedNOK = items.some(i => i.status === 'NOK');
                    if (!hasDetailedNOK) {
                        setErrorMessage("Hệ thống đang báo Lỗi (NOK). Bảng chi tiết bắt buộc phải có ít nhất 1 mục NOK.");
                        return;
                    }
                }
            } catch (e) {
                console.error("Error checking parent system status", e);
            }

            // Safe LocalStorage Access
            let allDetails: any = {};
            try {
                const storedDetails = localStorage.getItem('checklist_details');
                if (storedDetails) {
                    allDetails = JSON.parse(storedDetails);
                }
            } catch (e) {
                console.error("Error parsing checklist_details", e);
                allDetails = {};
            }

            allDetails[systemId] = items;
            localStorage.setItem('checklist_details', JSON.stringify(allDetails));

            // Logic to update Parent System Status
            const hasErrors = items.some(i => i.status === 'NOK');
            let systems: SystemCheck[] = [];
            try {
                systems = JSON.parse(localStorage.getItem('checklist_systems') || '[]');
            } catch (e) {
                console.error("Error parsing checklist_systems", e);
                systems = [];
            }

            let updatedSystems = systems.map(s => {
                if (s.id === systemId) {
                    return {
                        ...s,
                        status: hasErrors ? 'NOK' : 'OK',
                        note: hasErrors ? 'Có lỗi chi tiết' : ''
                    };
                }
                return s;
            });
            localStorage.setItem('checklist_systems', JSON.stringify(updatedSystems));

            // ... (Existing logic for systems update)

            // --- NEW: INSPECTION LOGGING ---
            try {
                const currentUser = JSON.parse(localStorage.getItem('checklist_user') || '{}');
                const durationSeconds = Math.round((Date.now() - startTime) / 1000);

                const logEntry = {
                    id: Date.now().toString(),
                    timestamp: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
                    inspectorName: currentUser.name || 'Unknown',
                    inspectorCode: currentUser.code || 'UNKNOWN',
                    systemId: systemId,
                    systemName: systemName, // We have this state
                    result: hasErrors ? 'NOK' : 'OK',
                    note: hasErrors ? 'Phát hiện lỗi' : 'Hệ thống bình thường',
                    duration: durationSeconds
                };

                const currentLogs = JSON.parse(localStorage.getItem('checklist_logs') || '[]');
                const newLogs = [...currentLogs, logEntry];
                localStorage.setItem('checklist_logs', JSON.stringify(newLogs));
            } catch (logErr) {
                console.error("Error saving log:", logErr);
            }
            // -------------------------------

            // Navigation
            const currentSystemIndex = updatedSystems.findIndex(s => s.id === systemId);
            let nextNokSystemId = null;

            if (currentSystemIndex !== -1) {
                // Search for the NEXT system ensuring we don't loop back to current
                for (let i = currentSystemIndex + 1; i < updatedSystems.length; i++) {
                    // Check if there is another NOK system ahead
                    if (updatedSystems[i].status === 'NOK') {
                        nextNokSystemId = updatedSystems[i].id;
                        break;
                    }
                }
                // If not found ahead, we DO NOT wrap around to the beginning to avoid loops
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

    const handleSaveConfig = () => {
        // Save current items to local storage immediately as config
        setIsEditing(false);
        // We reuse logic? Or just saving details is enough.
        // Actually handleSave logic does validation. 
        // If we just want to save the STRUCTURE, we can do it silently?
        // But user might want to save progress.
        // Let's just exit edit mode. The main Save button persists changes to disk.
        // Or we can auto-save structure to details?
        // Let's safe-guard:
        let allDetails: any = {};
        try {
            allDetails = JSON.parse(localStorage.getItem('checklist_details') || '{}');
        } catch (e) { allDetails = {} }
        allDetails[systemId] = items;
        localStorage.setItem('checklist_details', JSON.stringify(allDetails));
        alert("Đã lưu cấu hình mới!");
    };

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
