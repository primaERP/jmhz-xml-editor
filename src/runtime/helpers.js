// === Active format — set on XML load, used everywhere ===
let activeFormat = null;
let SECTIONS = [];
let FIELDS = [];
let FIELDS_BY_SECTION = {};
let SECTION_MAP = {};
let FIELD_META = [];
let FOREIGN_KEYWORDS = [];
let ACTION_LABELS = {};
let ACTION_SECTIONS = null;
let FIELD_RULES = {};

function fieldMatchesTerm(f, fq) {
  if (f._nSecLabel === fq) return true;
  if (f._nSecLabel && fq.startsWith(f._nSecLabel + ' ')) {
    const remainder = fq.slice(f._nSecLabel.length + 1);
    const tokens = remainder.split(/\s+/).filter(t => t.length >= 2);
    if (!tokens.length) return true;
    const haystack = f._nId + ' ' + f._nLabel + ' ' + f._nXpath;
    return tokens.every(t => haystack.includes(t));
  }
  const tokens = fq.split(/\s+/).filter(t => t.length >= 2);
  if (!tokens.length) return true;
  const haystack = f._nId + ' ' + f._nLabel + ' ' + f._nXpath;
  return tokens.every(t => haystack.includes(t));
}

function rebuildMetadata(format) {
  activeFormat = format;
  SECTIONS = format.sections;
  FIELDS = format.fields;
  SECTION_MAP = {};
  SECTIONS.forEach(s => { SECTION_MAP[s.id] = s; });
  FOREIGN_KEYWORDS = format.foreignKeywords || [];
  ACTION_LABELS = format.actionLabels || {};
  ACTION_SECTIONS = format.actionSections || null;
  FIELD_RULES = format.fieldRules || {};
  FIELD_META = FIELDS.map(f => ({
    ...f,
    _nLabel: norm(f.label),
    _nId: f.csszId || '',
    _nXpath: norm(activeFormat.fieldXpath(f)),
    _nSecLabel: norm((SECTION_MAP[f.section] || {}).label || ''),
    _isForeign: !!(SECTION_MAP[f.section] || {})._foreign
  }));
  FIELDS_BY_SECTION = {};
  FIELD_META.forEach(f => { const key = f.section; if (!FIELDS_BY_SECTION[key]) FIELDS_BY_SECTION[key] = []; FIELDS_BY_SECTION[key].push(f); });
}

function detectFormat(xmlDoc) {
  const root = xmlDoc.documentElement;
  if (root.localName === 'REGZEC') return REGZEC_CONFIG;
  if (root.localName === 'jmhz') return JMHZ_CONFIG;
  alert('Neznámý formát XML');
  return null;
}

// For JMHZ: find the form variant child (bezPriznaku, odlozenyPrijem, etc.)
function getFormRoot(rowEl, format) {
  if (format.fieldMode === 'attributes') return rowEl;
  if (!format.formVariants) return rowEl;
  for (const v of format.formVariants) {
    const child = getChildByLocalNameNS(rowEl, v, format.formNs);
    if (child) return child;
  }
  return rowEl;
}

// For JMHZ: find rows (formulareOsob wrappers -> formularOsoby inner elements)
function findRows(doc, format) {
  if (format.rowsContainer) {
    // REGZEC: employees/employee
    const container = doc.getElementsByTagNameNS(format.ns, format.rowsContainer)[0];
    return container ? Array.from(container.getElementsByTagNameNS(format.ns, format.rowElement)) : [];
  } else if (format.rowParentElement) {
    // JMHZ: formulareOsob contains multiple formularOsoby children
    const wrappers = doc.getElementsByTagNameNS(format.ns, format.rowParentElement);
    const rows = [];
    for (const w of wrappers) {
      for (let i = 0; i < w.childNodes.length; i++) {
        const ch = w.childNodes[i];
        if (ch.nodeType === 1 && ch.localName === format.rowElement) rows.push(ch);
      }
    }
    return rows;
  } else {
    return Array.from(doc.getElementsByTagNameNS(format.ns, format.rowElement));
  }
}

const REQ_TITLES = { 'P': 'Povinné', 'N': 'Nepovinné', 'PP': 'Podmíněně povinné', 'P-OST': 'Povinné (pouze OST)', 'N-OST': 'Nepovinné (pouze OST)', '/': 'Zakázané' };

function getFieldReq(field, action) {
  if (!action || !field.csszId) return null;
  const rules = FIELD_RULES[field.csszId];
  return rules ? (rules[action] || null) : null;
}

function reqClass(req) {
  if (!req) return '';
  if (req.startsWith('P')) return 'col-req-P';
  if (req === 'PP') return 'col-req-PP';
  return 'col-req-N';
}

function norm(s) { return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
