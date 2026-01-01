/**
 * API Route: /api/projects/[id]/openings
 * Manage openings (doors, windows) for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';
import { computeOpeningArea } from '@/lib/math/finishes';
import { v4 as uuidv4 } from 'uuid';
import type { Opening } from '@/types';

// GET /api/projects/[id]/openings
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
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Filter by query parameters
    const { searchParams } = new URL(request.url);
    const levelId = searchParams.get('levelId');
    const spaceId = searchParams.get('spaceId');
    
    let openings = project.openings || [];
    
    if (levelId) {
      openings = openings.filter(o => o.levelId === levelId);
    }
    
    if (spaceId) {
      openings = openings.filter(o => o.spaceId === spaceId);
    }
    
    return NextResponse.json({ openings });
  } catch (error: any) {
    console.error('Error fetching openings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch openings' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/openings
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
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Validate required fields
    if (!body.levelId || !body.type || !body.width_m || !body.height_m) {
      return NextResponse.json(
        { error: 'Missing required fields: levelId, type, width_m, height_m' },
        { status: 400 }
      );
    }
    
    // Validate level exists
    const levelExists = project.levels?.some(l => l.label === body.levelId);
    if (!levelExists) {
      return NextResponse.json(
        { error: `Level ${body.levelId} not found` },
        { status: 400 }
      );
    }
    
    // Validate space if provided
    if (body.spaceId) {
      const spaceExists = project.spaces?.some(s => s.id === body.spaceId);
      if (!spaceExists) {
        return NextResponse.json(
          { error: `Space ${body.spaceId} not found` },
          { status: 400 }
        );
      }
    }
    
    // Create opening
    const qty = body.qty || 1;
    const area_m2 = computeOpeningArea(body.width_m, body.height_m, qty);
    
    const newOpening: Opening = {
      id: uuidv4(),
      levelId: body.levelId,
      spaceId: body.spaceId,
      type: body.type,
      width_m: body.width_m,
      height_m: body.height_m,
      qty,
      computed: { area_m2 },
      tags: body.tags || [],
    };
    
    // Add to project
    if (!project.openings) {
      project.openings = [];
    }
    project.openings.push(newOpening);
    
    await project.save();
    
    return NextResponse.json({ opening: newOpening }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating opening:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create opening' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/openings/[openingId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const openingId = searchParams.get('openingId');
    
    if (!openingId) {
      return NextResponse.json(
        { error: 'Opening ID required' },
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
    
    const openingIndex = project.openings?.findIndex(o => o.id === openingId);
    if (openingIndex === undefined || openingIndex === -1) {
      return NextResponse.json(
        { error: 'Opening not found' },
        { status: 404 }
      );
    }
    
    project.openings!.splice(openingIndex, 1);
    await project.save();
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting opening:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete opening' },
      { status: 500 }
    );
  }
}
