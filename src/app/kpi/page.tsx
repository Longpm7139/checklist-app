'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart2, Medal, TrendingUp, UserCheck, Calendar, AlertTriangle, RotateCcw, Settings } from 'lucide-react';
import clsx from 'clsx';
import { useUser } from '@/providers/UserProvider';
import { subscribeToLogs, subscribeToHistory, subscribeToIncidents, subscribeToMaintenance, getUsers, resetKPIData, subscribeToDuties } from '@/lib/firebase';

interface KPIRow {
    userId: number;
    code: string;
    name: string;
    inspectionCount: number;
    fixCount: number;
    incidentCount: number;
    maintenanceCount: number;
    faultFoundCount: number; // New
    projectExecCount: number; // New
    projectSupCount: number; // New
    fastCheckCount: number; // Warning count
    score: number; // Simple score for ranking
}

const SCORING_RULES = {
    INSPECTION: 1,
    FAULT_FOUND: 3, // Increased from 2
    FIX: 4,         // Increased from 2
    INCIDENT: 5,
    MAINTENANCE: 8, // New
    PROJECT_EXEC: 10,
    PROJECT_SUP: 6,   // Increased from 5
    NEGLIGENCE: -10    // Decreased from -5 (stricter penalty)
};

export default function KPIPage() {
    const router = useRouter();
    const { user: currentUser } = useUser();
    const [stats, setStats] = useState<KPIRow[]>([]);
    const [totalInspectionsCount, setTotalInspectionsCount] = useState(0);
    const nowD = new Date();
    const currentYearMonth = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}`;
    const [monthFilter, setMonthFilter] = useState(currentYearMonth); // YYYY-MM

    useEffect(() => {
        // Protect Route
        const checkAuth = async () => {
            // Basic protection, provider handles detailed redirect usually but safe to check
        };
        checkAuth();
    }, []);

    const [logs, setLogs] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [incidents, setIncidents] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [duties, setDuties] = useState<any[]>([]);

    // 1. Subscribe to Data
    useEffect(() => {
        // Fetch Users (One-time or could be real-time too, but API is fine for now)
        const fetchUsers = async () => {
            try {
                const users = await getUsers();
                setAllUsers(users || []);
            } catch (e) {
                console.error("Failed to load users", e);
            }
        };
        fetchUsers();

        // Subscribe to Firebase Collections
        const unsubLogs = subscribeToLogs((data) => setLogs(data));
        const unsubHistory = subscribeToHistory((data) => setHistory(data));
        const unsubIncidents = subscribeToIncidents((data) => setIncidents(data));
        const unsubMaintenance = subscribeToMaintenance((data) => setTasks(data));
        const unsubDuties = subscribeToDuties((data) => setDuties(data));

        return () => {
            unsubLogs();
            unsubHistory();
            unsubIncidents();
            unsubMaintenance();
            unsubDuties();
        };
    }, []);

    // 2. Calculate Stats when Data or Filter Changes
    useEffect(() => {
        if (!monthFilter || allUsers.length === 0) return;

        const calculateStats = () => {
            try {
                const normalize = (val: any) => (val || '').toString().trim().toLowerCase().normalize('NFC');
                
                // Helper for ultra-flexible matching (handles leading zeros in codes, partial names, etc.)
                const isMatch = (val1: any, val2: any) => {
                    const n1 = normalize(val1);
                    const n2 = normalize(val2);
                    if (!n1 || !n2) return false;
                    if (n1 === n2) return true;
                    
                    // Numeric comparison for codes (strips non-digits)
                    const num1 = n1.replace(/\D/g, '');
                    const num2 = n2.replace(/\D/g, '');
                    if (num1 !== '' && num1 === num2) return true;

                    // Fuzzy name matching (one contains the other)
                    if (n1.length > 5 && n2.length > 5) { // Only for longer strings to avoid too many false positives
                        if (n1.includes(n2) || n2.includes(n1)) return true;
                    }
                    return false;
                };

                // Filter by Month
                const [filterYear, filterMonth] = monthFilter.split('-');
                const targetM = Number(filterMonth);
                const targetY = Number(filterYear);

                // Calculate next month (to include early morning logs of the 1st next month
                // which belong to the previous month's last night shift)
                const nextMonthDate = new Date(targetY, targetM, 1); // 1st of next month
                const nextM = nextMonthDate.getMonth() + 1;
                const nextY = nextMonthDate.getFullYear();

                // Improved date extraction using regex (handles '.', '/', and '-' delimiters)
                const isMonthYearMatch = (timestamp: string, targetMonth: number, targetYear: number) => {
                    if (!timestamp) return false;
                    const dateMatch = timestamp.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
                    const isoMatch = timestamp.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);

                    let m, y;
                    if (dateMatch) {
                        [, , m, y] = dateMatch;
                    } else if (isoMatch) {
                        [, y, m] = isoMatch;
                    } else {
                        return false; 
                    }

                    let yearNum = Number(y);
                    if (yearNum < 100) yearNum += 2000;
                    return Number(m) === targetMonth && yearNum === targetYear;
                };

                // Parse timestamp to get actual hour (handles 12h CH/SA format)
                const getTimestampHour = (timestamp: string): number => {
                    const timeMatch = timestamp.match(/(\d{1,2}):(\d{1,2})/);
                    if (!timeMatch) return -1;
                    let h = Number(timeMatch[1]);
                    const tl = timestamp.toLowerCase();
                    const isPM = / ch[\s\/\d]/.test(tl) || /\bch\b/.test(tl) || tl.includes('chiều') || / pm/.test(tl);
                    const isAM = / sa[\s\/\d]/.test(tl) || /\bsa\b/.test(tl) || tl.includes('sáng') || / am/.test(tl);
                    if (isPM && h !== 12) h += 12;
                    else if (isAM && h === 12) h = 0;
                    return h;
                };

                // Extended log filter: include current month AND
                // early morning (00:00-07:59) logs of the 1st day of next month
                // (these belong to the last night shift of the current month)
                const filteredLogs = logs.filter((l: any) => {
                    if (isMonthYearMatch(l.timestamp, targetM, targetY)) return true;
                    // Include day-1 of next month if it's early morning (night shift overflow)
                    if (isMonthYearMatch(l.timestamp, nextM, nextY)) {
                        const hour = getTimestampHour(l.timestamp);
                        // Check if this is day 1 of next month
                        const dateMatch = l.timestamp.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
                        const isoMatch = l.timestamp.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
                        let dayNum = -1;
                        if (dateMatch) dayNum = Number(dateMatch[1]);
                        else if (isoMatch) dayNum = Number(isoMatch[3]);
                        if (dayNum === 1 && hour >= 0 && hour < 8) return true;
                    }
                    return false;
                });
                
                const filteredHistory = history.filter((h: any) => h.resolvedAt && isMonthYearMatch(h.resolvedAt, targetM, targetY));
                
                const filteredHistoryCreated = history.filter((h: any) => isMonthYearMatch(h.timestamp, targetM, targetY));

                const filteredIncidents = incidents.filter((i: any) => i.resolvedAt && i.status === 'RESOLVED' && isMonthYearMatch(i.resolvedAt, targetM, targetY));

                const filteredTasks = tasks.filter((t: any) => t.completedAt && t.status === 'COMPLETED' && isMonthYearMatch(t.completedAt, targetM, targetY));

                // Debug: log counts for admin
                console.log(`[KPI Debug] Month: ${monthFilter}, filteredLogs: ${filteredLogs.length} (raw: ${logs.length}), duties: ${duties.length}`);
                if (filteredLogs.length > 0) {
                    console.log('[KPI Debug] Sample timestamps:', filteredLogs.slice(0, 3).map((l: any) => l.timestamp));
                }

                // --- Helper to map Log Timestamp string to Duty Date + Shift ---
                // --- Helper to map Log Timestamp string to candidate Duty Date + Shift pairs ---
                // We use overlapping windows (+/- 1 hour) because staff often arrive early or stay late.
                const getLogDutyCandidates = (timestamp: string) => {
                    if (!timestamp) return [];
                    
                    const dateMatch = timestamp.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
                    const isoMatch = timestamp.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
                    const timeMatch = timestamp.match(/(\d{1,2}):(\d{1,2})/);
                    
                    let d, m, y;
                    if (dateMatch) [, d, m, y] = dateMatch;
                    else if (isoMatch) [, y, m, d] = isoMatch;
                    else return [];

                    // Convert to 4-digit year if 2-digit
                    let yearNum = Number(y);
                    if (yearNum < 100) yearNum += 2000;
                    
                    if (!timeMatch) return [];
                    const [, hhRaw, min] = timeMatch.map(Number);
                    
                    // *** CRITICAL FIX: Handle 12-hour format ***
                    // Vietnamese locale on some devices saves timestamps as:
                    // "07:30 CH 25/03/2026" (CH=chiều=PM) instead of "19:30 25/03/2026"
                    // "07:30 SA 25/03/2026" (SA=sáng=AM)
                    let hh = hhRaw;
                    const tLower = timestamp.toLowerCase();
                    // Detect PM markers: "ch" (chiều), "pm", or "chiều"
                    const isPM = / ch[\s\/\d]/.test(tLower) || 
                                 /\bch\b/.test(tLower) || 
                                 / pm[\s\/\d]/.test(tLower) ||
                                 tLower.includes('chiều');
                    // Detect AM markers: "sa" (sáng), "am", "sáng"  
                    const isAM = / sa[\s\/\d]/.test(tLower) ||
                                 /\bsa\b/.test(tLower) ||
                                 / am[\s\/\d]/.test(tLower) ||
                                 tLower.includes('sáng');
                    if (isPM && hhRaw !== 12) {
                        hh = hhRaw + 12; // e.g. "07:30 CH" → hour=19
                    } else if (isAM && hhRaw === 12) {
                        hh = 0; // midnight "12:xx SA" → hour=0
                    }
                    
                    const candidates: { dutyDateStr: string, shift: 'DAY' | 'NIGHT' }[] = [];
                    const logDate = new Date(yearNum, Number(m) - 1, Number(d));

                    // Day Shift Window: 06:00 - 19:00 (Official 07:00 - 19:00)
                    // Note: we stop at 19:00 (exclusive) so 19:xx logs only go to NIGHT
                    if (hh >= 6 && hh < 19) {
                        const dateStr = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;
                        candidates.push({ dutyDateStr: dateStr, shift: 'DAY' });
                    }

                    // Night Shift Window: 19:00 (Day X) - 07:00 (Day X+1)
                    // case 1: evening of the day (19:00 - 23:59) - strictly night shift hours
                    if (hh >= 19) {
                        const dateStr = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;
                        candidates.push({ dutyDateStr: dateStr, shift: 'NIGHT' });
                    }
                    // case 2: early morning (00:00 - 07:59) -> belongs to previous day's night duty
                    if (hh < 8) {
                        const dutyDate = new Date(logDate);
                        dutyDate.setDate(dutyDate.getDate() - 1);
                        const dateStr = `${dutyDate.getFullYear()}-${String(dutyDate.getMonth() + 1).padStart(2, '0')}-${String(dutyDate.getDate()).padStart(2, '0')}`;
                        candidates.push({ dutyDateStr: dateStr, shift: 'NIGHT' });
                    }
                    // Buffer: 18:00 - 19:00 can be either shift (handover period)
                    if (hh === 18) {
                        const dateStr = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;
                        // Also add as NIGHT candidate for the handover hour
                        const alreadyNight = candidates.some(c => c.dutyDateStr === dateStr && c.shift === 'NIGHT');
                        if (!alreadyNight) candidates.push({ dutyDateStr: dateStr, shift: 'NIGHT' });
                    }

                    return candidates;
                };

                // 1. Group ALL filtered records by Duty Date and Shift (Supporting multiple candidates)
                const logsByDuty: { [key: string]: any[] } = {};
                filteredLogs.forEach((l: any) => {
                    const candidates = getLogDutyCandidates(l.timestamp);
                    candidates.forEach(info => {
                        const key = `${info.dutyDateStr}_${info.shift}`;
                        if (!logsByDuty[key]) logsByDuty[key] = [];
                        logsByDuty[key].push(l);
                    });
                });

                // Debug: show all duty keys that have log activity
                const nightKeys = Object.keys(logsByDuty).filter(k => k.endsWith('_NIGHT'));
                const dayKeys = Object.keys(logsByDuty).filter(k => k.endsWith('_DAY'));
                console.log('[KPI Debug] Duty keys with activity - NIGHT:', nightKeys, '| DAY:', dayKeys);

                const historyByDuty: { [key: string]: any[] } = {};
                filteredHistoryCreated.forEach((h: any) => {
                    const candidates = getLogDutyCandidates(h.timestamp);
                    candidates.forEach(info => {
                        const key = `${info.dutyDateStr}_${info.shift}`;
                        if (!historyByDuty[key]) historyByDuty[key] = [];
                        historyByDuty[key].push(h);
                    });
                });

                console.log(`KPI Data Stats - Month: ${monthFilter}, Users: ${allUsers.length}, Logs (Filtered): ${filteredLogs.length}, Raw: ${logs.length}, Duties: ${duties.length}`);
                if (logs.length > 0) {
                    console.log("Raw Timestamp Examples:", logs.slice(0, 5).map(l => (l as any).timestamp));
                }

                // 2. Calculate Stats per User
                const calculatedStats = allUsers.map(u => {
                    let userInspections = 0;
                    let fastChecksCount = 0;

                    // Iterate through ALL duties to see where this user was assigned
                    duties.forEach(dayDuty => {
                        const dateStr = dayDuty.date;
                        ['DAY', 'NIGHT'].forEach(shiftType => {
                            const shiftAssignments = dayDuty.assignments?.filter((a: any) => {
                                return a.shift === shiftType && (
                                    isMatch(a.userCode, u.code) || 
                                    isMatch(a.userName, u.name)
                                );
                            }) || [];
                            
                            if (shiftAssignments.length === 0) return;

                            const shiftTeamMembers = dayDuty.assignments?.filter((a: any) => a.shift === shiftType).map((a: any) => normalize(a.userCode)) || [];
                            const shiftTeamNames = dayDuty.assignments?.filter((a: any) => a.shift === shiftType).map((a: any) => normalize(a.userName)) || [];
                            
                            const key = `${dateStr}_${shiftType}`;
                            const shiftLogs = logsByDuty[key] || [];
                            const shiftHistory = historyByDuty[key] || [];

                            const teamLogs = shiftLogs.filter((l: any) => {
                                return shiftTeamMembers.some((m: string) => isMatch(m, l.inspectorCode)) || 
                                       shiftTeamNames.some((m: string) => isMatch(m, l.inspectorName));
                            });
                            
                            const teamHistory = shiftHistory.filter((h: any) => {
                                return shiftTeamMembers.some((m: string) => isMatch(m, h.inspectorCode)) || 
                                       shiftTeamNames.some((m: string) => isMatch(m, h.inspectorName));
                            });

                            if (teamLogs.length > 0 || teamHistory.length > 0) {
                                userInspections += 11;
                                console.log(`[KPI ✅] ${u.name}: Date=${dateStr}, Shift=${shiftType}, Logs=${teamLogs.length}, History=${teamHistory.length} → +11 điểm`);
                            } else {
                                // DEBUG: Show why no match found
                                const dutyKey = `${dateStr}_${shiftType}`;
                                const rawShiftLogs = logsByDuty[dutyKey] || [];
                                console.log(`[KPI ❌] ${u.name}: Date=${dateStr}, Shift=${shiftType}, TeamMembers=[${shiftTeamMembers.join(',')}], TeamNames=[${shiftTeamNames.join(',')}], RawShiftLogs=${rawShiftLogs.length} (inspectors: ${rawShiftLogs.slice(0,3).map((l:any)=>l.inspectorName||l.inspectorCode).join(',')})`);
                            }
                            
                            const userLogs = shiftLogs.filter((l: any) =>
                                isMatch(l.inspectorCode, u.code) || isMatch(l.inspectorName, u.name)
                            );
                            userLogs.forEach((l: any) => {
                                if (l.duration && l.duration < 30) {
                                    fastChecksCount++;
                                }
                            });
                        });
                    });

                    // Faults Found
                    const userFaultsFound = filteredHistoryCreated.filter((h: any) => {
                        return isMatch(h.inspectorCode, u.code) || isMatch(h.inspectorName, u.name);
                    }).length;

                    // Fixes
                    const userFixes = filteredHistory.filter((h: any) => {
                        return isMatch(h.resolverCode, u.code) || isMatch(h.resolverName, u.name);
                    }).length;

                    // Incidents
                    const userIncidents = filteredIncidents.filter((i: any) => {
                        const codes = i.resolvedByCode ? (Array.isArray(i.resolvedByCode) ? i.resolvedByCode : i.resolvedByCode.split(',').map((s: string) => s.trim())) : [];
                        const names = i.resolvedBy ? (Array.isArray(i.resolvedBy) ? i.resolvedBy : i.resolvedBy.split(',').map((s: string) => s.trim())) : [];
                        const part = i.participants || [];
                        const partArray = Array.isArray(part) ? part : part.split(',').map((s: string) => s.trim());
                        return codes.includes(u.code) || names.includes(u.name) || partArray.includes(u.name) || partArray.includes(u.code) || i.resolvedByCode === u.code || i.resolvedBy === u.name;
                    }).length;

                    // Maintenance
                    const userMaintenance = filteredTasks.filter((t: any) => {
                        if (t.type === 'PROJECT') return false;
                        const assignees = t.assignees || [];
                        const arr = Array.isArray(assignees) ? assignees : assignees.split(',').map((s: string) => s.trim());
                        return arr.includes(u.code) || arr.includes(u.name);
                    }).length;

                    // Project Execution
                    const userProjectExec = filteredTasks.filter((t: any) => {
                        if (t.type !== 'PROJECT') return false;
                        const assignees = t.assignees || [];
                        const arr = Array.isArray(assignees) ? assignees : assignees.split(',').map((s: string) => s.trim());
                        return arr.includes(u.code) || arr.includes(u.name);
                    }).length;

                    // Project Supervision
                    const userProjectSup = filteredTasks.filter((t: any) => {
                        const supervisors = t.supervisors || [];
                        const arr = Array.isArray(supervisors) ? supervisors : supervisors.split(',').map((s: string) => s.trim());
                        return arr.includes(u.code) || arr.includes(u.name);
                    }).length;

                    return {
                        userId: u.id,
                        code: u.code,
                        name: u.name,
                        inspectionCount: userInspections,
                        fixCount: userFixes,
                        incidentCount: userIncidents,
                        maintenanceCount: userMaintenance,
                        faultFoundCount: userFaultsFound,
                        projectExecCount: userProjectExec,
                        projectSupCount: userProjectSup,
                        fastCheckCount: fastChecksCount,
                        score: (userInspections * SCORING_RULES.INSPECTION) +
                            (userFaultsFound * SCORING_RULES.FAULT_FOUND) +
                            (userFixes * SCORING_RULES.FIX) +
                            (userIncidents * SCORING_RULES.INCIDENT) +
                            (userMaintenance * SCORING_RULES.MAINTENANCE) +
                            (userProjectExec * SCORING_RULES.PROJECT_EXEC) +
                            (userProjectSup * SCORING_RULES.PROJECT_SUP) +
                            (fastChecksCount * SCORING_RULES.NEGLIGENCE)
                    };
                });

                // 3. Sort and set stats
                calculatedStats.sort((a, b) => b.score - a.score);
                setStats(calculatedStats);

                // 4. Calculate Global Total Inspections
                let globalInspections = 0;
                Object.keys(logsByDuty).forEach(key => {
                    const [dateStr, shiftType] = key.split('_');
                    const dayDuty = duties.find(d => d.date === dateStr);
                    if (!dayDuty) return;

                    const shiftTeamMembers = dayDuty.assignments?.filter((a: any) => a.shift === shiftType).map((a: any) => normalize(a.userCode)) || [];
                    const shiftTeamNames = dayDuty.assignments?.filter((a: any) => a.shift === shiftType).map((a: any) => normalize(a.userName)) || [];
                    const shiftLogs = logsByDuty[key];

                    const teamLogs = shiftLogs.filter((l: any) => {
                        const lCode = normalize(l.inspectorCode);
                        const lName = normalize(l.inspectorName);
                        return (lCode !== '' && shiftTeamMembers.includes(lCode)) || (lName !== '' && shiftTeamNames.includes(lName));
                    });
                    
                    if (teamLogs.length > 0) {
                        globalInspections += 11;
                    }
                });
                setTotalInspectionsCount(globalInspections);

            } catch (err) {
                console.error("Error calculating KPI:", err);
            }
        };

        calculateStats();

    }, [monthFilter, allUsers, logs, history, incidents, tasks, duties]);

    if (currentUser?.role !== 'ADMIN') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-2">Truy cập bị từ chối</h1>
                    <p className="text-slate-600 mb-4">Bạn không có quyền xem trang này.</p>
                    <button onClick={() => router.push('/')} className="px-4 py-2 bg-blue-600 text-white rounded">Về trang chủ</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
            <div className="max-w-5xl mx-auto">
                <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button onClick={() => router.push('/')} className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-100">
                            <ArrowLeft size={20} className="text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold uppercase text-slate-800 flex items-center gap-2">
                                <BarChart2 className="text-blue-600" />
                                Dashboard Đánh Giá KPI
                            </h1>
                            <p className="text-slate-500 text-sm">Thống kê hiệu suất làm việc nhân viên</p>
                        </div>
                    </div>



                    <div className="w-full md:w-auto flex items-center gap-2">
                        {currentUser?.role === 'ADMIN' && (
                            <button
                                onClick={async () => {
                                    if (confirm("CẢNH BÁO: Hành động này sẽ XÓA TOÀN BỘ dữ liệu kiểm tra, sửa lỗi, sự cố và bảo trì để làm lại từ đầu.\n\nBạn có chắc chắn muốn tiếp tục không?")) {
                                        try {
                                            await resetKPIData();
                                            alert("Đã xóa toàn bộ dữ liệu. Hệ thống đã được reset về trạng thái ban đầu.");
                                            // Optional: window.location.reload();
                                        } catch (e) {
                                            console.error(e);
                                            alert("Lỗi khi reset dữ liệu");
                                        }
                                    }
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm"
                            >
                                <RotateCcw size={16} /> Reset Dữ Liệu
                            </button>
                        )}
                        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                            <Calendar size={18} className="text-slate-500 ml-2" />
                            <span className="text-sm font-semibold text-slate-700">Tháng:</span>
                            <input
                                type="month"
                                value={monthFilter}
                                onChange={(e) => setMonthFilter(e.target.value)}
                                className="outline-none text-slate-800 font-bold bg-transparent"
                            />
                        </div>
                    </div>
                </header>

                {/* Top Statistics Cards (Responsive Stack) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-full shrink-0">
                            <UserCheck size={24} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Tổng kiểm tra</div>
                            <div className="text-2xl font-black text-slate-800">
                                {totalInspectionsCount}
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-full shrink-0">
                            <TrendingUp size={24} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Lỗi đã sửa</div>
                            <div className="text-2xl font-black text-slate-800">
                                {stats.reduce((acc, curr) => acc + curr.fixCount, 0)}
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 sm:col-span-2 lg:col-span-1">
                        <div className="p-3 bg-amber-100 text-amber-600 rounded-full shrink-0">
                            <Medal size={24} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Nhân viên xuất sắc</div>
                            <div className="text-lg font-bold text-slate-800 truncate" title={stats[0]?.name}>
                                {stats.length > 0 ? stats[0].name : '-'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* SCORING RULES SECTION (Horizontal Scroll on Mobile) */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                    <div className="p-4 bg-slate-100 border-b border-slate-200 font-bold text-slate-700 flex items-center gap-2">
                        <div className="p-1 bg-white rounded border border-slate-200"><Settings size={14} className="text-slate-400" /></div>
                        Cơ cấu tính điểm KPI
                    </div>
                    <div className="overflow-x-auto">
                        <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-8 min-w-[700px] gap-px bg-slate-200">
                            <div className="bg-white p-3 text-center">
                                <div className="text-[10px] text-slate-400 uppercase font-black">Kiểm tra</div>
                                <div className="text-blue-600 font-black text-lg">+{SCORING_RULES.INSPECTION}</div>
                            </div>
                            <div className="bg-white p-3 text-center">
                                <div className="text-[10px] text-slate-400 uppercase font-black">Phát hiện lỗi</div>
                                <div className="text-indigo-600 font-black text-lg">+{SCORING_RULES.FAULT_FOUND}</div>
                            </div>
                            <div className="bg-white p-3 text-center">
                                <div className="text-[10px] text-slate-400 uppercase font-black">Sửa lỗi</div>
                                <div className="text-green-600 font-black text-lg">+{SCORING_RULES.FIX}</div>
                            </div>
                            <div className="bg-white p-3 text-center">
                                <div className="text-[10px] text-slate-400 uppercase font-black">Sự cố</div>
                                <div className="text-purple-600 font-black text-lg">+{SCORING_RULES.INCIDENT}</div>
                            </div>
                            <div className="bg-white p-3 text-center">
                                <div className="text-[10px] text-slate-400 uppercase font-black">Bảo dưỡng</div>
                                <div className="text-cyan-600 font-black text-lg">+{SCORING_RULES.MAINTENANCE}</div>
                            </div>
                            <div className="bg-white p-3 text-center">
                                <div className="text-[10px] text-slate-400 uppercase font-black">Thi công</div>
                                <div className="text-amber-600 font-black text-lg">+{SCORING_RULES.PROJECT_EXEC}</div>
                            </div>
                            <div className="bg-white p-3 text-center">
                                <div className="text-[10px] text-slate-400 uppercase font-black">Giám sát</div>
                                <div className="text-teal-600 font-black text-lg">+{SCORING_RULES.PROJECT_SUP}</div>
                            </div>
                            <div className="bg-white p-3 text-center">
                                <div className="text-[10px] text-red-400 uppercase font-black">Làm ẩu</div>
                                <div className="text-red-600 font-black text-lg">{SCORING_RULES.NEGLIGENCE}</div>
                            </div>
                        </div>
                    </div>
                    <div className="p-2 bg-slate-50 text-[10px] text-slate-400 text-center italic border-t border-slate-200 uppercase tracking-tighter">
                        * Điểm được tính tự động dựa trên nhật ký hoạt động của hệ thống.
                    </div>
                </div>

                {/* WARNING SECTION */}
                {stats.some(s => s.fastCheckCount > 0) && (
                    <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-red-700 font-bold uppercase">
                            <AlertTriangle size={20} /> Cảnh báo bất thường (Làm ẩu)
                        </div>
                        <div className="text-sm text-red-600">
                            Các nhân viên sau có thời gian kiểm tra quá nhanh (dưới 30 giây):
                        </div>
                        <ul className="list-disc list-inside">
                            {stats.filter(s => s.fastCheckCount > 0).map(s => (
                                <li key={s.userId} className="text-slate-800 font-medium">
                                    {s.name} ({s.code}): <span className="font-bold text-red-600">{s.fastCheckCount} lần</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Leaderboard Section (Responsive) */}
                <div className="w-full">
                    {/* Mobile Card View (hidden on md-up) */}
                    <div className="block md:hidden space-y-4">
                        <div className="p-2 text-slate-500 font-bold uppercase text-xs tracking-widest pl-4">Bảng Xếp Hạng Hiệu Suất</div>
                        {stats.map((row, idx) => (
                            <div key={row.userId} className={clsx("bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden", idx < 3 ? "ring-2 ring-amber-100" : "")}>
                                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={clsx(
                                            "w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-sm",
                                            idx === 0 ? "bg-yellow-400 text-white" :
                                                idx === 1 ? "bg-slate-300 text-white" :
                                                    idx === 2 ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-400"
                                        )}>
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800">{row.name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono italic uppercase tracking-tighter">{row.code}</div>
                                        </div>
                                    </div>
                                    <div className="text-blue-700 font-black text-2xl">{row.score}</div>
                                </div>
                                <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm italic">
                                    <div className="flex justify-between border-b border-slate-50">
                                        <span className="text-slate-400">Kiểm tra:</span>
                                        <span className="font-bold text-blue-600">{row.inspectionCount}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50">
                                        <span className="text-slate-400">Lỗi:</span>
                                        <span className="font-bold text-indigo-600">{row.faultFoundCount || 0}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50">
                                        <span className="text-slate-400">Sửa lỗi:</span>
                                        <span className="font-bold text-green-600">{row.fixCount}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50">
                                        <span className="text-slate-400">Sự cố:</span>
                                        <span className="font-bold text-purple-600">{row.incidentCount || 0}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50">
                                        <span className="text-slate-400">Bảo dưỡng:</span>
                                        <span className="font-bold text-cyan-600">{row.maintenanceCount || 0}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50">
                                        <span className="text-slate-400">Thi công:</span>
                                        <span className="font-bold text-amber-600">{row.projectExecCount || 0}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50">
                                        <span className="text-slate-400">Làm ẩu:</span>
                                        <span className="font-bold text-red-500">-{row.fastCheckCount || 0}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View (hidden on mobile) */}
                    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-lg text-slate-800 flex justify-between items-center">
                            <span>Bảng Xếp Hạng Hiệu Suất</span>
                        </div>
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-100 text-slate-600 uppercase text-xs font-bold border-b border-slate-200">
                                <tr>
                                    <th className="p-4 w-16 text-center">Hạng</th>
                                    <th className="p-4">Nhân viên</th>
                                    <th className="p-4 text-center">Kiểm tra</th>
                                    <th className="p-4 text-center text-indigo-600">Phát hiện lỗi</th>
                                    <th className="p-4 text-center text-green-600">Sửa lỗi</th>
                                    <th className="p-4 text-center text-purple-600">Sự cố</th>
                                    <th className="p-4 text-center text-cyan-600">Bảo dưỡng</th>
                                    <th className="p-4 text-center text-amber-600">Thi công</th>
                                    <th className="p-4 text-center text-red-600">Làm ẩu</th>
                                    <th className="p-4 text-center">Tổng điểm</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {stats.map((row, idx) => (
                                    <tr key={row.userId} className={clsx("hover:bg-slate-50 transition", idx < 3 ? "bg-amber-50/10" : "")}>
                                        <td className="p-4 text-center">
                                            <div className={clsx(
                                                "w-8 h-8 rounded-full flex items-center justify-center font-bold mx-auto shadow-sm",
                                                idx === 0 ? "bg-yellow-400 text-white" :
                                                    idx === 1 ? "bg-slate-300 text-white" :
                                                        idx === 2 ? "bg-amber-600 text-white" : "text-slate-400"
                                            )}>
                                                {idx + 1}
                                            </div>
                                        </td>
                                        <td className="p-4 font-bold text-slate-800">
                                            {row.name}
                                            <div className="text-xs font-normal text-slate-400">{row.code}</div>
                                        </td>
                                        <td className="p-4 text-center font-medium text-blue-600">{row.inspectionCount}</td>
                                        <td className="p-4 text-center font-medium text-indigo-600">{row.faultFoundCount || '-'}</td>
                                        <td className="p-4 text-center font-medium text-green-600">{row.fixCount}</td>
                                        <td className="p-4 text-center font-bold text-purple-600">{row.incidentCount || '-'}</td>
                                        <td className="p-4 text-center font-bold text-cyan-600">{row.maintenanceCount || '-'}</td>
                                        <td className="p-4 text-center font-bold text-amber-600">{row.projectExecCount || '-'}</td>
                                        <td className="p-4 text-center font-bold text-red-500">{row.fastCheckCount || '-'}</td>
                                        <td className="p-4 text-center font-bold text-slate-900 text-lg">{row.score}</td>
                                    </tr>
                                ))}
                                {stats.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="p-8 text-center text-slate-500 italic">Chưa có dữ liệu cho tháng này.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="mt-4 text-xs text-slate-400 italic text-right">
                    * Bảng điểm được cập nhật tự động theo cơ cấu điểm ở trên.
                </div>
            </div>
        </div>
    );
}
