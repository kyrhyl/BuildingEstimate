const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, '..', 'data', 'dpwh-catalog.json');
const cat = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

console.log('=== Sample Items by Category ===\n');

const categories = ['Electrical', 'Plumbing', 'Doors and Windows', 'Finishes', 'Mechanical', 'Concrete Works', 'Earthworks'];

categories.forEach(category => {
  const items = cat.items.filter(i => i.category === category).slice(0, 3);
  console.log(`${category}:`);
  items.forEach(i => console.log(`  ${i.itemNumber} - ${i.description.substring(0, 60)}`));
  console.log('');
});

console.log(`\nTotal categories: ${new Set(cat.items.map(i => i.category)).size}`);
console.log(`Total trades: ${new Set(cat.items.map(i => i.trade)).size}`);
