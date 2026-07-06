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
  closeInfoSheet();
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

// ===== INFO CONTENT =====
function buildInfoHTML(item) {
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

// ===== INFO CARD / INFO SHEET =====
const infoCard         = document.getElementById('infoCard');
const infoCardContent  = document.getElementById('infoCardContent');
const infoCardClose    = document.getElementById('infoCardClose');
const infoSheet        = document.getElementById('infoSheet');
const infoSheetPanel   = document.getElementById('infoSheetPanel');
const infoSheetHandle  = document.getElementById('infoSheetHandle');
const infoSheetClose   = document.getElementById('infoSheetClose');
const infoSheetContent = document.getElementById('infoSheetContent');

function isMobile() { return window.innerWidth <= 768; }

// painel começa invisível para não vazar sombra sobre o mapa
infoSheetPanel.style.display = 'none';

function closeInfoCard() {
  infoCard.classList.add('closing');
  infoCard.addEventListener('animationend', () => {
    infoCard.classList.remove('closing');
    infoCard.setAttribute('hidden', '');
  }, { once: true });
}

function stopHint() {
  infoSheetPanel.style.animation = '';
}

let sheetCloseToken = 0;

function closeInfoSheet() {
  stopHint();
  // Se não está aberto, fecha imediatamente sem animação
  if (!infoSheet.classList.contains('open')) {
    infoSheet.classList.remove('expanded');
    infoSheetPanel.style.removeProperty('--sheet-expanded-h');
    infoSheetPanel.style.display = 'none';
    return;
  }
  const token = ++sheetCloseToken;
  infoSheetPanel.classList.add('closing');
  infoSheetPanel.addEventListener('animationend', () => {
    if (token !== sheetCloseToken) return; // showInfoCard abriu antes de terminar
    infoSheetPanel.classList.remove('closing');
    infoSheet.classList.remove('open', 'expanded');
    infoSheetPanel.style.removeProperty('--sheet-expanded-h');
    infoSheetPanel.style.display = 'none';
  }, { once: true });
}

function expandSheet() {
  stopHint();
  // Adiciona .expanded antes de medir: o CSS libera o .popup-body
  infoSheet.classList.add('expanded');

  // Mede no próximo frame (após o navegador recalcular o layout)
  requestAnimationFrame(() => {
    const handleH = infoSheetHandle.offsetHeight;
    const contentH = infoSheetContent.scrollHeight;
    const padding  = 24;
    const maxH     = Math.floor(window.innerHeight * 0.88);
    const targetH  = Math.min(handleH + contentH + padding, maxH);
    infoSheetPanel.style.setProperty('--sheet-expanded-h', targetH + 'px');
  });
}

export function showInfoCard(item) {
  const html = buildInfoHTML(item);

  if (isMobile()) {
    sheetCloseToken++; // invalida qualquer animationend de fechamento em andamento
    infoSheetContent.innerHTML = html;
    infoSheet.classList.remove('expanded');
    infoSheetPanel.classList.remove('closing');
    infoSheetPanel.style.animation = '';
    infoSheetPanel.style.display = '';
    requestAnimationFrame(() => {
      infoSheet.classList.add('open');
      // dispara o hint após a animação de entrada terminar (480ms + folga)
      setTimeout(() => {
        if (infoSheet.classList.contains('expanded')) return;
        infoSheetPanel.style.animation = 'sheetHint 9s linear infinite';
      }, 560);
    });
  } else {
    infoCardContent.innerHTML = html;
    infoCard.classList.remove('closing');
    infoCard.removeAttribute('hidden');
  }
}

infoCardClose.addEventListener('click', closeInfoCard);
infoSheetClose.addEventListener('click', (e) => { e.stopPropagation(); closeInfoSheet(); });

// ── Gesto de arrastar o bottom sheet ──
let dragStartY = 0;
let dragStartHeight = 0;
let isDragging = false;

function sheetDragStart(e) {
  isDragging = true;
  dragStartY = e.touches[0].clientY;
  dragStartHeight = infoSheetPanel.getBoundingClientRect().height;
  infoSheetPanel.style.transition = 'none';
}

function sheetDragMove(e) {
  if (!isDragging) return;
  const dy = dragStartY - e.touches[0].clientY; // positivo = puxou para cima
  const newHeight = Math.min(
    Math.max(dragStartHeight + dy, 80),
    window.innerHeight * 0.88
  );
  infoSheetPanel.style.height = newHeight + 'px';
}

function sheetDragEnd(e) {
  if (!isDragging) return;
  isDragging = false;
  infoSheetPanel.style.transition = '';
  infoSheetPanel.style.height = '';

  const dy = dragStartY - e.changedTouches[0].clientY;
  const wasExpanded = infoSheet.classList.contains('expanded');

  if (dy > 60) {
    // puxou para cima → expandir
    expandSheet();
  } else if (dy < -60) {
    // puxou para baixo com força
    if (wasExpanded) {
      // estava expandido → colapsar (não fechar)
      infoSheet.classList.remove('expanded');
    } else {
      // estava colapsado → fechar
      closeInfoSheet();
    }
  }
  // solto sem força suficiente → mantém estado atual sem mudança
}

function sheetDragCancel() {
  if (!isDragging) return;
  isDragging = false;
  infoSheetPanel.style.transition = '';
  infoSheetPanel.style.height = '';
}

infoSheetHandle.addEventListener('touchstart',  sheetDragStart,  { passive: true });
infoSheetHandle.addEventListener('touchmove',   sheetDragMove,   { passive: true });
infoSheetHandle.addEventListener('touchend',    sheetDragEnd,    { passive: true });
infoSheetHandle.addEventListener('touchcancel', sheetDragCancel, { passive: true });

// toque simples no handle (sem arrastar) → expandir / colapsar
infoSheetHandle.addEventListener('click', () => {
  if (infoSheet.classList.contains('expanded')) {
    infoSheet.classList.remove('expanded');
  } else {
    expandSheet();
  }
});

// ===== INICIALIZAR FILTROS =====
let localizacaoSelect, yearSelect, statusSelect, tipoSelect;

export function initFilters() {
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

  localizacaoSelect = buildTreeSelect('filterLocalizacao', () => updateMap());
  yearSelect        = buildMultiSelect('filterYear', allYears, state.activeYears, null, () => updateMap());
  statusSelect      = buildSingleSelect('filterStatus', ['Ativo', 'Inativo'], state.activeStatus, () => updateMap());
  tipoSelect        = buildMultiSelect('filterTipo', allTipos, state.activeTipos, null, () => updateMap());
}

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

// ===== LIST ITEM (single empreendimento row) =====
function buildListItem(item, idx, centroid) {
  const div = document.createElement('div');
  div.className = 'list-item list-item-grouped';

  const linked        = isLinked(item);
  const displayName   = linked ? (item.e.empreendimento || item.e.nome || item.n) : item.n;
  const cityText      = linked ? (item.e.cidade   || '') : '';
  const ufText        = linked ? (item.e.uf       || '') : '';
  const unitsText     = linked && item.e.total_unidades ? fmtNum(item.e.total_unidades) + ' un.' : '';
  const isActive      = linked ? item.e.on_off === 1 : null;
  const hasLocation   = !!(centroid);
  const locationLabel = cityText ? `${cityText}${ufText ? ', ' + ufText : ''}` : '';

  div.innerHTML = `
    <div class="list-item-meta">
      ${locationLabel ? `<span class="list-item-city">${locationLabel}</span>` : ''}
      ${unitsText     ? `<span class="list-item-units">${unitsText}</span>` : ''}
      ${!linked       ? '<span class="no-match">sem dados</span>' : ''}
      ${!hasLocation  ? '<span class="no-location" title="Sem coordenadas cadastradas"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>sem localização</span>' : ''}
    </div>
    <div class="list-item-header">
      <span class="list-item-name" title="${item.n}">${displayName}</span>
      ${isActive !== null ? `<span class="list-item-status ${isActive ? 'status-active' : 'status-inactive'}">${isActive ? 'Ativo' : 'Inativo'}</span>` : ''}
    </div>`;

  div.onclick = () => {
    if (centroid) map.flyTo(centroid, 14, { duration: 1.2, easeLinearity: 0.35 });
    document.querySelectorAll('.list-item').forEach(el => el.classList.remove('highlight'));
    div.classList.add('highlight');
    if (window.innerWidth <= 768) closeSidebar();
    showInfoCard(item);
  };

  return div;
}

// ===== LIST GROUP HEADER (regional / cidade) =====
function buildGroupHeader(level, label, count, groupKey, accentColor) {
  const header = document.createElement('div');
  header.className = `list-group-header list-group-header-${level}`;
  const collapsed = state.collapsedGroups.has(groupKey);
  header.classList.toggle('collapsed', collapsed);

  header.innerHTML = `
    <span class="list-group-arrow">▾</span>
    ${accentColor ? `<span class="list-group-dot" style="background:${accentColor}"></span>` : ''}
    <span class="list-group-label">${label}</span>
    <span class="list-group-count">${count}</span>`;

  header.onclick = () => {
    if (state.collapsedGroups.has(groupKey)) {
      state.collapsedGroups.delete(groupKey);
      if (!state.expandedCidades) state.expandedCidades = new Set();
      state.expandedCidades.add(groupKey);
    } else {
      state.collapsedGroups.add(groupKey);
      if (state.expandedCidades) state.expandedCidades.delete(groupKey);
    }
    updateMap();
  };

  return header;
}

// ===== RENDER MAP + LIST =====
export function updateMap() {
  layerGroup.clearLayers();
  state.polygonLayers = [];
  const listEl = document.getElementById('listContainer');
  listEl.innerHTML = '';

  // regional -> cidade -> [{item, idx, centroid}]
  const groups = new Map();

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
      polygon.on('click', () => showInfoCard(item));
      polygon.addTo(layerGroup);
      state.polygonLayers.push({ layer: polygon, item: item, idx: idx, centroid: centroid });
    });

    if (item.p.length === 0 && centroid) {
      const marker = L.circleMarker(centroid, {
        radius: 7, color: color, fillColor: color, fillOpacity: 0.5, weight: 2.5
      });
      marker.on('click', () => showInfoCard(item));
      marker.addTo(layerGroup);
      state.polygonLayers.push({ layer: marker, item: item, idx: idx, centroid: centroid, isMarker: true });
    }

    const linked   = isLinked(item);
    const regional = (linked && item.e.regional) ? item.e.regional : 'Sem Regional';
    const cidade   = (linked && item.e.cidade)   ? item.e.cidade   : 'Sem Cidade';

    if (!groups.has(regional)) groups.set(regional, new Map());
    const cidades = groups.get(regional);
    if (!cidades.has(cidade)) cidades.set(cidade, []);
    cidades.get(cidade).push({ item, idx, centroid });
  });

  const sortedRegionals = [...groups.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  // Inicia todos os grupos colapsados na primeira renderização
  if (state.collapsedGroups.size === 0) {
    sortedRegionals.forEach(regional => {
      state.collapsedGroups.add(`r:${regional}`);
    });
  }

  sortedRegionals.forEach(regional => {
    const cidades       = groups.get(regional);
    const regionalCount = [...cidades.values()].reduce((s, arr) => s + arr.length, 0);
    const accentColor   = colors[regional] || '#5a6e8e';

    listEl.appendChild(buildGroupHeader('regional', regional, regionalCount, `r:${regional}`, accentColor));

    if (state.collapsedGroups.has(`r:${regional}`)) return;

    const sortedCidades = [...cidades.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'));

    // Colapsa cidades automaticamente quando a regional é aberta pela primeira vez
    sortedCidades.forEach(cidade => {
      const cidadeKey = `r:${regional}|c:${cidade}`;
      if (!state.expandedCidades) state.expandedCidades = new Set();
      if (!state.expandedCidades.has(cidadeKey)) {
        state.collapsedGroups.add(cidadeKey);
      }
    });

    sortedCidades.forEach(cidade => {
      const rows     = cidades.get(cidade);
      const cidadeKey = `r:${regional}|c:${cidade}`;

      listEl.appendChild(buildGroupHeader('cidade', cidade, rows.length, cidadeKey, null));

      if (state.collapsedGroups.has(cidadeKey)) return;

      rows.forEach(({ item, idx, centroid }) => {
        listEl.appendChild(buildListItem(item, idx, centroid));
      });
    });
  });

  document.getElementById('counter').textContent = `Lista de empreendimentos:`;

  const filteredItems = items.filter(item => passesFilter(item));
  renderStats(filteredItems);

  buildOverviewMarkers(showInfoCard);
  setTimeout(applyZoomVisibility, 0);
  updateFilterNotice();
}
