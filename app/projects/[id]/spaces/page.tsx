'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { Space, Level, GridLine, GridRectBoundary } from '@/types';

export default function SpacesPage() {
  const params = useParams();
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
      
      setLevels(projectData.project.levels || []);
      setGridX(projectData.project.gridX || []);
      setGridY(projectData.project.gridY || []);

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
    return <div className="p-8">Loading spaces...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Spaces</h1>
        <button
          onClick={() => {
            setShowCreateForm(true);
            setEditingSpace(null);
            resetForm();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + New Space
        </button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="mb-6 p-4 border border-gray-300 rounded bg-gray-50">
          <h2 className="text-lg font-semibold mb-4">
            {editingSpace ? 'Edit Space' : 'Create New Space'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Space Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Level</label>
              <select
                value={formData.levelId}
                onChange={(e) => setFormData({ ...formData, levelId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
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

            <div>
              <label className="block text-sm font-medium mb-1">Boundary Type</label>
              <select
                value={formData.boundaryType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    boundaryType: e.target.value as 'gridRect' | 'polygon',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded"
              >
                <option value="gridRect">Grid Rectangle</option>
                <option value="polygon" disabled>
                  Polygon (Coming Soon)
                </option>
              </select>
            </div>

            {formData.boundaryType === 'gridRect' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Grid X (Start - End)</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.gridXStart}
                      onChange={(e) => setFormData({ ...formData, gridXStart: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded"
                      required
                    >
                      <option value="">Start</option>
                      {gridX.map((grid) => (
                        <option key={grid.label} value={grid.label}>
                          {grid.label}
                        </option>
                      ))}
                    </select>
                    <span className="py-2">-</span>
                    <select
                      value={formData.gridXEnd}
                      onChange={(e) => setFormData({ ...formData, gridXEnd: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded"
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
                  <label className="block text-sm font-medium mb-1">Grid Y (Start - End)</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.gridYStart}
                      onChange={(e) => setFormData({ ...formData, gridYStart: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded"
                      required
                    >
                      <option value="">Start</option>
                      {gridY.map((grid) => (
                        <option key={grid.label} value={grid.label}>
                          {grid.label}
                        </option>
                      ))}
                    </select>
                    <span className="py-2">-</span>
                    <select
                      value={formData.gridYEnd}
                      onChange={(e) => setFormData({ ...formData, gridYEnd: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded"
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
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
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
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Spaces Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 border-b text-left">Name</th>
              <th className="px-4 py-2 border-b text-left">Level</th>
              <th className="px-4 py-2 border-b text-right">Area (m²)</th>
              <th className="px-4 py-2 border-b text-right">Perimeter (m)</th>
              <th className="px-4 py-2 border-b text-left">Boundary</th>
              <th className="px-4 py-2 border-b text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {spaces.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No spaces defined. Click "New Space" to create one.
                </td>
              </tr>
            ) : (
              spaces.map((space) => (
                <tr key={space.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border-b">{space.name}</td>
                  <td className="px-4 py-2 border-b">{space.levelId}</td>
                  <td className="px-4 py-2 border-b text-right">
                    {space.computed.area_m2.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 border-b text-right">
                    {space.computed.perimeter_m.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 border-b">
                    {space.boundary.type === 'gridRect' && (
                      <span className="text-sm text-gray-600">
                        Grid: {(space.boundary.data as GridRectBoundary).gridX.join('-')} ×{' '}
                        {(space.boundary.data as GridRectBoundary).gridY.join('-')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 border-b text-center">
                    <button
                      onClick={() => handleEdit(space)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(space.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
