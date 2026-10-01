const fs=require('fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8').replace(/<link[^>]+fonts[^>]*>/g,'');
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;}else{fail++;console.log('FAIL:',m);}};
let store={};
function boot(){
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://example.test/',pretendToBeVisual:true,
    beforeParse(w){const ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}};
      Object.defineProperty(w,'localStorage',{value:ls}); w.scrollTo=()=>{}; w.matchMedia=()=>({matches:false,addEventListener(){}});}});
  return dom.window;
}
const $=(w,s)=>w.document.querySelector(s), $$=(w,s)=>[...w.document.querySelectorAll(s)];
const click=(w,el)=>{if(!el)throw new Error('no element');el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));};
const act=(w,a,v)=>click(w,$$(w,`[data-act="${a}"]`).find(e=>v==null||e.dataset.v==String(v)));
const txt=w=>w.document.getElementById('app').textContent+w.document.getElementById('sheet').textContent;
const S=w=>w.eval('S'), SES=w=>w.eval('SES');

// 1. Onboarding
let w=boot();
ok(/Quel est votre objectif/.test(txt(w)),'onboarding shown');
ok($(w,'[data-act="onbNext"]').disabled,'continue disabled before goal');
act(w,'goal','prepare'); ok(!$(w,'[data-act="onbNext"]').disabled,'continue enabled');
act(w,'onbNext'); const d=new Date(Date.now()+10*864e5); $(w,'#ed').value=d.toISOString().slice(0,10); act(w,'onbDone');
ok(/Aujourd’hui/.test(txt(w))&&S(w).onb,'today after onboarding');
ok(/Séance renforcée/.test(txt(w)),'intensive mode with exam in 10 days');
const p=S(w).plan; ok(p.cards.length===10&&p.qs.length===20,'intensive plan sizes 10 cards / 20 q');
// reroll gives different questions
const before=new Set(p.qs); act(w,'reroll'); const overlap=S(w).plan.qs.filter(x=>before.has(x)).length;
ok(overlap===0,'Nouvelle sélection avoids previous items (overlap '+overlap+')');

// 2. Daily session: cards
act(w,'startDaily'); ok(SES(w)&&SES(w).steps[0].type==='cards','daily starts with cards');
ok(/Nouvelle fiche/.test(txt(w))&&$(w,'.card .sum')&&$$(w,'.facts dt').length>=2,'new card shows summary + key facts');
ok(!$(w,'.card .more')&&$(w,'[data-act="more"]'),'details hidden behind En savoir plus');
act(w,'more'); ok($(w,'.card .more'),'En savoir plus expands details');
const c0=w.eval('curId()'); act(w,'cardGrade','yes');
let r=S(w).it[c0]; ok(r.st===1&&r.due===w.eval('sod(Date.now())')+864e5,'card known -> due tomorrow');
const c1=w.eval('curId()'); ok(!$(w,'.card .more'),'details collapsed again on next card'); act(w,'cardGrade','no'); ok(SES(w).steps[0].ids.slice(-1)[0]===c1,'unknown card requeued in session');
ok($(w,'.card .more')&&$(w,'[data-act="cardContinue"]')&&w.eval('curId()')===c1,'Je ne sais pas opens details and waits');
act(w,'cardContinue'); ok(w.eval('curId()')!==c1,'Continuer moves on');
let sawRecall=false; while(SES(w).steps[SES(w).si].type==='cards'){ if($(w,'[data-act="flip"]')){sawRecall=true; ok(!$(w,'.card .sum'),'recall mode hides answer'); act(w,'flip');} act(w,'cardGrade','yes'); }
ok(sawRecall,'requeued card shown in recall mode');
ok(S(w).plan.done.cards===true,'cards step marked done');
// quiz: correct then wrong
let q1=w.eval('curId()'); act(w,'answer',0);
ok(/Correct/.test($(w,'.fb').textContent)&&$(w,'.memo'),'correct feedback + memo');
ok($$(w,'.opt:disabled').length===4,'options locked after answer');
act(w,'next'); let q2=w.eval('curId()'); act(w,'answer',1);
ok(/Faux/.test($(w,'.fb').textContent)&&/Bonne réponse/.test($(w,'.fb').textContent),'wrong feedback shows correct answer');
ok($(w,'.opt.ok')&&$(w,'.opt.ko'),'correct and chosen wrong highlighted');
ok(w.eval('errorIds()').includes(q2),'wrong answer enters errors');
const lastStep=SES(w).steps[SES(w).steps.length-1]; ok(lastStep.ids.slice(-1)[0]===q2,'wrong question re-asked later today');
// finish session
let guard=0; while(SES(w)&&!SES(w).done&&guard++<200){ if(SES(w).ans==null) act(w,'answer',0); else act(w,'next'); }
ok(SES(w).done&&/Bilan/.test(txt(w)),'summary shown');
ok(S(w).plan.done.all===true,'plan completed');
const h=S(w).hist.slice(-1)[0]; ok(h.type==='daily'&&h.n>=20&&h.cards>=10,'history entry saved (n='+h.n+', cards='+h.cards+')');
ok(h.c===h.n-1,'first-attempt score counts retry once');
act(w,'endSession'); ok(/Séance du jour terminée/.test(txt(w)),'today shows completion');

// 3. SRS unit
w.eval(`(function(){const real=Date.now;let t=new Date(2026,0,5,10).getTime();Date.now=()=>t;
 grade('si01',true); window._a=[S.it.si01.st,(S.it.si01.due-sod(t))/864e5];
 grade('si01',true); window._b=S.it.si01.st; // same day: no progress
 t+=864e5; grade('si01',true); window._c=[S.it.si01.st,(S.it.si01.due-sod(t))/864e5];
 t+=3*864e5; grade('si01',false); window._d=[S.it.si01.st,S.it.si01.due===t,stateOf('si01')];
 grade('si01',true); window._e=[S.it.si01.st,(S.it.si01.due-sod(t))/864e5];
 Date.now=real;})()`);
ok(w._a[0]===1&&w._a[1]===1,'SRS: correct -> 1 day'); ok(w._b===1,'SRS: same-day repeat does not inflate');
ok(w._c[0]===2&&w._c[1]===3,'SRS: next day -> 3 days'); ok(w._d[0]===0&&w._d[1]&&w._d[2]==='due','SRS: fail -> review today');
ok(w._e[0]===1&&w._e[1]===1,'SRS: fail then correct -> tomorrow');

// 4. Exam
act(w,'go','exam'); act(w,'startExam'); const E=SES(w);
ok(E.ids.length===40,'exam has 40 questions');
const QM=w.eval('QM'); const byT={},sit={};E.ids.forEach(id=>{const q=QM[id];byT[q.t]=(byT[q.t]||0)+1;if(q.k==='s')sit[q.t]=(sit[q.t]||0)+1;});
ok(byT.pv===11&&byT.dd===11&&byT.hg===8&&byT.si===6&&byT.vs===4,'official theme distribution '+JSON.stringify(byT));
ok((sit.pv||0)===6&&(sit.dd||0)===6&&Object.values(sit).reduce((a,b)=>a+b,0)===12,'12 situations on PV and DD only');
const SUBS=w.eval('SUBS'); const bySub={}; E.ids.forEach(id=>{const q=QM[id];const k=q.t+':'+q.n;bySub[k]=(bySub[k]||0)+1;});
let subOk=true; Object.entries(SUBS).forEach(([t,arr])=>arr.forEach(([n,k])=>{if((bySub[t+':'+n]||0)!==k){subOk=false;console.log('sub mismatch',t,n,bySub[t+':'+n],k);}}));
ok(subOk,'exam follows official sub-distribution (arrêté art. 3)');
ok(E.ids.filter(id=>QM[id].k!=='s').every(id=>QM[id].k==='o'),'knowledge questions come only from official list');
let okAll=true; for(let i=0;i<200;i++){const ids=w.eval('buildExam()'); if(ids.length!==40||new Set(ids).size!==40)okAll=false;} ok(okAll,'200 generated exams: always 40 unique questions');
ok($(w,'#timer')&&/4[45]:\d\d/.test($(w,'#timer').textContent),'timer running');
ok(!$(w,'.fb'),'no correction during exam');
act(w,'examPick',2); act(w,'examPick',0); ok(SES(w).ans[E.ids[0]]===0,'answer can be changed');
// resume after "restart"
w=boot(); ok(SES(w)&&SES(w).kind==='exam'&&SES(w).ans[E.ids[0]]===0,'exam resumes after reload with answers');
for(let i=0;i<40;i++){ w.eval(`SES.cur=${i}`); w.eval('render()'); act(w,'examPick', i<35?0:3); }
act(w,'examGrid'); ok(/Toutes les questions ont une réponse/.test(txt(w)),'grid shows all answered');
act(w,'examSubmit'); ok(/35 \/ 40/.test(txt(w))&&/Réussi/.test(txt(w)),'result 35/40 passed');
ok(S(w).exam===null&&w.eval('exams()').length===1,'exam saved to history');
ok(/Erreurs \(5\)/.test(txt(w)),'5 errors listed');
act(w,'endSession');
// unanswered + timeout
act(w,'go','exam'); act(w,'startExam'); act(w,'examGrid'); ok(/40 questions sans réponse/.test(txt(w)),'unanswered warning');
act(w,'closeSheet'); w.eval('S.exam.end=Date.now()-1000;save();');
w=boot(); ok(/temps écoulé/.test(txt(w))&&/0 \/ 40/.test(txt(w)),'auto-submit when time is up');
act(w,'endSession');

// 5. Readiness capped without pass? (we passed one) -> readiness exists
const R=w.eval('readiness()'); ok(R&&R.passed,'readiness computed with passed exam');

// 6. Search
act(w,'go','search'); const inp=$(w,'#q'); inp.value='laicite'; inp.dispatchEvent(new w.Event('input',{bubbles:true}));
ok($$(w,'#sres mark').length>0&&/Fiches/.test($(w,'#sres').textContent),'accent-insensitive search with highlight');
inp.value='1789'; inp.dispatchEvent(new w.Event('input',{bubbles:true})); ok(/Questions \(\d+\)/.test($(w,'#sres').textContent),'search 1789');
inp.value='sénat'; inp.dispatchEvent(new w.Event('input',{bubbles:true})); ok($$(w,'#sres .err').length>=3,'search Sénat');
// favourite from search
const star=$(w,'#sres [data-act="fav"]'); const fid=star.dataset.v; click(w,star); ok(S(w).fav[fid]===1,'favourite toggled');
act(w,'go',w.eval('V.from')); act(w,'go','progress'); act(w,'go','favs'); ok(txt(w).includes('Mes favoris')&&$$(w,'[data-act="fav"][aria-pressed="true"]').length>=1,'favourites listed');

// 7. Custom quiz filters
act(w,'go','practice'); act(w,'cfgTheme','pv'); w.eval('V.cfg.kind="s"'); w.eval('render()');
const pool=w.eval('filterPool()'); ok(pool.length===21&&pool.every(q=>q.t==='pv'&&q.k==='s'),'filters theme+situations');
act(w,'startQuiz'); ok(SES(w).steps[0].ids.every(id=>QM[id].k==='s'&&QM[id].t==='pv'),'quiz respects filters');
act(w,'quit'); ok(!SES(w),'quit session');

// 8. Answer shuffling
const pos=new Set();
w.eval(`newSession("quiz","t",[{type:"quiz",ids:["pv01"]}])`); for(let i=0;i<30;i++){w.eval('prep();render()'); pos.add($$(w,'.opt').findIndex(b=>b.dataset.v==='0'));}
ok(pos.size>=3,'correct answer position shuffled ('+[...pos]+')'); w.eval('SES=null;render()');

// 9. Settings: dark mode + font size
act(w,'go','settings'); act(w,'setTheme','dark'); ok(w.document.documentElement.getAttribute('data-theme')==='dark','dark mode');
act(w,'setFs',130); ok(w.document.documentElement.style.fontSize==='130%','font size');
act(w,'setTheme','system'); ok(!w.document.documentElement.hasAttribute('data-theme'),'system theme');

// 10. Backup / restore
const snap=JSON.stringify(S(w)); const hist=S(w).hist.length;
act(w,'go','backup'); const bk=$(w,'#bk').value; ok(JSON.parse(bk).hist.length===hist,'export contains history');
w.eval('S=fresh();S.onb=true;save()'); ok(S(w).hist.length===0,'reset');
w.eval("V.view='backup';render()"); $(w,'#rs').value=bk; act(w,'restore'); ok(S(w).hist.length===hist,'restore works');
$(w,'#rs')||w.eval("V.view='backup';render()"); w.eval("V.view='backup';render()"); $(w,'#rs').value='{bad'; act(w,'restore'); ok(S(w).hist.length===hist,'invalid restore rejected safely');

// 11. Persistence + errors page
w=boot(); ok(S(w).onb&&S(w).hist.length===hist,'persisted after reload');
act(w,'go','errors'); ok(/À corriger/.test(txt(w)),'errors page lists open errors');
act(w,'quizErrors'); ok(SES(w)&&SES(w).steps[0].ids.length>0,'review errors session');
act(w,'quit');
// 12. Progress view renders with numbers
act(w,'go','progress'); ok(/Maîtrisées \d+/.test(txt(w))&&/examens blancs réussis/.test(txt(w)),'progress dashboard');
act(w,'go','history'); ok($$(w,'.li').length>=3,'history list');
// 13. Learn → theme → cards
act(w,'go','learn'); act(w,'theme','si'); ok(/Système institutionnel/.test(txt(w)),'theme page'); act(w,'themeCards','si'); ok(SES(w).steps[0].ids.every(id=>id.startsWith('c:')),'theme cards session'); act(w,'quit');
// 14. quick 5
act(w,'go','today'); act(w,'quick5'); ok(SES(w)&&SES(w).title==='Révision 5 minutes','5-minute review'); act(w,'quit');

// 16. Retry flow: wrong answer comes back once with badge, counts once in score
w.eval('SES=null;newSession("quiz","t",[{type:"quiz",ids:["pv06","pv07"]}])');
act(w,'answer',2); act(w,'next'); act(w,'answer',0); act(w,'next');
ok(w.eval('curId()')==='pv06'&&/Deuxième essai/.test(txt(w)),'missed question re-asked with badge');
act(w,'answer',0); act(w,'next'); ok(SES(w).done&&SES(w).res.n===2&&SES(w).res.c===1,'score counts first attempt only');
act(w,'endSession');
// 17. Every screen renders without throwing, in both themes
let errs=0; w.addEventListener('error',()=>errs++);
for(const th of ['light','dark']){ w.eval(`S.set.theme='${th}'`);
 for(const v of ['today','learn','practice','exam','progress','search','settings','errors','favs','history','about','backup']){ try{w.eval(`V.view='${v}';render()`);}catch(e){errs++;console.log(v,e.message);} }
 w.eval("V.theme='hg';V.view='theme';render()"); }
ok(errs===0,'all screens render in light and dark');
ok(!/undefined|NaN/.test(txt(w)),'no undefined/NaN in last screen');
for(const v of ['today','progress','exam','learn']){ w.eval(`V.view='${v}';render()`); ok(!/undefined|NaN/.test(txt(w)),'no undefined/NaN on '+v); }


// 18. Android back button: internal navigation before exit
w.eval("SES=null;V.view='progress';render()"); act(w,'go','history'); ok(w.eval('__back()')===true&&w.eval('V.view')==='progress','back: history -> progress');
ok(w.eval('__back()')===true&&w.eval('V.view')==='today','back: progress -> today');
ok(w.eval('__back()')===false,'back on today exits app');
act(w,'go','exam'); act(w,'startExam'); ok(w.eval('__back()')===true&&$(w,'.grid'),'back during exam opens grid, never quits');
ok(w.eval('__back()')===true&&!$(w,'.grid'),'back closes grid'); w.eval('SES=null;S.exam=null;save();render()');
// 19. Android bridge: theme + share
let calls=[]; w.AndroidBridge={setTheme:d=>calls.push(['t',d]),share:t=>calls.push(['s',t.length]),copy:t=>calls.push(['c',t.length])};
w.eval("S.set.theme='dark';render()"); ok(calls.some(c=>c[0]==='t'&&c[1]===true),'bridge receives dark theme');
w.eval("S.set.theme='light';render()"); ok(calls.some(c=>c[0]==='t'&&c[1]===false),'bridge receives light theme');
w.eval("V.view='backup';render()"); act(w,'shareBk'); ok(calls.some(c=>c[0]==='s'&&c[1]>100),'share backup via Android');
act(w,'copyBk'); ok(calls.some(c=>c[0]==='c'),'copy via Android clipboard'); delete w.AndroidBridge;
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
