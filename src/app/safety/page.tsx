'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Plus, ArrowLeft, Loader2, Search, Trash2, Calendar, User as UserIcon, CheckCircle, Printer, AlertOctagon } from 'lucide-react';
import { useUser } from '@/providers/UserProvider';
import { IMESafeInput, IMESafeTextArea } from '@/components/IMESafeInput';
import { subscribeToSafetyReports, saveSafetyReport, deleteSafetyReport, getUsers } from '@/lib/firebase';
import { SafetyReport, SafetyCriteria, User } from '@/lib/types';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, AlignmentType, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import clsx from 'clsx';

const INITIAL_CRITERIA: SafetyCriteria[] = [
    {
        id: '1',
        name: 'Kiểm tra về việc sử dụng trang bị Bảo hộ lao động',
        method: 'Quan sát',
        standards: 'Số cấp phát PTBVCN người lao động ký nhận.\nNLĐ có tuân thủ sử dụng PTBVCN không.\nCó biển chỉ dẫn, hướng dẫn sử dụng không.',
        frequency: '1lần/1ca',
        result: null,
        note: ''
    },
    {
        id: '2',
        name: 'Kiểm tra về an toàn điện',
        method: 'Quan sát',
        standards: 'Vị trí tủ điện có ẩm thấp hay gần vật dễ cháy không.\nDây điện có hở lõi đồng không.\nCó biển báo phòng ngừa coi chừng điện giật không.\nĐã tắt các thiết bị điện không sử dụng hay chưa?',
        frequency: 'Đầu ca,\nGiữa ca,\nCuối ca',
        result: null,
        note: ''
    },
    {
        id: '3',
        name: 'Sơ cứu, cấp cứu tại nơi làm việc',
        method: 'Quan sát',
        standards: 'Có tủ thuốc sơ cứu không.\nTủ thuốc đặt vị trí có dễ nhìn, thuận tiện khi cần không.',
        frequency: '1lần/1ca',
        result: null,
        note: ''
    },
    {
        id: '4',
        name: 'Môi trường',
        method: 'Quan sát',
        standards: 'Có thùng rác không.\nĐổ rác đúng quy định không.\nCó biển phân loại rác không.\nMôi trường nơi làm việc có thông thoáng, sạch sẽ không.',
        frequency: '1lần/1ca',
        result: null,
        note: ''
    },
    {
        id: '5',
        name: 'An toàn thiết bị',
        method: 'Quan sát',
        standards: 'Có sổ theo dõi kiểm tra máy móc không.\nThiết bị nghiêm ngặt có tem kiểm định còn hạn không.\nCó biển cảnh báo dập, cắt, văng bắn... vv không.\nCó hướng dẫn thao tác vận hành không.',
        frequency: '1lần/1ca',
        result: null,
        note: ''
    },
    {
        id: '6',
        name: 'An toàn làm việc trên cao',
        method: 'Quan sát',
        standards: 'Trong đội, tổ của mình có thi công hay làm việc trên cao 2 mét trở lên có đeo dây đai an toàn không.\nCó biện pháp phòng ngừa PCCC khi hàn cắt không.',
        frequency: '1lần/1ca',
        result: null,
        note: ''
    }
];

export default function SafetyPage() {
    const router = useRouter();
    const { user: currentUser } = useUser();
    const [viewMode, setViewMode] = useState<'LIST' | 'CREATE'>('LIST');
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState<SafetyReport[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [shiftTime, setShiftTime] = useState('07:00 – 19:00');
    const [dutyOfficer, setDutyOfficer] = useState('');
    const [reporter, setReporter] = useState('');
    const [totalWorkers, setTotalWorkers] = useState('');
    const [absentWorkers, setAbsentWorkers] = useState('');
    const [workLocations, setWorkLocations] = useState('');
    const [inspectionLocations, setInspectionLocations] = useState('');
    const [criteria, setCriteria] = useState<SafetyCriteria[]>([...INITIAL_CRITERIA]);
    const [workerOpinions, setWorkerOpinions] = useState('');
    const [currentReportId, setCurrentReportId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const unsub = subscribeToSafetyReports((data) => {
            setReports(data as SafetyReport[]);
            setLoading(false);
        });

        getUsers().then(u => {
            setUsers(u);
            const myName = currentUser?.name || '';
            setReporter(myName);
        }).catch(err => console.error("Lỗi khi lấy danh sách user", err));

        return () => unsub();
    }, [currentUser]);

    const handleSaveReport = async () => {
        if (!dutyOfficer) {
            alert("Vui lòng chọn Cán bộ trực!");
            return;
        }
        if (!reporter) {
            alert("Vui lòng chọn Người lập!");
            return;
        }

        setIsSaving(true);
        try {
            const now = new Date();
            const createdAt = now.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false });

            const newReport: SafetyReport = {
                id: currentReportId || Date.now().toString(),
                shiftTime,
                dutyOfficer,
                reporter,
                totalWorkers,
                absentWorkers,
                workLocations,
                inspectionLocations,
                criteria,
                workerOpinions,
                createdAt: currentReportId ? (reports.find(r => r.id === currentReportId)?.createdAt || createdAt) : createdAt
            };

            await saveSafetyReport(newReport);
            alert(currentReportId ? "Đã cập nhật Biểu mẫu thành công!" : "Đã lưu Biểu mẫu Kiểm tra An toàn Vệ sinh viên!");
            resetForm();
            setViewMode('LIST');
        } catch (error) {
            console.error("Lỗi khi lưu biểu mẫu", error);
            alert("Lỗi khi lưu biểu mẫu. Vui lòng thử lại!");
        } finally {
            setIsSaving(false);
        }
    };

    const generateWordReport = async () => {
        setIsGenerating(true);
        try {
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        new Paragraph({ children: [new TextRun({ text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", bold: true, size: 24 })], alignment: AlignmentType.CENTER }),
                        new Paragraph({ children: [new TextRun({ text: "Độc lập - Tự do - Hạnh phúc", bold: true, size: 24 })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
                        new Paragraph({ children: [new TextRun({ text: "BIỂU MẪU KIỂM TRA AN TOÀN - VỆ SINH LAO ĐỘNG", bold: true, size: 32 })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
                        
                        new Paragraph({ text: `1. Thời gian ca trực: ${shiftTime}` }),
                        new Paragraph({ text: `2. Cán bộ trực: ${dutyOfficer}      - Người lập: ${reporter}` }),
                        new Paragraph({ text: `3. Tổng số người lao động: ${totalWorkers}      - Trong đó nghỉ: ${absentWorkers}` }),
                        new Paragraph({ text: `4. Các vị trí làm việc: ${workLocations}` }),
                        new Paragraph({ text: `5. Các vị trí kiểm tra an toàn, VSLĐ: ${inspectionLocations}`, spacing: { after: 200 } }),
                        
                        new Paragraph({ children: [new TextRun({ text: "6. Các tiêu chí kiểm tra:", bold: true })], spacing: { after: 100 } }),
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: {
                                top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 },
                                left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 },
                                insideHorizontal: { style: BorderStyle.SINGLE, size: 1 }, insideVertical: { style: BorderStyle.SINGLE, size: 1 }
                            },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TT", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 5, type: WidthType.PERCENTAGE } }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Hạng mục", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 25, type: WidthType.PERCENTAGE } }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "PP", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 10, type: WidthType.PERCENTAGE } }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tiêu chuẩn", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 30, type: WidthType.PERCENTAGE } }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Kết quả", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 10, type: WidthType.PERCENTAGE } }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Ghi chú", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 20, type: WidthType.PERCENTAGE } }),
                                    ]
                                }),
                                ...criteria.map((c, i) => new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ text: (i+1).toString(), alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ children: [new Paragraph({ text: c.name })] }),
                                        new TableCell({ children: [new Paragraph({ text: c.method })] }),
                                        new TableCell({ children: [new Paragraph({ text: c.standards })] }),
                                        new TableCell({ children: [new Paragraph({ text: c.result || '', alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ children: [new Paragraph({ text: c.note || '' })] }),
                                    ]
                                }))
                            ]
                        }),
                        
                        new Paragraph({ children: [new TextRun({ text: "7. Ý kiến, kiến nghị:", bold: true })], spacing: { before: 200, after: 100 } }),
                        new Paragraph({ text: workerOpinions || "Không có ý kiến", spacing: { after: 400 } }),

                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE } },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ text: "" })], width: { size: 50, type: WidthType.PERCENTAGE } }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Đà Nẵng, ngày ${String(new Date().getDate()).padStart(2, '0')} tháng ${String(new Date().getMonth()+1).padStart(2, '0')} năm ${new Date().getFullYear()}`, italics: true })], alignment: AlignmentType.CENTER })], width: { size: 50, type: WidthType.PERCENTAGE } }),
                                    ]
                                }),
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Cán Bộ Trực", bold: true })], alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Người Lập", bold: true })], alignment: AlignmentType.CENTER })] }),
                                    ]
                                }),
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [
                                            new Paragraph({ text: "" }),
                                            new Paragraph({ text: "" }),
                                            new Paragraph({ text: "" }),
                                            new Paragraph({ text: "" }),
                                            new Paragraph({ text: dutyOfficer, alignment: AlignmentType.CENTER })
                                        ] }),
                                        new TableCell({ children: [
                                            new Paragraph({ text: "" }),
                                            new Paragraph({ text: "" }),
                                            new Paragraph({ text: "" }),
                                            new Paragraph({ text: "" }),
                                            new Paragraph({ text: reporter, alignment: AlignmentType.CENTER })
                                        ] }),
                                    ]
                                })
                            ]
                        })
                    ]
                }]
            });
            
            Packer.toBlob(doc).then((blob) => {
                const now = new Date();
                const dstring = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth()+1).padStart(2, '0')}${now.getFullYear()}`;
                saveAs(blob, `PhieuAnToan_${dstring}.docx`);
                setIsGenerating(false);
            });
        } catch (error) {
            console.error(error);
            alert("Lỗi xuất file!");
            setIsGenerating(false);
        }
    }

    const resetForm = () => {
        setCurrentReportId(null);
        setShiftTime('07:00 – 19:00');
        setDutyOfficer('');
        setReporter(currentUser?.name || '');
        setTotalWorkers('');
        setAbsentWorkers('');
        setWorkLocations('');
        setInspectionLocations('');
        setCriteria([...INITIAL_CRITERIA.map(c => ({...c, result: null, note: ''}))]);
        setWorkerOpinions('');
    };

    const handleDeleteReport = async (id: string) => {
        if (confirm("Bạn có chắc chắn muốn xóa biểu mẫu này không? Thao tác không thể hoàn tác.")) {
            await deleteSafetyReport(id);
        }
    };

    const handleUpdateCriteria = (id: string, key: keyof SafetyCriteria, value: any) => {
        setCriteria(prev => prev.map(c => {
            if (c.id === id) {
                if (key === 'result' && value === 'Đạt') {
                    return { ...c, [key]: value, note: '' };
                }
                return { ...c, [key]: value };
            }
            return c;
        }));
    };

    const viewReport = (r: SafetyReport) => {
        setCurrentReportId(r.id);
        setShiftTime(r.shiftTime);
        setDutyOfficer(r.dutyOfficer);
        setReporter(r.reporter);
        setTotalWorkers(r.totalWorkers || '');
        setAbsentWorkers(r.absentWorkers || '');
        setWorkLocations(r.workLocations || '');
        setInspectionLocations(r.inspectionLocations || '');
        setCriteria(r.criteria);
        setWorkerOpinions(r.workerOpinions || '');
        setViewMode('CREATE');
    };

    const filteredReports = reports.filter(r => 
        r.createdAt.includes(searchTerm) || 
        r.dutyOfficer.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.reporter.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900 pb-24 print:bg-white print:p-0 print:m-0">
            <div className="max-w-6xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 print:hidden">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/')} className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-100 transition shadow-sm">
                            <ArrowLeft size={20} className="text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black uppercase text-emerald-700 flex items-center gap-2">
                                <ShieldCheck className="text-emerald-600" size={28} />
                                Quản lý An toàn Vệ sinh viên
                            </h1>
                            <p className="text-slate-500 text-sm">Theo dõi, kiểm tra và đảm bảo an toàn vệ sinh lao động</p>
                        </div>
                    </div>
                    {viewMode === 'LIST' && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    resetForm();
                                    setViewMode('CREATE');
                                }}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg shadow-md hover:bg-emerald-700 flex items-center gap-2 font-bold text-sm transition active:scale-95"
                            >
                                <Plus size={18} /> Lập Phiếu An Toàn
                            </button>
                        </div>
                    )}
                </header>

                {viewMode === 'LIST' && (
                    <div className="space-y-6">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <IMESafeInput
                                type="text"
                                placeholder="Tìm kiếm theo Ngày, Người lập, Cán bộ..."
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 shadow-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 transition bg-white"
                                value={searchTerm}
                                onChangeValue={setSearchTerm}
                            />
                        </div>

                        {loading ? (
                            <div className="text-center p-12">
                                <Loader2 className="animate-spin mx-auto text-emerald-500 mb-2" size={32} />
                                <span className="text-slate-500">Đang tải biểu mẫu...</span>
                            </div>
                        ) : filteredReports.length === 0 ? (
                            <div className="text-center p-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                                {searchTerm ? 'Không tìm thấy phiếu nào phù hợp.' : 'Chưa có phiếu an toàn nào được ghi nhận.'}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredReports.map(report => (
                                    <div key={report.id} onClick={() => viewReport(report)} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition cursor-pointer">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2 text-emerald-800 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 text-sm">
                                                <Calendar size={14} /> {report.createdAt}
                                            </div>
                                            {currentUser?.role === 'ADMIN' && (
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteReport(report.id); }} className="text-slate-400 hover:text-red-600 transition p-1 hover:bg-red-50 rounded">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-2 mb-4 text-sm">
                                            <div className="flex justify-between border-b border-slate-50 pb-1">
                                                <span className="text-slate-500">Ca trực:</span>
                                                <span className="font-semibold text-slate-700">{report.shiftTime}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-50 pb-1">
                                                <span className="text-slate-500">Cán bộ trực:</span>
                                                <span className="font-semibold text-slate-700">{report.dutyOfficer}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-50 pb-1">
                                                <span className="text-slate-500">Người lập:</span>
                                                <span className="font-semibold text-slate-700">{report.reporter}</span>
                                            </div>
                                            {(() => {
                                                const passedCount = report.criteria.filter(c => c.result === 'Đạt').length;
                                                const totalCount = report.criteria.length;
                                                if (passedCount < totalCount) {
                                                    return (
                                                        <div className="flex justify-end animate-pulse">
                                                            <span className="text-[10px] font-black uppercase text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 flex items-center gap-1">
                                                                Cảnh báo: {passedCount}/{totalCount} Đạt
                                                            </span>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>

                                        <div className="text-xs text-slate-500 flex gap-4">
                                            <span className="flex items-center gap-1">LĐ: <b className="text-slate-700">{report.totalWorkers || 0}</b></span>
                                            <span className="flex items-center gap-1">Nghỉ: <b className="text-slate-700">{report.absentWorkers || 0}</b></span>
                                            {(() => {
                                                const passedCount = report.criteria.filter(c => c.result === 'Đạt').length;
                                                const totalCount = report.criteria.length;
                                                const isPerfect = passedCount === totalCount;
                                                return (
                                                    <span className={clsx(
                                                        "flex items-center gap-1 font-bold",
                                                        isPerfect ? "text-emerald-600" : "text-red-600"
                                                    )}>
                                                        {isPerfect ? <CheckCircle size={12} /> : <AlertOctagon size={12} />}
                                                        {passedCount}/{totalCount} Đạt
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {viewMode === 'CREATE' && (
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden mb-6 animate-in slide-in-from-bottom-4 duration-300 print:shadow-none print:border-none print:rounded-none">
                        {/* Biểu mẫu Header */}
                        <div className="bg-emerald-600 text-white p-6 text-center border-b-4 border-emerald-800 print:bg-white print:text-black print:border-b-2 print:border-black print:mb-4">
                            <h2 className="text-2xl font-black uppercase mb-1">BIỂU MẪU KIỂM TRA</h2>
                            <h3 className="text-lg font-medium opacity-90 uppercase tracking-widest print:opacity-100">An Toàn - Vệ Sinh Lao Động</h3>
                        </div>

                        <div className="p-4 md:p-8 space-y-6">
                            {/* Phân vùng 1: Thông tin chung */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">1. Thời gian ca trực</label>
                                    <select 
                                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:border-emerald-500 outline-none bg-slate-50"
                                        value={shiftTime}
                                        onChange={e => setShiftTime(e.target.value)}
                                    >
                                        <option value="07:00 – 19:00">07:00 – 19:00 (Ca Ngày)</option>
                                        <option value="19:00 – 07:00">19:00 – 07:00 ngày hôm sau (Ca Đêm)</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">2. Cán bộ trực</label>
                                        <select 
                                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:border-emerald-500 outline-none bg-slate-50"
                                            value={dutyOfficer}
                                            onChange={e => setDutyOfficer(e.target.value)}
                                        >
                                            <option value="">-- Chọn Cán bộ --</option>
                                            {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Người lập</label>
                                        <select 
                                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:border-emerald-500 outline-none bg-slate-50"
                                            value={reporter}
                                            onChange={e => setReporter(e.target.value)}
                                        >
                                            <option value="">-- Chọn Người lập --</option>
                                            {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">3. Tổng số người lao động</label>
                                        <IMESafeInput 
                                            type="number"
                                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:border-emerald-500 outline-none"
                                            placeholder="Số lượng..."
                                            value={totalWorkers}
                                            onChangeValue={setTotalWorkers}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Trong đó nghỉ</label>
                                        <IMESafeInput 
                                            type="number"
                                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:border-emerald-500 outline-none"
                                            placeholder="Số lượng nghỉ..."
                                            value={absentWorkers}
                                            onChangeValue={setAbsentWorkers}
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">4. Các vị trí làm việc</label>
                                        <IMESafeInput 
                                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:border-emerald-500 outline-none"
                                            placeholder="Sân đỗ, cầu ống..."
                                            value={workLocations}
                                            onChangeValue={setWorkLocations}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">5. Các vị trí kiểm tra an toàn, VSLĐ</label>
                                        <IMESafeInput 
                                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:border-emerald-500 outline-none"
                                            placeholder="Tủ điện, trang thiết bị..."
                                            value={inspectionLocations}
                                            onChangeValue={setInspectionLocations}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-slate-200 my-6"></div>

                            {/* Phân vùng 2: Bảng Tiêu Chí */}
                            <div>
                                <label className="block text-base font-bold text-slate-800 mb-3">6. Các tiêu chí kiểm tra:</label>
                                <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm">
                                    <table className="w-full text-sm text-left border-collapse min-w-[800px]">
                                        <thead className="bg-slate-100 text-slate-700">
                                            <tr>
                                                <th className="border-b border-r border-slate-300 px-3 py-3 w-10 text-center">TT</th>
                                                <th className="border-b border-r border-slate-300 px-3 py-3 w-48">Hạng mục kiểm tra</th>
                                                <th className="border-b border-r border-slate-300 px-3 py-3 w-24 text-center">Phương pháp</th>
                                                <th className="border-b border-r border-slate-300 px-3 py-3">Tiêu chuẩn</th>
                                                <th className="border-b border-r border-slate-300 px-3 py-3 w-28 text-center">Số lần kiểm tra</th>
                                                <th className="border-b border-r border-slate-300 px-3 py-3 w-48 text-center" colSpan={2}>
                                                    Kết quả<br />
                                                    <span className="text-xs font-normal grid grid-cols-2 mt-1 border-t border-slate-300 pt-1">
                                                        <span className="border-r border-slate-300">Đạt</span>
                                                        <span>Không đạt</span>
                                                    </span>
                                                </th>
                                                <th className="border-b border-slate-300 px-3 py-3 w-40">Ghi chú</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {criteria.map((item, index) => (
                                                <tr key={item.id} className="bg-white hover:bg-slate-50 transition border-b border-slate-200 last:border-0">
                                                    <td className="border-r border-slate-200 px-3 py-2 text-center font-medium">{index + 1}</td>
                                                    <td className="border-r border-slate-200 px-3 py-2 font-bold text-slate-700">{item.name}</td>
                                                    <td className="border-r border-slate-200 px-3 py-2 text-center text-slate-600">{item.method}</td>
                                                    <td className="border-r border-slate-200 px-3 py-2">
                                                        <ul className="list-disc pl-4 space-y-1 text-slate-600">
                                                            {item.standards.split('\n').map((std, i) => (
                                                                <li key={i}>{std}</li>
                                                            ))}
                                                        </ul>
                                                    </td>
                                                    <td className="border-r border-slate-200 px-3 py-2 text-center text-slate-600 whitespace-pre-line">{item.frequency}</td>
                                                    {/* Kết Quả */}
                                                    <td className="border-r border-slate-200 p-0 text-center w-24 align-middle">
                                                        <label className="flex items-center justify-center w-full h-full p-3 cursor-pointer hover:bg-emerald-50 transition">
                                                            <input 
                                                                type="radio" 
                                                                name={`result-${item.id}`} 
                                                                className="w-5 h-5 text-emerald-600"
                                                                checked={item.result === 'Đạt'}
                                                                onChange={() => handleUpdateCriteria(item.id, 'result', 'Đạt')}
                                                            />
                                                        </label>
                                                    </td>
                                                    <td className="border-r border-slate-200 p-0 text-center w-24 align-middle">
                                                        <label className="flex items-center justify-center w-full h-full p-3 cursor-pointer hover:bg-red-50 transition">
                                                            <input 
                                                                type="radio" 
                                                                name={`result-${item.id}`} 
                                                                className="w-5 h-5 text-red-600"
                                                                checked={item.result === 'Không đạt'}
                                                                onChange={() => handleUpdateCriteria(item.id, 'result', 'Không đạt')}
                                                            />
                                                        </label>
                                                    </td>
                                                    {/* Ghi chú */}
                                                    <td className="p-2">
                                                        <IMESafeTextArea 
                                                            className="w-full text-sm border border-transparent rounded px-2 py-1 hover:border-slate-300 focus:border-emerald-500 outline-none focus:bg-white resize-none disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                                                            placeholder={item.result === 'Đạt' ? "" : "Nhập ghi chú..."}
                                                            rows={3}
                                                            value={item.note}
                                                            disabled={item.result === 'Đạt'}
                                                            onChangeValue={(v: string) => handleUpdateCriteria(item.id, 'note', v)}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="border-t border-slate-200 my-6"></div>

                            {/* Phân vùng 3: Ý kiến */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">7. Tổng hợp các ý kiến, kiến nghị của người lao động:</label>
                                <IMESafeTextArea 
                                    className="w-full border border-slate-300 rounded-lg p-3 focus:border-emerald-500 outline-none min-h-[100px]"
                                    placeholder="Ghi nhận các ý kiến, kiến nghị nếu có..."
                                    value={workerOpinions}
                                    onChangeValue={setWorkerOpinions}
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="bg-slate-100 p-4 border-t border-slate-200 flex justify-end gap-3 rounded-b-2xl print:hidden">
                            <button
                                onClick={() => setViewMode('LIST')}
                                className="px-5 py-2.5 text-slate-600 bg-white border border-slate-300 rounded-lg font-bold hover:bg-slate-50 transition"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={generateWordReport}
                                disabled={isGenerating}
                                className="px-5 py-2.5 text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg font-bold hover:bg-indigo-100 transition flex items-center gap-2 disabled:opacity-70"
                            >
                                {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Printer size={20} />}
                                Xuất File Word
                            </button>
                            <button
                                onClick={handleSaveReport}
                                disabled={isSaving}
                                className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg shadow-md hover:bg-emerald-700 font-bold flex items-center gap-2 transition active:scale-95 disabled:opacity-70"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                                {currentReportId ? 'Cập Nhật' : 'Lưu Nhận Xét'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
