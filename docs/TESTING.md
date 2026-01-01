# Testing & Validation Guide

## Overview
This guide provides testing procedures to verify the accuracy and reliability of quantity calculations in the Building Estimate application.

---

## 1. Unit Testing (Calculation Functions)

### Concrete Volume Tests
Located in: `/lib/math/concrete.ts`

#### Test Case 1: Simple Beam
```typescript
// Given: Beam 0.30m × 0.50m × 6.00m
const volume = calculateBeamConcrete(0.30, 0.50, 6.00);
// Expected: 0.900 m³
// Formula: 0.30 × 0.50 × 6.00 = 0.900
```

#### Test Case 2: Rectangular Slab
```typescript
// Given: Slab 0.15m thick, 4.00m × 5.00m area
const volume = calculateSlabConcrete(0.15, 20.00);
// Expected: 3.000 m³
// Formula: 0.15 × 20.00 = 3.000
```

#### Test Case 3: Rectangular Column
```typescript
// Given: Column 0.40m × 0.40m, 3.00m height
const volume = calculateRectangularColumnConcrete(0.40, 0.40, 3.00);
// Expected: 0.480 m³
// Formula: 0.40 × 0.40 × 3.00 = 0.480
```

#### Test Case 4: Circular Column
```typescript
// Given: Column Ø0.50m, 3.00m height
const volume = calculateCircularColumnConcrete(0.50, 3.00);
// Expected: 0.589 m³
// Formula: π × (0.50/2)² × 3.00 = 3.14159 × 0.0625 × 3.00 = 0.589
```

### Rebar Weight Tests
Located in: `/lib/math/rebar.ts`

#### Test Case 1: Bar Weight Calculation
```typescript
// Given: 10mm bar, 6.00m length
const weight = calculateBarWeight(10, 6.00, 0, 0);
// Expected: 3.702 kg
// Formula: 0.617 kg/m × 6.00m = 3.702 kg
```

#### Test Case 2: Main Bars with Lap
```typescript
// Given: 4-20mm bars, 6.00m length
const weight = calculateBeamMainBars(4, 20, 6.00);
// Expected: 61.824 kg
// Formula: 4 bars × 2.467 kg/m × (6.00m + 0.80m lap) × 1.03 waste = 61.824 kg
```

### Formwork Area Tests
Located in: `/lib/math/formwork.ts`

#### Test Case 1: Beam Formwork
```typescript
// Given: Beam 0.30m × 0.50m × 6.00m
const area = calculateBeamFormwork(0.30, 0.50, 6.00);
// Expected: 7.800 m²
// Formula: (0.30 + 2×0.50) × 6.00 = 1.30 × 6.00 = 7.800
```

#### Test Case 2: Slab Formwork
```typescript
// Given: Slab 20.00 m² area
const area = calculateSlabFormwork(20.00);
// Expected: 20.000 m²
// Formula: Area = 20.00 (soffit only)
```

---

## 2. Integration Testing (Full Workflow)

### Test Project: Simple Single-Story Structure

#### Project Setup
```
Grid System:
- X-Axis: A (0.0m), B (6.0m), C (12.0m)
- Y-Axis: 1 (0.0m), 2 (5.0m), 3 (10.0m)

Levels:
- FDN: -1.00m
- GL: 0.00m
- 2F: 3.00m

Templates:
- Beam B1: 0.30m × 0.50m
  - Rebar: 4-20mm main, 10mm stirrups @ 200mm
- Slab S1: 0.15m thick
  - Rebar: 12mm @ 200mm both ways
- Column C1: 0.40m × 0.40m
  - Rebar: 8-20mm main, 10mm ties @ 200mm
```

#### Expected Results

**Concrete Quantities:**
```
Beams (4 instances @ 6.0m each):
- Volume per beam: 0.30 × 0.50 × 6.00 = 0.900 m³
- Total: 4 × 0.900 = 3.600 m³

Slabs (2 panels @ 6.0m × 5.0m):
- Volume per panel: 0.15 × 30.00 = 4.500 m³
- Total: 2 × 4.500 = 9.000 m³

Columns (4 instances @ 3.0m height):
- Volume per column: 0.40 × 0.40 × 3.00 = 0.480 m³
- Total: 4 × 0.480 = 1.920 m³

TOTAL CONCRETE: 14.520 m³ (without waste)
With 5% waste: 15.246 m³
```

**Rebar Quantities (Approximate):**
```
Beam Main Bars: ~248 kg
Beam Stirrups: ~45 kg
Slab Main: ~420 kg
Slab Secondary: ~420 kg
Column Main: ~160 kg
Column Ties: ~30 kg

TOTAL REBAR: ~1,323 kg
```

**Formwork Quantities:**
```
Beams: 4 × 7.800 = 31.200 m²
Slabs: 2 × 30.000 = 60.000 m²
Columns: 4 × 4.800 = 19.200 m²

TOTAL FORMWORK: 110.400 m²
```

---

## 3. Manual Verification Process

### Step 1: Create Test Project
1. Create new project: "Test - Simple Structure"
2. Set up grid (as above)
3. Create levels
4. Define templates with exact dimensions
5. Place elements at known locations

### Step 2: Generate Calculations
1. Go to Takeoff tab
2. Click "Generate Takeoff"
3. Review detailed calculations
4. Export PDF report

### Step 3: Manual Calculation
Using spreadsheet or calculator:
```
Element: Beam B1-A-1-2 (GL Level)
- Width: 0.30m
- Height: 0.50m
- Length: From A to B = 6.00m
- Concrete Volume = 0.30 × 0.50 × 6.00 = 0.900 m³

Verify against Takeoff:
✓ Formula matches
✓ Values match
✓ Result matches
```

### Step 4: BOQ Verification
1. Generate BOQ
2. Verify aggregation by DPWH item
3. Check source traceability
4. Confirm element counts match

### Step 5: PDF Report Review
1. Export both Takeoff and BOQ reports
2. Check all calculations shown
3. Verify formulas are readable
4. Confirm totals match UI

---

## 4. Edge Cases & Boundary Testing

### Test Cases to Verify

#### Minimum Values
- [ ] Column 0.20m × 0.20m (minimum practical size)
- [ ] Slab 0.10m thick (minimum code requirement)
- [ ] Beam spanning 2.00m (shortest span)

#### Maximum Values
- [ ] Column 1.00m × 1.00m (large column)
- [ ] Slab 0.30m thick (thick slab)
- [ ] Beam spanning 10.00m (long span)

#### Special Conditions
- [ ] Zero waste factor (no waste applied)
- [ ] High waste factor (10% waste)
- [ ] Single element (no aggregation)
- [ ] Many identical elements (proper grouping)
- [ ] Mixed rebar diameters
- [ ] Foundation elements below GL

#### Grid Scenarios
- [ ] Non-uniform grid spacing
- [ ] Large grid offsets
- [ ] Negative elevations (foundations)
- [ ] Multiple building levels

---

## 5. Regression Testing

### Test After Each Update
```
□ All math functions return expected values
□ Grid geometry calculation correct
□ Level-to-level heights accurate
□ Waste factors apply correctly
□ DPWH item mapping works
□ BOQ aggregation groups properly
□ PDF export generates without errors
□ History tracking saves runs
```

### Automated Test Script Outline
```javascript
// tests/calculations.test.ts
describe('Concrete Calculations', () => {
  test('Beam volume calculation', () => {
    const result = calculateBeamConcrete(0.30, 0.50, 6.00);
    expect(result).toBe(0.900);
  });
  
  test('Slab volume calculation', () => {
    const result = calculateSlabConcrete(0.15, 20.00);
    expect(result).toBe(3.000);
  });
});
```

---

## 6. Industry Standard Comparison

### Compare Against:
1. **Manual calculations** from experienced estimators
2. **Commercial software** (PlanSwift, Bluebeam, CostX)
3. **DPWH standard estimates** for similar projects
4. **Published quantity tables** from construction handbooks

### Acceptable Tolerance
- Concrete volumes: ±0.5%
- Rebar weights: ±2% (due to lap variations)
- Formwork areas: ±1%

---

## 7. Validation Checklist

### Before Production Deployment
- [ ] Unit tests pass for all calculation functions
- [ ] Test project calculations verified manually
- [ ] Edge cases handled without errors
- [ ] PDF reports generate correctly
- [ ] BOQ traceability complete
- [ ] Formula display accurate
- [ ] Thousand separators working
- [ ] DPWH items map correctly
- [ ] History saves properly
- [ ] No calculation rounding errors

### Monthly Review
- [ ] Run test project through system
- [ ] Compare results with baseline
- [ ] Check for calculation drift
- [ ] Review any error reports
- [ ] Update test cases as needed

---

## 8. Known Limitations & Assumptions

### Current Assumptions
1. **Waste Factor**: Applied uniformly at 5% (concrete), 3% (rebar)
2. **Lap Length**: 40Ø for all bar sizes
3. **Formwork**: Standard contact areas only
4. **Units**: Metric only (m, m³, kg, m²)
5. **Rebar Spacing**: Assumes uniform distribution

### Items NOT Calculated
- Corner/edge reinforcement details
- Development/anchorage lengths
- Splices beyond standard lap
- Special formwork (curved, architectural)
- Bar bending/cutting waste beyond standard
- Labor productivity
- Material costs/pricing

---

## 9. Sample Test Data

### Quick Verification Test
Create a project with exactly:
- 1 beam: 0.25m × 0.40m × 5.00m = **0.500 m³**
- 1 slab: 0.12m thick, 10.00 m² = **1.200 m³**
- 1 column: Ø0.40m, 3.00m height = **0.377 m³**

**Expected Total: 2.077 m³**

If system shows different value → investigate immediately

---

## 10. Reporting Issues

### When Calculation Error Found
1. Document the specific input values
2. Show expected vs actual result
3. Note which component failed (concrete/rebar/formwork)
4. Provide screenshot or PDF export
5. Check if error is systematic or isolated
6. Test with similar but different values

### Error Report Template
```
Issue: [Brief description]
Component: [Concrete/Rebar/Formwork]
Input Values: [Exact dimensions/parameters]
Expected Result: [Manual calculation]
Actual Result: [System output]
Formula Shown: [From takeoff]
Difference: [Percentage variance]
```

---

## Conclusion

Regular testing ensures the system maintains accuracy. Start with the simple test project above, then gradually test more complex scenarios. Always verify critical projects manually before using for actual estimation.
