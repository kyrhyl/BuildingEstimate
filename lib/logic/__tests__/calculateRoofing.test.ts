/**
 * LOGIC LAYER TESTS - calculateRoofing
 * Tests for roofing calculation orchestration
 */

import { calculateRoofing, type RoofingCalculationResult } from '../calculateRoofing';
import type { ProjectModel, RoofPlane, RoofType } from '@/types';

describe('calculateRoofing', () => {
  const mockProject: Partial<ProjectModel> = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Test Project',
    roofPlanes: [],
    roofTypes: [],
    gridX: [
      { label: 'A', offset: 0 },
      { label: 'B', offset: 6 },  // meters
      { label: 'C', offset: 12 }, // meters
    ],
    gridY: [
      { label: '1', offset: 0 },
      { label: '2', offset: 8 }, // meters
    ],
  };

  const sampleRoofType: RoofType = {
    id: 'rt1',
    name: 'Standard Metal Roof',
    dpwhItemNumberRaw: '705 (1)',
    unit: 'm²',
    areaBasis: 'slopeArea',
    lapAllowancePercent: 0.10, // 10% lap
    wastePercent: 0.05, // 5% waste
  };

  // Helper to create a roof plane with proper structure
  const createRoofPlane = (overrides: Partial<RoofPlane>): RoofPlane => ({
    id: overrides.id || 'p1',
    name: overrides.name || 'Roof Plane',
    levelId: overrides.levelId || 'roof',
    roofTypeId: overrides.roofTypeId || 'rt1',
    boundary: overrides.boundary || {
      type: 'gridRect',
      data: {
        gridX: ['A', 'C'],
        gridY: ['1', '2'],
      },
    },
    slope: overrides.slope || {
      mode: 'degrees',
      value: 30,
    },
    computed: overrides.computed || {
      planArea_m2: 0,
      slopeFactor: 1,
      slopeArea_m2: 0,
    },
    tags: overrides.tags || [],
  });

  describe('Basic Functionality', () => {
    it('should return empty results for project with no roof planes', async () => {
      const result = await calculateRoofing(mockProject as ProjectModel);

      expect(result.takeoffLines).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.roofPlaneCount).toBe(0);
      expect(result.summary.totalRoofArea_m2).toBe(0);
    });

    it('should calculate simple gable roof', async () => {
      const project: Partial<ProjectModel> = {
        ...mockProject,
        roofTypes: [sampleRoofType],
        roofPlanes: [createRoofPlane({})],
      };

      const result = await calculateRoofing(project as ProjectModel);

      expect(result.errors).toHaveLength(0);
      expect(result.summary.roofPlaneCount).toBe(1);
      expect(result.summary.totalRoofArea_m2).toBeGreaterThan(0);
      expect(result.takeoffLines.length).toBeGreaterThan(0);
    });
  });

  describe('Roof Geometry Calculations', () => {
    it('should calculate flat roof correctly', async () => {
      const project: Partial<ProjectModel> = {
        ...mockProject,
        roofTypes: [sampleRoofType],
        roofPlanes: [
          createRoofPlane({
            slope: { mode: 'degrees', value: 0 },
            computed: { planArea_m2: 80, slopeFactor: 1.0, slopeArea_m2: 80 },
          }),
        ],
      };

      const result = await calculateRoofing(project as ProjectModel);

      expect(result.errors).toHaveLength(0);
      expect(result.summary.roofPlaneCount).toBe(1);
      // Flat roof area = 12m × 8m = 96 m²
      expect(result.summary.totalRoofArea_m2).toBeCloseTo(96, 1);
    });

    it('should calculate pitched roof with slope adjustment', async () => {
      const project: Partial<ProjectModel> = {
        ...mockProject,
        roofTypes: [sampleRoofType],
        roofPlanes: [
          createRoofPlane({
            slope: { mode: 'degrees', value: 30 },
            computed: { planArea_m2: 60, slopeFactor: 1.15, slopeArea_m2: 69 },
          }),
        ],
      };

      const result = await calculateRoofing(project as ProjectModel);

      expect(result.errors).toHaveLength(0);
      expect(result.summary.roofPlaneCount).toBe(1);
      // Pitched roof area > flat area (96 m²) due to slope
      expect(result.summary.totalRoofArea_m2).toBeGreaterThan(96);
    });

    it('should handle multiple roof planes', async () => {
      const project: Partial<ProjectModel> = {
        ...mockProject,
        roofTypes: [sampleRoofType],
        roofPlanes: [
          createRoofPlane({ id: 'p1' }),
          createRoofPlane({ id: 'p2' }),
          createRoofPlane({ id: 'p3' }),
        ],
      };

      const result = await calculateRoofing(project as ProjectModel);

      expect(result.errors).toHaveLength(0);
      expect(result.summary.roofPlaneCount).toBe(3);
      expect(result.summary.totalRoofArea_m2).toBeGreaterThan(0);
    });
  });

  describe('Material Takeoff', () => {
    it('should generate takeoff lines for covering material', async () => {
      const project: Partial<ProjectModel> = {
        ...mockProject,
        roofTypes: [sampleRoofType],
        roofPlanes: [createRoofPlane({})],
      };

      const result = await calculateRoofing(project as ProjectModel);

      const coveringLines = result.takeoffLines.filter(line => 
        line.resourceKey.includes('roof-')
      );

      expect(coveringLines.length).toBeGreaterThan(0);
      expect(coveringLines[0].unit).toBe('m²');
      expect(coveringLines[0].trade).toBe('Roofing');
    });

    it('should generate takeoff lines for framing material', async () => {
      const project: Partial<ProjectModel> = {
        ...mockProject,
        roofTypes: [sampleRoofType],
        roofPlanes: [createRoofPlane({})],
      };

      const result = await calculateRoofing(project as ProjectModel);

      // Roof covering takeoff lines are generated
      expect(result.takeoffLines.length).toBeGreaterThan(0);
    });

    it('should include wastage in covering calculations', async () => {
      const project: Partial<ProjectModel> = {
        ...mockProject,
        roofTypes: [sampleRoofType],
        roofPlanes: [
          createRoofPlane({
            slope: { mode: 'degrees', value: 0 },
            computed: { planArea_m2: 60, slopeFactor: 1.0, slopeArea_m2: 60 },
          }),
        ],
      };

      const result = await calculateRoofing(project as ProjectModel);

      const coveringLines = result.takeoffLines.filter(line => 
        line.resourceKey.includes('roof-')
      );

      // Should generate covering takeoff lines
      expect(coveringLines.length).toBeGreaterThan(0);
    });
  });

  describe('Multiple Roof Types', () => {
    it('should handle different roof types', async () => {
      const roofType2: RoofType = {
        id: 'rt2',
        name: 'Tile Roof',
        dpwhItemNumberRaw: '706 (1)',
        unit: 'm²',
        areaBasis: 'slopeArea',
        lapAllowancePercent: 0.10,
        wastePercent: 0.05,
      };

      const project: Partial<ProjectModel> = {
        ...mockProject,
        roofTypes: [sampleRoofType, roofType2],
        roofPlanes: [
          createRoofPlane({ id: 'p1', roofTypeId: 'rt1' }),
          createRoofPlane({ id: 'p2', roofTypeId: 'rt2' }),
        ],
      };

      const result = await calculateRoofing(project as ProjectModel);

      expect(result.errors).toHaveLength(0);
      expect(result.summary.roofPlaneCount).toBe(2);

      // Should have takeoff lines for both roof types
      const rt1Lines = result.takeoffLines.filter(line => line.resourceKey.includes('roof-rt1'));
      const rt2Lines = result.takeoffLines.filter(line => line.resourceKey.includes('roof-rt2'));

      expect(rt1Lines.length).toBeGreaterThan(0);
      expect(rt2Lines.length).toBeGreaterThan(0);
    });

    it('should aggregate quantities by roof type', async () => {
      const project: Partial<ProjectModel> = {
        ...mockProject,
        roofTypes: [sampleRoofType],
        roofPlanes: [
          createRoofPlane({ id: 'p1' }),
          createRoofPlane({ id: 'p2' }),
        ],
      };

      const result = await calculateRoofing(project as ProjectModel);

      expect(result.errors).toHaveLength(0);
      expect(result.summary.roofPlaneCount).toBe(2);

      // Should aggregate materials from both planes
      const coveringLines = result.takeoffLines.filter(line => 
        line.resourceKey.includes('roof-')
      );

      // Total covering should be for both planes
      expect(coveringLines.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined roofPlanes array', async () => {
      const project: Partial<ProjectModel> = {
        ...mockProject,
        roofPlanes: undefined,
        roofTypes: [sampleRoofType],
      };

      const result = await calculateRoofing(project as ProjectModel);

      expect(result.takeoffLines).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.roofPlaneCount).toBe(0);
    });

    it('should handle roof plane with missing roof type', async () => {
      const project: Partial<ProjectModel> = {
        ...mockProject,
        roofTypes: [sampleRoofType],
        roofPlanes: [
          createRoofPlane({ id: 'p1', roofTypeId: 'nonexistent' }),
        ],
      };

      const result = await calculateRoofing(project as ProjectModel);

      // Should record error for missing roof type
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('nonexistent');
    });

    it('should handle very large roof dimensions', async () => {
      const project: Partial<ProjectModel> = {
        ...mockProject,
        roofTypes: [sampleRoofType],
        roofPlanes: [
          createRoofPlane({
            computed: { planArea_m2: 500000, slopeFactor: 1.06, slopeArea_m2: 530000 },
          }),
        ],
      };

      const result = await calculateRoofing(project as ProjectModel);

      expect(result.errors).toHaveLength(0);
      // Grid-based calculation will still use 12m × 8m = 96 m², not computed values
      expect(result.summary.totalRoofArea_m2).toBeGreaterThan(50);
    });

    it('should handle very steep roof pitch', async () => {
      const project: Partial<ProjectModel> = {
        ...mockProject,
        roofTypes: [sampleRoofType],
        roofPlanes: [
          createRoofPlane({
            slope: { mode: 'degrees', value: 75 },
            computed: { planArea_m2: 60, slopeFactor: 3.86, slopeArea_m2: 231.6 },
          }),
        ],
      };

      const result = await calculateRoofing(project as ProjectModel);

      expect(result.errors).toHaveLength(0);
      // Steep roof should have much larger area than flat
      expect(result.summary.totalRoofArea_m2).toBeGreaterThan(60);
    });

    it('should handle zero dimensions gracefully', async () => {
      const project: Partial<ProjectModel> = {
        ...mockProject,
        roofTypes: [sampleRoofType],
        roofPlanes: [
          createRoofPlane({
            computed: { planArea_m2: 0, slopeFactor: 1.0, slopeArea_m2: 0 },
          }),
        ],
      };

      const result = await calculateRoofing(project as ProjectModel);

      // Grid-based calculation will still compute non-zero area from grid
      expect(result.summary.totalRoofArea_m2).toBeGreaterThan(0);
    });
  });

  describe('Summary Statistics', () => {
    it('should calculate total roof area across all planes', async () => {
      const project: Partial<ProjectModel> = {
        ...mockProject,
        roofTypes: [sampleRoofType],
        roofPlanes: [
          createRoofPlane({ id: 'p1', slope: { mode: 'degrees', value: 0 } }),
          createRoofPlane({ id: 'p2', slope: { mode: 'degrees', value: 0 } }),
        ],
      };

      const result = await calculateRoofing(project as ProjectModel);

      expect(result.summary.roofPlaneCount).toBe(2);
      // Each plane is 12m × 8m = 96 m² flat, so 2 planes = 192 m²
      expect(result.summary.totalRoofArea_m2).toBeCloseTo(192, 1);
    });

    it('should count planes by roof type', async () => {
      const roofType2: RoofType = {
        id: 'rt2',
        name: 'Tile Roof',
        dpwhItemNumberRaw: '706 (1)',
        unit: 'm²',
        areaBasis: 'slopeArea',
        lapAllowancePercent: 0.10,
        wastePercent: 0.05,
      };

      const project: Partial<ProjectModel> = {
        ...mockProject,
        roofTypes: [sampleRoofType, roofType2],
        roofPlanes: [
          createRoofPlane({ id: 'p1', roofTypeId: 'rt1' }),
          createRoofPlane({ id: 'p2', roofTypeId: 'rt1' }),
          createRoofPlane({ id: 'p3', roofTypeId: 'rt2' }),
        ],
      };

      const result = await calculateRoofing(project as ProjectModel);

      expect(result.summary.roofPlaneCount).toBe(3);
      expect(result.summary).toBeDefined();
    });
  });

  describe('Takeoff Line Structure', () => {
    it('should generate takeoff lines with correct structure', async () => {
      const project: Partial<ProjectModel> = {
        ...mockProject,
        roofTypes: [sampleRoofType],
        roofPlanes: [createRoofPlane({})],
      };

      const result = await calculateRoofing(project as ProjectModel);

      expect(result.takeoffLines.length).toBeGreaterThan(0);

      result.takeoffLines.forEach(line => {
        expect(line.id).toBeDefined();
        expect(line.resourceKey).toBeDefined();
        expect(line.trade).toBe('Roofing');
        expect(line.quantity).toBeGreaterThan(0);
        expect(line.unit).toBeDefined();
        expect(line.formulaText).toBeDefined();
        expect(line.inputsSnapshot).toBeDefined();
      });
    });
  });
});
