# FINISHING WORKS MODULE

## Overview

The Finishing Works module estimates quantities for floor, wall, and ceiling finishes using a **SPACE + SURFACE + FINISH-TEMPLATE** model. It integrates seamlessly with the existing structural estimation system and follows DPWH pay item standards.

## Key Design Principles

1. **Finishes are estimated by SPACES, not structural elements**
   - Each space (room) has a defined boundary and computed area/perimeter
   - Finish quantities are calculated based on space geometry

2. **Support for multiple finish categories**
   - Floor finishes (tiles, epoxy, carpet, etc.)
   - Wall finishes (paint, tiles, plaster, etc.)
   - Ceiling finishes (gypsum board, acoustic tiles, etc.)
   - Separate items for plaster and paint (even if areas match)

3. **Opening deductions for walls**
   - Doors and windows can be deducted from wall areas
   - Configurable minimum area threshold (default 0.5 m²)
   - Configurable opening types to deduct

4. **Full traceability**
   - Every BOQ line links to source takeoff lines
   - Every takeoff line includes formula, inputs, and assumptions

## Data Model

### 1. Space

Represents a room or defined area within a level.

```typescript
interface Space {
  id: string;
  name: string;                    // e.g., "Living Room", "Kitchen"
  levelId: string;                 // Reference to Level
  boundary: {
    type: 'gridRect' | 'polygon';
    data: GridRectBoundary | PolygonBoundary;
  };
  computed: {
    area_m2: number;               // Auto-calculated floor area
    perimeter_m: number;           // Auto-calculated perimeter
  };
  metadata?: Record<string, string>;
  tags: string[];
}
```

**Boundary Types:**
- `gridRect`: Rectangle defined by grid lines (e.g., Grid A-B × 1-2)
- `polygon`: Custom polygon defined by coordinate points (future enhancement)

### 2. Opening

Represents doors, windows, or other openings that may affect wall finishes.

```typescript
interface Opening {
  id: string;
  levelId: string;
  spaceId?: string;                // Optional - can be global to level
  type: 'door' | 'window' | 'vent' | 'louver' | 'other';
  width_m: number;
  height_m: number;
  qty: number;
  computed: {
    area_m2: number;               // width × height × qty
  };
  tags: string[];
}
```

### 3. FinishType (Template)

Defines a finish material and its calculation rules.

```typescript
interface FinishType {
  id: string;
  category: 'floor' | 'wall' | 'ceiling' | 'plaster' | 'paint';
  finishName: string;              // e.g., "Ceramic Tile", "Paint on Concrete"
  dpwhItemNumberRaw: string;       // Must exist in DPWH catalog
  unit: string;                    // Must match DPWH unit
  wallHeightRule?: {
    mode: 'fullHeight' | 'fixed';
    value_m?: number;              // Required if mode = 'fixed'
  };
  deductionRule?: {
    enabled: boolean;
    minOpeningAreaToDeduct_m2: number;
    includeTypes: string[];        // e.g., ['door', 'window']
  };
  assumptions?: {
    wastePercent?: number;         // e.g., 0.05 for 5%
    rounding?: number;             // Decimal places
    notes?: string;
  };
}
```

### 4. SpaceFinishAssignment

Maps a finish type to a space.

```typescript
interface SpaceFinishAssignment {
  id: string;
  spaceId: string;
  finishTypeId: string;
  scope: string;                   // e.g., "base", "plaster", "paint"
  overrides?: {
    height_m?: number;             // Override wall height
    wastePercent?: number;         // Override waste percentage
  };
}
```

## Calculation Formulas

### Floor Finish

```
qty = space.area_m2 × (1 + waste%)
```

**Inputs:**
- `area_m2`: Space floor area

**Assumptions:**
- Waste percentage (default: 0% unless specified)
- No deductions for floor finishes

### Ceiling Finish

```
qty = space.area_m2 × (1 + waste%)

Special case: if isOpenToBelow = true, qty = 0
```

**Inputs:**
- `area_m2`: Space ceiling area (same as floor unless open)
- `isOpenToBelow`: Space metadata flag

**Assumptions:**
- Waste percentage
- Open-to-below spaces have no ceiling

### Wall Finish (with Opening Deductions)

```
1. Determine wall height:
   - If wallHeightRule.mode = 'fullHeight': use storey height
   - If wallHeightRule.mode = 'fixed': use wallHeightRule.value_m

2. Calculate gross wall area:
   grossWallArea = perimeter_m × height_m

3. Calculate opening deductions:
   For each opening in space:
     - Check if opening.type is in deductionRule.includeTypes
     - Check if opening.area_m2 >= deductionRule.minOpeningAreaToDeduct_m2
     - If both true: add opening.area_m2 to total deduction

4. Calculate net wall area:
   netWallArea = max(grossWallArea - openingDeduction, 0)

5. Apply waste:
   qty = netWallArea × (1 + waste%)
```

**Inputs:**
- `perimeter_m`: Space perimeter
- `height_m`: Wall finish height
- `grossWallArea`: Perimeter × height
- `openingDeduction`: Sum of deducted opening areas
- `netWallArea`: Gross - deductions

**Assumptions:**
- Storey height source (from level elevations or default 3.0m)
- Deduction rule parameters
- Waste percentage
- Opening details (type, count, area)

## Workflow

### 1. Define Spaces

Navigate to **Spaces** page:
1. Click "New Space"
2. Enter name (e.g., "Living Room")
3. Select level
4. Define boundary (select grid rectangle)
5. Save

The system automatically calculates:
- Floor area (m²)
- Perimeter (m)

### 2. Define Openings (Optional)

Navigate to **Spaces** page (future: separate Openings page):
1. Create openings (doors, windows)
2. Specify dimensions and quantity
3. Assign to space or leave global to level

### 3. Create Finish Types

Navigate to **Finishes** → **Finish Types** tab:
1. Click "New Finish Type"
2. Select category (floor/wall/ceiling/plaster/paint)
3. Search DPWH catalog for matching item
4. Select item (auto-fills item number and unit)
5. Configure:
   - **For walls:** Height mode (full/fixed), deduction rules
   - **For all:** Waste percentage, rounding
6. Save

### 4. Assign Finishes to Spaces

Navigate to **Finishes** → **Space Assignments** tab:
1. Select space
2. Select finish type
3. Enter scope (e.g., "base", "plaster", "paint")
4. Click "Assign"

You can assign multiple finishes to one space (e.g., floor tile + wall paint + ceiling gypsum).

### 5. Generate Takeoff

Navigate to **Takeoff** tab:
1. Click "Calculate Takeoff"
2. System generates:
   - Structural takeoff lines (existing)
   - **Finishes takeoff lines** (new)
3. View results with filters:
   - Trade = "Finishes"
   - Level, Space, Category

Each takeoff line includes:
- Quantity with proper unit
- Formula text showing calculation
- Inputs snapshot (area, perimeter, deductions)
- Assumptions (waste, deductions, heights)

### 6. Generate BOQ

Navigate to **BOQ** tab:
1. Click "Generate BOQ"
2. System maps takeoff lines to DPWH items
3. Finishes are grouped by DPWH item number
4. View traceability: BOQ line → source takeoff lines

## Deduction Rules

### Example: Paint on Concrete Walls

**Configuration:**
```json
{
  "deductionRule": {
    "enabled": true,
    "minOpeningAreaToDeduct_m2": 0.5,
    "includeTypes": ["door", "window"]
  }
}
```

**Behavior:**
- Doors and windows ≥ 0.5 m² are deducted
- Vents < 0.5 m² are ignored (painted over)
- Louvers are ignored (not in includeTypes)

### Example: Ceramic Wall Tiles

**Configuration:**
```json
{
  "deductionRule": {
    "enabled": true,
    "minOpeningAreaToDeduct_m2": 1.0,
    "includeTypes": ["door"]
  }
}
```

**Behavior:**
- Only doors ≥ 1.0 m² are deducted
- Windows are NOT deducted (tiles cut around them)

### Example: Plaster (Full Coverage)

**Configuration:**
```json
{
  "deductionRule": {
    "enabled": false,
    "minOpeningAreaToDeduct_m2": 0,
    "includeTypes": []
  }
}
```

**Behavior:**
- No deductions
- Plaster applied over full wall area including around openings

## Wall Height Modes

### Full Height (Default)

Uses storey height calculated from level elevations:
```
storeyHeight = nextLevel.elevation - currentLevel.elevation
```

If no next level exists, defaults to 3.0m.

**Use cases:**
- Paint to ceiling
- Tiles to ceiling
- Full-height wainscot

### Fixed Height

Uses specified height value (e.g., 1.2m for wainscot):
```
wallArea = perimeter × fixedHeight
```

**Use cases:**
- Wainscot (typically 1.2m)
- Dado (0.9m)
- Chair rail area (1.0m)

## DPWH BOQ Mapping

### Mapping Logic

1. **Extract DPWH item from finish type**
   - Each finish type has `dpwhItemNumberRaw` (validated against catalog)

2. **Tag takeoff lines**
   - Each finish takeoff line is tagged with `dpwh:{itemNumber}`

3. **Group by DPWH item**
   - All takeoff lines with same DPWH item are aggregated into one BOQ line

4. **Create BOQ line**
   ```typescript
   BOQLine = {
     dpwhItemNumberRaw: "701 (1) a",
     description: "Ceramic Floor Tile, 300x300mm",
     unit: "Square Meter",
     quantity: sum(takeoffLines.quantity),
     sourceTakeoffLineIds: [takeoffLine.id, ...],
     tags: ["trade:Finishes", "spaces:3× Living Room", ...]
   }
   ```

### Traceability Chain

```
DPWH BOQ Line
  ↓ sourceTakeoffLineIds
TakeoffLine
  ↓ formulaText + inputsSnapshot
Space Geometry + Finish Type Rules
  ↓
Raw Inputs (area, perimeter, openings)
```

## Extending the System

### Adding New Finish Categories

1. **Update TypeScript types** (`types/index.ts`):
   ```typescript
   category: 'floor' | 'wall' | 'ceiling' | 'plaster' | 'paint' | 'YOUR_NEW_CATEGORY'
   ```

2. **Update Mongoose schema** (`models/Project.ts`):
   ```typescript
   category: { type: String, enum: [..., 'YOUR_NEW_CATEGORY'], ... }
   ```

3. **Add calculation logic** (`lib/logic/calculateFinishes.ts`):
   ```typescript
   else if (finishType.category === 'YOUR_NEW_CATEGORY') {
     takeoffLine = computeYourCustomTakeoff({ ... });
   }
   ```

4. **Update UI** (`app/projects/[id]/finishes/page.tsx`):
   ```tsx
   <option value="YOUR_NEW_CATEGORY">Your New Category</option>
   ```

### Adding Custom Deduction Rules

Example: Deduct only openings on specific walls

1. **Extend FinishType**:
   ```typescript
   deductionRule: {
     ...
     wallFilter?: 'north' | 'south' | 'east' | 'west';
   }
   ```

2. **Update calculation logic**:
   ```typescript
   // Filter openings by wall orientation
   const filteredOpenings = openings.filter(o => 
     o.metadata?.wall === finishType.deductionRule?.wallFilter
   );
   ```

### Supporting Wall-Based Geometry (Future)

Current model uses space perimeter. To switch to wall-object-based:

1. **Create Wall model**:
   ```typescript
   interface Wall {
     id: string;
     spaceId: string;
     startPoint: [number, number];
     endPoint: [number, number];
     length_m: number;
     height_m: number;
     orientation: 'north' | 'south' | 'east' | 'west';
     openings: Opening[];
   }
   ```

2. **Update calculation**:
   ```typescript
   computeWallFinishTakeoff(wall: Wall, finishType: FinishType) {
     const wallArea = wall.length_m * wall.height_m;
     const deductions = wall.openings.reduce(...);
     return wallArea - deductions;
   }
   ```

3. **Aggregate at space level**:
   ```typescript
   const totalWallArea = walls
     .filter(w => w.spaceId === space.id)
     .reduce((sum, wall) => sum + computeWallFinish(wall), 0);
   ```

## Testing

### Unit Tests

Run math layer tests:
```bash
npm test lib/math/finishes/__tests__/geometry.test.ts
npm test lib/math/finishes/__tests__/takeoff.test.ts
```

**Coverage:**
- Grid rectangle geometry (area, perimeter)
- Polygon geometry (shoelace formula)
- Floor finish calculation (with/without waste)
- Ceiling finish calculation (with open-to-below)
- Wall finish calculation (with opening deductions)
- Deduction rule filters (min area, types)
- Height modes (full vs fixed)

### Integration Tests

**Test Project Setup:**

1. Create test project
2. Define grid: A, B, C (@ 0, 5, 10m) × 1, 2, 3 (@ 0, 6, 12m)
3. Add levels: GL (0m), 2F (3.6m)
4. Create space: "Test Room" @ GL, Grid A-B × 1-2 (30 m², 22 m perimeter)
5. Add openings:
   - Door: 0.9m × 2.1m × 1 = 1.89 m²
   - Window: 1.2m × 1.5m × 2 = 3.60 m²
6. Create finish types:
   - Floor: Ceramic Tile (DPWH 701 (1) a)
   - Wall: Paint on Concrete (DPWH 802 (1) a)
   - Ceiling: Gypsum Board (DPWH 706 (1))
7. Assign finishes to space
8. Calculate takeoff
9. Verify:
   - Floor: 30 m² × 1.05 = 31.5 m²
   - Wall: (22 × 3.6) - (1.89 + 3.60) = 73.71 m²
   - Ceiling: 30 m² × 1.05 = 31.5 m²
10. Generate BOQ
11. Verify:
    - 3 BOQ lines (one per DPWH item)
    - Quantities match takeoff totals
    - Source traceability links exist

### Validation Checklist

- [ ] DPWH item numbers exist in catalog
- [ ] Units match catalog exactly
- [ ] Space areas computed correctly
- [ ] Opening areas computed correctly
- [ ] Wall deductions applied per rules
- [ ] Waste percentages applied correctly
- [ ] Formulas display correctly in UI
- [ ] Traceability links functional
- [ ] BOQ grouped by DPWH item

## API Reference

### Spaces

- `GET /api/projects/:id/spaces` - List all spaces
- `POST /api/projects/:id/spaces` - Create space (auto-computes geometry)
- `GET /api/projects/:id/spaces/:spaceId` - Get space details
- `PUT /api/projects/:id/spaces/:spaceId` - Update space (re-computes geometry)
- `DELETE /api/projects/:id/spaces/:spaceId` - Delete space (removes assignments)

### Openings

- `GET /api/projects/:id/openings?levelId=&spaceId=` - List openings (filtered)
- `POST /api/projects/:id/openings` - Create opening (auto-computes area)
- `DELETE /api/projects/:id/openings?openingId=` - Delete opening

### Finish Types

- `GET /api/projects/:id/finish-types?category=` - List finish types (filtered)
- `POST /api/projects/:id/finish-types` - Create finish type (validates DPWH item)
- `DELETE /api/projects/:id/finish-types?finishTypeId=` - Delete finish type

### Assignments

- `GET /api/projects/:id/finish-assignments?spaceId=` - List assignments (filtered)
- `POST /api/projects/:id/finish-assignments` - Create assignment
- `DELETE /api/projects/:id/finish-assignments?assignmentId=` - Delete assignment

## Architecture Compliance

This module follows the system's strict layer separation:

**Math Layer** (`/lib/math/finishes/`)
- Pure deterministic functions
- No database access, no side effects
- Inputs → Outputs with formulas

**Logic Layer** (`/lib/logic/`)
- Orchestrates DB queries + math calls + BOQ mapping
- Handles business rules and validations

**API Layer** (`/app/api/`)
- HTTP request handling
- Calls logic layer
- Returns JSON responses

**UI Layer** (`/app/projects/[id]/`)
- No formulas or calculations
- Consumes API data
- Displays results and manages user input

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-01  
**Module Status:** Production Ready
