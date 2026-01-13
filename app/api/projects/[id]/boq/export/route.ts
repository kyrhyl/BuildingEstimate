import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';
import CalcRunModel from '@/models/CalcRun';
import type { CalcRun, BOQLine, ProjectModel } from '@/types';

/**
 * GET /api/projects/[id]/boq/export
 * Export BOQ as a standardized JSON file for external applications
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('runId'); // Optional: export specific run
    const format = searchParams.get('format') || 'standard'; // standard, detailed, or minimal

    await dbConnect();

    // Get project information
    const project = await Project.findById(projectId).lean() as ProjectModel | null;
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get the CalcRun (latest or specific)
    let calcRun: CalcRun | null;
    
    if (runId) {
      calcRun = await CalcRunModel.findOne({ 
        projectId,
        runId 
      }).lean() as CalcRun | null;
    } else {
      calcRun = await CalcRunModel.findOne({ 
        projectId, 
        status: 'completed' 
      })
        .sort({ timestamp: -1 })
        .lean() as CalcRun | null;
    }

    if (!calcRun || !calcRun.boqLines || calcRun.boqLines.length === 0) {
      return NextResponse.json(
        { error: 'No BOQ data found for this project' },
        { status: 404 }
      );
    }

    // Generate export data based on format
    let exportData;

    switch (format) {
      case 'minimal':
        exportData = generateMinimalExport(project, calcRun);
        break;
      case 'detailed':
        exportData = generateDetailedExport(project, calcRun);
        break;
      case 'standard':
      default:
        exportData = generateStandardExport(project, calcRun);
        break;
    }

    // Return JSON with appropriate headers for download
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="BOQ_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${calcRun.runId}.json"`,
      },
    });

  } catch (error) {
    console.error('BOQ export error:', error);
    return NextResponse.json(
      { error: 'Failed to export BOQ', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Standard export format - balanced between completeness and simplicity
 */
function generateStandardExport(project: ProjectModel, calcRun: CalcRun) {
  const boqLines = calcRun.boqLines || [];
  
  // Group by category
  const categorizedLines = groupByCategory(boqLines);

  return {
    metadata: {
      projectId: project._id,
      projectName: project.name,
      projectDescription: project.description || '',
      exportDate: new Date().toISOString(),
      calcRunId: calcRun.runId,
      calcRunTimestamp: calcRun.timestamp,
      status: calcRun.status,
    },
    summary: calcRun.summary || {
      totalConcrete: 0,
      totalRebar: 0,
      totalFormwork: 0,
      takeoffLineCount: 0,
      boqLineCount: boqLines.length,
    },
    boq: {
      totalLines: boqLines.length,
      categories: categorizedLines,
      lines: boqLines.map(line => ({
        id: line.id,
        itemNumber: line.dpwhItemNumberRaw,
        description: line.description,
        unit: line.unit,
        quantity: line.quantity,
        tags: line.tags,
      })),
    },
  };
}

/**
 * Detailed export format - includes all available information
 */
function generateDetailedExport(project: ProjectModel, calcRun: CalcRun) {
  const boqLines = calcRun.boqLines || [];
  const categorizedLines = groupByCategory(boqLines);

  return {
    metadata: {
      projectId: project._id,
      projectName: project.name,
      projectDescription: project.description || '',
      exportDate: new Date().toISOString(),
      calcRunId: calcRun.runId,
      calcRunTimestamp: calcRun.timestamp,
      status: calcRun.status,
      exportFormat: 'detailed',
      exportVersion: '1.0.0',
    },
    project: {
      settings: project.settings,
      gridX: project.gridX || [],
      gridY: project.gridY || [],
      levels: project.levels || [],
    },
    summary: calcRun.summary || {
      totalConcrete: 0,
      totalRebar: 0,
      totalFormwork: 0,
      takeoffLineCount: 0,
      boqLineCount: boqLines.length,
    },
    boq: {
      totalLines: boqLines.length,
      categories: categorizedLines,
      lines: boqLines.map(line => ({
        id: line.id,
        itemNumber: line.dpwhItemNumberRaw,
        description: line.description,
        unit: line.unit,
        quantity: line.quantity,
        sourceTakeoffLineIds: line.sourceTakeoffLineIds,
        tags: line.tags,
      })),
    },
    takeoffLines: calcRun.takeoffLines || [],
    errors: calcRun.errors || [],
  };
}

/**
 * Minimal export format - only essential BOQ data
 */
function generateMinimalExport(project: ProjectModel, calcRun: CalcRun) {
  const boqLines = calcRun.boqLines || [];

  return {
    project: project.name,
    date: new Date().toISOString(),
    items: boqLines.map(line => ({
      item: line.dpwhItemNumberRaw,
      description: line.description,
      unit: line.unit,
      quantity: line.quantity,
    })),
  };
}

/**
 * Group BOQ lines by category
 */
function groupByCategory(boqLines: BOQLine[]) {
  const categories: Record<string, {
    count: number;
    totalQuantity: number;
    items: BOQLine[];
  }> = {};

  for (const line of boqLines) {
    const categoryTag = line.tags.find(tag => tag.startsWith('category:'));
    const category = categoryTag ? categoryTag.replace('category:', '') : 'Other';

    if (!categories[category]) {
      categories[category] = {
        count: 0,
        totalQuantity: 0,
        items: [],
      };
    }

    categories[category].count++;
    categories[category].totalQuantity += line.quantity;
    categories[category].items.push(line);
  }

  return categories;
}
