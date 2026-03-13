import { useState } from 'react';
import { X, Wifi, Smartphone, Zap, AlertTriangle, List } from 'lucide-react';
import clsx from 'clsx';

const SUPPORTED_CLUSTERS = [
  { name: 'On/Off', id: '0x0006', examples: 'Smart plugs, switches, lights' },
  { name: 'Level Control', id: '0x0008', examples: 'Dimmers, adjustable lights' },
  { name: 'Boolean State', id: '0x0045', examples: 'Contact sensors, door/window sensors' },
  { name: 'Temperature', id: '0x0402', examples: 'Temperature sensors, thermostats' },
  { name: 'Relative Humidity', id: '0x0405', examples: 'Humidity sensors' },
  { name: 'Occupancy', id: '0x0406', examples: 'Motion/occupancy sensors' },
];

const STEPS = [
  {
    id: 'commission',
    icon: Smartphone,
    title: 'Put your device in commissioning mode',
    color: 'blue',
    defaultOpen: true,
    content: () => (
      <div className="space-y-3">
        <p className="text-sm text-gray-700">
          Matter devices must be in commissioning mode before HomeChronicle can pair with them.
          If your device is already set up in Apple Home, you can share it:
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-sm text-blue-800">
          <p className="font-medium">From Apple Home:</p>
          <ol className="mt-1.5 space-y-1 list-none">
            {[
              'Open the Home app and long-press the device tile',
              'Tap the gear icon to open device settings',
              'Scroll down and tap "Turn On Pairing Mode"',
              'A setup code will appear — enter it in HomeChronicle',
            ].map((s, i) => (
              <li key={s} className="flex items-start gap-2">
                <span className="mt-0.5 text-blue-500 text-xs font-medium">{i + 1}.</span>{s}
              </li>
            ))}
          </ol>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700">
          <p className="font-medium text-gray-800">New (unpaired) device?</p>
          <p className="mt-1">
            Power it on — most Matter devices enter commissioning mode automatically on first boot.
            Check the device manual for a pairing button if it doesn't appear in the scan.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'setup-code',
    icon: Zap,
    title: 'Where to find the setup code',
    color: 'green',
    content: () => (
      <div className="space-y-3">
        <p className="text-sm text-gray-700">
          The Matter setup code is a numeric code used during commissioning.
        </p>
        <ul className="text-sm text-gray-600 space-y-1.5 list-none">
          {[
            'Apple Home app — shown when you enable pairing mode (see above)',
            'Printed on the device label, packaging, or quick-start guide',
            'On a QR code sticker — scan it with your phone camera to reveal the numeric code',
            'In the manufacturer\'s app under device settings',
          ].map((loc) => (
            <li key={loc} className="flex items-start gap-2">
              <span className="mt-0.5 text-green-400 text-xs">▸</span>
              {loc}
            </li>
          ))}
        </ul>
        <div className="bg-green-50 border border-green-200 rounded px-3 py-2 text-sm text-green-800">
          <span className="font-medium">Format:</span> A numeric code, typically{' '}
          <code className="bg-white border border-green-200 px-1.5 py-0.5 rounded text-xs font-mono text-gray-900">XXXX-XXX-XXXX</code>{' '}
          (11 digits) or a shorter manual code.
        </div>
      </div>
    ),
  },
  {
    id: 'network',
    icon: Wifi,
    title: 'Network requirements',
    color: 'orange',
    content: () => (
      <div className="space-y-3">
        <p className="text-sm text-gray-700">
          Matter commissioning and polling require the device to be reachable on your local network.
        </p>
        <ul className="text-sm text-gray-600 space-y-1.5 list-none">
          {[
            'Device and HomeChronicle must be on the same LAN (or have Layer 2 connectivity)',
            'IPv6 link-local must be available — this is the default on most networks',
            'If using Docker, host networking is strongly recommended',
            'Devices on a separate IoT VLAN need a VLAN interface on the Docker host',
          ].map((req) => (
            <li key={req} className="flex items-start gap-2">
              <span className="mt-0.5 text-orange-400 text-xs">▸</span>
              {req}
            </li>
          ))}
        </ul>
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5 text-sm text-orange-800">
          <span className="font-medium">Thread devices:</span> Thread border routers (like HomePod or Apple TV)
          bridge Thread devices onto your IP network. These should work as long as the border router
          is reachable from the listener.
        </div>
      </div>
    ),
  },
  {
    id: 'clusters',
    icon: List,
    title: 'Supported device types',
    color: 'teal',
    content: () => (
      <div className="space-y-3">
        <p className="text-sm text-gray-700">
          Matter devices expose capabilities through clusters. HomeChronicle polls a fixed set of clusters —
          devices using only unsupported clusters will pair but won't produce timeline events.
        </p>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Cluster</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Device examples</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {SUPPORTED_CLUSTERS.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-1.5 text-gray-800 whitespace-nowrap">
                    {c.name}{' '}
                    <code className="text-[10px] text-gray-400 font-mono">{c.id}</code>
                  </td>
                  <td className="px-3 py-1.5 text-gray-500">{c.examples}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-teal-50 border border-teal-200 rounded px-3 py-2 text-sm text-teal-800">
          Devices outside this list (e.g. blinds, media players, air purifiers) can still be paired —
          they just won't generate events until cluster support is added.
        </div>
      </div>
    ),
  },
  {
    id: 'troubleshoot',
    icon: AlertTriangle,
    title: 'Troubleshooting',
    color: 'red',
    content: () => (
      <div className="space-y-3">
        <div className="space-y-2.5">
          {[
            {
              symptom: 'Scan finds the device but commissioning times out',
              fix: 'The device may be on a different VLAN. IPv6 link-local does not cross VLAN boundaries — add a VLAN interface on the Docker host.',
            },
            {
              symptom: 'Paired but no events appear',
              fix: 'The device likely uses clusters outside the supported set. Pairing succeeds but no timeline events are produced.',
            },
            {
              symptom: 'Commissioning fails with a manual address',
              fix: 'Direct commissioning requires IPv6. Use an IPv6 address or retry using on-network discovery.',
            },
            {
              symptom: '"Matter commissioning is not available"',
              fix: 'The Matter runtime failed to initialize. Check listener logs: docker compose logs -f listener.',
            },
          ].map(({ symptom, fix }) => (
            <div key={symptom} className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm">
              <p className="font-medium text-gray-800">{symptom}</p>
              <p className="text-gray-600 mt-0.5">{fix}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

const COLOR_MAP = {
  blue:   'bg-blue-100 text-blue-700',
  green:  'bg-green-100 text-green-700',
  orange: 'bg-orange-100 text-orange-700',
  teal:   'bg-teal-100 text-teal-700',
  red:    'bg-red-100 text-red-700',
};

export default function MatterHelpModal({ onClose }) {
  const [open, setOpen] = useState(new Set(['commission']));

  function toggle(id) {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">How to pair a Matter device</h2>
            <p className="text-sm text-gray-500 mt-0.5">Setup, codes, and supported devices</p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable steps */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-2">
          {STEPS.map(({ id, icon: Icon, title, color }) => {
            const isOpen = open.has(id);
            const step = STEPS.find((s) => s.id === id);
            return (
              <div key={id} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggle(id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className={clsx('flex-shrink-0 p-1.5 rounded-lg', COLOR_MAP[color])}>
                    <Icon size={15} />
                  </span>
                  <span className="flex-1 text-sm font-medium text-gray-800">{title}</span>
                  <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50/50">
                    {step.content()}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
