# DPWH Pay Item Catalog Update

## Overview
The DPWH catalog has been updated using the standardized DPWH_PAY_ITEM.csv file located in the `docs` folder. This provides a unified reference for all DPWH pay items used throughout the application.

## Source Data
- **File**: `docs/DPWH_PAY_ITEM.csv`
- **Total Items**: 1,324 pay items
- **Structure**: Division → Part → Item Group → Pay Item

## Catalog Structure
The updated catalog (`data/dpwh-catalog.json`) includes:

### Item Properties
Each item contains:
- `itemNumber`: Pay item number (e.g., "800 (1)", "900 (1)a")
- `description`: Full description of the pay item
- `unit`: Unit of measurement (e.g., "Square Meter", "Cubic Meter", "Kilogram")
- `category`: High-level category (19 total)
- `trade`: Specific trade classification (86 total)
- `division`: DPWH Division (e.g., "DIVISION I - GENERAL", "DIVISION II - BUILDING")
- `part`: DPWH Part (e.g., "PART C", "PART D", "PART E")
- `itemGroup`: Item group description (e.g., "ITEM 800 - CLEARING AND GRUBBING")

## Categories (19 Total)

### By Item Count
1. **Electrical** (380 items)
   - Conduits and Boxes, Wiring and Cables, Power Distribution, Lighting, Data and Communications, CCTV, Audio Systems, Access Control, Grounding, Nurse Call, Miscellaneous

2. **Plumbing** (180 items)
   - Drainage and Sewerage, Water Supply

3. **Foundation** (145 items)
   - Ground Improvement, Piling Works

4. **Doors and Windows** (99 items)
   - Steel Windows/Doors, Aluminum Windows/Doors, Wooden, Jalousie, Roll-up, Stainless Steel, PVC, Folding Doors, Glass and Glazing

5. **Finishes** (82 items)
   - Ceilings and Partitions, Tile Works, Wood/Vinyl/Carpet Flooring, Cement Finish, Stucco, Granolithic, Plaster, Adobe, Acoustical, Painting, Aluminum Cladding, Metal Lath

6. **General** (66 items)
   - Uncategorized items

7. **Specialty Items** (64 items)
   - Polycarbonate Panels, Insulation, FRP Works, Railings, GFRC Cladding, Flood Protection, Seismic Protection, Base Isolation, Tensile Structures

8. **Administrative** (57 items)
   - Project Administration, Permits and Clearances

9. **Mechanical** (45 items)
   - HVAC, Water Pumping, Vertical Transportation, Dumbwaiter, Medical Gas System, Heating, Boiler

10. **Site Preparation** (44 items)
    - Clearing and Grubbing, Demolition

11. **Concrete Works** (37 items)
    - Structural Concrete, Lean Concrete, Reinforcement, Formwork, Precast

12. **Earthworks** (32 items)
    - Excavation, Structure Excavation, Embankment

13. **Fire Protection** (22 items)
    - Fireproofing, Fire Sprinkler System, Fire Alarm System

14. **Site Development** (18 items)
    - Landscaping

15. **Roofing** (18 items)
    - Metal Roofing, Clay Tiles, Concrete Tiles, Asphalt Shingles, Roof Drainage

16. **Structural Steel** (17 items)
    - Light Gauge Metal, Metal Structures

17. **Masonry** (8 items)
    - Masonry Works

18. **Waterproofing** (7 items)
    - Waterproofing, Dampproofing

19. **Marine Construction** (3 items)
    - Dredging, Reclamation

## Top Trades by Item Count

1. Wiring and Cables - 172 items
2. Piling Works - 138 items
3. Water Supply - 136 items
4. Conduits and Boxes - 75 items
5. Glass and Glazing - 53 items
6. Drainage and Sewerage - 44 items
7. Grounding System - 38 items
8. Demolition - 32 items
9. Power Distribution - 25 items
10. Data and Communications - 23 items

## Usage in Application

### Dropdown References
The catalog provides uniform reference data for:
- Pay item selection in BOQ (Bill of Quantities)
- Item categorization in schedules
- Trade-based filtering and grouping
- Unit standardization across the application

### API Integration
The catalog is used by:
- `/api/catalog` route for fetching available pay items
- Project calculation modules for quantity takeoff
- Schedule generators for organizing items by trade
- BOQ viewers for displaying items with proper categorization

## Maintenance

### Updating the Catalog
To update the catalog with new data:

```bash
# After updating docs/DPWH_PAY_ITEM.csv
node scripts/update-catalog-from-csv.js
```

### Verifying the Catalog
To verify the catalog structure:

```bash
node scripts/verify-catalog.js
```

### Script Location
- **Update Script**: `scripts/update-catalog-from-csv.js`
- **Verification Script**: `scripts/verify-catalog.js`
- **Analysis Script**: `scripts/analyze-catalog.js`

## Data Integrity

### Validation Rules
- All items must have: itemNumber, description, unit, category, trade
- Item numbers follow DPWH standard format
- Units are standardized (Square Meter, Cubic Meter, Linear Meter, Kilogram, Each, Set, Piece, Lump Sum, etc.)
- Categories and trades are predefined and consistent

### Quality Assurance
- Total items verified: 1,324
- All divisions covered: DIVISION I (GENERAL) and DIVISION II (BUILDING)
- All parts included: PART C (Site Works), PART D (Concrete), PART E (Building Systems)
- Item code range: 800-1208 plus administrative items

## Future Enhancements

1. **Price Integration**: Add unit prices from DPWH Blue Book
2. **Specifications**: Link to detailed specifications for each item
3. **Related Items**: Cross-reference related pay items
4. **Historical Data**: Track price changes over time
5. **Regional Variants**: Support for regional variations in specifications

## Notes

- The catalog uses the standardized DPWH item numbering system
- Character encoding is handled for special characters in the CSV
- Categories and trades can be extended by modifying the conversion script
- The catalog serves as the single source of truth for DPWH pay items in the application
