// Floor plan editor data model. All coordinates are in meters — the canonical
// storage unit used by services/ml/reconstruct.py and build_ifc.py. Display
// conversion to feet/inches happens at the UI layer via @/lib/units.

export type Point = { x: number; y: number };

export type Wall = {
  id: string;
  start: Point;
  end: Point;
  thickness: number; // meters, default 0.15 (matches build_ifc.py WALL_THICKNESS_M)
};

export type Door = {
  id: string;
  position: Point; // center of door along the wall
  width: number; // meters
  wallId: string | null; // which wall it belongs to
};

export type Window = {
  id: string;
  position: Point;
  width: number; // meters
  wallId: string | null;
};

export type Room = {
  id: string;
  label: string;
  // Polygon vertices (closed loop of wall intersections that form a room)
  vertices: Point[];
  // Computed from vertices, kept in sync
  area: number; // square meters
  // For Vastu compliance: direction the room is in relative to center of plan
  direction?: "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | "center";
};

export type FloorPlan = {
  walls: Wall[];
  doors: Door[];
  windows: Window[];
  rooms: Room[];
  // Grid settings
  gridSize: number; // meters per grid cell (default 0.5m = ~1.6ft)
  // Canvas transform
  panOffset: Point;
  zoom: number;
};

export type EditorTool =
  | "select"
  | "wall"
  | "door"
  | "window"
  | "room"
  | "dimension"
  | "eraser";

export type EditorState = {
  tool: EditorTool;
  floorPlan: FloorPlan;
  // Selection
  selectedIds: string[];
  // Temporary drawing state
  drawingPoints: Point[]; // points being placed for current wall/room
  // Hover state for snap feedback
  snapPoint: Point | null;
  // Undo/redo
  undoStack: FloorPlan[];
  redoStack: FloorPlan[];
};

// Standard presets for Indian residential architecture
export const ROOM_PRESETS = {
  india: {
    "Master Bedroom": { width: 4.57, height: 3.66 }, // 15x12 ft
    Bedroom: { width: 3.66, height: 3.05 }, // 12x10 ft
    "Living Room": { width: 5.49, height: 3.66 }, // 18x12 ft
    Kitchen: { width: 3.05, height: 2.44 }, // 10x8 ft
    "Dining Room": { width: 3.66, height: 3.05 }, // 12x10 ft
    Bathroom: { width: 2.44, height: 1.83 }, // 8x6 ft
    WC: { width: 1.52, height: 1.22 }, // 5x4 ft
    "Pooja Room": { width: 1.83, height: 1.52 }, // 6x5 ft
    Balcony: { width: 3.05, height: 1.22 }, // 10x4 ft
    "Store Room": { width: 1.83, height: 1.52 }, // 6x5 ft
  },
  us: {
    "Master Bedroom": { width: 4.88, height: 4.27 }, // 16x14 ft
    Bedroom: { width: 3.66, height: 3.35 }, // 12x11 ft
    "Living Room": { width: 5.49, height: 4.27 }, // 18x14 ft
    Kitchen: { width: 3.66, height: 3.05 }, // 12x10 ft
    "Dining Room": { width: 3.66, height: 3.35 }, // 12x11 ft
    Bathroom: { width: 2.44, height: 2.44 }, // 8x8 ft
    "Half Bath": { width: 1.52, height: 1.52 }, // 5x5 ft
    "Walk-in Closet": { width: 2.44, height: 1.83 }, // 8x6 ft
    Garage: { width: 6.10, height: 6.10 }, // 20x20 ft
    Laundry: { width: 2.44, height: 1.83 }, // 8x6 ft
  },
} as const;

// Standard door widths (meters)
export const DOOR_WIDTHS = {
  india: {
    "Single (900mm)": 0.9,
    "Single (1000mm)": 1.0,
    "Double (1200mm)": 1.2,
    "Double (1500mm)": 1.5,
    "Main Entry (1200mm)": 1.2,
  },
  us: {
    "Single (36in)": 0.915,
    "Single (32in)": 0.813,
    "Double (60in)": 1.524,
    "French (72in)": 1.829,
    "Sliding (72in)": 1.829,
  },
} as const;

// Standard window widths (meters)
export const WINDOW_WIDTHS = {
  india: {
    "Standard (1200mm)": 1.2,
    "Large (1500mm)": 1.5,
    "Small (900mm)": 0.9,
    "Picture (1800mm)": 1.8,
  },
  us: {
    "Standard (36in)": 0.915,
    "Large (48in)": 1.219,
    "Small (24in)": 0.610,
    "Picture (60in)": 1.524,
  },
} as const;
