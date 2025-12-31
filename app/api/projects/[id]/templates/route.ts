import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';
import type { ElementTemplate } from '@/types';

// GET /api/projects/:id/templates
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
      templates: project.elementTemplates || [],
    });
  } catch (error) {
    console.error('GET /api/projects/:id/templates error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/:id/templates
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { templates } = body as { templates: ElementTemplate[] };

    // Validation
    if (!Array.isArray(templates)) {
      return NextResponse.json(
        { error: 'templates must be an array' },
        { status: 400 }
      );
    }

    // Validate each template
    const errors: string[] = [];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    for (const template of templates) {
      // Check required fields
      if (!template.id || !template.type || !template.name) {
        errors.push(`Template missing required fields: ${JSON.stringify(template)}`);
        continue;
      }

      // Check type
      if (!['beam', 'slab', 'column', 'foundation'].includes(template.type)) {
        errors.push(`Invalid template type: ${template.type}`);
      }

      // Check for duplicate IDs
      if (seenIds.has(template.id)) {
        errors.push(`Duplicate template ID: ${template.id}`);
      }
      seenIds.add(template.id);

      // Check for duplicate names within same type
      const nameKey = `${template.type}:${template.name}`;
      if (seenNames.has(nameKey)) {
        errors.push(`Duplicate template name for type ${template.type}: ${template.name}`);
      }
      seenNames.add(nameKey);

      // Validate properties based on type
      if (!template.properties || typeof template.properties !== 'object') {
        errors.push(`Template ${template.id} must have properties object`);
        continue;
      }

      // Type-specific validation
      if (template.type === 'beam') {
        if (typeof template.properties.width !== 'number' || template.properties.width <= 0) {
          errors.push(`Beam ${template.name}: width must be a positive number`);
        }
        if (typeof template.properties.height !== 'number' || template.properties.height <= 0) {
          errors.push(`Beam ${template.name}: height must be a positive number`);
        }
      } else if (template.type === 'slab') {
        if (typeof template.properties.thickness !== 'number' || template.properties.thickness <= 0) {
          errors.push(`Slab ${template.name}: thickness must be a positive number`);
        }
      } else if (template.type === 'foundation') {
        // Foundation can be like slab (mat foundation) or footing (length × width × depth)
        if (template.properties.thickness !== undefined) {
          // Mat foundation (slab-like)
          if (typeof template.properties.thickness !== 'number' || template.properties.thickness <= 0) {
            errors.push(`Foundation ${template.name}: thickness must be a positive number`);
          }
        } else if (template.properties.length !== undefined && template.properties.width !== undefined && template.properties.depth !== undefined) {
          // Footing (box-like)
          if (typeof template.properties.length !== 'number' || template.properties.length <= 0) {
            errors.push(`Foundation ${template.name}: length must be a positive number`);
          }
          if (typeof template.properties.width !== 'number' || template.properties.width <= 0) {
            errors.push(`Foundation ${template.name}: width must be a positive number`);
          }
          if (typeof template.properties.depth !== 'number' || template.properties.depth <= 0) {
            errors.push(`Foundation ${template.name}: depth must be a positive number`);
          }
        } else {
          errors.push(`Foundation ${template.name}: must have either thickness (mat foundation) or length+width+depth (footing)`);
        }
      } else if (template.type === 'column') {
        const isCircular = template.properties.diameter !== undefined;
        const isRectangular = template.properties.width !== undefined && template.properties.height !== undefined;

        if (!isCircular && !isRectangular) {
          errors.push(`Column ${template.name}: must have either diameter (circular) or width+height (rectangular)`);
        }

        if (isCircular && (typeof template.properties.diameter !== 'number' || template.properties.diameter <= 0)) {
          errors.push(`Column ${template.name}: diameter must be a positive number`);
        }

        if (isRectangular) {
          if (typeof template.properties.width !== 'number' || template.properties.width <= 0) {
            errors.push(`Column ${template.name}: width must be a positive number`);
          }
          if (typeof template.properties.height !== 'number' || template.properties.height <= 0) {
            errors.push(`Column ${template.name}: height must be a positive number`);
          }
        }
      }

      // Validate rebar config if provided
      if (template.rebarConfig) {
        if (template.rebarConfig.mainBars) {
          if (typeof template.rebarConfig.mainBars.count !== 'number' || template.rebarConfig.mainBars.count <= 0) {
            errors.push(`Template ${template.name}: mainBars.count must be a positive number`);
          }
          if (typeof template.rebarConfig.mainBars.diameter !== 'number' || template.rebarConfig.mainBars.diameter <= 0) {
            errors.push(`Template ${template.name}: mainBars.diameter must be a positive number`);
          }
        }
        if (template.rebarConfig.stirrups) {
          if (typeof template.rebarConfig.stirrups.diameter !== 'number' || template.rebarConfig.stirrups.diameter <= 0) {
            errors.push(`Template ${template.name}: stirrups.diameter must be a positive number`);
          }
          if (typeof template.rebarConfig.stirrups.spacing !== 'number' || template.rebarConfig.stirrups.spacing <= 0) {
            errors.push(`Template ${template.name}: stirrups.spacing must be a positive number`);
          }
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    // Update project
    const project = await Project.findByIdAndUpdate(
      id,
      { elementTemplates: templates },
      { new: true, runValidators: true }
    );

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      templates: project.elementTemplates,
      message: 'Templates updated successfully',
    });
  } catch (error) {
    console.error('PUT /api/projects/:id/templates error:', error);
    return NextResponse.json(
      { error: 'Failed to update templates' },
      { status: 500 }
    );
  }
}
