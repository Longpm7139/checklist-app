
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import LoginModal from '@/components/LoginModal';

interface User {
    code: string;
    name: string;
    role: string;
}

interface UserContextType {
    user: User | null;
    login: (user: User) => void;
    logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const savedUser = localStorage.getItem('checklist_user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
    }, []);

    const login = (newUser: User) => {
        setUser(newUser);
        localStorage.setItem('checklist_user', JSON.stringify(newUser));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('checklist_user');
    };

    if (!isMounted) return null;

    return (
        <UserContext.Provider value={{ user, login, logout }}>
            {user ? children : <LoginModal onLoginSuccess={login} />}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
