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

 if (!data) return <div>Loading...</div>;

 return (
   <div>
     <div className="print:hidden mb-4 flex justify-between bg-white p-4 border rounded shadow-sm">
       <h1 className="text-xl font-bold">Review Tailored Resume</h1>
       <button onClick={() => window.print()} className="bg-gray-900 text-white px-4 py-2 rounded">Export to PDF</button>
     </div>

     {/* Printable Area - Formatted as standard ATS resume */}
     <div className="bg-white p-[20mm] w-[210mm] min-h-[297mm] mx-auto shadow-xl print:shadow-none print:m-0 print:p-0">
       <div className="font-serif text-gray-900">
         <header className="text-center border-b-2 border-gray-900 pb-4 mb-4">
           <h1 className="text-3xl font-bold uppercase">{data.personalInfo?.fullName}</h1>
           <div className="text-sm space-x-2">
             <span>{data.personalInfo?.email}</span> | <span>{data.personalInfo?.phone}</span>
           </div>
         </header>
         
         <section className="mb-4">
           <h2 className="text-lg font-bold uppercase border-b border-gray-400 mb-2">Summary</h2>
           <p className="text-sm">{data.summary}</p>
         </section>

         <section className="mb-4">
           <h2 className="text-lg font-bold uppercase border-b border-gray-400 mb-2">Skills</h2>
           <p className="text-sm">{data.skills?.join(', ')}</p>
         </section>

         <section className="mb-4">
           <h2 className="text-lg font-bold uppercase border-b border-gray-400 mb-2">Experience</h2>
           {data.experience?.map((exp: any, i: number) => (
             <div key={i} className="mb-3">
               <div className="flex justify-between font-bold text-sm">
                 <span>{exp.title}</span><span>{exp.date}</span>
               </div>
               <div className="text-sm italic mb-1">{exp.company}</div>
               <ul className="list-disc ml-5 text-sm">
                 {exp.description?.map((d: string, j: number) => <li key={j}>{d}</li>)}
               </ul>
             </div>
           ))}
         </section>
       </div>
     </div>
   </div>
 );
}
