export const pair = (a,b) => JSON.stringify([a,b]);
export function review(tickets, base, draft, ranks){
  return tickets.map(t=>{
    const k=pair(t.impact,t.urgency), before=base[k], after=draft[k];
    const valid=!t.reason && ranks.includes(before) && ranks.includes(after);
    return {...t,before,after,reason:t.reason || (valid?'':'Set both matrix values for this cell.'),
      result:!valid?'Unknown':before===after?'Unchanged':ranks.indexOf(after)>ranks.indexOf(before)?'Demoted':'Promoted',
      discrepancy:valid && t.recorded && t.recorded!==before};
  });
}
export function replay(issue, histories, fields, triage){
  const id=issue.key;
  const unknown=reason=>({id,reason});
  const ordered=histories.map(h=>{
    const time=typeof h.created==='number'?h.created*(h.created<1e11?1000:1):Date.parse(h.created);
    return {...h,time,created:Number.isFinite(time)?new Date(time).toISOString():null};
  }).sort((a,b)=>a.time-b.time);
  if(ordered.some(h=>!Number.isFinite(h.time)))return unknown('Invalid history timestamp.');
  const boundary=ordered.find(h=>h.items.some(i=>i.fieldId==='status' && i.to===triage));
  if(!boundary)return unknown('No recorded transition into the selected triage status.');
  const selected={impact:fields.impact,urgency:fields.urgency,recorded:'priority'};
  const relevant=h=>h.items.some(i=>Object.values(selected).includes(i.fieldId)||i.fieldId==='status');
  const groups=ordered.filter(h=>h.time>=boundary.time && relevant(h));
  if(new Set(groups.map(h=>h.time)).size!==groups.length)return unknown('Relevant changes share a timestamp. Their order is uncertain.');
  const values={},latest={},changes=[];
  for(const [name,key] of Object.entries(selected)){
    const f=issue.fields[key]; let v=f?.value??f?.name??(typeof f==='string'?f:null);
    latest[name]=v;
    for(const h of [...groups].reverse()){
      if(h.time<=boundary.time)break;
      const edits=h.items.filter(i=>i.fieldId===key);
      if(edits.length>1)return unknown('Multiple edits to a field in one event.');
      if(edits.length){
        const e=edits[0];
        if((e.toString??null)!==v)return unknown('Field history does not reconcile with the current value.');
        changes.push({field:name,from:e.fromString,to:e.toString,at:h.created});
        v=e.fromString??null;
      }
    }
    values[name]=v;
  }
  if(!values.impact||!values.urgency)return unknown('Impact or urgency was missing at triage.');
  return {id,...values,latest,at:boundary.created,changes:changes.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at))};
}
export function checkPins(pins,rows){
  return pins.map(p=>{
    const row=rows.find(t=>t.id===p.id);
    if(!row||row.reason)return {...p,state:'Unknown'};
    const conflict=pins.find(other=>other.id!==p.id && other.expected!==p.expected && rows.some(t=>!t.reason && t.id===other.id && t.impact===row.impact && t.urgency===row.urgency));
    return {...p,state:row.after===p.expected?'Pass':'Fail',conflict:conflict?.id};
  });
}

