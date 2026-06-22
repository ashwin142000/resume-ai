"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, LayoutDashboard, Briefcase, Wand2, Settings, LogOut } from "lucide-react";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
 const pathname = usePathname();
 const handleLogout = () => signOut(auth);

 const nav = [
   { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
   { name: "Master Resumes", href: "/master-resumes", icon: Briefcase },
   { name: "Tailor Resume", href: "/tailor", icon: Wand2 },
   { name: "Settings", href: "/settings", icon: Settings },
 ];

 return (
   <div className="min-h-screen flex">
     <aside className="w-64 bg-white border-r hidden md:flex flex-col print:hidden">
       <div className="p-6">
         <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="text-blue-600" /> ResumeAI</h1>
       </div>
       <nav className="flex-1 px-4 space-y-2">
         {nav.map(i => {
           const Icon = i.icon;
           const active = pathname.startsWith(i.href);
           return (
             <Link key={i.name} href={i.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>
               <Icon size={18} /> {i.name}
             </Link>
           )
         })}
       </nav>
       <button onClick={handleLogout} className="m-4 flex items-center gap-2 text-gray-500 hover:text-gray-900 p-2"><LogOut size={18}/> Logout</button>
     </aside>
     <main className="flex-1 h-screen overflow-auto p-4 md:p-8 print:p-0 print:overflow-visible">{children}</main>
   </div>
 );
}