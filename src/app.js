const $=s=>document.querySelector(s);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const opt=(items,selected)=>items.map(v=>'<option '+(v===selected?'selected':'')+'>'+esc(v)+'</option>').join('');
const demo=corpus.map(([id,impact,urgency,recorded,i,u,p])=>({id,impact,urgency,recorded,latest:{impact:i,urgency:u,recorded:p}}));
const sampleBase=Object.fromEntries(demo.map(t=>[pair(t.impact,t.urgency),t.recorded]));
const sampleDraft={...sampleBase,[pair('Medium','High')]:'Moderate'};
let mode='sample',tickets=demo,base,draft,pins,ranks,setup,fields={},selected,filter='Missed by current fields',page=0,saveQueue=Promise.resolve(),liveReady=false;
const size=10;
function defaults(){
 let saved;
 try{saved=JSON.parse(localStorage.getItem('second-shift-review-v1'));}catch{}
 base={...sampleBase}; draft=saved?.draft??{...sampleDraft};pins=saved?.pins??[];ranks=['Critical','High','Moderate','Low'];
}
function message(s){$('#notice').textContent=s;}
function persist(){
 const payload={draft:{...draft},base:{...base},pins:[...pins],fields:{...fields},ranks:[...ranks]};
 if(mode==='sample'){try{localStorage.setItem('second-shift-review-v1',JSON.stringify(payload));message('Review saved in this browser.');}catch{message('Review is open. Browser storage is unavailable.');}}
 else if(liveReady){saveQueue=saveQueue.then(()=>window.ssInvoke('save',payload)).then(()=>message('Private Jira review saved.'),e=>message('Save failed: '+e.message));}
}
function cells(){return [...new Set(tickets.filter(t=>!t.reason).map(t=>pair(t.impact,t.urgency)))].sort();}
function rowsNow(){return review(tickets,base,draft,ranks);}
function moved(b,a){return b!==undefined && a!==undefined && b!==a;}
function wasMissed(t){
 if(t.reason||!t.latest||t.before===t.after)return false;
 const k=pair(t.latest.impact,t.latest.urgency);
 return base[k]!==undefined && draft[k]!==undefined && !moved(base[k],draft[k]);
}
function matches(t,f){return f==='All cases'||(f==='Missed by current fields'?wasMissed(t):f==='Baseline discrepancies'?t.discrepancy:t.result===f);}
function badge(s){return '<span class="badge '+(s==='Demoted'||s==='Fail'?'warn':'')+'">'+esc(s)+'</span>';}
function render(){
 const rows=rowsNow(), missed=rows.filter(wasMissed),filtered=rows.filter(t=>matches(t,filter)&&t.id.toLowerCase().includes($('#query').value.toLowerCase()));
 page=Math.max(0,Math.min(page,Math.ceil(filtered.length/size)-1));
 const visible=filtered.slice(page*size,(page+1)*size);
 $('#scope').textContent=mode==='sample'?'Public incident archive':'Jira project review';
 $('#dataset').textContent=mode==='sample'?'UCI incident history · first recorded update': 'Live Jira · selected triage transition';
 $('#stats').innerHTML=[[rows.length,'Tickets reviewed'],[rows.filter(t=>t.result==='Demoted').length,'Proposed demotions'],[missed.length,'Missed by current fields'],[rows.filter(t=>t.reason).length,'Unknown']].map(([n,l])=>'<div class="stat"><strong>'+n.toLocaleString()+'</strong><span>'+l+'</span></div>').join('');
 $('#sample').setAttribute('aria-pressed',String(mode==='sample'));
 $('#live').setAttribute('aria-pressed',String(mode==='live'));
 $('#example').hidden=mode!=='sample';
 $('#policy-note').textContent=mode==='sample'?'The example lowers medium-impact, high-urgency incidents from High to Moderate. Edit any observed combination and inspect the result.':'Enter the reference policy and proposed priority for each combination you want to compare.';
 if(!visible.some(row=>row.id===selected))selected=visible[0]?.id;
 $('#filter').value=filter;
 $('#cases').innerHTML=visible.map(t=>'<button class="case '+(t.id===selected?'active':'')+'" data-case="'+esc(t.id)+'"><b>'+esc(t.id)+'</b><span>'+esc(t.impact||'—')+' / '+esc(t.urgency||'—')+'</span>'+badge(t.result)+'</button>').join('')||'<p>No tickets match this view.</p>';
 $('#count').textContent=filtered.length?((page*size+1)+'–'+(page*size+visible.length)+' of '+filtered.length.toLocaleString()):'0 cases';
 $('#prev').disabled=!page;$('#next').disabled=(page+1)*size>=filtered.length;
 const t=rows.find(x=>x.id===selected);
 $('#detail').innerHTML=t?'<div class="eyebrow">Selected incident</div><div class="case-title"><h2>'+esc(t.id)+'</h2>'+badge(t.result)+'</div>'+(t.reason?'<p>'+esc(t.reason)+'</p>':
 '<p>'+esc(mode==='sample'?'First recorded update':t.at)+' · '+esc(t.impact)+' impact / '+esc(t.urgency)+' urgency</p><dl class="priority-flow">'+[['Recorded priority',t.recorded||'Unknown'],['Baseline predicts',t.before],['Proposal predicts',t.after]].map(([k,v])=>'<div><dt>'+k+'</dt><dd>'+esc(v)+'</dd></div>').join('')+'</dl><h3>What changed later?</h3><p>'+esc(t.latest?.impact)+' impact / '+esc(t.latest?.urgency)+' urgency at last observation.</p>'+(wasMissed(t)?'<p class="callout">A current-field review would miss this policy change.</p>':'')+(t.discrepancy?'<p class="callout">The recorded priority already differed from the baseline.</p>':'')+(t.changes||[]).map(e=>'<small>'+esc(e.at)+' · '+esc(e.field)+' '+esc(e.from)+' → '+esc(e.to)+'</small>').join('')+'<button id="edit-cell">Edit this policy cell</button><form id="pin"><h3>Keep this case for the next review</h3><label>Expected priority<select id="expected">'+opt(ranks,pins.find(p=>p.id===t.id)?.expected||t.recorded)+'</select></label><label>Review reason<input id="reason" required maxlength="240" value="'+esc(pins.find(p=>p.id===t.id)?.reason||'')+'" placeholder="Why should this case keep that priority?"></label><button class="primary">Save test case</button></form>'):'<h2>Inspect a ticket</h2><p>Select a case to see its decision history.</p>';
 $('#checks').innerHTML=checkPins(pins.filter(p=>mode==='sample'||rows.some(t=>t.id===p.id)),rows).map(p=>'<article><b>'+esc(p.id)+'</b> '+badge(p.state)+'<p>'+esc(p.expected)+' · '+esc(p.reason)+'</p>'+(p.conflict?'<p class="callout">Conflicts with '+esc(p.conflict)+'. One matrix cell cannot satisfy both expectations. Review an exception.</p>':'')+'<button data-remove="'+esc(p.id)+'">Remove case</button></article>').join('')||'<p>Save an expected priority from a ticket to test future edits.</p>';
}
function matrix(){
 $('#matrix').innerHTML=cells().map((k,i)=>{const [a,b]=JSON.parse(k);return '<div class="matrixrow"><b>'+esc(a)+' / '+esc(b)+'</b><select aria-label="Baseline '+esc(a+' '+b)+'" data-base="'+i+'" '+(mode==='sample'?'disabled':'')+'>'+opt(['',...ranks],base[k])+'</select><select aria-label="Proposal '+esc(a+' '+b)+'" data-draft="'+i+'">'+opt(['',...ranks],draft[k])+'</select></div>';}).join('');
}
function resetView(){page=0;$('#query').value='';selected=null;render();matrix();const first=$('[data-case]');if(first){selected=first.dataset.case;render();}}
$('#filter').onchange=e=>{filter=e.target.value;resetView();};
$('#query').oninput=()=>{page=0;render();};
$('#prev').onclick=()=>{page--;render();};$('#next').onclick=()=>{page++;render();};
$('#cases').onclick=e=>{const b=e.target.closest('[data-case]');if(b){selected=b.dataset.case;render();if(matchMedia('(max-width:860px)').matches)$('#detail').scrollIntoView({block:'start'});}};
$('#matrix').onchange=e=>{
 const isBase=e.target.hasAttribute('data-base'),i=isBase?e.target.dataset.base:e.target.dataset.draft,k=cells()[i];
 if(isBase){if(!draft[k]||draft[k]===base[k])draft[k]=e.target.value;base[k]=e.target.value;}else draft[k]=e.target.value;
 persist();matrix();render();
};
$('#revert').onclick=()=>{draft={...base};persist();matrix();render();};
$('#detail').onsubmit=e=>{e.preventDefault();const reason=$('#reason').value.trim();if(!reason)return;const pin={id:selected,expected:$('#expected').value,reason};pins=[...pins.filter(p=>p.id!==selected),pin];persist();render();};
$('#checks').onclick=e=>{if(e.target.dataset.remove){pins=pins.filter(p=>p.id!==e.target.dataset.remove);persist();render();}};
$('#sample').onclick=()=>{mode='sample';tickets=demo;defaults();filter='Missed by current fields';$('#config').hidden=true;message('Public archive loaded.');resetView();};
function options(list){return list.map(v=>'<option value="'+esc(v.id)+'">'+esc(v.name)+'</option>').join('');}
$('#live').onclick=async()=>{
 if(!window.ssInvoke){message('Live project access is available in the installed Jira app. This review copy uses the public archive.');return;}
 try{await saveQueue;message('Reading Jira project fields…');setup=await window.ssInvoke('setup');$('#config').hidden=false;
 for(const id of ['impact','urgency','triage']){const list=id==='triage'?setup.statuses:setup.fields.filter(f=>/^customfield_/.test(f.id));$('#'+id).innerHTML='<option value="">Select…</option>'+options(list);$('#'+id).value=setup.config?.fields?.[id]||list.find(f=>f.name.toLowerCase()===id)?.id||'';}
 message('Select your field mapping and first transition into triage.');}catch(e){message(e.message);}
};
$('#config').onsubmit=async e=>{
 e.preventDefault();const next=Object.fromEntries(['impact','urgency','triage'].map(k=>[k,$('#'+k).value]));
 const submit=$('#load');submit.disabled=true;
 try{message('Reconstructing issue histories…');const res=await window.ssInvoke('load',next);
 mode='live';liveReady=true;fields=next;tickets=res.rows;const c=setup.config;
 const same=c&&Object.keys(next).every(k=>next[k]===c.fields?.[k]);ranks=setup.priorities;base=same?{...c.base}:{};draft=same?{...c.draft}:{};pins=same?[...c.pins]:[];filter='All cases';$('#config').hidden=true;resetView();message('Loaded '+tickets.length+' recently updated visible tickets. '+(res.limited?'Additional tickets exist. ':'')+'Set baseline and proposal values in Policy matrix.');
 }catch(ex){message(ex.message);}finally{submit.disabled=false;}
};
$('#help').onclick=()=>$('#guide').showModal();
$('#close-help').onclick=()=>$('#guide').close();
$('#example').onclick=()=>{draft={...sampleDraft};filter='Missed by current fields';persist();resetView();};
$('#detail').onclick=e=>{
 if(e.target.id!=='edit-cell')return;
 const ticket=tickets.find(t=>t.id===selected);
 if(!ticket)return;
 $('#policy').open=true;
 const index=cells().indexOf(pair(ticket.impact,ticket.urgency));
 const input=document.querySelector('[data-draft="'+index+'"]');
 input?.focus();input?.scrollIntoView({block:'center'});
};
defaults();resetView();

