const fs = require('fs');
const path = require('path');

// Read the CSV file
const csvPath = path.join(__dirname, '..', 'docs', 'DPWH_PAY_ITEM.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV
const lines = csvContent.split('\n');

// Skip header row and process data
const items = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  // Handle multi-line descriptions in CSV
  let row = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }
  row.push(currentField.trim());
  
  if (row.length >= 6) {
    const [division, part, itemGroup, payItem, description, unit] = row;
    
    // Determine category and trade based on item group
    let category = 'General';
    let trade = 'General Works';
    
    // Extract first number from item group for easier matching
    const match = itemGroup.match(/(\d+)/);
    const itemCode = match ? match[1] : '';
    
    // Categorize based on item code
    if (payItem.startsWith('B.')) {
      category = 'Administrative';
      trade = 'Project Administration';
    } else if (itemCode === '800') {
      category = 'Site Preparation';
      trade = 'Clearing and Grubbing';
    } else if (itemCode === '801') {
      category = 'Site Preparation';
      trade = 'Demolition';
    } else if (itemCode === '802') {
      category = 'Earthworks';
      trade = 'Excavation';
    } else if (itemCode === '803') {
      category = 'Earthworks';
      trade = 'Structure Excavation';
    } else if (itemCode === '804') {
      category = 'Earthworks';
      trade = 'Embankment';
    } else if (itemCode === '805') {
      category = 'Marine Construction';
      trade = 'Dredging';
    } else if (itemCode === '806') {
      category = 'Marine Construction';
      trade = 'Reclamation';
    } else if (itemCode === '807') {
      category = 'Site Development';
      trade = 'Landscaping';
    } else if (itemCode === '808') {
      category = 'Foundation';
      trade = 'Ground Improvement';
    } else if (itemCode === '900') {
      category = 'Concrete Works';
      trade = 'Structural Concrete';
    } else if (itemCode === '901') {
      category = 'Concrete Works';
      trade = 'Lean Concrete';
    } else if (itemCode === '902') {
      category = 'Concrete Works';
      trade = 'Reinforcement';
    } else if (itemCode === '903') {
      category = 'Concrete Works';
      trade = 'Formwork';
    } else if (itemCode === '904') {
      category = 'Concrete Works';
      trade = 'Precast';
    } else if (itemCode === '1000') {
      category = 'Site Treatment';
      trade = 'Pest Control';
    } else if (itemCode === '1001') {
      category = 'Plumbing';
      trade = 'Drainage and Sewerage';
    } else if (itemCode === '1002') {
      category = 'Plumbing';
      trade = 'Water Supply';
    } else if (itemCode === '1003') {
      category = 'Finishes';
      trade = 'Ceilings and Partitions';
    } else if (itemCode === '1004') {
      category = 'Roofing';
      trade = 'Metal Roofing';
    } else if (itemCode === '1005') {
      category = 'Doors and Windows';
      trade = 'Steel Windows';
    } else if (itemCode === '1006') {
      category = 'Doors and Windows';
      trade = 'Steel Doors';
    } else if (itemCode === '1007') {
      category = 'Doors and Windows';
      trade = 'Aluminum Doors';
    } else if (itemCode === '1008') {
      category = 'Doors and Windows';
      trade = 'Aluminum Windows';
    } else if (itemCode === '1009') {
      category = 'Doors and Windows';
      trade = 'Jalousie Windows';
    } else if (itemCode === '1010') {
      category = 'Doors and Windows';
      trade = 'Wooden Doors and Windows';
    } else if (itemCode === '1011') {
      category = 'Doors and Windows';
      trade = 'Roll-up Doors';
    } else if (itemCode === '1012') {
      category = 'Doors and Windows';
      trade = 'Glass and Glazing';
    } else if (itemCode === '1014') {
      category = 'Roofing';
      trade = 'Metal Roofing Sheets';
    } else if (itemCode === '1015') {
      category = 'Roofing';
      trade = 'Clay Tiles';
    } else if (itemCode === '1016') {
      category = 'Waterproofing';
      trade = 'Waterproofing';
    } else if (itemCode === '1017') {
      category = 'Roofing';
      trade = 'Roof Drainage';
    } else if (itemCode === '1018') {
      category = 'Finishes';
      trade = 'Tile Works';
    } else if (itemCode === '1019') {
      category = 'Finishes';
      trade = 'Wood Flooring';
    } else if (itemCode === '1020') {
      category = 'Finishes';
      trade = 'Vinyl Flooring';
    } else if (itemCode === '1021') {
      category = 'Finishes';
      trade = 'Cement Finish';
    } else if (itemCode === '1022') {
      category = 'Finishes';
      trade = 'Stucco Finish';
    } else if (itemCode === '1023') {
      category = 'Finishes';
      trade = 'Granolithic Works';
    } else if (itemCode === '1024') {
      category = 'Finishes';
      trade = 'Pea Gravel Finish';
    } else if (itemCode === '1026') {
      category = 'Finishes';
      trade = 'Pebble Finish';
    } else if (itemCode === '1027') {
      category = 'Finishes';
      trade = 'Plaster Finish';
    } else if (itemCode === '1028') {
      category = 'Finishes';
      trade = 'Adobe Finish';
    } else if (itemCode === '1030') {
      category = 'Finishes';
      trade = 'Acoustical Ceiling';
    } else if (itemCode === '1031') {
      category = 'Finishes';
      trade = 'Acoustical Treatment';
    } else if (itemCode === '1032') {
      category = 'Finishes';
      trade = 'Painting Works';
    } else if (itemCode === '1034') {
      category = 'Waterproofing';
      trade = 'Dampproofing';
    } else if (itemCode === '1035') {
      category = 'Structural Steel';
      trade = 'Light Gauge Metal';
    } else if (itemCode === '1036') {
      category = 'Specialty Items';
      trade = 'Polycarbonate Panels';
    } else if (itemCode === '1037') {
      category = 'Roofing';
      trade = 'Concrete Tiles';
    } else if (itemCode === '1038') {
      category = 'Specialty Items';
      trade = 'Insulation';
    } else if (itemCode === '1039') {
      category = 'Finishes';
      trade = 'Aluminum Cladding';
    } else if (itemCode === '1040') {
      category = 'Finishes';
      trade = 'Metal Lath';
    } else if (itemCode === '1042') {
      category = 'Doors and Windows';
      trade = 'Stainless Steel Doors';
    } else if (itemCode === '1043') {
      category = 'Doors and Windows';
      trade = 'PVC Doors';
    } else if (itemCode === '1044') {
      category = 'Doors and Windows';
      trade = 'Folding Doors';
    } else if (itemCode === '1046') {
      category = 'Masonry';
      trade = 'Masonry Works';
    } else if (itemCode === '1047') {
      category = 'Structural Steel';
      trade = 'Metal Structures';
    } else if (itemCode === '1048') {
      category = 'Specialty Items';
      trade = 'FRP Works';
    } else if (itemCode === '1051') {
      category = 'Specialty Items';
      trade = 'Railings';
    } else if (itemCode === '1052') {
      category = 'Foundation';
      trade = 'Piling Works';
    } else if (itemCode === '1053') {
      category = 'Finishes';
      trade = 'Carpet Flooring';
    } else if (itemCode === '1054') {
      category = 'Specialty Items';
      trade = 'GFRC Cladding';
    } else if (itemCode === '1055') {
      category = 'Fire Protection';
      trade = 'Fireproofing';
    } else if (itemCode === '1056') {
      category = 'Roofing';
      trade = 'Asphalt Shingles';
    } else if (itemCode === '1058') {
      category = 'Specialty Items';
      trade = 'Flood Protection';
    } else if (itemCode === '1059') {
      category = 'Specialty Items';
      trade = 'Seismic Protection';
    } else if (itemCode === '1060') {
      category = 'Specialty Items';
      trade = 'Base Isolation';
    } else if (itemCode === '1061') {
      category = 'Specialty Items';
      trade = 'Tensile Structures';
    } else if (itemCode === '1100') {
      category = 'Electrical';
      trade = 'Conduits and Boxes';
    } else if (itemCode === '1101') {
      category = 'Electrical';
      trade = 'Wiring and Cables';
    } else if (itemCode === '1102') {
      category = 'Electrical';
      trade = 'Power Distribution';
    } else if (itemCode === '1103') {
      category = 'Electrical';
      trade = 'Lighting';
    } else if (itemCode === '1104') {
      category = 'Electrical';
      trade = 'Auxiliary Systems';
    } else if (itemCode === '1105') {
      category = 'Electrical';
      trade = 'Data and Communications';
    } else if (itemCode === '1106') {
      category = 'Electrical';
      trade = 'CCTV Systems';
    } else if (itemCode === '1107') {
      category = 'Electrical';
      trade = 'Audio Systems';
    } else if (itemCode === '1108') {
      category = 'Electrical';
      trade = 'Access Control';
    } else if (itemCode === '1109') {
      category = 'Electrical';
      trade = 'Grounding System';
    } else if (itemCode === '1110') {
      category = 'Electrical';
      trade = 'Nurse Call System';
    } else if (itemCode === '1111') {
      category = 'Electrical';
      trade = 'Miscellaneous Electrical';
    } else if (itemCode === '1200') {
      category = 'Mechanical';
      trade = 'HVAC';
    } else if (itemCode === '1201') {
      category = 'Mechanical';
      trade = 'Water Pumping';
    } else if (itemCode === '1202') {
      category = 'Fire Protection';
      trade = 'Fire Sprinkler System';
    } else if (itemCode === '1203') {
      category = 'Mechanical';
      trade = 'Vertical Transportation';
    } else if (itemCode === '1204') {
      category = 'Mechanical';
      trade = 'Dumbwaiter';
    } else if (itemCode === '1205') {
      category = 'Mechanical';
      trade = 'Medical Gas System';
    } else if (itemCode === '1206') {
      category = 'Mechanical';
      trade = 'Heating';
    } else if (itemCode === '1207') {
      category = 'Mechanical';
      trade = 'Boiler';
    } else if (itemCode === '1208') {
      category = 'Fire Protection';
      trade = 'Fire Alarm System';
    }
    
    // Clean up description
    let cleanDescription = description.trim();
    // Remove empty parentheses
    cleanDescription = cleanDescription.replace(/\(\s*\)/g, '');
    // Normalize spacing inside parentheses: (   text   ) -> (text)
    cleanDescription = cleanDescription.replace(/\(\s+([^)]+?)\s*\)/g, '($1)');
    cleanDescription = cleanDescription.trim();
    
    items.push({
      itemNumber: payItem.trim(),
      description: cleanDescription,
      unit: unit.trim(),
      category: category,
      trade: trade,
      division: division.trim(),
      part: part.trim(),
      itemGroup: itemGroup.trim()
    });
  }
}

// Create the catalog object
const catalog = {
  version: 'DPWH Standard Specifications - Unified Reference',
  source: 'DPWH_PAY_ITEM.csv',
  generatedAt: new Date().toISOString(),
  totalItems: items.length,
  items: items
};

// Write to file
const outputPath = path.join(__dirname, '..', 'data', 'dpwh-catalog.json');
fs.writeFileSync(outputPath, JSON.stringify(catalog, null, 2));

console.log(`✅ Catalog updated successfully!`);
console.log(`   Total items: ${items.length}`);
console.log(`   Output: ${outputPath}`);

// Generate summary by category
const categoryCount = {};
items.forEach(item => {
  categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
});

console.log('\n📊 Items by Category:');
Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
  console.log(`   ${cat}: ${count} items`);
});

// Summary by trade
const tradeCount = {};
items.forEach(item => {
  tradeCount[item.trade] = (tradeCount[item.trade] || 0) + 1;
});

console.log('\n📋 Items by Trade (top 20):');
Object.entries(tradeCount).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([trade, count]) => {
  console.log(`   ${trade}: ${count} items`);
});
