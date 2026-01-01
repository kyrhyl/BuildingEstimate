'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { FinishType, Space, SpaceFinishAssignment, DPWHCatalogItem } from '@/types';

export default function FinishesPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [activeTab, setActiveTab] = useState<'types' | 'assignments'>('types');
  const [finishTypes, setFinishTypes] = useState<FinishType[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [assignments, setAssignments] = useState<SpaceFinishAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTypeForm, setShowCreateTypeForm] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogResults, setCatalogResults] = useState<DPWHCatalogItem[]>([]);

  // Form state for finish type
  const [typeFormData, setTypeFormData] = useState({
    category: 'floor' as 'floor' | 'wall' | 'ceiling' | 'plaster' | 'paint',
    finishName: '',
    dpwhItemNumberRaw: '',
    unit: '',
    wallHeightMode: 'fullHeight' as 'fullHeight' | 'fixed',
    wallHeightValue: '1.2',
    deductionEnabled: true,
    deductionMinArea: '0.5',
    deductionTypes: ['door', 'window'],
    wastePercent: '0.05',
    rounding: '2',
  });

  // Form state for assignment
  const [assignmentFormData, setAssignmentFormData] = useState({
    spaceId: '',
    finishTypeId: '',
    scope: 'base',
  });

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [finishTypesRes, spacesRes, assignmentsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/finish-types`),
        fetch(`/api/projects/${projectId}/spaces`),
        fetch(`/api/projects/${projectId}/finish-assignments`),
      ]);

      const finishTypesData = await finishTypesRes.json();
      const spacesData = await spacesRes.json();
      const assignmentsData = await assignmentsRes.json();

      setFinishTypes(finishTypesData.finishTypes || []);
      setSpaces(spacesData.spaces || []);
      setAssignments(assignmentsData.assignments || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchCatalog = async (query: string) => {
    if (!query || query.length < 2) {
      setCatalogResults([]);
      return;
    }

    try {
      const res = await fetch(
        `/api/catalog?query=${encodeURIComponent(query)}&trade=Finishes&limit=20`
      );
      const data = await res.json();
      setCatalogResults(data.items || []);
    } catch (error) {
      console.error('Error searching catalog:', error);
    }
  };

  const selectCatalogItem = (item: DPWHCatalogItem) => {
    setTypeFormData({
      ...typeFormData,
      dpwhItemNumberRaw: item.itemNumber,
      unit: item.unit,
      finishName: typeFormData.finishName || item.description.substring(0, 50),
    });
    setCatalogResults([]);
    setCatalogSearch('');
  };

  const handleCreateFinishType = async (e: React.FormEvent) => {
    e.preventDefault();

    const body: any = {
      category: typeFormData.category,
      finishName: typeFormData.finishName,
      dpwhItemNumberRaw: typeFormData.dpwhItemNumberRaw,
      unit: typeFormData.unit,
      assumptions: {
        wastePercent: parseFloat(typeFormData.wastePercent),
        rounding: parseInt(typeFormData.rounding),
      },
    };

    if (typeFormData.category === 'wall' || typeFormData.category === 'plaster' || typeFormData.category === 'paint') {
      body.wallHeightRule = {
        mode: typeFormData.wallHeightMode,
        value_m: typeFormData.wallHeightMode === 'fixed' ? parseFloat(typeFormData.wallHeightValue) : undefined,
      };
      body.deductionRule = {
        enabled: typeFormData.deductionEnabled,
        minOpeningAreaToDeduct_m2: parseFloat(typeFormData.deductionMinArea),
        includeTypes: typeFormData.deductionTypes,
      };
    }

    try {
      await fetch(`/api/projects/${projectId}/finish-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      setShowCreateTypeForm(false);
      resetTypeForm();
      loadData();
    } catch (error) {
      console.error('Error creating finish type:', error);
      alert('Failed to create finish type');
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await fetch(`/api/projects/${projectId}/finish-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignmentFormData),
      });

      resetAssignmentForm();
      loadData();
    } catch (error) {
      console.error('Error creating assignment:', error);
      alert('Failed to create assignment');
    }
  };

  const handleDeleteFinishType = async (finishTypeId: string) => {
    if (!confirm('Delete this finish type?')) return;

    try {
      await fetch(`/api/projects/${projectId}/finish-types?finishTypeId=${finishTypeId}`, {
        method: 'DELETE',
      });
      loadData();
    } catch (error) {
      console.error('Error deleting finish type:', error);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      await fetch(`/api/projects/${projectId}/finish-assignments?assignmentId=${assignmentId}`, {
        method: 'DELETE',
      });
      loadData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
    }
  };

  const resetTypeForm = () => {
    setTypeFormData({
      category: 'floor',
      finishName: '',
      dpwhItemNumberRaw: '',
      unit: '',
      wallHeightMode: 'fullHeight',
      wallHeightValue: '1.2',
      deductionEnabled: true,
      deductionMinArea: '0.5',
      deductionTypes: ['door', 'window'],
      wastePercent: '0.05',
      rounding: '2',
    });
  };

  const resetAssignmentForm = () => {
    setAssignmentFormData({
      spaceId: '',
      finishTypeId: '',
      scope: 'base',
    });
  };

  if (loading) {
    return <div className="p-8">Loading finishes...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Finishing Works</h1>

      {/* Tabs */}
      <div className="border-b border-gray-300 mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('types')}
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'types'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-600'
            }`}
          >
            Finish Types ({finishTypes.length})
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'assignments'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-600'
            }`}
          >
            Space Assignments ({assignments.length})
          </button>
        </div>
      </div>

      {/* Finish Types Tab */}
      {activeTab === 'types' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Finish Type Templates</h2>
            <button
              onClick={() => setShowCreateTypeForm(!showCreateTypeForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {showCreateTypeForm ? 'Cancel' : '+ New Finish Type'}
            </button>
          </div>

          {/* Create Form */}
          {showCreateTypeForm && (
            <div className="mb-6 p-4 border border-gray-300 rounded bg-gray-50">
              <form onSubmit={handleCreateFinishType} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select
                      value={typeFormData.category}
                      onChange={(e) =>
                        setTypeFormData({
                          ...typeFormData,
                          category: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    >
                      <option value="floor">Floor</option>
                      <option value="wall">Wall</option>
                      <option value="ceiling">Ceiling</option>
                      <option value="plaster">Plaster</option>
                      <option value="paint">Paint</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Finish Name</label>
                    <input
                      type="text"
                      value={typeFormData.finishName}
                      onChange={(e) =>
                        setTypeFormData({ ...typeFormData, finishName: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      placeholder="e.g., Ceramic Tile, Paint"
                      required
                    />
                  </div>
                </div>

                {/* DPWH Catalog Search */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    DPWH Pay Item (search catalog)
                  </label>
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => {
                      setCatalogSearch(e.target.value);
                      searchCatalog(e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="Search for DPWH item..."
                  />
                  {catalogResults.length > 0 && (
                    <div className="mt-2 max-h-60 overflow-y-auto border border-gray-300 rounded bg-white">
                      {catalogResults.map((item) => (
                        <div
                          key={item.itemNumber}
                          onClick={() => selectCatalogItem(item)}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b"
                        >
                          <div className="font-medium">{item.itemNumber}</div>
                          <div className="text-sm text-gray-600">{item.description}</div>
                          <div className="text-xs text-gray-500">Unit: {item.unit}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">DPWH Item Number</label>
                    <input
                      type="text"
                      value={typeFormData.dpwhItemNumberRaw}
                      onChange={(e) =>
                        setTypeFormData({ ...typeFormData, dpwhItemNumberRaw: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      required
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Unit</label>
                    <input
                      type="text"
                      value={typeFormData.unit}
                      onChange={(e) =>
                        setTypeFormData({ ...typeFormData, unit: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      required
                      readOnly
                    />
                  </div>
                </div>

                {/* Wall-specific settings */}
                {(typeFormData.category === 'wall' ||
                  typeFormData.category === 'plaster' ||
                  typeFormData.category === 'paint') && (
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Wall Settings</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Height Mode</label>
                        <select
                          value={typeFormData.wallHeightMode}
                          onChange={(e) =>
                            setTypeFormData({
                              ...typeFormData,
                              wallHeightMode: e.target.value as any,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                        >
                          <option value="fullHeight">Full Storey Height</option>
                          <option value="fixed">Fixed Height</option>
                        </select>
                      </div>

                      {typeFormData.wallHeightMode === 'fixed' && (
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Height Value (m)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={typeFormData.wallHeightValue}
                            onChange={(e) =>
                              setTypeFormData({ ...typeFormData, wallHeightValue: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded"
                          />
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={typeFormData.deductionEnabled}
                          onChange={(e) =>
                            setTypeFormData({
                              ...typeFormData,
                              deductionEnabled: e.target.checked,
                            })
                          }
                          className="mr-2"
                        />
                        <span className="text-sm font-medium">
                          Deduct openings (doors, windows)
                        </span>
                      </label>

                      {typeFormData.deductionEnabled && (
                        <div className="ml-6 mt-2">
                          <label className="block text-sm mb-1">
                            Minimum area to deduct (m²)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={typeFormData.deductionMinArea}
                            onChange={(e) =>
                              setTypeFormData({
                                ...typeFormData,
                                deductionMinArea: e.target.value,
                              })
                            }
                            className="w-32 px-3 py-1 border border-gray-300 rounded"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Waste %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={typeFormData.wastePercent}
                      onChange={(e) =>
                        setTypeFormData({ ...typeFormData, wastePercent: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Rounding (decimals)</label>
                    <input
                      type="number"
                      value={typeFormData.rounding}
                      onChange={(e) =>
                        setTypeFormData({ ...typeFormData, rounding: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Create Finish Type
                </button>
              </form>
            </div>
          )}

          {/* Finish Types Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 border-b text-left">Name</th>
                  <th className="px-4 py-2 border-b text-left">Category</th>
                  <th className="px-4 py-2 border-b text-left">DPWH Item</th>
                  <th className="px-4 py-2 border-b text-left">Unit</th>
                  <th className="px-4 py-2 border-b text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {finishTypes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No finish types defined. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  finishTypes.map((ft) => (
                    <tr key={ft.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 border-b">{ft.finishName}</td>
                      <td className="px-4 py-2 border-b">
                        <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">
                          {ft.category}
                        </span>
                      </td>
                      <td className="px-4 py-2 border-b text-sm">{ft.dpwhItemNumberRaw}</td>
                      <td className="px-4 py-2 border-b text-sm">{ft.unit}</td>
                      <td className="px-4 py-2 border-b text-center">
                        <button
                          onClick={() => handleDeleteFinishType(ft.id)}
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
      )}

      {/* Assignments Tab */}
      {activeTab === 'assignments' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Assign Finishes to Spaces</h2>

          {/* Create Assignment Form */}
          <div className="mb-6 p-4 border border-gray-300 rounded bg-gray-50">
            <form onSubmit={handleCreateAssignment} className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Space</label>
                <select
                  value={assignmentFormData.spaceId}
                  onChange={(e) =>
                    setAssignmentFormData({ ...assignmentFormData, spaceId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  required
                >
                  <option value="">Select Space</option>
                  {spaces.map((space) => (
                    <option key={space.id} value={space.id}>
                      {space.name} ({space.levelId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Finish Type</label>
                <select
                  value={assignmentFormData.finishTypeId}
                  onChange={(e) =>
                    setAssignmentFormData({ ...assignmentFormData, finishTypeId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  required
                >
                  <option value="">Select Finish</option>
                  {finishTypes.map((ft) => (
                    <option key={ft.id} value={ft.id}>
                      {ft.finishName} ({ft.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Scope</label>
                <input
                  type="text"
                  value={assignmentFormData.scope}
                  onChange={(e) =>
                    setAssignmentFormData({ ...assignmentFormData, scope: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="base, plaster, paint..."
                  required
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Assign
                </button>
              </div>
            </form>
          </div>

          {/* Assignments Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 border-b text-left">Space</th>
                  <th className="px-4 py-2 border-b text-left">Finish Type</th>
                  <th className="px-4 py-2 border-b text-left">Scope</th>
                  <th className="px-4 py-2 border-b text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      No assignments yet. Assign finishes to spaces above.
                    </td>
                  </tr>
                ) : (
                  assignments.map((assignment) => {
                    const space = spaces.find((s) => s.id === assignment.spaceId);
                    const finishType = finishTypes.find(
                      (ft) => ft.id === assignment.finishTypeId
                    );

                    return (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border-b">
                          {space?.name || assignment.spaceId}
                        </td>
                        <td className="px-4 py-2 border-b">
                          {finishType?.finishName || assignment.finishTypeId}
                        </td>
                        <td className="px-4 py-2 border-b">{assignment.scope}</td>
                        <td className="px-4 py-2 border-b text-center">
                          <button
                            onClick={() => handleDeleteAssignment(assignment.id)}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
