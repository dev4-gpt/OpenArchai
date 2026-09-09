import { DesignCommand } from "../components/voice-assistant/types";

export async function parseDesignCommand(transcript: string, projectContext?: { rooms?: string[], currentStyle?: string }): Promise<DesignCommand> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const prompt = `You are a Voice AI Assistant for OpenArchai, an architecture and interior design platform. 
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

  const prompt = `You are an expert architect and interior designer for OpenArchai. 
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
