
import { NextResponse } from 'next/server';
import { getUserByCode, updateUserPassword } from '@/lib/firebase';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const { code, currentPassword, newPassword } = await request.json();

        if (!code || !currentPassword || !newPassword) {
            return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });
        }

        if (newPassword.length < 4) {
            return NextResponse.json({ error: 'Mật khẩu mới phải có ít nhất 4 ký tự' }, { status: 400 });
        }

        const user: any = await getUserByCode(code);

        if (!user) {
            return NextResponse.json({ error: 'Người dùng không tồn tại' }, { status: 404 });
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            return NextResponse.json({ error: 'Mật khẩu hiện tại không đúng' }, { status: 401 });
        }

        // Update password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await updateUserPassword(user.id, hashedPassword);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Change password error:', error);
        return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
    }
}
