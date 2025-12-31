import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';
import type { ElementInstance, ElementTemplate, GridLine, Level } from '@/types';

// GET /api/projects/:id/instances
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

    return NextResponse.json({
      instances: project.elementInstances || [],
    });
  } catch (error) {
    console.error('GET /api/projects/:id/instances error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch instances' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/:id/instances
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { instances } = body as { instances: ElementInstance[] };

    // Validation
    if (!Array.isArray(instances)) {
      return NextResponse.json(
        { error: 'instances must be an array' },
        { status: 400 }
      );
    }

    // Get project to validate against templates, grid, and levels
    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const errors: string[] = [];
    const seenIds = new Set<string>();

    // Build validation maps
    const templateIds = new Set(project.elementTemplates?.map((t: ElementTemplate) => t.id) || []);
    const levelIds = new Set(project.levels?.map((l: Level) => l.label) || []);
    const gridXLabels = new Set(project.gridX?.map((g: GridLine) => g.label) || []);
    const gridYLabels = new Set(project.gridY?.map((g: GridLine) => g.label) || []);

    for (const instance of instances) {
      // Check required fields
      if (!instance.id || !instance.templateId || !instance.placement?.levelId) {
        errors.push(`Instance missing required fields: ${JSON.stringify(instance)}`);
        continue;
      }

      // Check for duplicate IDs
      if (seenIds.has(instance.id)) {
        errors.push(`Duplicate instance ID: ${instance.id}`);
      }
      seenIds.add(instance.id);

      // Validate template exists
      if (!templateIds.has(instance.templateId)) {
        errors.push(`Instance ${instance.id}: template '${instance.templateId}' does not exist`);
      }

      // Validate level exists
      if (!levelIds.has(instance.placement.levelId)) {
        errors.push(`Instance ${instance.id}: level '${instance.placement.levelId}' does not exist`);
      }

      // Validate grid references if provided
      if (instance.placement.gridRef && instance.placement.gridRef.length > 0) {
        for (const ref of instance.placement.gridRef) {
          // Grid references can be:
          // 1. Span format: "A-B" or "1-2" (for beams and slabs)
          // 2. Single label: "A" or "1" (for columns at intersections)
          
          const parts = ref.split(/[-/]/);
          
          if (parts.length === 2) {
            // Span format - validate both start and end
            const [start, end] = parts;
            const isXAxisRef = gridXLabels.has(start) && gridXLabels.has(end);
            const isYAxisRef = gridYLabels.has(start) && gridYLabels.has(end);

            if (!isXAxisRef && !isYAxisRef) {
              errors.push(`Instance ${instance.id}: grid span '${ref}' contains invalid grid labels`);
            }
          } else if (parts.length === 1) {
            // Single label format - validate it exists in either axis
            const isXAxisLabel = gridXLabels.has(ref);
            const isYAxisLabel = gridYLabels.has(ref);

            if (!isXAxisLabel && !isYAxisLabel) {
              errors.push(`Instance ${instance.id}: grid label '${ref}' does not exist`);
            }
          } else {
            errors.push(`Instance ${instance.id}: invalid grid reference format '${ref}'`);
          }
        }
      }

      // Get template to validate placement type
      const template = project.elementTemplates?.find(t => t.id === instance.templateId);
      if (template) {
        // Beams should have gridRef (span)
        if (template.type === 'beam') {
          if (!instance.placement.gridRef || instance.placement.gridRef.length === 0) {
            errors.push(`Beam instance ${instance.id}: must have gridRef (span) defined`);
          }
        }

        // Slabs should have gridRef (panel)
        if (template.type === 'slab') {
          if (!instance.placement.gridRef || instance.placement.gridRef.length < 2) {
            errors.push(`Slab instance ${instance.id}: must have at least 2 gridRef entries to define a panel`);
          }
        }

        // Columns can have optional gridRef (intersection)
        // No strict requirement - can be placed anywhere
      }

      // Validate tags if provided
      if (instance.tags && !Array.isArray(instance.tags)) {
        errors.push(`Instance ${instance.id}: tags must be an array`);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    // Update project
    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { elementInstances: instances },
      { new: true, runValidators: true }
    );

    if (!updatedProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      instances: updatedProject.elementInstances,
      message: 'Instances updated successfully',
    });
  } catch (error) {
    console.error('PUT /api/projects/:id/instances error:', error);
    return NextResponse.json(
      { error: 'Failed to update instances' },
      { status: 500 }
    );
  }
}
