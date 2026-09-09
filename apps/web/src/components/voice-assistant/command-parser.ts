import { DesignCommand } from "./types";

export async function parseVoiceCommand(transcript: string, projectContext?: object): Promise<DesignCommand> {
  try {
    const response = await fetch('/api/voice/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcript, projectContext }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data.command as DesignCommand;
  } catch (error) {
    console.error("Error parsing voice command:", error);
    return { type: "unknown", raw: transcript };
  }
}
