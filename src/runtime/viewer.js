const { createApp, reactive, ref, computed, nextTick, watch } = window.Vue;

function resolveMountTarget(target) {
  if (typeof target === 'string') return document.querySelector(target);
  return target;
}

function mountJmhzViewer(target, options = {}) {
  const mountTarget = resolveMountTarget(target);
  if (!mountTarget) throw new Error('JMHZ Viewer mount target not found');
  const runtimeOptions = {
    xml: null,
    filename: '',
    autoBootstrap: true,
    initialViewMode: null,
    autoValidateOnLoad: false,
    bootstrapScriptId: 'jmhz-data',
    manageDocumentTitle: false,
    warnBeforeUnload: false,
    assetBase: '',
    ...options
  };
  const app = createApp({
  setup() {
    const assetBase = ref(runtimeOptions.assetBase || '');
    const xmlDoc = ref(null);
    const filename = ref(runtimeOptions.filename || '');
    const employees = ref([]);
    const expandedEmployee = ref(-1);
    const fieldSearch = ref('');
    const valueSearch = ref('');
    const formatRef = ref(null);
    let _searchTimer = null;
    function onFieldSearchInput(e) {
      clearTimeout(_searchTimer);
      const val = e.target.value;
      _searchTimer = setTimeout(() => { fieldSearch.value = val; }, 250);
    }
    function onValueSearchInput(e) {
      clearTimeout(_searchTimer);
      const val = e.target.value;
      _searchTimer = setTimeout(() => { valueSearch.value = val; }, 250);
    }
    function clearFieldSearch(e) { e.target.value = ''; fieldSearch.value = ''; }
    function clearValueSearch(e) { e.target.value = ''; valueSearch.value = ''; }
    const expandedSections = reactive(new Set());
    const showAllSections = reactive(new Set());
    const sectionBodyHeights = reactive({});
    const sectionBodyEls = new Map();
    const isDirty = ref(false);
    const isDragging = ref(false);
    const errors = ref([]);
    const validationCollapsed = ref(false);
    const validationPanelRef = ref(null);
    const validationDockHeight = ref(0);
    const editingField = ref(null);
    const editingHeaderKey = ref(null);
    const toastMessage = ref('');
    const fileHandle = ref(null);
    const fileInput = ref(null);
    const searchInput = ref(null);
    const headerExpanded = ref(false);
    const xlsDialog = ref(false);
    const xlsOptTitle = ref(true);
    const xlsOptId = ref(false);
    const xlsOptCategory = ref(false);
    const undoStack = ref([]);
    const redoStack = ref([]);
    const actionLabels = computed(() => { const f = formatRef.value; return f ? (f.actionLabels || {}) : {}; });
    const formatName = computed(() => { const f = formatRef.value; return f ? f.name : ''; });
    const hasActions = computed(() => { const f = formatRef.value; return f ? f.hasActions : false; });
    const rowInfoDefs = computed(() => { const f = formatRef.value; return f ? (f.getRowInfo || []) : []; });
    function getRowLabel(emp) { return activeFormat ? activeFormat.getRowLabel(emp.fields) : (emp.surname + ' ' + emp.firstName); }
    const rowColumnLabel = computed(() => { const f = formatRef.value; return f ? (f.rowColumnLabel || 'Jméno') : 'Jméno'; });
    function fieldXpath(field) { return activeFormat ? activeFormat.fieldXpath(field) : (field.section + '/@' + (field.attr || field.element)); }
    function fieldHint(field) {
      const secLabel = (SECTION_MAP[field.section] || {}).label || '';
      const xpath = fieldXpath(field);
      return secLabel ? secLabel + ' · ' + xpath : xpath;
    }
    function fieldSecLabel(field) { return (SECTION_MAP[field.section] || {}).label || ''; }

    function parseXml(xmlText) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'application/xml');
      if (doc.querySelector('parsererror')) { alert('Chyba při parsování XML:\n' + doc.querySelector('parsererror').textContent); return false; }
      const format = detectFormat(doc);
      if (!format) return false;
      rebuildMetadata(format);
      formatRef.value = format;
      xmlDoc.value = doc;
      employees.value = [];
      errors.value = [];
      expandedEmployee.value = -1;
      hasValidated.value = false;
      validationErrors.value = new Map();
      sectionBodyEls.clear();
      Object.keys(sectionBodyHeights).forEach(key => delete sectionBodyHeights[key]);
      actionFilter.value = '';
      fieldSearch.value = '';
      valueSearch.value = '';
      const rowElements = findRows(doc, activeFormat);
      for (let i = 0; i < rowElements.length; i++) employees.value.push(buildEmployeeMirror(rowElements[i], i));
      documentHeader.value = activeFormat?.parseDocumentHeader?.(doc) || [];
      isDirty.value = false;
      updateTitle();
      return true;
    }

    function buildEmployeeMirror(rowEl, index) {
      const format = activeFormat;
      const fields = {};
      const formRoot = getFormRoot(rowEl, format);
      // Header fields (REGZEC: sqnr, dep, act, dat, fro as attributes on employee element)
      format.headerFields.forEach(attr => {
        const v = rowEl.getAttribute(attr) || '';
        fields[format.sections[0].id + '/' + attr] = { value: v, _norm: norm(v), el: rowEl, attr, modified: false };
      });
      // Section fields
      const instanceCounts = {};
      const instanceOrders = {};
      format.sections.forEach(sec => {
        if (sec.id === (format.headerFields.length > 0 ? format.sections[0].id : null)) return;
        const sectionFields = FIELDS_BY_SECTION[sec.id] || [];
        // Repeating sections: read all instances
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

    // Search: builds a map of empIndex -> Set of matching field keys
    const hasValidated = ref(false);

    // === Stats computeds ===
    const documentHeader = ref([]);
    const xmlVersion = computed(() => {
      if (!xmlDoc.value) return '';
      const root = xmlDoc.value.documentElement;
      return root ? (root.getAttribute('version') || root.getAttribute('verze') || '') : '';
    });

    const actionSummary = computed(() => {
      const f = formatRef.value;
      if (!f || !f.hasActions) return '';
      if (!employees.value.length) return '';
      const counts = {};
      employees.value.forEach(e => { counts[e.act] = (counts[e.act] || 0) + 1; });
      const keys = Object.keys(counts).filter(Boolean);
      if (!keys.length) return '';
      if (keys.length === 1) {
        const act = keys[0];
        return (f.actionLabels || {})[act] || ('A' + act);
      }
      return keys.map(a => 'A' + a + ': ' + counts[a]).join(', ');
    });

    const employerName = computed(() => {
      const f = formatRef.value;
      if (!f || !f.stats.employer) return '';
      if (!employees.value.length) return '';
      return employees.value[0].fields[f.stats.employer]?.value || '';
    });

    const datumVyplneni = computed(() => {
      const f = formatRef.value;
      if (!f || !f.stats.date) return '';
      if (!employees.value.length) return '';
      const dates = new Set(employees.value.map(e => e.dat).filter(Boolean));
      return dates.size === 1 ? [...dates][0] : '';
    });

    const czForeignerSplit = computed(() => {
      const f = formatRef.value;
      if (!f || !f.stats.citizenship) return '';
      if (!employees.value.length) return '';
      const citizenKey = f.stats.citizenship;
      let cz = 0, foreign = 0;
      employees.value.forEach(e => {
        const cnt = e.fields[citizenKey]?.value || '';
        if (cnt === 'CZ') cz++; else if (cnt) foreign++; else cz++;
      });
      if (foreign === 0) return cz + ' CZ';
      if (cz === 0) return foreign + ' cizinců';
      return cz + ' CZ, ' + foreign + ' cizinců';
    });

    const partialAcceptValue = computed(() => {
      const f = formatRef.value;
      if (!f || !f.stats.partialAccept) return '';
      if (!xmlDoc.value) return '';
      const root = xmlDoc.value.documentElement;
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
    const employeeCountText = computed(() => employees.value.length + ' ' + czPlural(employees.value.length, 'zaměstnanec', 'zaměstnanci', 'zaměstnanců'));
    const validationCountText = computed(() => errors.value.length + ' ' + czPlural(errors.value.length, 'chyba', 'chyby', 'chyb'));

    function updateValidationDockHeight() {
      const panelEl = validationPanelRef.value;
      validationDockHeight.value = panelEl ? Math.ceil(panelEl.getBoundingClientRect().height) : 0;
    }
    let validationPanelObserver = null;
    watch(validationPanelRef, (panelEl) => {
      if (validationPanelObserver) {
        validationPanelObserver.disconnect();
        validationPanelObserver = null;
      }
      if (panelEl && typeof ResizeObserver !== 'undefined') {
        validationPanelObserver = new ResizeObserver(() => updateValidationDockHeight());
        validationPanelObserver.observe(panelEl);
      }
      nextTick(() => updateValidationDockHeight());
    });
    watch(() => [errors.value.length, validationCollapsed.value], () => {
      nextTick(() => updateValidationDockHeight());
    });
    window.addEventListener('resize', updateValidationDockHeight);

    function splitQuery(raw) { return raw.split(',').map(s => norm(s.trim())).filter(Boolean); }

    const hasSearch = computed(() => {
      const fp = splitQuery(fieldSearch.value);
      const vp = splitQuery(valueSearch.value);
      return fp.length > 0 || vp.length > 0;
    });
    // Clean up collapsed state when search is cleared (outside computed to avoid side effects)
    watch(hasSearch, (val) => {
      if (!val) { collapsedSections.clear(); collapsedMatchedEmps.clear(); }
    });

    const currentFormatGroups = computed(() => {
      void xmlDoc.value;
      return activeFormat?.fieldGroups || [];
    });

    function applyGroupQuery(query) {
      fieldSearch.value = query;
      if (searchInput.value) searchInput.value.value = query;
    }

    const searchMatches = computed(() => {
      void xmlDoc.value;
      const fqParts = splitQuery(fieldSearch.value);
      const vqParts = splitQuery(valueSearch.value);
      if (!fqParts.length && !vqParts.length) return null;
      const matches = new Map();
      employees.value.forEach(emp => {
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

    // Memoized sort — only re-sorts when employees array changes, not on search
    const sortedEmployees = computed(() => sortByName(employees.value));

    const matchedEmployees = computed(() => {
      if (!searchMatches.value) return [];
      return sortedEmployees.value.filter(e => searchMatches.value.has(e._index));
    });

    const unmatchedEmployees = computed(() => {
      if (!searchMatches.value) return sortedEmployees.value;
      return sortedEmployees.value.filter(e => !searchMatches.value.has(e._index));
    });

    // Merged display list: matched cards + separator + unmatched cards
    const displayList = computed(() => {
      if (!hasSearch.value) return sortByName(employees.value).map(e => ({ type: 'card', emp: e, matched: false }));
      const matched = matchedEmployees.value.map(e => ({ type: 'card', emp: e, matched: true }));
      const unmatched = unmatchedEmployees.value.map(e => ({ type: 'card', emp: e, matched: false }));
      if (matched.length && unmatched.length) return [...matched, { type: 'separator', count: unmatched.length }, ...unmatched];
      return [...matched, ...unmatched];
    });

    // Keep for backward compat (validation panel etc.)
    const filteredEmployees = computed(() => {
      if (!searchMatches.value) return sortByName(employees.value);
      return [...matchedEmployees.value, ...unmatchedEmployees.value];
    });

    const searchMatchInfo = computed(() => {
      if (!searchMatches.value) return '';
      let totalFields = 0;
      searchMatches.value.forEach(s => { s.forEach(k => { if (k !== '_card_') totalFields++; }); });
      const empCount = searchMatches.value.size;
      return totalFields + ' shod u ' + empCount + ' zaměstnanců';
    });

    function isFieldMatch(emp, field, section) {
      if (!searchMatches.value) return false;
      const empMatches = searchMatches.value.get(emp._index);
      if (!empMatches) return false;
      return empMatches.has(fieldKey(field, section?._instanceIndex));
    }

    function getEmpMatchCount(empIndex) {
      if (!searchMatches.value) return 0;
      const matches = searchMatches.value.get(empIndex);
      if (!matches) return 0;
      let count = 0;
      matches.forEach(k => { if (k !== '_card_') count++; });
      return count;
    }

    function toggleEmployee(index, isMatched) {
      if (isMatched && hasSearch.value && autoExpandMatched.value) {
        if (collapsedMatchedEmps.has(index)) collapsedMatchedEmps.delete(index);
        else collapsedMatchedEmps.add(index);
      } else {
        expandedEmployee.value = expandedEmployee.value === index ? -1 : index;
      }
    }

    const collapsedMatchedEmps = reactive(new Set());
    const showAllFieldsInSearch = ref(false);
    const savedPreferredViewMode = runtimeOptions.initialViewMode ? null : localStorage.getItem('preferredViewMode');
    const viewMode = ref(runtimeOptions.initialViewMode || savedPreferredViewMode || 'table');
    const showViewPicker = ref(!runtimeOptions.initialViewMode && !savedPreferredViewMode);
    const actionFilter = ref('');
    function toggleViewMode() { viewMode.value = viewMode.value === 'cards' ? 'table' : 'cards'; }
    function pickViewMode(mode) { viewMode.value = mode; localStorage.setItem('preferredViewMode', mode); showViewPicker.value = false; }
    // Table view: which columns to show (filtered by field search)
    const visibleColumns = computed(() => {
      void xmlDoc.value;
      let cols = FIELD_META;
      // Action filter: only show sections relevant to the selected action
      const actSections = ACTION_SECTIONS ? ACTION_SECTIONS[actionFilter.value] : null;
      if (actSections) {
        cols = cols.filter(f => actSections.includes(f.section));
        // Also hide fields with "/" requirement for this action
        cols = cols.filter(f => {
          const req = getFieldReq(f, actionFilter.value);
          return req !== '/';
        });
      }
      // Field search filter
      const fqParts = splitQuery(fieldSearch.value);
      if (fqParts.length) {
        cols = cols.filter(f => {
          const foreignHit = f._isForeign && fqParts.some(fq => FOREIGN_KEYWORDS.some(kw => kw.includes(fq) || fq.includes(kw)));
          return fqParts.some(fq => fieldMatchesTerm(f, fq)) || foreignHit;
        });
      }
      // Value-only search: filter columns to those with matching values
      const vqParts = splitQuery(valueSearch.value);
      if (vqParts.length && !fqParts.length) {
        const matchedCols = new Set();
        employees.value.forEach(emp => {
          if (!searchMatches.value?.has(emp._index)) return;
          const matches = searchMatches.value.get(emp._index);
          matches.forEach(key => { if (key !== '_card_') matchedCols.add(key); });
        });
        cols = cols.filter(f => {
          const key = fieldKey(f);
          return matchedCols.has(key);
        });
      }
      // Expand repeating section fields into per-instance columns, grouped by instance
      const maxInstances = {};
      const repeatingGroups = {}; // countKey -> [fields]
      const expanded = [];
      const emittedGroups = new Set();
      // First pass: compute max instances and collect repeating fields by group
      cols.forEach(f => {
        const sec = SECTIONS.find(s => s.id === f.section);
        if (sec && (sec.repeating || sec.parentRepeating)) {
          const countKey = sec.parentRepeating || sec.id;
          if (!(countKey in maxInstances)) {
            let max = 0;
            employees.value.forEach(emp => { max = Math.max(max, emp._instanceCounts?.[countKey] || 0); });
            maxInstances[countKey] = max;
          }
          if (!repeatingGroups[countKey]) repeatingGroups[countKey] = [];
          repeatingGroups[countKey].push(f);
        }
      });
      // Second pass: emit columns, inserting grouped instance blocks at first occurrence
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
    const autoExpandMatched = ref(true);

    function isEmployeeExpanded(index, isMatched) {
      if (isMatched && hasSearch.value && autoExpandMatched.value) {
        return !collapsedMatchedEmps.has(index);
      }
      return expandedEmployee.value === index;
    }

    function sectionMatchesFieldFilter(section) {
      const fqParts = splitQuery(fieldSearch.value);
      if (!fqParts.length) return false;
      return section.fields.some(f => fqParts.some(fq => fieldMatchesTerm(f, fq)));
    }
    function sectionHasMatchingFields(emp, section) {
      if (!searchMatches.value?.has(emp._index)) return false;
      const matches = searchMatches.value.get(emp._index);
      return section.fields.some(f => matches.has(fieldKey(f, section._instanceIndex)));
    }

    function getSectionsForEmployee(emp) {
      const result = [];
      SECTIONS.forEach(sec => {
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
      if (el) sectionBodyHeights[key] = el.scrollHeight;
    }
    function setSectionBodyRef(key, el) {
      if (el) {
        sectionBodyEls.set(key, el);
        sectionBodyHeights[key] = el.scrollHeight;
      } else {
        sectionBodyEls.delete(key);
        delete sectionBodyHeights[key];
      }
    }
    function getSectionBodyStyle(key, isExpanded) {
      if (!isExpanded) return {};
      const height = sectionBodyHeights[key];
      return height ? { maxHeight: height + 'px' } : { maxHeight: 'none' };
    }

    function toggleSection(key) {
      const parts = key.split(':');
      const empIdx = parseInt(parts[0]);
      const secId = parts.slice(1).join(':');
      if (isSectionExpanded(empIdx, secId)) {
        expandedSections.delete(key);
        collapsedSections.add(key);
      } else {
        measureSectionBody(key);
        expandedSections.add(key);
        collapsedSections.delete(key);
      }
    }
    function toggleAllSections(emp) {
      const sections = getSectionsForEmployee(emp);
      const allExpanded = sections.every(sec => isSectionExpanded(emp._index, sec._virtualId || sec.id, false, sec));
      sections.forEach(sec => {
        const key = emp._index + ':' + (sec._virtualId || sec.id);
        if (allExpanded) { expandedSections.delete(key); collapsedSections.add(key); }
        else { measureSectionBody(key); expandedSections.add(key); collapsedSections.delete(key); }
      });
    }
    const collapsedSections = reactive(new Set()); // manually collapsed despite search match

    function isSectionExpanded(empIdx, secId, isMatched, section) {
      const key = empIdx + ':' + secId;
      if (collapsedSections.has(key)) return false;
      // For matched employees during search: auto-expand sections with matching fields
      if (isMatched && hasSearch.value && searchMatches.value?.has(empIdx)) {
        const matches = searchMatches.value.get(empIdx);
        const baseSec = section?._baseSectionId || secId;
        const sectionFields = FIELDS_BY_SECTION[baseSec] || [];
        if (sectionFields.some(f => matches.has(fieldKey(f, section?._instanceIndex)))) return true;
      }
      return expandedSections.has(key);
    }
    function toggleShowAll(key) { showAllSections.has(key) ? showAllSections.delete(key) : showAllSections.add(key); }
    function isShowAll(empIdx, secId) { return showAllSections.has(empIdx + ':' + secId); }

    function fieldKey(field, instanceIndex) {
      const base = field.section + '/' + (activeFormat ? activeFormat.fieldAttrKey(field) : (field.attr || field.element));
      if (instanceIndex !== undefined) return field.section + '[' + instanceIndex + ']/' + (activeFormat ? activeFormat.fieldAttrKey(field) : (field.attr || field.element));
      return base;
    }
    function getFieldValue(emp, field, section) { return emp.fields[fieldKey(field, section?._instanceIndex)]?.value || ''; }
    function isFieldModified(emp, field, section) { return emp.fields[fieldKey(field, section?._instanceIndex)]?.modified || false; }
    function getFieldRequirement(field) { return null; }
    function getFieldError(field) { return null; }

    function getVisibleFields(emp, section, isMatched) {
      if (!isMatched || !hasSearch.value) return section.fields;
      if (showAllFieldsInSearch.value) return section.fields;
      const fqParts = splitQuery(fieldSearch.value);
      if (fqParts.length > 0) {
        return section.fields.filter(f => fqParts.some(fq => fieldMatchesTerm(f, fq)));
      }
      if (!searchMatches.value?.has(emp._index)) return section.fields;
      const matches = searchMatches.value.get(emp._index);
      return section.fields.filter(f => matches.has(fieldKey(f, section._instanceIndex)));
    }

    function startEdit(emp, field, section) {
      editingField.value = emp._index + ':' + fieldKey(field, section?._instanceIndex);
      nextTick(() => { const el = document.querySelector('.field-value input, .field-value select'); if (el) el.focus(); });
    }
    function commitEdit(emp, field, newValue, section) {
      const key = fieldKey(field, section?._instanceIndex);
      const fieldRef = emp.fields[key];
      if (!fieldRef) return;
      const oldValue = fieldRef.value;
      if (oldValue !== newValue) {
        fieldRef.value = newValue;
        fieldRef._norm = norm(newValue);
        fieldRef.modified = true;
        if (fieldRef.el) { activeFormat.writeField(fieldRef, newValue); }
        // Update cached shortcut fields
        const newLabel = activeFormat.getRowLabel(emp.fields);
        const lp = newLabel.split(/\s+/).filter(Boolean);
        emp.surname = lp[0] || '';
        emp.firstName = lp.slice(1).join(' ') || '';
        if (key.endsWith('/act')) emp.act = newValue;
        if (key.endsWith('/dep')) emp.dep = newValue;
        undoStack.value.push({ empIndex: emp._index, key, oldValue, newValue });
        if (undoStack.value.length > 200) undoStack.value.shift();
        redoStack.value = [];
        isDirty.value = true;
        updateTitle();
      }
      editingField.value = null;
    }
    function cancelEdit() { editingField.value = null; }

    function startHeaderEdit(f) {
      editingField.value = 'hdr:' + f.key;
      editingHeaderKey.value = f.key;
      nextTick(() => { const el = document.querySelector('.field-value input'); if (el) el.focus(); });
    }
    function commitHeaderEdit(f, newValue) {
      const oldValue = f.value;
      if (oldValue !== newValue) {
        f.value = newValue; f.modified = true;
        activeFormat.writeHeaderField(f, newValue);
        undoStack.value.push({ isHeader: true, headerRef: f, oldValue, newValue });
        if (undoStack.value.length > 200) undoStack.value.shift();
        redoStack.value = [];
        isDirty.value = true; updateTitle();
      }
      editingField.value = null;
      editingHeaderKey.value = null;
    }
    function cancelHeaderEdit() { editingField.value = null; editingHeaderKey.value = null; }
    function isEditingHeader(key) { return editingHeaderKey.value === key; }

    function rebuildSingleEmployee(empIndex) {
      const emp = employees.value[empIndex];
      if (!emp) return;
      const newMirror = buildEmployeeMirror(emp._empEl, empIndex);
      employees.value[empIndex] = newMirror;
    }
    function addInstance(emp, section) {
      const sec = SECTIONS.find(s => s.id === (section._baseSectionId || section.id));
      if (!sec || !activeFormat.createRepeatingInstance) return;
      activeFormat.createRepeatingInstance(emp._formRoot, sec);
      rebuildSingleEmployee(emp._index);
      isDirty.value = true;
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
      isDirty.value = true;
    }

    function loadXmlText(xmlText, sourceName) {
      if (!xmlText) return;
      filename.value = sourceName || filename.value || 'JMHZ.xml';
      fileHandle.value = null;
      const parsed = parseXml(xmlText);
      if (parsed && runtimeOptions.autoValidateOnLoad) {
        nextTick(() => { validateAll(); });
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
    function loadFile() { fileInput.value?.click(); }
    function handleFileSelect(e) {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => loadXmlText(ev.target.result, file.name);
      reader.readAsText(file);
      e.target.value = '';
    }
    function handleDrop(e) {
      isDragging.value = false;
      const file = e.dataTransfer?.files[0];
      if (!file || !file.name.endsWith('.xml')) return;
      const reader = new FileReader();
      reader.onload = (ev) => loadXmlText(ev.target.result, file.name);
      reader.readAsText(file);
    }
    async function saveFile() {
      if (!xmlDoc.value) return;
      const serializer = new XMLSerializer();
      let xmlString = serializer.serializeToString(xmlDoc.value);
      if (!xmlString.startsWith('<?xml')) xmlString = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + xmlString;
      const suggestedName = filename.value || 'JMHZ.xml';
      if ('showSaveFilePicker' in window) {
        try {
          const handle = fileHandle.value || await window.showSaveFilePicker({ suggestedName, types: [{ description: 'XML', accept: { 'application/xml': ['.xml'] } }] });
          fileHandle.value = handle;
          const writable = await handle.createWritable(); await writable.write(xmlString); await writable.close();
          showToast('Uloženo: ' + suggestedName); isDirty.value = false; updateTitle(); return;
        } catch (e) { if (e.name === 'AbortError') return; }
      }
      const blob = new Blob([xmlString], { type: 'application/xml' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = suggestedName; a.click();
      showToast('Staženo: ' + suggestedName); isDirty.value = false; updateTitle();
    }
    function exportToExcel() {
      xlsDialog.value = false;
      const cols = visibleColumns.value;
      const rows = displayList.value.filter(item => item.type !== 'separator');
      const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const hCell = v => `<Cell ss:StyleID="h"><Data ss:Type="String">${esc(v)}</Data></Cell>`;
      const dCell = v => `<Cell><Data ss:Type="String">${esc(v)}</Data></Cell>`;
      function colHeader(f) {
        const parts = [];
        if (xlsOptTitle.value) parts.push(f._colLabel || f.label || '');
        if (xlsOptId.value && f.csszId) parts.push(f.csszId);
        if (xlsOptCategory.value) { const sec = fieldSecLabel(f); if (sec) parts.push(sec); }
        return parts.join(' · ');
      }
      const includeHeader = xlsOptTitle.value || xlsOptId.value || xlsOptCategory.value;
      const headerRow = includeHeader
        ? '<Row>' + [rowColumnLabel.value, ...cols.map(colHeader)].map(hCell).join('') + '</Row>'
        : '';
      const dataRows = rows.map(item =>
        '<Row>' + [getRowLabel(item.emp), ...cols.map(f => getFieldValue(item.emp, f, f))].map(dCell).join('') + '</Row>'
      ).join('');
      const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="h"><Font ss:Bold="1"/></Style></Styles><Worksheet ss:Name="Export"><Table>${headerRow}${dataRows}</Table></Worksheet></Workbook>`;
      const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (filename.value ? filename.value.replace(/\.xml$/i, '') : 'export') + '.xls';
      a.click();
      URL.revokeObjectURL(url);
    }
    function showToast(msg) { toastMessage.value = msg; setTimeout(() => { toastMessage.value = ''; }, 2500); }
    function updateTitle() {
      if (!runtimeOptions.manageDocumentTitle) return;
      document.title = (isDirty.value ? '* ' : '') + (filename.value || 'JMHZ Viewer');
    }

    // === XSD Validation with error mapping ===
    // validationErrors: Map<empIndex, Map<fieldKey, string[]>> for field-level error lookup
    const validationErrors = ref(new Map());

    async function validateAll() {
      if (!xmlDoc.value) return;
      errors.value = [];
      validationErrors.value = new Map();
      documentHeader.value.forEach(h => h._hasError = false);
      hasValidated.value = true;

      const serializer = new XMLSerializer();
      let xmlString = serializer.serializeToString(xmlDoc.value);
      if (!xmlString.startsWith('<?xml')) xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlString;

      // Build line → employee index map
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

      // Build schema array with named files (xs:import resolves by filename)
      const SCHEMA_MAP = { 'DEFAULT_SCHEMAS': DEFAULT_SCHEMAS, 'JMHZ_SCHEMAS': JMHZ_SCHEMAS };
      const schemas = SCHEMA_MAP[activeFormat.schemasKey] || DEFAULT_SCHEMAS;
      const mainSchemaName = activeFormat.mainSchema || null;
      let validateOpts;
      if (mainSchemaName && schemas[mainSchemaName]) {
        // Multi-namespace: pass main schema as schema, rest as preload for import resolution
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
          result.errors.forEach(err => {
            const errMsg = err.rawMessage || err.message || '';
            let lineNum = -1;
            if (err.loc && err.loc.lineNumber) lineNum = err.loc.lineNumber;

            const ei = lineToEmpIndex(lineNum);
            const emp = ei >= 0 ? employees.value[ei] : null;
            const employeeName = emp ? getRowLabel(emp) : '';

            let elementName = '';
            const elemMatch = errMsg.match(/Element '\{[^}]*\}([^']+)'/);
            if (elemMatch) elementName = elemMatch[1];

            let attrName = '';
            const attrMatch = errMsg.match(/attribute '([^']+)'/);
            if (attrMatch) attrName = attrMatch[1];

            let fieldKey = '';
            let sectionLabel = elementName;
            if (attrName) {
              // REGZEC: error on attribute within an element
              const attrOrElement = attrName;
              const field = FIELDS.find(f => (f.attr === attrOrElement || f.element === attrOrElement) && (
                f.section === elementName ||
                f.section.endsWith('/' + elementName) ||
                f.section.split('/').pop() === elementName
              ));
              if (field) {
                fieldKey = field.section + '/' + (activeFormat ? activeFormat.fieldAttrKey(field) : (field.attr || field.element));
                const sec = SECTION_MAP[field.section];
                sectionLabel = sec ? sec.label : elementName;
              } else {
                fieldKey = elementName + '/' + attrName;
              }
            } else if (elementName) {
              // JMHZ: error on element itself (element IS the field)
              const field = FIELDS.find(f => (f.element === elementName || f.attr === elementName));
              if (field) {
                fieldKey = field.section + '/' + (activeFormat ? activeFormat.fieldAttrKey(field) : (field.attr || field.element));
                const sec = SECTION_MAP[field.section];
                sectionLabel = sec ? sec.label : elementName;
                attrName = elementName;
              }
            }

            if (ei >= 0 && fieldKey) {
              if (!validationErrors.value.has(ei)) validationErrors.value.set(ei, new Map());
              const empErrors = validationErrors.value.get(ei);
              // For repeating sections, attach error to all instances
              const matchedField = FIELDS.find(f => fieldKey === f.section + '/' + (activeFormat ? activeFormat.fieldAttrKey(f) : (f.attr || f.element)));
              const matchedSec = matchedField ? SECTIONS.find(s => s.id === matchedField.section) : null;
              if (matchedSec && (matchedSec.repeating || matchedSec.parentRepeating)) {
                const emp = employees.value[ei];
                const countKey = matchedSec.parentRepeating || matchedSec.id;
                const count = emp?._instanceCounts?.[countKey] || 0;
                for (let idx = 0; idx < count; idx++) {
                  const iKey = matchedField.section + '[' + idx + ']/' + (activeFormat ? activeFormat.fieldAttrKey(matchedField) : (matchedField.attr || matchedField.element));
                  if (!empErrors.has(iKey)) empErrors.set(iKey, []);
                  empErrors.get(iKey).push(err.message);
                }
              } else {
                if (!empErrors.has(fieldKey)) empErrors.set(fieldKey, []);
                empErrors.get(fieldKey).push(err.message);
              }
            }

            // Try matching header fields for errors outside employee rows
            let headerKey = '';
            if (ei < 0) {
              const hdr = documentHeader.value.find(h => {
                if (attrName && h.attr === attrName) return true;
                if (elementName && h.key && h.key.endsWith('/' + elementName)) return true;
                return false;
              });
              if (hdr) { headerKey = hdr.key; hdr._hasError = true; }
            }

            errors.value.push({
              severity: 'error', empIndex: ei, employeeName, sectionLabel,
              fieldLabel: attrName, fieldKey, headerKey, message: err.message
            });
          });
          showToast(errors.value.length + ' chyb nalezeno');
        } else {
          showToast('Validace OK — žádné chyby');
        }
      } catch (e) {
        console.error('Validation error:', e);
        errors.value.push({ severity: 'error', empIndex: -1, employeeName: '', sectionLabel: '', fieldLabel: '', fieldKey: '', message: 'Chyba validace: ' + String(e) });
        showToast('Chyba při validaci');
      }
    }

    function hasFieldError(emp, field, section) {
      const empErrors = validationErrors.value.get(emp._index);
      if (!empErrors) return false;
      return empErrors.has(fieldKey(field, section?._instanceIndex));
    }

    function getFieldErrorMsg(emp, field, section) {
      const empErrors = validationErrors.value.get(emp._index);
      if (!empErrors) return '';
      const msgs = empErrors.get(fieldKey(field, section?._instanceIndex));
      return msgs ? msgs.join('\n') : '';
    }

    function getSectionErrorCount(empIndex, sectionId, section) {
      const empErrors = validationErrors.value.get(empIndex);
      if (!empErrors) return 0;
      let count = 0;
      const baseSec = section?._baseSectionId || sectionId;
      const sectionFields = FIELDS_BY_SECTION[baseSec] || [];
      sectionFields.forEach(f => { if (empErrors.has(fieldKey(f, section?._instanceIndex))) count++; });
      return count;
    }

    function getEmployeeErrorCount(empIndex) {
      const empErrors = validationErrors.value.get(empIndex);
      return empErrors ? empErrors.size : 0;
    }

    function navigateToError(err) {
      if (err.headerKey) {
        // Header field error: expand header and scroll/flash the field
        headerExpanded.value = true;
        nextTick(() => {
          const el = document.querySelector('[data-hdr-key="' + err.headerKey + '"]');
          if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1500); }
        });
      } else if (err.empIndex >= 0) {
        if (viewMode.value === 'table') {
          // Table view: scroll to the error cell
          nextTick(() => {
            const el = document.querySelector('[data-err-id="e' + err.empIndex + '-' + (err.fieldKey || '') + '"]');
            if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1500); }
          });
        } else {
          // Card view: expand card and section, scroll to field
          // Clear search so employee card is guaranteed visible
          fieldSearch.value = '';
          valueSearch.value = '';
          // Expand the employee card
          expandedEmployee.value = err.empIndex;
          collapsedMatchedEmps.delete(err.empIndex);
          if (err.fieldKey) {
            let sectionId = err.fieldKey.substring(0, err.fieldKey.lastIndexOf('/'));
            // For repeating sections without index, expand the first instance
            const sec = SECTIONS.find(s => s.id === sectionId);
            if (sec && (sec.repeating || sec.parentRepeating)) sectionId = sectionId + '[0]';
            const secKey = err.empIndex + ':' + sectionId;
            expandedSections.add(secKey);
            collapsedSections.delete(secKey);
          }
          // Use setTimeout to allow Vue to fully render card body + section content
          setTimeout(() => {
            const selector = '[data-err-id="e' + err.empIndex + '-' + (err.fieldKey || '') + '"]';
            const el = document.querySelector(selector);
            if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1500); }
          }, 150);
        }
      }
    }

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'o') { e.preventDefault(); loadFile(); }
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveFile(); }
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        if (undoStack.value.length) {
          const entry = undoStack.value.pop();
          if (entry.isHeader) {
            entry.headerRef.value = entry.oldValue;
            activeFormat.writeHeaderField(entry.headerRef, entry.oldValue);
          } else {
            const emp = employees.value[entry.empIndex];
            if (emp?.fields[entry.key]) {
              emp.fields[entry.key].value = entry.oldValue;
              const fr = emp.fields[entry.key];
              if (fr.el) { activeFormat.writeField(fr, entry.oldValue); }
            }
          }
          redoStack.value.push(entry);
        }
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        if (redoStack.value.length) {
          const entry = redoStack.value.pop();
          if (entry.isHeader) {
            entry.headerRef.value = entry.newValue;
            activeFormat.writeHeaderField(entry.headerRef, entry.newValue);
          } else {
            const emp = employees.value[entry.empIndex];
            if (emp?.fields[entry.key]) {
              emp.fields[entry.key].value = entry.newValue;
              const fr = emp.fields[entry.key];
              if (fr.el) { activeFormat.writeField(fr, entry.newValue); }
            }
          }
          undoStack.value.push(entry);
        }
      }
    });
    if (runtimeOptions.warnBeforeUnload) {
      window.addEventListener('beforeunload', (e) => { if (isDirty.value) { e.preventDefault(); e.returnValue = ''; } });
    }
    updateTitle();
    tryLoadBootstrapXml();

    return {
      assetBase,
      xmlDoc, filename, employees, expandedEmployee, fieldSearch, valueSearch, expandedSections, showAllSections,
      isDirty, isDragging, errors, validationCollapsed, editingField, toastMessage, fileInput, searchInput,
      validationPanelRef, validationDockHeight,
      actionLabels, formatName, hasActions, rowInfoDefs, rowColumnLabel, getRowLabel, fieldXpath, fieldHint, fieldSecLabel,
      displayList, filteredEmployees, matchedEmployees, unmatchedEmployees, searchMatchInfo, isFieldMatch, isEmployeeExpanded, getEmpMatchCount, sectionHasMatchingFields, sectionMatchesFieldFilter, showAllFieldsInSearch, autoExpandMatched,
      onFieldSearchInput, onValueSearchInput, clearFieldSearch, clearValueSearch,
      hasSearch, hasValidated, xmlVersion, actionSummary, employerName, datumVyplneni, czForeignerSplit, partialAcceptValue,
      employeeCountText, validationCountText,
      viewMode, toggleViewMode, showViewPicker, pickViewMode, visibleColumns, actionFilter, getFieldReq, reqClass, REQ_TITLES,
      currentFormatGroups, applyGroupQuery,
      toggleEmployee, getSectionsForEmployee, toggleSection, toggleAllSections, isSectionExpanded,
      setSectionBodyRef, getSectionBodyStyle,
      fieldKey, getFieldValue, isFieldModified, getFieldRequirement, hasFieldError, getFieldErrorMsg,
      getVisibleFields, startEdit, commitEdit, cancelEdit, addInstance, removeInstance,
      headerExpanded, documentHeader, startHeaderEdit, commitHeaderEdit, cancelHeaderEdit, isEditingHeader,
      xlsDialog, xlsOptTitle, xlsOptId, xlsOptCategory, exportToExcel,
      loadFile, handleFileSelect, handleDrop, saveFile, validateAll, getSectionErrorCount,
      getEmployeeErrorCount, navigateToError
    };
  }
  });
  const vm = app.mount(mountTarget);
  return { app, vm };
}

window.JMHZViewerRuntime = { mount: mountJmhzViewer };
