import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';
import CalcRun from '@/models/CalcRun';
import type { TakeoffLine, ElementInstance, ElementTemplate, GridLine, Level } from '@/types';
import { calculateBeamConcrete, calculateSlabConcrete, calculateColumnConcrete, calculateFootingConcrete, roundVolume } from '@/lib/math/concrete';
import { 
  calculateBeamMainBars, 
  calculateBeamStirrupsWeight, 
  calculateSlabMainBars,
  calculateColumnMainBars,
  calculateColumnTiesWeight,
  getDPWHRebarItem,
  getRebarGrade,
  calculateLapLength
} from '@/lib/math/rebar';
import { calculateBeamFormwork,
  calculateSlabFormwork,
  calculateRectangularColumnFormwork,
  calculateCircularColumnFormwork,
  calculateMatFormwork,
  calculateFootingFormwork,
  roundArea
} from '@/lib/math/formwork';
import { calculateFinishingWorks } from '@/lib/logic/calculateFinishes';
import { calculateRoofing } from '@/lib/logic/calculateRoofing';
import { calculateScheduleItems } from '@/lib/logic/calculateScheduleItems';

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

          // Rebar calculation for beam (if configured)
          if (template.rebarConfig) {
            // Main bars (longitudinal)
            if (template.rebarConfig.mainBars?.count && template.rebarConfig.mainBars.diameter) {
              const mainBarsResult = calculateBeamMainBars(
                template.rebarConfig.mainBars.diameter,
                template.rebarConfig.mainBars.count,
                length,
                settings.waste.rebar
              );

              const dpwhRebarItem = template.rebarConfig.dpwhRebarItem || 
                getDPWHRebarItem(template.rebarConfig.mainBars.diameter);

              takeoffLines.push({
                id: `tof_${instance.id}_rebar_main`,
                sourceElementId: instance.id,
                trade: 'Rebar',
                resourceKey: `rebar-${template.rebarConfig.mainBars.diameter}mm`,
                quantity: Math.round(mainBarsResult.weight * Math.pow(10, settings.rounding.rebar)) / Math.pow(10, settings.rounding.rebar),
                unit: 'kg',
                formulaText: mainBarsResult.formulaText,
                inputsSnapshot: mainBarsResult.inputs,
                assumptions: [`Waste: ${(settings.waste.rebar * 100).toFixed(0)}%`, `DPWH Item: ${dpwhRebarItem}`],
                tags: [
                  `type:beam`,
                  `rebar:main`,
                  `template:${template.name}`,
                  `level:${level.label}`,
                  `dpwh:${dpwhRebarItem}`,
                  ...(instance.tags || []),
                ],
                calculatedAt: new Date(),
              });
            }

            // Stirrups
            if (template.rebarConfig.stirrups) {
              const stirrupsResult = calculateBeamStirrupsWeight(
                template.rebarConfig.stirrups.diameter,
                template.rebarConfig.stirrups.spacing,
                length,
                width,
                height,
                settings.waste.rebar
              );

              const dpwhRebarItem = getDPWHRebarItem(template.rebarConfig.stirrups.diameter);

              takeoffLines.push({
                id: `tof_${instance.id}_rebar_stirrups`,
                sourceElementId: instance.id,
                trade: 'Rebar',
                resourceKey: `rebar-${template.rebarConfig.stirrups.diameter}mm`,
                quantity: Math.round(stirrupsResult.weight * Math.pow(10, settings.rounding.rebar)) / Math.pow(10, settings.rounding.rebar),
                unit: 'kg',
                formulaText: stirrupsResult.formulaText,
                inputsSnapshot: stirrupsResult.inputs,
                assumptions: [`Waste: ${(settings.waste.rebar * 100).toFixed(0)}%`, `DPWH Item: ${dpwhRebarItem}`],
                tags: [
                  `type:beam`,
                  `rebar:stirrups`,
                  `template:${template.name}`,
                  `level:${level.label}`,
                  `dpwh:${dpwhRebarItem}`,
                  ...(instance.tags || []),
                ],
                calculatedAt: new Date(),
              });
            }
          }

          // Formwork calculation for beam
          const formworkResult = calculateBeamFormwork(width, height, length);
          
          takeoffLines.push({
            id: `tof_${instance.id}_formwork`,
            sourceElementId: instance.id,
            trade: 'Formwork',
            resourceKey: 'formwork-beam',
            quantity: roundArea(formworkResult.area, settings.rounding.formwork),
            unit: 'm²',
            formulaText: formworkResult.formulaText,
            inputsSnapshot: formworkResult.inputs,
            assumptions: ['Contact area: bottom + 2 sides'],
            tags: [
              `type:beam`,
              `template:${template.name}`,
              `level:${level.label}`,
              ...(instance.tags || []),
            ],
            calculatedAt: new Date(),
          });

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

          // Rebar calculation for slab (if configured)
          if (template.rebarConfig) {
            const xLength = Math.abs(x2 - x1);
            const yLength = Math.abs(y2 - y1);

            // Main bars (typically in longer direction)
            if (template.rebarConfig.mainBars && template.rebarConfig.mainBars.diameter) {
              // Use spacing or calculate from count
              const spacing = template.rebarConfig.mainBars.count 
                ? yLength / (template.rebarConfig.mainBars.count - 1)
                : 0.15; // default 150mm spacing

              const mainBarsResult = calculateSlabMainBars(
                template.rebarConfig.mainBars.diameter,
                spacing,
                xLength, // bar length
                1, // single span for this panel
                settings.waste.rebar
              );

              const dpwhRebarItem = template.rebarConfig.dpwhRebarItem || 
                getDPWHRebarItem(template.rebarConfig.mainBars.diameter);

              takeoffLines.push({
                id: `tof_${instance.id}_rebar_main`,
                sourceElementId: instance.id,
                trade: 'Rebar',
                resourceKey: `rebar-${template.rebarConfig.mainBars.diameter}mm`,
                quantity: Math.round(mainBarsResult.weight * Math.pow(10, settings.rounding.rebar)) / Math.pow(10, settings.rounding.rebar),
                unit: 'kg',
                formulaText: mainBarsResult.formulaText,
                inputsSnapshot: mainBarsResult.inputs,
                assumptions: [`Waste: ${(settings.waste.rebar * 100).toFixed(0)}%`, `DPWH Item: ${dpwhRebarItem}`],
                tags: [
                  `type:slab`,
                  `rebar:main`,
                  `template:${template.name}`,
                  `level:${level.label}`,
                  `dpwh:${dpwhRebarItem}`,
                  ...(instance.tags || []),
                ],
                calculatedAt: new Date(),
              });
            }

            // Secondary bars (perpendicular direction)
            if (template.rebarConfig.secondaryBars) {
              const secondaryBarsResult = calculateSlabMainBars(
                template.rebarConfig.secondaryBars.diameter,
                template.rebarConfig.secondaryBars.spacing,
                yLength, // bar length in perpendicular direction
                1,
                settings.waste.rebar
              );

              const dpwhRebarItem = getDPWHRebarItem(template.rebarConfig.secondaryBars.diameter);

              takeoffLines.push({
                id: `tof_${instance.id}_rebar_secondary`,
                sourceElementId: instance.id,
                trade: 'Rebar',
                resourceKey: `rebar-${template.rebarConfig.secondaryBars.diameter}mm`,
                quantity: Math.round(secondaryBarsResult.weight * Math.pow(10, settings.rounding.rebar)) / Math.pow(10, settings.rounding.rebar),
                unit: 'kg',
                formulaText: secondaryBarsResult.formulaText,
                inputsSnapshot: secondaryBarsResult.inputs,
                assumptions: [`Waste: ${(settings.waste.rebar * 100).toFixed(0)}%`, `DPWH Item: ${dpwhRebarItem}`],
                tags: [
                  `type:slab`,
                  `rebar:secondary`,
                  `template:${template.name}`,
                  `level:${level.label}`,
                  `dpwh:${dpwhRebarItem}`,
                  ...(instance.tags || []),
                ],
                calculatedAt: new Date(),
              });
            }
          }

          // Formwork calculation for slab (soffit)
          const formworkResult = calculateSlabFormwork(area);
          
          takeoffLines.push({
            id: `tof_${instance.id}_formwork`,
            sourceElementId: instance.id,
            trade: 'Formwork',
            resourceKey: 'formwork-slab',
            quantity: roundArea(formworkResult.area, settings.rounding.formwork),
            unit: 'm²',
            formulaText: formworkResult.formulaText,
            inputsSnapshot: formworkResult.inputs,
            assumptions: ['Soffit formwork (bottom surface)'],
            tags: [
              `type:slab`,
              `template:${template.name}`,
              `level:${level.label}`,
              ...(instance.tags || []),
            ],
            calculatedAt: new Date(),
          });

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

          // Rebar calculation for column (if configured)
          if (template.rebarConfig) {
            // Main bars (longitudinal)
            if (template.rebarConfig.mainBars?.count && template.rebarConfig.mainBars.diameter) {
              const mainBarsResult = calculateColumnMainBars(
                template.rebarConfig.mainBars.diameter,
                template.rebarConfig.mainBars.count,
                columnHeight,
                settings.waste.rebar
              );

              const dpwhRebarItem = template.rebarConfig.dpwhRebarItem || 
                getDPWHRebarItem(template.rebarConfig.mainBars.diameter);

              takeoffLines.push({
                id: `tof_${instance.id}_rebar_main`,
                sourceElementId: instance.id,
                trade: 'Rebar',
                resourceKey: `rebar-${template.rebarConfig.mainBars.diameter}mm`,
                quantity: Math.round(mainBarsResult.weight * Math.pow(10, settings.rounding.rebar)) / Math.pow(10, settings.rounding.rebar),
                unit: 'kg',
                formulaText: mainBarsResult.formulaText,
                inputsSnapshot: mainBarsResult.inputs,
                assumptions: [`Waste: ${(settings.waste.rebar * 100).toFixed(0)}%`, `DPWH Item: ${dpwhRebarItem}`],
                tags: [
                  `type:column`,
                  `rebar:main`,
                  `template:${template.name}`,
                  `level:${level.label}`,
                  `dpwh:${dpwhRebarItem}`,
                  ...(instance.tags || []),
                ],
                calculatedAt: new Date(),
              });
            }

            // Ties
            if (template.rebarConfig.stirrups && width && height) {
              const tiesResult = calculateColumnTiesWeight(
                template.rebarConfig.stirrups.diameter,
                template.rebarConfig.stirrups.spacing,
                columnHeight,
                width,
                height,
                settings.waste.rebar
              );

              const dpwhRebarItem = getDPWHRebarItem(template.rebarConfig.stirrups.diameter);

              takeoffLines.push({
                id: `tof_${instance.id}_rebar_ties`,
                sourceElementId: instance.id,
                trade: 'Rebar',
                resourceKey: `rebar-${template.rebarConfig.stirrups.diameter}mm`,
                quantity: Math.round(tiesResult.weight * Math.pow(10, settings.rounding.rebar)) / Math.pow(10, settings.rounding.rebar),
                unit: 'kg',
                formulaText: tiesResult.formulaText,
                inputsSnapshot: tiesResult.inputs,
                assumptions: [`Waste: ${(settings.waste.rebar * 100).toFixed(0)}%`, `DPWH Item: ${dpwhRebarItem}`],
                tags: [
                  `type:column`,
                  `rebar:ties`,
                  `template:${template.name}`,
                  `level:${level.label}`,
                  `dpwh:${dpwhRebarItem}`,
                  ...(instance.tags || []),
                ],
                calculatedAt: new Date(),
              });
            }
          }

          // Formwork calculation for column
          let formworkResult;
          if (diameter) {
            // Circular column
            formworkResult = calculateCircularColumnFormwork(diameter, columnHeight);
          } else if (width && height) {
            // Rectangular column
            formworkResult = calculateRectangularColumnFormwork(width, height, columnHeight);
          }

          if (formworkResult) {
            takeoffLines.push({
              id: `tof_${instance.id}_formwork`,
              sourceElementId: instance.id,
              trade: 'Formwork',
              resourceKey: 'formwork-column',
              quantity: roundArea(formworkResult.area, settings.rounding.formwork),
              unit: 'm²',
              formulaText: formworkResult.formulaText,
              inputsSnapshot: formworkResult.inputs,
              assumptions: [diameter ? 'Cylindrical surface' : 'All 4 sides'],
              tags: [
                `type:column`,
                `template:${template.name}`,
                `level:${level.label}`,
                ...(instance.tags || []),
              ],
              calculatedAt: new Date(),
            });
          }

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

            // Mat foundation rebar calculations (if configured)
            if (template.rebarConfig) {
              const rebarConfig = template.rebarConfig;

              // Main bars (bottom mat)
              if (rebarConfig.mainBars?.diameter) {
                const diameter = rebarConfig.mainBars.diameter;
                const spacing = rebarConfig.mainBars.spacing || 0.15; // Default 150mm spacing

                // Main bars in one direction
                const mainBarsResult = calculateSlabMainBars(
                  diameter,
                  spacing,
                  width, // bar length
                  1, // single slab (already has full area)
                  settings.waste.rebar
                );

                const dpwhMainItem = rebarConfig.dpwhRebarItem || getDPWHRebarItem(diameter, false);

                const mainTakeoffLine: TakeoffLine = {
                  id: `tof_${instance.id}_rebar_main`,
                  sourceElementId: instance.id,
                  trade: 'Rebar',
                  resourceKey: `rebar-${diameter}mm`,
                  quantity: Math.round(mainBarsResult.weight * Math.pow(10, settings.rounding.rebar)) / Math.pow(10, settings.rounding.rebar),
                  unit: 'kg',
                  formulaText: mainBarsResult.formulaText,
                  inputsSnapshot: mainBarsResult.inputs,
                  assumptions: [
                    `Lap: ${calculateLapLength(diameter).toFixed(2)}m`,
                    `Waste: ${(settings.waste.rebar * 100).toFixed(0)}%`,
                    `DPWH Item: ${dpwhMainItem}`,
                    `Grade: ${getRebarGrade(diameter)}`,
                  ],
                  tags: [
                    `type:foundation`,
                    `subtype:mat`,
                    `template:${template.name}`,
                    `level:${level.label}`,
                    `rebar:main`,
                    `dpwh:${dpwhMainItem}`,
                    ...(instance.tags || []),
                  ],
                  calculatedAt: new Date(),
                };

                takeoffLines.push(mainTakeoffLine);
              }

              // Secondary bars (top mat - perpendicular direction)
              if (rebarConfig.secondaryBars?.diameter) {
                const diameter = rebarConfig.secondaryBars.diameter;
                const spacing = rebarConfig.secondaryBars.spacing || 0.15; // Default 150mm spacing

                const secondaryBarsResult = calculateSlabMainBars(
                  diameter,
                  spacing,
                  height, // bar length in perpendicular direction
                  1, // single slab
                  settings.waste.rebar
                );

                const dpwhSecondaryItem = rebarConfig.dpwhRebarItem || getDPWHRebarItem(diameter, false);

                const secondaryTakeoffLine: TakeoffLine = {
                  id: `tof_${instance.id}_rebar_secondary`,
                  sourceElementId: instance.id,
                  trade: 'Rebar',
                  resourceKey: `rebar-${diameter}mm`,
                  quantity: Math.round(secondaryBarsResult.weight * Math.pow(10, settings.rounding.rebar)) / Math.pow(10, settings.rounding.rebar),
                  unit: 'kg',
                  formulaText: secondaryBarsResult.formulaText,
                  inputsSnapshot: secondaryBarsResult.inputs,
                  assumptions: [
                    `Lap: ${calculateLapLength(diameter).toFixed(2)}m`,
                    `Waste: ${(settings.waste.rebar * 100).toFixed(0)}%`,
                    `DPWH Item: ${dpwhSecondaryItem}`,
                    `Grade: ${getRebarGrade(diameter)}`,
                  ],
                  tags: [
                    `type:foundation`,
                    `subtype:mat`,
                    `template:${template.name}`,
                    `level:${level.label}`,
                    `rebar:secondary`,
                    `dpwh:${dpwhSecondaryItem}`,
                    ...(instance.tags || []),
                  ],
                  calculatedAt: new Date(),
                };

                takeoffLines.push(secondaryTakeoffLine);
              }

              // Mat formwork (perimeter edges only)
              const matFormworkResult = calculateMatFormwork(width, height, thickness);
              
              const matFormworkLine: TakeoffLine = {
                id: `tof_${instance.id}_formwork`,
                sourceElementId: instance.id,
                trade: 'Formwork',
                resourceKey: 'formwork-mat',
                quantity: roundArea(matFormworkResult.area, settings.rounding.formwork || 2),
                unit: 'm²',
                formulaText: matFormworkResult.formulaText,
                inputsSnapshot: matFormworkResult.inputs,
                assumptions: [
                  'Perimeter edge formwork only (bottom in contact with soil)',
                ],
                tags: [
                  `type:foundation`,
                  `subtype:mat`,
                  `template:${template.name}`,
                  `level:${level.label}`,
                  ...(instance.tags || []),
                ],
                calculatedAt: new Date(),
              };

              takeoffLines.push(matFormworkLine);
            }

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

            // Foundation rebar calculations (if configured)
            if (template.rebarConfig) {
              const rebarConfig = template.rebarConfig;

              // Main bars (bottom mat)
              if (rebarConfig.mainBars?.diameter) {
                const diameter = rebarConfig.mainBars.diameter;
                const spacing = rebarConfig.mainBars.spacing || 0.15; // Default 150mm spacing

                // Main bars in length direction
                const mainBarsLength = calculateSlabMainBars(
                  diameter,
                  spacing,
                  length, // bar length
                  1, // single footing
                  settings.waste.rebar
                );

                const dpwhMainItem = rebarConfig.dpwhRebarItem || getDPWHRebarItem(diameter, false);

                const mainTakeoffLine: TakeoffLine = {
                  id: `tof_${instance.id}_rebar_main`,
                  sourceElementId: instance.id,
                  trade: 'Rebar',
                  resourceKey: `rebar-${diameter}mm`,
                  quantity: Math.round(mainBarsLength.weight * Math.pow(10, settings.rounding.rebar)) / Math.pow(10, settings.rounding.rebar),
                  unit: 'kg',
                  formulaText: mainBarsLength.formulaText,
                  inputsSnapshot: mainBarsLength.inputs,
                  assumptions: [
                    `Lap: ${calculateLapLength(diameter).toFixed(2)}m`,
                    `Waste: ${(settings.waste.rebar * 100).toFixed(0)}%`,
                    `DPWH Item: ${dpwhMainItem}`,
                    `Grade: ${getRebarGrade(diameter)}`,
                  ],
                  tags: [
                    `type:foundation`,
                    `subtype:footing`,
                    `template:${template.name}`,
                    `level:${level.label}`,
                    `rebar:main`,
                    `dpwh:${dpwhMainItem}`,
                    ...(instance.tags || []),
                  ],
                  calculatedAt: new Date(),
                };

                takeoffLines.push(mainTakeoffLine);
              }

              // Secondary bars (top mat - perpendicular direction)
              if (rebarConfig.secondaryBars?.diameter) {
                const diameter = rebarConfig.secondaryBars.diameter;
                const spacing = rebarConfig.secondaryBars.spacing || 0.15; // Default 150mm spacing

                const secondaryBarsWidth = calculateSlabMainBars(
                  diameter,
                  spacing,
                  width, // bar length in perpendicular direction
                  1, // single footing
                  settings.waste.rebar
                );

                const dpwhSecondaryItem = rebarConfig.dpwhRebarItem || getDPWHRebarItem(diameter, false);

                const secondaryTakeoffLine: TakeoffLine = {
                  id: `tof_${instance.id}_rebar_secondary`,
                  sourceElementId: instance.id,
                  trade: 'Rebar',
                  resourceKey: `rebar-${diameter}mm`,
                  quantity: Math.round(secondaryBarsWidth.weight * Math.pow(10, settings.rounding.rebar)) / Math.pow(10, settings.rounding.rebar),
                  unit: 'kg',
                  formulaText: secondaryBarsWidth.formulaText,
                  inputsSnapshot: secondaryBarsWidth.inputs,
                  assumptions: [
                    `Lap: ${calculateLapLength(diameter).toFixed(2)}m`,
                    `Waste: ${(settings.waste.rebar * 100).toFixed(0)}%`,
                    `DPWH Item: ${dpwhSecondaryItem}`,
                    `Grade: ${getRebarGrade(diameter)}`,
                  ],
                  tags: [
                    `type:foundation`,
                    `subtype:footing`,
                    `template:${template.name}`,
                    `level:${level.label}`,
                    `rebar:secondary`,
                    `dpwh:${dpwhSecondaryItem}`,
                    ...(instance.tags || []),
                  ],
                  calculatedAt: new Date(),
                };

                takeoffLines.push(secondaryTakeoffLine);
              }

              // Footing formwork (all 4 sides)
              const footingFormworkResult = calculateFootingFormwork(length, width, depth);
              
              const footingFormworkLine: TakeoffLine = {
                id: `tof_${instance.id}_formwork`,
                sourceElementId: instance.id,
                trade: 'Formwork',
                resourceKey: 'formwork-footing',
                quantity: roundArea(footingFormworkResult.area, settings.rounding.formwork || 2),
                unit: 'm²',
                formulaText: footingFormworkResult.formulaText,
                inputsSnapshot: footingFormworkResult.inputs,
                assumptions: [
                  'All 4 vertical sides (bottom in contact with soil)',
                ],
                tags: [
                  `type:foundation`,
                  `subtype:footing`,
                  `template:${template.name}`,
                  `level:${level.label}`,
                  ...(instance.tags || []),
                ],
                calculatedAt: new Date(),
              };

              takeoffLines.push(footingFormworkLine);
            }
          }
        }
      } catch (error) {
        errors.push(`Error calculating instance ${instance.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Calculate summary
    const concreteLines = takeoffLines.filter(line => line.trade === 'Concrete');
    const rebarLines = takeoffLines.filter(line => line.trade === 'Rebar');
    const formworkLines = takeoffLines.filter(line => line.trade === 'Formwork');
    
    const totalConcrete = concreteLines.reduce((sum, line) => sum + line.quantity, 0);
    const totalRebar = rebarLines.reduce((sum, line) => sum + line.quantity, 0);
    const totalFormwork = formworkLines.reduce((sum, line) => sum + line.quantity, 0);

    // ===================================
    // FINISHING WORKS CALCULATION
    // ===================================
    let totalFloorArea = 0;
    let totalWallArea = 0;
    let totalCeilingArea = 0;

    if (project.spaces && project.spaces.length > 0) {
      try {
        const finishesResult = calculateFinishingWorks({
          spaces: project.spaces || [],
          openings: project.openings || [],
          finishTypes: project.finishTypes || [],
          assignments: project.spaceFinishAssignments || [],
          levels: project.levels || [],
          gridX: project.gridX || [],
          gridY: project.gridY || [],
        });

        // Add finishing works takeoff lines
        takeoffLines.push(...finishesResult.takeoffLines);
        
        // Add any errors
        if (finishesResult.errors.length > 0) {
          errors.push(...finishesResult.errors);
        }

        // Update summary
        totalFloorArea = finishesResult.summary.totalFloorArea;
        totalWallArea = finishesResult.summary.totalWallArea;
        totalCeilingArea = finishesResult.summary.totalCeilingArea;
      } catch (error: any) {
        errors.push(`Finishing works calculation failed: ${error.message}`);
      }
    }

    // ===================================
    // ROOFING CALCULATION (Mode B)
    // ===================================
    let totalRoofArea = 0;
    let roofPlaneCount = 0;

    if (project.roofPlanes && project.roofPlanes.length > 0) {
      try {
        const roofingResult = await calculateRoofing(project);

        // Add roofing takeoff lines
        takeoffLines.push(...roofingResult.takeoffLines);

        // Add any errors
        if (roofingResult.errors.length > 0) {
          errors.push(...roofingResult.errors);
        }

        // Update summary
        totalRoofArea = roofingResult.summary.totalRoofArea_m2;
        roofPlaneCount = roofingResult.summary.roofPlaneCount;
      } catch (error: any) {
        errors.push(`Roofing calculation failed: ${error.message}`);
      }
    }

    // ===================================
    // SCHEDULE ITEMS CALCULATION (Mode C)
    // ===================================
    let scheduleItemCount = 0;

    if (project.scheduleItems && project.scheduleItems.length > 0) {
      try {
        const scheduleResult = await calculateScheduleItems(project);

        // Add schedule takeoff lines
        takeoffLines.push(...scheduleResult.takeoffLines);

        // Add any errors
        if (scheduleResult.errors.length > 0) {
          errors.push(...scheduleResult.errors);
        }

        // Update summary
        scheduleItemCount = scheduleResult.summary.totalItems;
      } catch (error: any) {
        errors.push(`Schedule items calculation failed: ${error.message}`);
      }
    }

    const summary = {
      totalConcrete: roundVolume(totalConcrete, settings.rounding.concrete),
      totalRebar: Math.round(totalRebar * Math.pow(10, settings.rounding.rebar)) / Math.pow(10, settings.rounding.rebar),
      totalFormwork: roundArea(totalFormwork, settings.rounding.formwork || 2),
      totalFloorArea: Number(totalFloorArea.toFixed(2)),
      totalWallArea: Number(totalWallArea.toFixed(2)),
      totalCeilingArea: Number(totalCeilingArea.toFixed(2)),
      totalRoofArea: Number(totalRoofArea.toFixed(2)),
      elementCount: instances.length,
      spaceCount: project.spaces?.length || 0,
      roofPlaneCount,
      scheduleItemCount,
      takeoffLineCount: takeoffLines.length,
      boqLineCount: 0, // Will be updated when BOQ is generated
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
