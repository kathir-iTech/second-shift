import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {replay,review,pair,checkPins} from '../src/engine.mjs';
const f={impact:'customfield_1',urgency:'customfield_2'};
const issue={key:'INC-1',fields:{customfield_1:{value:'Low'},customfield_2:{value:'High'},priority:{name:'High'}}};
const item=(fieldId,fromString,toString)=>({fieldId,fromString,toString});
const h=(n,...items)=>({created:'2026-10-01T00:00:0'+n+'Z',items});
const start=h(1,{fieldId:'status',to:'123'});
test('reconstructs field at first transition and retains edits',()=>{
 const t=replay(issue,[h(2,item(f.impact,'Medium','Low')),start],f,'123');
 assert.equal(t.impact,'Medium');assert.equal(t.latest.impact,'Low');assert.equal(t.changes.length,1);
});
test('ambiguous, absent, and inconsistent history remains unknown',()=>{
 for(const hist of [[],[start,h(1,item(f.impact,'Medium','Low'))],[start,h(2,item(f.impact,'Medium','High'))]])assert.ok(replay(issue,hist,f,'123').reason);
});
test('public sample reproduces the measured 210, 257, 17 and 64',()=>{
 const rows=JSON.parse(readFileSync(new URL('../src/corpus.json',import.meta.url)));
 const first=new Set(rows.filter(r=>r[1]==='Medium'&&r[2]==='High').map(r=>r[0]));
 const last=new Set(rows.filter(r=>r[4]==='Medium'&&r[5]==='High').map(r=>r[0]));
 assert.deepEqual([rows.length,first.size,last.size,[...first].filter(i=>!last.has(i)).length,[...last].filter(i=>!first.has(i)).length],[24918,210,257,17,64]);
});
test('policy change, discrepancy and conflicting expectations are distinct',()=>{
 const t={id:'1',impact:'M',urgency:'H',recorded:'Low'},k=pair('M','H');
 const rows=review([t,{...t,id:'2'}],{[k]:'High'},{[k]:'Low'},['High','Low']);
 assert.equal(rows[0].result,'Demoted');assert.equal(rows[0].discrepancy,true);
 const checks=checkPins([{id:'1',expected:'High'},{id:'2',expected:'Low'}],rows);
 assert.deepEqual(checks.map(c=>[c.state,c.conflict]),[['Fail','2'],['Pass','1']]);
});

