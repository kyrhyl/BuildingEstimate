import { NextRequest } from 'next/server';
import type { DPWHCatalogItem } from '@/types';
import catalogData from '@/data/dpwh-catalog.json';
import { withErrorHandler, successResponse, validateQueryParams } from '@/lib/api/validation';
import { catalogSearchSchema } from '@/lib/api/schemas';

const catalog = catalogData.items as DPWHCatalogItem[];

/**
 * GET /api/catalog
 * Search and filter DPWH Volume III pay items
 * 
 * Query params:
 * - query: search term (searches item number and description)
 * - part: filter by part (PART A, PART B, etc.)
 * - category: filter by category
 * - limit: max results (default 1000, max 5000)
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  // Validate query parameters
  const params = validateQueryParams(request, catalogSearchSchema);

  let results = [...catalog];

  // Filter by part
  if (params.part) {
    results = results.filter(item => item.part === params.part);
  }

  // Filter by category
  if (params.category) {
    results = results.filter(item => 
      item.category.toLowerCase().includes(params.category!.toLowerCase())
    );
  }

  // Search by query (item number or description)
  if (params.query && params.query.trim() !== '') {
    const queryLower = params.query.toLowerCase();
    results = results.filter(item =>
      item.itemNumber.toLowerCase().includes(queryLower) ||
      item.description.toLowerCase().includes(queryLower)
    );
  }

  // Apply limit
  results = results.slice(0, params.limit);

  return successResponse({
    items: results,
    total: results.length,
    catalogVersion: catalogData.version,
  });
});

/**
 * POST /api/catalog
 * Get catalog statistics (categories, trades, total items)
 * 
 * Body params:
 * - part: optional part filter to get categories only for that part
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}));
  const { part } = body;

  let filteredCatalog = catalog;

  // Filter by part if provided
  if (part && part !== 'all') {
    filteredCatalog = catalog.filter(item => item.part === part);
  }

  // Get unique categories, trades, and parts from filtered catalog
  const categories = [...new Set(filteredCatalog.map(item => item.category))].sort();
  const trades = [...new Set(filteredCatalog.map(item => item.trade))].sort();
  const parts = [...new Set(catalog.map(item => item.part))].sort(); // Always return all parts

  return successResponse({
    categories,
    trades,
    parts,
    totalItems: catalog.length,
    catalogVersion: catalogData.version,
  });
});
