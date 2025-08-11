## London Postcode Map (Mapbox GL JS)

Static demo implementing an interactive postcode map for London with color-coded groups, lighter shade for missing info, clickable areas to pages, and a simple edit/export workflow.

### Local run
- Serve the folder with any static server, e.g.:
  - Python: `python3 -m http.server 8080` from the `london-map` directory
  - Then open `http://localhost:8080/`

### Files
- `index.html` – main map page
- `styles.css` – layout and UI
- `app.js` – Mapbox logic, editing, export
- `data/postcodes.geojson` – simplified demo polygons
- `config/postcodes.json` – metadata for each postcode
- `pages/*.html` – placeholder pages for postcode codes

### Map behavior
- Color by group: SW, SE, W, E, N, NW, EC, WC
- Lighter shade when `hasInfo: false`
- Hover tooltip shows code and status
- Click navigates to the `url` for the area
- Edit mode: click a polygon to edit fields; Export JSON downloads the updated config

### Squarespace integration
1. Upload assets to Squarespace (Settings → Files) or host on a CDN. Upload:
   - `styles.css`, `app.js`, `data/postcodes.geojson`, `config/postcodes.json`
2. Create a page and add a Code Block. Paste the contents of `index.html` body only, and update asset URLs to the Squarespace-hosted URLs.
3. Replace the `<script>window.MAPBOX_TOKEN=...</script>` with your Mapbox token if different.
4. Update `config/postcodes.json` URLs to point to your Squarespace pages for each postcode, or keep the local `pages/*.html` for testing.

### Replacing dummy polygons
To use real London postcode boundaries, replace `data/postcodes.geojson` with an authoritative dataset (postcode areas/districts). Ensure each feature has properties: `code` (e.g. `SE1`) and `group` (e.g. `SE`). The color/shading logic will apply automatically.