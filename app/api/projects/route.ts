import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';

/**
 * GET /api/projects
 * List all projects
 */
export async function GET() {
  try {
    await connectDB();
    const projects = await Project.find({})
      .select('name description createdAt updatedAt')
      .sort({ updatedAt: -1 });
    
    return NextResponse.json({ 
      success: true, 
      data: projects 
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * Create a new project
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    
    // Validation
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Project name is required' },
        { status: 400 }
      );
    }

    const project = await Project.create({
      name: body.name,
      description: body.description || '',
      // settings will use default from schema
      gridX: [],
      gridY: [],
      levels: [],
      elementTemplates: [],
      elementInstances: [],
    });

    return NextResponse.json(
      { success: true, data: project },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
