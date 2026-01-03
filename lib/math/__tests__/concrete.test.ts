/**
 * UNIT TESTS - Concrete Calculations
 * Testing pure math functions for concrete volume calculation
 */

import {
  calculateBeamConcrete,
  calculateSlabConcrete,
  calculateColumnConcrete,
  calculateFootingConcrete,
  roundVolume,
} from '../concrete';

describe('Concrete Calculations', () => {
  
  describe('calculateBeamConcrete', () => {
    test('should calculate beam volume correctly', () => {
      const result = calculateBeamConcrete({
        width: 0.3,
        height: 0.5,
        length: 6.0,
        waste: 0.05,
      });
      
      expect(result.volume).toBeCloseTo(0.9, 5); // 0.3 × 0.5 × 6
      expect(result.volumeWithWaste).toBeCloseTo(0.945, 5); // 0.9 × 1.05
      expect(result.formulaText).toContain('0.3');
      expect(result.formulaText).toContain('0.5');
      expect(result.formulaText).toContain('6');
    });
    
    test('should throw error for negative dimensions', () => {
      expect(() => calculateBeamConcrete({
        width: -0.3,
        height: 0.5,
        length: 6.0,
        waste: 0.05,
      })).toThrow('Beam dimensions must be positive');
    });
    
    test('should throw error for invalid waste factor', () => {
      expect(() => calculateBeamConcrete({
        width: 0.3,
        height: 0.5,
        length: 6.0,
        waste: 1.5, // > 1
      })).toThrow('Waste must be between 0 and 1');
    });
  });
  
  describe('calculateSlabConcrete', () => {
    test('should calculate slab volume correctly', () => {
      const result = calculateSlabConcrete({
        thickness: 0.125,
        area: 50.0,
        waste: 0.05,
      });
      
      expect(result.volume).toBe(6.25); // 0.125 × 50
      expect(result.volumeWithWaste).toBe(6.5625); // 6.25 × 1.05
    });
    
    test('should handle zero waste', () => {
      const result = calculateSlabConcrete({
        thickness: 0.1,
        area: 10.0,
        waste: 0,
      });
      
      expect(result.volume).toBe(1.0);
      expect(result.volumeWithWaste).toBe(1.0);
    });
  });
  
  describe('calculateColumnConcrete', () => {
    test('should calculate rectangular column volume', () => {
      const result = calculateColumnConcrete({
        shape: 'rectangular',
        width: 0.3,
        height: 0.3,
        length: 3.0,
        waste: 0.05,
      });
      
      expect(result.volume).toBeCloseTo(0.27, 5); // 0.3 × 0.3 × 3
      expect(result.volumeWithWaste).toBeCloseTo(0.2835, 5); // 0.27 × 1.05
    });
    
    test('should calculate circular column volume', () => {
      const result = calculateColumnConcrete({
        shape: 'circular',
        diameter: 0.4,
        length: 3.0,
        waste: 0.05,
      });
      
      const expectedVolume = Math.PI * (0.2 ** 2) * 3.0;
      expect(result.volume).toBeCloseTo(expectedVolume, 4);
      expect(result.volumeWithWaste).toBeCloseTo(expectedVolume * 1.05, 4);
    });
    
    test('should throw error for circular column without diameter', () => {
      expect(() => calculateColumnConcrete({
        shape: 'circular',
        length: 3.0,
        waste: 0.05,
      })).toThrow('Circular column requires positive diameter');
    });
  });
  
  describe('roundVolume', () => {
    test('should round to specified decimal places', () => {
      expect(roundVolume(1.23456, 3)).toBe(1.235);
      expect(roundVolume(1.23456, 2)).toBe(1.23);
      expect(roundVolume(1.23456, 1)).toBe(1.2);
    });
  });
});
