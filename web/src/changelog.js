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
    title: 'Quiet hours, timeline episodes & Matter fixes',
    items: [
      'Quiet hours: define a time window (e.g. 11 PM\u20136 AM) and flag unexpected device activity',
      'Quiet hours dashboard card shows devices active during your quiet window',
      'Quiet hours card now always shows a header with icon, matching other dashboard cards',
      'Timeline: related scenes are automatically grouped into collapsible episodes (arrival, departure, bedtime, room activity)',
      'Timeline: service type moved to its own row below the accessory name',
      'Timeline: accessory names are now clickable \u2014 tap to jump to the accessory detail page',
      'Device notes: add a short note or nickname to any device on the My Devices tab',
      'Dashboard charts now follow the selected accent/skin color',
      'Fix: HomeKit pairing keys are now preserved during discovery rescans, preventing silent pairing loss',
      'Fix: Matter devices can now be deleted from My Devices (node ID normalization fix)',
      'Matter: added help modal explaining how to pair devices and supported clusters',
      'Matter: removing a device now purges its event history and all sibling endpoints',
      'Added app footer with build version and issue reporting link',
      'Added this changelog \u2014 auto-shown on updates, always available from the footer',
      'Improved Docker caching for faster web container rebuilds',
    ],
  },
];

export default CHANGELOG;
