/**
 * LOGIC LAYER TESTS - calculateFinishes
 * Tests for finishing works calculation orchestration
 */

import { calculateFinishingWorks, type FinishesCalculationInput } from '../calculateFinishes';
import type { Space, FinishType, SpaceFinishAssignment, Level, GridLine, WallSurface, WallSurfaceFinishAssignment } from '@/types';

describe('calculateFinishingWorks', () => {
  const mockLevels: Level[] = [
    {
      label: 'Ground Floor',
      elevation: 0,
    },
  ];

  const mockGridX: GridLine[] = [
    { label: 'A', offset: 0 },
    { label: 'B', offset: 6 },  // meters
  ];

  const mockGridY: GridLine[] = [
    { label: '1', offset: 0 },
    { label: '2', offset: 8 },  // meters
  ];

  const mockFinishTypes: FinishType[] = [
    {
      id: 'finish1',
      finishName: 'Ceramic Tile',
      dpwhItemNumberRaw: '608 (1)',
      unit: 'm²',
      category: 'floor',
      assumptions: { wastePercent: 0.05 },
    },
    {
      id: 'finish2',
      finishName: 'Paint',
      dpwhItemNumberRaw: '700 (1)',
      unit: 'm²',
      category: 'wall',
      assumptions: { wastePercent: 0.10 },
    },
    {
      id: 'finish3',
      finishName: 'Gypsum Board Ceiling',
      dpwhItemNumberRaw: '620 (5)',
      unit: 'm²',
      category: 'ceiling',
      assumptions: { wastePercent: 0.05 },
    },
  ];

  describe('Floor Finish Calculations', () => {
    it('should calculate floor finish for a single space', () => {
      const spaces: Space[] = [
        {
          id: 'space1',
          name: 'Living Room',
          levelId: 'level1',
          boundary: {
            type: 'gridRect',
            data: {
              gridX: ['A', 'B'],
              gridY: ['1', '2'],
            },
          },
          computed: {
            area_m2: 48.0, // 6m × 8m
            perimeter_m: 28.0,
          },
          tags: [],
        },
      ];

      const assignments: SpaceFinishAssignment[] = [
        {
          id: 'assign1',
          spaceId: 'space1',
          finishTypeId: 'finish1',
          scope: 'floor',
        },
      ];

      const input: FinishesCalculationInput = {
        spaces,
        openings: [],
        finishTypes: mockFinishTypes,
        assignments,
        levels: mockLevels,
        gridX: mockGridX,
        gridY: mockGridY,
      };

      const result = calculateFinishingWorks(input);

      expect(result.errors).toHaveLength(0);
      expect(result.takeoffLines.length).toBeGreaterThan(0);
      expect(result.summary.totalFloorArea).toBeCloseTo(50.4, 1); // 48 m² + 5% waste
      expect(result.summary.finishLineCount).toBeGreaterThan(0);

      // Check that takeoff line was created
      const floorLine = result.takeoffLines.find(
        (line) => line.resourceKey?.includes('floor-')
      );
      expect(floorLine).toBeDefined();
      expect(floorLine?.quantity).toBeCloseTo(48.0 * 1.05, 1); // With 5% waste
    });

    it('should handle multiple spaces with different finishes', () => {
      const spaces: Space[] = [
        {
          id: 'space1',
          name: 'Room 1',
          levelId: 'level1',
          boundary: {
            type: 'gridRect',
            data: { gridX: ['A', 'B'], gridY: ['1', '2'] },
          },
          computed: { area_m2: 48.0, perimeter_m: 28.0 },
          tags: [],
        },
        {
          id: 'space2',
          name: 'Room 2',
          levelId: 'level1',
          boundary: {
            type: 'gridRect',
            data: { gridX: ['A', 'B'], gridY: ['1', '2'] },
          },
          computed: { area_m2: 48.0, perimeter_m: 28.0 },
          tags: [],
        },
      ];

      const assignments: SpaceFinishAssignment[] = [
        { id: 'a1', spaceId: 'space1', finishTypeId: 'finish1', scope: 'floor' },
        { id: 'a2', spaceId: 'space2', finishTypeId: 'finish1', scope: 'floor' },
      ];

      const input: FinishesCalculationInput = {
        spaces,
        openings: [],
        finishTypes: mockFinishTypes,
        assignments,
        levels: mockLevels,
        gridX: mockGridX,
        gridY: mockGridY,
      };

      const result = calculateFinishingWorks(input);

      expect(result.summary.totalFloorArea).toBeCloseTo(100.8, 1); // 96 m² + 5% waste
    });

    it('should return empty results when no spaces provided', () => {
      const input: FinishesCalculationInput = {
        spaces: [],
        openings: [],
        finishTypes: mockFinishTypes,
        assignments: [],
        levels: mockLevels,
        gridX: mockGridX,
        gridY: mockGridY,
      };

      const result = calculateFinishingWorks(input);

      expect(result.takeoffLines).toHaveLength(0);
      expect(result.summary.totalFloorArea).toBe(0);
      expect(result.summary.totalWallArea).toBe(0);
      expect(result.summary.totalCeilingArea).toBe(0);
    });

    it('should handle missing finish type gracefully', () => {
      const spaces: Space[] = [
        {
          id: 'space1',
          name: 'Room',
          levelId: 'level1',
          boundary: {
            type: 'gridRect',
            data: { gridX: ['A', 'B'], gridY: ['1', '2'] },
          },
          computed: { area_m2: 48.0, perimeter_m: 28.0 },
          tags: [],
        },
      ];

      const assignments: SpaceFinishAssignment[] = [
        {
          id: 'assign1',
          spaceId: 'space1',
          finishTypeId: 'nonexistent',
          scope: 'floor',
        },
      ];

      const input: FinishesCalculationInput = {
        spaces,
        openings: [],
        finishTypes: mockFinishTypes,
        assignments,
        levels: mockLevels,
        gridX: mockGridX,
        gridY: mockGridY,
      };

      const result = calculateFinishingWorks(input);

      // Should handle gracefully without crashing
      expect(result).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Wall Finish Calculations', () => {
    it('should calculate wall finish area', () => {
      const spaces: Space[] = [
        {
          id: 'space1',
          name: 'Room',
          levelId: 'level1',
          boundary: {
            type: 'gridRect',
            data: { gridX: ['A', 'B'], gridY: ['1', '2'] },
          },
          computed: { area_m2: 48.0, perimeter_m: 28.0 },
          tags: [],
        },
      ];

      const assignments: SpaceFinishAssignment[] = [
        {
          id: 'assign1',
          spaceId: 'space1',
          finishTypeId: 'finish2',
          scope: 'walls',
        },
      ];

      const input: FinishesCalculationInput = {
        spaces,
        openings: [],
        finishTypes: mockFinishTypes,
        assignments,
        levels: mockLevels,
        gridX: mockGridX,
        gridY: mockGridY,
      };

      const result = calculateFinishingWorks(input);

      expect(result.summary.totalWallArea).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should use wall surfaces when provided', () => {
      const wallSurfaces: WallSurface[] = [
        {
          id: 'wall1',
          name: 'Wall 1',
          gridLine: {
            axis: 'X',
            label: 'A',
            span: ['1', '2'],
          },
          levelStart: 'Ground Floor',
          levelEnd: 'Ground Floor',
          surfaceType: 'interior',
          computed: {
            length_m: 6.0,
            height_m: 3.0,
            grossArea_m2: 18.0,
            sidesCount: 2,
            totalArea_m2: 36.0,
          },
          tags: [],
        },
      ];

      const wallAssignments: WallSurfaceFinishAssignment[] = [
        {
          id: 'wallAssign1',
          wallSurfaceId: 'wall1',
          finishTypeId: 'finish2',
          scope: 'paint',
          side: 'both',
        },
      ];

      const input: FinishesCalculationInput = {
        spaces: [],
        openings: [],
        finishTypes: mockFinishTypes,
        assignments: [],
        wallSurfaces,
        wallAssignments,
        levels: mockLevels,
        gridX: mockGridX,
        gridY: mockGridY,
      };

      const result = calculateFinishingWorks(input);

      expect(result.takeoffLines.length).toBeGreaterThan(0);
      // Wall area: 18 m² * 2 sides with waste ≈ 36 m²
      expect(result.summary.totalWallArea).toBeCloseTo(36, 1);
    });
  });

  describe('Ceiling Finish Calculations', () => {
    it('should calculate ceiling finish area', () => {
      const spaces: Space[] = [
        {
          id: 'space1',
          name: 'Room',
          levelId: 'level1',
          boundary: {
            type: 'gridRect',
            data: { gridX: ['A', 'B'], gridY: ['1', '2'] },
          },
          computed: { area_m2: 48.0, perimeter_m: 28.0 },
          tags: [],
        },
      ];

      const assignments: SpaceFinishAssignment[] = [
        {
          id: 'assign1',
          spaceId: 'space1',
          finishTypeId: 'finish3',
          scope: 'ceiling',
        },
      ];

      const input: FinishesCalculationInput = {
        spaces,
        openings: [],
        finishTypes: mockFinishTypes,
        assignments,
        levels: mockLevels,
        gridX: mockGridX,
        gridY: mockGridY,
      };

      const result = calculateFinishingWorks(input);

      expect(result.summary.totalCeilingArea).toBeCloseTo(50.4, 1); // 48 m² + 5% waste
    });
  });

  describe('Combined Calculations', () => {
    it('should calculate all finish surfaces together', () => {
      const spaces: Space[] = [
        {
          id: 'space1',
          name: 'Room',
          levelId: 'level1',
          boundary: {
            type: 'gridRect',
            data: { gridX: ['A', 'B'], gridY: ['1', '2'] },
          },
          computed: { area_m2: 48.0, perimeter_m: 28.0 },
          tags: [],
        },
      ];

      const assignments: SpaceFinishAssignment[] = [
        { id: 'a1', spaceId: 'space1', finishTypeId: 'finish1', scope: 'floor' },
        { id: 'a2', spaceId: 'space1', finishTypeId: 'finish2', scope: 'walls' },
        { id: 'a3', spaceId: 'space1', finishTypeId: 'finish3', scope: 'ceiling' }, // Use finish3 (ceiling category)
      ];

      const input: FinishesCalculationInput = {
        spaces,
        openings: [],
        finishTypes: mockFinishTypes,
        assignments,
        levels: mockLevels,
        gridX: mockGridX,
        gridY: mockGridY,
      };

      const result = calculateFinishingWorks(input);

      expect(result.summary.totalFloorArea).toBeCloseTo(50.4, 1); // 48 m² + 5% waste
      expect(result.summary.totalCeilingArea).toBeCloseTo(50.4, 1); // 48 m² + 5% waste
      expect(result.summary.totalWallArea).toBeGreaterThan(0);
      expect(result.summary.finishLineCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Error Handling', () => {
    it('should collect errors for invalid data', () => {
      const spaces: Space[] = [
        {
          id: 'space1',
          name: 'Invalid Space',
          levelId: 'nonexistent-level',
          boundary: {
            type: 'gridRect',
            data: { gridX: ['A', 'B'], gridY: ['1', '2'] },
          },
          computed: { area_m2: 48.0, perimeter_m: 28.0 },
          tags: [],
        },
      ];

      const assignments: SpaceFinishAssignment[] = [
        { id: 'a1', spaceId: 'space1', finishTypeId: 'finish1', scope: 'floor' },
      ];

      const input: FinishesCalculationInput = {
        spaces,
        openings: [],
        finishTypes: mockFinishTypes,
        assignments,
        levels: mockLevels,
        gridX: mockGridX,
        gridY: mockGridY,
      };

      const result = calculateFinishingWorks(input);

      // Should not crash, but may collect errors
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
    });
  });
});




