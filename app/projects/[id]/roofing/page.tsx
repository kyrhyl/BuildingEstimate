'use client';

/**
 * Parametric Roofing Management Page
 * Simple, intuitive roof configuration using parameters
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { generateParametricRoof, type RoofParameters, type RoofStyle, type PitchFormat, type ParametricRoofResult } from '@/lib/math/roofing/parametric';

interface RoofType {
  id: string;
  name: string;
  dpwhItemNumberRaw: string;
  unit: string;
}

interface RoofConfiguration {
  id?: string;
  name: string;
  params: RoofParameters;
  roofTypeId: string;
  generated?: ParametricRoofResult;
}

export default function ParametricRoofingPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [roofTypes, setRoofTypes] = useState<RoofType[]>([]);
  const [config, setConfig] = useState<RoofConfiguration>({
    name: 'Main Roof',
    params: {
      style: 'gable',
      length_m: 10,
      width_m: 8,
      pitchFormat: 'rise-run',
      pitchRise: 4,
      pitchRun: 12,
      overhang_m: 0.6,
    },
    roofTypeId: '',
  });
  
  const [preview, setPreview] = useState<ParametricRoofResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [projectId]);

  useEffect(() => {
    // Auto-generate preview when params change
    try {
      const result = generateParametricRoof(config.params);
      setPreview(result);
    } catch (error) {
      console.error('Error generating roof:', error);
      setPreview(null);
    }
  }, [config.params]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/roof-types`);
      const data = await res.json();
      setRoofTypes(data.roofTypes || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // TODO: Save configuration to project
    alert('Roof configuration saved! (Implementation pending)');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="text-sm text-gray-600 hover:text-gray-900 mb-2 flex items-center gap-1"
          >
            ← Back to Project
          </button>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                  PART E - MODE B
                </span>
                <span className="text-xs text-gray-500">Parametric Roof Configuration</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Roofing System</h1>
              <p className="text-gray-600 mt-2">
                Configure your roof with simple parameters - we'll calculate the geometry
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Configuration Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-6">Roof Configuration</h2>
            
            <div className="space-y-6">
              {/* Roof Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Roof Name
                </label>
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Main Roof, Garage Roof"
                />
              </div>

              {/* Roof Style */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Roof Style
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['gable', 'hip', 'flat', 'gambrel'] as RoofStyle[]).map((style) => (
                    <button
                      key={style}
                      onClick={() => setConfig({
                        ...config,
                        params: { ...config.params, style }
                      })}
                      className={`px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all ${
                        config.params.style === style
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="text-center">
                        {style === 'gable' && '⌂'}
                        {style === 'hip' && '⛰️'}
                        {style === 'flat' && '▭'}
                        {style === 'gambrel' && '⌂⌂'}
                        <div className="mt-1 capitalize">{style}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Building Dimensions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Length (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.params.length_m}
                    onChange={(e) => setConfig({
                      ...config,
                      params: { ...config.params, length_m: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Width (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.params.width_m}
                    onChange={(e) => setConfig({
                      ...config,
                      params: { ...config.params, width_m: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Pitch Format Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pitch Format
                </label>
                <select
                  value={config.params.pitchFormat}
                  onChange={(e) => setConfig({
                    ...config,
                    params: { 
                      ...config.params, 
                      pitchFormat: e.target.value as PitchFormat,
                      // Reset pitch values
                      pitchRatio: undefined,
                      pitchDegrees: undefined,
                      pitchRise: e.target.value === 'rise-run' ? 4 : undefined,
                      pitchRun: e.target.value === 'rise-run' ? 12 : undefined,
                    }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="rise-run">Rise:Run (e.g., 4:12)</option>
                  <option value="degrees">Degrees (e.g., 18.4°)</option>
                  <option value="ratio">Ratio (e.g., 25%)</option>
                </select>
              </div>

              {/* Pitch Input */}
              {config.params.pitchFormat === 'rise-run' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rise
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.params.pitchRise || 4}
                      onChange={(e) => setConfig({
                        ...config,
                        params: { ...config.params, pitchRise: parseFloat(e.target.value) || 4 }
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Run
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.params.pitchRun || 12}
                      onChange={(e) => setConfig({
                        ...config,
                        params: { ...config.params, pitchRun: parseFloat(e.target.value) || 12 }
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {config.params.pitchFormat === 'degrees' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slope Angle (degrees)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.params.pitchDegrees || 18}
                    onChange={(e) => setConfig({
                      ...config,
                      params: { ...config.params, pitchDegrees: parseFloat(e.target.value) || 18 }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {config.params.pitchFormat === 'ratio' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slope Ratio (0.0 - 1.0)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={config.params.pitchRatio || 0.25}
                    onChange={(e) => setConfig({
                      ...config,
                      params: { ...config.params, pitchRatio: parseFloat(e.target.value) || 0.25 }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Overhang */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Eave Overhang (m)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={config.params.overhang_m || 0}
                  onChange={(e) => setConfig({
                    ...config,
                    params: { ...config.params, overhang_m: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Roof Type/Material */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Roofing Material
                </label>
                <select
                  value={config.roofTypeId}
                  onChange={(e) => setConfig({ ...config, roofTypeId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Material</option>
                  {roofTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} ({type.dpwhItemNumberRaw})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSave}
                disabled={!config.roofTypeId}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Roof Configuration
              </button>
            </div>
          </div>

          {/* Right: Live Preview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-6">Generated Roof Geometry</h2>
            
            {preview ? (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-sm text-blue-600 mb-1">Total Plan Area</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {preview.summary.totalPlanArea_m2.toFixed(1)} m²
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-sm text-green-600 mb-1">Total Slope Area</div>
                    <div className="text-2xl font-bold text-green-900">
                      {preview.summary.totalSlopeArea_m2.toFixed(1)} m²
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Style:</span>
                    <span className="font-medium capitalize">{preview.style}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dimensions:</span>
                    <span className="font-medium">
                      {preview.metadata.length_m}m × {preview.metadata.width_m}m
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pitch:</span>
                    <span className="font-medium">{preview.metadata.pitch}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Overhang:</span>
                    <span className="font-medium">{preview.metadata.overhang_m}m</span>
                  </div>
                </div>

                {/* Roof Planes */}
                <div>
                  <h3 className="font-semibold mb-3">Roof Planes ({preview.planes.length})</h3>
                  <div className="space-y-3">
                    {preview.planes.map((plane, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-4">
                        <div className="font-medium mb-2">{plane.name}</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Plan Area:</span>
                            <span className="ml-2 font-medium">{plane.planArea_m2.toFixed(1)} m²</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Slope Area:</span>
                            <span className="ml-2 font-medium">{plane.area_m2.toFixed(1)} m²</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Angle:</span>
                            <span className="ml-2 font-medium">{plane.slopeAngle_deg.toFixed(1)}°</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Factor:</span>
                            <span className="ml-2 font-medium">{plane.slopeFactor.toFixed(3)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lengths */}
                <div>
                  <h3 className="font-semibold mb-3">Linear Measurements</h3>
                  <div className="space-y-2 text-sm">
                    {preview.summary.ridgeLength_m > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ridge Length:</span>
                        <span className="font-medium">{preview.summary.ridgeLength_m.toFixed(1)} m</span>
                      </div>
                    )}
                    {preview.summary.hipLength_m > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Hip Length:</span>
                        <span className="font-medium">{preview.summary.hipLength_m.toFixed(1)} m</span>
                      </div>
                    )}
                    {preview.summary.eaveLength_m > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Eave Length:</span>
                        <span className="font-medium">{preview.summary.eaveLength_m.toFixed(1)} m</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Configure roof parameters to see preview
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
