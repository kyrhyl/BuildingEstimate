import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';
import type { WallSurfaceFinishAssignment } from '@/types';

// GET /api/projects/:id/wall-surface-assignments - Get wall surface finish assignments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    console.log('Fetching wall assignments for project:', id);

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    console.log('Wall assignments in DB:', project.wallSurfaceFinishAssignments?.length || 0);
    console.log('Assignments:', project.wallSurfaceFinishAssignments);

    return NextResponse.json({
      assignments: project.wallSurfaceFinishAssignments || [],
    });
  } catch (error: any) {
    console.error('Error fetching wall surface assignments:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch wall surface assignments' },
      { status: 500 }
    );
  }
}

// POST /api/projects/:id/wall-surface-assignments - Create wall surface finish assignment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    console.log('Creating wall assignment for project:', id);
    console.log('Request body:', body);

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const newAssignment: WallSurfaceFinishAssignment = {
      id: `wall-assign-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      wallSurfaceId: body.wallSurfaceId,
      finishTypeId: body.finishTypeId,
      scope: body.scope || 'base',
      side: body.side,
      overrides: body.overrides,
    };

    console.log('New assignment created:', newAssignment);

    if (!project.wallSurfaceFinishAssignments) {
      project.wallSurfaceFinishAssignments = [];
      console.log('Initialized wallSurfaceFinishAssignments array');
    }

    console.log('Current assignments before push:', project.wallSurfaceFinishAssignments.length);
    project.wallSurfaceFinishAssignments.push(newAssignment);
    console.log('Current assignments after push:', project.wallSurfaceFinishAssignments.length);
    
    const savedProject = await project.save();
    console.log('Project saved. Wall assignments count:', savedProject.wallSurfaceFinishAssignments?.length);

    return NextResponse.json(newAssignment);
  } catch (error: any) {
    console.error('Error creating wall surface assignment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create wall surface assignment' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/:id/wall-surface-assignments - Delete wall surface finish assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'assignmentId is required' },
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

    if (!project.wallSurfaceFinishAssignments) {
      return NextResponse.json(
        { error: 'No wall surface assignments found' },
        { status: 404 }
      );
    }

    project.wallSurfaceFinishAssignments = project.wallSurfaceFinishAssignments.filter(
      (a: WallSurfaceFinishAssignment) => a.id !== assignmentId
    );

    await project.save();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting wall surface assignment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete wall surface assignment' },
      { status: 500 }
    );
  }
}
