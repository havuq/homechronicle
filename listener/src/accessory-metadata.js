const SERVICE_TYPE_LABELS = new Map([
  ['43', 'Lightbulb'],
  ['49', 'Switch'],
  ['47', 'Outlet'],
  ['40', 'Fan'],
  ['B7', 'Fan'],
  ['41', 'GarageDoorOpener'],
  ['45', 'LockMechanism'],
  ['4A', 'Thermostat'],
  ['7E', 'SecuritySystem'],
  ['85', 'MotionSensor'],
  ['80', 'ContactSensor'],
  ['86', 'OccupancySensor'],
  ['8A', 'TemperatureSensor'],
  ['82', 'HumiditySensor'],
  ['84', 'LightSensor'],
  ['8D', 'AirQualitySensor'],
  ['83', 'LeakSensor'],
  ['87', 'SmokeSensor'],
  ['7F', 'CarbonMonoxideSensor'],
  ['97', 'CarbonDioxideSensor'],
  ['81', 'Door'],
  ['8B', 'Window'],
  ['8C', 'WindowCovering'],
  ['BB', 'AirPurifier'],
  ['BC', 'HeaterCooler'],
  ['BD', 'HumidifierDehumidifier'],
  ['CF', 'IrrigationSystem'],
  ['D0', 'Valve'],
  ['96', 'Battery'],
  ['110', 'Camera'],
  ['121', 'Doorbell'],
  ['D8', 'Television'],
]);

const WATCHED_CHARACTERISTICS = new Map([
  ['25', 'On'],
  ['E', 'CurrentDoorState'],
  ['F', 'TargetDoorState'],
  ['1D', 'LockCurrentState'],
  ['1E', 'LockTargetState'],
  ['22', 'MotionDetected'],
  ['6D', 'ContactSensorState'],
  ['71', 'OccupancyDetected'],
  ['30', 'CurrentTemperature'],
  ['10', 'CurrentRelativeHumidity'],
  ['66', 'SecuritySystemCurrentState'],
  ['67', 'SecuritySystemTargetState'],
  ['8', 'Brightness'],
  ['C0', 'ColorTemperature'],
  ['13', 'Hue'],
  ['2F', 'Saturation'],
  ['B0', 'Active'],
  ['AB', 'FilterLifeLevel'],
  ['95', 'AirQuality'],
  ['75', 'VOCDensity'],
  ['76', 'PM2_5Density'],
  ['64', 'CurrentAmbientLightLevel'],
  ['68', 'StatusLowBattery'],
  ['5B', 'BatteryLevel'],
]);

const identityCache = new Map();
const capabilitiesCache = new Map();

function copyOrNull(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function getInfoCharacteristicValue(infoService, shortType) {
  const match = infoService?.characteristics?.find((c) => shortUuid(c.type) === shortType);
  return copyOrNull(match?.value);
}

export function shortUuid(uuid = '') {
  const match = uuid.match(/^0*([0-9A-Fa-f]+)-/);
  return match ? match[1].toUpperCase() : uuid.toUpperCase();
}

export function extractAccessoryMetadata({ deviceId, pairingName = null, accessories }) {
  const iidMetaMap = new Map();
  const identitiesByAccessoryId = new Map();
  const capabilitiesByAccessoryId = new Map();
  const nowIso = new Date().toISOString();

  for (const acc of accessories?.accessories ?? []) {
    const infoService = acc.services?.find((s) => shortUuid(s.type) === '3E');
    const childName = getInfoCharacteristicValue(infoService, '23')
      ?? (acc.aid === 1 ? copyOrNull(pairingName) : null);
    const manufacturer = getInfoCharacteristicValue(infoService, '20');
    const model = getInfoCharacteristicValue(infoService, '21');
    const serialNumber = getInfoCharacteristicValue(infoService, '30');
    const firmwareRevision = getInfoCharacteristicValue(infoService, '52');
    const hardwareRevision = getInfoCharacteristicValue(infoService, '53');
    const effectiveId = acc.aid > 1 ? `${deviceId}:${acc.aid}` : deviceId;

    const watchedServiceTypes = new Set();
    const watchedCharacteristicNames = new Set();
    const services = [];
    let characteristicCount = 0;

    for (const service of acc.services ?? []) {
      const serviceTypeShort = shortUuid(service.type);
      const serviceLabel = SERVICE_TYPE_LABELS.get(serviceTypeShort) ?? serviceTypeShort;
      const characteristics = [];
      let hasWatchedCharacteristic = false;

      for (const char of service.characteristics ?? []) {
        const charTypeShort = shortUuid(char.type);
        const watchedLabel = WATCHED_CHARACTERISTICS.get(charTypeShort);
        if (watchedLabel) {
          hasWatchedCharacteristic = true;
          watchedCharacteristicNames.add(watchedLabel);
        }
        characteristicCount += 1;
        characteristics.push({
          iid: char.iid ?? null,
          type: charTypeShort,
          label: watchedLabel ?? char.description ?? charTypeShort,
          format: char.format ?? null,
          unit: char.unit ?? null,
          min_value: char.minValue ?? null,
          max_value: char.maxValue ?? null,
          min_step: char.minStep ?? null,
          perms: Array.isArray(char.perms) ? char.perms : [],
        });
      }

      if (hasWatchedCharacteristic) watchedServiceTypes.add(serviceLabel);

      services.push({
        iid: service.iid ?? null,
        type: serviceTypeShort,
        label: serviceLabel,
        characteristics,
      });
    }

    const shouldDisambiguateByService = watchedServiceTypes.size > 1;

    for (const service of acc.services ?? []) {
      const serviceTypeShort = shortUuid(service.type);
      const serviceType = SERVICE_TYPE_LABELS.get(serviceTypeShort) ?? serviceTypeShort;
      for (const char of service.characteristics ?? []) {
        const charType = shortUuid(char.type);
        const charName = WATCHED_CHARACTERISTICS.get(charType) ?? null;
        if (!charName) continue;
        const componentName = (shouldDisambiguateByService && childName)
          ? `${childName} · ${serviceType}`
          : childName;
        iidMetaMap.set(`${acc.aid}.${char.iid}`, {
          serviceType,
          characteristicName: charName,
          childName,
          componentName,
        });
      }
    }

    identitiesByAccessoryId.set(effectiveId, {
      manufacturer,
      model,
      serial_number: serialNumber,
      firmware_revision: firmwareRevision,
      hardware_revision: hardwareRevision,
      metadata_updated_at: nowIso,
    });

    capabilitiesByAccessoryId.set(effectiveId, {
      accessory_id: effectiveId,
      parent_device_id: deviceId,
      aid: acc.aid,
      accessory_name: childName,
      manufacturer,
      model,
      serial_number: serialNumber,
      firmware_revision: firmwareRevision,
      hardware_revision: hardwareRevision,
      service_count: services.length,
      characteristic_count: characteristicCount,
      watched_service_types: [...watchedServiceTypes],
      watched_characteristics: [...watchedCharacteristicNames],
      watched_characteristic_count: watchedCharacteristicNames.size,
      services,
      metadata_updated_at: nowIso,
    });
  }

  return { iidMetaMap, identitiesByAccessoryId, capabilitiesByAccessoryId };
}

export function cacheAccessoryMetadata({ deviceId, pairingName = null, accessories }) {
  const parsed = extractAccessoryMetadata({ deviceId, pairingName, accessories });
  clearAccessoryMetadata(deviceId);

  for (const [accessoryId, identity] of parsed.identitiesByAccessoryId.entries()) {
    identityCache.set(accessoryId, identity);
  }
  for (const [accessoryId, capability] of parsed.capabilitiesByAccessoryId.entries()) {
    capabilitiesCache.set(accessoryId, capability);
  }

  return parsed;
}

export function getAccessoryIdentity(accessoryId) {
  return identityCache.get(accessoryId) ?? null;
}

export function getAccessoryCapabilities(accessoryId) {
  return capabilitiesCache.get(accessoryId) ?? null;
}

export function clearAccessoryMetadata(deviceId) {
  for (const key of identityCache.keys()) {
    if (key === deviceId || key.startsWith(`${deviceId}:`)) identityCache.delete(key);
  }
  for (const key of capabilitiesCache.keys()) {
    if (key === deviceId || key.startsWith(`${deviceId}:`)) capabilitiesCache.delete(key);
  }
}

export { SERVICE_TYPE_LABELS, WATCHED_CHARACTERISTICS };
