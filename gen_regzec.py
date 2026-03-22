import random

random.seed(42)

male_first = ["Jan","Petr","Pavel","Martin","Tom\u00e1\u0161","Ji\u0159\u00ed","Jaroslav","Zden\u011bk","Josef","Miroslav",
    "Franti\u0161ek","David","Karel","Luk\u00e1\u0161","Michal","Ond\u0159ej","Jakub","Milan","Vladim\u00edr","Radek",
    "Stanislav","Roman","Marek","Daniel","Filip","Adam","Ale\u0161","Vojt\u011bch","Robert","V\u00e1clav"]
female_first = ["Jana","Eva","Marie","Anna","Hana","Lucie","Kate\u0159ina","V\u011bra","Petra","Lenka",
    "Mark\u00e9ta","Martina","Tereza","Barbora","Ivana","Monika","Alena","Zuzana","Michaela","Krist\u00fdna",
    "Simona","Veronika","Kl\u00e1ra","Gabriela","Daniela","Nikola","Eli\u0161ka","Dominika","Ad\u00e9la","Ren\u00e1ta"]
surnames_m = ["Nov\u00e1k","Svoboda","Novotn\u00fd","Dvo\u0159\u00e1k","\u010cern\u00fd","Proch\u00e1zka","Ku\u010dera","Vesel\u00fd","Hor\u00e1k",
    "N\u011bmec","Pokorn\u00fd","Marek","Posp\u00ed\u0161il","H\u00e1jek","Jel\u00ednek","Kr\u00e1l","R\u016f\u017ei\u010dka","Bene\u0161","Fiala",
    "Sedl\u00e1\u010dek","Dole\u017eal","Zeman","Kol\u00e1\u0159","Navr\u00e1til","\u010cerm\u00e1k","Urban","Van\u011bk","Bla\u017eek","K\u0159\u00ed\u017e",
    "Kopeck\u00fd","\u0160\u0165astn\u00fd","Mal\u00fd","Kadlec","Barto\u0161","Vl\u010dek"]
surnames_f = ["Nov\u00e1kov\u00e1","Svobodov\u00e1","Novotn\u00e1","Dvo\u0159\u00e1kov\u00e1","\u010cern\u00e1","Proch\u00e1zkov\u00e1","Ku\u010derov\u00e1","Vesel\u00e1",
    "Hor\u00e1kov\u00e1","N\u011bmcov\u00e1","Pokorn\u00e1","Markov\u00e1","Posp\u00ed\u0161ilov\u00e1","H\u00e1jkov\u00e1","Jel\u00ednkov\u00e1","Kr\u00e1lov\u00e1",
    "R\u016f\u017ei\u010dkov\u00e1","Bene\u0161ov\u00e1","Fialov\u00e1","Sedl\u00e1\u010dkov\u00e1","Dole\u017ealov\u00e1","Zemanov\u00e1","Kol\u00e1\u0159ov\u00e1","Navr\u00e1tilov\u00e1",
    "\u010cerm\u00e1kov\u00e1","Urbanov\u00e1","Va\u0148kov\u00e1","Bla\u017ekov\u00e1","K\u0159\u00ed\u017eov\u00e1","Kopeck\u00e1","\u0160\u0165astn\u00e1","Mal\u00e1","Kadlecov\u00e1",
    "Barto\u0161ov\u00e1","Vl\u010dkov\u00e1"]

cities_cz = ["Praha","Brno","Ostrava","Plzen","Liberec","Olomouc","Ceske Budejovice","Hradec Kralove",
    "Usti nad Labem","Pardubice","Zlin","Havirov","Kladno","Most","Opava","Frydek-Mistek",
    "Karvina","Jihlava","Teplice","Decin","Karlovy Vary","Chomutov","Prerov","Mlada Boleslav",
    "Prostejov","Trebic","Ceska Lipa","Trinec","Tabor","Znojmo"]

streets = ["Husova","Skolni","Nadrazni","Jiraskova","Dlouha","Polni","Masarykova","Komenskeho",
    "Tyrsova","Riegrova","Palackeho","Sokolska","Zahradni","Lesni","Lucni","Kratka","Siroka",
    "Prazska","Brnenska","Kvetinova","Sportovni","Tovarni","U Parku","Lidicka","Smetanova"]

prof_codes = ["33133","51201","72231","24112","31131","41101","26111","21413","25121","33393",
    "43111","52201","71111","72113","74110","81312","83221","91120","93291","13129",
    "21120","23102","24131","25190","26413","31119","33119","35111","41102","42210"]

positions = ["programator","technik","ucetni","asistent","analytik","spravce","operator",
    "koordinator","specialista","manazer","konstrukter","logistik","mechanik","ekonom",
    "obchodnik","referent","kontrolor","dispecer","mistr","vedouci"]

zp_codes = ["111","201","207","209","211","213","217","222","228"]
zp_weights = [35, 15, 8, 20, 10, 5, 3, 2, 2]

foreign_countries = ["SK","PL","DE","UA","RO","VN","BG","HU","RU","GB","FR","IT","RS","MD","BY"]
foreign_cities = {"SK":"Bratislava","PL":"Warszawa","DE":"Berlin","UA":"Kyiv","RO":"Bucuresti",
    "VN":"Hanoi","BG":"Sofia","HU":"Budapest","RU":"Moskva","GB":"London","FR":"Paris",
    "IT":"Roma","RS":"Beograd","MD":"Chisinau","BY":"Minsk"}

edu_levels = ["N","H","M","R","T","V"]
edu_weights_cz = [20,25,30,10,10,5]
edu_weights_for = [10,20,20,15,15,20]

municodes = ["554782","554791","554804","554821","554847","554861","554898","554936","554979","555088"]

workmode_vals = ["1","2","3"]
relat_vals = ["1111","1121","1131","2111","2121"]
rel_detail_vals = ["1","2","3"]

def gen_bno(birth_year, birth_month, birth_day, is_female):
    yy = birth_year % 100
    mm = birth_month + (50 if is_female else 0)
    base = f"{yy:02d}{mm:02d}{birth_day:02d}"
    suffix = random.randint(1000, 9999)
    return base + str(suffix)

def gen_ikmpsv():
    return str(random.randint(1700000000, 1709999999))

def gen_contract_date():
    m = random.randint(1, 3)
    d = random.randint(1, 28)
    return f"2026-{m:02d}-{d:02d}"

def xml_escape(s):
    return s.replace("&","&amp;").replace('"',"&quot;").replace("<","&lt;").replace(">","&gt;")

def gen_cz_employee(sqnr):
    is_female = random.random() < 0.5
    if is_female:
        fir = random.choice(female_first)
        sur = random.choice(surnames_f)
        birth_sur = random.choice(surnames_f)
        mal = "Z"
    else:
        fir = random.choice(male_first)
        sur = random.choice(surnames_m)
        birth_sur = sur
        mal = "M"

    by = random.randint(1955, 2005)
    bm = random.randint(1, 12)
    bd = random.randint(1, 28)
    birth_dat = f"{by:04d}-{bm:02d}-{bd:02d}"
    birth_city = random.choice(cities_cz)

    bno = gen_bno(by, bm, bd, is_female)
    ikmpsv = gen_ikmpsv()

    adr_city = random.choice(cities_cz)
    adr_str = random.choice(streets)
    adr_num = str(random.randint(1, 999))
    adr_pnu = str(random.randint(10000, 79999))

    contract_date = gen_contract_date()
    prof = random.choice(prof_codes)
    pos = random.choice(positions)
    zp = random.choices(zp_codes, weights=zp_weights, k=1)[0]
    edu = random.choices(edu_levels, weights=edu_weights_cz, k=1)[0]
    highedu = edu if edu in ("R","T","V") else "N"
    municode = random.choice(municodes)
    wm = random.choices(workmode_vals, weights=[80,15,5], k=1)[0]
    relat = random.choices(relat_vals, weights=[60,15,10,10,5], k=1)[0]
    rd = random.choice(rel_detail_vals)

    lead = "T" if random.random() < 0.05 else "N"
    ztp = "T" if random.random() < 0.02 else "N"
    early = "T" if by < 1965 and random.random() < 0.1 else "N"
    reduced = "T" if by < 1965 and random.random() < 0.05 else "N"

    lines = []
    lines.append(f'    <employee act="1" dat="2026-03-16" sqnr="{sqnr}" dep="444">')
    lines.append(f'      <client bno="{bno}" ikmpsv="{ikmpsv}">')
    lines.append(f'        <name fir="{xml_escape(fir)}" sur="{xml_escape(sur)}"/>')
    lines.append(f'        <birth cit="{xml_escape(birth_city)}" dat="{birth_dat}" nam="{xml_escape(birth_sur)}" stat="CZ"/>')
    lines.append(f'        <stat cnt="CZ" mal="{mal}"/>')
    lines.append(f'        <adr cit="{xml_escape(adr_city)}" cnt="CZ" num="{adr_num}" pnu="{adr_pnu}" str="{xml_escape(adr_str)}"/>')
    lines.append(f'        <taxidrezid stat="CZ"/>')
    lines.append(f'      </client>')
    lines.append(f'      <comp nam="Test firma jhmh 2026-03-10" vs="1152037709"/>')
    lines.append(f'      <job cit="Praha" cont="N" contractfro="{contract_date}" contractplace="Praha" fro="{contract_date}" municode="{municode}" rel="1" relDetail="{rd}" relat="{relat}" sme="N" workmode="{wm}">')
    lines.append(f'        <prof clas="{prof}"/>')
    lines.append(f'        <position lead="{lead}" name="{xml_escape(pos)}"/>')
    lines.append(f'      </job>')
    lines.append(f'      <pens early="{early}" reducedAge="{reduced}"/>')
    lines.append(f'      <insh cnr="{zp}"/>')
    lines.append(f'      <fact highedu="{highedu}" ztp="{ztp}"/>')
    lines.append(f'      <forinreg juris="N"/>')
    lines.append(f'    </employee>')
    return '\n'.join(lines)

def gen_foreign_employee(sqnr):
    is_female = random.random() < 0.5
    cnt = random.choice(foreign_countries)
    fcity = foreign_cities[cnt]

    if is_female:
        fir = random.choice(female_first)
        sur = random.choice(surnames_f)
        birth_sur = random.choice(surnames_f)
    else:
        fir = random.choice(male_first)
        sur = random.choice(surnames_m)
        birth_sur = sur

    by = random.randint(1960, 2002)
    bm = random.randint(1, 12)
    bd = random.randint(1, 28)
    birth_dat = f"{by:04d}-{bm:02d}-{bd:02d}"

    adr_city = random.choice(cities_cz)
    adr_str = random.choice(streets)
    adr_num = str(random.randint(1, 999))
    adr_onum = str(random.randint(1, 50))
    adr_pnu = str(random.randint(10000, 79999))

    rdr_num = str(random.randint(1, 500))
    rdr_pnu = str(random.randint(10000, 99999))

    taxid_num = str(random.randint(100000000, 999999999))
    proofid_num = f"{cnt}{random.randint(100000, 999999)}"

    contract_date = gen_contract_date()
    prof = random.choice(prof_codes)
    pos = random.choice(positions)
    zp = random.choices(zp_codes, weights=zp_weights, k=1)[0]
    edu = random.choices(edu_levels, weights=edu_weights_for, k=1)[0]
    highedu = edu if edu in ("R","T","V") else "N"
    municode = random.choice(municodes)
    wm = random.choices(workmode_vals, weights=[80,15,5], k=1)[0]
    relat = random.choices(relat_vals, weights=[60,15,10,10,5], k=1)[0]
    rd = random.choice(rel_detail_vals)

    lead = "T" if random.random() < 0.03 else "N"
    ztp = "N"

    perm_type = random.choice(["1","2","3"])
    perm_id = f"P{random.randint(100000, 999999)}"
    freeacc = "T" if cnt in ("SK","PL","DE","HU","BG","RO","FR","IT") and random.random() < 0.5 else "N"

    lines = []
    lines.append(f'    <employee act="1" dat="2026-03-16" dep="444" sqnr="{sqnr}">')
    lines.append(f'      <client>')
    lines.append(f'        <name fir="{xml_escape(fir)}" sur="{xml_escape(sur)}"/>')
    lines.append(f'        <birth cit="{xml_escape(fcity)}" dat="{birth_dat}" nam="{xml_escape(birth_sur)}" stat="{cnt}"/>')
    lines.append(f'        <stat/>')
    lines.append(f'        <adr cit="{xml_escape(adr_city)}" cnt="CZ" num="{adr_num}" onum="{adr_onum}" pnu="{adr_pnu}" str="{xml_escape(adr_str)}"/>')
    lines.append(f'        <rdr cit="{xml_escape(fcity)}" cnt="{cnt}" num="{rdr_num}" pnu="{rdr_pnu}" str="Namestie"/>')
    lines.append(f'        <taxidrezid num="{taxid_num}" stat="{cnt}" type="D"/>')
    lines.append(f'        <proofid foreigninst="OAMP Praha" num="{proofid_num}" stat="{cnt}" type="O"/>')
    lines.append(f'      </client>')
    lines.append(f'      <comp nam="Test firma jhmh 2026-03-10" vs="1152037709"/>')
    lines.append(f'      <job cit="Praha" cont="N" contractfro="{contract_date}" contractplace="Praha" fro="{contract_date}" municode="{municode}" preplace="Praha" rel="1" relDetail="{rd}" relat="{relat}" sme="N" workmode="{wm}">')
    lines.append(f'        <prof clas="{prof}" edu="{edu}"/>')
    lines.append(f'        <position lead="{lead}" name="{xml_escape(pos)}"/>')
    lines.append(f'      </job>')
    lines.append(f'      <pens early="N" reducedAge="N"/>')
    lines.append(f'      <insh cnr="{zp}"/>')
    lines.append(f'      <fact highedu="{highedu}" ztp="{ztp}"/>')
    lines.append(f'      <nocitizen freeacc="{freeacc}" permfro="2026-04-01" permid="{perm_id}" permto="2026-12-31" permtype="{perm_type}"/>')
    lines.append(f'      <forinreg juris="N"/>')
    lines.append(f'    </employee>')
    return '\n'.join(lines)

# Build employee list: 1200 CZ + 300 foreign, shuffled
types = [1]*1200 + [2]*300
random.shuffle(types)

parts = []
parts.append('<?xml version="1.0" encoding="UTF-8"?>')
parts.append('<REGZEC xmlns="http://schemas.cssz.cz/REGZEC/2025" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://schemas.cssz.cz/REGZEC/2025 REGZEC25.xsd" version="1.4.0.2" partialAccept="A">')
parts.append('  <employees>')

for i, t in enumerate(types, 1):
    if t == 1:
        parts.append(gen_cz_employee(i))
    else:
        parts.append(gen_foreign_employee(i))

parts.append('  </employees>')
parts.append('</REGZEC>')

output = '\n'.join(parts) + '\n'

with open('C:/Users/ansu-abra/IdeaProjects/regzec-editor/sample-1500.xml', 'w', encoding='utf-8') as f:
    f.write(output)

cz_count = sum(1 for t in types if t == 1)
for_count = sum(1 for t in types if t == 2)
print(f"Generated {len(types)} employees: {cz_count} CZ + {for_count} foreign")
print(f"File size: {len(output)} bytes, {output.count(chr(10))} lines")
