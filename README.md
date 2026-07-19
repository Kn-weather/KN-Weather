# KN Weather Center

Storm Operations dashboard for Allegan, Kalamazoo, and Van Buren Counties in SW Michigan.

**Live site**: https://lykujenkins.github.io/KN-WEATHER/

## Features

### Current Conditions Tab
- **Current Conditions** — NWS station observations (temperature, dewpoint, humidity, wind, pressure) with condition text and icon from NWS textDescription
- **Rain Tracker** — 3-county rain proximity detection with edge-of-county monitoring (South Haven, Holland, Gobles). 2-hour timeline, intensity scale, distance in miles
- **KN Nowcast** — User-friendly nowcast summary with CAPE/CIN from live surface obs + sounding data
- **Hourly Forecast** — 24-hour temperature and precipitation probability chart (NWS data)
- **7-Day Forecast** — Daily high/low temps with weather icons and precipitation probability
- **Threats Assessment** — CAPE, Lifted Index, and convective threat analysis
- **WWA Map** — Static WWA alert map
- **Alert Polygon Map** — Interactive Leaflet map with:
  - CARTO dark tiles (CORS-enabled for screenshots)
  - Alert polygon overlays color-coded by NWS severity
  - Per-alert-type legend checkboxes (hide/show individual alert types)
  - Multi-alert popup cycling (tap polygon to cycle through overlapping alerts)
  - Tri-County Focus mode (filter to Allegan/Kalamazoo/Van Buren only)
  - Radar overlay (KGRR/KIWX reflectivity & velocity)
  - Purple dashed county borders always visible
- **WWA Summary** — Text-based active alerts sorted newest-first with Tri-County filter
- **Sunrise & Sunset** — Interactive sun clock chart with:
  - Temperature ribbon (15-color NOAA JPSS scale, 24-hour forecast)
  - Daylight ribbon (black-to-yellow from dawn to dusk)
  - Analog sundial clock with Roman numerals
  - Sun/moon position dots with phase-based cycle
  - Moonrise/moonset markers
  - Clickable temperature tooltips (touch-friendly)
  - Collapsible Sun & Moon data subpanel
- **Road Weather Cameras** — MDOT MiDrive cameras + interactive camera map

### NWS Tab
- KGRR Radar & Loops, Hourly Forecast Graph, Area Forecast Discussion, NWS feeds, Gridpoint Forecast, Headlines, Observations, Precipitation Outlook

### SPC Tab
- SPC Severe Weather Outlooks, Observations Map, SPC Feed

### Storm Spotting Tab
- Aviation (METAR/TAF), Nowcast Engine (CAPE/CIN calculation), Surface Front Analysis, SkewT Soundings, Storm Environment (Wyoming/IEM sounding data), Lightning Tracker, Local Storm Reports

### Additional Features
- **PWA**: Installable as an app (Install button in header)
- **Notifications**: Native OS notifications for new NWS alerts
- **Per-panel refresh**: Individual refresh buttons on each panel
- **Auto-refresh on tab switch**: Panels auto-load when switching tabs
- **Storm Spotter Mode**: Toggle to show/hide SPC and Storm Spotting tabs
- **Mom Mode**: Rufus the Weather Dog replaces detailed metrics
- **Move Panels/Counties**: Reorder panels and county tabs
- **Persistent state**: Panel order, collapse state, active tab, county selection all saved

## Data Sources
- **NWS API** (api.weather.gov) — Primary source for current conditions, hourly/7-day forecast, alerts, observations
- **Open-Meteo** — Backup weather data + CAPE/Lifted Index for threats
- **University of Wyoming** — Sounding data (primary)
- **Iowa Environmental Mesonet** — Sounding data (fallback with in-browser CAPE calculation)
- **NOAA RUC** — Sounding text (backup)
- **MDOT MiDrive** — Road camera feeds
- **Blitzortung** — Lightning detection
- **NWS GRR** — Local storm reports, area forecast discussion

## Technology
- Single-file HTML app with vanilla JavaScript (no framework)
- Leaflet with Canvas renderer for the Alert Polygon Map
- Chart.js for forecast graphs
- html2canvas for panel screenshot exports
- SVG for the sun clock chart
- PWA (service worker, manifest, installable)
- GitHub Pages hosting

## Files
- `index.html` — Main application (~10,000 lines)
- `sunclock.html` — Standalone backup/reference for the sun clock chart
- `sw.js` — Service worker
- `profile_picture.png` — Site logo/favicon (1024x1024)
- `rufus/` — Rufus the Weather Dog images for Mom Mode
- `CHANGELOG.md` — Detailed change history
