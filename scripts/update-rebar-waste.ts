/**
 * Script to update rebar waste to 0% for all existing projects
 * Run with: npm run dev (in another terminal) then run this script
 * Or manually update MONGODB_URI below
 */

import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  console.log('Please make sure .env.local exists with MONGODB_URI defined');
  process.exit(1);
}

async function updateRebarWaste() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    
    console.log('Updating rebar waste to 0% for all projects...');
    
    const result = await mongoose.connection.db.collection('projects').updateMany(
      {},
      { $set: { 'settings.waste.rebar': 0 } }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} project(s)`);
    console.log('Rebar waste is now set to 0% (no waste)');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating projects:', error);
    process.exit(1);
  }
}

updateRebarWaste();
