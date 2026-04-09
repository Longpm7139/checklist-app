'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, FileText, Calendar, Clock, User, ShieldCheck, Trash2, Search } from 'lucide-react';
import { subscribeToPcccReports, deletePcccReport } from '@/lib/firebase';
import { useUser } from '@/providers/UserProvider';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, AlignmentType, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import clsx from 'clsx';

export default function PcccHistoryPage() {
    const router = useRouter();
    const { user } = useUser();
    const [reports, setReports] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isGenerating, setIsGenerating] = useState<string | null>(null);

    useEffect(() => {
        const unsub = subscribeToPcccReports(setReports);
        return () => unsub();
    }, []);

    const filteredReports = reports.filter(r => 
        r.leaderName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.memberName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.date?.includes(searchTerm)
    );

    const handleDelete = async (id: string) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa bản ghi này?')) return;
        try {
            await deletePcccReport(id);
            alert('Đã xóa thành công!');
        } catch (e) {
            alert('Lỗi khi xóa!');
        }
    };

    const generateDocxFromHistory = async (report: any) => {
        setIsGenerating(report.id);
        try {
            const leaderName = report.leaderName || '........................';
            const memberName = report.memberName || '........................';
            const d = new Date(report.date);
            const formattedDateString = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            const [year, month, day] = report.date.split('-');
            const [hourStr, minuteStr] = report.time.split(':');

            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        // HEADER 
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE } },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            width: { size: 40, type: WidthType.PERCENTAGE },
                                            children: [
                                                new Paragraph({ children: [new TextRun({ text: "ĐỘI PCCC VÀ CNCH CHUYÊN NGÀNH", bold: true })], alignment: AlignmentType.CENTER }),
                                                new Paragraph({ children: [new TextRun({ text: "CẢNG HÀNG KHÔNG QUỐC TẾ ĐÀ NẴNG", bold: true })], alignment: AlignmentType.CENTER }),
                                                new Paragraph({ children: [new TextRun({ text: "TỔ PCCC CƠ SỞ SỐ 6", bold: true })], alignment: AlignmentType.CENTER, border: { bottom: { color: "auto", space: 1, style: BorderStyle.SINGLE, size: 6 } } }),
                                            ]
                                        }),
                                        new TableCell({
                                            width: { size: 60, type: WidthType.PERCENTAGE },
                                            children: [
                                                new Paragraph({ children: [new TextRun({ text: "Mẫu số PC02", bold: true })], alignment: AlignmentType.RIGHT }),
                                                new Paragraph({ children: [new TextRun({ text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", bold: true })], alignment: AlignmentType.CENTER }),
                                                new Paragraph({ children: [new TextRun({ text: "Độc lập - Tự do - Hạnh phúc", bold: true })], alignment: AlignmentType.CENTER, border: { bottom: { color: "auto", space: 1, style: BorderStyle.SINGLE, size: 6 } } }),
                                            ]
                                        })
                                    ]
                                })
                            ]
                        }),
                        
                        new Paragraph({ text: "", spacing: { after: 200 } }),
                        new Paragraph({ children: [new TextRun({ text: "BIÊN BẢN TỰ KIỂM TRA", bold: true, size: 28 })], alignment: AlignmentType.CENTER }),
                        new Paragraph({ children: [new TextRun({ text: "Về phòng cháy, chữa cháy", bold: true, size: 24 })], alignment: AlignmentType.CENTER }),
                        new Paragraph({ children: [new TextRun({ text: "NHÓM 06", bold: true, size: 24 })], alignment: AlignmentType.CENTER, spacing: { after: 300 } }),

                        new Paragraph({ text: `Vào lúc: ${hourStr} giờ ${minuteStr} phút, ngày ${day} tháng ${month} năm ${year}` }),
                        new Paragraph({ text: `Nhóm trưởng: Ông ${leaderName}\t\t\tChức vụ: ${report.leaderRole}` }),
                        new Paragraph({ text: `Thành viên: Ông ${memberName}\t\t\tChức vụ: ${report.memberRole}` }),
                        
                        new Paragraph({ text: "Đã tiến hành kiểm tra các bình chữa cháy tại các khu vực:", spacing: { before: 200 } }),
                        new Paragraph({ text: "- Khu vực phòng làm việc Đội CKĐT, kho chứa vật tư, công cụ, dụng cụ, nhiên liệu, do Đội Cơ khí điện từ khai thác, quản lý, sử dụng." }),
                        new Paragraph({ text: "- Khu vực từ trục 14 đến trục 27 tầng 01 nhà ga T1.", spacing: { after: 200 } }),

                        new Paragraph({ children: [new TextRun({ text: "1. Nội dung và kết quả kiểm tra như sau: (Đính kèm phụ lục số 6).", bold: true })] }),
                        new Paragraph({ text: `+ Kiểm tra các bình chữa cháy: ${report.summary}` }),

                        new Paragraph({ children: [new TextRun({ text: "2. Kiến nghị:", bold: true })], spacing: { before: 200 } }),
                        new Paragraph({ text: ".................................................................................................................................................................." }),
                        new Paragraph({ text: ".................................................................................................................................................................." }),
                        new Paragraph({ text: "..................................................................................................................................................................", spacing: { after: 200 } }),

                        new Paragraph({ text: `Việc kiểm tra được kết thúc vào lúc ...... giờ ....... ngày .... tháng .... năm ........` }),
                        new Paragraph({ children: [new TextRun({ text: "P. Tổ Trưởng", bold: true })], alignment: AlignmentType.RIGHT, spacing: { before: 200 } }),
                        new Paragraph({ children: [new TextRun({ text: "(Ký ghi rõ họ, tên)", italics: true })], alignment: AlignmentType.RIGHT, spacing: { after: 400 } }),

                        // --- PAGE BREAK FOR APPENDIX 6 ---
                        new Paragraph({ children: [new TextRun({ text: "Phụ lục số 6", bold: true })], alignment: AlignmentType.CENTER, pageBreakBefore: true }),
                        new Paragraph({ text: `Ngày/Tháng kiểm tra: ${day}/${month}` }),
                        new Paragraph({ text: `Người kiểm tra: ${leaderName}`, spacing: { after: 200 } }),

                        // Table Appx 6
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 }, insideHorizontal: { style: BorderStyle.SINGLE, size: 1 }, insideVertical: { style: BorderStyle.SINGLE, size: 1 } },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Stt", bold: true })], alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Khu vực", bold: true })], alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "TTB PCCC", bold: true })], alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Số lượng Thực tế", bold: true })], alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Tình trạng hiện tại", bold: true })], alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Ghi chú", bold: true })], alignment: AlignmentType.CENTER })] }),
                                    ]
                                }),
                                ...(report.zones || []).flatMap((zone: any, zIdx: number) => {
                                    return (zone.items || []).map((item: any, iIdx: number) => {
                                        return new TableRow({
                                            children: [
                                                new TableCell({ children: [new Paragraph({ text: iIdx === 0 ? (zIdx + 1).toString() : "", alignment: AlignmentType.CENTER })] }),
                                                new TableCell({ children: [new Paragraph({ text: iIdx === 0 ? zone.area : "" })] }),
                                                new TableCell({ children: [new Paragraph({ text: item.name })] }),
                                                new TableCell({ children: [new Paragraph({ text: item.actual.toString(), alignment: AlignmentType.CENTER })] }),
                                                new TableCell({ children: [new Paragraph({ text: item.actual > 0 ? (item.status || "") : "", alignment: AlignmentType.CENTER })] }),
                                                new TableCell({ children: [new Paragraph({ text: item.note || "" })] }),
                                            ]
                                        });
                                    });
                                }),
                                // THÊM DÒNG TỔNG TỪNG LOẠI BÌNH
                                ...(report.typeTotals || []).map((t: any, idx: number) => (
                                    new TableRow({
                                        children: [
                                            new TableCell({ children: [new Paragraph({ text: idx === 0 ? "10" : "", alignment: AlignmentType.CENTER })] }),
                                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: idx === 0 ? "Tổng từng loại bình" : "", bold: true })] })] }),
                                            new TableCell({ children: [new Paragraph({ text: t.name })] }),
                                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t.total.toString(), bold: true })], alignment: AlignmentType.CENTER })] }),
                                            new TableCell({ children: [new Paragraph({ text: "" })] }),
                                            new TableCell({ children: [new Paragraph({ text: "" })] }),
                                        ]
                                    })
                                )),
                                // THÊM DÒNG TỔNG CỘNG
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ text: "11", alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ 
                                            children: [new Paragraph({ children: [new TextRun({ text: "Số lượng tổng các bình", bold: true })] })], 
                                            columnSpan: 2 
                                        }),
                                        new TableCell({ 
                                            children: [new Paragraph({ children: [new TextRun({ text: (report.grandTotal || 0).toString(), bold: true })], alignment: AlignmentType.CENTER })] 
                                        }),
                                        new TableCell({ children: [new Paragraph({ text: "" })] }),
                                        new TableCell({ children: [new Paragraph({ text: "" })] }),
                                    ]
                                })
                            ]
                        })
                    ]
                }]
            });

            Packer.toBlob(doc).then((blob) => {
                saveAs(blob, `BienBan_PCCC_Nhom06_REPRINT_${formattedDateString.replace(/\//g, '')}.docx`);
                setIsGenerating(null);
            });
        } catch(e) {
            console.error(e);
            alert("Lỗi khi tạo file word");
            setIsGenerating(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900 pb-20">
            <div className="max-w-5xl mx-auto">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/pccc')} className="p-3 bg-white rounded-xl shadow border border-slate-200 hover:bg-slate-100 transition">
                            <ArrowLeft size={20} className="text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black uppercase text-slate-800 flex items-center gap-2">
                                <FileText className="text-blue-600" /> Lịch sử Báo Cáo PCCC
                            </h1>
                            <p className="text-slate-500 text-sm font-medium">Danh sách các biên bản đã lưu trong Cơ sở dữ liệu</p>
                        </div>
                    </div>
                </header>

                <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden mb-6 p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm theo tên người kiểm tra, ngày hoặc nội dung..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-200 font-medium transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    {filteredReports.length > 0 ? (
                        filteredReports.map((report) => (
                            <div key={report.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all flex flex-col md:flex-row justify-between gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="bg-blue-100 text-blue-700 font-black px-2 py-1 rounded text-[10px] uppercase">Biên bản PCCC</div>
                                        <span className="text-slate-400 text-xs font-mono">{report.id}</span>
                                    </div>
                                    <h3 className="text-lg font-black text-slate-800 mb-1 flex items-center gap-2">
                                        <Calendar size={16} className="text-slate-400" />
                                        {report.date} <span className="text-slate-300 font-normal ml-2">|</span> <Clock size={16} className="text-slate-400 ml-2" /> {report.time}
                                    </h3>
                                    <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-600 mb-4">
                                        <span className="flex items-center gap-1"><User size={14} /> Trưởng nhóm: <b className="text-slate-800">{report.leaderName}</b></span>
                                        <span className="flex items-center gap-1"><User size={14} /> Thành viên: <b className="text-slate-800">{report.memberName}</b></span>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm text-slate-500 italic">
                                        <b className="text-slate-700 not-italic block mb-1 uppercase text-[10px] tracking-wider">Tình trạng chung:</b>
                                        {report.summary}
                                    </div>
                                </div>
                                <div className="flex flex-row md:flex-col justify-end gap-2 shrink-0">
                                    <button 
                                        onClick={() => generateDocxFromHistory(report)}
                                        disabled={isGenerating === report.id}
                                        className={clsx(
                                            "flex-1 md:flex-none py-3 px-6 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all",
                                            isGenerating === report.id ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                                        )}
                                    >
                                        <Download size={18} /> {isGenerating === report.id ? "Đang tạo..." : "XUẤT LẠI WORD"}
                                    </button>
                                    {user?.role === 'ADMIN' && (
                                        <button 
                                            onClick={() => handleDelete(report.id)}
                                            className="flex-1 md:flex-none py-3 px-6 rounded-xl font-black text-sm text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Trash2 size={18} /> XÓA
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white p-20 text-center rounded-[2.5rem] border border-slate-200 border-dashed">
                             <div className="flex flex-col items-center gap-4 grayscale opacity-40">
                                <FileText size={48} className="text-slate-300" />
                                <p className="font-black text-slate-500 uppercase text-xs tracking-[0.2em]">Chưa có báo cáo nào được lưu</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
