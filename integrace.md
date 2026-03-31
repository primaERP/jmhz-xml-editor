# Integrace JMHZ Vieweru

Systém (Gen/Flores) vygeneruje HTML soubor s XML daty uvnitř a otevře ho přímo v prohlížeči. Viewer se načte z externího serveru a XML přečte ze stránky, uživatel vidí svá data. XML data zůstávají v HTML souboru, nic se nikam neodesílá.

## Postup generování HTML

- Vezměte šablonu **example-inline.html** (přiložena)
- Do elementu `<script id="jmhz-data" type="application/xml">` vložte celý XML dokument
- Nastavte atribut **data-filename** na název XML souboru (např. `mesicni-hlaseni-2026-03.xml`)
- Výsledný HTML soubor uložte do tempu a otevřete v prohlížeči

## Minimální HTML

    <!DOCTYPE html>
    <html lang="cs">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>JMHZ Viewer</title>
    </head>
    <body>
      <div id="jmhz-viewer-root"></div>
    
      <script id="jmhz-data" type="application/xml" data-filename="NAZEV_SOUBORU.xml">
        <!-- SEM VLOŽTE CELÝ XML DOKUMENT -->
      </script>
    
      <script src="https://support.flexibee.eu/service/jmhz-viewer/embed.js"></script>
      <script>
        window.JMHZViewer.mount('#jmhz-viewer-root', {
          initialViewMode: 'table',
          autoValidateOnLoad: true,
          manageDocumentTitle: true
        });
      </script>
    </body>
    </html>

