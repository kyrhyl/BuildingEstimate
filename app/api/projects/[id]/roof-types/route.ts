/**
 * API Route: /api/projects/[id]/roof-types
 * CRUD operations for roof type templates
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';
import { v4 as uuidv4 } from 'uuid';
import type { RoofType } from '@/types';
import catalog from '@/data/dpwh-catalog.json';

// GET /api/projects/[id]/roof-types - List all roof types
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

    return NextResponse.json({ roofTypes: project.roofTypes || [] });
  } catch (error) {
    console.error('Error fetching roof types:', error);
    return NextResponse.json({ error: 'Failed to fetch roof types' }, { status: 500 });
  }
}

// POST /api/projects/[id]/roof-types - Create new roof type
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    // Validate DPWH item exists in catalog
    const catalogItem = catalog.items.find((item: { itemNumber: string; unit: string }) => item.itemNumber === body.dpwhItemNumberRaw);
    if (!catalogItem) {
      return NextResponse.json(
        { error: `DPWH item "${body.dpwhItemNumberRaw}" not found in catalog` },
        { status: 400 }
      );
    }

    // Validate unit matches catalog
    if (catalogItem.unit !== body.unit) {
      return NextResponse.json(
        { error: `Unit mismatch: expected "${catalogItem.unit}" but got "${body.unit}"` },
        { status: 400 }
      );
    }

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const newRoofType: RoofType = {
      id: uuidv4(),
      name: body.name,
      dpwhItemNumberRaw: body.dpwhItemNumberRaw,
      unit: body.unit,
      areaBasis: body.areaBasis || 'slopeArea',
      lapAllowancePercent: body.lapAllowancePercent || 0.10,
      wastePercent: body.wastePercent || 0.05,
      assumptions: body.assumptions || {},
    };

    if (!project.roofTypes) {
      project.roofTypes = [];
    }
    project.roofTypes.push(newRoofType);

    await project.save();

    return NextResponse.json({ roofType: newRoofType }, { status: 201 });
  } catch (error) {
    console.error('Error creating roof type:', error);
    return NextResponse.json({ error: 'Failed to create roof type' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/roof-types?roofTypeId=xxx
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const roofTypeId = searchParams.get('roofTypeId');

    if (!roofTypeId) {
      return NextResponse.json({ error: 'roofTypeId required' }, { status: 400 });
    }

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.roofTypes) {
      return NextResponse.json({ error: 'No roof types found' }, { status: 404 });
    }

    project.roofTypes = project.roofTypes.filter(rt => rt.id !== roofTypeId);
    await project.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting roof type:', error);
    return NextResponse.json({ error: 'Failed to delete roof type' }, { status: 500 });
  }
}
