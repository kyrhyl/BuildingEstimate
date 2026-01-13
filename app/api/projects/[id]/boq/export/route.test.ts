/**
 * Tests for BOQ JSON Export API
 * 
 * Run with: npm test -- app/api/projects/[id]/boq/export/route.test.ts
 */

import { NextRequest } from 'next/server';
import { GET } from './route';
import type { ProjectModel, CalcRun, BOQLine } from '@/types';

// Mock MongoDB connection
jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock Project Model
jest.mock('@/models/Project', () => ({
  __esModule: true,
  default: {
    findById: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'test-project-1',
        name: 'Test Project',
        description: 'Test Description',
        settings: {
          rounding: { concrete: 3, rebar: 2, formwork: 3 },
          waste: { concrete: 0.05, rebar: 0.03, formwork: 0.02 },
          lap: { defaultLapLength: 0.6, minLapLength: 0.3, maxLapLength: 1.2 },
          units: 'metric' as const,
        },
      } as ProjectModel),
    }),
  },
}));

// Mock CalcRun Model
const mockBoqLines = [
  {
    id: 'boq-1',
    dpwhItemNumberRaw: '900 (1) a',
    description: 'Structural Concrete, Class A (Beams)',
    unit: 'Cubic Meter',
    quantity: 28.450,
    sourceTakeoffLineIds: ['takeoff-1', 'takeoff-2'],
    tags: ['category:Concrete', 'dpwh:900 (1) a', 'type:beam'],
  },
  {
    id: 'boq-2',
    dpwhItemNumberRaw: '902 (1) a2',
    description: 'Reinforcing Steel Bars, 12mm',
    unit: 'Kilogram',
    quantity: 845.23,
    sourceTakeoffLineIds: ['takeoff-3'],
    tags: ['category:Rebar', 'dpwh:902 (1) a2', 'diameter:12mm'],
  },
  {
    id: 'boq-3',
    dpwhItemNumberRaw: '901 (1)',
    description: 'Formwork for Beams',
    unit: 'Square Meter',
    quantity: 156.78,
    sourceTakeoffLineIds: ['takeoff-4'],
    tags: ['category:Formwork', 'dpwh:901 (1)', 'type:beam'],
  },
] as BOQLine[];

const mockCalcRun = {
  runId: 'test-run-1',
  projectId: 'test-project-1',
  timestamp: new Date('2026-01-08T10:00:00Z'),
  status: 'completed',
  summary: {
    totalConcrete: 45.678,
    totalRebar: 3245.67,
    totalFormwork: 234.56,
    takeoffLineCount: 25,
    boqLineCount: 3,
  },
  boqLines: mockBoqLines,
  takeoffLines: [
    {
      id: 'takeoff-1',
      sourceElementId: 'beam-1',
      resourceKey: 'concrete-class-a',
      quantity: 15.0,
      unit: 'm³',
      formulaText: 'width × height × length',
      inputsSnapshot: { width: 0.3, height: 0.5, length: 10.0 },
      assumptions: ['Waste: 5%'],
      tags: ['type:beam', 'level:2F'],
    },
  ],
} as CalcRun;

jest.mock('@/models/CalcRun', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockCalcRun),
    }),
  },
}));

describe('BOQ Export API', () => {
  const Project = require('@/models/Project').default;
  const CalcRunModel = require('@/models/CalcRun').default;

  describe('GET /api/projects/[id]/boq/export', () => {
    it('should export BOQ in standard format', async () => {
      const request = new NextRequest('http://localhost/api/projects/test-project-1/boq/export?format=standard');
      const response = await GET(request, { params: { id: 'test-project-1' } });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      
      expect(data).toHaveProperty('metadata');
      expect(data.metadata.projectId).toBe('test-project-1');
      expect(data.metadata.projectName).toBe('Test Project');
      
      expect(data).toHaveProperty('summary');
      expect(data.summary.totalConcrete).toBe(45.678);
      
      expect(data).toHaveProperty('boq');
      expect(data.boq.lines).toHaveLength(3);
      expect(data.boq.lines[0].itemNumber).toBe('900 (1) a');
    });

    it('should export BOQ in detailed format', async () => {
      const request = new NextRequest('http://localhost/api/projects/test-project-1/boq/export?format=detailed');
      const response = await GET(request, { params: { id: 'test-project-1' } });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      
      expect(data).toHaveProperty('metadata');
      expect(data.metadata.exportFormat).toBe('detailed');
      
      expect(data).toHaveProperty('project');
      expect(data.project.settings).toBeDefined();
      
      expect(data).toHaveProperty('takeoffLines');
      expect(data.takeoffLines).toHaveLength(1);
      
      expect(data.boq.lines[0]).toHaveProperty('sourceTakeoffLineIds');
    });

    it('should export BOQ in minimal format', async () => {
      const request = new NextRequest('http://localhost/api/projects/test-project-1/boq/export?format=minimal');
      const response = await GET(request, { params: { id: 'test-project-1' } });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      
      expect(data).toHaveProperty('project');
      expect(data.project).toBe('Test Project');
      
      expect(data).toHaveProperty('items');
      expect(data.items).toHaveLength(3);
      expect(data.items[0]).toHaveProperty('item');
      expect(data.items[0]).toHaveProperty('quantity');
    });

    it('should return 404 if project not found', async () => {
      Project.findById = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const request = new NextRequest('http://localhost/api/projects/nonexistent/boq/export');
      const response = await GET(request, { params: { id: 'nonexistent' } });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Project not found');
      
      // Restore mock
      Project.findById = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCalcRun),
      });
    });

    it('should return 404 if no BOQ data found', async () => {
      CalcRunModel.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      });

      const request = new NextRequest('http://localhost/api/projects/test-project-1/boq/export');
      const response = await GET(request, { params: { id: 'test-project-1' } });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('No BOQ data found for this project');
      
      // Restore mock
      CalcRunModel.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockCalcRun),
      });
    });

    it('should set correct content headers for download', async () => {
      const request = new NextRequest('http://localhost/api/projects/test-project-1/boq/export?format=standard');
      const response = await GET(request, { params: { id: 'test-project-1' } });

      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('BOQ_');
      expect(response.headers.get('Content-Disposition')).toContain('.json');
    });

    it('should group BOQ lines by category', async () => {
      const request = new NextRequest('http://localhost/api/projects/test-project-1/boq/export?format=standard');
      const response = await GET(request, { params: { id: 'test-project-1' } });

      const data = await response.json();
      
      expect(data.boq.categories).toHaveProperty('Concrete');
      expect(data.boq.categories).toHaveProperty('Rebar');
      expect(data.boq.categories).toHaveProperty('Formwork');
      
      expect(data.boq.categories.Concrete.count).toBeGreaterThan(0);
      expect(data.boq.categories.Concrete.totalQuantity).toBeGreaterThan(0);
      expect(data.boq.categories.Concrete.items).toBeInstanceOf(Array);
    });

    it('should export specific calc run when runId provided', async () => {
      const request = new NextRequest('http://localhost/api/projects/test-project-1/boq/export?runId=test-run-1&format=standard');
      const response = await GET(request, { params: { id: 'test-project-1' } });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.metadata.calcRunId).toBe('test-run-1');
    });
  });
});
