import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { base64Pdf, userApiKey } = await req.json();

    if (!base64Pdf || !userApiKey) {
      return new Response(JSON.stringify({ error: 'Missing PDF or API key' }), { status: 400 });
    }

    const cleanApiKey = userApiKey.trim();
    
    // Initialize the new client exactly as requested
    const ai = new GoogleGenAI({ apiKey: cleanApiKey });

    const promptText = `
      You are an expert ATS resume parser. Extract the information from this PDF resume and format it strictly as JSON.
      Do not invent any information. If a field is not found in the resume, leave it empty.
      Ensure the description bullets in experience and projects are separated into an array of strings.
    `;

    const schema = {
      type: "OBJECT",
      properties: {
        personalInfo: {
          type: "OBJECT",
          properties: {
            fullName: { type: "STRING" }, role: { type: "STRING" }, email: { type: "STRING" }, phone: { type: "STRING" },
            location: { type: "STRING" }, linkedin: { type: "STRING" }, github: { type: "STRING" }, portfolio: { type: "STRING" }
          }
        },
        summary: { type: "STRING" },
        skills: { type: "ARRAY", items: { type: "STRING" } },
        experience: { type: "ARRAY", items: { type: "OBJECT", properties: { title: { type: "STRING" }, company: { type: "STRING" }, date: { type: "STRING" }, description: { type: "ARRAY", items: { type: "STRING" } } } } },
        projects: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, description: { type: "ARRAY", items: { type: "STRING" } } } } },
        education: { type: "ARRAY", items: { type: "OBJECT", properties: { degree: { type: "STRING" }, institution: { type: "STRING" }, date: { type: "STRING" } } } },
        certifications: { type: "ARRAY", items: { type: "STRING" } }
      }
    };

    // Call the new model using the updated method structure
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: [
        promptText,
        { inlineData: { mimeType: "application/pdf", data: base64Pdf } }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    let textResponse = response.text;

    // Clean up markdown code blocks if the AI accidentally adds them
    textResponse = textResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();
    
    const generatedJson = JSON.parse(textResponse);

    return new Response(JSON.stringify(generatedJson), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error("AI Parse Error:", error);
    
    let errorMessage = error.message || "Unknown error occurred";
    if (errorMessage.includes("429") || errorMessage.includes("Quota")) {
      errorMessage = "Google API Quota Exceeded (15 requests/min limit). Please wait 60 seconds and try again.";
    } else if (errorMessage.includes("API key not valid") || errorMessage.includes("403") || errorMessage.includes("API_KEY_INVALID")) {
      errorMessage = "Your API Key is invalid or restricted. Please go to Settings and paste a fresh API key from Google AI Studio.";
    }

    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}
