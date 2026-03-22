#!/usr/bin/env python3
"""Generate a sample JMHZ XML file with 120 formularOsoby records."""

import random
import uuid
import math

random.seed(42)

CITIES = [
    ("Praha", "554782"),
    ("Brno", "582786"),
    ("Ostrava", "554821"),
    ("Plzen", "554791"),
    ("Liberec", "563889"),
    ("Olomouc", "500496"),
    ("Ceske Budejovice", "544256"),
    ("Hradec Kralove", "569810"),
    ("Pardubice", "555134"),
    ("Zlin", "585068"),
    ("Kladno", "532053"),
    ("Most", "567027"),
    ("Opava", "505927"),
    ("Frydek-Mistek", "598003"),
    ("Jihlava", "586846"),
    ("Teplice", "567442"),
    ("Karlovy Vary", "554961"),
    ("Decin", "562335"),
    ("Chomutov", "563749"),
    ("Kolin", "533165"),
]

ELDP_CODES = ["A++", "A+Z", "T++", "1++", "2++", "3++", "4++", "5++"]

CHILD_FIRST_NAMES = [
    "Jan", "Petr", "Lukas", "Tomas", "Jakub", "Adam", "Filip",
    "Anna", "Eva", "Tereza", "Lucie", "Katerina", "Marie", "Eliska",
]

CHILD_LAST_NAMES = [
    "Novak", "Svoboda", "Dvorak", "Cerny", "Prochazka",
    "Novakova", "Svobodova", "Dvorakova", "Cerna", "Prochazkova",
]

NUM_RECORDS = 120
MONTH = 3
YEAR = 2026
POJ_OD = "2026-03-01"
POJ_DO = "2026-03-31"
DAYS_IN_MONTH = 31
WORKING_DAYS = 23


def guid():
    return str(uuid.uuid4())


def ik_mpsv(idx):
    """Generate a 10-digit IK MPSV."""
    return f"{1000000000 + idx}"


def id_ppv(idx):
    """Generate a 13-digit ID PPV."""
    return f"{4000000000000 + idx}"


def rodne_cislo():
    """Generate a random-ish 10-digit rodne cislo."""
    yy = random.randint(50, 99)
    mm = random.randint(1, 12)
    dd = random.randint(1, 28)
    seq = random.randint(0, 999)
    base = f"{yy:02d}{mm:02d}{dd:02d}{seq:03d}"
    # make it 10 digits with a check digit
    check = random.randint(0, 9)
    return base + str(check)


def write_line(f, indent, tag, value, ns=""):
    prefix = "\t" * indent
    if ns:
        f.write(f"{prefix}<{ns}:{tag}>{value}</{ns}:{tag}>\n")
    else:
        f.write(f"{prefix}<{tag}>{value}</{tag}>\n")


def generate():
    # Pre-generate all person data to compute aggregates
    records = []
    total_zaklad_a = 0
    total_poj_zamestnanec = 0
    total_poj_zamestnavatel = 0
    total_dan_zaloha_po_sleve = 0

    for i in range(NUM_RECORDS):
        salary = random.randint(15000, 80000)
        has_prohlaseni = random.random() < 0.6
        has_prohlaseni_dane = has_prohlaseni and random.random() < 0.33
        has_children = has_prohlaseni_dane and random.random() < 0.3

        # Social insurance: employee 7.1%, employer 24.8%
        vym_zaklad = salary
        poj_zamestnanec = round(salary * 0.071)
        poj_zamestnavatel = round(salary * 0.248)

        # Health insurance: employer 9%, employee 4.5%
        zdrav_zamestnavatel = round(salary * 0.09)
        zdrav_zamestnanec = round(salary * 0.045)

        # Tax
        zaklad_dane = salary
        vyp_zaloha = round(salary * 0.15)
        zakladni_sleva = 2570 if has_prohlaseni_dane else 0
        danova_zvyhodneni = 0
        children_data = []
        if has_children:
            num_children = random.randint(1, 2)
            for ci in range(num_children):
                child = {
                    "jmeno": random.choice(CHILD_FIRST_NAMES),
                    "prijmeni": random.choice(CHILD_LAST_NAMES),
                    "datumNarozeni": f"{random.randint(2010, 2020):04d}-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
                    "rodneCislo": rodne_cislo(),
                    "poradi": str(ci + 1),
                }
                children_data.append(child)
                danova_zvyhodneni += 1267

        dan_zaloha_po_sleve = max(0, vyp_zaloha - zakladni_sleva - danova_zvyhodneni)
        dan_bonus = 0
        if dan_zaloha_po_sleve == 0 and has_prohlaseni_dane and danova_zvyhodneni > 0:
            remainder = vyp_zaloha - zakladni_sleva
            if remainder < 0:
                dan_bonus = min(danova_zvyhodneni, abs(remainder) + danova_zvyhodneni)
                dan_bonus = min(dan_bonus, danova_zvyhodneni)

        mzda_cista = salary - poj_zamestnanec - zdrav_zamestnanec - dan_zaloha_po_sleve

        # Tarif + odmeny = salary
        tarif = round(salary * 0.7)
        odmeny_prav = round(salary * 0.2)
        odmeny_neprav = salary - tarif - odmeny_prav

        hours_worked = random.randint(100, 200)
        days_worked = min(WORKING_DAYS, random.randint(15, WORKING_DAYS))
        prumerny_hod_vydelek = round(salary / max(hours_worked, 1), 2)

        stanoveny_fond = 168
        sjednany_fond = random.choice([168, 160, 120, 80, 60])
        stanovena_tydenni = random.choice([40, 37.5, 30, 20, 15])

        city, kod_obce = random.choice(CITIES)
        eldp_code = random.choice(ELDP_CODES)

        total_zaklad_a += vym_zaklad
        total_poj_zamestnanec += poj_zamestnanec
        total_poj_zamestnavatel += poj_zamestnavatel
        total_dan_zaloha_po_sleve += dan_zaloha_po_sleve

        records.append({
            "idx": i,
            "salary": salary,
            "vym_zaklad": vym_zaklad,
            "poj_zamestnanec": poj_zamestnanec,
            "poj_zamestnavatel": poj_zamestnavatel,
            "zdrav_zamestnavatel": zdrav_zamestnavatel,
            "zdrav_zamestnanec": zdrav_zamestnanec,
            "zaklad_dane": zaklad_dane,
            "vyp_zaloha": vyp_zaloha,
            "dan_zaloha_po_sleve": dan_zaloha_po_sleve,
            "dan_bonus": dan_bonus,
            "has_prohlaseni": has_prohlaseni,
            "has_prohlaseni_dane": has_prohlaseni_dane,
            "zakladni_sleva": zakladni_sleva,
            "danova_zvyhodneni": danova_zvyhodneni,
            "children_data": children_data,
            "mzda_cista": mzda_cista,
            "tarif": tarif,
            "odmeny_prav": odmeny_prav,
            "odmeny_neprav": odmeny_neprav,
            "hours_worked": hours_worked,
            "days_worked": days_worked,
            "prumerny_hod_vydelek": prumerny_hod_vydelek,
            "stanoveny_fond": stanoveny_fond,
            "sjednany_fond": sjednany_fond,
            "stanovena_tydenni": stanovena_tydenni,
            "city": city,
            "kod_obce": kod_obce,
            "eldp_code": eldp_code,
        })

    total_poj_celkem = total_poj_zamestnavatel + total_poj_zamestnanec

    out_path = r"C:\Users\ansu-abra\IdeaProjects\regzec-editor\sample-jmhz-120.xml"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n')
        f.write('<n1:jmhz\n')
        f.write('\txmlns:n1="http://schemas.cssz.cz/JMHZ/podani/1.0"\n')
        f.write('\txmlns:xs="http://www.w3.org/2001/XMLSchema-instance"\n')
        f.write('\txmlns:bt="http://schemas.cssz.cz/baseTypes/v2"\n')
        f.write('\txmlns:so="http://schemas.cssz.cz/JMHZ/souhrn/1.0"\n')
        f.write('\txmlns:pvpoj="http://schemas.cssz.cz/JMHZ/PVPOJ/1.0"\n')
        f.write('\txmlns:form="http://schemas.cssz.cz/JMHZ/form/1.0"\n')
        f.write('\txs:schemaLocation="\n')
        f.write('\t\thttp://schemas.cssz.cz/JMHZ/podani/1.0 jmhzPodani.xsd\n')
        f.write('\t\thttp://schemas.cssz.cz/JMHZ/souhrn/1.0 souhrn.xsd\n')
        f.write('\t\thttp://schemas.cssz.cz/JMHZ/PVPOJ/1.0 PVPOJ.xsd\n')
        f.write('\t\thttp://schemas.cssz.cz/JMHZ/form/1.0 form.xsd\n')
        f.write('\t\thttp://schemas.cssz.cz/baseTypes/v2 baseTypes2.xsd"\n')
        f.write('\tverze="1.4.3">\n')

        # VENDOR + SENDER
        f.write('\t<n1:VENDOR productName="GenJMHZ" productVersion="1.0" />\n')
        f.write('\t<n1:SENDER EmailNotifikace="test@example.com" ISDSreport="report1" VerzeProtokolu="1.0" />\n')

        # hlavicka
        f.write('\t<n1:hlavicka>\n')
        write_line(f, 2, "idPodani", guid(), "n1")
        write_line(f, 2, "typPodani", "R", "n1")
        write_line(f, 2, "variabilniSymbol", "2260105339", "n1")
        write_line(f, 2, "mesic", str(MONTH), "n1")
        write_line(f, 2, "rok", str(YEAR), "n1")
        write_line(f, 2, "datumVyplneni", "2026-04-10T11:00:00Z", "n1")
        write_line(f, 2, "balikPoradi", "1", "n1")
        write_line(f, 2, "balikyPocet", "1", "n1")
        # formularePocetVBaliku = 120 forms + souhrn + PVPOJ = 122
        write_line(f, 2, "formularePocetVBaliku", "122", "n1")
        write_line(f, 2, "formularePocetCelkem", "122", "n1")
        f.write('\t</n1:hlavicka>\n')

        # souhrn
        f.write('\t<so:souhrn>\n')
        f.write('\t\t<so:danUdajeMesic>\n')
        write_line(f, 3, "danZalohaPoSleve", str(total_dan_zaloha_po_sleve), "so")
        f.write('\t\t</so:danUdajeMesic>\n')
        f.write('\t</so:souhrn>\n')

        # PVPOJ
        f.write('\t<pvpoj:PVPOJ>\n')
        f.write('\t\t<pvpoj:pojistne>\n')
        write_line(f, 3, "zakladZamestnavateleA", str(total_zaklad_a), "pvpoj")
        poj_a = round(total_zaklad_a * 0.248)
        write_line(f, 3, "pojistneZamestnavateleA", str(poj_a), "pvpoj")
        write_line(f, 3, "pojistneZamestnavateleCelkem", str(total_poj_zamestnavatel), "pvpoj")
        write_line(f, 3, "pojistneZamestnance", str(total_poj_zamestnanec), "pvpoj")
        write_line(f, 3, "pojistneCelkem", str(total_poj_celkem), "pvpoj")
        f.write('\t\t</pvpoj:pojistne>\n')
        write_line(f, 2, "pojistneUhrada", str(total_poj_celkem), "pvpoj")
        f.write('\t</pvpoj:PVPOJ>\n')

        # formulareOsob
        f.write('\t<n1:formulareOsob>\n')

        for rec in records:
            i = rec["idx"]
            f.write('\t\t<n1:formularOsoby>\n')

            # hlavicka formulare
            f.write('\t\t\t<n1:hlavicka>\n')
            write_line(f, 4, "idFormulare", guid(), "n1")
            write_line(f, 4, "typFormulare", "R", "n1")
            write_line(f, 4, "primarniPpv", "true" if i == 0 else ("true" if random.random() < 0.5 else "false"), "n1")
            f.write('\t\t\t</n1:hlavicka>\n')

            # bezPriznaku
            f.write('\t\t\t<form:bezPriznaku>\n')

            # identifikace
            f.write('\t\t\t\t<form:identifikace>\n')
            write_line(f, 5, "ikMpsv", ik_mpsv(i), "form")
            write_line(f, 5, "idPpv", id_ppv(i), "form")
            f.write('\t\t\t\t</form:identifikace>\n')

            # souhrnDataZec
            f.write('\t\t\t\t<form:souhrnDataZec>\n')

            # prijmy
            f.write('\t\t\t\t\t<form:prijmy>\n')
            write_line(f, 6, "zuctovanoCelkem", str(rec["salary"]), "form")
            write_line(f, 6, "osvobozenoCelkem", "0", "form")
            f.write('\t\t\t\t\t</form:prijmy>\n')

            # zalohaNaDan
            f.write('\t\t\t\t\t<form:zalohaNaDan>\n')
            write_line(f, 6, "zakladDane", str(rec["zaklad_dane"]), "form")
            write_line(f, 6, "vypoctenaZaloha", str(rec["vyp_zaloha"]), "form")
            write_line(f, 6, "danZalohaPoSleve", str(rec["dan_zaloha_po_sleve"]), "form")
            write_line(f, 6, "danBonus", str(rec["dan_bonus"]), "form")
            f.write('\t\t\t\t\t</form:zalohaNaDan>\n')

            # prohlaseniPoplatnika
            write_line(f, 5, "prohlaseniPoplatnika", "true" if rec["has_prohlaseni"] else "false", "form")

            # prohlaseniPoplatnikaDane (optional)
            if rec["has_prohlaseni_dane"]:
                f.write('\t\t\t\t\t<form:prohlaseniPoplatnikaDane>\n')
                write_line(f, 6, "zakladniSleva", str(rec["zakladni_sleva"]), "form")
                if rec["danova_zvyhodneni"] > 0:
                    write_line(f, 6, "danoveZvyhodneniDetiMesic", str(rec["danova_zvyhodneni"]), "form")
                    f.write('\t\t\t\t\t\t<form:zvyhodneniDetiMesic>\n')
                    write_line(f, 7, "vyzivujeJinaOsoba", "false", "form")
                    f.write('\t\t\t\t\t\t\t<form:vyzivovaneDeti>\n')
                    for child in rec["children_data"]:
                        f.write('\t\t\t\t\t\t\t\t<form:vyzivovaneDite>\n')
                        f.write('\t\t\t\t\t\t\t\t\t<form:dite>\n')
                        write_line(f, 10, "jmeno", child["jmeno"], "form")
                        write_line(f, 10, "prijmeni", child["prijmeni"], "form")
                        write_line(f, 10, "datumNarozeni", child["datumNarozeni"], "form")
                        write_line(f, 10, "rodneCislo", child["rodneCislo"], "form")
                        f.write('\t\t\t\t\t\t\t\t\t</form:dite>\n')
                        write_line(f, 9, "prukazZtpp", "false", "form")
                        write_line(f, 9, "poradi", child["poradi"], "form")
                        f.write('\t\t\t\t\t\t\t\t</form:vyzivovaneDite>\n')
                    f.write('\t\t\t\t\t\t\t</form:vyzivovaneDeti>\n')
                    f.write('\t\t\t\t\t\t</form:zvyhodneniDetiMesic>\n')
                f.write('\t\t\t\t\t</form:prohlaseniPoplatnikaDane>\n')

            # mzdaCista
            f.write('\t\t\t\t\t<form:mzdaCista>\n')
            write_line(f, 6, "mzdaCista", str(rec["mzda_cista"]), "form")
            write_line(f, 6, "srazkyZeMzdyEvidovany", "false", "form")
            f.write('\t\t\t\t\t</form:mzdaCista>\n')

            # zdravPojZamestnavatel
            f.write('\t\t\t\t\t<form:zdravPojZamestnavatel>\n')
            write_line(f, 6, "zdravotniPojisteni", str(rec["zdrav_zamestnavatel"]), "form")
            f.write('\t\t\t\t\t</form:zdravPojZamestnavatel>\n')

            # zdravPojZamestnanec
            f.write('\t\t\t\t\t<form:zdravPojZamestnanec>\n')
            write_line(f, 6, "zdravotniPojisteni", str(rec["zdrav_zamestnanec"]), "form")
            f.write('\t\t\t\t\t</form:zdravPojZamestnanec>\n')

            f.write('\t\t\t\t</form:souhrnDataZec>\n')

            # pojisteni
            f.write('\t\t\t\t<form:pojisteni>\n')

            # trvani
            f.write('\t\t\t\t\t<form:trvani>\n')
            write_line(f, 6, "pojisteniOd", POJ_OD, "form")
            write_line(f, 6, "pojisteniDo", POJ_DO, "form")
            f.write('\t\t\t\t\t</form:trvani>\n')

            # vymerovaciZaklad
            f.write('\t\t\t\t\t<form:vymerovaciZaklad>\n')
            write_line(f, 6, "castkaOdvodPojistneho", str(rec["vym_zaklad"]), "form")
            f.write('\t\t\t\t\t</form:vymerovaciZaklad>\n')

            # vymerovaciZakladParagraf5
            f.write('\t\t\t\t\t<form:vymerovaciZakladParagraf5>\n')
            write_line(f, 6, "pismenoA", str(rec["vym_zaklad"]), "form")
            f.write('\t\t\t\t\t</form:vymerovaciZakladParagraf5>\n')

            # eldpSeznam
            f.write('\t\t\t\t\t<form:eldpSeznam>\n')
            f.write('\t\t\t\t\t\t<form:eldp>\n')
            write_line(f, 7, "kod", rec["eldp_code"], "form")
            write_line(f, 7, "platnostOd", POJ_OD, "form")
            write_line(f, 7, "platnostDo", POJ_DO, "form")
            write_line(f, 7, "pocetDnu", str(DAYS_IN_MONTH), "form")
            write_line(f, 7, "vymerovaciZaklad", str(rec["vym_zaklad"]), "form")
            f.write('\t\t\t\t\t\t</form:eldp>\n')
            f.write('\t\t\t\t\t</form:eldpSeznam>\n')

            # pojisteniZamestnanec
            f.write('\t\t\t\t\t<form:pojisteniZamestnanec>\n')
            write_line(f, 6, "socialniPojisteni", str(rec["poj_zamestnanec"]), "form")
            f.write('\t\t\t\t\t</form:pojisteniZamestnanec>\n')

            # pojisteniZamestnavatel
            f.write('\t\t\t\t\t<form:pojisteniZamestnavatel>\n')
            write_line(f, 6, "socialniPojisteni", str(rec["poj_zamestnavatel"]), "form")
            f.write('\t\t\t\t\t</form:pojisteniZamestnavatel>\n')

            # slevaZamestnance
            f.write('\t\t\t\t\t<form:slevaZamestnance>\n')
            write_line(f, 6, "slevaZamestnanceEvidovana", "false", "form")
            write_line(f, 6, "slevaZamestnanceOvoZelEvidovana", "false", "form")
            f.write('\t\t\t\t\t</form:slevaZamestnance>\n')

            # slevaZamestnavatele
            f.write('\t\t\t\t\t<form:slevaZamestnavatele>\n')
            write_line(f, 6, "slevaZamestnavateleEvidovana", "false", "form")
            f.write('\t\t\t\t\t</form:slevaZamestnavatele>\n')

            f.write('\t\t\t\t</form:pojisteni>\n')

            # vykonavanaPozice
            f.write('\t\t\t\t<form:vykonavanaPozice>\n')
            f.write('\t\t\t\t\t<form:mistoVykonuPrace>\n')
            write_line(f, 6, "obec", rec["city"], "form")
            write_line(f, 6, "kodObce", rec["kod_obce"], "form")
            write_line(f, 6, "kodStatu", "CZ", "form")
            f.write('\t\t\t\t\t</form:mistoVykonuPrace>\n')
            write_line(f, 5, "uplatnujiPrispevekApz", "false", "form")
            write_line(f, 5, "funkcniPozitky", "false", "form")
            write_line(f, 5, "docasnePrideleniEvidovano", "false", "form")
            f.write('\t\t\t\t\t<form:fondPracovniDoby>\n')
            write_line(f, 6, "stanovenyFond", str(rec["stanoveny_fond"]), "form")
            write_line(f, 6, "sjednanyFond", str(rec["sjednany_fond"]), "form")
            write_line(f, 6, "stanovenaTydenniDoba", f"{rec['stanovena_tydenni']:.1f}" if rec["stanovena_tydenni"] != int(rec["stanovena_tydenni"]) else str(int(rec["stanovena_tydenni"])), "form")
            f.write('\t\t\t\t\t</form:fondPracovniDoby>\n')
            f.write('\t\t\t\t</form:vykonavanaPozice>\n')

            # prubehZamestnani
            f.write('\t\t\t\t<form:prubehZamestnani>\n')
            f.write('\t\t\t\t\t<form:odpracovaneDny>\n')
            write_line(f, 6, "dnyEvidencniStav", str(DAYS_IN_MONTH), "form")
            write_line(f, 6, "dnyOdpracovanePocet", str(rec["days_worked"]), "form")
            f.write('\t\t\t\t\t</form:odpracovaneDny>\n')
            f.write('\t\t\t\t\t<form:odpracovaneHodiny>\n')
            write_line(f, 6, "pocet", str(rec["hours_worked"]), "form")
            f.write('\t\t\t\t\t</form:odpracovaneHodiny>\n')
            f.write('\t\t\t\t</form:prubehZamestnani>\n')

            # prijem
            f.write('\t\t\t\t<form:prijem>\n')
            f.write('\t\t\t\t\t<form:dan>\n')
            write_line(f, 6, "zakladDane", str(rec["zaklad_dane"]), "form")
            f.write('\t\t\t\t\t</form:dan>\n')
            f.write('\t\t\t\t</form:prijem>\n')

            # mzda
            f.write('\t\t\t\t<form:mzda>\n')
            write_line(f, 5, "mzdaZuctovana", str(rec["salary"]), "form")
            f.write('\t\t\t\t\t<form:mzdaRozpad>\n')
            write_line(f, 6, "tarif", str(rec["tarif"]), "form")
            write_line(f, 6, "odmenyPravidelne", str(rec["odmeny_prav"]), "form")
            write_line(f, 6, "odmenyNepravidelne", str(rec["odmeny_neprav"]), "form")
            f.write('\t\t\t\t\t</form:mzdaRozpad>\n')
            f.write('\t\t\t\t\t<form:vydelek>\n')
            write_line(f, 6, "vydelekPrumernyHod", f"{rec['prumerny_hod_vydelek']:.2f}", "form")
            f.write('\t\t\t\t\t</form:vydelek>\n')
            f.write('\t\t\t\t</form:mzda>\n')

            f.write('\t\t\t</form:bezPriznaku>\n')
            f.write('\t\t</n1:formularOsoby>\n')

        f.write('\t</n1:formulareOsob>\n')
        f.write('</n1:jmhz>\n')

    print(f"Generated {out_path} with {NUM_RECORDS} formularOsoby records.")
    print(f"Aggregates: zakladA={total_zaklad_a}, pojZamestnanec={total_poj_zamestnanec}, "
          f"pojZamestnavatel={total_poj_zamestnavatel}, pojCelkem={total_poj_celkem}, "
          f"danZalohaPoSleve={total_dan_zaloha_po_sleve}")


if __name__ == "__main__":
    generate()
