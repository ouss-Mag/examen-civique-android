const fs=require('fs');eval(fs.readFileSync('data.js','utf8')+';global.Q=QDATA;global.C=CDATA;');
const ids=new Set(),stems=new Set();let err=0;const cnt={};
for(const q of Q){const[id,t,k,d,s,a]=q;
 if(ids.has(id)){console.log('dup id',id);err++} ids.add(id);
 if(q.length!==8){console.log('len',id,q.length);err++}
 if(!['pv','si','dd','hg','vs'].includes(t)||!['o','e','s'].includes(k)||![1,2,3].includes(d)){console.log('meta',id);err++}
 if(a.length!==4||new Set(a).size!==4){console.log('opts',id);err++}
 const n=s.toLowerCase().replace(/[^a-zà-ÿ]/g,'');if(stems.has(n)){console.log('dup stem',id);err++}stems.add(n);
 cnt[t+k]=(cnt[t+k]||0)+1;}
const cid=new Set();for(const c of C){if(cid.has(c[0])||c.length!==8){console.log('card',c[0]);err++}cid.add(c[0])}
console.log('Q',Q.length,'C',C.length,cnt,'errors',err);
