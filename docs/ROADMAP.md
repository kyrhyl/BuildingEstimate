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
**Status:** ✅ Complete

### Scope
- Map concrete takeoff → DPWH pay items
- Persist calculation runs for history/audit

### Deliverables
- ✅ BOQ mapper (takeoff → DPWH catalog)
- ✅ BOQ UI page with traceability
- ✅ Aggregation by DPWH item number
- ✅ Traceability links (BOQ → Takeoff → Elements)
- ✅ Template-level DPWH item selection
- ✅ CalcRun persistence model
- ✅ Auto-save takeoff and BOQ calculations
- ✅ Load latest calculations on page mount

### Completed Files
- `/models/CalcRun.ts` - Calculation run schema with takeoff/BOQ persistence
- `/app/api/projects/[id]/boq/route.ts` - BOQ generation and CalcRun update
- `/app/api/projects/[id]/calcruns/route.ts` - CalcRun list/create API
- `/app/api/projects/[id]/calcruns/latest/route.ts` - Latest calculation retrieval
- `/components/BOQViewer.tsx` - Interactive BOQ display with source traceability
- `/app/projects/[id]/page.tsx` - Updated with BOQ tab
- `/app/api/projects/[id]/takeoff/route.ts` - Updated to auto-save CalcRun

### Features
- **Template-Level DPWH Mapping**: Each template assigned specific DPWH item (e.g., "900 (1) c")
- **Proper BOQ Aggregation**: One line per DPWH item (not split by element type)
- **Source Traceability**: Expandable BOQ lines show all source takeoff lines with formulas
- **Element Counts**: BOQ shows breakdown (e.g., "4 beam, 6 column, 1 foundation")
- **CalcRun Persistence**: Calculations saved to database, no regeneration needed
- **Auto-Load**: Latest calculations loaded automatically on page mount
- **Timestamp Display**: Shows "Last calculated" and "Last generated" timestamps
- **Smart Buttons**: "Generate" vs "Recalculate" based on existing data
- **DPWH Item Display**: Templates show assigned pay item in blue text

### Tests
- ✅ Aggregation correctness (groups by DPWH item only)
- ✅ Unit compatibility (all concrete in m³)
- ✅ Traceability integrity (BOQ → Takeoff → Elements)
- ✅ CalcRun persistence and retrieval
- ✅ Template DPWH item assignment and update

### Notes
- Default DPWH item: "900 (1) a" - Structural Concrete 3000 psi Class A 7 days
- Warnings shown for templates without DPWH items assigned
- CalcRun includes status, errors, timestamp for full audit trail

---

## Milestone 7 – Rebar Quantity Takeoff
**Status:** ✅ Complete

### Scope
- Calculate reinforcing steel weight for beams, slabs, columns, foundations
- Automatic DPWH grade classification based on bar diameter
- Template-level rebar configuration
- Separate rebar takeoff lines with traceability

### Deliverables
- ✅ Rebar math library with Philippine standards
- ✅ Automatic grade classification (Grade 40/60/80)
- ✅ DPWH rebar item auto-selection
- ✅ Template editor with comprehensive rebar configuration UI
- ✅ Rebar calculations for all element types (beams, slabs, columns)
- ✅ Enhanced takeoff viewer with rebar display and filtering
- ✅ Summary totals for both concrete and rebar

### Completed Files
- `/lib/math/rebar.ts` - Complete rebar calculation library
  - REBAR_WEIGHT_TABLE: kg/m for diameters 10-40mm
  - getRebarGrade(diameter): Auto-classifies as 40/60/80
  - getDPWHRebarItem(diameter, epoxCoated): Auto-selects DPWH item
  - calculateBarWeight(): Core calculation with lap and waste
  - calculateBeamMainBars(), calculateBeamStirrupsWeight()
  - calculateSlabMainBars() for both directions
  - calculateColumnMainBars(), calculateColumnTiesWeight()
  - calculateBarCount(), calculateLapLength()

- `/types/index.ts` - Updated with RebarConfig interface
  - mainBars: {count, diameter}
  - stirrups: {diameter, spacing}
  - secondaryBars: {diameter, spacing}
  - dpwhRebarItem: Optional DPWH item override

- `/models/Project.ts` - Schema updated with rebar fields
  - ElementTemplateSchema includes all rebar configuration
  - Backward compatible with existing templates

- `/components/ElementTemplatesEditor.tsx` - Comprehensive rebar UI
  - Main bars: count + diameter dropdown (all element types)
  - Stirrups/ties: diameter + spacing (beams, columns)
  - Secondary bars: diameter + spacing (slabs only)
  - DPWH rebar item auto-populated with manual override
  - Shows grade info: "Auto-selected: 902 (1) a2 (Grade 60)"
  - Template cards display rebar config in green text

- `/app/api/projects/[id]/takeoff/route.ts` - Rebar calculations integrated
  - **Beams**: Main bars (with lap) + stirrups (perimeter calculation)
  - **Slabs**: Main bars (primary direction) + secondary bars (perpendicular)
  - **Columns**: Main bars (column height) + ties (lateral reinforcement)
  - Each rebar line: trade:'Rebar', quantity in kg, DPWH item
  - Summary includes totalRebar field

- `/components/TakeoffViewer.tsx` - Enhanced with rebar display
  - Summary shows both concrete (m³) and rebar (kg)
  - Rebar total in orange color
  - Dual filter system: Trade (All/Concrete/Rebar) + Element type
  - Auto-loads latest CalcRun

- `/app/api/projects/[id]/boq/route.ts` - BOQ generation for both trades
  - Processes both concrete and rebar takeoff lines
  - Groups rebar by DPWH item from takeoff assumptions
  - Separate aggregation for concrete (m³) and rebar (kg)
  - Summary includes both trades

- `/components/BOQViewer.tsx` - Enhanced BOQ display
  - Summary shows both concrete and rebar totals
  - Visual distinction: Blue for concrete, Orange for rebar
  - Trade badges on BOQ items
  - Quantity formatting: 3 decimals for m³, 2 decimals for kg
  - Element and rebar type breakdowns in source traceability

### Features
- **Automatic Grade Classification**:
  - Grade 40: ≤12mm (10mm, 12mm) → DPWH "902 (1) a1"
  - Grade 60: 16-36mm → DPWH "902 (1) a2"
  - Grade 80: ≥40mm → DPWH "902 (1) a3"
  - Epoxy-coated variants: "902 (2) ax"

- **Rebar Calculations**:
  - Standard kg/m weights for all diameters
  - Lap length: 40Ø (40 times bar diameter)
  - Waste factor: 3% default
  - Element-specific formulas for beams, slabs, columns
  - Proper perimeter calculations for stirrups/ties

- **Template Configuration**:
  - Per-element rebar specification
  - Auto-populate DPWH item on diameter selection
  - Manual override capability
  - Visual feedback with grade information

- **Takeoff Integration**:
  - Separate lines for concrete and rebar
  - Each element generates 1 concrete + 1-2 rebar lines
  - Proper trade tagging: 'Concrete' vs 'Rebar'
  - Rebar type tags: 'rebar:main', 'rebar:stirrups', 'rebar:ties', 'rebar:secondary'
  - DPWH item included in assumptions and tags

- **Viewer Enhancements**:
  - Summary grid shows both concrete and rebar totals
  - Trade filtering: All/Concrete Only/Rebar Only
  - Element filtering: All/Beams/Slabs/Columns/Foundations
  - Color coding: Blue for concrete, Orange for rebar

- **BOQ Integration**:
  - BOQ processes both concrete and rebar trades
  - Aggregates by DPWH item number (902 series for rebar)
  - Extracts DPWH item from takeoff line assumptions
  - Summary displays separate totals for each trade
  - Visual distinction with trade badges and color coding
  - Proper unit formatting: m³ vs kg

### Technical Notes
- Philippine DPWH standards for rebar classification
- Bar diameters: 10, 12, 16, 20, 25, 28, 32, 36, 40mm
- All calculations in metric units (kg, meters)
- Backward compatible - templates without rebar config still work
- DPWH items embedded in takeoff assumptions for BOQ traceability

### Tests Completed
- ✅ Grade classification correctness
- ✅ DPWH item auto-selection
- ✅ Rebar calculation integration
- ✅ Takeoff and BOQ generation
- ✅ TypeScript type safety

---

## Milestone 8 – BOQ v2 (Concrete + Rebar + Formwork)
**Status:** ✅ Complete

### Scope
- Multi-trade BOQ integration (Concrete, Rebar, Formwork)
- Combined BOQ with proper aggregation

### Deliverables
- ✅ Extended BOQ mapping for all trades
- ✅ Combined BOQ totals with trade breakdown
- ✅ Proper aggregation by DPWH item across all trades
- ✅ Trade filtering and display
- ✅ Thousand separators for number clarity

### Completed Integration
- BOQ processes Concrete (900 series), Rebar (902 series), and Formwork (903 series)
- Trade-specific color coding: Blue (Concrete), Orange (Rebar), Purple (Formwork)
- Summary displays all three trade totals
- Proper unit formatting: m³ (concrete/formwork), kg (rebar)
- Source traceability maintained across all trades

### Tests
- ✅ Trace integrity across all trades
- ✅ Aggregation stability with multiple trades
- ✅ Trade-specific DPWH item mapping
- ✅ Number formatting with locale support

---

## Milestone 9 – Formwork Quantity Takeoff
**Status:** ✅ Complete

### Scope
- Formwork area computation for all structural elements
- BOQ integration for formwork trade

### Deliverables
- ✅ Math library: `/lib/math/formwork.ts` with 6 calculation functions
- ✅ Takeoff integration in `/app/api/projects/[id]/takeoff/route.ts`
- ✅ BOQ integration in `/app/api/projects/[id]/boq/route.ts`
- ✅ UI updates in TakeoffViewer and BOQViewer
- ✅ Summary calculations include totalFormwork
- ✅ Trade filter supports "Formwork Only" option

### Completed Files
- `/lib/math/formwork.ts` - Formwork calculation library
  - `calculateBeamFormwork(width, height, length)` - bottom + 2 sides
  - `calculateSlabFormwork(area)` - soffit only
  - `calculateRectangularColumnFormwork(width, height, columnHeight)` - 4 sides
  - `calculateCircularColumnFormwork(diameter, columnHeight)` - cylindrical surface
  - `calculateMatFormwork(width, length, thickness)` - perimeter edges
  - `calculateFootingFormwork(length, width, depth)` - all 4 sides
- `/app/api/projects/[id]/takeoff/route.ts` - Added formwork for all element types
- `/app/api/projects/[id]/boq/route.ts` - Added formwork processing
- `/components/TakeoffViewer.tsx` - Added formwork summary and filter
- `/components/BOQViewer.tsx` - Added formwork display and badges

### Features
- Formwork calculations for beams, slabs, columns, mat foundations, and footings
- Contact area formulas account for surfaces requiring formwork
- Excludes surfaces in contact with soil (e.g., mat/footing bottoms)
- DPWH item 903 series mapping in BOQ
- Purple color scheme for formwork (blue=concrete, orange=rebar, purple=formwork)
- Separate trade totals in summary displays
- Formwork filtering in takeoff viewer
- Area reported in m² with 2 decimal precision

### Tests
- ✅ Surface area formulas validated
- ✅ Proper exclusion of soil-contact surfaces
- ✅ BOQ aggregation includes formwork
- ✅ End-to-end workflow (takeoff → BOQ → display)

### Notes
- Formwork quantities are based on contact surface areas requiring temporary support
- Mat foundations: only perimeter edges (bottom on soil)
- Footings: all 4 vertical sides (bottom on soil)
- Slabs: soffit only (bottom surface)
- Beams: bottom + 2 vertical sides (top slab bears on beam)
- Columns: all sides (rectangular) or cylindrical surface (circular)
- Ready for Milestone 10 (Structural MVP Complete)

---

## Milestone 10 – Structural MVP Complete
**Status:** ✅ Complete

### Scope
- Complete structural estimation system with full audit trail
- Export capabilities for data portability
- Historical tracking of calculations

### Deliverables
- ✅ CSV export for BOQ (with trade breakdown and element counts)
- ✅ CSV export for Takeoff (detailed line items with formulas)
- ✅ Calculation run history viewer
- ✅ Historical tracking with timestamps and status
- ✅ Full audit trail from BOQ → Takeoff → Elements

### Completed Files
- `/components/BOQViewer.tsx` - Added CSV export functionality
- `/components/TakeoffViewer.tsx` - Added CSV export functionality
- `/components/CalcRunHistory.tsx` - New history viewer component
- `/app/projects/[id]/page.tsx` - Added History tab

### Features
- **PDF Export (Professional Reports)**:
  - **Takeoff Report**: Summary tables, detailed breakdown by trade, formulas with calculations
  - **BOQ Report**: DPWH-compliant format, trade-specific sections, complete source traceability
  - Multi-page layout with headers, footers, and page numbers
  - Trade color coding: Blue (Concrete), Orange (Rebar), Purple (Formwork)
  - Detailed source traceability section showing all calculation origins
  - Professional formatting suitable for project documentation
  - Automatic filename with project ID and date
  
- **Calculation History**:
  - Chronological list of all calculation runs
  - Summary statistics for each run (concrete, rebar, formwork totals)
  - Status indicators (completed, error, warnings)
  - Expandable details for warnings/errors
  - Formatted timestamps with locale support
  - Run ID tracking for full traceability

- **Audit Trail**:
  - Every calculation saved with unique run ID
  - Timestamps for all operations
  - Source traceability: BOQ → Takeoff → Element Instances
  - Error and warning tracking
  - Number formatting with thousand separators

### Tests
- ✅ End-to-end workflow: Elements → Takeoff → BOQ → Export
- ✅ CSV file generation and download
- ✅ CalcRun persistence and retrieval
- ✅ History display with proper formatting
- ✅ Complete audit trail verification

### Notes
- Structural MVP is now feature-complete
- Full concrete, rebar, and formwork estimation
- DPWH Volume III compliance (1,511 pay items)
- Export-ready for external analysis
- Ready for production use on structural projects

---

## Future Phases
- Architectural works
- Finishes
- Rate & cost analysis
- Revision comparison
- Multi-user roles
