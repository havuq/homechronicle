import { render, screen } from '@testing-library/react';
import Timeline from './Timeline.jsx';

vi.mock('../hooks/useEvents.js', () => ({
  useEvents: (() => {
    const stableData = {
      events: [{
        id: 'evt-1',
        timestamp: 'not-a-real-date',
        accessory_name: 'Kitchen Light',
        room_name: 'Kitchen',
        service_type: 'Lightbulb',
        characteristic: 'On',
        old_value: '0',
        new_value: '1',
      }],
      pages: 1,
    };
    return () => {
      return {
        data: stableData,
        isLoading: false,
        isError: false,
      };
    };
  })(),
  useAnomalies: (() => {
    const stableAnomalies = { devices: [], rooms: [] };
    return () => ({
      data: stableAnomalies,
    });
  })(),
}));

vi.mock('../hooks/useMutedDevices.js', () => ({
  useMutedDevices: (() => {
    const muted = new Set();
    const mute = vi.fn();
    const unmute = vi.fn();
    return () => ({
      muted,
      mute,
      unmute,
    });
  })(),
}));

vi.mock('./FilterBar.jsx', () => ({ default: () => null }));
vi.mock('./TimelineHeatmap.jsx', () => ({ default: () => null }));

describe('Timeline', () => {
  it('does not crash when events include invalid timestamps', () => {
    render(<Timeline />);

    expect(screen.getByText('No visible events')).toBeInTheDocument();
    expect(screen.getByText(/invalid timestamps/i)).toBeInTheDocument();
  });
});
