"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { db } from "@/lib/firebase/config";
import { collection, doc, setDoc, getDocs, serverTimestamp } from "firebase/firestore";

export default function MasterResumes() {
 const { user } = useAuth();
 const [resumes, setResumes] = useState<any[]>([]);
 const [title, setTitle] = useState("");

 useEffect(() => {
   if (!user) return;
   getDocs(collection(db, 'users', user.uid, 'masterResumes')).then(snap => {
     setResumes(snap.docs.map(d => ({id: d.id, ...d.data()})));
   });
 }, [user]);

 const handleCreate = async () => {
   if(!title) return;
   const id = `mr_${Date.now()}`;
   const emptyData = { personalInfo: {}, summary: "", skills: [], experience: [], education: [] };
   await setDoc(doc(db, 'users', user!.uid, 'masterResumes', id), { title, data: emptyData, updatedAt: serverTimestamp() });
   window.location.reload();
 };

 return (
   <div className="space-y-6">
     <h1 className="text-2xl font-bold">Master Resumes</h1>
     <div className="flex gap-4">
       <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="New Master Resume Title" className="border p-2 rounded-md" />
       <button onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded-md">Create</button>
     </div>
     <div className="grid gap-4 mt-6">
       {resumes.map(r => (
          <div key={r.id} className="p-4 bg-white border rounded-lg shadow-sm">
            <h3 className="font-bold">{r.title}</h3>
            <p className="text-xs text-gray-500">ID: {r.id}</p>
          </div>
       ))}
     </div>
   </div>
 );
}