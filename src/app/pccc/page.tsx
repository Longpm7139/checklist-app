'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Download, FileText, Calendar, Clock, User, ShieldCheck } from 'lucide-react';
import { getUsers, savePcccReport } from '@/lib/firebase';
import { useUser } from '@/providers/UserProvider';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, AlignmentType, WidthType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import clsx from 'clsx';

const APPENDIX_6_ZONES = [
  {
    area: "Nhà ga T1: Khu vực tầng 1 trục 14 đến 27\nKhu vực Boarding gate 9-10-11 + phòng VIP",
    items: [
      { id: '1-1', name: "Bình chữa cháy MT5", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '1-2', name: "Bình chữa cháy MT3", allocated: 2, actual: 2, status: "OK", note: "" },
      { id: '1-3', name: "Bình chữa cháy MFZ8", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '1-4', name: "Bình chữa cháy MFZ4", allocated: 1, actual: 1, status: "OK", note: "" },
      { id: '1-5', name: "Bình chữa cháy gốc nước (màu tím)", allocated: 1, actual: 1, status: "OK", note: "" },
      { id: '1-6', name: "Bình chữa cháy bột ABC 8kg", allocated: 0, actual: 0, status: "OK", note: "" },
    ]
  },
  {
    area: "Khu vực Soi chiếu nội bộ + Phòng Điện SUB 2",
    items: [
      { id: '2-1', name: "Bình chữa cháy MT5", allocated: 2, actual: 2, status: "OK", note: "" },
      { id: '2-2', name: "Bình chữa cháy MT3", allocated: 4, actual: 4, status: "OK", note: "" },
      { id: '2-3', name: "Bình chữa cháy MFZ8", allocated: 1, actual: 1, status: "OK", note: "" },
      { id: '2-4', name: "Bình chữa cháy MFZ4", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '2-5', name: "Bình chữa cháy gốc nước (màu tím)", allocated: 4, actual: 4, status: "OK", note: "" },
      { id: '2-6', name: "Bình chữa cháy bột ABC 8kg", allocated: 0, actual: 0, status: "OK", note: "" },
    ]
  },
  {
    area: "Quầy tourist Information + An ninh trật tự cửa A4",
    items: [
      { id: '3-1', name: "Bình chữa cháy MT5", allocated: 1, actual: 1, status: "OK", note: "" },
      { id: '3-2', name: "Bình chữa cháy MT3", allocated: 2, actual: 2, status: "OK", note: "" },
      { id: '3-3', name: "Bình chữa cháy MFZ8", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '3-4', name: "Bình chữa cháy MFZ4", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '3-5', name: "Bình chữa cháy gốc nước (màu tím)", allocated: 1, actual: 1, status: "OK", note: "" },
      { id: '3-6', name: "Bình chữa cháy bột ABC 8kg", allocated: 0, actual: 0, status: "OK", note: "" },
    ]
  },
  {
    area: "Phòng Tổ bay Vietjet (Ga đến - Ngoài cửa A4)",
    items: [
      { id: '4-1', name: "Bình chữa cháy MT5", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '4-2', name: "Bình chữa cháy MT3", allocated: 4, actual: 4, status: "OK", note: "" },
      { id: '4-3', name: "Bình chữa cháy MFZ8", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '4-4', name: "Bình chữa cháy MFZ4", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '4-5', name: "Bình chữa cháy gốc nước (màu tím)", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '4-6', name: "Bình chữa cháy bột ABC 8kg", allocated: 0, actual: 0, status: "OK", note: "" },
    ]
  },
  {
    area: "Quầy Highland (Ga đến- ngoài Cửa A4) + ATM Vietcombank",
    items: [
      { id: '5-1', name: "Bình chữa cháy MT5", allocated: 4, actual: 4, status: "OK", note: "" },
      { id: '5-2', name: "Bình chữa cháy MT3", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '5-3', name: "Bình chữa cháy MFZ8", allocated: 1, actual: 1, status: "OK", note: "" },
      { id: '5-4', name: "Bình chữa cháy MFZ4", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '5-5', name: "Bình chữa cháy gốc nước (màu tím)", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '5-6', name: "Bình chữa cháy bột ABC 8kg", allocated: 0, actual: 0, status: "OK", note: "" },
    ]
  },
  {
    area: "Nhà hàng Masco",
    items: [
      { id: '6-1', name: "Bình chữa cháy MT5", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '6-2', name: "Bình chữa cháy MT3", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '6-3', name: "Bình chữa cháy MFZ8", allocated: 2, actual: 2, status: "OK", note: "" },
      { id: '6-4', name: "Bình chữa cháy MFZ4", allocated: 3, actual: 3, status: "OK", note: "" },
      { id: '6-5', name: "Bình chữa cháy gốc nước (màu tím)", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '6-6', name: "Bình chữa cháy bột ABC 8kg", allocated: 0, actual: 0, status: "OK", note: "" },
    ]
  },
  {
    area: "Khu vực phân tuyến + TER 1.2, Điện 1.2",
    items: [
      { id: '7-1', name: "Bình chữa cháy MT5", allocated: 2, actual: 2, status: "OK", note: "" },
      { id: '7-2', name: "Bình chữa cháy MT3", allocated: 2, actual: 2, status: "OK", note: "" },
      { id: '7-3', name: "Bình chữa cháy MFZ8", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '7-4', name: "Bình chữa cháy MFZ4", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '7-5', name: "Bình chữa cháy gốc nước (màu tím)", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '7-6', name: "Bình chữa cháy bột ABC 8kg", allocated: 0, actual: 0, status: "OK", note: "" },
    ]
  },
  {
    area: "Phòng Kỹ thuật điện chân cầu Bến 21,22 và Cầu bến 23",
    items: [
      { id: '8-1', name: "Bình chữa cháy MT5", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '8-2', name: "Bình chữa cháy MT3", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '8-3', name: "Bình chữa cháy MFZ8", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '8-4', name: "Bình chữa cháy MFZ4", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '8-5', name: "Bình chữa cháy gốc nước (màu tím)", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '8-6', name: "Bình chữa cháy bột ABC 8kg", allocated: 2, actual: 2, status: "OK", note: "" },
    ]
  },
  {
    area: "Khu vực phòng làm việc, kho chứa vật tư, công cụ, dụng cụ, nhiên liệu do Đội Cơ khí điện tử khai thác, quản lý, sử dụng.",
    items: [
      { id: '9-1', name: "Bình chữa cháy MT5", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '9-2', name: "Bình chữa cháy MT3", allocated: 1, actual: 1, status: "OK", note: "" },
      { id: '9-3', name: "Bình chữa cháy MFZ8", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '9-4', name: "Bình chữa cháy MFZ4", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '9-5', name: "Bình chữa cháy gốc nước (màu tím)", allocated: 0, actual: 0, status: "OK", note: "" },
      { id: '9-6', name: "Bình chữa cháy bột ABC 8kg", allocated: 1, actual: 1, status: "OK", note: "" },
    ]
  }
];

const ROLES = ["Đội trưởng", "Phó đội trưởng", "Kỹ sư", "Tổ trưởng", "Tổ phó", "Nhân viên"];

export default function PcccReportPage() {
    const router = useRouter();
    const { user } = useUser();
    const [users, setUsers] = useState<any[]>([]);

    // Form states
    const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [selectedTime, setSelectedTime] = useState(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    const [leaderId, setLeaderId] = useState('');
    const [leaderRole, setLeaderRole] = useState(ROLES[0]);
    const [memberId, setMemberId] = useState('');
    const [memberRole, setMemberRole] = useState(ROLES[5]);

    // Zones states
    const [zones, setZones] = useState(APPENDIX_6_ZONES);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            const data = await getUsers();
            setUsers(data);
            if (data.length > 0) {
                // Determine sensible defaults if possible
                setLeaderId(data[0].id);
                if (data.length > 1) {
                    setMemberId(data[1].id);
                } else {
                    setMemberId(data[0].id);
                }
            }
        };
        fetchUsers();
    }, []);

    // Derived Summary
    const flatItems = zones.flatMap(z => z.items);
    const nokItems = flatItems.filter(i => i.status === 'NOK');
    const hasNok = nokItems.length > 0;
    
    // Generates the text for "+ Kiểm tra các bình chữa cháy:"
    let summaryText = 'Bình thường';
    if (hasNok) {
        summaryText = nokItems.map(i => {
           // find area name
           const zone = zones.find(z => z.items.find(item => item.id === i.id));
           return `${zone?.area}: ${i.name} (${i.note || 'Lỗi không xác định'})`;
        }).join('; ');
    }

    const updateItem = (zoneIdx: number, itemIdx: number, field: string, value: any) => {
        const newZones = [...zones];
        (newZones[zoneIdx].items[itemIdx] as any)[field] = value;
        setZones(newZones);
    };

    const handleSaveToDb = async () => {
        try {
            const reportData = {
                id: `PCCC_${Date.now()}`,
                date: selectedDate,
                time: selectedTime,
                leaderId,
                leaderName: users.find(u => u.id === leaderId)?.name || '',
                leaderRole,
                memberId,
                memberName: users.find(u => u.id === memberId)?.name || '',
                memberRole,
                summary: summaryText,
                zones,
                createdAt: new Date().toISOString(),
                createdBy: user?.name || 'Unknown'
            };
            await savePcccReport(reportData);
            alert('Lưu báo cáo vào hệ thống thành công!');
        } catch (error) {
            console.error(error);
            alert('Lưu báo cáo thất bại!');
        }
    };

    const generateDocx = async () => {
        setIsGenerating(true);
        try {
            const leaderName = users.find(u => u.id === leaderId)?.name || '........................';
            const memberName = users.find(u => u.id === memberId)?.name || '........................';
            const d = new Date(selectedDate);
            const formattedDateString = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            const [year, month, day] = selectedDate.split('-');

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

                        new Paragraph({ text: `Vào lúc: ${selectedTime} giờ, ngày ${day} tháng ${month} năm ${year}` }),
                        new Paragraph({ text: `Nhóm trưởng: Ông ${leaderName}\t\t\tChức vụ: ${leaderRole}` }),
                        new Paragraph({ text: `Thành viên: Ông ${memberName}\t\t\tChức vụ: ${memberRole}` }),
                        
                        new Paragraph({ text: "Đã tiến hành kiểm tra các bình chữa cháy tại các khu vực:", spacing: { before: 200 } }),
                        new Paragraph({ text: "- Khu vực phòng làm việc Đội CKĐT, kho chứa vật tư, công cụ, dụng cụ, nhiên liệu, do Đội Cơ khí điện từ khai thác, quản lý, sử dụng." }),
                        new Paragraph({ text: "- Khu vực từ trục 14 đến trục 27 tầng 01 nhà ga T1.", spacing: { after: 200 } }),

                        new Paragraph({ children: [new TextRun({ text: "1. Nội dung và kết quả kiểm tra như sau: (Đính kèm phụ lục số 6).", bold: true })] }),
                        new Paragraph({ text: `+ Kiểm tra các bình chữa cháy: ${summaryText}` }),

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
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Stt", bold: true })], alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Khu vực", bold: true })], alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TTB PCCC", bold: true })], alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Số lượng phân bổ", bold: true })], alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Số lượng thực tế", bold: true })], alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tình trạng hiện tại", bold: true })], alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Ghi chú", bold: true })], alignment: AlignmentType.CENTER })] }),
                                    ]
                                }),
                                ...zones.flatMap((zone, zIdx) => {
                                    return zone.items.map((item, iIdx) => {
                                        return new TableRow({
                                            children: [
                                                // Only show Stt and Khu vuc on first item of the zone
                                                new TableCell({ children: [new Paragraph({ text: iIdx === 0 ? (zIdx + 1).toString() : "", alignment: AlignmentType.CENTER })] }),
                                                new TableCell({ children: [new Paragraph({ text: iIdx === 0 ? zone.area : "" })] }),
                                                new TableCell({ children: [new Paragraph({ text: item.name })] }),
                                                new TableCell({ children: [new Paragraph({ text: item.allocated.toString(), alignment: AlignmentType.CENTER })] }),
                                                new TableCell({ children: [new Paragraph({ text: item.actual.toString(), alignment: AlignmentType.CENTER })] }),
                                                new TableCell({ children: [new Paragraph({ text: item.status, alignment: AlignmentType.CENTER })] }),
                                                new TableCell({ children: [new Paragraph({ text: item.note || "" })] }),
                                            ]
                                        });
                                    });
                                })
                            ]
                        })
                    ]
                }]
            });

            Packer.toBlob(doc).then((blob) => {
                saveAs(blob, `BienBan_PCCC_Nhom06_${formattedDateString.replace(/\//g, '')}.docx`);
                setIsGenerating(false);
            });
        } catch(e) {
            console.error(e);
            alert("Lỗi khi tạo file word");
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900 pb-20">
            <div className="max-w-6xl mx-auto">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/')} className="p-2 sm:p-3 bg-white rounded-xl shadow border border-slate-200 hover:bg-slate-100 transition active:scale-95">
                            <ArrowLeft size={20} className="text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black uppercase text-orange-600 flex items-center gap-2 tracking-tight">
                                <ShieldCheck className="text-orange-600" /> Báo Cáo PCCC
                            </h1>
                            <p className="text-slate-500 text-sm font-medium">Biên bản kiểm tra Phòng cháy chữa cháy (Nhóm 06)</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSaveToDb}
                            className="py-3 px-4 text-white font-black rounded-xl shadow transition-all flex items-center gap-2 bg-slate-700 hover:bg-slate-800"
                        >
                            <Save size={20} /> <span className="hidden sm:inline">LƯU DB</span>
                        </button>
                        <button
                            onClick={generateDocx}
                            disabled={isGenerating}
                            className={clsx(
                                "py-3 px-6 text-white font-black rounded-xl shadow-lg transition-all flex items-center gap-2",
                                isGenerating ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                            )}
                        >
                            <Download size={20} /> <span className="hidden sm:inline">{isGenerating ? "Đang xử lý..." : "XUẤT WORD"}</span>
                        </button>
                    </div>
                </header>

                <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden mb-6">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 font-black text-slate-800 text-lg uppercase tracking-wide">
                        Thông tin Biên bản
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1"><Calendar size={14} />Ngày báo cáo</label>
                            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full border p-3 rounded-xl bg-slate-50 outline-none focus:border-orange-500 font-bold text-slate-800" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1"><Clock size={14} />Vào lúc (Giờ)</label>
                            <input type="time" value={selectedTime} onChange={e => setSelectedTime(e.target.value)} className="w-full border p-3 rounded-xl bg-slate-50 outline-none focus:border-orange-500 font-bold text-slate-800" />
                        </div>
                        <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1"><User size={14} className="text-orange-600"/>Nhóm trưởng</label>
                            <select value={leaderId} onChange={e => setLeaderId(e.target.value)} className="w-full border p-2 mb-2 rounded-lg bg-white outline-none">
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                            <select value={leaderRole} onChange={e => setLeaderRole(e.target.value)} className="w-full border p-2 rounded-lg bg-white outline-none font-medium">
                                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1"><User size={14} className="text-blue-600"/>Thành viên</label>
                            <select value={memberId} onChange={e => setMemberId(e.target.value)} className="w-full border p-2 mb-2 rounded-lg bg-white outline-none">
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                            <select value={memberRole} onChange={e => setMemberRole(e.target.value)} className="w-full border p-2 rounded-lg bg-white outline-none font-medium">
                                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                             <label className="block text-sm font-bold text-slate-700 mb-2">Kết quả tự động (Điền vào mục: Kiểm tra các bình chữa cháy):</label>
                             <div className={clsx("p-4 rounded-xl border font-semibold", hasNok ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200")}>
                                 {summaryText}
                             </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 font-black text-slate-800 text-lg uppercase tracking-wide flex justify-between items-center">
                        Phụ lục 6: Bảng kiểm tra thiết bị PCCC
                        <span className="text-xsbg-slate-200 text-slate-500 font-medium px-2 py-1 rounded">Tự động hóa báo cáo dựa theo Tình trạng (OK/NOK)</span>
                    </div>
                    <div className="overflow-x-auto p-4">
                        <table className="w-full min-w-[800px] border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-100 text-slate-700">
                                    <th className="border p-2 w-10 text-center">STT</th>
                                    <th className="border p-2 w-1/4">Khu vực</th>
                                    <th className="border p-2 w-1/5">TTB PCCC</th>
                                    <th className="border p-2 w-16 text-center text-xs">P.Bổ</th>
                                    <th className="border p-2 w-16 text-center text-xs">T.Tế</th>
                                    <th className="border p-2 w-24 text-center">Tình trạng</th>
                                    <th className="border p-2">Ghi chú</th>
                                </tr>
                            </thead>
                            <tbody>
                                {zones.map((zone, zIdx) => (
                                    <React.Fragment key={zIdx}>
                                        <tr className="bg-slate-50/80 font-bold">
                                            <td className="border p-2 text-center text-slate-400 bg-slate-100">{zIdx + 1}</td>
                                            <td className="border p-2 text-slate-800" colSpan={6}>{zone.area.split('\n').map((line, i) => <div key={i}>{line}</div>)}</td>
                                        </tr>
                                        {zone.items.map((item, iIdx) => (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="border p-2 text-center text-slate-300"></td>
                                                <td className="border p-2 text-slate-400" ></td>
                                                <td className="border p-2 font-medium text-slate-700">{item.name}</td>
                                                <td className="border p-1">
                                                    <input type="number" min={0} value={item.allocated} onChange={e => updateItem(zIdx, iIdx, 'allocated', Number(e.target.value))} className="w-full p-1 text-center border rounded bg-transparent focus:bg-white" />
                                                </td>
                                                <td className="border p-1">
                                                    <input type="number" min={0} value={item.actual} onChange={e => updateItem(zIdx, iIdx, 'actual', Number(e.target.value))} className="w-full p-1 text-center border rounded bg-transparent focus:bg-white" />
                                                </td>
                                                <td className="border p-1 text-center">
                                                    <select 
                                                        value={item.status} 
                                                        onChange={e => updateItem(zIdx, iIdx, 'status', e.target.value)}
                                                        className={clsx("w-full p-1.5 rounded outline-none font-bold text-center", item.status === 'OK' ? "bg-green-100 text-green-700 border border-green-200" : "bg-red-100 text-red-700 border border-red-200")}
                                                    >
                                                        <option value="OK">OK</option>
                                                        <option value="NOK">NOK</option>
                                                    </select>
                                                </td>
                                                <td className="border p-1">
                                                    <input 
                                                        type="text" 
                                                        value={item.note} 
                                                        onChange={e => updateItem(zIdx, iIdx, 'note', e.target.value)} 
                                                        placeholder={item.status === 'NOK' ? "Bắt buộc nhập ghi chú..." : ""}
                                                        className="w-full p-1.5 border rounded outline-none bg-transparent focus:bg-white focus:border-blue-400" 
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
