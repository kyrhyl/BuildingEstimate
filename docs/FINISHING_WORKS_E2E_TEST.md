# FINISHING WORKS - E2E TESTING GUIDE

## Test Scenario: Simple Residential Room

This guide walks through a complete end-to-end test of the Finishing Works module using a single room with all finish types.

## Prerequisites

- Running Next.js app: `npm run dev`
- Empty test project created
- Grid system configured
- Levels configured

## Test Data Setup

### Project Configuration

**Grid System:**
- Grid X: A (0m), B (6m)
- Grid Y: 1 (0m), 2 (5m)

**Levels:**
- GL: 0.0m elevation
- 2F: 3.0m elevation (gives 3.0m storey height)

## Step-by-Step Test

### 1. Create Test Space

**Navigate to:** Projects → [Your Project] → Spaces →

**Action:** Click "New Space"

**Input:**
- Name: `Bedroom 101`
- Level: `GL`
- Boundary Type: `Grid Rectangle`
- Grid X: `A` to `B` (6m width)
- Grid Y: `1` to `2` (5m length)

**Expected Result:**
- Space created successfully
- Computed area: `30.000 m²` (6 × 5)
- Computed perimeter: `22.000 m` (2 × (6 + 5))

### 2. Create Openings

**Navigate to:** Spaces page (future: separate Openings page)

For now, we'll use the API directly or create via database:

**Opening 1 - Door:**
```bash
POST /api/projects/:id/openings
{
  "levelId": "GL",
  "spaceId": "<bedroom-space-id>",
  "type": "door",
  "width_m": 0.9,
  "height_m": 2.1,
  "qty": 1
}
```

**Expected:** area_m2 = 1.890 m²

**Opening 2 - Windows:**
```bash
POST /api/projects/:id/openings
{
  "levelId": "GL",
  "spaceId": "<bedroom-space-id>",
  "type": "window",
  "width_m": 1.2,
  "height_m": 1.5,
  "qty": 2
}
```

**Expected:** area_m2 = 3.600 m² (1.2 × 1.5 × 2)

### 3. Create Finish Types

**Navigate to:** Projects → [Your Project] → Finishes → Finish Types Tab

#### Floor Finish: Ceramic Tile

**Click:** "New Finish Type"

**Input:**
- Category: `Floor`
- Finish Name: `Ceramic Floor Tile 400x400mm`
- DPWH Catalog Search: `ceramic tile` or `701`
- Select: `701 (1) a - Floor Tile, Ceramic, 400 mm x 400 mm`
- Unit: `Square Meter` (auto-filled)
- Waste %: `0.05` (5%)
- Rounding: `2`

**Expected:** Finish type created

#### Wall Finish: Paint

**Click:** "New Finish Type"

**Input:**
- Category: `Wall`
- Finish Name: `Paint on Concrete (2 coats)`
- DPWH Catalog Search: `paint` or `802`
- Select: `802 (1) a - Painting, two (2) coats, on Concrete`
- Unit: `Square Meter` (auto-filled)
- Height Mode: `Full Storey Height`
- Deduct Openings: ✓ Enabled
- Min Opening Area: `0.5` m²
- Deduction Types: `door`, `window`
- Waste %: `0.05` (5%)
- Rounding: `2`

**Expected:** Finish type created with deduction rules

#### Ceiling Finish: Gypsum Board

**Click:** "New Finish Type"

**Input:**
- Category: `Ceiling`
- Finish Name: `Gypsum Board Ceiling 12mm`
- DPWH Catalog Search: `gypsum` or `706`
- Select: `706 (1) - Gypsum Board, Regular, 12 mm thick`
- Unit: `Square Meter` (auto-filled)
- Waste %: `0.05` (5%)
- Rounding: `2`

**Expected:** Finish type created

### 4. Assign Finishes to Space

**Navigate to:** Finishes → Space Assignments Tab

#### Assign Floor

**Input:**
- Space: `Bedroom 101 (GL)`
- Finish Type: `Ceramic Floor Tile 400x400mm (floor)`
- Scope: `base`

**Click:** Assign

**Expected:** Assignment created

#### Assign Wall

**Input:**
- Space: `Bedroom 101 (GL)`
- Finish Type: `Paint on Concrete (2 coats) (wall)`
- Scope: `paint`

**Click:** Assign

**Expected:** Assignment created

#### Assign Ceiling

**Input:**
- Space: `Bedroom 101 (GL)`
- Finish Type: `Gypsum Board Ceiling 12mm (ceiling)`
- Scope: `ceiling`

**Click:** Assign

**Expected:** Assignment created

**Verify:** Should have 3 assignments for Bedroom 101

### 5. Generate Takeoff

**Navigate to:** Projects → [Your Project] → Takeoff

**Click:** "Calculate Takeoff"

**Expected Takeoff Lines:**

#### Floor Takeoff
- Trade: `Finishes`
- Resource: `floor-<finish-id>`
- Quantity: `31.50 m²`
  - Calculation: 30.000 × 1.05 = 31.50 m²
- Formula: `Floor finish area = Space.area × (1 + waste)`
- Inputs:
  - area_m2: 30.000
  - waste: 0.05
- Assumptions: `Waste: 5.0%`
- Tags: `level:GL`, `space:<id>`, `spaceName:Bedroom 101`, `category:floor`

#### Wall Takeoff
- Trade: `Finishes`
- Resource: `wall-<finish-id>`
- Quantity: `63.96 m²`
  - Calculation:
    - Gross: 22 × 3.0 = 66.00 m²
    - Deductions: 1.89 + 3.60 = 5.49 m²
    - Net: 66.00 - 5.49 = 60.51 m²
    - With waste: 60.51 × 1.05 = 63.54 m² (rounded to 63.54)
- Formula: Shows full calculation with deductions
- Inputs:
  - perimeter_m: 22.000
  - height_m: 3.000
  - grossWallArea: 66.000
  - openingDeduction: 5.490
  - netWallArea: 60.510
  - waste: 0.05
- Assumptions:
  - `Storey height: 3m`
  - `Deduction: min 0.5m², types: door, window`
  - `Openings deducted: 2 (5.490m²)`
  - `Waste: 5.0%`

#### Ceiling Takeoff
- Trade: `Finishes`
- Resource: `ceiling-<finish-id>`
- Quantity: `31.50 m²`
  - Calculation: 30.000 × 1.05 = 31.50 m²
- Formula: `Ceiling finish area = Space.area × (1 + waste)`
- Inputs:
  - area_m2: 30.000
  - waste: 0.05
  - isOpenToBelow: 0
- Assumptions: `Waste: 5.0%`

### 6. Verify Takeoff Display

**Filter by Trade:** `Finishes`

**Verify:**
- [ ] 3 finish takeoff lines appear
- [ ] Quantities match expected values
- [ ] Formulas are readable and accurate
- [ ] Inputs snapshot shows all relevant values
- [ ] Tags include space name, level, category

**Click on any line to view details:**
- [ ] Formula text displays correctly
- [ ] Assumptions list shows all rules applied
- [ ] Inputs snapshot shows calculation breakdown

### 7. Generate BOQ

**Navigate to:** Projects → [Your Project] → BOQ

**Click:** "Generate BOQ" (with takeoff lines from step 5)

**Expected BOQ Lines:**

#### BOQ Line 1: Floor Tiles
- DPWH Item: `701 (1) a`
- Description: `Floor Tile, Ceramic, 400 mm x 400 mm`
- Unit: `Square Meter`
- Quantity: `31.50 m²`
- Source Lines: 1 (floor takeoff line)
- Tags: `trade:Finishes`, `spaces:1× Bedroom 101`, `categories:1× floor`

#### BOQ Line 2: Wall Paint
- DPWH Item: `802 (1) a`
- Description: `Painting, two (2) coats, on Concrete`
- Unit: `Square Meter`
- Quantity: `63.54 m²`
- Source Lines: 1 (wall takeoff line)
- Tags: `trade:Finishes`, `spaces:1× Bedroom 101`, `categories:1× wall`

#### BOQ Line 3: Ceiling Gypsum
- DPWH Item: `706 (1)`
- Description: `Gypsum Board, Regular, 12 mm thick`
- Unit: `Square Meter`
- Quantity: `31.50 m²`
- Source Lines: 1 (ceiling takeoff line)
- Tags: `trade:Finishes`, `spaces:1× Bedroom 101`, `categories:1× ceiling`

### 8. Verify BOQ Traceability

**Click on any BOQ line to expand details**

**Verify:**
- [ ] Source takeoff line IDs are listed
- [ ] Can click through to see source takeoff line details
- [ ] Quantities aggregate correctly from multiple source lines (if applicable)
- [ ] DPWH item number matches catalog
- [ ] Unit matches catalog exactly

### 9. Test Edge Cases

#### Test 9.1: Open-to-Below Ceiling

**Action:** Edit Bedroom 101 space
- Add metadata: `isOpenToBelow: true`

**Re-calculate takeoff**

**Expected:** Ceiling takeoff quantity = 0 m²

---

#### Test 9.2: Fixed Wall Height (Wainscot)

**Action:** Create new finish type
- Category: `Wall`
- Name: `Tile Wainscot`
- DPWH: Search for wall tile item
- Height Mode: `Fixed`
- Height Value: `1.2 m`

**Assign to Bedroom 101** with scope `wainscot`

**Re-calculate takeoff**

**Expected:**
- Wall area = 22 × 1.2 = 26.4 m²
- No opening deductions (too high)
- Assumptions show `Fixed height: 1.2m`

---

#### Test 9.3: Small Opening Not Deducted

**Action:** Create new opening
- Type: `vent`
- Dimensions: 0.3m × 0.3m
- Qty: 1
- Area: 0.09 m² (below 0.5 m² threshold)

**Re-calculate takeoff**

**Expected:**
- Vent NOT deducted from wall paint
- Only door + windows deducted
- Assumptions list shows deducted openings (excludes vent)

---

#### Test 9.4: Multiple Spaces

**Action:** Create another space
- Name: `Bathroom 101`
- Grid: A-B × 2-3 (30 m²)

**Assign same finishes**

**Re-calculate takeoff and BOQ**

**Expected:**
- 6 takeoff lines total (3 per space)
- 3 BOQ lines (grouped by DPWH item)
- Each BOQ line quantity = sum of both spaces
- Tags show `spaces:2× Bedroom 101, Bathroom 101`

## Acceptance Criteria

### Math Accuracy
- [ ] Floor area matches grid dimensions
- [ ] Perimeter calculated correctly
- [ ] Wall area includes storey height
- [ ] Opening deductions subtract correctly
- [ ] Waste percentages applied correctly
- [ ] Rounding to specified decimal places

### Data Integrity
- [ ] DPWH item numbers validated against catalog
- [ ] Units match catalog exactly
- [ ] All foreign keys valid (spaceId, finishTypeId)
- [ ] Cascade deletes work (delete space → assignments deleted)

### UI/UX
- [ ] Forms validate required fields
- [ ] DPWH catalog search works
- [ ] Auto-fill works for item number/unit
- [ ] Tables display readable data
- [ ] Thousand separators on numbers
- [ ] Edit/delete actions confirm before execution

### Traceability
- [ ] Every BOQ line links to source takeoff lines
- [ ] Every takeoff line shows formula + inputs + assumptions
- [ ] Can trace from BOQ → Takeoff → Space → Finish Type
- [ ] Tags provide context (space name, level, category)

### Integration
- [ ] Finishes takeoff generated alongside structural
- [ ] BOQ includes both structural and finishes
- [ ] Summary shows finish quantities separately
- [ ] History tracks finish calculations
- [ ] PDF export includes finishes (if implemented)

## Troubleshooting

### Issue: Space area shows 0

**Cause:** Grid lines not found

**Fix:** Ensure grid labels in boundary match actual grid system

---

### Issue: DPWH item not found

**Cause:** Item number doesn't exist in catalog or typo

**Fix:** Use catalog search to find exact item number

---

### Issue: Wall deductions incorrect

**Cause:** Opening types or min area mismatch

**Fix:** Check deductionRule.includeTypes and minOpeningAreaToDeduct_m2

---

### Issue: Ceiling quantity unexpected

**Cause:** isOpenToBelow flag set incorrectly

**Fix:** Check space metadata

---

### Issue: BOQ quantity doesn't match takeoff

**Cause:** Multiple takeoff lines mapped to same DPWH item

**Fix:** This is correct behavior - BOQ aggregates by DPWH item

## Performance Benchmarks

**Expected performance for 100 spaces:**
- Space creation: < 50ms each
- Opening creation: < 30ms each
- Finish type creation: < 100ms (includes catalog validation)
- Assignment creation: < 50ms
- Takeoff calculation: < 2 seconds total
- BOQ generation: < 500ms

**Database queries:**
- Spaces load: 1 query
- Openings load: 1 query (filtered by level/space)
- Finish types load: 1 query
- Assignments load: 1 query
- Calculation: 1 project load + calculation (no additional DB calls in math layer)

## Next Steps After E2E Test

1. **Performance testing** with large projects (500+ spaces)
2. **Polygon boundary** implementation
3. **Wall-based geometry** (replace perimeter model)
4. **Opening placement** on specific walls
5. **Material cost estimation** (unit rates × quantities)
6. **PDF export** enhancement (add finishes section)

---

**Test Status:** Ready for Execution  
**Last Updated:** 2026-01-01  
**Estimated Duration:** 30 minutes
