import { useState } from 'react';
import { LayoutList, BarChart2, Home } from 'lucide-react';
import clsx from 'clsx';
import Timeline from './components/Timeline.jsx';
import ActivityChart from './components/ActivityChart.jsx';
import TrendChart from './components/TrendChart.jsx';
import TopDevices from './components/TopDevices.jsx';
import AccessoryList from './components/AccessoryList.jsx';

const TABS = [
  { id: 'timeline',    label: 'Timeline',    icon: LayoutList },
  { id: 'dashboard',  label: 'Dashboard',   icon: BarChart2 },
  { id: 'accessories',label: 'Accessories', icon: Home },
];

export default function App() {
  const [tab, setTab] = useState('timeline');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <h1 className="text-lg font-semibold text-gray-900">HomeKit Event Log</h1>
        <span className="flex-1" />
        <nav className="flex gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                tab === id
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {tab === 'timeline' && <Timeline />}

        {tab === 'dashboard' && (
          <div className="max-w-3xl mx-auto py-6 px-4 space-y-8">
            <div className="bg-white rounded-xl shadow-sm p-5">
              <ActivityChart />
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5">
              <TrendChart />
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5">
              <TopDevices />
            </div>
          </div>
        )}

        {tab === 'accessories' && <AccessoryList />}
      </main>
    </div>
  );
}
