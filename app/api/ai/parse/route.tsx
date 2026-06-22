import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { base64Pdf, userApiKey } = await req.json();

    if (!base64Pdf || !userApiKey) {
      return new Response(JSON.stringify({ error: 'Missing PDF or API key' }), { status: 400 });
    }

    const cleanApiKey = userApiKey.trim();

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

    const payload = {
      contents: [{
        parts: [
          { text: promptText },
          { inlineData: { mimeType: "application/pdf", data: base64Pdf } }
        ]
      }],
      generationConfig: { responseMimeType: "application/json", responseSchema: schema }
    };

    // We strictly use gemini-1.5-flash as it has the highest free tier limits (15 Requests Per Minute)
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const status = res.status;
      const errText = await res.text();
      
      // Handle the strict 429 Quota Exceeded error gracefully
      if (status === 429) {
          return new Response(JSON.stringify({ 
              error: "Google API Quota Exceeded (15 requests/min limit). Please wait exactly 60 seconds and try again. If you generated a new API key, ensure you clicked 'Save' in the Settings menu!" 
          }), { status: 429 });
      }
      
      // Handle Invalid API Key errors gracefully
      if (status === 400 || status === 403) {
          return new Response(JSON.stringify({ 
              error: "Your API Key is invalid or restricted. Please go to Settings and paste a fresh API key from Google AI Studio." 
          }), { status: status });
      }

      return new Response(JSON.stringify({ error: `Google API Error (${status}): ${errText}` }), { status: status });
    }

    const data = await res.json();
    
    if (!data.candidates || data.candidates.length === 0) {
       return new Response(JSON.stringify({ error: "Google Gemini returned an empty response. The PDF might be unreadable." }), { status: 400 });
    }

    let textResponse = data.candidates[0].content.parts[0].text;
    textResponse = textResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();

    const generatedJson = JSON.parse(textResponse);

    return new Response(JSON.stringify(generatedJson), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error("AI Parse Error:", error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
  }
}
