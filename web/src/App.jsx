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

const SKIN_SWATCH = {
  ocean: 'from-blue-500 to-cyan-400',
  graphite: 'from-slate-700 to-slate-500',
  sunrise: 'from-orange-400 to-rose-400',
};

export default function App() {
  const [tab, setTab]               = useState('timeline');
  const [iconBroken, setIconBroken] = useState(false);
  const { preference, setPreference } = useTheme();
  const { skin, setSkin } = useSkin();
  const nextPreference =
    preference === 'system' ? 'light' :
    preference === 'light' ? 'dark' :
    'system';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-3 sm:px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {iconBroken ? (
            <div className="h-12 w-12 rounded-xl flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Home size={22} className="text-white" />
            </div>
          ) : (
            <div className="h-12 w-12 rounded-xl overflow-hidden flex-shrink-0">
              <img
                src="/hc-icon-blue.png"
                alt=""
                className="h-full w-full object-cover scale-[1.55]"
                style={{ objectPosition: 'center 64%' }}
                onError={() => setIconBroken(true)}
              />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 leading-tight truncate">HomeChronicle</h1>
            <p className="text-xs text-gray-400 leading-tight truncate">Event Logging for Apple HomeKit</p>
          </div>
        </div>
        <span className="flex-1 hidden md:block" />

        <button
          type="button"
          onClick={() => setPreference(nextPreference)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800"
          aria-label={`Theme mode: ${preference}. Click to switch to ${nextPreference}.`}
          title={`Theme mode: ${preference}`}
        >
          {preference === 'system' && <Monitor size={18} />}
          {preference === 'light' && <Sun size={18} />}
          {preference === 'dark' && <Moon size={18} />}
        </button>

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

      <div className="fixed bottom-4 right-4 z-20 flex items-center gap-1 rounded-full border border-gray-200 bg-white/95 px-2 py-1.5 shadow-sm backdrop-blur">
        <Paintbrush2 size={14} className="text-gray-500" />
        {STYLES.map((style) => (
          <button
            key={style.id}
            type="button"
            onClick={() => setSkin(style.id)}
            className={clsx(
              'h-6 w-6 rounded-full p-0.5 transition-all',
              skin === style.id
                ? 'ring-2 ring-blue-500'
                : 'ring-1 ring-gray-300 hover:ring-gray-400'
            )}
            aria-label={`Use ${style.label} color theme`}
            title={style.label}
          >
            <span className={clsx('block h-full w-full rounded-full bg-gradient-to-br', SKIN_SWATCH[style.id])} />
          </button>
        ))}
      </div>
    </div>
  );
}
