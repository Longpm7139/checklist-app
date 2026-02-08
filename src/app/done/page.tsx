'use client';

import { useRouter } from 'next/navigation';
import { Home, CheckCircle2 } from 'lucide-react';

export default function DonePage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-100">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>

                <h1 className="text-2xl font-bold text-slate-800 mb-2">Hoàn thành kiểm tra</h1>
                <p className="text-slate-500 mb-8">
                    Dữ liệu đã được lưu lại. Bạn có thể quay lại trang chủ để tiếp tục theo dõi trạng thái hệ thống.
                </p>

                <button
                    onClick={() => router.push('/')}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
                >
                    <Home size={20} />
                    Về trang chủ
                </button>
            </div>
        </div>
    );
}
