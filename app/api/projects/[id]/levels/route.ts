import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';
import type { Level } from '@/types';

/**
 * GET /api/projects/[id]/levels
 * Get levels for a project
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
      data: project.levels || [],
    });
  } catch (error) {
    console.error('Error fetching levels:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch levels' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]/levels
 * Update levels for a project
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { levels } = body;

    // Validate levels
    if (!Array.isArray(levels)) {
      throw new Error('Levels must be an array');
    }

    const labels = new Set<string>();
    for (const level of levels) {
      if (!level.label || typeof level.label !== 'string') {
        throw new Error('Level missing label');
      }
      if (typeof level.elevation !== 'number') {
        throw new Error(`Level ${level.label} has invalid elevation`);
      }
      if (labels.has(level.label)) {
        throw new Error(`Level label "${level.label}" is duplicated`);
      }
      labels.add(level.label);
    }

    const project = await Project.findByIdAndUpdate(
      id,
      { $set: { levels } },
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
      data: project.levels,
    });
  } catch (error: any) {
    console.error('Error updating levels:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update levels' },
      { status: 400 }
    );
  }
}
