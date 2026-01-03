/**
 * UNIT TESTS - Formwork Calculations
 * Testing pure math functions for formwork area calculations
 */

import {
  calculateBeamFormwork,
  calculateSlabFormwork,
  calculateRectangularColumnFormwork,
  calculateCircularColumnFormwork,
  calculateMatFormwork,
  calculateFootingFormwork,
  roundArea,
} from '../formwork';

describe('Formwork Calculations', () => {
  
  describe('calculateBeamFormwork', () => {
    test('should calculate beam formwork area (2 sides + bottom)', () => {
      const result = calculateBeamFormwork(0.3, 0.5, 6.0);
      
      // 2 sides: 2 × 0.5 × 6 = 6.0 m²
      // Bottom: 0.3 × 6 = 1.8 m²
      // Total: 7.8 m²
      expect(result.area).toBe(7.8);
      expect(result.formulaText).toContain('7.8');
    });
    
    test('should include input values in result', () => {
      const result = calculateBeamFormwork(0.3, 0.5, 6.0);
      
      expect(result.inputs.width).toBe(0.3);
      expect(result.inputs.height).toBe(0.5);
      expect(result.inputs.length).toBe(6.0);
      expect(result.inputs.sidesArea).toBe(6.0);
      expect(result.inputs.bottomArea).toBeCloseTo(1.8, 5);
    });
  });
  
  describe('calculateSlabFormwork', () => {
    test('should calculate slab soffit formwork area', () => {
      const result = calculateSlabFormwork(50.0);
      
      expect(result.area).toBe(50.0);
      expect(result.formulaText).toContain('50');
      expect(result.formulaText).toContain('soffit');
    });
  });
  
  describe('calculateRectangularColumnFormwork', () => {
    test('should calculate rectangular column formwork (4 sides)', () => {
      const result = calculateRectangularColumnFormwork(0.3, 0.4, 3.0);
      
      // Perimeter: 2 × (0.3 + 0.4) = 1.4 m
      // Area: 1.4 × 3.0 = 4.2 m²
      expect(result.area).toBeCloseTo(4.2, 5);
      expect(result.inputs.perimeter).toBe(1.4);
    });
    
    test('should handle square columns', () => {
      const result = calculateRectangularColumnFormwork(0.3, 0.3, 3.0);
      
      // Perimeter: 2 × (0.3 + 0.3) = 1.2 m
      // Area: 1.2 × 3.0 = 3.6 m²
      expect(result.area).toBeCloseTo(3.6, 5);
    });
  });
  
  describe('calculateCircularColumnFormwork', () => {
    test('should calculate circular column formwork', () => {
      const result = calculateCircularColumnFormwork(0.4, 3.0);
      
      // Circumference: π × 0.4 = 1.2566 m
      // Area: 1.2566 × 3.0 = 3.77 m²
      expect(result.area).toBeCloseTo(3.77, 2);
      expect(result.inputs.circumference).toBeCloseTo(1.2566, 4);
    });
  });
  
  describe('calculateMatFormwork', () => {
    test('should calculate mat foundation edge formwork', () => {
      const result = calculateMatFormwork(10.0, 8.0, 0.5);
      
      // Perimeter: 2 × (10 + 8) = 36 m
      // Area: 36 × 0.5 = 18 m²
      expect(result.area).toBe(18.0);
      expect(result.inputs.perimeter).toBe(36.0);
    });
  });
  
  describe('calculateFootingFormwork', () => {
    test('should calculate footing formwork (4 sides)', () => {
      const result = calculateFootingFormwork(1.5, 1.5, 0.8);
      
      // Perimeter: 2 × (1.5 + 1.5) = 6 m
      // Area: 6 × 0.8 = 4.8 m²
      expect(result.area).toBeCloseTo(4.8, 5);
    });
    
    test('should handle rectangular footings', () => {
      const result = calculateFootingFormwork(2.0, 1.5, 1.0);
      
      // Perimeter: 2 × (2.0 + 1.5) = 7 m
      // Area: 7 × 1.0 = 7 m²
      expect(result.area).toBe(7.0);
    });
  });
  
  describe('roundArea', () => {
    test('should round to specified decimal places', () => {
      expect(roundArea(12.3456, 2)).toBe(12.35);
      expect(roundArea(12.3456, 1)).toBe(12.3);
      expect(roundArea(12.3456, 0)).toBe(12);
    });
  });
});
