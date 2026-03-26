'use client';

import React, { useRef, useState } from 'react';
import { Camera, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { uploadImage } from '@/lib/firebase';
import clsx from 'clsx';

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    path: string;
    disabled?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ value, onChange, path, disabled }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const url = await uploadImage(file, path);
            onChange(url);
        } catch (error) {
            console.error("Upload error:", error);
            alert("Lỗi khi tải ảnh lên. Vui lòng thử lại.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemove = () => {
        if (confirm("Xác nhận xóa ảnh này?")) {
            onChange('');
        }
    };

    return (
        <div className="flex items-center gap-2">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                disabled={disabled || isUploading}
            />

            {!value ? (
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || isUploading}
                    className={clsx(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition shadow-sm",
                        isUploading ? "bg-slate-100 text-slate-400" : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
                    )}
                    title="Chụp ảnh minh họa"
                >
                    {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                    {isUploading ? "ĐANG TẢI..." : "CHỤP ẢNH"}
                </button>
            ) : (
                <div className="relative group">
                    <img
                        src={value}
                        alt="Preview"
                        className="w-12 h-12 object-cover rounded-lg border border-slate-300 shadow-sm cursor-pointer hover:opacity-80 transition"
                        onClick={() => window.open(value, '_blank')}
                    />
                    {!disabled && (
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600 transition"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
