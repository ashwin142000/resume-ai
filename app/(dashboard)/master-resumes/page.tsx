"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { db } from "@/lib/firebase/config";
import { collection, doc, setDoc, getDocs, serverTimestamp, deleteDoc } from "firebase/firestore";
import { Plus, Edit3, Trash2, Save, ChevronLeft } from "lucide-react";

const emptyResume = {
  personalInfo: { fullName: "", email: "", phone: "", location: "", linkedin: "", portfolio: "" },
  summary: "", skills: [], experience: [], education: []
};

export default function MasterResumes() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Editor States
  const [title, setTitle] = useState("");
  const [data, setData] = useState<any>(emptyResume);
  const [saving, setSaving] = useState(false);

  // Fetch Resumes
  useEffect(() => {
    if (!user) return;
    fetchResumes();
  }, [user]);

  const fetchResumes = async () => {
    const snap = await getDocs(collection(db, 'users', user!.uid, 'masterResumes'));
    setResumes(snap.docs.map(d => ({id: d.id, ...d.data()})));
  };

  const handleCreateNew = () => {
    setTitle("");
    setData(emptyResume);
    setActiveId("new");
  };

  const handleEdit = (resume: any) => {
    setTitle(resume.title);
    setData(resume.data || emptyResume);
    setActiveId(resume.id);
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Delete this master resume?")) return;
    await deleteDoc(doc(db, 'users', user!.uid, 'masterResumes', id));
    fetchResumes();
  };

  const handleSave = async () => {
    if(!title.trim()) { alert("Please provide a title!"); return; }
    setSaving(true);
    const id = activeId === "new" ? `mr_${Date.now()}` : activeId!;
    await setDoc(doc(db, 'users', user!.uid, 'masterResumes', id), { 
      title, data, updatedAt: serverTimestamp() 
    }, { merge: true });
    
    await fetchResumes();
    setActiveId(null);
    setSaving(false);
  };

  const updateField = (key: string, value: any) => setData({ ...data, [key]: value });

  // --- LIST VIEW ---
  if (!activeId) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Master Resumes</h1>
          <button onClick={handleCreateNew} className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium">
            <Plus size={16}/> New Master
          </button>
        </div>

        {resumes.length === 0 ? (
          <div className="text-center py-12 bg-white border border-dashed rounded-xl text-gray-500">
            No master resumes yet. Create one to start tailoring!
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {resumes.map(r => (
               <div key={r.id} className="p-5 bg-white border rounded-xl shadow-sm flex flex-col justify-between">
                 <div>
                    <h3 className="font-bold text-lg">{r.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">ID: {r.id}</p>
                 </div>
                 <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                    <button onClick={() => handleEdit(r)} className="text-blue-600 flex items-center gap-1 text-sm font-medium"><Edit3 size={16}/> Edit</button>
                    <button onClick={() => handleDelete(r.id)} className="text-red-600 flex items-center gap-1 text-sm font-medium"><Trash2 size={16}/> Delete</button>
                 </div>
               </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- EDITOR VIEW ---
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 bg-white p-4 border rounded-xl shadow-sm sticky top-0 z-10">
        <button onClick={() => setActiveId(null)} className="p-2 bg-gray-100 rounded-md text-gray-600"><ChevronLeft size={20}/></button>
        <input 
          value={title} onChange={(e) => setTitle(e.target.value)} 
          placeholder="Resume Title (e.g., Senior Dev Master)" 
          className="flex-1 text-lg font-bold border-none focus:ring-0 p-0 bg-transparent"
        />
        <button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium disabled:opacity-50">
          {saving ? 'Saving...' : <><Save size={16}/> Save</>}
        </button>
      </div>

      <div className="bg-white border rounded-xl shadow-sm p-5 space-y-6">
        
        {/* Personal Info */}
        <section>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2">Personal Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label><input type="text" className="w-full border rounded-md p-2 text-sm" value={data.personalInfo?.fullName || ""} onChange={e => updateField('personalInfo', {...data.personalInfo, fullName: e.target.value})} /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Email</label><input type="text" className="w-full border rounded-md p-2 text-sm" value={data.personalInfo?.email || ""} onChange={e => updateField('personalInfo', {...data.personalInfo, email: e.target.value})} /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Phone</label><input type="text" className="w-full border rounded-md p-2 text-sm" value={data.personalInfo?.phone || ""} onChange={e => updateField('personalInfo', {...data.personalInfo, phone: e.target.value})} /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">LinkedIn/Portfolio URL</label><input type="text" className="w-full border rounded-md p-2 text-sm" value={data.personalInfo?.linkedin || ""} onChange={e => updateField('personalInfo', {...data.personalInfo, linkedin: e.target.value})} /></div>
          </div>
        </section>

        {/* Summary */}
        <section>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2">Professional Summary</h2>
          <textarea rows={4} className="w-full border rounded-md p-2 text-sm" value={data.summary || ""} onChange={e => updateField('summary', e.target.value)} />
        </section>

        {/* Skills */}
        <section>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2">Skills</h2>
          <textarea rows={2} placeholder="React, Node.js, Python, Sales..." className="w-full border rounded-md p-2 text-sm" value={data.skills?.join(", ") || ""} onChange={e => updateField('skills', e.target.value.split(',').map(s=>s.trim()))} />
          <p className="text-xs text-gray-500 mt-1">Separate skills with commas</p>
        </section>

        {/* Experience - Array Editor */}
        <section>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2">Experience</h2>
          <div className="space-y-4">
            {(data.experience || []).map((exp: any, i: number) => (
              <div key={i} className="p-4 bg-gray-50 border rounded-lg relative">
                <button onClick={() => { const newExp = [...data.experience]; newExp.splice(i, 1); updateField('experience', newExp); }} className="absolute top-3 right-3 text-red-500"><Trash2 size={16}/></button>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div><label className="block text-xs mb-1">Job Title</label><input type="text" className="w-full border rounded p-2 text-sm bg-white" value={exp.title} onChange={e => {const n=[...data.experience]; n[i].title = e.target.value; updateField('experience', n);}} /></div>
                  <div><label className="block text-xs mb-1">Company</label><input type="text" className="w-full border rounded p-2 text-sm bg-white" value={exp.company} onChange={e => {const n=[...data.experience]; n[i].company = e.target.value; updateField('experience', n);}} /></div>
                </div>
                <div className="mb-3"><label className="block text-xs mb-1">Dates (e.g., Jan 2020 - Present)</label><input type="text" className="w-full border rounded p-2 text-sm bg-white" value={exp.date} onChange={e => {const n=[...data.experience]; n[i].date = e.target.value; updateField('experience', n);}} /></div>
                <div>
                  <label className="block text-xs mb-1">Description Bullets (One per line)</label>
                  <textarea rows={4} className="w-full border rounded p-2 text-sm bg-white" value={exp.description?.join('\n') || ""} onChange={e => {const n=[...data.experience]; n[i].description = e.target.value.split('\n'); updateField('experience', n);}} />
                </div>
              </div>
            ))}
            <button onClick={() => updateField('experience', [...(data.experience||[]), {title:"", company:"", date:"", description:[]}])} className="text-sm font-medium text-blue-600">+ Add Experience</button>
          </div>
        </section>

      </div>
    </div>
  );
}
