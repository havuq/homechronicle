/**
 * changelog.js — release notes shown to users after an update.
 *
 * Add new entries at the TOP of the array. Each entry needs:
 *   version  — the git short hash or VITE_BUILD_VERSION value
 *   date     — human-readable date string
 *   title    — one-line summary
 *   items    — array of bullet points
 */
const CHANGELOG = [
  {
    version: 'v0.1.3-beta.5',
    date: '2026-03-13',
    title: 'Quiet hours card polish',
    items: [
      'Quiet hours card now always shows a header with icon, matching other dashboard cards',
      'Quiet hours error state softened to a neutral message instead of alarming red text',
    ],
  },
  {
    version: 'v0.1.3-beta.4',
    date: '2026-03-13',
    title: 'Pairing safeguard & timeline episodes',
    items: [
      'Fix: HomeKit pairing keys (longTermData) are now preserved during discovery rescans, preventing silent pairing loss',
      'Timeline: related scenes are automatically grouped into episodes (arrival, departure, bedtime, room activity)',
      'Episodes are collapsible — tap to expand individual event scenes',
    ],
  },
  {
    version: 'v0.1.3-beta.3',
    date: '2026-03-13',
    title: 'Device notes, quiet hours & bug fixes',
    items: [
      'Device notes: add a short note or nickname to any device on the My Devices tab',
      'Device notes are displayed on the accessory detail page',
      'Quiet hours: define a time window (e.g. 11 PM–6 AM) and flag unexpected device activity',
      'Quiet hours dashboard card shows devices active during your quiet window',
      'Quiet hours configuration available in Settings with local-time hour pickers',
      'Fix: Matter devices can now be deleted from My Devices (node ID normalization fix)',
      'Fix: Matter device deletion errors are now shown instead of silently ignored',
      'Setup: Matter card description condensed to one line',
      'Setup: "See supported devices" link moved to bottom of Matter card',
    ],
  },
  {
    version: 'v0.1.3-beta.2',
    date: '2026-03-13',
    title: 'Timeline cleanup, Matter improvements & changelog',
    items: [
      'Timeline: service type moved to its own row below the accessory name',
      'Timeline: accessory names are now clickable — tap to jump to the accessory detail page',
      'Dashboard charts now follow the selected accent/skin color',
      'Matter: added help modal explaining how to pair Matter devices and supported clusters',
      'Matter: removing a device now purges its event history and all sibling endpoints',
      'Matter: device removal now refreshes the pairing list and timeline automatically',
      'Setup: Matter card wording and layout improvements',
      'Added app footer with build version and issue reporting link',
      'Added this changelog — auto-shown on updates, always available from the footer',
      'Improved Docker caching for faster web container rebuilds',
    ],
  },
];

export default CHANGELOG;
