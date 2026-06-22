"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Save, Loader2, Download, Trash2, Edit3, Eye } from "lucide-react";

export default function Editor({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'edit' | 'preview'>('preview'); // For mobile tabs

  useEffect(() => {
    if (user && params.id) {
      getDoc(doc(db, "users", user.uid, "tailoredResumes", params.id)).then(d => {
        if(d.exists()) setData(d.data().data);
      });
    }
  }, [user, params.id]);

  if (!data) return <div className="p-8 text-center text-gray-500">Loading Resume Data...</div>;

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "users", user!.uid, "tailoredResumes", params.id), { data }, { merge: true });
      alert("Changes saved successfully!");
    } catch (error) {
      alert("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: string, value: any) => setData({ ...data, [key]: value });

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-100px)] print:block print:h-auto print:p-0">
      
      {/* Mobile View Toggle Tabs (Hidden on Desktop & Print) */}
      <div className="flex md:hidden bg-white rounded-lg shadow-sm p-1 print:hidden">
        <button onClick={() => setView('edit')} className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 ${view === 'edit' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}>
          <Edit3 size={16}/> Edit Mode
        </button>
        <button onClick={() => setView('preview')} className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 ${view === 'preview' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}>
          <Eye size={16}/> Preview Mode
        </button>
      </div>

      {/* LEFT PANEL: Form Editor */}
      <div className={`w-full md:w-1/2 flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden print:hidden ${view === 'edit' ? 'flex' : 'hidden md:flex'}`}>
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="font-bold text-gray-800 flex items-center gap-2"><Edit3 size={18}/> Edit Tailored Resume</h2>
          <button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16}/>} Save Edits
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto flex-1 space-y-8">
          {/* Missing Keywords Warning */}
          {data.missingKeywords?.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
              <h4 className="text-xs font-bold text-orange-800 uppercase mb-2">Missing JD Keywords:</h4>
              <div className="flex flex-wrap gap-1.5">
                {data.missingKeywords.map((k: string, i: number) => <span key={i} className="bg-white border border-orange-200 text-orange-700 text-[10px] px-2 py-0.5 rounded-full">{k}</span>)}
              </div>
            </div>
          )}

          {/* Edit Forms */}
          <section>
            <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Summary</h3>
            <textarea rows={4} className="w-full border rounded-md p-2.5 text-sm bg-gray-50 focus:bg-white" value={data.summary || ""} onChange={e => updateField('summary', e.target.value)} />
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Skills (Comma Separated)</h3>
            <textarea rows={2} className="w-full border rounded-md p-2.5 text-sm bg-gray-50 focus:bg-white" value={data.skills?.join(", ") || ""} onChange={e => updateField('skills', e.target.value.split(',').map((s: string)=>s.trim()))} />
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Experience</h3>
            <div className="space-y-4">
              {(data.experience || []).map((exp: any, i: number) => (
                <div key={i} className="p-3 border rounded-lg relative bg-gray-50 group">
                  <button onClick={() => { const n = [...data.experience]; n.splice(i, 1); updateField('experience', n); }} className="absolute top-2 right-2 text-red-500"><Trash2 size={14}/></button>
                  <input type="text" className="w-full border rounded p-2 text-sm mb-2" value={exp.title} onChange={e => {const n=[...data.experience]; n[i].title = e.target.value; updateField('experience', n);}} placeholder="Job Title" />
                  <input type="text" className="w-full border rounded p-2 text-sm mb-2" value={exp.company} onChange={e => {const n=[...data.experience]; n[i].company = e.target.value; updateField('experience', n);}} placeholder="Company" />
                  <textarea rows={4} className="w-full border rounded p-2 text-sm" value={exp.description?.join('\n') || ""} onChange={e => {const n=[...data.experience]; n[i].description = e.target.value.split('\n'); updateField('experience', n);}} placeholder="Bullets (One per line)" />
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Projects</h3>
            <div className="space-y-4">
              {(data.projects || []).map((proj: any, i: number) => (
                <div key={i} className="p-3 border rounded-lg relative bg-gray-50">
                  <button onClick={() => { const n = [...data.projects]; n.splice(i, 1); updateField('projects', n); }} className="absolute top-2 right-2 text-red-500"><Trash2 size={14}/></button>
                  <input type="text" className="w-full border rounded p-2 text-sm mb-2" value={proj.name} onChange={e => {const n=[...data.projects]; n[i].name = e.target.value; updateField('projects', n);}} placeholder="Project Name" />
                  <textarea rows={3} className="w-full border rounded p-2 text-sm" value={proj.description?.join('\n') || ""} onChange={e => {const n=[...data.projects]; n[i].description = e.target.value.split('\n'); updateField('projects', n);}} placeholder="Bullets (One per line)" />
                </div>
              ))}
            </div>
          </section>
          
        </div>
      </div>

      {/* RIGHT PANEL: Live Preview & Export */}
      <div className={`w-full md:w-1/2 flex-col print:w-full print:block ${view === 'preview' ? 'flex' : 'hidden md:flex'}`}>
        <div className="print:hidden mb-4 flex justify-between items-center bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
          <div>
            <h1 className="text-sm font-bold text-gray-800 flex items-center gap-2"><Eye size={16} /> Live PDF Preview</h1>
            {data.atsScore && <p className="text-xs text-green-600 font-semibold mt-1">ATS Match: {data.atsScore}%</p>}
          </div>
          <button onClick={() => window.print()} className="bg-gray-900 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-gray-800 flex items-center gap-2">
            <Download size={16} /> Download PDF
          </button>
        </div>

        {/* Printable Area - Centered and Scrolled on Desktop */}
        <div className="flex-1 overflow-y-auto bg-gray-100 rounded-xl flex justify-center print:bg-white print:p-0 print:overflow-visible">
          <div className="bg-white p-[10mm] w-full max-w-[210mm] min-h-[297mm] shadow-md print:shadow-none print:m-0 print:p-[5mm] print:max-w-none text-gray-900 font-sans leading-snug my-4 md:my-0">
            
            <header className="text-center border-b-2 border-gray-900 pb-2 mb-3">
              <h1 className="text-2xl font-bold uppercase tracking-wider">{data.personalInfo?.fullName}</h1>
              {data.personalInfo?.role && <p className="text-sm font-semibold text-gray-700 mt-0.5">{data.personalInfo.role}</p>}
              <div className="text-[10px] flex flex-wrap justify-center gap-x-2 gap-y-1 text-gray-600 mt-1">
                {data.personalInfo?.email && <span>{data.personalInfo.email}</span>}
                {data.personalInfo?.phone && <span>| {data.personalInfo.phone}</span>}
                {data.personalInfo?.location && <span>| {data.personalInfo.location}</span>}
                {data.personalInfo?.linkedin && <span>| {data.personalInfo.linkedin}</span>}
                {data.personalInfo?.github && <span>| {data.personalInfo.github}</span>}
              </div>
            </header>
            
            {data.summary && (
              <section className="mb-3">
                <h2 className="text-sm font-bold uppercase border-b border-gray-300 mb-1 text-gray-800">Professional Summary</h2>
                <p className="text-[11px] text-justify">{data.summary}</p>
              </section>
            )}

            {data.skills?.length > 0 && (
              <section className="mb-3">
                <h2 className="text-sm font-bold uppercase border-b border-gray-300 mb-1 text-gray-800">Skills</h2>
                <p className="text-[11px] leading-relaxed">{data.skills.join(' • ')}</p>
              </section>
            )}

            {data.experience?.length > 0 && (
              <section className="mb-3">
                <h2 className="text-sm font-bold uppercase border-b border-gray-300 mb-1 text-gray-800">Experience</h2>
                {data.experience.map((exp: any, i: number) => (
                  <div key={i} className="mb-2">
                    <div className="flex justify-between font-bold text-[12px] text-gray-900">
                      <span>{exp.title}</span>
                      <span>{exp.date}</span>
                    </div>
                    <div className="text-[11px] italic mb-0.5 text-gray-700">{exp.company}</div>
                    <ul className="list-disc list-outside ml-4 text-[11px] space-y-0.5">
                      {exp.description?.map((d: string, j: number) => d.trim() && <li key={j} className="pl-1">{d}</li>)}
                    </ul>
                  </div>
                ))}
              </section>
            )}

            {data.projects?.length > 0 && (
              <section className="mb-3">
                <h2 className="text-sm font-bold uppercase border-b border-gray-300 mb-1 text-gray-800">Projects</h2>
                {data.projects.map((proj: any, i: number) => (
                  <div key={i} className="mb-2">
                    <div className="font-bold text-[12px] text-gray-900">{proj.name}</div>
                    <ul className="list-disc list-outside ml-4 text-[11px] space-y-0.5 mt-0.5">
                      {proj.description?.map((d: string, j: number) => d.trim() && <li key={j} className="pl-1">{d}</li>)}
                    </ul>
                  </div>
                ))}
              </section>
            )}

            {data.education?.length > 0 && (
              <section className="mb-3">
                <h2 className="text-sm font-bold uppercase border-b border-gray-300 mb-1 text-gray-800">Education</h2>
                {data.education.map((edu: any, i: number) => (
                  <div key={i} className="flex justify-between text-[11px] mb-0.5">
                    <div><span className="font-bold text-gray-900">{edu.institution}</span> — {edu.degree}</div>
                    <div className="italic text-gray-600">{edu.date}</div>
                  </div>
                ))}
              </section>
            )}

            {data.certifications?.length > 0 && (
              <section className="mb-3">
                <h2 className="text-sm font-bold uppercase border-b border-gray-300 mb-1 text-gray-800">Certifications</h2>
                <ul className="list-disc list-outside ml-4 text-[11px] space-y-0.5">
                  {data.certifications.map((cert: string, i: number) => cert.trim() && <li key={i} className="pl-1">{cert}</li>)}
                </ul>
              </section>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
