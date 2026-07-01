import { items, colors } from './state.js';
import { isLinked, getCentroid, fmtNum } from './utils.js';
import { passesFilter, getColor } from './filters.js';

// ===== MAP INIT =====
export const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([-12, -50], 4);
L.control.zoom({ position: 'bottomright' }).addTo(map);

// ===== TILE LAYERS =====
const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap', maxZoom: 19
});

const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: '© Esri', maxZoom: 19
}).addTo(map);

document.querySelector('.map-wrap').classList.add('satellite-mode');

const terrainLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenTopoMap', maxZoom: 17, opacity: 0.7
});

const vegetationLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenTopoMap', maxZoom: 17, opacity: 0.55
});

const layerMap = {
  layerStreets:    streetLayer,
  layerSatellite:  satelliteLayer,
  layerTerrain:    terrainLayer,
  layerVegetation: vegetationLayer
};

// ===== LAYER GROUPS =====
export const ZOOM_THRESHOLD = 12;
export const layerGroup    = L.layerGroup().addTo(map);
export const overviewGroup = L.layerGroup().addTo(map);

// ===== LAYER TOGGLE LOGIC =====
function handleLayerToggle(id) {
  const cb    = document.getElementById(id);
  const layer = layerMap[id];
  if (cb.checked) {
    if (id === 'layerStreets') {
      document.getElementById('layerSatellite').checked = false;
      map.removeLayer(satelliteLayer);
    } else if (id === 'layerSatellite') {
      document.getElementById('layerStreets').checked = false;
      map.removeLayer(streetLayer);
    }
    map.addLayer(layer);
    if (id === 'layerStreets' || id === 'layerSatellite') layer.bringToBack();
  } else {
    map.removeLayer(layer);
    if (id === 'layerStreets' && !document.getElementById('layerSatellite').checked) {
      cb.checked = true;
      return;
    }
    if (id === 'layerSatellite' && !document.getElementById('layerStreets').checked) {
      document.getElementById('layerStreets').checked = true;
      map.addLayer(streetLayer);
      streetLayer.bringToBack();
    }
  }
  const satelliteActive = document.getElementById('layerSatellite').checked;
  document.querySelector('.map-wrap').classList.toggle('satellite-mode', satelliteActive);
}

Object.keys(layerMap).forEach(id => {
  document.getElementById(id).addEventListener('change', () => handleLayerToggle(id));
});

// Layer panel collapse — starts closed
let panelOpen = false;
document.getElementById('layerBody').classList.add('collapsed');
document.getElementById('chevron').innerHTML = '&#9654;';
document.getElementById('layerToggle').addEventListener('click', () => {
  panelOpen = !panelOpen;
  document.getElementById('layerBody').classList.toggle('collapsed', !panelOpen);
  document.getElementById('chevron').innerHTML = panelOpen ? '&#9660;' : '&#9654;';
});

// ===== OVERVIEW MARKERS =====
function makeOverviewIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div class="ov-pin" style="--pin-color:${color}"></div>`,
    iconSize:      [22, 30],
    iconAnchor:    [11, 30],
    tooltipAnchor: [0, -32],
  });
}

export function buildOverviewMarkers(onSelect) {
  overviewGroup.clearLayers();

  items.forEach((item) => {
    if (!passesFilter(item)) return;
    const centroid = getCentroid(item);
    if (!centroid) return;

    const color    = getColor(item);
    const linked   = isLinked(item);
    const name     = linked ? (item.e.empreendimento || item.e.nome || item.n) : item.n;
    const city     = linked ? (item.e.cidade   || '') : '';
    const regional = linked ? (item.e.regional || '') : '';
    const units    = linked && item.e.total_unidades
      ? fmtNum(item.e.total_unidades) + ' unidades'
      : '';

    const marker = L.marker(centroid, {
      icon: makeOverviewIcon(color),
      zIndexOffset: 200,
    });

    marker.bindTooltip(`
      <div class="ov-tooltip">
        ${regional ? `<span class="ov-tag" style="background:${color}">${regional}</span>` : ''}
        <strong>${city ? `<div class="ov-city">${city}</div></strong>` : ''}
        ${name}
        ${units ? `<div class="ov-units">${units}</div>` : ''}
        <div class="ov-hint">Clique para aproximar</div>
      </div>`, {
      direction:  'top',
      className:  'ov-tooltip-outer',
      offset:     [0, -4],
    });

    marker.on('click', () => {
      map.flyTo(centroid, 14, { duration: 3, easeLinearity: 0.35 });
      if (onSelect) onSelect(item);
    });

    overviewGroup.addLayer(marker);
  });
}

export function applyZoomVisibility() {
  const isOverview = map.getZoom() < ZOOM_THRESHOLD;
  const panes = map.getPanes();

  // esconde/mostra o pane inteiro — evita artefatos visuais do SVG container
  panes.overlayPane.style.display = isOverview ? 'none' : '';
  panes.markerPane.style.display  = isOverview ? ''     : 'none';
}

map.on('zoomend', applyZoomVisibility);

window.addEventListener('resize', () => {
  setTimeout(() => map.invalidateSize(), 100);
});

// ===== RESET VIEW BUTTON =====
const _resetBtn = document.createElement('button');
_resetBtn.className = 'resetview-btn';
_resetBtn.type = 'button';
_resetBtn.title = 'Visualizar mapa completo';
_resetBtn.setAttribute('aria-label', 'Visualizar mapa completo');
_resetBtn.innerHTML = `<img src="src/assets/images/brazil-outline.svg" alt="Brasil" class="resetview-icon">`;
_resetBtn.addEventListener('click', () => {
  map.flyTo([-12, -50], 4, { duration: 3, easeLinearity: 0.35 });
});
document.querySelector('.map-wrap').appendChild(_resetBtn);
