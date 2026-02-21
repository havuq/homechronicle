# HomeKit Event Log — Claude Code Project Plan

## Project Overview
A native iOS app built with Swift + SwiftUI that listens to HomeKit accessory state changes and stores them locally, providing a timeline, filters, and activity charts that Apple's Home app never offers.

## Tech Stack
- **Language:** Swift 5.9+
- **UI:** SwiftUI
- **Database:** SwiftData
- **Framework:** HomeKit (`HMHomeKit`)
- **Min iOS Target:** iOS 17 (required for SwiftData)
- **Xcode:** 15+

---

## Project Structure

```
HomeKitLog/
├── HomeKitLogApp.swift          # App entry point, HMHomeManager init
├── CLAUDE.md                    # This file
├── Models/
│   ├── EventLog.swift           # SwiftData model for a single event
│   └── AccessorySnapshot.swift  # Lightweight struct for accessory metadata
├── Managers/
│   ├── HomeKitManager.swift     # Wraps HMHomeManager, delegates, event capture
│   └── EventStore.swift         # SwiftData insert/fetch/delete logic
├── Views/
│   ├── ContentView.swift        # Root tab view
│   ├── Timeline/
│   │   ├── TimelineView.swift   # Main feed, grouped by day
│   │   └── EventRowView.swift   # Single event row
│   ├── Filters/
│   │   └── FilterView.swift     # Filter by room / device type / date
│   └── Charts/
│       └── ActivityChartView.swift  # Heatmap / bar chart of activity
└── Utilities/
    └── AccessoryIcon.swift      # Maps HM accessory category to SF Symbol
```

---

## Phase 1 — HomeKit Access & Device List
**Goal:** App launches, requests HomeKit permission, lists all accessories by room.

### Tasks
- [ ] Create new Xcode project (SwiftUI, SwiftData template)
- [ ] Add HomeKit entitlement in Signing & Capabilities
- [ ] Add `NSHomeKitUsageDescription` to Info.plist
- [ ] Implement `HomeKitManager` using `HMHomeManager` + `HMHomeManagerDelegate`
- [ ] Handle `.authorized` vs `.denied` permission state
- [ ] Display accessories grouped by room in a simple `List`

### Key Code Pattern
```swift
class HomeKitManager: NSObject, ObservableObject, HMHomeManagerDelegate {
    let homeManager = HMHomeManager()
    @Published var homes: [HMHome] = []

    override init() {
        super.init()
        homeManager.delegate = self
    }

    func homeManagerDidUpdateHomes(_ manager: HMHomeManager) {
        homes = manager.homes
    }
}
```

---

## Phase 2 — Event Capture & Storage
**Goal:** Detect state changes on accessories and persist them to SwiftData.

### SwiftData Model
```swift
@Model
class EventLog {
    var id: UUID
    var timestamp: Date
    var accessoryName: String
    var roomName: String
    var characteristicType: String   // e.g. "currentDoorState", "motionDetected"
    var oldValue: String?
    var newValue: String
    var categoryRawValue: Int        // HMAccessoryCategory raw value for icon mapping

    init(...) { ... }
}
```

### Tasks
- [ ] Define `EventLog` SwiftData model
- [ ] Set up `ModelContainer` in app entry point
- [ ] In `HomeKitManager`, iterate accessories and call `enableNotification(true)` on relevant characteristics
- [ ] Implement `HMAccessoryDelegate` → `accessory(_:service:didUpdateValueFor:)`
- [ ] On each change, create an `EventLog` and insert into context
- [ ] Write `EventStore` fetch descriptors with sort and predicate helpers

### Important
You must call `enableNotification(true, for: characteristic)` on each characteristic you want to observe — HomeKit won't push updates otherwise.

---

## Phase 3 — Timeline UI
**Goal:** A clean, scrollable event feed grouped by day.

### Tasks
- [ ] Build `TimelineView` using `@Query` to fetch events sorted by timestamp desc
- [ ] Group events by calendar day using `Dictionary(grouping:)`
- [ ] Build `EventRowView` showing: SF Symbol icon, accessory name, room, change description, relative time
- [ ] Add pull-to-refresh
- [ ] Add empty state view when no events yet

### Grouping Pattern
```swift
let grouped = Dictionary(grouping: events) { event in
    Calendar.current.startOfDay(for: event.timestamp)
}
```

---

## Phase 4 — Filters & Search
**Goal:** Let the user narrow events by room, category, or date range.

### Tasks
- [ ] Build `FilterView` as a sheet with toggles for rooms and accessory types
- [ ] Pass active filters as `@State` down to `TimelineView`
- [ ] Update `@Query` predicate dynamically based on active filters
- [ ] Add a `searchable()` modifier to filter by accessory name

---

## Phase 5 — Activity Charts
**Goal:** Visualize when your home is most active.

### Tasks
- [ ] Add Swift Charts import (built into iOS 16+)
- [ ] Build a bar chart of events per hour of day
- [ ] Build a 7-day activity trend line
- [ ] Add a "most active device" summary card
- [ ] Optionally: calendar heatmap (custom view or using a Swift package)

---

## Phase 6 — Background Persistence (Advanced)
**Goal:** Keep logging even when app is not in foreground.

### Options (in order of complexity)
1. **Background App Refresh** — simplest, but iOS limits frequency
2. **Companion iPad app** — always-on device runs the listener, phone syncs via iCloud
3. **Local home lab server** — Docker container using `node-homekit-controller`, app pulls from your own REST API (best long-term, plays to your existing setup)

### Tasks (Option 1 first)
- [ ] Enable Background App Refresh capability
- [ ] Register `BGAppRefreshTask` to re-enable characteristic notifications
- [ ] Test background wake intervals

---

## Development Notes

### Free Signing Workaround
Without a paid Apple Developer account, certificates expire every 7 days.
Use **AltStore** or **Sideloadly** to automate re-signing so you're not doing it manually.

### Useful Resources
- [Apple HMHomeKit Docs](https://developer.apple.com/documentation/homekit)
- [SwiftData Docs](https://developer.apple.com/documentation/swiftdata)
- [Swift Charts](https://developer.apple.com/documentation/charts)
- [HM Characteristic Types](https://developer.apple.com/documentation/homekit/hmcharacteristictypecurrentdoorstate)

### SF Symbol Mapping (starter)
| HM Category | SF Symbol |
|---|---|
| Lightbulb | `lightbulb.fill` |
| Door Lock | `lock.fill` |
| Sensor | `sensor.fill` |
| Thermostat | `thermometer` |
| Switch | `switch.2` |
| Security System | `shield.fill` |
| Camera | `camera.fill` |

---

## Immediate First Steps

1. Open Xcode → New Project → iOS App (SwiftUI + SwiftData)
2. Name it `HomeKitLog`
3. Signing & Capabilities → + Capability → HomeKit
4. Info.plist → Add `NSHomeKitUsageDescription` → `"HomeKit Log needs access to monitor your accessories."`
5. Replace `ContentView.swift` with a basic `HMHomeManager` list view
6. Run on your real iPhone (simulator cannot access HomeKit)
7. Tell Claude Code: **"Start with Phase 1 — get HomeKit permission and list my accessories"**

---

## Claude Code Usage Tips
- Work one phase at a time — tell Claude Code which phase you're on
- If something doesn't compile, paste the full error — Swift errors are verbose but precise
- Ask Claude Code to write unit tests for `EventStore` fetch logic
- Use `"explain this HMDelegate callback"` freely — HomeKit docs are dense
