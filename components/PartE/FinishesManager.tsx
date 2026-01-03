'use client';

import { useState, useEffect } from 'react';
import type { FinishType, Space, SpaceFinishAssignment, DPWHCatalogItem, GridLine } from '@/types';

interface FinishesManagerProps {
  projectId: string;
  gridX: GridLine[];
  gridY: GridLine[];
}

export default function FinishesManager({ projectId, gridX, gridY }: FinishesManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'types' | 'assignments'>('types');
  const [finishTypes, setFinishTypes] = useState<FinishType[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [assignments, setAssignments] = useState<SpaceFinishAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTypeForm, setShowCreateTypeForm] = useState(false);
  const [catalogItems, setCatalogItems] = useState<DPWHCatalogItem[]>([]);

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
    loadCatalog();
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

  const loadCatalog = async () => {
    try {
      // Load finishing-related items by searching keywords instead of filtering by trade
      const res = await fetch('/api/catalog?query=&limit=5000');
      const data = await res.json();
      
      console.log('Catalog API response:', data);
      
      // Filter to finishing-related items based on description keywords
      const finishingKeywords = ['paint', 'tile', 'tiles', 'plaster', 'ceiling', 'floor', 'wall', 
                                  'finish', 'ceramic', 'vinyl', 'carpet', 'epoxy', 'gypsum',
                                  'concrete topping', 'cement finish', 'terrazzo', 'marble'];
      
      const allItems = data.data || data.items || [];
      const finishingItems = allItems.filter((item: any) => {
        const desc = item.description.toLowerCase();
        return finishingKeywords.some(keyword => desc.includes(keyword));
      });
      
      console.log('Filtered finishing items:', finishingItems.length);
      setCatalogItems(finishingItems);
    } catch (error) {
      console.error('Error loading catalog:', error);
    }
  };

  const handleCatalogItemSelect = (itemNumber: string) => {
    const item = catalogItems.find(i => i.itemNumber === itemNumber);
    if (item) {
      setTypeFormData({
        ...typeFormData,
        dpwhItemNumberRaw: item.itemNumber,
        unit: item.unit,
        finishName: typeFormData.finishName || item.description.substring(0, 50),
      });
    }
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
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-5xl mb-4">🎨</div>
        <p className="text-gray-500">Loading finishes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-600 mb-1">Finish Types</div>
          <div className="text-2xl font-bold text-blue-900">{finishTypes.length}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-600 mb-1">Assignments</div>
          <div className="text-2xl font-bold text-green-900">{assignments.length}</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-purple-600 mb-1">Spaces Available</div>
          <div className="text-2xl font-bold text-purple-900">{spaces.length}</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-4">
          <div className="text-sm text-amber-600 mb-1">Categories</div>
          <div className="text-2xl font-bold text-amber-900">
            {new Set(finishTypes.map(ft => ft.category)).size}
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveSubTab('types')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeSubTab === 'types'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              📋 Finish Types ({finishTypes.length})
            </button>
            <button
              onClick={() => setActiveSubTab('assignments')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeSubTab === 'assignments'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              🎯 Space Assignments ({assignments.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Finish Types Tab */}
          {activeSubTab === 'types' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Finish Type Templates</h3>
                <button
                  onClick={() => setShowCreateTypeForm(!showCreateTypeForm)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
                >
                  {showCreateTypeForm ? '✕ Cancel' : '+ New Finish Type'}
                </button>
              </div>

              {/* Create Form */}
              {showCreateTypeForm && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <form onSubmit={handleCreateFinishType} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                        <select
                          value={typeFormData.category}
                          onChange={(e) =>
                            setTypeFormData({
                              ...typeFormData,
                              category: e.target.value as any,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          <option value="floor">Floor</option>
                          <option value="wall">Wall</option>
                          <option value="ceiling">Ceiling</option>
                          <option value="plaster">Plaster</option>
                          <option value="paint">Paint</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Finish Name *</label>
                        <input
                          type="text"
                          value={typeFormData.finishName}
                          onChange={(e) =>
                            setTypeFormData({ ...typeFormData, finishName: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="e.g., Ceramic Tile, Paint"
                          required
                        />
                      </div>
                    </div>

                    {/* DPWH Catalog Dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select DPWH Pay Item *
                      </label>
                      <select
                        value={typeFormData.dpwhItemNumberRaw}
                        onChange={(e) => handleCatalogItemSelect(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      >
                        <option value="">-- Select from catalog --</option>
                        {catalogItems.map((item) => (
                          <option key={item.itemNumber} value={item.itemNumber}>
                            {item.itemNumber} - {item.description} ({item.unit})
                          </option>
                        ))}
                      </select>
                      {typeFormData.dpwhItemNumberRaw && (
                        <p className="mt-2 text-xs text-gray-500">
                          Selected: {typeFormData.dpwhItemNumberRaw} | Unit: {typeFormData.unit}
                        </p>
                      )}
                    </div>

                    {/* Wall-specific settings */}
                    {(typeFormData.category === 'wall' ||
                      typeFormData.category === 'plaster' ||
                      typeFormData.category === 'paint') && (
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="font-medium text-gray-900 mb-3">Wall-Specific Settings</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Height Mode</label>
                            <select
                              value={typeFormData.wallHeightMode}
                              onChange={(e) =>
                                setTypeFormData({
                                  ...typeFormData,
                                  wallHeightMode: e.target.value as any,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            >
                              <option value="fullHeight">Full Storey Height</option>
                              <option value="fixed">Fixed Height (Wainscot)</option>
                            </select>
                          </div>

                          {typeFormData.wallHeightMode === 'fixed' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Height Value (m)
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                value={typeFormData.wallHeightValue}
                                onChange={(e) =>
                                  setTypeFormData({ ...typeFormData, wallHeightValue: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                              className="mr-2 w-4 h-4 text-green-600"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Deduct openings (doors, windows)
                            </span>
                          </label>

                          {typeFormData.deductionEnabled && (
                            <div className="ml-6 mt-3">
                              <label className="block text-sm text-gray-700 mb-1">
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
                                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Waste %</label>
                        <input
                          type="number"
                          step="0.01"
                          value={typeFormData.wastePercent}
                          onChange={(e) =>
                            setTypeFormData({ ...typeFormData, wastePercent: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Rounding (decimals)</label>
                        <input
                          type="number"
                          value={typeFormData.rounding}
                          onChange={(e) =>
                            setTypeFormData({ ...typeFormData, rounding: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm transition-colors"
                      >
                        Create Finish Type
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateTypeForm(false)}
                        className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Finish Types Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DPWH Item</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {finishTypes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center">
                          <div className="text-gray-400 text-4xl mb-3">📋</div>
                          <p className="text-gray-500">No finish types defined yet</p>
                          <p className="text-sm text-gray-400 mt-1">Create one using the button above</p>
                        </td>
                      </tr>
                    ) : (
                      finishTypes.map((ft) => (
                        <tr key={ft.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-900">{ft.finishName}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                              {ft.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{ft.dpwhItemNumberRaw}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{ft.unit}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleDeleteFinishType(ft.id)}
                              className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
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
          {activeSubTab === 'assignments' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Assign Finishes to Spaces</h3>

              {/* Create Assignment Form */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <form onSubmit={handleCreateAssignment} className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Space *</label>
                    <select
                      value={assignmentFormData.spaceId}
                      onChange={(e) =>
                        setAssignmentFormData({ ...assignmentFormData, spaceId: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Finish Type *</label>
                    <select
                      value={assignmentFormData.finishTypeId}
                      onChange={(e) =>
                        setAssignmentFormData({ ...assignmentFormData, finishTypeId: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Scope *</label>
                    <input
                      type="text"
                      value={assignmentFormData.scope}
                      onChange={(e) =>
                        setAssignmentFormData({ ...assignmentFormData, scope: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="base, wainscot..."
                      required
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm transition-colors"
                    >
                      Assign
                    </button>
                  </div>
                </form>
              </div>

              {/* Assignments Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Space</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Area (m²)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Dimension</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Finish Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scope</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assignments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center">
                          <div className="text-gray-400 text-4xl mb-3">🎯</div>
                          <p className="text-gray-500">No assignments yet</p>
                          <p className="text-sm text-gray-400 mt-1">Assign finishes to spaces using the form above</p>
                        </td>
                      </tr>
                    ) : (
                      assignments.map((assignment) => {
                        const space = spaces.find((s) => s.id === assignment.spaceId);
                        const finishType = finishTypes.find(
                          (ft) => ft.id === assignment.finishTypeId
                        );
                        
                        // Calculate dimensions from grid bounds
                        let dimensionText = 'N/A';
                        if (space?.boundary?.type === 'gridRect' && space?.boundary?.data?.gridX && space?.boundary?.data?.gridY) {
                          const [xStart, xEnd] = space.boundary.data.gridX as [string, string];
                          const [yStart, yEnd] = space.boundary.data.gridY as [string, string];
                          const xStartLine = gridX.find(g => g.label === xStart);
                          const xEndLine = gridX.find(g => g.label === xEnd);
                          const yStartLine = gridY.find(g => g.label === yStart);
                          const yEndLine = gridY.find(g => g.label === yEnd);
                          
                          if (xStartLine && xEndLine && yStartLine && yEndLine) {
                            const width = Math.abs(xEndLine.offset - xStartLine.offset);
                            const length = Math.abs(yEndLine.offset - yStartLine.offset);
                            dimensionText = `${width.toFixed(2)} × ${length.toFixed(2)}`;
                          }
                        }

                        return (
                          <tr key={assignment.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-medium text-gray-900">
                                {space?.name || assignment.spaceId}
                              </span>
                              <div className="text-xs text-gray-500">{space?.levelId}</div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-semibold text-blue-600">
                                {space?.computed?.area_m2?.toFixed(2) || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-600">
                              {dimensionText}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {finishType?.finishName || assignment.finishTypeId}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                                {finishType?.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{assignment.scope}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleDeleteAssignment(assignment.id)}
                                className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
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
      </div>
    </div>
  );
}
