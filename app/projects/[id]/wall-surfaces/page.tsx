'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { Level, GridLine } from '@/types';
import WallSurfacesManager from '@/components/PartE/WallSurfacesManager';

export default function WallSurfacesPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [levels, setLevels] = useState<Level[]>([]);
  const [gridX, setGridX] = useState<GridLine[]>([]);
  const [gridY, setGridY] = useState<GridLine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();

      setLevels(data.data.levels || []);
      setGridX(data.data.gridX || []);
      setGridY(data.data.gridY || []);
    } catch (error) {
      console.error('Error loading project data:', error);
      alert('Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading wall surfaces...</div>;
  }

  if (levels.length === 0 || gridX.length === 0 || gridY.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className="font-semibold text-lg text-yellow-900 mb-2">Grid System Required</h3>
        <p className="text-yellow-700 mb-4">
          Please define the grid system and levels in Part D before creating wall surfaces.
        </p>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <WallSurfacesManager
      projectId={projectId}
      levels={levels}
      gridX={gridX}
      gridY={gridY}
    />
  );
}
