const fs=require('fs');
const shell=fs.readFileSync(__dirname+'/shell.html','utf8');
const html=shell.replace('/*DATA*/',()=>fs.readFileSync(__dirname+'/data.js','utf8')).replace('/*APP*/',()=>fs.readFileSync(__dirname+'/app.js','utf8'));
fs.writeFileSync(__dirname+'/index.html',html);
// Android version: bundled fonts, no external resources at all
const local=`<style>
@font-face{font-family:"Atkinson Hyperlegible";src:url("fonts/AtkinsonHyperlegible-Regular.ttf") format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Atkinson Hyperlegible";src:url("fonts/AtkinsonHyperlegible-Bold.ttf") format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Newsreader";src:url("fonts/Newsreader.ttf") format("truetype");font-weight:200 800;font-display:swap}
</style>`;
const android=html.replace(/<link rel="preconnect"[^>]*>\n?/g,'').replace(/<link href="https:\/\/fonts\.googleapis[^>]*>/,local);
if(/googleapis|gstatic/.test(android)) throw new Error('external font reference left in Android build');
const out=process.argv[2]; if(out){ fs.writeFileSync(out,android); console.log('android build ->',out); }
console.log('built',(html.length/1024).toFixed(1)+' KB');
