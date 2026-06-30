import { init } from './state.js';
import './map.js';
import { updateMap, initFilters } from './ui.js';

fetch('src/data.json')
  .then(r => r.json())
  .then(data => {
    init(data);
    initFilters();
    updateMap();
  });
