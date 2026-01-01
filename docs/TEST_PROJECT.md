# Quick Test Project Setup

## Purpose
This test project has known, manually verified dimensions for validating calculation accuracy.

---

## Test Project: "Validation - Simple Frame"

### Grid System
```
X-Axis Lines:
- A: 0.00m
- B: 6.00m
- C: 12.00m

Y-Axis Lines:
- 1: 0.00m
- 2: 5.00m
- 3: 10.00m

Grid creates 4 panels:
- A-B/1-2: 6.00m × 5.00m = 30.00 m²
- B-C/1-2: 6.00m × 5.00m = 30.00 m²
- A-B/2-3: 6.00m × 5.00m = 30.00 m²
- B-C/2-3: 6.00m × 5.00m = 30.00 m²
```

### Levels
```
- GL (Ground Level): 0.00m
- 2F (Second Floor): 3.00m
- RF (Roof): 6.00m
```

### Templates

#### Beam Templates
```
B1 - Standard Beam
- Type: Beam
- Width: 0.30m
- Height: 0.50m
- Main Rebar: 
  * Count: 4 bars
  * Diameter: 20mm
- Stirrups: 
  * Diameter: 10mm
  * Spacing: 0.20m
- DPWH Item: 900 (1) a (Structural Concrete 3000 psi)
```

#### Slab Templates
```
S1 - Standard Slab
- Type: Slab
- Thickness: 0.15m
- Main Rebar: 
  * Diameter: 12mm
  * Spacing: 0.20m (leave Count field empty for slabs)
- Secondary Rebar: 
  * Diameter: 12mm
  * Spacing: 0.20m
- DPWH Item: 900 (1) a

NOTE: For slabs, only enter diameter and spacing. 
The "Count" field should be left empty or set to 0 - 
the system calculates bar count from slab dimensions and spacing.
```

#### Column Templates
```
C1 - Square Column
- Type: Column (Rectangular)
- Width: 0.40m
- Height: 0.40m
- Main Rebar: 
  * Count: 8 bars
  * Diameter: 20mm
- Ties: 
  * Diameter: 10mm
  * Spacing: 0.20m
- DPWH Item: 900 (1) a
```

### Element Placement

#### Ground Floor (GL Level)

**Beams along X-axis (Grid 1):**
1. A-B/1: Beam B1, GL level
2. B-C/1: Beam B1, GL level

**Beams along X-axis (Grid 2):**
3. A-B/2: Beam B1, GL level
4. B-C/2: Beam B1, GL level

**Beams along X-axis (Grid 3):**
5. A-B/3: Beam B1, GL level
6. B-C/3: Beam B1, GL level

**Beams along Y-axis (Grid A):**
7. A/1-2: Beam B1, GL level
8. A/2-3: Beam B1, GL level

**Beams along Y-axis (Grid B):**
9. B/1-2: Beam B1, GL level
10. B/2-3: Beam B1, GL level

**Beams along Y-axis (Grid C):**
11. C/1-2: Beam B1, GL level
12. C/2-3: Beam B1, GL level

**Slabs:**
13. Panel A-B/1-2: Slab S1, GL level
14. Panel B-C/1-2: Slab S1, GL level
15. Panel A-B/2-3: Slab S1, GL level
16. Panel B-C/2-3: Slab S1, GL level

**Columns (GL to 2F):**
17. A-1: Column C1, start GL, end 2F
18. B-1: Column C1, start GL, end 2F
19. C-1: Column C1, start GL, end 2F
20. A-2: Column C1, start GL, end 2F
21. B-2: Column C1, start GL, end 2F
22. C-2: Column C1, start GL, end 2F
23. A-3: Column C1, start GL, end 2F
24. B-3: Column C1, start GL, end 2F
25. C-3: Column C1, start GL, end 2F

---

## Expected Calculation Results

### Concrete Volumes (Without Waste)

#### Beams
```
Total beams: 12
Beam types:
- 6 beams × 6.00m (along X-axis)
- 6 beams × 5.00m (along Y-axis)

Calculation:
- 6 × (0.30 × 0.50 × 6.00) = 6 × 0.900 = 5.400 m³
- 6 × (0.30 × 0.50 × 5.00) = 6 × 0.750 = 4.500 m³
Total Beams: 9.900 m³
```

#### Slabs
```
Total slabs: 4 panels
Area per panel: 6.00 × 5.00 = 30.00 m²
Thickness: 0.15m

Calculation:
- 4 × (0.15 × 30.00) = 4 × 4.500 = 18.000 m³
Total Slabs: 18.000 m³
```

#### Columns
```
Total columns: 9
Height: GL to 2F = 3.00m
Dimensions: 0.40 × 0.40m

Calculation:
- 9 × (0.40 × 0.40 × 3.00) = 9 × 0.480 = 4.320 m³
Total Columns: 4.320 m³
```

**TOTAL CONCRETE (No Waste): 32.220 m³**
**TOTAL CONCRETE (5% Waste): 33.831 m³**

---

### Rebar Weights (Approximate)

#### Beam Rebar
```
Main Bars (4-20mm per beam):
- X-axis beams: 6 × (4 × 2.467 kg/m × 6.80m × 1.03) = ~420 kg
- Y-axis beams: 6 × (4 × 2.467 kg/m × 5.80m × 1.03) = ~357 kg

Stirrups (10mm @ 200mm):
- X-axis: 6 × 35 × 0.617 × 1.76m = ~230 kg
- Y-axis: 6 × 30 × 0.617 × 1.76m = ~195 kg

Total Beam Rebar: ~1,202 kg
```

#### Slab Rebar
```
Main Bars (12mm @ 200mm):
- 4 panels × ~120 kg each = ~480 kg

Secondary Bars (12mm @ 200mm):
- 4 panels × ~120 kg each = ~480 kg

Total Slab Rebar: ~960 kg
```

#### Column Rebar
```
Main Bars (8-20mm):
- 9 columns × (8 × 2.467 × 3.00 × 1.03) = ~550 kg

Ties (10mm @ 200mm):
- 9 columns × 18 × 0.617 × 1.60m = ~160 kg

Total Column Rebar: ~710 kg
```

**TOTAL REBAR: ~2,872 kg**

---

### Formwork Areas

#### Beams
```
X-axis beams: 6 × [(0.30 + 2×0.50) × 6.00] = 6 × 7.80 = 46.80 m²
Y-axis beams: 6 × [(0.30 + 2×0.50) × 5.00] = 6 × 6.50 = 39.00 m²
Total Beam Formwork: 85.80 m²
```

#### Slabs
```
4 panels × 30.00 m² = 120.00 m²
Total Slab Formwork: 120.00 m²
```

#### Columns
```
Perimeter: 4 × 0.40 = 1.60m
9 columns × (1.60 × 3.00) = 9 × 4.80 = 43.20 m²
Total Column Formwork: 43.20 m²
```

**TOTAL FORMWORK: 249.00 m²**

---

## Validation Checklist

After creating this test project and running calculations:

### Takeoff Verification
- [ ] Total concrete matches: 33.831 m³ (with 5% waste)
- [ ] Beam count: 12 instances
- [ ] Slab count: 4 instances
- [ ] Column count: 9 instances
- [ ] Formulas show correct dimensions
- [ ] Grid-derived lengths are accurate

### Rebar Verification
- [ ] Total rebar approximately: 2,872 kg (±5%)
- [ ] Grade classification correct (Grade 60 for 20mm, Grade 40 for 10mm/12mm)
- [ ] DPWH items assigned (902 series)

### Formwork Verification
- [ ] Total formwork approximately: 249.00 m² (±2%)
- [ ] DPWH items assigned (903 series)

### BOQ Verification
- [ ] Aggregates by DPWH item correctly
- [ ] Source traceability shows all 25 elements
- [ ] Trade separation (Concrete/Rebar/Formwork) correct
- [ ] Element counts in BOQ match instances

### PDF Export
- [ ] Takeoff report generates without error
- [ ] BOQ report generates without error
- [ ] All formulas visible and correct
- [ ] Totals match UI display
- [ ] Page numbers correct

---

## Quick Manual Calculation Check

**Single Beam Check (A-B/1):**
```
Length: B - A = 6.00m - 0.00m = 6.00m
Cross-section: 0.30m × 0.50m
Volume: 0.30 × 0.50 × 6.00 = 0.900 m³
```
→ Verify this matches takeoff line for element "B1-A-B/1-GL"

**Single Slab Check (Panel A-B/1-2):**
```
X-span: B - A = 6.00m
Y-span: 2 - 1 = 5.00m
Area: 6.00 × 5.00 = 30.00 m²
Thickness: 0.15m
Volume: 0.15 × 30.00 = 4.500 m³
```
→ Verify this matches takeoff line for element "S1-AB/12-GL"

**Single Column Check (A-1):**
```
Height: 2F - GL = 3.00m - 0.00m = 3.00m
Cross-section: 0.40m × 0.40m
Volume: 0.40 × 0.40 × 3.00 = 0.480 m³
```
→ Verify this matches takeoff line for element "C1-A1-GL-2F"

---

## Common Issues to Watch For

1. **Grid Geometry**: Ensure spans calculate correctly from grid offsets
2. **Level Heights**: Column heights should use level-to-level calculation
3. **Waste Application**: Should be applied consistently
4. **Rebar Laps**: Check that lap lengths are added to bar lengths
5. **BOQ Aggregation**: All similar items should group under same DPWH number
6. **Formula Display**: Should show actual calculated values, not generic text

---

## Success Criteria

✅ **System is accurate if:**
- Concrete total within ±1% of 33.831 m³
- Rebar total within ±5% of 2,872 kg
- Formwork total within ±2% of 249.00 m²
- All formulas mathematically correct
- No calculation errors in any element

❌ **Requires investigation if:**
- Any total deviates by more than tolerance
- Formulas show incorrect dimensions
- Grid-derived lengths don't match manual calculation
- BOQ aggregation groups incorrectly
- Any element missing from takeoff

---

## Next Steps

1. Create this test project in the system
2. Run full calculation workflow
3. Compare results with expected values above
4. Export PDF reports for documentation
5. Save as baseline for future regression testing

If all validations pass, the system is ready for production use!
