"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Loader2, Wand2 } from "lucide-react";

export default function Tailor() {
  const { user } = useAuth();
  const router = useRouter();
  const [masters, setMasters] = useState<any[]>([]);
  const [selected, setSelected] = useState("");
  const [role, setRole] = useState("");
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if(user) getDocs(collection(db, 'users', user.uid, 'masterResumes')).then(s => setMasters(s.docs.map(d=>({id:d.id, ...d.data()}))));
  }, [user]);

  const generate = async () => {
    if (!selected || !role || !jd) {
      setErrorMsg("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    try {
      const settings = await getDoc(doc(db, "users", user!.uid, "settings", "config"));
      // FIX: Fetch specifically the Groq API Key
      const key = settings.data()?.groqApiKey;
      if (!key) throw new Error("Please add your Groq API Key in the Settings page.");

      const master = masters.find(m => m.id === selected)?.data;
      
      const res = await fetch("/api/ai/generate", {
        method: "POST", 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterResume: master, jobDescription: jd, targetRole: role, userApiKey: key })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate resume from AI.");
      }
      
      const id = `tr_${Date.now()}`;
      await setDoc(doc(db, "users", user!.uid, "tailoredResumes", id), { 
          data, 
          targetRole: role,
          createdAt: serverTimestamp() 
      });
      router.push(`/editor/${id}`);
      
    } catch (e: any) { 
        setErrorMsg(e.message); 
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tailor Resume</h1>
        <p className="text-gray-500 text-sm mt-1">Generate a highly targeted resume based on a job description using Groq Llama 3.</p>
      </div>
      
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-5">
        {errorMsg && (
          <div className="p-4 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
            <strong>Error:</strong> {errorMsg}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Select Master Resume</label>
          <select value={selected} onChange={e=>setSelected(e.target.value)} className="w-full border p-2.5 rounded-md bg-gray-50">
            <option value="">-- Select Master --</option>
            {masters.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </div>
        
        <div>
           <label className="block text-sm font-medium mb-1">Target Role / Job Title</label>
           <input value={role} onChange={e=>setRole(e.target.value)} placeholder="e.g. Senior React Developer" className="w-full border p-2.5 rounded-md bg-gray-50" />
        </div>

        <div>
           <label className="block text-sm font-medium mb-1">Job Description</label>
           <textarea value={jd} onChange={e=>setJd(e.target.value)} placeholder="Paste the Job Description here..." rows={6} className="w-full border p-2.5 rounded-md bg-gray-50" />
        </div>

        <button onClick={generate} disabled={loading || !selected || !jd || !role} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-md font-medium flex justify-center items-center gap-2 disabled:opacity-50 transition">
          {loading ? <><Loader2 className="animate-spin" size={18}/> Tailoring with Groq AI...</> : <><Wand2 size={18}/> Generate Tailored Resume</>}
        </button>
      </div>
    </div>
  );
}
