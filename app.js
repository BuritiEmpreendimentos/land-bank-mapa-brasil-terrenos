// ===== GLOBALS =====
const items = DATA.items;
const colors = DATA.colors;
const stats = DATA.stats;

let activeRegionals = new Set();
let polygonLayers = [];
let searchTerm = '';

// ===== HELPERS =====
const fmtNum = (n) => n ? n.toLocaleString('pt-BR') : '-';
const fmtBRL = (n) => n ? 'R$ ' + n.toLocaleString('pt-BR', {minimumFractionDigits:1, maximumFractionDigits:1}) + ' mi' : '-';
const fmtArea = (n) => n ? n.toLocaleString('pt-BR', {maximumFractionDigits:0}) + ' m²' : '-';

// ===== STATS =====
document.getElementById('statsGrid').innerHTML = `
  <div class="stat-card"><div class="val">${stats.total}</div><div class="label">Empreendimentos</div></div>
  <div class="stat-card"><div class="val green">${stats.on_map}</div><div class="label">No Mapa (KML)</div></div>
  <div class="stat-card"><div class="val">${fmtNum(Math.round(stats.total_units))}</div><div class="label">Total Unidades</div></div>
  <div class="stat-card"><div class="val green">${fmtBRL(stats.total_vgv)}</div><div class="label">VGV Total</div></div>
`;

// ===== MAP INIT =====
const map = L.map('map', {zoomControl: false, attributionControl: false}).setView([-12, -50], 4);
L.control.zoom({position: 'topright'}).addTo(map);

// ===== TILE LAYERS =====
const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap', maxZoom: 19
}).addTo(map);

const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: '© Esri', maxZoom: 19
});

const terrainLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenTopoMap', maxZoom: 17, opacity: 0.7
});

const vegetationLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenTopoMap', maxZoom: 17, opacity: 0.55
});

const layerMap = {
  layerStreets: streetLayer,
  layerSatellite: satelliteLayer,
  layerTerrain: terrainLayer,
  layerVegetation: vegetationLayer
};

// ===== LAYER TOGGLE LOGIC =====
function handleLayerToggle(id) {
  const cb = document.getElementById(id);
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
}

Object.keys(layerMap).forEach(id => {
  document.getElementById(id).addEventListener('change', () => handleLayerToggle(id));
});

// Layer panel collapse
let panelOpen = true;
document.getElementById('layerToggle').addEventListener('click', () => {
  panelOpen = !panelOpen;
  document.getElementById('layerBody').classList.toggle('collapsed', !panelOpen);
  document.getElementById('chevron').innerHTML = panelOpen ? '&#9660;' : '&#9654;';
});

// ===== MOBILE SIDEBAR DRAWER =====
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebarCloseBtn = document.getElementById('sidebarClose');

function openSidebar() {
  sidebar.classList.add('open');
  overlay.classList.add('visible');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('visible');
  document.body.style.overflow = '';
}

if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openSidebar);
if (overlay) overlay.addEventListener('click', closeSidebar);
if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);

// ===== FILTER CHIPS =====
const allRegionals = [...new Set(items.filter(i => i.e).map(i => i.e.regional).filter(Boolean).filter(r => r !== 'None'))].sort();

const chipsEl = document.getElementById('filterChips');
const allChip = document.createElement('div');
allChip.className = 'chip active';
allChip.textContent = 'Todos';
allChip.onclick = () => {
  activeRegionals.clear();
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  allChip.classList.add('active');
  updateMap();
};
chipsEl.appendChild(allChip);

allRegionals.forEach(r => {
  const chip = document.createElement('div');
  chip.className = 'chip';
  chip.innerHTML = `<span class="dot" style="background:${colors[r] || '#7f8c8d'}"></span>${r}`;
  chip.onclick = () => {
    if (activeRegionals.has(r)) {
      activeRegionals.delete(r);
      chip.classList.remove('active');
    } else {
      activeRegionals.add(r);
      chip.classList.add('active');
    }
    allChip.classList.toggle('active', activeRegionals.size === 0);
    updateMap();
  };
  chipsEl.appendChild(chip);
});

// ===== SEARCH =====
document.getElementById('searchInput').addEventListener('input', (e) => {
  searchTerm = e.target.value.toUpperCase();
  updateMap();
});

// ===== POPUP CONTENT =====
function popupContent(item) {
  const e = item.e;
  if (!e) return `<div class="popup-title">${item.n}</div><div class="popup-nodata">Sem dados da planilha vinculados</div>`;
  return `
    <div class="popup-city">${e.regional || ''} · ${e.cidade || ''}</div>
    <div class="popup-title">${e.empreendimento || e.nome}</div>
    <div class="popup-grid">
      <div><div class="pg-label">Tipo</div><div class="pg-val">${e.tipo || '-'}</div></div>
      <div><div class="pg-label">Ano</div><div class="pg-val">${e.year || '-'}</div></div>
      <div><div class="pg-label">Área Total</div><div class="pg-val">${fmtArea(e.area_total)}</div></div>
      <div><div class="pg-label">Unidades</div><div class="pg-val">${fmtNum(e.total_unidades)}</div></div>
      <div><div class="pg-label">VGV Total</div><div class="pg-val">${fmtBRL(e.vgv_total)}</div></div>
      <div><div class="pg-label">VGV BT</div><div class="pg-val">${fmtBRL(e.vgv_bt)}</div></div>
      <div><div class="pg-label">Custo Terreno</div><div class="pg-val">${fmtBRL(e.custo_terreno)}</div></div>
      <div><div class="pg-label">Custo Construção</div><div class="pg-val">${fmtBRL(e.custo_construcao)}</div></div>
      <div><div class="pg-label">Part. Buriti</div><div class="pg-val">${e.participacao_buriti ? (e.participacao_buriti * 100).toFixed(1) + '%' : '-'}</div></div>
      <div><div class="pg-label">Status</div><div class="pg-val">${e.on_off === 1 ? '🟢 ON' : '🔴 OFF'}</div></div>
    </div>`;
}

// ===== FILTER LOGIC =====
function passesFilter(item) {
  if (activeRegionals.size > 0) {
    const r = item.e ? item.e.regional : null;
    if (!r || !activeRegionals.has(r)) return false;
  }
  if (searchTerm) {
    const haystack = [item.n, item.e ? item.e.nome : '', item.e ? item.e.cidade : '', item.e ? item.e.empreendimento : '', item.e ? item.e.regional : ''].join(' ').toUpperCase();
    if (!haystack.includes(searchTerm)) return false;
  }
  return true;
}

function getColor(item) {
  if (item.e && item.e.regional) return colors[item.e.regional] || '#7f8c8d';
  return '#94a3b8';
}

// ===== RENDER MAP + LIST =====
let layerGroup = L.layerGroup().addTo(map);

function updateMap() {
  layerGroup.clearLayers();
  polygonLayers = [];
  const listEl = document.getElementById('listContainer');
  listEl.innerHTML = '';
  let visibleCount = 0;

  items.forEach((item, idx) => {
    if (!passesFilter(item)) return;
    visibleCount++;
    const color = getColor(item);

    // Draw polygons
    item.p.forEach(polyCoords => {
      const polygon = L.polygon(polyCoords, {
        color: color, weight: 2.5, opacity: 0.9,
        fillColor: color, fillOpacity: 0.18, smoothFactor: 1
      });
      polygon.bindPopup(popupContent(item), {maxWidth: 320});
      polygon.addTo(layerGroup);
      polygonLayers.push({layer: polygon, item: item, idx: idx});
    });

    // Centroid marker fallback
    if (item.p.length === 0 && item.c) {
      const marker = L.circleMarker(item.c, {
        radius: 7, color: color, fillColor: color, fillOpacity: 0.5, weight: 2.5
      });
      marker.bindPopup(popupContent(item), {maxWidth: 320});
      marker.addTo(layerGroup);
    }

    // List item
    const div = document.createElement('div');
    div.className = 'list-item';
    const displayName = item.e ? (item.e.empreendimento || item.e.nome) : item.n;
    const cityText = item.e ? item.e.cidade : '';
    const regional = item.e ? item.e.regional : '';
    const unitsText = item.e && item.e.total_unidades ? fmtNum(item.e.total_unidades) + ' un.' : '';

    div.innerHTML = `
      <div class="name" title="${item.n}">${displayName}</div>
      <div class="meta">
        ${regional ? `<span class="regional-tag" style="background:${colors[regional] || '#7f8c8d'}">${regional}</span>` : ''}
        <span>${cityText}</span>
        ${unitsText ? `<span>${unitsText}</span>` : ''}
        ${!item.e ? '<span class="no-match">sem dados</span>' : ''}
      </div>`;

    div.onclick = () => {
      if (item.c) map.flyTo(item.c, 14, {duration: 1});
      const pl = polygonLayers.find(p => p.idx === idx);
      if (pl) setTimeout(() => pl.layer.openPopup(), 600);
      document.querySelectorAll('.list-item').forEach(el => el.classList.remove('highlight'));
      div.classList.add('highlight');
      // Close sidebar on mobile after selection
      if (window.innerWidth <= 768) closeSidebar();
    };
    listEl.appendChild(div);
  });

  document.getElementById('counter').textContent = visibleCount + ' de ' + items.length + ' terrenos';
}

// Initial render
updateMap();

// Fix Leaflet map size on resize
window.addEventListener('resize', () => {
  setTimeout(() => map.invalidateSize(), 100);
});
