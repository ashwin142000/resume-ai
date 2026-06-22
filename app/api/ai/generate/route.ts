import { NextResponse } from 'next/server';

export async function POST(req: Request) {
 try {
   const { masterResume, jobDescription, targetRole, userApiKey } = await req.json();

   const promptText = `
     You are an expert ATS resume writer. Tailor the Master Resume to match the Job Description.
     RULES: NEVER invent experience, fake jobs, projects, or certifications. Only improve wording and highlight relevant existing skills. Return valid JSON only.
     
     Job: ${jobDescription}
     Role: ${targetRole}
     Master: ${JSON.stringify(masterResume)}
   `;

   const schema = {
     type: "OBJECT",
     properties: {
       personalInfo: { type: "OBJECT", properties: { fullName: { type: "STRING" }, email: { type: "STRING" }, phone: { type: "STRING" }, location: { type: "STRING" }, linkedin: { type: "STRING" }, portfolio: { type: "STRING" } } },
       summary: { type: "STRING" },
       skills: { type: "ARRAY", items: { type: "STRING" } },
       experience: { type: "ARRAY", items: { type: "OBJECT", properties: { title: { type: "STRING" }, company: { type: "STRING" }, date: { type: "STRING" }, description: { type: "ARRAY", items: { type: "STRING" } } } } },
       projects: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, description: { type: "STRING" }, technologies: { type: "STRING" } } } },
       education: { type: "ARRAY", items: { type: "OBJECT", properties: { degree: { type: "STRING" }, institution: { type: "STRING" }, date: { type: "STRING" } } } },
       atsScore: { type: "INTEGER" },
       missingKeywords: { type: "ARRAY", items: { type: "STRING" } }
     }
   };

   const payload = {
     contents: [{ parts: [{ text: promptText }] }],
     generationConfig: { responseMimeType: "application/json", responseSchema: schema }
   };

   const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${userApiKey}`, {
     method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
   });

   if (!res.ok) throw new Error(`API Error: ${res.status}`);
   const data = await res.json();
   return NextResponse.json(JSON.parse(data.candidates[0].content.parts[0].text));

 } catch (error: any) {
   return NextResponse.json({ error: error.message }, { status: 500 });
 }
}
