"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function Tailor() {
 const { user } = useAuth();
 const router = useRouter();
 const [masters, setMasters] = useState<any[]>([]);
 const [selected, setSelected] = useState("");
 const [role, setRole] = useState("");
 const [jd, setJd] = useState("");
 const [loading, setLoading] = useState(false);

 useEffect(() => {
   if(user) getDocs(collection(db, 'users', user.uid, 'masterResumes')).then(s => setMasters(s.docs.map(d=>({id:d.id, ...d.data()}))));
 }, [user]);

 const generate = async () => {
   setLoading(true);
   try {
     const settings = await getDoc(doc(db, "users", user!.uid, "settings", "config"));
     const key = settings.data()?.customApiKey;
     if (!key) throw new Error("Add API Key in Settings");

     const master = masters.find(m => m.id === selected)?.data;
     const res = await fetch("/api/ai/generate", {
       method: "POST", body: JSON.stringify({ masterResume: master, jobDescription: jd, targetRole: role, userApiKey: key })
     });
     const data = await res.json();
     
     const id = `tr_${Date.now()}`;
     await setDoc(doc(db, "users", user!.uid, "tailoredResumes", id), { data, targetRole: role });
     router.push(`/editor/${id}`);
   } catch (e: any) { alert(e.message); }
   setLoading(false);
 };

 return (
   <div className="space-y-4 max-w-2xl">
     <h1 className="text-2xl font-bold">Tailor Resume</h1>
     <select value={selected} onChange={e=>setSelected(e.target.value)} className="w-full border p-2 rounded">
       <option>Select Master</option>{masters.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
     </select>
     <input value={role} onChange={e=>setRole(e.target.value)} placeholder="Target Role" className="w-full border p-2 rounded" />
     <textarea value={jd} onChange={e=>setJd(e.target.value)} placeholder="Job Description" rows={6} className="w-full border p-2 rounded" />
     <button onClick={generate} disabled={loading} className="w-full bg-blue-600 text-white p-3 rounded font-bold">
       {loading ? 'Generating...' : 'Generate AI Resume'}
     </button>
   </div>
 );
}
