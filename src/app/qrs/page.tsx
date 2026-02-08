'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Printer, ExternalLink } from 'lucide-react';
import QRCode from "react-qr-code";
import { SystemCheck } from '@/lib/types';
import { useUser } from '@/providers/UserProvider';

export default function QRPage() {
    const router = useRouter();
    const { user } = useUser();
    const [systems, setSystems] = useState<SystemCheck[]>([]);
    const [baseUrl, setBaseUrl] = useState('');

    useEffect(() => {
        // Load systems
        const saved = localStorage.getItem('checklist_systems');
        if (saved) {
            setSystems(JSON.parse(saved));
        }
        // Base URL
        setBaseUrl(window.location.origin);
    }, []);

    if (user?.role !== 'ADMIN') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-2">Truy cập bị từ chối</h1>
                    <button onClick={() => router.push('/')} className="px-4 py-2 bg-blue-600 text-white rounded">Về trang chủ</button>
                </div>
            </div>
        );
    }

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-white p-8 font-sans text-slate-900 print:p-0">
            {/* Header - Hidden on Print */}
            <div className="max-w-5xl mx-auto print:hidden mb-8 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/')} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold uppercase text-slate-800">Kho Mã QR</h1>
                        <p className="text-slate-500">In mã này và dán lên thiết bị để quét kiểm tra.</p>
                    </div>
                </div>
                <button
                    onClick={handlePrint}
                    className="px-4 py-2 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700 flex items-center gap-2"
                >
                    <Printer size={20} /> In Danh Sách (A4)
                </button>
            </div>

            {/* QR Grid */}
            <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-8 print:grid-cols-2 print:gap-4">
                {systems.map(sys => {
                    const checkUrl = `${baseUrl}/check/${sys.id}`;
                    return (
                        <div key={sys.id} className="border-2 border-slate-900 rounded-xl p-6 flex flex-col items-center text-center break-inside-avoid shadow-sm hover:shadow-lg transition">
                            <h2 className="text-xl font-bold uppercase mb-2 text-slate-900">{sys.name}</h2>
                            <div className="bg-white p-2">
                                <QRCode
                                    value={checkUrl}
                                    size={150}
                                    level={'H'}
                                />
                            </div>
                            <div className="mt-3 text-sm font-mono text-slate-500">ID: {sys.id}</div>
                            <div className="mt-1 text-xs text-slate-400 print:hidden">{checkUrl}</div>
                        </div>
                    );
                })}
            </div>

            <style jsx global>{`
                @media print {
                    @page { margin: 1cm; }
                    body { background: white; }
                    .print\\:hidden { display: none; }
                    .print\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                    .print\\:gap-4 { gap: 1rem; }
                    .break-inside-avoid { break-inside: avoid; }
                }
            `}</style>
        </div>
    );
}
