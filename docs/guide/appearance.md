# Appearance

homechronicle supports dark mode and accent color themes. All preferences are stored in your browser and apply immediately.

## Theme Mode

Click the theme button (sun/moon icon) in the bottom-right corner of the dashboard to cycle through modes:

| Mode | Behavior |
|------|----------|
| **System** | Follows your OS light/dark preference |
| **Light** | Always light |
| **Dark** | Always dark |

The active mode is shown as the button icon: monitor (system), sun (light), or moon (dark).

## Accent Colors

Click the paintbrush button (below the theme button) to open the color picker. Six accent themes are available:

| Theme | Color |
|-------|-------|
| **Ocean** | Blue (default) |
| **Graphite** | Teal |
| **Sunrise** | Orange |
| **Red** | Red |
| **Yellow** | Amber |
| **Purple** | Purple |

The accent color tints charts, active tabs, checkboxes, badges, and the background gradient.

## Persistence

Both settings are stored in browser `localStorage`:

| Key | Values |
|-----|--------|
| `hc_theme_preference` | `system`, `light`, `dark` |
| `hc_ui_skin` | `ocean`, `graphite`, `sunrise`, `red`, `yellow`, `purple` |

Each browser/device keeps its own preference. Clearing site data resets to defaults (system theme, ocean accent).
