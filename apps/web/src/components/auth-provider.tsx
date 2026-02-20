"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getMe, logout as apiLogout } from "@/lib/api";
import { SellerProfile } from "@/lib/types";

interface User {
    id: string;
    email: string;
    profile?: SellerProfile | null;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    refresh: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    refresh: async () => { },
    logout: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const fetchUser = async () => {
        try {
            const data = await getMe();
            setUser(data);
        } catch (e) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await apiLogout();
            setUser(null);
            router.push("/login");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    useEffect(() => {
        if (loading) return;

        const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/otp") || pathname === "/auth";
        const isPublicPage = pathname === "/" || pathname.startsWith("/vendor") || pathname.startsWith("/invite");

        if (!user && !isAuthPage && !isPublicPage) {
            router.push("/login");
        } else if (user && isAuthPage) {
            router.push("/dashboard");
        }
    }, [user, loading, pathname, router]);

    return (
        <AuthContext.Provider value={{ user, loading, refresh: fetchUser, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
