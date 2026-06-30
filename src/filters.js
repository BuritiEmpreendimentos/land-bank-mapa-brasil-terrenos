import { items, colors, state } from './state.js';
import { isLinked } from './utils.js';

// ===== MULTI-SELECT DROPDOWN =====
export function buildMultiSelect(containerId, options, activeSet, colorMap, onChangeFn) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'filter-select';

  const btn = document.createElement('button');
  btn.type  = 'button';
  btn.className = 'filter-select-btn';

  const panel = document.createElement('div');
  panel.className = 'filter-dropdown';
  panel.style.display = 'none';
  panel.addEventListener('click', e => e.stopPropagation());

  function updateBtn() {
    btn.innerHTML = activeSet.size === 0
      ? `Todos <span class="fsd-arrow">▾</span>`
      : `${activeSet.size} selecionado${activeSet.size > 1 ? 's' : ''} <span class="fsd-arrow">▾</span>`;
    btn.classList.toggle('has-filter', activeSet.size > 0);
  }

  const allLbl = document.createElement('label');
  allLbl.className = 'filter-option';
  const allChk = document.createElement('input');
  allChk.type = 'checkbox';
  allChk.checked = true;
  allLbl.appendChild(allChk);
  allLbl.appendChild(document.createTextNode('Todos'));
  panel.appendChild(allLbl);

  const optEls = options.map(val => {
    const lbl = document.createElement('label');
    lbl.className = 'filter-option';
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    lbl.appendChild(chk);
    if (colorMap && colorMap[val]) {
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.background = colorMap[val];
      lbl.appendChild(dot);
    }
    lbl.appendChild(document.createTextNode(val));
    panel.appendChild(lbl);

    chk.addEventListener('change', () => {
      chk.checked ? activeSet.add(val) : activeSet.delete(val);
      allChk.checked = activeSet.size === 0;
      updateBtn();
      onChangeFn();
    });

    return { val, chk };
  });

  allChk.addEventListener('change', () => {
    activeSet.clear();
    optEls.forEach(o => { o.chk.checked = false; });
    allChk.checked = true;
    updateBtn();
    onChangeFn();
  });

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const open = panel.style.display === 'block';
    document.querySelectorAll('.filter-dropdown').forEach(d => d.style.display = 'none');
    panel.style.display = open ? 'none' : 'block';
  });

  document.addEventListener('click', () => { panel.style.display = 'none'; });

  wrapper.appendChild(btn);
  wrapper.appendChild(panel);
  container.appendChild(wrapper);
  updateBtn();

  wrapper._sync = () => {
    optEls.forEach(o => { o.chk.checked = activeSet.has(o.val); });
    allChk.checked = activeSet.size === 0;
    updateBtn();
  };

  return wrapper;
}

// ===== SINGLE-SELECT DROPDOWN =====
export function buildSingleSelect(containerId, options, activeSet, onChangeFn) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'filter-select';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'filter-select-btn';

  const panel = document.createElement('div');
  panel.className = 'filter-dropdown';
  panel.style.display = 'none';
  panel.addEventListener('click', e => e.stopPropagation());

  function updateBtn() {
    const selected = [...activeSet][0];
    btn.innerHTML = selected
      ? `${selected} <span class="fsd-arrow">▾</span>`
      : `Todos <span class="fsd-arrow">▾</span>`;
    btn.classList.toggle('has-filter', activeSet.size > 0);
  }

  const allOptions = ['Todos', ...options];

  allOptions.forEach(val => {
    const lbl = document.createElement('label');
    lbl.className = 'filter-option';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = containerId;
    radio.checked = val === 'Todos' ? activeSet.size === 0 : activeSet.has(val);
    lbl.appendChild(radio);
    lbl.appendChild(document.createTextNode(val));
    panel.appendChild(lbl);

    radio.addEventListener('change', () => {
      activeSet.clear();
      if (val !== 'Todos') activeSet.add(val);
      updateBtn();
      panel.style.display = 'none';
      onChangeFn();
    });
  });

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const open = panel.style.display === 'block';
    document.querySelectorAll('.filter-dropdown').forEach(d => d.style.display = 'none');
    panel.style.display = open ? 'none' : 'block';
  });

  document.addEventListener('click', () => { panel.style.display = 'none'; });

  wrapper.appendChild(btn);
  wrapper.appendChild(panel);
  container.appendChild(wrapper);
  updateBtn();

  wrapper._sync = () => {
    activeSet.clear();
    panel.querySelectorAll('input[type=radio]').forEach(r => {
      r.checked = r.parentElement.textContent.trim() === 'Todos';
    });
    updateBtn();
  };

  return wrapper;
}

// ===== TREE SELECT (dropdown em árvore) =====
export function buildTreeSelect(containerId, onChangeFn) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'filter-select';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'filter-select-btn';

  const panel = document.createElement('div');
  panel.className = 'filter-dropdown filter-tree';
  panel.style.display = 'none';
  panel.addEventListener('click', e => e.stopPropagation());

  function getLabel() {
    const parts = [];
    if (state.activeRegionals.size > 0)
      parts.push(`${state.activeRegionals.size} regional${state.activeRegionals.size > 1 ? 'is' : ''}`);
    if (state.activeCidades.size > 0)
      parts.push(`${state.activeCidades.size} cidade${state.activeCidades.size > 1 ? 's' : ''}`);
    if (state.activeEmpreendimentos.size > 0)
      parts.push(`${state.activeEmpreendimentos.size} empreend.`);
    return parts.length > 0 ? parts.join(', ') : 'Todos';
  }

  function updateBtn() {
    const has = state.activeRegionals.size > 0 || state.activeCidades.size > 0 || state.activeEmpreendimentos.size > 0;
    btn.innerHTML = `${getLabel()} <span class="fsd-arrow">▾</span>`;
    btn.classList.toggle('has-filter', has);
  }

  function buildEmpreendimentos(regional, cidade, empContainer) {
    empContainer.innerHTML = '';
    const emps = [...new Set(
      items
        .filter(i => isLinked(i) && i.e.regional === regional && i.e.cidade === cidade)
        .map(i => i.e.empreendimento || i.e.nome)
        .filter(Boolean)
    )].sort();

    emps.forEach(emp => {
      const row = document.createElement('div');
      row.className = 'tree-item tree-empreendimento';

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = state.activeEmpreendimentos.has(emp);

      const lbl = document.createElement('span');
      lbl.textContent = emp;
      lbl.style.cursor = 'pointer';
      lbl.addEventListener('click', () => chk.click());

      row.appendChild(chk);
      row.appendChild(lbl);

      chk.addEventListener('change', () => {
        chk.checked ? state.activeEmpreendimentos.add(emp) : state.activeEmpreendimentos.delete(emp);
        updateBtn();
        onChangeFn();
      });

      empContainer.appendChild(row);
    });
  }

  function buildCidades(regional, cidadeContainer) {
    cidadeContainer.innerHTML = '';
    const cidades = [...new Set(
      items
        .filter(i => isLinked(i) && i.e.regional === regional)
        .map(i => i.e.cidade)
        .filter(Boolean)
    )].sort();

    cidades.forEach(cidade => {
      const row = document.createElement('div');
      row.className = 'tree-item tree-cidade';

      const expandBtn = document.createElement('span');
      expandBtn.className = 'tree-expand';
      expandBtn.innerHTML = '&#9654;';

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = state.activeCidades.has(cidade);

      const lbl = document.createElement('span');
      lbl.textContent = cidade;
      lbl.style.cursor = 'pointer';
      lbl.addEventListener('click', () => chk.click());

      row.appendChild(expandBtn);
      row.appendChild(chk);
      row.appendChild(lbl);

      const empContainer = document.createElement('div');
      empContainer.className = 'tree-children';
      empContainer.style.display = 'none';
      let expanded = false;

      expandBtn.addEventListener('click', e => {
        e.stopPropagation();
        expanded = !expanded;
        empContainer.style.display = expanded ? 'block' : 'none';
        expandBtn.classList.toggle('expanded', expanded);
        if (expanded) buildEmpreendimentos(regional, cidade, empContainer);
      });

      chk.addEventListener('change', () => {
        if (chk.checked) {
          state.activeCidades.add(cidade);
        } else {
          state.activeCidades.delete(cidade);
          items
            .filter(i => isLinked(i) && i.e.cidade === cidade)
            .forEach(i => state.activeEmpreendimentos.delete(i.e.empreendimento || i.e.nome));
        }
        if (expanded) buildEmpreendimentos(regional, cidade, empContainer);
        updateBtn();
        onChangeFn();
      });

      cidadeContainer.appendChild(row);
      cidadeContainer.appendChild(empContainer);
    });
  }

  function buildTree() {
    panel.innerHTML = '';

    const allRow = document.createElement('div');
    allRow.className = 'tree-all';
    const allChk = document.createElement('input');
    allChk.type = 'checkbox';
    allChk.checked = state.activeRegionals.size === 0 && state.activeCidades.size === 0 && state.activeEmpreendimentos.size === 0;
    const allLblText = document.createElement('span');
    allLblText.textContent = 'Todos';
    allLblText.style.cursor = 'pointer';
    allLblText.addEventListener('click', () => allChk.click());
    allRow.appendChild(allChk);
    allRow.appendChild(allLblText);
    allChk.addEventListener('change', () => {
      state.activeRegionals.clear();
      state.activeCidades.clear();
      state.activeEmpreendimentos.clear();
      buildTree();
      updateBtn();
      onChangeFn();
    });
    panel.appendChild(allRow);

    const allRegionais = [...new Set(
      items.filter(i => isLinked(i)).map(i => i.e.regional).filter(Boolean).filter(r => r !== 'None')
    )].sort();

    allRegionais.forEach(regional => {
      const color = colors[regional] || '#7f8c8d';

      const row = document.createElement('div');
      row.className = 'tree-item tree-regional';

      const expandBtn = document.createElement('span');
      expandBtn.className = 'tree-expand';
      expandBtn.innerHTML = '&#9654;';

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = state.activeRegionals.has(regional);

      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.background = color;

      const lbl = document.createElement('span');
      lbl.textContent = regional;
      lbl.style.cursor = 'pointer';
      lbl.addEventListener('click', () => chk.click());

      row.appendChild(expandBtn);
      row.appendChild(chk);
      row.appendChild(dot);
      row.appendChild(lbl);

      const cidadeContainer = document.createElement('div');
      cidadeContainer.className = 'tree-children';
      cidadeContainer.style.display = 'none';
      let expanded = false;

      expandBtn.addEventListener('click', e => {
        e.stopPropagation();
        expanded = !expanded;
        cidadeContainer.style.display = expanded ? 'block' : 'none';
        expandBtn.classList.toggle('expanded', expanded);
        if (expanded) buildCidades(regional, cidadeContainer);
      });

      chk.addEventListener('change', () => {
        if (chk.checked) {
          state.activeRegionals.add(regional);
        } else {
          state.activeRegionals.delete(regional);
          items
            .filter(i => isLinked(i) && i.e.regional === regional)
            .forEach(i => {
              state.activeCidades.delete(i.e.cidade);
              state.activeEmpreendimentos.delete(i.e.empreendimento || i.e.nome);
            });
        }
        if (expanded) buildCidades(regional, cidadeContainer);
        updateBtn();
        onChangeFn();
      });

      panel.appendChild(row);
      panel.appendChild(cidadeContainer);
    });
  }

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const open = panel.style.display === 'block';
    document.querySelectorAll('.filter-dropdown').forEach(d => d.style.display = 'none');
    if (!open) {
      buildTree();
      panel.style.display = 'block';
    }
  });

  document.addEventListener('click', () => { panel.style.display = 'none'; });

  wrapper.appendChild(btn);
  wrapper.appendChild(panel);
  container.appendChild(wrapper);
  updateBtn();

  wrapper._sync = () => updateBtn();
  return wrapper;
}

// ===== FILTER LOGIC =====
export function passesFilter(item) {
  if (state.somenteVinculados && !isLinked(item)) return false;

  if (state.activeRegionals.size > 0) {
    const r = isLinked(item) ? item.e.regional : null;
    if (!r || !state.activeRegionals.has(r)) return false;
  }

  if (state.activeYears.size > 0) {
    const y = isLinked(item) ? String(item.e.year ?? '') : '';
    if (!y || !state.activeYears.has(y)) return false;
  }

  if (state.activeStatus.size > 0) {
    if (!isLinked(item)) return false;
    const s = item.e.on_off === 1 ? 'Ativo' : 'Inativo';
    if (!state.activeStatus.has(s)) return false;
  }

  if (state.activeTipos.size > 0) {
    const t = isLinked(item) ? String(item.e.tipo ?? '') : '';
    if (!t || !state.activeTipos.has(t)) return false;
  }

  if (state.searchTerm) {
    const haystack = [
      item.n,
      item.e ? item.e.nome           : '',
      item.e ? item.e.cidade         : '',
      item.e ? item.e.empreendimento : '',
      item.e ? item.e.regional       : ''
    ].join(' ').toUpperCase();
    if (!haystack.includes(state.searchTerm)) return false;
  }

  if (state.activeCidades.size > 0) {
    if (!isLinked(item)) return false;
    if (!state.activeCidades.has(item.e.cidade)) return false;
  }

  if (state.activeEmpreendimentos.size > 0) {
    if (!isLinked(item)) return false;
    const emp = item.e.empreendimento || item.e.nome;
    if (!state.activeEmpreendimentos.has(emp)) return false;
  }

  return true;
}

export function getColor(item) {
  if (isLinked(item)) return colors[item.e.regional] || '#7f8c8d';
  return '#5a6e8e';
}
