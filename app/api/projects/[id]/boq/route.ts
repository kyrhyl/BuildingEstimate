import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';
import CalcRun from '@/models/CalcRun';
import dpwhCatalog from '@/data/dpwh-catalog.json';
import type { TakeoffLine, BOQLine, DPWHCatalogItem } from '@/types';

// POST /api/projects/:id/boq - Generate BOQ from takeoff lines
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { takeoffLines, runId } = body as { takeoffLines: TakeoffLine[]; runId?: string };

    if (!Array.isArray(takeoffLines)) {
      return NextResponse.json(
        { error: 'takeoffLines must be an array' },
        { status: 400 }
      );
    }

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Process concrete, rebar, formwork, finishes, roofing, and schedule items
    const concreteTakeoffLines = takeoffLines.filter(
      line => line.trade === 'Concrete'
    );
    const rebarTakeoffLines = takeoffLines.filter(
      line => line.trade === 'Rebar'
    );
    const formworkTakeoffLines = takeoffLines.filter(
      line => line.trade === 'Formwork'
    );
    const finishesTakeoffLines = takeoffLines.filter(
      line => line.trade === 'Finishes'
    );
    const roofingTakeoffLines = takeoffLines.filter(
      line => line.trade === 'Roofing'
    );
    const scheduleItemsTakeoffLines = takeoffLines.filter(
      line => line.trade !== 'Concrete' && line.trade !== 'Rebar' && 
              line.trade !== 'Formwork' && line.trade !== 'Finishes' && line.trade !== 'Roofing'
    );

    if (concreteTakeoffLines.length === 0 && rebarTakeoffLines.length === 0 && formworkTakeoffLines.length === 0 && 
        finishesTakeoffLines.length === 0 && roofingTakeoffLines.length === 0 && scheduleItemsTakeoffLines.length === 0) {
      return NextResponse.json({
        boqLines: [],
        summary: {
          totalLines: 0,
          trades: {},
        },
        warnings: ['No takeoff lines to process'],
      });
    }

    // Get catalog items
    const catalog = dpwhCatalog as { items: DPWHCatalogItem[] };
    const concreteCatalogItems = catalog.items.filter(
      item => item.trade === 'Concrete'
    );
    const rebarCatalogItems = catalog.items.filter(
      item => item.trade === 'Rebar'
    );
    const formworkCatalogItems = catalog.items.filter(
      item => item.trade === 'Formwork'
    );

    const errors: string[] = [];
    const warnings: string[] = [];

    const defaultConcreteItem = concreteCatalogItems.find(
      item => item.itemNumber === '900 (1) a' // Structural Concrete, Class A, 3000 psi, 7 days
    );
    const defaultRebarItem = rebarCatalogItems.find(
      item => item.itemNumber === '902 (1) a2' // Grade 60 deformed bars
    );
    const defaultFormworkItem = formworkCatalogItems.find(
      item => item.itemNumber === '903 (1)' // Formwork for Concrete Structures
    );

    if (!defaultConcreteItem) {
      return NextResponse.json(
        { error: 'Default concrete item not found in DPWH catalog' },
        { status: 500 }
      );
    }
    if (!defaultRebarItem) {
      return NextResponse.json(
        { error: 'Default rebar item not found in DPWH catalog' },
        { status: 500 }
      );
    }
    if (!defaultFormworkItem) {
      warnings.push('Default formwork item not found in DPWH catalog - formwork will be skipped');
    }

    // Group takeoff lines by DPWH item number only
    // Each DPWH item becomes one BOQ line, aggregating all elements using that item
    const groupedByItem: Record<string, TakeoffLine[]> = {};
    
    for (const line of concreteTakeoffLines) {
      const templateTag = line.tags.find(tag => tag.startsWith('template:'));
      const templateId = project.elementTemplates?.find(t => 
        t.name === templateTag?.replace('template:', '')
      )?.id;
      
      // Get template to find its DPWH item
      const template = templateId 
        ? project.elementTemplates?.find(t => t.id === templateId)
        : null;
      
      const dpwhItemNumber = template?.dpwhItemNumber || defaultConcreteItem.itemNumber;
      
      // Track templates without DPWH item
      if (!template?.dpwhItemNumber) {
        if (!warnings.includes(`Template "${template?.name || 'Unknown'}" has no DPWH item assigned, using default (${defaultConcreteItem.itemNumber})`)) {
          warnings.push(`Template "${template?.name || 'Unknown'}" has no DPWH item assigned, using default (${defaultConcreteItem.itemNumber})`);
        }
      }
      
      if (!groupedByItem[dpwhItemNumber]) {
        groupedByItem[dpwhItemNumber] = [];
      }
      
      groupedByItem[dpwhItemNumber].push(line);
    }

    const boqLines: BOQLine[] = [];

    // Create one BOQ line per DPWH item (concrete)
    for (const [dpwhItemNumber, lines] of Object.entries(groupedByItem)) {
      const catalogItem = concreteCatalogItems.find(item => item.itemNumber === dpwhItemNumber);
      
      if (!catalogItem) {
        errors.push(`DPWH item ${dpwhItemNumber} not found in catalog`);
        continue;
      }
      
      const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
      const sourceTakeoffLineIds = lines.map(line => line.id);
      
      // Collect all tags from source lines
      const allTags = new Set<string>();
      lines.forEach(line => line.tags.forEach(tag => allTags.add(tag)));
      
      // Count element types for this item
      const elementTypeCounts: Record<string, number> = {};
      lines.forEach(line => {
        const typeTag = line.tags.find(tag => tag.startsWith('type:'));
        const type = typeTag?.replace('type:', '') || 'unknown';
        elementTypeCounts[type] = (elementTypeCounts[type] || 0) + 1;
      });

      const boqLine: BOQLine = {
        id: `boq_${dpwhItemNumber.replace(/[^a-zA-Z0-9]/g, '_')}`,
        dpwhItemNumberRaw: catalogItem.itemNumber,
        description: catalogItem.description,
        unit: 'cu.m',
        quantity: Math.round(totalQuantity * 1000) / 1000, // 3 decimal places
        sourceTakeoffLineIds,
        tags: [
          `dpwh:${catalogItem.itemNumber}`,
          `trade:Concrete`,
          `elements:${Object.entries(elementTypeCounts).map(([type, count]) => `${count} ${type}`).join(', ')}`,
          ...Array.from(allTags).filter(tag => !tag.startsWith('type:')),
        ],
      };

      boqLines.push(boqLine);
    }

    // Process rebar takeoff lines
    const groupedRebarByItem: Record<string, TakeoffLine[]> = {};
    
    for (const line of rebarTakeoffLines) {
      // Get DPWH item from line assumptions (embedded in calculation)
      const dpwhItemAssumption = line.assumptions.find(a => a.includes('DPWH Item:'));
      const dpwhItemMatch = dpwhItemAssumption?.match(/DPWH Item: ([^,]+)/);
      const dpwhItemNumber = dpwhItemMatch ? dpwhItemMatch[1].trim() : defaultRebarItem.itemNumber;
      
      if (!groupedRebarByItem[dpwhItemNumber]) {
        groupedRebarByItem[dpwhItemNumber] = [];
      }
      
      groupedRebarByItem[dpwhItemNumber].push(line);
    }

    // Create BOQ lines for rebar
    for (const [dpwhItemNumber, lines] of Object.entries(groupedRebarByItem)) {
      const catalogItem = rebarCatalogItems.find(item => item.itemNumber === dpwhItemNumber);
      
      if (!catalogItem) {
        errors.push(`Rebar DPWH item ${dpwhItemNumber} not found in catalog`);
        continue;
      }
      
      const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
      const sourceTakeoffLineIds = lines.map(line => line.id);
      
      // Collect all tags from source lines
      const allTags = new Set<string>();
      lines.forEach(line => line.tags.forEach(tag => allTags.add(tag)));
      
      // Count element types and rebar types
      const elementTypeCounts: Record<string, number> = {};
      const rebarTypeCounts: Record<string, number> = {};
      lines.forEach(line => {
        const typeTag = line.tags.find(tag => tag.startsWith('type:'));
        const type = typeTag?.replace('type:', '') || 'unknown';
        elementTypeCounts[type] = (elementTypeCounts[type] || 0) + 1;
        
        const rebarTypeTag = line.tags.find(tag => tag.startsWith('rebar:'));
        const rebarType = rebarTypeTag?.replace('rebar:', '') || 'main';
        rebarTypeCounts[rebarType] = (rebarTypeCounts[rebarType] || 0) + 1;
      });

      const boqLine: BOQLine = {
        id: `boq_${dpwhItemNumber.replace(/[^a-zA-Z0-9]/g, '_')}`,
        dpwhItemNumberRaw: catalogItem.itemNumber,
        description: catalogItem.description,
        unit: 'kg',
        quantity: Math.round(totalQuantity * 100) / 100, // 2 decimal places
        sourceTakeoffLineIds,
        tags: [
          `dpwh:${catalogItem.itemNumber}`,
          `trade:Rebar`,
          `elements:${Object.entries(elementTypeCounts).map(([type, count]) => `${count} ${type}`).join(', ')}`,
          `rebar-types:${Object.entries(rebarTypeCounts).map(([type, count]) => `${count} ${type}`).join(', ')}`,
          ...Array.from(allTags).filter(tag => !tag.startsWith('type:') && !tag.startsWith('rebar:')),
        ],
      };

      boqLines.push(boqLine);
    }

    // Process formwork takeoff lines (if default item exists)
    if (defaultFormworkItem && formworkTakeoffLines.length > 0) {
      const groupedFormworkByItem: Record<string, TakeoffLine[]> = {};
      
      for (const line of formworkTakeoffLines) {
        // All formwork uses default item for now (903 series)
        const dpwhItemNumber = defaultFormworkItem.itemNumber;
        
        if (!groupedFormworkByItem[dpwhItemNumber]) {
          groupedFormworkByItem[dpwhItemNumber] = [];
        }
        
        groupedFormworkByItem[dpwhItemNumber].push(line);
      }

      // Create BOQ lines for formwork
      for (const [dpwhItemNumber, lines] of Object.entries(groupedFormworkByItem)) {
        const catalogItem = formworkCatalogItems.find(item => item.itemNumber === dpwhItemNumber);
        
        if (!catalogItem) {
          errors.push(`Formwork DPWH item ${dpwhItemNumber} not found in catalog`);
          continue;
        }
        
        const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
        const sourceTakeoffLineIds = lines.map(line => line.id);
        
        // Collect all tags from source lines
        const allTags = new Set<string>();
        lines.forEach(line => line.tags.forEach(tag => allTags.add(tag)));
        
        // Count element types
        const elementTypeCounts: Record<string, number> = {};
        lines.forEach(line => {
          const typeTag = line.tags.find(tag => tag.startsWith('type:'));
          const type = typeTag?.replace('type:', '') || 'unknown';
          elementTypeCounts[type] = (elementTypeCounts[type] || 0) + 1;
        });

        const boqLine: BOQLine = {
          id: `boq_${dpwhItemNumber.replace(/[^a-zA-Z0-9]/g, '_')}`,
          dpwhItemNumberRaw: catalogItem.itemNumber,
          description: catalogItem.description,
          unit: 'sq.m',
          quantity: Math.round(totalQuantity * 100) / 100, // 2 decimal places
          sourceTakeoffLineIds,
          tags: [
            `dpwh:${catalogItem.itemNumber}`,
            `trade:Formwork`,
            `elements:${Object.entries(elementTypeCounts).map(([type, count]) => `${count} ${type}`).join(', ')}`,
            ...Array.from(allTags).filter(tag => !tag.startsWith('type:')),
          ],
        };

        boqLines.push(boqLine);
      }
    }

    // ===================================
    // PROCESS FINISHES TAKEOFF LINES
    // ===================================
    const groupedFinishesByItem: Record<string, TakeoffLine[]> = {};
    
    for (const line of finishesTakeoffLines) {
      // Extract DPWH item from tags
      const dpwhTag = line.tags.find(tag => tag.startsWith('dpwh:'));
      const dpwhItemNumber = dpwhTag?.replace('dpwh:', '') || '';
      
      if (!dpwhItemNumber) {
        warnings.push(`Finishes line ${line.id} missing DPWH item number`);
        continue;
      }
      
      if (!groupedFinishesByItem[dpwhItemNumber]) {
        groupedFinishesByItem[dpwhItemNumber] = [];
      }
      
      groupedFinishesByItem[dpwhItemNumber].push(line);
    }

    // Create BOQ lines for finishes
    for (const [dpwhItemNumber, lines] of Object.entries(groupedFinishesByItem)) {
      // Find item in catalog
      const catalogItem = (catalog.items as DPWHCatalogItem[]).find(
        item => item.itemNumber === dpwhItemNumber
      );
      
      if (!catalogItem) {
        errors.push(`Finishes DPWH item ${dpwhItemNumber} not found in catalog`);
        continue;
      }
      
      const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
      const sourceTakeoffLineIds = lines.map(line => line.id);
      
      // Collect all tags from source lines
      const allTags = new Set<string>();
      lines.forEach(line => line.tags.forEach(tag => allTags.add(tag)));
      
      // Count spaces and finish categories
      const spaceCounts: Record<string, number> = {};
      const categoryCounts: Record<string, number> = {};
      lines.forEach(line => {
        const spaceTag = line.tags.find(tag => tag.startsWith('spaceName:'));
        const space = spaceTag?.replace('spaceName:', '') || 'unknown';
        spaceCounts[space] = (spaceCounts[space] || 0) + 1;
        
        const categoryTag = line.tags.find(tag => tag.startsWith('category:'));
        const category = categoryTag?.replace('category:', '') || 'unknown';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });

      const boqLine: BOQLine = {
        id: `boq_${dpwhItemNumber.replace(/[^a-zA-Z0-9]/g, '_')}_finishes`,
        dpwhItemNumberRaw: catalogItem.itemNumber,
        description: catalogItem.description,
        unit: catalogItem.unit,
        quantity: Math.round(totalQuantity * 100) / 100, // 2 decimal places
        sourceTakeoffLineIds,
        tags: [
          `dpwh:${catalogItem.itemNumber}`,
          `trade:Finishes`,
          `spaces:${Object.entries(spaceCounts).map(([space, count]) => `${count}× ${space}`).join(', ')}`,
          `categories:${Object.entries(categoryCounts).map(([cat, count]) => `${count}× ${cat}`).join(', ')}`,
          ...Array.from(allTags).filter(tag => !tag.startsWith('spaceName:') && !tag.startsWith('category:')),
        ],
      };

      boqLines.push(boqLine);
    }

    // ===================================
    // ROOFING BOQ MAPPING (Mode B)
    // ===================================
    const groupedRoofingByItem: Record<string, TakeoffLine[]> = {};

    for (const line of roofingTakeoffLines) {
      const dpwhTag = line.tags.find(tag => tag.startsWith('dpwh:'));
      if (!dpwhTag) continue;

      const dpwhItemNumber = dpwhTag.replace('dpwh:', '');
      if (!groupedRoofingByItem[dpwhItemNumber]) {
        groupedRoofingByItem[dpwhItemNumber] = [];
      }
      groupedRoofingByItem[dpwhItemNumber].push(line);
    }

    for (const [dpwhItemNumber, lines] of Object.entries(groupedRoofingByItem)) {
      const catalogItem = dpwhCatalog.find(item => item.itemNumber === dpwhItemNumber);
      if (!catalogItem) {
        warnings.push(`Roofing DPWH item "${dpwhItemNumber}" not found in catalog`);
        continue;
      }

      const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
      const sourceTakeoffLineIds = lines.map(line => line.id);
      const allTags = new Set<string>();
      const roofPlaneCounts: Record<string, number> = {};

      for (const line of lines) {
        line.tags.forEach(tag => allTags.add(tag));
        const roofPlaneTag = line.tags.find(t => t.startsWith('roofPlane:'));
        if (roofPlaneTag) {
          const roofPlaneName = roofPlaneTag.replace('roofPlane:', '');
          roofPlaneCounts[roofPlaneName] = (roofPlaneCounts[roofPlaneName] || 0) + 1;
        }
      }

      const boqLine: BOQLine = {
        id: `boq_${dpwhItemNumber.replace(/[^a-zA-Z0-9]/g, '_')}_roofing`,
        dpwhItemNumberRaw: catalogItem.itemNumber,
        description: catalogItem.description,
        unit: catalogItem.unit,
        quantity: Math.round(totalQuantity * 100) / 100,
        sourceTakeoffLineIds,
        tags: [
          `dpwh:${catalogItem.itemNumber}`,
          `trade:Roofing`,
          `roofPlanes:${Object.entries(roofPlaneCounts).map(([name, count]) => `${count}× ${name}`).join(', ')}`,
          ...Array.from(allTags).filter(tag => !tag.startsWith('roofPlane:')),
        ],
      };

      boqLines.push(boqLine);
    }

    // ===================================
    // SCHEDULE ITEMS BOQ MAPPING (Mode C)
    // ===================================
    const groupedScheduleByItem: Record<string, TakeoffLine[]> = {};

    for (const line of scheduleItemsTakeoffLines) {
      const dpwhTag = line.tags.find(tag => tag.startsWith('dpwh:'));
      if (!dpwhTag) continue;

      const dpwhItemNumber = dpwhTag.replace('dpwh:', '');
      if (!groupedScheduleByItem[dpwhItemNumber]) {
        groupedScheduleByItem[dpwhItemNumber] = [];
      }
      groupedScheduleByItem[dpwhItemNumber].push(line);
    }

    for (const [dpwhItemNumber, lines] of Object.entries(groupedScheduleByItem)) {
      const catalogItem = dpwhCatalog.find(item => item.itemNumber === dpwhItemNumber);
      if (!catalogItem) {
        warnings.push(`Schedule item DPWH "${dpwhItemNumber}" not found in catalog`);
        continue;
      }

      const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
      const sourceTakeoffLineIds = lines.map(line => line.id);
      const allTags = new Set<string>();
      const categoryCounts: Record<string, number> = {};

      for (const line of lines) {
        line.tags.forEach(tag => allTags.add(tag));
        const categoryTag = line.tags.find(t => t.startsWith('category:'));
        if (categoryTag) {
          const category = categoryTag.replace('category:', '');
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        }
      }

      const boqLine: BOQLine = {
        id: `boq_${dpwhItemNumber.replace(/[^a-zA-Z0-9]/g, '_')}_schedule`,
        dpwhItemNumberRaw: catalogItem.itemNumber,
        description: catalogItem.description,
        unit: catalogItem.unit,
        quantity: Math.round(totalQuantity * 100) / 100,
        sourceTakeoffLineIds,
        tags: [
          `dpwh:${catalogItem.itemNumber}`,
          `trade:${lines[0].trade}`,
          `categories:${Object.entries(categoryCounts).map(([cat, count]) => `${count}× ${cat}`).join(', ')}`,
          ...Array.from(allTags).filter(tag => !tag.startsWith('category:')),
        ],
      };

      boqLines.push(boqLine);
    }

    // Calculate summary
    const concreteLines = boqLines.filter(line => line.tags.some(tag => tag === 'trade:Concrete'));
    const rebarLines = boqLines.filter(line => line.tags.some(tag => tag === 'trade:Rebar'));
    const formworkLines = boqLines.filter(line => line.tags.some(tag => tag === 'trade:Formwork'));
    const finishesLines = boqLines.filter(line => line.tags.some(tag => tag === 'trade:Finishes'));
    const roofingLines = boqLines.filter(line => line.tags.some(tag => tag === 'trade:Roofing'));
    const scheduleLines = boqLines.filter(line => 
      !line.tags.some(tag => ['trade:Concrete', 'trade:Rebar', 'trade:Formwork', 'trade:Finishes', 'trade:Roofing'].includes(tag))
    );
    
    const totalConcreteQty = concreteLines.reduce((sum, line) => sum + line.quantity, 0);
    const totalRebarQty = rebarLines.reduce((sum, line) => sum + line.quantity, 0);
    const totalFormworkQty = formworkLines.reduce((sum, line) => sum + line.quantity, 0);
    const totalFinishesQty = finishesLines.reduce((sum, line) => sum + line.quantity, 0);
    const totalRoofingQty = roofingLines.reduce((sum, line) => sum + line.quantity, 0);
    const totalScheduleQty = scheduleLines.reduce((sum, line) => sum + line.quantity, 0);

    const summary = {
      totalLines: boqLines.length,
      totalQuantity: totalConcreteQty + totalRebarQty + totalFormworkQty + totalFinishesQty + totalRoofingQty + totalScheduleQty,
      trades: {
        Concrete: totalConcreteQty,
        Rebar: totalRebarQty,
        Formwork: totalFormworkQty,
        Finishes: totalFinishesQty,
        Roofing: totalRoofingQty,
        ScheduleItems: totalScheduleQty,
      },
    };

    // Update CalcRun with BOQ data if runId provided
    if (runId) {
      const calcRun = await CalcRun.findOne({ runId, projectId: id });
      if (calcRun) {
        calcRun.boqLines = boqLines;
        if (calcRun.summary) {
          calcRun.summary.boqLineCount = boqLines.length;
        }
        await calcRun.save();
      }
    }

    return NextResponse.json({
      boqLines,
      summary,
      warnings: warnings.length > 0 ? warnings : undefined,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('POST /api/projects/:id/boq error:', error);
    return NextResponse.json(
      { error: 'Failed to generate BOQ' },
      { status: 500 }
    );
  }
}
