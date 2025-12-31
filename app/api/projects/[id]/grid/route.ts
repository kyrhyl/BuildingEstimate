import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';
import type { GridLine } from '@/types';

/**
 * GET /api/projects/[id]/grid
 * Get grid lines for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const project = await Project.findById(id);

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        gridX: project.gridX || [],
        gridY: project.gridY || [],
      },
    });
  } catch (error) {
    console.error('Error fetching grid:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch grid' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]/grid
 * Update grid lines for a project
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { gridX, gridY } = body;

    // Validate grid lines
    const validateGridLines = (lines: GridLine[], axis: string) => {
      if (!Array.isArray(lines)) {
        throw new Error(`${axis} must be an array`);
      }

      const labels = new Set<string>();
      for (const line of lines) {
        if (!line.label || typeof line.label !== 'string') {
          throw new Error(`${axis} line missing label`);
        }
        if (typeof line.offset !== 'number' || line.offset < 0) {
          throw new Error(`${axis} line ${line.label} has invalid offset`);
        }
        if (labels.has(line.label)) {
          throw new Error(`${axis} line label "${line.label}" is duplicated`);
        }
        labels.add(line.label);
      }
    };

    if (gridX) validateGridLines(gridX, 'gridX');
    if (gridY) validateGridLines(gridY, 'gridY');

    const project = await Project.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(gridX && { gridX }),
          ...(gridY && { gridY }),
        },
      },
      { new: true, runValidators: true }
    );

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        gridX: project.gridX,
        gridY: project.gridY,
      },
    });
  } catch (error: any) {
    console.error('Error updating grid:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update grid' },
      { status: 400 }
    );
  }
}
