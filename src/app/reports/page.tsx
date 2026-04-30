'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
    ArrowLeft, Download, Calendar, User, Search, CheckCircle, 
    XCircle, Activity, Clock, Briefcase, AlertOctagon
} from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import { 
    subscribeToLogs, subscribeToIncidents, subscribeToMaintenance, 
    subscribeToHistory, getUsers, subscribeToDuties 
} from '@/lib/firebase';
import { isMatch, normalize } from '@/lib/utils';

// Robust date parser for multiple formats
const parseTS = (ts: string) => {
    if (!ts || typeof ts !== 'string') return null;
    const s = ts.trim();
    let d = -1, m = -1, y = -1, h = 0;
    const dateMatch = s.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/) || s.match(/(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})/);
    if (dateMatch) {
        if (dateMatch[1].length === 4) { y = Number(dateMatch[1]); m = Number(dateMatch[2]); d = Number(dateMatch[3]); }
        else { d = Number(dateMatch[1]); m = Number(dateMatch[2]); y = Number(dateMatch[3]); }
        const timeMatch = s.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) h = Number(timeMatch[1]);
        return { d, m, y, h };
    }
    return null;
};

export default function ReportsPage() {
    const router = useRouter();

    // -- State --
    const [logs, setLogs] = useState<any[]>([]);
    const [incidents, setIncidents] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [duties, setDuties] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);

    const nowD = new Date();
    const currentMonth = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}`;
    const [monthFilter, setMonthFilter] = useState(currentMonth);
    const [selectedUserCode, setSelectedUserCode] = useState('');
    
    const [diary, setDiary] = useState<any[]>([]);
    const [summary, setSummary] = useState({
        inspections: 0,
        fixes: 0,
        incidents: 0,
        maintenance: 0,
        projects: 0
    });

    const lastCalc = useRef("");

    // -- Lifecycle: Sync Data --
    useEffect(() => {
        getUsers().then(u => {
            setAllUsers(u || []);
            if (!selectedUserCode && u?.length > 0) setSelectedUserCode(u[0].code);
        });

        const unsubs = [
            subscribeToLogs(setLogs),
            subscribeToIncidents(setIncidents),
            subscribeToMaintenance(setTasks),
            subscribeToHistory(setHistory),
            subscribeToDuties(setDuties),
        ];
        return () => unsubs.forEach(u => u());
    }, []);

    // -- Processing Logic (Main Journal Engine) --
    useEffect(() => {
        if (!monthFilter || !selectedUserCode || allUsers.length === 0) return;

        const calcKey = JSON.stringify({ 
            monthFilter, selectedUserCode, 
            l: logs.length, i: incidents.length, t: tasks.length, h: history.length, d: duties.length 
        });
        if (lastCalc.current === calcKey) return;
        lastCalc.current = calcKey;

        const [y, mStr] = monthFilter.split('-');
        const targetM = parseInt(mStr);
        const targetY = parseInt(y);
        const selUser = allUsers.find(u => u.code === selectedUserCode);
        if (!selUser) return;

        // 1. Filter all activities for this user and this month
        const uLogs = logs.filter(l => {
            const p = parseTS(l.timestamp);
            return p && p.m === targetM && p.y === targetY && isMatch(l.inspectorCode, selUser.code);
        });

        const uHistory = history.filter(h => {
            const p = h.resolvedAt ? parseTS(h.resolvedAt) : null;
            return p && p.m === targetM && p.y === targetY && (isMatch(h.resolverCode, selUser.code) || isMatch(h.inspectorCode, selUser.code));
        });

        const uIncidents = incidents.filter(i => {
            const ts = i.resolvedAt || i.createdAt;
            const p = parseTS(ts);
            return p && p.m === targetM && p.y === targetY && (isMatch(i.resolvedBy, selUser.code) || (i.participants || []).some((p: string) => isMatch(p, selUser.code)));
        });

        const uTasks = tasks.filter(t => {
            const ts = t.completedAt || t.createdAt;
            const p = parseTS(ts);
            const isAssigned = (t.assignees || []).some((a: string) => isMatch(a, selUser.code) || isMatch(a, selUser.name));
            const isSupervised = (t.supervisors || []).some((s: string) => isMatch(s, selUser.code) || isMatch(s, selUser.name));
            return p && p.m === targetM && p.y === targetY && (isAssigned || isSupervised);
        });

        const uDuties = duties.filter(d => {
            const dParts = d.date.split('-');
            if (parseInt(dParts[0]) !== targetY || parseInt(dParts[1]) !== targetM) return false;
            return (d.assignments || []).some((a: any) => isMatch(a.userCode, selUser.code) || isMatch(a.userName, selUser.name));
        });

        // 2. Group by Day
        const daysInMonth = new Date(targetY, targetM, 0).getDate();
        const grouped: any[] = [];
        let totalStats = { inspections: 0, fixes: 0, incidents: 0, maintenance: 0, projects: 0 };

        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${targetY}-${String(targetM).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
            const dayActions: any[] = [];
            
            // Check Duty (Team Presence)
            const duty = uDuties.find(d => d.date === dateStr);
            if (duty) {
                const shifts = duty.assignments?.filter((a: any) => isMatch(a.userCode, selUser.code) || isMatch(a.userName, selUser.name)) || [];
                shifts.forEach((s: any) => {
                    const shiftType = normalize(s.shift || '').includes('ngay') ? 'DAY' : 'NIGHT';
                    const hasTeamLogs = logs.some(l => {
                        const p = parseTS(l.timestamp);
                        if (!p || p.d !== i || p.m !== targetM || p.y !== targetY) return false;
                        const lShift = (p.h >= 6 && p.h < 18) ? 'DAY' : 'NIGHT';
                        return lShift === shiftType;
                    });
                    dayActions.push({ 
                        type: 'DUTY', 
                        label: `Trực ca ${s.shift}`, 
                        detail: hasTeamLogs ? `Hoàn thành kiểm tra hệ thống cùng đội` : `Ca trực được phân công`,
                        time: '-',
                        status: hasTeamLogs ? 'OK' : 'PENDING'
                    });
                    if (hasTeamLogs) totalStats.inspections += 11;
                });
            }

            // Individual Logs
            uLogs.filter(l => parseTS(l.timestamp)?.d === i).forEach(l => {
                dayActions.push({ type: 'LOG', label: 'Kiểm tra', detail: l.systemName, time: l.timestamp.split(' ')[1], status: l.result });
            });

            // History (Fixes)
            uHistory.filter(h => parseTS(h.resolvedAt || h.timestamp || '')?.d === i).forEach(h => {
                const isResolver = isMatch(h.resolverCode, selUser.code);
                dayActions.push({ 
                    type: isResolver ? 'FIX' : 'FAULT', 
                    label: isResolver ? 'Khắc phục' : 'Phát hiện lỗi', 
                    detail: h.systemName, 
                    time: (h.resolvedAt || h.timestamp).split(' ')[1] || '-', 
                    status: 'OK',
                    note: h.issueContent
                });
                if (isResolver) totalStats.fixes++;
            });

            // Incidents
            uIncidents.filter(inc => parseTS(inc.resolvedAt || inc.createdAt)?.d === i).forEach(inc => {
                const isResolved = inc.status === 'RESOLVED';
                dayActions.push({ 
                    type: 'INCIDENT', 
                    label: 'Sự cố', 
                    detail: inc.systemName, 
                    time: (inc.resolvedAt || inc.createdAt).split(' ')[1] || '-', 
                    status: inc.status,
                    note: inc.description
                });
                if (isResolved) totalStats.incidents++;
            });

            // Maintenance / Projects
            uTasks.filter(t => parseTS(t.completedAt || t.createdAt)?.d === i).forEach(t => {
                const isComplete = t.status === 'COMPLETED';
                dayActions.push({ 
                    type: t.type === 'PROJECT' ? 'PROJECT' : 'MAINT', 
                    label: t.type === 'PROJECT' ? 'Dự án' : 'Bảo trì', 
                    detail: t.title, 
                    time: (t.completedAt || t.createdAt).split(' ')[1] || '-', 
                    status: t.status,
                    note: t.description
                });
                if (isComplete) {
                    if (t.type === 'PROJECT') totalStats.projects++;
                    else totalStats.maintenance++;
                }
            });

            if (dayActions.length > 0) {
                grouped.push({ day: i, date: dateStr, actions: dayActions });
            }
        }

        setDiary(grouped.sort((a,b) => b.day - a.day));
        setSummary(totalStats);

    }, [logs, incidents, tasks, history, duties, monthFilter, selectedUserCode, allUsers]);

    // -- Export --
    const handleExport = () => {
        const selUser = allUsers.find(u => u.code === selectedUserCode);
        if (!selUser) return;
        const [y, mStr] = monthFilter.split('-');

        const wb = XLSX.utils.book_new();
        const dataArr: any[][] = [
            ["BÁO CÁO CÔNG VIỆC CHI TIẾT", ""],
            ["Nhân viên:", selUser.name],
            ["Mã nhân viên:", selUser.code],
            ["Tháng báo cáo:", `${mStr}/${y}`],
            [],
            ["TỔNG HỢP HIỆU SUẤT"],
            ["Lượt kiểm tra hệ thống", summary.inspections],
            ["Số lỗi đã khắc phục", summary.fixes],
            ["Sự cố đã xử lý", summary.incidents],
            ["Số vụ bảo trì", summary.maintenance],
            ["Dự án thi công", summary.projects],
            [],
            ["CHI TIẾT NHẬT KÝ HÀNG NGÀY"],
            ["Ngày", "Hạng mục", "Chi tiết công việc", "Thời gian", "Kết quả"]
        ];

        [...diary].sort((a,b) => a.day - b.day).forEach(entry => {
            entry.actions.forEach((act: any, idx: number) => {
                dataArr.push([
                    idx === 0 ? `Ngày ${entry.day}` : "",
                    act.label,
                    act.detail + (act.note ? ` (${act.note})` : ""),
                    act.time,
                    act.status
                ]);
            });
        });

        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dataArr), "NhatKy_CaNhan");
        XLSX.writeFile(wb, `NhatKy_${selUser.code}_${mStr}_${y}.xlsx`);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-900 pb-20 overflow-x-hidden">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/')} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 hover:bg-slate-100 transition">
                            <ArrowLeft size={24} className="text-slate-600" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black uppercase text-slate-800">Nhật Ký Công Việc Chi Tiết</h1>
                                <span className="bg-slate-200 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded">v1.0.9</span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hồ sơ hoạt động & Bằng chứng cá nhân</p>
                        </div>
                    </div>
                </header>

                {/* Filters */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Chọn nhân viên</label>
                        <select 
                            value={selectedUserCode}
                            onChange={(e) => setSelectedUserCode(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition"
                        >
                            {allUsers.map(u => (
                                <option key={u.code} value={u.code}>{u.name} ({u.code})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Chọn tháng</label>
                        <input 
                            type="month"
                            value={monthFilter}
                            onChange={(e) => setMonthFilter(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition"
                        />
                    </div>
                    <div className="flex items-end">
                        <button 
                            onClick={handleExport}
                            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2"
                        >
                            <Download size={20} /> XUẤT BÁO CÁO (XLSX)
                        </button>
                    </div>
                </div>

                {/* Monthly Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
                    <SummaryCard label="Kiểm tra" val={summary.inspections} icon={<Activity size={18} />} color="blue" />
                    <SummaryCard label="Khắc phục" val={summary.fixes} icon={<CheckCircle size={18} />} color="green" />
                    <SummaryCard label="Sự cố" val={summary.incidents} icon={<AlertOctagon size={18} />} color="red" />
                    <SummaryCard label="Bảo trì" val={summary.maintenance} icon={<Clock size={18} />} color="cyan" />
                    <SummaryCard label="Dự án" val={summary.projects} icon={<Briefcase size={18} />} color="indigo" />
                </div>

                {/* Daily Diary */}
                <div className="space-y-6">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] px-2 flex items-center gap-2">
                        <Calendar size={14} /> Dòng thời gian công việc
                    </h3>
                    
                    {diary.length > 0 ? (
                        diary.map((entry) => (
                            <div key={entry.date} className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white w-10 h-10 rounded-xl border border-slate-200 flex flex-col items-center justify-center shadow-sm">
                                            <span className="text-[10px] font-bold text-slate-400 leading-none">{monthFilter.split('-')[1]}</span>
                                            <span className="text-lg font-black text-slate-700 leading-none">{entry.day}</span>
                                        </div>
                                        <div className="text-sm font-black text-slate-800 uppercase">CÔNG VIỆC NGÀY {entry.day}</div>
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{entry.date}</div>
                                </div>
                                <div className="p-6 space-y-4">
                                    {entry.actions.map((act: any, idx: number) => (
                                        <div key={idx} className="flex gap-4">
                                            <div className="flex flex-col items-center">
                                                <div className={clsx(
                                                    "w-3 h-3 rounded-full mt-1",
                                                    act.type === 'DUTY' ? "bg-blue-500" :
                                                    act.type === 'FIX' ? "bg-green-500" :
                                                    act.type === 'INCIDENT' ? "bg-red-500" :
                                                    act.type === 'PROJECT' ? "bg-indigo-500" : "bg-cyan-500"
                                                )} />
                                                {idx !== entry.actions.length - 1 && <div className="w-0.5 h-full bg-slate-100 mt-1" />}
                                            </div>
                                            <div className="flex-1 pb-4">
                                                <div className="flex justify-between items-start mb-0.5">
                                                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{act.label}</span>
                                                    <span className="text-[10px] font-mono text-slate-400">{act.time}</span>
                                                </div>
                                                <div className="text-[13px] font-bold text-slate-600 leading-snug">{act.detail}</div>
                                                {act.note && (
                                                    <div className="mt-2 p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 italic border border-slate-100">
                                                        {act.note}
                                                    </div>
                                                )}
                                            </div>
                                            <div className={clsx(
                                                "shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                                                act.status === 'OK' || act.status === 'COMPLETED' || act.status === 'RESOLVED' ? "text-green-600 bg-green-50" :
                                                act.status === 'PENDING' || act.status === 'OPEN' ? "text-amber-600 bg-amber-50" : "text-slate-400 bg-slate-100"
                                            )}>
                                                {act.status}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white p-12 text-center rounded-[2.5rem] border border-slate-200 border-dashed">
                            <div className="flex flex-col items-center gap-4 grayscale opacity-40">
                                <Search size={48} className="text-slate-300" />
                                <p className="font-black text-slate-500 uppercase text-xs tracking-[0.2em]">Không có dữ liệu công việc trong tháng</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ label, val, icon, color }: { label: string, val: number, icon: any, color: string }) {
    const colors: any = {
        blue: "text-blue-600 bg-blue-50 border-blue-100 shadow-blue-500/5",
        green: "text-green-600 bg-green-50 border-green-100 shadow-green-500/5",
        red: "text-red-600 bg-red-50 border-red-100 shadow-red-500/5",
        cyan: "text-cyan-600 bg-cyan-50 border-cyan-100 shadow-cyan-500/5",
        indigo: "text-indigo-600 bg-indigo-50 border-indigo-100 shadow-indigo-500/5"
    };

    return (
        <div className={clsx("p-4 rounded-2xl border shadow-sm transition-all hover:scale-105", colors[color])}>
            <div className="flex items-center justify-between mb-2">
                <div className="opacity-80">{icon}</div>
                <div className="text-xl font-black">{val}</div>
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest">{label}</div>
        </div>
    );
}
