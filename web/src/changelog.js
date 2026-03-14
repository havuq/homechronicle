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
    title: 'Archive toggle, device notes backend & settings improvements',
    items: [
      'Settings: archive before delete toggle \u2014 control whether expired events are copied to the archive table or permanently removed',
      'Fix: device notes now persist to the backend (previously the API endpoints were missing)',
      'Bridge grouping, display names, dark mode polish & fixes from earlier betas',
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
