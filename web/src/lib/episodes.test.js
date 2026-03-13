import { describe, expect, it } from 'vitest';
import { groupIntoScenes, groupScenesIntoEpisodes, summarizeEpisode } from './episodes.js';

function makeEvent(id, timestamp, overrides = {}) {
  return {
    id,
    timestamp,
    accessory_name: 'Kitchen Light',
    room_name: 'Kitchen',
    service_type: 'Lightbulb',
    characteristic: 'On',
    old_value: '0',
    new_value: '1',
    ...overrides,
  };
}

describe('episodes', () => {
  it('groups nearby events into scenes', () => {
    const scenes = groupIntoScenes([
      makeEvent('1', '2026-03-11T12:03:00.000Z'),
      makeEvent('2', '2026-03-11T12:02:57.000Z'),
      makeEvent('3', '2026-03-11T11:58:00.000Z'),
    ]);

    expect(scenes).toHaveLength(2);
    expect(scenes[0]).toHaveLength(2);
    expect(scenes[1]).toHaveLength(1);
  });

  it('promotes multi-scene bursts into an arrival episode', () => {
    const scenes = groupIntoScenes([
      makeEvent('1', '2026-03-11T18:04:00.000Z', {
        accessory_name: 'Front Door',
        room_name: 'Entryway',
        service_type: 'ContactSensor',
        characteristic: 'ContactSensorState',
        new_value: '1',
      }),
      makeEvent('2', '2026-03-11T18:03:10.000Z', {
        accessory_name: 'Hall Motion',
        room_name: 'Hallway',
        service_type: 'MotionSensor',
        characteristic: 'MotionDetected',
        new_value: '1',
      }),
      makeEvent('3', '2026-03-11T18:02:20.000Z', {
        accessory_name: 'Kitchen Light',
        room_name: 'Kitchen',
        service_type: 'Lightbulb',
        characteristic: 'On',
        new_value: '1',
      }),
    ]);

    const episodes = groupScenesIntoEpisodes(scenes);

    expect(episodes).toHaveLength(1);
    expect(episodes[0].kind).toBe('episode');
    expect(episodes[0].episode.title).toBe('Arrival activity');
  });

  it('falls back to a room activity summary when no heuristic matches', () => {
    const summary = summarizeEpisode([
      makeEvent('1', '2026-03-11T20:00:00.000Z', { accessory_name: 'Lamp 1' }),
      makeEvent('2', '2026-03-11T19:59:00.000Z', { accessory_name: 'Lamp 2' }),
      makeEvent('3', '2026-03-11T19:58:00.000Z', { accessory_name: 'Lamp 3' }),
    ]);

    expect(summary.title).toBe('Kitchen activity');
    expect(summary.kind).toBe('room');
  });
});
