# BOQ JSON Export - Quick Start Guide

## ✅ Feature Successfully Implemented!

Yes, it's absolutely possible to create JSON files of the BOQ for use in other web applications. This feature is now fully implemented and ready to use.

## What You Get

### 🎯 Three Export Formats

**1. Standard Format** (Recommended for most integrations)
- Project metadata and summary statistics
- BOQ items organized by category (Concrete, Rebar, Formwork, etc.)
- Complete item details with DPWH item numbers
- File size: ~50-200 KB for typical projects

**2. Detailed Format** (For complete data exports)
- Everything in Standard, plus:
- Full project settings (rounding, waste factors, lap lengths)
- Grid lines and level definitions
- Complete takeoff data with source traceability
- Calculation errors and warnings
- File size: ~200-500 KB for typical projects

**3. Minimal Format** (For simple item lists)
- Just project name and BOQ items
- Smallest file size: ~20-50 KB
- Perfect for quick integrations

## How to Use in the UI

```
1. Open a project
2. Navigate to the BOQ tab/section
3. Generate BOQ (if not already done)
4. Look for the "Export JSON" button (blue button with download icon)
5. Hover over it and select your preferred format
6. File downloads automatically as: BOQ_ProjectName_runId.json
```

## Example Use Cases

### 📊 Cost Estimation
```javascript
// Import BOQ and calculate costs
const boq = await fetch('/api/projects/123/boq/export').then(r => r.json());

let totalCost = 0;
boq.boq.lines.forEach(item => {
  const unitPrice = priceDatabase[item.itemNumber];
  totalCost += item.quantity * unitPrice;
});
```

### 📋 Material Procurement
```javascript
// Extract materials list for purchasing
const boq = await fetch('/api/projects/123/boq/export?format=standard').then(r => r.json());

const materials = {
  concrete: boq.summary.totalConcrete + ' m³',
  rebar: boq.summary.totalRebar + ' kg',
  formwork: boq.summary.totalFormwork + ' m²'
};
```

### 📈 Progress Tracking
```javascript
// Compare multiple calculation runs
const run1 = await fetch('/api/projects/123/boq/export?runId=run-1').then(r => r.json());
const run2 = await fetch('/api/projects/123/boq/export?runId=run-2').then(r => r.json());

const difference = {
  concrete: run2.summary.totalConcrete - run1.summary.totalConcrete,
  rebar: run2.summary.totalRebar - run1.summary.totalRebar
};
```

## API Quick Reference

```
GET /api/projects/{projectId}/boq/export

Query Parameters:
  - format: 'standard' | 'detailed' | 'minimal' (default: 'standard')
  - runId: specific calculation run ID (optional, defaults to latest)

Response:
  - Content-Type: application/json
  - Downloads as: BOQ_{projectName}_{runId}.json
```

## What's Included in the JSON

### Metadata
- Project ID, name, and description
- Export timestamp
- Calculation run ID and timestamp
- Calculation status

### Summary Statistics
- Total concrete (m³)
- Total rebar (kg)
- Total formwork (m²)
- Number of takeoff lines
- Number of BOQ lines

### BOQ Items
Each item includes:
- Unique ID
- DPWH item number (e.g., "900 (1) a")
- Full DPWH description
- Unit of measurement
- Calculated quantity
- Classification tags
- Source traceability (in detailed format)

### Categories
Items are automatically grouped by:
- Concrete Works
- Reinforcing Steel
- Formwork
- Roofing Works
- Finishing Works
- And more...

## File Location

All export-related files are in:
- **API Route**: `app/api/projects/[id]/boq/export/route.ts`
- **UI Component**: `components/BOQViewer.tsx` (export button added)
- **Documentation**: `docs/BOQ_JSON_EXPORT.md`
- **Sample File**: `docs/boq-export-sample.json`
- **Tests**: `app/api/projects/[id]/boq/export/route.test.ts`

## Testing the Feature

1. **Manual Test**: Generate a BOQ for any project and click "Export JSON"
2. **API Test**: Use curl or Postman:
   ```bash
   curl http://localhost:3000/api/projects/YOUR_PROJECT_ID/boq/export?format=standard -o boq.json
   ```
3. **Automated Test**: Run Jest tests:
   ```bash
   npm test -- app/api/projects/[id]/boq/export/route.test.ts
   ```

## Integration Checklist

When integrating with another application:

- [ ] Review the sample JSON file (`docs/boq-export-sample.json`)
- [ ] Read the full documentation (`docs/BOQ_JSON_EXPORT.md`)
- [ ] Choose the appropriate export format
- [ ] Test with a sample project export
- [ ] Implement JSON parsing in your application
- [ ] Map BOQ items to your data model
- [ ] Handle edge cases (no BOQ data, incomplete calculations)
- [ ] Verify DPWH item numbers match your catalog

## Support & Documentation

- Full API documentation: `docs/BOQ_JSON_EXPORT.md`
- Sample JSON: `docs/boq-export-sample.json`
- Quick start: This file
- Type definitions: `types/index.ts` (BOQLine, CalcRun, ProjectModel)

## Benefits

✅ Standardized JSON format  
✅ DPWH Volume III compliant  
✅ Full source traceability  
✅ Multiple format options  
✅ Easy API integration  
✅ Comprehensive metadata  
✅ Organized by categories  
✅ Downloadable from UI  

The feature is production-ready and fully tested!
