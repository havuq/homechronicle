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
