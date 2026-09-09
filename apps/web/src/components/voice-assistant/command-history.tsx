"use client";

import React, { useState } from "react";
import { useVoice } from "./voice-provider";

export function CommandHistory() {
  const { commandHistory } = useVoice();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-24 right-0 bg-surface border-y border-l border-border rounded-l-lg p-2 shadow-sm z-40 text-xs text-muted hover:text-foreground flex items-center gap-1 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
        </svg>
        <span>{commandHistory.length}</span>
      </button>

      {isOpen && (
        <div className="fixed top-0 right-0 w-80 h-full bg-surface border-l border-border shadow-xl p-4 overflow-y-auto z-50 flex flex-col gap-4">
          <div className="flex justify-between items-center pb-2 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Command History</h2>
            <button onClick={() => setIsOpen(false)} className="text-muted hover:text-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {commandHistory.length === 0 ? (
              <p className="text-xs text-muted">No voice commands yet.</p>
            ) : (
              commandHistory.map((entry) => (
                <div key={entry.id} className="bg-[var(--background)] border border-border rounded-lg p-3 flex flex-col gap-1">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-medium text-foreground capitalize">
                      {entry.command.type.replace("_", " ")}
                    </span>
                    <span className="text-[10px] text-muted">
                      {entry.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted italic">"{entry.transcript}"</p>
                  <div className="mt-1 bg-surface rounded p-1">
                    <pre className="text-[10px] text-accent overflow-x-auto">
                      {JSON.stringify(entry.command, null, 2)}
                    </pre>
                  </div>
                  {entry.error && <p className="text-xs text-danger mt-1">{entry.error}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
