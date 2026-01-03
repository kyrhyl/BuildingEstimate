/**
 * TRUSS DESIGN CALCULATION SERVICE
 * Orchestrates truss and framing calculations (DB → Math → Results)
 * 
 * Architecture: LOGIC LAYER
 * - Accepts high-level input from UI
 * - Calls pure math functions from math layer
 * - Returns structured results for UI display
 * - Handles validation, defaults, and error management
 */

import { 
  generateTruss, 
  calculateTrussQuantity, 
  calculateTotalTrussQuantities,
  type TrussParameters, 
  type TrussResult 
} from '@/lib/math/roofing/truss';
import { 
  calculateRoofFraming, 
  type FramingParameters, 
  type FramingResult 
} from '@/lib/math/roofing/framing';

/**
 * Input for truss design calculation
 */
export interface TrussDesignInput {
  trussParams: TrussParameters;
  buildingLength_mm: number;
  framingParams?: Partial<FramingParameters>;
}

/**
 * Result of truss design calculation
 */
export interface TrussDesignResult {
  truss: TrussResult;
  framing?: FramingResult;
  quantity: {
    trussCount: number;
    totalTrussWeight_kg: number;
    totalPurlinWeight_kg: number;
    totalBracingWeight_kg: number;
  };
  errors: string[];
  warnings: string[];
}

/**
 * Calculate complete truss design including structural analysis and framing plan
 * This is the orchestrator that UI components should call instead of math functions
 * 
 * @param input - Truss design parameters
 * @returns Complete truss design result with quantities
 */
export function calculateTrussDesign(input: TrussDesignInput): TrussDesignResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate inputs
  if (input.buildingLength_mm <= 0) {
    errors.push('Building length must be positive');
  }
  if (input.trussParams.span_mm <= 0) {
    errors.push('Truss span must be positive');
  }
  if (input.trussParams.spacing_mm <= 0) {
    errors.push('Truss spacing must be positive');
  }

  // If validation failed, return early
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  // Step 1: Generate truss structural design
  let trussResult: TrussResult;
  try {
    trussResult = generateTruss(input.trussParams);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Truss generation failed: ${errorMsg}`);
  }

  // Validation: Check truss result
  if (!trussResult.validation.valid) {
    warnings.push(...trussResult.validation.warnings);
  }

  // Step 2: Calculate truss quantity
  const trussCount = calculateTrussQuantity(
    input.buildingLength_mm,
    input.trussParams.spacing_mm
  );

  // Step 3: Calculate total quantities for all trusses
  const totalQuantities = calculateTotalTrussQuantities(trussResult, trussCount);

  // Step 4: Calculate framing plan if framing parameters provided
  let framingResult: FramingResult | undefined;
  let totalPurlinWeight_kg = 0;
  let totalBracingWeight_kg = 0;

  if (input.framingParams && isFramingParamsComplete(input.framingParams)) {
    try {
      const fullFramingParams: FramingParameters = {
        trussSpan_mm: input.trussParams.span_mm,
        trussSpacing_mm: input.trussParams.spacing_mm,
        buildingLength_mm: input.buildingLength_mm,
        trussQuantity: trussCount,
        roofingMaterial: input.framingParams.roofingMaterial!,
        purlinSpacing_mm: input.framingParams.purlinSpacing_mm!,
        purlinSpec: input.framingParams.purlinSpec!,
        bracing: input.framingParams.bracing!,
        includeRidgeCap: input.framingParams.includeRidgeCap ?? true,
        includeEaveGirt: input.framingParams.includeEaveGirt ?? true,
      };

      framingResult = calculateRoofFraming(fullFramingParams);
      totalPurlinWeight_kg = framingResult.purlins.totalWeight_kg;
      totalBracingWeight_kg = framingResult.bracing.totalWeight_kg;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      warnings.push(`Framing calculation warning: ${errorMsg}`);
    }
  }

  return {
    truss: trussResult,
    framing: framingResult,
    quantity: {
      trussCount,
      totalTrussWeight_kg: totalQuantities.totalWeight_kg,
      totalPurlinWeight_kg,
      totalBracingWeight_kg,
    },
    errors,
    warnings,
  };
}

/**
 * Helper: Check if framing parameters are complete enough to calculate
 */
function isFramingParamsComplete(params: Partial<FramingParameters>): boolean {
  return !!(
    params.roofingMaterial &&
    params.purlinSpacing_mm &&
    params.purlinSpec &&
    params.bracing
  );
}

/**
 * Validate truss parameters before calculation
 * Returns array of validation error messages (empty if valid)
 */
export function validateTrussParameters(params: TrussParameters): string[] {
  const errors: string[] = [];

  if (params.span_mm <= 0) {
    errors.push('Span must be positive');
  }
  if (params.span_mm < 3000 || params.span_mm > 30000) {
    errors.push('Span should be between 3m and 30m for practical trusses');
  }
  if (params.middleRise_mm <= 0) {
    errors.push('Rise must be positive');
  }
  if (params.spacing_mm <= 0 || params.spacing_mm > 3000) {
    errors.push('Truss spacing should be between 0 and 3000mm');
  }
  if (params.topChordMaterial.weight_kg_per_m <= 0) {
    errors.push('Top chord weight per meter must be positive');
  }
  if (params.bottomChordMaterial.weight_kg_per_m <= 0) {
    errors.push('Bottom chord weight per meter must be positive');
  }
  if (params.webMaterial.weight_kg_per_m <= 0) {
    errors.push('Web material weight per meter must be positive');
  }

  return errors;
}
