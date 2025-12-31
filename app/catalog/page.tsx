'use client';

import { useState, useEffect } from 'react';
import type { DPWHCatalogItem, Trade } from '@/types';

interface CatalogResponse {
  success: boolean;
  data: DPWHCatalogItem[];
  total: number;
  catalogVersion: string;
}

export default function CatalogPage() {
  const [items, setItems] = useState<DPWHCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalogVersion, setCatalogVersion] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<Trade | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const trades: Array<Trade | 'all'> = ['all', 'Concrete', 'Rebar', 'Formwork'];
  const categories = ['all', 'Concrete Works', 'Reinforcing Steel', 'Formwork and Falsework'];

  useEffect(() => {
    fetchCatalog();
  }, [searchQuery, selectedTrade, selectedCategory]);

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchQuery) params.set('query', searchQuery);
      if (selectedTrade !== 'all') params.set('trade', selectedTrade);
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      params.set('limit', '5000'); // Request all available items

      const response = await fetch(`/api/catalog?${params.toString()}`);
      const result: CatalogResponse = await response.json();

      if (result.success) {
        setItems(result.data);
        setCatalogVersion(result.catalogVersion);
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

            {/* Trade Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trade
              </label>
              <select
                value={selectedTrade}
                onChange={(e) => setSelectedTrade(e.target.value as Trade | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {trades.map((trade) => (
                  <option key={trade} value={trade}>
                    {trade === 'all' ? 'All Trades' : trade}
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
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
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
                      Trade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.itemNumber} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {item.itemNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{item.description}</div>
                        {item.notes && (
                          <div className="text-xs text-gray-500 mt-1">{item.notes}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <TradeBadge trade={item.trade} />
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

function TradeBadge({ trade }: { trade: Trade }) {
  const colors: Record<Trade, string> = {
    Concrete: 'bg-green-100 text-green-800',
    Rebar: 'bg-orange-100 text-orange-800',
    Formwork: 'bg-blue-100 text-blue-800',
    Earthwork: 'bg-amber-100 text-amber-800',
    Plumbing: 'bg-cyan-100 text-cyan-800',
    Carpentry: 'bg-yellow-100 text-yellow-800',
    Hardware: 'bg-gray-100 text-gray-800',
    'Doors & Windows': 'bg-indigo-100 text-indigo-800',
    'Glass & Glazing': 'bg-sky-100 text-sky-800',
    Roofing: 'bg-red-100 text-red-800',
    Waterproofing: 'bg-blue-100 text-blue-800',
    Finishes: 'bg-purple-100 text-purple-800',
    Painting: 'bg-pink-100 text-pink-800',
    Masonry: 'bg-stone-100 text-stone-800',
    'Structural Steel': 'bg-slate-100 text-slate-800',
    Structural: 'bg-zinc-100 text-zinc-800',
    Foundation: 'bg-brown-100 text-brown-800',
    Railing: 'bg-teal-100 text-teal-800',
    Cladding: 'bg-violet-100 text-violet-800',
    MEPF: 'bg-fuchsia-100 text-fuchsia-800',
    'Marine Works': 'bg-emerald-100 text-emerald-800',
    'General Requirements': 'bg-lime-100 text-lime-800',
    Other: 'bg-neutral-100 text-neutral-800',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[trade]}`}>
      {trade}
    </span>
  );
}
