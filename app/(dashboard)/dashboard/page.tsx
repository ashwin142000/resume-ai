"use client";
import { useAuth } from "@/components/providers/AuthProvider";
import Link from "next/link";

export default function Dashboard() {
 const { user } = useAuth();
 return (
   <div className="space-y-6">
     <h1 className="text-3xl font-bold">Welcome, {user?.email}</h1>
     <p className="text-gray-500">Select an action from the menu to begin tailoring your resume.</p>
     
     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
       <Link href="/master-resumes" className="block p-6 bg-white rounded-xl border hover:shadow-md transition">
         <h3 className="font-bold text-lg">Manage Master Resumes</h3>
         <p className="text-sm text-gray-500 mt-1">Create or edit your base professional profile.</p>
       </Link>
       <Link href="/tailor" className="block p-6 bg-white rounded-xl border hover:shadow-md transition">
         <h3 className="font-bold text-lg">Tailor a Resume</h3>
         <p className="text-sm text-gray-500 mt-1">Use AI to target a specific job description.</p>
       </Link>
     </div>
   </div>
 );
}