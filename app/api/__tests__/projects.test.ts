/**
 * INTEGRATION TESTS FOR PROJECTS API
 * Tests for /api/projects and /api/projects/[id] endpoints
 */

import { NextRequest } from 'next/server';
import { GET as getProjects, POST as createProject } from '../projects/route';
import { GET as getProject, PUT as updateProject, DELETE as deleteProject } from '../projects/[id]/route';
import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';

// Mock the database connection
jest.mock('@/lib/mongodb');
jest.mock('@/models/Project');

const mockDbConnect = dbConnect as jest.MockedFunction<typeof dbConnect>;

describe('Projects API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDbConnect.mockResolvedValue(undefined);
  });

  describe('GET /api/projects', () => {
    it('should return all projects successfully', async () => {
      const mockProjects = [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'Test Project 1',
          description: 'Description 1',
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-02'),
        },
        {
          _id: '507f1f77bcf86cd799439012',
          name: 'Test Project 2',
          description: 'Description 2',
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-03'),
        },
      ];

      const mockFind = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockProjects),
        }),
      });

      (Project.find as jest.Mock) = mockFind;

      const request = new NextRequest('http://localhost:3000/api/projects');
      const response = await getProjects(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].name).toBe('Test Project 1');
      expect(data.timestamp).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      const mockFind = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockRejectedValue(new Error('Database connection failed')),
        }),
      });

      (Project.find as jest.Mock) = mockFind;

      const request = new NextRequest('http://localhost:3000/api/projects');
      const response = await getProjects(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /api/projects', () => {
    it('should create a project with valid data', async () => {
      const newProject = {
        _id: '507f1f77bcf86cd799439011',
        name: 'New Project',
        description: 'Test description',
        gridX: [],
        gridY: [],
        levels: [],
        elementTemplates: [],
        elementInstances: [],
      };

      (Project.create as jest.Mock) = jest.fn().mockResolvedValue(newProject);

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Project',
          description: 'Test description',
        }),
      });

      const response = await createProject(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('New Project');
      expect(data.data.description).toBe('Test description');
    });

    it('should reject project without name', async () => {
      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          description: 'Test description',
        }),
      });

      const response = await createProject(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation error');
      expect(data.details).toBeDefined();
      expect(Array.isArray(data.details)).toBe(true);
    });

    it('should reject project with empty name', async () => {
      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: '',
          description: 'Test',
        }),
      });

      const response = await createProject(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation error');
    });

    it('should reject project with name too long', async () => {
      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'a'.repeat(201),
          description: 'Test',
        }),
      });

      const response = await createProject(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject project with description too long', async () => {
      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Valid Name',
          description: 'a'.repeat(1001),
        }),
      });

      const response = await createProject(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should use default description when not provided', async () => {
      const newProject = {
        _id: '507f1f77bcf86cd799439011',
        name: 'New Project',
        description: '',
        gridX: [],
        gridY: [],
        levels: [],
        elementTemplates: [],
        elementInstances: [],
      };

      (Project.create as jest.Mock) = jest.fn().mockResolvedValue(newProject);

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Project',
        }),
      });

      const response = await createProject(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.description).toBe('');
    });

    it('should handle invalid JSON body', async () => {
      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await createProject(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/projects/[id]', () => {
    it('should return project by ID', async () => {
      const mockProject = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test Project',
        description: 'Test description',
      };

      (Project.findById as jest.Mock) = jest.fn().mockResolvedValue(mockProject);

      const request = new NextRequest('http://localhost:3000/api/projects/507f1f77bcf86cd799439011');
      const params = { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) };
      
      const response = await getProject(request, params);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Test Project');
    });

    it('should return 404 for non-existent project', async () => {
      (Project.findById as jest.Mock) = jest.fn().mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/projects/507f1f77bcf86cd799439011');
      const params = { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) };
      
      const response = await getProject(request, params);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Project not found');
    });

    it('should reject invalid ObjectId format', async () => {
      const request = new NextRequest('http://localhost:3000/api/projects/invalid-id');
      const params = { params: Promise.resolve({ id: 'invalid-id' }) };
      
      const response = await getProject(request, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid project ID');
    });
  });

  describe('PUT /api/projects/[id]', () => {
    it('should update project with valid data', async () => {
      const updatedProject = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Updated Project',
        description: 'Updated description',
      };

      (Project.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(updatedProject);

      const request = new NextRequest('http://localhost:3000/api/projects/507f1f77bcf86cd799439011', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Project',
          description: 'Updated description',
        }),
      });
      const params = { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) };
      
      const response = await updateProject(request, params);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated Project');
    });

    it('should return 404 when updating non-existent project', async () => {
      (Project.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/projects/507f1f77bcf86cd799439011', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Project',
        }),
      });
      const params = { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) };
      
      const response = await updateProject(request, params);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should reject invalid update data', async () => {
      const request = new NextRequest('http://localhost:3000/api/projects/507f1f77bcf86cd799439011', {
        method: 'PUT',
        body: JSON.stringify({
          name: '',  // Invalid: empty name
        }),
      });
      const params = { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) };
      
      const response = await updateProject(request, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should allow partial updates', async () => {
      const updatedProject = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Original Name',
        description: 'Updated description only',
      };

      (Project.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(updatedProject);

      const request = new NextRequest('http://localhost:3000/api/projects/507f1f77bcf86cd799439011', {
        method: 'PUT',
        body: JSON.stringify({
          description: 'Updated description only',
        }),
      });
      const params = { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) };
      
      const response = await updateProject(request, params);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('DELETE /api/projects/[id]', () => {
    it('should delete project successfully', async () => {
      const deletedProject = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Deleted Project',
      };

      (Project.findByIdAndDelete as jest.Mock) = jest.fn().mockResolvedValue(deletedProject);

      const request = new NextRequest('http://localhost:3000/api/projects/507f1f77bcf86cd799439011', {
        method: 'DELETE',
      });
      const params = { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) };
      
      const response = await deleteProject(request, params);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.deleted).toBe(true);
      expect(data.data.id).toBe('507f1f77bcf86cd799439011');
    });

    it('should return 404 when deleting non-existent project', async () => {
      (Project.findByIdAndDelete as jest.Mock) = jest.fn().mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/projects/507f1f77bcf86cd799439011', {
        method: 'DELETE',
      });
      const params = { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) };
      
      const response = await deleteProject(request, params);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Project not found');
    });

    it('should reject invalid ObjectId on delete', async () => {
      const request = new NextRequest('http://localhost:3000/api/projects/invalid-id', {
        method: 'DELETE',
      });
      const params = { params: Promise.resolve({ id: 'invalid-id' }) };
      
      const response = await deleteProject(request, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});
