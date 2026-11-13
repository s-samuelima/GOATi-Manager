// Adaptador Supabase REST sem SDK externo (permite cache PWA totalmente offline).
// Segurança de dados é aplicada pelas políticas RLS do arquivo supabase/schema.sql.
const cfg=window.GOAT_TI_CONFIG||{};
export const configured=Boolean(cfg.SUPABASE_URL?.startsWith('https://')&&cfg.SUPABASE_ANON_KEY?.length>15);
const base=(cfg.SUPABASE_URL||'').replace(/\/$/,'');
const SESSION_KEY='goat-ti-session-v1';
let session=null;
try{session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}catch{session=null;}
const remember=()=>{if(session)localStorage.setItem(SESSION_KEY,JSON.stringify(session));else localStorage.removeItem(SESSION_KEY);};
const parseError=async(res)=>{let data;try{data=await res.json();}catch{data={};}const msg=data.msg||data.error_description||data.message||data.error||`Erro HTTP ${res.status}`;throw new Error(msg);};
async function raw(path,method='GET',body=null,{token=null,prefer=null,extra={}}={}){
 if(!configured)throw new Error('Conecte o Supabase antes de usar o servidor.');
 const h={'apikey':cfg.SUPABASE_ANON_KEY,...extra};
 if(token)h.Authorization=`Bearer ${token}`;
 if(body!==null && !(body instanceof Blob))h['Content-Type']='application/json';
 if(prefer)h.Prefer=prefer;
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),13000);
 try{
  const res=await fetch(base+path,{method,headers:h,body:body===null?undefined:body instanceof Blob?body:JSON.stringify(body),signal:abort.signal});
  if(!res.ok)await parseError(res);
  if(res.status===204)return null;
  const text=await res.text();return text?JSON.parse(text):null;
 }catch(e){if(e.name==='AbortError')throw new Error('Tempo de conexão esgotado. Verifique a internet.');throw e;}
 finally{clearTimeout(timer);}
}
async function refresh(){
 if(!session?.refresh_token)throw new Error('Faça login novamente.');
 const s=await raw('/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:session.refresh_token});
 session={...s,expires_at:Date.now()+Number(s.expires_in||3600)*1000};remember();return session;
}
async function access(){
 if(!session?.access_token)throw new Error('Faça login para continuar.');
 if(Date.now()>=Number(session.expires_at||0)-60000)await refresh();
 return session.access_token;
}
async function authorized(path,method='GET',body=null,options={}){
 let token=await access();
 try{return await raw(path,method,body,{...options,token});}
 catch(e){if(/JWT expired|invalid JWT|token is expired/i.test(e.message)){token=(await refresh()).access_token;return raw(path,method,body,{...options,token});}throw e;}
}
const query=(filters={})=>Object.entries(filters).map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
export const cloud={
 get userId(){return session?.user?.id||null;},get session(){return session;},
 async signup({name,email,password,sector}){
  return raw('/auth/v1/signup?redirect_to='+encodeURIComponent(location.origin+'/'),'POST',{email,password,data:{full_name:name,sector}});
 },
 async login(email,password){
  const s=await raw('/auth/v1/token?grant_type=password','POST',{email,password});
  session={...s,expires_at:Date.now()+Number(s.expires_in||3600)*1000};remember();return s;
 },
 async recover(email){return raw('/auth/v1/recover?redirect_to='+encodeURIComponent(location.origin+'/'),'POST',{email});},
 async recoveryFromURL(){
  const hash=new URLSearchParams(location.hash.slice(1));
  if(hash.get('type')!=='recovery'||!hash.get('access_token'))return false;
  session={access_token:hash.get('access_token'),refresh_token:hash.get('refresh_token'),user:null,expires_in:Number(hash.get('expires_in')||3600),expires_at:Date.now()+Number(hash.get('expires_in')||3600)*1000};remember();history.replaceState({},'',location.pathname);return true;
 },
 async changePassword(password){return authorized('/auth/v1/user','PUT',{password});},
 async signout(){
  try{if(navigator.onLine && session?.access_token)await authorized('/auth/v1/logout','POST',{});}catch{}
  session=null;remember();
 },
 async profile(){if(!session?.access_token)return null;const rows=await authorized('/rest/v1/profiles?select=*&id=eq.'+encodeURIComponent(session.user?.id||'')+'&limit=1');return rows?.[0]||null;},
 async list(table,{select='*',params={}}={}){const suffix=query({select,...params});return authorized('/rest/v1/'+table+'?'+suffix);},
 async listAll(table,{select='*',params={}}={}){
  const rows=[];const pageSize=500;let offset=0;
  while(true){const batch=await cloud.list(table,{select,params:{...params,limit:pageSize,offset}});rows.push(...batch);
   if(batch.length<pageSize)return rows;
   offset+=pageSize;
   if(offset>=25000)throw new Error('Muitos registros para a versão atual. Use filtros e relatórios específicos no servidor.');
  }
 },
 async insert(table,item){const rows=await authorized('/rest/v1/'+table,'POST',item,{prefer:'return=representation'});return rows?.[0]||item;},
 async upsert(table,item){const rows=await authorized('/rest/v1/'+table+'?on_conflict=id','POST',item,{prefer:'resolution=merge-duplicates,return=representation'});return rows?.[0]||item;},
 async update(table,id,changes){const rows=await authorized('/rest/v1/'+table+'?id=eq.'+encodeURIComponent(id),'PATCH',changes,{prefer:'return=representation'});return rows?.[0]||null;},
 async adminSetAccess(id,role,status){return authorized('/rest/v1/rpc/admin_set_access','POST',{target_user:id,new_role:role,new_status:status});}
};
