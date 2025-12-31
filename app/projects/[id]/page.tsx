'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectModel, GridLine, Level } from '@/types';
import GridEditor from '@/components/GridEditor';
import LevelsEditor from '@/components/LevelsEditor';
import ElementTemplatesEditor from '@/components/ElementTemplatesEditor';
import ElementInstancesEditor from '@/components/ElementInstancesEditor';
import TakeoffViewer from '@/components/TakeoffViewer';
import BOQViewer from '@/components/BOQViewer';

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

type Tab = 'overview' | 'grid' | 'levels' | 'templates' | 'instances' | 'takeoff' | 'boq';

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [takeoffLines, setTakeoffLines] = useState<any[]>([]);

  useEffect(() => {
    params.then((p) => setResolvedId(p.id));
  }, [params]);

  useEffect(() => {
    if (!resolvedId) return;
    fetchProject();
  }, [resolvedId]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${resolvedId}`);
      const result = await response.json();

      if (result.success) {
        setProject(result.data);
      } else {
        setError(result.error || 'Failed to load project');
      }
    } catch (err) {
      setError('Network error: Failed to fetch project');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGrid = async (gridX: GridLine[], gridY: GridLine[]) => {
    if (!resolvedId) return;
    
    const response = await fetch(`/api/projects/${resolvedId}/grid`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gridX, gridY }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to save grid');
    }

    // Refresh project data
    await fetchProject();
  };

  const handleSaveLevels = async (levels: Level[]) => {
    if (!resolvedId) return;
    
    const response = await fetch(`/api/projects/${resolvedId}/levels`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ levels }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to save levels');
    }

    // Refresh project data
    await fetchProject();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">Loading project...</div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error || 'Project not found'}
          </div>
          <button
            onClick={() => router.push('/projects')}
            className="mt-4 text-blue-600 hover:underline"
          >
            ← Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/projects')}
            className="text-blue-600 hover:underline mb-4"
          >
            ← Back to Projects
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
          {project.description && (
            <p className="text-gray-600 mt-2">{project.description}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'grid', label: 'Grid System' },
              { id: 'levels', label: 'Levels' },
              { id: 'templates', label: 'Templates' },
              { id: 'instances', label: 'Elements' },
              { id: 'takeoff', label: 'Takeoff' },
              { id: 'boq', label: 'BOQ' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Grid System */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Grid System</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">X-Axis Lines:</span>{' '}
                  <span className="font-medium">{project.gridX?.length || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Y-Axis Lines:</span>{' '}
                  <span className="font-medium">{project.gridY?.length || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Levels:</span>{' '}
                  <span className="font-medium">{project.levels?.length || 0}</span>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('grid')}
                className="mt-4 text-blue-600 hover:underline text-sm"
              >
                Edit Grid →
              </button>
            </div>

            {/* Element Templates */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Templates</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Total:</span>{' '}
                  <span className="font-medium">{project.elementTemplates?.length || 0}</span>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('templates')}
                className="mt-4 text-blue-600 hover:underline text-sm"
              >
                Manage Templates →
              </button>
            </div>

            {/* Element Instances */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Placed Elements</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Total:</span>{' '}
                  <span className="font-medium">{project.elementInstances?.length || 0}</span>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('instances')}
                className="mt-4 text-blue-600 hover:underline text-sm"
              >
                Place Elements →
              </button>
            </div>
          </div>
        )}

        {activeTab === 'grid' && (
          <GridEditor
            gridX={project.gridX || []}
            gridY={project.gridY || []}
            onSave={handleSaveGrid}
          />
        )}

        {activeTab === 'levels' && (
          <LevelsEditor
            levels={project.levels || []}
            onSave={handleSaveLevels}
          />
        )}

        {activeTab === 'templates' && resolvedId && (
          <ElementTemplatesEditor projectId={resolvedId} />
        )}

        {activeTab === 'instances' && resolvedId && (
          <ElementInstancesEditor 
            projectId={resolvedId}
            templates={project.elementTemplates || []}
            gridX={project.gridX || []}
            gridY={project.gridY || []}
            levels={project.levels || []}
          />
        )}

        {activeTab === 'takeoff' && resolvedId && (
          <TakeoffViewer 
            projectId={resolvedId}
            onTakeoffGenerated={setTakeoffLines}
          />
        )}

        {activeTab === 'boq' && resolvedId && (
          <BOQViewer 
            projectId={resolvedId}
            takeoffLines={takeoffLines}
          />
        )}
      </div>
    </div>
  );
}
