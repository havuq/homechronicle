import { useState } from 'react';
import clsx from 'clsx';
import { useSetup } from '../../hooks/useSetup.js';
import { SETUP_TABS } from './constants.js';
import AddDevicesTab from './AddDevicesTab.jsx';
import MyDevicesTab from './MyDevicesTab.jsx';
import SettingsTab from './SettingsTab.jsx';

export default function SetupTabs() {
  const [activeTab, setActiveTab] = useState('add');
  const setup = useSetup();

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <nav className="flex gap-1 border-b border-gray-200">
        {SETUP_TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={clsx(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300',
            )}
          >
            {label}
          </button>
        ))}
      </nav>

      {activeTab === 'add' && <AddDevicesTab setup={setup} />}
      {activeTab === 'devices' && <MyDevicesTab setup={setup} />}
      {activeTab === 'settings' && <SettingsTab setup={setup} />}
    </div>
  );
}
