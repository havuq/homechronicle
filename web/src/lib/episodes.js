const SCENE_WINDOW_MS = 5_000;
const EPISODE_WINDOW_MS = 3 * 60_000;
const EPISODE_MIN_EVENT_COUNT = 3;

function asTimestamp(value) {
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : null;
}

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function isTruthyOn(value) {
  const normalized = normalizeText(value);
  return normalized === '1' || normalized === 'true';
}

function isTruthyOff(value) {
  const normalized = normalizeText(value);
  return normalized === '0' || normalized === 'false';
}

export function groupIntoScenes(events) {
  if (!events.length) return [];

  const groups = [];
  let current = [events[0]];

  for (let i = 1; i < events.length; i += 1) {
    const prevTs = asTimestamp(events[i - 1].timestamp);
    const nextTs = asTimestamp(events[i].timestamp);
    if (prevTs == null || nextTs == null) continue;

    if (prevTs - nextTs <= SCENE_WINDOW_MS) {
      current.push(events[i]);
    } else {
      groups.push(current);
      current = [events[i]];
    }
  }

  groups.push(current);
  return groups;
}

function sceneStart(scene) {
  return asTimestamp(scene?.[0]?.timestamp);
}

function getEpisodeFacts(events) {
  const rooms = [...new Set(events.map((event) => event.room_name).filter(Boolean))];
  const accessories = [...new Set(events.map((event) => event.accessory_name).filter(Boolean))];

  let openedEntry = false;
  let closedEntry = false;
  let lockSecured = false;
  let motion = false;
  let occupancy = false;
  let lightsOn = 0;
  let lightsOff = 0;
  let securityArmed = false;

  for (const event of events) {
    const characteristic = normalizeText(event.characteristic);
    const service = normalizeText(event.service_type);

    if (characteristic === 'contactsensorstate' || service === 'garagedooropener') {
      if (normalizeText(event.new_value) === '1' || normalizeText(event.new_value) === '0') {
        if (characteristic === 'contactsensorstate') {
          openedEntry ||= normalizeText(event.new_value) === '1';
          closedEntry ||= normalizeText(event.new_value) === '0';
        }
      }
    }

    if (service === 'garagedooropener' || characteristic === 'currentdoorstate' || characteristic === 'targetdoorstate') {
      openedEntry ||= normalizeText(event.new_value) === '0' || normalizeText(event.new_value) === '2';
      closedEntry ||= normalizeText(event.new_value) === '1' || normalizeText(event.new_value) === '3';
    }

    if (characteristic === 'motiondetected' && isTruthyOn(event.new_value)) motion = true;
    if (characteristic === 'occupancydetected' && isTruthyOn(event.new_value)) occupancy = true;
    if ((characteristic === 'lockcurrentstate' || characteristic === 'locktargetstate') && normalizeText(event.new_value) === '1') {
      lockSecured = true;
    }
    if (characteristic === 'on' && isTruthyOn(event.new_value)) lightsOn += 1;
    if (characteristic === 'on' && isTruthyOff(event.new_value)) lightsOff += 1;
    if (
      (characteristic === 'securitysystemcurrentstate' || characteristic === 'securitysystemtargetstate') &&
      ['0', '1', '2'].includes(normalizeText(event.new_value))
    ) {
      securityArmed = true;
    }
  }

  return {
    rooms,
    accessories,
    openedEntry,
    closedEntry,
    lockSecured,
    motion,
    occupancy,
    lightsOn,
    lightsOff,
    securityArmed,
  };
}

export function summarizeEpisode(events) {
  const facts = getEpisodeFacts(events);

  if (facts.openedEntry && (facts.motion || facts.occupancy || facts.lightsOn > 0)) {
    return {
      title: 'Arrival activity',
      summary: 'Entry access triggered motion or lights shortly after.',
      kind: 'arrival',
    };
  }

  if ((facts.closedEntry || facts.lockSecured) && facts.lightsOff > 0) {
    return {
      title: 'Departure activity',
      summary: 'Doors or locks settled while lights were turning off.',
      kind: 'departure',
    };
  }

  if ((facts.lightsOff >= 2 || facts.securityArmed) && facts.lockSecured) {
    return {
      title: 'Bedtime wind-down',
      summary: 'The home quieted down with lights off and security changes.',
      kind: 'bedtime',
    };
  }

  if (facts.rooms.length === 1) {
    return {
      title: `${facts.rooms[0]} activity`,
      summary: `${events.length} changes across ${facts.accessories.length} device${facts.accessories.length === 1 ? '' : 's'}.`,
      kind: 'room',
    };
  }

  return {
    title: 'Home activity episode',
    summary: `${events.length} changes across ${facts.accessories.length} device${facts.accessories.length === 1 ? '' : 's'}.`,
    kind: 'generic',
  };
}

function shouldPromoteEpisode(scenes) {
  const events = scenes.flat();
  const accessories = new Set(events.map((event) => event.accessory_name).filter(Boolean));
  return events.length >= EPISODE_MIN_EVENT_COUNT && (scenes.length > 1 || accessories.size > 1);
}

export function groupScenesIntoEpisodes(scenes) {
  if (!scenes.length) return [];

  const output = [];
  let current = [scenes[0]];

  for (let i = 1; i < scenes.length; i += 1) {
    const prevStart = sceneStart(scenes[i - 1]);
    const nextStart = sceneStart(scenes[i]);
    if (prevStart == null || nextStart == null) {
      output.push({ kind: 'scenes', scenes: current });
      current = [scenes[i]];
      continue;
    }

    if (prevStart - nextStart <= EPISODE_WINDOW_MS) {
      current.push(scenes[i]);
    } else {
      output.push(
        shouldPromoteEpisode(current)
          ? { kind: 'episode', scenes: current, episode: summarizeEpisode(current.flat()) }
          : { kind: 'scenes', scenes: current }
      );
      current = [scenes[i]];
    }
  }

  output.push(
    shouldPromoteEpisode(current)
      ? { kind: 'episode', scenes: current, episode: summarizeEpisode(current.flat()) }
      : { kind: 'scenes', scenes: current }
  );

  return output;
}
