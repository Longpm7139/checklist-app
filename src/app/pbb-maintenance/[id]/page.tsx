'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, CheckCircle, AlertCircle, Calendar, Clock, User, FileText, PenTool, ClipboardCheck, Info, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { subscribeToPbbReports, savePbbReport, deletePbbReport, getUsers } from '@/lib/firebase';
import { PBB_CHECKLIST_SECTIONS, PbbSectionDef, PbbTaskDef } from '@/lib/pbb-data';
import { useUser } from '@/providers/UserProvider';
import { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  BorderStyle, AlignmentType, WidthType, VerticalAlign 
} from 'docx';
import { saveAs } from 'file-saver';
import clsx from 'clsx';

const MAINT_LEVELS = ['1T', '3T', '6T', '12T'] as const;
type MaintLevel = typeof MAINT_LEVELS[number];

export default function PbbMaintenanceFormPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;
    const isNew = id === 'new';
    const { user } = useUser();
    
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [staffs, setStaffs] = useState<any[]>([]);

    // Form Stats
    const [maintLevel, setMaintLevel] = useState<MaintLevel>('1T');
    const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [time, setTime] = useState(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    const [inspectorName, setInspectorName] = useState(user?.name || '');
    const [systemId, setSystemId] = useState(''); // Registration No / Cửa bến
    const [workOrderNo, setWorkOrderNo] = useState('');
    const [operatingHours, setOperatingHours] = useState('');
    const [responses, setResponses] = useState<Record<string, { status?: 'OK' | 'NOK', value?: string }>>({});
    const [notes, setNotes] = useState('');
    const [expandedSections, setExpandedSections] = useState<string[]>(['1']);

    // Results (Nghiệm thu)
    const [results, setResults] = useState({
        partsReplaced: { status: 'ĐẠT', note: '' },
        oilGrease: { status: 'ĐẠT', note: '' },
        electricMotor: { status: 'ĐẠT', note: '' },
        electricSystem: { status: 'ĐẠT', note: '' },
        hydraulicSystem: { status: 'ĐẠT', note: '' },
        acSystem: { status: 'ĐẠT', note: '' },
        pbbTunnel: { status: 'ĐẠT', note: '' },
        overall: 'ĐẠT'
    });

    useEffect(() => {
        getUsers().then(setStaffs);
    }, []);

    useEffect(() => {
        if (!isNew && id) {
            const unsub = subscribeToPbbReports((data: any[]) => {
                const report = data.find(r => r.id === id);
                if (report) {
                    setMaintLevel(report.type || '1T');
                    setDate(report.date || '');
                    setTime(report.time || '');
                    setInspectorName(report.inspectorName || '');
                    setSystemId(report.systemId || '');
                    setWorkOrderNo(report.workOrderNo || '');
                    setOperatingHours(report.operatingHours || '');
                    setResponses(report.responses || {});
                    setNotes(report.notes || '');
                    setResults(report.results || {
                        partsReplaced: { status: 'ĐẠT', note: '' },
                        oilGrease: { status: 'ĐẠT', note: '' },
                        electricMotor: { status: 'ĐẠT', note: '' },
                        electricSystem: { status: 'ĐẠT', note: '' },
                        hydraulicSystem: { status: 'ĐẠT', note: '' },
                        acSystem: { status: 'ĐẠT', note: '' },
                        pbbTunnel: { status: 'ĐẠT', note: '' },
                        overall: 'ĐẠT'
                    });
                }
                setLoading(false);
            });
            return () => unsub();
        }
    }, [id, isNew]);

    const handleToggleStatus = (taskId: string, currentReq: string) => {
        if (!currentReq) return; // Not required for this level
        
        const current = responses[taskId]?.status;
        let next: 'OK' | 'NOK' | undefined = undefined;
        
        if (!current) next = 'OK';
        else if (current === 'OK') next = 'NOK';
        else next = undefined;

        setResponses(prev => ({
            ...prev,
            [taskId]: { ...prev[taskId], status: next }
        }));
    };

    const handleValueChange = (taskId: string, val: string) => {
        setResponses(prev => ({
            ...prev,
            [taskId]: { ...prev[taskId], value: val }
        }));
    };

    const toggleSection = (sectionNo: string) => {
        setExpandedSections(prev => 
            prev.includes(sectionNo) 
                ? prev.filter(s => s !== sectionNo) 
                : [...prev, sectionNo]
        );
    };

    const validateForm = () => {
        const missing: { section: string, task: string }[] = [];
        
        PBB_CHECKLIST_SECTIONS.forEach(section => {
            section.tasks.forEach(task => {
                const levelIdx = MAINT_LEVELS.indexOf(maintLevel);
                const req = task.reqs[levelIdx];
                
                if (req) {
                    const taskId = `${section.no}_${task.no}_${maintLevel}`;
                    const resp = responses[taskId];
                    if (req === 'M' && !resp?.value) {
                        missing.push({ section: section.name, task: task.name });
                    } else if (req !== 'M' && !resp?.status) {
                        missing.push({ section: section.name, task: task.name });
                    }
                }

                task.subTasks?.forEach(sub => {
                    const subReq = sub.reqs[levelIdx];
                    if (subReq) {
                        const subId = `${section.no}_${task.no}_${sub.no}_${maintLevel}`;
                        const subResp = responses[subId];
                        if (subReq === 'M' && !subResp?.value) {
                            missing.push({ section: section.name, task: sub.name });
                        } else if (subReq !== 'M' && !subResp?.status) {
                            missing.push({ section: section.name, task: sub.name });
                        }
                    }
                });
            });
        });

        return missing;
    };

    const handleSave = async () => {
        if (!isNew && user?.role !== 'ADMIN') {
            alert('Chỉ Admin mới có quyền chỉnh sửa phiếu đã lưu!');
            return;
        }

        if (!systemId) {
            alert('Vui lòng nhập Số đăng ký/Cửa bến!');
            return;
        }

        const missing = validateForm();
        if (missing.length > 0) {
            const confirmSave = window.confirm(
                `CẢNH BÁO: Còn ${missing.length} hạng mục chưa hoàn thành!\n\n` +
                `Hạng mục tiêu biểu: ${missing[0].task}\n\n` +
                `Bạn có chắc chắn muốn lưu phiếu khi chưa hoàn thành tất cả không?`
            );
            if (!confirmSave) return;
        }

        setSaving(true);
        try {
            const reportData = {
                id: isNew ? `PBB_${Date.now()}` : id,
                type: maintLevel,
                date,
                time,
                inspectorName,
                systemId,
                workOrderNo,
                operatingHours,
                responses,
                notes,
                results,
                createdAt: isNew ? new Date().toISOString() : undefined,
                updatedAt: new Date().toISOString()
            };

            await savePbbReport(reportData);
            alert('Đã lưu thành công!');
            if (isNew) router.push('/pbb-maintenance');
        } catch (error) {
            console.error(error);
            alert('Lỗi khi lưu dữ liệu!');
        } finally {
            setSaving(false);
        }
    };

    const generateDocx = async () => {
        setExporting(true);
        try {
            const doc = new Document({
                sections: [{
                    properties: {
                        page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } }
                    },
                    children: [
                        // HEADER TABLE
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            width: { size: 25, type: WidthType.PERCENTAGE },
                                            children: [
                                                new Paragraph({ children: [new TextRun({ text: "ACV", bold: true, size: 32 })], alignment: AlignmentType.CENTER }),
                                                new Paragraph({ children: [new TextRun({ text: "TỔNG CÔNG TY CẢNG\nHÀNG KHÔNG VIỆT NAM - CTCP", bold: true, size: 14 })], alignment: AlignmentType.CENTER }),
                                                new Paragraph({ children: [new TextRun({ text: "AIRPORTS CORPORATION OF VIETNAM", size: 10 })], alignment: AlignmentType.CENTER }),
                                            ],
                                            verticalAlign: VerticalAlign.CENTER
                                        }),
                                        new TableCell({
                                            width: { size: 50, type: WidthType.PERCENTAGE },
                                            children: [
                                                new Paragraph({ children: [new TextRun({ text: "QUY TRÌNH\nBẢO DƯỠNG VÀ SỬA CHỮA TTBMB", bold: true, size: 18 })], alignment: AlignmentType.CENTER }),
                                                new Paragraph({ children: [new TextRun({ text: "PROCEDURE OF GSE MAINTENANCE AND REPAIR", italics: true, size: 14 })], alignment: AlignmentType.CENTER }),
                                            ],
                                            verticalAlign: VerticalAlign.CENTER
                                        }),
                                        new TableCell({
                                            width: { size: 25, type: WidthType.PERCENTAGE },
                                            children: [
                                                new Paragraph({ children: [new TextRun({ text: "Ký hiệu: QT01/ACV-KTCN-TB", size: 12 })] }),
                                                new Paragraph({ children: [new TextRun({ text: "Code: QT01/ACV-KTCN-TB", size: 12 })] }),
                                                new Paragraph({ children: [new TextRun({ text: "Lần ban hành/sửa đổi: 02/00", size: 12 })] }),
                                                new Paragraph({ children: [new TextRun({ text: "Ngày hiệu lực: 01/4/2026", size: 12 })] }),
                                                new Paragraph({ children: [new TextRun({ text: "Trang/tổng số trang: 1/x", size: 12 })] }),
                                            ],
                                            verticalAlign: VerticalAlign.CENTER
                                        })
                                    ]
                                })
                            ]
                        }),

                        new Paragraph({ text: "", spacing: { after: 200 } }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Biểu mẫu/Form: B06.53.QT01/KTCN-TB", bold: true, size: 20, underline: {} }),
                            ],
                            alignment: AlignmentType.CENTER
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "PHIẾU CÔNG TÁC BẢO DƯỠNG", bold: true, size: 24 }),
                            ],
                            alignment: AlignmentType.CENTER
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "MAINTENANCE CHECKLIST", bold: true, size: 20, italics: true }),
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 300 }
                        }),

                        // 1. EQUIPMENT
                        new Paragraph({ children: [new TextRun({ text: "1. TRANG THIẾT BỊ BẢO DƯỠNG/ EQUIPMENT:", bold: true })] }),
                        new Paragraph({ children: [new TextRun({ text: "1.1. Chủng loại / Type: CẦU DẪN HÀNH KHÁCH JBT / JBT AEROTECH PASSENGER BOARDING BRIDGE", bold: true })], indent: { left: 360 } }),
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE } },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `1.2. Số đăng ký / Registration No.: ${systemId}` })], indent: { left: 360 } })] }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Thời gian HĐ / Operating time: ${operatingHours}` })] })] }),
                                    ]
                                }),
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `1.3. Phiếu công tác bảo dưỡng số / Checklist no: ${workOrderNo}` })], indent: { left: 360 } })] }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Ngày/ date: ${date}` })] })] }),
                                    ]
                                }),
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `1.4. Cấp bảo dưỡng TTB / Maintenance level: ${maintLevel}` })], indent: { left: 360 } })], columnSpan: 2 }),
                                    ]
                                })
                            ]
                        }),
                        new Paragraph({ text: "", spacing: { after: 200 } }),

                        // 2. CHECKED BY
                        new Paragraph({ children: [new TextRun({ text: "2. NGƯỜI THỰC HIỆN / CHECKED BY:", bold: true })] }),
                        new Paragraph({ children: [new TextRun({ text: `2.1. ${inspectorName} ..................................... Ngày nhận công việc / date: ${date}` })], indent: { left: 360 } }),
                        new Paragraph({ children: [new TextRun({ text: "2.2. ............................................................. Ngày nhận công việc / date: ................." })], indent: { left: 360 } }),
                        new Paragraph({ text: "", spacing: { after: 200 } }),

                        // 3. ATTACHED
                        new Paragraph({ children: [new TextRun({ text: "3. NỘI DUNG BẢO DƯỠNG (ĐÍNH KÈM) / MAINTENANCE TASKS (ATTACHED)", bold: true })] }),
                        new Paragraph({ text: "", spacing: { after: 200 } }),

                        // 4. ARISING PROBLEMS
                        new Paragraph({ children: [new TextRun({ text: "4. PHÁT SINH KHÁC / ARISING PROBLEM:", bold: true })] }),
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "No", bold: true })], alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Nội dung phát sinh / Arising content", bold: true })], alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Ghi chú / Remark", bold: true })], alignment: AlignmentType.CENTER })] }),
                                    ]
                                }),
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ text: "1" })] }),
                                        new TableCell({ children: [new Paragraph({ text: notes || "..." })] }),
                                        new TableCell({ children: [new Paragraph({ text: "" })] }),
                                    ]
                                }),
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ text: "2" })] }),
                                        new TableCell({ children: [new Paragraph({ text: "" })] }),
                                        new TableCell({ children: [new Paragraph({ text: "" })] }),
                                    ]
                                })
                            ]
                        }),
                        new Paragraph({ text: "", spacing: { after: 300 } }),

                        // 5. CHECK AND TAKE OVER
                        new Paragraph({ children: [new TextRun({ text: "5. NGHIỆM THU / CHECK AND TAKE OVER", bold: true })] }),
                        new Paragraph({ children: [new TextRun({ text: "5.1  Người thực hiện / checked by (ký/signature):" }), new TextRun({ text: " ............................................................................" })], indent: { left: 360 } }),
                        new Paragraph({ text: "", spacing: { after: 200 } }),
                        
                        new Paragraph({ children: [new TextRun({ text: "5.2. Xác nhận của đơn vị sử dụng / Approved by used unit" })], indent: { left: 360 } }),
                        new Table({
                            width: { size: 90, type: WidthType.PERCENTAGE },
                            alignment: AlignmentType.CENTER,
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "STT", bold: true })], alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nội dung/ Content", bold: true })], alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Đạt/ OK", bold: true })], alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "K.Đạt/ Not good", bold: true })], alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Ghi chú/ Note", bold: true })], alignment: AlignmentType.CENTER })] }),
                                    ]
                                }),
                                ...[
                                    { stt: '1', name: 'Các hạng mục vật tư thay thế...', data: results.partsReplaced },
                                    { stt: '2', name: 'Dầu mỡ / oil and grease', data: results.oilGrease },
                                    { stt: '3', name: 'Tình trạng kỹ thuật các hệ thống của TTB', data: { status: '', note: '' } },
                                    { stt: '', name: '  o Động cơ điện / electric motor', data: results.electricMotor },
                                    { stt: '', name: '  o Hệ thống điện / electric system', data: results.electricSystem },
                                    { stt: '', name: '  o Hệ thống thủy lực/ Hydraulic system', data: results.hydraulicSystem },
                                    { stt: '', name: '  o Hệ thống lạnh/ air conditioner system', data: results.acSystem },
                                    { stt: '', name: '  o Khung sườn /PBB tunnel', data: results.pbbTunnel },
                                ].map(item => new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ text: item.stt, alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ children: [new Paragraph({ text: item.name })] }),
                                        new TableCell({ children: [new Paragraph({ text: item.data.status === 'ĐẠT' ? "X" : "", alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ children: [new Paragraph({ text: item.data.status === 'K.ĐẠT' ? "X" : "", alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ children: [new Paragraph({ text: item.data.note })] }),
                                    ]
                                })),
                                new TableRow({
                                    children: [
                                        new TableCell({ 
                                            columnSpan: 5, 
                                            children: [
                                                new Paragraph({ 
                                                    children: [
                                                        new TextRun({ text: "Kết luận:   - Đạt YCKT, đưa TTB vào khai thác   ", bold: true }),
                                                        new TextRun({ text: results.overall === 'ĐẠT' ? "[X]" : "[ ]" }),
                                                        new TextRun({ text: "      - Không đạt       ", bold: true }),
                                                        new TextRun({ text: results.overall === 'KHÔNG ĐẠT' ? "[X]" : "[ ]" }),
                                                    ]
                                                })
                                            ] 
                                        }),
                                    ]
                                })
                            ]
                        }),

                        new Paragraph({ text: "", spacing: { after: 300 } }),
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE } },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "PHÒNG/ĐỘI PVMB-KT/ GHS-TECH. DIVISION/TEAM", bold: true, size: 12 })], alignment: AlignmentType.CENTER }), new Paragraph({ children: [new TextRun({ text: "(ký tên/ signature)", italics: true, size: 10 })], alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Ngày/ Date: ${date}`, size: 12 })], alignment: AlignmentType.CENTER }), new Paragraph({ children: [new TextRun({ text: "ĐỘI/TỔ VHTTBMĐ/GSE OP. TEAM", bold: true, size: 12 })], alignment: AlignmentType.CENTER }), new Paragraph({ children: [new TextRun({ text: "(ký tên/ signature)", italics: true, size: 10 })], alignment: AlignmentType.CENTER })] }),
                                    ]
                                })
                            ]
                        }),

                        // PAGE BREAK
                        new Paragraph({ children: [new TextRun({ text: "" })], pageBreakBefore: true }),

                        // Checklist Table Header
                        new Paragraph({ children: [new TextRun({ text: `CHI TIẾT KIỂM TRA BẢO DƯỠNG ${maintLevel}`, bold: true, size: 24 })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),

                        // Existing Tasks Table logic (re-using the logic from the previous version)
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Stt", bold: true })], alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ width: { size: 55, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Hạng mục bảo dưỡng", bold: true })], alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "1T", bold: true })], alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "3T", bold: true })], alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "6T", bold: true })], alignment: AlignmentType.CENTER })] }),
                                        new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "12T", bold: true })], alignment: AlignmentType.CENTER })] }),
                                    ]
                                }),
                                ...PBB_CHECKLIST_SECTIONS.flatMap(section => [
                                    new TableRow({
                                        children: [
                                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: section.no, bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: "F2F2F2" } }),
                                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: section.name.toUpperCase(), bold: true })] })], columnSpan: 5, shading: { fill: "F2F2F2" } }),
                                        ]
                                    }),
                                    ...section.tasks.flatMap(task => [
                                        new TableRow({
                                            children: [
                                                new TableCell({ children: [new Paragraph({ text: task.no, alignment: AlignmentType.CENTER })] }),
                                                new TableCell({ children: [new Paragraph({ text: task.name })] }),
                                                ...MAINT_LEVELS.map((level, idx) => {
                                                    const req = task.reqs[idx];
                                                    const resp = responses[`${section.no}_${task.no}_${level}`];
                                                    let text = req || "";
                                                    if (resp?.status === 'OK') text = `✔️ (${req})`;
                                                    if (resp?.status === 'NOK') text = `! (${req})`;
                                                    if (resp?.value) text = resp.value;

                                                    return new TableCell({ children: [new Paragraph({ text, alignment: AlignmentType.CENTER })] });
                                                })
                                            ]
                                        }),
                                        ...(task.subTasks || []).map(sub => (
                                            new TableRow({
                                                children: [
                                                    new TableCell({ children: [new Paragraph({ text: sub.no, alignment: AlignmentType.CENTER })] }),
                                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `    - ${sub.name}`, italics: true })] })] }),
                                                    ...MAINT_LEVELS.map((level, idx) => {
                                                        const req = sub.reqs[idx];
                                                        const resp = responses[`${section.no}_${task.no}_${sub.no}_${level}`];
                                                        let text = req || "";
                                                        if (resp?.status === 'OK') text = `✔️ (${req})`;
                                                        if (resp?.status === 'NOK') text = `! (${req})`;
                                                        if (resp?.value) text = resp.value;

                                                        return new TableCell({ children: [new Paragraph({ text, alignment: AlignmentType.CENTER })] });
                                                    })
                                                ]
                                            })
                                        ))
                                    ])
                                ])
                            ]
                        })
                    ]
                }]
            });

            const blob = await Packer.toBlob(doc);
            saveAs(blob, `PhieuBaoDuong_PBB_${systemId}_${date.replace(/-/g,'')}.docx`);
        } catch (e) {
            console.error(e);
            alert("Lỗi khi tạo file word!");
        } finally {
            setExporting(false);
        }
    };

    if (loading) return <div className="p-20 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest">Đang tải dữ liệu...</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-2 md:p-8 font-sans text-slate-900 pb-32">
            <div className="max-w-6xl mx-auto">
                {/* Header Section */}
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/pbb-maintenance')} className="p-2 bg-white rounded-xl shadow border border-slate-200 hover:bg-slate-100 transition">
                            <ArrowLeft size={20} className="text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-xl font-black uppercase text-slate-800 flex items-center gap-2 tracking-tight">
                                <PenTool className="text-sky-600" /> {isNew ? 'Lập Phiếu Bảo Dưỡng PBB' : 'Chi Tiết Bảo Dưỡng PBB'}
                            </h1>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Biểu mẫu: B06.53.QT01/KTCN-TB</p>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Form Area */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Info Card */}
                        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
                            <div className="p-4 bg-slate-50 border-b border-slate-200 font-black text-slate-600 text-xs tracking-wider flex items-center gap-2">
                                <Info size={16} className="text-sky-600" /> THÔNG TIN CHUNG
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">Cấp bảo dưỡng định kỳ</label>
                                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                                        {MAINT_LEVELS.map(level => (
                                            <button
                                                key={level}
                                                onClick={() => setMaintLevel(level)}
                                                className={clsx(
                                                    "flex-1 py-3 rounded-lg font-black text-sm transition-all",
                                                    maintLevel === level ? "bg-sky-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                                                )}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">Số đăng ký / Cửa bến</label>
                                    <input 
                                        value={systemId} onChange={e => setSystemId(e.target.value)} 
                                        className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-4 focus:ring-sky-500/10 transition-all font-black text-slate-800"
                                        placeholder="VD: Cầu 21..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">Thời gian HĐ (Giờ)</label>
                                    <input 
                                        value={operatingHours} onChange={e => setOperatingHours(e.target.value)} 
                                        className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-4 focus:ring-sky-500/10 transition-all font-bold"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">Phiếu công tác số</label>
                                    <input 
                                        value={workOrderNo} onChange={e => setWorkOrderNo(e.target.value)} 
                                        className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-4 focus:ring-sky-500/10 transition-all"
                                        placeholder="WO-..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">Ngày thực hiện</label>
                                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 font-bold" />
                                </div>
                            </div>
                        </div>

                        {/* Checklist Sections */}
                        <div className="space-y-4">
                            {PBB_CHECKLIST_SECTIONS.map((section) => {
                                const idx = MAINT_LEVELS.indexOf(maintLevel);
                                let totalReq = 0;
                                let doneReq = 0;

                                section.tasks.forEach(t => {
                                    const req = t.reqs[idx];
                                    if (req) {
                                        totalReq++;
                                        const taskId = `${section.no}_${t.no}_${maintLevel}`;
                                        if (req === 'M') {
                                            if (responses[taskId]?.value) doneReq++;
                                        } else {
                                            if (responses[taskId]?.status) doneReq++;
                                        }
                                    }
                                    t.subTasks?.forEach(s => {
                                        const subReq = s.reqs[idx];
                                        if (subReq) {
                                            totalReq++;
                                            const subId = `${section.no}_${t.no}_${s.no}_${maintLevel}`;
                                            if (subReq === 'M') {
                                                if (responses[subId]?.value) doneReq++;
                                            } else {
                                                if (responses[subId]?.status) doneReq++;
                                            }
                                        }
                                    });
                                });

                                const isSectionComplete = totalReq > 0 && doneReq === totalReq;

                                return (
                                    <div key={section.no} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                                        <div 
                                            className={clsx(
                                                "px-5 py-3 font-black text-xs flex items-center justify-between tracking-widest cursor-pointer transition-colors",
                                                isSectionComplete ? "bg-green-600 text-white" : "bg-slate-800 text-white hover:bg-slate-700"
                                            )}
                                            onClick={() => toggleSection(section.no)}
                                        >
                                            <div className="flex items-center gap-3">
                                                {expandedSections.includes(section.no) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                <span className="uppercase">{section.no}. {section.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={clsx(
                                                    "px-2 py-0.5 rounded text-[10px] transition-all",
                                                    isSectionComplete ? "bg-white/20 text-white" : "bg-sky-500/20 text-sky-400"
                                                )}>
                                                    {doneReq}/{totalReq} hạng mục
                                                </span>
                                            </div>
                                        </div>
                                    {expandedSections.includes(section.no) && (
                                        <div className="overflow-x-auto">
                                        <table className="w-full border-collapse text-[11px]">
                                            <thead>
                                                <tr className="bg-slate-50 text-slate-400 font-black border-b border-slate-100 uppercase tracking-tighter">
                                                    <th className="p-3 border-r w-10 text-center">#</th>
                                                    <th className="p-3 border-r min-w-[280px] text-left">Nội dung</th>
                                                    {MAINT_LEVELS.map(level => (
                                                        <th 
                                                            key={level} 
                                                            className={clsx(
                                                                "p-3 border-r w-14 text-center transition-all",
                                                                maintLevel === level ? "bg-sky-50 text-sky-600" : ""
                                                            )}
                                                        >
                                                            {level}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {section.tasks.map((task) => (
                                                    <React.Fragment key={task.no}>
                                                        <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                                            <td className="p-3 border-r text-center font-black text-slate-300 group-hover:text-sky-400 transition-colors">{task.no}</td>
                                                            <td className="p-3 border-r font-bold text-slate-700 leading-snug">{task.name}</td>
                                                            {MAINT_LEVELS.map((level, idx) => {
                                                                const reqChar = task.reqs[idx];
                                                                const taskId = `${section.no}_${task.no}_${level}`;
                                                                const isCurrent = maintLevel === level;
                                                                const resp = responses[taskId];

                                                                return (
                                                                    <td 
                                                                        key={level} 
                                                                        className={clsx(
                                                                            "p-1.5 border-r text-center",
                                                                            isCurrent ? "bg-sky-50/40" : "bg-slate-100/10"
                                                                        )}
                                                                    >
                                                                        {reqChar ? (
                                                                            reqChar === 'M' ? (
                                                                                <input 
                                                                                    value={resp?.value || ''} 
                                                                                    onChange={(e) => handleValueChange(taskId, e.target.value)}
                                                                                    placeholder="M"
                                                                                    className={clsx(
                                                                                        "w-full p-2 text-center font-black rounded-lg border-2 transition-all outline-none",
                                                                                        resp?.value ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-100 bg-slate-50 text-slate-400 focus:border-sky-200"
                                                                                    )}
                                                                                />
                                                                            ) : (
                                                                                <button
                                                                                    onClick={() => handleToggleStatus(taskId, reqChar)}
                                                                                    className={clsx(
                                                                                        "w-9 h-9 rounded-xl border-2 font-black transition-all flex items-center justify-center mx-auto text-[10px]",
                                                                                        !resp?.status && "bg-white border-slate-100 text-slate-200 hover:border-sky-200",
                                                                                        resp?.status === 'OK' && "bg-green-500 border-green-600 text-white shadow-lg shadow-green-500/20 scale-110",
                                                                                        resp?.status === 'NOK' && "bg-red-500 border-red-600 text-white shadow-lg shadow-red-500/20 scale-110"
                                                                                    )}
                                                                                >
                                                                                    {resp?.status === 'OK' ? '✔️' : (resp?.status === 'NOK' ? '!' : reqChar)}
                                                                                </button>
                                                                            )
                                                                        ) : <span className="text-slate-100">---</span>}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                        {task.subTasks?.map(sub => (
                                                            <tr key={sub.no} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group bg-slate-50/30">
                                                                <td className="p-3 border-r text-center text-slate-200 italic font-bold">{sub.no}</td>
                                                                <td className="p-3 border-r text-slate-500 pl-8 italic font-medium">{sub.name}</td>
                                                                {MAINT_LEVELS.map((level, idx) => {
                                                                    const reqChar = sub.reqs[idx];
                                                                    const taskId = `${section.no}_${task.no}_${sub.no}_${level}`;
                                                                    const isCurrent = maintLevel === level;
                                                                    const resp = responses[taskId];

                                                                    return (
                                                                        <td 
                                                                            key={level} 
                                                                            className={clsx(
                                                                                "p-1.5 border-r text-center",
                                                                                isCurrent ? "bg-sky-50/40" : "bg-slate-100/10"
                                                                            )}
                                                                        >
                                                                            {reqChar ? (
                                                                                reqChar === 'M' ? (
                                                                                    <input 
                                                                                        value={resp?.value || ''} 
                                                                                        onChange={(e) => handleValueChange(taskId, e.target.value)}
                                                                                        placeholder="M"
                                                                                        className={clsx(
                                                                                            "w-full p-1.5 text-center font-black rounded-lg border transition-all outline-none text-[10px]",
                                                                                            resp?.value ? "border-sky-300 bg-sky-50 text-sky-700" : "border-slate-100 bg-slate-50 text-slate-300 focus:border-sky-200"
                                                                                        )}
                                                                                    />
                                                                                ) : (
                                                                                    <button
                                                                                        onClick={() => handleToggleStatus(taskId, reqChar)}
                                                                                        className={clsx(
                                                                                            "w-8 h-8 rounded-lg border font-black transition-all flex items-center justify-center mx-auto text-[9px]",
                                                                                            !resp?.status && "bg-white border-slate-100 text-slate-200 hover:border-sky-200",
                                                                                            resp?.status === 'OK' && "bg-green-500 border-green-600 text-white shadow shadow-green-500/10",
                                                                                            resp?.status === 'NOK' && "bg-red-500 border-red-600 text-white shadow shadow-red-500/10"
                                                                                        )}
                                                                                    >
                                                                                        {resp?.status === 'OK' ? '✔️' : (resp?.status === 'NOK' ? '!' : reqChar)}
                                                                                    </button>
                                                                                )
                                                                            ) : <span className="text-slate-100">---</span>}
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        ))}
                                                    </React.Fragment>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sidebar Area */}
                    <div className="space-y-6">
                        {/* Legend Card */}
                        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-6">
                             <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Info size={14} className="text-sky-500" /> Giải thích ký hiệu
                             </h4>
                             <div className="space-y-3 text-xs font-bold text-slate-500">
                                <div className="flex items-center gap-3"><span className="w-4 h-4 rounded bg-green-500 border border-green-600 flex items-center justify-center text-[10px] text-white">✔️</span> Đạt tiêu chuẩn</div>
                                <div className="flex items-center gap-3"><span className="w-4 h-4 rounded bg-red-500 border border-red-600 flex items-center justify-center text-[10px] text-white">!</span> Cần xử lý gấp</div>
                                <hr className="border-slate-100" />
                                <div className="grid grid-cols-2 gap-2 text-[10px] opacity-70">
                                    <div>I: Inspect (Kiểm tra)</div>
                                    <div>L: Lubricate (Tra mỡ)</div>
                                    <div>C: Clean (Vệ sinh)</div>
                                    <div>M: Mark/Measure (Đo)</div>
                                    <div>R: Replace (Thay thế)</div>
                                </div>
                             </div>
                        </div>

                        {/* Inspector Card */}
                        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-6">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider flex items-center gap-1.5">
                                <User size={14} className="text-sky-500" /> Nhân viên thực hiện
                            </label>
                            <select 
                                value={inspectorName} 
                                onChange={e => setInspectorName(e.target.value)} 
                                className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-sky-500/10"
                            >
                                <option value="">-- Chọn nhân viên --</option>
                                {staffs.map(s => <option key={s.id} value={s.name}>{s.name} ({s.code})</option>)}
                            </select>
                        </div>

                        {/* Arising Section */}
                        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
                            <div className="p-4 bg-red-50/50 border-b border-red-100 font-black text-red-700 text-[10px] tracking-widest flex items-center gap-2 uppercase">
                                <AlertCircle size={16} /> Ghi chú phát sinh
                            </div>
                            <div className="p-4">
                                <textarea 
                                    rows={5} 
                                    value={notes} 
                                    onChange={(e) => setNotes(e.target.value)} 
                                    className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-4 focus:ring-red-500/10 font-bold text-slate-800 text-sm transition-all"
                                    placeholder="Vật tư thay thế, thông số bất thường..."
                                />
                            </div>
                        </div>

                        {/* 5.2 Xác nhận của đơn vị sử dụng */}
                        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
                            <div className="p-4 bg-green-50/50 border-b border-green-100 font-black text-green-700 text-[10px] tracking-widest flex items-center gap-2 uppercase">
                                <ClipboardCheck size={16} /> 5.2 Xác nhận của đơn vị sử dụng
                            </div>
                            <div className="p-4 space-y-4">
                                {[
                                    { key: 'partsReplaced', label: '1. Vật tư thay thế' },
                                    { key: 'oilGrease', label: '2. Dầu mỡ' },
                                    { key: 'electricMotor', label: '3.1 Động cơ điện' },
                                    { key: 'electricSystem', label: '3.2 Hệ thống điện' },
                                    { key: 'hydraulicSystem', label: '3.3 Hệ thống thủy lực' },
                                    { key: 'acSystem', label: '3.4 Hệ thống lạnh' },
                                    { key: 'pbbTunnel', label: '3.5 Khung sườn' },
                                ].map((item) => (
                                    <div key={item.key} className="space-y-2 pb-3 border-b border-slate-50 last:border-0 border-dashed">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-500 uppercase">{item.label}</span>
                                            <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
                                                {['ĐẠT', 'K.ĐẠT'].map(status => (
                                                    <button
                                                        key={status}
                                                        onClick={() => setResults(prev => ({ ...prev, [item.key]: { ...(prev as any)[item.key], status } }))}
                                                        className={clsx(
                                                            "px-2 py-1 rounded-md font-black text-[9px] transition-all",
                                                            (results as any)[item.key].status === status 
                                                                ? (status === 'ĐẠT' ? "bg-green-500 text-white" : "bg-red-500 text-white")
                                                                : "text-slate-400"
                                                        )}
                                                    >
                                                        {status}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <input 
                                            placeholder="Ghi chú (Note)"
                                            value={(results as any)[item.key].note}
                                            onChange={(e) => setResults(prev => ({ ...prev, [item.key]: { ...(prev as any)[item.key], note: e.target.value } }))}
                                            className="w-full p-2 text-[10px] border border-slate-100 rounded-lg bg-slate-50 outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/10 font-bold"
                                        />
                                    </div>
                                ))}
                                
                                <div className="pt-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">KẾT LUẬN CHUNG</label>
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        {['ĐẠT', 'KHÔNG ĐẠT'].map(status => (
                                            <button
                                                key={status}
                                                onClick={() => setResults(prev => ({ ...prev, overall: status }))}
                                                className={clsx(
                                                    "flex-1 py-3 rounded-lg font-black text-[10px] transition-all",
                                                    results.overall === status 
                                                        ? (status === 'ĐẠT' ? "bg-sky-600 text-white shadow-lg" : "bg-red-600 text-white shadow-lg")
                                                        : "text-slate-400 hover:text-slate-600"
                                                )}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Floating Bottom Action */}
                <div className="fixed bottom-6 right-6 flex items-center gap-3 z-50">
                    {!isNew && (
                        <button
                            onClick={generateDocx}
                            disabled={exporting}
                            className="p-4 bg-white text-blue-600 rounded-full shadow-2xl border-4 border-white transition-all hover:scale-110 active:scale-90 disabled:opacity-50"
                            title="Xuất file WORD"
                        >
                            <Download size={28} />
                        </button>
                    )}
                    {(isNew || user?.role === 'ADMIN') && (
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="py-4 px-10 bg-sky-600 text-white font-black rounded-full shadow-2xl shadow-sky-500/40 transition-all flex items-center gap-3 hover:bg-sky-700 hover:px-12 active:scale-95 disabled:opacity-50 border-4 border-white"
                        >
                            {saving ? (
                                <span className="animate-pulse">ĐANG LƯU...</span>
                            ) : (
                                <>
                                    <Save size={24} /> 
                                    <span className="uppercase tracking-widest text-sm">Lưu phiếu</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
            
            <style jsx global>{`
                input[type="number"]::-webkit-inner-spin-button,
                input[type="number"]::-webkit-outer-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
            `}</style>
        </div>
    );
}
