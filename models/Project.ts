import mongoose, { Schema, Model } from 'mongoose';
import type { ProjectModel, ProjectSettings, GridLine, Level, ElementTemplate, ElementInstance, Space, Opening, FinishType, SpaceFinishAssignment, WallSurface, WallSurfaceFinishAssignment, RoofType, RoofPlane, ScheduleItem } from '@/types';

// Default project settings
const defaultSettings: ProjectSettings = {
  rounding: {
    concrete: 3,
    rebar: 2,
    formwork: 2,
  },
  waste: {
    concrete: 0.05, // 5%
    rebar: 0.03, // 3%
    formwork: 0.02, // 2%
  },
  lap: {
    defaultLapLength: 0.4, // 40cm
    minLapLength: 0.3,
    maxLapLength: 0.6,
  },
  units: 'metric',
};

const GridLineSchema = new Schema<GridLine>({
  label: { type: String, required: true },
  offset: { type: Number, required: true },
});

const LevelSchema = new Schema<Level>({
  label: { type: String, required: true },
  elevation: { type: Number, required: true },
});

const ElementTemplateSchema = new Schema<ElementTemplate>({
  id: { type: String, required: true },
  type: { type: String, enum: ['beam', 'slab', 'column', 'foundation'], required: true },
  name: { type: String, required: true },
  properties: { type: Map, of: Number, required: true },
  dpwhItemNumber: String,
  rebarConfig: {
    mainBars: {
      count: Number,
      diameter: Number,
      spacing: Number,
    },
    stirrups: {
      diameter: Number,
      spacing: Number,
    },
    secondaryBars: {
      diameter: Number,
      spacing: Number,
    },
    dpwhRebarItem: String,
  },
});

const ElementInstanceSchema = new Schema<ElementInstance>({
  id: { type: String, required: true },
  templateId: { type: String, required: true },
  placement: {
    gridRef: [String],
    levelId: { type: String, required: true },
    endLevelId: String,
    customGeometry: { type: Map, of: Number },
  },
  tags: [String],
});

// ===================================
// FINISHING WORKS SCHEMAS
// ===================================

const SpaceSchema = new Schema<Space>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  levelId: { type: String, required: true },
  boundary: {
    type: { type: String, enum: ['gridRect', 'polygon'], required: true },
    data: { type: Schema.Types.Mixed, required: true }, // { gridX: [startLabel, endLabel], gridY: [...] } or { points: [[x,y],...] }
  },
  computed: {
    area_m2: { type: Number, default: 0 },
    perimeter_m: { type: Number, default: 0 },
  },
  metadata: { type: Map, of: String },
  tags: [String],
});

const OpeningSchema = new Schema<Opening>({
  id: { type: String, required: true },
  levelId: { type: String, required: true },
  spaceId: String, // optional - for space-based calculations (legacy)
  wallSurfaceId: String, // optional - for wall surface-based calculations
  type: { type: String, enum: ['door', 'window', 'vent', 'louver', 'other'], required: true },
  width_m: { type: Number, required: true },
  height_m: { type: Number, required: true },
  qty: { type: Number, required: true, default: 1 },
  computed: {
    area_m2: { type: Number, default: 0 },
  },
  tags: [String],
});

const FinishTypeSchema = new Schema<FinishType>({
  id: { type: String, required: true },
  category: { type: String, enum: ['floor', 'wall', 'ceiling', 'plaster', 'paint'], required: true },
  finishName: { type: String, required: true },
  dpwhItemNumberRaw: { type: String, required: true }, // must exist in catalog
  unit: { type: String, required: true }, // must match DPWH unit
  wallHeightRule: {
    mode: { type: String, enum: ['fullHeight', 'fixed'], default: 'fullHeight' },
    value_m: Number, // required if mode=fixed
  },
  deductionRule: {
    enabled: { type: Boolean, default: true },
    minOpeningAreaToDeduct_m2: { type: Number, default: 0.5 }, // 0.5m² minimum
    includeTypes: [String], // e.g., ["door", "window"]
  },
  assumptions: {
    wastePercent: Number,
    rounding: Number,
    notes: String,
  },
});

const SpaceFinishAssignmentSchema = new Schema<SpaceFinishAssignment>({
  id: { type: String, required: true },
  spaceId: { type: String, required: true },
  finishTypeId: { type: String, required: true },
  scope: { type: String, required: true }, // "base", "plaster", "paint", "tile", "ceiling", etc.
  overrides: {
    height_m: Number,
    wastePercent: Number,
  },
});

const WallSurfaceSchema = new Schema<WallSurface>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  gridLine: {
    axis: { type: String, enum: ['X', 'Y'], required: true },
    label: { type: String, required: true },
    span: { type: [String], required: true }, // [startLabel, endLabel]
  },
  levelStart: { type: String, required: true },
  levelEnd: { type: String, required: true },
  surfaceType: { type: String, enum: ['exterior', 'interior', 'both'], required: true },
  facing: { type: String, enum: ['north', 'south', 'east', 'west'] },
  computed: {
    length_m: { type: Number, default: 0 },
    height_m: { type: Number, default: 0 },
    grossArea_m2: { type: Number, default: 0 },
    sidesCount: { type: Number, default: 1 },
    totalArea_m2: { type: Number, default: 0 },
  },
  tags: [String],
});

const WallSurfaceFinishAssignmentSchema = new Schema<WallSurfaceFinishAssignment>({
  id: { type: String, required: true },
  wallSurfaceId: { type: String, required: true },
  finishTypeId: { type: String, required: true },
  scope: { type: String, required: true }, // "plaster", "paint", "tile", etc.
  side: { type: String, enum: ['single', 'both'] }, // Override default sides count
  overrides: {
    wastePercent: Number,
  },
});

// ===================================
// ROOFING SCHEMAS (MODE B)
// ===================================

// Truss Design Schema (Part E - Steel Roof Trusses)
const TrussDesignSchema = new Schema({
  trussParams: {
    type: { type: String, enum: ['howe', 'fink', 'kingpost'], default: 'howe' },
    span_mm: { type: Number, default: 8000 },
    middleRise_mm: { type: Number, default: 1600 },
    overhang_mm: { type: Number, default: 450 },
    spacing_mm: { type: Number, default: 600 },
    verticalWebCount: { type: Number, default: 3 },
    plateThickness: { type: String, default: '1.0mm (20 gauge)' },
    topChordMaterial: {
      section: { type: String, default: 'C100x50x20x2.5' },
      weight_kg_per_m: { type: Number, default: 4.89 }
    },
    bottomChordMaterial: {
      section: { type: String, default: 'C100x50x20x2.5' },
      weight_kg_per_m: { type: Number, default: 4.89 }
    },
    webMaterial: {
      section: { type: String, default: '2L50x50x6' },
      weight_kg_per_m: { type: Number, default: 4.5 }
    }
  },
  buildingLength_mm: { type: Number, default: 10000 },
  framingParams: {
    roofingMaterial: {
      type: { type: String, default: 'GI_Sheet' },
      maxPurlinSpacing_mm: { type: Number, default: 1200 }
    },
    purlinSpacing_mm: { type: Number, default: 600 },
    purlinSpec: {
      section: { type: String, default: 'C100x50x20x2.0' },
      weight_kg_per_m: { type: Number, default: 4.07 }
    },
    bracing: {
      type: { type: String, enum: ['X-Brace', 'Diagonal', 'K-Brace'], default: 'X-Brace' },
      interval_mm: { type: Number, default: 6000 },
      material: {
        section: { type: String, default: '2L50x50x6' },
        weight_kg_per_m: { type: Number, default: 4.6 }
      }
    },
    includeRidgeCap: { type: Boolean, default: true },
    includeEaveGirt: { type: Boolean, default: true }
  },
  dpwhItemMappings: {
    trussSteel: {
      dpwhItemNumberRaw: { type: String, default: '1047 (8) a' },
      description: { type: String, default: 'Structural Steel Trusses' },
      unit: { type: String, default: 'Kilogram' }
    },
    purlinSteel: {
      dpwhItemNumberRaw: { type: String, default: '1047 (8) b' },
      description: { type: String, default: 'Structural Steel Purlins' },
      unit: { type: String, default: 'Kilogram' }
    },
    bracingSteel: {
      dpwhItemNumberRaw: { type: String, default: '1047 (4) b' },
      description: { type: String, default: 'Metal Structure Accessories Turnbuckle' },
      unit: { type: String, default: 'Each' }
    },
    sagRods: {
      dpwhItemNumberRaw: { type: String, default: '1047 (5) b' },
      description: { type: String, default: 'Metal Structure Accessories Sagrods' },
      unit: { type: String, default: 'Kilogram' }
    },
    boltsAndRods: {
      dpwhItemNumberRaw: { type: String, default: '1047 (5) a' },
      description: { type: String, default: 'Metal Structure Accessories Bolts and Rods' },
      unit: { type: String, default: 'Kilogram' }
    },
    steelPlates: {
      dpwhItemNumberRaw: { type: String, default: '1047 (5) d' },
      description: { type: String, default: 'Metal Structure Accessories Steel Plates' },
      unit: { type: String, default: 'Kilogram' }
    },
    roofingSheets: {
      dpwhItemNumberRaw: { type: String, default: '1013 (1)' },
      description: { type: String, default: 'Corrugated Metal Roofing Gauge 26 (0.551 mm)' },
      unit: { type: String, default: 'Square Meter' }
    },
    ridgeCap: {
      dpwhItemNumberRaw: { type: String, default: '1013 (2) a' },
      description: { type: String, default: 'Fabricated Metal Roofing Accessory Gauge 26 (0.551 mm) Ridge/Hip Rolls' },
      unit: { type: String, default: 'Linear Meter' }
    }
  },
  lastModified: { type: Date, default: Date.now }
});

const RoofTypeSchema = new Schema<RoofType>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  dpwhItemNumberRaw: { type: String, required: true }, // must exist in catalog
  unit: { type: String, required: true }, // must match DPWH unit
  areaBasis: { type: String, enum: ['slopeArea', 'planArea'], default: 'slopeArea' },
  lapAllowancePercent: { type: Number, required: true, default: 0.10 },
  wastePercent: { type: Number, required: true, default: 0.05 },
  assumptions: {
    accessoriesBundled: { type: Boolean, default: false },
    fastenersIncluded: { type: Boolean, default: false },
    notes: String,
  },
});

const RoofPlaneSchema = new Schema<RoofPlane>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  levelId: { type: String, required: true },
  boundary: {
    type: { type: String, enum: ['gridRect', 'polygon'], required: true },
    data: { type: Schema.Types.Mixed, required: true },
  },
  slope: {
    mode: { type: String, enum: ['ratio', 'degrees'], required: true },
    value: { type: Number, required: true },
  },
  roofTypeId: { type: String, required: true },
  computed: {
    planArea_m2: { type: Number, default: 0 },
    slopeFactor: { type: Number, default: 1 },
    slopeArea_m2: { type: Number, default: 0 },
  },
  tags: [String],
});

// ===================================
// SCHEDULE ITEMS SCHEMA (MODE C)
// ===================================

const ScheduleItemSchema = new Schema<ScheduleItem>({
  id: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['termite-control', 'drainage', 'plumbing', 'carpentry', 'hardware', 'doors', 'windows', 'glazing', 'waterproofing', 'cladding', 'insulation', 'acoustical', 'other'],
    required: true 
  },
  dpwhItemNumberRaw: { type: String, required: true },
  descriptionOverride: String,
  unit: { type: String, required: true },
  qty: { type: Number, required: true },
  basisNote: { type: String, required: true },
  tags: [String],
});

const ProjectSchema = new Schema<ProjectModel>(
  {
    name: { type: String, required: true },
    description: String,
    settings: {
      type: {
        rounding: {
          concrete: Number,
          rebar: Number,
          formwork: Number,
        },
        waste: {
          concrete: Number,
          rebar: Number,
          formwork: Number,
        },
        lap: {
          defaultLapLength: Number,
          minLapLength: Number,
          maxLapLength: Number,
        },
        units: { type: String, enum: ['metric'], default: 'metric' },
      },
      default: defaultSettings,
    },
    gridX: [GridLineSchema],
    gridY: [GridLineSchema],
    levels: [LevelSchema],
    elementTemplates: [ElementTemplateSchema],
    elementInstances: [ElementInstanceSchema],
    // Finishing Works (Mode A)
    spaces: [SpaceSchema],
    openings: [OpeningSchema],
    finishTypes: [FinishTypeSchema],
    spaceFinishAssignments: [SpaceFinishAssignmentSchema],
    wallSurfaces: [WallSurfaceSchema],
    wallSurfaceFinishAssignments: [WallSurfaceFinishAssignmentSchema],
    // Roofing (Mode B)
    trussDesign: TrussDesignSchema,
    roofTypes: [RoofTypeSchema],
    roofPlanes: [RoofPlaneSchema],
    // Schedule Items (Mode C)
    scheduleItems: [ScheduleItemSchema],
  },
  {
    timestamps: true,
  }
);

// Prevent model recompilation during hot reload
const Project: Model<ProjectModel> = 
  mongoose.models.Project || mongoose.model<ProjectModel>('Project', ProjectSchema);

export default Project;
