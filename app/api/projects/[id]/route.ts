import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';
import { withErrorHandler, successResponse, validateRequest, validateObjectId, APIErrorClass, ErrorCode } from '@/lib/api/validation';
import { updateProjectSchema } from '@/lib/api/schemas';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/projects/:id
 * Get a single project by ID
 */
export const GET = withErrorHandler<unknown, Params>(async (request: NextRequest, context) => {
  await dbConnect();
  const { id } = await context!.params;
  
  validateObjectId(id, 'project ID');
  
  const project = await Project.findById(id);
  
  if (!project) {
    throw new APIErrorClass(404, ErrorCode.NOT_FOUND, 'Project not found');
  }

  return successResponse(project);
});

/**
 * PUT /api/projects/:id
 * Update a project
 */
export const PUT = withErrorHandler<unknown, Params>(async (request: NextRequest, context) => {
  await dbConnect();
  const { id } = await context!.params;
  
  validateObjectId(id, 'project ID');
  
  const validatedData = await validateRequest(request, updateProjectSchema);
  
  const project = await Project.findByIdAndUpdate(
    id,
    { $set: validatedData },
    { new: true, runValidators: true }
  );

  if (!project) {
    throw new APIErrorClass(404, ErrorCode.NOT_FOUND, 'Project not found');
  }

  return successResponse(project);
});

/**
 * DELETE /api/projects/:id
 * Delete a project
 */
export const DELETE = withErrorHandler<unknown, Params>(async (request: NextRequest, context) => {
  await dbConnect();
  const { id } = await context!.params;
  
  validateObjectId(id, 'project ID');
  
  const project = await Project.findByIdAndDelete(id);

  if (!project) {
    throw new APIErrorClass(404, ErrorCode.NOT_FOUND, 'Project not found');
  }

  return successResponse({ deleted: true, id });
});
