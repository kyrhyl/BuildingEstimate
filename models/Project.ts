import mongoose, { Schema, Model } from 'mongoose';
import type { ProjectModel, ProjectSettings, GridLine, Level, ElementTemplate, ElementInstance } from '@/types';

// Default project settings
const defaultSettings: ProjectSettings = {
  rounding: {
    concrete: 3,
    rebar: 2,
    formwork: 2,
  },
  waste: {
    concrete: 0.05, // 5%
    rebar: 0.03, // 3%
    formwork: 0.02, // 2%
  },
  lap: {
    defaultLapLength: 0.4, // 40cm
    minLapLength: 0.3,
    maxLapLength: 0.6,
  },
  units: 'metric',
};

const GridLineSchema = new Schema<GridLine>({
  label: { type: String, required: true },
  offset: { type: Number, required: true },
});

const LevelSchema = new Schema<Level>({
  label: { type: String, required: true },
  elevation: { type: Number, required: true },
});

const ElementTemplateSchema = new Schema<ElementTemplate>({
  id: { type: String, required: true },
  type: { type: String, enum: ['beam', 'slab', 'column', 'foundation'], required: true },
  name: { type: String, required: true },
  properties: { type: Map, of: Number, required: true },
  dpwhItemNumber: String,
  rebarConfig: {
    mainBars: {
      count: Number,
      diameter: Number,
    },
    stirrups: {
      diameter: Number,
      spacing: Number,
    },
  },
});

const ElementInstanceSchema = new Schema<ElementInstance>({
  id: { type: String, required: true },
  templateId: { type: String, required: true },
  placement: {
    gridRef: [String],
    levelId: { type: String, required: true },
    endLevelId: String,
    customGeometry: { type: Map, of: Number },
  },
  tags: [String],
});

const ProjectSchema = new Schema<ProjectModel>(
  {
    name: { type: String, required: true },
    description: String,
    settings: {
      type: {
        rounding: {
          concrete: Number,
          rebar: Number,
          formwork: Number,
        },
        waste: {
          concrete: Number,
          rebar: Number,
          formwork: Number,
        },
        lap: {
          defaultLapLength: Number,
          minLapLength: Number,
          maxLapLength: Number,
        },
        units: { type: String, enum: ['metric'], default: 'metric' },
      },
      default: defaultSettings,
    },
    gridX: [GridLineSchema],
    gridY: [GridLineSchema],
    levels: [LevelSchema],
    elementTemplates: [ElementTemplateSchema],
    elementInstances: [ElementInstanceSchema],
  },
  {
    timestamps: true,
  }
);

// Prevent model recompilation during hot reload
const Project: Model<ProjectModel> = 
  mongoose.models.Project || mongoose.model<ProjectModel>('Project', ProjectSchema);

export default Project;
