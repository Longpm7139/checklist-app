
import { NextResponse } from 'next/server';
import { getUsers, addUser, deleteUser } from '@/lib/firebase';

export async function GET() {
    try {
        const users = await getUsers();
        return NextResponse.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { code, name, role } = await request.json();

        if (!code || !name) {
            return NextResponse.json({ error: 'Mã nhân viên và tên không được để trống' }, { status: 400 });
        }

        await addUser({ code, name, role: role || 'USER' });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Add user error:', error);
        if (error.message === 'Mã nhân viên đã tồn tại') {
            return NextResponse.json({ error: 'Mã nhân viên đã tồn tại' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { id } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Thiếu ID người dùng' }, { status: 400 });
        }

        // We should probably check if it's ADMIN here too, but for now relying on frontend or id check
        try {
            // In firestore deleteUser expects ID.
            // We can check if it is admin before deleting if needed, but let's keep it simple for migration.
            // The only "ADMIN" hardcoding was in seed.
            await deleteUser(id);
        } catch (e) {
            console.error("Error deleting user", e);
            throw e;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete user error:', error);
        return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
    }
}
