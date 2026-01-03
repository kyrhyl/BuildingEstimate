# Database Seeding Guide

## Overview
Database seeding scripts for testing and development. These scripts populate the database with realistic test data to verify functionality.

## Prerequisites
- MongoDB running locally or connection string in `.env.local`
- Development environment set up

## Quick Start

### Seed the Database
```bash
npm run db:seed
```

This will create:
- **3 Test Projects**
  - Two-Story Residential Building (fully configured)
  - Single-Story Office Building
  - Small Residential House

- **4 Spaces** (in first project)
  - Living Room (Ground Floor) - 6m x 5m x 3m
  - Kitchen (Ground Floor) - 4m x 4m x 3m
  - Master Bedroom (Second Floor) - 5m x 4m x 3m
  - Bathroom (Ground Floor) - 3m x 2.5m x 3m

- **3 Structural Elements** (in first project)
  - Column C1 (400x400mm)
  - Beam B1 (300x500mm, 5m long)
  - Floor Slab S1 (150mm thick, 60m²)

- **4 Earthworks Schedule Items** (Part C)
  - Clearing and Grubbing (120 m²)
  - Tree Removal (5 trees)
  - Common Excavation (85.5 m³)
  - Structure Excavation (42 m³)

### Clear the Database
```bash
npm run db:clear
```

Removes all data from all collections (except system collections).

## Testing Workflow

1. **Seed the database:**
   ```bash
   npm run db:seed
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Access the test project:**
   - Navigate to http://localhost:3000/projects
   - Open "Two-Story Residential Building"
   - The Project ID will be displayed in the console after seeding

4. **Test all features:**
   - **Part C - Earthworks:** Verify schedule items display
   - **Part D - Concrete:** Check grid, levels, elements
   - **Part E - Finishes:** Verify spaces, wall surfaces, finishes
   - **Part F - Electrical:** Check "Coming Soon" message
   - **Part G - Mechanical:** Check "Coming Soon" message
   - **Reports:** Test Takeoff Summary and BOQ

5. **Verify calculations:**
   - Go to "Calc History" tab in Part D
   - Trigger a calculation
   - Verify takeoff quantities
   - Check BOQ aggregation

6. **Test navigation:**
   - Switch between Parts and Reports
   - Navigate through sub-tabs
   - Verify state persistence (refresh page)
   - Test horizontal scrolling on small screens

## What Gets Tested

### ✅ Part C - Earthworks
- Schedule items display
- Category filtering
- Add/Edit/Delete functionality
- Quantity calculations

### ✅ Part D - Concrete & Reinforcement
- Grid system (3x3 grid)
- Levels (Ground, Second Floor, Roof)
- Element templates
- Element instances (Column, Beam, Slab)
- Concrete volume calculations
- Rebar quantities
- Formwork areas

### ✅ Part E - Finishing Works
- Spaces management (4 rooms)
- Floor/Wall/Ceiling area calculations
- Wall surface assignments
- Finish type assignments
- Roofing (when roof design added)
- Schedules (doors, windows)

### ✅ Global Features
- Project creation/editing
- Navigation state management
- localStorage persistence
- API response handling
- Error states
- Loading states

## Manual Testing Checklist

After seeding, verify:

- [ ] Projects list displays correctly
- [ ] Project detail page loads
- [ ] All navigation tabs are accessible
- [ ] Grid visualization works
- [ ] Levels editor functional
- [ ] Elements can be created/edited
- [ ] Spaces display with correct calculations
- [ ] Schedule items load and filter correctly
- [ ] Calculations produce takeoff lines
- [ ] BOQ aggregates all items
- [ ] No console errors
- [ ] Data persists after page refresh

## Troubleshooting

### Connection Issues
```bash
# Check if MongoDB is running
# Windows:
services.msc
# Look for MongoDB service

# Check connection string in .env.local
MONGODB_URI=mongodb://localhost:27017/building-estimate
```

### Permission Errors
Make sure your MongoDB user has write permissions to the database.

### Seed Script Fails
1. Ensure MongoDB is running
2. Check `.env.local` has correct `MONGODB_URI`
3. Verify no conflicting data exists (run `npm run db:clear` first)

### Data Not Showing in UI
1. Check browser console for errors
2. Verify API endpoints are working
3. Check network tab in DevTools
4. Ensure dev server is running (`npm run dev`)

## Development Tips

- **Reset and re-seed frequently** during development
- **Modify seed data** in `scripts/seed-database.ts` for specific tests
- **Use Project ID** from console output for direct navigation
- **Check calculations** by comparing UI values with seed data

## Advanced Usage

### Custom Seed Data
Edit `scripts/seed-database.ts` to add:
- More projects
- Additional spaces
- More structural elements
- Different schedule items
- Custom quantities

### Production Seeding
**⚠️ WARNING:** These scripts will delete existing data!
Only use in development/test environments.

For production:
1. Create separate seed scripts
2. Use migration tools
3. Implement data validation
4. Add rollback capability

## Related Files
- `scripts/seed-database.ts` - Main seeding script
- `scripts/clear-database.ts` - Database cleanup script
- `lib/mongodb.ts` - Database connection
- `models/Project.ts` - Project schema

## Next Steps

After verifying basic functionality:
1. Add more complex test scenarios
2. Create edge case test data
3. Implement automated E2E tests
4. Set up CI/CD test database
