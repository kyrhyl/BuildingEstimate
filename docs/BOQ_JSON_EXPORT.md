# BOQ JSON Export Documentation

## Overview

The Building Estimate application provides comprehensive BOQ (Bill of Quantities) export functionality in JSON format, designed to integrate seamlessly with other web applications and data processing tools.

## Export Formats

Three export formats are available to suit different use cases:

### 1. Standard Format (Recommended)
**Use Case:** General-purpose integration with other applications

**Endpoint:** `/api/projects/[id]/boq/export?format=standard`

**Structure:**
```json
{
  "metadata": {
    "projectId": "string",
    "projectName": "string",
    "projectDescription": "string",
    "exportDate": "ISO 8601 timestamp",
    "calcRunId": "string",
    "calcRunTimestamp": "ISO 8601 timestamp",
    "status": "completed"
  },
  "summary": {
    "totalConcrete": 0.0,
    "totalRebar": 0.0,
    "totalFormwork": 0.0,
    "takeoffLineCount": 0,
    "boqLineCount": 0
  },
  "boq": {
    "totalLines": 0,
    "categories": {
      "Concrete": {
        "count": 0,
        "totalQuantity": 0.0,
        "items": [...]
      },
      "Rebar": {...},
      "Formwork": {...}
    },
    "lines": [
      {
        "id": "unique-line-id",
        "itemNumber": "900 (1) a",
        "description": "Structural Concrete, Class A",
        "unit": "Cubic Meter",
        "quantity": 123.456,
        "tags": ["category:Concrete", "dpwh:900 (1) a", "type:beam"]
      }
    ]
  }
}
```

### 2. Detailed Format
**Use Case:** Complete data export with full traceability and project context

**Endpoint:** `/api/projects/[id]/boq/export?format=detailed`

**Additional Data Included:**
- Project settings (rounding, waste factors, lap lengths)
- Grid lines and levels
- Complete takeoff line data with source traceability
- Calculation errors and warnings

**Structure:**
```json
{
  "metadata": {
    "projectId": "string",
    "projectName": "string",
    "projectDescription": "string",
    "exportDate": "ISO 8601 timestamp",
    "calcRunId": "string",
    "calcRunTimestamp": "ISO 8601 timestamp",
    "status": "completed",
    "exportFormat": "detailed",
    "exportVersion": "1.0.0"
  },
  "project": {
    "settings": {
      "rounding": {
        "concrete": 3,
        "rebar": 2,
        "formwork": 3
      },
      "waste": {
        "concrete": 0.05,
        "rebar": 0.03,
        "formwork": 0.02
      },
      "lap": {
        "defaultLapLength": 0.6,
        "minLapLength": 0.3,
        "maxLapLength": 1.2
      },
      "units": "metric"
    },
    "gridX": [...],
    "gridY": [...],
    "levels": [...]
  },
  "summary": {...},
  "boq": {
    "totalLines": 0,
    "categories": {...},
    "lines": [
      {
        "id": "unique-line-id",
        "itemNumber": "900 (1) a",
        "description": "Structural Concrete, Class A",
        "unit": "Cubic Meter",
        "quantity": 123.456,
        "sourceTakeoffLineIds": ["takeoff-1", "takeoff-2"],
        "tags": ["category:Concrete", "dpwh:900 (1) a", "type:beam"]
      }
    ]
  },
  "takeoffLines": [
    {
      "id": "takeoff-1",
      "elementId": "beam-1",
      "trade": "Concrete",
      "description": "Beam B1",
      "quantity": 1.5,
      "unit": "m³",
      "tags": ["type:beam", "level:2F"]
    }
  ],
  "errors": []
}
```

### 3. Minimal Format
**Use Case:** Lightweight integration, simple item lists

**Endpoint:** `/api/projects/[id]/boq/export?format=minimal`

**Structure:**
```json
{
  "project": "Project Name",
  "date": "ISO 8601 timestamp",
  "items": [
    {
      "item": "900 (1) a",
      "description": "Structural Concrete, Class A",
      "unit": "Cubic Meter",
      "quantity": 123.456
    }
  ]
}
```

## API Usage

### Export Specific Calculation Run
```
GET /api/projects/{projectId}/boq/export?runId={calcRunId}&format={format}
```

### Export Latest Calculation
```
GET /api/projects/{projectId}/boq/export?format={format}
```

**Parameters:**
- `projectId` (required): Project identifier
- `runId` (optional): Specific calculation run ID to export
- `format` (optional): Export format - `standard` (default), `detailed`, or `minimal`

**Response Headers:**
```
Content-Type: application/json
Content-Disposition: attachment; filename="BOQ_{projectName}_{runId}.json"
```

## Integration Examples

### Example 1: Import into Cost Estimation System
```javascript
// Fetch BOQ data
const response = await fetch('/api/projects/123/boq/export?format=standard');
const boqData = await response.json();

// Process items for cost estimation
boqData.boq.lines.forEach(item => {
  const unitPrice = getPriceFromCatalog(item.itemNumber);
  const totalCost = item.quantity * unitPrice;
  
  console.log({
    item: item.itemNumber,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: unitPrice,
    totalCost: totalCost
  });
});
```

### Example 2: Generate Custom Report
```javascript
const response = await fetch('/api/projects/123/boq/export?format=detailed');
const boqData = await response.json();

// Group by DPWH Part
const byPart = {};
boqData.boq.lines.forEach(item => {
  const partTag = item.tags.find(tag => tag.startsWith('dpwh:'));
  // Extract part from DPWH item number
  const part = determineDPWHPart(item.itemNumber);
  
  if (!byPart[part]) byPart[part] = [];
  byPart[part].push(item);
});

// Generate report sections
Object.entries(byPart).forEach(([part, items]) => {
  console.log(`\n${part}`);
  console.log('='.repeat(50));
  items.forEach(item => {
    console.log(`${item.itemNumber}: ${item.quantity} ${item.unit}`);
  });
});
```

### Example 3: Data Validation
```javascript
const response = await fetch('/api/projects/123/boq/export?format=detailed');
const boqData = await response.json();

// Validate quantities
const errors = [];
boqData.boq.lines.forEach(item => {
  if (item.quantity <= 0) {
    errors.push(`Invalid quantity for ${item.itemNumber}: ${item.quantity}`);
  }
  
  if (!item.sourceTakeoffLineIds || item.sourceTakeoffLineIds.length === 0) {
    errors.push(`No source traceability for ${item.itemNumber}`);
  }
});

if (errors.length > 0) {
  console.error('Validation errors:', errors);
}
```

## Data Structure Reference

### BOQ Line Object
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for the BOQ line |
| `itemNumber` | string | DPWH item number (e.g., "900 (1) a") |
| `description` | string | Full DPWH item description |
| `unit` | string | Unit of measurement (Cubic Meter, Kilogram, etc.) |
| `quantity` | number | Calculated quantity |
| `sourceTakeoffLineIds` | string[] | Array of takeoff line IDs that contributed to this BOQ line |
| `tags` | string[] | Classification tags (category, type, level, etc.) |

### Tags Format
Tags follow the pattern `{type}:{value}`:
- `category:Concrete` - Work category
- `dpwh:900 (1) a` - DPWH item number
- `type:beam` - Element type
- `level:2F` - Level reference
- `part:PART D` - DPWH Part classification

### Summary Object
| Field | Type | Description |
|-------|------|-------------|
| `totalConcrete` | number | Total concrete volume (m³) |
| `totalRebar` | number | Total reinforcement weight (kg) |
| `totalFormwork` | number | Total formwork area (m²) |
| `takeoffLineCount` | number | Number of takeoff lines processed |
| `boqLineCount` | number | Number of BOQ lines generated |

## Best Practices

### 1. Always Check Metadata
Verify the calculation status and timestamp before processing:
```javascript
if (boqData.metadata.status !== 'completed') {
  throw new Error('BOQ calculation incomplete');
}
```

### 2. Handle Categories
Categories organize BOQ items by trade:
```javascript
const concreteItems = boqData.boq.categories.Concrete?.items || [];
const rebarItems = boqData.boq.categories.Rebar?.items || [];
```

### 3. Preserve Traceability
Use `sourceTakeoffLineIds` to maintain audit trail:
```javascript
const traceability = {};
boqData.boq.lines.forEach(boqLine => {
  const sources = boqLine.sourceTakeoffLineIds.map(id => 
    boqData.takeoffLines?.find(tl => tl.id === id)
  ).filter(Boolean);
  
  traceability[boqLine.id] = sources;
});
```

### 4. Error Handling
Always check for calculation errors:
```javascript
if (boqData.errors && boqData.errors.length > 0) {
  console.warn('BOQ calculation had errors:', boqData.errors);
}
```

## Version History

- **1.0.0** (January 2026) - Initial release
  - Three export formats (standard, detailed, minimal)
  - DPWH Volume III compliance
  - Full traceability support

## Support

For integration assistance or questions about the JSON export format, refer to:
- API documentation: `/docs/API.md`
- DPWH catalog reference: `/docs/DPWH_PAY_ITEM.csv`
- Database schema: `/docs/DATABASE_SEEDING.md`
