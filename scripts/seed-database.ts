/**
 * Database Seeding Script
 * Seeds the database with test data for functionality verification
 * 
 * Usage: npx tsx scripts/seed-database.ts
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/building-estimate';

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB\n');

    const db = client.db();

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await db.collection('projects').deleteMany({});
    await db.collection('calcruns').deleteMany({});
    console.log('✓ Cleared existing data\n');

    // Seed Projects
    console.log('📦 Seeding projects...');
    const testProjects = [
      {
        name: 'Two-Story Residential Building',
        description: 'Standard residential building with complete DPWH specifications',
        createdAt: new Date(),
        updatedAt: new Date(),
        gridX: [
          { label: 'A', position: 0 },
          { label: 'B', position: 5000 },
          { label: 'C', position: 10000 },
        ],
        gridY: [
          { label: '1', position: 0 },
          { label: '2', position: 6000 },
          { label: '3', position: 12000 },
        ],
        levels: [
          { name: 'Ground Floor', elevation: 0, height: 3000 },
          { name: 'Second Floor', elevation: 3000, height: 3000 },
          { name: 'Roof', elevation: 6000, height: 0 },
        ],
        elements: [],
        spaces: [],
      },
      {
        name: 'Single-Story Office Building',
        description: 'Commercial office building with open floor plan',
        createdAt: new Date(),
        updatedAt: new Date(),
        gridX: [
          { label: 'A', position: 0 },
          { label: 'B', position: 8000 },
        ],
        gridY: [
          { label: '1', position: 0 },
          { label: '2', position: 8000 },
        ],
        levels: [
          { name: 'Ground Floor', elevation: 0, height: 3500 },
          { name: 'Roof', elevation: 3500, height: 0 },
        ],
        elements: [],
        spaces: [],
      },
      {
        name: 'Small Residential House',
        description: 'Single-story residential house for testing finishes',
        createdAt: new Date(),
        updatedAt: new Date(),
        gridX: [
          { label: 'A', position: 0 },
          { label: 'B', position: 6000 },
        ],
        gridY: [
          { label: '1', position: 0 },
          { label: '2', position: 8000 },
        ],
        levels: [
          { name: 'Ground Floor', elevation: 0, height: 3000 },
          { name: 'Roof', elevation: 3000, height: 0 },
        ],
        elements: [],
        spaces: [],
      },
    ];

    const projectResults = await db.collection('projects').insertMany(testProjects);
    const projectIds = Object.values(projectResults.insertedIds);
    console.log(`✓ Created ${projectIds.length} test projects\n`);

    // Seed Spaces for first project
    console.log('🏠 Seeding spaces...');
    const projectId = projectIds[0];
    
    await db.collection('projects').updateOne(
      { _id: projectId },
      {
        $set: {
          spaces: [
            {
              id: 'space-1',
              name: 'Living Room',
              floor: 'Ground Floor',
              length: 6.0,
              width: 5.0,
              height: 3.0,
              perimeter: 22.0,
              floorArea: 30.0,
              ceilingArea: 30.0,
              wallArea: 66.0,
            },
            {
              id: 'space-2',
              name: 'Kitchen',
              floor: 'Ground Floor',
              length: 4.0,
              width: 4.0,
              height: 3.0,
              perimeter: 16.0,
              floorArea: 16.0,
              ceilingArea: 16.0,
              wallArea: 48.0,
            },
            {
              id: 'space-3',
              name: 'Master Bedroom',
              floor: 'Second Floor',
              length: 5.0,
              width: 4.0,
              height: 3.0,
              perimeter: 18.0,
              floorArea: 20.0,
              ceilingArea: 20.0,
              wallArea: 54.0,
            },
            {
              id: 'space-4',
              name: 'Bathroom',
              floor: 'Ground Floor',
              length: 3.0,
              width: 2.5,
              height: 3.0,
              perimeter: 11.0,
              floorArea: 7.5,
              ceilingArea: 7.5,
              wallArea: 33.0,
            },
          ],
        },
      }
    );
    console.log('✓ Created 4 test spaces\n');

    // Seed Elements (Concrete) for first project
    console.log('🏗️  Seeding structural elements...');
    const sampleElements = [
      {
        id: 'col-1',
        type: 'column',
        name: 'Column C1',
        template: 'C400x400',
        gridPosition: { x: 'A', y: '1' },
        bottomLevel: 'Ground Floor',
        topLevel: 'Second Floor',
        dimensions: { width: 400, depth: 400, height: 3000 },
        reinforcement: {
          longitudinal: { barSize: 16, quantity: 8 },
          ties: { barSize: 10, spacing: 150 },
        },
      },
      {
        id: 'beam-1',
        type: 'beam',
        name: 'Beam B1',
        template: 'B300x500',
        startGrid: { x: 'A', y: '1' },
        endGrid: { x: 'B', y: '1' },
        level: 'Ground Floor',
        dimensions: { width: 300, height: 500, length: 5000 },
        reinforcement: {
          top: { barSize: 16, quantity: 4 },
          bottom: { barSize: 16, quantity: 4 },
          stirrups: { barSize: 10, spacing: 200 },
        },
      },
      {
        id: 'slab-1',
        type: 'slab',
        name: 'Floor Slab S1',
        template: 'Slab-150',
        level: 'Ground Floor',
        area: 60.0,
        thickness: 150,
        reinforcement: {
          main: { barSize: 12, spacing: 200 },
          distribution: { barSize: 10, spacing: 300 },
        },
      },
    ];

    await db.collection('projects').updateOne(
      { _id: projectId },
      { $set: { elements: sampleElements } }
    );
    console.log('✓ Created 3 structural elements\n');

    // Seed Schedule Items (Part C - Earthworks)
    console.log('⛏️  Seeding earthworks schedule items...');
    const scheduleItemsToInsert = [
      {
        projectId: projectId.toString(),
        category: 'earthworks-clearing',
        itemNo: '800 (1)',
        description: 'Clearing and Grubbing',
        unit: 'm²',
        quantity: 120.0,
        location: '0+000 to 0+060',
        remarks: 'Site preparation area',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        projectId: projectId.toString(),
        category: 'earthworks-removal-trees',
        itemNo: '800 (3) a1',
        description: 'Individual Removal of Trees 150 - 300 mm dia',
        unit: 'Each',
        quantity: 5,
        location: '0+000 to 0+060',
        remarks: '5 trees within construction area',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        projectId: projectId.toString(),
        category: 'earthworks-excavation',
        itemNo: '801 (1)',
        description: 'Common Excavation',
        unit: 'm³',
        quantity: 85.5,
        location: 'Building footprint',
        remarks: 'Foundation excavation',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        projectId: projectId.toString(),
        category: 'earthworks-structure-excavation',
        itemNo: '801 (2) a',
        description: 'Structure Excavation (Common Material)',
        unit: 'm³',
        quantity: 42.0,
        location: 'Column footings',
        remarks: 'Footing excavation 1.5m depth',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Check if schedule-items collection exists, if not create it
    const collections = await db.listCollections({ name: 'schedule-items' }).toArray();
    if (collections.length === 0) {
      await db.createCollection('schedule-items');
    }
    
    await db.collection('schedule-items').insertMany(scheduleItemsToInsert);
    console.log(`✓ Created ${scheduleItemsToInsert.length} earthworks schedule items\n`);

    // Display seeded data summary
    console.log('📊 Seeding Summary:');
    console.log('==================');
    console.log(`Projects: ${projectIds.length}`);
    console.log('  - Two-Story Residential Building (with spaces & elements)');
    console.log('  - Single-Story Office Building');
    console.log('  - Small Residential House');
    console.log(`\nSpaces: 4`);
    console.log('  - Living Room (Ground Floor)');
    console.log('  - Kitchen (Ground Floor)');
    console.log('  - Master Bedroom (Second Floor)');
    console.log('  - Bathroom (Ground Floor)');
    console.log(`\nStructural Elements: 3`);
    console.log('  - Column C1 (400x400)');
    console.log('  - Beam B1 (300x500)');
    console.log('  - Floor Slab S1 (150mm)');
    console.log(`\nSchedule Items: ${scheduleItemsToInsert.length}`);
    console.log('  - Clearing and Grubbing');
    console.log('  - Tree Removal');
    console.log('  - Common Excavation');
    console.log('  - Structure Excavation');
    
    console.log('\n✅ Database seeding completed successfully!\n');
    console.log('🔗 Test Project ID:', projectId.toString());
    console.log('🌐 You can access it at: http://localhost:3000/projects/' + projectId.toString());
    console.log('\n📝 To test the application:');
    console.log('   1. Start the dev server: npm run dev');
    console.log('   2. Navigate to Projects page');
    console.log('   3. Open "Two-Story Residential Building"');
    console.log('   4. Test all DPWH Parts (C, D, E, F, G)');
    console.log('   5. Verify navigation, data display, and calculations\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await client.close();
    console.log('✓ Database connection closed\n');
  }
}

// Run the seeding script
seedDatabase()
  .then(() => {
    console.log('✨ Seeding process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding process failed:', error);
    process.exit(1);
  });
