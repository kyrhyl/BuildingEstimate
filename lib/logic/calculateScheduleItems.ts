/**
 * SCHEDULE ITEMS CALCULATION SERVICE
 * Orchestrates schedule-based takeoff calculations (DB → Results)
 * 
 * Architecture: LOGIC LAYER
 * - Fetches schedule items from project
 * - Generates TakeoffLines directly (no complex math needed)
 * - Returns structured results with full traceability
 */

import { v4 as uuidv4 } from 'uuid';
import type { ProjectModel, TakeoffLine, ScheduleItem } from '@/types';

export interface ScheduleCalculationResult {
  takeoffLines: TakeoffLine[];
  errors: string[];
  summary: {
    totalItems: number;
    byCategory: Record<string, number>;
  };
}

/**
 * Map schedule item category to part and category tags
 */
function mapCategoryToTags(category: ScheduleItem['category']): { part: string; category: string } {
  const mapping: Record<ScheduleItem['category'], { part: string; category: string }> = {
    // Part E - Finishing Works
    'termite-control': { part: 'PART E', category: 'Finishing Works' },
    'drainage': { part: 'PART E', category: 'Plumbing Works' },
    'plumbing': { part: 'PART E', category: 'Plumbing Works' },
    'carpentry': { part: 'PART E', category: 'Carpentry Works' },
    'hardware': { part: 'PART E', category: 'Hardware' },
    'doors': { part: 'PART E', category: 'Doors & Windows' },
    'windows': { part: 'PART E', category: 'Doors & Windows' },
    'glazing': { part: 'PART E', category: 'Glass & Glazing' },
    'waterproofing': { part: 'PART E', category: 'Waterproofing' },
    'cladding': { part: 'PART E', category: 'Cladding' },
    'insulation': { part: 'PART E', category: 'Other' },
    'acoustical': { part: 'PART E', category: 'Other' },
    'other': { part: 'PART E', category: 'Other' },
    // Part C - Earthworks
    'earthworks-clearing': { part: 'PART C', category: 'Earthwork' },
    'earthworks-removal-trees': { part: 'PART C', category: 'Earthwork' },
    'earthworks-removal-structures': { part: 'PART C', category: 'Earthwork' },
    'earthworks-excavation': { part: 'PART C', category: 'Earthwork' },
    'earthworks-structure-excavation': { part: 'PART C', category: 'Earthwork' },
    'earthworks-embankment': { part: 'PART C', category: 'Earthwork' },
    'earthworks-site-development': { part: 'PART C', category: 'Earthwork' },
  };
  return mapping[category] || { part: 'PART E', category: 'Other' };
}

/**
 * Calculate all schedule-based takeoff lines for a project
 */
export async function calculateScheduleItems(
  project: ProjectModel
): Promise<ScheduleCalculationResult> {
  const takeoffLines: TakeoffLine[] = [];
  const errors: string[] = [];
  const byCategory: Record<string, number> = {};

  // Validate prerequisites
  if (!project.scheduleItems || project.scheduleItems.length === 0) {
    return {
      takeoffLines: [],
      errors: [],
      summary: { totalItems: 0, byCategory: {} },
    };
  }

  // Process each schedule item
  for (const item of project.scheduleItems) {
    try {
      const { part, category } = mapCategoryToTags(item.category);

      // Build formula text
      const formulaText = `Direct quantity from schedule: ${item.qty} ${item.unit}`;

      // Snapshot inputs
      const inputsSnapshot: Record<string, number> = {
        qty: item.qty,
      };

      // Build assumptions
      const assumptions: string[] = [
        `Basis: ${item.basisNote}`,
        `Category: ${item.category}`,
      ];

      if (item.descriptionOverride) {
        assumptions.push(`Description: ${item.descriptionOverride}`);
      }

      // Create takeoff line
      const takeoffLine: TakeoffLine = {
        id: uuidv4(),
        sourceElementId: item.id,
        resourceKey: `schedule-${item.category}-${item.id}`,
        quantity: item.qty,
        unit: item.unit,
        formulaText,
        inputsSnapshot,
        assumptions,
        tags: [
          `part:${part}`,
          `category:${category}`,
          `scheduleCategory:${item.category}`,
          `dpwh:${item.dpwhItemNumberRaw}`,
          ...item.tags,
        ],
      };

      takeoffLines.push(takeoffLine);

      // Update summary
      byCategory[item.category] = (byCategory[item.category] || 0) + 1;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Schedule item ${item.id}: ${errorMsg}`);
    }
  }

  return {
    takeoffLines,
    errors,
    summary: {
      totalItems: project.scheduleItems.length,
      byCategory,
    },
  };
}
