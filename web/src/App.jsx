import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutList, BarChart2, Home, Settings, Monitor, Sun, Moon, Paintbrush2, Bell, Link2, Unlink2 } from 'lucide-react';
import clsx from 'clsx';
import Timeline from './components/Timeline.jsx';
import StatsCards from './components/StatsCards.jsx';
import ActivityChart from './components/ActivityChart.jsx';
import TrendChart from './components/TrendChart.jsx';
import TopDevices from './components/TopDevices.jsx';
import RoomChart from './components/RoomChart.jsx';
import WeekdayHeatmap from './components/WeekdayHeatmap.jsx';
import MonthlyHeatmap from './components/MonthlyHeatmap.jsx';
import AnomalyPanel from './components/AnomalyPanel.jsx';
import StaleDevicesPanel from './components/StaleDevicesPanel.jsx';
import QuietHoursPanel from './components/QuietHoursPanel.jsx';
import AccessoryList from './components/AccessoryList.jsx';
import AccessoryDetail from './components/AccessoryDetail.jsx';
import Setup from './components/Setup.jsx';
import Alerts from './components/Alerts.jsx';
import BrandLogo from './components/BrandLogo.jsx';
import ChangelogModal from './components/ChangelogModal.jsx';
import { useTheme } from './hooks/useTheme.js';
import { useSkin } from './hooks/useSkin.js';
import { useUpdateCheck } from './hooks/useUpdateCheck.js';
import { ExternalLink, Sparkles, ArrowUpCircle } from 'lucide-react';

const CHANGELOG_VERSION_KEY = 'hc_last_seen_version';

const TABS = [
  { id: 'dashboard',  label: 'Dashboard',   icon: BarChart2 },
  { id: 'timeline',    label: 'Timeline',    icon: LayoutList },
  { id: 'accessories',label: 'Accessories', icon: Home },
  { id: 'setup',      label: 'Manage',      icon: Settings },
];
const ALERTS_TAB = { id: 'alerts', label: 'Alerts', icon: Bell };
const DASHBOARD_WINDOWS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];
const DASHBOARD_RANGE_STORAGE_KEY = 'hc_dashboard_global_days';
const DASHBOARD_SYNC_STORAGE_KEY = 'hc_dashboard_sync_ranges';

const STYLES = [
  { id: 'ocean', label: 'Ocean' },
  { id: 'graphite', label: 'Graphite' },
  { id: 'sunrise', label: 'Sunrise' },
  { id: 'red', label: 'Red' },
  { id: 'yellow', label: 'Yellow' },
  { id: 'purple', label: 'Purple' },
];

const SKIN_SWATCH = {
  ocean: 'from-blue-500 to-cyan-400',
  graphite: 'from-slate-700 to-slate-500',
  sunrise: 'from-orange-400 to-rose-400',
  red: 'from-red-500 to-rose-500',
  yellow: 'from-yellow-400 to-amber-500',
  purple: 'from-violet-500 to-fuchsia-500',
};

const SKIN_SWATCH_DARK = {
  ocean: 'from-blue-400 to-cyan-300',
  graphite: 'from-slate-300 to-teal-300',
  sunrise: 'from-orange-300 to-pink-300',
  red: 'from-rose-300 to-red-300',
  yellow: 'from-amber-300 to-yellow-300',
  purple: 'from-violet-300 to-fuchsia-300',
};

export default function App() {
  const [tab, setTab]               = useState('dashboard');
  const [selectedAccessoryId, setSelectedAccessoryId] = useState(null);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [isSkinPickerOpen, setIsSkinPickerOpen] = useState(false);
  const [isStandalonePwa, setIsStandalonePwa] = useState(false);
  const [dashboardDays, setDashboardDays] = useState(() => {
    if (typeof window === 'undefined') return 30;
    try {
      const stored = Number.parseInt(window.localStorage.getItem(DASHBOARD_RANGE_STORAGE_KEY) ?? '', 10);
      return DASHBOARD_WINDOWS.some((w) => w.days === stored) ? stored : 30;
    } catch {
      return 30;
    }
  });
  const [syncDashboardRanges, setSyncDashboardRanges] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const stored = window.localStorage.getItem(DASHBOARD_SYNC_STORAGE_KEY);
      return stored == null ? true : stored !== 'false';
    } catch {
      return true;
    }
  });
  const [showChangelog, setShowChangelog] = useState(false);
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const { preference, resolvedTheme, setPreference } = useTheme();
  const { skin, setSkin } = useSkin();
  const { update: availableUpdate, dismiss: dismissUpdate } = useUpdateCheck(__BUILD_VERSION__);
  const isDarkTheme = resolvedTheme === 'dark';
  const nextPreference =
    preference === 'system' ? 'light' :
    preference === 'light' ? 'dark' :
    'system';
  const tabs = useMemo(
    () => (alertsEnabled ? [...TABS.slice(0, 3), ALERTS_TAB, ...TABS.slice(3)] : TABS),
    [alertsEnabled]
  );
  const handleSelectAccessory = useCallback((accessoryId) => {
    if (!accessoryId) return;
    if (typeof window !== 'undefined') {
      const url = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.history.pushState({ hcView: 'accessory-detail', accessoryId }, '', url);
    }
    setSelectedAccessoryId(accessoryId);
  }, []);
  const handleAccessoryBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.state?.hcView === 'accessory-detail') {
      window.history.back();
      return;
    }
    setSelectedAccessoryId(null);
  }, []);

  useEffect(() => {
    if (typeof fetch !== 'function') return;
    let active = true;
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (typeof data?.alertsEnabled === 'boolean') {
          setAlertsEnabled(data.alertsEnabled);
        }
      })
      .catch(() => {
        // Keep current default if health probe fails.
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!alertsEnabled && tab === 'alerts') setTab('timeline');
  }, [alertsEnabled, tab]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onPopState = (event) => {
      const { state } = event;
      if (state?.hcView === 'accessory-detail' && typeof state.accessoryId === 'string' && state.accessoryId.length > 0) {
        setTab('accessories');
        setSelectedAccessoryId(state.accessoryId);
        return;
      }
      setSelectedAccessoryId(null);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const media = window.matchMedia?.('(display-mode: standalone)');
    const applyStandaloneState = () => {
      const standalone =
        Boolean(media?.matches) || Boolean(window.navigator?.standalone);
      setIsStandalonePwa(standalone);
      document.documentElement.classList.toggle('hc-standalone', standalone);
    };

    applyStandaloneState();
    if (!media) return undefined;
    media.addEventListener?.('change', applyStandaloneState);
    return () => {
      media.removeEventListener?.('change', applyStandaloneState);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(DASHBOARD_RANGE_STORAGE_KEY, String(dashboardDays));
    } catch {
      // Ignore storage write failures.
    }
  }, [dashboardDays]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(DASHBOARD_SYNC_STORAGE_KEY, String(syncDashboardRanges));
    } catch {
      // Ignore storage write failures.
    }
  }, [syncDashboardRanges]);

  // Auto-show changelog when the build version changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const lastSeen = window.localStorage.getItem(CHANGELOG_VERSION_KEY);
      if (lastSeen !== __BUILD_VERSION__) {
        setHasNewVersion(true);
        // Only auto-show if user has visited before (not first ever load)
        if (lastSeen) setShowChangelog(true);
      }
    } catch {
      // Ignore storage read failures.
    }
  }, []);

  function handleOpenChangelog() {
    setShowChangelog(true);
  }

  function handleCloseChangelog() {
    setShowChangelog(false);
    setHasNewVersion(false);
    try {
      window.localStorage.setItem(CHANGELOG_VERSION_KEY, __BUILD_VERSION__);
    } catch {
      // Ignore storage write failures.
    }
  }

  return (
    <div className={clsx('min-h-screen bg-gray-50 flex flex-col', isStandalonePwa && 'hc-pwa-shell')}>
      {/* Header */}
      <header className="hc-app-header bg-white border-b border-gray-200 px-3 sm:px-4 py-3 flex flex-wrap items-center gap-3">
        {!isStandalonePwa && (
          <BrandLogo className="h-12 sm:h-14 w-auto max-w-[260px] sm:max-w-[300px] flex-shrink-0" />
        )}
        {!isStandalonePwa && <span className="flex-1 hidden md:block" />}

        <nav className="hc-tab-nav order-3 md:order-none w-full md:w-auto flex gap-1 overflow-x-auto pb-1 -mb-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={clsx(
                'hc-tab-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                tab === id
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              )}
            >
              <Icon size={isStandalonePwa ? 20 : 15} />
              <span className="hc-tab-label">{label}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* Content */}
      <main className={clsx('flex-1 overflow-hidden', isStandalonePwa && 'hc-pwa-main')}>
        {tab === 'timeline' && <Timeline onSelectAccessory={(id) => { setTab('accessories'); handleSelectAccessory(id); }} />}

        {tab === 'dashboard' && (
          <div className="max-w-5xl mx-auto py-4 sm:py-6 px-3 sm:px-4 space-y-4">

            {/* KPI cards row */}
            <StatsCards />

            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm">
                {DASHBOARD_WINDOWS.map(({ label, days }) => (
                  <button
                    key={days}
                    onClick={() => setDashboardDays(days)}
                    className={clsx(
                      'text-xs px-2.5 py-1 rounded-md transition-colors',
                      dashboardDays === days
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setSyncDashboardRanges((v) => !v)}
                title={syncDashboardRanges ? 'Charts synced — click to unsync' : 'Charts independent — click to sync'}
                className={clsx(
                  'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors',
                  syncDashboardRanges
                    ? 'bg-blue-50 border-blue-200 text-blue-600'
                    : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'
                )}
              >
                {syncDashboardRanges ? <Link2 size={12} /> : <Unlink2 size={12} />}
                <span className="hidden sm:inline">{syncDashboardRanges ? 'Synced' : 'Sync'}</span>
              </button>
            </div>

            {/* Full-width trend chart */}
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
              <TrendChart
                forcedDays={syncDashboardRanges ? dashboardDays : null}
                onDaysChange={syncDashboardRanges ? setDashboardDays : null}
              />
            </div>

            {/* 2-col: hourly activity + room breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
                <ActivityChart />
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
                <RoomChart
                  forcedDays={syncDashboardRanges ? dashboardDays : null}
                  onDaysChange={syncDashboardRanges ? setDashboardDays : null}
                />
              </div>
            </div>

            {/* 2-col: top devices + heatmaps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
                <TopDevices
                  forcedDays={syncDashboardRanges ? dashboardDays : null}
                  onDaysChange={syncDashboardRanges ? setDashboardDays : null}
                />
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
                <WeekdayHeatmap
                  forcedDays={syncDashboardRanges ? dashboardDays : null}
                  onDaysChange={syncDashboardRanges ? setDashboardDays : null}
                />
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <MonthlyHeatmap />
                </div>
              </div>
            </div>

            {/* Quiet hours */}
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
              <QuietHoursPanel />
            </div>

            {/* 2-col: active outliers + stale devices */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
                <AnomalyPanel />
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
                <StaleDevicesPanel />
              </div>
            </div>

          </div>
        )}

        {tab === 'accessories' && (
          selectedAccessoryId
            ? <AccessoryDetail accessoryId={selectedAccessoryId} onBack={handleAccessoryBack} />
            : <AccessoryList onSelectAccessory={handleSelectAccessory} />
        )}
        {tab === 'alerts' && <Alerts />}
        {tab === 'setup' && <Setup />}
      </main>

      {/* Footer */}
      <footer className="hc-footer border-t border-gray-200 px-4 py-2 text-center text-xs text-gray-400 flex items-center justify-center gap-3">
        <button
          onClick={handleOpenChangelog}
          title={__BUILD_VERSION__}
          className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {hasNewVersion && <Sparkles size={11} className="text-blue-500" />}
          <span>{__BUILD_VERSION__}</span>
          {hasNewVersion && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
        </button>
        {availableUpdate && (
          <>
            <span className="text-gray-300">·</span>
            <a
              href={availableUpdate.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hc-update-badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-colors"
            >
              <ArrowUpCircle size={11} />
              <span>{availableUpdate.tag} available</span>
            </a>
            <button
              onClick={dismissUpdate}
              title="Dismiss update notice"
              className="text-gray-300 hover:text-gray-500 transition-colors"
            >
              &times;
            </button>
          </>
        )}
        <span className="text-gray-300">·</span>
        <a
          href="https://github.com/havuq/homechronicle/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ExternalLink size={11} />
          Report an issue
        </a>
      </footer>

      {showChangelog && <ChangelogModal onClose={handleCloseChangelog} />}

      <div className="hc-fab fixed bottom-4 right-4 z-20">
        <div className="relative flex flex-col items-end gap-2">
          <div
            className={clsx(
              'absolute right-11 bottom-0 z-10 flex items-center gap-1 rounded-full border border-gray-200 bg-white/95 px-2 py-1.5 shadow-sm backdrop-blur transition-all duration-300 ease-out',
              isSkinPickerOpen
                ? 'translate-x-0 opacity-100 pointer-events-auto'
                : 'translate-x-8 opacity-0 pointer-events-none'
            )}
            style={isDarkTheme ? { backgroundColor: 'rgba(255,255,255,0.92)', borderColor: 'rgba(148,163,184,0.55)' } : undefined}
            aria-hidden={!isSkinPickerOpen}
          >
            {STYLES.map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => setSkin(style.id)}
                className={clsx(
                  'h-6 w-6 rounded-full p-0.5 transition-all',
                  skin === style.id
                    ? 'ring-2 ring-blue-500'
                    : isDarkTheme
                      ? 'ring-1 ring-slate-300 hover:ring-slate-400'
                      : 'ring-1 ring-gray-300 hover:ring-gray-400'
                )}
                style={isDarkTheme ? { backgroundColor: 'rgba(255,255,255,0.86)' } : undefined}
                aria-label={`Use ${style.label} color theme`}
                title={style.label}
              >
                <span
                  className={clsx(
                    'block h-full w-full rounded-full bg-gradient-to-br',
                    isDarkTheme ? SKIN_SWATCH_DARK[style.id] : SKIN_SWATCH[style.id]
                  )}
                  style={isDarkTheme ? { boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.52)' } : undefined}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPreference(nextPreference)}
            className={clsx(
              'z-30 inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-sm backdrop-blur transition-all duration-200',
              isDarkTheme
                ? 'border-gray-600 bg-gray-800/90 text-gray-300 hover:text-gray-100 hover:bg-gray-700/90'
                : 'border-gray-200 bg-white/95 text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            )}
            aria-label={`Theme mode: ${preference}. Click to switch to ${nextPreference}.`}
            title={`Theme mode: ${preference}`}
          >
            {preference === 'system' && <Monitor size={15} />}
            {preference === 'light' && <Sun size={15} />}
            {preference === 'dark' && <Moon size={15} />}
          </button>
          <button
            type="button"
            onClick={() => setIsSkinPickerOpen((current) => !current)}
            className={clsx(
              'relative z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-sm backdrop-blur transition-all duration-200',
              isDarkTheme
                ? 'border-gray-600 bg-gray-800/90 text-gray-300'
                : 'border-gray-200 bg-white/95 text-gray-500',
              isSkinPickerOpen
                ? isDarkTheme ? 'text-blue-400 border-blue-500' : 'text-blue-600 border-blue-300'
                : isDarkTheme ? 'hover:text-gray-100 hover:bg-gray-700/90' : 'hover:text-gray-700 hover:bg-gray-50'
            )}
            aria-label={isSkinPickerOpen ? 'Hide color themes' : 'Show color themes'}
            aria-expanded={isSkinPickerOpen}
            title="Color themes"
          >
            <Paintbrush2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
