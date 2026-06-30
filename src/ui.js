import { items, colors, stats, state } from './state.js';
import { isLinked, getCentroid, fmtNum, fmtBRL, fmtArea } from './utils.js';
import { passesFilter, getColor, buildMultiSelect, buildSingleSelect, buildTreeSelect } from './filters.js';
import { map, layerGroup, buildOverviewMarkers, applyZoomVisibility } from './map.js';

// ===== MOBILE SIDEBAR DRAWER =====
const sidebar         = document.getElementById('sidebar');
const overlay         = document.getElementById('sidebarOverlay');
const mobileMenuBtn   = document.getElementById('mobileMenuBtn');
const sidebarCloseBtn = document.getElementById('sidebarClose');

export function openSidebar() {
  sidebar.classList.add('open');
  overlay.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

export function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('visible');
  document.body.style.overflow = '';
}

if (mobileMenuBtn)    mobileMenuBtn.addEventListener('click', openSidebar);
if (overlay)          overlay.addEventListener('click', closeSidebar);
if (sidebarCloseBtn)  sidebarCloseBtn.addEventListener('click', closeSidebar);

// ===== STATS =====
export function renderStats(filteredItems) {
  const hasFilter = state.activeRegionals.size > 0 || state.activeYears.size > 0
    || state.activeStatus.size > 0 || state.activeTipos.size > 0 || state.activeCidades.size > 0
    || state.activeEmpreendimentos.size > 0 || state.searchTerm;

  const somenteAtivo = state.activeStatus.has('Ativo')
    && state.activeRegionals.size === 0 && state.activeCidades.size === 0
    && state.activeEmpreendimentos.size === 0 && state.activeYears.size === 0 && !state.searchTerm;

  const somenteInativo = state.activeStatus.has('Inativo')
    && state.activeRegionals.size === 0 && state.activeCidades.size === 0
    && state.activeEmpreendimentos.size === 0 && state.activeYears.size === 0 && !state.searchTerm;

  const count = !hasFilter     ? stats.total_planilha
              : somenteAtivo   ? stats.total_ativo
              : somenteInativo ? stats.total_inativo
              : filteredItems.filter(i => isLinked(i)).length;

  const units  = filteredItems.reduce((s, i) => s + (i.e ? (i.e.total_unidades || 0) : 0), 0);
  const area   = filteredItems.reduce((s, i) => s + (i.e ? (i.e.area_total     || 0) : 0), 0);
  const vgv    = filteredItems.reduce((s, i) => s + (i.e ? (i.e.vgv_total      || 0) : 0), 0);
  const vgv_bt = filteredItems.reduce((s, i) => s + (i.e ? (i.e.vgv_bt         || 0) : 0), 0);

  const uniqueCities = new Set(
    filteredItems.filter(i => i.e?.cidade).map(i => i.e.cidade)
  ).size;
  const uniqueStates = new Set(
    filteredItems.filter(i => i.e?.uf).map(i => i.e.uf)
  ).size;

  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card stat-card-full">
      <div class="val">${count}</div>
      <div class="label">Empreendimentos</div>
    </div>
    <div class="stat-card">
      <div class="val">${uniqueCities}</div>
      <div class="label">Cidades</div>
    </div>
    <div class="stat-card">
      <div class="val">${uniqueStates}</div>
      <div class="label">Estados (UF)</div>
    </div>
    <div class="stat-card">
      <div class="val">${fmtNum(Math.round(units))}</div>
      <div class="label">Total Unidades</div>
    </div>
    <div class="stat-card">
      <div class="val">${fmtArea(area)}</div>
      <div class="label">Área Total</div>
    </div>
    <div class="stat-card">
      <div class="val green">${fmtBRL(vgv)}</div>
      <div class="label">VGV Total</div>
    </div>
    <div class="stat-card">
      <div class="val green">${fmtBRL(vgv_bt)}</div>
      <div class="label">VGV Total BT</div>
    </div>
  `;
}

// ===== POPUP CONTENT =====
function popupContent(item) {
  if (!isLinked(item)) {
    return `
      <div class="popup-header">
        <div class="popup-title">${item.n}</div>
      </div>
      <div class="popup-nodata">Área KML sem dados da planilha vinculados.</div>`;
  }

  const e             = item.e;
  const regionalColor = colors[e.regional] || '#7f8c8d';
  const statusClass   = e.on_off === 1 ? 'on' : 'off';
  const statusLabel   = e.on_off === 1 ? 'ON' : 'OFF';

  return `
    <div class="popup-header">
      ${e.regional ? `<div class="popup-regional-badge" style="background:${regionalColor}">${e.regional}</div>` : ''}
      ${e.cidade   ? `<div class="popup-city">${e.cidade}</div>` : ''}
      <div class="popup-title">Empreendimento:<br> ${e.empreendimento || e.nome || item.n}</div>
    </div>
    <div class="popup-body">
      <div class="popup-grid">
        <div class="popup-cell">
          <div class="pg-label">Tipo</div>
          <div class="pg-val">${e.tipo || '—'}</div>
        </div>
        <div class="popup-cell">
          <div class="pg-label">Ano Prev.</div>
          <div class="pg-val">${e.year || '—'}</div>
        </div>
        <div class="popup-cell">
          <div class="pg-label">Área Total</div>
          <div class="pg-val">${fmtArea(e.area_total)}</div>
        </div>
        <div class="popup-cell">
          <div class="pg-label">Unidades</div>
          <div class="pg-val">${fmtNum(e.total_unidades)}</div>
        </div>

        <div class="popup-divider"></div>

        <div class="popup-cell">
          <div class="pg-label">VGV Total</div>
          <div class="pg-val green">${fmtBRL(e.vgv_total)}</div>
        </div>
        <div class="popup-cell">
          <div class="pg-label">VGV BT</div>
          <div class="pg-val green">${fmtBRL(e.vgv_bt)}</div>
        </div>
        <div class="popup-cell">
          <div class="pg-label">Custo Terreno</div>
          <div class="pg-val">${fmtBRL(e.custo_terreno)}</div>
        </div>
        <div class="popup-cell">
          <div class="pg-label">Custo Construção</div>
          <div class="pg-val">${fmtBRL(e.custo_construcao)}</div>
        </div>

        <div class="popup-divider"></div>

        <div class="popup-cell">
          <div class="pg-label">Part. Buriti</div>
          <div class="pg-val">${e.participacao_buriti ? (e.participacao_buriti * 100).toFixed(1) + '%' : '—'}</div>
        </div>
        <div class="popup-cell">
          <div class="pg-label">Status</div>
          <div class="pg-val"><span class="popup-status ${statusClass}">${statusLabel}</span></div>
        </div>
      </div>
    </div>`;
}

// ===== INICIALIZAR FILTROS =====
const allYears = [...new Set(
  items.filter(i => isLinked(i) && i.e.year)
    .map(i => String(i.e.year))
    .filter(y => y !== 'null' && y !== 'None' && y.trim() !== '')
)].sort();

const allTipos = [...new Set(
  items.filter(i => isLinked(i) && i.e.tipo)
    .map(i => String(i.e.tipo))
    .filter(t => t !== 'null' && t !== 'None' && t.trim() !== '')
)].sort();

// updateMap é passado como callback para evitar dependência circular
const localizacaoSelect = buildTreeSelect('filterLocalizacao', () => updateMap());
const yearSelect        = buildMultiSelect('filterYear', allYears, state.activeYears, null, () => updateMap());
const statusSelect      = buildSingleSelect('filterStatus', ['Ativo', 'Inativo'], state.activeStatus, () => updateMap());
const tipoSelect        = buildMultiSelect('filterTipo', allTipos, state.activeTipos, null, () => updateMap());

// ===== FILTER NOTICE =====
function updateFilterNotice() {
  const active = state.activeRegionals.size > 0 || state.activeYears.size > 0
    || state.activeStatus.size > 0 || state.activeTipos.size > 0 || state.activeCidades.size > 0
    || state.activeEmpreendimentos.size > 0 || state.searchTerm;
  document.getElementById('filterNotice').style.display = active ? 'flex' : 'none';
}

document.getElementById('clearFiltersBtn').addEventListener('click', () => {
  state.activeRegionals.clear();
  state.activeYears.clear();
  state.activeStatus.clear();
  state.activeTipos.clear();
  state.activeCidades.clear();
  state.activeEmpreendimentos.clear();
  state.searchTerm = '';
  document.getElementById('searchInput').value = '';
  localizacaoSelect._sync();
  yearSelect._sync();
  statusSelect._sync();
  tipoSelect._sync();
  updateMap();
});

// ===== SEARCH =====
document.getElementById('searchInput').addEventListener('input', (e) => {
  state.searchTerm = e.target.value.toUpperCase();
  updateMap();
});

// ===== RENDER MAP + LIST =====
export function updateMap() {
  layerGroup.clearLayers();
  state.polygonLayers = [];
  const listEl = document.getElementById('listContainer');
  listEl.innerHTML = '';

  items.forEach((item, idx) => {
    if (!passesFilter(item)) return;
    const color    = getColor(item);
    const centroid = getCentroid(item);

    item.p.forEach(polyCoords => {
      const polygon = L.polygon(polyCoords, {
        color: color, weight: 2, opacity: 0.85,
        fillColor: color, fillOpacity: 0.15, smoothFactor: 1.2
      });
      polygon.on('mouseover', function () { this.setStyle({ weight: 3, fillOpacity: 0.28 }); });
      polygon.on('mouseout',  function () { this.setStyle({ weight: 2, fillOpacity: 0.15 }); });
      polygon.bindPopup(popupContent(item), { maxWidth: 320, className: '' });
      polygon.addTo(layerGroup);
      state.polygonLayers.push({ layer: polygon, item: item, idx: idx, centroid: centroid });
    });

    if (item.p.length === 0 && centroid) {
      const marker = L.circleMarker(centroid, {
        radius: 7, color: color, fillColor: color, fillOpacity: 0.5, weight: 2.5
      });
      marker.bindPopup(popupContent(item), { maxWidth: 320 });
      marker.addTo(layerGroup);
      state.polygonLayers.push({ layer: marker, item: item, idx: idx, centroid: centroid, isMarker: true });
    }

    const div = document.createElement('div');
    div.className = 'list-item';

    const linked        = isLinked(item);
    const displayName   = linked ? (item.e.empreendimento || item.e.nome || item.n) : item.n;
    const cityText      = linked ? (item.e.cidade   || '') : '';
    const ufText        = linked ? (item.e.uf       || '') : '';
    const regional      = linked ? (item.e.regional || '') : '';
    const unitsText     = linked && item.e.total_unidades ? fmtNum(item.e.total_unidades) + ' un.' : '';
    const isActive      = linked ? item.e.on_off === 1 : null;
    const hasLocation   = !!(centroid);
    const accentColor   = regional ? (colors[regional] || '#5a6e8e') : '#e4e7ed';
    const locationLabel = cityText ? `${cityText}${ufText ? ', ' + ufText : ''}` : '';

    div.innerHTML = `
      <div class="list-item-meta">
        ${regional      ? `<span class="regional-tag" style="background:${accentColor}">${regional}</span>` : ''}
        ${locationLabel ? `<span class="list-item-city">${locationLabel}</span>` : ''}
        ${unitsText     ? `<span class="list-item-units">${unitsText}</span>` : ''}
        ${!linked       ? '<span class="no-match">sem dados</span>' : ''}
        ${!hasLocation  ? '<span class="no-match" title="Sem coordenadas cadastradas">sem loc.</span>' : ''}
      </div>
      <div class="list-item-header">
        <span class="list-item-name" title="${item.n}">${displayName}</span>
        ${isActive !== null ? `<span class="list-item-status ${isActive ? 'status-active' : 'status-inactive'}">${isActive ? 'Ativo' : 'Inativo'}</span>` : ''}
      </div>`;

    div.onclick = () => {
      if (centroid) {
        map.flyTo(centroid, 14, { duration: 1.0 });
        const pl = state.polygonLayers.find(p => p.idx === idx);
        if (pl) setTimeout(() => pl.layer.openPopup(centroid), 600);
      }
      document.querySelectorAll('.list-item').forEach(el => el.classList.remove('highlight'));
      div.classList.add('highlight');
      if (window.innerWidth <= 768) closeSidebar();
    };

    listEl.appendChild(div);
  });

  document.getElementById('counter').textContent = `Lista de empreendimentos:`;

  const filteredItems = items.filter(item => passesFilter(item));
  renderStats(filteredItems);

  buildOverviewMarkers();
  setTimeout(applyZoomVisibility, 0);
  updateFilterNotice();
}
