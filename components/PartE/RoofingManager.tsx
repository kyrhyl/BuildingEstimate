'use client';

import { useState, useEffect } from 'react';
import { generateTruss, calculateTrussQuantity, calculateTotalTrussQuantities, type TrussType, type TrussParameters, type TrussResult, type PlateThickness, type MaterialSpecification } from '@/lib/math/roofing/truss';
import TrussVisualization from './TrussVisualization';

interface RoofingManagerProps {
  projectId: string;
}

// Common steel sections with weights
const steelSections = [
  { section: 'C75x40x15x2.3', weight_kg_per_m: 3.45 },
  { section: 'C100x50x20x2.5', weight_kg_per_m: 4.89 },
  { section: 'C125x65x20x2.5', weight_kg_per_m: 5.85 },
  { section: 'C150x75x20x3.0', weight_kg_per_m: 8.37 },
  { section: '2L50x50x6', weight_kg_per_m: 4.5 },
  { section: '2L65x65x6', weight_kg_per_m: 5.9 },
  { section: '2L75x75x6', weight_kg_per_m: 6.8 },
  { section: 'Custom', weight_kg_per_m: 0 },
];

export default function RoofingManager({ projectId }: RoofingManagerProps) {
  const [trussParams, setTrussParams] = useState<TrussParameters>({
    type: 'howe',
    span_mm: 8000,
    middleRise_mm: 1600,
    overhang_mm: 450,
    spacing_mm: 600,
    verticalWebCount: 3,
    plateThickness: '1.0mm (20 gauge)',
    topChordMaterial: { section: 'C100x50x20x2.5', weight_kg_per_m: 4.89 },
    bottomChordMaterial: { section: 'C100x50x20x2.5', weight_kg_per_m: 4.89 },
    webMaterial: { section: '2L50x50x6', weight_kg_per_m: 4.5 },
  });
  const [trussResult, setTrussResult] = useState<TrussResult | null>(null);
  const [buildingLength_mm, setBuildingLength_mm] = useState(10000);
  const [visualView, setVisualView] = useState<'truss' | 'plan'>('truss');
  const [showMaterialInputs, setShowMaterialInputs] = useState(false);

  useEffect(() => {
    // Auto-generate truss when params change
    try {
      const result = generateTruss(trussParams);
      setTrussResult(result);
    } catch (error) {
      console.error('Error generating truss:', error);
      setTrussResult(null);
    }
  }, [trussParams]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🏗️</div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-1">Truss Structural Design</h3>
            <p className="text-sm text-blue-700">
              Design Howe, Fink, and King Post truss systems with complete material takeoff
            </p>
          </div>
        </div>
      </div>

      {/* Truss Design */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Truss Configuration */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-6">Truss Configuration</h3>
          
          <div className="space-y-6">
            {/* Truss Type */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Truss Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['howe', 'fink', 'kingpost'] as TrussType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTrussParams({ ...trussParams, type })}
                      className={`px-3 py-2 rounded-lg border-2 font-medium text-sm transition-all ${
                        trussParams.type === type
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="text-center capitalize">{type}</div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {trussParams.type === 'howe' && '✓ Best for 6-20m spans, efficient load distribution'}
                  {trussParams.type === 'fink' && '✓ Ideal for residential 4-10m spans, W-pattern'}
                  {trussParams.type === 'kingpost' && '✓ Simple design for short spans up to 6m'}
                </p>
              </div>

              {/* Geometry */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Span (mm)</label>
                  <input
                    type="number"
                    step="100"
                    value={trussParams.span_mm}
                    onChange={(e) => setTrussParams({ ...trussParams, span_mm: parseInt(e.target.value) || 8000 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Middle Rise (mm)</label>
                  <input
                    type="number"
                    step="50"
                    value={trussParams.middleRise_mm}
                    onChange={(e) => setTrussParams({ ...trussParams, middleRise_mm: parseInt(e.target.value) || 1600 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Overhang (mm)</label>
                  <input
                    type="number"
                    step="50"
                    value={trussParams.overhang_mm}
                    onChange={(e) => setTrussParams({ ...trussParams, overhang_mm: parseInt(e.target.value) || 450 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Spacing (mm)</label>
                  <input
                    type="number"
                    step="50"
                    value={trussParams.spacing_mm}
                    onChange={(e) => setTrussParams({ ...trussParams, spacing_mm: parseInt(e.target.value) || 600 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vertical Web Count
                    <span className="text-xs text-gray-500 ml-2">(Howe only)</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={trussParams.verticalWebCount || ''}
                    onChange={(e) => setTrussParams({ ...trussParams, verticalWebCount: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Auto (3-5)"
                    disabled={trussParams.type !== 'howe'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Plate Thickness</label>
                  <select
                    value={trussParams.plateThickness}
                    onChange={(e) => setTrussParams({ ...trussParams, plateThickness: e.target.value as PlateThickness })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="1.0mm (20 gauge)">1.0mm (20 gauge)</option>
                    <option value="1.2mm (18 gauge)">1.2mm (18 gauge)</option>
                    <option value="1.5mm (16 gauge)">1.5mm (16 gauge)</option>
                    <option value="2.0mm (14 gauge)">2.0mm (14 gauge)</option>
                  </select>
                </div>
              </div>

              {/* Material Specifications (Required) */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium text-gray-900">🔧 Steel Material Specifications</span>
                  <span className="text-xs text-red-600 font-semibold">REQUIRED</span>
                </div>
                
                <div className="space-y-4 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg p-4 border border-blue-200">
                    {/* Top Chord Material */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Top Chord Section</label>
                      <select
                        value={trussParams.topChordMaterial.section}
                        onChange={(e) => {
                          const selected = steelSections.find(s => s.section === e.target.value);
                          setTrussParams({
                            ...trussParams,
                            topChordMaterial: selected || { section: 'Custom', weight_kg_per_m: trussParams.topChordMaterial.weight_kg_per_m }
                          });
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {steelSections.map(s => (
                          <option key={s.section} value={s.section}>{s.section}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        value={trussParams.topChordMaterial.weight_kg_per_m}
                        onChange={(e) => setTrussParams({
                          ...trussParams,
                          topChordMaterial: {
                            section: trussParams.topChordMaterial.section,
                            weight_kg_per_m: parseFloat(e.target.value) || 0
                          }
                        })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-2"
                        placeholder="kg/m"
                      />
                      <p className="text-xs text-gray-500 mt-1">Weight: {trussParams.topChordMaterial.weight_kg_per_m} kg/m</p>
                    </div>

                    {/* Bottom Chord Material */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bottom Chord Section</label>
                      <select
                        value={trussParams.bottomChordMaterial.section}
                        onChange={(e) => {
                          const selected = steelSections.find(s => s.section === e.target.value);
                          setTrussParams({
                            ...trussParams,
                            bottomChordMaterial: selected || { section: 'Custom', weight_kg_per_m: trussParams.bottomChordMaterial.weight_kg_per_m }
                          });
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {steelSections.map(s => (
                          <option key={s.section} value={s.section}>{s.section}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        value={trussParams.bottomChordMaterial.weight_kg_per_m}
                        onChange={(e) => setTrussParams({
                          ...trussParams,
                          bottomChordMaterial: {
                            section: trussParams.bottomChordMaterial.section,
                            weight_kg_per_m: parseFloat(e.target.value) || 0
                          }
                        })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-2"
                        placeholder="kg/m"
                      />
                      <p className="text-xs text-gray-500 mt-1">Weight: {trussParams.bottomChordMaterial.weight_kg_per_m} kg/m</p>
                    </div>

                    {/* Web Material */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Web Members Section</label>
                      <select
                        value={trussParams.webMaterial.section}
                        onChange={(e) => {
                          const selected = steelSections.find(s => s.section === e.target.value);
                          setTrussParams({
                            ...trussParams,
                            webMaterial: selected || { section: 'Custom', weight_kg_per_m: trussParams.webMaterial.weight_kg_per_m }
                          });
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {steelSections.map(s => (
                          <option key={s.section} value={s.section}>{s.section}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        value={trussParams.webMaterial.weight_kg_per_m}
                        onChange={(e) => setTrussParams({
                          ...trussParams,
                          webMaterial: {
                            section: trussParams.webMaterial.section,
                            weight_kg_per_m: parseFloat(e.target.value) || 0
                          }
                        })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-2"
                        placeholder="kg/m"
                      />
                      <p className="text-xs text-gray-500 mt-1">Weight: {trussParams.webMaterial.weight_kg_per_m} kg/m</p>
                    </div>
                  </div>
              </div>

              {/* Building Length for Quantity Calculation */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Building Length (mm)</label>
                <input
                  type="number"
                  step="100"
                  value={buildingLength_mm}
                  onChange={(e) => setBuildingLength_mm(parseInt(e.target.value) || 10000)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Required trusses: {calculateTrussQuantity(buildingLength_mm, trussParams.spacing_mm)} units
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Truss Design Output */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-6">Truss Design Output</h3>
          
          {trussResult ? (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-sm text-blue-600 mb-1">Total Weight</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {trussResult.summary.totalWeight_kg.toFixed(1)} kg
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-sm text-green-600 mb-1">Plate Count</div>
                    <div className="text-2xl font-bold text-green-900">
                      {trussResult.summary.plateCount}
                    </div>
                  </div>
              </div>

              {/* Weight Breakdown */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-900 mb-3 text-sm">Weight Breakdown (Single Truss)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-purple-700">Top Chord:</span>
                      <span className="font-bold text-purple-900">{trussResult.summary.topChordWeight_kg.toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-purple-700">Bottom Chord:</span>
                      <span className="font-bold text-purple-900">{trussResult.summary.bottomChordWeight_kg.toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-purple-700">Web Members:</span>
                      <span className="font-bold text-purple-900">{trussResult.summary.webWeight_kg.toFixed(2)} kg</span>
                    </div>
                    <div className="border-t border-purple-200 pt-2 mt-2 flex justify-between items-center">
                      <span className="text-purple-900 font-semibold">Total:</span>
                      <span className="font-bold text-purple-900 text-lg">{trussResult.summary.totalWeight_kg.toFixed(2)} kg</span>
                    </div>
                  </div>
              </div>

              {/* Visual Representation */}
              <div className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setVisualView('truss')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        visualView === 'truss'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Truss Diagram
                    </button>
                    <button
                      onClick={() => setVisualView('plan')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        visualView === 'plan'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Framing Plan
                    </button>
                  </div>
                  <TrussVisualization 
                    trussResult={trussResult} 
                    buildingLength_mm={buildingLength_mm}
                    view={visualView}
                  />
              </div>
              {/* Geometry Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Span:</span>
                    <span className="font-medium">{trussResult.geometry.span_mm}mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rise:</span>
                    <span className="font-medium">{trussResult.geometry.rise_mm.toFixed(0)}mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pitch:</span>
                    <span className="font-medium">{trussResult.geometry.pitch_deg.toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Height:</span>
                    <span className="font-medium">{trussResult.geometry.height_mm.toFixed(0)}mm</span>
                  </div>
              </div>

              {/* Timber Requirements */}
              <div>
                  <h4 className="font-semibold mb-3">Timber Requirements (per truss)</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Part</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Length</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {trussResult.members.map((member, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-medium text-gray-900">{member.name}</td>
                            <td className="px-3 py-2 text-right text-gray-600">{member.quantity}</td>
                            <td className="px-3 py-2 text-right text-gray-600">{member.length_mm.toFixed(0)}mm</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              </div>

              {/* Connector Plates */}
              <div>
                  <h4 className="font-semibold mb-3">Connector Plates (per truss)</h4>
                  <div className="space-y-2">
                    {trussResult.connectorPlates.map((plate, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 rounded px-3 py-2 text-sm">
                        <span className="font-medium">{plate.name}</span>
                        <span className="text-gray-600">
                          {plate.size_mm} × {plate.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Total plates: {trussResult.summary.plateCount}
                  </div>
              </div>

              {/* Validation Warnings */}
              {trussResult.validation.warnings.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <span className="text-amber-600 text-lg">⚠️</span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-amber-900 text-sm mb-2">Validation Warnings</h4>
                        <ul className="space-y-1 text-xs text-amber-800">
                          {trussResult.validation.warnings.map((warning, idx) => (
                            <li key={idx}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
              )}

              {/* Total Quantities for All Trusses */}
              <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Total for All Trusses</h4>
                  <div className="bg-indigo-50 rounded-lg p-4">
                    {(() => {
                      const qty = calculateTrussQuantity(buildingLength_mm, trussParams.spacing_mm);
                      const totals = calculateTotalTrussQuantities(trussResult, qty);
                      return (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-indigo-700">Truss Quantity:</span>
                            <span className="font-bold text-indigo-900">{qty} units</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-indigo-700">Total Weight:</span>
                            <span className="font-bold text-indigo-900">{totals.totalWeight_kg.toFixed(1)} kg</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-indigo-700">Total Volume:</span>
                            <span className="font-bold text-indigo-900">{totals.totalVolume_m3.toFixed(3)} m³</span>
                          </div>
                        </div>
                      );
                    })()}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Configure truss parameters to see design
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
