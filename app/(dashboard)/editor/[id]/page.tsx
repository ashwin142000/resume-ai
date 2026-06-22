"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { db } from "@/lib/firebase/config";
import { doc, getDoc } from "firebase/firestore";

export default function Editor({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (user && params.id) {
      getDoc(doc(db, "users", user.uid, "tailoredResumes", params.id)).then(d => {
        if(d.exists()) setData(d.data().data);
      });
    }
  }, [user, params.id]);

  if (!data) return <div className="p-8 text-center text-gray-500">Loading Resume Data...</div>;

  return (
    <div className="w-full">
      <div className="print:hidden mb-4 flex justify-between items-center bg-white p-4 border rounded-xl shadow-sm">
        <div>
          <h1 className="text-lg font-bold">Review Tailored Resume</h1>
          <p className="text-xs text-gray-500">ATS Match Score: {data.atsScore}%</p>
        </div>
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-blue-700">
          Export to PDF
        </button>
      </div>

      {/* Printable Area - Designed specifically to be compact and fit 1 A4 Page */}
      <div className="bg-white p-[10mm] w-full max-w-[210mm] min-h-[297mm] mx-auto shadow-xl print:shadow-none print:m-0 print:p-[5mm] print:max-w-none text-gray-900 font-sans leading-snug">
        
        {/* Header */}
        <header className="text-center border-b-2 border-gray-900 pb-2 mb-3">
          <h1 className="text-2xl font-bold uppercase tracking-wider">{data.personalInfo?.fullName}</h1>
          {data.personalInfo?.role && <p className="text-sm font-semibold text-gray-700 mt-0.5">{data.personalInfo.role}</p>}
          <div className="text-xs flex flex-wrap justify-center gap-x-2 gap-y-1 text-gray-600 mt-1">
            {data.personalInfo?.email && <span>{data.personalInfo.email}</span>}
            {data.personalInfo?.phone && <span>| {data.personalInfo.phone}</span>}
            {data.personalInfo?.location && <span>| {data.personalInfo.location}</span>}
            {data.personalInfo?.linkedin && <span>| {data.personalInfo.linkedin}</span>}
            {data.personalInfo?.github && <span>| {data.personalInfo.github}</span>}
          </div>
        </header>
        
        {/* Summary */}
        {data.summary && (
          <section className="mb-3">
            <h2 className="text-sm font-bold uppercase border-b border-gray-300 mb-1 text-gray-800">Professional Summary</h2>
            <p className="text-[11px] text-justify">{data.summary}</p>
          </section>
        )}

        {/* Skills */}
        {data.skills?.length > 0 && (
          <section className="mb-3">
            <h2 className="text-sm font-bold uppercase border-b border-gray-300 mb-1 text-gray-800">Skills</h2>
            <p className="text-[11px]">{data.skills.join(' • ')}</p>
          </section>
        )}

        {/* Experience */}
        {data.experience?.length > 0 && (
          <section className="mb-3">
            <h2 className="text-sm font-bold uppercase border-b border-gray-300 mb-1 text-gray-800">Experience</h2>
            {data.experience.map((exp: any, i: number) => (
              <div key={i} className="mb-2">
                <div className="flex justify-between font-bold text-xs text-gray-900">
                  <span>{exp.title}</span>
                  <span>{exp.date}</span>
                </div>
                <div className="text-[11px] italic mb-0.5 text-gray-700">{exp.company}</div>
                <ul className="list-disc list-outside ml-4 text-[11px] space-y-0.5">
                  {exp.description?.map((d: string, j: number) => <li key={j} className="pl-1">{d}</li>)}
                </ul>
              </div>
            ))}
          </section>
        )}

        {/* Projects */}
        {data.projects?.length > 0 && (
          <section className="mb-3">
            <h2 className="text-sm font-bold uppercase border-b border-gray-300 mb-1 text-gray-800">Projects</h2>
            {data.projects.map((proj: any, i: number) => (
              <div key={i} className="mb-2">
                <div className="font-bold text-xs text-gray-900">{proj.name}</div>
                <ul className="list-disc list-outside ml-4 text-[11px] space-y-0.5 mt-0.5">
                  {proj.description?.map((d: string, j: number) => <li key={j} className="pl-1">{d}</li>)}
                </ul>
              </div>
            ))}
          </section>
        )}

        {/* Education */}
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

        {/* Certifications */}
        {data.certifications?.length > 0 && (
          <section className="mb-3">
            <h2 className="text-sm font-bold uppercase border-b border-gray-300 mb-1 text-gray-800">Certifications</h2>
            <ul className="list-disc list-outside ml-4 text-[11px] space-y-0.5">
              {data.certifications.map((cert: string, i: number) => <li key={i} className="pl-1">{cert}</li>)}
            </ul>
          </section>
        )}

      </div>
    </div>
  );
}
