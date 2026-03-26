'use client';

import React from 'react';
import { Camera, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TestCameraPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 space-y-6">
            <h1 className="text-2xl font-black text-center text-slate-800">
                TRANG KIỂM TRA CAMERA TRỰC TIẾP
            </h1>
            
            <div className="bg-white p-10 rounded-3xl shadow-2xl border-4 border-red-500 w-full max-w-sm flex flex-col items-center gap-6">
                <p className="text-center font-bold text-slate-600">
                    Nếu bạn thấy nút dưới đây, hãy bấm để mở Camera điện thoại:
                </p>
                
                <label className="w-full">
                    <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) alert(`BẠN ĐÃ CHỌN ẢNH: ${file.name}\nKích thước: ${Math.round(file.size/1024)} KB`);
                        }}
                    />
                    <div className="w-full bg-red-600 hover:bg-red-700 text-white p-8 rounded-2xl flex flex-col items-center gap-4 cursor-pointer active:scale-95 transition-all shadow-lg">
                        <Camera size={64} />
                        <span className="text-xl font-black">MỞ CAMERA NGAY</span>
                    </div>
                </label>
            </div>

            <button 
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-800 transition"
            >
                <ArrowLeft size={20} /> Quay lại trang chủ
            </button>
            
            <p className="text-[10px] text-slate-400 font-mono">Build ID: {new Date().getTime()}</p>
        </div>
    );
}
