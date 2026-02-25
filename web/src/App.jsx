import { useState } from 'react';
import { LayoutList, BarChart2, Home, Settings, Monitor, Sun, Moon, Paintbrush2 } from 'lucide-react';
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
import { useTheme } from './hooks/useTheme.js';
import { useSkin } from './hooks/useSkin.js';

const TABS = [
  { id: 'timeline',    label: 'Timeline',    icon: LayoutList },
  { id: 'dashboard',  label: 'Dashboard',   icon: BarChart2 },
  { id: 'accessories',label: 'Accessories', icon: Home },
  { id: 'setup',      label: 'Setup',       icon: Settings },
];

const STYLES = [
  { id: 'ocean', label: 'Ocean' },
  { id: 'graphite', label: 'Graphite' },
  { id: 'sunrise', label: 'Sunrise' },
];

export default function App() {
  const [tab, setTab]               = useState('timeline');
  const [iconBroken, setIconBroken] = useState(false);
  const { preference, setPreference } = useTheme();
  const { skin, setSkin } = useSkin();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-3 sm:px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {iconBroken ? (
            <div className="h-8 w-8 rounded-lg flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Home size={16} className="text-white" />
            </div>
          ) : (
            <img
              src="/hc-icon-blue.png"
              alt=""
              className="h-8 w-8 rounded-lg flex-shrink-0"
              onError={() => setIconBroken(true)}
            />
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 leading-tight truncate">HomeChronicle</h1>
            <p className="text-xs text-gray-400 leading-tight truncate">Event Logging for Apple HomeKit</p>
          </div>
        </div>
        <span className="flex-1 hidden md:block" />

        <label className="relative flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-600">
          <span className="sr-only">Theme</span>
          {preference === 'system' && <Monitor size={14} />}
          {preference === 'light' && <Sun size={14} />}
          {preference === 'dark' && <Moon size={14} />}
          <select
            aria-label="Theme"
            value={preference}
            onChange={(e) => setPreference(e.target.value)}
            className="appearance-none bg-transparent pr-4 text-xs font-medium text-inherit focus:outline-none cursor-pointer"
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>

        <label className="relative flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-600">
          <span className="sr-only">Style</span>
          <Paintbrush2 size={14} />
          <select
            aria-label="Style"
            value={skin}
            onChange={(e) => setSkin(e.target.value)}
            className="appearance-none bg-transparent pr-4 text-xs font-medium text-inherit focus:outline-none cursor-pointer"
          >
            {STYLES.map((style) => (
              <option key={style.id} value={style.id}>{style.label}</option>
            ))}
          </select>
        </label>

        <nav className="order-3 md:order-none w-full md:w-auto flex gap-1 overflow-x-auto pb-1 -mb-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
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
          <div className="max-w-5xl mx-auto py-4 sm:py-6 px-3 sm:px-4 space-y-4">

            {/* KPI cards row */}
            <StatsCards />

            {/* Full-width trend chart */}
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
              <TrendChart />
            </div>

            {/* 2-col: hourly activity + room breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
                <ActivityChart />
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
                <RoomChart />
              </div>
            </div>

            {/* 2-col: top devices + weekday heatmap */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
                <TopDevices />
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
                <WeekdayHeatmap />
              </div>
            </div>

            {/* Full-width per-device heatmap */}
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
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
