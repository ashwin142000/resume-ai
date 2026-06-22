import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { base64Pdf, userApiKey } = await req.json();

    if (!base64Pdf || !userApiKey) {
      return new Response(JSON.stringify({ error: 'Missing PDF or API key' }), { status: 400 });
    }

    const cleanApiKey = userApiKey.trim();

    // STEP 1: Ask Google what models this specific API key is allowed to use
    const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanApiKey}`);
    if (!modelsRes.ok) {
       const errText = await modelsRes.text();
       return new Response(JSON.stringify({ error: `API Key rejected by Google: ${errText}` }), { status: modelsRes.status });
    }
    
    const modelsData = await modelsRes.json();
    const availableModels = modelsData.models || [];
    
    // STEP 2: Filter for models that support JSON Schema and PDF generation (1.5 or 2.0)
    let validModels = availableModels
        .filter((m: any) => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
        .map((m: any) => m.name.replace('models/', ''))
        .filter((name: string) => name.includes('1.5') || name.includes('2.0'));

    // Sort to prioritize the most stable flash models first
    validModels.sort((a: string, b: string) => {
        const score = (name: string) => {
            if (name === 'gemini-1.5-flash') return 10;
            if (name === 'gemini-2.0-flash') return 9;
            if (name.includes('gemini-1.5-flash')) return 8; 
            if (name.includes('gemini-1.5-pro')) return 7;
            return 0;
        };
        return score(b) - score(a);
    });

    if (validModels.length === 0) {
        return new Response(JSON.stringify({ 
            error: `Your API key does not have access to any Gemini 1.5 or 2.0 models. Please generate a new API key in a NEW project at aistudio.google.com.` 
        }), { status: 400 });
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

    let data = null;
    let errorMessages: string[] = [];

    // Try the top 3 available models your key has access to
    const modelsToTry = validModels.slice(0, 3);

    for (const model of modelsToTry) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errText = await res.text();
          errorMessages.push(`[${model}] failed: ${errText}`);
          continue; 
        }

        data = await res.json();
        break; // Success! Exit the loop.
      } catch (e: any) {
        errorMessages.push(`[${model}] threw an exception: ${e.message}`);
      }
    }

    if (!data) {
      const combinedErrors = errorMessages.join(' \n\n ');
      return new Response(JSON.stringify({ 
          error: `All allowed models failed. \n\nModels attempted: ${modelsToTry.join(', ')}\n\nErrors:\n${combinedErrors}` 
      }), { status: 400 });
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
