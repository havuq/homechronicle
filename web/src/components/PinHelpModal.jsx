import { useState } from 'react';
import { X, Tag, Package, Smartphone, QrCode, LifeBuoy, AlertTriangle, Server } from 'lucide-react';
import clsx from 'clsx';

// Category-specific tips for where the PIN is most likely located
const CATEGORY_TIPS = {
  3:  'Fan',
  4:  { label: 'Garage Door Opener', tip: 'Check the label on the motor unit attached to the ceiling, or inside the wall button cover.' },
  5:  { label: 'Lightbulb / Light', tip: 'Check the base of the bulb or the packaging it came in.' },
  6:  { label: 'Door Lock', tip: 'Look inside the battery compartment — the PIN is often on a sticker there. Also check the back of the keypad panel.' },
  7:  { label: 'Outlet / Plug', tip: 'The label is usually on the back or bottom of the outlet, or on a small card in the box.' },
  8:  { label: 'Switch', tip: 'If it\'s a wall switch, remove the face plate — the PIN sticker is often on the device body underneath. Also check the wiring compartment.' },
  9:  { label: 'Thermostat', tip: 'Look on the back of the thermostat (remove it from the wall mount). Some models show the PIN on their display during setup mode.' },
  10: { label: 'Sensor', tip: 'Check the back of the sensor, inside the battery cover, or on a small card in the packaging.' },
  11: { label: 'Security System', tip: 'Check the control panel box (open it) or the paperwork that came with the system.' },
  12: { label: 'Door / Doorbell', tip: 'Look on the back or bottom of the device, or inside the mounting hardware packaging.' },
  17: { label: 'IP Camera', tip: 'Check the bottom of the camera or the QR code sticker — many cameras use QR scanning instead of typed PINs.' },
  18: { label: 'Video Doorbell', tip: 'The PIN is usually on the back of the doorbell or on a card in the box. Some models show it in the manufacturer\'s app.' },
  19: { label: 'Air Purifier', tip: 'Check the bottom of the unit or the back panel near the power socket.' },
  26: { label: 'Speaker', tip: 'Look on the bottom of the speaker or inside the packaging materials.' },
  32: { label: 'TV / Apple TV', tip: 'Apple TV shows the pairing code on-screen during setup. For smart TVs, check the manufacturer\'s app.' },
};

// Step shown first for Bridge (category 2) devices
const HOMEBRIDGE_STEP = {
  id: 'homebridge',
  icon: Server,
  title: 'Find your Homebridge PIN',
  color: 'green',
  content: () => (
    <div className="space-y-3">
      <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 text-sm text-green-800">
        <span className="font-medium">This is a Bridge.</span> Pairing once gives HomeChronicle
        access to <em>all</em> the accessories connected through it — no individual device PINs needed.
      </div>
      <p className="text-sm text-gray-700 font-medium">How to find the Homebridge PIN:</p>
      <ul className="text-sm text-gray-600 space-y-1.5 list-none">
        {[
          'Open the Homebridge web UI (usually http://homebridge.local or http://<NAS-IP>:8581)',
          'Look for the QR code icon in the top navigation bar — the 8-digit PIN is printed below the QR code',
          'Or go to Settings → HomeKit → Setup Code',
          'The format is always XXX-XX-XXX (e.g. 031-45-154)',
        ].map((step) => (
          <li key={step} className="flex items-start gap-2">
            <span className="mt-0.5 text-green-500 text-xs">▸</span>
            {step}
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-400">
        Other bridge software (like Home Assistant or HOOBS) shows the PIN similarly — look for
        the HomeKit integration settings or a QR code in the dashboard.
      </p>
    </div>
  ),
};

const STEPS = [
  {
    id: 'device',
    icon: Tag,
    title: 'Check the physical device',
    color: 'blue',
    content: (category) => {
      const tip = CATEGORY_TIPS[category];
      return (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Most accessories have the 8-digit setup code printed on a label somewhere on the device body.
          </p>
          {tip?.tip && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-sm text-blue-800">
              <span className="font-medium">For {tip.label}:</span> {tip.tip}
            </div>
          )}
          <ul className="text-sm text-gray-600 space-y-1.5 list-none">
            {[
              'Bottom or underside of the device',
              'Back panel or rear label',
              'Inside the battery compartment',
              'Behind a removable cover or faceplate',
              'On a separate card or sticker sheet included in the box',
            ].map((loc) => (
              <li key={loc} className="flex items-start gap-2">
                <span className="mt-0.5 text-blue-400 text-xs">▸</span>
                {loc}
              </li>
            ))}
          </ul>
          <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm">
            <span className="font-medium text-gray-700">Format:</span>{' '}
            <code className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-xs font-mono text-gray-900">111-22-333</code>
            <span className="text-gray-500 ml-2">— always 8 digits, two dashes</span>
          </div>
        </div>
      );
    },
  },
  {
    id: 'box',
    icon: Package,
    title: 'Check the original packaging',
    color: 'purple',
    content: () => (
      <div className="space-y-3">
        <p className="text-sm text-gray-700">
          If you still have the box or paperwork, the PIN is almost always printed there.
        </p>
        <ul className="text-sm text-gray-600 space-y-1.5 list-none">
          {[
            'Quick-start guide or setup card inside the box',
            'Back of the retail box (near the barcode)',
            'Inside the box lid',
            'Instruction manual — look for the HomeKit section',
            'A small sticker sheet separate from the main device',
          ].map((loc) => (
            <li key={loc} className="flex items-start gap-2">
              <span className="mt-0.5 text-purple-400 text-xs">▸</span>
              {loc}
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: 'qr',
    icon: QrCode,
    title: 'QR code on the device or box',
    color: 'green',
    content: () => (
      <div className="space-y-3">
        <p className="text-sm text-gray-700">
          Many HomeKit accessories print a QR code instead of (or alongside) the 8-digit PIN. The QR code encodes the setup code.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 text-sm text-green-800">
          <span className="font-medium">To decode a QR code:</span> Open the Apple Home app → tap{' '}
          <span className="font-mono bg-white px-1 rounded text-xs">+</span> → Add Accessory → point your camera at
          the QR code. The 8-digit PIN will appear in the Home app — note it down for use here.
        </div>
        <p className="text-sm text-gray-500">
          Look for the QR code on the same label as the serial number, or as a separate sticker.
        </p>
      </div>
    ),
  },
  {
    id: 'app',
    icon: Smartphone,
    title: 'Manufacturer\'s app',
    color: 'orange',
    content: (category) => {
      const appTip = {
        5: 'LIFX, Philips Hue, IKEA Home Smart, Nanoleaf',
        6: 'August, Schlage, Yale Access, Kwikset Halo',
        7: 'Wemo, TP-Link Kasa, iDevices',
        8: 'Lutron Caséta, Wemo, iDevices',
        9: 'Ecobee, Honeywell Home, Nest (limited)',
        17: 'Arlo, Eve, Logitech Circle',
        18: 'Ring (limited), Arlo, Eve',
      }[category];
      return (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Some manufacturers store the HomeKit setup code in their own app — useful when the device label is worn or missing.
          </p>
          {appTip && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5 text-sm text-orange-800">
              <span className="font-medium">Common apps for this category:</span> {appTip}
            </div>
          )}
          <ul className="text-sm text-gray-600 space-y-1.5 list-none">
            {[
              'Open the manufacturer\'s app and find your device',
              'Look for: Settings → Hardware Info → HomeKit Setup Code',
              'Or: Device Info → Apple HomeKit → Setup Code',
              'Wemo specifically: tap the device → Settings → HomeKit Setup Code',
            ].map((step) => (
              <li key={step} className="flex items-start gap-2">
                <span className="mt-0.5 text-orange-400 text-xs">▸</span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      );
    },
  },
  {
    id: 'support',
    icon: LifeBuoy,
    title: 'Contact manufacturer support',
    color: 'teal',
    content: () => (
      <div className="space-y-3">
        <p className="text-sm text-gray-700">
          If the label is worn and the code isn't in the app or packaging, the manufacturer's support team can often look it up using your device's serial number.
        </p>
        <ul className="text-sm text-gray-600 space-y-1.5 list-none">
          {[
            'Find the serial number (usually near where the PIN label was)',
            'Contact support via chat, email, or phone',
            'Ask specifically for the "HomeKit setup code" for your serial number',
            'Some brands can also initiate a remote reset that reveals the code',
          ].map((step) => (
            <li key={step} className="flex items-start gap-2">
              <span className="mt-0.5 text-teal-500 text-xs">▸</span>
              {step}
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: 'reset',
    icon: AlertTriangle,
    title: 'Last resort: factory reset',
    color: 'red',
    content: () => (
      <div className="space-y-3">
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-800">
          <span className="font-medium">Warning:</span> A factory reset will unpair the device from Apple Home
          and erase all its settings. Only do this if no other option worked.
        </div>
        <p className="text-sm text-gray-700">
          Some accessories generate a new setup code after a factory reset, making them paireable again.
        </p>
        <ul className="text-sm text-gray-600 space-y-1.5 list-none">
          {[
            'Check the device manual for reset instructions (usually holding a button)',
            'After reset: re-add to Apple Home first using the new code',
            'Note the new setup code before re-adding to Apple Home',
            'Then use that code to pair here',
          ].map((step) => (
            <li key={step} className="flex items-start gap-2">
              <span className="mt-0.5 text-red-400 text-xs">▸</span>
              {step}
            </li>
          ))}
        </ul>
      </div>
    ),
  },
];

const COLOR_MAP = {
  blue:   'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  green:  'bg-green-100 text-green-700',
  orange: 'bg-orange-100 text-orange-700',
  teal:   'bg-teal-100 text-teal-700',
  red:    'bg-red-100 text-red-700',
};

export default function PinHelpModal({ deviceName, category, onClose }) {
  const isbridge = category === 2;
  // For bridges, open the Homebridge step by default; otherwise open the physical device step
  const [open, setOpen] = useState(new Set([isbridge ? 'homebridge' : 'device']));

  function toggle(id) {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">How to find the setup PIN</h2>
            {deviceName && (
              <p className="text-sm text-gray-500 mt-0.5">for <span className="font-medium text-gray-700">{deviceName}</span></p>
            )}
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
          {(isbridge ? [HOMEBRIDGE_STEP, ...STEPS] : STEPS).map(({ id, icon: Icon, title, color, content }) => {
            const isOpen = open.has(id);
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
                    {content(category)}
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
