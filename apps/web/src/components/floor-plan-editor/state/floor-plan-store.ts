import { useState, useCallback, useSyncExternalStore } from "react";
import type { FloorPlan, EditorTool, Point, Wall, Door, Window, Room, FurnitureItem, PendingFurniture, StaircaseItem, ConstructionStage } from "../types";

export interface EditorState {
  tool: EditorTool;
  floorPlan: FloorPlan;
  selectedIds: string[];
  drawingPoints: Point[];
  snapPoint: Point | null;
  pendingFurniture: PendingFurniture | null;
  pendingStaircase: Omit<StaircaseItem, "id"> | null;
  undoStack: FloorPlan[];
  redoStack: FloorPlan[];
  showEgressOverlay: boolean;
  showLinter: boolean;
  showFarOverlay: boolean;
  showFarEnvelope: boolean;
  showStructuralGrid: boolean;
  selectedGridBay: "6.0x6.0" | "6.0x7.2" | "7.2x7.2";
  structuralGridModule: "6x6" | "6x7.2" | "7.2x7.2";
  showDaylightVastu: boolean;
  showDaylightingOverlay: boolean;
  showVastuOverlay: boolean;
  showPhasing4D: boolean;
  phasingDay: number;
  showConstructionStaging: boolean;
  constructionStage: ConstructionStage;
}

const initialFloorPlan: FloorPlan = {
  walls: [],
  doors: [],
  windows: [],
  rooms: [],
  furniture: [],
  staircases: [],
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
  pendingFurniture: null,
  pendingStaircase: null,
  undoStack: [],
  redoStack: [],
  showEgressOverlay: false,
  showLinter: false,
  showFarOverlay: false,
  showFarEnvelope: false,
  showStructuralGrid: false,
  selectedGridBay: "6.0x6.0",
  structuralGridModule: "6x6",
  showDaylightVastu: false,
  showDaylightingOverlay: false,
  showVastuOverlay: false,
  showPhasing4D: false,
  phasingDay: 90,
  showConstructionStaging: false,
  constructionStage: "all",
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
    currentState = {
      ...currentState,
      tool,
      drawingPoints: [],
      selectedIds: tool === "select" ? currentState.selectedIds : [],
      pendingFurniture: tool === "furniture" ? currentState.pendingFurniture : null,
      pendingStaircase: tool === "staircase" ? currentState.pendingStaircase : null,
    };
    emitChange();
  },

  setPendingFurniture: (item: PendingFurniture | null) => {
    currentState = {
      ...currentState,
      pendingFurniture: item,
      pendingStaircase: null,
      tool: item ? "furniture" : currentState.tool === "furniture" ? "select" : currentState.tool,
      drawingPoints: [],
    };
    emitChange();
  },

  setPendingStaircase: (stair: Omit<StaircaseItem, "id"> | null) => {
    currentState = {
      ...currentState,
      pendingStaircase: stair,
      pendingFurniture: null,
      tool: stair ? "staircase" : currentState.tool === "staircase" ? "select" : currentState.tool,
      drawingPoints: [],
    };
    emitChange();
  },

  addStaircase: (item: Omit<StaircaseItem, "id">) => {
    const newId = `stair_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newItem: StaircaseItem = { ...item, id: newId };
    const updated = pushUndo(currentState);
    currentState = {
      ...updated,
      selectedIds: [newId],
      tool: "select",
      pendingStaircase: null,
      floorPlan: {
        ...updated.floorPlan,
        staircases: [...(updated.floorPlan.staircases || []), newItem],
      },
    };
    emitChange();
    return newItem;
  },

  rotatePendingStaircase: () => {
    if (!currentState.pendingStaircase) return;
    currentState = {
      ...currentState,
      pendingStaircase: {
        ...currentState.pendingStaircase,
        rotation: ((currentState.pendingStaircase.rotation || 0) + 90) % 360,
      },
    };
    emitChange();
  },

  rotatePendingFurniture: () => {
    if (!currentState.pendingFurniture) return;
    currentState = {
      ...currentState,
      pendingFurniture: {
        ...currentState.pendingFurniture,
        rotation: ((currentState.pendingFurniture.rotation || 0) + 90) % 360,
      },
    };
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

  setEgressOverlay: (show: boolean) => {
    currentState = { ...currentState, showEgressOverlay: show };
    emitChange();
  },

  toggleEgressOverlay: () => {
    currentState = { ...currentState, showEgressOverlay: !currentState.showEgressOverlay };
    emitChange();
  },

  setLinter: (show: boolean) => {
    currentState = { ...currentState, showLinter: show };
    emitChange();
  },

  toggleLinter: () => {
    currentState = { ...currentState, showLinter: !currentState.showLinter };
    emitChange();
  },

  setFarOverlay: (show: boolean) => {
    currentState = { ...currentState, showFarOverlay: show, showFarEnvelope: show };
    emitChange();
  },

  toggleFarOverlay: () => {
    const nextVal = !currentState.showFarOverlay;
    currentState = { ...currentState, showFarOverlay: nextVal, showFarEnvelope: nextVal };
    emitChange();
  },

  setFarEnvelope: (show: boolean) => {
    currentState = { ...currentState, showFarOverlay: show, showFarEnvelope: show };
    emitChange();
  },

  toggleFarEnvelope: () => {
    const nextVal = !currentState.showFarOverlay;
    currentState = { ...currentState, showFarOverlay: nextVal, showFarEnvelope: nextVal };
    emitChange();
  },

  setStructuralGrid: (show: boolean) => {
    currentState = { ...currentState, showStructuralGrid: show };
    emitChange();
  },

  toggleStructuralGrid: () => {
    currentState = { ...currentState, showStructuralGrid: !currentState.showStructuralGrid };
    emitChange();
  },

  setStructuralBaySpacing: (bay: "6.0x6.0" | "6.0x7.2" | "7.2x7.2") => {
    const modMap: Record<string, "6x6" | "6x7.2" | "7.2x7.2"> = {
      "6.0x6.0": "6x6",
      "6.0x7.2": "6x7.2",
      "7.2x7.2": "7.2x7.2",
    };
    currentState = {
      ...currentState,
      selectedGridBay: bay,
      structuralGridModule: modMap[bay] || "6x6",
    };
    emitChange();
  },

  setStructuralGridSpacing: (bay: "6.0x6.0" | "6.0x7.2" | "7.2x7.2") => {
    floorPlanStore.setStructuralBaySpacing(bay);
  },

  setStructuralGridModule: (module: "6x6" | "6x7.2" | "7.2x7.2") => {
    const bayMap: Record<string, "6.0x6.0" | "6.0x7.2" | "7.2x7.2"> = {
      "6x6": "6.0x6.0",
      "6x7.2": "6.0x7.2",
      "7.2x7.2": "7.2x7.2",
    };
    currentState = {
      ...currentState,
      structuralGridModule: module,
      selectedGridBay: bayMap[module] || "6.0x6.0",
    };
    emitChange();
  },

  setDaylightVastu: (show: boolean) => {
    currentState = {
      ...currentState,
      showDaylightVastu: show,
      showDaylightingOverlay: show,
      showVastuOverlay: show,
    };
    emitChange();
  },

  toggleDaylightVastu: () => {
    const next = !currentState.showDaylightVastu;
    currentState = {
      ...currentState,
      showDaylightVastu: next,
      showDaylightingOverlay: next,
      showVastuOverlay: next,
    };
    emitChange();
  },

  setDaylightingOverlay: (show: boolean) => {
    currentState = { ...currentState, showDaylightingOverlay: show };
    emitChange();
  },

  toggleDaylightingOverlay: () => {
    currentState = { ...currentState, showDaylightingOverlay: !currentState.showDaylightingOverlay };
    emitChange();
  },

  setVastuOverlay: (show: boolean) => {
    currentState = { ...currentState, showVastuOverlay: show };
    emitChange();
  },

  toggleVastuOverlay: () => {
    currentState = { ...currentState, showVastuOverlay: !currentState.showVastuOverlay };
    emitChange();
  },

  setPhasing4D: (show: boolean) => {
    currentState = { ...currentState, showPhasing4D: show };
    emitChange();
  },

  togglePhasing4D: () => {
    currentState = { ...currentState, showPhasing4D: !currentState.showPhasing4D };
    emitChange();
  },

  setPhasingDay: (day: number) => {
    currentState = { ...currentState, phasingDay: Math.max(0, Math.min(90, Math.round(day))) };
    emitChange();
  },

  toggleConstructionStaging: () => {
    currentState = {
      ...currentState,
      showConstructionStaging: !currentState.showConstructionStaging,
    };
    emitChange();
  },

  setConstructionStaging: (show: boolean) => {
    currentState = { ...currentState, showConstructionStaging: show };
    emitChange();
  },

  setConstructionStage: (stage: ConstructionStage) => {
    currentState = { ...currentState, constructionStage: stage };
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

  addFurniture: (item: Omit<FurnitureItem, "id"> & { id?: string }) => {
    const newId = item.id || `furn_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newItem: FurnitureItem = { ...item, id: newId };
    const updated = pushUndo(currentState);
    currentState = {
      ...updated,
      selectedIds: [newId],
      tool: "select",
      pendingFurniture: null,
      floorPlan: {
        ...updated.floorPlan,
        furniture: [...(updated.floorPlan.furniture || []), newItem],
      },
    };
    emitChange();
    return newItem;
  },

  updateFurniturePosition: (id: string, position: Point) => {
    currentState = {
      ...currentState,
      floorPlan: {
        ...currentState.floorPlan,
        furniture: (currentState.floorPlan.furniture || []).map((f) =>
          f.id === id ? { ...f, position } : f,
        ),
      },
    };
    emitChange();
  },

  moveElement: (id: string, newPos: Point) => {
    const plan = currentState.floorPlan;
    // 1. Furniture
    const furnIndex = (plan.furniture || []).findIndex((f) => f.id === id);
    if (furnIndex !== -1) {
      const newFurn = [...(plan.furniture || [])];
      newFurn[furnIndex] = { ...newFurn[furnIndex], position: newPos };
      currentState = {
        ...currentState,
        floorPlan: { ...plan, furniture: newFurn },
      };
      emitChange();
      return;
    }
    // 2. Doors
    const doorIndex = plan.doors.findIndex((d) => d.id === id);
    if (doorIndex !== -1) {
      const newDoors = [...plan.doors];
      newDoors[doorIndex] = { ...newDoors[doorIndex], position: newPos };
      currentState = {
        ...currentState,
        floorPlan: { ...plan, doors: newDoors },
      };
      emitChange();
      return;
    }
    // 3. Windows
    const winIndex = plan.windows.findIndex((w) => w.id === id);
    if (winIndex !== -1) {
      const newWins = [...plan.windows];
      newWins[winIndex] = { ...newWins[winIndex], position: newPos };
      currentState = {
        ...currentState,
        floorPlan: { ...plan, windows: newWins },
      };
      emitChange();
      return;
    }
    // 4. Rooms (translate all vertices by delta from previous centroid)
    const roomIndex = plan.rooms.findIndex((r) => r.id === id);
    if (roomIndex !== -1) {
      const room = plan.rooms[roomIndex];
      if (room.vertices.length > 0) {
        const cx = room.vertices.reduce((s, p) => s + p.x, 0) / room.vertices.length;
        const cy = room.vertices.reduce((s, p) => s + p.y, 0) / room.vertices.length;
        const dx = newPos.x - cx;
        const dy = newPos.y - cy;
        const newVertices = room.vertices.map((v) => ({
          x: Math.round((v.x + dx) * 100) / 100,
          y: Math.round((v.y + dy) * 100) / 100,
        }));
        const newRooms = [...plan.rooms];
        newRooms[roomIndex] = { ...room, vertices: newVertices };
        currentState = {
          ...currentState,
          floorPlan: { ...plan, rooms: newRooms },
        };
        emitChange();
        return;
      }
    }
    // 5. Staircases
    const stairIndex = (plan.staircases || []).findIndex((s) => s.id === id);
    if (stairIndex !== -1) {
      const newStairs = [...(plan.staircases || [])];
      newStairs[stairIndex] = { ...newStairs[stairIndex], position: newPos };
      currentState = {
        ...currentState,
        floorPlan: { ...plan, staircases: newStairs },
      };
      emitChange();
      return;
    }
  },

  nudgeFurniture: (id: string, delta: Point) => {
    const furn = (currentState.floorPlan.furniture || []).find((f) => f.id === id);
    if (!furn) return;
    const updated = pushUndo(currentState);
    currentState = {
      ...updated,
      floorPlan: {
        ...updated.floorPlan,
        furniture: (updated.floorPlan.furniture || []).map((f) =>
          f.id === id
            ? {
                ...f,
                position: {
                  x: Math.round((f.position.x + delta.x) * 100) / 100,
                  y: Math.round((f.position.y + delta.y) * 100) / 100,
                },
              }
            : f,
        ),
      },
    };
    emitChange();
  },

  commitUndoSnapshot: (prevPlan: FloorPlan) => {
    currentState = {
      ...currentState,
      undoStack: [...currentState.undoStack.slice(-20), JSON.parse(JSON.stringify(prevPlan))],
      redoStack: [],
    };
    emitChange();
  },

  rotateFurniture: (id: string) => {
    const updated = pushUndo(currentState);
    currentState = {
      ...updated,
      floorPlan: {
        ...updated.floorPlan,
        furniture: (updated.floorPlan.furniture || []).map((f) =>
          f.id === id ? { ...f, rotation: (f.rotation + 90) % 360 } : f,
        ),
      },
    };
    emitChange();
  },

  deleteElement: (id: string) => {
    const updated = pushUndo(currentState);
    currentState = {
      ...updated,
      selectedIds: currentState.selectedIds.filter((x) => x !== id),
      floorPlan: {
        ...updated.floorPlan,
        walls: updated.floorPlan.walls.filter((w) => w.id !== id),
        doors: updated.floorPlan.doors.filter((d) => d.id !== id),
        windows: updated.floorPlan.windows.filter((win) => win.id !== id),
        rooms: updated.floorPlan.rooms.filter((r) => r.id !== id),
        furniture: (updated.floorPlan.furniture || []).filter((f) => f.id !== id),
        staircases: (updated.floorPlan.staircases || []).filter((s) => s.id !== id),
      },
    };
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
        furniture: (updated.floorPlan.furniture || []).filter((f) => !ids.has(f.id)),
        staircases: (updated.floorPlan.staircases || []).filter((s) => !ids.has(s.id)),
      },
    };
    emitChange();
  },

  clearPlan: () => {
    const { walls, doors, windows, rooms, furniture = [], staircases = [] } = currentState.floorPlan;
    if (walls.length === 0 && doors.length === 0 && windows.length === 0 && rooms.length === 0 && furniture.length === 0 && staircases.length === 0) {
      return;
    }
    const updated = pushUndo(currentState);
    currentState = {
      ...updated,
      selectedIds: [],
      drawingPoints: [],
      floorPlan: {
        ...updated.floorPlan,
        walls: [],
        doors: [],
        windows: [],
        rooms: [],
        furniture: [],
        staircases: [],
      },
    };
    emitChange();
  },

  resetView: () => {
    currentState = {
      ...currentState,
      floorPlan: {
        ...currentState.floorPlan,
        zoom: 35,
        panOffset: { x: 300, y: 250 },
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
      floorPlan: {
        ...plan,
        furniture: plan.furniture || [],
        staircases: plan.staircases || [],
      },
      selectedIds: [],
      drawingPoints: [],
      undoStack: [],
      redoStack: [],
    };
    emitChange();
  },
};

export function useFloorPlanStore(): EditorState {
  return useSyncExternalStore(
    floorPlanStore.subscribe,
    floorPlanStore.getState,
    floorPlanStore.getState,
  );
}
