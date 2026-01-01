'use client';

import { useState, useEffect } from 'react';

interface Space {
  id: string;
  name: string;
  levelId: string;
  boundary: any;
  computed: {
    floorArea_m2: number;
    wallArea_m2: number;
    ceilingArea_m2: number;
  };
}

interface SpacesManagerProps {
  projectId: string;
  levels: { label: string }[];
  gridX: { label: string }[];
  gridY: { label: string }[];
}

export default function SpacesManager({ projectId, levels, gridX, gridY }: SpacesManagerProps) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    levelId: '',
    gridXStart: '',
    gridXEnd: '',
    gridYStart: '',
    gridYEnd: '',
  });

  useEffect(() => {
    loadSpaces();
  }, [projectId]);

  const loadSpaces = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/spaces`);
      const data = await res.json();
      setSpaces(data.spaces || []);
    } catch (error) {
      console.error('Error loading spaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/projects/${projectId}/spaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          boundary: {
            type: 'gridRect',
            data: {
              gridX: [formData.gridXStart, formData.gridXEnd],
              gridY: [formData.gridYStart, formData.gridYEnd],
            },
          },
        }),
      });

      if (res.ok) {
        loadSpaces();
        setFormData({
          name: '',
          levelId: '',
          gridXStart: '',
          gridXEnd: '',
          gridYStart: '',
          gridYEnd: '',
        });
      }
    } catch (error) {
      console.error('Error creating space:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this space?')) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/spaces?spaceId=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) loadSpaces();
    } catch (error) {
      console.error('Error deleting space:', error);
    }
  };

  const totalFloorArea = spaces.reduce((sum, s) => sum + (s.computed?.floorArea_m2 || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-600 mb-1">Total Spaces</div>
          <div className="text-2xl font-bold text-green-900">{spaces.length}</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-600 mb-1">Total Floor Area</div>
          <div className="text-2xl font-bold text-blue-900">{totalFloorArea.toFixed(1)} m²</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-purple-600 mb-1">Grid Lines</div>
          <div className="text-2xl font-bold text-purple-900">{gridX.length + gridY.length}</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-4">
          <div className="text-sm text-amber-600 mb-1">Levels</div>
          <div className="text-2xl font-bold text-amber-900">{levels.length}</div>
        </div>
      </div>

      {/* Create Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 mb-6 border border-green-200">
          <h3 className="font-semibold text-green-900 text-lg">Create New Space</h3>
          <p className="text-sm text-green-700 mt-1">Define a space by selecting grid boundaries</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Space Name</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
              <select
                value={formData.levelId}
                onChange={(e) => setFormData({ ...formData, levelId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="">Select Level</option>
                {levels.map((level) => (
                  <option key={level.label} value={level.label}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">X Start</label>
              <select
                value={formData.gridXStart}
                onChange={(e) => setFormData({ ...formData, gridXStart: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="">Select</option>
                {gridX.map((g) => (
                  <option key={g.label} value={g.label}>{g.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">X End</label>
              <select
                value={formData.gridXEnd}
                onChange={(e) => setFormData({ ...formData, gridXEnd: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="">Select</option>
                {gridX.map((g) => (
                  <option key={g.label} value={g.label}>{g.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Y Start</label>
              <select
                value={formData.gridYStart}
                onChange={(e) => setFormData({ ...formData, gridYStart: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="">Select</option>
                {gridY.map((g) => (
                  <option key={g.label} value={g.label}>{g.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Y End</label>
              <select
                value={formData.gridYEnd}
                onChange={(e) => setFormData({ ...formData, gridYEnd: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="">Select</option>
                {gridY.map((g) => (
                  <option key={g.label} value={g.label}>{g.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm transition-colors"
          >
            Create Space
          </button>
        </form>
      </div>

      {/* Spaces List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-lg">Spaces ({spaces.length})</h3>
        </div>

        {spaces.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 text-5xl mb-4">🏠</div>
            <p className="text-gray-500">No spaces defined yet</p>
            <p className="text-sm text-gray-400 mt-1">Create your first space using the form above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Floor Area (m²)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Wall Area (m²)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ceiling Area (m²)</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {spaces.map((space) => (
                  <tr key={space.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{space.name}</td>
                    <td className="px-6 py-4 text-gray-600">{space.levelId}</td>
                    <td className="px-6 py-4 text-right text-gray-900">{space.computed?.floorArea_m2.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-gray-600">{space.computed?.wallArea_m2.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-gray-600">{space.computed?.ceilingArea_m2.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDelete(space.id)}
                        className="text-red-600 hover:text-red-800 font-medium text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
