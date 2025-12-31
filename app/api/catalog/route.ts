import { NextRequest, NextResponse } from 'next/server';
import type { DPWHCatalogItem, CatalogSearchParams, Trade } from '@/types';
import catalogData from '@/data/dpwh-catalog.json';

const catalog = catalogData.items as DPWHCatalogItem[];

/**
 * GET /api/catalog
 * Search and filter DPWH Volume III pay items
 * 
 * Query params:
 * - query: search term (searches item number and description)
 * - trade: filter by trade (Concrete, Rebar, Formwork)
 * - category: filter by category
 * - limit: max results (default 1000, max 5000)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const params: CatalogSearchParams = {
      query: searchParams.get('query') || undefined,
      trade: searchParams.get('trade') as Trade || undefined,
      category: searchParams.get('category') || undefined,
      limit: Math.min(parseInt(searchParams.get('limit') || '1000'), 5000),
    };

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
    if (params.limit && params.limit > 0) {
      results = results.slice(0, params.limit);
    }

    return NextResponse.json({
      success: true,
      data: results,
      total: results.length,
      catalogVersion: catalogData.version,
    });
  } catch (error) {
    console.error('Error searching catalog:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search catalog' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/catalog/stats
 * Get catalog statistics
 */
export async function POST(request: NextRequest) {
  try {
    const stats = {
      totalItems: catalog.length,
      byTrade: {
        Concrete: catalog.filter(i => i.trade === 'Concrete').length,
        Rebar: catalog.filter(i => i.trade === 'Rebar').length,
        Formwork: catalog.filter(i => i.trade === 'Formwork').length,
      },
      categories: Array.from(new Set(catalog.map(i => i.category))),
      version: catalogData.version,
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting catalog stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get catalog stats' },
      { status: 500 }
    );
  }
}
