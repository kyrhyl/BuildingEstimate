'use client';

import React, { useState, useEffect } from 'react';
import type { BOQLine, TakeoffLine } from '@/types';

interface BOQViewerProps {
  projectId: string;
  takeoffLines: TakeoffLine[];
}

interface BOQSummary {
  totalLines: number;
  totalQuantity: number;
  trades: {
    Concrete: number;
    Rebar: number;
    Formwork: number;
  };
}

interface CalcRun {
  runId: string;
  timestamp: string;
  boqLines: BOQLine[];
  summary: {
    totalConcrete: number;
    totalRebar: number;
    totalFormwork: number;
    takeoffLineCount: number;
    boqLineCount: number;
  };
}

export default function BOQViewer({ projectId, takeoffLines }: BOQViewerProps) {
  const [boqLines, setBoqLines] = useState<BOQLine[]>([]);
  const [summary, setSummary] = useState<BOQSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  const [lastCalculated, setLastCalculated] = useState<string | null>(null);
  const [hasBoq, setHasBoq] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);

  // Load latest CalcRun on mount
  useEffect(() => {
    loadLatestCalcRun();
  }, [projectId]);

  const loadLatestCalcRun = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/calcruns/latest`);
      if (res.ok) {
        const data: CalcRun = await res.json();
        if (data.boqLines && data.boqLines.length > 0) {
          setBoqLines(data.boqLines);
          const concreteLines = data.boqLines.filter(line => line.tags.some(tag => tag === 'trade:Concrete'));
          const rebarLines = data.boqLines.filter(line => line.tags.some(tag => tag === 'trade:Rebar'));
          const formworkLines = data.boqLines.filter(line => line.tags.some(tag => tag === 'trade:Formwork'));
          const totalConcreteQty = concreteLines.reduce((sum, line) => sum + line.quantity, 0);
          const totalRebarQty = rebarLines.reduce((sum, line) => sum + line.quantity, 0);
          const totalFormworkQty = formworkLines.reduce((sum, line) => sum + line.quantity, 0);
          setSummary({
            totalLines: data.summary.boqLineCount || 0,
            totalQuantity: totalConcreteQty + totalRebarQty + totalFormworkQty,
            trades: { 
              Concrete: totalConcreteQty,
              Rebar: totalRebarQty,
              Formwork: totalFormworkQty,
            },
          });
          setLastCalculated(data.timestamp);
          setHasBoq(true);
          setCurrentRunId(data.runId);
        }
      }
    } catch (err) {
      console.error('Failed to load latest calc run:', err);
    }
  };

  const generateBOQ = async () => {
    try {
      setLoading(true);
      setError(null);
      setWarnings([]);

      const res = await fetch(`/api/projects/${projectId}/boq`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          takeoffLines,
          runId: currentRunId, // Pass runId to update existing CalcRun
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate BOQ');
      }

      const data = await res.json();
      setBoqLines(data.boqLines || []);
      setSummary(data.summary || null);
      setLastCalculated(new Date().toISOString());
      setHasBoq(true);
      if (data.warnings && data.warnings.length > 0) {
        setWarnings(data.warnings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate BOQ');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (lineId: string) => {
    const newExpanded = new Set(expandedLines);
    if (newExpanded.has(lineId)) {
      newExpanded.delete(lineId);
    } else {
      newExpanded.add(lineId);
    }
    setExpandedLines(newExpanded);
  };

  const getSourceTakeoffLines = (sourceIds: string[]): TakeoffLine[] => {
    return takeoffLines.filter(line => sourceIds.includes(line.id));
  };

  return (
    <div className="space-y-6">
      {/* Generate Button */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold mb-2">Bill of Quantities (BOQ)</h3>
            <p className="text-sm text-gray-600">
              Map concrete and rebar takeoff to DPWH pay items
            </p>
            {lastCalculated && (
              <p className="text-xs text-gray-500 mt-1">
                Last generated: {new Date(lastCalculated).toLocaleString()}
              </p>
            )}
          </div>
          <button
            onClick={generateBOQ}
            disabled={loading || takeoffLines.length === 0}
            className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 font-medium"
          >
            {loading ? 'Generating...' : hasBoq ? 'Regenerate BOQ' : 'Generate BOQ'}
          </button>
        </div>

        {takeoffLines.length === 0 && (
          <p className="mt-4 text-sm text-amber-600">
            No takeoff lines available. Generate takeoff first.
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Warnings Display */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-semibold text-amber-800 mb-2">Warnings</h4>
          <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
            {warnings.map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h4 className="font-semibold text-green-900 mb-4">BOQ Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <div className="text-sm text-blue-700">Total Concrete</div>
              <div className="text-2xl font-bold text-blue-900">
                {summary.trades.Concrete?.toFixed(3) || '0.000'} m³
              </div>
            </div>
            <div>
              <div className="text-sm text-orange-700">Total Rebar</div>
              <div className="text-2xl font-bold text-orange-900">
                {summary.trades.Rebar?.toFixed(2) || '0.00'} kg
              </div>
            </div>
            <div>
              <div className="text-sm text-purple-700">Total Formwork</div>
              <div className="text-2xl font-bold text-purple-900">
                {summary.trades.Formwork?.toFixed(2) || '0.00'} m²
              </div>
            </div>
            <div>
              <div className="text-sm text-green-700">BOQ Lines</div>
              <div className="text-2xl font-bold text-green-900">{summary.totalLines}</div>
            </div>
            <div>
              <div className="text-sm text-green-700">Trades</div>
              <div className="text-2xl font-bold text-green-900">
                {Object.keys(summary.trades).filter(t => summary.trades[t as keyof typeof summary.trades] > 0).length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOQ Lines Table */}
      {boqLines.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="font-semibold text-gray-700">BOQ Items (DPWH Volume III)</h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item No.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Unit</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sources</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {boqLines.map((line) => {
                  const isExpanded = expandedLines.has(line.id);
                  const sourceLines = getSourceTakeoffLines(line.sourceTakeoffLineIds);
                  const isConcrete = line.tags.some(tag => tag === 'trade:Concrete');
                  const isRebar = line.tags.some(tag => tag === 'trade:Rebar');
                  const isFormwork = line.tags.some(tag => tag === 'trade:Formwork');

                  return (
                    <React.Fragment key={line.id}>
                      <tr className={`hover:bg-gray-50 ${isConcrete ? 'bg-blue-50/30' : isRebar ? 'bg-orange-50/30' : isFormwork ? 'bg-purple-50/30' : ''}`}>
                        <td className="px-4 py-3 text-sm font-mono text-blue-600">
                          {line.dpwhItemNumberRaw}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <span>{line.description}</span>
                            {isConcrete && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Concrete</span>
                            )}
                            {isRebar && (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">Rebar</span>
                            )}
                            {isFormwork && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">Formwork</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                          {line.unit === 'kg' ? line.quantity.toFixed(2) : line.quantity.toFixed(3)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-600">
                          {line.unit}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-600">
                          {line.sourceTakeoffLineIds.length} takeoff line{line.sourceTakeoffLineIds.length !== 1 ? 's' : ''}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleExpand(line.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            {isExpanded ? 'Hide' : 'Show'}
                          </button>
                        </td>
                      </tr>
                      
                      {/* Expanded Details */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="px-4 py-4 bg-gray-50">
                            <div className="space-y-3">
                              <h5 className="font-semibold text-sm text-gray-700">Source Takeoff Lines:</h5>
                              <div className="space-y-2">
                                {sourceLines.map((source) => {
                                  const templateTag = source.tags.find(tag => tag.startsWith('template:'))?.replace('template:', '') || 'Unknown';
                                  const levelTag = source.tags.find(tag => tag.startsWith('level:'))?.replace('level:', '') || 'Unknown';
                                  
                                  return (
                                    <div key={source.id} className="bg-white border border-gray-200 rounded p-3">
                                      <div className="grid grid-cols-4 gap-2 text-xs">
                                        <div>
                                          <span className="text-gray-500">Template:</span>{' '}
                                          <span className="font-medium">{templateTag}</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Level:</span>{' '}
                                          <span className="font-medium">{levelTag}</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Quantity:</span>{' '}
                                          <span className="font-medium">{source.quantity.toFixed(3)} {source.unit}</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Formula:</span>{' '}
                                          <span className="font-mono text-xs">{source.formulaText}</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {/* Tags */}
                              <div>
                                <h5 className="font-semibold text-xs text-gray-700 mb-1">Tags:</h5>
                                <div className="flex flex-wrap gap-1">
                                  {line.tags.map((tag, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
