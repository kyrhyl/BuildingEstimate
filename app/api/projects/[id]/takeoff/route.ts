import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';
import CalcRun from '@/models/CalcRun';
import type { TakeoffLine, ElementInstance, ElementTemplate, GridLine, Level } from '@/types';
import { calculateBeamConcrete, calculateSlabConcrete, calculateColumnConcrete, calculateFootingConcrete, roundVolume } from '@/lib/math/concrete';

// POST /api/projects/:id/takeoff - Generate concrete takeoff from element instances
export async function POST(
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

    const instances = project.elementInstances || [];
    const templates = project.elementTemplates || [];
    const gridX = project.gridX || [];
    const gridY = project.gridY || [];
    const levels = project.levels || [];
    const settings = project.settings;

    if (instances.length === 0) {
      return NextResponse.json({
        takeoffLines: [],
        summary: { totalConcrete: 0, elementCount: 0 },
      });
    }

    const takeoffLines: TakeoffLine[] = [];
    const errors: string[] = [];

    // Helper: Get grid offset by label
    const getGridOffset = (label: string, axis: 'X' | 'Y'): number | null => {
      const grid = axis === 'X' ? gridX : gridY;
      const gridLine = grid.find((g: GridLine) => g.label === label);
      return gridLine ? gridLine.offset : null;
    };

    // Helper: Get level by label
    const getLevel = (label: string): Level | null => {
      return levels.find((l: Level) => l.label === label) || null;
    };

    // Helper: Get next level above
    const getNextLevel = (currentLabel: string): Level | null => {
      const currentLevel = getLevel(currentLabel);
      if (!currentLevel) return null;
      
      const sortedLevels = [...levels].sort((a: Level, b: Level) => a.elevation - b.elevation);
      const currentIndex = sortedLevels.findIndex((l: Level) => l.label === currentLabel);
      
      return currentIndex >= 0 && currentIndex < sortedLevels.length - 1
        ? sortedLevels[currentIndex + 1]
        : null;
    };

    // Process each element instance
    for (const instance of instances) {
      const template = templates.find((t: ElementTemplate) => t.id === instance.templateId);
      if (!template) {
        errors.push(`Template not found for instance ${instance.id}`);
        continue;
      }

      const level = getLevel(instance.placement.levelId);
      if (!level) {
        errors.push(`Level not found for instance ${instance.id}`);
        continue;
      }

      try {
        if (template.type === 'beam' && instance.placement.gridRef && instance.placement.gridRef.length >= 2) {
          // Beam calculation
          const [ref1, ref2] = instance.placement.gridRef;
          
          let length = 0;
          
          // Determine which reference is the span
          if (ref1.includes('-')) {
            // Span along X-axis
            const [start, end] = ref1.split('-');
            const x1 = getGridOffset(start, 'X');
            const x2 = getGridOffset(end, 'X');
            if (x1 !== null && x2 !== null) {
              length = Math.abs(x2 - x1);
            }
          } else if (ref2.includes('-')) {
            // Span along Y-axis
            const [start, end] = ref2.split('-');
            const y1 = getGridOffset(start, 'Y');
            const y2 = getGridOffset(end, 'Y');
            if (y1 !== null && y2 !== null) {
              length = Math.abs(y2 - y1);
            }
          }

          if (length === 0) {
            errors.push(`Could not determine beam length for instance ${instance.id}`);
            continue;
          }

          // Get beam dimensions from template
          const width = typeof template.properties.width === 'number' ? template.properties.width : 
                       (template.properties as any).get?.('width') || 0;
          const height = typeof template.properties.height === 'number' ? template.properties.height : 
                        (template.properties as any).get?.('height') || 0;

          if (width <= 0 || height <= 0) {
            errors.push(`Beam template '${template.name}' has invalid dimensions (width: ${width}, height: ${height})`);
            continue;
          }

          const result = calculateBeamConcrete({
            width,
            height,
            length,
            waste: settings.waste.concrete,
          });

          const takeoffLine: TakeoffLine = {
            id: `tof_${instance.id}_concrete`,
            sourceElementId: instance.id,
            trade: 'Concrete',
            resourceKey: 'concrete-class-a',
            quantity: roundVolume(result.volumeWithWaste, settings.rounding.concrete),
            unit: 'm³',
            formulaText: result.formulaText,
            inputsSnapshot: result.inputs,
            assumptions: [`Waste: ${(settings.waste.concrete * 100).toFixed(0)}%`],
            tags: [
              `type:beam`,
              `template:${template.name}`,
              `level:${level.label}`,
              ...(instance.tags || []),
            ],
            calculatedAt: new Date(),
          };

          takeoffLines.push(takeoffLine);

        } else if (template.type === 'slab' && instance.placement.gridRef && instance.placement.gridRef.length >= 2) {
          // Slab calculation
          const [xRef, yRef] = instance.placement.gridRef;
          const [xStart, xEnd] = xRef.split('-');
          const [yStart, yEnd] = yRef.split('-');

          const x1 = getGridOffset(xStart, 'X');
          const x2 = getGridOffset(xEnd, 'X');
          const y1 = getGridOffset(yStart, 'Y');
          const y2 = getGridOffset(yEnd, 'Y');

          if (x1 === null || x2 === null || y1 === null || y2 === null) {
            errors.push(`Could not determine slab area for instance ${instance.id}`);
            continue;
          }

          const width = Math.abs(x2 - x1);
          const height = Math.abs(y2 - y1);
          const area = width * height;

          // Get slab thickness from template
          const thickness = typeof template.properties.thickness === 'number' ? template.properties.thickness : 
                           (template.properties as any).get?.('thickness') || 0;

          if (thickness <= 0) {
            errors.push(`Slab template '${template.name}' has invalid thickness (${thickness})`);
            continue;
          }

          const result = calculateSlabConcrete({
            thickness,
            area,
            waste: settings.waste.concrete,
          });

          const takeoffLine: TakeoffLine = {
            id: `tof_${instance.id}_concrete`,
            sourceElementId: instance.id,
            trade: 'Concrete',
            resourceKey: 'concrete-class-a',
            quantity: roundVolume(result.volumeWithWaste, settings.rounding.concrete),
            unit: 'm³',
            formulaText: result.formulaText,
            inputsSnapshot: result.inputs,
            assumptions: [`Waste: ${(settings.waste.concrete * 100).toFixed(0)}%`],
            tags: [
              `type:slab`,
              `template:${template.name}`,
              `level:${level.label}`,
              ...(instance.tags || []),
            ],
            calculatedAt: new Date(),
          };

          takeoffLines.push(takeoffLine);

        } else if (template.type === 'column') {
          // Column calculation - height is from current level to end level (or next level if not specified)
          let endLevel: Level | null;
          
          if (instance.placement.endLevelId) {
            // Use specified end level
            endLevel = getLevel(instance.placement.endLevelId);
            if (!endLevel) {
              errors.push(`End level '${instance.placement.endLevelId}' not found for column instance ${instance.id}`);
              continue;
            }
            
            // Validate end level is above start level
            if (endLevel.elevation <= level.elevation) {
              errors.push(`Column instance ${instance.id}: end level '${endLevel.label}' (${endLevel.elevation}m) must be above start level '${level.label}' (${level.elevation}m)`);
              continue;
            }
          } else {
            // Auto-detect next level above
            endLevel = getNextLevel(instance.placement.levelId);
            if (!endLevel) {
              // Skip columns on top level with a warning (not an error)
              errors.push(`Column instance ${instance.id} at level '${instance.placement.levelId}' skipped - no level above (top floor column)`);
              continue;
            }
          }

          const columnHeight = endLevel.elevation - level.elevation;
          if (columnHeight <= 0) {
            errors.push(`Invalid column height for instance ${instance.id} (${columnHeight}m)`);
            continue;
          }

          const isCircular = template.properties.diameter !== undefined;
          
          // Get column dimensions from template
          const diameter = typeof template.properties.diameter === 'number' ? template.properties.diameter : 
                          (template.properties as any).get?.('diameter');
          const width = typeof template.properties.width === 'number' ? template.properties.width : 
                       (template.properties as any).get?.('width');
          const height = typeof template.properties.height === 'number' ? template.properties.height : 
                        (template.properties as any).get?.('height');

          if (isCircular && (!diameter || diameter <= 0)) {
            errors.push(`Circular column template '${template.name}' has invalid diameter (${diameter})`);
            continue;
          }

          if (!isCircular && (!width || width <= 0 || !height || height <= 0)) {
            errors.push(`Rectangular column template '${template.name}' has invalid dimensions (width: ${width}, height: ${height})`);
            continue;
          }
          
          const result = calculateColumnConcrete({
            shape: isCircular ? 'circular' : 'rectangular',
            diameter,
            width,
            height,
            length: columnHeight,
            waste: settings.waste.concrete,
          });

          const takeoffLine: TakeoffLine = {
            id: `tof_${instance.id}_concrete`,
            sourceElementId: instance.id,
            trade: 'Concrete',
            resourceKey: 'concrete-class-a',
            quantity: roundVolume(result.volumeWithWaste, settings.rounding.concrete),
            unit: 'm³',
            formulaText: result.formulaText,
            inputsSnapshot: result.inputs,
            assumptions: [
              `Waste: ${(settings.waste.concrete * 100).toFixed(0)}%`,
              `Height: ${level.label} to ${endLevel.label} (${columnHeight.toFixed(2)}m)`,
            ],
            tags: [
              `type:column`,
              `template:${template.name}`,
              `level:${level.label}`,
              ...(instance.tags || []),
            ],
            calculatedAt: new Date(),
          };

          takeoffLines.push(takeoffLine);

        } else if (template.type === 'foundation') {
          // Foundation calculation
          const isMat = template.properties.thickness !== undefined;

          if (isMat) {
            // Mat foundation (like a slab)
            if (!instance.placement.gridRef || instance.placement.gridRef.length < 2) {
              errors.push(`Mat foundation instance ${instance.id} requires grid reference`);
              continue;
            }

            const [xRef, yRef] = instance.placement.gridRef;
            const [xStart, xEnd] = xRef.split('-');
            const [yStart, yEnd] = yRef.split('-');

            const x1 = getGridOffset(xStart, 'X');
            const x2 = getGridOffset(xEnd, 'X');
            const y1 = getGridOffset(yStart, 'Y');
            const y2 = getGridOffset(yEnd, 'Y');

            if (x1 === null || x2 === null || y1 === null || y2 === null) {
              errors.push(`Could not determine mat foundation area for instance ${instance.id}`);
              continue;
            }

            const width = Math.abs(x2 - x1);
            const height = Math.abs(y2 - y1);
            const area = width * height;

            const thickness = typeof template.properties.thickness === 'number' ? template.properties.thickness : 
                             (template.properties as any).get?.('thickness') || 0;

            if (thickness <= 0) {
              errors.push(`Mat foundation template '${template.name}' has invalid thickness (${thickness})`);
              continue;
            }

            const result = calculateSlabConcrete({
              thickness,
              area,
              waste: settings.waste.concrete,
            });

            const takeoffLine: TakeoffLine = {
              id: `tof_${instance.id}_concrete`,
              sourceElementId: instance.id,
              trade: 'Concrete',
              resourceKey: 'concrete-class-a',
              quantity: roundVolume(result.volumeWithWaste, settings.rounding.concrete),
              unit: 'm³',
              formulaText: result.formulaText,
              inputsSnapshot: result.inputs,
              assumptions: [`Waste: ${(settings.waste.concrete * 100).toFixed(0)}%`, `Type: Mat Foundation`],
              tags: [
                `type:foundation`,
                `subtype:mat`,
                `template:${template.name}`,
                `level:${level.label}`,
                ...(instance.tags || []),
              ],
              calculatedAt: new Date(),
            };

            takeoffLines.push(takeoffLine);

          } else {
            // Footing (box)
            const length = typeof template.properties.length === 'number' ? template.properties.length : 
                          (template.properties as any).get?.('length') || 0;
            const width = typeof template.properties.width === 'number' ? template.properties.width : 
                         (template.properties as any).get?.('width') || 0;
            const depth = typeof template.properties.depth === 'number' ? template.properties.depth : 
                         (template.properties as any).get?.('depth') || 0;

            if (length <= 0 || width <= 0 || depth <= 0) {
              errors.push(`Footing template '${template.name}' has invalid dimensions (length: ${length}, width: ${width}, depth: ${depth})`);
              continue;
            }

            const result = calculateFootingConcrete({
              length,
              width,
              depth,
              waste: settings.waste.concrete,
            });

            const takeoffLine: TakeoffLine = {
              id: `tof_${instance.id}_concrete`,
              sourceElementId: instance.id,
              trade: 'Concrete',
              resourceKey: 'concrete-class-a',
              quantity: roundVolume(result.volumeWithWaste, settings.rounding.concrete),
              unit: 'm³',
              formulaText: result.formulaText,
              inputsSnapshot: result.inputs,
              assumptions: [`Waste: ${(settings.waste.concrete * 100).toFixed(0)}%`, `Type: Isolated Footing`],
              tags: [
                `type:foundation`,
                `subtype:footing`,
                `template:${template.name}`,
                `level:${level.label}`,
                ...(instance.tags || []),
              ],
              calculatedAt: new Date(),
            };

            takeoffLines.push(takeoffLine);
          }
        }
      } catch (error) {
        errors.push(`Error calculating instance ${instance.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Calculate summary
    const totalConcrete = takeoffLines.reduce((sum, line) => sum + line.quantity, 0);

    const summary = {
      totalConcrete: roundVolume(totalConcrete, settings.rounding.concrete),
      elementCount: instances.length,
      takeoffLineCount: takeoffLines.length,
    };

    // Save as CalcRun
    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await CalcRun.create({
      runId,
      projectId: id,
      timestamp: new Date(),
      status: 'completed',
      summary,
      takeoffLines,
      boqLines: [], // Will be populated when BOQ is generated
      errors: errors.length > 0 ? errors : undefined,
    });

    return NextResponse.json({
      takeoffLines,
      summary,
      runId,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('POST /api/projects/:id/takeoff error:', error);
    return NextResponse.json(
      { error: 'Failed to generate takeoff' },
      { status: 500 }
    );
  }
}
