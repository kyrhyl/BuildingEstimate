/**
 * CORE TYPE DEFINITIONS
 * Stable contracts for the Building Estimate system
 * Following strict layer separation principles
 */

// ===================================
// PROJECT & SETTINGS
// ===================================

export interface ProjectSettings {
  rounding: {
    concrete: number; // decimal places for concrete volumes
    rebar: number; // decimal places for rebar weights
    formwork: number; // decimal places for formwork areas
  };
  waste: {
    concrete: number; // waste percentage (e.g., 0.05 for 5%)
    rebar: number;
    formwork: number;
  };
  lap: {
    defaultLapLength: number; // meters
    minLapLength: number;
    maxLapLength: number;
  };
  units: 'metric'; // locked to metric
}

export interface GridLine {
  label: string; // e.g., "A", "B", "1", "2"
  offset: number; // meters from origin
}

export interface Level {
  label: string; // e.g., "GL", "2F", "ROOF"
  elevation: number; // meters from reference datum
}

export interface RebarConfig {
  // Main reinforcement (longitudinal bars)
  mainBars?: {
    count?: number;       // Number of bars (for beams/columns)
    diameter: number;     // Bar diameter in mm (10, 12, 16, 20, 25, 28, 32, 36, 40)
    spacing?: number;     // Center-to-center spacing in meters (for slabs/foundations)
  };
  // Lateral reinforcement (stirrups/ties)
  stirrups?: {
    diameter: number;    // Stirrup diameter in mm
    spacing: number;     // Center-to-center spacing in meters
  };
  // For slabs/foundations: secondary reinforcement (perpendicular to main)
  secondaryBars?: {
    diameter: number;    // Bar diameter in mm
    spacing: number;     // Center-to-center spacing in meters
  };
  // DPWH rebar item number for BOQ mapping
  dpwhRebarItem?: string; // e.g., "902 (1) a1" - 10mm deformed bars
}

export interface ElementTemplate {
  id: string;
  type: 'beam' | 'slab' | 'column' | 'foundation';
  name: string;
  properties: Record<string, number>; // e.g., { width: 0.3, height: 0.5 }
  dpwhItemNumber?: string; // DPWH catalog item for BOQ mapping (e.g., "900 (1) a")
  rebarConfig?: RebarConfig;
}


export interface ElementInstance {
  id: string;
  templateId: string;
  placement: {
    gridRef?: string[]; // e.g., ["A-B", "1-2"] for slabs
    levelId: string;
    endLevelId?: string; // for columns - level where column ends
    customGeometry?: Record<string, number>; // override template
  };
  tags: string[]; // for filtering/grouping
}

export interface ProjectModel {
  _id?: string;
  name: string;
  description?: string;
  settings: ProjectSettings;
  gridX?: GridLine[];
  gridY?: GridLine[];
  levels?: Level[];
  elementTemplates?: ElementTemplate[];
  elementInstances?: ElementInstance[];
  createdAt?: Date;
  updatedAt?: Date;
}

// ===================================
// TAKEOFF & ESTIMATION
// ===================================

export type Trade = 
  | 'Concrete' 
  | 'Rebar' 
  | 'Formwork'
  | 'Earthwork'
  | 'Plumbing'
  | 'Carpentry'
  | 'Hardware'
  | 'Doors & Windows'
  | 'Glass & Glazing'
  | 'Roofing'
  | 'Waterproofing'
  | 'Finishes'
  | 'Painting'
  | 'Masonry'
  | 'Structural Steel'
  | 'Structural'
  | 'Foundation'
  | 'Railing'
  | 'Cladding'
  | 'MEPF'
  | 'Marine Works'
  | 'General Requirements'
  | 'Other';

export interface TakeoffLine {
  id: string;
  sourceElementId: string; // references ElementInstance
  trade: Trade;
  resourceKey: string; // e.g., "concrete-class-a", "rebar-16mm"
  quantity: number;
  unit: string; // e.g., "m³", "kg", "m²"
  formulaText: string; // human-readable formula
  inputsSnapshot: Record<string, number>; // inputs used in calculation
  assumptions: string[]; // e.g., ["Waste: 5%", "Lap: 40Ø"]
  tags: string[]; // e.g., ["level:2F", "grid:A-B", "type:beam"]
  calculatedAt?: Date;
}

// ===================================
// BOQ (Bill of Quantities)
// ===================================

export interface BOQLine {
  id: string;
  dpwhItemNumberRaw: string; // e.g., "301(1)a", "301(2)b"
  description: string; // DPWH item description
  unit: string;
  quantity: number;
  sourceTakeoffLineIds: string[]; // traceability
  tags: string[];
}

// ===================================
// CALCULATION RUN
// ===================================

export type CalcRunStatus = 'running' | 'completed' | 'failed';

export interface CalcRunSummary {
  totalConcrete: number; // m³
  totalRebar: number; // kg
  totalFormwork: number; // m²
  takeoffLineCount: number;
  boqLineCount: number;
}

export interface CalcRun {
  _id?: string;
  runId: string;
  projectId: string;
  timestamp: Date;
  status: CalcRunStatus;
  summary?: CalcRunSummary;
  takeoffLines?: TakeoffLine[];
  boqLines?: BOQLine[];
  errors?: string[];
}

// ===================================
// DPWH CATALOG
// ===================================

export interface DPWHCatalogItem {
  itemNumber: string; // e.g., "900 (1)", "902 (1) a1" - unique identifier from DPWH catalog
  description: string;
  unit: string; // e.g., "Cubic Meter", "Kilogram", "Square Meter"
  category: string; // e.g., "Concrete Works", "Reinforcing Steel", "Formwork"
  trade: Trade; // Concrete, Rebar, or Formwork
  subCategory?: string;
  notes?: string;
}

export interface CatalogSearchParams {
  query?: string; // search in item number or description
  trade?: Trade;
  category?: string;
  limit?: number;
}

// ===================================
// MATH LAYER INPUTS/OUTPUTS
// ===================================

export interface ConcreteInput {
  elementType: 'beam' | 'slab' | 'column';
  dimensions: {
    length?: number;
    width?: number;
    height?: number;
    diameter?: number; // for circular columns
  };
  waste: number; // percentage as decimal
}

export interface ConcreteOutput {
  volume: number; // m³
  formulaText: string;
  inputs: Record<string, number>;
}

export interface RebarInput {
  barDiameter: number; // mm
  barLength: number; // m
  barCount: number;
  lapLength?: number; // m
  waste?: number; // percentage as decimal
}

export interface RebarOutput {
  weight: number; // kg
  formulaText: string;
  inputs: Record<string, number>;
}

export interface FormworkInput {
  elementType: 'beam' | 'slab' | 'column';
  dimensions: {
    length?: number;
    width?: number;
    height?: number;
    diameter?: number;
  };
  exposedSides: string[]; // e.g., ["bottom", "left", "right"]
}

export interface FormworkOutput {
  area: number; // m²
  formulaText: string;
  inputs: Record<string, number>;
}
