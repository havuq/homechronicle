import { useState, useRef } from 'react';
import { LayoutList, BarChart2, Home, Settings } from 'lucide-react';
import clsx from 'clsx';
import Timeline from './components/Timeline.jsx';
import StatsCards from './components/StatsCards.jsx';
import ActivityChart from './components/ActivityChart.jsx';
import TrendChart from './components/TrendChart.jsx';
import TopDevices from './components/TopDevices.jsx';
import HeatmapLane from './components/HeatmapLane.jsx';
import RoomChart from './components/RoomChart.jsx';
import WeekdayHeatmap from './components/WeekdayHeatmap.jsx';
import AccessoryList from './components/AccessoryList.jsx';
import Setup from './components/Setup.jsx';

const TABS = [
  { id: 'timeline',    label: 'Timeline',    icon: LayoutList },
  { id: 'dashboard',  label: 'Dashboard',   icon: BarChart2 },
  { id: 'accessories',label: 'Accessories', icon: Home },
  { id: 'setup',      label: 'Setup',       icon: Settings },
];

export default function App() {
  const [tab, setTab]               = useState('timeline');
  const [iconBroken, setIconBroken] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        {iconBroken ? (
          <div className="h-8 w-8 rounded-lg flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <Home size={16} className="text-white" />
          </div>
        ) : (
          <img
            src="/icon.png"
            alt=""
            className="h-8 w-8 rounded-lg flex-shrink-0"
            onError={() => setIconBroken(true)}
          />
        )}
        <div>
          <h1 className="text-lg font-semibold text-gray-900 leading-tight">HomeChronicle</h1>
          <p className="text-xs text-gray-400 leading-tight">Event Logging for Apple HomeKit</p>
        </div>
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
          <div className="max-w-5xl mx-auto py-6 px-4 space-y-4">

            {/* KPI cards row */}
            <StatsCards />

            {/* Full-width trend chart */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <TrendChart />
            </div>

            {/* 2-col: hourly activity + room breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-5">
                <ActivityChart />
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5">
                <RoomChart />
              </div>
            </div>

            {/* 2-col: top devices + weekday heatmap */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-5">
                <TopDevices />
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5">
                <WeekdayHeatmap />
              </div>
            </div>

            {/* Full-width per-device heatmap */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <HeatmapLane />
            </div>

          </div>
        )}

        {tab === 'accessories' && <AccessoryList />}
        {tab === 'setup' && <Setup />}
      </main>
    </div>
  );
}
