"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useRouter, usePathname } from "next/navigation";

const AuthContext = createContext<{ user: User | null; loading: boolean }>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
 const [user, setUser] = useState<User | null>(null);
 const [loading, setLoading] = useState(true);
 const router = useRouter();
 const pathname = usePathname();

 useEffect(() => {
   const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
     setUser(currentUser);
     setLoading(false);
     
     const isAuthRoute = pathname === '/login';
     if (!currentUser && !isAuthRoute) router.push('/login');
     if (currentUser && isAuthRoute) router.push('/dashboard');
     if (currentUser && pathname === '/') router.push('/dashboard');
   });
   return () => unsubscribe();
 }, [pathname, router]);

 return <AuthContext.Provider value={{ user, loading }}>{!loading && children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
