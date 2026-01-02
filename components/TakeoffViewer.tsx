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

  const exportToPDF = async () => {
    if (takeoffLines.length === 0) return;

    const jsPDF = (await import('jspdf')).default;
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Title Page
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('QUANTITY TAKEOFF REPORT', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Project ID: ${projectId}`, pageWidth / 2, 30, { align: 'center' });
    doc.text(`Generated: ${currentDate}`, pageWidth / 2, 36, { align: 'center' });
    
    let yPos = 50;

    // Summary Section
    if (summary) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('SUMMARY', 14, yPos);
      yPos += 10;

      // Group quantities by trade and unit
      const tradeSummary: Record<string, { qty: number; unit: string; count: number }> = {};
      takeoffLines.forEach(line => {
        const key = `${line.trade}_${line.unit}`;
        if (!tradeSummary[key]) {
          tradeSummary[key] = { qty: 0, unit: line.unit, count: 0 };
        }
        tradeSummary[key].qty += line.quantity;
        tradeSummary[key].count += 1;
      });

      const summaryBody = Object.entries(tradeSummary).map(([key, data]) => {
        const trade = key.split('_')[0];
        const decimals = data.unit === 'kg' ? 2 : 3;
        return [
          trade,
          data.qty.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
          data.unit,
          '-',
          data.count.toString()
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Trade', 'Quantity', 'Unit', 'Elements', 'Lines']],
        body: summaryBody,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Detailed Takeoff by Trade
    const uniqueTrades = [...new Set(takeoffLines.map(line => line.trade))].sort();
    
    for (const trade of uniqueTrades) {
      const tradeLines = takeoffLines.filter(line => line.trade === trade);
      if (tradeLines.length === 0) continue;

      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${trade.toUpperCase()} TAKEOFF`, 14, yPos);
      yPos += 8;

      const tableData = tradeLines.map(line => {
        const typeTag = line.tags.find(tag => tag.startsWith('type:'))?.replace('type:', '') 
          || line.tags.find(tag => tag.startsWith('component:'))?.replace('component:', '')
          || line.tags.find(tag => tag.startsWith('category:'))?.replace('category:', '')
          || line.trade.toLowerCase();
        const templateTag = line.tags.find(tag => tag.startsWith('template:'))?.replace('template:', '') 
          || line.tags.find(tag => tag.startsWith('finish:'))?.replace('finish:', '')
          || line.tags.find(tag => tag.startsWith('section:'))?.replace('section:', '')
          || line.resourceKey.split('-')[0] || 'N/A';
        const levelTag = line.tags.find(tag => tag.startsWith('level:'))?.replace('level:', '') 
          || line.tags.find(tag => tag.startsWith('space:'))?.replace('space:', '')
          || 'N/A';
        
        return [
          typeTag,
          templateTag,
          levelTag,
          line.unit === 'kg' 
            ? line.quantity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : line.quantity.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
          line.unit,
          line.formulaText
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Type', 'Template', 'Level', 'Quantity', 'Unit', 'Formula']],
        body: tableData,
        theme: 'striped',
        headStyles: { 
          fillColor: trade === 'Concrete' ? [59, 130, 246] : trade === 'Rebar' ? [249, 115, 22] : [168, 85, 247],
          fontStyle: 'bold' 
        },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 30 },
          2: { cellWidth: 20 },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 15 },
          5: { cellWidth: 'auto', fontSize: 7 }
        },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Footer on last page
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    // Save PDF
    doc.save(`Takeoff_Report_${projectId}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

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
          <div className="flex gap-3">
            <button
              onClick={exportToPDF}
              disabled={takeoffLines.length === 0}
              className="px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Export PDF Report
            </button>
            <button
              onClick={generateTakeoff}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium"
            >
              {loading ? 'Calculating...' : hasCalcRun ? 'Recalculate Takeoff' : 'Generate Takeoff'}
            </button>
          </div>
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
                {summary.totalConcrete.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} m³
              </div>
            </div>
            <div>
              <div className="text-sm text-orange-700">Total Rebar</div>
              <div className="text-2xl font-bold text-orange-900">
                {(summary.totalRebar || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
              </div>
            </div>
            <div>
              <div className="text-sm text-purple-700">Total Formwork</div>
              <div className="text-2xl font-bold text-purple-900">
                {(summary.totalFormwork || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²
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
                      {beamLines.reduce((sum, line) => sum + line.quantity, 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} m³
                    </div>
                    <div className="text-xs text-gray-500">{beamLines.length} items</div>
                  </div>
                )}
                {slabLines.length > 0 && (
                  <div className="bg-white rounded p-3">
                    <div className="text-xs text-gray-600">Slabs</div>
                    <div className="text-lg font-semibold text-green-900">
                      {slabLines.reduce((sum, line) => sum + line.quantity, 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} m³
                    </div>
                    <div className="text-xs text-gray-500">{slabLines.length} items</div>
                  </div>
                )}
                {columnLines.length > 0 && (
                  <div className="bg-white rounded p-3">
                    <div className="text-xs text-gray-600">Columns</div>
                    <div className="text-lg font-semibold text-purple-900">
                      {columnLines.reduce((sum, line) => sum + line.quantity, 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} m³
                    </div>
                    <div className="text-xs text-gray-500">{columnLines.length} items</div>
                  </div>
                )}
                {foundationLines.length > 0 && (
                  <div className="bg-white rounded p-3">
                    <div className="text-xs text-gray-600">Foundations</div>
                    <div className="text-lg font-semibold text-orange-900">
                      {foundationLines.reduce((sum, line) => sum + line.quantity, 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} m³
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
                  <option value="Concrete">Concrete</option>
                  <option value="Rebar">Rebar</option>
                  <option value="Formwork">Formwork</option>
                  <option value="Roofing">Roofing</option>
                  <option value="Finishes">Finishes</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Carpentry">Carpentry</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Doors & Windows">Doors & Windows</option>
                  <option value="Other">Other</option>
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
                    const templateTag = line.tags.find(tag => tag.startsWith('template:'))?.replace('template:', '') || 'N/A';
                    const levelTag = line.tags.find(tag => tag.startsWith('level:'))?.replace('level:', '') || 'N/A';
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
                  
                  // Extract tags with proper fallbacks
                  const typeTag = line.tags.find(tag => tag.startsWith('type:'))?.replace('type:', '') 
                    || line.tags.find(tag => tag.startsWith('component:'))?.replace('component:', '')
                    || line.tags.find(tag => tag.startsWith('category:'))?.replace('category:', '')
                    || line.trade.toLowerCase();
                    
                  const templateTag = line.tags.find(tag => tag.startsWith('template:'))?.replace('template:', '') 
                    || line.tags.find(tag => tag.startsWith('finish:'))?.replace('finish:', '')
                    || line.tags.find(tag => tag.startsWith('section:'))?.replace('section:', '')
                    || line.resourceKey.split('-')[0] || 'N/A';
                    
                  const levelTag = line.tags.find(tag => tag.startsWith('level:'))?.replace('level:', '') 
                    || line.tags.find(tag => tag.startsWith('space:'))?.replace('space:', '')
                    || 'N/A';
                  
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
                        {line.unit === 'kg' 
                          ? line.quantity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : line.quantity.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} {line.unit}
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
                  <td colSpan={summarizedView ? 4 : 3} className="px-4 py-3 text-sm text-gray-700">
                    Subtotal ({filteredLines.length} items)
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">
                    {(() => {
                      // Group by unit and sum
                      const byUnit: Record<string, number> = {};
                      filteredLines.forEach(line => {
                        byUnit[line.unit] = (byUnit[line.unit] || 0) + line.quantity;
                      });
                      
                      return Object.entries(byUnit).map(([unit, qty]) => (
                        <div key={unit}>
                          {qty.toLocaleString('en-US', { 
                            minimumFractionDigits: unit === 'kg' ? 2 : 3, 
                            maximumFractionDigits: unit === 'kg' ? 2 : 3 
                          })} {unit}
                        </div>
                      ));
                    })()}
                  </td>
                  <td colSpan={summarizedView ? 1 : 2}></td>
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
