import React, { useState } from 'react';
import { FileText, Save, CheckCheck, Send, X } from 'lucide-react';
import clsx from 'clsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

export default function HandoffModal({ systems, history, incidents, assignments, shiftType, onClose }: any) {
  const [copied, setCopied] = useState(false);

  // Determine shift start for filtering "new" items
  const nowD = new Date();
  const currentHour = nowD.getHours();
  const shiftStart = new Date(nowD);
  shiftStart.setSeconds(0, 0);
  shiftStart.setMilliseconds(0);

  if (currentHour >= 7 && currentHour < 19) {
    shiftStart.setHours(7, 0, 0, 0);
  } else {
    shiftStart.setHours(19, 0, 0, 0);
    if (currentHour < 7) {
      shiftStart.setDate(shiftStart.getDate() - 1);
    }
  }

  const parseVNTime = (t: string) => {
    if (!t) return null;
    try {
      const parts = t.split(/[/, : ]+/).filter(Boolean);
      const yearIdx = parts.findIndex(p => p.length === 4);
      if (yearIdx === -1) return null;
      let day, month, year, hour, minute;
      if (yearIdx === 4) { // HH mm DD MM YYYY
        hour = parseInt(parts[0], 10); minute = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10); month = parseInt(parts[3], 10) - 1; year = parseInt(parts[4], 10);
      } else { // DD MM YYYY HH mm
        day = parseInt(parts[0], 10); month = parseInt(parts[1], 10) - 1; year = parseInt(parts[2], 10);
        hour = parseInt(parts[3], 10); minute = parseInt(parts[4], 10);
      }
      return new Date(year, month, day, hour, minute);
    } catch (e) { return null; }
  };

  // Calculate statistics for the current shift
  const checkedSystems = systems.filter((s: any) => s.status !== 'NA' && s.inspectorCode);

  const newNokItems = systems.filter((s: any) => {
    if (s.status !== 'NOK' || !s.timestamp) return false;
    const t = parseVNTime(s.timestamp);
    return t && t >= shiftStart;
  });

  const resolvedToday = history.filter((h: any) => {
    if (!h.resolvedAt) return false;
    const t = parseVNTime(h.resolvedAt);
    return t && t >= shiftStart;
  });

  const openIncidents = incidents.filter((i: any) => i.status === 'OPEN');

  const shiftDate = shiftStart.toLocaleDateString('vi-VN');
  const staffNames = assignments.map((a: any) => a.userName).join(' & ') || 'Chưa trực';

  const summaryText = `📋 [BÁO CÁO BÀN GIAO CA]
- Ca trực: ${shiftType === 'DAY' ? 'Ca Ngày' : 'Ca Đêm'}
- Ngày: ${shiftDate}
- Nhân viên: ${staffNames}
---------------------------
✅ TIẾN ĐỘ: ${checkedSystems.length}/${systems.length} hệ thống (${Math.round((checkedSystems.length / (systems.length || 1)) * 100)}%)
⚠️ LỖI PHÁT SINH MỚI: [${newNokItems.length}]
${newNokItems.map((s: any, i: number) => `   ${i + 1}. ${s.name}: ${s.note || 'Chưa có ghi chú'}`).join('\n') || '   (Không có)'}
🛠️ ĐÃ XỬ LÝ XONG: [${resolvedToday.length}]
${resolvedToday.map((h: any, i: number) => `   ${i + 1}. ${h.systemName}: ${h.actionNote || 'Đã sửa'}`).join('\n') || '   (Không có)'}
🚨 SỰ CỐ TỒN ĐỌNG: [${openIncidents.length}]
---------------------------
Chúc ca sau trực tốt!`;

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportWord = async () => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({ text: "BIÊN BẢN BÀN GIAO CA TRỰC", bold: true, size: 32, font: "Times New Roman" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Ngày báo cáo: ${shiftDate}`, bold: true, font: "Times New Roman" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Ca trực: ${shiftType === 'DAY' ? 'Ca Ngày' : 'Ca Đêm'}`, font: "Times New Roman" }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: `Nhân viên thực hiện: ${staffNames}`, font: "Times New Roman" }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({ text: "1. TIẾN ĐỘ KIỂM TRA HỆ THỐNG", bold: true, font: "Times New Roman", color: "2E75B6" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Tổng số hệ thống: ${systems.length}`, font: "Times New Roman" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Đã hoàn thành: ${checkedSystems.length}/${systems.length} (${Math.round((checkedSystems.length / (systems.length || 1)) * 100)}%)`, font: "Times New Roman" }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200 },
            children: [
              new TextRun({ text: "2. CÁC LỖI PHÁT SINH MỚI (NOK)", bold: true, font: "Times New Roman", color: "C00000" }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "STT", bold: true })] })] }),
                  new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Hệ thống", bold: true })] })] }),
                  new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Ghi chú lỗi", bold: true })] })] }),
                ]
              }),
              ...(newNokItems.length > 0
                ? newNokItems.map((s: any, i: number) => new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, text: (i + 1).toString() })] }),
                    new TableCell({ children: [new Paragraph(s.name)] }),
                    new TableCell({ children: [new Paragraph(s.note || "Chưa có ghi chú")] }),
                  ]
                }))
                : [new TableRow({
                  children: [
                    new TableCell({ columnSpan: 3, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "(Không có lỗi phát sinh mới)", italics: true })] })] }),
                  ]
                })])
            ]
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200 },
            children: [
              new TextRun({ text: "3. CÁC MỤC ĐÃ XỬ LÝ XONG (FIXED)", bold: true, font: "Times New Roman", color: "385723" }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "STT", bold: true })] })] }),
                  new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Hệ thống", bold: true })] })] }),
                  new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Nội dung sửa chữa", bold: true })] })] }),
                ]
              }),
              ...(resolvedToday.length > 0
                ? resolvedToday.map((h: any, i: number) => new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, text: (i + 1).toString() })] }),
                    new TableCell({ children: [new Paragraph(h.systemName)] }),
                    new TableCell({ children: [new Paragraph(h.actionNote || "Đã sửa")] }),
                  ]
                }))
                : [new TableRow({
                  children: [
                    new TableCell({ columnSpan: 3, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "(Trong ca trực chưa có mục nào được Fix)", italics: true })] })] }),
                  ]
                })])
            ]
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200 },
            children: [
              new TextRun({ text: "4. SỰ CỐ TỒN ĐỌNG", bold: true, font: "Times New Roman", color: "E36C09" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Số lượng sự cố đang mở: ${openIncidents.length}`, font: "Times New Roman" }),
            ],
          }),

          new Paragraph({ spacing: { before: 400 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "NHÂN VIÊN BÀN GIAO", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "NHÂN VIÊN TIẾP NHẬN", bold: true })] })] }),
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [new TextRun({ text: "(Ký và ghi rõ họ tên)", italics: true })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [new TextRun({ text: "(Ký và ghi rõ họ tên)", italics: true })] })] }),
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1000 }, text: staffNames })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1000 }, text: "..................................." })] }),
                ]
              }),
            ]
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `BaoCao_BanGiaoCa_${shiftDate.replace(/\//g, '-')}_${shiftType}.docx`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
          <h2 className="font-bold flex items-center gap-2"><FileText size={20} /> Tổng Hợp Bàn Giao Ca</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded"><X size={20} /></button>
        </div>
        <div className="p-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 group relative max-h-[55vh] overflow-y-auto w-full">
            <pre className="whitespace-pre-wrap font-mono text-xs sm:text-sm leading-relaxed text-slate-700 break-words max-w-full">
              {summaryText}
            </pre>
            <button
              onClick={handleCopy}
              className={clsx(
                "absolute top-2 right-2 p-2 rounded-lg transition-all active:scale-95 flex items-center gap-1 text-xs font-bold",
                copied ? "bg-green-500 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 shadow-sm"
              )}
            >
              {copied ? <><CheckCheck size={14} /> Đã chép</> : <><Save size={14} /> Chép Zalo</>}
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={handleCopy}
              className="w-full sm:w-auto px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <Send size={18} /> Chép Zalo
            </button>
            <button
              onClick={handleExportWord}
              className="w-full sm:flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <FileText size={18} /> Xuất File Word
            </button>
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all active:scale-95"
            >
              Đóng
            </button>
          </div>
          <p className="mt-4 text-[10px] text-slate-400 text-center italic">
            * Sau khi bấm "Sao chép", hãy mở Zalo nhóm và Dán (Ctrl+V) để gửi báo cáo.
          </p>
        </div>
      </div>
    </div>
  );
}
