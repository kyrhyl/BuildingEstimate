# Building Estimate Web App – Development Roadmap

## Tech Stack
- Next.js (App Router)
- React + TypeScript
- MongoDB (Mongoose)
- Metric units only

## Core Principles
- UI / Logic / Math separation
- DPWH pay-item-centric estimation
- Auditable takeoff → BOQ pipeline
- Incremental, test-first development

---

## Milestone 0 – Project Skeleton & Contracts
**Status:** ✅ Complete

### Scope
- Next.js project scaffold
- MongoDB connection
- Project schema
- CalcRun schema

### Deliverables
- ✅ /api/projects CRUD (GET, POST, PUT, DELETE)
- ✅ Project list + create UI
- ✅ Project detail page
- ✅ TypeScript interfaces locked

### Completed Files
- `/models/Project.ts` - Mongoose schema
- `/models/CalcRun.ts` - Mongoose schema
- `/types/index.ts` - TypeScript contracts
- `/lib/mongodb.ts` - Database connection
- `/app/api/projects/route.ts` - List & Create API
- `/app/api/projects/[id]/route.ts` - Get, Update, Delete API
- `/app/projects/page.tsx` - Project list UI
- `/app/projects/[id]/page.tsx` - Project detail UI
- `/app/page.tsx` - Landing page

### Notes
- No estimation logic yet (by design)
- All CRUD operations functional
- Ready for Milestone 1

---

## Milestone 1 – DPWH Catalog Integration
**Status:** ✅ Complete

### Scope
- Load DPWH Volume III catalog (all pay items)
- Read-only catalog access
- Search and filter functionality

### Deliverables
- ✅ /api/catalog search endpoint (GET with filters)
- ✅ Catalog UI page with search/filter
- ✅ **1,511 DPWH pay items** from official Volume III CSV
  - 24 Concrete items (900-901, 904 series)
  - 8 Rebar items (902 series)
  - 2 Formwork items (903 series)
  - 111 Earthwork items (800-808 series)
  - 140 Plumbing items
  - 70 Finishes items
  - Plus 20+ other trade categories

### Completed Files
- `/data/dpwh_pay_items_volumeIII_master.csv` - Official DPWH source (1,527 total items)
- `/data/dpwh-catalog.json` - Complete catalog with all trades
- `/scripts/convert-catalog.js` - CSV to JSON converter with proper CSV parsing
- `/app/api/catalog/route.ts` - Search API with trade/category filters (up to 5000 results)
- `/app/catalog/page.tsx` - Catalog browser UI
- `/types/index.ts` - Updated with 23 trade types and DPWHCatalogItem interface

### Features
- Search by item number or description
- Filter by 23 different trades (Concrete, Rebar, Formwork, Earthwork, Plumbing, etc.)
- Filter by category
- Real-time search results
- Proper CSV parsing handles quoted fields with commas
- Unique item numbers with suffix extraction (e.g., "900 (1) a", "902 (1) a1")
- No duplicate React keys

### Notes
- Catalog is read-only (intentional)
- Based on DPWH Volume III - 2023 Edition official specifications
- Covers all major trades for comprehensive building estimation
- Full catalog: 1,511 items across 23 trade categories
- Ready for BOQ mapping in Milestone 6

---

## Milestone 2 – Grid & Levels Model
**Status:** ✅ Complete

### Scope
- Grid system input (X and Y axes)
- Levels input (building elevations)
- Full CRUD with validation

### Deliverables
- ✅ Grid editor UI with X/Y axis line management
- ✅ Levels editor UI with elevation control
- ✅ API endpoints: GET/PUT /api/projects/[id]/grid
- ✅ API endpoints: GET/PUT /api/projects/[id]/levels
- ✅ Tab-based navigation in project detail page
- ✅ Real-time grid preview
- ✅ Duplicate label validation
- ✅ Save/load functionality

### Completed Files
- `/app/api/projects/[id]/grid/route.ts` - Grid API with validation
- `/app/api/projects/[id]/levels/route.ts` - Levels API with validation
- `/components/GridEditor.tsx` - Interactive grid editor
- `/components/LevelsEditor.tsx` - Interactive levels editor
- `/app/projects/[id]/page.tsx` - Updated with tabs and editors

### Features
- Add/edit/delete grid lines on X-axis (typically labeled A, B, C...)
- Add/edit/delete grid lines on Y-axis (typically labeled 1, 2, 3...)
- Add/edit/delete levels with elevations
- Auto-generates next available labels
- Validates unique labels
- Shows grid panel count
- Shows level spacing
- Sorts levels by elevation
- Persists to MongoDB

### Tests
- ✅ Duplicate label validation (server-side)
- ✅ Offset/elevation number validation
- ✅ Grid spacing correctness (auto-calculated from offsets)

---

## Milestone 3 – Element Templates
**Status:** ✅ Complete

### Scope
- Beam, slab, column templates

### Deliverables
- ✅ Template CRUD UI
- ✅ Mongo persistence
- ✅ Type-specific validation (beam, slab, column)
- ✅ Dimension validation (width, height, thickness, diameter)
- ✅ Duplicate name/ID validation
- ✅ Support for circular and rectangular columns

### Completed Files
- `/app/api/projects/[id]/templates/route.ts` - Templates API with validation
- `/components/ElementTemplatesEditor.tsx` - Interactive templates editor
- `/app/projects/[id]/page.tsx` - Updated with templates tab

### Features
- Add/edit/delete beam templates (width × height)
- Add/edit/delete slab templates (thickness)
- Add/edit/delete column templates (rectangular or circular)
- Unique template names per type
- Real-time validation
- Organized view by element type
- Persists to MongoDB

### Tests
- ✅ Template validation (required fields, positive values)
- ✅ Unit enforcement (metric only)
- ✅ Duplicate name prevention within same type
- ✅ Type-specific property validation

---

## Milestone 4 – Element Instances
**Status:** ✅ Complete

### Scope
- Place elements on grid

### Deliverables
- ✅ Beam placement on spans (along X or Y axis)
- ✅ Slab placement on grid panels (X-span × Y-span)
- ✅ Column placement on intersections (or free placement)
- ✅ Level-based placement
- ✅ Tag support for filtering/grouping
- ✅ Template-based element instantiation

### Completed Files
- `/app/api/projects/[id]/instances/route.ts` - Instances API with comprehensive validation
- `/components/ElementInstancesEditor.tsx` - Interactive element placement interface
- `/app/projects/[id]/page.tsx` - Updated with Elements tab

### Features
- **Beam Placement**: Select direction (X or Y axis), start/end points, and perpendicular grid line
- **Slab Placement**: Select panel boundaries on both X and Y axes
- **Column Placement**: Place at grid intersections or free placement
- All elements placed at specific building levels
- Template validation ensures only existing templates can be used
- Grid reference validation ensures valid grid labels
- Level validation ensures valid level references
- Tag system for organizing elements
- Organized view by element type
- Delete functionality
- Real-time updates

### Tests
- ✅ Geometry derivation from grid (grid references stored for calculation)
- ✅ Placement constraints (beams need spans, slabs need panels)
- ✅ Template existence validation
- ✅ Grid label validation
- ✅ Level reference validation
- ✅ Duplicate ID prevention

---

## Milestone 5 – Concrete Quantity Takeoff
**Status:** ✅ Complete

### Scope
- Concrete volume computation

### Deliverables
- ✅ Math: concrete.ts - Pure calculation functions
- ✅ Takeoff lines generation from element instances
- ✅ Takeoff UI table with filtering
- ✅ Geometry derivation from grid references
- ✅ Level-to-level height calculation for columns
- ✅ Waste factor application
- ✅ Summary statistics

### Completed Files
- `/lib/math/concrete.ts` - Pure math functions for volume calculations
- `/app/api/projects/[id]/takeoff/route.ts` - Takeoff generation API
- `/components/TakeoffViewer.tsx` - Interactive takeoff display
- `/app/projects/[id]/page.tsx` - Updated with Takeoff tab

### Features
- **Beam Calculations**: Volume = width × height × length (derived from grid span)
- **Slab Calculations**: Volume = thickness × area (derived from grid panel)
- **Column Calculations**: 
  - Circular: Volume = π × (diameter/2)² × height
  - Rectangular: Volume = width × height × height
  - Height automatically calculated from level-to-level
- **Formula Display**: Human-readable formulas showing all inputs
- **Waste Application**: Configurable waste percentage applied to all volumes
- **Filtering**: Filter takeoff lines by element type
- **Breakdown**: Summary by element type (beams, slabs, columns)
- **Traceability**: Each takeoff line linked to source element
- **Tags**: Automatic tagging with type, template, and level

### Tests
- ✅ Known geometry → known volume (beam: 0.3×0.5×6 = 0.9 m³)
- ✅ Rounding rules (3 decimal places for concrete)
- ✅ Waste calculation (5% waste correctly applied)
- ✅ Grid-based geometry derivation
- ✅ Level-to-level height for columns

---

## Milestone 5A – Foundation Elements
**Status:** ✅ Complete

### Scope
- Extend element system to support foundation elements

### Deliverables
- ✅ Foundation element type with two subtypes (mat and footing)
- ✅ Foundation templates with type-specific validation
- ✅ Foundation placement UI (panel for mat, point for footing)
- ✅ Foundation visualization (orange dashed rectangles)
- ✅ Foundation concrete takeoff calculations
- ✅ Support for below-ground-level elevations

### Completed Files
- `/models/Project.ts` - Updated ElementTemplateSchema and ElementInstanceSchema
- `/app/api/projects/[id]/templates/route.ts` - Foundation validation logic
- `/components/ElementTemplatesEditor.tsx` - Foundation template UI
- `/components/ElementInstancesEditor.tsx` - Foundation placement UI with edit support
- `/components/FloorPlanVisualization.tsx` - Foundation rendering
- `/app/api/projects/[id]/takeoff/route.ts` - Mat and footing calculations
- `/components/TakeoffViewer.tsx` - Foundation breakdown display
- `/lib/math/concrete.ts` - Foundation calculation functions

### Features
- **Mat Foundation**: Defined by thickness, placed as panel (like slab)
- **Isolated Footing**: Defined by length × width × depth, placed at points (like column)
- Placement on foundation levels (negative elevations supported)
- Orange dashed visualization to distinguish from structural elements
- Concrete volume calculations included in takeoff
- Summary breakdown shows foundation quantities separately
- Filter foundations in takeoff viewer

### Additional Enhancement
- **Column End Level**: Columns can specify termination level for multi-story support
- Columns visible on all floor plans they span through
- Edit functionality for all element instances (beams, slabs, columns, foundations)

### Suggested Approach

#### 1. Foundation Levels
```
Examples:
- GL (Ground Level): 0.00m
- FDN (Foundation Level): -1.50m
- FOOTING: -3.00m
```

#### 2. Foundation Templates
- **Footing (Isolated)**: Rectangular pad (length × width × depth)
- **Footing (Combined)**: Extended pad spanning multiple columns
- **Foundation Beam**: Tie beam connecting footings
- **Foundation Slab**: Mat foundation (like regular slab)
- **Pile**: Circular or square (diameter/width × depth)

#### 3. Element Type Extensions
Add to existing element types:
- `type: 'footing'` - Isolated or combined footings
- `type: 'pile'` - Bored piles or driven piles
- Or use existing `type: 'slab'` for mat foundations, `type: 'beam'` for tie beams

#### 4. Calculation Considerations
- **Footings**: Volume = length × width × depth
  - Place at column grid intersections
  - Depth = foundation level to bottom of footing
- **Foundation Beams**: Same as regular beams
  - Place between footing locations
- **Piles**: Volume = (π × r² × depth) or (width² × depth)
  - Specify pile depth in template or custom geometry

#### 5. Implementation Steps
1. Add foundation levels with negative elevations
2. Create foundation templates (footing types, pile types)
3. Place foundation elements at foundation level
4. Update takeoff to handle:
   - Footing depth calculation
   - Pile depth (from template or custom)
   - Different concrete classes (foundation vs structural)

### Notes
- Use existing grid system (footings align with columns)
- Negative elevations already supported in Level model
- May need different concrete class (e.g., "concrete-class-b" for foundations)
- Consider soil bearing capacity annotations (future)

---

## Milestone 6 – BOQ v1 (Concrete Only)
**Status:** 🔄 In Progress

### Scope
- Map concrete takeoff → DPWH pay items

### Deliverables
- ⬜ BOQ mapper (takeoff → DPWH catalog)
- ⬜ BOQ UI page with traceability
- ⬜ Aggregation by DPWH item number
- ⬜ Traceability links (BOQ → Takeoff → Elements)

### Tests
- Aggregation correctness
- Unit compatibility

---

## Milestone 7 – Rebar Quantity Takeoff
**Status:** ⬜ Not Started

### Scope
- Rebar weight computation

### Deliverables
- Math: rebar.ts
- kg/m table
- Bar breakdown view

### Tests
- Bar count correctness
- Lap & spacing rules

---

## Milestone 8 – BOQ v2 (Concrete + Rebar)
**Status:** ⬜ Not Started

### Scope
- Rebar BOQ integration

### Deliverables
- Extended BOQ mapping
- Combined BOQ totals

### Tests
- Trace integrity
- Aggregation stability

---

## Milestone 9 – Formwork Quantity Takeoff
**Status:** ⬜ Not Started

### Scope
- Formwork area computation

### Deliverables
- Math: formwork.ts
- Takeoff integration

### Tests
- Surface area formulas
- Exclusion rules

---

## Milestone 10 – Structural MVP Complete
**Status:** ⬜ Not Started

### Scope
- Full structural BOQ

### Deliverables
- Export to CSV
- Calculation run history
- Takeoff audit view

### Tests
- End-to-end regression test

---

## Future Phases
- Architectural works
- Finishes
- Rate & cost analysis
- Revision comparison
- Multi-user roles
