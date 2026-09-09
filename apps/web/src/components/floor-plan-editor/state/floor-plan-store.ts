import { useState, useCallback, useSyncExternalStore } from "react";
import type { FloorPlan, EditorTool, Point, Wall, Door, Window, Room } from "../types";

export interface EditorState {
  tool: EditorTool;
  floorPlan: FloorPlan;
  selectedIds: string[];
  drawingPoints: Point[];
  snapPoint: Point | null;
  undoStack: FloorPlan[];
  redoStack: FloorPlan[];
}

const initialFloorPlan: FloorPlan = {
  walls: [],
  doors: [],
  windows: [],
  rooms: [],
  gridSize: 0.5, // meters
  panOffset: { x: 300, y: 250 },
  zoom: 35, // pixels per meter
};

let currentState: EditorState = {
  tool: "select",
  floorPlan: initialFloorPlan,
  selectedIds: [],
  drawingPoints: [],
  snapPoint: null,
  undoStack: [],
  redoStack: [],
};

const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function pushUndo(state: EditorState): EditorState {
  return {
    ...state,
    undoStack: [...state.undoStack.slice(-20), JSON.parse(JSON.stringify(state.floorPlan))],
    redoStack: [],
  };
}

export const floorPlanStore = {
  getState: () => currentState,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  setTool: (tool: EditorTool) => {
    currentState = { ...currentState, tool, drawingPoints: [], selectedIds: [] };
    emitChange();
  },

  setSnapPoint: (snapPoint: Point | null) => {
    currentState = { ...currentState, snapPoint };
    emitChange();
  },

  setPanOffset: (panOffset: Point) => {
    currentState = {
      ...currentState,
      floorPlan: { ...currentState.floorPlan, panOffset },
    };
    emitChange();
  },

  setZoom: (zoom: number) => {
    const clamped = Math.max(10, Math.min(150, zoom));
    currentState = {
      ...currentState,
      floorPlan: { ...currentState.floorPlan, zoom: clamped },
    };
    emitChange();
  },

  addWallPoint: (pt: Point) => {
    const points = [...currentState.drawingPoints, pt];
    if (points.length === 2) {
      const newWall: Wall = {
        id: `wall_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        start: points[0],
        end: points[1],
        thickness: 0.15,
      };

      const updated = pushUndo(currentState);
      currentState = {
        ...updated,
        drawingPoints: [points[1]], // chain next wall
        floorPlan: {
          ...updated.floorPlan,
          walls: [...updated.floorPlan.walls, newWall],
        },
      };
      emitChange();
    } else {
      currentState = { ...currentState, drawingPoints: points };
      emitChange();
    }
  },

  finishDrawing: () => {
    currentState = { ...currentState, drawingPoints: [] };
    emitChange();
  },

  addDoor: (position: Point, width: number = 0.9, wallId: string | null = null) => {
    const newDoor: Door = {
      id: `door_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      position,
      width,
      wallId,
    };
    const updated = pushUndo(currentState);
    currentState = {
      ...updated,
      floorPlan: {
        ...updated.floorPlan,
        doors: [...updated.floorPlan.doors, newDoor],
      },
    };
    emitChange();
  },

  addWindow: (position: Point, width: number = 1.2, wallId: string | null = null) => {
    const newWindow: Window = {
      id: `win_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      position,
      width,
      wallId,
    };
    const updated = pushUndo(currentState);
    currentState = {
      ...updated,
      floorPlan: {
        ...updated.floorPlan,
        windows: [...updated.floorPlan.windows, newWindow],
      },
    };
    emitChange();
  },

  addPresetRoom: (label: string, width: number, height: number, center: Point = { x: 0, y: 0 }) => {
    const halfW = width / 2;
    const halfH = height / 2;
    const p1: Point = { x: center.x - halfW, y: center.y - halfH };
    const p2: Point = { x: center.x + halfW, y: center.y - halfH };
    const p3: Point = { x: center.x + halfW, y: center.y + halfH };
    const p4: Point = { x: center.x - halfW, y: center.y + halfH };

    const newWalls: Wall[] = [
      { id: `wall_${Date.now()}_1`, start: p1, end: p2, thickness: 0.15 },
      { id: `wall_${Date.now()}_2`, start: p2, end: p3, thickness: 0.15 },
      { id: `wall_${Date.now()}_3`, start: p3, end: p4, thickness: 0.15 },
      { id: `wall_${Date.now()}_4`, start: p4, end: p1, thickness: 0.15 },
    ];

    const newRoom: Room = {
      id: `room_${Date.now()}`,
      label,
      vertices: [p1, p2, p3, p4],
      area: width * height,
    };

    const updated = pushUndo(currentState);
    currentState = {
      ...updated,
      floorPlan: {
        ...updated.floorPlan,
        walls: [...updated.floorPlan.walls, ...newWalls],
        rooms: [...updated.floorPlan.rooms, newRoom],
      },
    };
    emitChange();
  },

  selectElement: (id: string, multi = false) => {
    if (multi) {
      currentState = {
        ...currentState,
        selectedIds: currentState.selectedIds.includes(id)
          ? currentState.selectedIds.filter((x) => x !== id)
          : [...currentState.selectedIds, id],
      };
    } else {
      currentState = { ...currentState, selectedIds: [id] };
    }
    emitChange();
  },

  clearSelection: () => {
    currentState = { ...currentState, selectedIds: [] };
    emitChange();
  },

  deleteSelected: () => {
    if (currentState.selectedIds.length === 0) return;
    const updated = pushUndo(currentState);
    const ids = new Set(currentState.selectedIds);
    currentState = {
      ...updated,
      selectedIds: [],
      floorPlan: {
        ...updated.floorPlan,
        walls: updated.floorPlan.walls.filter((w) => !ids.has(w.id)),
        doors: updated.floorPlan.doors.filter((d) => !ids.has(d.id)),
        windows: updated.floorPlan.windows.filter((win) => !ids.has(win.id)),
        rooms: updated.floorPlan.rooms.filter((r) => !ids.has(r.id)),
      },
    };
    emitChange();
  },

  undo: () => {
    if (currentState.undoStack.length === 0) return;
    const previous = currentState.undoStack[currentState.undoStack.length - 1];
    const newUndoStack = currentState.undoStack.slice(0, -1);
    currentState = {
      ...currentState,
      redoStack: [JSON.parse(JSON.stringify(currentState.floorPlan)), ...currentState.redoStack],
      undoStack: newUndoStack,
      floorPlan: previous,
      selectedIds: [],
      drawingPoints: [],
    };
    emitChange();
  },

  redo: () => {
    if (currentState.redoStack.length === 0) return;
    const next = currentState.redoStack[0];
    const newRedoStack = currentState.redoStack.slice(1);
    currentState = {
      ...currentState,
      undoStack: [...currentState.undoStack, JSON.parse(JSON.stringify(currentState.floorPlan))],
      redoStack: newRedoStack,
      floorPlan: next,
      selectedIds: [],
      drawingPoints: [],
    };
    emitChange();
  },

  loadPlan: (plan: FloorPlan) => {
    currentState = {
      ...currentState,
      floorPlan: plan,
      selectedIds: [],
      drawingPoints: [],
      undoStack: [],
      redoStack: [],
    };
    emitChange();
  },
};

export function useFloorPlanStore(): EditorState {
  return useSyncExternalStore(floorPlanStore.subscribe, floorPlanStore.getState);
}
