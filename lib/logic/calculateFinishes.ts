/**
 * Finishing Works Calculation Service
 * Generates takeoff lines for finishing works
 */

import type {
  Space,
  Opening,
  FinishType,
  SpaceFinishAssignment,
  TakeoffLine,
  Level,
  GridLine,
} from '@/types';
import {
  computeFloorFinishTakeoff,
  computeCeilingFinishTakeoff,
  computeWallFinishTakeoff,
  type GridSystem,
} from '@/lib/math/finishes';

export interface FinishesCalculationInput {
  spaces: Space[];
  openings: Opening[];
  finishTypes: FinishType[];
  assignments: SpaceFinishAssignment[];
  levels: Level[];
  gridX: GridLine[];
  gridY: GridLine[];
}

export interface FinishesCalculationResult {
  takeoffLines: TakeoffLine[];
  errors: string[];
  summary: {
    totalFloorArea: number;
    totalWallArea: number;
    totalCeilingArea: number;
    finishLineCount: number;
  };
}

/**
 * Calculate all finishing works takeoff lines
 */
export function calculateFinishingWorks(
  input: FinishesCalculationInput
): FinishesCalculationResult {
  const {
    spaces,
    openings,
    finishTypes,
    assignments,
    levels,
    gridX,
    gridY,
  } = input;

  const takeoffLines: TakeoffLine[] = [];
  const errors: string[] = [];

  let totalFloorArea = 0;
  let totalWallArea = 0;
  let totalCeilingArea = 0;

  // Helper: Get level by label
  const getLevel = (label: string): Level | null => {
    return levels.find(l => l.label === label) || null;
  };

  // Helper: Get next level above
  const getNextLevel = (currentLabel: string): Level | null => {
    const currentLevel = getLevel(currentLabel);
    if (!currentLevel) return null;

    const sortedLevels = [...levels].sort((a, b) => a.elevation - b.elevation);
    const currentIndex = sortedLevels.findIndex(l => l.label === currentLabel);

    if (currentIndex === -1 || currentIndex === sortedLevels.length - 1) {
      return null;
    }

    return sortedLevels[currentIndex + 1];
  };

  // Helper: Calculate storey height
  const getStoreyHeight = (levelId: string): number => {
    const currentLevel = getLevel(levelId);
    const nextLevel = getNextLevel(levelId);

    if (!currentLevel || !nextLevel) {
      return 3.0; // Default 3m storey height
    }

    return nextLevel.elevation - currentLevel.elevation;
  };

  // Process each assignment
  for (const assignment of assignments) {
    try {
      // Find space
      const space = spaces.find(s => s.id === assignment.spaceId);
      if (!space) {
        errors.push(`Space ${assignment.spaceId} not found for assignment ${assignment.id}`);
        continue;
      }

      // Find finish type
      const finishType = finishTypes.find(ft => ft.id === assignment.finishTypeId);
      if (!finishType) {
        errors.push(`Finish type ${assignment.finishTypeId} not found for assignment ${assignment.id}`);
        continue;
      }

      // Generate takeoff based on category
      let takeoffLine: TakeoffLine;

      if (finishType.category === 'floor') {
        takeoffLine = computeFloorFinishTakeoff({
          space,
          finishType,
          assignment,
        });
        totalFloorArea += takeoffLine.quantity;
      } else if (finishType.category === 'ceiling') {
        // Check if space has metadata for isOpenToBelow
        const isOpenToBelow = space.metadata?.['isOpenToBelow'] === 'true';
        takeoffLine = computeCeilingFinishTakeoff({
          space,
          finishType,
          assignment,
          isOpenToBelow,
        });
        totalCeilingArea += takeoffLine.quantity;
      } else if (finishType.category === 'wall' || finishType.category === 'plaster' || finishType.category === 'paint') {
        // Get openings for this space and level
        const spaceOpenings = openings.filter(
          o => o.levelId === space.levelId && (!o.spaceId || o.spaceId === space.id)
        );

        const storeyHeight = getStoreyHeight(space.levelId);

        takeoffLine = computeWallFinishTakeoff({
          space,
          finishType,
          assignment,
          openings: spaceOpenings,
          storeyHeight_m: storeyHeight,
        });
        totalWallArea += takeoffLine.quantity;
      } else {
        errors.push(`Unknown finish category: ${finishType.category} for finish type ${finishType.id}`);
        continue;
      }

      takeoffLines.push(takeoffLine);
    } catch (error: any) {
      errors.push(`Error processing assignment ${assignment.id}: ${error.message}`);
    }
  }

  return {
    takeoffLines,
    errors,
    summary: {
      totalFloorArea: Number(totalFloorArea.toFixed(2)),
      totalWallArea: Number(totalWallArea.toFixed(2)),
      totalCeilingArea: Number(totalCeilingArea.toFixed(2)),
      finishLineCount: takeoffLines.length,
    },
  };
}
