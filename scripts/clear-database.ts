/**
 * Database Clear Script
 * Clears all data from the database
 * 
 * Usage: npx tsx scripts/clear-database.ts
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/building-estimate';

async function clearDatabase() {
  console.log('🗑️  Starting database cleanup...\n');

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB\n');

    const db = client.db();

    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections\n`);

    // Clear each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      if (collectionName.startsWith('system.')) {
        console.log(`⏭️  Skipping system collection: ${collectionName}`);
        continue;
      }

      const result = await db.collection(collectionName).deleteMany({});
      console.log(`✓ Cleared ${collectionName}: ${result.deletedCount} documents deleted`);
    }

    console.log('\n✅ Database cleanup completed successfully!\n');

  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  } finally {
    await client.close();
    console.log('✓ Database connection closed\n');
  }
}

// Run the clearing script
clearDatabase()
  .then(() => {
    console.log('✨ Cleanup process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup process failed:', error);
    process.exit(1);
  });
