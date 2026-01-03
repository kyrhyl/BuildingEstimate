'use client';

import React, { useState, useEffect } from 'react';
import type { BOQLine, TakeoffLine } from '@/types';
import { classifyDPWHItem, sortDPWHParts } from '@/lib/dpwhClassification';

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
  const [filterType, setFilterType] = useState('all');
  const [expandedParts, setExpandedParts] = useState<Set<string>>(new Set());

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

  const exportToPDF = async () => {
    if (boqLines.length === 0) return;

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
    doc.text('BILL OF QUANTITIES', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('DPWH Volume III - 2023 Edition', pageWidth / 2, 28, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Project ID: ${projectId}`, pageWidth / 2, 36, { align: 'center' });
    doc.text(`Generated: ${currentDate}`, pageWidth / 2, 42, { align: 'center' });
    
    let yPos = 55;

    // Summary Section
    if (summary) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('SUMMARY', 14, yPos);
      yPos += 10;

      const summaryData = Object.entries(summary.trades)
        .filter(([_, qty]) => qty > 0)
        .map(([trade, qty]) => {
          // Determine unit and decimals based on trade
          let unit = 'm³';
          let decimals = 3;
          
          // Find a sample BOQ line for this trade to get the actual unit
          const sampleLine = boqLines.find(line => line.tags.some(tag => tag === `trade:${trade}`));
          if (sampleLine) {
            unit = sampleLine.unit;
            decimals = unit === 'kg' ? 2 : 3;
          }
          
          return [
            trade === 'Concrete' ? 'Concrete Works' : 
            trade === 'Rebar' ? 'Reinforcing Steel' :
            trade === 'Formwork' ? 'Formwork' :
            trade === 'Roofing' ? 'Roofing Works' :
            trade === 'Finishes' ? 'Finishing Works' :
            `${trade} Works`,
            qty.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
            unit
          ];
        });

      autoTable(doc, {
        startY: yPos,
        head: [['Trade', 'Total Quantity', 'Unit']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94], fontStyle: 'bold' },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Group BOQ Lines by DPWH Part and Subcategory
    const byPartAndSubcategory: Record<string, Record<string, BOQLine[]>> = {};
    
    boqLines.forEach(line => {
      // Get DPWH item number from dpwhItemNumberRaw field
      const dpwhItemNumber = line.dpwhItemNumberRaw || '';
      
      // Get category from tags or infer from description
      const tradeTag = line.tags.find(tag => tag.startsWith('trade:'));
      const category = tradeTag ? tradeTag.replace('trade:', '') : '';
      
      // Classify the item
      const classification = classifyDPWHItem(dpwhItemNumber, category);
      const partKey = classification.part;
      const subcategoryKey = classification.subcategory;
      
      if (!byPartAndSubcategory[partKey]) {
        byPartAndSubcategory[partKey] = {};
      }
      if (!byPartAndSubcategory[partKey][subcategoryKey]) {
        byPartAndSubcategory[partKey][subcategoryKey] = [];
      }
      byPartAndSubcategory[partKey][subcategoryKey].push(line);
    });

    // Sort parts in DPWH order (C, D, E, F, G)
    const sortedParts = Object.keys(byPartAndSubcategory).sort(sortDPWHParts);
    
    for (const partName of sortedParts) {
      const subcategories = byPartAndSubcategory[partName];

      // Check if we need a new page for the Part header
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      // Part Header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(34, 197, 94); // Green
      doc.rect(14, yPos - 5, pageWidth - 28, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(partName, 16, yPos + 2);
      doc.setTextColor(0, 0, 0);
      yPos += 12;

      // Sort subcategories alphabetically
      const sortedSubcategories = Object.keys(subcategories).sort();
      
      for (const subcategoryName of sortedSubcategories) {
        const subcategoryLines = subcategories[subcategoryName];
        if (subcategoryLines.length === 0) continue;

        // Check if we need a new page
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }

        // Subcategory Header
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(240, 240, 240);
        doc.rect(14, yPos - 4, pageWidth - 28, 8, 'F');
        doc.text(`  ${subcategoryName}`, 16, yPos + 1);
        yPos += 8;

        const tableData = subcategoryLines.map(line => {
          const sourceLines = getSourceTakeoffLines(line.sourceTakeoffLineIds);
          
          // Get element type breakdown
          const elementTypes: Record<string, number> = {};
          sourceLines.forEach(source => {
            const typeTag = source.tags.find(tag => tag.startsWith('type:'))?.replace('type:', '') 
              || source.tags.find(tag => tag.startsWith('component:'))?.replace('component:', '')
              || source.tags.find(tag => tag.startsWith('category:'))?.replace('category:', '')
              || source.trade.toLowerCase();
            elementTypes[typeTag] = (elementTypes[typeTag] || 0) + 1;
          });
          const elementBreakdown = Object.entries(elementTypes)
            .map(([type, count]) => `${count} ${type}`)
            .join(', ');
          
          return [
            line.dpwhItemNumberRaw,
            line.description,
            line.unit === 'kg' 
              ? line.quantity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : line.quantity.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
            line.unit,
            elementBreakdown,
            sourceLines.length.toString()
          ];
        });

        autoTable(doc, {
          startY: yPos,
          head: [['Item No.', 'Description', 'Quantity', 'Unit', 'Element Breakdown', 'Sources']],
          body: tableData,
          theme: 'striped',
          headStyles: { 
            fillColor: [59, 130, 246],
            fontStyle: 'bold',
            fontSize: 8
          },
          styles: { fontSize: 7, cellPadding: 1.5 },
          columnStyles: {
            0: { cellWidth: 18, fontStyle: 'bold', fontSize: 8 },
            1: { cellWidth: 65 },
            2: { cellWidth: 22, halign: 'right' },
            3: { cellWidth: 12 },
            4: { cellWidth: 48, fontSize: 6 },
            5: { cellWidth: 15, halign: 'center' }
          },
          margin: { left: 14, right: 14 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;
      }

      yPos += 5; // Extra space between parts
    }

    // Detailed Source Traceability Section (New Page)
    doc.addPage();
    yPos = 20;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DETAILED SOURCE TRACEABILITY', 14, yPos);
    yPos += 12;

    for (const line of boqLines) {
      const sourceLines = getSourceTakeoffLines(line.sourceTakeoffLineIds);
      
      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${line.dpwhItemNumberRaw} - ${line.description.substring(0, 60)}...`, 14, yPos);
      yPos += 6;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total: ${line.quantity.toFixed(line.unit === 'kg' ? 2 : 3)} ${line.unit} from ${sourceLines.length} source(s)`, 14, yPos);
      yPos += 8;

      // Source lines table
      const sourceData = sourceLines.map(source => {
        const templateTag = source.tags.find(tag => tag.startsWith('template:'))?.replace('template:', '') 
          || source.tags.find(tag => tag.startsWith('finish:'))?.replace('finish:', '')
          || source.tags.find(tag => tag.startsWith('component:'))?.replace('component:', '')
          || 'N/A';
        const levelTag = source.tags.find(tag => tag.startsWith('level:'))?.replace('level:', '') 
          || source.tags.find(tag => tag.startsWith('space:'))?.replace('space:', '')
          || 'N/A';
        
        return [
          templateTag,
          levelTag,
          source.quantity.toFixed(source.unit === 'kg' ? 2 : 3),
          source.unit,
          source.formulaText
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Template', 'Level', 'Qty', 'Unit', 'Formula']],
        body: sourceData,
        theme: 'plain',
        headStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 7, cellPadding: 1.5 },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 20 },
          2: { cellWidth: 20, halign: 'right' },
          3: { cellWidth: 15 },
          4: { cellWidth: 'auto', fontSize: 6 }
        },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 8;
    }

    // Footer on all pages
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
      doc.text(
        'Building Estimate - DPWH Compliant',
        14,
        doc.internal.pageSize.height - 10
      );
    }

    // Save PDF
    doc.save(`BOQ_Report_${projectId}_${new Date().toISOString().split('T')[0]}.pdf`);
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
          <div className="flex gap-3">
            <button
              onClick={exportToPDF}
              disabled={boqLines.length === 0}
              className="px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Export PDF Report
            </button>
            <button
              onClick={generateBOQ}
              disabled={loading || takeoffLines.length === 0}
              className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 font-medium"
            >
              {loading ? 'Generating...' : hasBoq ? 'Regenerate BOQ' : 'Generate BOQ'}
            </button>
          </div>
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
                {(summary.trades.Concrete || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} m³
              </div>
            </div>
            <div>
              <div className="text-sm text-orange-700">Total Rebar</div>
              <div className="text-2xl font-bold text-orange-900">
                {(summary.trades.Rebar || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
              </div>
            </div>
            <div>
              <div className="text-sm text-purple-700">Total Formwork</div>
              <div className="text-2xl font-bold text-purple-900">
                {(summary.trades.Formwork || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²
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
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h4 className="font-semibold text-gray-700">BOQ Items (DPWH Volume III)</h4>
            
            {/* Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">DPWH Part:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="all">All Parts</option>
                <option value="PART C">Part C - Earthwork</option>
                <option value="PART D">Part D - Concrete Works</option>
                <option value="PART E">Part E - Finishing Works</option>
                <option value="PART F">Part F - Metal & Electrical</option>
                <option value="PART G">Part G - Marine & Other</option>
              </select>
            </div>
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
                {(() => {
                  const rows: React.ReactElement[] = [];
                  
                  // Filter BOQ lines by selected DPWH Part
                  const filteredLines = filterType === 'all' ? boqLines : boqLines.filter(line => {
                    const dpwhTag = line.tags.find(tag => tag.startsWith('dpwh:'));
                    const dpwhItemNo = dpwhTag ? dpwhTag.replace('dpwh:', '') : (line.dpwhItemNumberRaw || '');
                    const tradeTag = line.tags.find(tag => tag.startsWith('trade:'));
                    const category = tradeTag ? tradeTag.replace('trade:', '') : '';
                    const classification = classifyDPWHItem(dpwhItemNo, category);
                    return classification.part === filterType;
                  });
                  
                  // Group lines by DPWH Part and Subcategory
                  const byPartAndSubcategory: Record<string, Record<string, BOQLine[]>> = {};
                  
                  filteredLines.forEach(line => {
                    const dpwhTag = line.tags.find(tag => tag.startsWith('dpwh:'));
                    const dpwhItemNo = dpwhTag ? dpwhTag.replace('dpwh:', '') : (line.dpwhItemNumberRaw || '');
                    const tradeTag = line.tags.find(tag => tag.startsWith('trade:'));
                    const category = tradeTag ? tradeTag.replace('trade:', '') : '';
                    const classification = classifyDPWHItem(dpwhItemNo, category);
                    const part = classification.part;
                    const subcategory = classification.subcategory;
                    
                    if (!byPartAndSubcategory[part]) {
                      byPartAndSubcategory[part] = {};
                    }
                    if (!byPartAndSubcategory[part][subcategory]) {
                      byPartAndSubcategory[part][subcategory] = [];
                    }
                    byPartAndSubcategory[part][subcategory].push(line);
                  });
                  
                  // Sort parts in DPWH order
                  const sortedParts = Object.keys(byPartAndSubcategory).sort(sortDPWHParts);
                  
                  sortedParts.forEach(part => {
                    const subcategories = byPartAndSubcategory[part];
                    const partItemCount = Object.values(subcategories).flat().length;
                    const isPartExpanded = expandedParts.has(part);
                    
                    // Part header row
                    rows.push(
                      <tr 
                        key={`part-${part}`} 
                        className="bg-blue-100 cursor-pointer hover:bg-blue-200"
                        onClick={() => {
                          const newExpanded = new Set(expandedParts);
                          if (newExpanded.has(part)) {
                            newExpanded.delete(part);
                          } else {
                            newExpanded.add(part);
                          }
                          setExpandedParts(newExpanded);
                        }}
                      >
                        <td colSpan={6} className="px-4 py-3 text-sm font-bold text-gray-900">
                          <div className="flex items-center gap-2">
                            <span>{isPartExpanded ? '▼' : '▶'}</span>
                            <span>{part}</span>
                            <span className="text-xs font-normal text-gray-600">({partItemCount} items)</span>
                          </div>
                        </td>
                      </tr>
                    );
                    
                    // Show subcategories if part is expanded
                    if (isPartExpanded) {
                      const sortedSubcategories = Object.keys(subcategories).sort();
                      
                      sortedSubcategories.forEach(subcategory => {
                        const subcategoryLines = subcategories[subcategory];
                        
                        // Subcategory header row
                        rows.push(
                          <tr key={`subcat-${part}-${subcategory}`} className="bg-blue-50">
                            <td colSpan={6} className="px-8 py-2 text-sm font-semibold text-gray-800">
                              {subcategory} ({subcategoryLines.length} items)
                            </td>
                          </tr>
                        );
                        
                        // Render individual BOQ lines
                        subcategoryLines.forEach((line) => {
                          const isExpanded = expandedLines.has(line.id);
                          const sourceLines = getSourceTakeoffLines(line.sourceTakeoffLineIds);
                          const isConcrete = line.tags.some(tag => tag === 'trade:Concrete');
                          const isRebar = line.tags.some(tag => tag === 'trade:Rebar');
                          const isFormwork = line.tags.some(tag => tag === 'trade:Formwork');

                          rows.push(
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
                                  {line.unit === 'kg' 
                                    ? line.quantity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                    : line.quantity.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
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
                                          const templateTag = source.tags.find(tag => tag.startsWith('template:'))?.replace('template:', '') 
                                            || source.tags.find(tag => tag.startsWith('finish:'))?.replace('finish:', '')
                                            || source.tags.find(tag => tag.startsWith('component:'))?.replace('component:', '')
                                            || source.tags.find(tag => tag.startsWith('section:'))?.replace('section:', '')
                                            || source.resourceKey.split('-')[0] || 'N/A';
                                          const levelTag = source.tags.find(tag => tag.startsWith('level:'))?.replace('level:', '') 
                                            || source.tags.find(tag => tag.startsWith('space:'))?.replace('space:', '')
                                            || 'N/A';
                                          
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
                                                  <span className="font-medium">
                                                    {source.unit === 'kg'
                                                      ? source.quantity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                      : source.quantity.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} {source.unit}
                                                  </span>
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
                        });
                      });
                    }
                  });
                  
                  return rows;
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
