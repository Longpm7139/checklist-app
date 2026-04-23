'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { 
    ArrowLeft, BarChart2, Medal, TrendingUp, UserCheck, Calendar, 
    AlertTriangle, RotateCcw, Settings, X, FileText, CheckCircle, 
    ShieldCheck, Briefcase, Activity, Clock
} from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import { useUser } from '@/providers/UserProvider';
import { isMatch, normalize, isVeryLenientMatch } from '@/lib/utils';
import { subscribeToLogs, subscribeToHistory, subscribeToIncidents, subscribeToMaintenance, getUsers, resetKPIData, subscribeToDuties, subscribeToSystems } from '@/lib/firebase';
import { SystemCheck } from '@/lib/types';

interface KPIRow {
    userId: string;
    code: string;
    name: string;
    dutyShiftCount: number;   // Số ca trực được phân công + có log
    fixCount: number;
    incidentCount: number;
    maintenanceCount: number;
    faultFoundCount: number;
    projectExecCount: number;
    projectSupCount: number;
    fastCheckCount: number;
    score: number;
}

const SCORING_RULES = {
    DUTY_SHIFT: 11,   // Điểm trực ca (mỗi ca được phân công + có log)
    FAULT_FOUND: 3,
    FIX: 4,
    INCIDENT: 5,
    MAINTENANCE: 8,
    PROJECT_EXEC: 10,
    PROJECT_SUP: 6,
    NEGLIGENCE: -10
};

const RULE_LABELS: Record<string, string> = {
    DUTY_SHIFT: 'Trực ca',
    FAULT_FOUND: 'Tìm thấy lỗi',
    FIX: 'Khắc phục',
    INCIDENT: 'Xử lý sự cố',
    MAINTENANCE: 'Bảo trì',
    PROJECT_EXEC: 'Thi công',
    PROJECT_SUP: 'Giám sát',
    NEGLIGENCE: 'Kiểm tra ẩu'
};

const parseTS = (ts: string): { d: number, m: number, y: number, h: number, min: number } | null => {
    if (!ts || typeof ts !== 'string') return null;
    const s = ts.trim();
    let d = -1, m = -1, y = -1, h = 0;
    const dateMatch = s.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/) || s.match(/(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})/);
    if (dateMatch) {
        if (dateMatch[1].length === 4) { y = Number(dateMatch[1]); m = Number(dateMatch[2]); d = Number(dateMatch[3]); }
        else { d = Number(dateMatch[1]); m = Number(dateMatch[2]); y = Number(dateMatch[3]); }
        const timeMatch = s.match(/(\d{1,2}):(\d{2})/);
        let min = 0;
        if (timeMatch) {
            h = Number(timeMatch[1]);
            min = Number(timeMatch[2]);
        }
        return { d, m, y, h, min };
    }
    return null;
};

export default function KPIPage() {
    const router = useRouter();
    const { user: currentUser } = useUser();
    const [stats, setStats] = useState<KPIRow[]>([]);
    const [totalInspectionsCount, setTotalInspectionsCount] = useState(0);
    const nowD = new Date();
    const currentYearMonth = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}`;
    const [monthFilter, setMonthFilter] = useState(currentYearMonth);
    const [selectedUser, setSelectedUser] = useState<KPIRow | null>(null);

    const [logs, setLogs] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [incidents, setIncidents] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [duties, setDuties] = useState<any[]>([]);
    const lastProcessed = useRef("");
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        getUsers().then(u => setAllUsers(u || [])).catch(e => console.error(e));
        const unsubLogs = subscribeToLogs(setLogs);
        const unsubHistory = subscribeToHistory(setHistory);
        const unsubIncidents = subscribeToIncidents(setIncidents);
        const unsubMaintenance = subscribeToMaintenance(setTasks);
        const unsubDuties = subscribeToDuties(setDuties);
        const unsubSystems = subscribeToSystems((_s) => {}); // Placeholder

        return () => { unsubLogs(); unsubHistory(); unsubIncidents(); unsubMaintenance(); unsubDuties(); unsubSystems(); };
    }, []);

    useEffect(() => {
        if (!monthFilter || allUsers.length === 0) return;

        const calculateStats = () => {
            // v1.1.5: Trigger recalculation on any data change (including names/duties)
            const dataState = JSON.stringify({ 
                monthFilter, 
                u: allUsers.map(x => x.code).join(','), 
                l: logs.length, 
                d: duties.length,
                i: incidents.length,
                t: tasks.length,
                h: history.length
            });
            if (lastProcessed.current === dataState) return;
            lastProcessed.current = dataState;

            try {
                const [fY, fM] = monthFilter.split('-');
                const targetM = Number(fM), targetY = Number(fY);

                // v1.2.0: Reset point: 2026-03-29 17:00:00 (Start of Night Shift)
                const RESET_TIME = new Date(2026, 2, 29, 17, 0, 0).getTime();
                
                const fLogs = logs.filter(l => { 
                    const p = parseTS(l.timestamp); 
                    if (!p) return false;
                    const logTime = new Date(p.y, p.m - 1, p.d, p.h, p.min).getTime();
                    return logTime >= RESET_TIME && p.m === targetM && p.y === targetY; 
                });
                
                const fHis = history.filter(h => {
                    if (!h.resolvedAt) return false;
                    const p = parseTS(h.resolvedAt);
                    if (!p) return false;
                    const time = new Date(p.y, p.m - 1, p.d, p.h, p.min).getTime();
                    return time >= RESET_TIME && p.m === targetM && p.y === targetY;
                });
                
                const fInc = incidents.filter(i => {
                    if (!i.resolvedAt) return false;
                    const p = parseTS(i.resolvedAt);
                    if (!p) return false;
                    const time = new Date(p.y, p.m - 1, p.d, p.h, p.min).getTime();
                    return time >= RESET_TIME && p.m === targetM && p.y === targetY;
                });
                
                const fTasks = tasks.filter(t => {
                    if (!t.completedAt) return false;
                    const p = parseTS(t.completedAt);
                    if (!p) return false;
                    const time = new Date(p.y, p.m - 1, p.d, p.h, p.min).getTime();
                    return time >= RESET_TIME && p.m === targetM && p.y === targetY;
                });
                
                const fDuties = duties.filter(d => { 
                    const p = d.date.split('-'); 
                    const dutyDate = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 23, 59, 59).getTime(); // End of day for safety
                    return dutyDate >= RESET_TIME && Number(p[1]) === targetM && Number(p[0]) === targetY; 
                });

                const logsByD: any = {};
                fLogs.forEach(l => {
                    const p = parseTS(l.timestamp);
                    if (!p) return;
                    
                    // Logic: Logs between 00:00 and 07:00 (H < 7) belong to the PREVIOUS day's NIGHT shift
                    const isEarlyMorning = p.h < 7;
                    const shift = (p.h >= 7 && p.h < 19) ? 'DAY' : 'NIGHT';
                    
                    let targetD = p.d, targetM = p.m, targetY = p.y;
                    if (isEarlyMorning && shift === 'NIGHT') {
                        const prevDate = new Date(p.y, p.m - 1, p.d - 1);
                        targetD = prevDate.getDate();
                        targetM = prevDate.getMonth() + 1;
                        targetY = prevDate.getFullYear();
                    }

                    const k = `${targetY}-${String(targetM).padStart(2, '0')}-${String(targetD).padStart(2, '0')}_${shift}`;
                    if (!logsByD[k]) logsByD[k] = [];
                    logsByD[k].push(l);
                });

                const usersMap = allUsers.reduce((acc, curr) => ({ ...acc, [curr.code]: curr }), {});

                const statsData = allUsers.map(u => {
                    // v2.0: Phương án A – Phải được phân công + ca có ít nhất 1 log
                    // Mỗi ca (ngày_ca) mà user được assign VÀ ca đó có log → +11pt
                    let dutyShiftCount = 0;

                    fDuties.forEach(dDuty => {
                        const dS = dDuty.date; // YYYY-MM-DD
                        (['DAY', 'NIGHT'] as const).forEach(st => {
                            // 1. Tìm tất cả assignments trong ca này
                            const shiftAssignments = dDuty.assignments?.filter((a: any) => {
                                const aS = normalize(a.shift || '');
                                if (st === 'DAY') return aS.includes('ngay') || aS === 'day';
                                return aS.includes('dem') || aS === 'night';
                            }) || [];

                            // 2. Kiểm tra user có được phân công trong ca này không
                            const isUserAssigned = shiftAssignments.some((a: any) =>
                                isVeryLenientMatch(a.userCode, u.code) || isVeryLenientMatch(a.userName, u.name)
                            );

                            if (!isUserAssigned) return;

                            // 3. Resolve toàn bộ crew của ca này
                            const resolvedCrew = shiftAssignments.map((a: any) => {
                                const found = allUsers.find(au => isVeryLenientMatch(au.code, a.userCode));
                                return found || { code: a.userCode, name: a.userName || '' };
                            });

                            // 4. Xác định khung giờ của ca
                            const [y, m, d] = dS.split('-').map(Number);
                            const shiftStart = new Date(y, m - 1, d);
                            const shiftEnd = new Date(y, m - 1, d);
                            if (st === 'DAY') {
                                shiftStart.setHours(5, 0, 0, 0);   // 05:00 (buffer)
                                shiftEnd.setHours(20, 0, 0, 0);    // 20:00 (buffer)
                            } else {
                                shiftStart.setHours(17, 0, 0, 0);  // 17:00 (buffer)
                                shiftEnd.setDate(shiftEnd.getDate() + 1);
                                shiftEnd.setHours(9, 0, 0, 0);     // 09:00 hôm sau (buffer)
                            }

                            // 5. Kiểm tra xem ca này có ít nhất 1 log từ bất kỳ thành viên nào không
                            const shiftHasAnyLog = fLogs.some(l => {
                                // Bao gồm cả chính user và đồng nghiệp trong ca
                                const isLogByCrew = resolvedCrew.some((member: any) =>
                                    isVeryLenientMatch(l.inspectorCode, member.code) ||
                                    isVeryLenientMatch(l.inspectorName, member.name)
                                );
                                if (!isLogByCrew) return false;

                                const p = parseTS(l.timestamp);
                                if (!p) return false;
                                const logTime = new Date(p.y, p.m - 1, p.d, p.h, p.min);
                                return logTime >= shiftStart && logTime <= shiftEnd;
                            });

                            // 6. Nếu ca có log → user được 11 điểm trực ca
                            if (shiftHasAnyLog) {
                                dutyShiftCount += 1;
                            }
                        });
                    });

                    const uIn = dutyShiftCount * SCORING_RULES.DUTY_SHIFT; // 11pt mỗi ca

                    // FIX v2: Mỗi hệ thống NOK chỉ tính cho người phát hiện ĐẦU TIÊN
                    // Khi người khác bấm "Lưu", hệ thống ghi log NOK dưới tên người Lưu
                    // → phải lọc theo người có log NOK SỚM NHẤT cho mỗi hệ thống
                    const nokLogs = fLogs
                        .filter(l => l.result === 'NOK' && l.systemId && l.timestamp)
                        .sort((a, b) => {
                            const pa = parseTS(a.timestamp);
                            const pb = parseTS(b.timestamp);
                            if (!pa || !pb) return 0;
                            return new Date(pa.y, pa.m - 1, pa.d, pa.h, pa.min).getTime()
                                - new Date(pb.y, pb.m - 1, pb.d, pb.h, pb.min).getTime();
                        });
                    // Map systemId → người phát hiện đầu tiên
                    const firstNokReporter = new Map<string, string>();
                    nokLogs.forEach(l => {
                        if (!firstNokReporter.has(l.systemId)) {
                            firstNokReporter.set(l.systemId, l.inspectorCode || '');
                        }
                    });
                    // Chỉ đếm các hệ thống mà user là người phát hiện đầu tiên
                    const faultFoundCount = Array.from(firstNokReporter.entries())
                        .filter(([_, code]) => isMatch(code, u.code))
                        .length;

                    // FIX: Đếm số lần sửa lỗi duy nhất từ history (unique doc id)
                    const fixCount = fHis.filter(h => isMatch(h.resolverCode, u.code) || isMatch(h.resolverName, u.name)).length;

                    // FIX: incidents lưu resolvedBy và participants là TÊN (không phải CODE)
                    // Phải match cả theo tên VÀ mã để đảm bảo tính điểm đúng
                    const incidentCount = fInc.filter(i =>
                        isMatch(i.resolvedBy, u.name) || isMatch(i.resolvedBy, u.code) ||
                        (i.participants || []).some((p: string) => isMatch(p, u.name) || isMatch(p, u.code))
                    ).length;
                    // FIX: Chỉ tính điểm khi công việc đã HOÀN THÀNH (COMPLETED)
                    // - Bảo trì/bảo dưỡng: assignees được lưu theo CODE
                    // - Giám sát: supervisors cũng lưu theo CODE
                    const maintCount = fTasks.filter(t =>
                        t.type !== 'PROJECT' &&
                        t.status === 'COMPLETED' &&
                        (t.assignees || []).some((a: string) => isMatch(a, u.name) || isMatch(a, u.code))
                    ).length;
                    const pExecCount = fTasks.filter(t =>
                        t.type === 'PROJECT' &&
                        t.status === 'COMPLETED' &&
                        (t.assignees || []).some((a: string) => isMatch(a, u.name) || isMatch(a, u.code))
                    ).length;
                    // Giám sát áp dụng cho CẢ hai loại (bảo trì lẫn thi công), chỉ tHẠNH (+6đ)
                    const pSupCount = fTasks.filter(t =>
                        t.status === 'COMPLETED' &&
                        (t.supervisors || []).some((s: string) => isMatch(s, u.name) || isMatch(s, u.code))
                    ).length;
                    // FIX: Đếm số ca làm ẩu duy nhất (unique systemId)
                    const fastCheckSystemIds = new Set(
                        fLogs
                            .filter(l => l.isFastCheck && isMatch(l.inspectorCode, u.code))
                            .map(l => l.systemId)
                    );
                    const negligenceCount = fastCheckSystemIds.size;

                    const score = uIn
                        + (fixCount * SCORING_RULES.FIX)
                        + (faultFoundCount * SCORING_RULES.FAULT_FOUND)
                        + (incidentCount * SCORING_RULES.INCIDENT)
                        + (maintCount * SCORING_RULES.MAINTENANCE)
                        + (pExecCount * SCORING_RULES.PROJECT_EXEC)
                        + (pSupCount * SCORING_RULES.PROJECT_SUP)
                        + (negligenceCount * SCORING_RULES.NEGLIGENCE);

                    return {
                        userId: u.id, code: u.code, name: u.name,
                        dutyShiftCount, fixCount, incidentCount, maintenanceCount: maintCount,
                        faultFoundCount, projectExecCount: pExecCount, projectSupCount: pSupCount,
                        fastCheckCount: negligenceCount, score
                    };
                }).sort((a, b) => b.score - a.score);

                setStats(statsData);
                // Tổng hệ thống kiểm tra = số ca có log × 11 hệ thống cha
                const completedShifts = Object.keys(logsByD).length;
                setTotalInspectionsCount(completedShifts * 11);
            } catch (err) {
                console.error("KPI Calc Error", err);
            }
        };

        calculateStats();
    }, [logs, history, incidents, tasks, allUsers, monthFilter, duties]);

    const handleExport = () => {
        const wb = XLSX.utils.book_new();
        const dataArr: any[][] = [
            ["BẢNG ĐÁNH GIÁ KPI", monthFilter],
            [],
            ["Hạng", "Mã NV", "Họ Tên", "Số ca trực", "Điểm trực ca", "Tìm lỗi", "Sửa lỗi", "Sự cố", "Bảo trì", "Thi công", "Giám sát", "Điểm"]
        ];
        stats.forEach((s, i) => {
            dataArr.push([i + 1, s.code, s.name, s.dutyShiftCount, s.dutyShiftCount * SCORING_RULES.DUTY_SHIFT, s.faultFoundCount, s.fixCount, s.incidentCount, s.maintenanceCount, s.projectExecCount, s.projectSupCount, s.score]);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dataArr), "KPI");
        XLSX.writeFile(wb, `KPI_${monthFilter}.xlsx`);
    };

    const handleReset = async () => {
        if (confirm("Cảnh báo: Thao tác này sẽ xóa sạch dữ liệu quá khứ. Bạn có chắc chắn?")) {
            await resetKPIData();
            window.location.reload();
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-900 pb-20">
            <div className="max-w-6xl mx-auto">
                <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/')} className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm hover:bg-slate-50 transition">
                            <ArrowLeft size={24} className="text-slate-600" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 mb-1">Bảng Đánh Giá KPI</h1>
                                <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">v1.2.0</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                                <Activity size={14} className="text-blue-500" /> Hệ thống tính điểm Real-time
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm flex items-center">
                            <Calendar size={18} className="ml-3 text-slate-400" />
                            <input
                                type="month"
                                value={monthFilter}
                                onChange={(e) => setMonthFilter(e.target.value)}
                                className="bg-transparent border-none outline-none px-3 py-2 font-black text-slate-700"
                            />
                            <button 
                                onClick={() => {
                                    lastProcessed.current = "";
                                    alert("Đã làm mới dữ liệu!");
                                }} 
                                className="p-2 ml-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100"
                                title="Làm mới dữ liệu (Sync)"
                            >
                                <RotateCcw size={16} />
                            </button>
                        </div>
                        <button onClick={handleExport} className="bg-green-600 hover:bg-green-700 text-white font-black px-6 py-3 rounded-2xl shadow-xl shadow-green-500/20 transition flex items-center gap-2">
                            <FileText size={20} /> <span className="hidden sm:inline">Xuất Excel</span>
                        </button>
                        <button onClick={() => setShowSettings(!showSettings)} className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm hover:rotate-90 transition-transform duration-500">
                            <Settings size={24} className="text-slate-400" />
                        </button>
                    </div>
                </header>

                {showSettings && (
                    <div className="mb-8 p-6 bg-red-50 border border-red-100 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-300">
                        <h3 className="text-red-800 font-black uppercase text-sm mb-4 flex items-center gap-2">
                            <AlertTriangle size={18} /> Khu vực quản trị (Nguy hiểm)
                        </h3>
                        <button onClick={handleReset} className="bg-red-600 hover:bg-red-700 text-white font-black px-6 py-3 rounded-2xl transition flex items-center gap-2 shadow-lg shadow-red-500/20">
                            <RotateCcw size={20} /> Reset toàn bộ dữ liệu Logs & History
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700"><CheckCircle size={120} /></div>
                        <div className="text-blue-100 font-bold uppercase text-xs tracking-widest mb-2">Tổng lượt kiểm tra</div>
                        <div className="text-5xl font-black mb-2">{totalInspectionsCount}</div>
                        <div className="text-blue-200 text-xs font-bold mb-1">({totalInspectionsCount / 11} ca × 11 hệ thống)</div>
                        <div className="text-blue-200/80 text-[10px] font-medium uppercase tracking-tighter">Mỗi ca kiểm tra 11 hệ thống cha</div>
                    </div>
                    
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="text-slate-400 font-bold uppercase text-xs tracking-widest mb-2">Nhân viên tích cực</div>
                        <div className="text-4xl font-black text-slate-900 mb-2">{stats[0]?.name || '-'}</div>
                        <div className="flex items-center gap-2 text-amber-500 font-black">
                            <Medal size={20} /> Quán quân hiện tại
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                        <div className="text-slate-400 font-bold uppercase text-xs tracking-widest mb-6">Cơ cấu tính điểm</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                            {Object.entries(SCORING_RULES).filter(([key]) => key !== 'NEGLIGENCE').map(([key, val]) => (
                                <div key={key} className="flex justify-between items-center py-1 border-b border-slate-50">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase">{RULE_LABELS[key]}</span>
                                    <span className="text-sm font-black text-blue-600">{val > 0 ? `+${val}` : val}</span>
                                </div>
                            ))}
                            <div className="col-span-2 pt-1 border-t border-slate-100">
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-[11px] font-bold text-red-400 uppercase">Làm ẩu</span>
                                    <span className="text-sm font-black text-red-500">{SCORING_RULES.NEGLIGENCE}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full">
                    {/* MOBILE CARD VIEW */}
                    <div className="md:hidden space-y-4 pb-12">
                        {stats.map((row, idx) => (
                            <div 
                                key={row.userId} 
                                onClick={() => {
                                    setSelectedUser(row);
                                }} 
                                className={clsx("bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition active:scale-[0.98] cursor-pointer", idx === 0 ? "ring-2 ring-amber-400 border-transparent" : "")}
                            >
                                <div className="p-5 flex items-center justify-between border-b border-slate-50 bg-slate-50/50">
                                    <div className="flex items-center gap-4">
                                        <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center font-black text-white shadow-lg", idx === 0 ? "bg-amber-400 rotate-12" : idx === 1 ? "bg-slate-400" : idx === 2 ? "bg-amber-700" : "bg-slate-200 text-slate-500 shadow-none")}>{idx + 1}</div>
                                        <div>
                                            <div className="font-black text-slate-900">{row.name}</div>
                                            <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{row.code}</div>
                                        </div>
                                    </div>
                                    <div className="text-2xl font-black text-slate-900">{row.score}</div>
                                </div>
                                <div className="p-5 grid grid-cols-4 gap-2">
                                    <div className="flex flex-col items-center p-2 bg-blue-50 rounded-xl">
                                        <div className="text-[9px] font-black text-blue-400 uppercase">Trực ca</div>
                                        <div className="text-sm font-black text-blue-700 text-center">{row.dutyShiftCount}</div>
                                        <div className="text-[8px] text-blue-400">+{row.dutyShiftCount * SCORING_RULES.DUTY_SHIFT}đ</div>
                                    </div>
                                    <div className="flex flex-col items-center p-2 bg-amber-50 rounded-xl">
                                        <div className="text-[9px] font-black text-amber-400 uppercase">Lỗi</div>
                                        <div className="text-sm font-black text-amber-700 text-center">{row.faultFoundCount || 0}</div>
                                    </div>
                                    <div className="flex flex-col items-center p-2 bg-green-50 rounded-xl">
                                        <div className="text-[9px] font-black text-green-400 uppercase">Sửa</div>
                                        <div className="text-sm font-black text-green-700 text-center">{row.fixCount || 0}</div>
                                    </div>
                                    <div className="flex flex-col items-center p-2 bg-red-50 rounded-xl">
                                        <div className="text-[9px] font-black text-red-500 uppercase">Sự cố</div>
                                        <div className="text-sm font-black text-red-600 text-center">{row.incidentCount || 0}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* DESKTOP TABLE VIEW */}
                    <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden mb-12">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100 text-center">
                                    <th className="p-4 w-16">Hạng</th>
                                    <th className="p-4 text-left">Nhân viên</th>
                                    <th className="p-4 text-center text-blue-600">Số ca trực<br/><span className="text-[9px] font-normal opacity-70">(×11đ mỗi ca)</span></th>
                                    <th className="p-4 text-center text-amber-600">Tìm lỗi</th>
                                    <th className="p-4 text-center text-green-600">Khắc phục</th>
                                    <th className="p-4 text-center text-red-600">Sự cố</th>
                                    <th className="p-4 text-center text-cyan-600">Bảo trì</th>
                                    <th className="p-4 text-center text-indigo-600">Thi công</th>
                                    <th className="p-4 text-center text-purple-600">Giám sát</th>
                                    <th className="p-4 text-center text-slate-400">Làm ẩu</th>
                                    <th className="p-4 text-right pr-6">Tổng điểm</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {stats.map((row, idx) => (
                                    <tr 
                                        key={row.userId} 
                                        onClick={() => {
                                            console.log("Selected User:", row.name);
                                            setSelectedUser(row);
                                        }} 
                                        className={clsx("hover:bg-slate-50/80 transition group cursor-pointer", idx === 0 ? "bg-amber-50/30" : "")}
                                    >
                                        <td className="p-4 text-center"><div className={clsx("w-9 h-9 rounded-full flex items-center justify-center font-black mx-auto shadow-sm", idx === 0 ? "bg-amber-400 text-white" : idx === 1 ? "bg-slate-300 text-white" : idx === 2 ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-400")}>{idx + 1}</div></td>
                                        <td className="p-4 font-black text-slate-800 text-sm whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span>{row.name}</span>
                                                {idx < 3 && <Medal size={14} className={idx === 0 ? "text-amber-400" : idx === 1 ? "text-slate-400" : "text-amber-700"} />}
                                            </div>
                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{row.code}</div>
                                        </td>
                                        <td className="p-4 text-center font-black text-blue-600">
                                            <div>{row.dutyShiftCount} ca</div>
                                            <div className="text-xs text-blue-400 font-bold">+{row.dutyShiftCount * SCORING_RULES.DUTY_SHIFT}đ</div>
                                        </td>
                                        <td className="p-4 text-center font-black text-amber-600">{row.faultFoundCount || '-'}</td>
                                        <td className="p-4 text-center font-black text-green-600">{row.fixCount || '-'}</td>
                                        <td className="p-4 text-center font-black text-red-600">{row.incidentCount || '-'}</td>
                                        <td className="p-4 text-center font-black text-cyan-600">{row.maintenanceCount || '-'}</td>
                                        <td className="p-4 text-center font-black text-indigo-600">{row.projectExecCount || '-'}</td>
                                        <td className="p-4 text-center font-black text-purple-600">{row.projectSupCount || '-'}</td>
                                        <td className="p-4 text-center font-black text-slate-400 text-xs">{row.fastCheckCount || '-'}</td>
                                        <td className="p-4 text-right pr-6 font-black text-slate-900 text-xl group-hover:text-blue-700 transition-colors">{row.score}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* STAFF PORTFOLIO MODAL */}
            {selectedUser && (
                <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 transition-all duration-300" onClick={() => setSelectedUser(null)}>
                    <div className="bg-white w-full max-w-4xl max-h-[95vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/20 transition-all transform scale-100" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="p-6 bg-slate-800 text-white flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg shadow-blue-500/20">{selectedUser.name.charAt(0)}</div>
                                <div>
                                    <h3 className="text-xl font-black">{selectedUser.name}</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">{selectedUser.code} • THÁNG {monthFilter.split('-')[1]}/{monthFilter.split('-')[0]}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedUser(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition text-white">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto scrollbar-hide">
                            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50">
                                <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="text-[10px] text-slate-400 uppercase font-black mb-1">Xếp hạng</div>
                                    <div className="text-2xl font-black text-amber-500">#{stats.findIndex(s => s.userId === selectedUser.userId) + 1}</div>
                                </div>
                                <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="text-[10px] text-slate-400 uppercase font-black mb-1">Tổng điểm KPI</div>
                                    <div className="text-2xl font-black text-blue-700">{selectedUser.score || 0}</div>
                                </div>
                                <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="text-[10px] text-slate-400 uppercase font-black mb-1">Số ca trực</div>
                                    <div className="text-2xl font-black text-blue-700">{selectedUser.dutyShiftCount || 0} ca</div>
                                    <div className="text-xs text-blue-400 font-bold mt-1">+{(selectedUser.dutyShiftCount || 0) * SCORING_RULES.DUTY_SHIFT}đ</div>
                                </div>
                                <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="text-[10px] text-slate-400 uppercase font-black mb-1">Công việc khác</div>
                                    <div className="text-2xl font-black text-green-600">{(selectedUser.fixCount || 0) + (selectedUser.maintenanceCount || 0) + (selectedUser.incidentCount || 0) + (selectedUser.projectExecCount || 0) + (selectedUser.projectSupCount || 0)}</div>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                <div>
                                    <h4 className="text-xs font-black uppercase text-slate-500 tracking-[0.2em] mb-4 flex items-center gap-2">
                                        <Activity size={14} /> Minh chứng công việc (Bằng chứng điểm số)
                                    </h4>
                                    <div className="space-y-3">
                                        {(() => {
                                            const [y, m] = monthFilter.split('-');
                                            const targetM = Number(m), targetY = Number(y);
                                            
                                            // v2.0: Phương án A – Phải được phân công + ca có log
                                            const teamDuties: any[] = [];
                                            duties.filter(d => {
                                                const p = d.date.split('-');
                                                return Number(p[1]) === targetM && Number(p[0]) === targetY;
                                            }).forEach(dDuty => {
                                                (['DAY', 'NIGHT'] as const).forEach(st => {
                                                    // Kiểm tra user có được assign trong ca này không
                                                    const userAssignment = dDuty.assignments?.filter((a: any) => {
                                                        const aS = normalize(a.shift || '');
                                                        const isCorrectShift = st === 'DAY'
                                                            ? (aS.includes('ngay') || aS === 'day')
                                                            : (aS.includes('dem') || aS === 'night');
                                                        if (!isCorrectShift) return false;
                                                        return isMatch(a.userCode, selectedUser.code) || isMatch(a.userName, selectedUser.name);
                                                    }) || [];
                                                    if (userAssignment.length === 0) return;

                                                    // Lấy toàn bộ crew của ca này
                                                    const allCrewInShift = dDuty.assignments?.filter((a: any) => {
                                                        const aS = normalize(a.shift || '');
                                                        return st === 'DAY'
                                                            ? (aS.includes('ngay') || aS === 'day')
                                                            : (aS.includes('dem') || aS === 'night');
                                                    }) || [];

                                                    // Xác định khung giờ ca
                                                    const [y, mm, dd] = dDuty.date.split('-').map(Number);
                                                    const shiftStart = new Date(y, mm - 1, dd);
                                                    const shiftEnd = new Date(y, mm - 1, dd);
                                                    if (st === 'DAY') {
                                                        shiftStart.setHours(5, 0, 0, 0);
                                                        shiftEnd.setHours(20, 0, 0, 0);
                                                    } else {
                                                        shiftStart.setHours(17, 0, 0, 0);
                                                        shiftEnd.setDate(shiftEnd.getDate() + 1);
                                                        shiftEnd.setHours(9, 0, 0, 0);
                                                    }

                                                    // Kiểm tra ca có ít nhất 1 log từ crew
                                                    const shiftHasLog = logs.some(l => {
                                                        const isCrewLog = allCrewInShift.some((a: any) =>
                                                            isMatch(l.inspectorCode, a.userCode) || isMatch(l.inspectorName, a.userName)
                                                        );
                                                        if (!isCrewLog) return false;
                                                        const p = parseTS(l.timestamp);
                                                        if (!p) return false;
                                                        const logTime = new Date(p.y, p.m - 1, p.d, p.h, p.min);
                                                        return logTime >= shiftStart && logTime <= shiftEnd;
                                                    });

                                                    if (shiftHasLog) {
                                                        const [yy, mo, dy] = dDuty.date.split('-');
                                                        teamDuties.push({
                                                            t: `${dy}/${mo}/${yy} 00:00`,
                                                            type: 'Trực ca',
                                                            detail: `Trực ca ${st === 'DAY' ? 'Ngày (07:00–19:00)' : 'Đêm (19:00–07:00)'} – Được phân công`,
                                                            pts: '+11',
                                                            color: 'blue'
                                                        });
                                                    }
                                                });
                                            });

                                            // 3. Other actions
                                            const uHistory = history.filter(h => h.resolvedAt && h.resolvedAt.includes(`/${m}/`) && (isMatch(h.resolverCode, selectedUser.code) || isMatch(h.inspectorCode, selectedUser.code)));
                                            const uIncidents = incidents.filter(i => i.resolvedAt?.includes(`/${m}/`) && (isMatch(i.resolvedBy, selectedUser.code) || (i.participants || []).some((p: string) => isMatch(p, selectedUser.code))));
                                            const uTasks = tasks.filter(t => t.completedAt?.includes(`/${m}/`) && (t.assignees || []).some((a: string) => isMatch(a, selectedUser.code)));

                                            const allActions = [
                                                ...teamDuties,
                                                ...uHistory.map(h => ({ t: h.resolvedAt || h.timestamp, type: isMatch(h.resolverCode, selectedUser.code) ? 'Sửa lỗi' : 'Báo lỗi', detail: h.systemName, pts: isMatch(h.resolverCode, selectedUser.code) ? '+4' : '+3', color: isMatch(h.resolverCode, selectedUser.code) ? 'green' : 'amber' })),
                                                ...uIncidents.map(i => ({ t: i.resolvedAt || i.createdAt, type: 'Sự cố', detail: i.systemName, pts: '+5', color: 'red' })),
                                                ...uTasks.map(t => ({ t: t.completedAt || t.createdAt, type: t.type === 'PROJECT' ? 'Dự án' : 'Bảo trì', detail: t.title, pts: t.type === 'PROJECT' ? '+10' : '+8', color: t.type === 'PROJECT' ? 'indigo' : 'cyan' }))
                                            ].sort((a,b) => b.t.localeCompare(a.t));

                                            if (allActions.length === 0) return <div className="p-8 text-center text-slate-400 italic">Không có dữ liệu trong tháng</div>;
                                            return allActions.map((act, i) => (
                                                <div key={i} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition hover:border-blue-200">
                                                    <div className={clsx("w-2 h-2 rounded-full", act.color === 'blue' ? "bg-blue-500" : act.color === 'green' ? "bg-green-500" : act.color === 'amber' ? "bg-amber-500" : act.color === 'red' ? "bg-red-500" : "bg-indigo-500")} />
                                                    <div className="font-mono text-[10px] text-slate-400 w-24 whitespace-nowrap">{act.t.split(' ')[0]}</div>
                                                    <div className="flex-1">
                                                        <div className="text-xs font-black text-slate-800">{act.type}</div>
                                                        <div className="text-[11px] text-slate-500 truncate max-w-[150px] sm:max-w-md">{act.detail}</div>
                                                    </div>
                                                    <div className="font-black text-slate-700 shrink-0">{act.pts}</div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                            <button 
                                onClick={() => {
                                    const [y, m] = monthFilter.split('-');
                                    const uLogs = logs.filter(l => l.timestamp.includes(`/${m}/`) && isMatch(l.inspectorCode, selectedUser.code));
                                    const uHistory = history.filter(h => h.resolvedAt && h.resolvedAt.includes(`/${m}/`) && (isMatch(h.resolverCode, selectedUser.code) || isMatch(h.inspectorCode, selectedUser.code)));
                                    const uIncidents = incidents.filter(i => i.resolvedAt?.includes(`/${m}/`) && (isMatch(i.resolvedBy, selectedUser.code) || (i.participants || []).some((p: string) => isMatch(p, selectedUser.code))));
                                    const uTasks = tasks.filter(t => t.completedAt?.includes(`/${m}/`) && (t.assignees || []).some((a: string) => isMatch(a, selectedUser.code)));
                                    
                                    const dataExp: any[][] = [
                                        ["BÁO CÁO CÁ NHÂN", selectedUser.name],
                                        ["Mã Nhân Viên", selectedUser.code],
                                        ["Tháng", `${m}/${y}`],
                                        ["Tổng Điểm", selectedUser.score],
                                        [],
                                        ["Thời gian", "Hạng mục", "Chi tiết", "Điểm"]
                                    ];
                                    const reportRows = [
                                        ...uLogs.map(l => [l.timestamp, "Kiểm tra", l.systemName, "1"]),
                                        ...uHistory.map(h => [h.resolvedAt || h.timestamp, isMatch(h.resolverCode, selectedUser.code) ? "Sửa lỗi" : "Báo lỗi", h.systemName, isMatch(h.resolverCode, selectedUser.code) ? "4" : "3"]),
                                        ...uIncidents.map(i => [i.resolvedAt || i.createdAt, "Sự cố", i.systemName, "5"]),
                                        ...uTasks.map(t => [t.completedAt || t.createdAt, t.type === 'PROJECT' ? "Dự án" : "Bảo trì", t.title, t.type === 'PROJECT' ? "10" : "8"])
                                    ].sort((a,b) => b[0].localeCompare(a[0]));
                                    const wb = XLSX.utils.book_new();
                                    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([...dataExp, ...reportRows]), "KPI");
                                    XLSX.writeFile(wb, `KPI_${selectedUser.code}_${m}_${y}.xlsx`);
                                }}
                                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition"
                            >
                                <FileText size={18} /> XUẤT PHIẾU CÁ NHÂN (XLSX)
                            </button>
                            <button onClick={() => setSelectedUser(null)} className="sm:hidden bg-slate-200 py-4 rounded-2xl font-black text-slate-700 px-6">QUAY LẠI</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}