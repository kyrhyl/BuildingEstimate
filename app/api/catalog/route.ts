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
 * - trade: filter by trade (Concrete, Rebar, Formwork, etc.)
 * - category: filter by category
 * - limit: max results (default 1000, max 5000)
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  // Validate query parameters
  const params = validateQueryParams(request, catalogSearchSchema);

  let results = [...catalog];

  // Filter by trade
  if (params.trade) {
    results = results.filter(item => item.trade === params.trade);
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
