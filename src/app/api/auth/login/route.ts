
import { NextResponse } from 'next/server';
import { getUserByCode, updateUserPassword, checkAnyUserExists, addUser } from '@/lib/firebase';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const { code, password } = await request.json();

        // Auto-seed if system is empty
        const hasUsers = await checkAnyUserExists();
        if (!hasUsers) {
            console.log("System empty. Seeding ADMIN user.");
            await addUser({
                code: 'ADMIN',
                name: 'Quản trị viên',
                role: 'ADMIN'
            });
        }

        if (!code) {
            return NextResponse.json({ error: 'Mã nhân viên không được để trống' }, { status: 400 });
        }

        const user: any = await getUserByCode(code);

        if (!user) {
            return NextResponse.json({ error: 'Mã nhân viên không tồn tại' }, { status: 401 });
        }

        // Case 1: First time login (No password set)
        if (!user.password) {
            if (!password) {
                return NextResponse.json({ status: 'SETUP_REQUIRED' });
            }
            // Set password
            const hashedPassword = await bcrypt.hash(password, 10);
            await updateUserPassword(user.id, hashedPassword);

            // Return user (logged in)
            const { password: _, ...userWithoutPassword } = user; // exclude password
            return NextResponse.json({ user: userWithoutPassword });
        }

        // Case 2: Normal login (Password exists)
        if (!password) {
            return NextResponse.json({ status: 'PASSWORD_REQUIRED' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return NextResponse.json({ error: 'Mật khẩu không đúng' }, { status: 401 });
        }

        const { password: _, ...userWithoutPassword } = user;
        return NextResponse.json({ user: userWithoutPassword });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
    }
}
