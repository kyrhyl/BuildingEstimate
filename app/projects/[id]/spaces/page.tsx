'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Space, Level, GridLine, GridRectBoundary } from '@/types';

export default function SpacesPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [gridX, setGridX] = useState<GridLine[]>([]);
  const [gridY, setGridY] = useState<GridLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    levelId: '',
    boundaryType: 'gridRect' as 'gridRect' | 'polygon',
    gridXStart: '',
    gridXEnd: '',
    gridYStart: '',
    gridYEnd: '',
    tags: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load project data
      const projectRes = await fetch(`/api/projects/${projectId}`);
      const projectData = await projectRes.json();
      
      setLevels(projectData.data.levels || []);
      setGridX(projectData.data.gridX || []);
      setGridY(projectData.data.gridY || []);

      // Load spaces
      const spacesRes = await fetch(`/api/projects/${projectId}/spaces`);
      const spacesData = await spacesRes.json();
      setSpaces(spacesData.spaces || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const boundary: { type: 'gridRect' | 'polygon'; data: any } = {
      type: formData.boundaryType,
      data:
        formData.boundaryType === 'gridRect'
          ? {
              gridX: [formData.gridXStart, formData.gridXEnd],
              gridY: [formData.gridYStart, formData.gridYEnd],
            }
          : { points: [] },
    };

    const body = {
      name: formData.name,
      levelId: formData.levelId,
      boundary,
      tags: formData.tags,
    };

    try {
      if (editingSpace) {
        await fetch(`/api/projects/${projectId}/spaces/${editingSpace.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        await fetch(`/api/projects/${projectId}/spaces`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      setShowCreateForm(false);
      setEditingSpace(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving space:', error);
      alert('Failed to save space');
    }
  };

  const handleDelete = async (spaceId: string) => {
    if (!confirm('Delete this space? This will also delete related finish assignments.')) {
      return;
    }

    try {
      await fetch(`/api/projects/${projectId}/spaces/${spaceId}`, {
        method: 'DELETE',
      });
      loadData();
    } catch (error) {
      console.error('Error deleting space:', error);
      alert('Failed to delete space');
    }
  };

  const handleEdit = (space: Space) => {
    setEditingSpace(space);
    setShowCreateForm(true);

    if (space.boundary.type === 'gridRect') {
      const data = space.boundary.data as GridRectBoundary;
      setFormData({
        name: space.name,
        levelId: space.levelId,
        boundaryType: 'gridRect',
        gridXStart: data.gridX[0],
        gridXEnd: data.gridX[1],
        gridYStart: data.gridY[0],
        gridYEnd: data.gridY[1],
        tags: space.tags || [],
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      levelId: '',
      boundaryType: 'gridRect',
      gridXStart: '',
      gridXEnd: '',
      gridYStart: '',
      gridYEnd: '',
      tags: [],
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">Loading spaces...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Breadcrumb */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="text-sm text-gray-600 hover:text-gray-900 mb-2 flex items-center gap-1"
          >
            ← Back to Project
          </button>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded">
                  PART E - MODE A
                </span>
                <span className="text-xs text-gray-500">Surface-Based Estimation</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Space Management</h1>
              <p className="text-gray-600 mt-2">
                Define room boundaries and calculate floor, wall, and ceiling areas
              </p>
            </div>
            <button
              onClick={() => {
                setShowCreateForm(true);
                setEditingSpace(null);
                resetForm();
              }}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Space
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Total Spaces</div>
            <div className="text-2xl font-bold text-gray-900">{spaces.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Total Floor Area</div>
            <div className="text-2xl font-bold text-gray-900">
              {spaces.reduce((sum, s) => sum + s.computed.area_m2, 0).toLocaleString()} m²
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Grid Lines</div>
            <div className="text-2xl font-bold text-gray-900">
              {gridX.length} × {gridY.length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Levels</div>
            <div className="text-2xl font-bold text-gray-900">{levels.length}</div>
          </div>
        </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingSpace ? '✏️ Edit Space' : '➕ Create New Space'}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Space Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., Living Room, Bedroom 1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Level *
                </label>
                <select
                  value={formData.levelId}
                  onChange={(e) => setFormData({ ...formData, levelId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Level</option>
                  {levels.map((level) => (
                    <option key={level.label} value={level.label}>
                      {level.label} ({level.elevation}m)
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Boundary Type
              </label>
              <select
                value={formData.boundaryType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    boundaryType: e.target.value as 'gridRect' | 'polygon',
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="gridRect">Grid Rectangle (Recommended)</option>
                <option value="polygon" disabled>
                  Polygon - Coming Soon
                </option>
              </select>
            </div>

            {formData.boundaryType === 'gridRect' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grid X Axis (Start → End) *
                  </label>
                  <div className="flex gap-2 items-center">
                    <select
                      value={formData.gridXStart}
                      onChange={(e) => setFormData({ ...formData, gridXStart: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
                      <option value="">Start</option>
                      {gridX.map((grid) => (
                        <option key={grid.label} value={grid.label}>
                          {grid.label}
                        </option>
                      ))}
                    </select>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <select
                      value={formData.gridXEnd}
                      onChange={(e) => setFormData({ ...formData, gridXEnd: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
                      <option value="">End</option>
                      {gridX.map((grid) => (
                        <option key={grid.label} value={grid.label}>
                          {grid.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grid Y Axis (Start → End) *
                  </label>
                  <div className="flex gap-2 items-center">
                    <select
                      value={formData.gridYStart}
                      onChange={(e) => setFormData({ ...formData, gridYStart: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
                      <option value="">Start</option>
                      {gridY.map((grid) => (
                        <option key={grid.label} value={grid.label}>
                          {grid.label}
                        </option>
                      ))}
                    </select>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <select
                      value={formData.gridYEnd}
                      onChange={(e) => setFormData({ ...formData, gridYEnd: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
                      <option value="">End</option>
                      {gridY.map((grid) => (
                        <option key={grid.label} value={grid.label}>
                          {grid.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>

            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
              <button
                type="submit"
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm"
              >
                {editingSpace ? 'Update Space' : 'Create Space'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingSpace(null);
                  resetForm();
                }}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Spaces Grid/Cards */}
      {spaces.length === 0 && !showCreateForm ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No spaces defined yet</h3>
          <p className="text-gray-600 mb-6">Get started by creating your first space</p>
          <button
            onClick={() => {
              setShowCreateForm(true);
              setEditingSpace(null);
              resetForm();
            }}
            className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create First Space
          </button>
        </div>
      ) : spaces.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Space Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Area (m²)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Perimeter (m)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Boundary
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {spaces.map((space) => (
                  <tr key={space.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{space.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{space.levelId}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        {space.computed.area_m2.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm text-gray-600">
                        {space.computed.perimeter_m.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {space.boundary.type === 'gridRect' && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {(space.boundary.data as GridRectBoundary).gridX.join('-')} ×{' '}
                          {(space.boundary.data as GridRectBoundary).gridY.join('-')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(space)}
                          className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(space.id)}
                          className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  </div>
  );
}
