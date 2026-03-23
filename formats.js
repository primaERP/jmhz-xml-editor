// === Format Configurations for REGZEC + JMHZ ===

function getChildByLocalName(parent, localName) {
  if (!parent) return null;
  for (let i = 0; i < parent.childNodes.length; i++) {
    if (parent.childNodes[i].nodeType === 1 && parent.childNodes[i].localName === localName) return parent.childNodes[i];
  }
  return null;
}

function getChildByLocalNameNS(parent, localName, ns) {
  if (!parent) return null;
  for (let i = 0; i < parent.childNodes.length; i++) {
    const ch = parent.childNodes[i];
    if (ch.nodeType === 1 && ch.localName === localName && (!ns || ch.namespaceURI === ns)) return ch;
  }
  return null;
}

const REGZEC_CONFIG = {
  name: 'REGZEC',
  ns: 'http://schemas.cssz.cz/REGZEC/2025',
  rootElement: 'REGZEC',
  rowsContainer: 'employees',
  rowElement: 'employee',
  rowParentElement: null,
  fieldMode: 'attributes',
  hasActions: true,
  hasForeignerFilter: true,
  schemasKey: 'DEFAULT_SCHEMAS',
  sections: [
    // Core sections (all employees)
    { id: 'employee', label: 'Hlavička podání', element: null },
    { id: 'client', label: 'Identifikace', element: 'client' },
    { id: 'client/name', label: 'Jméno a příjmení', element: 'client', child: 'name' },
    { id: 'client/birth', label: 'Narození', element: 'client', child: 'birth' },
    { id: 'client/stat', label: 'Pohlaví a občanství', element: 'client', child: 'stat' },
    { id: 'client/adr', label: 'Trvalé bydliště', element: 'client', child: 'adr' },
    { id: 'comp', label: 'Zaměstnavatel', element: 'comp' },
    { id: 'job', label: 'Pracovní poměr', element: 'job' },
    { id: 'job/prof', label: 'Profese', element: 'job', child: 'prof' },
    { id: 'job/position', label: 'Pozice', element: 'job', child: 'position' },
    { id: 'pens', label: 'Důchod', element: 'pens' },
    { id: 'insh', label: 'Zdravotní pojišťovna', element: 'insh' },
    { id: 'inso', label: 'Současný orgán NP mimo ČSSZ', element: 'inso' },
    { id: 'insp', label: 'Předchozí orgán NP mimo ČSSZ', element: 'insp' },
    { id: 'unemplcomp', label: 'Podpora v nezaměstnanosti', element: 'unemplcomp' },
    { id: 'fact', label: 'Další údaje', element: 'fact' },
    { id: 'fact/healtrest', label: 'Zdravotní omezení', element: 'fact', child: 'healtrest' },
    { id: 'forinreg', label: 'Cizí právní předpisy', element: 'forinreg' },
    // Foreigner/conditional sections (at end)
    { id: 'client/fdr', label: 'Pobyt v ČR', element: 'client', child: 'fdr', _foreign: true },
    { id: 'client/rdr', label: 'Adresa rezidence', element: 'client', child: 'rdr', _foreign: true },
    { id: 'client/taxidrezid', label: 'Daňová identifikace', element: 'client', child: 'taxidrezid', _foreign: true },
    { id: 'client/proofid', label: 'Doklad totožnosti', element: 'client', child: 'proofid', _foreign: true },
    { id: 'forin', label: 'Cizozemský nositel pojištění', element: 'forin', _foreign: true },
    { id: 'nocitizen', label: 'Cizinec – pracovní oprávnění', element: 'nocitizen', _foreign: true },
  ],
  fields: [
    // Core fields (all employees)
    { section: 'employee', attr: 'sqnr', csszId: null, label: 'Pořadové číslo věty', type: 'number' },
    { section: 'employee', attr: 'dep', csszId: '10004', label: 'Číslo OSSZ', type: 'text', maxLength: 3 },
    { section: 'employee', attr: 'act', csszId: '10008', label: 'Číslo akce', type: 'number' },
    { section: 'employee', attr: 'dat', csszId: '10005', label: 'Datum vyplnění', type: 'date' },
    { section: 'employee', attr: 'fro', csszId: '10009', label: 'Platnost akce ke dni', type: 'date' },
    { section: 'client', attr: 'bno', csszId: '10057', label: 'Rodné číslo / EČP', type: 'text', maxLength: 10 },
    { section: 'client', attr: 'ikmpsv', csszId: '10051', label: 'IK MPSV (OIČ)', type: 'text', maxLength: 10 },
    { section: 'client', attr: 'vcp', csszId: '10060', label: 'VČP', type: 'text', maxLength: 20 },
    { section: 'client/name', attr: 'sur', csszId: '10053', label: 'Příjmení', type: 'text', maxLength: 50 },
    { section: 'client/name', attr: 'fir', csszId: '10054', label: 'Jméno', type: 'text', maxLength: 50 },
    { section: 'client/name', attr: 'tit', csszId: '10055', label: 'Titul', type: 'text', maxLength: 35 },
    { section: 'client/name', attr: 'ona', csszId: '10064', label: 'Dřívější příjmení', type: 'text', maxLength: 50 },
    { section: 'client/birth', attr: 'dat', csszId: '10056', label: 'Datum narození', type: 'date' },
    { section: 'client/birth', attr: 'nam', csszId: '10063', label: 'Rodné příjmení', type: 'text', maxLength: 50 },
    { section: 'client/birth', attr: 'cit', csszId: '10066', label: 'Místo narození', type: 'text', maxLength: 50 },
    { section: 'client/birth', attr: 'stat', csszId: '10065', label: 'Stát narození', type: 'text', maxLength: 2 },
    { section: 'client/stat', attr: 'mal', csszId: '10059', label: 'Pohlaví', type: 'text', maxLength: 1 },
    { section: 'client/stat', attr: 'cnt', csszId: '10067', label: 'Státní občanství', type: 'text', maxLength: 2 },
    { section: 'client/adr', attr: 'str', csszId: '10077', label: 'Ulice', type: 'text', maxLength: 50 },
    { section: 'client/adr', attr: 'num', csszId: '10078', label: 'Číslo popisné', type: 'text', maxLength: 12 },
    { section: 'client/adr', attr: 'onum', csszId: '10079', label: 'Číslo orientační', type: 'text', maxLength: 12 },
    { section: 'client/adr', attr: 'pnu', csszId: '10082', label: 'PSČ', type: 'text', maxLength: 11 },
    { section: 'client/adr', attr: 'cit', csszId: '10080', label: 'Obec', type: 'text', maxLength: 50 },
    { section: 'client/adr', attr: 'cnt', csszId: '10083', label: 'Stát', type: 'text', maxLength: 2 },
    { section: 'client/adr', attr: 'ruianpoint', csszId: '10076', label: 'Kód RUIAN', type: 'number' },
    { section: 'comp', attr: 'vs', csszId: '10221', label: 'Variabilní symbol', type: 'text', maxLength: 10 },
    { section: 'comp', attr: 'nvs', csszId: '10222', label: 'Nový variabilní symbol', type: 'text', maxLength: 10 },
    { section: 'comp', attr: 'nam', csszId: '10120', label: 'Název zaměstnavatele', type: 'text', maxLength: 150 },
    { section: 'job', attr: 'oid', csszId: '10228', label: 'ID pojistného vztahu', type: 'text', maxLength: 22 },
    { section: 'job', attr: 'fro', csszId: '10223', label: 'Datum nástupu', type: 'date' },
    { section: 'job', attr: 'to', csszId: '10224', label: 'Datum skončení', type: 'date' },
    { section: 'job', attr: 'rel', csszId: '10239', label: 'Druh činnosti', type: 'text', maxLength: 2 },
    { section: 'job', attr: 'relDetail', csszId: '10502', label: 'Bližší určení PPV', type: 'number' },
    { section: 'job', attr: 'sme', csszId: '10243', label: 'Malý rozsah', type: 'boolean' },
    { section: 'job', attr: 'endbydeath', csszId: '10225', label: 'Ukončeno smrtí', type: 'boolean' },
    { section: 'job', attr: 'notstart', csszId: '10226', label: 'Zaměstnanec nenastoupil', type: 'boolean' },
    { section: 'job', attr: 'contractfro', csszId: '10227', label: 'Vznik zaměstnání', type: 'date' },
    { section: 'job', attr: 'relat', csszId: '10249', label: 'Postavení v zaměstnání', type: 'number' },
    { section: 'job', attr: 'workmode', csszId: '10255', label: 'Pracovní režim', type: 'number' },
    { section: 'job', attr: 'cont', csszId: '10407', label: 'Nepřetržitý provoz', type: 'boolean' },
    { section: 'job', attr: 'place', csszId: '10258', label: 'Práce probíhá převážně', type: 'number' },
    { section: 'job', attr: 'preplace', csszId: '10526', label: 'Předpokládané místo výkonu', type: 'text', maxLength: 500 },
    { section: 'job', attr: 'contractplace', csszId: '10527', label: 'Místo výkonu práce (smlouva)', type: 'text', maxLength: 200 },
    { section: 'job', attr: 'cit', csszId: '10528', label: 'Název obce', type: 'text', maxLength: 50 },
    { section: 'job', attr: 'municode', csszId: '10529', label: 'Kód obce', type: 'text', maxLength: 6 },
    { section: 'job/prof', attr: 'clas', csszId: '10234', label: 'Kód profese', type: 'text', maxLength: 5 },
    { section: 'job/prof', attr: 'edu', csszId: '10248', label: 'Vzdělání pro profesi', type: 'text', maxLength: 1 },
    { section: 'job/position', attr: 'name', csszId: '10235', label: 'Název pozice', type: 'text', maxLength: 100 },
    { section: 'job/position', attr: 'lead', csszId: '10238', label: 'Vedoucí zaměstnanec', type: 'boolean' },
    { section: 'pens', attr: 'typ', csszId: '10113', label: 'Druh důchodu', type: 'text', maxLength: 1 },
    { section: 'pens', attr: 'tak', csszId: '10114', label: 'Důchod pobírán od', type: 'date' },
    { section: 'pens', attr: 'early', csszId: '10115', label: 'Předčasný důchod', type: 'boolean' },
    { section: 'pens', attr: 'reducedAge', csszId: '10504', label: 'Snížený důchodový věk', type: 'boolean' },
    { section: 'insh', attr: 'cnr', csszId: '10102', label: 'Kód zdravotní pojišťovny', type: 'number' },
    { section: 'inso', attr: 'nam', csszId: '10103', label: 'Název orgánu', type: 'text', maxLength: 100 },
    { section: 'insp', attr: 'nam', csszId: '10104', label: 'Název orgánu', type: 'text', maxLength: 100 },
    { section: 'unemplcomp', attr: 'rsn', csszId: '10376', label: 'Důvod neposkytnutí', type: 'number' },
    { section: 'unemplcomp', attr: 'typeempl', csszId: '10525', label: 'Druh zaměstnání', type: 'number' },
    { section: 'unemplcomp', attr: 'avgmonear', csszId: '10377', label: 'Průměrný čistý výdělek', type: 'number' },
    { section: 'unemplcomp', attr: 'belong', csszId: '10378', label: 'Nárok na odstupné', type: 'boolean' },
    { section: 'unemplcomp', attr: 'fullpay', csszId: '10379', label: 'Vyplaceno v plné výši', type: 'boolean' },
    { section: 'unemplcomp', attr: 'rsnterempl', csszId: '10380', label: 'Důvod ukončení PPV', type: 'number' },
    { section: 'unemplcomp', attr: 'rsnterrel', csszId: '10381', label: 'Důvod ukončení sl. poměru', type: 'number' },
    { section: 'unemplcomp', attr: 'replacement', csszId: '10530', label: 'Jednorázová náhrada §271ca', type: 'number' },
    { section: 'unemplcomp', attr: 'goldenhandshake', csszId: '10531', label: 'Odstupné §67', type: 'number' },
    { section: 'unemplcomp', attr: 'severancepay', csszId: '10532', label: 'Odchodné', type: 'number' },
    { section: 'unemplcomp', attr: 'disposal', csszId: '10533', label: 'Odbytné', type: 'number' },
    { section: 'unemplcomp', attr: 'earlyterm', csszId: '10534', label: 'Důvod předčasného ukončení', type: 'number' },
    { section: 'fact', attr: 'ztp', csszId: '10090', label: 'Držitel ZTP/P', type: 'boolean' },
    { section: 'fact', attr: 'highedu', csszId: '10091', label: 'Vzdělání KKOV', type: 'text', maxLength: 1 },
    { section: 'fact/healtrest', attr: 'type', csszId: '10085', label: 'Typ zdravotního omezení', type: 'number' },
    { section: 'fact/healtrest', attr: 'fro', csszId: '10086', label: 'Zdravotní omezení od', type: 'date' },
    { section: 'fact/healtrest', attr: 'to', csszId: '10087', label: 'Zdravotní omezení do', type: 'date' },
    { section: 'forinreg', attr: 'juris', csszId: '10427', label: 'Cizí právní předpisy', type: 'boolean' },
    { section: 'forinreg', attr: 'state', csszId: '10428', label: 'Kód státu', type: 'text', maxLength: 2 },
    // Foreigner/conditional fields (at end)
    { section: 'client/fdr', attr: 'str', csszId: '10513', label: 'Ulice', type: 'text', maxLength: 50 },
    { section: 'client/fdr', attr: 'num', csszId: '10514', label: 'Číslo popisné', type: 'number' },
    { section: 'client/fdr', attr: 'onum', csszId: '10515', label: 'Číslo orientační', type: 'text', maxLength: 12 },
    { section: 'client/fdr', attr: 'pnu', csszId: '10517', label: 'PSČ', type: 'text', maxLength: 5 },
    { section: 'client/fdr', attr: 'cit', csszId: '10516', label: 'Obec', type: 'text', maxLength: 50 },
    { section: 'client/fdr', attr: 'ruianpoint', csszId: '10512', label: 'Kód RUIAN', type: 'number' },
    { section: 'client/rdr', attr: 'str', csszId: '10519', label: 'Ulice', type: 'text', maxLength: 50 },
    { section: 'client/rdr', attr: 'num', csszId: '10520', label: 'Číslo popisné', type: 'text', maxLength: 12 },
    { section: 'client/rdr', attr: 'onum', csszId: '10521', label: 'Číslo orientační', type: 'text', maxLength: 12 },
    { section: 'client/rdr', attr: 'pnu', csszId: '10522', label: 'PSČ', type: 'text', maxLength: 11 },
    { section: 'client/rdr', attr: 'cit', csszId: '10523', label: 'Obec', type: 'text', maxLength: 50 },
    { section: 'client/rdr', attr: 'cnt', csszId: '10524', label: 'Stát', type: 'text', maxLength: 2 },
    { section: 'client/taxidrezid', attr: 'type', csszId: '10061', label: 'Typ daňové identifikace', type: 'text', maxLength: 1 },
    { section: 'client/taxidrezid', attr: 'num', csszId: '10062', label: 'Daňový identifikátor', type: 'text', maxLength: 20 },
    { section: 'client/taxidrezid', attr: 'stat', csszId: '10068', label: 'Kód státu rezidentství', type: 'text', maxLength: 2 },
    { section: 'client/taxidrezid', attr: 'statchang', csszId: '10459', label: 'Platnost změny od', type: 'date' },
    { section: 'client/proofid', attr: 'type', csszId: '10069', label: 'Typ dokladu', type: 'text', maxLength: 2 },
    { section: 'client/proofid', attr: 'num', csszId: '10070', label: 'Číslo dokladu', type: 'text', maxLength: 20 },
    { section: 'client/proofid', attr: 'foreigninst', csszId: '10071', label: 'Vydal (orgán v zahraničí)', type: 'text', maxLength: 100 },
    { section: 'client/proofid', attr: 'stat', csszId: '10072', label: 'Stát vydání', type: 'text', maxLength: 2 },
    { section: 'forin', attr: 'cur', csszId: '10092', label: 'Specifikace', type: 'text', maxLength: 1 },
    { section: 'forin', attr: 'nam', csszId: '10093', label: 'Název nositele', type: 'text', maxLength: 100 },
    { section: 'forin', attr: 'str', csszId: '10094', label: 'Ulice', type: 'text', maxLength: 50 },
    { section: 'forin', attr: 'num', csszId: '10095', label: 'Č.p.', type: 'text', maxLength: 12 },
    { section: 'forin', attr: 'onum', csszId: '10096', label: 'Č.o.', type: 'text', maxLength: 12 },
    { section: 'forin', attr: 'pnu', csszId: '10098', label: 'PSČ', type: 'text', maxLength: 11 },
    { section: 'forin', attr: 'cit', csszId: '10097', label: 'Obec', type: 'text', maxLength: 50 },
    { section: 'forin', attr: 'cnt', csszId: '10099', label: 'Stát', type: 'text', maxLength: 2 },
    { section: 'forin', attr: 'id', csszId: '10100', label: 'Číslo pojištění', type: 'text', maxLength: 25 },
    { section: 'forin', attr: 'sec', csszId: '10101', label: 'Sektor pojištění', type: 'text', maxLength: 2 },
    { section: 'nocitizen', attr: 'freeacc', csszId: '10414', label: 'Volný přístup na trh práce', type: 'boolean' },
    { section: 'nocitizen', attr: 'perm', csszId: '10105', label: 'Důvod volného přístupu', type: 'number' },
    { section: 'nocitizen', attr: 'permtype', csszId: '10106', label: 'Druh pracovního oprávnění', type: 'number' },
    { section: 'nocitizen', attr: 'issue', csszId: '10107', label: 'Krajská pobočka ÚP', type: 'text', maxLength: 3 },
    { section: 'nocitizen', attr: 'permid', csszId: '10108', label: 'Identifikátor oprávnění', type: 'text', maxLength: 20 },
    { section: 'nocitizen', attr: 'permfro', csszId: '10109', label: 'Oprávnění od', type: 'date' },
    { section: 'nocitizen', attr: 'permto', csszId: '10110', label: 'Oprávnění do', type: 'date' },
  ],
  actionLabels: { '1': 'A1 Přihláška', '2': 'A2 Odhláška', '3': 'A3 Změna', '4': 'A4 Oprava', '8': 'A8 Storno' },
  actionSections: {
    '': null,
    '1': null,
    '2': ['employee', 'client', 'client/name', 'comp', 'job', 'unemplcomp'],
    '3': ['employee', 'client', 'client/name', 'client/birth', 'client/stat', 'client/adr', 'comp', 'job', 'job/prof', 'job/position', 'pens', 'insh', 'fact', 'fact/healtrest', 'forinreg', 'client/fdr', 'client/rdr', 'client/taxidrezid', 'client/proofid', 'nocitizen'],
    '4': null,
    '8': ['employee', 'client', 'comp', 'job'],
  },
  fieldRules: {
    // employee header
    '10004': { '1':'P','2':'P','3':'P','4':'P','8':'P' },
    '10008': { '1':'P','2':'P','3':'P','4':'P','8':'P' },
    '10005': { '1':'P','2':'P','3':'P','4':'P','8':'P' },
    '10009': { '1':'/','2':'/','3':'P','4':'P','8':'/' },
    // client
    '10057': { '1':'PP','2':'PP','3':'PP','4':'PP','8':'PP' },
    '10051': { '1':'N','2':'P','3':'P','4':'P','8':'P' },
    '10060': { '1':'N','2':'/','3':'N','4':'N','8':'/' },
    // client/name
    '10053': { '1':'P','2':'/','3':'N','4':'N','8':'/' },
    '10054': { '1':'P','2':'/','3':'N','4':'N','8':'/' },
    '10055': { '1':'N','2':'/','3':'N','4':'N','8':'/' },
    '10064': { '1':'N','2':'/','3':'N','4':'N','8':'/' },
    // client/birth
    '10056': { '1':'P','2':'/','3':'N','4':'N','8':'/' },
    '10063': { '1':'P','2':'/','3':'/','4':'N','8':'/' },
    '10066': { '1':'P','2':'/','3':'/','4':'N','8':'/' },
    '10065': { '1':'P','2':'/','3':'/','4':'N','8':'/' },
    // client/stat
    '10059': { '1':'P','2':'/','3':'N','4':'N','8':'/' },
    '10067': { '1':'P','2':'/','3':'N','4':'N','8':'/' },
    // client/adr
    '10077': { '1':'N','2':'/','3':'N','4':'N','8':'/' },
    '10078': { '1':'P','2':'/','3':'PP','4':'PP','8':'/' },
    '10079': { '1':'N','2':'/','3':'N','4':'N','8':'/' },
    '10082': { '1':'P','2':'/','3':'PP','4':'PP','8':'/' },
    '10080': { '1':'P','2':'/','3':'PP','4':'PP','8':'/' },
    '10083': { '1':'P','2':'/','3':'PP','4':'PP','8':'/' },
    '10076': { '1':'N','2':'/','3':'N','4':'N','8':'/' },
    // comp
    '10221': { '1':'P','2':'P','3':'P','4':'P','8':'P' },
    '10222': { '1':'N','2':'N','3':'N','4':'N','8':'/' },
    '10120': { '1':'P','2':'P','3':'P','4':'P','8':'P' },
    // job
    '10228': { '1':'/','2':'P','3':'P','4':'P','8':'P' },
    '10223': { '1':'P','2':'/','3':'N','4':'N','8':'/' },
    '10224': { '1':'N','2':'P','3':'N','4':'N','8':'/' },
    '10239': { '1':'P','2':'P','3':'P','4':'P','8':'/' },
    '10502': { '1':'P','2':'P','3':'P','4':'P','8':'/' },
    '10243': { '1':'P-OST','2':'/','3':'/','4':'N-OST','8':'/' },
    '10225': { '1':'/','2':'P-OST','3':'/','4':'N-OST','8':'/' },
    '10226': { '1':'/','2':'/','3':'/','4':'/','8':'P' },
    '10227': { '1':'P-OST','2':'/','3':'N-OST','4':'N-OST','8':'/' },
    '10249': { '1':'P-OST','2':'/','3':'N-OST','4':'N-OST','8':'/' },
    '10255': { '1':'P-OST','2':'/','3':'N-OST','4':'N-OST','8':'/' },
    '10407': { '1':'P-OST','2':'/','3':'N-OST','4':'N-OST','8':'/' },
    '10258': { '1':'PP','2':'/','3':'N','4':'N','8':'/' },
    '10526': { '1':'PP','2':'/','3':'N','4':'N','8':'/' },
    '10527': { '1':'P','2':'/','3':'N','4':'N','8':'/' },
    '10528': { '1':'P','2':'/','3':'N','4':'N','8':'/' },
    '10529': { '1':'P','2':'/','3':'N','4':'N','8':'/' },
    '10234': { '1':'P-OST','2':'/','3':'N-OST','4':'N-OST','8':'/' },
    '10248': { '1':'PP','2':'/','3':'N','4':'N','8':'/' },
    '10235': { '1':'P-OST','2':'/','3':'N-OST','4':'N-OST','8':'/' },
    '10238': { '1':'P-OST','2':'/','3':'N-OST','4':'N-OST','8':'/' },
    '10534': { '1':'PP','2':'PP','3':'PP','4':'PP','8':'/' },
    // pens
    '10113': { '1':'PP','2':'/','3':'PP','4':'PP','8':'/' },
    '10114': { '1':'PP','2':'/','3':'PP','4':'PP','8':'/' },
    '10115': { '1':'P-OST','2':'/','3':'N-OST','4':'N-OST','8':'/' },
    '10504': { '1':'P-OST','2':'/','3':'N-OST','4':'N-OST','8':'/' },
    // insh
    '10102': { '1':'P','2':'/','3':'N','4':'N','8':'/' },
    // inso/insp
    '10103': { '1':'N','2':'/','3':'N','4':'N','8':'/' },
    '10104': { '1':'N','2':'/','3':'N','4':'N','8':'/' },
    // unemplcomp
    '10376': { '1':'N','2':'N','3':'/','4':'N','8':'/' },
    '10525': { '1':'N','2':'N','3':'/','4':'N','8':'/' },
    '10377': { '1':'PP','2':'PP','3':'/','4':'PP','8':'/' },
    '10378': { '1':'PP','2':'PP','3':'/','4':'PP','8':'/' },
    '10379': { '1':'PP','2':'PP','3':'/','4':'PP','8':'/' },
    '10380': { '1':'PP','2':'PP','3':'/','4':'PP','8':'/' },
    '10381': { '1':'N','2':'N','3':'/','4':'N','8':'/' },
    '10530': { '1':'PP','2':'PP','3':'/','4':'PP','8':'/' },
    '10531': { '1':'PP','2':'PP','3':'/','4':'PP','8':'/' },
    '10532': { '1':'N','2':'N','3':'/','4':'N','8':'/' },
    '10533': { '1':'N','2':'N','3':'/','4':'N','8':'/' },
    // fact
    '10090': { '1':'PP','2':'/','3':'PP','4':'PP','8':'/' },
    '10091': { '1':'P-OST','2':'/','3':'N-OST','4':'N-OST','8':'/' },
    '10085': { '1':'N','2':'/','3':'N','4':'N','8':'/' },
    '10086': { '1':'PP','2':'/','3':'N','4':'N','8':'/' },
    '10087': { '1':'PP','2':'/','3':'N','4':'N','8':'/' },
    // forinreg
    '10427': { '1':'P-OST','2':'/','3':'N-OST','4':'N-OST','8':'/' },
    '10428': { '1':'PP','2':'/','3':'N','4':'N','8':'/' },
    // nocitizen
    '10414': { '1':'PP','2':'/','3':'PP','4':'PP','8':'/' },
    '10105': { '1':'PP','2':'/','3':'PP','4':'PP','8':'/' },
    '10106': { '1':'PP','2':'/','3':'PP','4':'PP','8':'/' },
    '10107': { '1':'PP','2':'/','3':'PP','4':'PP','8':'/' },
    '10108': { '1':'PP','2':'/','3':'PP','4':'PP','8':'/' },
    '10109': { '1':'PP','2':'/','3':'PP','4':'PP','8':'/' },
    '10110': { '1':'PP','2':'/','3':'PP','4':'PP','8':'/' },
  },
  foreignKeywords: ['cizin', 'cizi', 'foreig', 'foreign', 'zahran', 'cuzi'],
  getRowLabel: function(fields) { return (fields['client/name/sur']?.value || '') + ' ' + (fields['client/name/fir']?.value || ''); },
  rowColumnLabel: 'Jméno',
  getRowInfo: [
    { key: 'client/bno', label: 'RČ' },
    { key: 'insh/cnr', label: 'ZP' },
    { key: 'client/stat/cnt', label: 'Občanství' },
    { key: 'job/relDetail', label: 'PPV' },
    { key: 'job/oid', label: 'ID PPV' }
  ],
  stats: {
    employer: 'comp/nam',
    date: 'employee/dat',
    citizenship: 'client/stat/cnt',
    action: 'employee/act',
    partialAccept: true
  },
  parseDocumentHeader: function(doc) {
    if (!doc) return [];
    const root = doc.documentElement;
    const fields = [];
    const ver = root.getAttribute('version');
    if (ver) fields.push({ label: 'Verze', value: ver });
    const pa = root.getAttribute('partialAccept');
    if (pa) fields.push({ label: 'Částečné přijetí', value: pa });
    for (const c of root.children) {
      if (c.localName === 'VENDOR') {
        const pn = c.getAttribute('productName') || '';
        const pv = c.getAttribute('productVersion') || '';
        if (pn || pv) fields.push({ label: 'Software', value: [pn, pv].filter(Boolean).join(' ') });
      }
    }
    return fields;
  },
  resolveSection: function(empEl, sec) {
    if (sec.id === 'employee') return empEl;
    if (sec.child) { const p = getChildByLocalName(empEl, sec.element); return p ? getChildByLocalName(p, sec.child) : null; }
    return getChildByLocalName(empEl, sec.element);
  },
  headerFields: ['sqnr', 'dep', 'act', 'dat', 'fro'],
  readField: function(targetEl, field) {
    if (!targetEl) return '';
    return targetEl.getAttribute(field.attr) || '';
  },
  writeField: function(fieldRef, value) {
    if (value) fieldRef.el.setAttribute(fieldRef.attr, value);
    else fieldRef.el.removeAttribute(fieldRef.attr);
  },
  fieldAttrKey: function(field) { return field.attr; },
  fieldXpath: function(field) { return field.section + '/@' + field.attr; },
  determineRowType: function(fields) {
    const rel = fields['job/rel']?.value || '';
    const relDetail = fields['job/relDetail']?.value || '';
    if (!rel) return 'OST';
    if (['11','12','13','14','M'].includes(rel)) return 'SPEC';
    if (rel === '10') return '10';
    if (/^[1-9]$/.test(rel) && relDetail === '2') return 'SPEC';
    return 'OST';
  },
  rowElementPattern: /<[a-zA-Z]*:?employee[\s>]/,
  fieldGroups: [
    { id: 'personal',    label: 'Osoba',           query: 'identifikace, jmeno a prijmeni, narozeni, pohlavi a obcanstvi' },
    { id: 'addresses',  label: 'Adresy',          query: 'trvale bydliste, pobyt v cr, adresa rezidence' },
    { id: 'employer',   label: 'Zaměstnavatel',   query: 'zamestnavatel' },
    { id: 'employment', label: 'Pracovní poměr',  query: 'pracovni pomer, profese, pozice' },
    { id: 'insurance',  label: 'Pojišťovny',      query: 'zdravotni pojistovna, organ np' },
    { id: 'pension',    label: 'Důchod',          query: 'duchod' },
    { id: 'termination',label: 'Ukončení',        query: 'podpora v nezamestnanosti' },
    { id: 'health',     label: 'Zdraví',          query: 'dalsi udaje, zdravotni omezeni' },
    { id: 'foreign',    label: 'Cizinec',         query: 'cizozemsky, cizi pravni predpisy, pracovni opravneni, danove identifikace, doklad' },
  ],
};

const JMHZ_CONFIG = {
  name: 'Měsíční hlášení',
  ns: 'http://schemas.cssz.cz/JMHZ/podani/1.0',
  formNs: 'http://schemas.cssz.cz/JMHZ/form/1.0',
  rootElement: 'jmhz',
  rowsContainer: null,
  rowElement: 'formularOsoby',
  rowParentElement: 'formulareOsob',
  fieldMode: 'elements',
  hasActions: false,
  hasForeignerFilter: false,
  schemasKey: 'JMHZ_SCHEMAS',
  mainSchema: 'jmhzPodani.xsd',
  sections: [
    { id: 'identifikace', label: 'Identifikace zaměstnance' },
    { id: 'souhrnDataZec/prijmy', label: 'Příjmy' },
    { id: 'souhrnDataZec/prijmy/prispevekZamestnavatele', label: 'Příspěvek zaměstnavatele (z osvobozených příjmů)' },
    { id: 'souhrnDataZec/zalohaNaDan', label: 'Výpočet zálohy na daň' },
    { id: 'souhrnDataZec/zvlastniSazbaDane', label: 'Výpočet daně podle zvláštní sazby daně' },
    { id: 'souhrnDataZec/prohlaseniPoplatnikaDane', label: 'Prohlášení poplatníka daně' },
    { id: 'souhrnDataZec/prohlaseniPoplatnikaDane/zvyhodneniDetiMesic', label: 'Daňové zvýhodnění na děti (měsíc)' },
    { id: 'souhrnDataZec/prohlaseniPoplatnikaDane/zvyhodneniDetiMesic/jineOsoby/jinaOsoba', label: 'Jiná osoba vyživující děti' },
    { id: 'souhrnDataZec/prohlaseniPoplatnikaDane/zvyhodneniDetiMesic/vyzivovaneDeti/vyzivovaneDite', label: 'Vyživované dítě (měsíc)' },
    { id: 'souhrnDataZec/rocniUhrny', label: 'Roční úhrny jednotlivých položek' },
    { id: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani', label: 'Výsledek ročního zúčtování' },
    { id: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/slevaNaPartnera/partner', label: 'Sleva na manželku / manžela' },
    { id: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/zvyhodneniNaDeti', label: 'Daňové zvýhodnění na děti (roční)' },
    { id: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/zvyhodneniNaDeti/jineOsoby/jinaOsoba', label: 'Jiná osoba (roční zúčtování)' },
    { id: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/zvyhodneniNaDeti/vyzivovaneDeti/vyzivovaneDite', label: 'Vyživované dítě (roční zúčtování)' },
    { id: 'souhrnDataZec/mzdaCista', label: 'Čistá mzda' },
    { id: 'souhrnDataZec/mzdaCista/vydelekOZP', label: 'Výdělek osob OZP' },
    { id: 'souhrnDataZec/mzdaCista/srazky', label: 'Srážky ze mzdy' },
    { id: 'souhrnDataZec/zdravPojZamestnavatel', label: 'Zdravotní pojištění za zaměstnavatele' },
    { id: 'souhrnDataZec/zdravPojZamestnanec', label: 'Zdravotní pojištění za zaměstnance' },
    { id: 'pojisteni', label: 'Průběh pojištění' },
    { id: 'pojisteni/trvani', label: 'Trvání pojištění' },
    { id: 'pojisteni/vymerovaciZaklad', label: 'Vyměřovací základ' },
    { id: 'pojisteni/vymerovaciZakladParagraf5', label: 'Vyměřovací základ § 5a' },
    { id: 'pojisteni/eldpSeznam/eldp', label: 'ELDP' },
    { id: 'pojisteni/eldpSeznam/eldp/vylouceneDny', label: 'ELDP - Vyloučené dny' },
    { id: 'pojisteni/eldpSeznam/eldp/odecitaneDny', label: 'ELDP - Odečítané dny' },
    { id: 'pojisteni/pojisteniZamestnanec', label: 'Pojistné za zaměstnance' },
    { id: 'pojisteni/pojisteniZamestnavatel', label: 'Pojistné za zaměstnavatele' },
    { id: 'pojisteni/slevaZamestnance', label: 'Sleva na pojistném zaměstnanců' },
    { id: 'pojisteni/slevaZamestnavatele', label: 'Sleva na pojistném zaměstnavatele' },
    { id: 'pojisteni/slevaZamestnavatele/slevaZamestnavateleRozpad', label: 'Sleva na pojistném zaměstnavatele - rozpad' },
    { id: 'vykonavanaPozice', label: 'Vykonávaná pozice' },
    { id: 'vykonavanaPozice/mistoVykonuPrace', label: 'Místo výkonu práce' },
    { id: 'vykonavanaPozice/docasnePrideleni/uzivatel', label: 'Dočasné přidělení - uživatel' },
    { id: 'vykonavanaPozice/fondPracovniDoby', label: 'Fond pracovní doby' },
    { id: 'prubehZamestnani', label: 'Průběh zaměstnání' },
    { id: 'prubehZamestnani/odpracovaneDny', label: 'Odpracované dny' },
    { id: 'prubehZamestnani/odpracovaneHodiny', label: 'Odpracované hodiny' },
    { id: 'prubehZamestnani/odpracovaneHodiny/rozpad', label: 'Odpracované hodiny - rozpad' },
    { id: 'prubehZamestnani/odpracovaneHodiny/rozpad/hornictvi', label: 'Hlubinné hornictví' },
    { id: 'prubehZamestnani/odpracovaneHodiny/rozpad/riziko', label: 'Riziková práce' },
    { id: 'prubehZamestnani/neodpracovaneHodiny', label: 'Neodpracované hodiny' },
    { id: 'prubehZamestnani/prekazkyVPraci', label: 'Překážky v práci' },
    { id: 'prijem', label: 'Příjem v daném měsíci' },
    { id: 'prijem/dan', label: 'Daň' },
    { id: 'prijem/specifickaSkutecnost', label: 'Specifická právní skutečnost' },
    { id: 'mzda', label: 'Mzda' },
    { id: 'mzda/mzdaRozpad', label: 'Mzda - rozpad' },
    { id: 'mzda/mzdaRozpad/priplatky', label: 'Příplatky' },
    { id: 'mzda/nahrady', label: 'Náhrady' },
    { id: 'mzda/odmeny', label: 'Odměny' },
    { id: 'mzda/vydelek', label: 'Výdělek' },
  ],
  fieldGroups: [
    { id: 'identification', label: 'Identifikace',     query: 'identifikace zamestnance' },
    { id: 'work',           label: 'Práce a pozice',   query: 'vykonavana pozice, prubeh zamestna, prijem v danem' },
    { id: 'insurance',      label: 'Pojištění a ELDP', query: 'trvani pojisteni, vymero, eldp' },
    { id: 'contributions',  label: 'Pojistné',         query: 'pojistne za zamestn, sleva na pojistnem' },
    { id: 'income',         label: 'Příjmy',           query: 'prijmy, cista mzda, zdravotni pojisteni' },
    { id: 'tax',            label: 'Daně',             query: 'zaloha na dan, zvlastni sazba, prohlaseni poplatnika' },
    { id: 'wages',          label: 'Mzda',             query: 'mzda' },
    { id: 'annual',         label: 'Roční zúčtování',  query: 'rocniuhrny' },
  ],
  parseDocumentHeader: function(doc) {
    if (!doc) return [];
    function el(parent, localName) {
      if (!parent) return null;
      for (const c of parent.children) if (c.localName === localName) return c;
      return null;
    }
    function txt(parent, localName) {
      const e = el(parent, localName); return e ? e.textContent.trim() : '';
    }
    const root = doc.documentElement;
    const hlavicka = el(root, 'hlavicka');
    const vendor   = el(root, 'VENDOR');
    const sender   = el(root, 'SENDER');
    const fields = [];
    if (hlavicka) {
      const mesic = txt(hlavicka, 'mesic'), rok = txt(hlavicka, 'rok');
      if (mesic || rok) fields.push({ label: 'Období', value: mesic + '/' + rok });
      const typ = txt(hlavicka, 'typPodani');
      if (typ) fields.push({ label: 'Typ podání', value: typ });
      const vs = txt(hlavicka, 'variabilniSymbol');
      if (vs) fields.push({ label: 'Variabilní symbol', value: vs });
      const dat = txt(hlavicka, 'datumVyplneni');
      if (dat) fields.push({ label: 'Datum vyplnění', value: dat.replace('T', ' ').replace('Z', '') });
      const id = txt(hlavicka, 'idPodani');
      if (id) fields.push({ label: 'ID podání', value: id });
      const bp = txt(hlavicka, 'balikPoradi'), bpc = txt(hlavicka, 'balikyPocet');
      if (bp || bpc) fields.push({ label: 'Balík', value: bp + ' / ' + bpc });
      const fv = txt(hlavicka, 'formularePocetVBaliku'), fc = txt(hlavicka, 'formularePocetCelkem');
      if (fv || fc) fields.push({ label: 'Formulářů v balíku / celkem', value: fv + ' / ' + fc });
    }
    if (vendor) {
      const pn = vendor.getAttribute('productName') || '';
      const pv = vendor.getAttribute('productVersion') || '';
      if (pn || pv) fields.push({ label: 'Software', value: [pn, pv].filter(Boolean).join(' ') });
    }
    if (sender) {
      const vp = sender.getAttribute('VerzeProtokolu') || '';
      if (vp) fields.push({ label: 'Verze protokolu', value: vp });
      const em = sender.getAttribute('EmailNotifikace') || '';
      if (em) fields.push({ label: 'E-mail notifikace', value: em });
      const isds = sender.getAttribute('ISDSreport') || '';
      if (isds) fields.push({ label: 'ISDS report', value: isds });
    }
    const souhrn = el(root, 'souhrn');
    if (souhrn) {
      const mesic = el(souhrn, 'danUdajeMesic');
      if (mesic) {
        const z = txt(mesic, 'danZalohaPoSleve'); if (z) fields.push({ label: 'Záloha na daň (měsíc)', value: z });
        const b = txt(mesic, 'danBonus'); if (b) fields.push({ label: 'Daňový bonus (měsíc)', value: b });
      }
      const rok = el(souhrn, 'danUdajeRok');
      if (rok) {
        const p = txt(rok, 'danPreplatek'); if (p) fields.push({ label: 'Přeplatek na dani (rok)', value: p });
        const d = txt(rok, 'danBonusDoplatek'); if (d) fields.push({ label: 'Doplatek daňového bonusu (rok)', value: d });
      }
    }
    const pvpoj = el(root, 'PVPOJ');
    if (pvpoj) {
      const poj = el(pvpoj, 'pojistne');
      if (poj) {
        const za = txt(poj, 'zakladZamestnavateleA'); if (za) fields.push({ label: 'Základ poj. zaměstnavatele A', value: za });
        const pa = txt(poj, 'pojistneZamestnavateleA'); if (pa) fields.push({ label: 'Pojistné zaměstnavatele A', value: pa });
        const zb = txt(poj, 'zakladZamestnavateleB'); if (zb) fields.push({ label: 'Základ poj. zaměstnavatele B', value: zb });
        const pb = txt(poj, 'pojistneZamestnavateleB'); if (pb) fields.push({ label: 'Pojistné zaměstnavatele B', value: pb });
        const zc = txt(poj, 'zakladZamestnavateleC'); if (zc) fields.push({ label: 'Základ poj. zaměstnavatele C', value: zc });
        const pc = txt(poj, 'pojistneZamestnavateleC'); if (pc) fields.push({ label: 'Pojistné zaměstnavatele C', value: pc });
        const cel = txt(poj, 'pojistneZamestnavateleCelkem'); if (cel) fields.push({ label: 'Pojistné zaměstnavatele celkem', value: cel });
        const zam = txt(poj, 'pojistneZamestnance'); if (zam) fields.push({ label: 'Pojistné zaměstnance', value: zam });
        const tot = txt(poj, 'pojistneCelkem'); if (tot) fields.push({ label: 'Pojistné celkem', value: tot });
      }
      const uh = txt(pvpoj, 'pojistneUhrada'); if (uh) fields.push({ label: 'Pojistné k úhradě', value: uh });
    }
    return fields;
  },
  fields: [
    { section: 'identifikace', element: 'ikMpsv', csszId: '10051', label: 'IK MPSV', type: 'text' },
    { section: 'identifikace', element: 'idPpv', csszId: '10228', label: 'ID pracovněprávního vztahu', type: 'text' },
    { section: 'identifikace', element: 'prijmeni', csszId: '10053', label: 'Příjmení zaměstnance', type: 'text' },
    { section: 'identifikace', element: 'jmeno', csszId: '10054', label: 'Jméno zaměstnance', type: 'text' },
    { section: 'identifikace', element: 'datumNarozeni', csszId: '10056', label: 'Datum narození', type: 'date' },
    { section: 'identifikace', element: 'datumNastupu', csszId: '10223', label: 'Datum nástupu do zaměstnání', type: 'date' },
    { section: 'identifikace', element: 'druhCinnosti', csszId: '10239', label: 'Druh činnosti', type: 'text' },

    { section: 'souhrnDataZec/prijmy', element: 'zuctovanoCelkem', csszId: '10286', label: 'Zúčtovaný příjem celkem', type: 'number' },
    { section: 'souhrnDataZec/prijmy', element: 'osvobozenoCelkem', csszId: '10289', label: 'Osvobozené příjmy celkem', type: 'number' },
    { section: 'souhrnDataZec/prijmy', element: 'odmenyNerezident', csszId: '10416', label: 'Odměny nerezidentů (členů orgánů PO)', type: 'number' },

    { section: 'souhrnDataZec/prijmy/prispevekZamestnavatele', element: 'prispevekZelSporeniOsvob', csszId: '10417', label: 'Příspěvek na spoření na stáří (osvobozený)', type: 'number' },
    { section: 'souhrnDataZec/prijmy/prispevekZamestnavatele', element: 'prispevekZelPojDlPece', csszId: '10418', label: 'Příspěvek na pojištění dlouhodobé péče', type: 'number' },
    { section: 'souhrnDataZec/prijmy/prispevekZamestnavatele', element: 'prispevekPenzPripoj', csszId: '10292', label: 'Příspěvek na penzijní připojištění', type: 'number' },
    { section: 'souhrnDataZec/prijmy/prispevekZamestnavatele', element: 'prispevekDoplnPenzPripoj', csszId: '10293', label: 'Příspěvek na doplňkové penzijní spoření', type: 'number' },
    { section: 'souhrnDataZec/prijmy/prispevekZamestnavatele', element: 'prispevekPenzPoj', csszId: '10294', label: 'Příspěvek na penzijní pojištění', type: 'number' },
    { section: 'souhrnDataZec/prijmy/prispevekZamestnavatele', element: 'prispevekZivotPoj', csszId: '10295', label: 'Příspěvek na soukromé životní pojištění', type: 'number' },
    { section: 'souhrnDataZec/prijmy/prispevekZamestnavatele', element: 'prispevekDip', csszId: '10296', label: 'Příspěvek na dlouhodobý investiční produkt', type: 'number' },

    { section: 'souhrnDataZec/zalohaNaDan', element: 'zakladDane', csszId: '10297', label: 'Základ pro výpočet zálohy na daň', type: 'number' },
    { section: 'souhrnDataZec/zalohaNaDan', element: 'vypoctenaZaloha', csszId: '10298', label: 'Vypočtená záloha na daň', type: 'number' },
    { section: 'souhrnDataZec/zalohaNaDan', element: 'danZalohaPoSleve', csszId: '10305', label: 'Sražená záloha na daň po slevách', type: 'number' },
    { section: 'souhrnDataZec/zalohaNaDan', element: 'danBonus', csszId: '10306', label: 'Měsíční daňový bonus', type: 'number' },

    { section: 'souhrnDataZec/zvlastniSazbaDane', element: 'zakladDane', csszId: '10307', label: 'Základ daně podle zvláštní sazby', type: 'number' },
    { section: 'souhrnDataZec/zvlastniSazbaDane', element: 'srazenaDan', csszId: '10309', label: 'Sražená daň podle zvláštní sazby (měsíc)', type: 'number' },
    { section: 'souhrnDataZec/zvlastniSazbaDane', element: 'odmenaNerezident', csszId: '10308', label: 'Odměna člena (nerezidenta) orgánu PO', type: 'number' },
    { section: 'souhrnDataZec/zvlastniSazbaDane', element: 'srazenaDanNerezident', csszId: '10310', label: 'Sražená daň nerezidenta člena orgánu PO', type: 'number' },

    { section: 'souhrnDataZec', element: 'prohlaseniPoplatnika', csszId: '10419', label: 'Prohlášení poplatníka daně', type: 'boolean' },

    { section: 'souhrnDataZec/prohlaseniPoplatnikaDane', element: 'zakladniSleva', csszId: '10299', label: 'Základní sleva na poplatníka', type: 'number' },
    { section: 'souhrnDataZec/prohlaseniPoplatnikaDane', element: 'zakladniSlevaInvalidita12', csszId: '10300', label: 'Sleva na invaliditu I./II. stupně', type: 'number' },
    { section: 'souhrnDataZec/prohlaseniPoplatnikaDane', element: 'rozsirenaSlevaInvalidita3', csszId: '10301', label: 'Sleva na invaliditu III. stupně', type: 'number' },
    { section: 'souhrnDataZec/prohlaseniPoplatnikaDane', element: 'slevaZTPP', csszId: '10302', label: 'Sleva na držitele ZTP/P', type: 'number' },
    { section: 'souhrnDataZec/prohlaseniPoplatnikaDane', element: 'danoveZvyhodneniDetiMesic', csszId: '10303', label: 'Měsíční daňové zvýhodnění na děti', type: 'number' },
    { section: 'souhrnDataZec/prohlaseniPoplatnikaDane', element: 'slevaDite', csszId: '10304', label: 'Měsíční sleva na děti', type: 'number' },

    { section: 'souhrnDataZec/prohlaseniPoplatnikaDane/zvyhodneniDetiMesic', element: 'vyzivujeJinaOsoba', csszId: '10453', label: 'Vyživuje děti i jiná osoba', type: 'boolean' },

    { section: 'souhrnDataZec/prohlaseniPoplatnikaDane/zvyhodneniDetiMesic/jineOsoby/jinaOsoba', element: 'jmeno', csszId: '10431', label: 'Jméno jiné osoby', type: 'text' },
    { section: 'souhrnDataZec/prohlaseniPoplatnikaDane/zvyhodneniDetiMesic/jineOsoby/jinaOsoba', element: 'prijmeni', csszId: '10432', label: 'Příjmení jiné osoby', type: 'text' },
    { section: 'souhrnDataZec/prohlaseniPoplatnikaDane/zvyhodneniDetiMesic/jineOsoby/jinaOsoba', element: 'datumNarozeni', csszId: '10433', label: 'Datum narození jiné osoby', type: 'date' },
    { section: 'souhrnDataZec/prohlaseniPoplatnikaDane/zvyhodneniDetiMesic/jineOsoby/jinaOsoba', element: 'rodneCislo', csszId: '10434', label: 'Rodné číslo jiné osoby', type: 'text' },

    { section: 'souhrnDataZec/prohlaseniPoplatnikaDane/zvyhodneniDetiMesic/vyzivovaneDeti/vyzivovaneDite', element: 'dite/jmeno', csszId: '10435', label: 'Jméno dítěte', type: 'text' },
    { section: 'souhrnDataZec/prohlaseniPoplatnikaDane/zvyhodneniDetiMesic/vyzivovaneDeti/vyzivovaneDite', element: 'dite/prijmeni', csszId: '10436', label: 'Příjmení dítěte', type: 'text' },
    { section: 'souhrnDataZec/prohlaseniPoplatnikaDane/zvyhodneniDetiMesic/vyzivovaneDeti/vyzivovaneDite', element: 'dite/datumNarozeni', csszId: '10437', label: 'Datum narození dítěte', type: 'date' },
    { section: 'souhrnDataZec/prohlaseniPoplatnikaDane/zvyhodneniDetiMesic/vyzivovaneDeti/vyzivovaneDite', element: 'dite/rodneCislo', csszId: '10438', label: 'Rodné číslo dítěte', type: 'text' },
    { section: 'souhrnDataZec/prohlaseniPoplatnikaDane/zvyhodneniDetiMesic/vyzivovaneDeti/vyzivovaneDite', element: 'prukazZtpp', csszId: '10439', label: 'Držitel průkazu ZTP/P', type: 'boolean' },
    { section: 'souhrnDataZec/prohlaseniPoplatnikaDane/zvyhodneniDetiMesic/vyzivovaneDeti/vyzivovaneDite', element: 'poradi', csszId: '10440', label: 'Pořadí dítěte (1/2/3/N)', type: 'text' },

    { section: 'souhrnDataZec/mzdaCista', element: 'mzdaCista', csszId: '10344', label: 'Čistý příjem', type: 'number' },
    { section: 'souhrnDataZec/mzdaCista', element: 'srazkyZeMzdyEvidovany', csszId: '10116', label: 'Evidovány srážky ze mzdy', type: 'boolean' },

    { section: 'souhrnDataZec/mzdaCista/vydelekOZP', element: 'mzdaOzpUhradaDatum', csszId: '10347', label: 'Datum úhrady mzdy OZP', type: 'date' },
    { section: 'souhrnDataZec/mzdaCista/vydelekOZP', element: 'mzdaOzpHotovost', csszId: '10348', label: 'Mzda vyplacena v hotovosti', type: 'boolean' },
    { section: 'souhrnDataZec/mzdaCista/vydelekOZP', element: 'mzdaOzpSrazka', csszId: '10349', label: 'Provedeny srážky ze mzdy OZP', type: 'boolean' },

    { section: 'souhrnDataZec/mzdaCista/srazky', element: 'srazkaPlneniZel', csszId: '10350', label: 'Srážky k uspokojení plnění zaměstnavatele', type: 'number' },
    { section: 'souhrnDataZec/mzdaCista/srazky', element: 'srazkaSkodaZec', csszId: '10351', label: 'Srážky k uhrazení škody zaměstnance', type: 'number' },
    { section: 'souhrnDataZec/mzdaCista/srazky', element: 'srazkaStrava', csszId: '10352', label: 'Srážky na závodní stravování', type: 'number' },
    { section: 'souhrnDataZec/mzdaCista/srazky', element: 'srazkaZavazkyZec', csszId: '10353', label: 'Srážky k uspokojení závazků zaměstnance', type: 'number' },

    { section: 'souhrnDataZec/zdravPojZamestnavatel', element: 'zdravotniPojisteni', csszId: '10482', label: 'Zdravotní pojištění za zaměstnavatele', type: 'number' },
    { section: 'souhrnDataZec/zdravPojZamestnanec', element: 'zdravotniPojisteni', csszId: '10371', label: 'Zdravotní pojištění za zaměstnance', type: 'number' },

    { section: 'pojisteni/trvani', element: 'pojisteniOd', csszId: '10354', label: 'Pojištění od', type: 'date' },
    { section: 'pojisteni/trvani', element: 'pojisteniDo', csszId: '10355', label: 'Pojištění do', type: 'date' },

    { section: 'pojisteni/vymerovaciZaklad', element: 'castkaOdvodPojistneho', csszId: '10477', label: 'Vyměřovací základ - odvod pojistného', type: 'number' },
    { section: 'pojisteni/vymerovaciZaklad', element: 'prijemNepojistenaCinnost', csszId: '10476', label: 'Příjem z nepojištěné činnosti', type: 'number' },

    { section: 'pojisteni/vymerovaciZakladParagraf5', element: 'pismenoA', csszId: '10478', label: 'VZ § 5a odst. 1 písm. a)', type: 'number' },
    { section: 'pojisteni/vymerovaciZakladParagraf5', element: 'pismenoB', csszId: '10479', label: 'VZ § 5a odst. 1 písm. b)', type: 'number' },
    { section: 'pojisteni/vymerovaciZakladParagraf5', element: 'pismenoC', csszId: '10480', label: 'VZ § 5a odst. 1 písm. c)', type: 'number' },

    { section: 'pojisteni/eldpSeznam/eldp', element: 'kod', csszId: '10240', label: 'Kód ELDP', type: 'text' },
    { section: 'pojisteni/eldpSeznam/eldp', element: 'platnostOd', csszId: '10241', label: 'Platnost kódu od', type: 'date' },
    { section: 'pojisteni/eldpSeznam/eldp', element: 'platnostDo', csszId: '10242', label: 'Platnost kódu do', type: 'date' },
    { section: 'pojisteni/eldpSeznam/eldp', element: 'pocetDnu', csszId: '10356', label: 'Počet kalendářních dnů pojištění', type: 'number' },
    { section: 'pojisteni/eldpSeznam/eldp', element: 'vymerovaciZaklad', csszId: '10245', label: 'Vyměřovací základ ELDP', type: 'number' },

    { section: 'pojisteni/eldpSeznam/eldp/vylouceneDny', element: 'vylouceneDobyCelkem', csszId: '10357', label: 'Vyloučené doby celkem', type: 'number' },
    { section: 'pojisteni/eldpSeznam/eldp/vylouceneDny', element: 'docasNeschopnost', csszId: '10358', label: 'Dočasná pracovní neschopnost', type: 'number' },
    { section: 'pojisteni/eldpSeznam/eldp/vylouceneDny', element: 'penezitaPomocMaterstvi', csszId: '10359', label: 'Peněžitá pomoc v mateřství', type: 'number' },
    { section: 'pojisteni/eldpSeznam/eldp/vylouceneDny', element: 'osetrovaniClenaRodiny', csszId: '10360', label: 'Ošetřování člena rodiny', type: 'number' },
    { section: 'pojisteni/eldpSeznam/eldp/vylouceneDny', element: 'otcovska', csszId: '10362', label: 'Otcovská', type: 'number' },
    { section: 'pojisteni/eldpSeznam/eldp/vylouceneDny', element: 'vyloucenePar16', csszId: '10536', label: 'Vyloučené dny § 16 odst. 4 písm. j)', type: 'number' },
    { section: 'pojisteni/eldpSeznam/eldp/vylouceneDny', element: 'vyloucenePar18', csszId: '10366', label: 'Vyloučené dny § 18 odst. 7', type: 'number' },
    { section: 'pojisteni/eldpSeznam/eldp/vylouceneDny', element: 'omluvenaNepritomnost', csszId: '10473', label: 'Omluvená nepřítomnost (neplacené volno)', type: 'number' },
    { section: 'pojisteni/eldpSeznam/eldp/vylouceneDny', element: 'pracovniNeschopnost', csszId: '10474', label: 'Pracovní neschopnost s náhradou příjmu', type: 'number' },
    { section: 'pojisteni/eldpSeznam/eldp/vylouceneDny', element: 'vyplaceniDavek', csszId: '10475', label: 'Vyplácení dávek nemocenského pojištění', type: 'number' },

    { section: 'pojisteni/eldpSeznam/eldp/odecitaneDny', element: 'odecitaneDobyCelkem', csszId: '10375', label: 'Odečítané doby celkem', type: 'number' },
    { section: 'pojisteni/eldpSeznam/eldp/odecitaneDny', element: 'pracovniNeschopnost', csszId: '10462', label: 'Pracovní neschopnost (karanténa)', type: 'number' },
    { section: 'pojisteni/eldpSeznam/eldp/odecitaneDny', element: 'materstvi', csszId: '10463', label: 'Peněžitá pomoc v mateřství', type: 'number' },
    { section: 'pojisteni/eldpSeznam/eldp/odecitaneDny', element: 'osetrovaniSNarokem', csszId: '10464', label: 'Ošetřování s nárokem na ošetřovné', type: 'number' },
    { section: 'pojisteni/eldpSeznam/eldp/odecitaneDny', element: 'osetrovaniBezNaroku', csszId: '10465', label: 'Ošetřování bez nároku na ošetřovné', type: 'number' },
    { section: 'pojisteni/eldpSeznam/eldp/odecitaneDny', element: 'otcovska', csszId: '10466', label: 'Otcovská', type: 'number' },
    { section: 'pojisteni/eldpSeznam/eldp/odecitaneDny', element: 'neplaceneVolno', csszId: '10468', label: 'Neplacené volno', type: 'number' },
    { section: 'pojisteni/eldpSeznam/eldp/odecitaneDny', element: 'neomluveneAbsence', csszId: '10469', label: 'Neomluvená absence', type: 'number' },

    { section: 'pojisteni/pojisteniZamestnanec', element: 'socialniPojisteni', csszId: '10370', label: 'Sociální pojištění za zaměstnance', type: 'number' },
    { section: 'pojisteni/pojisteniZamestnavatel', element: 'socialniPojisteni', csszId: '10481', label: 'Sociální pojištění za zaměstnavatele', type: 'number' },

    { section: 'pojisteni/slevaZamestnance', element: 'slevaZamestnanceEvidovana', csszId: '10490', label: 'Sleva na pojistném pracující důchodci', type: 'boolean' },
    { section: 'pojisteni/slevaZamestnance', element: 'slevaZamestnance/vyseSlevy', csszId: '10491', label: 'Výše slevy pracující důchodci', type: 'number' },
    { section: 'pojisteni/slevaZamestnance', element: 'slevaZamestnanceOvoZelEvidovana', csszId: '10546', label: 'Sleva na pojistném ovocnářství/zeleniny', type: 'boolean' },
    { section: 'pojisteni/slevaZamestnance', element: 'slevaZamestnanceOvoZel/vyseSlevy', csszId: '10547', label: 'Výše slevy ovocnářství/zeleniny', type: 'number' },

    { section: 'pojisteni/slevaZamestnavatele', element: 'slevaZamestnavateleEvidovana', csszId: '10372', label: 'Sleva na pojistném zaměstnavatele', type: 'boolean' },
    { section: 'pojisteni/slevaZamestnavatele/slevaZamestnavateleRozpad', element: 'pracovniDobaKratsi', csszId: '10373', label: 'Rozsah kratší pracovní doby', type: 'number' },
    { section: 'pojisteni/slevaZamestnavatele/slevaZamestnavateleRozpad', element: 'duvodUplatneni', csszId: '10374', label: 'Důvod uplatnění slevy', type: 'text' },

    { section: 'vykonavanaPozice/mistoVykonuPrace', element: 'obec', csszId: '10229', label: 'Obec', type: 'text' },
    { section: 'vykonavanaPozice/mistoVykonuPrace', element: 'kodObce', csszId: '10230', label: 'Kód obce', type: 'text' },
    { section: 'vykonavanaPozice/mistoVykonuPrace', element: 'kodStatu', csszId: '10231', label: 'Kód státu', type: 'text' },
    { section: 'vykonavanaPozice', element: 'uplatnujiPrispevekApz', csszId: '10232', label: 'Mzdový příspěvek APZ', type: 'boolean' },
    { section: 'vykonavanaPozice', element: 'nastrojApzKod', csszId: '10233', label: 'Nástroj APZ (kód)', type: 'text' },
    { section: 'vykonavanaPozice', element: 'funkcniPozitky', csszId: '10247', label: 'Funkční požitky § 6 odst. 10 ZDP', type: 'boolean' },
    { section: 'vykonavanaPozice', element: 'docasnePrideleniEvidovano', csszId: '10251', label: 'Dočasné přidělení evidováno', type: 'boolean' },

    { section: 'vykonavanaPozice/docasnePrideleni/uzivatel', element: 'ico', csszId: '10252', label: 'IČO uživatele', type: 'text' },
    { section: 'vykonavanaPozice/docasnePrideleni/uzivatel', element: 'rodneCislo', csszId: '10457', label: 'Rodné číslo uživatele', type: 'text' },
    { section: 'vykonavanaPozice/docasnePrideleni/uzivatel', element: 'zahranicniOsoba/kodStatu', csszId: '10492', label: 'Kód státu zahraniční osoby', type: 'text' },
    { section: 'vykonavanaPozice/docasnePrideleni/uzivatel', element: 'zahranicniOsoba/identifikace', csszId: '10493', label: 'Registrační číslo zahraniční osoby', type: 'text' },
    { section: 'vykonavanaPozice/docasnePrideleni/uzivatel', element: 'zahranicniOsoba/nazev', csszId: '10494', label: 'Název zahraniční osoby', type: 'text' },

    { section: 'vykonavanaPozice/fondPracovniDoby', element: 'stanovenyFond', csszId: '10259', label: 'Stanovený fond pracovní doby (h/měs)', type: 'number' },
    { section: 'vykonavanaPozice/fondPracovniDoby', element: 'sjednanyFond', csszId: '10260', label: 'Sjednaný fond pracovní doby (h/měs)', type: 'number' },
    { section: 'vykonavanaPozice/fondPracovniDoby', element: 'stanovenaTydenniDoba', csszId: '10261', label: 'Stanovená týdenní pracovní doba', type: 'number' },

    { section: 'prubehZamestnani/odpracovaneDny', element: 'dnyEvidencniStav', csszId: '10265', label: 'Počet dní v evidenčním stavu', type: 'number' },
    { section: 'prubehZamestnani/odpracovaneDny', element: 'dnyOdpracovanePocet', csszId: '10267', label: 'Počet odpracovaných dnů', type: 'number' },

    { section: 'prubehZamestnani/odpracovaneHodiny', element: 'pocet', csszId: '10268', label: 'Počet odpracovaných hodin', type: 'number' },
    { section: 'prubehZamestnani/odpracovaneHodiny/rozpad', element: 'prescas', csszId: '10269', label: 'Přesčasové hodiny', type: 'number' },

    { section: 'prubehZamestnani/odpracovaneHodiny/rozpad/hornictvi', element: 'smenyUran', csszId: '10270', label: 'Směny hlubinné hornictví - uran', type: 'number' },
    { section: 'prubehZamestnani/odpracovaneHodiny/rozpad/hornictvi', element: 'smenyOstatni', csszId: '10271', label: 'Směny hlubinné hornictví - ostatní', type: 'number' },
    { section: 'prubehZamestnani/odpracovaneHodiny/rozpad/hornictvi', element: 'expoziceNpeDosazeniDatum', csszId: '10272', label: 'Datum dosažení expozice NPE', type: 'date' },

    { section: 'prubehZamestnani/odpracovaneHodiny/rozpad/riziko', element: 'hodinyOdpracovanePocet', csszId: '10273', label: 'Odpracované hodiny rizikové práce', type: 'number' },
    { section: 'prubehZamestnani/odpracovaneHodiny/rozpad/riziko', element: 'kategorizaceRizika', csszId: '10274', label: 'Kategorizace rizika', type: 'text' },

    { section: 'prubehZamestnani/neodpracovaneHodiny', element: 'hodinyNeodpracCelkem', csszId: '10275', label: 'Neodpracované hodiny celkem', type: 'number' },
    { section: 'prubehZamestnani/neodpracovaneHodiny', element: 'hodinyNeodpracNahrada', csszId: '10276', label: 'Neodpracované hodiny s náhradou', type: 'number' },
    { section: 'prubehZamestnani/neodpracovaneHodiny', element: 'hodinyNeodpracBezNahrady', csszId: '10277', label: 'Neodpracované hodiny DPN bez náhrady', type: 'number' },
    { section: 'prubehZamestnani/neodpracovaneHodiny', element: 'hodinyNeodpracNeschop', csszId: '10278', label: 'Neodpracované hodiny DPN s náhradou', type: 'number' },
    { section: 'prubehZamestnani/neodpracovaneHodiny', element: 'hodinyNeodpracDovol', csszId: '10279', label: 'Neodpracované hodiny dovolená', type: 'number' },
    { section: 'prubehZamestnani/neodpracovaneHodiny', element: 'hodinyNeodpracOcr', csszId: '10280', label: 'Neodpracované hodiny OČR', type: 'number' },

    { section: 'prubehZamestnani/prekazkyVPraci', element: 'prekazkaZamestnanec', csszId: '10471', label: 'Překážky v práci - zaměstnanec', type: 'number' },
    { section: 'prubehZamestnani/prekazkyVPraci', element: 'prekazkaZamestnavatel', csszId: '10472', label: 'Překážky v práci - zaměstnavatel', type: 'number' },

    { section: 'prijem/dan', element: 'zakladDane', csszId: '10535', label: 'Základ pro výpočet daně', type: 'number' },
    { section: 'prijem/specifickaSkutecnost', element: 'vyplatniTermin', csszId: '10410', label: 'Výplatní termín při specifické skutečnosti', type: 'date' },

    { section: 'mzda', element: 'mzdaZuctovana', csszId: '10328', label: 'Mzda zúčtovaná', type: 'number' },
    { section: 'mzda/mzdaRozpad', element: 'tarif', csszId: '10329', label: 'Tarifní mzdy', type: 'number' },
    { section: 'mzda/mzdaRozpad', element: 'odmenyPravidelne', csszId: '10330', label: 'Prémie a odměny pravidelné', type: 'number' },
    { section: 'mzda/mzdaRozpad', element: 'odmenyNepravidelne', csszId: '10331', label: 'Prémie a odměny nepravidelné', type: 'number' },

    { section: 'mzda/mzdaRozpad/priplatky', element: 'celkem', csszId: '10332', label: 'Příplatky celkem', type: 'number' },
    { section: 'mzda/mzdaRozpad/priplatky', element: 'prescas', csszId: '10333', label: 'Příplatky za přesčas', type: 'number' },
    { section: 'mzda/mzdaRozpad/priplatky', element: 'nocni', csszId: '10334', label: 'Příplatky za noční práci', type: 'number' },
    { section: 'mzda/mzdaRozpad/priplatky', element: 'sobotaNedele', csszId: '10335', label: 'Příplatky za soboty a neděle', type: 'number' },
    { section: 'mzda/mzdaRozpad/priplatky', element: 'svatek', csszId: '10336', label: 'Příplatky za svátek', type: 'number' },

    { section: 'mzda/nahrady', element: 'mzdyZuctovane', csszId: '10337', label: 'Náhrady mzdy zúčtované', type: 'number' },
    { section: 'mzda/nahrady', element: 'dovolena', csszId: '10338', label: 'Náhrady za dovolenou', type: 'number' },
    { section: 'mzda/nahrady', element: 'svatky', csszId: '10339', label: 'Náhrady za svátky', type: 'number' },
    { section: 'mzda/nahrady', element: 'prekazkyZamestnavatel', csszId: '10340', label: 'Náhrady - překážky zaměstnavatele', type: 'number' },
    { section: 'mzda/nahrady', element: 'prekazkyZamestnanec', csszId: '10341', label: 'Náhrady - překážky zaměstnance', type: 'number' },
    { section: 'mzda/nahrady', element: 'docasnaNeschopnost', csszId: '10342', label: 'Náhrady při DPN', type: 'number' },

    { section: 'mzda/odmeny', element: 'pohotovost', csszId: '10343', label: 'Odměny za pracovní pohotovost', type: 'number' },

    { section: 'mzda/vydelek', element: 'vydelekPrumernyHod', csszId: '10345', label: 'Průměrný hodinový výdělek', type: 'number' },

    { section: 'souhrnDataZec/rocniUhrny', element: 'prijemSrazkDanZvlSazba', csszId: '10311', label: 'Příjmy podléhající srážkové dani (rok)', type: 'number' },
    { section: 'souhrnDataZec/rocniUhrny', element: 'danSrazenaZvlSazba', csszId: '10312', label: 'Sražená daň zvláštní sazby (rok)', type: 'number' },
    { section: 'souhrnDataZec/rocniUhrny', element: 'prijemZdanitelnyCelkem', csszId: '10313', label: 'Zdanitelné příjmy celkem (rok)', type: 'number' },
    { section: 'souhrnDataZec/rocniUhrny', element: 'prijemZdanitelnyDoplatek', csszId: '10316', label: 'Doplatky příjmů z minulých období (rok)', type: 'number' },
    { section: 'souhrnDataZec/rocniUhrny', element: 'zalohaPrijmy', csszId: '10317', label: 'Sražená záloha na daň z příjmů (rok)', type: 'number' },
    { section: 'souhrnDataZec/rocniUhrny', element: 'zalohaDoplatky', csszId: '10318', label: 'Sražená záloha na daň z doplatků (rok)', type: 'number' },
    { section: 'souhrnDataZec/rocniUhrny', element: 'rocniZuctovaniZadost', csszId: '10319', label: 'Požádáno o roční zúčtování', type: 'boolean' },
    { section: 'souhrnDataZec/rocniUhrny', element: 'rocniZuctovaniProvedeno', csszId: '10320', label: 'Roční zúčtování provedeno', type: 'boolean' },

    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani', element: 'preplatekRok', csszId: '10321', label: 'Přeplatek/nedoplatek z ročního zúčtování', type: 'number' },
    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani', element: 'danPreplatekRok', csszId: '10322', label: 'Přeplatek/nedoplatek na dani', type: 'number' },
    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani', element: 'danBonusPreplatekRok', csszId: '10323', label: 'Doplatek/přeplatek daňového bonusu', type: 'number' },
    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani', element: 'uplatnenaSlevaNaPartnera', csszId: '10420', label: 'Uplatněna sleva na manželku/manžela', type: 'boolean' },
    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani', element: 'uplatnenoZvyhodneniNaDeti', csszId: '10454', label: 'Uplatněno daňové zvýhodnění na děti', type: 'boolean' },

    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/slevaNaPartnera/partner', element: 'partnerUdaje/jmeno', csszId: '10421', label: 'Jméno partnera', type: 'text' },
    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/slevaNaPartnera/partner', element: 'partnerUdaje/prijmeni', csszId: '10422', label: 'Příjmení partnera', type: 'text' },
    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/slevaNaPartnera/partner', element: 'partnerUdaje/rodneCislo', csszId: '10423', label: 'Rodné číslo partnera', type: 'text' },
    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/slevaNaPartnera/partner', element: 'partnerUdaje/datumNarozeni', csszId: '10424', label: 'Datum narození partnera', type: 'date' },
    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/slevaNaPartnera/partner', element: 'prukazZtpp', csszId: '10425', label: 'Partner držitel ZTP/P', type: 'boolean' },
    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/slevaNaPartnera/partner', element: 'slevaPocetMesicu', csszId: '10426', label: 'Počet měsíců uplatnění slevy', type: 'number' },
    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/slevaNaPartnera/partner', element: 'slevaPocetMesicuZtpp', csszId: '10430', label: 'Počet měsíců ZTP/P', type: 'number' },
    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/slevaNaPartnera/partner', element: 'deti/dite/jmeno', csszId: '10539', label: 'Jméno dítěte partnera', type: 'text' },
    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/slevaNaPartnera/partner', element: 'deti/dite/prijmeni', csszId: '10540', label: 'Příjmení dítěte partnera', type: 'text' },
    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/slevaNaPartnera/partner', element: 'deti/dite/datumNarozeni', csszId: '10541', label: 'Datum narození dítěte partnera', type: 'date' },
    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/slevaNaPartnera/partner', element: 'deti/dite/rodneCislo', csszId: '10542', label: 'Rodné číslo dítěte partnera', type: 'text' },

    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/zvyhodneniNaDeti', element: 'vyzivujeJinaOsoba', csszId: '10455', label: 'Vyživuje děti i jiná osoba (roční)', type: 'boolean' },

    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/zvyhodneniNaDeti/jineOsoby/jinaOsoba', element: 'osoba/jmeno', csszId: '10441', label: 'Jméno jiné osoby', type: 'text' },
    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/zvyhodneniNaDeti/jineOsoby/jinaOsoba', element: 'osoba/prijmeni', csszId: '10442', label: 'Příjmení jiné osoby', type: 'text' },
    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/zvyhodneniNaDeti/jineOsoby/jinaOsoba', element: 'osoba/datumNarozeni', csszId: '10443', label: 'Datum narození jiné osoby', type: 'date' },
    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/zvyhodneniNaDeti/jineOsoby/jinaOsoba', element: 'osoba/rodneCislo', csszId: '10444', label: 'Rodné číslo jiné osoby', type: 'text' },
    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/zvyhodneniNaDeti/jineOsoby/jinaOsoba', element: 'mesiceVyzivovani', csszId: '10445', label: 'Měsíce vyživování (12 znaků A/N)', type: 'text' },

    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/zvyhodneniNaDeti/vyzivovaneDeti/vyzivovaneDite', element: 'dite/jmeno', csszId: '10446', label: 'Jméno dítěte', type: 'text' },
    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/zvyhodneniNaDeti/vyzivovaneDeti/vyzivovaneDite', element: 'dite/prijmeni', csszId: '10447', label: 'Příjmení dítěte', type: 'text' },
    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/zvyhodneniNaDeti/vyzivovaneDeti/vyzivovaneDite', element: 'dite/datumNarozeni', csszId: '10448', label: 'Datum narození dítěte', type: 'date' },
    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/zvyhodneniNaDeti/vyzivovaneDeti/vyzivovaneDite', element: 'dite/rodneCislo', csszId: '10449', label: 'Rodné číslo dítěte', type: 'text' },
    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/zvyhodneniNaDeti/vyzivovaneDeti/vyzivovaneDite', element: 'prukazZtpp', csszId: '10450', label: 'ZTP/P (12 znaků A/N)', type: 'text' },
    { section: 'souhrnDataZec/rocniUhrny/vysledekRocnihoZuctovani/zvyhodneniNaDeti/vyzivovaneDeti/vyzivovaneDite', element: 'poradi', csszId: '10451', label: 'Pořadí (12 znaků 1-3/N)', type: 'text' },
  ],
  actionLabels: null,
  actionSections: null,
  fieldRules: null,
  foreignKeywords: null,
  getRowLabel: function(fields) { return fields['identifikace/idPpv']?.value || '?'; },
  rowColumnLabel: 'ID PPV',
  getRowInfo: [
    { key: 'identifikace/ikMpsv', label: 'IK MPSV' },
    { key: 'identifikace/idPpv', label: 'ID PPV' }
  ],
  stats: {
    employer: null,
    date: null,
    citizenship: null,
    action: null,
    partialAccept: false
  },
  formVariants: ['bezPriznaku', 'odlozenyPrijem', 'pestoun', 'cinnostKS', 'vezen', 'mezinarodniPronajemSily', 'jinyPrijem', 'ozpTpp'],
  resolveSection: function(formRoot, sec) {
    const parts = sec.id.split('/');
    let el = formRoot;
    for (const part of parts) {
      if (!el) return null;
      el = getChildByLocalNameNS(el, part, 'http://schemas.cssz.cz/JMHZ/form/1.0') || getChildByLocalName(el, part);
    }
    return el;
  },
  headerFields: [],
  readField: function(targetEl, field) {
    if (!targetEl) return '';
    const elName = field.element || field.attr;
    const parts = elName.split('/');
    let el = targetEl;
    for (const part of parts) {
      el = getChildByLocalName(el, part);
      if (!el) return '';
    }
    return el.textContent || '';
  },
  writeField: function(fieldRef, value) {
    const elName = fieldRef._field?.element || fieldRef._field?.attr || fieldRef.attr;
    const parts = elName.split('/');
    let el = fieldRef.el;
    for (const part of parts) {
      el = getChildByLocalName(el, part);
      if (!el) return;
    }
    el.textContent = value;
  },
  fieldAttrKey: function(field) { return field.element || field.attr; },
  fieldXpath: function(field) { return field.section + '/' + (field.element || field.attr); },
  determineRowType: function() { return null; },
  rowElementPattern: /<[a-zA-Z]*:?formularOsoby[\s>]/,
};
