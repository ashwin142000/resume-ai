import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { masterResume, jobDescription, targetRole, userApiKey } = await req.json();

    if (!masterResume || !jobDescription || !userApiKey) {
      return new Response(JSON.stringify({ error: 'Missing required fields or API key' }), { status: 400 });
    }

    const cleanApiKey = userApiKey.trim();

    const promptText = `
      You are an expert ATS resume writer and recruiter. 
      You are given a Master Resume in JSON format and a Job Description.
      Your task is to tailor the Master Resume to perfectly match the Job Description.

      STRICT RULES:
      1. The final resume MUST fit on a single page. Keep everything short, crisp, and highly impactful.
      2. Experience: Limit to the top 3-4 most critical achievements per role. Delete unnecessary fluff.
      3. Projects: Limit to the top 2 most relevant projects.
      4. Extract missing keywords from the JD that the candidate lacks.
      5. You MUST output ONLY a valid JSON object matching the schema below. No markdown wrappers.

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

    // Call Groq API using native fetch (OpenAI compatible endpoint)
    const res = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
      method: 'POST',
      headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanApiKey}`
      },
      body: JSON.stringify({
          model: "llama3-70b-8192", // Fast, highly capable reasoning model
          messages: [
              { role: "system", content: "You are a JSON-generating machine. Only output valid JSON." },
              { role: "user", content: promptText }
          ],
          response_format: { type: "json_object" } // Forces JSON output
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
