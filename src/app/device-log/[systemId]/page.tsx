'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, BookOpen, Save, Printer, Lock, Edit3,
    ChevronDown, ChevronUp, Plus, Trash2, AlertTriangle,
    CheckCircle, Clock, Wrench, FileText, BarChart2, Package, Shield
} from 'lucide-react';
import { useUser } from '@/providers/UserProvider';
import {
    subscribeToSystems, getDeviceLog, saveDeviceLog,
    subscribeToIncidents, subscribeToMaintenance, subscribeToHistory
} from '@/lib/firebase';
import { DeviceLog, DeviceOperator, DeviceComponent, DeviceCertification, DeviceDocument } from '@/lib/types';

// ─── Helpers ────────────────────────────────────────────────
const EMPTY_LOG: Omit<DeviceLog, 'systemId' | 'systemName' | 'updatedAt' | 'updatedBy'> = {
    brand: '', purpose: '', operatingArea: '', countryOfOrigin: '',
    serialNumber: '', technicalAddress: '', location: '',
    dailyOperatingHours: '', assetCode: '', managingUnit: '',
    operators: [],
    dimLength: '', dimWidth: '', dimHeight: '', dimUnit: 'mm',
    weight: '', weightUnit: 'kg',
    powerSource: '', powerConsumption: '', safetyRegulations: '', otherSpecs: '',
    components: [], certifications: [], documents: [],
};

const TABS = [
    { id: 'profile',  label: 'Lý Lịch',       icon: BookOpen,    color: 'blue' },
    { id: 'specs',    label: 'Đặc Tính KT',    icon: Wrench,      color: 'violet' },
    { id: 'parts',    label: 'Thành Phần',      icon: Package,     color: 'teal' },
    { id: 'certs',    label: 'Giấy Phép',       icon: Shield,      color: 'amber' },
    { id: 'docs',     label: 'Tài Liệu',        icon: FileText,    color: 'rose' },
    { id: 'incidents',label: 'Sự Cố (23)',      icon: AlertTriangle, color: 'red' },
    { id: 'maint',    label: 'Bảo Dưỡng (24)', icon: Wrench,      color: 'orange' },
    { id: 'damage',   label: 'Hư Hỏng (25)',    icon: Clock,       color: 'purple' },
    { id: 'stats',    label: 'Thống Kê (26)',   icon: BarChart2,   color: 'green' },
];

// ─── Parse VI-VN & ISO date string ─────────────────────────────
function parseVNDate(s: string): Date | null {
    if (!s) return null;
    
    // First, try native parsing natively if it's ISO or standard format
    let d = new Date(s);
    if (!isNaN(d.getTime()) && (s.includes('T') || /^\d{4}-\d{2}-\d{2}$/.test(s.trim()))) {
        return d;
    }

    // Attempt to extract components
    const p = s.split(/[\s/:\-,]+/).filter(Boolean);
    const nums = p.map(Number);
    const yi = p.findIndex(x => x.length === 4);
    
    if (yi !== -1 && !isNaN(nums[yi])) {
        let year = nums[yi];
        try {
            if (yi === 0) {
                // YYYY-MM-DD etc
                const month = nums[1] || 1;
                const day = nums[2] || 1;
                const hr = nums[3] || 0;
                const mn = nums[4] || 0;
                return new Date(year, month - 1, day, hr, mn);
            } else if (yi === 2 || yi >= 3) {
                // DD/MM/YYYY or HH:mm DD/MM/YYYY
                let c1 = yi === 2 ? nums[0] : nums[yi - 2];
                let c2 = yi === 2 ? nums[1] : nums[yi - 1];
                
                let month = c2;
                let day = c1;
                if (month > 12) {
                    // Must be MM/DD/YYYY logic
                    month = c1;
                    day = c2;
                }
                
                let hr = 0, mn = 0;
                if (yi === 2) {
                    hr = nums[3] || 0;
                    mn = nums[4] || 0;
                } else {
                    hr = nums[0] || 0;
                    mn = nums[1] || 0;
                }
                return new Date(year, month - 1, day, hr, mn);
            }
        } catch { }
    }

    return isNaN(d.getTime()) ? null : d;
}

function getQuarter(d: Date): number { return Math.floor(d.getMonth() / 3) + 1; }
function getYear(d: Date): number { return d.getFullYear(); }

// ─── Sub-components ──────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
            {children}
        </div>
    );
}

function InputField({ value, onChange, placeholder, readOnly, type = 'text' }: any) {
    return (
        <input
            type={type}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            readOnly={readOnly}
            className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors ${
                readOnly
                    ? 'bg-slate-50 border-slate-200 text-slate-600 cursor-default'
                    : 'bg-white border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
            }`}
        />
    );
}

function TextareaField({ value, onChange, placeholder, readOnly, rows = 3 }: any) {
    return (
        <textarea
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            readOnly={readOnly}
            rows={rows}
            className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors resize-none ${
                readOnly
                    ? 'bg-slate-50 border-slate-200 text-slate-600 cursor-default'
                    : 'bg-white border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
            }`}
        />
    );
}

// ─── Main Page ───────────────────────────────────────────────
export default function DeviceLogDetailPage() {
    const router = useRouter();
    const params = useParams();
    const systemId = params?.systemId as string;
    const { user } = useUser();
    const isAdmin = user?.role === 'ADMIN';

    const [system, setSystem] = useState<any>(null);
    const [log, setLog] = useState<Partial<DeviceLog>>(EMPTY_LOG as any);
    const [incidents, setIncidents] = useState<any[]>([]);
    const [maintenance, setMaintenance] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('profile');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!systemId) return;

        const unsubSystems = subscribeToSystems(data => {
            const sys = data.find(s => s.id === systemId);
            setSystem(sys || null);
        });

        const unsubIncidents = subscribeToIncidents(setIncidents);
        const unsubMaint = subscribeToMaintenance(setMaintenance);
        const unsubHistory = subscribeToHistory(setHistory);

        getDeviceLog(systemId).then(existing => {
            if (existing) setLog({ ...EMPTY_LOG, ...existing });
            setLoading(false);
        });

        return () => { unsubSystems(); unsubIncidents(); unsubMaint(); unsubHistory(); };
    }, [systemId]);

    const update = (field: keyof DeviceLog, value: any) => {
        setLog(prev => ({ ...prev, [field]: value }));
        setSaved(false);
    };

    const handleClearData = async () => {
        if (!isAdmin || !systemId) return;
        if (confirm('Bạn có chắc chắn muốn xóa rỗng TOÀN BỘ dữ liệu từ Mục 1 đến Mục 22? (Sẽ không ảnh hưởng sự cố/hư hỏng)')) {
            setSaving(true);
            setLog({ ...EMPTY_LOG });
            await saveDeviceLog(systemId, {
                ...EMPTY_LOG,
                systemId,
                systemName: system?.name || systemId,
                updatedAt: new Date().toLocaleString('vi-VN'),
                updatedBy: user?.name || 'Admin',
            });
            setSaving(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        }
    };

    const handleSave = async () => {
        if (!systemId) return;
        setSaving(true);
        const now = new Date().toLocaleString('vi-VN', {
            hour: '2-digit', minute: '2-digit', day: '2-digit',
            month: '2-digit', year: 'numeric', hour12: false
        });
        await saveDeviceLog(systemId, {
            ...log,
            systemId,
            systemName: system?.name || systemId,
            updatedAt: now,
            updatedBy: user?.name,
        });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const handlePrint = () => window.print();

    // ─── Derived data for auto-tabs ──────────────────────────
    const systemName = system?.name || systemId;

    // Tên ngắn: "C. Hệ thống Máy soi" → "Hệ thống Máy soi" và "Máy soi"
    const systemNameShort = systemName.includes('.') 
        ? systemName.split('.').slice(1).join('.').trim() 
        : systemName;
    // Từ khoá cốt lõi (bỏ "Hệ thống"): "Máy soi"
    const systemKeyword = systemNameShort.replace(/hệ thống/gi, '').trim();

    const matchesSystem = (text: string): boolean => {
        if (!text) return false;
        const t = text.toLowerCase();
        return (
            t.includes(systemId.toLowerCase()) ||
            t.includes(systemName.toLowerCase()) ||
            t.includes(systemNameShort.toLowerCase()) ||
            (systemKeyword.length > 3 && t.includes(systemKeyword.toLowerCase()))
        );
    };

    const relatedIncidents = incidents.filter(inc =>
        // Ưu tiên: khớp theo systemId được lưu trực tiếp trong incident
        inc.systemId === systemId ||
        // Hoặc: khớp theo tên hệ thống trong trường systemName (tìm kiếm rộng)
        matchesSystem(inc.systemName) ||
        matchesSystem(inc.title)
    );

    const relatedMaint = maintenance.filter(t =>
        t.title && (
            t.title.toLowerCase().includes(systemName.toLowerCase()) ||
            t.title.toLowerCase().includes(systemId.toLowerCase())
        )
    );

    const relatedHistory = history.filter(h =>
        h.systemId === systemId || h.systemName === systemName
    );

    // ─── Stats for tab 9 (Mục 26) ────────────────────────────
    const allDamageEvents = [
        ...relatedHistory.map(h => ({ date: parseVNDate(h.timestamp), part: h.systemName || systemName })),
        ...relatedIncidents.map(i => ({ date: parseVNDate(i.createdAt), part: i.title || systemName })),
    ].filter(e => e.date !== null);

    const years = Array.from(new Set(allDamageEvents.map(e => getYear(e.date!)))).sort();
    const parts = Array.from(new Set(allDamageEvents.map(e => e.part)));
    const countDamage = (part: string, year: number, q: number) =>
        allDamageEvents.filter(e =>
            e.part === part && getYear(e.date!) === year && getQuarter(e.date!) === q
        ).length;

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center text-slate-400">
                    <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    Đang tải hồ sơ thiết bị...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans" id="device-log-print-root">
            {/* ── Header ── */}
            <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20 print:hidden">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
                    <button onClick={() => router.push('/device-log')} className="p-2 rounded-full hover:bg-slate-100">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="font-bold text-slate-800 text-base truncate">
                            [{systemId}] {systemName}
                        </h1>
                        <p className="text-[11px] text-slate-500">Sổ Lý Lịch Thiết Bị · ACV-LLTB01</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                            title="In / Xuất PDF"
                        >
                            <Printer size={18} />
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${
                                saved
                                    ? 'bg-green-500 text-white'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                        >
                            {saved ? <CheckCircle size={16} /> : <Save size={16} />}
                            {saving ? 'Đang lưu...' : saved ? 'Đã lưu' : 'Lưu'}
                        </button>
                        {isAdmin && (
                            <button
                                onClick={handleClearData}
                                className="p-2 ml-1 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition-colors"
                                title="Xoá rỗng toàn bộ dữ liệu (Mục 1-22)"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Tab bar */}
                <div className="max-w-4xl mx-auto px-2 flex overflow-x-auto gap-0.5 pb-0 scrollbar-none">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex-shrink-0 ${
                                activeTab === tab.id
                                    ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <tab.icon size={13} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Content ── */}
            <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">

                {/* ══ TAB 1: LÝ LỊCH (Mục 1–13) ══ */}
                {activeTab === 'profile' && (
                    <div className="space-y-4 print-section">
                        <SectionCard title="Mục 1–12 · Thông tin chung" accent="blue">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="1. Tên thiết bị">
                                    <InputField value={systemName} onChange={() => {}} readOnly />
                                </Field>
                                <Field label="2. Nhãn hiệu / Hãng sản xuất">
                                    <InputField value={log.brand} onChange={(v: string) => update('brand', v)} placeholder="VD: Thyssenkrupp, SITA..." readOnly={false} />
                                </Field>
                                <Field label="3. Mục đích sử dụng">
                                    <InputField value={log.purpose} onChange={(v: string) => update('purpose', v)} placeholder="VD: Vận chuyển hành khách..." readOnly={false} />
                                </Field>
                                <Field label="4. Phạm vi hoạt động">
                                    <InputField value={log.operatingArea} onChange={(v: string) => update('operatingArea', v)} placeholder="VD: Nhà ga T1, khu vực..." readOnly={false} />
                                </Field>
                                <Field label="5. Nước sản xuất">
                                    <InputField value={log.countryOfOrigin} onChange={(v: string) => update('countryOfOrigin', v)} placeholder="VD: Đức, Nhật Bản..." readOnly={false} />
                                </Field>
                                <Field label="6. Số máy (Serial Number)">
                                    <InputField value={log.serialNumber} onChange={(v: string) => update('serialNumber', v)} placeholder="VD: SN-2023-001..." readOnly={false} />
                                </Field>
                                <Field label="7. Mã số / Địa chỉ kỹ thuật">
                                    <InputField value={log.technicalAddress} onChange={(v: string) => update('technicalAddress', v)} placeholder="VD: 192.168.1.10 / ID-TB-001" readOnly={false} />
                                </Field>
                                <Field label="8. Địa điểm / Tọa độ đặt thiết bị">
                                    <InputField value={log.location} onChange={(v: string) => update('location', v)} placeholder="VD: Gate A5, Tầng 1, Nhà ga T1" readOnly={false} />
                                </Field>
                                <Field label="9. Thời gian hoạt động hàng ngày">
                                    <InputField value={log.dailyOperatingHours} onChange={(v: string) => update('dailyOperatingHours', v)} placeholder="VD: 05:00 – 23:00 (18 giờ/ngày)" readOnly={false} />
                                </Field>
                                <Field label="10–11. Mã số TSCD / Xuất xứ đi đôi">
                                    <InputField value={log.assetCode} onChange={(v: string) => update('assetCode', v)} placeholder="VD: TSCD-2023-A001" readOnly={false} />
                                </Field>
                                <Field label="12. Đơn vị sử dụng (quản lý)">
                                    <InputField value={log.managingUnit} onChange={(v: string) => update('managingUnit', v)} placeholder="VD: Phòng Kỹ thuật ACV" readOnly={false} />
                                </Field>
                            </div>
                        </SectionCard>

                        {/* Mục 13 — Người sử dụng */}
                        <SectionCard title="Mục 13 · Người sử dụng thiết bị" accent="blue">
                            <OperatorsTable
                                operators={log.operators || []}
                                onChange={ops => update('operators', ops)}
                                readOnly={false}
                            />
                        </SectionCard>
                    </div>
                )}

                {/* ══ TAB 2: ĐẶC TÍNH KỸ THUẬT (Mục 14–19) ══ */}
                {activeTab === 'specs' && (
                    <SectionCard title="Mục 14–19 · Đặc tính kỹ thuật" accent="violet">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="14. Kích thước (Dài × Rộng × Cao)">
                                <div className="flex gap-2 items-center">
                                    <InputField value={log.dimLength} onChange={(v: string) => update('dimLength', v)} placeholder="Dài" readOnly={false} />
                                    <span className="text-slate-400 font-bold">×</span>
                                    <InputField value={log.dimWidth} onChange={(v: string) => update('dimWidth', v)} placeholder="Rộng" readOnly={false} />
                                    <span className="text-slate-400 font-bold">×</span>
                                    <InputField value={log.dimHeight} onChange={(v: string) => update('dimHeight', v)} placeholder="Cao" readOnly={false} />
                                    <select
                                        value={log.dimUnit || 'mm'}
                                        onChange={e => update('dimUnit', e.target.value)}
                                        disabled={false}
                                        className="border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white outline-none disabled:bg-slate-50"
                                    >
                                        {['mm', 'cm', 'm'].map(u => <option key={u}>{u}</option>)}
                                    </select>
                                </div>
                            </Field>
                            <Field label="15. Khối lượng">
                                <div className="flex gap-2">
                                    <InputField value={log.weight} onChange={(v: string) => update('weight', v)} placeholder="VD: 2500" readOnly={false} />
                                    <select
                                        value={log.weightUnit || 'kg'}
                                        onChange={e => update('weightUnit', e.target.value)}
                                        disabled={false}
                                        className="border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white outline-none w-20 disabled:bg-slate-50"
                                    >
                                        {['kg', 'tấn'].map(u => <option key={u}>{u}</option>)}
                                    </select>
                                </div>
                            </Field>
                            <Field label="16. Nguồn điện cung cấp / Nhiên liệu">
                                <InputField value={log.powerSource} onChange={(v: string) => update('powerSource', v)} placeholder="VD: 380V AC 3 pha / Dầu diesel" readOnly={false} />
                            </Field>
                            <Field label="17. Công suất tiêu thụ / Định mức nhiên liệu">
                                <InputField value={log.powerConsumption} onChange={(v: string) => update('powerConsumption', v)} placeholder="VD: 15 kW / 5L/h" readOnly={false} />
                            </Field>
                            <div className="md:col-span-2">
                                <Field label="18. Quy định nghiêm ngặt về an toàn lao động">
                                    <TextareaField value={log.safetyRegulations} onChange={(v: string) => update('safetyRegulations', v)} placeholder="Các quy định ATLĐ bắt buộc khi vận hành..." readOnly={false} rows={4} />
                                </Field>
                            </div>
                            <div className="md:col-span-2">
                                <Field label="19. Các đặc điểm kỹ thuật khác">
                                    <TextareaField value={log.otherSpecs} onChange={(v: string) => update('otherSpecs', v)} placeholder="Thông số kỹ thuật đặc biệt, chế độ hoạt động..." readOnly={false} rows={4} />
                                </Field>
                            </div>
                        </div>
                    </SectionCard>
                )}

                {/* ══ TAB 3: THÀNH PHẦN (Mục 20) ══ */}
                {activeTab === 'parts' && (
                    <SectionCard title="Mục 20 · Toàn bộ thiết bị gồm có" accent="teal">
                        <ComponentsTable
                            items={log.components || []}
                            onChange={(items: any[]) => update('components', items)}
                            readOnly={false}
                        />
                    </SectionCard>
                )}

                {/* ══ TAB 4: GIẤY PHÉP (Mục 21) ══ */}
                {activeTab === 'certs' && (
                    <SectionCard title="Mục 21 · Số tem kiểm định / Giấy phép hoạt động" accent="amber">
                        <CertsTable
                            items={log.certifications || []}
                            onChange={(items: any[]) => update('certifications', items)}
                            readOnly={false}
                        />
                    </SectionCard>
                )}

                {/* ══ TAB 5: TÀI LIỆU (Mục 22) ══ */}
                {activeTab === 'docs' && (
                    <SectionCard title="Mục 22 · Tài liệu kỹ thuật kèm theo" accent="rose">
                        <DocsTable
                            items={log.documents || []}
                            onChange={(items: any[]) => update('documents', items)}
                            readOnly={false}
                        />
                    </SectionCard>
                )}

                {/* ══ TAB 6: SỰ CỐ ĐỘT XUẤT (Mục 23) ══ */}
                {activeTab === 'incidents' && (
                    <SectionCard title="Mục 23 · Kiểm tra kỹ thuật (Sự cố đột xuất)" accent="red" autoInfo>
                        {relatedIncidents.length === 0 ? (
                            <EmptyAuto label="Chưa có sự cố nào liên quan đến thiết bị này." />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-red-50 border-b border-red-100">
                                            <th className="text-left px-3 py-2.5 font-bold text-red-700 text-xs whitespace-nowrap w-32">Ngày k.tra</th>
                                            <th className="text-left px-3 py-2.5 font-bold text-red-700 text-xs">Tình trạng khi kiểm tra</th>
                                            <th className="text-left px-3 py-2.5 font-bold text-red-700 text-xs whitespace-nowrap w-32">Chất lượng HĐ của TB</th>
                                            <th className="text-left px-3 py-2.5 font-bold text-red-700 text-xs whitespace-nowrap w-28">Người kiểm tra</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {relatedIncidents.map((inc, i) => (
                                            <tr key={inc.id || i} className="hover:bg-red-50/40">
                                                <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{inc.createdAt}</td>
                                                <td className="px-3 py-2.5 text-xs text-slate-700">{inc.title}{inc.description ? ` — ${inc.description}` : ''}</td>
                                                <td className="px-3 py-2.5 text-xs">
                                                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${inc.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {inc.status === 'RESOLVED' ? 'Đã xử lý' : 'Có sự cố'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-xs text-slate-600">{inc.reportedBy}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SectionCard>
                )}

                {/* ══ TAB 7: BẢO DƯỠNG ĐỊNH KỲ (Mục 24) ══ */}
                {activeTab === 'maint' && (
                    <SectionCard title="Mục 24 · Kiểm tra bảo dưỡng định kỳ" accent="orange" autoInfo>
                        {relatedMaint.length === 0 ? (
                            <EmptyAuto label="Chưa có lịch bảo dưỡng liên quan đến thiết bị này." />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-orange-50 border-b border-orange-100">
                                            <th className="text-left px-3 py-2.5 font-bold text-orange-700 text-xs w-28">Ngày k.tra</th>
                                            <th className="text-left px-3 py-2.5 font-bold text-orange-700 text-xs w-28">Thời hạn</th>
                                            <th className="text-left px-3 py-2.5 font-bold text-orange-700 text-xs">Tình trạng KT khi kiểm tra</th>
                                            <th className="text-left px-3 py-2.5 font-bold text-orange-700 text-xs w-28">Chất lượng HĐ của TB</th>
                                            <th className="text-left px-3 py-2.5 font-bold text-orange-700 text-xs w-32">Người kiểm tra</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {relatedMaint.map((t, i) => (
                                            <tr key={t.id || i} className="hover:bg-orange-50/40">
                                                <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{t.completedAt || t.createdAt || '—'}</td>
                                                <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{t.deadline || '—'}</td>
                                                <td className="px-3 py-2.5 text-xs text-slate-700">{t.completedNote || t.description || '—'}</td>
                                                <td className="px-3 py-2.5 text-xs">
                                                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${t.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {t.status === 'COMPLETED' ? 'Hoàn thành' : 'Đang thực hiện'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-xs text-slate-600">{(t.assigneeNames || []).join(', ') || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SectionCard>
                )}

                {/* ══ TAB 8: HƯ HỎNG (Mục 25) ══ */}
                {activeTab === 'damage' && (
                    <SectionCard title="Mục 25 · Tình trạng hư hỏng" accent="purple" autoInfo>
                        {relatedHistory.length === 0 ? (
                            <EmptyAuto label="Chưa có ghi nhận hư hỏng cho thiết bị này." />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-purple-50 border-b border-purple-100">
                                            <th className="text-center px-3 py-2.5 font-bold text-purple-700 text-xs w-10">STT</th>
                                            <th className="text-left px-3 py-2.5 font-bold text-purple-700 text-xs w-32">Ngày/Tháng/Năm</th>
                                            <th className="text-left px-3 py-2.5 font-bold text-purple-700 text-xs">Tình trạng TB khi HH</th>
                                            <th className="text-left px-3 py-2.5 font-bold text-purple-700 text-xs">Xác định bộ phận HH</th>
                                            <th className="text-left px-3 py-2.5 font-bold text-purple-700 text-xs">Vật tư thay thế</th>
                                            <th className="text-left px-3 py-2.5 font-bold text-purple-700 text-xs w-28">TT sau SC</th>
                                            <th className="text-left px-3 py-2.5 font-bold text-purple-700 text-xs w-28">Người SC</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {relatedHistory.map((h, i) => (
                                            <tr key={h.id || i} className="hover:bg-purple-50/40">
                                                <td className="px-3 py-2.5 text-xs text-center text-slate-500 font-bold">{i + 1}</td>
                                                <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{h.timestamp || h.createdAt || '—'}</td>
                                                <td className="px-3 py-2.5 text-xs text-slate-700">{h.note || h.description || '—'}</td>
                                                <td className="px-3 py-2.5 text-xs text-slate-700">{h.systemName || systemName}</td>
                                                <td className="px-3 py-2.5 text-xs text-slate-600">{h.materials || '—'}</td>
                                                <td className="px-3 py-2.5 text-xs">
                                                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                                        h.fixStatus === 'Fixed' ? 'bg-green-100 text-green-700' :
                                                        h.fixStatus === 'Fixing' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                        {h.fixStatus === 'Fixed' ? 'Đã sửa' : h.fixStatus === 'Fixing' ? 'Đang sửa' : 'Chưa sửa'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-xs text-slate-600">{h.resolvedBy || (h.executorNames || []).join(', ') || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SectionCard>
                )}

                {/* ══ TAB 9: THỐNG KÊ (Mục 26) ══ */}
                {activeTab === 'stats' && (
                    <SectionCard title="Mục 26 · Thống kê hư hỏng" accent="green" autoInfo>
                        {allDamageEvents.length === 0 ? (
                            <EmptyAuto label="Chưa có dữ liệu thống kê hư hỏng." />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs border-collapse border border-slate-200">
                                    <thead>
                                        <tr className="bg-green-700 text-white">
                                            <th className="border border-green-600 px-2 py-2 text-center font-bold w-8" rowSpan={2}>STT</th>
                                            <th className="border border-green-600 px-3 py-2 text-left font-bold min-w-[140px]" rowSpan={2}>Tên bộ phận hư hỏng</th>
                                            {years.map(y => (
                                                <th key={y} className="border border-green-600 px-2 py-1 text-center font-bold" colSpan={4}>
                                                    {y}
                                                </th>
                                            ))}
                                            <th className="border border-green-600 px-2 py-2 text-center font-bold w-16" rowSpan={2}>Ghi chú</th>
                                        </tr>
                                        <tr className="bg-green-600 text-white">
                                            {years.map(y => (
                                                [1,2,3,4].map(q => (
                                                    <th key={`${y}-q${q}`} className="border border-green-500 px-1.5 py-1 text-center font-semibold text-[10px]">
                                                        Q{q}
                                                    </th>
                                                ))
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parts.map((part, i) => (
                                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-green-50/30'}>
                                                <td className="border border-slate-200 px-2 py-2 text-center text-slate-500 font-bold">{i + 1}</td>
                                                <td className="border border-slate-200 px-3 py-2 text-slate-700 font-medium">{part}</td>
                                                {years.map(y =>
                                                    [1,2,3,4].map(q => {
                                                        const cnt = countDamage(part, y, q);
                                                        return (
                                                            <td key={`${y}-q${q}`} className={`border border-slate-200 px-1.5 py-2 text-center font-bold ${cnt > 0 ? 'text-red-600 bg-red-50' : 'text-slate-300'}`}>
                                                                {cnt > 0 ? cnt : ''}
                                                            </td>
                                                        );
                                                    })
                                                )}
                                                <td className="border border-slate-200 px-2 py-2"></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <p className="text-[10px] text-slate-400 mt-2 italic">* Dữ liệu tự động tổng hợp từ Sự cố & Lịch sử sửa chữa</p>
                            </div>
                        )}
                    </SectionCard>
                )}
            </div>

            {/* ── Print metadata ── */}
            <div className="hidden print:block px-8 pt-4 pb-2 border-b border-slate-300 mb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="text-xs font-bold text-slate-500 uppercase">ACV · Sổ Lý Lịch Thiết Bị</div>
                        <div className="text-xl font-black text-slate-800">[{systemId}] — {systemName}</div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                        <div>Mã sổ: ACV-LLTB01</div>
                        <div>In lúc: {new Date().toLocaleString('vi-VN')}</div>
                        {log.updatedAt && <div>Cập nhật: {log.updatedAt} bởi {log.updatedBy}</div>}
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #device-log-print-root, #device-log-print-root * { visibility: visible; }
                    #device-log-print-root { position: absolute; left: 0; top: 0; width: 100%; }
                    .print\\:hidden { display: none !important; }
                    .hidden.print\\:block { display: block !important; }
                    .print-section { break-inside: avoid; }
                }
            `}</style>
        </div>
    );
}

// ─── Section Card wrapper ────────────────────────────────────
function SectionCard({ title, children, accent = 'blue', autoInfo = false }: any) {
    const accents: Record<string, string> = {
        blue: 'from-blue-600 to-blue-700', violet: 'from-violet-600 to-violet-700',
        teal: 'from-teal-600 to-teal-700', amber: 'from-amber-500 to-amber-600',
        rose: 'from-rose-600 to-rose-700', red: 'from-red-600 to-red-700',
        orange: 'from-orange-500 to-orange-600', purple: 'from-purple-600 to-purple-700',
        green: 'from-green-600 to-green-700',
    };
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className={`px-5 py-3 bg-gradient-to-r ${accents[accent]} flex items-center justify-between`}>
                <h2 className="text-sm font-bold text-white">{title}</h2>
                {autoInfo && (
                    <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-semibold">Tự động từ Checklist</span>
                )}
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function EmptyAuto({ label }: { label: string }) {
    return (
        <div className="text-center py-8 text-slate-400">
            <Clock size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">{label}</p>
        </div>
    );
}

// ─── Operators Table (Mục 13) ────────────────────────────────
function OperatorsTable({ operators, onChange, readOnly }: { operators: DeviceOperator[]; onChange: (ops: DeviceOperator[]) => void; readOnly: boolean }) {
    const addRow = () => onChange([...operators, { name: '', qualification: '', licenseNo: '', position: '', startDate: '', endDate: '' }]);
    const updateRow = (i: number, field: keyof DeviceOperator, val: string) => {
        const updated = operators.map((op, idx) => idx === i ? { ...op, [field]: val } : op);
        onChange(updated);
    };
    const removeRow = (i: number) => onChange(operators.filter((_, idx) => idx !== i));

    const cols: { key: keyof DeviceOperator; label: string; w?: string }[] = [
        { key: 'name', label: 'Họ và tên' },
        { key: 'qualification', label: 'Trình độ CM', w: 'w-28' },
        { key: 'licenseNo', label: 'Số GP hành nghề', w: 'w-32' },
        { key: 'position', label: 'Chức vụ', w: 'w-24' },
        { key: 'startDate', label: 'Ngày đến', w: 'w-28' },
        { key: 'endDate', label: 'Ngày đi', w: 'w-28' },
    ];

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse border border-slate-200 min-w-[600px]">
                    <thead>
                        <tr className="bg-blue-50">
                            <th className="border border-slate-200 px-2 py-2 text-center text-slate-500 font-bold w-8">STT</th>
                            {cols.map(c => (
                                <th key={c.key} className={`border border-slate-200 px-2 py-2 text-left text-slate-600 font-bold ${c.w || ''}`}>{c.label}</th>
                            ))}
                            {!readOnly && <th className="border border-slate-200 px-2 py-2 w-8"></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {operators.map((op, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                                <td className="border border-slate-200 px-2 py-1.5 text-center text-slate-400 font-bold">{i + 1}</td>
                                {cols.map(c => (
                                    <td key={c.key} className="border border-slate-200 px-1 py-1">
                                        <input
                                            value={op[c.key] || ''}
                                            onChange={e => updateRow(i, c.key, e.target.value)}
                                            readOnly={readOnly}
                                            className="w-full px-2 py-1 text-xs outline-none bg-transparent hover:bg-white focus:bg-white focus:border focus:border-blue-300 rounded transition"
                                        />
                                    </td>
                                ))}
                                {!readOnly && (
                                    <td className="border border-slate-200 px-1 py-1 text-center">
                                        <button onClick={() => removeRow(i)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                                            <Trash2 size={13} />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                        {operators.length === 0 && (
                            <tr><td colSpan={cols.length + 2} className="text-center py-4 text-slate-400 text-xs italic border border-slate-200">Chưa có dữ liệu</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            {!readOnly && (
                <button onClick={addRow} className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-semibold">
                    <Plus size={16} /> Thêm hàng
                </button>
            )}
        </div>
    );
}

// ─── Generic editable table ──────────────────────────────────
function EditableTable({ items, onChange, columns, readOnly, accent = 'blue' }: {
    items: any[]; onChange: (items: any[]) => void;
    columns: { key: string; label: string; w?: string }[];
    readOnly: boolean; accent?: string;
}) {
    const emptyRow = () => Object.fromEntries(columns.map(c => [c.key, '']));
    const addRow = () => onChange([...items, emptyRow()]);
    const updateRow = (i: number, key: string, val: string) =>
        onChange(items.map((row, idx) => idx === i ? { ...row, [key]: val } : row));
    const removeRow = (i: number) => onChange(items.filter((_, idx) => idx !== i));

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse border border-slate-200 min-w-[400px]">
                    <thead>
                        <tr className="bg-slate-50">
                            <th className="border border-slate-200 px-2 py-2 text-center text-slate-500 font-bold w-8">STT</th>
                            {columns.map(c => (
                                <th key={c.key} className={`border border-slate-200 px-3 py-2 text-left text-slate-600 font-bold ${c.w || ''}`}>{c.label}</th>
                            ))}
                            {!readOnly && <th className="border border-slate-200 w-8"></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50/80">
                                <td className="border border-slate-200 px-2 py-1.5 text-center text-slate-400 font-bold">{i + 1}</td>
                                {columns.map(c => (
                                    <td key={c.key} className="border border-slate-200 px-1 py-1">
                                        <input
                                            value={row[c.key] || ''}
                                            onChange={e => updateRow(i, c.key, e.target.value)}
                                            readOnly={readOnly}
                                            className="w-full px-2 py-1 text-xs outline-none bg-transparent hover:bg-white focus:bg-white focus:border focus:border-blue-300 rounded transition"
                                        />
                                    </td>
                                ))}
                                {!readOnly && (
                                    <td className="border border-slate-200 px-1 py-1 text-center">
                                        <button onClick={() => removeRow(i)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                                            <Trash2 size={13} />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                        {items.length === 0 && (
                            <tr><td colSpan={columns.length + 2} className="text-center py-4 text-slate-400 text-xs italic border border-slate-200">Chưa có dữ liệu</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            {!readOnly && (
                <button onClick={addRow} className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-semibold">
                    <Plus size={16} /> Thêm hàng
                </button>
            )}
        </div>
    );
}

function ComponentsTable({ items, onChange, readOnly }: any) {
    return <EditableTable items={items} onChange={onChange} readOnly={readOnly}
        columns={[{ key: 'name', label: 'Tên các thành phần' }, { key: 'unit', label: 'ĐVT', w: 'w-20' }, { key: 'quantity', label: 'Số lượng', w: 'w-20' }, { key: 'note', label: 'Ghi chú' }]}
    />;
}
function CertsTable({ items, onChange, readOnly }: any) {
    return <EditableTable items={items} onChange={onChange} readOnly={readOnly}
        columns={[{ key: 'number', label: 'Số GP hoặc tem kiểm định' }, { key: 'issuedBy', label: 'Đơn vị cấp' }, { key: 'expiry', label: 'Thời hạn', w: 'w-28' }, { key: 'note', label: 'Ghi chú' }]}
    />;
}
function DocsTable({ items, onChange, readOnly }: any) {
    return <EditableTable items={items} onChange={onChange} readOnly={readOnly}
        columns={[{ key: 'name', label: 'Tên tài liệu' }, { key: 'quantity', label: 'Số lượng', w: 'w-24' }, { key: 'note', label: 'Ghi chú' }]}
    />;
}
