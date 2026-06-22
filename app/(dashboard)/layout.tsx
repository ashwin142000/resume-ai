"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, LayoutDashboard, Briefcase, Wand2, Settings, LogOut, Menu, X } from "lucide-react";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const handleLogout = () => signOut(auth);

  const nav = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Master Resumes", href: "/master-resumes", icon: Briefcase },
    { name: "Tailor Resume", href: "/tailor", icon: Wand2 },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <FileText className="text-blue-600" /> ResumeAI
        </h1>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-gray-600">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 absolute w-full z-50">
          <nav className="flex flex-col p-4 space-y-2">
            {nav.map(i => {
              const Icon = i.icon;
              const active = pathname.startsWith(i.href);
              return (
                <Link key={i.name} href={i.href} onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-600'}`}>
                  <Icon size={18} /> {i.name}
                </Link>
              )
            })}
            <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-3 text-red-600 font-medium text-sm">
              <LogOut size={18}/> Logout
            </button>
          </nav>
        </div>
      )}

      {/* Desktop Sidebar */}
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

      {/* Main Content */}
      <main className="flex-1 h-[calc(100vh-64px)] md:h-screen overflow-auto p-4 md:p-8 print:p-0 print:overflow-visible">
        {children}
      </main>
    </div>
  );
}
