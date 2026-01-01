'use client';

/**
 * Roofing Management Page
 * UI for managing roof types and roof planes (Mode B)
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface RoofType {
  id: string;
  name: string;
  dpwhItemNumberRaw: string;
  unit: string;
  areaBasis: 'slopeArea' | 'planArea';
  lapAllowancePercent: number;
  wastePercent: number;
}

interface RoofPlane {
  id: string;
  name: string;
  levelId: string;
  boundary: {
    type: 'gridRect' | 'polygon';
    data: any;
  };
  slope: {
    mode: 'ratio' | 'degrees';
    value: number;
  };
  roofTypeId: string;
  computed: {
    planArea_m2: number;
    slopeFactor: number;
    slopeArea_m2: number;
  };
}

export default function RoofingPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [activeTab, setActiveTab] = useState<'types' | 'planes'>('types');
  const [roofTypes, setRoofTypes] = useState<RoofType[]>([]);
  const [roofPlanes, setRoofPlanes] = useState<RoofPlane[]>([]);
  const [levels, setLevels] = useState<{ label: string }[]>([]);
  const [gridX, setGridX] = useState<{ label: string }[]>([]);
  const [gridY, setGridY] = useState<{ label: string }[]>([]);
  const [catalogResults, setCatalogResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Roof Type Form State
  const [typeForm, setTypeForm] = useState({
    name: '',
    dpwhItemNumberRaw: '',
    unit: '',
    areaBasis: 'slopeArea' as 'slopeArea' | 'planArea',
    lapAllowancePercent: 0.10,
    wastePercent: 0.05,
  });

  // Roof Plane Form State
  const [planeForm, setPlaneForm] = useState({
    name: '',
    levelId: '',
    boundaryType: 'gridRect' as 'gridRect' | 'polygon',
    gridXStart: '',
    gridXEnd: '',
    gridYStart: '',
    gridYEnd: '',
    slopeMode: 'ratio' as 'ratio' | 'degrees',
    slopeValue: 0.25,
    roofTypeId: '',
  });

  useEffect(() => {
    fetchProject();
    fetchRoofTypes();
    fetchRoofPlanes();
  }, [projectId]);

  const fetchProject = async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.ok) {
      const data = await res.json();
      setLevels(data.data.levels || []);
      setGridX(data.data.gridX || []);
      setGridY(data.data.gridY || []);
    }
  };

  const fetchRoofTypes = async () => {
    const res = await fetch(`/api/projects/${projectId}/roof-types`);
    if (res.ok) {
      const data = await res.json();
      setRoofTypes(data.roofTypes);
    }
  };

  const fetchRoofPlanes = async () => {
    const res = await fetch(`/api/projects/${projectId}/roof-planes`);
    if (res.ok) {
      const data = await res.json();
      setRoofPlanes(data.roofPlanes);
    }
  };

  const searchCatalog = async (query: string) => {
    if (!query) {
      setCatalogResults([]);
      return;
    }
    const res = await fetch(`/api/catalog?query=${encodeURIComponent(query)}&trade=Roofing&limit=20`);
    if (res.ok) {
      const data = await res.json();
      setCatalogResults(data.results || []);
    }
  };

  const handleCreateRoofType = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/projects/${projectId}/roof-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(typeForm),
    });
    if (res.ok) {
      fetchRoofTypes();
      setTypeForm({
        name: '',
        dpwhItemNumberRaw: '',
        unit: '',
        areaBasis: 'slopeArea',
        lapAllowancePercent: 0.10,
        wastePercent: 0.05,
      });
      setCatalogResults([]);
      setSearchQuery('');
    } else {
      const error = await res.json();
      alert(`Error: ${error.error}`);
    }
  };

  const handleDeleteRoofType = async (id: string) => {
    if (!confirm('Delete this roof type?')) return;
    const res = await fetch(`/api/projects/${projectId}/roof-types?roofTypeId=${id}`, {
      method: 'DELETE',
    });
    if (res.ok) fetchRoofTypes();
  };

  const handleCreateRoofPlane = async (e: React.FormEvent) => {
    e.preventDefault();

    const boundary = {
      type: planeForm.boundaryType,
      data:
        planeForm.boundaryType === 'gridRect'
          ? {
              gridX: [planeForm.gridXStart, planeForm.gridXEnd],
              gridY: [planeForm.gridYStart, planeForm.gridYEnd],
            }
          : { points: [] },
    };

    const payload = {
      name: planeForm.name,
      levelId: planeForm.levelId,
      boundary,
      slope: {
        mode: planeForm.slopeMode,
        value: planeForm.slopeValue,
      },
      roofTypeId: planeForm.roofTypeId,
      tags: [],
    };

    const res = await fetch(`/api/projects/${projectId}/roof-planes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      fetchRoofPlanes();
      setPlaneForm({
        name: '',
        levelId: '',
        boundaryType: 'gridRect',
        gridXStart: '',
        gridXEnd: '',
        gridYStart: '',
        gridYEnd: '',
        slopeMode: 'ratio',
        slopeValue: 0.25,
        roofTypeId: '',
      });
    } else {
      const error = await res.json();
      alert(`Error: ${error.error}`);
    }
  };

  const handleDeleteRoofPlane = async (id: string) => {
    if (!confirm('Delete this roof plane?')) return;
    const res = await fetch(`/api/projects/${projectId}/roof-planes?roofPlaneId=${id}`, {
      method: 'DELETE',
    });
    if (res.ok) fetchRoofPlanes();
  };

  const selectCatalogItem = (item: any) => {
    setTypeForm({
      ...typeForm,
      dpwhItemNumberRaw: item.itemNumber,
      unit: item.unit,
    });
    setCatalogResults([]);
    setSearchQuery('');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Roofing Management (Mode B)</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('types')}
          className={`px-4 py-2 font-medium ${activeTab === 'types' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
        >
          Roof Types
        </button>
        <button
          onClick={() => setActiveTab('planes')}
          className={`px-4 py-2 font-medium ${activeTab === 'planes' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
        >
          Roof Planes
        </button>
      </div>

      {/* Tab: Roof Types */}
      {activeTab === 'types' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Create Roof Type Template</h2>
            <form onSubmit={handleCreateRoofType} className="space-y-4">
              <div>
                <label className="block font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={typeForm.name}
                  onChange={e => setTypeForm({ ...typeForm, name: e.target.value })}
                  className="border px-3 py-2 rounded w-full"
                  required
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Search DPWH Catalog (Roofing)</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    searchCatalog(e.target.value);
                  }}
                  placeholder="e.g., corrugated, metal sheet, clay tile"
                  className="border px-3 py-2 rounded w-full"
                />
                {catalogResults.length > 0 && (
                  <ul className="border mt-1 rounded max-h-48 overflow-auto bg-white">
                    {catalogResults.map((item, idx) => (
                      <li
                        key={idx}
                        onClick={() => selectCatalogItem(item)}
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                      >
                        <strong>{item.itemNumber}</strong>: {item.description} ({item.unit})
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">DPWH Item Number</label>
                  <input
                    type="text"
                    value={typeForm.dpwhItemNumberRaw}
                    onChange={e => setTypeForm({ ...typeForm, dpwhItemNumberRaw: e.target.value })}
                    className="border px-3 py-2 rounded w-full"
                    required
                    readOnly
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Unit</label>
                  <input
                    type="text"
                    value={typeForm.unit}
                    onChange={e => setTypeForm({ ...typeForm, unit: e.target.value })}
                    className="border px-3 py-2 rounded w-full"
                    required
                    readOnly
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-medium mb-1">Area Basis</label>
                  <select
                    value={typeForm.areaBasis}
                    onChange={e => setTypeForm({ ...typeForm, areaBasis: e.target.value as any })}
                    className="border px-3 py-2 rounded w-full"
                  >
                    <option value="slopeArea">Slope Area</option>
                    <option value="planArea">Plan Area</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Lap Allowance (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={typeForm.lapAllowancePercent * 100}
                    onChange={e => setTypeForm({ ...typeForm, lapAllowancePercent: parseFloat(e.target.value) / 100 })}
                    className="border px-3 py-2 rounded w-full"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Waste (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={typeForm.wastePercent * 100}
                    onChange={e => setTypeForm({ ...typeForm, wastePercent: parseFloat(e.target.value) / 100 })}
                    className="border px-3 py-2 rounded w-full"
                  />
                </div>
              </div>

              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
                Create Roof Type
              </button>
            </form>
          </div>

          {/* Roof Types Table */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Roof Types ({roofTypes.length})</h2>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-4 py-2 text-left">Name</th>
                  <th className="border px-4 py-2 text-left">DPWH Item</th>
                  <th className="border px-4 py-2 text-left">Unit</th>
                  <th className="border px-4 py-2 text-left">Area Basis</th>
                  <th className="border px-4 py-2 text-left">Lap %</th>
                  <th className="border px-4 py-2 text-left">Waste %</th>
                  <th className="border px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roofTypes.map(rt => (
                  <tr key={rt.id} className="hover:bg-gray-50">
                    <td className="border px-4 py-2">{rt.name}</td>
                    <td className="border px-4 py-2">{rt.dpwhItemNumberRaw}</td>
                    <td className="border px-4 py-2">{rt.unit}</td>
                    <td className="border px-4 py-2">{rt.areaBasis}</td>
                    <td className="border px-4 py-2">{(rt.lapAllowancePercent * 100).toFixed(1)}%</td>
                    <td className="border px-4 py-2">{(rt.wastePercent * 100).toFixed(1)}%</td>
                    <td className="border px-4 py-2 text-center">
                      <button
                        onClick={() => handleDeleteRoofType(rt.id)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Roof Planes */}
      {activeTab === 'planes' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Create Roof Plane</h2>
            <form onSubmit={handleCreateRoofPlane} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={planeForm.name}
                    onChange={e => setPlaneForm({ ...planeForm, name: e.target.value })}
                    className="border px-3 py-2 rounded w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Level</label>
                  <select
                    value={planeForm.levelId}
                    onChange={e => setPlaneForm({ ...planeForm, levelId: e.target.value })}
                    className="border px-3 py-2 rounded w-full"
                    required
                  >
                    <option value="">Select Level</option>
                    {levels.map(level => (
                      <option key={level.label} value={level.label}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">Boundary (Grid Rectangle)</label>
                <div className="grid grid-cols-4 gap-2">
                  <select
                    value={planeForm.gridXStart}
                    onChange={e => setPlaneForm({ ...planeForm, gridXStart: e.target.value })}
                    className="border px-3 py-2 rounded"
                    required
                  >
                    <option value="">X Start</option>
                    {gridX.map(g => (
                      <option key={g.label} value={g.label}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={planeForm.gridXEnd}
                    onChange={e => setPlaneForm({ ...planeForm, gridXEnd: e.target.value })}
                    className="border px-3 py-2 rounded"
                    required
                  >
                    <option value="">X End</option>
                    {gridX.map(g => (
                      <option key={g.label} value={g.label}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={planeForm.gridYStart}
                    onChange={e => setPlaneForm({ ...planeForm, gridYStart: e.target.value })}
                    className="border px-3 py-2 rounded"
                    required
                  >
                    <option value="">Y Start</option>
                    {gridY.map(g => (
                      <option key={g.label} value={g.label}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={planeForm.gridYEnd}
                    onChange={e => setPlaneForm({ ...planeForm, gridYEnd: e.target.value })}
                    className="border px-3 py-2 rounded"
                    required
                  >
                    <option value="">Y End</option>
                    {gridY.map(g => (
                      <option key={g.label} value={g.label}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-medium mb-1">Slope Mode</label>
                  <select
                    value={planeForm.slopeMode}
                    onChange={e => setPlaneForm({ ...planeForm, slopeMode: e.target.value as any })}
                    className="border px-3 py-2 rounded w-full"
                  >
                    <option value="ratio">Ratio (rise/run)</option>
                    <option value="degrees">Degrees</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">
                    Slope Value {planeForm.slopeMode === 'ratio' ? '(e.g., 0.25 for 1:4)' : '(degrees)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={planeForm.slopeValue}
                    onChange={e => setPlaneForm({ ...planeForm, slopeValue: parseFloat(e.target.value) })}
                    className="border px-3 py-2 rounded w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Roof Type</label>
                  <select
                    value={planeForm.roofTypeId}
                    onChange={e => setPlaneForm({ ...planeForm, roofTypeId: e.target.value })}
                    className="border px-3 py-2 rounded w-full"
                    required
                  >
                    <option value="">Select Roof Type</option>
                    {roofTypes.map(rt => (
                      <option key={rt.id} value={rt.id}>
                        {rt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
                Create Roof Plane
              </button>
            </form>
          </div>

          {/* Roof Planes Table */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Roof Planes ({roofPlanes.length})</h2>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-4 py-2 text-left">Name</th>
                  <th className="border px-4 py-2 text-left">Level</th>
                  <th className="border px-4 py-2 text-left">Roof Type</th>
                  <th className="border px-4 py-2 text-right">Plan Area (m²)</th>
                  <th className="border px-4 py-2 text-right">Slope Factor</th>
                  <th className="border px-4 py-2 text-right">Slope Area (m²)</th>
                  <th className="border px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roofPlanes.map(rp => {
                  const roofType = roofTypes.find(rt => rt.id === rp.roofTypeId);
                  return (
                    <tr key={rp.id} className="hover:bg-gray-50">
                      <td className="border px-4 py-2">{rp.name}</td>
                      <td className="border px-4 py-2">{rp.levelId}</td>
                      <td className="border px-4 py-2">{roofType?.name || 'N/A'}</td>
                      <td className="border px-4 py-2 text-right">{rp.computed.planArea_m2.toFixed(2)}</td>
                      <td className="border px-4 py-2 text-right">{rp.computed.slopeFactor.toFixed(3)}</td>
                      <td className="border px-4 py-2 text-right">{rp.computed.slopeArea_m2.toFixed(2)}</td>
                      <td className="border px-4 py-2 text-center">
                        <button
                          onClick={() => handleDeleteRoofPlane(rp.id)}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
