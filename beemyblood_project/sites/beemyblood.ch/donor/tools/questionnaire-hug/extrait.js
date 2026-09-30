// Positions du texte du formulaire officiel (points PDF, origine en bas à gauche)
const fs = require('fs');
const pdfjs = require('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js'); // même moteur que celui qui a servi à établir la carte
const PDF = __dirname + '/../../assets/hug-questionnaire-v01-fev26.pdf';
pdfjs.disableWorker = true;
(async function(){
  const doc = await pdfjs.getDocument(new Uint8Array(fs.readFileSync(PDF)));
  const out = [];
  for(let p = 1; p <= doc.numPages; p++){
    const page = await doc.getPage(p), vp = page.getViewport(1), tc = await page.getTextContent();
    out.push({ page: p, w: vp.width, h: vp.height, rot: page.rotate, items: tc.items.map(function(i){ return { s: i.str, x: +i.transform[4].toFixed(1), y: +i.transform[5].toFixed(1), w: +i.width.toFixed(1), h: +i.height.toFixed(1), f: i.fontName }; }) });
  }
  fs.writeFileSync(__dirname + '/positions.json', JSON.stringify(out));
  out.forEach(function(pg){
    console.log('PAGE', pg.page, pg.w, pg.h, 'rot', pg.rot, pg.items.length, 'items');
  });
})().catch(function(e){ console.error(e); process.exit(1); });
