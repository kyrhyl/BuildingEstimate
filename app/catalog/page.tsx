'use client';

import { useState, useEffect } from 'react';
import type { DPWHCatalogItem } from '@/types';

interface CatalogResponse {
  success: boolean;
  data: {
    items: DPWHCatalogItem[];
    total: number;
    catalogVersion: string;
  };
}

export default function CatalogPage() {
  const [items, setItems] = useState<DPWHCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalogVersion, setCatalogVersion] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [parts, setParts] = useState<string[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPart, setSelectedPart] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchCatalogStats();
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [searchQuery, selectedPart, selectedCategory]);

  useEffect(() => {
    fetchCatalogStats();
    // Reset category when part changes
    setSelectedCategory('all');
  }, [selectedPart]);

  const fetchCatalogStats = async () => {
    try {
      const response = await fetch('/api/catalog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          part: selectedPart !== 'all' ? selectedPart : undefined,
        }),
      });
      const result = await response.json();
      if (result.success && result.data) {
        setCategories(result.data.categories || []);
        setParts(result.data.parts || []);
      }
    } catch (err) {
      console.error('Failed to fetch catalog stats:', err);
    }
  };

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchQuery) params.set('query', searchQuery);
      if (selectedPart !== 'all') params.set('part', selectedPart);
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      params.set('limit', '5000'); // Request all available items

      const response = await fetch(`/api/catalog?${params.toString()}`);
      const result: CatalogResponse = await response.json();

      if (result.success && result.data) {
        setItems(result.data.items);
        setCatalogVersion(result.data.catalogVersion);
      } else {
        setError('Failed to load catalog');
      }
    } catch (err) {
      setError('Network error: Failed to fetch catalog');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">DPWH Catalog Browser</h1>
          <p className="text-gray-600 mt-2">
            {catalogVersion} - Pay Item Reference
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Box */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Item number or description..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Part Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Part
              </label>
              <select
                value={selectedPart}
                onChange={(e) => setSelectedPart(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Parts</option>
                {parts.map((part) => (
                  <option key={part} value={part}>
                    {part}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600">
            {loading ? 'Loading...' : `${items.length} item${items.length !== 1 ? 's' : ''} found`}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Catalog Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading catalog...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No items found matching your criteria
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Part
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <tr key={`${item.itemNumber}-${index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {item.itemNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{item.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <PartBadge part={item.part} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {item.category}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> This catalog is read-only and serves as a reference for BOQ mapping.
            Items are based on DPWH Volume III standard specifications.
          </p>
        </div>
      </div>
    </div>
  );
}

function PartBadge({ part }: { part: string }) {
  const colors: Record<string, string> = {
    'PART A': 'bg-blue-100 text-blue-800',
    'PART B': 'bg-green-100 text-green-800',
    'PART C': 'bg-amber-100 text-amber-800',
    'PART D': 'bg-purple-100 text-purple-800',
    'PART E': 'bg-cyan-100 text-cyan-800',
    'PART F': 'bg-red-100 text-red-800',
    'PART G': 'bg-indigo-100 text-indigo-800',
  };

  const color = colors[part] || 'bg-gray-100 text-gray-800';

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>
      {part}
    </span>
  );
}
