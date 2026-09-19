import { DesignCommand } from "../components/voice-assistant/types";

export async function parseDesignCommand(transcript: string, projectContext?: { rooms?: string[], currentStyle?: string }): Promise<DesignCommand> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const prompt = `You are a Voice AI Assistant for AtelierOS, an architecture and interior design platform. 
  Parse the user's voice transcript and return a valid JSON object matching one of these schema types for a DesignCommand:

  Schema:
  - { "type": "modify_room", "room": string, "property": "width" | "height" | "style", "value": string }
  - { "type": "add_element", "element": "wall" | "door" | "window", "position": { "x": number, "y": number } (optional) }
  - { "type": "change_style", "style": string, "room": string (optional) }
  - { "type": "check_compliance", "standard": "nbc" | "ibc" | "vastu" | "ada" }
  - { "type": "estimate_cost", "material": string (optional), "room": string (optional) }
  - { "type": "generate_render", "style": string }
  - { "type": "question", "query": string }
  - { "type": "unknown", "raw": string }

  Context: ${JSON.stringify(projectContext || {})}
  Transcript: "${transcript}"

  Output ONLY the JSON object, without markdown formatting.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          response_mime_type: "application/json"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (resultText) {
      try {
        const parsed = JSON.parse(resultText) as DesignCommand;
        return parsed;
      } catch (e) {
        return { type: "unknown", raw: transcript };
      }
    }
    
    return { type: "unknown", raw: transcript };
  } catch (error) {
    console.error("Failed to parse design command:", error);
    return { type: "unknown", raw: transcript };
  }
}

export async function askArchitectQuestion(question: string, context?: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const prompt = `You are an expert architect and interior designer for AtelierOS. 
  Answer the following question briefly and professionally.
  Context: ${context || "None"}
  Question: "${question}"`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't process that question.";
  } catch (error) {
    console.error("Failed to answer architect question:", error);
    return "Sorry, I am unable to answer right now.";
  }
}

export interface MoodboardAnalysisResult {
  aesthetic: string;
  summary: string;
  palette: { hex: string; name: string }[];
  flooringMatch: { id: string; name: string; rationale: string };
  wallMatch: { id: string; name: string; rationale: string };
  hardwareFinish: string;
  suggestedPrompt: string;
}

export async function analyzeMoodboardImage(
  base64Data: string,
  mimeType = "image/jpeg",
): Promise<MoodboardAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  // Strip prefix data:image/...;base64, if present
  const cleanBase64 = base64Data.includes("base64,")
    ? base64Data.split("base64,")[1]
    : base64Data;

  const prompt = `You are a Principal Architectural Color & Material Specialist for AtelierOS.
Analyze this uploaded client moodboard / interior design inspiration image.
Extract the interior design palette and return a valid JSON object strictly matching this schema:

{
  "aesthetic": "string (e.g. 'Warm Japandi Minimalist', 'Modern Industrial Luxe', 'Scandinavian Serenity', 'Indian Heritage Contemporary')",
  "summary": "string (1-2 sentences explaining the architectural mood and light quality)",
  "palette": [
    { "hex": "#rrggbb", "name": "string (e.g. 'Warm Travertine', 'Earthy Ochre', 'Deep Charcoal')" }
  ],
  "flooringMatch": {
    "id": "fl_italian_statuario" OR "fl_kota_stone" OR "fl_herringbone_oak" OR "fl_wooden_teak",
    "name": "string matching the id",
    "rationale": "string explaining why this floor pairs with the moodboard"
  },
  "wallMatch": {
    "id": "wl_asian_paints_royale" OR "wl_raw_concrete" OR "wl_fluted_wood" OR "wl_exposed_brick",
    "name": "string matching the id",
    "rationale": "string explaining why this wall finish pairs with the moodboard"
  },
  "hardwareFinish": "string (e.g. 'Brushed Brass', 'Matte Black', 'Satin Nickel', 'Gunmetal')",
  "suggestedPrompt": "string (High-detail SDXL prompt describing the room with these exact materials, soft natural lighting, photorealistic 8k architectural digest style)"
}

Output ONLY valid raw JSON with 5 color palette items.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: cleanBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: "application/json",
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (resultText) {
      return JSON.parse(resultText) as MoodboardAnalysisResult;
    }
    throw new Error("No analysis returned from Gemini");
  } catch (error) {
    console.error("Moodboard analysis error:", error);
    // Graceful fallback palette
    return {
      aesthetic: "Warm Contemporary Minimalist",
      summary: "Balanced organic textures with warm light and tactile materiality.",
      palette: [
        { hex: "#f5f0eb", name: "Warm Alabaster" },
        { hex: "#b58a5b", name: "European Oak" },
        { hex: "#7a8a7c", name: "Honed Sage Stone" },
        { hex: "#c8b293", name: "Textured Linen" },
        { hex: "#2c2825", name: "Charcoal Accent" },
      ],
      flooringMatch: {
        id: "fl_herringbone_oak",
        name: "Herringbone Oak Wood",
        rationale: "Adds rhythmic organic warmth that grounds the minimalist layout.",
      },
      wallMatch: {
        id: "wl_asian_paints_royale",
        name: "Asian Paints Royale (Smooth Matt)",
        rationale: "Diffuses incoming daylight softly without harsh specular bounce.",
      },
      hardwareFinish: "Brushed Brass",
      suggestedPrompt:
        "Modern architectural living room, herringbone oak wood floor, soft warm off-white walls, linen sofa, large windows with warm afternoon sunlight, architectural digest photography, 8k",
    };
  }
}
