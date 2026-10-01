"use strict";
// ───────── Référentiel ─────────
const THEMES = {
  pv:{n:"Principes et valeurs de la République", s:"Principes et valeurs", w:11, sit:6},
  dd:{n:"Droits et devoirs", s:"Droits et devoirs", w:11, sit:6},
  hg:{n:"Histoire, géographie et culture", s:"Histoire et culture", w:8, sit:0},
  si:{n:"Système institutionnel et politique", s:"Institutions", w:6, sit:0},
  vs:{n:"Vivre dans la société française", s:"Vivre en France", w:4, sit:0}
};
const ORDER = ["pv","dd","hg","si","vs"];
// Répartition officielle par notion (arrêté du 10 octobre 2025, art. 3)
const SUBS = {pv:[["sym",3],["lai",2],["sit",6]], dd:[["fond",2],["obl",3],["sit",6]], hg:[["hist",3],["geo",3],["pat",2]], si:[["dem",3],["org",2],["eu",1]], vs:[["res",1],["soin",1],["trav",1],["edu",1]]};
const SUBNAME = {sym:"Devise et symboles",lai:"Laïcité",sit:"Mises en situation",fond:"Droits fondamentaux",obl:"Obligations et devoirs",hist:"Périodes et personnages",geo:"Territoires et géographie",pat:"Patrimoine",dem:"Démocratie et droit de vote",org:"Organisation de la République",eu:"Institutions européennes",res:"S’installer et résider",soin:"Accès aux soins",trav:"Travailler en France",edu:"Autorité parentale et école"};
const KIND = {o:"Énoncé officiel", e:"Entraînement", s:"Mise en situation"};
const EXAM = {n:40, min:45, pass:32};
const Qs = QDATA.map(r=>({id:r[0],t:r[1],k:r[2],d:r[3],q:r[4],a:r[5],x:r[6],m:r[7],n:SUB[r[0]]}));
const Cs = CDATA.map(r=>({id:"c:"+r[0],t:r[1],cat:r[2],f:r[3],sum:r[4],facts:r[5],more:r[6],trap:r[7]}));
const cardText = c => [c.f,c.sum,c.facts.map(f=>f.join(" ")).join(" "),c.more,c.trap,c.cat].join(" ");
const QM = Object.fromEntries(Qs.map(q=>[q.id,q]));
const CM = Object.fromEntries(Cs.map(c=>[c.id,c]));
const DAY = 864e5, LAD = [0,1,3,7,14,30,60];

// ───────── Utilitaires ─────────
const esc = s => String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad = n => String(n).padStart(2,"0");
const dk = ts => {const d=new Date(ts);return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());};
const sod = ts => {const d=new Date(ts);d.setHours(0,0,0,0);return d.getTime();};
const pct = x => Math.round(x*100);
const shuffle = a => {a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g," ");
const LETTERS = ["A","B","C","D"];
const now = () => Date.now();

// ───────── Stockage (privé, local) ─────────
const KEY = "ec.v1";
function fresh(){return {v:1,onb:false,goal:null,examDate:null,set:{theme:"system",fs:100},it:{},fav:{},hist:[],days:{},ret:{n:0,ok:0},plan:null,last:[],exam:null};}
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.v===1)return Object.assign(fresh(),s);}catch(e){}return fresh();}
let S = load();
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}

// ───────── Répétition espacée ─────────
function rec(id){return S.it[id]||(S.it[id]={n:0,c:0,w:0,st:0,due:0,last:0,ld:"",lp:0});}
// ok: true | false | "partial" (fiche « À revoir »)
function grade(id, ok, ans){
  const r=rec(id), t=now(), today=dk(t);
  if(r.n>0 && r.last && t-r.last>=6*DAY && ok!=="partial"){S.ret.n++; if(ok===true)S.ret.ok++;}
  r.n++;
  if(ok===true){ r.c++; if(r.ld!==today||r.st===0) r.st=Math.min(r.st+1,LAD.length-1); r.due=sod(t)+LAD[r.st]*DAY; }
  else if(ok==="partial"){ r.st=Math.min(Math.max(r.st,1),1); r.due=sod(t)+DAY; }
  else { r.w++; r.lp++; r.st=0; r.due=t; }
  if(ans!==undefined) r.la=ans;
  r.last=t; r.ld=today;
  S.days[today]=(S.days[today]||0)+1;
}
function stateOf(id){const r=S.it[id]; if(!r||!r.n)return "new"; if(r.st>=4)return "mastered"; if(r.due<=now())return "due"; return "fragile";}
function strength(id){const r=S.it[id]; if(!r||!r.n)return 0; return Math.min(1,r.st/4);}

// ───────── Mesures ─────────
function themeStats(t){
  const qs=Qs.filter(q=>q.t===t); let n=0,c=0,m=0,seen=0;
  qs.forEach(q=>{const r=S.it[q.id]; if(r&&r.n){n+=r.n;c+=r.c;seen++;} m+=strength(q.id);});
  return {total:qs.length, seen, acc:n?c/n:null, mastery:m/qs.length};
}
function globalMastery(){let s=0,w=0; ORDER.forEach(t=>{s+=themeStats(t).mastery*THEMES[t].w; w+=THEMES[t].w;}); return s/w;}
function counts(){
  const o={new:0,due:0,fragile:0,mastered:0,answered:0,correct:0};
  Qs.forEach(q=>{o[stateOf(q.id)]++; const r=S.it[q.id]; if(r){o.answered+=r.n;o.correct+=r.c;}});
  return o;
}
function recentAcc(){let c=0,n=0; for(let i=S.hist.length-1;i>=0&&n<100;i--){const h=S.hist[i]; if(h.n){c+=h.c;n+=h.n;}} return n?c/n:null;}
function activeDays(k){let a=0; for(let i=0;i<k;i++){if(S.days[dk(now()-i*DAY)])a++;} return a;}
function streak(){let s=0,i=S.days[dk(now())]?0:1; while(S.days[dk(now()-i*DAY)]){s++;i++;} return s;}
function exams(){return S.hist.filter(h=>h.type==="exam");}
function readiness(){
  const ex=exams().slice(-3), any=Object.keys(S.it).length>0;
  if(!any) return null;
  const seenQ=Qs.filter(q=>S.it[q.id]&&S.it[q.id].n);
  const fresh=seenQ.length?seenQ.filter(q=>S.it[q.id].due>now()-7*DAY).length/seenQ.length:0;
  const mast=globalMastery()*(0.8+0.2*fresh);
  const ra=recentAcc()||0, reg=Math.min(1,activeDays(14)/10);
  const exs=ex.length?ex.reduce((a,e)=>a+e.c/e.n,0)/ex.length:null;
  let score = exs==null ? (0.55*mast+0.3*ra+0.15*reg)*0.85 : 0.4*exs+0.3*mast+0.2*ra+0.1*reg;
  const passed = exams().some(e=>e.c>=EXAM.pass);
  let lvl = score<.5?0:score<.7?1:score<.85?2:3;
  if(!passed && lvl===3) lvl=2;
  return {score, lvl, parts:{exs, mast, ra, reg}, passed};
}
const LEVELS=["Pas prêt","En progression","Presque prêt","Prêt"];
function daysLeft(){if(!S.examDate)return null; return Math.round((sod(new Date(S.examDate+"T00:00:00").getTime())-sod(now()))/DAY);}

// ───────── Sélection adaptative ─────────
function pickQ(n, pool, exclude){
  exclude=exclude||new Set(); pool=(pool||Qs).filter(q=>!exclude.has(q.id));
  const tsCache={}; ORDER.forEach(t=>tsCache[t]=1-themeStats(t).mastery);
  return pool.map(q=>{const r=S.it[q.id],t=now(); let s=Math.random()*0.6+THEMES[q.t].w/11*0.4+tsCache[q.t]*0.8;
      if(!r||!r.n) s+=0.6; else { if(r.due<=t) s+=1.2+Math.min(1,(t-r.due)/(7*DAY)); if(r.w>r.c) s+=0.6; if(r.st>=4) s-=1; }
      return [s,q];})
    .sort((a,b)=>b[0]-a[0]).slice(0,n).map(x=>x[1].id);
}
function pickCards(n, pool, exclude){
  exclude=exclude||new Set(); const t=now();
  const c=(pool||Cs).filter(x=>!exclude.has(x.id));
  const due=c.filter(x=>S.it[x.id]&&S.it[x.id].n&&S.it[x.id].due<=t).sort((a,b)=>S.it[a.id].due-S.it[b.id].due);
  const nw=shuffle(c.filter(x=>!S.it[x.id]||!S.it[x.id].n));
  return due.concat(nw).slice(0,n).map(x=>x.id);
}
function errorIds(){return Qs.filter(q=>{const r=S.it[q.id];return r&&r.w>0&&r.st<3;}).map(q=>q.id);}
function buildPlan(reroll){
  const excl=new Set(reroll?S.last:[]); const dl=daysLeft(), intense=dl!=null&&dl>=0&&dl<=21;
  const errs=errorIds().filter(id=>!excl.has(id)).sort((a,b)=>S.it[a].due-S.it[b].due).slice(0,intense?10:5);
  errs.forEach(id=>excl.add(id));
  const cards=pickCards(10,null,excl);
  const qs=pickQ(intense?20:10,null,excl);
  S.plan={day:dk(now()),cards,qs,errs,done:{}};
  S.last=cards.concat(qs,errs); save();
}
function plan(){if(!S.plan||S.plan.day!==dk(now()))buildPlan(false); return S.plan;}

// ───────── État de l'interface ─────────
let V={view:"today"}, SES=null, toastT=null, timerI=null, lastKey=null;
const app=()=>document.getElementById("app");

// ───────── Icônes ─────────
const I={
 today:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
 learn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5V19c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5z"/><path d="M12 6v13.5"/></svg>',
 practice:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
 exam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2h5"/></svg>',
 progress:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
 search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
 gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
 back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg>',
 close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
 chev:'<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg>',
 ok:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17 19 7"/></svg>',
 ko:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
 star:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
 grid:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>'
};

// ───────── Rendu général ─────────
function applySettings(){
  const r=document.documentElement;
  if(S.set.theme==="system") r.removeAttribute("data-theme"); else r.setAttribute("data-theme",S.set.theme);
  r.style.fontSize=S.set.fs+"%";
  // Pont Android : barre d’état assortie au thème
  try{ if(window.AndroidBridge){ const dark=S.set.theme==="dark"||(S.set.theme==="system"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches); window.AndroidBridge.setTheme(!!dark); } }catch(e){}
}
function toast(msg){clearTimeout(toastT);let t=document.querySelector(".toast");if(!t){t=document.createElement("div");t.className="toast";t.setAttribute("role","status");document.body.appendChild(t);}t.textContent=msg;toastT=setTimeout(()=>t.remove(),2200);}
function header(title, opts){
  opts=opts||{};
  const left=opts.back?`<button class="ibtn" data-act="go" data-v="${opts.back}" aria-label="Retour">${I.back}</button>`:"";
  const right=opts.plain?"":`<button class="ibtn" data-act="go" data-v="search" aria-label="Rechercher">${I.search}</button><button class="ibtn" data-act="go" data-v="settings" aria-label="Réglages">${I.gear}</button>`;
  return `<header class="top"><div class="top-in">${left}<h1>${esc(title)}</h1>${right}</div></header>`;
}
function tabs(){
  const T=[["today","Aujourd’hui"],["learn","Apprendre"],["practice","S’entraîner"],["exam","Examen"],["progress","Progrès"]];
  const cur={errors:"progress",favs:"progress",history:"progress",theme:"learn"}[V.view]||V.view;
  return `<nav class="tabs" aria-label="Navigation principale"><div class="tabs-in">${T.map(([k,l])=>`<button class="tab" data-act="go" data-v="${k}" ${cur===k?'aria-current="page"':""}>${I[k]}<span>${l}</span></button>`).join("")}</div></nav>`;
}
function render(){
  applySettings();
  clearInterval(timerI); timerI=null;
  if(!S.onb){app().innerHTML=vOnb();return;}
  if(!SES && S.exam && S.exam.kind==="exam") SES=S.exam;
  if(SES){app().innerHTML=vSession(); if(SES.kind==="exam"&&!SES.done) startTimer();
    const key=SES.kind==="exam"?"e"+SES.cur+(SES.done?"d":""):SES.si+":"+SES.qi+(SES.done?"d":""); if(key!==lastKey){window.scrollTo(0,0); lastKey=key;} return;}
  lastKey=null;
  const views={today:vToday,learn:vLearn,practice:vPractice,exam:vExamHome,progress:vProgress,search:vSearch,settings:vSettings,errors:vErrors,favs:vFavs,history:vHistory,theme:vTheme,about:vAbout,backup:vBackup};
  app().innerHTML=(views[V.view]||vToday)();
  const si=document.getElementById("q"); if(si&&V.view==="search"){si.focus(); si.setSelectionRange(si.value.length,si.value.length);}
}
window.addEventListener("scroll",()=>{const h=document.querySelector(".top");if(h)h.classList.toggle("scrolled",window.scrollY>4);},{passive:true});

// ───────── Premier lancement ─────────
function vOnb(){
  const G=[["discover","Découvrir le programme","Apprendre pas à pas, sans pression."],["prepare","Préparer l’examen","Un entraînement régulier sur plusieurs semaines."],["revise","Réviser avant mon examen","Mon examen est proche, je veux cibler mes lacunes."]];
  if(!V.onbStep) return `<main class="wrap onb"><div class="flag" aria-hidden="true"><i></i><i></i><i></i></div>
    <p class="date">Préparation à l’examen civique de naturalisation</p>
    <h1 class="lead">Quel est votre objectif ?</h1>
    <div class="stack">${G.map(([k,t,d])=>`<button class="choice" data-act="goal" data-v="${k}" aria-pressed="${S.goal===k}"><span class="radio"></span><span><b>${t}</b><br><span class="muted small">${d}</span></span></button>`).join("")}</div>
    <p class="muted small" style="margin-top:22px">Aucun compte. Vos données restent sur cet appareil.</p>
    <div style="margin-top:18px"><button class="btn primary" data-act="onbNext" ${S.goal?"":"disabled"}>Continuer</button></div></main>`;
  return `<main class="wrap onb"><div class="flag" aria-hidden="true"><i></i><i></i><i></i></div>
    <h1 class="lead">Avez-vous une date d’examen ?</h1>
    <p class="muted">Facultatif. Avec une date, les séances deviennent plus intensives dans les trois dernières semaines.</p>
    <div class="field" style="margin:18px 0 24px"><label for="ed">Date prévue</label><input id="ed" class="input" type="date"></div>
    <div class="stack"><button class="btn primary" data-act="onbDone">Commencer</button><button class="btn ghost" data-act="onbSkip">Je ne sais pas encore</button></div></main>`;
}

// ───────── Aujourd'hui ─────────
function readinessBlock(){
  const R=readiness();
  if(!R) return `<section class="panel ready"><h3>Niveau de préparation</h3><p class="muted" style="margin:6px 0 0">Il s’affichera après vos premières réponses. Il combine vos examens blancs, votre maîtrise par thème, vos réponses récentes et votre régularité.</p></section>`;
  const x=Math.max(1,Math.min(99,pct(R.score)));
  const on=[R.lvl>=0,R.lvl>=1,R.lvl>=2,R.lvl>=3];
  const P=R.parts;
  return `<section class="panel ready" aria-label="Niveau de préparation">
    <div class="row"><div class="grow"><div class="lvl">${LEVELS[R.lvl]}</div><div class="muted small">Estimation pédagogique, pas une garantie</div></div><div class="pct">${x}<span style="font-size:.45em">%</span></div></div>
    <div class="scale" aria-hidden="true">${on.map(o=>`<span class="${o?"on":""}"></span>`).join("")}<i style="left:${x}%"></i></div>
    <div class="scale-l" aria-hidden="true"><span>Pas prêt</span><span>En progr.</span><span>Presque</span><span>Prêt</span></div>
    <ul class="why"><li><span>Examens blancs (3 derniers)</span><b>${P.exs==null?"aucun":pct(P.exs)+" %"}</b></li><li><span>Maîtrise pondérée par thème</span><b>${pct(P.mast)} %</b></li><li><span>Réponses récentes</span><b>${pct(P.ra)} %</b></li><li><span>Régularité sur 14 jours</span><b>${activeDays(14)} j</b></li></ul>
    ${!R.passed&&R.score>=.85?`<p class="small muted" style="margin:10px 0 0">Réussissez un examen blanc pour atteindre « Prêt ».</p>`:""}
  </section>`;
}
function vToday(){
  const p=plan(), dl=daysLeft(), st=streak(), errs=errorIds().length;
  const d=new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
  const total=p.cards.length+p.qs.length+p.errs.length, allDone=p.done.all;
  const mins=Math.max(5,Math.round((p.cards.length*0.5+p.qs.length*0.8+p.errs.length*0.9)));
  const row=(n,l,k)=>`<li class="${p.done[k]?"done":""}"><span class="n">${n}</span><span class="grow">${l}</span>${p.done[k]?I.ok.replace("<svg",'<svg class="check"'):""}</li>`;
  let focus="";
  if(dl!=null&&dl>=0&&dl<=21){const weak=ORDER.slice().sort((a,b)=>(themeStats(a).mastery-THEMES[a].w/40)-(themeStats(b).mastery-THEMES[b].w/40)).slice(0,2);
    focus=`<p class="small muted" style="margin:12px 0 0">Séance renforcée. Priorité : ${weak.map(t=>THEMES[t].s.toLowerCase()).join(", puis ")}.</p>`;}
  return header("Aujourd’hui")+`<main class="wrap">
    <p class="date">${esc(d.charAt(0).toUpperCase()+d.slice(1))}.${st?` Série de ${st} jour${st>1?"s":""}.`:""}${dl!=null&&dl>=0?` Examen dans ${dl} jour${dl>1?"s":""}.`:""}</p>
    <h2 class="lead" style="margin-top:6px">${allDone?"Séance du jour terminée.":`Environ ${mins} minutes pour avancer aujourd’hui.`}</h2>
    <section class="panel"><ul class="plan">${row(p.cards.length,"fiches à découvrir ou revoir","cards")}${row(p.qs.length,"questions d’entraînement","qs")}${row(p.errs.length,p.errs.length>1?"erreurs à corriger":p.errs.length===1?"erreur à corriger":"erreur en attente","errs")}</ul>${focus}
      <div style="margin-top:14px" class="stack"><button class="btn primary" data-act="startDaily" ${total?"":"disabled"}>${allDone?"Refaire une séance":p.done.cards||p.done.qs?"Reprendre la séance":"Commencer la séance"}</button>
      <button class="btn ghost small" style="width:100%" data-act="reroll">Nouvelle sélection</button></div></section>
    <h2>Préparation</h2>${readinessBlock()}
    <h2>Raccourcis</h2>
    <div class="list">
      <button class="li" data-act="quick5"><span class="grow"><b>Révision 5 minutes</b><br><span class="sub">Ce qui compte le plus pour vous, maintenant</span></span>${I.chev}</button>
      <button class="li" data-act="go" data-v="errors"><span class="grow"><b>Mes erreurs</b><br><span class="sub">${errs?errs+" à corriger":"Aucune erreur en attente"}</span></span>${I.chev}</button>
      <button class="li" data-act="go" data-v="exam"><span class="grow"><b>Examen blanc</b><br><span class="sub">40 questions en 45 minutes</span></span>${I.chev}</button>
    </div></main>`+tabs();
}

// ───────── Apprendre ─────────
function vLearn(){
  return header("Apprendre")+`<main class="wrap"><p class="muted" style="margin-top:4px">Les cinq thèmes officiels, avec leur poids dans les 40 questions de l’examen.</p>
   <div class="list">${ORDER.map(t=>{const s=themeStats(t),nc=Cs.filter(c=>c.t===t).length;return `<button class="li" data-act="theme" data-v="${t}"><span class="grow"><b>${THEMES[t].n}</b><br><span class="sub">${THEMES[t].w} questions à l’examen${THEMES[t].sit?`, dont ${THEMES[t].sit} mises en situation`:""}, ${nc} fiches, ${s.total} questions</span><div class="bar ${s.mastery<.4&&s.seen?"weak":""}"><b style="width:${pct(s.mastery)}%"></b></div></span>${I.chev}</button>`;}).join("")}</div>
   <h2>Toutes les fiches</h2><button class="btn" data-act="cardsAll">Réviser les fiches à revoir</button></main>`+tabs();
}
function vTheme(){
  const t=V.theme, th=THEMES[t], s=themeStats(t), cards=Cs.filter(c=>c.t===t);
  return header(th.s,{back:"learn"})+`<main class="wrap">
    <h2 class="lead" style="margin-top:8px">${th.n}</h2>
    <p class="muted">${th.w} questions sur 40 à l’examen : ${SUBS[t].map(([n,k])=>SUBNAME[n].toLowerCase()+" "+k).join(", ")}. Maîtrise : ${pct(s.mastery)} %${s.acc!=null?`, réussite ${pct(s.acc)} %`:""}.</p>
    <div class="stack"><button class="btn primary" data-act="themeCards" data-v="${t}">Fiches du thème</button><button class="btn" data-act="themeQuiz" data-v="${t}">Quiz du thème, 10 questions</button></div>
    <h2>Fiches</h2><div class="panel" style="padding:4px 18px">${cards.map(c=>`<details class="acc"><summary><span class="row"><span class="grow">${esc(c.f)}<br><span class="small muted" style="font-weight:400">${esc(c.cat)}</span></span>${favBtn(c.id)}</span></summary><div style="padding-bottom:12px">${cardBody(c,true)}</div></details>`).join("")}</div></main>`+tabs();
}
function favBtn(id){return `<button class="ibtn star" data-act="fav" data-v="${id}" aria-pressed="${!!S.fav[id]}" aria-label="${S.fav[id]?"Retirer des favoris":"Ajouter aux favoris"}">${I.star}</button>`;}

// ───────── S'entraîner ─────────
V.cfg={size:10,themes:[],diff:0,kind:"all",pool:"all"};
function vPractice(){
  const c=V.cfg;
  const seg=(key,opts)=>`<div class="seg" role="group">${opts.map(([v,l])=>`<button data-act="cfg" data-k="${key}" data-v="${v}" aria-pressed="${String(c[key])===String(v)}">${l}</button>`).join("")}</div>`;
  const avail=filterPool().length;
  return header("S’entraîner")+`<main class="wrap">
    <h2 style="margin-top:8px">Nombre de questions</h2>
    ${seg("size",[[5,"5"],[10,"10"],[20,"20"],[40,"40"],[100,"100"]])}
    <p class="small muted" style="margin:8px 0 0">${{5:"Quiz express",10:"Session rapide",20:"Session standard",40:"Entraînement long",100:"Marathon"}[c.size]}. Correction immédiate après chaque réponse.</p>
    <h2>Thèmes</h2><div class="chips">${ORDER.map(t=>`<button class="chip" data-act="cfgTheme" data-v="${t}" aria-pressed="${c.themes.includes(t)}">${THEMES[t].s}</button>`).join("")}</div>
    <p class="small muted" style="margin:8px 0 0">${c.themes.length?"":"Aucun thème choisi : tous les thèmes."}</p>
    <h2>Questions</h2>${seg("pool",[["all","Toutes"],["new","Jamais vues"],["err","Erreurs"],["fav","Favoris"]])}
    <h2>Type</h2>${seg("kind",[["all","Tous"],["o","Officiels"],["s","Situations"]])}
    <h2>Difficulté</h2>${seg("diff",[[0,"Toutes"],[1,"Facile"],[2,"Moyen"],[3,"Difficile"]])}
    <p class="muted small" style="margin-top:18px">${avail} question${avail>1?"s":""} disponible${avail>1?"s":""} avec ces filtres.</p>
    <button class="btn primary" data-act="startQuiz" ${avail?"":"disabled"}>Lancer ${Math.min(c.size,avail)||""} question${Math.min(c.size,avail)>1?"s":""}</button></main>`+tabs();
}
function filterPool(){
  const c=V.cfg, err=new Set(errorIds());
  return Qs.filter(q=>(!c.themes.length||c.themes.includes(q.t))&&(!+c.diff||q.d===+c.diff)&&(c.kind==="all"||q.k===c.kind)&&
    (c.pool==="all"||(c.pool==="new"&&!(S.it[q.id]&&S.it[q.id].n))||(c.pool==="err"&&err.has(q.id))||(c.pool==="fav"&&S.fav[q.id])));
}

// ───────── Examen ─────────
function vExamHome(){
  const ex=exams(), last=ex.slice(-5).reverse();
  return header("Examen blanc")+`<main class="wrap">
    <h2 class="lead" style="margin-top:8px">Les conditions de l’épreuve officielle.</h2>
    <section class="panel"><ul class="plan"><li><span class="n">40</span><span class="grow">questions : 28 de connaissance et 12 mises en situation</span></li><li><span class="n">45</span><span class="grow">minutes, chronomètre visible</span></li><li><span class="n">32</span><span class="grow">bonnes réponses nécessaires, soit 80 %</span></li></ul>
    <details class="acc" style="margin-top:8px"><summary class="small">Répartition officielle par notion</summary>${ORDER.map(t=>`<p class="small" style="margin:0 0 8px"><b>${THEMES[t].s} (${THEMES[t].w})</b> : ${SUBS[t].map(([n,k])=>SUBNAME[n].toLowerCase()+" "+k).join(", ")}</p>`).join("")}</details><p class="small muted" style="margin:6px 0 0">Les 28 questions de connaissance viennent de la liste officielle, comme le jour de l’examen. Pas de correction avant la fin ; vous pouvez revenir sur une question.</p></section>
    <div style="margin-top:14px"><button class="btn primary" data-act="startExam">Commencer l’examen blanc</button></div>
    <h2>Examens précédents</h2>${last.length?`<div class="list">${last.map(e=>`<div class="li"><span class="grow"><b>${e.c} / ${e.n}</b> <span class="badge ${e.c>=EXAM.pass?"o":""}">${e.c>=EXAM.pass?"Réussi":"Non réussi"}</span><br><span class="sub">${new Date(e.ts).toLocaleDateString("fr-FR",{day:"numeric",month:"long"})}, ${Math.round(e.dur/60)} min</span></span></div>`).join("")}</div>`:`<p class="muted">Aucun examen blanc pour l’instant.</p>`}
    <p class="small muted" style="margin-top:18px">Les 12 mises en situation officielles ne sont pas publiées. Celles de l’application sont des exercices d’entraînement rédigés d’après le programme.</p></main>`+tabs();
}
function buildExam(){
  // Connaissances : uniquement la liste officielle publiée. Situations : exercices d’entraînement.
  const ids=[];
  ORDER.forEach(t=>SUBS[t].forEach(([n,k])=>{
    const pool=Qs.filter(q=>q.t===t&&q.n===n&&(n==="sit"?q.k==="s":q.k==="o"));
    shuffle(pool).slice(0,k).forEach(q=>ids.push(q.id));
  }));
  return shuffle(ids);
}
function startExam(){
  const ids=buildExam(), ord={}; ids.forEach(id=>ord[id]=shuffle([0,1,2,3]));
  lastKey=null; SES={kind:"exam",ids,ord,ans:{},cur:0,start:now(),end:now()+EXAM.min*60000,done:false};
  S.exam=SES; save(); render();
}
function startTimer(){
  const tick=()=>{const el=document.getElementById("timer"); if(!SES||SES.kind!=="exam"||SES.done){clearInterval(timerI);return;}
    const left=Math.max(0,SES.end-now()); if(left<=0){clearInterval(timerI);submitExam(true);return;}
    if(el){const m=Math.floor(left/60000),s=Math.floor(left%60000/1000);el.textContent=pad(m)+":"+pad(s);el.classList.toggle("low",left<5*60000);}};
  tick(); timerI=setInterval(tick,1000);
}
function submitExam(auto){
  const E=SES; let c=0; const th={}; const wrong=[];
  E.ids.forEach(id=>{const q=QM[id], a=E.ans[id], ok=a===0; if(ok)c++; th[q.t]=th[q.t]||[0,0]; th[q.t][1]++; if(ok)th[q.t][0]++; if(!ok)wrong.push(id); grade(id,ok,a==null?-1:a);});
  const dur=Math.min(now(),E.end)-E.start, prev=exams().slice(-1)[0];
  S.hist.push({ts:now(),type:"exam",label:"Examen blanc",c,n:E.ids.length,dur,th});
  E.done=true; E.res={c,n:E.ids.length,th,wrong,dur,prev:prev?prev.c:null,auto:!!auto};
  S.exam=null; save(); render();
}
function vExam(){
  const E=SES;
  if(E.done) return vExamResult();
  const id=E.ids[E.cur], q=QM[id], ord=E.ord[id], a=E.ans[id], answered=Object.keys(E.ans).length;
  return `<header class="ses-top"><div class="top-in"><button class="ibtn" data-act="examGrid" aria-label="Vue d’ensemble des questions">${I.grid}</button><h1>Question ${E.cur+1} / ${E.ids.length}</h1><span class="timer" id="timer" aria-label="Temps restant">45:00</span></div><div class="prog"><b style="width:${answered/E.ids.length*100}%"></b></div></header>
  <main class="wrap"><div class="meta"></div>
  <p class="qtext">${esc(q.q)}</p>
  <div class="opts" role="radiogroup">${ord.map((oi,i)=>`<button class="opt ${a===oi?"sel":""}" role="radio" aria-checked="${a===oi}" data-act="examPick" data-v="${oi}"><span class="L">${LETTERS[i]}</span><span>${esc(q.a[oi])}</span></button>`).join("")}</div>
  <p class="small muted" style="margin-top:14px">${answered} répondue${answered>1?"s":""} sur ${E.ids.length}. Vous pouvez modifier une réponse jusqu’à la fin.</p></main>
  <div class="dock"><div class="dock-in"><button class="btn" data-act="examNav" data-v="-1" ${E.cur?"":"disabled"}>Précédente</button>${E.cur<E.ids.length-1?`<button class="btn primary" data-act="examNav" data-v="1">Suivante</button>`:`<button class="btn primary" data-act="examGrid">Terminer</button>`}</div></div>`;
}
function examGridSheet(){
  const E=SES, un=E.ids.length-Object.keys(E.ans).length;
  document.getElementById("sheet").innerHTML=`<div class="sheet" data-act="closeSheet"><div class="sheet-in" role="dialog" aria-label="Vue d’ensemble" data-stop="1">
    <div class="row" style="margin-bottom:14px"><h2 class="grow" style="margin:0">Vue d’ensemble</h2><button class="ibtn" data-act="closeSheet" aria-label="Fermer">${I.close}</button></div>
    <div class="grid">${E.ids.map((id,i)=>`<button class="cell ${E.ans[id]!=null?"a":""} ${i===E.cur?"cur":""}" data-act="examJump" data-v="${i}" aria-label="Question ${i+1}${E.ans[id]!=null?", répondue":", sans réponse"}">${i+1}</button>`).join("")}</div>
    <p style="margin:16px 0">${un?`<b>${un} question${un>1?"s":""} sans réponse.</b> Une question sans réponse compte comme fausse.`:"Toutes les questions ont une réponse."}</p>
    <button class="btn primary" data-act="examSubmit">Terminer l’examen</button></div></div>`;
}
function vExamResult(){
  const R=SES.res, ok=R.c>=EXAM.pass, diff=R.prev==null?"":R.c-R.prev;
  return `<header class="ses-top"><div class="top-in"><h1>Résultat</h1><button class="ibtn" data-act="endSession" aria-label="Fermer">${I.close}</button></div></header>
  <main class="wrap"><section class="panel result"><div class="big">${R.c} / ${R.n}</div><div class="muted" style="margin-top:6px">${pct(R.c/R.n)} %, ${Math.round(R.dur/60000)} min${R.auto?", temps écoulé":""}</div>
   <div class="verdict ${ok?"ok":"ko"}">${ok?I.ok.replace("<svg",'<svg width="20" height="20"')+"Réussi":"Non réussi : "+EXAM.pass+" requis"}</div>
   ${diff!==""?`<p class="small muted" style="margin:12px 0 0">${diff>0?"+"+diff:diff} par rapport à l’examen précédent.</p>`:""}</section>
   <h2>Par thème</h2><section class="panel" style="padding:6px 18px">${ORDER.map(t=>{const v=R.th[t]||[0,0];const r=v[1]?v[0]/v[1]:0;return `<div class="tb"><div class="row"><span class="grow">${THEMES[t].s}</span><b>${v[0]} / ${v[1]}</b></div><div class="bar ${r<.8?"weak":""}"><b style="width:${pct(r)}%"></b></div></div>`;}).join("")}</section>
   <h2>Erreurs (${R.wrong.length})</h2>${R.wrong.length?`<section class="panel" style="padding:4px 18px">${R.wrong.map(id=>errRow(id,SES.ans[id])).join("")}</section>
   <div style="margin-top:14px" class="stack"><button class="btn primary" data-act="quizIds" data-v="${R.wrong.join(",")}">Réviser ces erreurs</button></div>`:`<p class="muted">Aucune erreur.</p>`}
   <div style="margin-top:12px"><button class="btn" data-act="endSession">Retour</button></div></main>`;
}
function errRow(id,ans){const q=QM[id];return `<div class="err"><div class="q">${esc(q.q)}</div>${ans!=null&&ans>=0&&ans!==0?`<div class="you small">Votre réponse : ${esc(q.a[ans])}</div>`:ans==null||ans<0?`<div class="you small">Sans réponse</div>`:""}<div class="good small"><b>Bonne réponse : ${esc(q.a[0])}</b></div>${q.x?`<p class="small muted" style="margin:6px 0 0">${esc(q.x)}</p>`:""}</div>`;}

// ───────── Séances (quiz, fiches, séance du jour) ─────────
function newSession(kind,title,steps){lastKey=null; SES={kind,title,steps:steps.filter(s=>s.ids.length),si:0,qi:0,res:{c:0,n:0,wrong:[]},start:now(),ans:null,ord:null,flip:false,retried:{}}; if(!SES.steps.length){SES=null;toast("Rien à réviser pour l’instant.");return render();} prep(); render();}
function prep(){const st=SES.steps[SES.si]; if(!st)return; const id=st.ids[SES.qi]; SES.ans=null; SES.flip=false; SES.more=false; SES.pending=false; if(st.type==="quiz")SES.ord=shuffle([0,1,2,3]);}
function curId(){const st=SES.steps[SES.si];return st&&st.ids[SES.qi];}
function totalItems(){return SES.steps.reduce((a,s)=>a+s.ids.length,0);}
function doneItems(){let n=0;for(let i=0;i<SES.si;i++)n+=SES.steps[i].ids.length;return n+SES.qi;}
function vSession(){
  if(SES.kind==="exam") return vExam();
  if(SES.done) return vSummary();
  const st=SES.steps[SES.si], id=curId(), p=doneItems()/totalItems()*100;
  const head=`<header class="ses-top"><div class="top-in"><button class="ibtn" data-act="quit" aria-label="Quitter la séance">${I.close}</button><h1>${esc(st.label||SES.title)}</h1><span class="muted small">${SES.qi+1} / ${st.ids.length}</span></div><div class="prog"><b style="width:${p}%"></b></div></header>`;
  return head+(st.type==="cards"?vCard(id):vQuestion(id));
}
function cardBody(c, more, compact){
  const facts=`<dl class="facts">${c.facts.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`;
  const det=`<div class="more">${c.more?`<p>${esc(c.more)}</p>`:""}${c.trap?`<div class="trap"><b>Piège fréquent</b><br>${esc(c.trap)}</div>`:""}</div>`;
  return `<p class="sum">${esc(c.sum)}</p>${facts}${compact?"":more?det:`<button class="link more-btn" data-act="more">En savoir plus</button>`}`;
}
function vCard(id){
  const c=CM[id], r=S.it[id], isNew=(!r||!r.n||SES.pending&&r.n===1), show=isNew||SES.flip;
  let dock;
  if(!show) dock=`<button class="btn primary" data-act="flip">Afficher la fiche</button>`;
  else if(SES.pending) dock=`<button class="btn primary" data-act="cardContinue">Continuer</button>`;
  else dock=`<div class="grade"><button class="btn" data-act="cardGrade" data-v="no">Je ne sais pas<small>aujourd’hui</small></button><button class="btn" data-act="cardGrade" data-v="again">À revoir<small>demain</small></button><button class="btn primary" data-act="cardGrade" data-v="yes">Je connais<small>plus tard</small></button></div>`;
  return `<main class="wrap"><div class="meta"><span>${THEMES[c.t].s}</span>${isNew?`<span class="new">Nouvelle fiche</span>`:""}<span class="grow"></span>${favBtn(id)}</div>
   <article class="card"><div class="cat">${esc(c.cat)}</div><h2 class="front">${esc(c.f)}</h2>
   ${show?cardBody(c,SES.more):`<p class="muted">Avant de retourner la fiche, essayez de vous rappeler l’essentiel.</p>`}
   ${SES.pending?`<p class="small" style="margin:14px 0 0;color:var(--ink2)">Cette fiche reviendra à la fin de la séance.</p>`:""}</article></main>
   <div class="dock"><div class="dock-in">${dock}</div></div>`;
}
function vQuestion(id){
  const q=QM[id], a=SES.ans, done=a!=null, ok=a===0, retry=!!SES.retried[id]&&(a==null||SES.retried[id]===3);
  const opts=SES.ord.map((oi,i)=>{let cls=""; if(done){ if(oi===0)cls="ok"; else if(oi===a)cls="ko"; else cls="dim"; }
    return `<button class="opt ${cls}" data-act="answer" data-v="${oi}" ${done?"disabled":""}><span class="L">${LETTERS[i]}</span><span>${esc(q.a[oi])}</span></button>`;}).join("");
  const fb=done?`<section class="fb" role="status"><div class="v ${ok?"ok":"ko"}">${ok?I.ok:I.ko}${ok?"Correct":"Faux"}</div>${ok?"":`<p><b>Bonne réponse : ${esc(q.a[0])}</b></p>`}${q.x?`<p class="muted" style="margin:0">${esc(q.x)}</p>`:""}${q.m?`<div class="memo">À retenir : ${esc(q.m)}</div>`:""}</section>`:"";
  return `<main class="wrap"><div class="meta"><div class="metaL"><span class="badge ${q.k}">${KIND[q.k]}</span><span>${THEMES[q.t].s}${q.n&&q.n!=="sit"?", "+SUBNAME[q.n].toLowerCase():""}</span><span class="dots" aria-label="Difficulté ${q.d} sur 3">${"●".repeat(q.d)}${"○".repeat(3-q.d)}</span>${retry?`<span class="new">Deuxième essai</span>`:""}</div>${favBtn(id)}</div>
   <p class="qtext">${esc(q.q)}</p><div class="opts">${opts}</div>${fb}</main>
   ${done?`<div class="dock"><div class="dock-in"><button class="btn primary" data-act="next" id="nextBtn">${isLast()?"Voir le bilan":"Question suivante"}</button></div></div>`:""}`;
}
function isLast(){const st=SES.steps[SES.si];return SES.si===SES.steps.length-1&&SES.qi===st.ids.length-1;}
function advance(){
  const st=SES.steps[SES.si];
  if(SES.qi<st.ids.length-1){SES.qi++;}
  else { if(SES.planKey){S.plan.done[st.key]=true;} SES.si++; SES.qi=0; if(SES.si>=SES.steps.length){finishSession();return;} }
  prep(); render();
}
function finishSession(){
  SES.done=true;
  if(SES.planKey){S.plan.done.all=true;}
  if(SES.res.n||SES.cardsSeen) S.hist.push({ts:now(),type:SES.kind,label:SES.title,c:SES.res.c,n:SES.res.n,cards:SES.cardsSeen||0,dur:now()-SES.start});
  save(); render();
}
function vSummary(){
  const R=SES.res, w=[...new Set(R.wrong)];
  return `<header class="ses-top"><div class="top-in"><h1>Bilan</h1><button class="ibtn" data-act="endSession" aria-label="Fermer">${I.close}</button></div></header>
  <main class="wrap"><section class="panel result">${R.n?`<div class="big">${R.c} / ${R.n}</div><div class="muted" style="margin-top:6px">${pct(R.c/R.n)} % de bonnes réponses au premier essai</div>`:`<div class="big">${SES.cardsSeen||0}</div><div class="muted">fiches revues</div>`}
   ${SES.cardsSeen&&R.n?`<p class="small muted" style="margin:10px 0 0">et ${SES.cardsSeen} fiche${SES.cardsSeen>1?"s":""} revue${SES.cardsSeen>1?"s":""}</p>`:""}</section>
   ${w.length?`<h2>À retravailler</h2><section class="panel" style="padding:4px 18px">${w.map(id=>errRow(id,S.it[id]&&S.it[id].la)).join("")}</section>
   <p class="small muted" style="margin-top:10px">Ces questions reviendront demain, puis à intervalles croissants tant que vous répondez juste.</p>`:""}
   <div style="margin-top:14px" class="stack"><button class="btn primary" data-act="endSession">Terminer</button></div></main>`;
}
function startDaily(){
  const p=plan(), steps=[];
  if(!p.done.cards||p.done.all)steps.push({type:"cards",ids:p.cards.slice(),label:"Fiches du jour",key:"cards"});
  if(!p.done.qs||p.done.all)steps.push({type:"quiz",ids:p.qs.slice(),label:"Questions du jour",key:"qs"});
  if(!p.done.errs||p.done.all)steps.push({type:"quiz",ids:p.errs.slice(),label:"Mes erreurs",key:"errs"});
  if(p.done.all){p.done={};}
  newSession("daily","Séance du jour",steps); if(SES)SES.planKey=true;
}
function quiz(ids,title){newSession("quiz",title||"Entraînement",[{type:"quiz",ids,label:title||"Entraînement"}]);}

// ───────── Progrès ─────────
function vProgress(){
  const k=counts(), ex=exams(), ok=ex.filter(e=>e.c>=EXAM.pass).length, tot=Qs.length;
  const time=S.hist.reduce((a,h)=>a+(h.dur||0),0), ret=S.ret.n>=10?pct(S.ret.ok/S.ret.n)+" %":"—";
  return header("Progrès")+`<main class="wrap"><div style="margin-top:8px">${readinessBlock()}</div>
   <h2>Mémoire</h2><section class="panel"><div class="mem" role="img" aria-label="Répartition des questions">${[["m1",k.mastered],["m2",k.fragile],["m3",k.due]].map(([c,v])=>`<span class="${c}" style="width:${v/tot*100}%"></span>`).join("")}</div>
   <div class="legend"><span><i style="background:var(--green)"></i>Maîtrisées ${k.mastered}</span><span><i style="background:var(--blue)"></i>En cours ${k.fragile}</span><span><i style="background:var(--amber)"></i>À revoir ${k.due}</span><span><i style="background:var(--sunk)"></i>Jamais vues ${k.new}</span></div>
   <p class="small muted" style="margin:10px 0 0">Maîtrisée : réponse juste à plusieurs jours d’intervalle. Une seule bonne réponse ne suffit pas.</p></section>
   <div class="stats" style="margin-top:12px"><div class="stat"><b>${k.answered}</b><span>réponses données</span></div><div class="stat"><b>${k.answered?pct(k.correct/k.answered):0} %</b><span>bonnes réponses</span></div><div class="stat"><b>${ok} / ${ex.length}</b><span>examens blancs réussis</span></div><div class="stat"><b>${ret}</b><span>rétention après 7 jours</span></div><div class="stat"><b>${streak()}</b><span>jours de série</span></div><div class="stat"><b>${Math.round(time/60000)}</b><span>minutes d’étude</span></div></div>
   <h2>Par thème</h2><section class="panel" style="padding:6px 18px">${ORDER.map(t=>{const s=themeStats(t);return `<div class="tb"><div class="row"><span class="grow"><b>${THEMES[t].s}</b><br><span class="small muted">${s.seen}/${s.total} vues${s.acc!=null?`, réussite ${pct(s.acc)} %`:""}</span></span><b>${pct(s.mastery)} %</b></div><div class="bar ${s.mastery<.4&&s.seen?"weak":""}"><b style="width:${pct(s.mastery)}%"></b></div></div>`;}).join("")}</section>
   <div class="list" style="margin-top:18px"><button class="li" data-act="go" data-v="errors"><span class="grow"><b>Mes erreurs</b></span>${I.chev}</button><button class="li" data-act="go" data-v="favs"><span class="grow"><b>Mes favoris</b></span>${I.chev}</button><button class="li" data-act="go" data-v="history"><span class="grow"><b>Historique</b></span>${I.chev}</button></div></main>`+tabs();
}
function vErrors(){
  const all=Qs.filter(q=>S.it[q.id]&&S.it[q.id].w>0), open=all.filter(q=>S.it[q.id].st<3).sort((a,b)=>(S.it[b.id].w-S.it[b.id].c)-(S.it[a.id].w-S.it[a.id].c)), solved=all.filter(q=>S.it[q.id].st>=3);
  const row=q=>{const r=S.it[q.id];return `<div class="err"><div class="q">${esc(q.q)}</div>${r.la!=null&&r.la>0?`<div class="you small">Dernière erreur : ${esc(q.a[r.la])}</div>`:""}<div class="good small"><b>${esc(q.a[0])}</b></div><div class="small muted">${r.w} erreur${r.w>1?"s":""}, ${r.c} bonne${r.c>1?"s":""} réponse${r.c>1?"s":""}, dernière fois le ${new Date(r.last).toLocaleDateString("fr-FR")}</div></div>`;};
  return header("Mes erreurs",{back:"progress"})+`<main class="wrap">${open.length?`<p class="muted" style="margin-top:8px">Une erreur sort de cette liste quand vous répondez juste plusieurs jours de suite.</p><button class="btn primary" data-act="quizErrors">Réviser mes erreurs (${Math.min(20,open.length)})</button>
   <h2>À corriger (${open.length})</h2><section class="panel" style="padding:4px 18px">${open.map(row).join("")}</section>`:`<div class="empty">Aucune erreur en attente.</div>`}
   ${solved.length?`<h2>Corrigées (${solved.length})</h2><section class="panel" style="padding:4px 18px">${solved.map(row).join("")}</section>`:""}</main>`+tabs();
}
function vFavs(){
  const fq=Qs.filter(q=>S.fav[q.id]), fc=Cs.filter(c=>S.fav[c.id]);
  return header("Mes favoris",{back:"progress"})+`<main class="wrap">${!fq.length&&!fc.length?`<div class="empty">Touchez l’étoile d’une question ou d’une fiche pour la retrouver ici.</div>`:""}
   ${fq.length?`<h2>Questions (${fq.length})</h2><button class="btn" data-act="quizIds" data-v="${fq.map(q=>q.id).join(",")}">M’entraîner sur ces questions</button><section class="panel" style="padding:4px 18px;margin-top:12px">${fq.map(q=>`<div class="err row"><div class="grow"><div class="q">${esc(q.q)}</div><div class="good small"><b>${esc(q.a[0])}</b></div></div>${favBtn(q.id)}</div>`).join("")}</section>`:""}
   ${fc.length?`<h2>Fiches (${fc.length})</h2><section class="panel" style="padding:4px 18px">${fc.map(c=>`<div class="err row"><div class="grow"><div class="q">${esc(c.f)}</div>${cardBody(c,false,true)}</div>${favBtn(c.id)}</div>`).join("")}</section>`:""}</main>`+tabs();
}
function vHistory(){
  const h=S.hist.slice().reverse().slice(0,60); const lbl={daily:"Séance du jour",quiz:"Entraînement",exam:"Examen blanc",cards:"Fiches",quick:"Révision 5 minutes"};
  return header("Historique",{back:"progress"})+`<main class="wrap">${h.length?`<div class="list" style="margin-top:8px">${h.map(e=>`<div class="li"><span class="grow"><b>${esc(lbl[e.type]||e.label)}</b><br><span class="sub">${new Date(e.ts).toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"long"})}, ${e.n?e.n+" questions":""}${e.n&&e.cards?", ":""}${e.cards?e.cards+" fiches":""}</span></span>${e.n?`<b>${e.c}/${e.n}</b>`:""}</div>`).join("")}</div>`:`<div class="empty">Votre historique apparaîtra ici.</div>`}</main>`+tabs();
}

// ───────── Recherche ─────────
V.q="";
function vSearch(){
  const q=norm(V.q.trim()); let res="";
  if(q.length>=2){
    const words=q.split(/\s+/);
    const hit=t=>{const n=norm(t);return words.every(w=>n.includes(w));};
    const cs=Cs.filter(c=>hit(cardText(c))).slice(0,20);
    const qs=Qs.filter(x=>hit(x.q+" "+x.a[0]+" "+x.x+" "+x.m)).slice(0,40);
    res=(!cs.length&&!qs.length)?`<div class="empty">Aucun résultat pour « ${esc(V.q)} ». Essayez un mot plus court ou sans accent.</div>`:
      (cs.length?`<h2>Fiches (${cs.length})</h2><section class="panel" style="padding:4px 18px">${cs.map(c=>`<div class="err row"><div class="grow"><div class="q">${hl(c.f,words)}</div><p class="small" style="margin:0 0 4px">${hl(c.sum,words)}</p><p class="small muted" style="margin:0">${c.facts.map(f=>hl(f[0]+" : "+f[1],words)).join(". ")}.</p></div>${favBtn(c.id)}</div>`).join("")}</section>`:"")+
      (qs.length?`<h2>Questions (${qs.length})</h2><section class="panel" style="padding:4px 18px">${qs.map(x=>`<div class="err row"><div class="grow"><div class="q">${hl(x.q,words)}</div><div class="good small"><b>${hl(x.a[0],words)}</b></div>${x.x?`<p class="small muted" style="margin:4px 0 0">${hl(x.x,words)}</p>`:""}</div>${favBtn(x.id)}</div>`).join("")}</section>`:"");
  } else res=`<p class="muted small" style="margin-top:12px">Exemples : Sénat, 1789, laïcité, préfet, sécurité sociale.</p>`;
  return header("Rechercher",{back:V.from||"today",plain:true})+`<main class="wrap"><div class="field" style="margin-top:6px"><label class="sr" for="q">Rechercher</label><input id="q" class="input" type="search" placeholder="Sénat, 1789, laïcité…" value="${esc(V.q)}" data-act-input="search" autocomplete="off"></div><div id="sres">${res}</div></main>`;
}
function hl(t,words){let s=esc(t);const n=norm(t);const marks=[];words.forEach(w=>{let i=n.indexOf(w);while(i>=0&&w){marks.push([i,i+w.length]);i=n.indexOf(w,i+w.length);}});
  if(!marks.length)return s; marks.sort((a,b)=>a[0]-b[0]); let out="",p=0; marks.forEach(([a,b])=>{if(a<p)return; out+=esc(t.slice(p,a))+"<mark>"+esc(t.slice(a,b))+"</mark>"; p=b;}); return out+esc(t.slice(p));}

// ───────── Réglages ─────────
function vSettings(){
  const seg=(act,opts,cur)=>`<div class="seg" role="group">${opts.map(([v,l])=>`<button data-act="${act}" data-v="${v}" aria-pressed="${String(cur)===String(v)}">${l}</button>`).join("")}</div>`;
  return header("Réglages",{back:V.from||"today",plain:true})+`<main class="wrap">
   <h2 style="margin-top:8px">Apparence</h2>${seg("setTheme",[["system","Système"],["light","Clair"],["dark","Sombre"]],S.set.theme)}
   <h2>Taille du texte</h2>${seg("setFs",[[90,"A−"],[100,"A"],[115,"A+"],[130,"A++"]],S.set.fs)}
   <h2>Mon examen</h2><div class="field"><label for="ed2">Date prévue (facultatif)</label><input id="ed2" class="input" type="date" value="${S.examDate||""}" data-act-change="examDate"></div>
   ${S.examDate?`<button class="link" data-act="clearDate">Retirer la date</button>`:""}
   <h2>Mes données</h2><div class="list"><button class="li" data-act="go" data-v="backup"><span class="grow"><b>Sauvegarder ou restaurer</b><br><span class="sub">Fichier local, sans compte ni cloud</span></span>${I.chev}</button><button class="li" data-act="go" data-v="about"><span class="grow"><b>À propos et sources</b></span>${I.chev}</button></div>
   <div style="margin-top:22px"><button class="btn ghost" style="color:var(--red)" data-act="reset">Effacer toute ma progression</button></div>
   <p class="small muted" style="margin-top:22px">Prototype HTML, contenu vérifié : ${Qs.length} questions, ${Cs.length} fiches.</p></main>`;
}
function vBackup(){
  return header("Sauvegarde",{back:"settings",plain:true})+`<main class="wrap"><p class="muted" style="margin-top:8px">Votre progression est enregistrée uniquement sur cet appareil. Copiez ce texte pour la conserver ou la transférer.</p>
   <textarea id="bk" class="input" readonly>${esc(JSON.stringify(S))}</textarea><div style="margin-top:10px" class="stack">${window.AndroidBridge?`<button class="btn primary" data-act="shareBk">Envoyer vers Drive, e-mail…</button>`:""}<button class="btn" data-act="copyBk">Copier la sauvegarde</button></div>
   <h2>Restaurer</h2><p class="muted small">Collez une sauvegarde ou choisissez un fichier. Votre progression actuelle sera remplacée.</p>
   <textarea id="rs" class="input" placeholder="Collez la sauvegarde ici"></textarea><input id="rf" type="file" accept="application/json,.json,.txt" class="input" style="margin-top:10px;padding-top:12px" data-act-change="restoreFile">
   <div style="margin-top:10px"><button class="btn primary" data-act="restore">Restaurer</button></div></main>`;
}
function vAbout(){
  const o=Qs.filter(q=>q.k==="o").length, s=Qs.filter(q=>q.k==="s").length, e=Qs.filter(q=>q.k==="e").length;
  return header("À propos",{back:"settings",plain:true})+`<main class="wrap"><h2 style="margin-top:8px">Nature des questions</h2>
   <p><span class="badge o">Énoncé officiel</span> ${o} questions couvrent les 258 énoncés de la liste officielle des questions de connaissance (mention naturalisation, DGEF, publiée le 12 janvier 2026) ; tous ont été vérifiés un par un. Les quatre propositions et les explications sont rédigées pour l’entraînement : les réponses officielles ne sont pas publiées.</p>
   <p><span class="badge s">Mise en situation</span> ${s} mises en situation d’entraînement. Les mises en situation officielles ne sont pas publiées.</p>
   <p><span class="badge">Entraînement</span> ${e} questions d’entraînement sur les notions du référentiel officiel (annexe I de l’arrêté) absentes de la liste.</p>
   <h2>Format de l’épreuve</h2><p>40 questions (28 de connaissance, 12 mises en situation), 45 minutes, 32 bonnes réponses requises. La répartition par thème et par notion est fixée par l’arrêté du 10 octobre 2025 ; l’examen blanc la respecte exactement.</p>
   <h2>Sources</h2><ul class="small"><li>DGEF, « Questions de connaissance pour l’examen civique — Nationalité française », immigration.interieur.gouv.fr (licence Etalab 2.0)</li><li>formation-civique.interieur.gouv.fr : programme et fiches thématiques</li><li>Arrêté du 10 octobre 2025 relatif à l’examen civique (Légifrance)</li><li>Livret du citoyen, ministère de l’Intérieur</li></ul>
   <h2>Confidentialité</h2><p>Aucun compte, aucune publicité, aucun traceur. Les données restent dans le stockage privé de l’appareil.</p>
   <p class="small muted">Application indépendante, non affiliée au ministère de l’Intérieur. En cas de doute, la source officielle fait foi.</p></main>`;
}

// ───────── Actions ─────────
const ACT={
  go:el=>{const v=el.dataset.v; if(v==="search"||v==="settings")V.from=["search","settings","backup","about"].includes(V.view)?V.from:V.view; V.view=v; render(); window.scrollTo(0,0);},
  goal:el=>{S.goal=el.dataset.v; save(); render();},
  onbNext:()=>{V.onbStep=1; render();},
  onbDone:()=>{const d=document.getElementById("ed").value; if(d)S.examDate=d; S.onb=true; save(); V.view="today"; render();},
  onbSkip:()=>{S.onb=true; save(); V.view="today"; render();},
  startDaily:()=>startDaily(),
  reroll:()=>{buildPlan(true); toast("Nouvelle sélection prête."); render();},
  quick5:()=>{const e=errorIds().slice(0,3), q=pickQ(8,null,new Set(e)); newSession("quick","Révision 5 minutes",[{type:"cards",ids:pickCards(4),label:"Fiches à revoir"},{type:"quiz",ids:e.concat(q).slice(0,8),label:"Questions prioritaires"}]);},
  theme:el=>{V.theme=el.dataset.v; V.view="theme"; render(); window.scrollTo(0,0);},
  themeCards:el=>{const t=el.dataset.v; newSession("cards","Fiches : "+THEMES[t].s,[{type:"cards",ids:pickCards(12,Cs.filter(c=>c.t===t)),label:"Fiches : "+THEMES[t].s}]);},
  themeQuiz:el=>{const t=el.dataset.v; quiz(pickQ(10,Qs.filter(q=>q.t===t)),"Quiz : "+THEMES[t].s);},
  cardsAll:()=>{newSession("cards","Fiches",[{type:"cards",ids:pickCards(12),label:"Fiches"}]);},
  cfg:el=>{const k=el.dataset.k; V.cfg[k]=k==="size"||k==="diff"?+el.dataset.v:el.dataset.v; render();},
  cfgTheme:el=>{const t=el.dataset.v, a=V.cfg.themes; V.cfg.themes=a.includes(t)?a.filter(x=>x!==t):a.concat(t); render();},
  startQuiz:()=>{const pool=filterPool(); quiz(pickQ(V.cfg.size,pool),{5:"Quiz express",10:"Session rapide",20:"Session standard",40:"Entraînement long",100:"Marathon"}[V.cfg.size]);},
  quizIds:el=>{const ids=el.dataset.v.split(",").filter(Boolean); SES=null; quiz(shuffle(ids),"Révision des erreurs");},
  quizErrors:()=>{const ids=errorIds().sort((a,b)=>S.it[a].due-S.it[b].due).slice(0,20); quiz(shuffle(ids),"Mes erreurs");},
  answer:el=>{
    if(SES.ans!=null)return; const id=curId(), a=+el.dataset.v, ok=a===0; SES.ans=a;
    const first=!SES.retried[id]; if(first){SES.res.n++; if(ok)SES.res.c++; else SES.res.wrong.push(id);}
    grade(id,ok,a);
    if(!ok&&first&&SES.kind!=="exam"){SES.retried[id]=1; SES.steps[SES.steps.length-1].ids.push(id);} else if(SES.retried[id]===1&&!first) SES.retried[id]=3;
    save(); render(); const nb=document.getElementById("nextBtn"); if(nb)nb.focus({preventScroll:true}); const fb=document.querySelector(".fb"); if(fb&&fb.scrollIntoView)fb.scrollIntoView({block:"nearest",behavior:"smooth"});
  },
  next:()=>advance(),
  flip:()=>{SES.flip=true; render();},
  cardGrade:el=>{const v=el.dataset.v, id=curId(), first=!SES.retried[id];
    grade(id,v==="yes"?true:v==="again"?"partial":false); if(first)SES.cardsSeen=(SES.cardsSeen||0)+1;
    if(v==="no"&&first){SES.retried[id]=1; SES.steps[SES.si].ids.push(id);} save();
    if(v==="no"&&!SES.more){SES.more=true; SES.flip=true; SES.pending=true; render(); return;}
    advance();},
  cardContinue:()=>advance(),
  more:()=>{ if(SES){SES.more=true; render();} },
  quit:()=>{ if(SES.res.n||SES.cardsSeen) S.hist.push({ts:now(),type:SES.kind,label:SES.title,c:SES.res.c,n:SES.res.n,cards:SES.cardsSeen||0,dur:now()-SES.start}); SES=null; save(); render(); toast("Séance interrompue. Vos réponses sont enregistrées.");},
  endSession:()=>{SES=null; render();},
  fav:(el,ev)=>{ev.stopPropagation(); ev.preventDefault(); const id=el.dataset.v; if(S.fav[id])delete S.fav[id]; else S.fav[id]=1; save(); el.setAttribute("aria-pressed",!!S.fav[id]); el.setAttribute("aria-label",S.fav[id]?"Retirer des favoris":"Ajouter aux favoris"); if(V.view==="favs"&&!SES)render();},
  startExam:()=>startExam(),
  examPick:el=>{const id=SES.ids[SES.cur]; SES.ans[id]=+el.dataset.v; S.exam=SES; save(); render();},
  examNav:el=>{SES.cur=Math.max(0,Math.min(SES.ids.length-1,SES.cur+ +el.dataset.v)); S.exam=SES; save(); render();},
  examGrid:()=>examGridSheet(),
  examJump:el=>{SES.cur=+el.dataset.v; document.getElementById("sheet").innerHTML=""; S.exam=SES; save(); render();},
  examSubmit:()=>{document.getElementById("sheet").innerHTML=""; submitExam(false);},
  closeSheet:(el,ev)=>{if(ev.target.closest("[data-stop]")&&!el.classList.contains("ibtn"))return; document.getElementById("sheet").innerHTML="";},
  setTheme:el=>{S.set.theme=el.dataset.v; save(); render();},
  setFs:el=>{S.set.fs=+el.dataset.v; save(); render();},
  clearDate:()=>{S.examDate=null; save(); render();},
  reset:el=>{ if(el.dataset.confirm!=="1"){el.dataset.confirm="1"; el.textContent="Confirmer : tout effacer"; return;} const keep=S.set; S=fresh(); S.set=keep; S.onb=true; save(); V.view="today"; render(); toast("Progression effacée.");},
  shareBk:()=>{ try{ window.AndroidBridge.share(JSON.stringify(S)); }catch(e){ toast("Partage indisponible."); } },
  copyBk:()=>{ if(window.AndroidBridge){ try{ window.AndroidBridge.copy(JSON.stringify(S)); toast("Sauvegarde copiée."); return; }catch(e){} } const t=document.getElementById("bk"); t.select(); let ok=false; try{ok=document.execCommand("copy");}catch(e){} if(navigator.clipboard&&!ok){navigator.clipboard.writeText(t.value).then(()=>toast("Sauvegarde copiée."),()=>toast("Sélectionnez le texte et copiez-le."));} else toast(ok?"Sauvegarde copiée.":"Sélectionnez le texte et copiez-le.");},
  restore:()=>restoreFrom(document.getElementById("rs").value)
};
function restoreFrom(txt){try{const s=JSON.parse(txt); if(!s||s.v!==1||typeof s.it!=="object")throw 0; S=Object.assign(fresh(),s); SES=null; save(); V.view="today"; render(); toast("Progression restaurée.");}catch(e){toast("Sauvegarde invalide : vérifiez le texte collé.");}}
document.addEventListener("click",ev=>{const el=ev.target.closest("[data-act]"); if(!el)return; const f=ACT[el.dataset.act]; if(f){ if(el.tagName==="INPUT")return; f(el,ev);} });
document.addEventListener("input",ev=>{const el=ev.target; if(el.dataset.actInput==="search"){V.q=el.value; const box=document.getElementById("sres"); const tmp=document.createElement("div"); tmp.innerHTML=vSearch(); box.innerHTML=tmp.querySelector("#sres").innerHTML;}});
document.addEventListener("change",ev=>{const el=ev.target;
  if(el.dataset.actChange==="examDate"){S.examDate=el.value||null; save(); render();}
  if(el.dataset.actChange==="restoreFile"&&el.files&&el.files[0]){const r=new FileReader(); r.onload=()=>{document.getElementById("rs").value=r.result;}; r.readAsText(el.files[0]);}
});
document.addEventListener("keydown",ev=>{ if(!SES||SES.done)return; const k=ev.key.toUpperCase();
  if(SES.kind==="exam"){ const i=LETTERS.indexOf(k); if(i>=0){const b=document.querySelectorAll(".opt")[i]; if(b)b.click();} return; }
  const st=SES.steps[SES.si]; if(st&&st.type==="quiz"){ const i=LETTERS.indexOf(k); if(i>=0&&SES.ans==null){const b=document.querySelectorAll(".opt")[i]; if(b)b.click();} else if((ev.key==="Enter"||ev.key===" ")&&SES.ans!=null&&document.activeElement.id!=="nextBtn"){ev.preventDefault(); ACT.next();} }});
if(window.matchMedia){const mq=window.matchMedia("(prefers-color-scheme: dark)"); if(mq.addEventListener)mq.addEventListener("change",()=>{if(S.set.theme==="system")applySettings();});}
// Bouton retour Android : navigation interne avant de quitter l’application
window.__back=function(){
  const sh=document.getElementById("sheet"); if(sh&&sh.innerHTML){sh.innerHTML="";return true;}
  if(SES){ if(SES.kind==="exam"&&!SES.done){examGridSheet();return true;} if(SES.done){SES=null;render();return true;} ACT.quit();return true; }
  if(!S.onb){ if(V.onbStep){V.onbStep=0;render();return true;} return false; }
  const up={search:V.from||"today",settings:V.from||"today",backup:"settings",about:"settings",errors:"progress",favs:"progress",history:"progress",theme:"learn"}[V.view];
  if(up){V.view=up;render();window.scrollTo(0,0);return true;}
  if(V.view!=="today"){V.view="today";render();window.scrollTo(0,0);return true;}
  return false;
};
render();
