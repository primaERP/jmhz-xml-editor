// === JMHZ Business Rule Controls (Kontroly) ===
// Based on ČSSZ katalogkontrolMH.csv — Měsíční hlášení controls
// Hybrid DSL: declarative rules for common patterns, custom functions for complex ones

(function () {
  'use strict';

  // Header csszId → headerField key mapping (JMHZ hlavička + PVPOJ)
  const HEADER_CSSZ_MAP = {
    '10001': 'hlavicka/idPodani',
    '10002': 'hlavicka/balikPoradi',
    '10003': 'hlavicka/balikyPocet',
    '10005': 'hlavicka/datumVyplneni',
    '10006': 'hlavicka/datumVyplneni',
    '10007': 'hlavicka/typPodani',
    '10010': 'hlavicka/mesic',
    '10011': 'hlavicka/rok',
    '10015': 'hlavicka/formularePocetVBaliku',
    '10016': 'hlavicka/typPodani',
    '10488': 'hlavicka/formularePocetCelkem',
    '10221': 'hlavicka/variabilniSymbol',
    '10023': 'PVPOJ/pojistne/zakladZamestnavateleA',
    '10024': 'PVPOJ/pojistne/pojistneZamestnavateleA',
    '10025': 'PVPOJ/pojistne/zakladZamestnavateleB',
    '10026': 'PVPOJ/pojistne/pojistneZamestnavateleB',
    '10027': 'PVPOJ/pojistne/pojistneZamestnavateleCelkem',
    '10028': 'PVPOJ/pojistne/pojistneZamestnance',
    '10029': 'PVPOJ/pojistne/pojistneCelkem',
    '10033': 'PVPOJ/pojistneUhrada',
    '10483': 'PVPOJ/pojistne/zakladZamestnavateleC',
    '10484': 'PVPOJ/pojistne/pojistneZamestnavateleC',
  };

  // PVPOJ sleva fields not in parseDocumentHeader — read directly from XML
  // Maps csszId → [parentLocalName, elementLocalName] under PVPOJ
  const PVPOJ_SLEVA_MAP = {
    '10030': ['slevaZamestnavatele', 'pocetZamestnancu'],
    '10031': ['slevaZamestnavatele', 'uhrnVymerovacichZakladu'],
    '10032': ['slevaZamestnavatele', 'pojistneSleva'],
    '10485': ['slevyZamestnancu', 'pocetZamestnancu'],
    '10486': ['slevyZamestnancu', 'uhrnVymerovacichZakladu'],
    '10487': ['slevyZamestnancu', 'pojistneSleva'],
    '10543': ['slevyZamestnancuOvoZel', 'pocetZamestnancu'],
    '10544': ['slevyZamestnancuOvoZel', 'uhrnVymerovacichZakladu'],
    '10545': ['slevyZamestnancuOvoZel', 'pojistneSleva'],
  };

  // Central registry for catalog-linked business constants used by implemented controls.
  // `katalogkontrolMHKonstanty.csv` links the official controls to constant names, but does
  // not provide the numeric values themselves, so these values preserve current behavior.
  const KONTROLY_CONSTANTS = {
    rates: {
      employerDiscount: 0.05,          // K3 — Sleva na pojistném (uváděno v procentech)
      employerInsuranceA: 0.248,       // K8, K315 — pojistné za zaměstnavatele (10024, 10478)
      employerInsuranceB: 0.298,       // K10, K315 — pojistné za zaměstnavatele (10026, 10479)
      employerInsuranceC: 0.278,       // K167, K315 — pojistné za zaměstnavatele (10484, 10480)
      employeeInsurance: 0.071,        // K118, K168, K270 — sazba pojistného placená zaměstnancem
      employeeDiscount: 0.065          // K170 — sazba slevy na pojistném podle § 7a
    },
    limits: {
      maxWorkedHours: 240,             // K15 — maximální možný počet odpracovaných hodin
      shorterWorkRangeMax: 30,         // K45 — rozsah kratší pracovní/služební doby
      minMonthlyTaxBonus: 50,          // K74 — výše vyplaceného měsíčního daňového bonusu
      ovozelVzMax: 48500               // K271 — § 23b odst. 4 ZPSZ threshold
    },
    tolerances: {
      relativeError: 0.01,
      absoluteAmount: 100,
      roundedHalf: 0.5,
      employeeInsuranceUpperRate: 0.07171,
      employeeDiscountUpperRate: 0.06565,
      combinedInsuranceDiff: 1
    }
  };

  // Read a PVPOJ sleva field directly from the XML document
  function readPvpojSleva(xmlDoc, csszId) {
    if (!xmlDoc) return null;
    const mapping = PVPOJ_SLEVA_MAP[csszId];
    if (!mapping) return null;
    const root = xmlDoc.documentElement;
    const pvpoj = findChildEl(root, 'PVPOJ');
    if (!pvpoj) return null;
    const parent = findChildEl(pvpoj, mapping[0]);
    if (!parent) return null;
    const el = findChildEl(parent, mapping[1]);
    if (!el) return null;
    const txt = el.textContent.trim();
    return txt === '' ? null : txt;
  }
  function readPvpojSlevaNum(xmlDoc, csszId) {
    const v = readPvpojSleva(xmlDoc, csszId);
    if (v === null) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }

  // Read souhrn-level fields from XML (e.g., specifickaSkutecnost)
  function readSouhrnField(xmlDoc, path) {
    if (!xmlDoc) return null;
    const root = xmlDoc.documentElement;
    let el = root;
    for (const part of path) {
      el = findChildEl(el, part);
      if (!el) return null;
    }
    const txt = el.textContent.trim();
    return txt === '' ? null : txt;
  }

  function findChildEl(parent, localName) {
    if (!parent) return null;
    for (const c of parent.children) {
      if (c.localName === localName) return c;
    }
    return null;
  }

  // ── Field resolver: csszId → value from employee mirror ──────
  let _csszIdToField = null;    // Map<csszId, fieldDef>
  let _fieldsBySection = null;  // from helpers.js FIELDS_BY_SECTION

  function buildCsszIndex(fields) {
    _csszIdToField = new Map();
    fields.forEach(f => { if (f.csszId) _csszIdToField.set(f.csszId, f); });
  }

  function fieldKeyFor(field, instanceIndex) {
    const attrKey = field.element || field.attr;
    if (instanceIndex !== undefined) return field.section + '[' + instanceIndex + ']/' + attrKey;
    return field.section + '/' + attrKey;
  }

  // Get raw string value by csszId from employee mirror
  function getVal(emp, csszId, instanceIndex) {
    const f = _csszIdToField.get(csszId);
    if (!f) return undefined;
    const key = fieldKeyFor(f, instanceIndex);
    return emp.fields[key]?.value || '';
  }

  function getRowHeaderVal(emp, csszId) {
    if (!emp?._empEl) return '';
    if (csszId === '10495') {
      const hlavicka = findChildEl(emp._empEl, 'hlavicka');
      const prim = findChildEl(hlavicka, 'primarniPpv');
      return prim?.textContent?.trim() || '';
    }
    return '';
  }

  function getVariantMetaVal(emp, csszId) {
    if (!emp?._formRoot) return '';
    if (csszId === '10548' && emp._formRoot.localName === 'odlozenyPrijem') {
      const typ = findChildEl(emp._formRoot, 'typ');
      return typ?.textContent?.trim() || '';
    }
    return '';
  }

  // Read ELDP období data from odložený příjem forms
  // Returns null for non-odložený příjem, or array of { mesic, rok, eldpEls: [Element] }
  function getOdlozenyEldpObdobi(emp) {
    if (!emp?._formRoot || emp._formRoot.localName !== 'odlozenyPrijem') return null;
    var pojisteni = findChildEl(emp._formRoot, 'pojisteni');
    if (!pojisteni) return null;
    var eldpObdobi = findChildEl(pojisteni, 'eldpObdobi');
    if (!eldpObdobi) return null;
    var result = [];
    for (var i = 0; i < eldpObdobi.children.length; i++) {
      var obd = eldpObdobi.children[i];
      if (obd.localName !== 'obdobi') continue;
      var mEl = findChildEl(obd, 'mesic');
      var rEl = findChildEl(obd, 'rok');
      var mesic = mEl ? parseInt(mEl.textContent, 10) : null;
      var rok = rEl ? parseInt(rEl.textContent, 10) : null;
      var eldpSez = findChildEl(obd, 'eldpSeznam');
      var eldpEls = [];
      if (eldpSez) {
        for (var j = 0; j < eldpSez.children.length; j++) {
          if (eldpSez.children[j].localName === 'eldp') eldpEls.push(eldpSez.children[j]);
        }
      }
      result.push({ mesic: mesic, rok: rok, eldpEls: eldpEls });
    }
    return result.length > 0 ? result : null;
  }

  // Read a numeric field from a raw ELDP XML element by csszId
  function readEldpElNum(eldpEl, csszId) {
    var def = _csszIdToField?.get(csszId);
    if (!def) return null;
    var el = findChildEl(eldpEl, def.attr);
    if (!el) return null;
    var txt = el.textContent.trim();
    if (txt === '') return null;
    var n = parseFloat(txt.replace(/\s/g, '').replace(',', '.'));
    return isNaN(n) ? null : n;
  }

  // Read a string field from a raw ELDP XML element by csszId
  function readEldpElVal(eldpEl, csszId) {
    var def = _csszIdToField?.get(csszId);
    if (!def) return '';
    var el = findChildEl(eldpEl, def.attr);
    return el ? el.textContent.trim() : '';
  }

  // Get numeric value (0 if empty/NaN)
  function getNum(emp, csszId, instanceIndex) {
    const v = getVal(emp, csszId, instanceIndex);
    if (v === '' || v === undefined) return null; // null = not present
    const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
    return isNaN(n) ? null : n;
  }

  // Check if field is filled (non-empty)
  function isFilled(emp, csszId, instanceIndex) {
    const v = getVal(emp, csszId, instanceIndex);
    return v !== '' && v !== undefined && v !== null;
  }

  // Get field definition by csszId
  function getFieldDef(csszId) { return _csszIdToField?.get(csszId) || null; }

  // Get field label for error messages
  function getFieldLabel(csszId) { return getFieldDef(csszId)?.label || csszId; }

  // Get section label for a csszId
  function getSectionLabel(csszId) {
    const f = getFieldDef(csszId);
    if (!f) return '';
    // Access global SECTION_MAP from helpers.js
    return (typeof SECTION_MAP !== 'undefined' && SECTION_MAP[f.section])
      ? SECTION_MAP[f.section].label : f.section;
  }

  // Get header field value (PVPOJ, souhrn, hlavicka) by csszId
  // Checks parseDocumentHeader output first, falls back to PVPOJ sleva XML read
  let _xmlDoc = null; // set during runKontroly
  function getHeaderVal(headerFields, csszId) {
    const hdrKey = HEADER_CSSZ_MAP[csszId];
    if (hdrKey) {
      const hf = headerFields.find(h => h.key === hdrKey);
      if (hf) return hf.value || '';
    }
    // Fallback: PVPOJ sleva fields read from XML
    if (PVPOJ_SLEVA_MAP[csszId] && _xmlDoc) {
      return readPvpojSleva(_xmlDoc, csszId) || '';
    }
    return '';
  }

  function getHeaderNum(headerFields, csszId) {
    const v = getHeaderVal(headerFields, csszId);
    if (v === '') return null;
    const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
    return isNaN(n) ? null : n;
  }

  // Get all instances of a repeating section for an employee
  function getRepeatCount(emp, sectionId) {
    return emp._instanceCounts?.[sectionId] || 0;
  }

  // ── DSL Rule Interpreter ─────────────────────────────────────

  function evalRule(rule, emp, headerFields, allEmps) {
    const errors = [];
    const sev = rule.sev || 'error';

    function pushError(msg, csszId, instanceIndex) {
      errors.push({
        severity: sev,
        controlId: rule.id,
        fieldCsszId: csszId || rule.target || (rule.fields && rule.fields[0]) || '',
        instanceIndex: instanceIndex,
        message: msg || rule.msg
      });
    }

    // Pre-condition: if `cond` is specified, skip rule if condition not met
    if (rule.cond) {
      const cv = getVal(emp, rule.cond.field);
      if (rule.cond.op === '>' && !(getNum(emp, rule.cond.field) > (rule.cond.val || 0))) return errors;
      if (rule.cond.op === '=' && cv !== String(rule.cond.val)) return errors;
      if (rule.cond.op === '!=' && cv === String(rule.cond.val)) return errors;
      if (rule.cond.op === 'filled' && !isFilled(emp, rule.cond.field)) return errors;
      if (rule.cond.op === 'empty' && isFilled(emp, rule.cond.field)) return errors;
      if (rule.cond.op === 'in') {
        if (!rule.cond.vals || !rule.cond.vals.includes(cv)) return errors;
      }
    }

    switch (rule.type) {
      // target = sum of parts
      case 'sum_eq': {
        const target = getNum(emp, rule.target);
        if (target === null) break;
        const sum = rule.parts.reduce((s, id) => s + (getNum(emp, id) || 0), 0);
        if (Math.abs(target - sum) > 0.001) pushError(rule.msg, rule.target);
        break;
      }

      // target >= sum of parts
      case 'sum_gte': {
        const target = getNum(emp, rule.target);
        if (target === null) break;
        const sum = rule.parts.reduce((s, id) => s + (getNum(emp, id) || 0), 0);
        if (target < sum - 0.001) pushError(rule.msg, rule.target);
        break;
      }

      // A >= B
      case 'gte': {
        const a = getNum(emp, rule.a);
        const b = getNum(emp, rule.b);
        if (a === null || b === null) break;
        if (a < b - 0.001) pushError(rule.msg, rule.a);
        break;
      }

      // A <= B
      case 'lte': {
        const a = getNum(emp, rule.a);
        const b = getNum(emp, rule.b);
        if (a === null || b === null) break;
        if (a > b + 0.001) pushError(rule.msg, rule.a);
        break;
      }

      // A = B
      case 'eq': {
        const a = getNum(emp, rule.a);
        const b = getNum(emp, rule.b);
        if (a === null || b === null) break;
        if (Math.abs(a - b) > 0.001) pushError(rule.msg, rule.a);
        break;
      }

      // value >= 0 (non-negative)
      case 'non_neg': {
        const v = getNum(emp, rule.field);
        if (v === null) break;
        if (v < 0) pushError(rule.msg, rule.field);
        break;
      }

      // value must be in [min, max]
      case 'range': {
        const v = getNum(emp, rule.field);
        if (v === null) break;
        if ((rule.min !== undefined && v < rule.min) || (rule.max !== undefined && v > rule.max))
          pushError(rule.msg, rule.field);
        break;
      }

      // target = ceil(rate * base) — insurance percentage calculation
      case 'pct_eq': {
        const target = getNum(emp, rule.target);
        const base = getNum(emp, rule.base);
        if (target === null || base === null) break;
        const expected = Math.ceil(rule.rate * base);
        if (Math.abs(target - expected) > 0.5) pushError(rule.msg, rule.target);
        break;
      }

      // If condition, then listed fields must be filled
      case 'if_then_required': {
        if (!evalCondition(emp, rule.condition)) break;
        const missing = rule.fields.filter(id => !isFilled(emp, id));
        if (missing.length > 0) pushError(rule.msg, missing[0]);
        break;
      }

      // If condition, then listed fields must be empty
      case 'if_then_empty': {
        if (!evalCondition(emp, rule.condition)) break;
        const present = rule.fields.filter(id => isFilled(emp, id));
        if (present.length > 0) pushError(rule.msg, present[0]);
        break;
      }

      // Date A <= Date B
      case 'date_lte': {
        const a = getVal(emp, rule.a);
        const b = getVal(emp, rule.b);
        if (!a || !b) break;
        if (a > b) pushError(rule.msg, rule.a);
        break;
      }

      // Custom JS function
      case 'custom': {
        if (typeof rule.check === 'function') {
          const ctx = {
            getVal: (id, ii) => getVal(emp, id, ii),
            getNum: (id, ii) => getNum(emp, id, ii),
            isFilled: (id, ii) => isFilled(emp, id, ii),
            getHeaderVal: (id) => getHeaderVal(headerFields, id),
            getHeaderNum: (id) => getHeaderNum(headerFields, id),
            allEmps, headerFields, emp, rule,
            getRepeatCount: (secId) => getRepeatCount(emp, secId),
            getFieldLabel
          };
          const customErrors = rule.check(ctx);
          if (customErrors && customErrors.length > 0) {
            customErrors.forEach(ce => {
              errors.push({
                severity: ce.severity || sev,
                controlId: rule.id,
                fieldCsszId: ce.fieldCsszId || '',
                message: ce.message || rule.msg
              });
            });
          }
        }
        break;
      }
    }

    return errors;
  }

  // Evaluate a condition object: { field, op, val/vals }
  function evalCondition(emp, cond) {
    if (!cond) return true;
    const v = getVal(emp, cond.field);
    const n = getNum(emp, cond.field);
    switch (cond.op) {
      case '=': return v === String(cond.val);
      case '!=': return v !== String(cond.val);
      case '>': return n !== null && n > (cond.val || 0);
      case '>=': return n !== null && n >= (cond.val || 0);
      case '<': return n !== null && n < (cond.val || 0);
      case 'filled': return isFilled(emp, cond.field);
      case 'empty': return !isFilled(emp, cond.field);
      case 'in': return cond.vals && cond.vals.includes(v);
      case 'not_in': return !cond.vals || !cond.vals.includes(v);
      default: return true;
    }
  }

  // ── Control Definitions ──────────────────────────────────────
  // Scope: 'emp' = per-employee, 'header' = document header, 'cross' = cross-employee aggregation
  // sev: 'error' = nepropustná, 'warning' = propustná

  const KONTROLY = [
    // ═══ Phase 1: Controls 1-61 ═══

    // K1: Počet zaměstnanců se slevou = count of employees with 10372="true"
    { id: 1, scope: 'cross', sev: 'warning', type: 'custom',
      msg: 'Nesouhlasí počet zaměstnanců, za které zaměstnavatel uplatňuje slevu na pojistném.',
      check: function(ctx) {
        const expected = readPvpojSlevaNum(_xmlDoc, '10030');
        if (expected === null) return [];
        const count = ctx.allEmps.filter(e => {
          const v = getVal(e, '10372');
          return v === 'true' || v === 'ANO';
        }).length;
        if (count !== expected) return [{ fieldCsszId: '10030', message: ctx.rule.msg }];
        return [];
      }},

    // K3: Sleva na pojistném = ceil(0.05 * úhrn VZ zaměstnanců se slevou)
    { id: 3, scope: 'cross', sev: 'error', type: 'custom',
      msg: 'Sleva na pojistném neodpovídá úhrnu vyměřovacích základů zaměstnanců, za které je uplatňována.',
      check: function(ctx) {
        const sleva = readPvpojSlevaNum(_xmlDoc, '10032');
        const zaklad = readPvpojSlevaNum(_xmlDoc, '10031');
        if (sleva === null || zaklad === null) return [];
        const expected = Math.ceil(KONTROLY_CONSTANTS.rates.employerDiscount * zaklad);
        if (Math.abs(sleva - expected) > KONTROLY_CONSTANTS.tolerances.roundedHalf) return [{ fieldCsszId: '10032', message: ctx.rule.msg }];
        return [];
      }},

    // K4: Pojistné k úhradě = pojistné celkem - sleva zaměstnavatele - úhrn slev zaměstnanců
    { id: 4, scope: 'cross', sev: 'error', type: 'custom',
      msg: 'Pojistné k úhradě neodpovídá vykázanému pojistnému celkem a případně odečítané slevě.',
      check: function(ctx) {
        const uhrada = ctx.getHeaderNum('10033');
        const celkem = ctx.getHeaderNum('10029');
        if (uhrada === null || celkem === null) return [];
        const slevaZam = readPvpojSlevaNum(_xmlDoc, '10032') || 0;
        const uhrnSlev = readPvpojSlevaNum(_xmlDoc, '10487') || 0;
        const uhrnSlevOvo = readPvpojSlevaNum(_xmlDoc, '10545') || 0;
        const expected = celkem - slevaZam - uhrnSlev - uhrnSlevOvo;
        if (Math.abs(uhrada - expected) > 0.5) return [{ fieldCsszId: '10033', message: ctx.rule.msg }];
        return [];
      }},

    // K7: Úhrn VZ zaměstnanců (A) = sum of employee 10478
    { id: 7, scope: 'cross', sev: 'warning', type: 'custom',
      msg: 'Úhrn nesouhlasí se součtem vyměřovacích základů dotčených zaměstnanců (nevykonávají činnost v rizikovém zaměstnání).',
      check: function(ctx) {
        const header = ctx.getHeaderNum('10023');
        if (header === null) return [];
        const sum = ctx.allEmps.reduce((s, e) => s + (getNum(e, '10478') || 0), 0);
        if (Math.abs(header - sum) > 0.5) return [{ fieldCsszId: '10023', message: ctx.rule.msg }];
        return [];
      }},

    // K8: Pojistné zaměstnavatele A = ceil(0.248 * základ A)
    { id: 8, scope: 'header', sev: 'error', type: 'pct_eq',
      target: '10024', base: '10023', rate: KONTROLY_CONSTANTS.rates.employerInsuranceA,
      msg: 'Vykázané pojistné neodpovídá vykázanému úhrnu vyměřovacích základů zaměstnanců (nevykonávají rizikové zaměstnání).' },

    // K9: Úhrn VZ zaměstnanců (B) = sum of employee 10479
    { id: 9, scope: 'cross', sev: 'warning', type: 'custom',
      msg: 'Úhrn nesouhlasí se součtem vyměřovacích základů zaměstnanců (zdravotničtí záchranáři nebo členové HZS).',
      check: function(ctx) {
        const header = ctx.getHeaderNum('10025');
        if (header === null) return [];
        const sum = ctx.allEmps.reduce((s, e) => s + (getNum(e, '10479') || 0), 0);
        if (Math.abs(header - sum) > 0.5) return [{ fieldCsszId: '10025', message: ctx.rule.msg }];
        return [];
      }},

    // K10: Pojistné zaměstnavatele B = ceil(0.298 * základ B)
    { id: 10, scope: 'header', sev: 'error', type: 'pct_eq',
      target: '10026', base: '10025', rate: KONTROLY_CONSTANTS.rates.employerInsuranceB,
      msg: 'Vykázané pojistné neodpovídá vykázanému úhrnu vyměřovacích základů zaměstnanců (zdravotničtí záchranáři nebo členové HZS).' },

    // K11: Pojistné zaměstnavatele celkem = A + B + C
    { id: 11, scope: 'header', sev: 'error', type: 'sum_eq',
      target: '10027', parts: ['10024', '10026', '10484'],
      msg: 'Vykázané pojistné za zaměstnavatele neodpovídá vykázaným dílčím hodnotám.' },

    // K12: Pojistné zaměstnance = sum of employee 10370
    { id: 12, scope: 'cross', sev: 'warning', type: 'custom',
      msg: 'Pojistné za zaměstnance nesouhlasí se součtem pojistného za všechny jednotlivé zaměstnance.',
      check: function(ctx) {
        const header = ctx.getHeaderNum('10028');
        if (header === null) return [];
        const sum = ctx.allEmps.reduce((s, e) => s + (getNum(e, '10370') || 0), 0);
        if (Math.abs(header - sum) > 0.5) return [{ fieldCsszId: '10028', message: ctx.rule.msg }];
        return [];
      }},

    // K13: Pojistné celkem = pojistné zaměstnavatele celkem + pojistné zaměstnance
    { id: 13, scope: 'header', sev: 'error', type: 'sum_eq',
      target: '10029', parts: ['10027', '10028'],
      msg: 'Vykázané pojistné celkem neodpovídá vykázanému pojistnému za zaměstnance a pojistnému za zaměstnavatele.' },

    // K15: Odpracované hodiny max 240 for pracovní/služební poměr
    { id: 15, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Překročen maximální možný počet odpracovaných hodin, zkontrolujte položku.',
      check: function(ctx) {
        const druh = ctx.getVal('10239');
        if (!druh) return [];
        const d = parseInt(druh);
        if (d < 1 || d > 9) return [];
        const hodiny = ctx.getNum('10268');
        if (hodiny === null) return [];
        if (hodiny > KONTROLY_CONSTANTS.limits.maxWorkedHours) return [{ fieldCsszId: '10268', message: ctx.rule.msg }];
        return [];
      }},

    // K20: Odpracované hodiny >= přesčasové hodiny
    { id: 20, scope: 'emp', sev: 'error', type: 'gte', a: '10268', b: '10269',
      msg: 'Přesčasové hodiny převyšují odpracované hodiny.' },

    // K23: Neodpracované hodiny s náhradou >= neodpracované hodiny dovolená
    { id: 23, scope: 'emp', sev: 'error', type: 'gte', a: '10276', b: '10279',
      msg: 'Chybný počet neodpracovaných hodin s náhradou či nekrácením mzdy.' },

    // K28: Mzda zúčtovaná >= součet složek mzdy
    { id: 28, scope: 'emp', sev: 'error', type: 'sum_gte',
      target: '10328', parts: ['10329', '10330', '10331', '10332', '10333'],
      msg: 'Mzda zúčtovaná je menší než součet jejích složek.' },

    // K29: Příplatky celkem >= noční + soboty/neděle + svátek
    { id: 29, scope: 'emp', sev: 'error', type: 'sum_gte',
      target: '10332', parts: ['10334', '10335', '10336'],
      msg: 'Příplatky jsou nižší než součet jednotlivých příplatků.' },

    // K31: Období >= 01/2026
    { id: 31, scope: 'header', sev: 'error', type: 'custom',
      msg: 'Měsíční hlášení nelze podat za období před 01/2026.',
      check: function(ctx) {
        const mesic = ctx.getHeaderNum('10010');
        const rok = ctx.getHeaderNum('10011');
        if (rok === null || mesic === null) return [];
        if (rok < 2026 || (rok === 2026 && mesic < 1))
          return [{ fieldCsszId: '10011', message: ctx.rule.msg }];
        return [];
      }},

    // K34: Pokud neodpracované hodiny DPN > 0, pak náhrady DPN > 0
    { id: 34, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Pokud je vyplněn počet neodpracovaných hodin z důvodu DPN, musí být zároveň vyplněna náhrada při DPN.',
      check: function(ctx) {
        const hodiny = ctx.getNum('10278');
        if (hodiny === null || hodiny <= 0) return [];
        const nahrada = ctx.getNum('10342');
        if (nahrada === null || nahrada <= 0)
          return [{ fieldCsszId: '10342', message: ctx.rule.msg }];
        return [];
      }},

    // K35: Pokud neodpracované hodiny dovolená > 0, pak náhrady za dovolenou > 0
    { id: 35, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Chybí údaj k náhradě za dovolenou.',
      check: function(ctx) {
        const hodiny = ctx.getNum('10279');
        if (hodiny === null || hodiny <= 0) return [];
        const nahrada = ctx.getNum('10338');
        if (nahrada === null || nahrada <= 0)
          return [{ fieldCsszId: '10338', message: ctx.rule.msg }];
        return [];
      }},

    // K36: Pokud přesčasové hodiny > 0, pak příplatky za přesčas >= 0
    { id: 36, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Chybí údaj k příplatkům za přesčas.',
      check: function(ctx) {
        const prescas = ctx.getNum('10269');
        if (prescas === null || prescas <= 0) return [];
        const priplatky = ctx.getNum('10333');
        if (priplatky === null)
          return [{ fieldCsszId: '10333', message: ctx.rule.msg }];
        return [];
      }},

    // K37: IK MPSV format check (10 digits, modulo 11)
    { id: 37, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'IK MPSV neodpovídá formátu.',
      check: function(ctx) {
        const ik = ctx.getVal('10051');
        if (!ik) return [];
        if (!/^\d{10}$/.test(ik)) return [{ fieldCsszId: '10051', message: ctx.rule.msg }];
        const digits = ik.split('').map(Number);
        const first9 = digits.slice(0, 9);
        let sum = 0;
        for (let i = 0; i < 9; i++) sum += first9[i];
        const remainder = sum % 11;
        const check = remainder >= 10 ? 0 : remainder;
        if (digits[9] !== check) return [{ fieldCsszId: '10051', message: ctx.rule.msg }];
        return [];
      }},

    // K42: Sleva na pojistném zaměstnavatele jen pro druh činnosti 1-9
    { id: 42, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Slevu na pojistném zaměstnavatele lze uplatnit pouze za zaměstnance s druhem činnosti 1-9.',
      check: function(ctx) {
        const sleva = ctx.getVal('10372');
        if (sleva !== 'true' && sleva !== 'ANO') return [];
        const druh = ctx.getVal('10239');
        if (!druh) return [{ fieldCsszId: '10372', message: ctx.rule.msg }];
        const d = parseInt(druh);
        if (d < 1 || d > 9) return [{ fieldCsszId: '10372', message: ctx.rule.msg }];
        return [];
      }},

    // K43: Pojištění od <= pojištění do AND pojištění od <= datum vyplnění
    { id: 43, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Chybné datum od.',
      check: function(ctx) {
        const od = ctx.getVal('10354');
        if (!od) return [];
        const doVal = ctx.getVal('10355');
        if (doVal && od > doVal) return [{ fieldCsszId: '10354', message: ctx.rule.msg }];
        const datVypl = ctx.getHeaderVal('10005');
        if (datVypl && od > datVypl.substring(0, 10))
          return [{ fieldCsszId: '10354', message: ctx.rule.msg }];
        return [];
      }},

    // K44: Pojištění do >= pojištění od AND pojištění do <= datum vyplnění
    { id: 44, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Chybné datum do.',
      check: function(ctx) {
        const doVal = ctx.getVal('10355');
        if (!doVal) return [];
        const od = ctx.getVal('10354');
        if (od && doVal < od) return [{ fieldCsszId: '10355', message: ctx.rule.msg }];
        const datVypl = ctx.getHeaderVal('10005');
        if (datVypl && doVal > datVypl.substring(0, 10))
          return [{ fieldCsszId: '10355', message: ctx.rule.msg }];
        return [];
      }},

    // K45: Rozsah kratší pracovní doby <= 30
    { id: 45, scope: 'emp', sev: 'error', type: 'range', field: '10373', max: KONTROLY_CONSTANTS.limits.shorterWorkRangeMax,
      msg: 'Uvedený počet hodin překračuje limit stanovený právní úpravou (30 hodin).' },

    // K50: Vyměřovací základ >= 0
    { id: 50, scope: 'emp', sev: 'error', type: 'non_neg', field: '10245',
      msg: 'Vyměřovací základ nesmí být záporný.' },

    // K56: Datum dosažení expozice NPE <= datum vyplnění
    { id: 56, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Datum musí být nižší než datum vyplnění podání.',
      check: function(ctx) {
        const datum = ctx.getVal('10272');
        if (!datum) return [];
        const datVypl = ctx.getHeaderVal('10005');
        if (!datVypl) return [];
        if (datum > datVypl.substring(0, 10))
          return [{ fieldCsszId: '10272', message: ctx.rule.msg }];
        return [];
      }},

    // K57: Odpracované hodiny rizikové práce <= odpracované hodiny
    { id: 57, scope: 'emp', sev: 'error', type: 'lte', a: '10273', b: '10268',
      msg: 'Počet odpracovaných hodin rizikové práce je větší než počet odpracovaných hodin.' },

    // K58: Počet kalendářních dnů pojištění <= dnů v měsíci (ELDP repeating)
    { id: 58, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Neodpovídá možnému počtu dnů v kalendářním měsíci.',
      check: function(ctx) {
        var errors = [];
        // Check odložený příjem ELDP období (10537/10538 per období)
        var obdobi = getOdlozenyEldpObdobi(ctx.emp);
        if (obdobi) {
          for (var oi = 0; oi < obdobi.length; oi++) {
            var m = obdobi[oi].mesic, r = obdobi[oi].rok;
            if (m === null || r === null) continue;
            var dim = new Date(r, m, 0).getDate();
            for (var ei = 0; ei < obdobi[oi].eldpEls.length; ei++) {
              var dny = readEldpElNum(obdobi[oi].eldpEls[ei], '10356');
              if (dny !== null && dny > dim)
                errors.push({ fieldCsszId: '10356', message: ctx.rule.msg });
            }
          }
          return errors;
        }
        // Standard form: use header 10010/10011
        var mesic = ctx.getHeaderNum('10010');
        var rok = ctx.getHeaderNum('10011');
        if (mesic === null || rok === null) return [];
        var daysInMonth = new Date(rok, mesic, 0).getDate();
        var n = ctx.getRepeatCount('pojisteni/eldpSeznam/eldp');
        for (var i = 0; i < n; i++) {
          var dny2 = ctx.getNum('10356', i);
          if (dny2 !== null && dny2 > daysInMonth)
            errors.push({ fieldCsszId: '10356', message: ctx.rule.msg });
        }
        return errors;
      }},

    // K59: Vyměřovací základ ELDP rules based on Kód ELDP
    { id: 59, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Chybně uvedený vyměřovací základ.',
      check: function(ctx) {
        var n = ctx.getRepeatCount('pojisteni/eldpSeznam/eldp');
        var errors = [];
        for (var i = 0; i < n; i++) {
          var kod = ctx.getVal('10240', i) || '';
          var vz = ctx.getNum('10245', i);
          var dny = ctx.getNum('10356', i);
          var vylDoby = ctx.getNum('10357', i);
          var odecDoby = ctx.getNum('10375', i);
          if (kod.length < 2) continue;
          var druhaPozice = kod.charAt(1);
          // Rule 1: if 2nd position = P → VZ must be filled
          if (druhaPozice === 'P' && (vz === null || vz === undefined))
            errors.push({ fieldCsszId: '10245', message: 'Kód ELDP obsahuje P, vyměřovací základ musí být uveden.' });
          // Rule 2: if dny = vyloučené doby AND 2nd ≠ D → VZ = 0
          if (dny !== null && vylDoby !== null && dny === vylDoby && druhaPozice !== 'D') {
            if (vz !== null && vz !== 0)
              errors.push({ fieldCsszId: '10245', message: ctx.rule.msg });
          }
          // Rule 3: Pension age transition — pre-pension record must have VZ=0
          // if consecutive ELDP pair with same 1st pos, one has D, dates connect
          if (druhaPozice !== 'D' && n >= 2) {
            for (var j = 0; j < n; j++) {
              if (i === j) continue;
              var kodJ = ctx.getVal('10240', j) || '';
              if (kodJ.length < 2 || kodJ.charAt(1) !== 'D') continue;
              var dnyJ = ctx.getNum('10356', j);
              if (dnyJ === null) continue;
              if (kod.charAt(0) !== kodJ.charAt(0)) continue; // same activity type
              var doI = ctx.getVal('10242', i);
              var odJ = ctx.getVal('10241', j);
              if (!doI || !odJ) continue;
              var dEnd = new Date(doI.substring(0, 10));
              var dStart = new Date(odJ.substring(0, 10));
              dEnd.setDate(dEnd.getDate() + 1);
              if (dEnd.getTime() === dStart.getTime()) {
                if (vz !== null && vz !== 0)
                  errors.push({ fieldCsszId: '10245', message: ctx.rule.msg });
                break;
              }
            }
          }
          // Rule 4: if 2nd = D and dny = 0 and odecDoby = vylDoby → VZ = 0
          if (druhaPozice === 'D' && dny !== null && dny === 0
              && odecDoby !== null && vylDoby !== null && odecDoby === vylDoby) {
            if (vz !== null && vz !== 0)
              errors.push({ fieldCsszId: '10245', message: ctx.rule.msg });
          }
          // Rule 5: if 2nd ≠ D and ≠ P and dny = 0 → VZ = 0
          if (druhaPozice !== 'D' && druhaPozice !== 'P' && dny !== null && dny === 0) {
            if (vz !== null && vz !== 0)
              errors.push({ fieldCsszId: '10245', message: ctx.rule.msg });
          }
        }
        return errors;
      }},

    // K60: Datum nastání specifické právní skutečnosti < datum vyplnění
    { id: 60, scope: 'cross', sev: 'error', type: 'custom',
      msg: 'Datum nastání specifické právní skutečnosti musí být menší než datum podání.',
      check: function(ctx) {
        const datum = readSouhrnField(_xmlDoc, ['souhrn', 'specifickaSkutecnost', 'datum']);
        if (!datum) return [];
        const datVypl = ctx.getHeaderVal('10005');
        if (!datVypl) return [];
        if (datum >= datVypl.substring(0, 10))
          return [{ fieldCsszId: '10409', message: ctx.rule.msg }];
        return [];
      }},

    // K61: XSD validation — handled by existing XSD validator, skip

    // ═══ Phase 2: Controls 72-125 ═══

    // K72: Zúčtovaný příjem celkem >= 0
    { id: 72, scope: 'emp', sev: 'error', type: 'non_neg', field: '10286',
      msg: 'Musí být uvedena hodnota větší nebo rovna nule.' },

    // K74: Daňový bonus >= 0, a pokud > 0 pak >= 50
    { id: 74, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Hodnota musí být rovna nule nebo větší rovno než 50 Kč.',
      check: function(ctx) {
        const v = ctx.getNum('10306');
        if (v === null) return [];
        if (v < 0 || (v > 0 && v < KONTROLY_CONSTANTS.limits.minMonthlyTaxBonus))
          return [{ fieldCsszId: '10306', message: ctx.rule.msg }];
        return [];
      }},

    // K78: Přeplatek z ročního zúčtování = daňový přeplatek + doplatek bonusu
    { id: 78, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Hodnota neodpovídá součtu dílčích položek.',
      check: function(ctx) {
        const druh = ctx.getVal('10239');
        if (druh === '12') return []; // mezinárodní pronájem síly excluded
        const celkem = ctx.getNum('10321');
        if (celkem === null) return [];
        const dan = ctx.getNum('10322') || 0;
        const bonus = ctx.getNum('10323') || 0;
        if (Math.abs(celkem - (dan + bonus)) > 0.5)
          return [{ fieldCsszId: '10321', message: ctx.rule.msg }];
        return [];
      }},

    // K79: Pokud roční zúčtování provedeno, pak povinné položky
    { id: 79, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Není uvedena hodnota pro roční zúčtování záloh.',
      check: function(ctx) {
        const proved = ctx.getVal('10320');
        if (proved !== 'true' && proved !== 'ANO') return [];
        const required = ['10321', '10322', '10323', '10420', '10454'];
        const missing = required.filter(id => !ctx.isFilled(id));
        if (missing.length > 0)
          return [{ fieldCsszId: missing[0], message: ctx.rule.msg }];
        return [];
      }},

    // K81: Rodné číslo uživatele — modulo check
    { id: 81, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Chybně uvedené rodné číslo.',
      check: function(ctx) {
        const rc = ctx.getVal('10457');
        if (!rc) return [];
        const digits = rc.replace(/\//g, '');
        if (!/^\d{9,10}$/.test(digits)) return [{ fieldCsszId: '10457', message: ctx.rule.msg }];
        if (digits.length === 10) {
          const num = parseInt(digits, 10);
          if (num % 11 !== 0) return [{ fieldCsszId: '10457', message: ctx.rule.msg }];
        }
        return [];
      }},

    // K82: Pokud specifická právní skutečnost, pak výplatní termín u všech zaměstnanců
    { id: 82, scope: 'cross', sev: 'error', type: 'custom',
      msg: 'Výplatní termín musí být uveden.',
      check: function(ctx) {
        const typ = readSouhrnField(_xmlDoc, ['souhrn', 'specifickaSkutecnost', 'typ']);
        if (!typ) return [];
        const errors = [];
        ctx.allEmps.forEach(e => {
          if (!isFilled(e, '10410'))
            errors.push({ fieldCsszId: '10410', message: ctx.rule.msg });
        });
        return errors;
      }},

    // K84: Pořadí balíku <= počet balíků
    { id: 84, scope: 'header', sev: 'error', type: 'lte', a: '10002', b: '10003',
      msg: 'Pořadí balíku nesmí být vyšší než počet balíků.' },

    // K87: První pozice kódu ELDP odpovídá druhu činnosti
    { id: 87, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Kód ELDP neodpovídá číselníku Druh činnosti.',
      check: function(ctx) {
        const druh = ctx.getVal('10239');
        if (!druh) return [];
        const n = ctx.getRepeatCount('pojisteni/eldpSeznam/eldp');
        const errors = [];
        for (let i = 0; i < n; i++) {
          const kod = ctx.getVal('10240', i);
          if (kod && kod.charAt(0) !== druh.charAt(0))
            errors.push({ fieldCsszId: '10240', message: ctx.rule.msg });
        }
        return errors;
      }},

    // K88: Datum vyplnění <= aktuální datum
    { id: 88, scope: 'header', sev: 'error', type: 'custom',
      msg: 'Datum vyplnění podání musí být nižší nebo rovno aktuálnímu datu.',
      check: function(ctx) {
        const dat = ctx.getHeaderVal('10005');
        if (!dat) return [];
        const today = new Date().toISOString().substring(0, 10);
        if (dat.substring(0, 10) > today)
          return [{ fieldCsszId: '10005', message: ctx.rule.msg }];
        return [];
      }},

    // K90: Období < aktuální měsíc
    { id: 90, scope: 'header', sev: 'error', type: 'custom',
      msg: 'Měsíc musí být nižší aktuálnímu měsíci a roku.',
      check: function(ctx) {
        const mesic = ctx.getHeaderNum('10010');
        const rok = ctx.getHeaderNum('10011');
        if (mesic === null || rok === null) return [];
        const now = new Date();
        const curY = now.getFullYear(), curM = now.getMonth() + 1;
        if (rok > curY || (rok === curY && mesic >= curM))
          return [{ fieldCsszId: '10010', message: ctx.rule.msg }];
        return [];
      }},

    // K93: Počet formulářů v balíku <= počet formulářů celkem
    { id: 93, scope: 'header', sev: 'error', type: 'lte', a: '10015', b: '10488',
      msg: 'Počet formulářů v balíku musí být maximálně jako Počet formulářů celkem.' },

    // K94: Stanovený fond pracovní doby >= 0
    { id: 94, scope: 'emp', sev: 'error', type: 'non_neg', field: '10259',
      msg: 'Stanovený fond pro danou profesi musí být kladná nebo nulová hodnota.' },

    // K95: Sjednaný fond pracovní doby >= 0
    { id: 95, scope: 'emp', sev: 'error', type: 'non_neg', field: '10260',
      msg: 'Sjednaný fond pracovní doby musí být kladná nebo nulová hodnota.' },

    // K96: Stanovená týdenní pracovní doba >= 0
    { id: 96, scope: 'emp', sev: 'error', type: 'non_neg', field: '10261',
      msg: 'Stanovená týdenní pracovní doba musí být kladná hodnota.' },

    // K97: Osvobozené příjmy <= zúčtovaný příjem celkem
    { id: 97, scope: 'emp', sev: 'error', type: 'lte', a: '10289', b: '10286',
      msg: 'Hodnota osvobozených příjmů nesmí být vyšší než zúčtovaný příjem - celkem.' },

    // K98: ELDP denní atributy <= dnů v měsíci
    { id: 98, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Hodnota nesmí být vyšší než počet dní v daném měsíci.',
      check: function(ctx) {
        var dayFields = ['10357','10358','10359','10360','10362','10536','10366',
                         '10473','10474','10475','10375','10462','10463','10464',
                         '10465','10466','10468','10469'];
        var errors = [];
        // Check odložený příjem ELDP období
        var obdobi = getOdlozenyEldpObdobi(ctx.emp);
        if (obdobi) {
          for (var oi = 0; oi < obdobi.length; oi++) {
            var m = obdobi[oi].mesic, r = obdobi[oi].rok;
            if (m === null || r === null) continue;
            var dim = new Date(r, m, 0).getDate();
            for (var ei = 0; ei < obdobi[oi].eldpEls.length; ei++) {
              for (var fi = 0; fi < dayFields.length; fi++) {
                var v = readEldpElNum(obdobi[oi].eldpEls[ei], dayFields[fi]);
                if (v !== null && v > dim)
                  errors.push({ fieldCsszId: dayFields[fi], message: ctx.rule.msg });
              }
            }
          }
          return errors;
        }
        // Standard form
        var mesic = ctx.getHeaderNum('10010');
        var rok = ctx.getHeaderNum('10011');
        if (mesic === null || rok === null) return [];
        var dim2 = new Date(rok, mesic, 0).getDate();
        var n = ctx.getRepeatCount('pojisteni/eldpSeznam/eldp');
        for (var i = 0; i < n; i++) {
          for (var fi2 = 0; fi2 < dayFields.length; fi2++) {
            var v2 = ctx.getNum(dayFields[fi2], i);
            if (v2 !== null && v2 > dim2)
              errors.push({ fieldCsszId: dayFields[fi2], message: ctx.rule.msg });
          }
        }
        return errors;
      }},

    // K99: ELDP platnost kódu musí být v hlášeném měsíci
    { id: 99, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Datum je mimo měsíc, za který je podáváno.',
      check: function(ctx) {
        var errors = [];
        // Check odložený příjem ELDP období
        var obdobi = getOdlozenyEldpObdobi(ctx.emp);
        if (obdobi) {
          for (var oi = 0; oi < obdobi.length; oi++) {
            var m = obdobi[oi].mesic, r = obdobi[oi].rok;
            if (m === null || r === null) continue;
            var mStr = String(r) + '-' + String(m).padStart(2, '0');
            for (var ei = 0; ei < obdobi[oi].eldpEls.length; ei++) {
              var od = readEldpElVal(obdobi[oi].eldpEls[ei], '10241');
              var doo = readEldpElVal(obdobi[oi].eldpEls[ei], '10242');
              if (od && od.substring(0, 7) > mStr)
                errors.push({ fieldCsszId: '10241', instanceIndex: ei, message: ctx.rule.msg });
              if (doo && doo.substring(0, 7) < mStr)
                errors.push({ fieldCsszId: '10242', instanceIndex: ei, message: ctx.rule.msg });
            }
          }
          return errors;
        }
        // Standard form
        var mesic = ctx.getHeaderNum('10010');
        var rok = ctx.getHeaderNum('10011');
        if (mesic === null || rok === null) return [];
        var mStr2 = String(rok) + '-' + String(mesic).padStart(2, '0');
        var n = ctx.getRepeatCount('pojisteni/eldpSeznam/eldp');
        for (var i = 0; i < n; i++) {
          var od2 = ctx.getVal('10241', i);
          var doo2 = ctx.getVal('10242', i);
          if (od2 && od2.substring(0, 7) > mStr2)
            errors.push({ fieldCsszId: '10241', instanceIndex: i, message: ctx.rule.msg });
          if (doo2 && doo2.substring(0, 7) < mStr2)
            errors.push({ fieldCsszId: '10242', instanceIndex: i, message: ctx.rule.msg });
        }
        return errors;
      }},

    // K100: Platnost kódu od <= platnost kódu do (ELDP)
    { id: 100, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Datum kódu "od" musí být rovno nebo nižší než datum kódu "do".',
      check: function(ctx) {
        const n = ctx.getRepeatCount('pojisteni/eldpSeznam/eldp');
        const errors = [];
        for (let i = 0; i < n; i++) {
          const od = ctx.getVal('10241', i);
          const doo = ctx.getVal('10242', i);
          if (od && doo && od > doo)
            errors.push({ fieldCsszId: '10241', message: ctx.rule.msg });
        }
        return errors;
      }},

    // K103: Dočasné přidělení — identifikace uživatele (XOR: exactly one of 3 options)
    { id: 103, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Není uvedena identifikace dočasného přidělení.',
      check: function(ctx) {
        const evid = ctx.getVal('10251');
        if (evid !== 'true' && evid !== 'ANO') return [];
        const ico = ctx.isFilled('10252');
        const rc = ctx.isFilled('10457');
        const zahr = ctx.isFilled('10492') && ctx.isFilled('10493') && ctx.isFilled('10494');
        var count = (ico ? 1 : 0) + (rc ? 1 : 0) + (zahr ? 1 : 0);
        if (count !== 1)
          return [{ fieldCsszId: '10251', message: ctx.rule.msg }];
        return [];
      }},

    // K109: Odměny nerezidentů <= zúčtovaný příjem
    { id: 109, scope: 'emp', sev: 'error', type: 'lte', a: '10416', b: '10286',
      msg: 'Odměna člena orgánu právnických osob je vyšší než zúčtovaný příjem.' },

    // K110: Pořadí dětí — nelze vyšší bez nižšího
    { id: 110, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Nelze uplatnit dítě s vyšším pořadím, pokud v daném měsíci nejsou uvedeny děti s nižším pořadím nebo s "N".',
      check: function(ctx) {
        const sec = 'souhrnDataZec/prohlaseniPoplatnikaDane/zvyhodneniDetiMesic/vyzivovaneDeti/vyzivovaneDite';
        const n = ctx.getRepeatCount(sec);
        if (n <= 1) return [];
        const poradis = [];
        for (let i = 0; i < n; i++) {
          const p = ctx.getVal('10440', i);
          if (p) poradis.push(p);
        }
        const nums = poradis.filter(p => p !== 'N').map(Number).filter(x => !isNaN(x));
        if (nums.length === 0) return [];
        const maxP = Math.max(...nums);
        for (let p = 1; p < maxP; p++) {
          if (!nums.includes(p) && !poradis.includes('N'))
            return [{ fieldCsszId: '10440', message: ctx.rule.msg }];
        }
        return [];
      }},

    // K111: Pokud ZTP/P partnera = ANO, pak měsíce ZTP/P v [1,12]
    { id: 111, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Chybná hodnota v počtu měsíců uplatnění slevy ve dvojnásobné výši (ZTP/P).',
      check: function(ctx) {
        const ztpp = ctx.getVal('10425');
        if (ztpp !== 'true' && ztpp !== 'ANO') return [];
        const mesice = ctx.getNum('10430');
        if (mesice === null || mesice < 1 || mesice > 12)
          return [{ fieldCsszId: '10430', message: ctx.rule.msg }];
        return [];
      }},

    // K112: Pokud daňové zvýhodnění na děti = ANO, pak povinné údaje za dítě (roční)
    { id: 112, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Nejsou vyplněny údaje za dítě.',
      check: function(ctx) {
        const zvyh = ctx.getVal('10454');
        if (zvyh !== 'true' && zvyh !== 'ANO') return [];
        const sec = 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/zvyhodneniNaDeti/vyzivovaneDeti/vyzivovaneDite';
        const n = ctx.getRepeatCount(sec);
        if (n === 0) return [{ fieldCsszId: '10454', message: ctx.rule.msg }];
        for (let i = 0; i < n; i++) {
          const jmeno = ctx.isFilled('10446', i);
          const prijm = ctx.isFilled('10447', i);
          const datum = ctx.isFilled('10448', i);
          const rc = ctx.isFilled('10449', i);
          const poradi = ctx.isFilled('10451', i);
          if (!jmeno || !prijm || (!datum && !rc) || !poradi)
            return [{ fieldCsszId: '10446', message: ctx.rule.msg }];
        }
        return [];
      }},

    // K113: Jiná vyživující osoba — RČ nebo datum narození
    { id: 113, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Chybí rodné číslo nebo datum narození jiné vyživující osoby ve společně hospodařící domácnosti.',
      check: function(ctx) {
        const sec = 'souhrnDataZec/prohlaseniPoplatnikaDane/zvyhodneniDetiMesic/jineOsoby/jinaOsoba';
        const n = ctx.getRepeatCount(sec);
        for (let i = 0; i < n; i++) {
          if (!ctx.isFilled('10433', i) && !ctx.isFilled('10434', i))
            return [{ fieldCsszId: '10433', message: ctx.rule.msg }];
        }
        return [];
      }},

    // K114: Vyživované dítě — RČ nebo datum narození (měsíční)
    { id: 114, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Chybí rodné číslo nebo datum narození vyživovaného dítěte.',
      check: function(ctx) {
        const sec = 'souhrnDataZec/prohlaseniPoplatnikaDane/zvyhodneniDetiMesic/vyzivovaneDeti/vyzivovaneDite';
        const n = ctx.getRepeatCount(sec);
        for (let i = 0; i < n; i++) {
          if (!ctx.isFilled('10437', i) && !ctx.isFilled('10438', i))
            return [{ fieldCsszId: '10437', message: ctx.rule.msg }];
        }
        return [];
      }},

    // K115: Manžel/ka — RČ nebo datum narození
    { id: 115, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Chybí rodné číslo nebo datum narození manžela/manželky.',
      check: function(ctx) {
        if (!ctx.isFilled('10423') && !ctx.isFilled('10424'))
          return [];  // no partner data at all is OK
        // If one of them is partially filled, both need RC or DN
        const sec = 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/slevaNaPartnera/partner';
        const n = ctx.getRepeatCount(sec);
        for (let i = 0; i < n; i++) {
          if (!ctx.isFilled('10423', i) && !ctx.isFilled('10424', i))
            return [{ fieldCsszId: '10423', message: ctx.rule.msg }];
        }
        return [];
      }},

    // K118: Pojistné za zaměstnance = ceil(0.071 * VZ)
    { id: 118, scope: 'emp', sev: 'error', type: 'pct_eq',
      target: '10370', base: '10477', rate: KONTROLY_CONSTANTS.rates.employeeInsurance,
      msg: 'Pojistné za zaměstnance neodpovídá vyměřovacímu základu zaměstnance.' },

    // K121: Vyloučené doby celkem = suma dílčích (ELDP)
    { id: 121, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Vyloučené doby musí být rovny sumě dílčích položek.',
      check: function(ctx) {
        const n = ctx.getRepeatCount('pojisteni/eldpSeznam/eldp');
        const errors = [];
        for (let i = 0; i < n; i++) {
          const celkem = ctx.getNum('10357', i);
          if (celkem === null || celkem === 0) continue;
          const parts = ['10358','10359','10360','10362','10536'];
          const sum = parts.reduce((s, id) => s + (ctx.getNum(id, i) || 0), 0);
          if (Math.abs(celkem - sum) > 0.5)
            errors.push({ fieldCsszId: '10357', message: ctx.rule.msg });
        }
        return errors;
      }},

    // K123: Pokud specifická právní skutečnost typ, pak datum vyplněno
    { id: 123, scope: 'cross', sev: 'error', type: 'custom',
      msg: 'Není vyplněno datum nastání specifické právní skutečnosti.',
      check: function(ctx) {
        const typ = readSouhrnField(_xmlDoc, ['souhrn', 'specifickaSkutecnost', 'typ']);
        if (!typ) return [];
        const datum = readSouhrnField(_xmlDoc, ['souhrn', 'specifickaSkutecnost', 'datum']);
        if (!datum) return [{ fieldCsszId: '10409', message: ctx.rule.msg }];
        return [];
      }},

    // K124: Pokud sleva na partnera = ANO, pak povinné údaje
    { id: 124, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Nejsou uvedena všechna povinná pole pro uplatnění slevy za manžela / -ku.',
      check: function(ctx) {
        const sleva = ctx.getVal('10420');
        if (sleva !== 'true' && sleva !== 'ANO') return [];
        const required = ['10421', '10422', '10425', '10426'];
        const missing = required.filter(id => !ctx.isFilled(id));
        if (missing.length > 0) return [{ fieldCsszId: missing[0], message: ctx.rule.msg }];
        if (!ctx.isFilled('10423') && !ctx.isFilled('10424'))
          return [{ fieldCsszId: '10423', message: ctx.rule.msg }];
        return [];
      }},

    // K125: Pokud sleva na partnera + ZTP/P, pak měsíce ZTP/P v [1,12]
    { id: 125, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Počet měsíců musí být roven nebo nižší než počet měsíců uplatnění slevy na ZTP/P.',
      check: function(ctx) {
        const sleva = ctx.getVal('10420');
        if (sleva !== 'true' && sleva !== 'ANO') return [];
        const ztpp = ctx.getVal('10425');
        if (ztpp !== 'true' && ztpp !== 'ANO') return [];
        const mesice = ctx.getNum('10430');
        if (mesice === null || mesice < 1 || mesice > 12)
          return [{ fieldCsszId: '10430', message: ctx.rule.msg }];
        return [];
      }},

    // ═══ Phase 3: Controls 126-194 ═══
    // Skipped: K130 (10263/10264 not in JMHZ), K133 (10243 not in JMHZ),
    //          K140 (requires previous month data), K164 (requires splatnost calendar)

    // K126: Pokud vyživuje jiná osoba (roční) = ANO, údaje jiné osoby vyplněny
    { id: 126, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Nejsou vyplněny údaje za další vyživující osobu.',
      check: function(ctx) {
        const vyz = ctx.getVal('10455');
        if (vyz !== 'true' && vyz !== 'ANO') return [];
        const sec = 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/zvyhodneniNaDeti/jineOsoby/jinaOsoba';
        const n = ctx.getRepeatCount(sec);
        if (n === 0) return [{ fieldCsszId: '10455', message: ctx.rule.msg }];
        for (let i = 0; i < n; i++) {
          if (!ctx.isFilled('10441', i) || !ctx.isFilled('10442', i))
            return [{ fieldCsszId: '10441', message: ctx.rule.msg }];
          if (!ctx.isFilled('10443', i) && !ctx.isFilled('10444', i))
            return [{ fieldCsszId: '10443', message: ctx.rule.msg }];
          if (!ctx.isFilled('10445', i))
            return [{ fieldCsszId: '10445', message: ctx.rule.msg }];
        }
        return [];
      }},

    // K127: Pokud vyživuje jiná osoba (měsíční) = ANO, údaje osoby vyplněny
    { id: 127, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Nejsou vyplněny údaje za další vyživující osobu.',
      check: function(ctx) {
        const vyz = ctx.getVal('10453');
        if (vyz !== 'true' && vyz !== 'ANO') return [];
        const sec = 'souhrnDataZec/prohlaseniPoplatnikaDane/zvyhodneniDetiMesic/jineOsoby/jinaOsoba';
        const n = ctx.getRepeatCount(sec);
        if (n === 0) return [{ fieldCsszId: '10453', message: ctx.rule.msg }];
        for (let i = 0; i < n; i++) {
          if (!ctx.isFilled('10431', i) || !ctx.isFilled('10432', i))
            return [{ fieldCsszId: '10431', message: ctx.rule.msg }];
          if (!ctx.isFilled('10433', i) && !ctx.isFilled('10434', i))
            return [{ fieldCsszId: '10433', message: ctx.rule.msg }];
        }
        return [];
      }},

    // K128: Pokud daňové zvýhodnění na děti > 0, pak údaje za děti (měsíční)
    { id: 128, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Nejsou vyplněny údaje za děti.',
      check: function(ctx) {
        const zvyh = ctx.getNum('10303');
        if (zvyh === null || zvyh <= 0) return [];
        const sec = 'souhrnDataZec/prohlaseniPoplatnikaDane/zvyhodneniDetiMesic/vyzivovaneDeti/vyzivovaneDite';
        const n = ctx.getRepeatCount(sec);
        if (n === 0) return [{ fieldCsszId: '10303', message: ctx.rule.msg }];
        for (let i = 0; i < n; i++) {
          if (!ctx.isFilled('10435', i) || !ctx.isFilled('10436', i))
            return [{ fieldCsszId: '10435', message: ctx.rule.msg }];
          if (!ctx.isFilled('10437', i) && !ctx.isFilled('10438', i))
            return [{ fieldCsszId: '10437', message: ctx.rule.msg }];
          if (!ctx.isFilled('10440', i))
            return [{ fieldCsszId: '10440', message: ctx.rule.msg }];
          if (!ctx.isFilled('10439', i))
            return [{ fieldCsszId: '10439', message: ctx.rule.msg }];
        }
        return [];
      }},

    // K129: Měsíc musí být 1-12
    { id: 129, scope: 'header', sev: 'error', type: 'range', field: '10010', min: 1, max: 12,
      msg: 'Číslo měsíce musí být v rozsahu 1-12 včetně.' },

    // K131: Období >= leden 2026 (same logic as K31 but different source)
    { id: 131, scope: 'header', sev: 'error', type: 'custom',
      msg: 'JMHZ neslouží pro hlášení za zvolené období.',
      check: function(ctx) {
        const rok = ctx.getHeaderNum('10011');
        const mesic = ctx.getHeaderNum('10010');
        if (rok === null || mesic === null) return [];
        if (rok < 2026 || (rok === 2026 && mesic < 1))
          return [{ fieldCsszId: '10011', message: ctx.rule.msg }];
        return [];
      }},

    // K132: Opravné hlášení max 10 let zpět
    { id: 132, scope: 'header', sev: 'error', type: 'custom',
      msg: 'Zvolený rok přesahuje období pro hlášení do JMHZ.',
      check: function(ctx) {
        const typ = ctx.getHeaderVal('10007');
        if (typ !== 'O' && typ !== 'R') return []; // only for opravné/replacement
        const rok = ctx.getHeaderNum('10011');
        if (rok === null) return [];
        const curYear = new Date().getFullYear();
        if (curYear - rok > 10)
          return [{ fieldCsszId: '10011', message: ctx.rule.msg }];
        return [];
      }},

    // K134: ELDP počet dnů <= (pojištění do - pojištění od) + 1
    { id: 134, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Počet kalendářních dnů neodpovídá uvedeným datům trvání pojištění v daném měsíci.',
      check: function(ctx) {
        const od = ctx.getVal('10354');
        const doo = ctx.getVal('10355');
        if (!od || !doo) return [];
        const d1 = new Date(od), d2 = new Date(doo);
        if (isNaN(d1) || isNaN(d2)) return [];
        const diffDays = Math.round((d2 - d1) / 86400000) + 1;
        const n = ctx.getRepeatCount('pojisteni/eldpSeznam/eldp');
        const errors = [];
        for (let i = 0; i < n; i++) {
          const dny = ctx.getNum('10356', i);
          if (dny !== null && dny > diffDays)
            errors.push({ fieldCsszId: '10356', message: ctx.rule.msg });
        }
        return errors;
      }},

    // K135: ELDP kód vs započtené dny rules
    { id: 135, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Uvedená doba trvání pojištění neodpovídá kódu ELDP.',
      check: function(ctx) {
        const od = ctx.getVal('10354');
        const doo = ctx.getVal('10355');
        const n = ctx.getRepeatCount('pojisteni/eldpSeznam/eldp');
        const errors = [];
        for (let i = 0; i < n; i++) {
          const kod = ctx.getVal('10240', i) || '';
          if (kod.length < 2) continue;
          const pos2 = kod.charAt(1);
          const dny = ctx.getNum('10356', i);
          // Rule 2: 2nd position = P → dny must be 0
          if (pos2 === 'P' && dny !== null && dny !== 0)
            errors.push({ fieldCsszId: '10356', message: ctx.rule.msg });
          // Rule 1: 2nd position = V → dny <= days in interval
          if (pos2 === 'V' && od && doo && dny !== null) {
            const d1 = new Date(od), d2 = new Date(doo);
            if (!isNaN(d1) && !isNaN(d2)) {
              const maxDays = Math.round((d2 - d1) / 86400000) + 1;
              if (dny > maxDays)
                errors.push({ fieldCsszId: '10356', message: ctx.rule.msg });
            }
          }
        }
        return errors;
      }},

    // K137: Pokud sleva = ANO, pak důvod uplatnění vyplněn
    { id: 137, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Důvod uplatnění slevy musí být vyplněn, pokud je za zaměstnance uplatněna sleva na pojistném zaměstnavatele.',
      check: function(ctx) {
        const sleva = ctx.getVal('10372');
        if (sleva !== 'true' && sleva !== 'ANO') return [];
        if (!ctx.isFilled('10374'))
          return [{ fieldCsszId: '10374', message: ctx.rule.msg }];
        return [];
      }},

    // K138: Pokud sleva + důvod A/F, pak kratší rozsah vyplněn
    { id: 138, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Kratší rozsah služební doby musí být vyplněn.',
      check: function(ctx) {
        const sleva = ctx.getVal('10372');
        if (sleva !== 'true' && sleva !== 'ANO') return [];
        const duvod = ctx.getVal('10374');
        if (duvod !== 'A' && duvod !== 'F') return [];
        if (!ctx.isFilled('10373'))
          return [{ fieldCsszId: '10373', message: ctx.rule.msg }];
        return [];
      }},

    // K142: Úhrn VZ zaměstnanců (C - rizikové) = sum of employee 10480
    { id: 142, scope: 'cross', sev: 'warning', type: 'custom',
      msg: 'Úhrn nesouhlasí se součtem vyměřovacích základů zaměstnanců vykonávajících rizikové zaměstnání.',
      check: function(ctx) {
        const header = ctx.getHeaderNum('10483');
        if (header === null) return [];
        const sum = ctx.allEmps.reduce((s, e) => s + (getNum(e, '10480') || 0), 0);
        if (Math.abs(header - sum) > 0.5) return [{ fieldCsszId: '10483', message: ctx.rule.msg }];
        return [];
      }},

    // K143: Variabilní symbol format check
    { id: 143, scope: 'header', sev: 'error', type: 'custom',
      msg: 'Variabilní symbol není platný.',
      check: function(ctx) {
        const vs = ctx.getHeaderVal('10221');
        if (!vs) return [];
        if (!/^\d{8,10}$/.test(vs))
          return [{ fieldCsszId: '10221', message: ctx.rule.msg }];
        return [];
      }},

    // K144: Překážky zaměstnance <= sjednaný fond
    { id: 144, scope: 'emp', sev: 'error', type: 'lte', a: '10471', b: '10260',
      msg: 'Hodnota Překážky na straně zaměstnance nesmí být vyšší než Pracovní doba sjednaná.' },

    // K145: Překážky zaměstnavatele <= sjednaný fond
    { id: 145, scope: 'emp', sev: 'error', type: 'lte', a: '10472', b: '10260',
      msg: 'Hodnota Překážky na straně zaměstnavatele nesmí být vyšší než Sjednaný fond pracovní doby.' },

    // K148: Specifická právní skutečnost — platná hodnota
    { id: 148, scope: 'cross', sev: 'error', type: 'custom',
      msg: 'Hodnota Specifická právní skutečnost neodpovídá číselníku.',
      check: function(ctx) {
        const typ = readSouhrnField(_xmlDoc, ['souhrn', 'specifickaSkutecnost', 'typ']);
        if (!typ) return [];
        var valid = ['1','2','3','4','5','6','7','8','9','10','11','12'];
        if (!valid.includes(typ))
          return [{ fieldCsszId: '10005', message: ctx.rule.msg }];
        return [];
      }},

    // K162: VZ základ zaměstnavatele — alespoň nuly
    { id: 162, scope: 'header', sev: 'error', type: 'custom',
      msg: 'Je potřeba vyplnit alespoň jednu částku vyměřovacího základu zaměstnavatele nebo nuly.',
      check: function(ctx) {
        const a = ctx.getHeaderVal('10023');
        const b = ctx.getHeaderVal('10025');
        const c = ctx.getHeaderVal('10483');
        if (!a && !b && !c)
          return [{ fieldCsszId: '10023', message: ctx.rule.msg }];
        return [];
      }},

    // K165: ELDP vyloučené dny § 18 = součet dílčích (10366 = 10473+10474+10475)
    { id: 165, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Vyloučené dny celkem musí být součtem jednotlivých typů vyloučených dnů.',
      check: function(ctx) {
        const n = ctx.getRepeatCount('pojisteni/eldpSeznam/eldp');
        const errors = [];
        for (let i = 0; i < n; i++) {
          const celkem = ctx.getNum('10366', i);
          if (celkem === null || celkem <= 0) continue;
          const sum = (ctx.getNum('10473', i) || 0) + (ctx.getNum('10474', i) || 0)
                    + (ctx.getNum('10475', i) || 0);
          if (Math.abs(celkem - sum) > 0.5)
            errors.push({ fieldCsszId: '10366', message: ctx.rule.msg });
        }
        return errors;
      }},

    // K166: ELDP odečítané doby = součet dílčích (10375 = 10462+...+10469)
    { id: 166, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Odečítané doby musí být rovny sumě dílčích položek.',
      check: function(ctx) {
        const n = ctx.getRepeatCount('pojisteni/eldpSeznam/eldp');
        const errors = [];
        for (let i = 0; i < n; i++) {
          const celkem = ctx.getNum('10375', i);
          if (celkem === null || celkem <= 0) continue;
          const parts = ['10462','10463','10464','10465','10466','10468','10469'];
          const sum = parts.reduce((s, id) => s + (ctx.getNum(id, i) || 0), 0);
          if (Math.abs(celkem - sum) > 0.5)
            errors.push({ fieldCsszId: '10375', message: ctx.rule.msg });
        }
        return errors;
      }},

    // K167: Pojistné zaměstnavatele C = ceil(0.278 * základ C)
    { id: 167, scope: 'header', sev: 'error', type: 'pct_eq',
      target: '10484', base: '10483', rate: KONTROLY_CONSTANTS.rates.employerInsuranceC,
      msg: 'Vykázané pojistné neodpovídá vykázanému úhrnu vyměřovacích základů zaměstnanců vykonávajících rizikové zaměstnání.' },

    // K168: Pojistné za zaměstnance tolerance check (≈ 7.1% of total VZ)
    { id: 168, scope: 'header', sev: 'error', type: 'custom',
      msg: 'Vykázané pojistné za zaměstnance neodpovídá celkové částce vykázaných úhrnů vyměřovacích základů zaměstnanců.',
      check: function(ctx) {
        const pojistne = ctx.getHeaderNum('10028');
        if (pojistne === null) return [];
        const a = ctx.getHeaderNum('10023') || 0;
        const b = ctx.getHeaderNum('10025') || 0;
        const c = ctx.getHeaderNum('10483') || 0;
        const total = a + b + c;
        if (total === 0 && pojistne === 0) return [];
        const expected = KONTROLY_CONSTANTS.rates.employeeInsurance * total;
        const relErr = expected > 0 ? Math.abs(1 - pojistne / expected) : 1;
        const absErr = Math.abs(expected - pojistne);
        if (relErr > KONTROLY_CONSTANTS.tolerances.relativeError && absErr > KONTROLY_CONSTANTS.tolerances.absoluteAmount)
          return [{ fieldCsszId: '10028', message: ctx.rule.msg }];
        if (pojistne > KONTROLY_CONSTANTS.tolerances.employeeInsuranceUpperRate * total + KONTROLY_CONSTANTS.tolerances.roundedHalf)
          return [{ fieldCsszId: '10028', message: ctx.rule.msg }];
        return [];
      }},

    // K170: Úhrn slev zaměstnanců tolerance check (≈ 6.5% of VZ)
    { id: 170, scope: 'cross', sev: 'error', type: 'custom',
      msg: 'Úhrn slev na pojistném zaměstnanců neodpovídá vykázanému úhrnu vyměřovacích základů těchto zaměstnanců.',
      check: function(ctx) {
        const uhrnSlev = readPvpojSlevaNum(_xmlDoc, '10487');
        const uhrnVZ = readPvpojSlevaNum(_xmlDoc, '10486');
        if (uhrnSlev === null || uhrnVZ === null) return [];
        if (uhrnVZ === 0 && uhrnSlev === 0) return [];
        var expected = KONTROLY_CONSTANTS.rates.employeeDiscount * uhrnVZ;
        var relErr = expected > 0 ? Math.abs(1 - uhrnSlev / expected) : 1;
        var absErr = Math.abs(expected - uhrnSlev);
        if (relErr > KONTROLY_CONSTANTS.tolerances.relativeError && absErr > KONTROLY_CONSTANTS.tolerances.absoluteAmount)
          return [{ fieldCsszId: '10487', message: ctx.rule.msg }];
        if (uhrnSlev > KONTROLY_CONSTANTS.tolerances.employeeDiscountUpperRate * uhrnVZ + KONTROLY_CONSTANTS.tolerances.roundedHalf)
          return [{ fieldCsszId: '10487', message: ctx.rule.msg }];
        return [];
      }},

    // K188: Sleva na pojistném zaměstnavatele max 1× per zaměstnanec
    { id: 188, scope: 'cross', sev: 'error', type: 'custom',
      msg: 'Slevu na pojistném zaměstnavatele může zaměstnavatel uplatnit za zaměstnance pouze z jednoho zaměstnání.',
      check: function(ctx) {
        const slevaByIk = {};
        ctx.allEmps.forEach(e => {
          const sleva = getVal(e, '10372');
          if (sleva !== 'true' && sleva !== 'ANO') return;
          const ik = getVal(e, '10051');
          if (!ik) return;
          slevaByIk[ik] = (slevaByIk[ik] || 0) + 1;
        });
        const errors = [];
        Object.entries(slevaByIk).forEach(function(entry) {
          if (entry[1] > 1)
            errors.push({ fieldCsszId: '10372', message: ctx.rule.msg });
        });
        return errors;
      }},

    // K190: Storno jen 1.-20. následujícího měsíce
    { id: 190, scope: 'header', sev: 'error', type: 'custom',
      msg: 'Zaměstnavatel nesmí stornovat řádné podání mimo stanovenou lhůtu.',
      check: function(ctx) {
        const typ = ctx.getHeaderVal('10007');
        if (typ !== 'S') return []; // only storno
        const mesic = ctx.getHeaderNum('10010');
        const rok = ctx.getHeaderNum('10011');
        if (mesic === null || rok === null) return [];
        const now = new Date();
        var nextM = mesic + 1, nextY = rok;
        if (nextM > 12) { nextM = 1; nextY++; }
        var curM = now.getMonth() + 1, curY = now.getFullYear(), curD = now.getDate();
        if (curY !== nextY || curM !== nextM || curD > 20)
          return [{ fieldCsszId: '10007', message: ctx.rule.msg }];
        return [];
      }},

    // K191: Roční atributy jen v lednu/únoru/březnu
    { id: 191, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Atribut může být uveden jen v lednovém, únorovém nebo březnovém podání.',
      check: function(ctx) {
        var mesic = ctx.getHeaderNum('10010');
        if (mesic !== null && mesic >= 1 && mesic <= 3) return [];
        var roFields = ['10036','10037','10320','10321','10322','10323','10420','10421','10422',
          '10423','10424','10425','10426','10430','10454','10455',
          '10441','10442','10443','10444','10445','10446','10447','10448','10449','10450','10451'];
        for (var j = 0; j < roFields.length; j++) {
          if (ctx.isFilled(roFields[j]))
            return [{ fieldCsszId: roFields[j], message: ctx.rule.msg }];
        }
        return [];
      }},

    // K192: Žádost o roční zúčtování jen v lednu/únoru
    { id: 192, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Atribut Zaměstnanec požádal o provedení ročního zúčtování může být uveden jen v lednovém nebo únorovém podání.',
      check: function(ctx) {
        var mesic = ctx.getHeaderNum('10010');
        if (mesic !== null && mesic >= 1 && mesic <= 2) return [];
        if (ctx.isFilled('10319'))
          return [{ fieldCsszId: '10319', message: ctx.rule.msg }];
        return [];
      }},

    // K193: Roční úhrny jen v lednu
    { id: 193, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Atribut může být uveden jen v lednovém podání.',
      check: function(ctx) {
        var mesic = ctx.getHeaderNum('10010');
        if (mesic === 1) return [];
        var janFields = ['10313','10317','10316','10318','10311','10312'];
        for (var j = 0; j < janFields.length; j++) {
          if (ctx.isFilled(janFields[j]))
            return [{ fieldCsszId: janFields[j], message: ctx.rule.msg }];
        }
        return [];
      }},

    // K194: Prosincové atributy jen v prosinci
    { id: 194, scope: 'cross', sev: 'error', type: 'custom',
      msg: 'Atribut může být uveden jen v prosincovém podání.',
      check: function(ctx) {
        var mesic = ctx.getHeaderNum('10010');
        if (mesic === 12) return [];
        // Fields 10452, 10038, 10039, 10220, 10214 live under souhrn/zamestnavatelUdajeRok
        var souhrn = findChildEl(_xmlDoc ? _xmlDoc.documentElement : null, 'souhrn');
        if (!souhrn) return [];
        var zur = findChildEl(souhrn, 'zamestnavatelUdajeRok');
        if (!zur) return [];
        // Check individual attrs: 10220 (formaVlastnictvi), 10038/10039/10452 (zamestnavaniOzp), 10214 (typKolektSmlouvy)
        var found = [];
        if (findChildEl(zur, 'formaVlastnictvi')) found.push('10220');
        var ozp = findChildEl(zur, 'zamestnavaniOzp');
        if (ozp) {
          if (findChildEl(ozp, 'zecPocetPrepRok')) found.push('10038');
          if (findChildEl(ozp, 'zecPocetPrepOzpRok')) found.push('10039');
          if (findChildEl(ozp, 'podilZamZtp')) found.push('10452');
        }
        if (findChildEl(zur, 'kolektivniSmlouvy')) found.push('10214');
        if (found.length > 0)
          return [{ fieldCsszId: found[0], message: ctx.rule.msg }];
        return [];
      }},

    // ═══ Phase 4: Controls 201-277 ═══
    // Skipped: K211 (structural storno remnant check), K245 (complex multi-VS DPP aggregation),
    //          K253 (duplicate of K251 for single submission)

    // K201: Datum úhrady mzdy <= datum vyplnění podání
    { id: 201, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Datum úhrady musí být menší rovno datu vyplnění.',
      check: function(ctx) {
        var uhrada = ctx.getVal('10347');
        var vyplneni = ctx.getHeaderVal('10005');
        if (!uhrada || !vyplneni) return [];
        var d1 = new Date(uhrada.substring(0, 10));
        var d2 = new Date(vyplneni.substring(0, 10));
        if (isNaN(d1) || isNaN(d2)) return [];
        if (d1 > d2) return [{ fieldCsszId: '10347', message: ctx.rule.msg }];
        return [];
      }},

    // K204: Storno součásti individualizované části jen 1.-20. následujícího měsíce
    { id: 204, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Zaměstnavatel nesmí stornovat součásti individualizované části jindy než v intervalu od 1. do 20. dne v měsíci, který bezprostředně následuje po měsíci, za který bylo učiněno podání.',
      check: function(ctx) {
        var typ = ctx.getVal('10016');
        if (typ !== 'S') return [];
        var mesic = ctx.getHeaderNum('10010');
        var rok = ctx.getHeaderNum('10011');
        if (mesic === null || rok === null) return [];
        var now = new Date();
        var nextM = mesic + 1, nextY = rok;
        if (nextM > 12) { nextM = 1; nextY++; }
        var curM = now.getMonth() + 1, curY = now.getFullYear(), curD = now.getDate();
        if (curY !== nextY || curM !== nextM || curD > 20)
          return [{ fieldCsszId: '10016', message: ctx.rule.msg }];
        return [];
      }},

    // K207: Sum VZ (10477) where sleva zaměstnavatele (10372)=ANO = úhrn VZ slev (10031)
    { id: 207, scope: 'cross', sev: 'error', type: 'custom',
      msg: 'Vykázaný úhrn vyměřovacích základů zaměstnanců, za které zaměstnavatel uplatňuje slevu na pojistném zaměstnavatele, neodpovídá součtu vyměřovacích základů těchto zaměstnanců.',
      check: function(ctx) {
        var uhrn = readPvpojSlevaNum(_xmlDoc, '10031');
        if (uhrn === null) return [];
        var sum = 0;
        ctx.allEmps.forEach(function(e) {
          var sleva = getVal(e, '10372');
          if (sleva === 'true' || sleva === 'ANO') sum += (getNum(e, '10477') || 0);
        });
        if (Math.abs(uhrn - sum) > 0.5)
          return [{ fieldCsszId: '10031', message: ctx.rule.msg }];
        return [];
      }},

    // K208: If sleva zaměstnance (10490)=ANO, výše (10491) filled; else empty
    { id: 208, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Výše slevy na pojistném zaměstnance musí být vyplněna jen v případě, že je v poli Sleva na pojistném zaměstnance uvedeno ANO.',
      check: function(ctx) {
        var sleva = ctx.getVal('10490');
        var vyse = ctx.isFilled('10491');
        if ((sleva === 'true' || sleva === 'ANO') && !vyse)
          return [{ fieldCsszId: '10491', message: ctx.rule.msg }];
        if (sleva !== 'true' && sleva !== 'ANO' && vyse)
          return [{ fieldCsszId: '10491', message: ctx.rule.msg }];
        return [];
      }},

    // K209: Sum slev zaměstnanců (10491) = úhrn slev (10487)
    { id: 209, scope: 'cross', sev: 'error', type: 'custom',
      msg: 'Vykázaný úhrn slev na pojistném zaměstnanců neodpovídá součtu slev na pojistném těchto zaměstnanců.',
      check: function(ctx) {
        var uhrn = readPvpojSlevaNum(_xmlDoc, '10487');
        if (uhrn === null) return [];
        var sum = 0;
        ctx.allEmps.forEach(function(e) { sum += (getNum(e, '10491') || 0); });
        if (Math.abs(uhrn - sum) > 0.5)
          return [{ fieldCsszId: '10487', message: ctx.rule.msg }];
        return [];
      }},

    // K213: 10486 = sum(10477) where sleva zaměstnance (10490)=ANO
    { id: 213, scope: 'cross', sev: 'warning', type: 'custom',
      msg: 'Vykázaný úhrn vyměřovacích základů zaměstnanců, kteří mají nárok na slevu na pojistném zaměstnance, neodpovídá součtu vyměřovacích základů těchto zaměstnanců.',
      check: function(ctx) {
        var uhrn = readPvpojSlevaNum(_xmlDoc, '10486');
        if (uhrn === null) return [];
        var sum = 0;
        ctx.allEmps.forEach(function(e) {
          var sleva = getVal(e, '10490');
          if (sleva === 'true' || sleva === 'ANO') sum += (getNum(e, '10477') || 0);
        });
        if (Math.abs(uhrn - sum) > 0.5)
          return [{ fieldCsszId: '10486', message: ctx.rule.msg }];
        return [];
      }},

    // K214: Child age 26 check — roční zvýhodnění
    { id: 214, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Věk dítěte již neumožňuje uplatnění daňového zvýhodnění.',
      check: function(ctx) {
        var sec = 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/zvyhodneniNaDeti/vyzivovaneDeti/vyzivovaneDite';
        var n = ctx.getRepeatCount(sec);
        var rok = ctx.getHeaderNum('10011');
        if (!rok || n === 0) return [];
        var errors = [];
        for (var i = 0; i < n; i++) {
          var poradi = ctx.getVal('10451', i);
          if (!poradi) continue;
          var birthDate = _parseBirth(ctx.getVal('10448', i), ctx.getVal('10449', i));
          if (!birthDate) continue;
          var age26 = new Date(birthDate);
          age26.setFullYear(age26.getFullYear() + 26);
          if (age26 <= new Date(rok, 0, 1))
            errors.push({ fieldCsszId: '10451', message: ctx.rule.msg });
        }
        return errors;
      }},

    // K215: Child age 26 check — měsíční zvýhodnění
    { id: 215, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Věk dítěte již neumožňuje uplatnění daňového zvýhodnění.',
      check: function(ctx) {
        var sec = 'souhrnDataZec/prohlaseniPoplatnikaDane/zvyhodneniDetiMesic/vyzivovaneDeti/vyzivovaneDite';
        var n = ctx.getRepeatCount(sec);
        var mesic = ctx.getHeaderNum('10010');
        var rok = ctx.getHeaderNum('10011');
        if (!mesic || !rok || n === 0) return [];
        var firstOfMonth = new Date(rok, mesic - 1, 1);
        var errors = [];
        for (var i = 0; i < n; i++) {
          var poradi = ctx.getVal('10440', i);
          if (!poradi) continue;
          var birthDate = _parseBirth(ctx.getVal('10437', i), ctx.getVal('10438', i));
          if (!birthDate) continue;
          var age26 = new Date(birthDate);
          age26.setFullYear(age26.getFullYear() + 26);
          if (age26 <= firstOfMonth)
            errors.push({ fieldCsszId: '10440', message: ctx.rule.msg });
        }
        return errors;
      }},

    // K216: VZ celkem (10477) = VZ A (10478) + VZ B (10479) + VZ C (10480)
    // Skip K/S activity and activity 1-9 with 10502="Pracovní vztah specifické skupiny", and M (pěstoun)
    { id: 216, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Částka vyměřovacího základu zaměstnance, ze které je placeno pojistné, neodpovídá součtu dílčích částek vyměřovacího základu.',
      check: function(ctx) {
        var druh = ctx.getVal('10239');
        if (druh === 'K' || druh === 'S' || druh === 'M') return [];
        var druhNum = parseInt(druh, 10);
        if (druhNum >= 1 && druhNum <= 9) {
          var spec = ctx.getVal('10502');
          if (spec) return []; // has special PPV designation — skip
        }
        var celkem = ctx.getNum('10477');
        if (celkem === null) return [];
        var sum = (ctx.getNum('10478') || 0) + (ctx.getNum('10479') || 0) + (ctx.getNum('10480') || 0);
        if (Math.abs(celkem - sum) > 0.5)
          return [{ fieldCsszId: '10477', message: ctx.rule.msg }];
        return [];
      }},

    // K229: Collision in child pořadí (měsíční)
    { id: 229, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Uvedenému pořadí dítěte odpovídá stejné pořadí u jiného dítěte.',
      check: function(ctx) {
        var sec = 'souhrnDataZec/prohlaseniPoplatnikaDane/zvyhodneniDetiMesic/vyzivovaneDeti/vyzivovaneDite';
        var n = ctx.getRepeatCount(sec);
        if (n < 2) return [];
        var seen = {};
        for (var i = 0; i < n; i++) {
          var p = ctx.getVal('10440', i);
          if (!p) continue;
          if (seen[p]) return [{ fieldCsszId: '10440', message: ctx.rule.msg }];
          seen[p] = true;
        }
        return [];
      }},

    // K230: Collision in child pořadí (roční) — same pořadí string
    { id: 230, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Pořadí dítěte v měsíci koliduje s totožným nastavením pro jiné dítě.',
      check: function(ctx) {
        var sec = 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/zvyhodneniNaDeti/vyzivovaneDeti/vyzivovaneDite';
        var n = ctx.getRepeatCount(sec);
        if (n < 2) return [];
        var arr = [];
        for (var i = 0; i < n; i++) arr.push(ctx.getVal('10451', i) || '');
        for (var a = 0; a < n; a++) {
          for (var b = a + 1; b < n; b++) {
            if (arr[a] && arr[b] && arr[a] === arr[b])
              return [{ fieldCsszId: '10451', message: ctx.rule.msg }];
          }
        }
        return [];
      }},

    // K242: Prohlášení=ANO + rezident CZ → srážková daň fields empty
    { id: 242, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Pokud je učiněno prohlášení poplatníka k dani, pak nelze uplatnit srážkovou daň podle zvláštní sazby daně.',
      check: function(ctx) {
        var p = ctx.getVal('10419');
        if (p !== 'true' && p !== 'ANO') return [];
        var stat = ctx.getVal('10068');
        if (stat && stat !== 'CZ') return [];
        var fields = ['10307','10416','10309','10310'];
        for (var j = 0; j < fields.length; j++) {
          if (ctx.isFilled(fields[j]))
            return [{ fieldCsszId: fields[j], message: ctx.rule.msg }];
        }
        return [];
      }},

    // K243: Prohlášení=ANO + nerezident → restricted tax fields
    { id: 243, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'U daňového nerezidenta, který podepsal prohlášení poplatníka, lze uplatnit pouze základní slevu na poplatníka a nelze uplatnit zvláštní sazbu daně.',
      check: function(ctx) {
        var p = ctx.getVal('10419');
        if (p !== 'true' && p !== 'ANO') return [];
        var stat = ctx.getVal('10068');
        if (!stat || stat === 'CZ') return [];
        var fields = ['10300','10301','10302','10303','10453','10431','10432',
          '10433','10434','10435','10436','10437','10438','10439','10440',
          '10304','10306','10307','10309','10310'];
        for (var j = 0; j < fields.length; j++) {
          if (ctx.isFilled(fields[j]))
            return [{ fieldCsszId: fields[j], message: ctx.rule.msg }];
        }
        return [];
      }},

    // K244: Prohlášení=NE → no daňové slevy/zvýhodnění
    { id: 244, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Nebylo-li učiněno prohlášení poplatníka, nelze vyplnit atribut(y) související s daňovými slevami a daňovým zvýhodněním.',
      check: function(ctx) {
        var p = ctx.getVal('10419');
        if (p !== 'NE' && p !== 'false') return [];
        var fields = ['10299','10300','10301','10302','10303','10453','10431',
          '10432','10433','10434','10435','10436','10437','10438','10439',
          '10440','10304','10306'];
        for (var j = 0; j < fields.length; j++) {
          if (ctx.isFilled(fields[j]))
            return [{ fieldCsszId: fields[j], message: ctx.rule.msg }];
        }
        return [];
      }},

    // K248: Primární PPV=NE → souhrnná data fields empty
    { id: 248, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Atributy souhrnné vrstvy za zaměstnance mohou být vyplněny pouze u primárního pracovněprávního vztahu.',
      check: function(ctx) {
        var prim = ctx.getVal('10495');
        if (prim !== 'NE' && prim !== 'false') return [];
        var fields = [
          '10286','10416','10289','10417','10292','10293','10294','10295','10296',
          '10418','10419','10297','10298','10299','10300','10301','10302','10303',
          '10304','10305','10306','10307','10308','10309','10310',
          '10453','10431','10432','10433','10434','10435','10436','10437','10438','10439','10440',
          '10344','10116','10347','10348','10349','10350','10351','10352','10353',
          '10482','10371',
          '10311','10312','10313','10316','10317','10318','10319','10320',
          '10321','10322','10323','10420','10454',
          '10421','10422','10423','10424','10425','10426','10430','10539','10540','10541','10542',
          '10455','10441','10442','10443','10444','10445',
          '10446','10447','10448','10449','10450','10451'
        ];
        for (var j = 0; j < fields.length; j++) {
          if (ctx.isFilled(fields[j]))
            return [{ fieldCsszId: fields[j], message: ctx.rule.msg }];
        }
        return [];
      }},

    // K251: IDPPV (10228) must be unique across all employees
    { id: 251, scope: 'cross', sev: 'error', type: 'custom',
      msg: 'ID pracovněprávního vztahu musí být v podání unikátní.',
      check: function(ctx) {
        var seen = {};
        var errors = [];
        ctx.allEmps.forEach(function(e) {
          if (getVariantMetaVal(e, '10548')) return; // skip odložený příjem
          var id = getVal(e, '10228');
          if (!id) return;
          if (seen[id]) errors.push({ fieldCsszId: '10228', message: ctx.rule.msg });
          else seen[id] = true;
        });
        return errors;
      }},

    // K255: At least one primary PPV (10495=ANO) per OIČ
    { id: 255, scope: 'cross', sev: 'warning', type: 'custom',
      msg: 'Neexistuje žádné primární PPV za OIČ v rámci podání.',
      check: function(ctx) {
        var byOic = {};
        ctx.allEmps.forEach(function(e) {
          var oic = getVal(e, '10051');
          if (!oic) return;
          if (!byOic[oic]) byOic[oic] = false;
          var prim = getRowHeaderVal(e, '10495');
          if (prim === 'true' || prim === 'ANO') byOic[oic] = true;
        });
        var errors = [];
        Object.keys(byOic).forEach(function(oic) {
          if (!byOic[oic]) errors.push({ fieldCsszId: '10495', message: ctx.rule.msg });
        });
        return errors;
      }},

    // K258: If srážky provedeny (10349)=ANO, at least one type specified
    { id: 258, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Pokud jsou evidovány srážky ze mzdy nebo platu, pak musí být uvedena hodnota alespoň jednoho z atributů srážek.',
      check: function(ctx) {
        var s = ctx.getVal('10349');
        if (s !== 'true' && s !== 'ANO') return [];
        if (!ctx.isFilled('10350') && !ctx.isFilled('10351') && !ctx.isFilled('10352') && !ctx.isFilled('10353'))
          return [{ fieldCsszId: '10349', message: ctx.rule.msg }];
        return [];
      }},

    // K259: If datum expozice NPE (10272) filled, then 10270 or 10271 needed
    { id: 259, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Pokud je uveden Datum dosažení expozice NPE, pak musí být uveden alespoň jeden atribut počtu odpracovaných směn.',
      check: function(ctx) {
        if (!ctx.isFilled('10272')) return [];
        if (!ctx.isFilled('10270') && !ctx.isFilled('10271'))
          return [{ fieldCsszId: '10272', message: ctx.rule.msg }];
        return [];
      }},

    // K260: Max one primary PPV (10495=ANO) per OIČ
    { id: 260, scope: 'cross', sev: 'error', type: 'custom',
      msg: 'Existuje více než jedno primární PPV za OIČ v rámci podání.',
      check: function(ctx) {
        var countByOic = {};
        ctx.allEmps.forEach(function(e) {
          var prim = getRowHeaderVal(e, '10495');
          if (prim !== 'true' && prim !== 'ANO') return;
          var oic = getVal(e, '10051');
          if (!oic) return;
          countByOic[oic] = (countByOic[oic] || 0) + 1;
        });
        var errors = [];
        Object.keys(countByOic).forEach(function(oic) {
          if (countByOic[oic] > 1) errors.push({ fieldCsszId: '10495', message: ctx.rule.msg });
        });
        return errors;
      }},

    // K269: 10544 = sum(10477) where sleva OvoZel (10546)=ANO
    { id: 269, scope: 'cross', sev: 'warning', type: 'custom',
      msg: 'Vykázaný úhrn vyměřovacích základů zaměstnanců se slevou v ovocnářství a při pěstování zeleniny neodpovídá součtu vyměřovacích základů těchto zaměstnanců.',
      check: function(ctx) {
        var uhrn = readPvpojSlevaNum(_xmlDoc, '10544');
        if (uhrn === null) return [];
        var sum = 0;
        ctx.allEmps.forEach(function(e) {
          var sleva = getVal(e, '10546');
          if (sleva === 'true' || sleva === 'ANO') sum += (getNum(e, '10477') || 0);
        });
        if (Math.abs(uhrn - sum) > 0.5)
          return [{ fieldCsszId: '10544', message: ctx.rule.msg }];
        return [];
      }},

    // K270: Tolerance check OvoZel: 10545 ≈ 7.1% of 10544
    { id: 270, scope: 'cross', sev: 'error', type: 'custom',
      msg: 'Úhrn slev na pojistném zaměstnanců v ovocnářství neodpovídá vykázanému úhrnu vyměřovacích základů těchto zaměstnanců.',
      check: function(ctx) {
        var uhrnSlev = readPvpojSlevaNum(_xmlDoc, '10545');
        var uhrnVZ = readPvpojSlevaNum(_xmlDoc, '10544');
        if (uhrnSlev === null || uhrnVZ === null) return [];
        if (uhrnVZ === 0 && uhrnSlev === 0) return [];
        var expected = KONTROLY_CONSTANTS.rates.employeeInsurance * uhrnVZ;
        var relErr = expected > 0 ? Math.abs(1 - uhrnSlev / expected) : 1;
        var absErr = Math.abs(expected - uhrnSlev);
        if (relErr > KONTROLY_CONSTANTS.tolerances.relativeError && absErr > KONTROLY_CONSTANTS.tolerances.absoluteAmount)
          return [{ fieldCsszId: '10545', message: ctx.rule.msg }];
        if (uhrnSlev > KONTROLY_CONSTANTS.tolerances.employeeInsuranceUpperRate * uhrnVZ + KONTROLY_CONSTANTS.tolerances.roundedHalf)
          return [{ fieldCsszId: '10545', message: ctx.rule.msg }];
        return [];
      }},

    // K271: VZ > 48500 → OvoZel sleva forbidden
    { id: 271, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Slevu nelze uplatnit, protože částka vyměřovacího základu zaměstnance překračuje limit dle § 23b odst. 4 ZPSZ.',
      check: function(ctx) {
        var vz = ctx.getNum('10477');
        if (vz === null || vz <= KONTROLY_CONSTANTS.limits.ovozelVzMax) return [];
        var sleva = ctx.getVal('10546');
        if (sleva === 'true' || sleva === 'ANO')
          return [{ fieldCsszId: '10546', message: ctx.rule.msg }];
        return [];
      }},

    // K272: If OvoZel sleva (10546)=ANO, výše (10547) filled; else empty
    { id: 272, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Výše slevy na pojistném zaměstnance (ovocnářství) musí být vyplněna jen v případě, že je sleva uvedena jako ANO.',
      check: function(ctx) {
        var sleva = ctx.getVal('10546');
        var vyse = ctx.isFilled('10547');
        if ((sleva === 'true' || sleva === 'ANO') && !vyse)
          return [{ fieldCsszId: '10547', message: ctx.rule.msg }];
        if (sleva !== 'true' && sleva !== 'ANO' && vyse)
          return [{ fieldCsszId: '10547', message: ctx.rule.msg }];
        return [];
      }},

    // K273: If OvoZel sleva=ANO, výše (10547) = sociální pojištění (10370)
    { id: 273, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Atribut Výše slevy na pojistném zaměstnance (ovocnářství) neodpovídá atributu Sociální pojištění.',
      check: function(ctx) {
        var sleva = ctx.getVal('10546');
        if (sleva !== 'true' && sleva !== 'ANO') return [];
        var vyse = ctx.getNum('10547');
        var soc = ctx.getNum('10370');
        if (vyse === null || soc === null) return [];
        if (Math.abs(vyse - soc) > 0.5)
          return [{ fieldCsszId: '10547', message: ctx.rule.msg }];
        return [];
      }},

    // K275: Can't have both employee slevy (10490 + 10546) = ANO
    { id: 275, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Témuž zaměstnanci nelze poskytnout slevu zaměstnance pro pracující důchodce i slevu pro zaměstnance v ovocnářství a při pěstování zeleniny.',
      check: function(ctx) {
        var s1 = ctx.getVal('10490');
        var s2 = ctx.getVal('10546');
        if ((s1 === 'true' || s1 === 'ANO') && (s2 === 'true' || s2 === 'ANO'))
          return [{ fieldCsszId: '10546', message: ctx.rule.msg }];
        return [];
      }},

    // K276: Počet měsíců uplatnění slevy in [1,12]
    { id: 276, scope: 'emp', sev: 'error', type: 'range', field: '10426', min: 1, max: 12,
      msg: 'Chybná hodnota v počtu měsíců uplatnění slevy.' },

    // K277: Must have either RČ (10542) or datum narození (10541) for child
    { id: 277, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Chybí rodné číslo nebo datum narození dítěte v rámci uplatnění slevy podle § 35bb ZDP.',
      check: function(ctx) {
        var sec = 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/zvyhodneniNaDeti/vyzivovaneDeti/vyzivovaneDite';
        var n = ctx.getRepeatCount(sec);
        var errors = [];
        for (var i = 0; i < n; i++) {
          if (!ctx.isFilled('10541', i) && !ctx.isFilled('10542', i))
            errors.push({ fieldCsszId: '10541', message: ctx.rule.msg });
        }
        return errors;
      }},

    // ═══ Phase 5: Controls 278-342 ═══
    // Skipped: K292 (complex month-by-month child age calc), K293 (10263/10264 not in JMHZ),
    //          K309 (10243 REGZEC-only), K312 (complex pořadí ordering), K325 (complex multi-VS DPP),
    //          K335 (requires CISOB enum), K336/K337/K339/K340 (require PPV registry),
    //          K341/K342 (XSD handles required fields & data types)

    // K278: Child born in (rok-5) or earlier → too old for § 35bb sleva
    { id: 278, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Nelze uvést dítě, které se narodilo roku (rok - 5) a nebo dříve.',
      check: function(ctx) {
        var sec = 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/zvyhodneniNaDeti/vyzivovaneDeti/vyzivovaneDite';
        var n = ctx.getRepeatCount(sec);
        var rok = ctx.getHeaderNum('10011');
        if (!rok || n === 0) return [];
        var errors = [];
        for (var i = 0; i < n; i++) {
          var birthDate = _parseBirth(ctx.getVal('10541', i), ctx.getVal('10542', i));
          if (!birthDate) continue;
          if (birthDate.getFullYear() <= rok - 5)
            errors.push({ fieldCsszId: '10541', message: ctx.rule.msg });
        }
        return errors;
      }},

    // K280: Sum OvoZel slev (10547) across employees = úhrn (10545)
    { id: 280, scope: 'cross', sev: 'error', type: 'custom',
      msg: 'Vykázaný úhrn slev na pojistném zaměstnanců neodpovídá součtu slev na pojistném těchto zaměstnanců.',
      check: function(ctx) {
        var uhrn = readPvpojSlevaNum(_xmlDoc, '10545');
        if (uhrn === null) return [];
        var sum = 0;
        ctx.allEmps.forEach(function(e) { sum += (getNum(e, '10547') || 0); });
        if (Math.abs(uhrn - sum) > 0.5)
          return [{ fieldCsszId: '10545', message: ctx.rule.msg }];
        return [];
      }},

    // K282: If odpracované hodiny (10268)=0, related fields empty
    { id: 282, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Při nulovém počtu odpracovaných hodin se nevyplňují související atributy.',
      check: function(ctx) {
        var hod = ctx.getNum('10268');
        if (hod !== 0) return [];
        var fields = ['10269','10270','10271','10272','10273','10274'];
        for (var j = 0; j < fields.length; j++) {
          if (ctx.isFilled(fields[j]))
            return [{ fieldCsszId: fields[j], message: ctx.rule.msg }];
        }
        return [];
      }},

    // K283: If zúčtovaný příjem celkem (10286)=0, related fields empty
    { id: 283, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Při nulovém zúčtovaném příjmu se nevyplňují související atributy.',
      check: function(ctx) {
        var prijmy = ctx.getNum('10286');
        if (prijmy !== 0) return [];
        var fields = ['10416','10289','10417','10292','10293','10294','10295','10296','10418','10308','10309','10310'];
        for (var j = 0; j < fields.length; j++) {
          if (ctx.isFilled(fields[j]))
            return [{ fieldCsszId: fields[j], message: ctx.rule.msg }];
        }
        return [];
      }},

    // K284: If VZ (10477) nonzero, at least one A/B/C component filled (except K,S,M)
    { id: 284, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Pokud je vyměřovací základ zaměstnance nenulový, musí být vyplněna alespoň jedna z dílčích částek.',
      check: function(ctx) {
        var druh = ctx.getVal('10239');
        if (druh === 'K' || druh === 'S' || druh === 'M') return [];
        var vz = ctx.getNum('10477');
        if (!vz) return [];
        if (!ctx.isFilled('10478') && !ctx.isFilled('10479') && !ctx.isFilled('10480'))
          return [{ fieldCsszId: '10477', message: ctx.rule.msg }];
        return [];
      }},

    // K286: If neodpracované hodiny celkem (10275)=0, related fields empty
    { id: 286, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Při nulovém celkovém počtu neodpracovaných hodin se nevyplňují související atributy.',
      check: function(ctx) {
        var hod = ctx.getNum('10275');
        if (hod !== 0) return [];
        var fields = ['10276','10278','10277','10279','10280','10471','10472'];
        for (var j = 0; j < fields.length; j++) {
          if (ctx.isFilled(fields[j]))
            return [{ fieldCsszId: fields[j], message: ctx.rule.msg }];
        }
        return [];
      }},

    // K296: OvoZel sleva (10546=ANO) only for DPP (druh činnosti T-ZC)
    { id: 296, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Sleva na pojistném zaměstnanců v ovocnářství a při pěstování zeleniny náleží jen z DPP.',
      check: function(ctx) {
        var sleva = ctx.getVal('10546');
        if (sleva !== 'true' && sleva !== 'ANO') return [];
        var druh = ctx.getVal('10239');
        if (druh !== 'T') return [{ fieldCsszId: '10546', message: ctx.rule.msg }];
        return [];
      }},

    // K297: Počet zaměstnanců se slevou (10485) <= count with 10490=ANO
    { id: 297, scope: 'cross', sev: 'warning', type: 'custom',
      msg: 'Počet zaměstnanců, kteří mají nárok na slevu na pojistném pro pracující důchodce, nemůže být vyšší než počet pojistných vztahů, z nichž je tato sleva uplatňována.',
      check: function(ctx) {
        var pocet = readPvpojSlevaNum(_xmlDoc, '10485');
        if (pocet === null) return [];
        var count = 0;
        ctx.allEmps.forEach(function(e) {
          var s = getVal(e, '10490');
          if (s === 'true' || s === 'ANO') count++;
        });
        if (pocet > count)
          return [{ fieldCsszId: '10485', message: ctx.rule.msg }];
        return [];
      }},

    // K298: Počet zaměstnanců OvoZel (10543) <= count with 10546=ANO
    { id: 298, scope: 'cross', sev: 'warning', type: 'custom',
      msg: 'Počet zaměstnanců se slevou v ovocnářství nemůže být vyšší než počet pojistných vztahů (DPP), z nichž je tato sleva uplatňována.',
      check: function(ctx) {
        var pocet = readPvpojSlevaNum(_xmlDoc, '10543');
        if (pocet === null) return [];
        var count = 0;
        ctx.allEmps.forEach(function(e) {
          var s = getVal(e, '10546');
          if (s === 'true' || s === 'ANO') count++;
        });
        if (pocet > count)
          return [{ fieldCsszId: '10543', message: ctx.rule.msg }];
        return [];
      }},

    // K299: Pojištění od/do must be within reported month
    { id: 299, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Atributy pojištění od a pojištění do musí být v rámci vykazovaného rozhodného období.',
      check: function(ctx) {
        var mesic = ctx.getHeaderNum('10010');
        var rok = ctx.getHeaderNum('10011');
        if (!mesic || !rok) return [];
        var n = ctx.getRepeatCount('pojisteni/eldpSeznam/eldp');
        var errors = [];
        var firstDay = new Date(rok, mesic - 1, 1);
        var lastDay = new Date(rok, mesic, 0);
        for (var i = 0; i < n; i++) {
          var od = ctx.getVal('10354', i);
          var doo = ctx.getVal('10355', i);
          if (od) {
            var d = new Date(od);
            if (!isNaN(d) && (d < firstDay || d > lastDay))
              errors.push({ fieldCsszId: '10354', message: ctx.rule.msg });
          }
          if (doo) {
            var d2 = new Date(doo);
            if (!isNaN(d2) && (d2 < firstDay || d2 > lastDay))
              errors.push({ fieldCsszId: '10355', message: ctx.rule.msg });
          }
        }
        return errors;
      }},

    // K304: Základ pro výpočet daně (10535) >= 0
    { id: 304, scope: 'emp', sev: 'error', type: 'non_neg', field: '10535',
      msg: 'Hodnota musí být vyplněna i v případě nulového základu pro výpočet daně, zároveň nesmí být záporná.' },

    // K307: If kód ELDP (10240) not filled, ELDP fields empty
    { id: 307, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Pokud není uveden kód ELDP, nelze vyplňovat údaje o době důchodového pojištění.',
      check: function(ctx) {
        var n = ctx.getRepeatCount('pojisteni/eldpSeznam/eldp');
        var errors = [];
        for (var i = 0; i < n; i++) {
          if (ctx.isFilled('10240', i)) continue;
          var fields = ['10241','10242','10245','10357','10358','10359','10360','10362',
            '10536','10375','10462','10463','10464','10465','10466','10468','10469'];
          for (var j = 0; j < fields.length; j++) {
            if (ctx.isFilled(fields[j], i)) {
              errors.push({ fieldCsszId: fields[j], message: ctx.rule.msg });
              break;
            }
          }
        }
        return errors;
      }},

    // K310: If roční zúčtování (10320)=NE, roční fields empty
    { id: 310, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Nebylo-li provedeno roční zúčtování záloh, pak nesmí být vyplněny atribut(y) výsledku ročního zúčtování.',
      check: function(ctx) {
        var rz = ctx.getVal('10320');
        if (rz !== 'NE' && rz !== 'false') return [];
        var fields = ['10321','10322','10323','10420','10421','10422','10423','10424',
          '10425','10426','10430','10539','10540','10541','10542','10454','10455',
          '10441','10442','10443','10444','10445','10446','10447','10448','10449','10450','10451'];
        for (var j = 0; j < fields.length; j++) {
          if (ctx.isFilled(fields[j]))
            return [{ fieldCsszId: fields[j], message: ctx.rule.msg }];
        }
        return [];
      }},

    // K311: Roční zúčtování (10320)=ANO only in months 1-3
    { id: 311, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Roční zúčtování záloh je možné provádět právě jednou za kalendářní rok v měsíci: leden, únor nebo březen.',
      check: function(ctx) {
        var rz = ctx.getVal('10320');
        if (rz !== 'true' && rz !== 'ANO') return [];
        var mesic = ctx.getHeaderNum('10010');
        if (mesic !== null && mesic >= 1 && mesic <= 3) return [];
        return [{ fieldCsszId: '10320', message: ctx.rule.msg }];
      }},

    // K315: Pojistné = ceil(rate_A * A) + ceil(rate_B * B) + ceil(rate_C * C)
    { id: 315, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Pojistné na sociální zabezpečení neodpovídá vyměřovacímu základu zaměstnance.',
      check: function(ctx) {
        var pojistne = ctx.getNum('10481');
        if (pojistne === null) return [];
        var a = ctx.getNum('10478');
        var b = ctx.getNum('10479');
        var c = ctx.getNum('10480');
        var expected;
        if (a !== null || b !== null || c !== null) {
          expected = Math.ceil(KONTROLY_CONSTANTS.rates.employerInsuranceA * (a || 0))
            + Math.ceil(KONTROLY_CONSTANTS.rates.employerInsuranceB * (b || 0))
            + Math.ceil(KONTROLY_CONSTANTS.rates.employerInsuranceC * (c || 0));
        } else {
          var celkem = ctx.getNum('10477');
          if (celkem === null) return [];
          expected = Math.ceil(KONTROLY_CONSTANTS.rates.employerInsuranceA * celkem);
        }
        if (Math.abs(pojistne - expected) > KONTROLY_CONSTANTS.tolerances.combinedInsuranceDiff)
          return [{ fieldCsszId: '10481', message: ctx.rule.msg }];
        return [];
      }},

    // K321: If primární PPV=ANO, souhrnná data must be filled
    { id: 321, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Pokud je vyplněn primární pracovněprávní vztah zaměstnance, je nutné doplnit hodnoty z oblasti: Souhrnná data zaměstnance.',
      check: function(ctx) {
        var prim = ctx.getVal('10495');
        if (prim !== 'true' && prim !== 'ANO') return [];
        // Check key mandatory souhrnná data fields
        if (!ctx.isFilled('10286') && !ctx.isFilled('10297') && !ctx.isFilled('10419')
            && !ctx.isFilled('10344') && !ctx.isFilled('10482') && !ctx.isFilled('10371'))
          return [{ fieldCsszId: '10286', message: ctx.rule.msg }];
        return [];
      }},

    // K328: If ELDP odečítané doby (10375)=0, sub-fields empty
    { id: 328, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Pokud je počet kalendářních dnů doby odečítané po dosažení důchodového věku v měsíci nulový, pak se atributy o této době nevyplňují.',
      check: function(ctx) {
        var n = ctx.getRepeatCount('pojisteni/eldpSeznam/eldp');
        var errors = [];
        for (var i = 0; i < n; i++) {
          var doby = ctx.getNum('10375', i);
          if (doby !== 0) continue;
          var fields = ['10462','10463','10464','10465','10466','10468','10469'];
          for (var j = 0; j < fields.length; j++) {
            if (ctx.isFilled(fields[j], i)) {
              errors.push({ fieldCsszId: fields[j], message: ctx.rule.msg });
              break;
            }
          }
        }
        return errors;
      }},

    // K330: If započtené dny (10356) > 0, kód ELDP (10240) must be filled
    { id: 330, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Pokud jsou vyplněny započtené dny důchodového pojištění, musí být uveden i kód ELDP.',
      check: function(ctx) {
        var n = ctx.getRepeatCount('pojisteni/eldpSeznam/eldp');
        var errors = [];
        for (var i = 0; i < n; i++) {
          var dny = ctx.getNum('10356', i);
          if (dny !== null && dny > 0 && !ctx.isFilled('10240', i))
            errors.push({ fieldCsszId: '10240', message: ctx.rule.msg });
        }
        return errors;
      }},

    // K332: Primární PPV (10495) required unless storno
    { id: 332, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Ve formuláři chybí povinný atribut primární pracovněprávní vztah zaměstnance.',
      check: function(ctx) {
        var typ = ctx.getVal('10016');
        if (typ === 'S') return [];
        if (!ctx.isFilled('10495'))
          return [{ fieldCsszId: '10495', message: ctx.rule.msg }];
        return [];
      }},

    // K333: Sleva zaměstnavatele (10032) not allowed after 30.6.2026 for replacement
    { id: 333, scope: 'header', sev: 'error', type: 'custom',
      msg: 'Slevu na pojistném zaměstnavatele za měsíce leden, únor a březen 2026 nelze uplatnit po 30. 6. 2026.',
      check: function(ctx) {
        var typ = ctx.getHeaderVal('10016');
        if (typ !== 'R') return [];
        var mesic = ctx.getHeaderNum('10010');
        var rok = ctx.getHeaderNum('10011');
        if (rok !== 2026 || !mesic || mesic > 3) return [];
        var sleva = readPvpojSlevaNum(_xmlDoc, '10032');
        if (!sleva || sleva <= 0) return [];
        var prijeti = ctx.getHeaderVal('10006');
        if (!prijeti) {
          var now = new Date();
          if (now > new Date(2026, 5, 30))
            return [{ fieldCsszId: '10032', message: ctx.rule.msg }];
        } else {
          var d = new Date(prijeti.substring(0, 10));
          if (!isNaN(d) && d > new Date(2026, 5, 30))
            return [{ fieldCsszId: '10032', message: ctx.rule.msg }];
        }
        return [];
      }},

    // K338: Odložený příjem "Příjem po skončení" → ELDP 2nd pos must be "P" or empty
    { id: 338, scope: 'emp', sev: 'error', type: 'custom',
      msg: 'Pro daný typ odloženého příjmu musí být na druhé pozici kódu ELDP znak "P".',
      check: function(ctx) {
        var typ = getVariantMetaVal(ctx.emp, '10548');
        if (!typ) return [];
        // Only applies to "Příjem po skončení" type (check short code or starts with pattern)
        var isPostEnd = /p[rř][ií]jem.*po.*skon[cč]/i.test(typ) ||
                        typ === '1' || typ === 'P'; // possible short codes
        if (!isPostEnd) return [];
        var n = ctx.getRepeatCount('pojisteni/eldpSeznam/eldp');
        var errors = [];
        for (var i = 0; i < n; i++) {
          var kod = ctx.getVal('10240', i);
          if (!kod) continue;
          if (kod.length >= 2 && kod.charAt(1) !== 'P')
            errors.push({ fieldCsszId: '10240', message: ctx.rule.msg });
        }
        return errors;
      }},
  ];

  // Helper: parse birth date from datum narození or rodné číslo
  function _parseBirth(narozeni, rc) {
    if (narozeni) { var d = new Date(narozeni); return isNaN(d) ? null : d; }
    if (!rc) return null;
    var yy = parseInt(rc.substring(0, 2), 10);
    var mm = parseInt(rc.substring(2, 4), 10);
    var dd = parseInt(rc.substring(4, 6), 10);
    if (mm > 50) mm -= 50;
    if (mm > 20) mm -= 20;
    var year = yy < 54 ? 2000 + yy : 1900 + yy;
    var d = new Date(year, mm - 1, dd);
    return isNaN(d) ? null : d;
  }

  // ── Main Entry Point ─────────────────────────────────────────

  function runKontroly(xmlDoc, employees, headerFields, fields, fieldsBySec) {
    if (!_csszIdToField) buildCsszIndex(fields);
    _fieldsBySection = fieldsBySec;
    _xmlDoc = xmlDoc;

    const results = [];

    // Build header pseudo-employee for header-scope controls
    const pseudoEmp = { fields: {} };
    headerFields.forEach(h => {
      Object.entries(HEADER_CSSZ_MAP).forEach(([csszId, hdrKey]) => {
        if (hdrKey === h.key) {
          pseudoEmp.fields['_header/' + csszId] = { value: h.value || '' };
        }
      });
    });
    // Temporarily inject header field definitions into csszId map
    const injected = [];
    Object.keys(HEADER_CSSZ_MAP).forEach(csszId => {
      if (!_csszIdToField.has(csszId)) {
        const hdrKey = HEADER_CSSZ_MAP[csszId];
        const hf = headerFields.find(h => h.key === hdrKey);
        _csszIdToField.set(csszId, { section: '_header', element: csszId, csszId, label: hf ? hf.label : csszId });
        injected.push(csszId);
      }
    });

    function pushHeaderError(e) {
      const hdrKey = HEADER_CSSZ_MAP[e.fieldCsszId] || '';
      const hf = headerFields.find(h => h.key === hdrKey);
      results.push({
        severity: e.severity, controlId: e.controlId,
        empIndex: -1, employeeName: '',
        sectionLabel: hf ? 'PVPOJ' : 'Záhlaví',
        fieldLabel: hf ? hf.label : getFieldLabel(e.fieldCsszId),
        fieldKey: '', headerKey: hf ? hf.key : '',
        canNavigate: !!hf, message: e.message
      });
    }

    KONTROLY.forEach(rule => {
      if (rule.scope === 'header') {
        const errs = evalRule(rule, pseudoEmp, headerFields, employees);
        errs.forEach(pushHeaderError);

      } else if (rule.scope === 'cross') {
        // Cross-employee: runs once, custom function gets all employees
        if (rule.type === 'custom' && typeof rule.check === 'function') {
          const ctx = {
            getVal: (id, ii) => getVal(pseudoEmp, id, ii),
            getNum: (id, ii) => getNum(pseudoEmp, id, ii),
            isFilled: (id, ii) => isFilled(pseudoEmp, id, ii),
            getHeaderVal: (id) => getHeaderVal(headerFields, id),
            getHeaderNum: (id) => getHeaderNum(headerFields, id),
            allEmps: employees, headerFields, emp: pseudoEmp,
            getRepeatCount: () => 0, getFieldLabel, rule
          };
          const errs = rule.check(ctx);
          if (errs && errs.length > 0) {
            errs.forEach(ce => {
              pushHeaderError({
                severity: ce.severity || rule.sev || 'error',
                controlId: rule.id,
                fieldCsszId: ce.fieldCsszId || '',
                message: ce.message || rule.msg
              });
            });
          }
        }

      } else {
        // Employee-level control: evaluate for each employee
        employees.forEach((emp, empIdx) => {
          const errs = evalRule(rule, emp, headerFields, employees);
          errs.forEach(e => {
            const fd = getFieldDef(e.fieldCsszId);
            const fk = fd ? fieldKeyFor(fd, e.instanceIndex) : '';
            results.push({
              severity: e.severity, controlId: e.controlId,
              empIndex: empIdx,
              employeeName: emp.surname ? (emp.surname + ' ' + (emp.firstName || '')).trim() : ('Řádek ' + (empIdx + 1)),
              sectionLabel: getSectionLabel(e.fieldCsszId),
              fieldLabel: getFieldLabel(e.fieldCsszId),
              fieldKey: fk, headerKey: '',
              canNavigate: !!fd, message: e.message
            });
          });
        });
      }
    });

    injected.forEach(id => _csszIdToField.delete(id));
    _xmlDoc = null;
    return results;
  }

  // Reset index on format change
  function resetKontrolyIndex() {
    _csszIdToField = null;
    _fieldsBySection = null;
  }

  // ── Export ────────────────────────────────────────────────────
  window.JMHZKontroly = {
    runKontroly,
    resetKontrolyIndex,
    KONTROLY
  };
})();
