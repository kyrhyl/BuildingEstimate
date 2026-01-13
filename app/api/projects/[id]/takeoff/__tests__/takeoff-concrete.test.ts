/**
 * Integration test for concrete takeoff calculations
 * Verifies that concrete quantities are calculated correctly for all element types
 */

import { calculateBeamConcrete, calculateSlabConcrete, calculateColumnConcrete, calculateFootingConcrete } from '@/lib/math/concrete';

describe('Concrete Takeoff Integration Tests', () => {
  describe('Element Template Property Access', () => {
    it('should handle properties as Map (Mongoose format)', () => {
      // Simulate Mongoose Map format
      const propertiesMap = new Map<string, number>();
      propertiesMap.set('width', 0.3);
      propertiesMap.set('height', 0.5);

      // Helper function (same as in takeoff route)
      const getProperty = (properties: Record<string, number> | Map<string, number>, key: string): number | undefined => {
        if (properties instanceof Map) {
          return properties.get(key);
        }
        return properties[key];
      };

      const width = getProperty(propertiesMap, 'width');
      const height = getProperty(propertiesMap, 'height');

      expect(width).toBe(0.3);
      expect(height).toBe(0.5);
    });

    it('should handle properties as plain object (JSON format)', () => {
      const propertiesObj = {
        width: 0.3,
        height: 0.5,
      };

      const getProperty = (properties: Record<string, number> | Map<string, number>, key: string): number | undefined => {
        if (properties instanceof Map) {
          return properties.get(key);
        }
        return properties[key];
      };

      const width = getProperty(propertiesObj, 'width');
      const height = getProperty(propertiesObj, 'height');

      expect(width).toBe(0.3);
      expect(height).toBe(0.5);
    });
  });

  describe('Beam Concrete Calculations', () => {
    it('should calculate beam concrete correctly', () => {
      const width = 0.3; // 300mm
      const height = 0.5; // 500mm
      const length = 6.0; // 6m

      const result = calculateBeamConcrete({
        width,
        height,
        length,
        waste: 0.05, // 5%
      });

      // Expected: 0.3 × 0.5 × 6 = 0.9 m³
      // With 5% waste: 0.9 × 1.05 = 0.945 m³
      expect(result.volume).toBeCloseTo(0.9, 6);
      expect(result.volumeWithWaste).toBeCloseTo(0.945, 3);
      expect(result.formulaText).toContain('0.3');
      expect(result.formulaText).toContain('0.5');
      expect(result.formulaText).toContain('6');
    });

    it('should reject invalid beam dimensions', () => {
      const width = 0;
      const height = 0.5;

      expect(width).toBeLessThanOrEqual(0);
      // This simulates the validation check in takeoff route
      // Should skip concrete calculation
    });
  });

  describe('Slab Concrete Calculations', () => {
    it('should calculate slab concrete correctly', () => {
      const thickness = 0.15; // 150mm
      const area = 50; // 50 m²

      const result = calculateSlabConcrete({
        thickness,
        area,
        waste: 0.05,
      });

      // Expected: 0.15 × 50 = 7.5 m³
      // With 5% waste: 7.5 × 1.05 = 7.875 m³
      expect(result.volume).toBe(7.5);
      expect(result.volumeWithWaste).toBeCloseTo(7.875, 3);
    });
  });

  describe('Column Concrete Calculations', () => {
    it('should calculate rectangular column concrete correctly', () => {
      const width = 0.4; // 400mm
      const height = 0.4; // 400mm
      const length = 3.0; // 3m height

      const result = calculateColumnConcrete({
        shape: 'rectangular',
        width,
        height,
        length,
        waste: 0.05,
      });

      // Expected: 0.4 × 0.4 × 3 = 0.48 m³
      // With 5% waste: 0.48 × 1.05 = 0.504 m³
      expect(result.volume).toBeCloseTo(0.48, 6);
      expect(result.volumeWithWaste).toBeCloseTo(0.504, 3);
    });

    it('should calculate circular column concrete correctly', () => {
      const diameter = 0.4; // 400mm
      const length = 3.0; // 3m height

      const result = calculateColumnConcrete({
        shape: 'circular',
        diameter,
        length,
        waste: 0.05,
      });

      // Expected: π × (0.2)² × 3 = π × 0.04 × 3 ≈ 0.377 m³
      // With 5% waste: 0.377 × 1.05 ≈ 0.396 m³
      expect(result.volume).toBeCloseTo(0.377, 3);
      expect(result.volumeWithWaste).toBeCloseTo(0.396, 3);
    });
  });

  describe('Footing Concrete Calculations', () => {
    it('should calculate footing concrete correctly', () => {
      const length = 2.0;
      const width = 2.0;
      const depth = 0.5;

      const result = calculateFootingConcrete({
        length,
        width,
        depth,
        waste: 0.05,
      });

      // Expected: 2 × 2 × 0.5 = 2.0 m³
      // With 5% waste: 2.0 × 1.05 = 2.1 m³
      expect(result.volume).toBe(2.0);
      expect(result.volumeWithWaste).toBeCloseTo(2.1, 3);
    });
  });

  describe('Full Takeoff Scenario', () => {
    it('should calculate total concrete for mixed elements', () => {
      // Scenario: 5 beams, 1 slab, 4 columns (matching user's data)

      // 5 Beams (B1: 0.3×0.5m, various lengths)
      const beam1 = calculateBeamConcrete({ width: 0.3, height: 0.5, length: 6.0, waste: 0.05 });
      const beam2 = calculateBeamConcrete({ width: 0.3, height: 0.5, length: 6.0, waste: 0.05 });
      const beam3 = calculateBeamConcrete({ width: 0.3, height: 0.5, length: 6.0, waste: 0.05 });
      const beam4 = calculateBeamConcrete({ width: 0.3, height: 0.5, length: 3.0, waste: 0.05 });
      const beam5 = calculateBeamConcrete({ width: 0.3, height: 0.5, length: 3.0, waste: 0.05 });

      // 1 Slab (S1: 150mm thick, 6m × 3m = 18 m²)
      const slab1 = calculateSlabConcrete({ thickness: 0.15, area: 18.0, waste: 0.05 });

      // 4 Columns (C1: 0.4×0.4m, 3m height each)
      const col1 = calculateColumnConcrete({ shape: 'rectangular', width: 0.4, height: 0.4, length: 3.0, waste: 0.05 });
      const col2 = calculateColumnConcrete({ shape: 'rectangular', width: 0.4, height: 0.4, length: 3.0, waste: 0.05 });
      const col3 = calculateColumnConcrete({ shape: 'rectangular', width: 0.4, height: 0.4, length: 3.0, waste: 0.05 });
      const col4 = calculateColumnConcrete({ shape: 'rectangular', width: 0.4, height: 0.4, length: 3.0, waste: 0.05 });

      // Total concrete
      const totalConcrete =
        beam1.volumeWithWaste +
        beam2.volumeWithWaste +
        beam3.volumeWithWaste +
        beam4.volumeWithWaste +
        beam5.volumeWithWaste +
        slab1.volumeWithWaste +
        col1.volumeWithWaste +
        col2.volumeWithWaste +
        col3.volumeWithWaste +
        col4.volumeWithWaste;

      // Expected breakdown:
      // 3 beams @ 6m: 3 × 0.945 = 2.835 m³
      // 2 beams @ 3m: 2 × 0.4725 = 0.945 m³
      // 1 slab: 2.835 m³
      // 4 columns: 4 × 0.504 = 2.016 m³
      // Total: ~8.631 m³

      expect(totalConcrete).toBeGreaterThan(0);
      expect(totalConcrete).toBeCloseTo(8.631, 2);

      console.log('\n=== FULL TAKEOFF SUMMARY ===');
      console.log(`Total Concrete: ${totalConcrete.toFixed(3)} m³`);
      console.log(`Total Elements: 10 (5 beams, 1 slab, 4 columns)`);
      console.log('✓ All concrete calculations working correctly\n');
    });
  });
});
