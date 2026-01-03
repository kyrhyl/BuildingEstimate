import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';
import { withErrorHandler, successResponse, validateRequest, APIErrorClass, ErrorCode } from '@/lib/api/validation';
import { createProjectSchema } from '@/lib/api/schemas';

/**
 * GET /api/projects
 * List all projects
 */
export const GET = withErrorHandler(async () => {
  await dbConnect();
  
  const projects = await Project.find({})
    .select('name description createdAt updatedAt')
    .sort({ updatedAt: -1 });
  
  return successResponse(projects);
});

/**
 * POST /api/projects
 * Create a new project
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  await dbConnect();
  
  // Validate request body
  const validatedData = await validateRequest(request, createProjectSchema);

  const project = await Project.create({
    name: validatedData.name,
    description: validatedData.description,
    // settings will use default from schema
    gridX: [],
    gridY: [],
    levels: [],
    elementTemplates: [],
    elementInstances: [],
  });

  return successResponse(project, 201);
});
