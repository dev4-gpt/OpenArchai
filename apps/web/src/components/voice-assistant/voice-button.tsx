"use client";

import React from "react";
import { useVoice } from "./voice-provider";

export function VoiceButton() {
  const { state, transcript, startListening, stopListening } = useVoice();

  const handleClick = () => {
    if (state === "listening") {
      stopListening();
    } else if (state === "idle" || state === "error" || state === "speaking") {
      startListening();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 flex flex-col items-end gap-2 z-50">
      {state === "listening" && transcript && (
        <div className="bg-surface border border-border text-foreground rounded-lg p-3 shadow-md max-w-xs text-sm">
          {transcript}
        </div>
      )}
      
      <button
        onClick={handleClick}
        className={`relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-colors border ${
          state === "listening" 
            ? "bg-surface border-accent" 
            : state === "processing" 
              ? "bg-surface border-foreground" 
              : state === "error"
                ? "bg-surface border-danger"
                : "bg-surface border-border hover:border-foreground"
        }`}
        aria-label="Toggle Voice Assistant"
      >
        {state === "listening" && (
          <span className="absolute inset-0 rounded-full border-2 border-accent animate-ping opacity-75"></span>
        )}
        
        {state === "processing" ? (
          <svg className="animate-spin h-6 w-6 text-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={`w-6 h-6 ${
              state === "listening" ? "text-accent" : state === "error" ? "text-danger" : "text-muted"
            }`}
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        )}
      </button>
    </div>
  );
}
