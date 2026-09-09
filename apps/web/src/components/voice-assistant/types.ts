export type DesignCommand = 
  | { type: "modify_room"; room: string; property: "width" | "height" | "style"; value: string }
  | { type: "add_element"; element: "wall" | "door" | "window"; position?: { x: number; y: number } }
  | { type: "change_style"; style: string; room?: string }
  | { type: "check_compliance"; standard: "nbc" | "ibc" | "vastu" | "ada" }
  | { type: "estimate_cost"; material?: string; room?: string }
  | { type: "generate_render"; style: string }
  | { type: "question"; query: string }
  | { type: "unknown"; raw: string };

export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "error";

export type CommandHistoryEntry = {
  id: string;
  timestamp: Date;
  transcript: string;
  command: DesignCommand;
  result?: string;
  error?: string;
};
