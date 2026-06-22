import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { base64Pdf, userApiKey } = await req.json();

    if (!base64Pdf || !userApiKey) {
      return new Response(JSON.stringify({ error: 'Missing PDF or API key' }), { status: 400 });
    }

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

    // FIX: Appended "-latest" to the model name to resolve the 404 NOT FOUND error
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${userApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const errText = await res.text();
        return new Response(JSON.stringify({ error: `Google Gemini API Error: ${errText}` }), { status: res.status });
    }

    const data = await res.json();
    let textResponse = data.candidates[0].content.parts[0].text;

    // Clean up if Gemini accidentally includes markdown code block formatting
    textResponse = textResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();

    const generatedJson = JSON.parse(textResponse);

    return new Response(JSON.stringify(generatedJson), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error("AI Parse Error:", error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
  }
}
