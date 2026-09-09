"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { VoiceState, CommandHistoryEntry, DesignCommand } from "./types";
import { parseVoiceCommand } from "./command-parser";

interface VoiceContextType {
  state: VoiceState;
  transcript: string;
  commandHistory: CommandHistoryEntry[];
  startListening: () => void;
  stopListening: () => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [commandHistory, setCommandHistory] = useState<CommandHistoryEntry[]>([]);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-IN";
        
        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
          
          if (event.results[0].isFinal) {
            processCommand(currentTranscript);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setState("error");
          setTimeout(() => setState("idle"), 3000);
        };

        recognitionRef.current.onend = () => {
          setState((prev) => prev === "listening" ? "idle" : prev);
        };
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const speakResponse = useCallback((text: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      setState("speaking");
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setState("idle");
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const processCommand = async (finalTranscript: string) => {
    setState("processing");
    try {
      const command = await parseVoiceCommand(finalTranscript);
      
      const newEntry: CommandHistoryEntry = {
        id: Date.now().toString(),
        timestamp: new Date(),
        transcript: finalTranscript,
        command,
      };
      
      setCommandHistory((prev) => [newEntry, ...prev]);
      
      let responseText = "Command recognized.";
      if (command.type === "generate_render") {
        responseText = `Generating ${command.style} render.`;
      } else if (command.type === "add_element") {
        responseText = `Adding ${command.element}.`;
      } else if (command.type === "unknown") {
        responseText = "I didn't quite catch that design command.";
      }
      
      speakResponse(responseText);
    } catch (error) {
      console.error(error);
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  const startListening = useCallback(() => {
    if (recognitionRef.current && state === "idle") {
      setTranscript("");
      try {
        recognitionRef.current.start();
        setState("listening");
      } catch (e) {
        console.error("Failed to start listening:", e);
        setState("error");
      }
    }
  }, [state]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && state === "listening") {
      recognitionRef.current.stop();
      setState("idle");
    }
  }, [state]);

  return (
    <VoiceContext.Provider value={{ state, transcript, commandHistory, startListening, stopListening }}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (context === undefined) {
    throw new Error("useVoice must be used within a VoiceProvider");
  }
  return context;
}
