/**
 * ZOD SCHEMAS FOR API VALIDATION
 * Centralized validation schemas for all API endpoints
 */

import { z } from 'zod';

// ===================================
// PROJECT SCHEMAS
// ===================================

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200, 'Project name too long'),
  description: z.string().max(1000, 'Description too long').optional().default(''),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200, 'Project name too long').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  settings: z.object({
    unit: z.enum(['metric', 'imperial']).optional(),
    currency: z.string().optional(),
    defaultWasteFactor: z.number().min(0).max(1).optional(),
  }).optional(),
});

// ===================================
// CATALOG SCHEMAS
// ===================================

export const catalogSearchSchema = z.object({
  query: z.string().optional(),
  trade: z.enum(['Concrete', 'Rebar', 'Formwork', 'Structural Steel', 'Roofing', 'Finishing', 'Earthwork']).optional(),
  category: z.string().optional(),
  limit: z.string().optional().transform(val => {
    const num = parseInt(val || '1000');
    return Math.min(Math.max(1, num), 5000);
  }),
});

// ===================================
// GRID SCHEMAS
// ===================================

export const gridLineSchema = z.object({
  label: z.string().min(1, 'Grid label is required'),
  offset: z.number(),
});

export const updateGridSchema = z.object({
  gridX: z.array(gridLineSchema).optional(),
  gridY: z.array(gridLineSchema).optional(),
});

// ===================================
// LEVEL SCHEMAS
// ===================================

export const createLevelSchema = z.object({
  name: z.string().min(1, 'Level name is required'),
  elevation: z.number(),
  height: z.number().positive('Height must be positive'),
  levelType: z.enum(['floor', 'roof', 'foundation']).optional().default('floor'),
});

export const updateLevelSchema = createLevelSchema.partial();

// ===================================
// SPACE SCHEMAS
// ===================================

export const spaceBoundarySchema = z.object({
  type: z.enum(['gridRect', 'polygon']),
  data: z.union([
    z.object({
      gridX: z.tuple([z.string(), z.string()]),
      gridY: z.tuple([z.string(), z.string()]),
    }),
    z.object({
      points: z.array(z.tuple([z.number(), z.number()])),
    }),
  ]),
});

export const createSpaceSchema = z.object({
  name: z.string().min(1, 'Space name is required'),
  levelId: z.string().min(1, 'Level ID is required'),
  boundary: spaceBoundarySchema.optional(),
  spaceType: z.string().optional(),
});

export const updateSpaceSchema = createSpaceSchema.partial();

// ===================================
// WALL SURFACE SCHEMAS
// ===================================

export const createWallSurfaceSchema = z.object({
  name: z.string().min(1, 'Wall surface name is required'),
  levelId: z.string().min(1, 'Level ID is required'),
  spaceId: z.string().optional(),
  wallType: z.enum(['exterior', 'interior', 'partition']).optional().default('interior'),
  dimensions: z.object({
    length_m: z.number().positive('Length must be positive'),
    height_m: z.number().positive('Height must be positive'),
  }),
});

export const updateWallSurfaceSchema = createWallSurfaceSchema.partial();

// ===================================
// FINISH ASSIGNMENT SCHEMAS
// ===================================

export const createFinishAssignmentSchema = z.object({
  wallSurfaceId: z.string().min(1, 'Wall surface ID is required'),
  finishTypeId: z.string().min(1, 'Finish type ID is required'),
  side: z.enum(['front', 'back', 'both']).optional().default('front'),
});

// ===================================
// ROOFING SCHEMAS
// ===================================

export const trussParametersSchema = z.object({
  type: z.enum(['howe', 'fink', 'kingpost', 'queenpost', 'pratt', 'warren']),
  span_mm: z.number().positive('Span must be positive'),
  middleRise_mm: z.number().positive('Rise must be positive'),
  overhang_mm: z.number().min(0, 'Overhang cannot be negative'),
  spacing_mm: z.number().positive('Spacing must be positive'),
  verticalWebCount: z.number().int().min(0, 'Web count must be non-negative'),
  plateThickness: z.enum(['1.0mm (20 gauge)', '1.2mm (18 gauge)', '1.5mm (16 gauge)', '2.0mm (14 gauge)']),
  topChordMaterial: z.object({
    section: z.string(),
    weight_kg_per_m: z.number().positive(),
  }),
  bottomChordMaterial: z.object({
    section: z.string(),
    weight_kg_per_m: z.number().positive(),
  }),
  webMaterial: z.object({
    section: z.string(),
    weight_kg_per_m: z.number().positive(),
  }),
});

export const createRoofDesignSchema = z.object({
  trussParams: trussParametersSchema,
  buildingLength_mm: z.number().positive('Building length must be positive'),
  framingParams: z.object({
    roofingMaterial: z.object({
      type: z.string(),
      maxPurlinSpacing_mm: z.number().positive(),
    }),
    purlinSpacing_mm: z.number().positive(),
    purlinSpec: z.object({
      section: z.string(),
      weight_kg_per_m: z.number().positive(),
    }),
    bracing: z.object({
      type: z.enum(['X-Brace', 'Diagonal', 'K-Brace']),
      interval_mm: z.number().positive(),
      material: z.object({
        section: z.string(),
        weight_kg_per_m: z.number().positive(),
      }),
    }),
    includeRidgeCap: z.boolean().optional().default(true),
    includeEaveGirt: z.boolean().optional().default(true),
  }).optional(),
});

// ===================================
// OPENING SCHEMAS
// ===================================

export const createOpeningSchema = z.object({
  levelId: z.string().min(1, 'Level ID is required'),
  spaceId: z.string().optional(),
  wallSurfaceId: z.string().optional(),
  type: z.enum(['door', 'window', 'vent', 'louver', 'other']),
  width_m: z.number().positive('Width must be positive'),
  height_m: z.number().positive('Height must be positive'),
  qty: z.number().int().positive('Quantity must be positive').optional().default(1),
});

export const updateOpeningSchema = createOpeningSchema.partial();

// ===================================
// TYPE EXPORTS
// ===================================

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CatalogSearchInput = z.infer<typeof catalogSearchSchema>;
export type CreateLevelInput = z.infer<typeof createLevelSchema>;
export type UpdateLevelInput = z.infer<typeof updateLevelSchema>;
export type CreateSpaceInput = z.infer<typeof createSpaceSchema>;
export type UpdateSpaceInput = z.infer<typeof updateSpaceSchema>;
export type CreateWallSurfaceInput = z.infer<typeof createWallSurfaceSchema>;
export type CreateFinishAssignmentInput = z.infer<typeof createFinishAssignmentSchema>;
export type CreateRoofDesignInput = z.infer<typeof createRoofDesignSchema>;
export type CreateOpeningInput = z.infer<typeof createOpeningSchema>;
export type UpdateOpeningInput = z.infer<typeof updateOpeningSchema>;
