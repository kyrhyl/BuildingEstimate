'use client';

import { useState, useEffect } from 'react';
import { generateTruss, calculateTrussQuantity, calculateTotalTrussQuantities, type TrussType, type TrussParameters, type TrussResult, type PlateThickness } from '@/lib/math/roofing/truss';
import TrussVisualization from './TrussVisualization';

interface RoofingManagerProps {
  projectId: string;
}

type RoofingTab = 'design' | 'plan';

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
  const [activeTab, setActiveTab] = useState<RoofingTab>('design');
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

  useEffect(() => {
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
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">TRUSS</div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-1">Roofing System</h3>
            <p className="text-sm text-blue-700">Design trusses and visualize framing plans</p>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('design')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'design'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Truss Structural Design
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'plan'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Roof Framing Plan
          </button>
        </nav>
      </div>

      {activeTab === 'design' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold mb-6">Configuration</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Truss Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['howe', 'fink', 'kingpost'] as TrussType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTrussParams({ ...trussParams, type })}
                      className={`px-3 py-2 rounded-lg border-2 font-medium text-sm transition-all capitalize ${trussParams.type === type ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Span (mm)</label>
                  <input type="number" step="100" value={trussParams.span_mm} onChange={(e) => setTrussParams({ ...trussParams, span_mm: parseInt(e.target.value) || 8000 })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rise (mm)</label>
                  <input type="number" step="50" value={trussParams.middleRise_mm} onChange={(e) => setTrussParams({ ...trussParams, middleRise_mm: parseInt(e.target.value) || 1600 })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Overhang (mm)</label>
                <input type="number" step="50" value={trussParams.overhang_mm} onChange={(e) => setTrussParams({ ...trussParams, overhang_mm: parseInt(e.target.value) || 450 })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vertical Web Count
                  <span className="text-xs text-gray-500 ml-2">(Howe only, excludes center)</span>
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="10"
                  value={trussParams.verticalWebCount || 3}
                  onChange={(e) => setTrussParams({ ...trussParams, verticalWebCount: parseInt(e.target.value) || 3 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  disabled={trussParams.type !== 'howe'}
                />
                <p className="text-xs text-gray-500 mt-1">Number of vertical web members (not including center web)</p>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-4">Material Specifications</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Top Chord Section</label>
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={trussParams.topChordMaterial.section}
                        onChange={(e) => {
                          const selected = steelSections.find(s => s.section === e.target.value);
                          setTrussParams({
                            ...trussParams,
                            topChordMaterial: selected || { section: 'Custom', weight_kg_per_m: trussParams.topChordMaterial.weight_kg_per_m }
                          });
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        {steelSections.map(s => (
                          <option key={s.section} value={s.section}>{s.section}</option>
                        ))}
                      </select>
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={trussParams.topChordMaterial.weight_kg_per_m}
                          onChange={(e) => setTrussParams({
                            ...trussParams,
                            topChordMaterial: { ...trussParams.topChordMaterial, weight_kg_per_m: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="kg/m"
                        />
                        <p className="text-xs text-gray-500 mt-1">kg/m</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bottom Chord Section</label>
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={trussParams.bottomChordMaterial.section}
                        onChange={(e) => {
                          const selected = steelSections.find(s => s.section === e.target.value);
                          setTrussParams({
                            ...trussParams,
                            bottomChordMaterial: selected || { section: 'Custom', weight_kg_per_m: trussParams.bottomChordMaterial.weight_kg_per_m }
                          });
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        {steelSections.map(s => (
                          <option key={s.section} value={s.section}>{s.section}</option>
                        ))}
                      </select>
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={trussParams.bottomChordMaterial.weight_kg_per_m}
                          onChange={(e) => setTrussParams({
                            ...trussParams,
                            bottomChordMaterial: { ...trussParams.bottomChordMaterial, weight_kg_per_m: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="kg/m"
                        />
                        <p className="text-xs text-gray-500 mt-1">kg/m</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Web Members Section</label>
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={trussParams.webMaterial.section}
                        onChange={(e) => {
                          const selected = steelSections.find(s => s.section === e.target.value);
                          setTrussParams({
                            ...trussParams,
                            webMaterial: selected || { section: 'Custom', weight_kg_per_m: trussParams.webMaterial.weight_kg_per_m }
                          });
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        {steelSections.map(s => (
                          <option key={s.section} value={s.section}>{s.section}</option>
                        ))}
                      </select>
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={trussParams.webMaterial.weight_kg_per_m}
                          onChange={(e) => setTrussParams({
                            ...trussParams,
                            webMaterial: { ...trussParams.webMaterial, weight_kg_per_m: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="kg/m"
                        />
                        <p className="text-xs text-gray-500 mt-1">kg/m</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-3">
            <h3 className="text-lg font-semibold mb-6">Design Output</h3>
            
            {trussResult ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-sm text-blue-600 mb-1">Total Weight</div>
                    <div className="text-2xl font-bold text-blue-900">{trussResult.summary.totalWeight_kg.toFixed(1)} kg</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-sm text-green-600 mb-1">Plate Count</div>
                    <div className="text-2xl font-bold text-green-900">{trussResult.summary.plateCount}</div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <TrussVisualization trussResult={trussResult} buildingLength_mm={buildingLength_mm} view="truss" />
                </div>

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
                    <span className="text-gray-600">Height:</span>
                    <span className="font-medium">{trussResult.geometry.height_mm.toFixed(0)}mm</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Weight Calculation Details</h4>
                  <div className="space-y-3">
                    {trussResult.members.map((member, idx) => {
                      let materialSpec;
                      let weightPerM;
                      
                      if (member.subtype === 'top') {
                        materialSpec = trussParams.topChordMaterial;
                        weightPerM = trussParams.topChordMaterial.weight_kg_per_m;
                      } else if (member.subtype === 'bottom') {
                        materialSpec = trussParams.bottomChordMaterial;
                        weightPerM = trussParams.bottomChordMaterial.weight_kg_per_m;
                      } else {
                        materialSpec = trussParams.webMaterial;
                        weightPerM = trussParams.webMaterial.weight_kg_per_m;
                      }
                      
                      const lengthM = member.length_mm / 1000;
                      const totalLengthM = lengthM * member.quantity;
                      const totalWeight = totalLengthM * weightPerM;
                      
                      return (
                        <div key={idx} className="bg-gray-50 rounded-lg p-3 text-sm">
                          <div className="font-medium text-gray-900 mb-2">{member.name}</div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div>Section: <span className="font-medium text-gray-800">{materialSpec.section}</span></div>
                            <div>Material: <span className="font-medium text-gray-800">{weightPerM} kg/m</span></div>
                            <div>Length: <span className="font-medium text-gray-800">{lengthM.toFixed(2)}m</span></div>
                            <div>Quantity: <span className="font-medium text-gray-800">{member.quantity}</span></div>
                            <div className="col-span-2 pt-1 border-t border-gray-200 mt-1">
                              Total: <span className="font-bold text-gray-900">{totalLengthM.toFixed(2)}m × {weightPerM} kg/m = {totalWeight.toFixed(2)} kg</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    <div className="bg-blue-100 rounded-lg p-3 text-sm border border-blue-200">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-blue-900">Total Steel Weight (1 truss):</span>
                        <span className="text-lg font-bold text-blue-900">{trussResult.summary.totalWeight_kg.toFixed(2)} kg</span>
                      </div>
                      <div className="text-xs text-blue-700 mt-1">
                        (Top: {trussResult.summary.topChordWeight_kg.toFixed(1)}kg + Bottom: {trussResult.summary.bottomChordWeight_kg.toFixed(1)}kg + Web: {trussResult.summary.webWeight_kg.toFixed(1)}kg + Plates: ~{(trussResult.summary.totalWeight_kg - trussResult.summary.topChordWeight_kg - trussResult.summary.bottomChordWeight_kg - trussResult.summary.webWeight_kg).toFixed(1)}kg)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">Configure truss parameters to see design</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'plan' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Roof Framing Plan</h3>
              <p className="text-sm text-gray-600 mb-6">
                Bird&apos;s eye view showing truss layout and spacing across the building
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-4">Building Dimensions</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Building Length (mm)</label>
                  <input
                    type="number"
                    step="100"
                    value={buildingLength_mm}
                    onChange={(e) => setBuildingLength_mm(parseInt(e.target.value) || 10000)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Truss Spacing (mm)</label>
                  <input
                    type="number"
                    step="50"
                    value={trussParams.spacing_mm}
                    onChange={(e) => setTrussParams({ ...trussParams, spacing_mm: parseInt(e.target.value) || 600 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {trussResult ? (
              <>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-blue-600 mb-1">Building Length</div>
                  <div className="text-xl font-bold text-blue-900">{buildingLength_mm}mm</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-green-600 mb-1">Truss Spacing</div>
                  <div className="text-xl font-bold text-green-900">{trussParams.spacing_mm}mm</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm text-purple-600 mb-1">Total Trusses</div>
                  <div className="text-xl font-bold text-purple-900">
                    {calculateTrussQuantity(buildingLength_mm, trussParams.spacing_mm)} units
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <TrussVisualization trussResult={trussResult} buildingLength_mm={buildingLength_mm} view="plan" />
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-indigo-900 mb-3">Total Material Requirements</h4>
                <div className="space-y-2 text-sm">
                  {(() => {
                    const qty = calculateTrussQuantity(buildingLength_mm, trussParams.spacing_mm);
                    const totals = calculateTotalTrussQuantities(trussResult, qty);
                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-indigo-700">Truss Quantity:</span>
                          <span className="font-bold text-indigo-900">{qty} units</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-indigo-700">Weight per Truss:</span>
                          <span className="font-bold text-indigo-900">{trussResult.summary.totalWeight_kg.toFixed(1)} kg</span>
                        </div>
                        <div className="flex justify-between border-t border-indigo-200 pt-2 mt-2">
                          <span className="text-indigo-800 font-semibold">Total Weight (All Trusses):</span>
                          <span className="font-bold text-indigo-900 text-lg">{totals.totalWeight_kg.toFixed(1)} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-indigo-700">Total Volume:</span>
                          <span className="font-bold text-indigo-900">{totals.totalVolume_m3.toFixed(3)} m³</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-900 mb-2 text-sm">Installation Notes</h4>
                <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
                  <li>Trusses should be installed perpendicular to the building length</li>
                  <li>Maintain consistent spacing of {trussParams.spacing_mm}mm center-to-center</li>
                  <li>Ensure proper bracing and lateral support during installation</li>
                  <li>First and last trusses should be positioned at building ends</li>
                </ul>
              </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Configure truss parameters in the Structural Design tab to see the framing plan
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
