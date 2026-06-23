import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { masterResume, jobDescription, targetRole, userApiKey } = await req.json();

    if (!masterResume || !jobDescription || !userApiKey) {
      return new Response(JSON.stringify({ error: 'Missing required fields or API key' }), { status: 400 });
    }

    const cleanApiKey = userApiKey.trim();

    // UPDATED PROMPT: Encouraging detailed, descriptive content to fill the page
    const promptText = `
      You are an expert ATS resume writer and recruiter. 
      You are given a Master Resume in JSON format and a Job Description.
      Your task is to tailor the Master Resume to perfectly match the Job Description.

      STRICT RULES FOR HIGH-QUALITY CONTENT:
      1. The final resume MUST be comprehensive and descriptive enough to beautifully fill a full single page. Do not make it too sparse or short.
      2. Professional Summary: Write a compelling, detailed 4-5 sentence paragraph that heavily incorporates the target keywords and highlights the candidate's core value proposition.
      3. Experience: Include 4-6 highly detailed, impactful bullet points per role. Ensure bullets are descriptive, demonstrate technical depth, and clearly show the value brought to the company using keywords from the JD. DO NOT over-condense; keep the rich technical details from the master resume and enhance them.
      4. Projects: Include up to 3 detailed projects with 2-3 descriptive bullet points each.
      5. NEVER invent experience, fake jobs, fake projects, or fake certifications.
      6. Extract missing keywords from the JD that the candidate lacks.
      7. You MUST output ONLY a valid JSON object matching the schema below. No markdown wrappers.

      EXPECTED JSON SCHEMA:
      {
        "personalInfo": { "fullName": "", "email": "", "phone": "", "location": "", "linkedin": "", "portfolio": "", "github": "" },
        "summary": "",
        "skills": [""],
        "experience": [{ "title": "", "company": "", "date": "", "description": [""] }],
        "projects": [{ "name": "", "description": [""], "technologies": "" }],
        "education": [{ "degree": "", "institution": "", "date": "" }],
        "certifications": [""],
        "atsScore": 85,
        "missingKeywords": [""]
      }

      Job Description: ${jobDescription}
      Target Role: ${targetRole}
      Master Resume: ${JSON.stringify(masterResume)}
    `;

    // Call Groq API using native fetch
    const res = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
      method: 'POST',
      headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanApiKey}`
      },
      body: JSON.stringify({
          model: "llama-3.3-70b-versatile", 
          messages: [
              { role: "system", content: "You are a JSON-generating machine. Only output valid JSON." },
              { role: "user", content: promptText }
          ],
          response_format: { type: "json_object" } 
      })
    });

    if (!res.ok) {
        const errText = await res.text();
        if (res.status === 429) return new Response(JSON.stringify({ error: "Groq API Rate Limit Exceeded. Please try again in a moment." }), { status: 429 });
        if (res.status === 401) return new Response(JSON.stringify({ error: "Invalid Groq API Key. Please update it in Settings." }), { status: 401 });
        return new Response(JSON.stringify({ error: `API Error: ${errText}` }), { status: res.status });
    }

    const data = await res.json();
    let textResponse = data.choices[0].message.content;
    
    // Clean up just in case
    textResponse = textResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();

    const generatedJson = JSON.parse(textResponse);

    return new Response(JSON.stringify(generatedJson), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
  }
}
