/**
 * ROOFING CALCULATION SERVICE
 * Orchestrates roofing takeoff calculations (DB → Math → Results)
 * 
 * Architecture: LOGIC LAYER
 * - Fetches data from project
 * - Calls pure math functions
 * - Returns structured results with errors
 */

import type { ProjectModel, TakeoffLine, RoofPlane, RoofType, GridLine } from '@/types';
import { computeRoofPlaneGeometry, computeRoofCoverTakeoff } from '@/lib/math/roofing';

export interface RoofingCalculationResult {
  takeoffLines: TakeoffLine[];
  errors: string[];
  summary: {
    totalRoofArea_m2: number;
    roofPlaneCount: number;
    roofLineCount: number;
  };
}

/**
 * Calculate all roofing takeoff lines for a project
 */
export async function calculateRoofing(
  project: ProjectModel
): Promise<RoofingCalculationResult> {
  const takeoffLines: TakeoffLine[] = [];
  const errors: string[] = [];
  let totalRoofArea_m2 = 0;

  // Validate prerequisites
  if (!project.roofPlanes || project.roofPlanes.length === 0) {
    return {
      takeoffLines: [],
      errors: [],
      summary: { totalRoofArea_m2: 0, roofPlaneCount: 0, roofLineCount: 0 },
    };
  }

  if (!project.roofTypes || project.roofTypes.length === 0) {
    errors.push('No roof types defined');
    return {
      takeoffLines: [],
      errors,
      summary: { totalRoofArea_m2: 0, roofPlaneCount: project.roofPlanes.length, roofLineCount: 0 },
    };
  }

  const gridX = project.gridX || [];
  const gridY = project.gridY || [];

  // Process each roof plane
  for (const roofPlane of project.roofPlanes) {
    try {
      // Find associated roof type
      const roofType = project.roofTypes.find(rt => rt.id === roofPlane.roofTypeId);
      if (!roofType) {
        errors.push(`Roof plane "${roofPlane.name}": roof type not found (${roofPlane.roofTypeId})`);
        continue;
      }

      // Compute geometry (plan area, slope factor, slope area)
      const geometry = computeRoofPlaneGeometry(roofPlane, gridX, gridY);

      // Update roof plane computed values (in-memory only, not saved to DB here)
      roofPlane.computed = geometry;

      totalRoofArea_m2 += geometry.slopeArea_m2;

      // Generate takeoff line for roof covering
      const takeoffLine = computeRoofCoverTakeoff(roofPlane, roofType);
      takeoffLines.push(takeoffLine);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Roof plane "${roofPlane.name}": ${errorMsg}`);
    }
  }

  return {
    takeoffLines,
    errors,
    summary: {
      totalRoofArea_m2,
      roofPlaneCount: project.roofPlanes.length,
      roofLineCount: takeoffLines.length,
    },
  };
}
