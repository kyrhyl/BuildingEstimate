/**
 * API Route: /api/projects/[id]/roof-planes
 * CRUD operations for roof planes
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';
import { v4 as uuidv4 } from 'uuid';
import type { RoofPlane } from '@/types';
import { computeRoofPlaneGeometry } from '@/lib/math/roofing';

// GET /api/projects/[id]/roof-planes - List all roof planes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ roofPlanes: project.roofPlanes || [] });
  } catch (error) {
    console.error('Error fetching roof planes:', error);
    return NextResponse.json({ error: 'Failed to fetch roof planes' }, { status: 500 });
  }
}

// POST /api/projects/[id]/roof-planes - Create new roof plane
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Validate level exists
    const levelExists = project.levels?.some(l => l.label === body.levelId);
    if (!levelExists) {
      return NextResponse.json({ error: `Level "${body.levelId}" not found` }, { status: 400 });
    }

    // Validate roof type exists
    const roofTypeExists = project.roofTypes?.some(rt => rt.id === body.roofTypeId);
    if (!roofTypeExists) {
      return NextResponse.json({ error: `Roof type "${body.roofTypeId}" not found` }, { status: 400 });
    }

    const newRoofPlane: RoofPlane = {
      id: uuidv4(),
      name: body.name,
      levelId: body.levelId,
      boundary: body.boundary,
      slope: body.slope,
      roofTypeId: body.roofTypeId,
      computed: {
        planArea_m2: 0,
        slopeFactor: 1,
        slopeArea_m2: 0,
      },
      tags: body.tags || [],
    };

    // Compute geometry
    try {
      const geometry = computeRoofPlaneGeometry(
        newRoofPlane,
        project.gridX,
        project.gridY
      );
      newRoofPlane.computed = geometry;
    } catch (error) {
      return NextResponse.json(
        { error: `Geometry calculation failed: ${error instanceof Error ? error.message : String(error)}` },
        { status: 400 }
      );
    }

    if (!project.roofPlanes) {
      project.roofPlanes = [];
    }
    project.roofPlanes.push(newRoofPlane);

    await project.save();

    return NextResponse.json({ roofPlane: newRoofPlane }, { status: 201 });
  } catch (error) {
    console.error('Error creating roof plane:', error);
    return NextResponse.json({ error: 'Failed to create roof plane' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/roof-planes?roofPlaneId=xxx
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const roofPlaneId = searchParams.get('roofPlaneId');

    if (!roofPlaneId) {
      return NextResponse.json({ error: 'roofPlaneId required' }, { status: 400 });
    }

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.roofPlanes) {
      return NextResponse.json({ error: 'No roof planes found' }, { status: 404 });
    }

    project.roofPlanes = project.roofPlanes.filter(rp => rp.id !== roofPlaneId);
    await project.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting roof plane:', error);
    return NextResponse.json({ error: 'Failed to delete roof plane' }, { status: 500 });
  }
}
