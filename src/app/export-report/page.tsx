'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Download, FileText, Calendar, CheckSquare, List, Activity, Settings, User, AlertTriangle, ShieldCheck, Wrench } from 'lucide-react';
import { subscribeToSystems, subscribeToIncidents, subscribeToMaintenance, subscribeToDuties } from '@/lib/firebase';
import { SystemCheck, Incident, MaintenanceTask } from '@/lib/types';
import { useUser } from '@/providers/UserProvider';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, AlignmentType, WidthType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import clsx from 'clsx';

function ExportReportContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryShift = searchParams.get('shift');
    const { user } = useUser();
    const [systems, setSystems] = useState<SystemCheck[]>([]);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
    const [duties, setDuties] = useState<any[]>([]);

    // Form inputs
    const [selectedDate, setSelectedDate] = useState(
        new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
    );
    const [shift, setShift] = useState(queryShift || 'Hành chính');
    const [generalEvaluation, setGeneralEvaluation] = useState('Hệ thống hoạt động cơ bản ổn định, đáp ứng được yêu cầu khai thác.');
    const [materialRequest, setMaterialRequest] = useState('Không có');
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const unsubSys = subscribeToSystems(data => setSystems(data as SystemCheck[]));
        const unsubInc = subscribeToIncidents(data => setIncidents(data as Incident[]));
        const unsubTasks = subscribeToMaintenance(data => setTasks(data as MaintenanceTask[]));
        const unsubDuties = subscribeToDuties(data => setDuties(data));

        return () => {
            unsubSys();
            unsubInc();
            unsubTasks();
            unsubDuties();
        };
    }, []);


    // Derived Data for the selected date
    const formattedDateObj = new Date(selectedDate);
    const formattedDateString = `${String(formattedDateObj.getDate()).padStart(2, '0')}/${String(formattedDateObj.getMonth() + 1).padStart(2, '0')}/${formattedDateObj.getFullYear()}`;

    // Find who was on duty
    const dayDuty = duties.find(d => d.date === selectedDate);
    // Gather all user names on duty today without duplication
    const teamMembersList = Array.from(new Set(dayDuty?.assignments?.map((a: any) => a.userName) || [])).filter(Boolean).join(', ') || user?.name || 'Chưa phân công';

    // Summary logic
    const totalSystems = systems.length;
    const okSystems = systems.filter(s => s.status === 'OK').length;
    const nokSystems = systems.filter(s => s.status === 'NOK').length;
    const naSystems = systems.filter(s => s.status === 'NA').length;
    const nokItemsList = systems.filter(s => s.status === 'NOK');

    // Filter incidents and tasks for that date based on createdAt strings matching DD/MM/YYYY
    const todaysIncidents = incidents.filter(i => i.createdAt.includes(formattedDateString));
    const todaysTasks = tasks.filter(t => t.createdAt.includes(formattedDateString) || (t.completedAt && t.completedAt.includes(formattedDateString)));

    const generateDocx = async () => {
        setIsGenerating(true);
        try {
            // Document definition
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        // --- HEADER ---
                        new Paragraph({
                            children: [
                                new TextRun({ text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", bold: true, size: 24 }),
                            ],
                            alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Độc lập - Tự do - Hạnh phúc", bold: true, size: 24 }),
                            ],
                            alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "-----------------------", bold: true, size: 24 }),
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 400 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "BÁO CÁO CÔNG TÁC ĐỘI CƠ KHÍ ĐIỆN TỬ", bold: true, size: 32 }),
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 400 }
                        }),

                        // --- SECTION 1: THÔNG TIN CHUNG ---
                        new Paragraph({ text: "1. TỔNG QUAN CA TRỰC", heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                        new Paragraph({ children: [new TextRun({ text: "- Ngày báo cáo: ", bold: true }), new TextRun({ text: formattedDateString })], spacing: { after: 100 } }),
                        new Paragraph({ children: [new TextRun({ text: "- Ca trực: ", bold: true }), new TextRun({ text: shift })], spacing: { after: 100 } }),
                        new Paragraph({ children: [new TextRun({ text: "- Phụ trách ca / Trưởng nhóm: ", bold: true }), new TextRun({ text: user?.name || "Admin" })], spacing: { after: 100 } }),
                        new Paragraph({ children: [new TextRun({ text: "- Thành viên tham gia: ", bold: true }), new TextRun({ text: teamMembersList })], spacing: { after: 200 } }),

                        // --- SECTION 2: TÓM TẮT ---
                        new Paragraph({ text: "2. TÓM TẮT TÌNH TRẠNG HỆ THỐNG", heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                        new Paragraph({ children: [new TextRun({ text: `Kíp trực đã tiến hành kiểm tra tổng số ${totalSystems} hệ thống thiết bị. Tình trạng chi tiết:` })], spacing: { after: 100 } }),
                        new Paragraph({ children: [new TextRun({ text: " • Hoạt động bình thường (OK): ", bold: true }), new TextRun({ text: okSystems.toString() })] }),
                        new Paragraph({ children: [new TextRun({ text: " • Đang có lỗi/hư hỏng (NOK): ", bold: true }), new TextRun({ text: nokSystems.toString() })] }),
                        new Paragraph({ children: [new TextRun({ text: " • Không hoạt động/Bảo trì (N/A): ", bold: true }), new TextRun({ text: naSystems.toString() })] }),
                        new Paragraph({ children: [new TextRun({ text: "=> Đánh giá chung: ", bold: true }), new TextRun({ text: generalEvaluation })], spacing: { before: 100, after: 200 } }),

                        // --- SECTION 3: CHI TIẾT ---
                        new Paragraph({ text: "3. CHI TIẾT CÁC THIẾT BỊ CÓ LỖI (NOK/NA)", heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                        ...((nokSystems + naSystems) > 0 ? [
                            new Table({
                                width: { size: 100, type: WidthType.PERCENTAGE },
                                borders: {
                                    top: { style: BorderStyle.SINGLE, size: 1 },
                                    bottom: { style: BorderStyle.SINGLE, size: 1 },
                                    left: { style: BorderStyle.SINGLE, size: 1 },
                                    right: { style: BorderStyle.SINGLE, size: 1 },
                                    insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                                    insideVertical: { style: BorderStyle.SINGLE, size: 1 },
                                },
                                rows: [
                                    new TableRow({
                                        children: [
                                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "STT", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 10, type: WidthType.PERCENTAGE } }),
                                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tên Thiết Bị", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 25, type: WidthType.PERCENTAGE } }),
                                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Trạng Thái", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 15, type: WidthType.PERCENTAGE } }),
                                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Mô Tả / Ghi Chú", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 50, type: WidthType.PERCENTAGE } }),
                                        ]
                                    }),
                                    ...systems.filter(s => s.status === 'NOK' || s.status === 'NA').map((s, idx) =>
                                        new TableRow({
                                            children: [
                                                new TableCell({ children: [new Paragraph({ text: (idx + 1).toString(), alignment: AlignmentType.CENTER })] }),
                                                new TableCell({ children: [new Paragraph({ text: s.name })] }),
                                                new TableCell({ children: [new Paragraph({ text: s.status || '', alignment: AlignmentType.CENTER })] }),
                                                new TableCell({ children: [new Paragraph({ text: s.note || '' })] }),
                                            ]
                                        })
                                    )
                                ]
                            })
                        ] : [
                            new Paragraph({ children: [new TextRun({ text: "Trong ca trực không ghi nhận thiết bị nào có dấu hiệu bất thường. Tất cả đều hoạt động tốt.", italics: true })] }),
                        ]),

                        // --- SECTION 4: SỰ CỐ ---
                        new Paragraph({ text: "4. SỰ CỐ ĐỘT XUẤT TRONG CA", heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }),
                        ...(todaysIncidents.length > 0 ? todaysIncidents.map((i, idx) => (
                            new Paragraph({ children: [new TextRun({ text: `${idx + 1}. ${i.title} (${i.systemName})\n   - Trạng thái: ${i.status === 'RESOLVED' ? 'Đã xử lý xong' : 'Đang tiếp tục theo dõi'}\n   - Nội dung/Phương pháp: ${i.status === 'RESOLVED' ? (i.resolutionNote || i.description) : i.description}` })], spacing: { after: 100 } })
                        )) : [new Paragraph({ children: [new TextRun({ text: "Không có sự cố đột xuất xảy ra trong ca trực.", italics: true })] })]),

                        // --- SECTION 5: BẢO TRÌ ---
                        new Paragraph({ text: "5. CÔNG TÁC BẢO TRÌ / BẢO DƯỠNG", heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                        ...(todaysTasks.length > 0 ? todaysTasks.map((t, idx) => (
                            new Paragraph({ children: [new TextRun({ text: `${idx + 1}. [${t.type === 'PROJECT' ? 'Dự án/Thi công' : 'Bảo dưỡng'}] ${t.title}\n   - Trạng thái: ${t.status === 'COMPLETED' ? 'Đã hoàn thành' : 'Đang tiến hành'}\n   - Kết quả: ${t.completedNote || t.description}\n   - Tồn tại (nếu có): ${t.remainingIssues || 'Không'}` })], spacing: { after: 100 } })
                        )) : [new Paragraph({ children: [new TextRun({ text: "Không có lịch bảo dưỡng/thi công diễn ra trong ngày.", italics: true })] })]),

                        // --- SECTION 6: ĐỀ XUẤT ---
                        new Paragraph({ text: "6. KIẾN NGHỊ & YÊU CẦU VẬT TƯ", heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                        new Paragraph({ text: materialRequest, spacing: { after: 400 } }),

                        // --- SIGNATURES ---
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE } },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Người Lập Báo Cáo", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 33, type: WidthType.PERCENTAGE } }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Đội Trưởng", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 33, type: WidthType.PERCENTAGE } }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Phê Duyệt", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 34, type: WidthType.PERCENTAGE } }),
                                    ]
                                }),
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ text: "\n\n\n(Ký và ghi rõ họ tên)", alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ children: [new Paragraph({ text: `\n\n\n${user?.name || ''}`, alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ children: [new Paragraph({ text: "\n\n\n(Ký và ghi rõ họ tên)", alignment: AlignmentType.CENTER })] }),
                                    ]
                                })
                            ]
                        })
                    ],
                }],
            });

            // Generate and save
            Packer.toBlob(doc).then((blob) => {
                saveAs(blob, `BaoCao_DoiCoKhiDienTu_${formattedDateString.replace(/\//g, '')}.docx`);
                setIsGenerating(false);
            });
        } catch (error) {
            console.error("Error generating docx:", error);
            alert("Có lỗi xảy ra khi tạo file Word!");
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900 pb-20">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/')} className="p-2 sm:p-3 bg-white rounded-xl shadow border border-slate-200 hover:bg-slate-100 transition active:scale-95">
                            <ArrowLeft size={20} className="text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black uppercase text-blue-900 flex items-center gap-2 tracking-tight">
                                <FileText className="text-blue-600" /> Xuất Báo Cáo Định Kỳ
                            </h1>
                            <p className="text-slate-500 text-sm font-medium">Biên dịch báo cáo kỹ thuật ra file Word (.docx)</p>
                        </div>
                    </div>
                    <button
                        onClick={generateDocx}
                        disabled={isGenerating}
                        className={clsx(
                            "py-3 px-6 text-white font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2",
                            isGenerating ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl active:scale-95"
                        )}
                    >
                        {isGenerating ? (
                            <span className="animate-pulse">Đang định dạng...</span>
                        ) : (
                            <><Download size={20} /> XUẤT THÀNH FILE WORD</>
                        )}
                    </button>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Form Settings */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white p-5 lg:p-6 rounded-2xl shadow-xl border border-slate-200/60 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/50 rounded-full blur-3xl -mr-10 -mt-10"></div>

                            <h2 className="font-black text-slate-800 mb-5 pb-3 border-b border-slate-100 flex items-center gap-2 relative z-10 text-lg">
                                <Settings size={20} className="text-blue-600" /> Cấu hình Nội dung
                            </h2>
                            <div className="space-y-5 relative z-10">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1"><Calendar size={14} />Ngày báo cáo</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            className="w-full border border-slate-300 rounded-xl p-3 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm font-bold text-slate-800 bg-slate-50/50"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1"><Activity size={14} />Ca trực</label>
                                    <select
                                        className="w-full border border-slate-300 rounded-xl p-3 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm font-bold text-slate-800 bg-slate-50/50"
                                        value={shift}
                                        onChange={(e) => setShift(e.target.value)}
                                    >
                                        <option value="Hành chính">Hành chính (08h00 - 17h00)</option>
                                        <option value="Ca ngày">Ca ngày (07h00 - 19h00)</option>
                                        <option value="Ca đêm">Ca đêm (19h00 - 07h00)</option>
                                        <option value="Khác">Ca tùy chọn</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1"><ShieldCheck size={14} />Nhận xét chung / Đánh giá</label>
                                    <textarea
                                        className="w-full border border-slate-300 rounded-xl p-3 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm text-slate-700"
                                        rows={4}
                                        value={generalEvaluation}
                                        onChange={(e) => setGeneralEvaluation(e.target.value)}
                                        placeholder="Nhập nhận xét tổng quan..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1"><AlertTriangle size={14} />Kiến nghị / Yêu cầu Vật tư</label>
                                    <textarea
                                        className="w-full border border-slate-300 rounded-xl p-3 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm text-slate-700"
                                        rows={4}
                                        value={materialRequest}
                                        onChange={(e) => setMaterialRequest(e.target.value)}
                                        placeholder="Nhập kiến nghị nếu có..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Data Preview */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-2xl border border-blue-100 shadow-sm flex items-start gap-4">
                            <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md rotate-3 hover:rotate-0 transition-transform"><Activity size={24} /></div>
                            <div>
                                <h3 className="font-black text-blue-900 text-lg tracking-tight">Xem trước Dữ liệu Báo cáo (Ngày {formattedDateString})</h3>
                                <p className="text-sm text-blue-800/80 font-medium">Bản Preview này liệt kê các dữ liệu gốc sẽ được Robot biên dịch và điền thẳng vào form báo cáo Word.</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <span className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide text-sm"><CheckSquare size={16} className="text-blue-500" /> Tình trạng Hệ thống (Hôm nay)</span>
                                <span className="text-xs font-bold text-slate-500 bg-slate-200/50 px-2 py-1 rounded">Tổng cộng: {totalSystems} mục</span>
                            </div>
                            <div className="p-5 grid grid-cols-3 gap-3 sm:gap-6 text-center">
                                <div className="bg-gradient-to-b from-green-50 to-white rounded-xl p-4 border border-green-100 shadow-sm transition hover:shadow-md">
                                    <div className="text-3xl sm:text-4xl font-black text-green-600">{okSystems}</div>
                                    <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-green-800/80 mt-2">Bình thường</div>
                                </div>
                                <div className="bg-gradient-to-b from-red-50 to-white rounded-xl p-4 border border-red-100 shadow-sm transition hover:shadow-md">
                                    <div className="text-3xl sm:text-4xl font-black text-red-600">{nokSystems}</div>
                                    <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-red-800/80 mt-2">Lỗi / Hư hỏng</div>
                                </div>
                                <div className="bg-gradient-to-b from-slate-50 to-white rounded-xl p-4 border border-slate-200 shadow-sm transition hover:shadow-md">
                                    <div className="text-3xl sm:text-4xl font-black text-slate-600">{naSystems}</div>
                                    <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 mt-2">Chưa kiểm tra / NA</div>
                                </div>
                            </div>

                            {nokItemsList.length > 0 && (
                                <div className="px-5 pb-5">
                                    <div className="bg-red-50/50 border border-red-100 rounded-xl p-4">
                                        <p className="text-[11px] font-black uppercase text-red-500 tracking-wider mb-3 flex items-center gap-1.5">
                                            <AlertTriangle size={14} /> Danh sách lỗi sẽ được in chi tiết vào Bảng
                                        </p>
                                        <ul className="text-sm space-y-2">
                                            {nokItemsList.map(s => (
                                                <li key={s.id} className="flex gap-2 bg-white/60 p-2 rounded border border-red-50">
                                                    <span className="text-red-600 font-bold whitespace-nowrap">{s.name}:</span>
                                                    <span className="text-slate-700 font-medium italic">{s.note || 'Không có ghi chú'}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden relative group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-100/50 rounded-full blur-2xl -mr-6 -mt-6 transition group-hover:scale-150"></div>
                                <div className="p-4 border-b border-slate-100 bg-slate-50 font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide text-sm relative z-10">
                                    <List size={16} className="text-purple-500" /> Sự cố đột xuất
                                </div>
                                <div className="p-6 text-center relative z-10">
                                    <div className="text-5xl font-black text-slate-800">{todaysIncidents.length}</div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">vụ việc được ghi nhận</div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden relative group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-100/50 rounded-full blur-2xl -mr-6 -mt-6 transition group-hover:scale-150"></div>
                                <div className="p-4 border-b border-slate-100 bg-slate-50 font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide text-sm relative z-10">
                                    <Wrench size={16} className="text-cyan-600" /> Lịch bảo trì / thi công
                                </div>
                                <div className="p-6 text-center relative z-10">
                                    <div className="text-5xl font-black text-slate-800">{todaysTasks.length}</div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">nhiệm vụ liên quan</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-5 flex items-center gap-4">
                            <div className="p-3 bg-slate-100 text-slate-600 rounded-xl shadow-inner"><User size={24} /></div>
                            <div>
                                <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">DANH SÁCH NHÂN SỰ XUẤT HIỆN TRÊN BÁO CÁO</div>
                                <div className="text-base font-bold text-slate-800">{teamMembersList}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ExportReportPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium animate-pulse">Đang tải cấu hình báo cáo...</div>}>
            <ExportReportContent />
        </Suspense>
    );
}
