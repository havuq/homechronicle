/**
 * icons.js — maps HomeKit service types and characteristic names
 * to lucide-react icon component names.
 */

import {
  Lightbulb,
  Lock,
  Thermometer,
  Activity,
  ToggleLeft,
  Shield,
  Camera,
  Wind,
  Warehouse,
  Eye,
  Droplets,
  Home,
  DoorOpen,
  Bell,
  Zap,
} from 'lucide-react';

const SERVICE_ICONS = {
  Lightbulb:       Lightbulb,
  Outlet:          Zap,
  Switch:          ToggleLeft,
  Thermostat:      Thermometer,
  TemperatureSensor: Thermometer,
  HumiditySensor:  Droplets,
  MotionSensor:    Eye,
  ContactSensor:   DoorOpen,
  OccupancySensor: Eye,
  LockMechanism:   Lock,
  GarageDoorOpener: Warehouse,
  Door:            DoorOpen,
  Window:          DoorOpen,
  SecuritySystem:  Shield,
  Camera:          Camera,
  Fan:             Wind,
  AirQualitySensor: Activity,
  Doorbell:        Bell,
};

export function getServiceIcon(serviceType) {
  return SERVICE_ICONS[serviceType] ?? Home;
}

/**
 * Returns before → after strings for numeric/enum characteristics where
 * showing the transition adds value. Returns null when not applicable.
 */
export function describeBeforeAfter(characteristic, oldValue, newValue) {
  if (oldValue == null || oldValue === '' || String(oldValue) === String(newValue)) return null;
  switch (characteristic) {
    case 'Brightness':
    case 'Volume':
      return { from: `${Math.round(oldValue)}%`, to: `${Math.round(newValue)}%` };
    case 'Saturation':
      return { from: `${parseFloat(oldValue).toFixed(0)}%`, to: `${parseFloat(newValue).toFixed(0)}%` };
    case 'CurrentTemperature':
    case 'TargetTemperature':
      return { from: `${parseFloat(oldValue).toFixed(1)}°C`, to: `${parseFloat(newValue).toFixed(1)}°C` };
    case 'CurrentRelativeHumidity':
      return { from: `${parseFloat(oldValue).toFixed(0)}%`, to: `${parseFloat(newValue).toFixed(0)}%` };
    case 'Hue':
      return { from: `${parseFloat(oldValue).toFixed(0)}°`, to: `${parseFloat(newValue).toFixed(0)}°` };
    case 'ColorTemperature':
      return { from: `${Math.round(oldValue)} mired`, to: `${Math.round(newValue)} mired` };
    default:
      return null;
  }
}

/**
 * Formats a millisecond gap into a human-readable string.
 * Returns null for gaps under 2 minutes (not worth displaying).
 */
export function formatGap(ms) {
  if (ms < 2 * 60_000) return null;
  const totalMin = Math.round(ms / 60_000);
  const h        = Math.floor(totalMin / 60);
  const m        = totalMin % 60;
  if (h === 0)  return `${m}m`;
  if (m === 0)  return `${h}h`;
  return `${h}h ${m}m`;
}

/** Returns a human-readable description of a characteristic change */
export function describeChange(characteristic, newValue) {
  switch (characteristic) {
    case 'On':
      return newValue === 'true' || newValue === '1' ? 'turned on' : 'turned off';
    case 'MotionDetected':
      return newValue === 'true' || newValue === '1' ? 'motion detected' : 'motion cleared';
    case 'ContactSensorState':
      return newValue === '0' ? 'contact closed' : 'contact opened';
    case 'OccupancyDetected':
      return newValue === '1' ? 'occupancy detected' : 'no occupancy';
    case 'CurrentDoorState':
    case 'TargetDoorState': {
      const states = ['open', 'closed', 'opening', 'closing', 'stopped'];
      return states[parseInt(newValue, 10)] ?? `state ${newValue}`;
    }
    case 'LockCurrentState':
    case 'LockTargetState': {
      const states = ['unsecured', 'secured', 'jammed', 'unknown'];
      return states[parseInt(newValue, 10)] ?? `state ${newValue}`;
    }
    case 'SecuritySystemCurrentState':
    case 'SecuritySystemTargetState': {
      const states = ['stay arm', 'away arm', 'night arm', 'disarmed', 'alarm triggered'];
      return states[parseInt(newValue, 10)] ?? `state ${newValue}`;
    }
    case 'CurrentTemperature':
      return `${parseFloat(newValue).toFixed(1)}°C`;
    case 'CurrentRelativeHumidity':
      return `${parseFloat(newValue).toFixed(0)}% RH`;
    case 'Brightness':
      return `brightness ${newValue}%`;
    default:
      return `${characteristic}: ${newValue}`;
  }
}
