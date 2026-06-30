export let items  = [];
export let colors = {};
export let stats  = {};

export function init(data) {
  items  = data.items;
  colors = data.colors;
  stats  = data.stats;
  if (data.last_updated) {
    const el = document.getElementById('lastUpdatedDate');
    if (el) el.textContent = data.last_updated;
  }
}

export const state = {
  activeRegionals:       new Set(),
  activeYears:           new Set(),
  activeStatus:          new Set(),
  activeTipos:           new Set(),
  activeCidades:         new Set(),
  activeEmpreendimentos: new Set(),
  polygonLayers:         [],
  searchTerm:            '',
  somenteVinculados:     false,
};
