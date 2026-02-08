
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface LoginModalProps {
    onLoginSuccess: (user: { code: string; name: string; role: string }) => void;
}

export default function LoginModal({ onLoginSuccess }: LoginModalProps) {
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [step, setStep] = useState<'CODE' | 'PASSWORD' | 'SETUP'>('CODE');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const payload: any = { code };
            if (step !== 'CODE') payload.password = password;

            // Validate setup matching
            if (step === 'SETUP') {
                if (password.length < 4) throw new Error('Mật khẩu phải có ít nhất 4 ký tự');
                if (password !== confirmPassword) throw new Error('Mật khẩu nhập lại không khớp');
            }

            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Đăng nhập thất bại');
            }

            // Handle Step Transitions
            if (data.status === 'SETUP_REQUIRED') {
                setStep('SETUP');
                setLoading(false);
                return;
            }

            if (data.status === 'PASSWORD_REQUIRED') {
                setStep('PASSWORD');
                setLoading(false);
                return;
            }

            // Success
            if (data.user) {
                onLoginSuccess(data.user);
            }

        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        } finally {
            // setLoading(false); // Removed from finally as it's handled in catch and step transitions
        }
    };

    const reset = () => {
        setStep('CODE');
        setPassword('');
        setConfirmPassword('');
        setError('');
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
                    {step === 'SETUP' ? 'Tạo Mật Khẩu' : 'Đăng Nhập'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className={step !== 'CODE' ? 'hidden' : 'block'}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Mã Nhân Viên
                        </label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                            placeholder="Nhập mã nhân viên (vídụ: NV001)"
                            autoFocus={step === 'CODE'}
                            disabled={loading}
                        />
                    </div>

                    {step === 'PASSWORD' && (
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-slate-700">Mật khẩu</label>
                                <button type="button" onClick={reset} className="text-xs text-blue-600 hover:underline">Quay lại</button>
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                placeholder="Nhập mật khẩu"
                                autoFocus
                                disabled={loading}
                            />
                        </div>
                    )}

                    {step === 'SETUP' && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 text-blue-800 p-3 rounded text-sm mb-4">
                                Đây là lần đầu bạn đăng nhập. Vui lòng tạo mật khẩu mới để bảo mật tài khoản.
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu mới</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    placeholder="Tối thiểu 4 ký tự"
                                    autoFocus
                                    disabled={loading}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nhập lại mật khẩu</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    placeholder="Xác nhận mật khẩu"
                                    disabled={loading}
                                />
                            </div>
                            <div className="text-right">
                                <button type="button" onClick={reset} className="text-sm text-slate-500 hover:underline">Quay lại</button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition disabled:opacity-50"
                    >
                        {loading ? 'Đang xử lý...' : (step === 'CODE' ? 'Tiếp tục' : (step === 'SETUP' ? 'Tạo mật khẩu & Đăng nhập' : 'Đăng nhập'))}
                    </button>
                </form>

                {step === 'CODE' && (
                    <div className="mt-4 text-center text-sm text-slate-500">
                        Liên hệ quản trị viên nếu chưa có tài khoản.
                    </div>
                )}
            </div>
        </div>
    );
}
