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
