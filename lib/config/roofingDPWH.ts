/**
 * ROOFING DPWH ITEM MAPPINGS
 * Configuration layer - default DPWH pay item mappings for roofing components
 * 
 * Architecture: CONFIG LAYER (not math layer)
 * These mappings are business logic configuration, not pure computation
 */

import type { DPWHItemMapping } from '@/types';

/**
 * Default DPWH Item Mappings for Roof Framing Components
 * Based on DPWH Volume III specifications
 */
export const DEFAULT_ROOFING_DPWH_MAPPINGS = {
  trussSteel: {
    dpwhItemNumberRaw: '1047 (8) a',
    description: 'Structural Steel Trusses',
    unit: 'Kilogram'
  } as DPWHItemMapping,
  
  purlinSteel: {
    dpwhItemNumberRaw: '1047 (8) b',
    description: 'Structural Steel Purlins',
    unit: 'Kilogram'
  } as DPWHItemMapping,
  
  bracingSteel: {
    dpwhItemNumberRaw: '1047 (4) b',
    description: 'Metal Structure Accessories Turnbuckle',
    unit: 'Each'
  } as DPWHItemMapping,
  
  sagRods: {
    dpwhItemNumberRaw: '1047 (5) b',
    description: 'Metal Structure Accessories Sagrods',
    unit: 'Kilogram'
  } as DPWHItemMapping,
  
  boltsAndRods: {
    dpwhItemNumberRaw: '1047 (5) a',
    description: 'Metal Structure Accessories Bolts and Rods',
    unit: 'Kilogram'
  } as DPWHItemMapping,
  
  steelPlates: {
    dpwhItemNumberRaw: '1047 (5) d',
    description: 'Metal Structure Accessories Steel Plates',
    unit: 'Kilogram'
  } as DPWHItemMapping,
  
  roofingSheets: {
    dpwhItemNumberRaw: '1013 (1)',
    description: 'Corrugated Metal Roofing Gauge 26 (0.551 mm)',
    unit: 'Square Meter'
  } as DPWHItemMapping,
  
  ridgeCap: {
    dpwhItemNumberRaw: '1013 (2) a',
    description: 'Fabricated Metal Roofing Accessory Gauge 26 (0.551 mm) Ridge/Hip Rolls',
    unit: 'Linear Meter'
  } as DPWHItemMapping,
};

/**
 * Roofing calculation constants
 * Extracted from math/logic layers for centralized configuration
 */
export const ROOFING_CONSTANTS = {
  // Fastener weights
  BOLT_WEIGHT_KG: 0.05,           // kg per bolt assembly
  
  // Waste factors (as decimals)
  ROOFING_SHEET_WASTE: 0.10,      // 10% waste for roofing sheets
  ROOFING_SHEET_LAP: 0.15,        // 15% lap for roofing sheets
  
  // Default spacings (mm)
  DEFAULT_PURLIN_SPACING_MM: 600,
  DEFAULT_TRUSS_SPACING_MM: 600,
  DEFAULT_BRACING_INTERVAL_MM: 6000,
} as const;
