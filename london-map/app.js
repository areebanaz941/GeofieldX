/* global mapboxgl, MAPBOX_TOKEN */

const DATA_URL = './data/postcodes.geojson';
const CONFIG_URL = './config/postcodes.json';

const groupColors = {
  SW: '#e74c3c', // red
  SE: '#27ae60', // green
  W:  '#f39c12', // orange
  E:  '#3498db', // blue
  N:  '#9b59b6', // purple
  NW: '#1abc9c', // teal
  EC: '#34495e', // slate
  WC: '#e67e22'  // carrot
};

let map;
let postcodeGeojson;
let postcodeConfig = {};
let isEditMode = false;
let hoveredFeatureId = null;

init();

async function init() {
  try {
    [postcodeGeojson, postcodeConfig] = await Promise.all([
      fetch(DATA_URL).then(r => r.json()),
      fetch(CONFIG_URL).then(r => r.json()).catch(() => ({}))
    ]);
  } catch (err) {
    console.error('Failed to load data/config', err);
    alert('Failed to load data or config');
    return;
  }

  // Merge config into features and compute colors
  postcodeGeojson.features = postcodeGeojson.features.map((feature, index) => {
    const code = feature.properties.code;
    const group = feature.properties.group;
    const conf = postcodeConfig[code] || {};
    const hasInfo = Boolean(conf.hasInfo);
    const baseColor = groupColors[group] || '#95a5a6';
    const fillColor = hasInfo ? baseColor : lightenHex(baseColor, 0.55);
    const strokeColor = hasInfo ? darkenHex(baseColor, 0.15) : '#999999';

    return {
      ...feature,
      id: index + 1,
      properties: {
        ...feature.properties,
        hasInfo,
        title: conf.title || code,
        url: conf.url || `./pages/${code}.html`,
        notes: conf.notes || '',
        fill: fillColor,
        stroke: strokeColor
      }
    };
  });

  mapboxgl.accessToken = MAPBOX_TOKEN;
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [-0.1, 51.505],
    zoom: 10.2,
    attributionControl: true
  });

  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }));
  map.dragRotate.disable();
  map.touchZoomRotate.disableRotation();

  map.on('load', () => {
    map.addSource('postcodes', {
      type: 'geojson',
      data: postcodeGeojson,
      promoteId: 'id'
    });

    map.addLayer({
      id: 'postcode-fills',
      type: 'fill',
      source: 'postcodes',
      paint: {
        'fill-color': ['get', 'fill'],
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false], 0.9,
          0.7
        ]
      }
    });

    map.addLayer({
      id: 'postcode-borders',
      type: 'line',
      source: 'postcodes',
      paint: {
        'line-color': ['get', 'stroke'],
        'line-width': 1.5,
        'line-opacity': 1
      }
    });

    setupInteractions();
    renderLegend();
    bindUi();
  });
}

function setupInteractions() {
  const tooltip = document.getElementById('tooltip');

  map.on('mousemove', 'postcode-fills', (e) => {
    map.getCanvas().style.cursor = 'pointer';
    const f = e.features && e.features[0];
    if (!f) return;
    if (hoveredFeatureId && hoveredFeatureId !== f.id) {
      map.setFeatureState({ source: 'postcodes', id: hoveredFeatureId }, { hover: false });
    }
    hoveredFeatureId = f.id;
    map.setFeatureState({ source: 'postcodes', id: hoveredFeatureId }, { hover: true });

    const { code, title, group, hasInfo } = f.properties;
    tooltip.innerHTML = `
      <div><strong>${title}</strong></div>
      <div>${code} (${group}) ${hasInfo ? '' : '— coming soon'}</div>
    `;
    const pt = e.point;
    tooltip.style.left = pt.x + 'px';
    tooltip.style.top = pt.y + 'px';
    tooltip.hidden = false;
  });

  map.on('mouseleave', 'postcode-fills', () => {
    map.getCanvas().style.cursor = '';
    if (hoveredFeatureId) {
      map.setFeatureState({ source: 'postcodes', id: hoveredFeatureId }, { hover: false });
      hoveredFeatureId = null;
    }
    document.getElementById('tooltip').hidden = true;
  });

  map.on('click', 'postcode-fills', (e) => {
    const f = e.features && e.features[0];
    if (!f) return;
    if (isEditMode) {
      loadEditorFromFeature(f.properties);
      return;
    }
    const url = f.properties.url;
    if (url) {
      window.location.href = url;
    }
  });
}

function renderLegend() {
  const legend = document.getElementById('legendItems');
  legend.innerHTML = '';
  Object.entries(groupColors).forEach(([group, color]) => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    swatch.style.background = color;
    const label = document.createElement('span');
    label.textContent = group;
    item.appendChild(swatch);
    item.appendChild(label);
    legend.appendChild(item);
  });
}

function bindUi() {
  const toggleBtn = document.getElementById('toggleEditBtn');
  const editor = document.getElementById('editor');
  const resetBtn = document.getElementById('resetBtn');
  const exportBtn = document.getElementById('exportConfigBtn');

  toggleBtn.addEventListener('click', () => {
    isEditMode = !isEditMode;
    toggleBtn.textContent = isEditMode ? 'Exit edit' : 'Edit mode';
    editor.hidden = !isEditMode;
    document.getElementById('sidebar').scrollTop = 0;
  });

  document.getElementById('editForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = document.getElementById('fieldCode').value;
    const title = document.getElementById('fieldTitle').value.trim() || code;
    const url = document.getElementById('fieldUrl').value.trim() || `./pages/${code}.html`;
    const hasInfo = document.getElementById('fieldHasInfo').checked;
    const notes = document.getElementById('fieldNotes').value.trim();

    postcodeConfig[code] = { title, url, hasInfo, notes };

    // Update feature properties and map paint
    const f = postcodeGeojson.features.find(ft => ft.properties.code === code);
    if (f) {
      f.properties.title = title;
      f.properties.url = url;
      f.properties.hasInfo = hasInfo;
      f.properties.notes = notes;
      const baseColor = groupColors[f.properties.group] || '#95a5a6';
      f.properties.fill = hasInfo ? baseColor : lightenHex(baseColor, 0.55);
      f.properties.stroke = hasInfo ? darkenHex(baseColor, 0.15) : '#999999';
      map.getSource('postcodes').setData(postcodeGeojson);
    }
  });

  resetBtn.addEventListener('click', () => {
    document.getElementById('editForm').reset();
  });

  exportBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(postcodeConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'postcodes.config.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  });
}

function loadEditorFromFeature(props) {
  document.getElementById('fieldCode').value = props.code || '';
  document.getElementById('fieldTitle').value = props.title || '';
  document.getElementById('fieldUrl').value = props.url || '';
  document.getElementById('fieldHasInfo').checked = Boolean(props.hasInfo);
  document.getElementById('fieldNotes').value = props.notes || '';
}

// Color helpers
function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 0, g: 0, b: 0 };
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => {
    const s = Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    return s;
  }).join('');
}
function lightenHex(hex, amount = 0.3) {
  const { r, g, b } = hexToRgb(hex);
  const newR = r + (255 - r) * amount;
  const newG = g + (255 - g) * amount;
  const newB = b + (255 - b) * amount;
  return rgbToHex(newR, newG, newB);
}
function darkenHex(hex, amount = 0.15) {
  const { r, g, b } = hexToRgb(hex);
  const newR = r * (1 - amount);
  const newG = g * (1 - amount);
  const newB = b * (1 - amount);
  return rgbToHex(newR, newG, newB);
}