'use client';

/**
 * Schedule Items Management Page
 * UI for managing direct quantity schedule items (Mode C)
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface ScheduleItem {
  id: string;
  category: string;
  dpwhItemNumberRaw: string;
  descriptionOverride?: string;
  unit: string;
  qty: number;
  basisNote: string;
  tags: string[];
}

const CATEGORIES = [
  { value: 'termite-control', label: 'Termite Control' },
  { value: 'drainage', label: 'Drainage' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'doors', label: 'Doors' },
  { value: 'windows', label: 'Windows' },
  { value: 'glazing', label: 'Glazing' },
  { value: 'waterproofing', label: 'Waterproofing' },
  { value: 'cladding', label: 'Cladding' },
  { value: 'insulation', label: 'Insulation' },
  { value: 'acoustical', label: 'Acoustical' },
  { value: 'other', label: 'Other' },
];

export default function ScheduleItemsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [catalogResults, setCatalogResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const [form, setForm] = useState({
    category: 'doors',
    dpwhItemNumberRaw: '',
    descriptionOverride: '',
    unit: '',
    qty: 1,
    basisNote: '',
  });

  useEffect(() => {
    fetchScheduleItems();
  }, [projectId, filterCategory]);

  const fetchScheduleItems = async () => {
    const url = filterCategory
      ? `/api/projects/${projectId}/schedule-items?category=${filterCategory}`
      : `/api/projects/${projectId}/schedule-items`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setItems(data.scheduleItems);
    }
  };

  const searchCatalog = async (query: string) => {
    if (!query) {
      setCatalogResults([]);
      return;
    }
    const res = await fetch(`/api/catalog?query=${encodeURIComponent(query)}&limit=30`);
    if (res.ok) {
      const data = await res.json();
      setCatalogResults(data.results || []);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/projects/${projectId}/schedule-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, tags: [] }),
    });

    if (res.ok) {
      fetchScheduleItems();
      setForm({
        category: 'doors',
        dpwhItemNumberRaw: '',
        descriptionOverride: '',
        unit: '',
        qty: 1,
        basisNote: '',
      });
      setCatalogResults([]);
      setSearchQuery('');
    } else {
      const error = await res.json();
      alert(`Error: ${error.error}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this schedule item?')) return;
    const res = await fetch(`/api/projects/${projectId}/schedule-items?itemId=${id}`, {
      method: 'DELETE',
    });
    if (res.ok) fetchScheduleItems();
  };

  const selectCatalogItem = (item: any) => {
    setForm({
      ...form,
      dpwhItemNumberRaw: item.itemNumber,
      unit: item.unit,
      descriptionOverride: item.description,
    });
    setCatalogResults([]);
    setSearchQuery('');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Schedule Items (Mode C)</h1>
      <p className="text-gray-600 mb-6">
        Direct quantity items: Doors, Windows, Hardware, Plumbing, Drainage, etc.
      </p>

      {/* Create Form */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Add Schedule Item</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Category</label>
            <select
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              className="border px-3 py-2 rounded w-full"
              required
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1">Search DPWH Catalog</label>
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                searchCatalog(e.target.value);
              }}
              placeholder="e.g., flush door, window, hardware, plumbing fixture"
              className="border px-3 py-2 rounded w-full"
            />
            {catalogResults.length > 0 && (
              <ul className="border mt-1 rounded max-h-64 overflow-auto bg-white">
                {catalogResults.map((item, idx) => (
                  <li
                    key={idx}
                    onClick={() => selectCatalogItem(item)}
                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                  >
                    <div>
                      <strong>{item.itemNumber}</strong> — {item.unit}
                    </div>
                    <div className="text-sm text-gray-600">{item.description}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">DPWH Item Number</label>
              <input
                type="text"
                value={form.dpwhItemNumberRaw}
                onChange={e => setForm({ ...form, dpwhItemNumberRaw: e.target.value })}
                className="border px-3 py-2 rounded w-full"
                required
                readOnly
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Unit</label>
              <input
                type="text"
                value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value })}
                className="border px-3 py-2 rounded w-full"
                required
                readOnly
              />
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1">Description Override (optional)</label>
            <input
              type="text"
              value={form.descriptionOverride}
              onChange={e => setForm({ ...form, descriptionOverride: e.target.value })}
              className="border px-3 py-2 rounded w-full"
              placeholder="Custom description (leave blank to use catalog description)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">Quantity</label>
              <input
                type="number"
                step="0.01"
                value={form.qty}
                onChange={e => setForm({ ...form, qty: parseFloat(e.target.value) })}
                className="border px-3 py-2 rounded w-full"
                required
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Basis Note</label>
              <input
                type="text"
                value={form.basisNote}
                onChange={e => setForm({ ...form, basisNote: e.target.value })}
                placeholder="e.g., per door schedule, as per plans"
                className="border px-3 py-2 rounded w-full"
                required
              />
            </div>
          </div>

          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
            Add Item
          </button>
        </form>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <label className="block font-medium mb-2">Filter by Category</label>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Schedule Items Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Schedule Items ({items.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2 text-left">Category</th>
                <th className="border px-4 py-2 text-left">DPWH Item</th>
                <th className="border px-4 py-2 text-left">Description</th>
                <th className="border px-4 py-2 text-right">Qty</th>
                <th className="border px-4 py-2 text-left">Unit</th>
                <th className="border px-4 py-2 text-left">Basis</th>
                <th className="border px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const category = CATEGORIES.find(c => c.value === item.category);
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="border px-4 py-2">{category?.label || item.category}</td>
                    <td className="border px-4 py-2 font-mono text-sm">{item.dpwhItemNumberRaw}</td>
                    <td className="border px-4 py-2">{item.descriptionOverride || '—'}</td>
                    <td className="border px-4 py-2 text-right">{item.qty}</td>
                    <td className="border px-4 py-2">{item.unit}</td>
                    <td className="border px-4 py-2 text-sm text-gray-600">{item.basisNote}</td>
                    <td className="border px-4 py-2 text-center">
                      <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:underline">
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
