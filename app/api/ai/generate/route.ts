import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { masterResume, jobDescription, targetRole, userApiKey } = await req.json();

    if (!masterResume || !jobDescription || !userApiKey) {
      return new Response(JSON.stringify({ error: 'Missing required fields or API key' }), { status: 400 });
    }

    const cleanApiKey = userApiKey.trim();

    // ============================================================================
    // STEP 1: GROQ AUTO-DISCOVERY (FUTURE-PROOFING)
    // ============================================================================
    let selectedModel = "llama3-70b-8192"; // Absolute fallback
    
    const modelsRes = await fetch(`https://api.groq.com/openai/v1/models`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${cleanApiKey}` }
    });

    if (!modelsRes.ok) {
      if (modelsRes.status === 401) {
        return new Response(JSON.stringify({ error: "Invalid Groq API Key. Please update it in Settings." }), { status: 401 });
      }
      // If fetching models fails for another reason, we just let it try the fallback model below
    } else {
      const modelsData = await modelsRes.json();
      const availableModels = modelsData.data || [];
      
      // Find the best available Llama model (Prefer 70b, then 8b, then anything)
      const best70b = availableModels.find((m: any) => m.id.toLowerCase().includes('llama') && m.id.toLowerCase().includes('70b'));
      const anyLlama = availableModels.find((m: any) => m.id.toLowerCase().includes('llama'));
      
      if (best70b) {
        selectedModel = best70b.id;
      } else if (anyLlama) {
        selectedModel = anyLlama.id;
      } else if (availableModels.length > 0) {
        selectedModel = availableModels[0].id; // Just use whatever is available
      }
    }


    // ============================================================================
    // STEP 2: GENERATE THE RESUME
    // ============================================================================
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

    // Call Groq API with the auto-discovered model
    const res = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
      method: 'POST',
      headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanApiKey}`
      },
      body: JSON.stringify({
          model: selectedModel, 
          messages: [
              { role: "system", content: "You are a JSON-generating machine. Only output valid JSON without markdown formatting." },
              { role: "user", content: promptText }
          ],
          response_format: { type: "json_object" } 
      })
    });

    if (!res.ok) {
        const errText = await res.text();
        if (res.status === 429) return new Response(JSON.stringify({ error: "Groq API Rate Limit Exceeded. Please wait a minute and try again." }), { status: 429 });
        return new Response(JSON.stringify({ error: `API Error (Model: ${selectedModel}): ${errText}` }), { status: res.status });
    }

    const data = await res.json();
    let textResponse = data.choices[0].message.content;
    
    // Clean up just in case Groq adds markdown wrappers
    textResponse = textResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();

    const generatedJson = JSON.parse(textResponse);

    // Final safety pass to strip accidental hyphens/asterisks from the start of descriptions
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
