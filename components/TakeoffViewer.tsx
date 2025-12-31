'use client';

import { useState, useEffect } from 'react';
import type { TakeoffLine } from '@/types';

interface TakeoffViewerProps {
  projectId: string;
  onTakeoffGenerated?: (takeoffLines: TakeoffLine[]) => void;
}

interface TakeoffSummary {
  totalConcrete: number;
  totalRebar: number;
  totalFormwork: number;
  elementCount: number;
  takeoffLineCount: number;
}

interface CalcRun {
  runId: string;
  timestamp: string;
  takeoffLines: TakeoffLine[];
  summary: TakeoffSummary;
}

export default function TakeoffViewer({ projectId, onTakeoffGenerated }: TakeoffViewerProps) {
  const [takeoffLines, setTakeoffLines] = useState<TakeoffLine[]>([]);
  const [summary, setSummary] = useState<TakeoffSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [lastCalculated, setLastCalculated] = useState<string | null>(null);
  const [hasCalcRun, setHasCalcRun] = useState(false);
  const [summarizedView, setSummarizedView] = useState(true);

  // Load latest CalcRun on mount
  useEffect(() => {
    loadLatestCalcRun();
  }, [projectId]);

  const loadLatestCalcRun = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/calcruns/latest`);
      if (res.ok) {
        const data: CalcRun = await res.json();
        setTakeoffLines(data.takeoffLines || []);
        setSummary(data.summary || null);
        setLastCalculated(data.timestamp);
        setHasCalcRun(true);
        
        // Notify parent component
        if (onTakeoffGenerated && data.takeoffLines) {
          onTakeoffGenerated(data.takeoffLines);
        }
      } else {
        setHasCalcRun(false);
      }
    } catch (err) {
      console.error('Failed to load latest calc run:', err);
      setHasCalcRun(false);
    }
  };

  const generateTakeoff = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrors([]);

      const res = await fetch(`/api/projects/${projectId}/takeoff`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate takeoff');
      }

      const data = await res.json();
      const lines = data.takeoffLines || [];
      setTakeoffLines(lines);
      setSummary(data.summary || null);
      setLastCalculated(new Date().toISOString());
      setHasCalcRun(true);
      if (data.errors && data.errors.length > 0) {
        setErrors(data.errors);
      }
      
      // Call the callback to pass takeoff lines to parent
      if (onTakeoffGenerated) {
        onTakeoffGenerated(lines);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate takeoff');
    } finally {
      setLoading(false);
    }
  };

  // Filter takeoff lines by type
  const filteredLines = filterType === 'all' 
    ? takeoffLines 
    : filterType === 'Concrete' || filterType === 'Rebar' || filterType === 'Formwork'
    ? takeoffLines.filter(line => line.trade === filterType)
    : takeoffLines.filter(line => {
        const typeTag = line.tags.find(tag => tag.startsWith('type:'));
        return typeTag === filterType;
      });

  // Group by element type
  const beamLines = takeoffLines.filter(line => line.tags.some(tag => tag === 'type:beam'));
  const slabLines = takeoffLines.filter(line => line.tags.some(tag => tag === 'type:slab'));
  const columnLines = takeoffLines.filter(line => line.tags.some(tag => tag === 'type:column'));
  const foundationLines = takeoffLines.filter(line => line.tags.some(tag => tag === 'type:foundation'));

  return (
    <div className="space-y-6">
      {/* Generate Button */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold mb-2">Concrete Quantity Takeoff</h3>
            <p className="text-sm text-gray-600">
              Generate concrete volume calculations from placed elements
            </p>
            {lastCalculated && (
              <p className="text-xs text-gray-500 mt-1">
                Last calculated: {new Date(lastCalculated).toLocaleString()}
              </p>
            )}
          </div>
          <button
            onClick={generateTakeoff}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium"
          >
            {loading ? 'Calculating...' : hasCalcRun ? 'Recalculate Takeoff' : 'Generate Takeoff'}
          </button>
        </div>
      </div>

      {/* Errors */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {errors.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 mb-2">Warnings</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            {errors.map((err, idx) => (
              <li key={idx}>• {err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="font-semibold text-blue-900 mb-4">Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <div className="text-sm text-blue-700">Total Concrete</div>
              <div className="text-2xl font-bold text-blue-900">
                {summary.totalConcrete.toFixed(3)} m³
              </div>
            </div>
            <div>
              <div className="text-sm text-orange-700">Total Rebar</div>
              <div className="text-2xl font-bold text-orange-900">
                {summary.totalRebar?.toFixed(2) || '0.00'} kg
              </div>
            </div>
            <div>
              <div className="text-sm text-purple-700">Total Formwork</div>
              <div className="text-2xl font-bold text-purple-900">
                {summary.totalFormwork?.toFixed(2) || '0.00'} m²
              </div>
            </div>
            <div>
              <div className="text-sm text-blue-700">Elements Processed</div>
              <div className="text-2xl font-bold text-blue-900">{summary.elementCount}</div>
            </div>
            <div>
              <div className="text-sm text-blue-700">Takeoff Lines</div>
              <div className="text-2xl font-bold text-blue-900">{summary.takeoffLineCount}</div>
            </div>
          </div>
          
          {/* Breakdown by type */}
          {(beamLines.length > 0 || slabLines.length > 0 || columnLines.length > 0 || foundationLines.length > 0) && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="text-sm text-blue-700 mb-2">Breakdown by Element Type</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {beamLines.length > 0 && (
                  <div className="bg-white rounded p-3">
                    <div className="text-xs text-gray-600">Beams</div>
                    <div className="text-lg font-semibold text-blue-900">
                      {beamLines.reduce((sum, line) => sum + line.quantity, 0).toFixed(3)} m³
                    </div>
                    <div className="text-xs text-gray-500">{beamLines.length} items</div>
                  </div>
                )}
                {slabLines.length > 0 && (
                  <div className="bg-white rounded p-3">
                    <div className="text-xs text-gray-600">Slabs</div>
                    <div className="text-lg font-semibold text-green-900">
                      {slabLines.reduce((sum, line) => sum + line.quantity, 0).toFixed(3)} m³
                    </div>
                    <div className="text-xs text-gray-500">{slabLines.length} items</div>
                  </div>
                )}
                {columnLines.length > 0 && (
                  <div className="bg-white rounded p-3">
                    <div className="text-xs text-gray-600">Columns</div>
                    <div className="text-lg font-semibold text-purple-900">
                      {columnLines.reduce((sum, line) => sum + line.quantity, 0).toFixed(3)} m³
                    </div>
                    <div className="text-xs text-gray-500">{columnLines.length} items</div>
                  </div>
                )}
                {foundationLines.length > 0 && (
                  <div className="bg-white rounded p-3">
                    <div className="text-xs text-gray-600">Foundations</div>
                    <div className="text-lg font-semibold text-orange-900">
                      {foundationLines.reduce((sum, line) => sum + line.quantity, 0).toFixed(3)} m³
                    </div>
                    <div className="text-xs text-gray-500">{foundationLines.length} items</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Takeoff Lines Table */}
      {takeoffLines.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h4 className="font-semibold text-gray-700">Takeoff Lines</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setSummarizedView(true)}
                  className={`px-3 py-1 text-sm rounded ${
                    summarizedView
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Summarized
                </button>
                <button
                  onClick={() => setSummarizedView(false)}
                  className={`px-3 py-1 text-sm rounded ${
                    !summarizedView
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Detailed
                </button>
              </div>
            </div>
            
            {/* Filter */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Trade:</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="all">All Trades</option>
                  <option value="Concrete">Concrete Only</option>
                  <option value="Rebar">Rebar Only</option>
                  <option value="Formwork">Formwork Only</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Element:</label>
                <select
                  value={filterType.startsWith('type:') ? filterType.replace('type:', '') : 'all'}
                  onChange={(e) => setFilterType(e.target.value === 'all' ? 'all' : `type:${e.target.value}`)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="all">All Elements</option>
                  <option value="beam">Beams</option>
                  <option value="slab">Slabs</option>
                  <option value="column">Columns</option>
                  <option value="foundation">Foundations</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Template</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                  {summarizedView && (
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Count</th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Formula</th>
                  {!summarizedView && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assumptions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(summarizedView ? (() => {
                  // Group by template + level + trade to create summarized view
                  const grouped: Record<string, TakeoffLine[]> = {};
                  
                  filteredLines.forEach(line => {
                    const templateTag = line.tags.find(tag => tag.startsWith('template:'))?.replace('template:', '') || 'Unknown';
                    const levelTag = line.tags.find(tag => tag.startsWith('level:'))?.replace('level:', '') || 'Unknown';
                    const key = `${line.trade}_${templateTag}_${levelTag}`;
                    
                    if (!grouped[key]) {
                      grouped[key] = [];
                    }
                    grouped[key].push(line);
                  });
                  
                  return Object.values(grouped).map(lines => ({
                    ...lines[0],
                    id: `grouped_${lines[0].id}`,
                    quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
                    formulaText: lines.length > 1 ? `${lines.length} instances` : lines[0].formulaText,
                  }));
                })() : filteredLines).map((line, idx) => {
                  const isGrouped = summarizedView && line.formulaText.includes('instances');
                  const instanceCount = isGrouped ? parseInt(line.formulaText.split(' ')[0]) : 0;
                  const typeTag = line.tags.find(tag => tag.startsWith('type:'))?.replace('type:', '') || 'unknown';
                  const templateTag = line.tags.find(tag => tag.startsWith('template:'))?.replace('template:', '') || 'Unknown';
                  const levelTag = line.tags.find(tag => tag.startsWith('level:'))?.replace('level:', '') || 'Unknown';
                  
                  const typeColors = {
                    beam: 'text-blue-700 bg-blue-50',
                    slab: 'text-green-700 bg-green-50',
                    column: 'text-purple-700 bg-purple-50',
                  };
                  const typeColor = typeColors[typeTag as keyof typeof typeColors] || 'text-gray-700 bg-gray-50';

                  return (
                    <tr key={line.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${typeColor} capitalize`}>
                          {typeTag}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{templateTag}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{levelTag}</td>
                      {summarizedView && (
                        <td className="px-4 py-3 text-sm text-center font-semibold text-gray-700">
                          {isGrouped ? instanceCount : 1}
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                        {line.quantity.toFixed(line.unit === 'kg' ? 2 : 3)} {line.unit}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 font-mono max-w-md">
                        {isGrouped ? `Total of ${instanceCount} instances` : line.formulaText}
                      </td>
                      {!summarizedView && (
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {line.assumptions.map((assumption, idx) => (
                            <div key={idx}>• {assumption}</div>
                          ))}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 font-semibold">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm text-gray-700">
                    Subtotal ({filteredLines.length} items)
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">
                    {filteredLines.reduce((sum, line) => sum + line.quantity, 0).toFixed(3)} m³
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && takeoffLines.length === 0 && summary === null && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500">
            Click "Generate Takeoff" to calculate concrete quantities from your placed elements
          </p>
        </div>
      )}
    </div>
  );
}
