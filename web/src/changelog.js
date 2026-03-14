/**
 * changelog.js — release notes shown to users after an update.
 *
 * Add new entries at the TOP of the array. Each entry needs:
 *   version  — release tag (e.g. "v0.1.3") or "v0.1.3-beta" for pre-releases
 *   title    — one-line summary for this release
 *   items    — array of bullet points
 *
 * Beta builds are combined under a single "-beta" tag.
 * Final releases use the version number (e.g. "v0.1.3").
 */
const CHANGELOG = [
  {
    version: 'v0.1.3-beta',
    title: 'Bridge grouping, display names, dark mode polish & fixes',
    items: [
      'Accessories tab: bridge devices are now hidden \u2014 their children appear as top-level devices, visually grouped under a bridge banner',
      'My Devices: editable display names for all devices (inline rename)',
      'My Devices: warning banner when devices are missing room assignments',
      'My Devices: device notes now supported on bridge children and Matter endpoints',
      'Fix: quiet hours settings now persist correctly when saved',
      'Dark mode: theme/skin picker buttons follow dark theme',
      'Dark mode: timeline episodes styled for dark backgrounds',
    ],
  },
  {
    version: 'v0.1.2-beta',
    title: 'Quiet hours, timeline episodes, device notes & Matter improvements',
    items: [
      'Quiet hours: flag unexpected device activity during a defined time window',
      'Timeline: related events grouped into collapsible episodes',
      'Timeline: accessory names link to detail page',
      'Device notes and dashboard accent colors',
      'Matter: help modal, device deletion with endpoint cleanup',
      'Fix: pairing keys preserved during rescans; Matter device deletion fixed',
      'App footer with version, changelog, and issue link',
    ],
  },
];

export default CHANGELOG;
