/**
 * LOGIC LAYER TESTS - calculateScheduleItems
 * Tests for schedule items calculation orchestration
 */

import { calculateScheduleItems, type ScheduleCalculationResult } from '../calculateScheduleItems';
import type { ProjectModel, ScheduleItem } from '@/types';

describe('calculateScheduleItems', () => {
  const mockProject: Partial<ProjectModel> = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Test Project',
    scheduleItems: [],
  };

  const createScheduleItem = (overrides: Partial<ScheduleItem>): ScheduleItem => ({
    id: overrides.id || 'item1',
    category: overrides.category || 'plumbing',
    unit: overrides.unit || 'm',
    qty: overrides.qty !== undefined ? overrides.qty : 10,
    dpwhItemNumberRaw: overrides.dpwhItemNumberRaw || '900 (1)',
    basisNote: overrides.basisNote || 'Per schedule',
    tags: overrides.tags || [],
  });

  describe('Basic Functionality', () => {
    it('should return empty results for project with no schedule items', async () => {
      const result = await calculateScheduleItems(mockProject as ProjectModel);

      expect(result.takeoffLines).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.totalItems).toBe(0);
      expect(result.summary.byCategory).toEqual({});
    });

    it('should generate takeoff lines for schedule items', async () => {
      const project: Partial<ProjectModel> = {
        ...mockProject,
        scheduleItems: [
          createScheduleItem({ id: 'item1', category: 'plumbing', qty: 50 }),
          createScheduleItem({ id: 'item2', category: 'doors', unit: 'pc', qty: 5, dpwhItemNumberRaw: '610 (1)' }),
        ],
      };

      const result = await calculateScheduleItems(project as ProjectModel);

      expect(result.takeoffLines).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.totalItems).toBe(2);
      expect(result.summary.byCategory.plumbing).toBe(1);
      expect(result.summary.byCategory.doors).toBe(1);
    });
  });

  describe('Category Mapping', () => {
    it('should map finishing categories correctly', async () => {
      const project: Partial<ProjectModel> = {
        ...mockProject,
        scheduleItems: [
          createScheduleItem({ id: '1', category: 'termite-control', unit: 'm²', qty: 100, dpwhItemNumberRaw: '600 (1)' }),
          createScheduleItem({ id: '2', category: 'plumbing', qty: 50 }),
          createScheduleItem({ id: '3', category: 'carpentry', unit: 'm²', qty: 25, dpwhItemNumberRaw: '620 (1)' }),
          createScheduleItem({ id: '4', category: 'doors', unit: 'pc', qty: 5, dpwhItemNumberRaw: '610 (1)' }),
          createScheduleItem({ id: '5', category: 'windows', unit: 'pc', qty: 8, dpwhItemNumberRaw: '611 (1)' }),
        ],
      };

      const result = await calculateScheduleItems(project as ProjectModel);

      expect(result.takeoffLines).toHaveLength(5);
      expect(result.summary.totalItems).toBe(5);
      
      // Verify trade mappings exist
      expect(result.takeoffLines.length).toBeGreaterThan(0);
    });

    it('should map earthwork categories correctly', async () => {
      const project: Partial<ProjectModel> = {
        ...mockProject,
        scheduleItems: [
          createScheduleItem({ id: '1', category: 'earthworks-clearing', unit: 'm²', qty: 1000, dpwhItemNumberRaw: '101 (1)' }),
          createScheduleItem({ id: '2', category: 'earthworks-excavation', unit: 'm³', qty: 500, dpwhItemNumberRaw: '104 (1)' }),
          createScheduleItem({ id: '3', category: 'earthworks-embankment', unit: 'm³', qty: 300, dpwhItemNumberRaw: '110 (1)' }),
        ],
      };

      const result = await calculateScheduleItems(project as ProjectModel);

      expect(result.takeoffLines).toHaveLength(3);
      expect(result.summary.totalItems).toBe(3);
    });
  });

  describe('Takeoff Line Generation', () => {
    it('should generate takeoff lines with correct structure', async () => {
      const project: Partial<ProjectModel> = {
        ...mockProject,
        scheduleItems: [
          createScheduleItem({ 
            id: 'item1',
            category: 'plumbing',
            descriptionOverride: 'PVC Pipe 100mm Diameter',
            qty: 50,
          }),
        ],
      };

      const result = await calculateScheduleItems(project as ProjectModel);

      expect(result.takeoffLines).toHaveLength(1);
      
      const line = result.takeoffLines[0];
      expect(line.id).toBeDefined();
      expect(line.trade).toBe('Plumbing');
      expect(line.quantity).toBe(50);
      expect(line.unit).toBe('m');
      expect(line.formulaText).toContain('50');
    });

    it('should generate unique IDs for each takeoff line', async () => {
      const project: Partial<ProjectModel> = {
        ...mockProject,
        scheduleItems: [
          createScheduleItem({ id: '1', qty: 10 }),
          createScheduleItem({ id: '2', qty: 20 }),
          createScheduleItem({ id: '3', category: 'doors', unit: 'pc', qty: 5 }),
        ],
      };

      const result = await calculateScheduleItems(project as ProjectModel);

      const ids = result.takeoffLines.map(line => line.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(3);
      expect(ids).toHaveLength(3);
    });
  });

  describe('Summary Statistics', () => {
    it('should count items by category', async () => {
      const project: Partial<ProjectModel> = {
        ...mockProject,
        scheduleItems: [
          createScheduleItem({ id: '1', category: 'plumbing', qty: 10 }),
          createScheduleItem({ id: '2', category: 'plumbing', qty: 20 }),
          createScheduleItem({ id: '3', category: 'doors', unit: 'pc', qty: 5 }),
          createScheduleItem({ id: '4', category: 'windows', unit: 'pc', qty: 8 }),
          createScheduleItem({ id: '5', category: 'doors', unit: 'pc', qty: 3 }),
        ],
      };

      const result = await calculateScheduleItems(project as ProjectModel);

      expect(result.summary.totalItems).toBe(5);
      expect(result.summary.byCategory.plumbing).toBe(2);
      expect(result.summary.byCategory.doors).toBe(2);
      expect(result.summary.byCategory.windows).toBe(1);
    });

    it('should handle single category', async () => {
      const project: Partial<ProjectModel> = {
        ...mockProject,
        scheduleItems: [
          createScheduleItem({ id: '1', qty: 10 }),
          createScheduleItem({ id: '2', qty: 20 }),
        ],
      };

      const result = await calculateScheduleItems(project as ProjectModel);

      expect(result.summary.totalItems).toBe(2);
      expect(result.summary.byCategory.plumbing).toBe(2);
      expect(Object.keys(result.summary.byCategory)).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined scheduleItems array', async () => {
      const project: Partial<ProjectModel> = {
        ...mockProject,
        scheduleItems: undefined,
      };

      const result = await calculateScheduleItems(project as ProjectModel);

      expect(result.takeoffLines).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.totalItems).toBe(0);
    });

    it('should handle items with zero quantity', async () => {
      const project: Partial<ProjectModel> = {
        ...mockProject,
        scheduleItems: [
          createScheduleItem({ qty: 0 }),
        ],
      };

      const result = await calculateScheduleItems(project as ProjectModel);

      expect(result.takeoffLines).toHaveLength(1);
      expect(result.takeoffLines[0].quantity).toBe(0);
    });

    it('should handle very large quantities', async () => {
      const project: Partial<ProjectModel> = {
        ...mockProject,
        scheduleItems: [
          createScheduleItem({ category: 'earthworks-clearing', unit: 'm²', qty: 1000000 }),
        ],
      };

      const result = await calculateScheduleItems(project as ProjectModel);

      expect(result.takeoffLines).toHaveLength(1);
      expect(result.takeoffLines[0].quantity).toBe(1000000);
    });
  });

  describe('Error Collection', () => {
    it('should not generate errors for valid data', async () => {
      const project: Partial<ProjectModel> = {
        ...mockProject,
        scheduleItems: [
          createScheduleItem({ qty: 50 }),
        ],
      };

      const result = await calculateScheduleItems(project as ProjectModel);

      expect(result.errors).toHaveLength(0);
    });
  });
});

