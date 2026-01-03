/**
 * UNIT TESTS - Rebar Calculations
 * Testing pure math functions for reinforcing steel calculations
 */

import {
  getRebarGrade,
  getDPWHRebarItem,
  getRebarWeightPerMeter,
  calculateLapLength,
  calculateBeamMainBars,
  calculateBeamStirrupsWeight,
  calculateSlabMainBars,
  calculateColumnMainBars,
  calculateColumnTiesWeight,
} from '../rebar';

describe('Rebar Calculations', () => {
  
  describe('getRebarGrade', () => {
    test('should return Grade 40 for 10mm and 12mm bars', () => {
      expect(getRebarGrade(10)).toBe(40);
      expect(getRebarGrade(12)).toBe(40);
    });
    
    test('should return Grade 60 for 16mm to 36mm bars', () => {
      expect(getRebarGrade(16)).toBe(60);
      expect(getRebarGrade(20)).toBe(60);
      expect(getRebarGrade(25)).toBe(60);
      expect(getRebarGrade(36)).toBe(60);
    });
    
    test('should return Grade 80 for 40mm bars', () => {
      expect(getRebarGrade(40)).toBe(80);
    });
  });
  
  describe('getDPWHRebarItem', () => {
    test('should return correct DPWH item for Grade 40', () => {
      expect(getDPWHRebarItem(10)).toBe('902 (1) a1');
      expect(getDPWHRebarItem(12)).toBe('902 (1) a1');
    });
    
    test('should return correct DPWH item for Grade 60', () => {
      expect(getDPWHRebarItem(16)).toBe('902 (1) a2');
      expect(getDPWHRebarItem(20)).toBe('902 (1) a2');
    });
    
    test('should return correct DPWH item for epoxy-coated bars', () => {
      expect(getDPWHRebarItem(16, true)).toBe('902 (2) a2');
      expect(getDPWHRebarItem(20, true)).toBe('902 (2) a2');
    });
  });
  
  describe('getRebarWeightPerMeter', () => {
    test('should return correct weight for standard diameters', () => {
      expect(getRebarWeightPerMeter(10)).toBe(0.617);
      expect(getRebarWeightPerMeter(12)).toBe(0.888);
      expect(getRebarWeightPerMeter(16)).toBe(1.578);
      expect(getRebarWeightPerMeter(20)).toBe(2.466);
      expect(getRebarWeightPerMeter(25)).toBe(3.853);
    });
    
    test('should throw error for unsupported diameter', () => {
      expect(() => getRebarWeightPerMeter(15)).toThrow('Unknown rebar diameter');
    });
  });
  
  describe('calculateLapLength', () => {
    test('should calculate lap length with default multiplier (40Ø)', () => {
      expect(calculateLapLength(16)).toBe(0.64); // 16mm × 40 / 1000
      expect(calculateLapLength(20)).toBe(0.8);  // 20mm × 40 / 1000
    });
    
    test('should calculate lap length with custom multiplier', () => {
      expect(calculateLapLength(16, 50)).toBe(0.8);  // 16mm × 50 / 1000
      expect(calculateLapLength(20, 30)).toBe(0.6);  // 20mm × 30 / 1000
    });
  });
  
  describe('calculateBeamMainBars', () => {
    test('should calculate beam main bar weight', () => {
      const result = calculateBeamMainBars(
        16,     // barDiameter
        4,      // barCount
        6.0     // beamLength
      );
      
      // Each bar: 6m + lap
      // Total weight should be around 41-44 kg
      expect(result.weight).toBeGreaterThan(40);
      expect(result.weight).toBeLessThan(44);
    });
  });
  
  describe('calculateBeamStirrupsWeight', () => {
    test('should calculate stirrup weight correctly', () => {
      const result = calculateBeamStirrupsWeight(
        10,    // stirrupDiameter
        0.15,  // stirrupSpacing_m
        6.0,   // beamLength_m
        0.3,   // beamWidth_m
        0.5    // beamHeight_m
      );
      
      // Should calculate weight based on perimeter and count
      expect(result.weight).toBeGreaterThan(38);
      expect(result.weight).toBeLessThan(47);
    });
  });
  
  describe('calculateSlabMainBars', () => {
    test('should calculate slab reinforcement weight', () => {
      const result = calculateSlabMainBars(
        12,    // barDiameter (must be 10, 12, 16, 20, 25, 28, 32, 36, or 40)
        0.2,   // spacing
        6.0,   // spanLength
        1      // spanCount
      );
      
      // Should calculate weight for reinforcement
      expect(result.weight).toBeGreaterThan(180);
      expect(result.weight).toBeLessThan(190);
      expect(result.formulaText).toContain('bars');
    });
  });
});
