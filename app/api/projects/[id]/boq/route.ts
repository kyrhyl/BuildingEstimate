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

    // Only process concrete takeoff lines for BOQ v1
    const concreteTakeoffLines = takeoffLines.filter(
      line => line.trade === 'Concrete'
    );

    if (concreteTakeoffLines.length === 0) {
      return NextResponse.json({
        boqLines: [],
        summary: {
          totalLines: 0,
          trades: {},
        },
        warnings: ['No concrete takeoff lines to process'],
      });
    }

    // Get concrete catalog items (900-901, 904 series)
    const catalog = dpwhCatalog as { items: DPWHCatalogItem[] };
    const concreteCatalogItems = catalog.items.filter(
      item => item.trade === 'Concrete'
    );

    const errors: string[] = [];
    const warnings: string[] = [];

    const defaultConcreteItem = concreteCatalogItems.find(
      item => item.itemNumber === '900 (1) a' // Structural Concrete, Class A, 3000 psi, 7 days
    );

    if (!defaultConcreteItem) {
      return NextResponse.json(
        { error: 'Default concrete item not found in DPWH catalog' },
        { status: 500 }
      );
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

    // Create one BOQ line per DPWH item
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

    // Calculate summary
    const totalQuantity = boqLines.reduce((sum, line) => sum + line.quantity, 0);

    const summary = {
      totalLines: boqLines.length,
      totalQuantity,
      trades: {
        Concrete: totalQuantity,
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
