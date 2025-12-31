import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            DPWH Building Estimate
          </h1>
          <p className="text-xl text-gray-600">
            Professional quantity takeoff system for structural estimation
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">System Overview</h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              <span><strong>Grid-based modeling</strong> – Define grid lines and levels</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              <span><strong>Element templates</strong> – Beams, slabs, columns</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              <span><strong>Auditable takeoff</strong> – Full traceability of quantities</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              <span><strong>DPWH BOQ mapping</strong> – Volume III pay items</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              <span><strong>Metric units</strong> – All calculations in meters/kg/m²</span>
            </li>
          </ul>
        </div>

        <div className="text-center">
          <div className="flex gap-4 justify-center">
            <Link
              href="/projects"
              className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
            >
              Go to Projects
            </Link>
            <Link
              href="/catalog"
              className="inline-block bg-gray-700 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-800 transition-colors shadow-lg"
            >
              Browse Catalog
            </Link>
          </div>
        </div>

        <div className="mt-12 bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-800 mb-2">Architecture</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            This system follows strict layer separation: <strong>UI</strong> (React components) → 
            <strong> Logic</strong> (API routes, database) → <strong>Math</strong> (pure calculation functions).
            All quantities are traceable from elements through takeoff lines to BOQ items.
          </p>
        </div>
      </div>
    </div>
  );
}

