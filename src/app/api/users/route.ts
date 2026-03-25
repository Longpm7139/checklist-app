
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
        const role = request.headers.get('x-user-role');
        if (role !== 'ADMIN') {
            return NextResponse.json({ error: 'Không có quyền thực hiện hành động này' }, { status: 403 });
        }

        const { code, name, role: userRole } = await request.json();

        if (!code || !name) {
            return NextResponse.json({ error: 'Mã nhân viên và tên không được để trống' }, { status: 400 });
        }

        await addUser({ code, name, role: userRole || 'USER' });

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
        const role = request.headers.get('x-user-role');
        if (role !== 'ADMIN') {
            return NextResponse.json({ error: 'Không có quyền thực hiện hành động này' }, { status: 403 });
        }

        const { id } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Thiếu ID người dùng' }, { status: 400 });
        }

        await deleteUser(id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete user error:', error);
        return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
    }
}
