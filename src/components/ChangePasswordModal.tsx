
'use client';

import { useState } from 'react';
import { X, Lock } from 'lucide-react';

interface ChangePasswordModalProps {
    userCode: string;
    onClose: () => void;
}

export default function ChangePasswordModal({ userCode, onClose }: ChangePasswordModalProps) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (newPassword !== confirmPassword) {
            setError('Mật khẩu mới không khớp');
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: userCode,
                    currentPassword,
                    newPassword
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Đổi mật khẩu thất bại');
            }

            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 1500);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Lock size={20} className="text-blue-600" /> Đổi Mật Khẩu
                </h2>

                {success ? (
                    <div className="text-center p-8 text-green-600 font-bold">
                        Đổi mật khẩu thành công!
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu hiện tại</label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none"
                                placeholder="Nhập mật khẩu cũ"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu mới</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none"
                                placeholder="Tối thiểu 4 ký tự"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nhập lại mật khẩu mới</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none"
                                placeholder="Xác nhận mật khẩu mới"
                            />
                        </div>

                        {error && (
                            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow transition disabled:opacity-50"
                            >
                                {loading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
