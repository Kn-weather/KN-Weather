# KN Weather Center — Changelog

## 2026-07-14 — Unified Radar: Dropdown Mode + Velocity Fix

### Radar Section Redesign
- **Changed**: Merged the two separate radar sections (RainViewer Reflectivity + IEM NEXRAD Velocity) into a single unified "Radar Overlay" section with a mode dropdown.
- **Added**: Mode dropdown with three options: "— None —", "Reflectivity (RainViewer, animated)", "Velocity (NWS RIDGE, single station)". Only one mode is active at a time, eliminating the confusion of having two independent radar layers.
- **Changed**: Shared opacity slider now applies to whichever mode is active (was previously two separate sliders).
- **Removed**: Color scheme dropdown. RainViewer's free tier only serves one color scheme (Universal Blue, color=2), so the dropdown was non-functional. Hardcoded to color=2.
- **Added**: Animation controls (Play/Pause button + frame scrubber) are now shown only when Reflectivity mode is selected, and hidden otherwise. Cleaner UI — no confusing disabled controls.

### Velocity "Invalid TMS" Fix
- **Fixed**: The IEM NEXRAD velocity tiles were returning "invalid TMS requested" errors and placeholder images. Investigation revealed that IEM's single-station RIDGE TMS service (`ridge::US-XXX-N0V-0`) is broken — it returns the same 20,229-byte placeholder image (a solid black-to-red gradient) for ALL stations and ALL products, regardless of the station ID or zoom level. IEM also has no CONUS velocity mosaic.
- **Changed**: Velocity mode now uses the **NWS RIDGE base velocity GIF** as an `L.imageOverlay` with per-station geographic bounds — the same reliable approach the original radar code used before the RainViewer migration. The GIF auto-animates in the browser (no JS animation needed), and the bounds are cropped ~15% from each edge to match the radar's circular coverage area.
- **Added**: `RADAR_STATION_BOUNDS` for 6 stations (KGRR, KIWX, KDTX, KLOT, KAPX, KILX) with verified lat/lng bounds covering each station's ~230km radar range.
- **Restored**: The velocity station dropdown (KGRR, KIWX, KDTX, KLOT, KAPX, KILX) now controls which NWS RIDGE station's velocity GIF is displayed.

### Code Cleanup
- **Removed**: `renderIEMVelocity()`, `updateVelOpacity()`, `amLayerVel`, `amVelStation`, `amVelOpacity`, `amVelOpacityVal`, `radarVelIEM` layer, `radarLastColor` variable, and the IEM velocity tile URL.
- **Removed**: `renderRainViewerRadar()` — replaced by the unified `renderRadar()` which dispatches to `renderReflectivity()` or `renderVelocityGIF()`.
- **Added**: `renderRadar()` (main dispatcher), `renderReflectivity()` (RainViewer preloaded frames), `renderVelocityGIF()` (NWS RIDGE image overlay), `RADAR_STATION_BOUNDS` (station bounds for velocity GIF).
- **Optimized**: Opacity slider in reflectivity mode now just calls `setOpacity()` on the active frame layer — no rebuild of all 14 frame layers. Instant response.

## 2026-07-14 — Seamless Radar Animation + IEM NEXRAD Velocity

### Radar Animation Flash Fix
- **Fixed**: Radar animation no longer flashes/flickers between frames. Previously, each frame change removed the old tile layer and added a new one, causing a brief gap while the new tiles loaded. Now ALL frame tile layers are created at once and added to the map simultaneously — only the active frame has opacity > 0, all others are at opacity:0. Switching frames just swaps opacity values (instant CSS change, no network fetch, no loading gap).
- **Implementation**: `alertMapLayers.radarMain` (single layer) replaced with `alertMapLayers.radarFrameLayers` (array of ~14 layers, one per frame). `buildAllRadarFrameLayers(color)` creates all layers at once with `opacity:0` and `updateWhenZooming:false`. `showRadarFrame(idx)` sets the active layer to the user's opacity and all others to 0. Animation timer calls `showRadarFrame()` instead of `applyRadarFrame()` — no add/remove, just opacity toggles.
- **Smart rebuild**: The function checks if the frame paths or color scheme actually changed before rebuilding all layers. If only opacity changed or play/pause was toggled, it just updates the active frame's opacity without recreating layers — avoids unnecessary tile re-fetching.
- **Tradeoff**: ~100 tiles loaded up front (14 frames × ~7 tiles each) instead of ~7 per frame change. Browser caches them efficiently, and the seamless animation is worth the one-time load cost.

### IEM NEXRAD Base Velocity
- **Added**: "NEXRAD Velocity (IEM)" section in the Layers panel (orange). Replaces the old NWS RIDGE velocity GIF that was removed with the RainViewer migration.
- **Added**: Toggle checkbox, station dropdown (KGRR, KIWX, KDTX, KLOT, KAPX, KILX), and opacity slider (20-100%, default 50%).
- **Source**: Iowa Environmental Mesonet (IEM) RIDGE tile cache at `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::US-{STATION}-0.5-N0V/{z}/{x}/{y}.png`. CORS-enabled (`Access-Control-Allow-Origin: *`).
- **Product**: N0V = Base Velocity, tilt 1 (0.5° elevation). Green shades = inbound (toward radar), red shades = outbound (away from radar). Useful for spotting rotation (couplets) and wind shear.
- **Zoom**: Same `maxNativeZoom:7` trick as RainViewer — IEM RIDGE tiles only exist up to zoom 7, so Leaflet fetches at zoom 7 and upscales via CSS transform beyond that. Uses 256px tiles (no zoomOffset needed, unlike RainViewer's 512px).
- **Static**: N0V tiles are not animated — they show the latest volume scan from the selected station. Updates every ~5-10 minutes as new scans arrive. The velocity layer can be toggled on alongside the animated RainViewer reflectivity loop for a combined reflectivity + velocity view.
- **Layer storage**: `alertMapLayers.radarVelIEM` (single `L.tileLayer`).

## 2026-07-14 — RainViewer Radar Replaces NWS RIDGE GIF Overlay

### Radar System Overhaul
- **Removed**: Old NWS RIDGE GIF overlay system (Reflectivity + Velocity checkboxes, KGRR/KIWX station dropdown, `RADAR_STATION_BOUNDS`, `toggleRadarOverlay()` function). The GIF approach had limitations: single-station coverage, no zoom flexibility, GIF animation speed couldn't be controlled, and the image bounds had to be manually cropped.
- **Added**: RainViewer radar tile service as the new radar overlay. RainViewer provides global tiled radar data (not a single GIF), so it works at any zoom level and covers the entire US + Europe.
- **Added**: "RainViewer Radar" section in the Layers panel (lime green) with:
  - Toggle checkbox (Show radar reflectivity)
  - Color scheme dropdown (8 options: Black & White, Original, Universal Blue, TITAN, The Weather Channel, Meteored, NEXRAD Level III, RAINBOW @ SELEX-SI). Default: Universal Blue.
  - Opacity slider (20%-100%, default 60%) with live percentage label
  - Play/Pause animation button
  - Frame time display (shows "Latest (HH:MM EDT)" or "Forecast HH:MM EDT" for nowcast frames)
  - Frame scrubber slider (appears when animation data is available — drag to jump to any frame)

### Zoom Level Workaround
- **Fixed**: RainViewer tiles are natively available at zoom 0-7, but the alert map is typically viewed at zoom 8-9. Used Leaflet's `maxNativeZoom: 7` option, which tells Leaflet to fetch tiles at zoom 7 and upscale them via CSS transform when the user zooms in beyond 7. This produces a slightly soft but fully usable radar overlay at any zoom level. Also set `tileSize: 512` with `zoomOffset: -1` for better quality when upscaled.

### Radar Animation
- **Added**: Animated radar loop using past frames + nowcast. RainViewer's API returns ~13 past frames (every 10 min, going back ~2 hours) plus a nowcast frame (30-min forecast). The Play button cycles through all frames at 800ms intervals (~1.25 fps). The scrubber slider lets the user jump to any frame manually. When paused, the radar jumps to the latest past frame for a "current" view.
- **Performance**: Frame data is cached in memory for 5 minutes (`RAINVIEWER_TTL`). RainViewer updates every 10 min, so the 5-min cache means we only hit the API once per 5 min even if the map refreshes every 5 min. Stale cache is served on network failure.

### Technical Details
- **API**: `https://api.rainviewer.com/public/weather-maps.json` returns `{host, radar: {past: [...], nowcast: [...]}}`. Each frame has `{time (unix seconds), path}`. CORS-enabled (`Access-Control-Allow-Origin: *`).
- **Tile URL**: `{host}{path}/512/{z}/{x}/{y}/{color}/2.png` where `color` is 0-7 and `2` = smoothed option.
- **Layer storage**: `alertMapLayers.radarMain` (single `L.tileLayer`) replaces the old `radarRefl` + `radarVel` pair.
- **Animation state**: `radarFrames[]` array, `radarAnimationIndex`, `radarIsPlaying`, `radarAnimationTimer`. Timer is cleared on pause and when the radar is toggled off.
- **Note on velocity**: RainViewer does not provide velocity data. The old NWS RIDGE velocity GIF has been removed. Velocity will be re-added in a future update using a different source (possibly Iowa Environmental Mesonet NEXRAD velocity tiles, which are CORS-friendly).

## 2026-07-12 — Additional MDOT Road Cameras in Kalamazoo County

### New Cameras Added
- **Added**: 4 new MDOT road cameras along I-94 in Kalamazoo County, identified via vision analysis of MDOT camera images (highway signs read directly from the camera feeds):
  - `internet_cam_013` — I-94 @ Airport (Exit 80), Kalamazoo/Battle Creek Intl Airport, eastbound
  - `internet_cam_036` — I-94 @ Sprinkle Rd (Exit 81), Kalamazoo Township, roundabout interchange
  - `internet_cam_014` — I-94 @ Boardman Rd (Exit 85), Comstock Township, eastbound
  - `internet_cam_038` — I-94 @ Galesburg Rest Area (mile 88), Galesburg, eastbound rest area
- These fill the gap between Paw Paw (M-40) and Portage (US-131) along I-94, extending coverage east through Kalamazoo County to Galesburg.
- **Total Tri-County cameras**: 12 (was 8). Coverage now spans I-196 from Laketown to Coloma, I-94 from Watervliet to Galesburg, and US-131 at Plainwell.
- **Method**: Probed MDOT's image server (`micamerasimages.net`) for camera IDs 001-300, downloaded all 175 unique images, then used the vision API to read highway shield signs visible in each image. Filtered for cameras showing I-94, I-196, US-131, M-40, M-89, M-140, or M-43 (Tri-County highways). Cross-referenced exit signs and landmarks (Airport, Sprinkle Rd, Boardman Rd, Galesburg Rest Area) against known interchange locations.
- **Limitation**: MDOT's public API (`mdotjboss.state.mi.us/MiDrive/camera/cameracache`) is fully Cloudflare-blocked (HTTP 403 even via CORS proxy), so the camera list cannot be fetched live. To add more cameras, the user can open the Mi Drive map, click cameras in the Tri-County area, and provide the camera ID (visible in the image URL) plus the location label.

## 2026-07-12 — MDOT Road Cameras on Alert Polygon Map

### Road Camera Markers
- **Added**: "MDOT Road Cameras" toggle in the Alert Polygon Map Layers panel (cyan section). Toggle on to place a camera marker at each of the 8 verified MDOT camera locations in the Tri-County area (I-196, I-94, US-131 interchanges).
- **Added**: Each marker is a cyan circle with a video-camera glyph (`L.divIcon`) and a glow effect for visibility against the dark map background.
- **Added**: Click any marker to open a popup with the live camera image (cache-busted on every open), location label, subtitle, "Updated HH:MM EDT" timestamp, manual Refresh button, and an "Open in MiDrive →" link that opens MDOT's full map at that camera's coordinates.
- **Added**: Auto-refresh — the popup image refreshes itself every 60 seconds while the popup is open. Timer is cleared on popup close to avoid background polling.
- **Added**: `lat` and `lon` fields added to every entry in the `ROAD_CAMS` array (used by both the Road Weather Cameras grid panel and the new Alert Polygon Map markers). Coordinates are the actual interchange/bridge locations verified against MDOT's Mi Drive map.
- **Implementation**: Camera markers stored in `alertMapLayers.roadCams` array. `renderRoadCams()` clears and re-adds them on each call (called by the checkbox onchange for instant toggle, and by `fAlertMap()` after each refresh). Image URLs use `micamerasimages.net/thumbs/{id}.flv.jpg?t={timestamp}` — same host as the Road Weather Cameras panel, so no new external dependency.
- **Resilience**: Camera images from `micamerasimages.net` don't send CORS headers, but `<img>` tags in popups work fine cross-origin. Screenshot capture path (the existing `convertImageToDataUrl()` proxy fallback) handles these for export. Image onerror handler displays a "Camera unavailable" message instead of a broken image icon.
- **Note**: MDOT's public API (`mdotjboss.state.mi.us/MiDrive/camera/cameracache`) is fully Cloudflare-blocked (HTTP 403 even via CORS proxy), so we use the hardcoded `ROAD_CAMS` array rather than fetching a live camera list. Adding more cameras is just one line per entry in `ROAD_CAMS`.

## 2026-07-12 — SPC Outlook UI Redesign + Risk-Level Filtering

### SPC Outlook Controls Redesign
- **Changed**: Replaced the three Day checkboxes (Day 1/2/3) with a single dropdown selector. Options: "— None —", "Day 1 (Today)", "Day 2 (Tomorrow)", "Day 3 (Day After)". Only one day renders at a time, simplifying the view and reducing visual clutter.
- **Added**: Six risk-level checkboxes below the day dropdown: TSTM, MRGL, SLGT, ENH, MDT, HIGH. All on by default. Uncheck any risk level to hide that category's polygons from the map. Each checkbox has an inline color swatch (using SPC's official stroke/fill colors) that doubles as the color key — no separate static legend needed.
- **Changed**: Polygon styling no longer uses dashed outlines for Day 2/3 (the dropdown makes day distinction obvious). Fill opacity slightly higher across all days (0.38/0.32/0.28 for Day 1/2/3) since only one day shows at a time.
- **Changed**: SPC legend section in the Alert Colors legend now shows risk levels for the selected day only (no more day grouping). Header reads "SPC Convective Outlook · Day N (Today/Tomorrow/Day After)" so it's clear which day the legend reflects.
- **Performance**: Toggling a risk-level checkbox or switching days calls `renderSpcOutlooks()` directly (not `fAlertMap()`), so the change is instant — no NWS alert re-fetch. The 15-min SPC KML cache means day switches usually render in <100ms after the first load.
- **Accessibility**: Checkboxes use `accent-color` matching each risk level's stroke color, so the checkbox itself is color-coded (e.g. SLGT checkbox is yellow, MDT is red). Color swatches next to each label reinforce the color mapping for users who can't perceive the accent color.

## 2026-07-12 — SPC Convective Outlooks on Alert Polygon Map

### SPC Outlook Layers
- **Added**: Day 1, Day 2, and Day 3 Convective Outlook layers on the Alert Polygon Map, sourced from the SPC categorical outlook KML (`https://www.spc.noaa.gov/products/outlook/day{N}otlk_cat.kml`).
- **Added**: Three new checkboxes in the Alert Polygon Map Layers panel: "Day 1 (Today)", "Day 2 (Tomorrow)", "Day 3 (Day After)". All off by default — toggle on to fetch and render.
- **Added**: Inline 6-color risk-level key in the Layers panel (TSTM/MRGL/SLGT/ENH/MDT/HIGH) using SPC's official stroke/fill colors.
- **Added**: Risk-level polygons drawn with SPC's official colors parsed directly from the KML (each `<Placemark>`'s `<Data name="stroke">` and `<Data name="fill">`). Day 1 polygons are solid outlines with 35% fill opacity; Day 2/3 use dashed outlines with reduced opacity (28%/22%) so they're visually distinguishable when stacked.
- **Added**: Click any SPC polygon to see a popup with: risk level (e.g. "SLGT - Slight Risk"), Day number, valid time, expiration time, forecaster name, plain-English risk description, and a link to the full SPC outlook page.
- **Added**: Dynamic SPC legend section appended to the Alert Colors legend whenever SPC layers are on. Shows each risk level currently on the map, grouped by Day, with color swatches matching the polygons.
- **Performance**: SPC outlook data is cached in memory for 15 minutes (`SPC_OUTLOOK_TTL`). Auto-refreshes of the alert map every 5 min will use cached SPC data; only one fetch per 15 min actually hits spc.noaa.gov. Stale cache is served on network failure.
- **Implementation**: KML parsed client-side with `DOMParser`. Each `<Placemark>` is converted to a GeoJSON Polygon or MultiPolygon and rendered with `L.geoJSON()`. Because the alert map already uses `preferCanvas:true`, SPC polygons render on the same Canvas overlay pane as NWS alerts — no additional renderer overhead.
- **Resilience**: If a Day has no active outlook (SPC doesn't issue Day 3 in certain windows), the fetch returns an empty KML and the layer is silently skipped. If spc.noaa.gov is unreachable, the previously-cached outlook (if any) is rendered with a console warning.

## 2026-07-03 — Sun Clock Chart, Temperature Ribbon, Daylight Ribbon

### Sunrise & Sunset Panel Overhaul
- **Added**: Interactive sun clock chart with multiple concentric rings:
  - **Temperature ribbon** (outer ring): 24-hour temperature gradient using the 15-color NOAA JPSS Fahrenheit color scale (black ≤13°F through pale yellow 105°F+). Temperature data pulled from the hourly forecast for the selected county. Solar noon locked at 12 o'clock position. Linear 24-hour mapping (each hour = 15°). Clickable/tappable sections show temperature and time popup (works on Android Chrome touch devices).
  - **Daylight ribbon** (inner ring): Black-to-yellow gradient showing visible daylight from dawn to dusk. Peak yellow at solar noon (12 o'clock), dark yellow at dawn/dusk (15% brightness), pure black at night. DAWN and DUSK markers locked to the ribbon with inward-facing labels and times.
  - **Analog sundial clock** (center): Roman numerals (I-XII), purple/orange color scheme matching page theme. Gnomon-style hour hand (orange-to-purple gradient triangle), orange minute hand, purple center boss. Shows current EDT time, updates every 60 seconds.
  - **Sun dot**: Travels on the outer ring based on phase-based sun cycle (sunrise=9 o'clock, solar noon=12 o'clock, sunset=3 o'clock, solar midnight=6 o'clock). Glowing yellow with orange border.
  - **Moon dot**: Travels on inner ring based on moon's own cycle (moonrise→lunar noon→moonset→lunar midnight). Renders actual moon phase icon (crescent, gibbous, quarter, full, new).
  - **Moonrise/moonset markers**: On the analog clock face at their 12-hour positions with RISE/SET labels and times.
  - **Hot/cold temperature markers**: Red dot (hottest hour) and blue dot (coldest hour) with temperature and time labels, rendered on top of all other elements.
  - **DAWN/DUSK labels**: Positioned on the daylight ribbon with dot markers, connector lines, and time labels.
  - **SOLAR NOON/SUNSET/SOLAR MIDNIGHT/SUNRISE labels**: Fixed at 12/3/6/9 o'clock positions with times.
  - **HORIZON line**: Dashed horizontal diameter.
  - **Collapsible temperature color legend**: 15-band color scale at the bottom, collapsible.
  - **Main legend**: Sun, Moon, Clock, Daylight, Heat, Hot/Cold with times, sunrise→noon→sunset timeline.

### Panel Layout Changes
- **Changed**: Sun clock chart moved to TOP of the Sunrise & Sunset panel (above the data cards).
- **Added**: Collapsible "Sun & Moon Data" subpanel below the chart containing all 10 data cards (Sunrise, Sunset, Solar Noon, Civil Dawn, Civil Dusk, Sun Elevation, Moon Phase, Moon Elevation, Moonrise, Moonset). Starts collapsed, click to expand.
- **Added**: Countdown timers on all sun/moon event cards showing time until/ago (e.g., "in 2h 15m", "3h ago"). 5-minute rounding under 1 hour. 12-hour EDT format with AM/PM.
- **Added**: Moonrise and Moonset data cards with countdown timers.
- **Added**: Moon phase icon (dynamic SVG) in the Moon Phase card.
- **Added**: NWS source line showing station ID, condition, and observation time when NWS station data overrides Open-Meteo.

### NWS Primary Weather Source
- **Changed**: NWS/NOAA API is now the PRIMARY source for current conditions, hourly forecast, and 7-day forecast. Open-Meteo is only used as a fallback if NWS fails, and for the threats panel (CAPE/Lifted Index).
- **Added**: `fWxNws()` fetches from NWS gridpoint + forecast APIs, converts all data to Open-Meteo format for existing render functions.
- **Added**: NWS grid info cache (30 min) to reduce API calls.
- **Added**: `nwsShortForecastToWmo()` maps NWS text forecasts to WMO weather codes for icons.
- **Fixed**: Current conditions now correctly show NWS station observations (e.g., "Fair" from KLWA) instead of Open-Meteo model data. NWS `textDescription` overrides Open-Meteo weather codes. Icon also updates to match NWS description.
- **Fixed**: NWS observation age limit increased from 1 hour to 2 hours for stations that report less frequently.

### IEM Sounding Fallback
- **Added**: Iowa Environmental Mesonet (IEM) as fallback sounding source when University of Wyoming is unreachable. IEM provides JSON with raw profile data; CAPE/CIN/LI/PWAT calculated in-browser using Bolton's method.
- **Added**: ICAO codes added to all sounding station definitions for IEM API compatibility.
- **Added**: `[IEM]` badge in Storm Environment panel when using IEM fallback data.

### Alert Polygon Map
- **Added**: Per-alert-type checkboxes in the legend. Unchecking hides all polygons of that type. Hidden types persisted in localStorage. "Show All Alerts" reset button.
- **Added**: Dynamic legend — only shows alert types currently present on the map, with counts.
- **Added**: Multi-alert popup cycling — tapping a polygon shows all overlapping alerts with prev/next arrows and "1 of N alerts" indicator. Ray-casting point-in-polygon test.
- **Changed**: Switched from OpenStreetMap tiles to CARTO dark tiles (CORS-enabled) for reliable screenshot capture.
- **Fixed**: Screenshot capture now works without tainted canvas errors. Direct html2canvas with useCORS:true.
- **Fixed**: Map tiles and polygons render correctly in screenshots.

### WWA Summary
- **Changed**: Alerts sorted by issue date (newest first).
- **Added**: Tri-County filter chip — when ON, only shows alerts mentioning Allegan, Kalamazoo, Van Buren, South Haven, Holland, or I-94.

### Per-Panel Refresh
- **Added**: Refresh button on each panel header (spin icon). Clicking reloads ONLY that panel without a full refreshAll().
- **Fixed**: Tab alert dots only show on Current Conditions tab (not all tabs). Alert banner still shows on all tabs.
- **Added**: Auto-refresh on tab switch — panels on the newly-switched-to tab auto-refresh if data is stale (>10 min).

### PWA & Install
- **Added**: Install App button in header (green, pulses when install prompt available). Uses beforeinstallprompt event. Shows platform-specific instructions on iOS.
- **Changed**: Favicon set to profile_picture.png (16px, 32px, 192px). Apple-touch-icon already pointed to it.

### Power Outage Map (removed)
- **Removed**: Consumers Energy outage map iframe (site blocks iframe embedding with X-Frame-Options: SAMEORIGIN).

### Backup Files
- **Added**: Standalone `sunclock.html` as a backup/restore reference for the sun chart design. Self-contained with mock data for testing.
- **Added**: `sunclock.html.bak` and `index.html.bak` snapshots alongside the live files. Mirrored copies of the current `sunclock.html` and `index.html` for quick restore if a future edit breaks the live page.

### Bug Fixes
- **Fixed**: Sun time calculations now use local midnight (CONFIG.tz) instead of UTC midnight, fixing incorrect times in the evening.
- **Fixed**: Solar midnight calculated relative to current time (before noon = last night, after noon = tonight).
- **Fixed**: Night cycle positioning — sun dot correctly near 6 o'clock at 1:30 AM instead of at solar noon.
- **Fixed**: Screenshot logo — uses LOGO_DATA_URL cache + .shot-brand-logo CSS class for reliable rendering.
- **Fixed**: Sounding data fallback through 4 candidate times when Wyoming server is slow.
- **Fixed**: METAR visibility P-prefix parsing and TAF CORS proxy fallback.
- **Fixed**: Rain Tracker detection points moved to county edges (South Haven, Holland, Gobles).
- **Fixed**: Lake breeze detection requires temp gradient + onshore wind.

## 2026-06-22 — Top-level tab navigation + alert notifications

- **Added**: 4 top-level category tabs at the top of the page:
  - **Current Conditions** (8 panels) — Current, Hourly Forecast, 7-Day, Threats, WWA Map, Alert Polygon Map, WWA Summary, WWA Map Color Code
  - **NWS** (10 panels) — KGRR Radar & Loops, Hourly Forecast Graph, Forecast Discussion, NWS GRR Feed, NWS National Feed, NWS Gridpoint Forecast, GRR Office Headlines, Observations & Forecast Text, Tri-County Surface Obs Network, Precipitation & Temperature Outlook
  - **SPC** (3 panels) — SPC Severe Weather Outlooks, Observations Map, SPC Feed
  - **Storm Spotting** (7 panels) — Aviation, Surface Front Analysis, Forecasted SkewT Model Soundings, Storm Environment, Lightning Tracker, Local Storm Reports, Road Weather Cameras
- **Performance**: Only the active tab's panels are refreshed on each cycle. Tab 1 (Current Conditions) panels ALWAYS refresh regardless of which tab is active, so alerts and WWA info stay live in the background. This cuts the number of API calls per refresh cycle roughly in half when viewing non-Current tabs.
- **Added**: Floating alert notification banner. When a new NWS alert arrives while the user is on a non-Current-Conditions tab, a banner appears at the top of the viewport showing the alert event type and affected areas. Stacks up to 3 visible at once; auto-dismisses after 30 seconds. Tapping the banner switches to Current Conditions and dismisses all notifications. The EAS alert sound still plays (existing behavior).
- **Added**: Pulsing red alert dot on tab buttons. Visible on all tabs whenever there are active NWS alerts, so the user always knows to check Current Conditions. Clears automatically when alerts expire.
- **Added**: Active tab is saved to localStorage and restored on page refresh.
- **Changed**: Facebook panel is now a persistent footer visible on ALL tabs (not part of any tab's panel count). It lives in its own always-active tab pane at the bottom of the page.
- **Changed**: When switching to the Current Conditions tab, Leaflet's `alertMapInstance.invalidateSize()` is called to recompute the map layout after being hidden (Leaflet gets confused by `display:none` containers).
- **Changed**: `refreshAll()` rewritten to be tab-aware. Always refreshes Tab 1 panels (fWx, fAl, fAlertMap, fWWASummary, rWWA) plus only the active tab's other panels.

## 2026-06-22 — Panel layout & collapse-state persistence

- **Changed**: Moved Threats panel to slot 4 (immediately after 7-Day, before WWA Map). It now sits with the top at-a-glance panels instead of being buried at slot 7.
- **Added**: Panel collapse/expand state is now persisted to `localStorage` under `kn_weather_panel_state`. When a user collapses or expands any panel, the choice survives page refresh and return visits.
- **Added**: New `defaultCollapsed` flag on panel definitions. Panels with `defaultCollapsed: true` start collapsed on first visit (or any time the user has never toggled them). Once the user toggles a panel, their explicit choice takes precedence over the default.
- **Changed**: WWA Map Color Code panel now starts collapsed by default. The full color grid is large and was eating screen real estate; users who want it visible can expand it once and the choice will be remembered.
- **Fixed**: `resetPanelOrder()` no longer wipes the user's collapse preferences — it only resets the panel *order* (a separate concern). Collapse state is re-applied after the rebuild.

## 2026-06-22 — PWA assets and logo fix

- **Added**: `profile_picture.png` (1024x1024) — bundled in the repo as the canonical logo/icon asset. Used for site header logo, iOS home screen icon (`apple-touch-icon`), and PWA manifest icons (192/512/1024 sizes).
- **Added**: `sw.js` service worker for offline caching of the app shell and PWA installability (Chrome "Install" prompt).
- **Fixed**: `logoUrl` previously pointed to an expiring CDN URL (`z-cdn-media.chatglm.cn`) — now uses the locally-bundled `./profile_picture.png` so the logo always loads.
- **Fixed**: `sw.js` precache list referenced the old filename `kn_weather_center.html` — updated to `index.html`. Cache version bumped `v1` → `v2` so existing users get a fresh cache on next load.
- **Improved**: PWA manifest icons switched from inline SVG data URI to the PNG — renders crisper on Android, Chrome OS, and iOS home screens.

## 2026-06-22 — Alert Polygon Map fix

- **Fixed**: Beach Hazards Statement (and other zone-based alerts) now render on the Alert Polygon Map. Previously, alerts with `geometry: null` were silently skipped. Now resolves UGC zone codes (MIZ###, MIC###, LMZ###, etc.) via the NWS zones API and draws all referenced polygons.
- **Added**: Tri-County Focus toggle to filter the map to alerts affecting Van Buren, Allegan, or Kalamazoo counties only.
- **Added**: Permanent purple dashed borders around the three monitored counties — always visible on top of any alert shading.
- **Added**: Purple pill-shaped labels ("Van Buren", "Allegan", "Kalamazoo") at each county centroid, toggleable via the "County Labels" checkbox.
- **Performance**: Zone geometries are cached in memory after first fetch — subsequent refreshes are instant.

## Source

Built and maintained from the KN Weather Center project.
Alert colors match the official NWS Hazards Map color codes (https://www.weather.gov/help-map).
