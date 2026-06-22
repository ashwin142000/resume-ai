import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { masterResume, jobDescription, targetRole, userApiKey } = await req.json();

    if (!masterResume || !jobDescription || !userApiKey) {
      return new Response(JSON.stringify({ error: 'Missing required fields or API key' }), { status: 400 });
    }

    const cleanApiKey = userApiKey.trim();
    
    // Initialize the new client
    const ai = new GoogleGenAI({ apiKey: cleanApiKey });

    const promptText = `
      You are an expert ATS resume writer and recruiter. 
      You are given a Master Resume in JSON format and a Job Description.
      Your task is to tailor the Master Resume to perfectly match the Job Description.

      STRICT RULES:
      1. NEVER invent experience, fake jobs, fake projects, or fake certifications.
      2. Only highlight, reorder, and improve the wording of existing content to match the JD keywords.
      3. Optimize the professional summary for this specific role.
      4. Extract missing keywords from the JD that the candidate lacks.
      5. Return strictly valid JSON.

      Job Description: ${jobDescription}
      Target Role: ${targetRole}
      Master Resume: ${JSON.stringify(masterResume)}
    `;

    const schema = {
      type: "OBJECT",
      properties: {
        personalInfo: { 
          type: "OBJECT", properties: { fullName: { type: "STRING" }, email: { type: "STRING" }, phone: { type: "STRING" }, location: { type: "STRING" }, linkedin: { type: "STRING" }, portfolio: { type: "STRING" } } 
        },
        summary: { type: "STRING" },
        skills: { type: "ARRAY", items: { type: "STRING" } },
        experience: { type: "ARRAY", items: { type: "OBJECT", properties: { title: { type: "STRING" }, company: { type: "STRING" }, date: { type: "STRING" }, description: { type: "ARRAY", items: { type: "STRING" } } } } },
        projects: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, description: { type: "ARRAY", items: { type: "STRING" } }, technologies: { type: "STRING" } } } },
        education: { type: "ARRAY", items: { type: "OBJECT", properties: { degree: { type: "STRING" }, institution: { type: "STRING" }, date: { type: "STRING" } } } },
        atsScore: { type: "INTEGER" },
        missingKeywords: { type: "ARRAY", items: { type: "STRING" } }
      }
    };

    // Calling the new model using the updated method structure
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    let textResponse = response.text;
    textResponse = textResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();
    const generatedJson = JSON.parse(textResponse);

    return new Response(JSON.stringify(generatedJson), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    
    let errorMessage = error.message || "Unknown error occurred";
    if (errorMessage.includes("429") || errorMessage.includes("Quota")) {
      errorMessage = "Google API Quota Exceeded. Please wait 60 seconds and try again.";
    } else if (errorMessage.includes("API key not valid") || errorMessage.includes("403") || errorMessage.includes("API_KEY_INVALID")) {
      errorMessage = "Your API Key is invalid. Please update it in Settings.";
    }

    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}
