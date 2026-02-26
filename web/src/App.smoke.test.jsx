import { render, screen, fireEvent } from '@testing-library/react';
import App from './App.jsx';

vi.mock('./components/Timeline.jsx', () => ({ default: () => <div>Timeline View</div> }));
vi.mock('./components/StatsCards.jsx', () => ({ default: () => <div>Stats Cards</div> }));
vi.mock('./components/ActivityChart.jsx', () => ({ default: () => <div>Activity Chart</div> }));
vi.mock('./components/TrendChart.jsx', () => ({ default: () => <div>Trend Chart</div> }));
vi.mock('./components/TopDevices.jsx', () => ({ default: () => <div>Top Devices</div> }));
vi.mock('./components/HeatmapLane.jsx', () => ({ default: () => <div>Heatmap Lane</div> }));
vi.mock('./components/RoomChart.jsx', () => ({ default: () => <div>Room Chart</div> }));
vi.mock('./components/WeekdayHeatmap.jsx', () => ({ default: () => <div>Weekday Heatmap</div> }));
vi.mock('./components/MonthlyHeatmap.jsx', () => ({ default: () => <div>Monthly Heatmap</div> }));
vi.mock('./components/AccessoryList.jsx', () => ({ default: () => <div>Accessory List</div> }));
vi.mock('./components/Alerts.jsx', () => ({ default: () => <div>Alerts View</div> }));
vi.mock('./components/Setup.jsx', () => ({ default: () => <div>Setup View</div> }));

describe('App smoke', () => {
  it('renders and switches top-level tabs', () => {
    render(<App />);

    expect(screen.getByText('HomeChronicle')).toBeInTheDocument();
    expect(screen.getByText('Timeline View')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /dashboard/i }));
    expect(screen.getByText('Stats Cards')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /accessories/i }));
    expect(screen.getByText('Accessory List')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /alerts/i }));
    expect(screen.getByText('Alerts View')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /setup/i }));
    expect(screen.getByText('Setup View')).toBeInTheDocument();
  });
});
