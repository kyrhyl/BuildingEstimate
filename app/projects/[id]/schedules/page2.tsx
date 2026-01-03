'use client';

/**
 * Schedule Items Management Page
 * UI for managing direct quantity schedule items (Mode C)
 */

import { useState } from 'react';
import { useParams } from 'next/navigation';
import DoorsWindowsSchedule from '@/components/DoorsWindowsSchedule';

type TabType = 'doors' | 'windows' | 'other';

export default function ScheduleItemsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabType>('doors');

  const tabs: { id: TabType; label: string }[] = [
    { id: 'doors', label: 'Doors' },
    { id: 'windows', label: 'Windows' },
    { id: 'other', label: 'Other Items' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Schedule Items</h1>
        <p className="text-gray-600 mt-1">
          Manage doors, windows, and other schedule-based quantities
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'doors' && (
          <DoorsWindowsSchedule projectId={projectId} category="doors" />
        )}
        {activeTab === 'windows' && (
          <DoorsWindowsSchedule projectId={projectId} category="windows" />
        )}
        {activeTab === 'other' && (
          <OtherScheduleItems projectId={projectId} />
        )}
      </div>
    </div>
  );
}

// Placeholder for other schedule items component
function OtherScheduleItems({ projectId }: { projectId: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Other Schedule Items</h2>
      <p className="text-gray-600">
        Coming soon: Termite control, drainage, plumbing, hardware, and other miscellaneous items.
      </p>
      <p className="text-gray-500 mt-2 text-sm">
        For now, use the existing schedule management system or contact support.
      </p>
    </div>
  );
}
