export const items  = DATA.items;
export const colors = DATA.colors;
export const stats  = DATA.stats;

if (DATA.last_updated) {
  const el = document.getElementById('lastUpdatedDate');
  if (el) el.textContent = DATA.last_updated;
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
