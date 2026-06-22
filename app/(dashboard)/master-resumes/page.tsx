"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { db } from "@/lib/firebase/config";
import { collection, doc, setDoc, getDoc, getDocs, serverTimestamp, deleteDoc } from "firebase/firestore";
import { Plus, Edit3, Trash2, Save, ChevronLeft, UploadCloud, Loader2 } from "lucide-react";

const emptyResume = {
  personalInfo: { fullName: "", role: "", email: "", phone: "", location: "", linkedin: "", github: "", portfolio: "" },
  summary: "", skills: [], experience: [], projects: [], education: [], certifications: []
};

export default function MasterResumes() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [resumes, setResumes] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const [title, setTitle] = useState("");
  const [data, setData] = useState<any>(emptyResume);
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);

  useEffect(() => {
    if (user) fetchResumes();
  }, [user]);

  const fetchResumes = async () => {
    const snap = await getDocs(collection(db, 'users', user!.uid, 'masterResumes'));
    setResumes(snap.docs.map(d => ({id: d.id, ...d.data()})));
  };

  const handleCreateNew = () => {
    setTitle(""); setData(emptyResume); setActiveId("new");
  };

  const handleEdit = (resume: any) => {
    setTitle(resume.title); setData(resume.data || emptyResume); setActiveId(resume.id);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so you can upload the same file again if it fails
    if (fileInputRef.current) fileInputRef.current.value = "";

    // 1. Check File Size (Max 3MB to prevent Vercel 413 Payload Too Large error)
    if (file.size > 3 * 1024 * 1024) {
      alert("File is too large! Please ensure your PDF is smaller than 3MB.");
      return;
    }
    
    setParsing(true);
    try {
      const settingsDoc = await getDoc(doc(db, "users", user!.uid, "settings", "config"));
      const apiKey = settingsDoc.data()?.customApiKey;
      if (!apiKey) throw new Error("Missing AI API Key! Please go to the Settings page and enter your Gemini API Key.");

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          
          const res = await fetch('/api/ai/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Pdf: base64, userApiKey: apiKey })
          });

          // 2. Properly extract the REAL error message without masking it
          if (!res.ok) {
             let errorMsg = `Server Error (${res.status})`;
             try {
               const errJson = await res.json();
               errorMsg = errJson.error || errorMsg;
             } catch {
               errorMsg = `Server Error (${res.status}): Vercel timeout or payload limits exceeded.`;
             }
             throw new Error(errorMsg);
          }

          const parsedData = await res.json();
          setData(parsedData);
          if(!title) setTitle(`${parsedData.personalInfo?.fullName || 'My'} Resume`);
          
          alert("Resume parsed successfully! Please review the fields.");
        } catch (innerErr: any) {
          alert(`Parsing Failed: ${innerErr.message}`);
        } finally {
          setParsing(false);
        }
      };
      reader.onerror = () => { throw new Error("Failed to read the file from your device."); };
    } catch(err: any) {
      alert(err.message);
      setParsing(false);
    }
  };

  const updateField = (key: string, value: any) => setData({ ...data, [key]: value });

  if (!activeId) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Master Resumes</h1>
          <button onClick={handleCreateNew} className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium hover:bg-blue-700 transition">
            <Plus size={16}/> New Master
          </button>
        </div>
        {resumes.length === 0 ? (
          <div className="text-center py-12 bg-white border border-dashed rounded-xl text-gray-500">No master resumes yet. Create one to start tailoring!</div>
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

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      
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

      <div className="bg-blue-50 border border-blue-200 p-5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-blue-900">Autofill with AI</h3>
          <p className="text-sm text-blue-700">Upload your existing PDF resume and AI will fill out all the fields below automatically.</p>
        </div>
        <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
        <button onClick={() => fileInputRef.current?.click()} disabled={parsing} className="whitespace-nowrap bg-white border border-blue-300 text-blue-700 px-4 py-2 rounded-md flex items-center gap-2 text-sm font-bold shadow-sm hover:bg-blue-100 transition disabled:opacity-50">
          {parsing ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
          {parsing ? 'Parsing PDF...' : 'Upload PDF'}
        </button>
      </div>

      <div className="bg-white border rounded-xl shadow-sm p-5 space-y-8">
        <section>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2">Personal Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label><input type="text" className="w-full border rounded-md p-2 text-sm" value={data.personalInfo?.fullName || ""} onChange={e => updateField('personalInfo', {...data.personalInfo, fullName: e.target.value})} /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Target Role / Headline</label><input type="text" placeholder="e.g. FullStack Developer" className="w-full border rounded-md p-2 text-sm" value={data.personalInfo?.role || ""} onChange={e => updateField('personalInfo', {...data.personalInfo, role: e.target.value})} /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Email</label><input type="text" className="w-full border rounded-md p-2 text-sm" value={data.personalInfo?.email || ""} onChange={e => updateField('personalInfo', {...data.personalInfo, email: e.target.value})} /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Phone</label><input type="text" className="w-full border rounded-md p-2 text-sm" value={data.personalInfo?.phone || ""} onChange={e => updateField('personalInfo', {...data.personalInfo, phone: e.target.value})} /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Location</label><input type="text" className="w-full border rounded-md p-2 text-sm" value={data.personalInfo?.location || ""} onChange={e => updateField('personalInfo', {...data.personalInfo, location: e.target.value})} /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">LinkedIn URL</label><input type="text" className="w-full border rounded-md p-2 text-sm" value={data.personalInfo?.linkedin || ""} onChange={e => updateField('personalInfo', {...data.personalInfo, linkedin: e.target.value})} /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">GitHub URL</label><input type="text" className="w-full border rounded-md p-2 text-sm" value={data.personalInfo?.github || ""} onChange={e => updateField('personalInfo', {...data.personalInfo, github: e.target.value})} /></div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2">Professional Summary</h2>
          <textarea rows={4} className="w-full border rounded-md p-2 text-sm" value={data.summary || ""} onChange={e => updateField('summary', e.target.value)} />
        </section>

        <section>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2">Skills</h2>
          <textarea rows={2} placeholder="React, Node.js, Typescript..." className="w-full border rounded-md p-2 text-sm" value={data.skills?.join(", ") || ""} onChange={e => updateField('skills', e.target.value.split(',').map(s=>s.trim()))} />
          <p className="text-xs text-gray-500 mt-1">Separate skills with commas</p>
        </section>

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
                <div className="mb-3"><label className="block text-xs mb-1">Dates (e.g., Jan 2022 - Dec 2025)</label><input type="text" className="w-full border rounded p-2 text-sm bg-white" value={exp.date} onChange={e => {const n=[...data.experience]; n[i].date = e.target.value; updateField('experience', n);}} /></div>
                <div>
                  <label className="block text-xs mb-1">Description Bullets (One per line)</label>
                  <textarea rows={4} className="w-full border rounded p-2 text-sm bg-white" value={exp.description?.join('\n') || ""} onChange={e => {const n=[...data.experience]; n[i].description = e.target.value.split('\n'); updateField('experience', n);}} />
                </div>
              </div>
            ))}
            <button onClick={() => updateField('experience', [...(data.experience||[]), {title:"", company:"", date:"", description:[]}])} className="text-sm font-medium text-blue-600">+ Add Experience</button>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2">Projects</h2>
          <div className="space-y-4">
            {(data.projects || []).map((proj: any, i: number) => (
              <div key={i} className="p-4 bg-gray-50 border rounded-lg relative">
                <button onClick={() => { const n = [...data.projects]; n.splice(i, 1); updateField('projects', n); }} className="absolute top-3 right-3 text-red-500"><Trash2 size={16}/></button>
                <div className="mb-3">
                  <label className="block text-xs mb-1">Project Name</label>
                  <input type="text" className="w-full border rounded p-2 text-sm bg-white" value={proj.name} onChange={e => {const n=[...data.projects]; n[i].name = e.target.value; updateField('projects', n);}} />
                </div>
                <div>
                  <label className="block text-xs mb-1">Description (One bullet per line)</label>
                  <textarea rows={3} className="w-full border rounded p-2 text-sm bg-white" value={proj.description?.join('\n') || ""} onChange={e => {const n=[...data.projects]; n[i].description = e.target.value.split('\n'); updateField('projects', n);}} />
                </div>
              </div>
            ))}
            <button onClick={() => updateField('projects', [...(data.projects||[]), {name:"", description:[]}])} className="text-sm font-medium text-blue-600">+ Add Project</button>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2">Education</h2>
          <div className="space-y-4">
            {(data.education || []).map((edu: any, i: number) => (
              <div key={i} className="p-4 bg-gray-50 border rounded-lg relative">
                <button onClick={() => { const n = [...data.education]; n.splice(i, 1); updateField('education', n); }} className="absolute top-3 right-3 text-red-500"><Trash2 size={16}/></button>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div><label className="block text-xs mb-1">Degree</label><input type="text" className="w-full border rounded p-2 text-sm bg-white" value={edu.degree} onChange={e => {const n=[...data.education]; n[i].degree = e.target.value; updateField('education', n);}} /></div>
                  <div><label className="block text-xs mb-1">Institution</label><input type="text" className="w-full border rounded p-2 text-sm bg-white" value={edu.institution} onChange={e => {const n=[...data.education]; n[i].institution = e.target.value; updateField('education', n);}} /></div>
                </div>
                <div><label className="block text-xs mb-1">Dates</label><input type="text" className="w-full border rounded p-2 text-sm bg-white" value={edu.date} onChange={e => {const n=[...data.education]; n[i].date = e.target.value; updateField('education', n);}} /></div>
              </div>
            ))}
            <button onClick={() => updateField('education', [...(data.education||[]), {degree:"", institution:"", date:""}])} className="text-sm font-medium text-blue-600">+ Add Education</button>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2">Certifications</h2>
          <textarea rows={3} placeholder="React JS Certification - Udemy..." className="w-full border rounded-md p-2 text-sm" value={data.certifications?.join("\n") || ""} onChange={e => updateField('certifications', e.target.value.split('\n').filter(Boolean))} />
          <p className="text-xs text-gray-500 mt-1">One certification per line</p>
        </section>
      </div>
    </div>
  );
}
