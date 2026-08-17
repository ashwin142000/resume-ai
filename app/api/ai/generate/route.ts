import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { masterResume, jobDescription, targetRole, userApiKey } = await req.json();

    if (!masterResume || !jobDescription || !userApiKey) {
      return new Response(JSON.stringify({ error: 'Missing required fields or API key' }), { status: 400 });
    }

    const cleanApiKey = userApiKey.trim();

    if (!cleanApiKey.startsWith('gsk_')) {
        return new Response(JSON.stringify({ 
            error: "Invalid API Key format. Groq API keys must start with 'gsk_'." 
        }), { status: 400 });
    }

    const promptText = `
      You are an expert ATS resume writer and recruiter. 
      You are given a Master Resume in JSON format and a Job Description.
      Your task is to tailor the Master Resume to perfectly match the Job Description and achieve a 95%+ ATS match score.

      STRICT RULES FOR ATS OPTIMIZATION & TONE:
      1. Keyword Integration: Identify all required skills, tools, and keywords from the Job Description. You MUST seamlessly weave these keywords into the candidate's Summary, Experience bullets, and Projects.
      2. Skills Expansion: Add relevant technical and soft skills from the Job Description directly into the "skills" array, even if they were missing from the Master Resume.
      3. Adaptive Projects: Modify the existing projects OR create entirely NEW, highly relevant projects that perfectly demonstrate the exact technologies and requirements asked for in the Job Description.
      4. Human-Created Tone: Write in a natural, professional, and convincing human tone. Avoid robotic, overly complex AI jargon.
      5. NO AI FORMATTING: DO NOT start your bullet points or sentences with hyphens (-), asterisks (*), slashes (/), or bullet characters. Provide clean, plain text sentences.
      6. Comprehensive Detail: Ensure the content fills a full single page perfectly. Use a detailed 4-5 sentence summary, 4-6 rich bullet points per job, and 2-3 detailed projects.
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
        "atsScore": 95,
        "missingKeywords": [""]
      }

      Job Description: ${jobDescription}
      Target Role: ${targetRole}
      Master Resume: ${JSON.stringify(masterResume)}
    `;

    // ============================================================================
    // THE WATERFALL FALLBACK
    // We strictly define the 3 best generation models. No security/guard models.
    // ============================================================================
    const modelsToTry = [
      "llama-3.3-70b-versatile", // #1 Choice (Newest, smartest)
      "llama-3.1-8b-instant",    // #2 Choice (Fastest, widely available)
      "llama3-70b-8192"          // #3 Choice (Reliable legacy model)
    ];

    let data = null;
    let lastError = "";

    // Loop through the models until one works
    for (const model of modelsToTry) {
        const res = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${cleanApiKey}`
          },
          body: JSON.stringify({
              model: model, 
              messages: [
                  { role: "system", content: "You are a JSON-generating machine. Only output valid JSON without markdown formatting." },
                  { role: "user", content: promptText }
              ],
              response_format: { type: "json_object" } 
          })
        });

        if (res.ok) {
            data = await res.json();
            break; // SUCCESS! Break out of the loop immediately.
        } else {
            // It failed. Capture the error, but let the loop try the next model.
            const errText = await res.text();
            
            // If the key is outright invalid, or the user is rate limited, stop immediately.
            if (res.status === 429) return new Response(JSON.stringify({ error: "Groq API Rate Limit Exceeded. Please wait a minute and try again." }), { status: 429 });
            if (res.status === 401) return new Response(JSON.stringify({ error: "Invalid Groq API Key. Please verify your key at console.groq.com" }), { status: 401 });
            
            lastError = errText;
        }
    }

    // If ALL models failed
    if (!data) {
        let cleanError = lastError;
        try { cleanError = JSON.parse(lastError).error?.message || lastError; } catch(e){} 
        return new Response(JSON.stringify({ error: `Groq API Error: All models failed. Last error: ${cleanError}` }), { status: 500 });
    }

    // ============================================================================
    // PARSE & CLEANUP
    // ============================================================================
    let textResponse = data.choices[0].message.content;
    textResponse = textResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();
    const generatedJson = JSON.parse(textResponse);

    if (generatedJson.experience) {
      generatedJson.experience = generatedJson.experience.map((exp: any) => ({
        ...exp,
        description: exp.description?.map((d: string) => d.replace(/^[-*•/]\s*/, '').trim())
      }));
    }
    if (generatedJson.projects) {
      generatedJson.projects = generatedJson.projects.map((proj: any) => ({
        ...proj,
        description: proj.description?.map((d: string) => d.replace(/^[-*•/]\s*/, '').trim())
      }));
    }

    return new Response(JSON.stringify(generatedJson), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
  }
}


