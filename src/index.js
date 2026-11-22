import Resolver from '@forge/resolver';
import api,{route} from '@forge/api';
import {kvs} from '@forge/kvs';
import {replay} from './engine.mjs';
const resolver=new Resolver();
async function get(path, options={}){
  const r=await api.asUser().requestJira(path,options);
  if(!r.ok)throw new Error('Jira request returned '+r.status+'. Check project access and retry.');
  return r.json();
}
function project(context){
  const p=context.extension?.project?.id;
  if(!/^\d+$/.test(String(p))||!context.accountId)throw new Error('Open Second Shift inside a Jira project.');
  return String(p);
}
const configKey=c=>'policy:'+project(c)+':'+c.accountId;
resolver.define('setup',async({context})=>{
  const p=project(context);
  const [fields,statuses,config,priorities]=await Promise.all([get(route`/rest/api/3/field`),get(route`/rest/api/3/project/${p}/statuses`),kvs.get(configKey(context)),get(route`/rest/api/3/priority`)]);
  if(config?.pins?.length){
    const keys=config.pins.map(pin=>pin.id).filter(id=>/^[A-Z][A-Z0-9_]*-\d+$/.test(id));
    const visible=new Set();
    for(let offset=0;offset<keys.length;offset+=50){
      const subset=keys.slice(offset,offset+50);
      const found=await get(route`/rest/api/3/search/jql`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jql:'project = '+p+' AND key in ('+subset.join(',')+')',maxResults:50,fields:['key']})});
      for(const issue of found.issues||[])visible.add(issue.key);
    }
    config.pins=config.pins.filter(pin=>visible.has(pin.id));
  }
  return {fields:fields.filter(f=>['option','string'].includes(f.schema?.type)).map(({id,name})=>({id,name})),statuses:[...new Map(statuses.flatMap(s=>s.statuses).map(s=>[s.id,{id:s.id,name:s.name}])).values()],config,priorities:priorities.map(p=>p.name)};
});
resolver.define('save',async({context,payload})=>{
  if(JSON.stringify(payload).length>45000)throw new Error('Saved review is too large.');
  await kvs.set(configKey(context),payload);return true;
});
resolver.define('load',async({context,payload})=>{
  const p=project(context),{impact,urgency,triage}=payload;
  if(![impact,urgency].every(x=>/^customfield_\d+$/.test(x))||impact===urgency||!/^\d+$/.test(triage))throw new Error('Choose distinct custom fields and a triage status.');
  const data=await get(route`/rest/api/3/search/jql`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jql:'project = '+p+' ORDER BY updated DESC, key ASC',fields:[impact,urgency,'priority','updated'],maxResults:25})});
  const issues=data.issues||[], by=new Map(issues.map(i=>[i.id,[]]));
  let token,pages=0;
  if(issues.length)do{
    const body={issueIdsOrKeys:issues.map(i=>i.id),fieldIds:[impact,urgency,'priority','status'],maxResults:1000,...(token?{nextPageToken:token}:{})};
    const page=await get(route`/rest/api/3/changelog/bulkfetch`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    for(const entry of page.issueChangeLogs||[])by.get(String(entry.issueId))?.push(...entry.changeHistories);
    token=page.nextPageToken;
    if(++pages>=10 && token)throw new Error('Review exceeds the history limit. No partial replay was used.');
  }while(token);
  return {rows:issues.map(i=>replay(i,by.get(i.id),{impact,urgency},triage)),limited:!!data.nextPageToken};
});
export const handler=resolver.getDefinitions();

