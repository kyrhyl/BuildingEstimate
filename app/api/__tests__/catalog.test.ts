/**
 * INTEGRATION TESTS FOR CATALOG API
 * Tests for /api/catalog endpoint
 */

import { NextRequest } from 'next/server';
import { GET as getCatalog } from '../catalog/route';

describe('Catalog API', () => {
  describe('GET /api/catalog', () => {
    it('should return all catalog items by default', async () => {
      const request = new NextRequest('http://localhost:3000/api/catalog');
      const response = await getCatalog(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.items).toBeDefined();
      expect(Array.isArray(data.data.items)).toBe(true);
      expect(data.data.total).toBeDefined();
      expect(data.data.catalogVersion).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    it('should filter by trade', async () => {
      const request = new NextRequest('http://localhost:3000/api/catalog?trade=Concrete');
      const response = await getCatalog(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.items).toBeDefined();
      
      // All returned items should have trade 'Concrete'
      data.data.items.forEach((item: any) => {
        expect(item.trade).toBe('Concrete');
      });
    });

    it('should filter by category', async () => {
      const request = new NextRequest('http://localhost:3000/api/catalog?category=concrete');
      const response = await getCatalog(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // All returned items should have category containing 'concrete' (case-insensitive)
      data.data.items.forEach((item: any) => {
        expect(item.category.toLowerCase()).toContain('concrete');
      });
    });

    it('should search by query in item number', async () => {
      const request = new NextRequest('http://localhost:3000/api/catalog?query=400');
      const response = await getCatalog(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // All returned items should have '400' in item number or description
      data.data.items.forEach((item: any) => {
        const hasInNumber = item.itemNumber.toLowerCase().includes('400');
        const hasInDescription = item.description.toLowerCase().includes('400');
        expect(hasInNumber || hasInDescription).toBe(true);
      });
    });

    it('should search by query in description', async () => {
      const request = new NextRequest('http://localhost:3000/api/catalog?query=reinforcement');
      const response = await getCatalog(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      data.data.items.forEach((item: any) => {
        const hasInNumber = item.itemNumber.toLowerCase().includes('reinforcement');
        const hasInDescription = item.description.toLowerCase().includes('reinforcement');
        expect(hasInNumber || hasInDescription).toBe(true);
      });
    });

    it('should respect limit parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/catalog?limit=5');
      const response = await getCatalog(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.items.length).toBeLessThanOrEqual(5);
      expect(data.data.total).toBeLessThanOrEqual(5);
    });

    it('should clamp limit to maximum 5000', async () => {
      const request = new NextRequest('http://localhost:3000/api/catalog?limit=10000');
      const response = await getCatalog(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.items.length).toBeLessThanOrEqual(5000);
    });

    it('should handle default limit when not specified', async () => {
      const request = new NextRequest('http://localhost:3000/api/catalog');
      const response = await getCatalog(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.items.length).toBeLessThanOrEqual(1000); // Default limit
    });

    it('should combine multiple filters', async () => {
      const request = new NextRequest('http://localhost:3000/api/catalog?trade=Rebar&query=grade&limit=10');
      const response = await getCatalog(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.items.length).toBeLessThanOrEqual(10);
      
      data.data.items.forEach((item: any) => {
        expect(item.trade).toBe('Rebar');
        const hasGrade = item.itemNumber.toLowerCase().includes('grade') || 
                        item.description.toLowerCase().includes('grade');
        expect(hasGrade).toBe(true);
      });
    });

    it('should reject invalid trade value', async () => {
      const request = new NextRequest('http://localhost:3000/api/catalog?trade=InvalidTrade');
      const response = await getCatalog(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation error');
    });

    it('should handle empty query parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/catalog?query=');
      const response = await getCatalog(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle query with no results', async () => {
      const request = new NextRequest('http://localhost:3000/api/catalog?query=xyznonexistentitem123');
      const response = await getCatalog(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.items).toHaveLength(0);
      expect(data.data.total).toBe(0);
    });

    it('should be case-insensitive for queries', async () => {
      const request1 = new NextRequest('http://localhost:3000/api/catalog?query=CONCRETE');
      const response1 = await getCatalog(request1);
      const data1 = await response1.json();

      const request2 = new NextRequest('http://localhost:3000/api/catalog?query=concrete');
      const response2 = await getCatalog(request2);
      const data2 = await response2.json();

      expect(data1.data.total).toBe(data2.data.total);
    });
  });

  describe('Catalog Data Integrity', () => {
    it('should have valid structure for all items', async () => {
      const request = new NextRequest('http://localhost:3000/api/catalog?limit=100');
      const response = await getCatalog(request);
      const data = await response.json();

      data.data.items.forEach((item: any) => {
        expect(item.itemNumber).toBeDefined();
        expect(typeof item.itemNumber).toBe('string');
        expect(item.description).toBeDefined();
        expect(typeof item.description).toBe('string');
        expect(item.unit).toBeDefined();
        expect(typeof item.unit).toBe('string');
        expect(item.trade).toBeDefined();
        expect(typeof item.trade).toBe('string');
        expect(item.category).toBeDefined();
        expect(typeof item.category).toBe('string');
      });
    });

    it('should have unique item numbers', async () => {
      const request = new NextRequest('http://localhost:3000/api/catalog');
      const response = await getCatalog(request);
      const data = await response.json();

      const itemNumbers = data.data.items.map((item: any) => item.itemNumber);
      const uniqueNumbers = new Set(itemNumbers);
      
      expect(itemNumbers.length).toBe(uniqueNumbers.size);
    });
  });
});
