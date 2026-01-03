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
import CalcRunHistory from '@/components/CalcRunHistory';
import SpacesManager from '@/components/PartE/SpacesManager';
import WallSurfacesManager from '@/components/PartE/WallSurfacesManager';
import FinishesManager from '@/components/PartE/FinishesManager';
import RoofingManager from '@/components/PartE/RoofingManager';
import SchedulesManager from '@/components/SchedulesManager';
import EarthworkItems from '@/components/EarthworkItems';
import ExcavationStations from '@/components/ExcavationStations';
import StructureExcavation from '@/components/StructureExcavation';
import EmbankmentItems from '@/components/EmbankmentItems';

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

type DPWHPart = 'C' | 'D' | 'E' | 'F' | 'G';
type GlobalView = 'takeoff' | 'boq';
type Tab = 'overview' | 'grid' | 'levels' | 'templates' | 'instances' | 'history' | 'spaces' | 'wallSurfaces' | 'finishes' | 'roofing' | 'schedules' | 'clearing' | 'removal-trees' | 'removal-structures' | 'excavation' | 'structure-excavation' | 'embankment' | 'site-development' | 'takeoff' | 'boq';
type SectionTab = 'parts' | 'reports';

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [sectionTab, setSectionTab] = useState<SectionTab>('parts');
  const [activePart, setActivePart] = useState<DPWHPart | null>(null);
  const [activeGlobalView, setActiveGlobalView] = useState<GlobalView | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [takeoffLines, setTakeoffLines] = useState<any[]>([]);

  // Load saved state from localStorage on mount
  useEffect(() => {
    const savedPart = localStorage.getItem('activePart') as DPWHPart | null;
    const savedTab = localStorage.getItem('activeTab') as Tab | null;
    const savedSectionTab = localStorage.getItem('sectionTab') as SectionTab | null;
    
    if (savedPart) setActivePart(savedPart);
    else setActivePart('D'); // Default to Part D if no saved state
    
    if (savedTab) setActiveTab(savedTab);
    if (savedSectionTab) setSectionTab(savedSectionTab);
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    if (activePart) {
      localStorage.setItem('activePart', activePart);
    }
  }, [activePart]);

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('sectionTab', sectionTab);
  }, [sectionTab]);

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
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header - Clean Structure */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col">
          
          {/* Row 1: Project Title + Parts/Reports Toggle */}
          <div className="border-b border-gray-200 px-4 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/projects')}
                  className="text-blue-600 hover:underline text-sm"
                >
                  ← Back to Projects
                </button>
                <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
                {project.description && (
                  <p className="text-gray-500 text-sm truncate max-w-md">{project.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSectionTab('parts');
                    setActiveGlobalView(null);
                    if (!activePart) setActivePart('D');
                  }}
                  className={`px-4 py-1.5 rounded-md font-medium text-sm transition-all ${
                    sectionTab === 'parts'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🏗️ Parts
                </button>
                <button
                  onClick={() => {
                    setSectionTab('reports');
                    setActivePart(null);
                    if (!activeGlobalView) setActiveGlobalView('takeoff');
                  }}
                  className={`px-4 py-1.5 rounded-md font-medium text-sm transition-all ${
                    sectionTab === 'reports'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📊 Reports
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: DPWH Parts or Reports Selector */}
          <div>
            {sectionTab === 'parts' ? (
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-semibold text-gray-700 whitespace-nowrap mr-2">DPWH Vol. III:</span>
                  {[
                    { id: 'C', label: 'Part C - Earthworks', color: 'amber' },
                    { id: 'D', label: 'Part D - Concrete & Reinforcement', color: 'blue' },
                    { id: 'E', label: 'Part E - Finishing & Other Civil Works', color: 'green' },
                    { id: 'F', label: 'Part F - Electrical', color: 'yellow' },
                    { id: 'G', label: 'Part G - Mechanical', color: 'purple' },
                  ].map((part) => (
                    <button
                      key={part.id}
                      onClick={() => {
                        setActivePart(part.id as DPWHPart);
                        // Set default tab based on part
                        if (part.id === 'C') {
                          setActiveTab('clearing');
                        } else {
                          setActiveTab('overview');
                        }
                      }}
                      className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all shadow-sm ${
                        activePart === part.id
                          ? part.color === 'amber' ? 'bg-amber-500 text-white ring-2 ring-amber-300 shadow-md'
                          : part.color === 'blue' ? 'bg-blue-500 text-white ring-2 ring-blue-300 shadow-md'
                          : part.color === 'green' ? 'bg-green-500 text-white ring-2 ring-green-300 shadow-md'
                          : part.color === 'yellow' ? 'bg-yellow-500 text-white ring-2 ring-yellow-300 shadow-md'
                          : 'bg-purple-500 text-white ring-2 ring-purple-300 shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      {part.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-2.5 border-b border-indigo-200 flex items-center">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-indigo-700 whitespace-nowrap">Select Report:</span>
                  <button
                    onClick={() => setActiveGlobalView('takeoff')}
                    className={`px-3 py-4 rounded-md font-medium text-xs whitespace-nowrap transition-all ${
                      activeGlobalView === 'takeoff'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-300'
                    }`}
                  >
                    📊 Takeoff Summary
                  </button>
                  <button
                    onClick={() => setActiveGlobalView('boq')}
                    className={`px-3 py-4 rounded-md font-medium text-xs whitespace-nowrap transition-all ${
                      activeGlobalView === 'boq'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-300'
                    }`}
                  >
                    📋 Bill of Quantities
                  </button>
                  <span className="text-xs text-indigo-600 italic">• Aggregates from all DPWH parts</span>
                </div>
              </div>
            )}
          </div>

          {/* Row 3: Sub-navigation (Part-specific tabs) */}
          <div className="border-b border-gray-200 bg-white">
            {sectionTab === 'parts' && (
              <div className="overflow-x-auto">
                <nav className="flex gap-3 px-4 py-2 min-w-max">
                  {activePart === 'D' && (
                    <>
                      {[
                        { id: 'overview', label: 'Overview' },
                        { id: 'grid', label: 'Grid System' },
                        { id: 'levels', label: 'Levels' },
                        { id: 'templates', label: 'Element Templates' },
                        { id: 'instances', label: 'Element Instances' },
                        { id: 'history', label: 'Calc History' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as Tab)}
                          className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                            activeTab === tab.id
                              ? 'border-blue-600 text-blue-700'
                              : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </>
                  )}

                {activePart === 'E' && (
                  <>
                    <button
                      onClick={() => setActiveTab('overview')}
                      className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                        activeTab === 'overview'
                          ? 'border-green-600 text-green-700'
                          : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                      }`}
                    >
                      Overview
                    </button>
                    <button
                      onClick={() => setActiveTab('spaces')}
                      className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                        activeTab === 'spaces'
                          ? 'border-green-600 text-green-700'
                          : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                      }`}
                    >
                      Spaces (Mode A)
                    </button>
                    <button
                      onClick={() => setActiveTab('wallSurfaces')}
                      className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                        activeTab === 'wallSurfaces'
                          ? 'border-green-600 text-green-700'
                          : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                      }`}
                    >
                      Wall Surfaces (Mode A)
                    </button>
                    <button
                      onClick={() => setActiveTab('finishes')}
                      className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                        activeTab === 'finishes'
                          ? 'border-green-600 text-green-700'
                          : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                      }`}
                    >
                      Finishes (Mode A)
                    </button>
                    <button
                      onClick={() => setActiveTab('roofing')}
                      className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                        activeTab === 'roofing'
                          ? 'border-green-600 text-green-700'
                          : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                      }`}
                    >
                      Roofing (Mode B)
                    </button>
                    <button
                      onClick={() => setActiveTab('schedules')}
                      className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                        activeTab === 'schedules'
                          ? 'border-green-600 text-green-700'
                          : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                      }`}
                    >
                      Schedules (Mode C)
                    </button>
                  </>
                )}

                {activePart === 'C' && (
                  <>
                    <button
                      onClick={() => setActiveTab('clearing')}
                      className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                        activeTab === 'clearing'
                          ? 'border-amber-600 text-amber-700'
                          : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                      }`}
                    >
                      🌳 Clearing & Grubbing
                    </button>
                    <button
                      onClick={() => setActiveTab('removal-trees')}
                      className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                        activeTab === 'removal-trees'
                          ? 'border-amber-600 text-amber-700'
                          : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                      }`}
                    >
                      🪓 Removal of Trees
                    </button>
                    <button
                      onClick={() => setActiveTab('removal-structures')}
                      className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                        activeTab === 'removal-structures'
                          ? 'border-amber-600 text-amber-700'
                          : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                      }`}
                    >
                      🏚️ Removal of Structures
                    </button>
                    <button
                      onClick={() => setActiveTab('excavation')}
                      className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                        activeTab === 'excavation'
                          ? 'border-amber-600 text-amber-700'
                          : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                      }`}
                    >
                      ⛏️ Excavation
                    </button>
                    <button
                      onClick={() => setActiveTab('structure-excavation')}
                      className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                        activeTab === 'structure-excavation'
                          ? 'border-amber-600 text-amber-700'
                          : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                      }`}
                    >
                      🏗️ Structure Excavation
                    </button>
                    <button
                      onClick={() => setActiveTab('embankment')}
                      className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                        activeTab === 'embankment'
                          ? 'border-amber-600 text-amber-700'
                          : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                      }`}
                    >
                      🚧 Embankment
                    </button>
                    <button
                      onClick={() => setActiveTab('site-development')}
                      className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                        activeTab === 'site-development'
                          ? 'border-amber-600 text-amber-700'
                          : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                      }`}
                    >
                      🏗️ Site Development
                    </button>
                  </>
                )}

                  {activePart === 'F' && (
                    <div className="py-2 px-2 text-xs text-gray-500">
                      Coming Soon: Electrical estimation features
                    </div>
                  )}

                  {activePart === 'G' && (
                    <div className="py-2 px-2 text-xs text-gray-500">
                      Coming Soon: Mechanical estimation features
                    </div>
                  )}
                </nav>
              </div>
            )}
          </div>

        </div>
      </div>
      {/* End of Fixed Header */}

      {/* Spacer to push content below fixed header */}
      <div className="h-[190px]"></div>

      {/* Main Content */}
      <div className="px-8 pb-8">
        <div className="max-w-7xl mx-auto">
      {/* Tab Content */}
      
      {/* Part D Content */}
      {sectionTab === 'parts' && activePart === 'D' && (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h2 className="text-lg font-semibold text-blue-900 mb-2">Part D - Concrete & Reinforcement</h2>
                  <p className="text-sm text-blue-700">
                    Structural elements including beams, columns, slabs, footings, and reinforcement steel
                  </p>
                </div>
                
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

            {activeTab === 'history' && resolvedId && (
              <CalcRunHistory projectId={resolvedId} />
            )}
          </>
        )}

        {/* Part E Content */}
        {sectionTab === 'parts' && activePart === 'E' && (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h2 className="text-lg font-semibold text-green-900 mb-2">Part E - Finishing & Other Civil Works</h2>
                  <p className="text-sm text-green-700">
                    Finishes, roofing, doors, windows, hardware, and other architectural items
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Mode A: Surface-Based */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Mode A: Surface-Based</h3>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Area</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Floor, wall, and ceiling finishes calculated from space surfaces
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={() => setActiveTab('spaces')}
                        className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded text-sm"
                      >
                        Manage Spaces →
                      </button>
                      <button
                        onClick={() => setActiveTab('finishes')}
                        className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded text-sm"
                      >
                        Assign Finishes →
                      </button>
                    </div>
                  </div>

                  {/* Mode B: Roof-System-Based */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Mode B: Roof-System-Based</h3>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Slope</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Roofing materials with slope factor adjustments
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={() => setActiveTab('roofing')}
                        className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded text-sm"
                      >
                        Manage Roofing →
                      </button>
                      <div className="text-xs text-gray-500 px-2">
                        Roof Types: {project.roofTypes?.length || 0} | 
                        Planes: {project.roofPlanes?.length || 0}
                      </div>
                    </div>
                  </div>

                  {/* Mode C: Schedule-Based */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Mode C: Schedule-Based</h3>
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Direct Qty</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Doors, windows, hardware with direct quantity input
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={() => setActiveTab('schedules')}
                        className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded text-sm"
                      >
                        Manage Schedule Items →
                      </button>
                      <div className="text-xs text-gray-500 px-2">
                        Items: {project.scheduleItems?.length || 0}
                      </div>
                    </div>
                  </div>

                  {/* Takeoff & BOQ */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-4">Takeoff & BOQ</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Generate quantity takeoff and bill of quantities
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          setSectionTab('reports');
                          setActiveGlobalView('takeoff');
                        }}
                        className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded text-sm"
                      >
                        View Takeoff →
                      </button>
                      <button
                        onClick={() => {
                          setSectionTab('reports');
                          setActiveGlobalView('boq');
                        }}
                        className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded text-sm"
                      >
                        View BOQ →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Spaces Tab */}
            {activeTab === 'spaces' && resolvedId && (
              <SpacesManager
                projectId={resolvedId}
                levels={project.levels || []}
                gridX={project.gridX || []}
                gridY={project.gridY || []}
              />
            )}

            {/* Wall Surfaces Tab */}
            {activeTab === 'wallSurfaces' && resolvedId && (
              <WallSurfacesManager
                projectId={resolvedId}
                levels={project.levels || []}
                gridX={project.gridX || []}
                gridY={project.gridY || []}
              />
            )}

            {/* Finishes Tab */}
            {activeTab === 'finishes' && resolvedId && (
              <FinishesManager 
                projectId={resolvedId}
                gridX={project.gridX || []}
                gridY={project.gridY || []}
              />
            )}

            {/* Roofing Tab */}
            {activeTab === 'roofing' && resolvedId && (
              <RoofingManager projectId={resolvedId} />
            )}

            {/* Schedules Tab */}
            {activeTab === 'schedules' && resolvedId && (
              <SchedulesManager projectId={resolvedId} />
            )}
          </>
        )}

        {/* Global Views: Takeoff & BOQ */}
        {sectionTab === 'reports' && activeGlobalView === 'takeoff' && resolvedId && (
          <div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
              <h2 className="text-lg font-semibold text-indigo-900 mb-2">📊 Quantity Takeoff - All DPWH Parts</h2>
              <p className="text-sm text-indigo-700">
                Aggregated quantity takeoff from all parts: Earthworks, Concrete & Reinforcement, Finishing, Electrical, and Mechanical
              </p>
            </div>
            <TakeoffViewer 
              projectId={resolvedId}
              onTakeoffGenerated={setTakeoffLines}
            />
          </div>
        )}

        {sectionTab === 'reports' && activeGlobalView === 'boq' && resolvedId && (
          <div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
              <h2 className="text-lg font-semibold text-indigo-900 mb-2">📋 Bill of Quantities - DPWH Format</h2>
              <p className="text-sm text-indigo-700">
                Complete Bill of Quantities mapped to DPWH Volume III pay items from all project parts
              </p>
            </div>
            <BOQViewer 
              projectId={resolvedId}
              takeoffLines={takeoffLines}
            />
          </div>
        )}

        {/* Part C Content */}
        {sectionTab === 'parts' && activePart === 'C' && resolvedId && (
          <>
            {activeTab === 'clearing' && (
              <EarthworkItems
                projectId={resolvedId}
                category="clearing"
                title="Clearing & Grubbing"
                description="Clearing and grubbing of land area"
                filterKeywords={['clearing', 'grubbing']}
              />
            )}
            {activeTab === 'removal-trees' && (
              <EarthworkItems
                projectId={resolvedId}
                category="removal-trees"
                title="Removal of Trees"
                description="Removal, balling, and transplanting of trees"
                filterKeywords={['tree', 'trees', 'balling', 'transplant']}
              />
            )}
            {activeTab === 'removal-structures' && (
              <EarthworkItems
                projectId={resolvedId}
                category="removal-structures"
                title="Removal of Structures"
                description="Removal of existing structures, pavements, and obstructions"
                filterKeywords={['removal', 'structure', 'obstruction', 'pccp', 'acp', 'sidewalk', 'curb', 'pipe']}
              />
            )}
            {activeTab === 'excavation' && (
              <ExcavationStations projectId={resolvedId} />
            )}
            {activeTab === 'structure-excavation' && (
              <StructureExcavation projectId={resolvedId} />
            )}
            {activeTab === 'embankment' && (
              <EmbankmentItems projectId={resolvedId} />
            )}
            {activeTab === 'site-development' && (
              <EarthworkItems
                projectId={resolvedId}
                category="site-development"
                title="Site Development"
                description="Site development, grading, and subgrade preparation"
                filterKeywords={['site development', 'grading', 'subgrade']}
              />
            )}
          </>
        )}

        {/* Part F Content (Coming Soon) */}
        {sectionTab === 'parts' && activePart === 'F' && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Part F - Electrical</h2>
              <p className="text-gray-600 mb-6">
                Electrical systems, lighting, power distribution estimation features coming soon
              </p>
              <div className="text-sm text-gray-500 bg-gray-50 rounded p-4">
                <p className="font-medium mb-2">Planned Features:</p>
                <ul className="text-left space-y-1">
                  <li>• Lighting fixture schedules</li>
                  <li>• Power outlet layouts</li>
                  <li>• Conduit and wiring calculations</li>
                  <li>• Panel and switchgear estimates</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Part G Content (Coming Soon) */}
        {sectionTab === 'parts' && activePart === 'G' && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Part G - Mechanical</h2>
              <p className="text-gray-600 mb-6">
                HVAC, plumbing, fire protection estimation features coming soon
              </p>
              <div className="text-sm text-gray-500 bg-gray-50 rounded p-4">
                <p className="font-medium mb-2">Planned Features:</p>
                <ul className="text-left space-y-1">
                  <li>• HVAC equipment schedules</li>
                  <li>• Ductwork calculations</li>
                  <li>• Plumbing fixture counts</li>
                  <li>• Fire protection systems</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
