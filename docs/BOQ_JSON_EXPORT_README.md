# BOQ JSON Export Feature

## Summary

This feature allows you to export Bill of Quantities (BOQ) data as JSON files that can be used as input for other web applications or data processing tools.

## What Was Implemented

### 1. Export API Endpoint
**File:** `app/api/projects/[id]/boq/export/route.ts`

A new API endpoint that provides three export formats:

- **Standard Format**: Balanced export with BOQ items, categories, and summary data
- **Detailed Format**: Complete export including project settings, takeoff data, and full traceability
- **Minimal Format**: Lightweight export with only essential BOQ item information

### 2. UI Integration
**File:** `components/BOQViewer.tsx`

Added a "Export JSON" dropdown button in the BOQ Viewer with three format options. The button appears next to the existing "Export PDF Report" button.

### 3. Documentation
**File:** `docs/BOQ_JSON_EXPORT.md`

Comprehensive documentation covering:
- All export formats with detailed schemas
- API usage examples
- Integration examples for external applications
- Data structure reference
- Best practices

### 4. Sample Data
**File:** `docs/boq-export-sample.json`

Example JSON file showing the structure of exported BOQ data.

### 5. Tests
**File:** `app/api/projects/[id]/boq/export/route.test.ts`

Unit tests covering:
- All three export formats
- Error handling (project not found, no BOQ data)
- Content headers verification
- Category grouping
- Specific calc run export

## How to Use

### From the UI
1. Navigate to a project's BOQ tab
2. Generate a BOQ (if not already done)
3. Click the "Export JSON" button
4. Select format:
   - **Standard Format** - Recommended for most integrations
   - **Detailed Format** - Includes full traceability and project context
   - **Minimal Format** - Simplest format with just items and quantities
5. File will download automatically

### Via API
```javascript
// Export latest BOQ (standard format)
fetch('/api/projects/{projectId}/boq/export')

// Export with specific format
fetch('/api/projects/{projectId}/boq/export?format=detailed')

// Export specific calculation run
fetch('/api/projects/{projectId}/boq/export?runId={calcRunId}&format=standard')
```

## JSON Structure Example

### Standard Format
```json
{
  "metadata": {
    "projectId": "...",
    "projectName": "...",
    "exportDate": "2026-01-08T...",
    "calcRunId": "...",
    "status": "completed"
  },
  "summary": {
    "totalConcrete": 45.678,
    "totalRebar": 3245.67,
    "totalFormwork": 234.56
  },
  "boq": {
    "totalLines": 12,
    "categories": {
      "Concrete": { ... },
      "Rebar": { ... },
      "Formwork": { ... }
    },
    "lines": [
      {
        "id": "boq-1",
        "itemNumber": "900 (1) a",
        "description": "Structural Concrete, Class A",
        "unit": "Cubic Meter",
        "quantity": 28.450,
        "tags": ["category:Concrete", "type:beam"]
      }
    ]
  }
}
```

## Integration Use Cases

1. **Cost Estimation Systems**: Import BOQ items with quantities to calculate total project costs
2. **Project Management Tools**: Track material requirements and procurement
3. **Reporting Systems**: Generate custom reports and analytics
4. **Data Warehousing**: Archive BOQ data for historical analysis
5. **Third-party Applications**: Any system that needs structured construction quantity data

## Benefits

✅ **Standardized Format**: JSON structure follows industry best practices  
✅ **Full Traceability**: Links BOQ items back to source takeoff data  
✅ **DPWH Compliance**: Maintains DPWH Volume III item numbering and descriptions  
✅ **Flexible Options**: Three formats to match different integration needs  
✅ **Easy Integration**: Simple REST API with JSON response  
✅ **Complete Metadata**: Includes project info, timestamps, and calculation status  

## Next Steps

To integrate with another web application:

1. Review the documentation in `docs/BOQ_JSON_EXPORT.md`
2. Test with the sample file in `docs/boq-export-sample.json`
3. Use the API endpoint to fetch real BOQ data
4. Parse the JSON and map to your application's data model
5. Implement error handling for incomplete or failed calculations

## Technical Notes

- Export uses the latest completed `CalcRun` by default
- File naming: `BOQ_{projectName}_{runId}.json`
- Response includes proper download headers
- All quantities maintain precision from calculation (2-3 decimal places)
- Tags provide rich metadata for filtering and categorization
