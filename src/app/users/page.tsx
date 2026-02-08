
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, Trash2 } from 'lucide-react';
import { useUser } from '@/providers/UserProvider';

interface User {
    id: number;
    code: string;
    name: string;
    role: string;
}

export default function UsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [newUser, setNewUser] = useState({ code: '', name: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { user: currentUser } = useUser();

    // Protect Route
    useEffect(() => {
        const checkAuth = async () => {
            // Give a small delay for user state to restore
            await new Promise(r => setTimeout(r, 500));

            // We can't easily check 'loading' state of user provider here 
            // without modifying provider, but checking currentUser is a start.
            // Ideally UserProvider should expose 'isLoading'.
            // For now, if no user or not admin after a short wait, redirect.

            const savedUser = localStorage.getItem('checklist_user');
            if (savedUser) {
                const u = JSON.parse(savedUser);
                if (u.role !== 'ADMIN') {
                    router.push('/');
                }
            } else {
                router.push('/');
            }
        };
        checkAuth();
    }, [router]);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            setUsers(data.users || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDeleteUser = async (id: number) => {
        if (!confirm('Bạn có chắc muốn xóa nhân viên này không?')) return;

        try {
            const res = await fetch('/api/users', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            fetchUsers();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUser.code || !newUser.name) return;

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                body: JSON.stringify(newUser),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            setNewUser({ code: '', name: '' });
            fetchUsers();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900">
            <div className="max-w-4xl mx-auto">
                <header className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.push('/')} className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-100">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <h1 className="text-2xl font-bold">Quản Lý Nhân Viên</h1>
                </header>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* List Users */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                            Danh sách nhân viên
                        </div>
                        <div className="divide-y divide-slate-100">
                            {users.map(u => (
                                <div key={u.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                                    <div>
                                        <div className="font-bold text-blue-800">{u.name}</div>
                                        <div className="text-sm text-slate-500 font-mono">{u.code}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-600">{u.role}</span>
                                        {u.code !== 'ADMIN' && u.code !== currentUser?.code && (
                                            <button
                                                onClick={() => handleDeleteUser(u.id)}
                                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                                title="Xóa nhân viên"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {users.length === 0 && <div className="p-8 text-center text-slate-400 italic">Chưa có nhân viên nào.</div>}
                        </div>
                    </div>

                    {/* Add User Form */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <UserPlus size={20} className="text-blue-600" /> Thêm nhân viên mới
                        </h2>
                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Mã Nhân Viên</label>
                                <input
                                    className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none uppercase"
                                    placeholder="VD: NV002"
                                    value={newUser.code}
                                    onChange={e => setNewUser({ ...newUser, code: e.target.value.toUpperCase() })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Họ và Tên</label>
                                <input
                                    className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none"
                                    placeholder="VD: Trần Văn B"
                                    value={newUser.name}
                                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                />
                            </div>

                            {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}

                            <button
                                disabled={loading}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow transition disabled:opacity-50"
                            >
                                {loading ? 'Đang thêm...' : 'Thêm Nhân Viên'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
