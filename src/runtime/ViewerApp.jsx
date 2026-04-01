import { createSignal, createMemo, createEffect, on, onMount, onCleanup, For, Show, Switch, Match, batch } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';

export default function ViewerApp(props) {
  const runtimeOptions = props.options;
  const uiAssets = window.__JMHZ_UI_ASSETS__ || {};

  // ── Signals (was ref()) ────────────────────────────────────
  const [xmlDoc, setXmlDoc] = createSignal(null);
  const [filename, setFilename] = createSignal(runtimeOptions.filename || '');
  const [expandedEmployee, setExpandedEmployee] = createSignal(-1);
  const [fieldSearch, setFieldSearch] = createSignal('');
  const [valueSearch, setValueSearch] = createSignal('');
  const [formatRef, setFormatRef] = createSignal(null);
  const [isDirty, setIsDirty] = createSignal(false);
  const [isDragging, setIsDragging] = createSignal(false);
  const [errors, setErrors] = createSignal([]);
  const [validationCollapsed, setValidationCollapsed] = createSignal(false);
  const [validationDockHeight, setValidationDockHeight] = createSignal(0);
  const [kontrolyErrors, setKontrolyErrors] = createSignal([]);
  const [kontrolyCollapsed, setKontrolyCollapsed] = createSignal(false);
  const [kontrolyDockHeight, setKontrolyDockHeight] = createSignal(0);
  const [kontrolyFieldErrors, setKontrolyFieldErrors] = createSignal(new Map());
  const [editingField, setEditingField] = createSignal(null);
  const [editingHeaderKey, setEditingHeaderKey] = createSignal(null);
  const [toastMessage, setToastMessage] = createSignal('');
  const [fileHandle, setFileHandle] = createSignal(null);
  const [headerExpanded, setHeaderExpanded] = createSignal(false);
  const [xlsDialog, setXlsDialog] = createSignal(false);
  const [xlsOptTitle, setXlsOptTitle] = createSignal(true);
  const [xlsOptId, setXlsOptId] = createSignal(false);
  const [xlsOptCategory, setXlsOptCategory] = createSignal(false);
  const [undoStack, setUndoStack] = createSignal([]);
  const [redoStack, setRedoStack] = createSignal([]);
  const [hasValidated, setHasValidated] = createSignal(false);
  const [documentHeader, setDocumentHeader] = createSignal([]);
  const [showAllFieldsInSearch, setShowAllFieldsInSearch] = createSignal(false);
  const [autoExpandMatched, setAutoExpandMatched] = createSignal(true);
  const [actionFilter, setActionFilter] = createSignal('');
  const [validationErrors, setValidationErrors] = createSignal(new Map());

  const savedPreferredViewMode = runtimeOptions.initialViewMode ? null : localStorage.getItem('preferredViewMode');
  const [viewMode, setViewMode] = createSignal(runtimeOptions.initialViewMode || savedPreferredViewMode || 'table');
  const [showViewPicker, setShowViewPicker] = createSignal(!runtimeOptions.initialViewMode && !savedPreferredViewMode);

  // ── Stores ─────────────────────────────────────────────────
  const [employees, setEmployees] = createStore([]);
  const [expandedSections, setExpandedSections] = createStore({});
  const [collapsedSections, setCollapsedSections] = createStore({});
  const [collapsedMatchedEmps, setCollapsedMatchedEmps] = createStore({});
  const [showAllSections, setShowAllSections] = createStore({});
  const [sectionBodyHeights, setSectionBodyHeights] = createStore({});

  // ── Non-reactive refs ──────────────────────────────────────
  const sectionBodyEls = new Map();
  let fileInputEl;
  let searchInputEl;
  let valueSearchInputEl;
  let tableContentEl;
  let _searchTimer = null;

  // ── Memos (was computed()) ─────────────────────────────────
  const actionLabels = createMemo(() => { const f = formatRef(); return f ? (f.actionLabels || {}) : {}; });
  const formatName = createMemo(() => { const f = formatRef(); return f ? f.name : ''; });
  const isJmhz = createMemo(() => { const f = formatRef(); return f && f.rootElement === 'jmhz'; });
  const hasActions = createMemo(() => { const f = formatRef(); return f ? f.hasActions : false; });
  const rowInfoDefs = createMemo(() => { const f = formatRef(); return f ? (f.getRowInfo || []) : []; });
  const rowColumnLabel = createMemo(() => { const f = formatRef(); return f ? (f.rowColumnLabel || 'Jméno') : 'Jméno'; });

  function getRowLabel(emp) { return activeFormat ? activeFormat.getRowLabel(emp.fields) : (emp.surname + ' ' + emp.firstName); }
  function fieldXpath(field) { return activeFormat ? activeFormat.fieldXpath(field) : (field.section + '/@' + (field.attr || field.element)); }
  function fieldHint(field) {
    const secLabel = (SECTION_MAP[field.section] || {}).label || '';
    const xpath = fieldXpath(field);
    return secLabel ? secLabel + ' · ' + xpath : xpath;
  }
  function fieldSecLabel(field) { return (SECTION_MAP[field.section] || {}).label || ''; }

  // ── XML Parsing ────────────────────────────────────────────
  function parseXml(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    if (doc.querySelector('parsererror')) { alert('Chyba při parsování XML:\n' + doc.querySelector('parsererror').textContent); return false; }
    const format = detectFormat(doc);
    if (!format) return false;
    rebuildMetadata(format);
    batch(() => {
      setFormatRef(format);
      setXmlDoc(doc);
      setErrors([]);
      setExpandedEmployee(-1);
      setHasValidated(false);
      setValidationErrors(new Map());
      setKontrolyErrors([]);
      setKontrolyFieldErrors(new Map());
      if (window.JMHZKontroly) window.JMHZKontroly.resetKontrolyIndex();
      sectionBodyEls.clear();
      setSectionBodyHeights(reconcile({}));
      setExpandedSections(reconcile({}));
      setCollapsedSections(reconcile({}));
      setCollapsedMatchedEmps(reconcile({}));
      setActionFilter('');
      setFieldSearch('');
      setValueSearch('');
      if (searchInputEl) searchInputEl.value = '';
      if (valueSearchInputEl) valueSearchInputEl.value = '';
      const rowElements = findRows(doc, activeFormat);
      const newEmps = [];
      for (let i = 0; i < rowElements.length; i++) newEmps.push(buildEmployeeMirror(rowElements[i], i));
      setEmployees(reconcile(newEmps));
      setDocumentHeader(activeFormat?.parseDocumentHeader?.(doc) || []);
      setIsDirty(false);
    });
    updateTitle();
    return true;
  }

  function buildEmployeeMirror(rowEl, index) {
    const format = activeFormat;
    const fields = {};
    const formRoot = getFormRoot(rowEl, format);
    format.headerFields.forEach(attr => {
      const v = rowEl.getAttribute(attr) || '';
      fields[format.sections[0].id + '/' + attr] = { value: v, _norm: norm(v), el: rowEl, attr, modified: false };
    });
    const instanceCounts = {};
    const instanceOrders = {};
    format.sections.forEach(sec => {
      if (sec.id === (format.headerFields.length > 0 ? format.sections[0].id : null)) return;
      const sectionFields = FIELDS_BY_SECTION[sec.id] || [];
      if (format.resolveSectionInstances) {
        const instances = format.resolveSectionInstances(formRoot, sec);
        if (instances !== null) {
          const countKey = sec.parentRepeating || sec.id;
          if (!instanceCounts[countKey]) instanceCounts[countKey] = instances.length;
          instances.forEach(({ index: idx, el: targetEl, _orderValue }) => {
            if (_orderValue) instanceOrders[sec.id + '[' + idx + ']'] = _orderValue;
            sectionFields.forEach(f => {
              const v = format.readField(targetEl, f);
              const attrKey = format.fieldAttrKey(f);
              fields[f.section + '[' + idx + ']/' + attrKey] = { value: v, _norm: norm(v), el: targetEl, attr: attrKey, modified: false, _field: f, _instanceIndex: idx };
            });
          });
          return;
        }
      }
      const targetEl = format.resolveSection(formRoot, sec);
      sectionFields.forEach(f => {
        const v = format.readField(targetEl, f);
        const attrKey = format.fieldAttrKey(f);
        fields[f.section + '/' + attrKey] = { value: v, _norm: norm(v), el: targetEl, attr: attrKey, modified: false, _field: f };
      });
    });
    const label = format.getRowLabel(fields);
    const labelParts = label.split(/\s+/).filter(Boolean);
    return {
      _index: index, _empEl: rowEl, _formRoot: formRoot, _instanceCounts: instanceCounts, _instanceOrders: instanceOrders,
      sqnr: fields[format.sections[0]?.id + '/sqnr']?.value || String(index + 1),
      act: fields[format.sections[0]?.id + '/act']?.value || '',
      dat: fields[format.sections[0]?.id + '/dat']?.value || '',
      dep: fields[format.sections[0]?.id + '/dep']?.value || '',
      surname: labelParts[0] || '',
      firstName: labelParts.slice(1).join(' ') || '',
      empType: format.determineRowType(fields),
      fields
    };
  }

  // ── Stats memos ────────────────────────────────────────────
  const xmlVersion = createMemo(() => {
    if (!xmlDoc()) return '';
    const root = xmlDoc().documentElement;
    return root ? (root.getAttribute('version') || root.getAttribute('verze') || '') : '';
  });

  const actionSummary = createMemo(() => {
    const f = formatRef();
    if (!f || !f.hasActions) return '';
    if (!employees.length) return '';
    const counts = {};
    employees.forEach(e => { counts[e.act] = (counts[e.act] || 0) + 1; });
    const keys = Object.keys(counts).filter(Boolean);
    if (!keys.length) return '';
    if (keys.length === 1) {
      const act = keys[0];
      return (f.actionLabels || {})[act] || ('A' + act);
    }
    return keys.map(a => 'A' + a + ': ' + counts[a]).join(', ');
  });

  const employerName = createMemo(() => {
    const f = formatRef();
    if (!f || !f.stats.employer) return '';
    if (!employees.length) return '';
    return employees[0].fields[f.stats.employer]?.value || '';
  });

  const datumVyplneni = createMemo(() => {
    const f = formatRef();
    if (!f || !f.stats.date) return '';
    if (!employees.length) return '';
    const dates = new Set(employees.map(e => e.dat).filter(Boolean));
    return dates.size === 1 ? [...dates][0] : '';
  });

  const czForeignerSplit = createMemo(() => {
    const f = formatRef();
    if (!f || !f.stats.citizenship) return '';
    if (!employees.length) return '';
    const citizenKey = f.stats.citizenship;
    let cz = 0, foreign = 0;
    employees.forEach(e => {
      const cnt = e.fields[citizenKey]?.value || '';
      if (cnt === 'CZ') cz++; else if (cnt) foreign++; else cz++;
    });
    if (foreign === 0) return cz + ' CZ';
    if (cz === 0) return foreign + ' cizinců';
    return cz + ' CZ, ' + foreign + ' cizinců';
  });

  const partialAcceptValue = createMemo(() => {
    const f = formatRef();
    if (!f || !f.stats.partialAccept) return '';
    if (!xmlDoc()) return '';
    const root = xmlDoc().documentElement;
    return root ? (root.getAttribute('partialAccept') || '') : '';
  });

  function czPlural(count, one, few, many) {
    const abs = Math.abs(count);
    const mod100 = abs % 100;
    if (mod100 >= 11 && mod100 <= 14) return many;
    const mod10 = abs % 10;
    if (mod10 === 1) return one;
    if (mod10 >= 2 && mod10 <= 4) return few;
    return many;
  }
  const employeeCountText = createMemo(() => employees.length + ' ' + czPlural(employees.length, 'zaměstnanec', 'zaměstnanci', 'zaměstnanců'));
  const validationCountText = createMemo(() => errors().length + ' ' + czPlural(errors().length, 'chyba', 'chyby', 'chyb'));

  // ── Validation panel dock ──────────────────────────────────
  function updateValidationDockHeight(panelEl) {
    setValidationDockHeight(panelEl ? Math.ceil(panelEl.getBoundingClientRect().height) : 0);
  }
  function updateKontrolyDockHeight(panelEl) {
    setKontrolyDockHeight(panelEl ? Math.ceil(panelEl.getBoundingClientRect().height) : 0);
  }

  const kontrolyErrorCount = createMemo(() => kontrolyErrors().filter(e => e.severity === 'error').length);
  const kontrolyWarningCount = createMemo(() => kontrolyErrors().filter(e => e.severity === 'warning').length);

  // ── Search ─────────────────────────────────────────────────
  function splitQuery(raw) { return raw.split(',').map(s => norm(s.trim())).filter(Boolean); }

  const hasSearch = createMemo(() => {
    const fp = splitQuery(fieldSearch());
    const vp = splitQuery(valueSearch());
    return fp.length > 0 || vp.length > 0;
  });
  const hasActionFilter = createMemo(() => !!actionFilter());
  const hasCardFilter = createMemo(() => hasSearch() || hasActionFilter());

  createEffect(on(hasSearch, (val) => {
    if (!val) {
      setCollapsedSections(reconcile({}));
      setCollapsedMatchedEmps(reconcile({}));
    }
  }));

  const currentFormatGroups = createMemo(() => {
    xmlDoc(); // track dependency
    return activeFormat?.fieldGroups || [];
  });

  function applyGroupQuery(query) {
    setFieldSearch(query);
    if (searchInputEl) searchInputEl.value = query;
  }

  function onFieldSearchInput(e) {
    clearTimeout(_searchTimer);
    const val = e.target.value;
    _searchTimer = setTimeout(() => { setFieldSearch(val); }, 250);
  }
  function onValueSearchInput(e) {
    clearTimeout(_searchTimer);
    const val = e.target.value;
    _searchTimer = setTimeout(() => { setValueSearch(val); }, 250);
  }
  function clearFieldSearch(e) { e.target.value = ''; setFieldSearch(''); }
  function clearValueSearch(e) { e.target.value = ''; setValueSearch(''); }

  function fieldKey(field, instanceIndex) {
    const base = field.section + '/' + (activeFormat ? activeFormat.fieldAttrKey(field) : (field.attr || field.element));
    if (instanceIndex !== undefined) return field.section + '[' + instanceIndex + ']/' + (activeFormat ? activeFormat.fieldAttrKey(field) : (field.attr || field.element));
    return base;
  }

  const searchMatches = createMemo(() => {
    xmlDoc(); // track dependency
    const fqParts = splitQuery(fieldSearch());
    const vqParts = splitQuery(valueSearch());
    if (!fqParts.length && !vqParts.length) return null;
    const matches = new Map();
    employees.forEach(emp => {
      const empMatches = new Set();
      FIELD_META.forEach(f => {
        const sec = SECTIONS.find(s => s.id === f.section);
        const isRepeating = sec && (sec.repeating || sec.parentRepeating);
        if (isRepeating) {
          const countKey = sec.parentRepeating || sec.id;
          const count = emp._instanceCounts?.[countKey] || 0;
          for (let idx = 0; idx < count; idx++) {
            const key = fieldKey(f, idx);
            const fieldRef = emp.fields[key];
            const nVal = fieldRef?._norm || '';
            const foreignHit = f._isForeign && fqParts.some(fq => FOREIGN_KEYWORDS.some(kw => kw.includes(fq) || fq.includes(kw)));
            const fieldHit = fqParts.length === 0 || fqParts.some(fq => fieldMatchesTerm(f, fq)) || foreignHit;
            const valHit = vqParts.length === 0 || (nVal && vqParts.some(vq => nVal.includes(vq)));
            if (fieldHit && valHit && (fqParts.length > 0 || vqParts.length > 0)) empMatches.add(key);
          }
        } else {
          const key = fieldKey(f);
          const fieldRef = emp.fields[key];
          const nVal = fieldRef?._norm || '';
          const foreignHit = f._isForeign && fqParts.some(fq => FOREIGN_KEYWORDS.some(kw => kw.includes(fq) || fq.includes(kw)));
          const fieldHit = fqParts.length === 0 || fqParts.some(fq => fieldMatchesTerm(f, fq)) || foreignHit;
          const valHit = vqParts.length === 0 || (nVal && vqParts.some(vq => nVal.includes(vq)));
          if (fieldHit && valHit && (fqParts.length > 0 || vqParts.length > 0)) empMatches.add(key);
        }
      });
      if (fqParts.length > 0) {
        const nEmpName = norm(emp.surname + ' ' + emp.firstName);
        if (fqParts.some(fq => nEmpName.includes(fq) || emp.sqnr.includes(fq))) {
          empMatches.add('_card_');
        }
      }
      if (empMatches.size > 0) matches.set(emp._index, empMatches);
    });
    return matches;
  });

  function sortByName(list) {
    return [...list].sort((a, b) => {
      const na = (a.surname + ' ' + a.firstName).toLowerCase();
      const nb = (b.surname + ' ' + b.firstName).toLowerCase();
      return na < nb ? -1 : na > nb ? 1 : 0;
    });
  }

  const sortedEmployees = createMemo(() => sortByName([...employees]));

  const matchedEmployees = createMemo(() => {
    if (!searchMatches()) return [];
    return sortedEmployees().filter(e => searchMatches().has(e._index));
  });

  const unmatchedEmployees = createMemo(() => {
    if (!searchMatches()) return sortedEmployees();
    return sortedEmployees().filter(e => !searchMatches().has(e._index));
  });

  const displayList = createMemo(() => {
    if (!hasSearch()) return sortByName([...employees]).map(e => ({ type: 'card', emp: e, matched: false }));
    const matched = matchedEmployees().map(e => ({ type: 'card', emp: e, matched: true }));
    const unmatched = unmatchedEmployees().map(e => ({ type: 'card', emp: e, matched: false }));
    if (matched.length && unmatched.length) return [...matched, { type: 'separator', count: unmatched.length }, ...unmatched];
    return [...matched, ...unmatched];
  });

  const filteredEmployees = createMemo(() => {
    if (!searchMatches()) return sortByName([...employees]);
    return [...matchedEmployees(), ...unmatchedEmployees()];
  });

  const searchMatchInfo = createMemo(() => {
    if (!searchMatches()) return '';
    let totalFields = 0;
    searchMatches().forEach(s => { s.forEach(k => { if (k !== '_card_') totalFields++; }); });
    const empCount = searchMatches().size;
    return totalFields + ' shod u ' + empCount + ' zaměstnanců';
  });

  function isFieldMatch(emp, field, section) {
    if (!searchMatches()) return false;
    const empMatches = searchMatches().get(emp._index);
    if (!empMatches) return false;
    return empMatches.has(fieldKey(field, section?._instanceIndex));
  }

  function getEmpMatchCount(empIndex) {
    if (!searchMatches()) return 0;
    const matches = searchMatches().get(empIndex);
    if (!matches) return 0;
    let count = 0;
    matches.forEach(k => { if (k !== '_card_') count++; });
    return count;
  }

  // ── Employee expand/collapse ───────────────────────────────
  function toggleEmployee(index, isMatched) {
    if (autoExpandMatched() && (hasActionFilter() || (isMatched && hasSearch()))) {
      if (collapsedMatchedEmps[index]) setCollapsedMatchedEmps(index, undefined);
      else setCollapsedMatchedEmps(index, true);
    } else {
      setExpandedEmployee(expandedEmployee() === index ? -1 : index);
    }
  }

  function isEmployeeExpanded(index, isMatched) {
    if (autoExpandMatched() && (hasActionFilter() || (isMatched && hasSearch()))) {
      return !collapsedMatchedEmps[index];
    }
    return expandedEmployee() === index;
  }

  // ── View mode ──────────────────────────────────────────────
  function toggleViewMode() { setViewMode(viewMode() === 'cards' ? 'table' : 'cards'); }
  function pickViewMode(mode) { setViewMode(mode); localStorage.setItem('preferredViewMode', mode); setShowViewPicker(false); }

  // ── Table height ───────────────────────────────────────────
  function updateTableContentHeight() {
    if (!tableContentEl) return;
    const top = tableContentEl.offsetTop;
    const bottom = validationDockHeight() || 0;
    tableContentEl.style.height = Math.max(window.innerHeight - top - bottom, 100) + 'px';
  }
  createEffect(on(() => headerExpanded(), () => requestAnimationFrame(updateTableContentHeight)));
  createEffect(on(() => validationDockHeight(), updateTableContentHeight));
  createEffect(on(() => [xmlDoc(), employees.length], () => requestAnimationFrame(updateTableContentHeight)));

  // ── Visible columns (table view) ──────────────────────────
  const visibleColumns = createMemo(() => {
    xmlDoc(); // track dependency
    let cols = FIELD_META;
    const actSections = ACTION_SECTIONS ? ACTION_SECTIONS[actionFilter()] : null;
    if (actSections) {
      cols = cols.filter(f => actSections.includes(f.section));
      cols = cols.filter(f => {
        const req = getFieldReq(f, actionFilter());
        return req !== '/';
      });
    }
    const fqParts = splitQuery(fieldSearch());
    if (fqParts.length) {
      cols = cols.filter(f => {
        const foreignHit = f._isForeign && fqParts.some(fq => FOREIGN_KEYWORDS.some(kw => kw.includes(fq) || fq.includes(kw)));
        return fqParts.some(fq => fieldMatchesTerm(f, fq)) || foreignHit;
      });
    }
    const vqParts = splitQuery(valueSearch());
    if (vqParts.length && !fqParts.length) {
      const matchedCols = new Set();
      employees.forEach(emp => {
        if (!searchMatches()?.has(emp._index)) return;
        const matches = searchMatches().get(emp._index);
        matches.forEach(key => { if (key !== '_card_') matchedCols.add(key); });
      });
      cols = cols.filter(f => {
        const key = fieldKey(f);
        return matchedCols.has(key);
      });
    }
    const maxInstances = {};
    const repeatingGroups = {};
    const expanded = [];
    const emittedGroups = new Set();
    cols.forEach(f => {
      const sec = SECTIONS.find(s => s.id === f.section);
      if (sec && (sec.repeating || sec.parentRepeating)) {
        const countKey = sec.parentRepeating || sec.id;
        if (!(countKey in maxInstances)) {
          let max = 0;
          employees.forEach(emp => { max = Math.max(max, emp._instanceCounts?.[countKey] || 0); });
          maxInstances[countKey] = max;
        }
        if (!repeatingGroups[countKey]) repeatingGroups[countKey] = [];
        repeatingGroups[countKey].push(f);
      }
    });
    cols.forEach(f => {
      const sec = SECTIONS.find(s => s.id === f.section);
      if (sec && (sec.repeating || sec.parentRepeating)) {
        const countKey = sec.parentRepeating || sec.id;
        if (emittedGroups.has(countKey)) return;
        emittedGroups.add(countKey);
        const groupFields = repeatingGroups[countKey];
        for (let i = 0; i < maxInstances[countKey]; i++) {
          groupFields.forEach(gf => {
            expanded.push({ ...gf, _instanceIndex: i, _colLabel: gf.label + ' #' + (i + 1) });
          });
        }
      } else {
        expanded.push(f);
      }
    });
    return expanded;
  });

  // ── Section expand/collapse ────────────────────────────────
  function sectionMatchesFieldFilter(section) {
    const fqParts = splitQuery(fieldSearch());
    if (!fqParts.length) return false;
    return section.fields.some(f => fqParts.some(fq => fieldMatchesTerm(f, fq)));
  }
  function sectionHasMatchingFields(emp, section) {
    if (!searchMatches()?.has(emp._index)) return false;
    const matches = searchMatches().get(emp._index);
    return section.fields.some(f => matches.has(fieldKey(f, section._instanceIndex)));
  }

  function getSectionsForEmployee(emp) {
    const result = [];
    const actSections = ACTION_SECTIONS ? ACTION_SECTIONS[actionFilter()] : null;
    SECTIONS.forEach(sec => {
      if (actSections && !showAllFieldsInSearch() && !actSections.includes(sec.id)) return;
      const fields = FIELDS_BY_SECTION[sec.id] || [];
      if (!fields.length) return;
      const countKey = sec.parentRepeating || sec.id;
      const count = emp._instanceCounts?.[countKey];
      if (sec.repeating || sec.parentRepeating) {
        const n = count || 0;
        for (let i = 0; i < n; i++) {
          const orderVal = emp._instanceOrders?.[sec.id + '[' + i + ']'];
          const instanceLabel = orderVal || String(i + 1);
          result.push({ ...sec, fields, _instanceIndex: i, _virtualId: sec.id + '[' + i + ']', _baseSectionId: sec.id, label: sec.label + ' #' + instanceLabel });
        }
      } else {
        result.push({ ...sec, fields });
      }
    });
    return result;
  }

  function measureSectionBody(key) {
    const el = sectionBodyEls.get(key);
    if (el) setSectionBodyHeights(key, el.scrollHeight);
  }
  function setSectionBodyRef(key, el) {
    if (el) {
      sectionBodyEls.set(key, el);
      setSectionBodyHeights(key, el.scrollHeight);
    } else {
      sectionBodyEls.delete(key);
      setSectionBodyHeights(key, undefined);
    }
  }
  function getSectionBodyStyle(key, isExpanded) {
    if (!isExpanded) return {};
    const height = sectionBodyHeights[key];
    return height ? { 'max-height': height + 'px' } : { 'max-height': 'none' };
  }

  function toggleSection(key) {
    const parts = key.split(':');
    const empIdx = parseInt(parts[0]);
    const secId = parts.slice(1).join(':');
    if (isSectionExpanded(empIdx, secId)) {
      setExpandedSections(key, undefined);
      setCollapsedSections(key, true);
    } else {
      measureSectionBody(key);
      setExpandedSections(key, true);
      setCollapsedSections(key, undefined);
    }
  }
  function toggleAllSections(emp) {
    const sections = getSectionsForEmployee(emp);
    const allExpanded = sections.every(sec => isSectionExpanded(emp._index, sec._virtualId || sec.id, false, sec));
    sections.forEach(sec => {
      const key = emp._index + ':' + (sec._virtualId || sec.id);
      if (allExpanded) { setExpandedSections(key, undefined); setCollapsedSections(key, true); }
      else { measureSectionBody(key); setExpandedSections(key, true); setCollapsedSections(key, undefined); }
    });
  }

  function isSectionExpanded(empIdx, secId, isMatched, section) {
    const key = empIdx + ':' + secId;
    if (collapsedSections[key]) return false;
    if (hasActionFilter() && autoExpandMatched()) return true;
    if (isMatched && hasCardFilter() && searchMatches()?.has(empIdx)) {
      const matches = searchMatches().get(empIdx);
      const baseSec = section?._baseSectionId || secId;
      const sectionFields = FIELDS_BY_SECTION[baseSec] || [];
      if (sectionFields.some(f => matches.has(fieldKey(f, section?._instanceIndex)))) return true;
    }
    return !!expandedSections[key];
  }

  // ── Field access ───────────────────────────────────────────
  function getFieldValue(emp, field, section) { return emp.fields[fieldKey(field, section?._instanceIndex)]?.value || ''; }
  function isFieldModified(emp, field, section) { return emp.fields[fieldKey(field, section?._instanceIndex)]?.modified || false; }
  function getFieldRequirement(field) { return null; }
  function getFieldErrorMsg(emp, field, section) {
    const empErrors = validationErrors().get(emp._index);
    if (!empErrors) return '';
    const msgs = empErrors.get(fieldKey(field, section?._instanceIndex));
    return msgs ? msgs.join('\n') : '';
  }

  function getVisibleFields(emp, section, isMatched) {
    let fields = section.fields;
    if (actionFilter() && !showAllFieldsInSearch()) {
      fields = fields.filter(f => getFieldReq(f, actionFilter()) !== '/');
    }
    if (!isMatched || !hasSearch()) return fields;
    if (showAllFieldsInSearch()) return fields;
    const fqParts = splitQuery(fieldSearch());
    if (fqParts.length > 0) {
      return fields.filter(f => fqParts.some(fq => fieldMatchesTerm(f, fq)));
    }
    if (!searchMatches()?.has(emp._index)) return fields;
    const matches = searchMatches().get(emp._index);
    return fields.filter(f => matches.has(fieldKey(f, section._instanceIndex)));
  }

  // ── Editing ────────────────────────────────────────────────
  function startEdit(emp, field, section) {
    setEditingField(emp._index + ':' + fieldKey(field, section?._instanceIndex));
    requestAnimationFrame(() => { const el = document.querySelector('.field-value input, .field-value select'); if (el) el.focus(); });
  }
  function commitEdit(emp, field, newValue, section) {
    const key = fieldKey(field, section?._instanceIndex);
    const fieldRef = emp.fields[key];
    if (!fieldRef) return;
    const oldValue = fieldRef.value;
    if (oldValue !== newValue) {
      const empIdx = emp._index;
      setEmployees(empIdx, 'fields', key, 'value', newValue);
      setEmployees(empIdx, 'fields', key, '_norm', norm(newValue));
      setEmployees(empIdx, 'fields', key, 'modified', true);
      if (fieldRef.el) { activeFormat.writeField({ ...fieldRef, value: newValue }, newValue); }
      const newLabel = activeFormat.getRowLabel(emp.fields);
      const lp = newLabel.split(/\s+/).filter(Boolean);
      setEmployees(empIdx, 'surname', lp[0] || '');
      setEmployees(empIdx, 'firstName', lp.slice(1).join(' ') || '');
      if (key.endsWith('/act')) setEmployees(empIdx, 'act', newValue);
      if (key.endsWith('/dep')) setEmployees(empIdx, 'dep', newValue);
      setUndoStack(prev => {
        const stack = [...prev, { empIndex: empIdx, key, oldValue, newValue }];
        if (stack.length > 200) stack.shift();
        return stack;
      });
      setRedoStack([]);
      setIsDirty(true);
      updateTitle();
    }
    setEditingField(null);
  }
  function cancelEdit() { setEditingField(null); }

  function startHeaderEdit(f) {
    setEditingField('hdr:' + f.key);
    setEditingHeaderKey(f.key);
    requestAnimationFrame(() => { const el = document.querySelector('.field-value input'); if (el) el.focus(); });
  }
  function commitHeaderEdit(f, newValue) {
    const oldValue = f.value;
    if (oldValue !== newValue) {
      activeFormat.writeHeaderField(f, newValue);
      setDocumentHeader(prev => prev.map(h => h.key === f.key ? { ...h, value: newValue, modified: true } : h));
      setUndoStack(prev => {
        const stack = [...prev, { isHeader: true, headerRef: f, oldValue, newValue }];
        if (stack.length > 200) stack.shift();
        return stack;
      });
      setRedoStack([]);
      setIsDirty(true); updateTitle();
    }
    setEditingField(null);
    setEditingHeaderKey(null);
  }
  function cancelHeaderEdit() { setEditingField(null); setEditingHeaderKey(null); }
  function isEditingHeader(key) { return editingHeaderKey() === key; }

  // ── Instance management ────────────────────────────────────
  function rebuildSingleEmployee(empIndex) {
    const emp = employees[empIndex];
    if (!emp) return;
    const newMirror = buildEmployeeMirror(emp._empEl, empIndex);
    setEmployees(empIndex, reconcile(newMirror));
  }
  function addInstance(emp, section) {
    const sec = SECTIONS.find(s => s.id === (section._baseSectionId || section.id));
    if (!sec || !activeFormat.createRepeatingInstance) return;
    activeFormat.createRepeatingInstance(emp._formRoot, sec);
    rebuildSingleEmployee(emp._index);
    setIsDirty(true);
  }
  function removeInstance(emp, section) {
    if (section._instanceIndex === undefined || !activeFormat.resolveSectionInstances) return;
    const sec = SECTIONS.find(s => s.id === (section._baseSectionId || section.id));
    if (!sec) return;
    const instances = activeFormat.resolveSectionInstances(emp._formRoot, sec);
    if (!instances || section._instanceIndex >= instances.length) return;
    const el = instances[section._instanceIndex].el;
    if (el && el.parentNode) el.parentNode.removeChild(el);
    rebuildSingleEmployee(emp._index);
    setIsDirty(true);
  }

  // ── File I/O ───────────────────────────────────────────────
  function loadXmlText(xmlText, sourceName) {
    if (!xmlText) return;
    setFilename(sourceName || filename() || 'JMHZ.xml');
    setFileHandle(null);
    const parsed = parseXml(xmlText);
    if (parsed && runtimeOptions.autoValidateOnLoad) {
      queueMicrotask(() => { validateAll(); });
    }
  }
  function tryLoadBootstrapXml() {
    const inlineXml = typeof runtimeOptions.xml === 'string' ? runtimeOptions.xml.trim() : '';
    if (inlineXml) {
      loadXmlText(inlineXml, runtimeOptions.filename || 'JMHZ.xml');
      return true;
    }
    if (runtimeOptions.autoBootstrap === false) return false;
    const scriptEl = document.getElementById(runtimeOptions.bootstrapScriptId || 'jmhz-data');
    if (!scriptEl) return false;
    const rawXml = scriptEl.textContent || '';
    if (!rawXml.trim()) return false;
    loadXmlText(rawXml.trim(), scriptEl.getAttribute('data-filename') || runtimeOptions.filename || 'JMHZ.xml');
    return true;
  }
  function loadFile() { fileInputEl?.click(); }
  function handleFileSelect(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => loadXmlText(ev.target.result, file.name);
    reader.readAsText(file);
    e.target.value = '';
  }
  function handleDrop(e) {
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0] || e.dataTransfer?.items?.[0]?.getAsFile?.();
    if (!file || !file.name.endsWith('.xml')) return;
    const reader = new FileReader();
    reader.onload = (ev) => loadXmlText(ev.target.result, file.name);
    reader.readAsText(file);
  }
  function handleWindowDragOver(e) {
    if (xmlDoc()) return;
    const hasFiles = Array.from(e.dataTransfer?.types || []).includes('Files');
    if (!hasFiles) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  }
  function handleWindowDrop(e) {
    if (xmlDoc()) return;
    const hasFiles = Array.from(e.dataTransfer?.types || []).includes('Files');
    if (!hasFiles) return;
    e.preventDefault();
    handleDrop(e);
  }
  function handleWindowDragLeave(e) {
    if (xmlDoc()) return;
    if (e.relatedTarget) return;
    setIsDragging(false);
  }
  async function saveFile() {
    if (!xmlDoc()) return;
    const serializer = new XMLSerializer();
    let xmlString = serializer.serializeToString(xmlDoc());
    if (!xmlString.startsWith('<?xml')) xmlString = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + xmlString;
    const suggestedName = filename() || 'JMHZ.xml';
    if ('showSaveFilePicker' in window) {
      try {
        const handle = fileHandle() || await window.showSaveFilePicker({ suggestedName, types: [{ description: 'XML', accept: { 'application/xml': ['.xml'] } }] });
        setFileHandle(handle);
        const writable = await handle.createWritable(); await writable.write(xmlString); await writable.close();
        showToast('Uloženo: ' + suggestedName); setIsDirty(false); updateTitle(); return;
      } catch (e) { if (e.name === 'AbortError') return; }
    }
    const blob = new Blob([xmlString], { type: 'application/xml' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = suggestedName; a.click();
    showToast('Staženo: ' + suggestedName); setIsDirty(false); updateTitle();
  }
  function exportToExcel() {
    setXlsDialog(false);
    const cols = visibleColumns();
    const rows = displayList().filter(item => item.type !== 'separator');
    const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const hCell = v => `<Cell ss:StyleID="h"><Data ss:Type="String">${esc(v)}</Data></Cell>`;
    const dCell = v => `<Cell><Data ss:Type="String">${esc(v)}</Data></Cell>`;
    function colHeader(f) {
      const parts = [];
      if (xlsOptTitle()) parts.push(f._colLabel || f.label || '');
      if (xlsOptId() && f.csszId) parts.push(f.csszId);
      if (xlsOptCategory()) { const sec = fieldSecLabel(f); if (sec) parts.push(sec); }
      return parts.join(' · ');
    }
    const includeHeader = xlsOptTitle() || xlsOptId() || xlsOptCategory();
    const headerRow = includeHeader
      ? '<Row>' + [rowColumnLabel(), ...cols.map(colHeader)].map(hCell).join('') + '</Row>'
      : '';
    const dataRows = rows.map(item =>
      '<Row>' + [getRowLabel(item.emp), ...cols.map(f => getFieldValue(item.emp, f, f))].map(dCell).join('') + '</Row>'
    ).join('');
    const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="h"><Font ss:Bold="1"/></Style></Styles><Worksheet ss:Name="Export"><Table>${headerRow}${dataRows}</Table></Worksheet></Workbook>`;
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (filename() ? filename().replace(/\.xml$/i, '') : 'export') + '.xls';
    a.click();
    URL.revokeObjectURL(url);
  }
  function showToast(msg) { setToastMessage(msg); setTimeout(() => { setToastMessage(''); }, 2500); }
  function updateTitle() {
    if (!runtimeOptions.manageDocumentTitle) return;
    document.title = (isDirty() ? '* ' : '') + (filename() || 'JMHZ Viewer');
  }

  // ── XSD Validation ─────────────────────────────────────────
  function buildNodePath(node, stopNode) {
    const parts = [];
    let current = node;
    while (current && current !== stopNode && current.nodeType === 1) {
      parts.push(current.localName || current.nodeName);
      current = current.parentNode;
    }
    return parts.reverse();
  }

  function resolveJmhzFieldFromLine(lines, lineNum, elementName, emp) {
    if (!emp || !elementName || !activeFormat || activeFormat.schemasKey !== 'JMHZ_SCHEMAS') return null;
    const line = (lines[lineNum - 1] || '').trim();
    if (!line) return null;
    const targetLocalName = elementName;
    const candidates = FIELDS.filter(f => {
      const key = activeFormat.fieldAttrKey(f);
      return key === targetLocalName || key.endsWith('/' + targetLocalName);
    });
    if (candidates.length <= 1) return candidates[0] || null;
    for (const field of candidates) {
      const fieldRef = Object.values(emp.fields).find(v => v && v._field === field);
      if (!fieldRef || !fieldRef.el) continue;
      const fieldNode = fieldRef.el.nodeType === 1 ? fieldRef.el : null;
      if (!fieldNode) continue;
      const parts = (activeFormat.fieldAttrKey(field) || '').split('/');
      let targetNode = fieldNode;
      for (const part of parts) {
        targetNode = getChildByLocalName(targetNode, part);
        if (!targetNode) break;
      }
      if (!targetNode) continue;
      const pathParts = buildNodePath(targetNode, emp._formRoot);
      const joined = pathParts.join('/');
      const expected = field.section + '/' + activeFormat.fieldAttrKey(field);
      if (joined === expected || joined.endsWith('/' + expected)) return field;
    }
    return candidates[0] || null;
  }

  async function validateAll() {
    if (!xmlDoc()) return;
    batch(() => {
      setErrors([]);
      setValidationErrors(new Map());
      const hdr = documentHeader();
      setDocumentHeader(prev => prev.map(h => ({ ...h, _hasError: false })));
      setHasValidated(true);
    });

    const serializer = new XMLSerializer();
    let xmlString = serializer.serializeToString(xmlDoc());
    if (!xmlString.startsWith('<?xml')) xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlString;

    const lines = xmlString.split('\n');
    const empStartLines = [];
    let empIdx = 0;
    const rowElName = activeFormat.rowElement;
    const rowPattern = new RegExp('<[a-zA-Z0-9]*:?' + rowElName + '[\\s>]');
    lines.forEach((line, i) => {
      if (rowPattern.test(line)) {
        empStartLines.push({ line: i + 1, index: empIdx++ });
      }
    });
    function lineToEmpIndex(lineNum) {
      let idx = -1;
      for (const entry of empStartLines) {
        if (entry.line <= lineNum) idx = entry.index;
        else break;
      }
      return idx;
    }

    const SCHEMA_MAP = { 'DEFAULT_SCHEMAS': DEFAULT_SCHEMAS, 'JMHZ_SCHEMAS': JMHZ_SCHEMAS };
    const schemas = SCHEMA_MAP[activeFormat.schemasKey] || DEFAULT_SCHEMAS;
    const mainSchemaName = activeFormat.mainSchema || null;
    let validateOpts;
    if (mainSchemaName && schemas[mainSchemaName]) {
      const mainSchema = [{ fileName: mainSchemaName, contents: schemas[mainSchemaName] }];
      const preload = Object.keys(schemas).filter(n => n !== mainSchemaName).map(name => ({ fileName: name, contents: schemas[name] }));
      validateOpts = { xml: [{ fileName: 'document.xml', contents: xmlString }], schema: mainSchema, preload };
    } else {
      const schemaFiles = Object.keys(schemas).map(name => ({ fileName: name, contents: schemas[name] }));
      validateOpts = { xml: [{ fileName: 'document.xml', contents: xmlString }], schema: schemaFiles };
    }

    try {
      const result = await validateXML(validateOpts);

      if (!result.valid && result.errors.length > 0) {
        const newErrors = [];
        const newValidationErrors = new Map();
        const headerErrorKeys = new Set();

        result.errors.forEach(err => {
          const errMsg = err.rawMessage || err.message || '';
          let lineNum = -1;
          if (err.loc && err.loc.lineNumber) lineNum = err.loc.lineNumber;

          const ei = lineToEmpIndex(lineNum);
          const emp = ei >= 0 ? employees[ei] : null;
          const employeeName = emp ? getRowLabel(emp) : '';

          let elementName = '';
          const elemMatch = errMsg.match(/Element '\{[^}]*\}([^']+)'/);
          if (elemMatch) elementName = elemMatch[1];

          let attrName = '';
          const attrMatch = errMsg.match(/attribute '([^']+)'/);
          if (attrMatch) attrName = attrMatch[1];

          let fk = '';
          let sectionLabel = elementName;
          if (attrName) {
            const attrOrElement = attrName;
            const field = FIELDS.find(f => (f.attr === attrOrElement || f.element === attrOrElement) && (
              f.section === elementName ||
              f.section.endsWith('/' + elementName) ||
              f.section.split('/').pop() === elementName
            ));
            if (field) {
              fk = field.section + '/' + (activeFormat ? activeFormat.fieldAttrKey(field) : (field.attr || field.element));
              const sec = SECTION_MAP[field.section];
              sectionLabel = sec ? sec.label : elementName;
            } else {
              fk = elementName + '/' + attrName;
            }
          } else if (elementName) {
            let field = null;
            if (activeFormat.schemasKey === 'JMHZ_SCHEMAS') {
              field = resolveJmhzFieldFromLine(lines, lineNum, elementName, emp);
            }
            if (!field) field = FIELDS.find(f => (f.element === elementName || f.attr === elementName));
            if (field) {
              fk = field.section + '/' + (activeFormat ? activeFormat.fieldAttrKey(field) : (field.attr || field.element));
              const sec = SECTION_MAP[field.section];
              sectionLabel = sec ? sec.label : elementName;
              attrName = elementName;
            }
          }

          if (ei >= 0 && fk) {
            if (!newValidationErrors.has(ei)) newValidationErrors.set(ei, new Map());
            const empErrors = newValidationErrors.get(ei);
            const matchedField = FIELDS.find(f => fk === f.section + '/' + (activeFormat ? activeFormat.fieldAttrKey(f) : (f.attr || f.element)));
            const matchedSec = matchedField ? SECTIONS.find(s => s.id === matchedField.section) : null;
            if (matchedSec && (matchedSec.repeating || matchedSec.parentRepeating)) {
              const empObj = employees[ei];
              const countKey = matchedSec.parentRepeating || matchedSec.id;
              const count = empObj?._instanceCounts?.[countKey] || 0;
              for (let idx = 0; idx < count; idx++) {
                const iKey = matchedField.section + '[' + idx + ']/' + (activeFormat ? activeFormat.fieldAttrKey(matchedField) : (matchedField.attr || matchedField.element));
                if (!empErrors.has(iKey)) empErrors.set(iKey, []);
                empErrors.get(iKey).push(err.message);
              }
            } else {
              if (!empErrors.has(fk)) empErrors.set(fk, []);
              empErrors.get(fk).push(err.message);
            }
          }

          let headerKey = '';
          if (ei < 0) {
            const hdr = documentHeader().find(h => {
              if (attrName && h.attr === attrName) return true;
              if (elementName && h.key && h.key.endsWith('/' + elementName)) return true;
              return false;
            });
            if (hdr) { headerKey = hdr.key; headerErrorKeys.add(hdr.key); }
          }

          newErrors.push({
            severity: 'error', empIndex: ei, employeeName, sectionLabel,
            fieldLabel: attrName, fieldKey: fk, headerKey,
            canNavigate: Boolean(headerKey || (ei >= 0 && fk)),
            message: err.message
          });
        });
        batch(() => {
          setErrors(newErrors);
          setValidationErrors(newValidationErrors);
          setDocumentHeader(prev => prev.map(h => headerErrorKeys.has(h.key) ? { ...h, _hasError: true } : h));
        });
        showToast(newErrors.length + ' chyb nalezeno');
      } else {
        showToast('Validace OK — žádné chyby');
      }
    } catch (e) {
      console.error('Validation error:', e);
      setErrors([{ severity: 'error', empIndex: -1, employeeName: '', sectionLabel: '', fieldLabel: '', fieldKey: '', message: 'Chyba validace: ' + String(e) }]);
      showToast('Chyba při validaci');
    }
  }

  // ── Kontroly ───────────────────────────────────────────────
  function runKontroly() {
    if (!xmlDoc() || !isJmhz()) return;
    setKontrolyErrors([]);
    setKontrolyFieldErrors(new Map());
    setDocumentHeader(prev => prev.map(h => ({ ...h, _hasKontrolyError: false, _hasKontrolyWarning: false })));
    try {
      if (typeof window.JMHZKontroly === 'undefined') {
        showToast('Kontroly nejsou k dispozici');
        return;
      }
      const results = window.JMHZKontroly.runKontroly(
        xmlDoc(),
        [...employees],
        documentHeader(),
        FIELDS,
        FIELDS_BY_SECTION
      );
      const fMap = new Map();
      const hdrErrors = new Set();
      const hdrWarnings = new Set();
      results.forEach(r => {
        if (r.headerKey) {
          if (r.severity === 'error') hdrErrors.add(r.headerKey);
          else hdrWarnings.add(r.headerKey);
        }
        if (r.empIndex >= 0 && r.fieldKey) {
          if (!fMap.has(r.empIndex)) fMap.set(r.empIndex, new Map());
          const empMap = fMap.get(r.empIndex);
          const existing = empMap.get(r.fieldKey);
          if (!existing || (r.severity === 'error' && existing === 'warning'))
            empMap.set(r.fieldKey, r.severity);
        }
      });
      batch(() => {
        setKontrolyErrors(results);
        setKontrolyFieldErrors(fMap);
        if (hdrErrors.size || hdrWarnings.size) {
          setDocumentHeader(prev => prev.map(h => {
            if (hdrErrors.has(h.key)) return { ...h, _hasKontrolyError: true };
            if (hdrWarnings.has(h.key)) return { ...h, _hasKontrolyWarning: true };
            return h;
          }));
        }
      });
      if (results.length > 0) {
        const errCount = results.filter(e => e.severity === 'error').length;
        const warnCount = results.filter(e => e.severity === 'warning').length;
        const parts = [];
        if (errCount > 0) parts.push(errCount + ' ' + czPlural(errCount, 'chyba', 'chyby', 'chyb'));
        if (warnCount > 0) parts.push(warnCount + ' varování');
        showToast('Kontroly: ' + parts.join(', '));
      } else {
        showToast('Kontroly OK — žádné nálezy');
      }
    } catch (e) {
      console.error('Kontroly error:', e);
      setKontrolyErrors([{ severity: 'error', controlId: 0, empIndex: -1, employeeName: '', sectionLabel: '', fieldLabel: '', fieldKey: '', headerKey: '', canNavigate: false, message: 'Chyba při spuštění kontrol: ' + String(e) }]);
      showToast('Chyba při spuštění kontrol');
    }
  }

  // ── Error helpers ──────────────────────────────────────────
  function hasFieldError(emp, field, section) {
    const fk = fieldKey(field, section?._instanceIndex);
    const empErrors = validationErrors().get(emp._index);
    if (empErrors && empErrors.has(fk)) return true;
    const kErrors = kontrolyFieldErrors().get(emp._index);
    return kErrors ? kErrors.get(fk) === 'error' : false;
  }

  function hasFieldWarning(emp, field, section) {
    const kErrors = kontrolyFieldErrors().get(emp._index);
    if (!kErrors) return false;
    return kErrors.get(fieldKey(field, section?._instanceIndex)) === 'warning';
  }

  function getSectionErrorCount(empIndex, sectionId, section) {
    let count = 0;
    const baseSec = section?._baseSectionId || sectionId;
    const sectionFields = FIELDS_BY_SECTION[baseSec] || [];
    const empErrors = validationErrors().get(empIndex);
    const kErrors = kontrolyFieldErrors().get(empIndex);
    sectionFields.forEach(f => {
      const fk = fieldKey(f, section?._instanceIndex);
      if ((empErrors && empErrors.has(fk)) || (kErrors && kErrors.has(fk))) count++;
    });
    return count;
  }

  function getEmployeeErrorCount(empIndex) {
    const empErrors = validationErrors().get(empIndex);
    const kErrors = kontrolyFieldErrors().get(empIndex);
    const keys = new Set();
    if (empErrors) empErrors.forEach((_, k) => keys.add(k));
    if (kErrors) kErrors.forEach((_, k) => keys.add(k));
    return keys.size;
  }

  function navigateToError(err) {
    if (err.headerKey) {
      setHeaderExpanded(true);
      requestAnimationFrame(() => {
        const el = document.querySelector('[data-hdr-key="' + err.headerKey + '"]');
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1500); }
      });
    } else if (err.empIndex >= 0) {
      if (viewMode() === 'table') {
        requestAnimationFrame(() => {
          const el = document.querySelector('[data-err-id="e' + err.empIndex + '-' + (err.fieldKey || '') + '"]');
          if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1500); }
        });
      } else {
        batch(() => {
          setFieldSearch('');
          setValueSearch('');
          if (searchInputEl) searchInputEl.value = '';
          if (valueSearchInputEl) valueSearchInputEl.value = '';
          setExpandedEmployee(err.empIndex);
          setCollapsedMatchedEmps(err.empIndex, undefined);
          if (err.fieldKey) {
            let sectionId = err.fieldKey.substring(0, err.fieldKey.lastIndexOf('/'));
            const sec = SECTIONS.find(s => s.id === sectionId);
            if (sec && (sec.repeating || sec.parentRepeating)) sectionId = sectionId + '[0]';
            const secKey = err.empIndex + ':' + sectionId;
            setExpandedSections(secKey, true);
            setCollapsedSections(secKey, undefined);
          }
        });
        setTimeout(() => {
          const selector = '[data-err-id="e' + err.empIndex + '-' + (err.fieldKey || '') + '"]';
          const el = document.querySelector(selector);
          if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1500); }
        }, 150);
      }
    }
  }

  // ── Keyboard shortcuts ─────────────────────────────────────
  function handleKeyDown(e) {
    if (e.ctrlKey && e.key === 'o') { e.preventDefault(); loadFile(); }
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveFile(); }
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      const stack = undoStack();
      if (stack.length) {
        const entry = stack[stack.length - 1];
        batch(() => {
          setUndoStack(stack.slice(0, -1));
          if (entry.isHeader) {
            activeFormat.writeHeaderField(entry.headerRef, entry.oldValue);
            setDocumentHeader(prev => prev.map(h => h.key === entry.headerRef.key ? { ...h, value: entry.oldValue } : h));
          } else {
            const emp = employees[entry.empIndex];
            if (emp?.fields[entry.key]) {
              setEmployees(entry.empIndex, 'fields', entry.key, 'value', entry.oldValue);
              const fr = emp.fields[entry.key];
              if (fr.el) { activeFormat.writeField({ ...fr, value: entry.oldValue }, entry.oldValue); }
            }
          }
          setRedoStack(prev => [...prev, entry]);
        });
      }
    }
    if (e.ctrlKey && e.key === 'y') {
      e.preventDefault();
      const stack = redoStack();
      if (stack.length) {
        const entry = stack[stack.length - 1];
        batch(() => {
          setRedoStack(stack.slice(0, -1));
          if (entry.isHeader) {
            activeFormat.writeHeaderField(entry.headerRef, entry.newValue);
            setDocumentHeader(prev => prev.map(h => h.key === entry.headerRef.key ? { ...h, value: entry.newValue } : h));
          } else {
            const emp = employees[entry.empIndex];
            if (emp?.fields[entry.key]) {
              setEmployees(entry.empIndex, 'fields', entry.key, 'value', entry.newValue);
              const fr = emp.fields[entry.key];
              if (fr.el) { activeFormat.writeField({ ...fr, value: entry.newValue }, entry.newValue); }
            }
          }
          setUndoStack(prev => [...prev, entry]);
        });
      }
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────
  onMount(() => {
    window.addEventListener('resize', updateTableContentHeight);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);
    window.addEventListener('dragleave', handleWindowDragLeave);
    document.addEventListener('keydown', handleKeyDown);
    updateTitle();
    tryLoadBootstrapXml();
  });

  if (runtimeOptions.warnBeforeUnload) {
    const beforeUnload = (e) => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    onCleanup(() => window.removeEventListener('beforeunload', beforeUnload));
  }

  onCleanup(() => {
    window.removeEventListener('resize', updateTableContentHeight);
    window.removeEventListener('dragover', handleWindowDragOver);
    window.removeEventListener('drop', handleWindowDrop);
    window.removeEventListener('dragleave', handleWindowDragLeave);
    document.removeEventListener('keydown', handleKeyDown);
    clearTimeout(_searchTimer);
  });

  // ── Expose API to handle ───────────────────────────────────
  Object.assign(props.handle, {
    validate: () => validateAll(),
    loadXml: (xml, fn) => loadXmlText(xml, fn),
    getState: () => ({
      filename: filename(),
      isDirty: isDirty(),
      errorCount: errors().length,
      employeeCount: employees.length,
      hasData: !!xmlDoc()
    })
  });

  // ── JSX ────────────────────────────────────────────────────
  return (
    <>
      {/* Toolbar */}
      <div class="toolbar">
        <div class="toolbar-left">
          <img src={uiAssets.logo} alt="ABRA" style="flex-shrink: 0; height: 28px; width: auto;" />
          <span style="font-weight: 600; font-size: 0.875rem; color: var(--text-primary);">JMHZ Viewer</span>
        </div>
        <div class="toolbar-center"></div>
        <div class="toolbar-actions">
          <Show when={xmlDoc()}><button onClick={loadFile}>Nahrát XML</button></Show>
          <Show when={xmlDoc()}><button class="primary" onClick={saveFile}>Uložit XML</button></Show>
          <Show when={xmlDoc()}><button onClick={validateAll}>Zkontrolovat</button></Show>
          <Show when={xmlDoc() && isJmhz()}><button onClick={runKontroly}>Kontroly</button></Show>
          <Show when={xmlDoc()}><button onClick={toggleViewMode}>Zobrazení: {viewMode() === 'cards' ? 'Karty' : 'Tabulka'}</button></Show>
          <Show when={xmlDoc()}><button onClick={() => setXlsDialog(true)}>Export XLS</button></Show>
        </div>
        <Show when={!xmlDoc()}>
          <span class="privacy-note toolbar-empty-note">Tento nástroj funguje zcela ve vašem prohlížeči, žádná data se nikdy neodesílají na server</span>
        </Show>
      </div>

      {/* XLS Export Dialog */}
      <Show when={xlsDialog()}>
        <div style="position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35)" onClick={(e) => { if (e.target === e.currentTarget) setXlsDialog(false); }}>
          <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--sp-6);min-width:280px;display:flex;flex-direction:column;gap:var(--sp-4);">
            <div style="font-weight:600;font-size:.9375rem;">Možnosti exportu</div>
            <div style="display:flex;flex-direction:column;gap:var(--sp-2);">
              <label style="display:flex;align-items:center;gap:var(--sp-2);cursor:pointer;"><input type="checkbox" checked={xlsOptTitle()} onChange={(e) => setXlsOptTitle(e.target.checked)} /> Název sloupce</label>
              <label style="display:flex;align-items:center;gap:var(--sp-2);cursor:pointer;"><input type="checkbox" checked={xlsOptId()} onChange={(e) => setXlsOptId(e.target.checked)} /> ID pole</label>
              <label style="display:flex;align-items:center;gap:var(--sp-2);cursor:pointer;"><input type="checkbox" checked={xlsOptCategory()} onChange={(e) => setXlsOptCategory(e.target.checked)} /> Kategorie</label>
            </div>
            <div style="display:flex;gap:var(--sp-2);justify-content:flex-end;">
              <button class="btn" onClick={() => setXlsDialog(false)}>Zrušit</button>
              <button class="btn primary" onClick={exportToExcel}>Exportovat</button>
            </div>
          </div>
        </div>
      </Show>

      {/* View mode picker (first visit) */}
      <Show when={showViewPicker() && xmlDoc() && employees.length > 0}>
        <div class="view-picker-overlay" onClick={(e) => { if (e.target === e.currentTarget) pickViewMode('table'); }}>
          <div class="view-picker-box">
            <h2>Zvolte výchozí zobrazení</h2>
            <p>Můžete kdykoliv přepnout tlačítkem v horní liště</p>
            <div class="view-picker-options">
              <div class="view-picker-card" onClick={() => pickViewMode('table')}>
                <div class="view-picker-preview"><img src={uiAssets.previewTable} alt="Tabulka" /></div>
                <h3>Tabulka</h3>
                <span>Přehled všech zaměstnanců a hodnot na jednom místě. Rychlé porovnávání a hromadné kontroly.</span>
              </div>
              <div class="view-picker-card" onClick={() => pickViewMode('cards')}>
                <div class="view-picker-preview"><img src={uiAssets.previewCards} alt="Karty" /></div>
                <h3>Karty</h3>
                <span>Přehledné zobrazení po sekcích. Ideální pro menší soubory a kontrolu jednotlivých záznamů.</span>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Top Controls */}
      <Show when={xmlDoc() && employees.length > 0}>
        <div class="top-controls">
          <div class="global-search">
            <div class="header-card" classList={{ expanded: headerExpanded() }} style="margin-bottom: var(--sp-3);">
              <div class="header-card-header" onClick={() => setHeaderExpanded(!headerExpanded())}>
                <span class="header-card-info"><span class="stat-label">{formatName()}</span> <Show when={xmlVersion()}><span class="header-card-info-value">{xmlVersion()}</span></Show></span>
                <span class="header-card-info"><span class="header-card-info-value">{employeeCountText()}</span></span>
                <Show when={hasValidated()}>
                  <span class="header-card-info"><span class="stat-label">Kontrola:</span> <span class={errors().length > 0 ? 'stat-error' : 'stat-ok'}>{validationCountText()}</span></span>
                </Show>
                <Show when={filename()}>
                  <span class="header-card-info header-card-info-filename"><span class="header-card-info-value">{filename()}{isDirty() ? ' *' : ''}</span></span>
                </Show>
                <span class="spacer"></span>
                <span class="header-toggle-text">{headerExpanded() ? 'Skrýt hlavičku' : 'Zobrazit hlavičku'}</span>
              </div>
              <Show when={headerExpanded()}>
                <div class="header-card-body">
                  <div class="section-card">
                    <div class="section-body" style="max-height:none;">
                      <table class="field-table">
                        <For each={documentHeader()}>{(f) =>
                          <tr class="field-row" classList={{ 'has-error': f._hasError || f._hasKontrolyError, 'has-warning': !f._hasError && !f._hasKontrolyError && f._hasKontrolyWarning }} data-hdr-key={f.key}>
                            <td class="field-id"></td>
                            <td class="field-label">{f.label}</td>
                            <td class="field-value" onClick={() => !isEditingHeader(f.key) && startHeaderEdit(f)}>
                              <Show when={isEditingHeader(f.key)} fallback={
                                <span class="editable-header" classList={{ 'header-modified': f.modified, 'has-error': f._hasError || f._hasKontrolyError, 'has-warning': !f._hasError && !f._hasKontrolyError && f._hasKontrolyWarning }}>
                                  <Show when={f.modified}><span class="modified-dot"></span></Show>
                                  {f.value || '—'}
                                </span>
                              }>
                                <input type="text" value={f.value} onBlur={(e) => commitHeaderEdit(f, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') commitHeaderEdit(f, e.target.value); if (e.key === 'Escape') cancelHeaderEdit(); }} ref={el => setTimeout(() => el.focus())} />
                              </Show>
                            </td>
                          </tr>
                        }</For>
                        <Show when={employerName()}>
                          <tr class="field-row"><td class="field-id"></td><td class="field-label">Zaměstnavatel</td><td class="field-value">{employerName()}</td></tr>
                        </Show>
                        <Show when={datumVyplneni()}>
                          <tr class="field-row"><td class="field-id"></td><td class="field-label">Datum</td><td class="field-value">{datumVyplneni()}</td></tr>
                        </Show>
                        <Show when={actionSummary()}>
                          <tr class="field-row"><td class="field-id"></td><td class="field-label">Akce</td><td class="field-value">{actionSummary()}</td></tr>
                        </Show>
                        <Show when={czForeignerSplit()}>
                          <tr class="field-row"><td class="field-id"></td><td class="field-label">Rozdělení</td><td class="field-value">{czForeignerSplit()}</td></tr>
                        </Show>
                      </table>
                    </div>
                  </div>
                </div>
              </Show>
            </div>
            <div class="search-row">
              <div style="flex: 1; position: relative; display: flex; align-items: center;">
                <input ref={searchInputEl} placeholder="Filtrovat zobrazená pole — ID, název, XML cesta..." onInput={onFieldSearchInput} onKeyDown={(e) => e.key === 'Escape' && clearFieldSearch(e)} style="flex: 1;" />
                <span class="search-help" title={"Filtrovat pole:\n• ID — 10053, 10228\n• Název — příjmení, datum narození\n• Název sekce — zobrazí celou kategorii\n• Sekce + pole — trvalé bydliště PSČ\nOddělte čárkou pro více filtrů"}>?</span>
              </div>
              <input ref={valueSearchInputEl} placeholder="Hledat v hodnotách..." onInput={onValueSearchInput} onKeyDown={(e) => e.key === 'Escape' && clearValueSearch(e)} />
            </div>
          </div>

          {/* Group filter pills */}
          <Show when={currentFormatGroups().length > 0}>
            <div class="group-filter-bar">
              <div class="group-filter-pills">
                <For each={currentFormatGroups()}>{(group) =>
                  <button class="group-pill" classList={{ active: fieldSearch() === group.query }}
                    onClick={() => fieldSearch() === group.query ? applyGroupQuery('') : applyGroupQuery(group.query)}>
                    {group.label}
                  </button>
                }</For>
              </div>
            </div>
          </Show>

          <Show when={hasSearch() || hasActions()}>
            <div style="display: flex; align-items: center; gap: 16px; padding: 0 36px 6px; max-width: 1000px; margin: 0 auto; width: 100%; font-size: 0.75rem; color: var(--text-muted);">
              <Show when={hasCardFilter() && viewMode() === 'cards'}>
                <label style="font-size: 12px; color: #6B7280; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                  <input type="checkbox" checked={autoExpandMatched()} onChange={(e) => setAutoExpandMatched(e.target.checked)} /> Automaticky rozbalit
                </label>
              </Show>
              <Show when={hasCardFilter() && viewMode() === 'cards'}>
                <label style="font-size: 12px; color: #6B7280; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                  <input type="checkbox" checked={showAllFieldsInSearch()} onChange={(e) => setShowAllFieldsInSearch(e.target.checked)} /> Zobrazit všechna pole
                </label>
              </Show>
              <Show when={hasActions()}>
                <span style="font-size: 12px; color: #6B7280; display: flex; align-items: center; gap: 4px;">
                  Akce:
                  <span class="action-filter">
                    <For each={['', '1', '2', '3', '4', '8']}>{(a) =>
                      <button onClick={() => setActionFilter(a)} classList={{ active: actionFilter() === a }}>{a ? 'A' + a : 'Vše'}</button>
                    }</For>
                  </span>
                </span>
              </Show>
              <Show when={(fieldSearch() || valueSearch()) && searchMatchInfo()}>
                <span class="match-count" style="margin-left: auto;">{searchMatchInfo()}</span>
              </Show>
            </div>
          </Show>
        </div>
      </Show>

      {/* Table View */}
      <Show when={xmlDoc() && employees.length > 0 && viewMode() === 'table' && !showViewPicker()}>
        <div class="table-content" ref={(el) => { tableContentEl = el; requestAnimationFrame(updateTableContentHeight); }}>
          <div class="table-view">
            <table>
              <thead>
                <tr>
                  <th class="name-col">{rowColumnLabel()}</th>
                  <For each={visibleColumns()}>{(field, ci) =>
                    <th>
                      {field._colLabel || field.label}<span class="col-id">{field.csszId || ''}</span>
                      <span class="col-sec">{fieldSecLabel(field)}</span>
                      <Show when={actionFilter() && getFieldReq(field, actionFilter())}>
                        <span class={"col-req " + reqClass(getFieldReq(field, actionFilter()))} title={REQ_TITLES[getFieldReq(field, actionFilter())] || ''}>{getFieldReq(field, actionFilter())}</span>
                      </Show>
                    </th>
                  }</For>
                </tr>
              </thead>
              <tbody>
                <For each={displayList()}>{(item) =>
                  <Show when={item.type !== 'separator'} fallback={
                    <tr class="separator-row"><td colSpan={visibleColumns().length + 1}>{item.count} dalších zaměstnanců</td></tr>
                  }>
                    <tr classList={{ matched: item.matched }}>
                      <td class="name-cell">
                        <Show when={getEmployeeErrorCount(item.emp._index) > 0}><span class="error-dot-sm"></span></Show>
                        {getRowLabel(item.emp)}
                      </td>
                      <For each={visibleColumns()}>{(field, ci) =>
                        <td classList={{ 'has-error': hasFieldError(item.emp, field, field), 'has-warning': hasFieldWarning(item.emp, field, field), 'cell-match': item.matched && isFieldMatch(item.emp, field, field) }}
                            data-err-id={'e' + item.emp._index + '-' + fieldKey(field, field._instanceIndex)}
                            onClick={() => startEdit(item.emp, field, field)}>
                          <Show when={editingField() === item.emp._index + ':' + fieldKey(field, field._instanceIndex)} fallback={
                            <>{getFieldValue(item.emp, field, field) || <span class="cell-empty"></span>}</>
                          }>
                            <Switch>
                              <Match when={field.type === 'date'}>
                                <input type="date" value={getFieldValue(item.emp, field, field)}
                                  onBlur={(e) => commitEdit(item.emp, field, e.target.value, field)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(item.emp, field, e.target.value, field); if (e.key === 'Escape') cancelEdit(); }}
                                  ref={el => setTimeout(() => el.focus())} />
                              </Match>
                              <Match when={field.type === 'boolean'}>
                                <select value={getFieldValue(item.emp, field, field)}
                                  onChange={(e) => commitEdit(item.emp, field, e.target.value, field)}
                                  onBlur={(e) => commitEdit(item.emp, field, e.target.value, field)}
                                  onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit(); }}
                                  ref={el => setTimeout(() => el.focus())}>
                                  <option value="">—</option><option value="A">A</option><option value="N">N</option>
                                </select>
                              </Match>
                              <Match when={true}>
                                <input type="text" value={getFieldValue(item.emp, field, field)} maxLength={field.maxLength || undefined}
                                  onBlur={(e) => commitEdit(item.emp, field, e.target.value, field)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(item.emp, field, e.target.value, field); if (e.key === 'Escape') cancelEdit(); }}
                                  ref={el => setTimeout(() => el.focus())} />
                              </Match>
                            </Switch>
                          </Show>
                        </td>
                      }</For>
                    </tr>
                  </Show>
                }</For>
              </tbody>
            </table>
          </div>
        </div>
      </Show>

      {/* Card View */}
      <Show when={xmlDoc() && employees.length > 0 && viewMode() === 'cards' && !showViewPicker()}>
        <div class="content"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); handleDrop(e); }}>
          <div class="content-inner">
            <For each={displayList()}>{(item) =>
              <Show when={item.type !== 'separator'} fallback={
                <div class="search-separator">{item.count} dalších zaměstnanců</div>
              }>
                <div class="emp-card" classList={{ expanded: isEmployeeExpanded(item.emp._index, item.matched), 'has-matches': item.matched }}>
                  <div class="emp-card-header" onClick={() => toggleEmployee(item.emp._index, item.matched)}>
                    <span class="emp-name">{getRowLabel(item.emp)}</span>
                    <For each={rowInfoDefs()}>{(info) =>
                      <span class="info-item"><span class="info-label">{info.label}:</span><span class={item.emp.fields[info.key]?.value ? 'info-value' : 'info-empty'}>{item.emp.fields[info.key]?.value || '—'}</span></span>
                    }</For>
                    <span class="spacer"></span>
                    <Show when={getEmployeeErrorCount(item.emp._index) > 0}>
                      <span class="error-dot" title={getEmployeeErrorCount(item.emp._index) + ' chyb'}></span>
                    </Show>
                    <Show when={item.matched && getEmpMatchCount(item.emp._index) > 0}>
                      <span class="match-badge">{getEmpMatchCount(item.emp._index)} shod</span>
                    </Show>
                    <Show when={isEmployeeExpanded(item.emp._index, item.matched)}>
                      <span class="expand-all-btn" onClick={(e) => { e.stopPropagation(); toggleAllSections(item.emp); }} title="Rozbalit/sbalit všechny sekce">
                        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M4 6l4-4 4 4H4zm0 4l4 4 4-4H4z"/></svg>
                      </span>
                    </Show>
                  </div>
                  <Show when={isEmployeeExpanded(item.emp._index, item.matched)}>
                    <div class="emp-card-body">
                      <For each={getSectionsForEmployee(item.emp)}>{(section) =>
                        <Show when={!item.matched || sectionMatchesFieldFilter(section) || sectionHasMatchingFields(item.emp, section) || showAllFieldsInSearch()}>
                          <div class="section-card">
                            <div class="section-header" onClick={(e) => { e.stopPropagation(); toggleSection(item.emp._index + ':' + (section._virtualId || section.id)); }}>
                              <svg class="section-chevron" classList={{ expanded: isSectionExpanded(item.emp._index, section._virtualId || section.id, item.matched, section) }} viewBox="0 0 16 16" fill="currentColor"><path d="M6 3l5 5-5 5V3z"/></svg>
                              <span class="section-title">{section.label}</span>
                              <Show when={getSectionErrorCount(item.emp._index, section._virtualId || section.id, section) > 0}>
                                <span class="section-badge errors">{getSectionErrorCount(item.emp._index, section._virtualId || section.id, section)}</span>
                              </Show>
                              <Show when={section._instanceIndex !== undefined}>
                                <button class="btn-remove-instance" onClick={(e) => { e.stopPropagation(); removeInstance(item.emp, section); }} title="Odebrat instanci" style="margin-left:auto;background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:14px;padding:0 4px;">&times;</button>
                              </Show>
                              <Show when={section.repeating && section._instanceIndex === 0}>
                                <button class="btn-add-instance" onClick={(e) => { e.stopPropagation(); addInstance(item.emp, section); }} title="Přidat instanci" style="margin-left:4px;background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:14px;padding:0 4px;">+</button>
                              </Show>
                            </div>
                            <div class="section-body"
                              classList={{ collapsed: !isSectionExpanded(item.emp._index, section._virtualId || section.id, item.matched, section) }}
                              ref={(el) => setSectionBodyRef(item.emp._index + ':' + (section._virtualId || section.id), el)}
                              style={getSectionBodyStyle(item.emp._index + ':' + (section._virtualId || section.id), isSectionExpanded(item.emp._index, section._virtualId || section.id, item.matched, section))}>
                              <table class="field-table">
                                <For each={getVisibleFields(item.emp, section, item.matched)}>{(field) =>
                                  <tr class="field-row"
                                    classList={{ 'has-error': hasFieldError(item.emp, field, section), 'has-warning': hasFieldWarning(item.emp, field, section), 'field-match': item.matched && isFieldMatch(item.emp, field, section) }}
                                    data-field-id={field.csszId}
                                    data-err-id={'e' + item.emp._index + '-' + fieldKey(field, section._instanceIndex)}>
                                    <td class="field-id">{field.csszId || ''}</td>
                                    <td class="field-label">
                                      {field.label}
                                      <Show when={actionFilter() && getFieldReq(field, actionFilter())}>
                                        <span class={"col-req " + reqClass(getFieldReq(field, actionFilter()))} title={REQ_TITLES[getFieldReq(field, actionFilter())] || ''}>{getFieldReq(field, actionFilter())}</span>
                                      </Show>
                                      <span class="xpath">{fieldXpath(field)}</span>
                                    </td>
                                    <td class="field-value">
                                      <Show when={editingField() === item.emp._index + ':' + fieldKey(field, section._instanceIndex)} fallback={
                                        <span onClick={(e) => { e.stopPropagation(); startEdit(item.emp, field, section); }} style="cursor: pointer; display: block; min-height: 24px; padding: 2px 0;">
                                          <Show when={isFieldModified(item.emp, field, section)}><span class="modified-dot"></span></Show>
                                          {getFieldValue(item.emp, field, section) || <span class="empty">—</span>}
                                        </span>
                                      }>
                                        <Switch>
                                          <Match when={field.type === 'date'}>
                                            <input type="date" value={getFieldValue(item.emp, field, section)}
                                              onBlur={(e) => commitEdit(item.emp, field, e.target.value, section)}
                                              onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(item.emp, field, e.target.value, section); if (e.key === 'Escape') cancelEdit(); }}
                                              ref={el => setTimeout(() => el.focus())} />
                                          </Match>
                                          <Match when={field.type === 'boolean'}>
                                            <select value={getFieldValue(item.emp, field, section)}
                                              onChange={(e) => commitEdit(item.emp, field, e.target.value, section)}
                                              onBlur={(e) => commitEdit(item.emp, field, e.target.value, section)}
                                              onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit(); }}
                                              ref={el => setTimeout(() => el.focus())}>
                                              <option value="">—</option><option value="A">A (Ano)</option><option value="N">N (Ne)</option>
                                            </select>
                                          </Match>
                                          <Match when={true}>
                                            <input type="text" value={getFieldValue(item.emp, field, section)}
                                              maxLength={field.maxLength || undefined}
                                              inputMode={field.type === 'number' ? 'numeric' : 'text'}
                                              onBlur={(e) => commitEdit(item.emp, field, e.target.value, section)}
                                              onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(item.emp, field, e.target.value, section); if (e.key === 'Escape') cancelEdit(); }}
                                              ref={el => setTimeout(() => el.focus())} />
                                          </Match>
                                        </Switch>
                                      </Show>
                                    </td>
                                  </tr>
                                }</For>
                              </table>
                            </div>
                          </div>
                        </Show>
                      }</For>
                    </div>
                  </Show>
                </div>
              </Show>
            }</For>
          </div>
        </div>
      </Show>

      {/* Empty State */}
      <Show when={!xmlDoc()}>
        <div class="content" style="max-width: 100%;">
          <div class="empty-state">
            <div class="drop-zone" classList={{ dragover: isDragging() }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); handleDrop(e); }}
              onClick={loadFile}>
              <p>Přetáhněte nebo klikněte pro načtení XML souboru měsíčního hlášení</p>
              <button onClick={(e) => { e.stopPropagation(); loadFile(); }} style="margin-top: 16px; padding: 10px 28px; font-size: 15px; font-weight: 500; border: 1px solid #D1D5DB; border-radius: 8px; background: #2563EB; color: #fff; cursor: pointer;">Nahrát XML</button>
            </div>
          </div>
        </div>
      </Show>

      {/* Validation Panel */}
      <Show when={errors().length > 0}>
        {(() => {
          let panelEl;
          onMount(() => {
            const observer = new ResizeObserver(() => updateValidationDockHeight(panelEl));
            observer.observe(panelEl);
            onCleanup(() => observer.disconnect());
            updateValidationDockHeight(panelEl);
          });
          return (
            <>
              <div class="validation-panel-spacer" style={{ height: validationDockHeight() + 'px' }}></div>
              <div class="validation-panel" ref={panelEl}>
                <div class="validation-header" onClick={() => setValidationCollapsed(!validationCollapsed())}>
                  Validace ({errors().length} {errors().length === 1 ? 'chyba' : errors().length < 5 ? 'chyby' : 'chyb'})
                  {validationCollapsed() ? ' ▲' : ' ▼'}
                </div>
                <Show when={!validationCollapsed()}>
                  <div class="validation-list">
                    <For each={errors()}>{(err, i) =>
                      <div class="validation-item">
                        <span class={"severity " + (err.severity || 'error')}></span>
                        <span class="path">{err.headerKey ? 'Záhlaví' : err.employeeName} › {err.sectionLabel} ›</span>
                        <span class="message">{err.fieldLabel}: {err.message}</span>
                        <Show when={err.canNavigate}><span class="goto-btn" onClick={() => navigateToError(err)}>Přejít</span></Show>
                      </div>
                    }</For>
                  </div>
                </Show>
              </div>
            </>
          );
        })()}
      </Show>

      {/* Kontroly Panel */}
      <Show when={kontrolyErrors().length > 0}>
        {(() => {
          let kPanelEl;
          onMount(() => {
            const observer = new ResizeObserver(() => updateKontrolyDockHeight(kPanelEl));
            observer.observe(kPanelEl);
            onCleanup(() => observer.disconnect());
            updateKontrolyDockHeight(kPanelEl);
          });
          return (
            <>
              <div class="kontroly-panel-spacer" style={{ height: kontrolyDockHeight() + 'px' }}></div>
              <div class="kontroly-panel" ref={kPanelEl} style={{ bottom: (errors().length > 0 ? validationDockHeight() : 0) + 'px' }}>
                <div class="kontroly-header" onClick={() => setKontrolyCollapsed(!kontrolyCollapsed())}>
                  Kontroly ({kontrolyErrors().length} {kontrolyErrors().length === 1 ? 'nález' : kontrolyErrors().length < 5 ? 'nálezy' : 'nálezů'}:
                  {' '}{kontrolyErrorCount()} {kontrolyErrorCount() === 1 ? 'chyba' : kontrolyErrorCount() < 5 ? 'chyby' : 'chyb'},
                  {' '}{kontrolyWarningCount()} {kontrolyWarningCount() === 1 ? 'varování' : 'varování'})
                  {kontrolyCollapsed() ? ' ▲' : ' ▼'}
                </div>
                <Show when={!kontrolyCollapsed()}>
                  <div class="kontroly-list">
                    <For each={kontrolyErrors()}>{(err, i) =>
                      <div class="validation-item">
                        <span class={"severity " + err.severity}></span>
                        <span class="control-id">K{err.controlId}</span>
                        <span class="path">{err.headerKey ? 'Záhlaví' : err.employeeName} › {err.sectionLabel} ›</span>
                        <span class="message">{err.fieldLabel}: {err.message}</span>
                        <Show when={err.canNavigate}><span class="goto-btn" onClick={() => navigateToError(err)}>Přejít</span></Show>
                      </div>
                    }</For>
                  </div>
                </Show>
              </div>
            </>
          );
        })()}
      </Show>

      {/* Toast */}
      <Show when={toastMessage()}>
        <div class="toast success">{toastMessage()}</div>
      </Show>

      {/* Hidden file input */}
      <input type="file" ref={fileInputEl} accept=".xml" style="display:none" onChange={handleFileSelect} />
    </>
  );
}
