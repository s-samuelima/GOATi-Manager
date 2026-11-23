import {storage} from './storage.js';
import {cloud,configured} from './api.js';
import {downloadPDF,downloadCSV,parseCSV} from './reports.js';
import {LABEL_SIZES,qrTarget,qrSvg,downloadAssetLabels,getNextDemoAssetTag,prepareAssetImport,assetsForGlRange,ASSET_OWNER_NAME,INVENTORY_CATEGORIES,buildInventoryOverview} from './inventory.js';
import {seed,normalizeData,resolveHelpArticles,guides,cats,sectors,assetCats,statusNames,urgencyNames} from './seed.js';

const app=document.getElementById('app');
const now=()=>new Date().toISOString();
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const makeId=()=>typeof crypto.randomUUID==='function'?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=crypto.getRandomValues(new Uint8Array(1))[0]&15;return (c==='x'?r:(r&3)|8).toString(16);});
const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateShort=(v)=>v?new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v)):'—';
const dateLong=(v)=>v?new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)):'—';
const shortNum=n=>new Intl.NumberFormat('pt-BR').format(n||0);
const selectOptions=(items,value,first='Selecione')=>`<option value="">${esc(first)}</option>`+items.map(x=>`<option value="${esc(x)}" ${x===value?'selected':''}>${esc(x)}</option>`).join('');
const field=(name,label,type='text',value='',more='')=>`<div class="field"><label for="f-${name}">${esc(label)}</label><input class="input" id="f-${name}" name="${name}" type="${type}" value="${esc(value)}" ${more}></div>`;
const selection=(name,label,items,value='',required=true)=>`<div class="field"><label for="f-${name}">${esc(label)}</label><select class="select" id="f-${name}" name="${name}" ${required?'required':''}>${selectOptions(items,value)}</select></div>`;
const textarea=(name,label,value='',min=0)=>`<div class="field"><label for="f-${name}">${esc(label)}</label><textarea class="textarea" id="f-${name}" name="${name}" minlength="${min}" placeholder="Descreva com clareza..." ${min?'required':''}>${esc(value)}</textarea></div>`;
const chip=(v)=>`<span class="chip ${esc(v)}">${esc(statusNames[v]||urgencyNames[v]||v||'—')}</span>`;
const cIcon={grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',ticket:'<path d="M4 7a2 2 0 0 0 2-2h12a2 2 0 0 0 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 0-2 2H6a2 2 0 0 0-2-2v-3a2 2 0 0 0 0-4V7Z"/><path d="M12 6v2m0 3v2m0 3v2"/>',package:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v9l9 5 9-5V8M12 13v9"/>',activity:'<path d="M3 12h4l3-8 4 16 3-8h4"/>',file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14ZM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',star:'<path d="m12 3 2.7 5.8 6.3.9-4.5 4.5 1.1 6.3L12 17.5l-5.6 3 1.1-6.3L3 9.7l6.3-.9L12 3Z"/>',users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',settings:'<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.6 1.6 0 0 0 .32 1.75l.06.06-2.04 2.04-.06-.06a1.6 1.6 0 0 0-1.75-.32l-.09.04a1.6 1.6 0 0 0-.99 1.46V21H9.15v-.08a1.6 1.6 0 0 0-1-1.46l-.08-.04a1.6 1.6 0 0 0-1.75.32l-.06.06-2.04-2.04.06-.06A1.6 1.6 0 0 0 4.6 15l-.04-.09a1.6 1.6 0 0 0-1.46-.99H3V10.1h.1a1.6 1.6 0 0 0 1.46-.99L4.6 9a1.6 1.6 0 0 0-.32-1.75l-.06-.06 2.04-2.04.06.06a1.6 1.6 0 0 0 1.75.32l.09-.04a1.6 1.6 0 0 0 .99-1.46V4h5.7v.08a1.6 1.6 0 0 0 .99 1.46l.09.04a1.6 1.6 0 0 0 1.75-.32l.06-.06 2.04 2.04-.06.06A1.6 1.6 0 0 0 19.4 9l.04.09a1.6 1.6 0 0 0 1.46.99h.1v3.82h-.1a1.6 1.6 0 0 0-1.46.99L19.4 15Z"/>',bell:'<path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4"/>',moon:'<path d="M20 16.7A9 9 0 0 1 7.3 4 9 9 0 1 0 20 16.7Z"/>',plus:'<path d="M12 5v14M5 12h14"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',check:'<path d="m4 12 5 5L20 6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',monitor:'<rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',wifi:'<path d="M2 8a15 15 0 0 1 20 0M5 12a11 11 0 0 1 14 0m-10 4a6 6 0 0 1 6 0M12 20h.01"/>',headphones:'<path d="M3 14v-3a9 9 0 0 1 18 0v3M5 13H3a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3v-7H5Zm14 0h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3v-7h1Z"/>',printer:'<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',gauge:'<path d="M5 18a9 9 0 1 1 14 0M12 13l4-4"/><path d="M4 20h16"/>',lock:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',close:'<path d="M18 6 6 18M6 6l12 12"/>',logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',download:'<path d="M12 3v13m-5-5 5 5 5-5M5 20h14"/>',upload:'<path d="M12 21V8m-5 5 5-5 5 5M5 4h14"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',refresh:'<path d="M20 11a8 8 0 0 0-14-5L4 8m0-5v5h5M4 13a8 8 0 0 0 14 5l2-2m0 5v-5h-5"/>',cloud:'<path d="M20 16a4 4 0 0 0-4-4h-1a6 6 0 0 0-11 2 4 4 0 0 0 0 8h16a3 3 0 0 0 0-6Z"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-9h.01"/>',shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',chevron:'<path d="m9 18 6-6-6-6"/>',mouse:'<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 2v8"/>','mouse-pointer':'<path d="m4 3 7 18 2.5-7.5L21 11 4 3Z"/>','cloud-off':'<path d="M8 8a6 6 0 0 1 10 4 4 4 0 0 1 2 7H7a4 4 0 0 1-2-7M3 3l18 18"/>','lock-keyhole':'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 15v2"/>'};
const icon=(name,size=18)=>`<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${cIcon[name]||cIcon.info}</svg>`;
const state={view:'dashboard',search:'',filter:'all',period:'mensal',rangeFrom:'',rangeTo:'',inventoryTab:'all',inventoryCategory:'all',assetFilters:{category:'all',sector:'all',owner:'all',status:'all'},selectedAssetIds:new Set(),assetDeepLink:new URLSearchParams(location.search).get('patrimonio')||'',importPreview:null,inventoryMigrationMissing:false,stockMigrationMissing:false,modal:null,guideId:null,tab:'todos',mobile:false,
 authView:'signup',authEmail:'',authLoginFailed:false,selectedTicketIds:new Set(),reviewPromptShown:new Set(),timerMigrationMissing:false,recovery:false,theme:localStorage.getItem('goat-ti-theme')||'dark',role:null,user:null,profile:null,
 data:{timeEntries:[],assetEvents:[],stock_items:[],tickets:[],assets:[],movements:[],maintenance:[],activities:[],reviews:[],messages:[],profiles:[],guides:[]},queue:[],noticePermission:typeof Notification!=='undefined'?Notification.permission:'indisponível',lastNotified:new Set(),seenPendingUsers:new Set(),pendingUsersInitialized:false,installPrompt:null,loading:false};
const demo=!configured;
function isAdmin(){return state.role==='admin';}
function isManager(){return state.role==='gestao';}
function canManage(){return isAdmin()||isManager();}
function canViewInventory(){return isActive()&&(!configured||navigator.onLine)&&(isAdmin()||isManager()||(state.role==='funcionario'&&state.profile?.can_manage_inventory===true));}
function canEditInventory(){return canViewInventory()&&(isAdmin()||(state.role==='funcionario'&&state.profile?.can_manage_inventory===true));}
function requireInventoryReady(){if(state.inventoryMigrationMissing&&!demo)throw new Error('Execute primeiro a migração SQL do inventário GL no Supabase.');}
function openDeepLinkedAsset(){if(!state.assetDeepLink||!state.user)return false;const tag=state.assetDeepLink;state.assetDeepLink='';if(!canViewInventory()){toast('Seu perfil não tem acesso ao inventário patrimonial.','error');return false;}const asset=state.data.assets.find(a=>a.tag===tag);if(!asset){toast('Patrimônio '+tag+' não encontrado.','error');return false;}state.view='inventario';state.modal={type:'asset-detail',id:asset.id};renderShell();return true;}
function isActive(){return state.profile?.status==='ativo';}
function userId(){return state.user?.id||null;}
function ownTickets(){return canManage()?state.data.tickets:state.data.tickets.filter(t=>t.requester_id===userId());}
function getTicket(id){return ownTickets().find(t=>String(t.id)===String(id))||state.queue.find(q=>q.id===id && q.owner===userId())?.payload;}
function toast(message,type='',action=null){const el=document.createElement('div');el.className='toast '+type;const label=document.createElement('span');label.textContent=message;el.appendChild(label);if(action&&typeof action.onClick==='function'){const btn=document.createElement('button');btn.type='button';btn.className='toast-action';btn.textContent=action.label||'Ver detalhes';btn.addEventListener('click',()=>{action.onClick();el.remove();});el.appendChild(btn);}document.getElementById('toast-region').appendChild(el);setTimeout(()=>el.remove(),action?11000:4300);}
const badgeMode=()=>demo?'<div class="demo-banner">'+icon('info',17)+'<span><b>Modo demonstração local.</b> Os dados são exemplos salvos apenas neste navegador. Para uso compartilhado na empresa, conecte o Supabase conforme o README.</span></div>':'';
const offlineWarn=()=>!navigator.onLine?'<div class="offline-notice">'+icon('cloud-off',17)+' <strong>Sem internet:</strong> novos chamados ficam neste computador até a sincronização. O TI ainda não os recebeu.</div>':'';
const navs=[{key:'dashboard',name:'Visão geral',icon:'grid'},{key:'chamados',name:'Chamados',icon:'ticket'},{key:'ajuda',name:'Central de ajuda',icon:'book'},{key:'tutorial',name:'Como usar',icon:'info'},{key:'avaliacoes',name:'Avaliações',icon:'star'},{key:'inventario',name:'Inventário',icon:'package',inventory:true},{key:'atividades',name:'Diário de TI',icon:'activity',manager:true},{key:'relatorios',name:'Relatórios PDF',icon:'file',manager:true},{key:'usuarios',name:'Usuários',icon:'users',admin:true},{key:'config',name:'Configurações',icon:'settings'}];
function pendingProfiles(){return isAdmin()?state.data.profiles.filter(p=>p.status==='pendente'):[];}
function navItem(n){if(n.admin&&!isAdmin()||n.manager&&!canManage()||n.inventory&&!canViewInventory())return '';const count=n.key==='usuarios'?pendingProfiles().length:0;return `<button data-action="go" data-view="${n.key}" class="${state.view===n.key?'active':''}" aria-current="${state.view===n.key?'page':'false'}">${icon(n.icon,17)}<span>${n.name}</span>${count?`<span class="nav-pending-count" aria-label="${count} cadastro(s) aguardando aprovação">${count}</span>`:''}</button>`;}
function openPendingApproval(id=null){if(!isAdmin())return;const pending=pendingProfiles();const target=id?pending.find(p=>p.id===id):pending[0];state.view='usuarios';state.search='';state.filter='all';state.mobile=false;state.modal=target?{type:'user',id:target.id}:null;renderShell();}
function notifyPendingUser(profile){if(!isAdmin()||profile.status!=='pendente')return;const name=profile.full_name||'Novo colaborador';toast('Novo cadastro aguardando aprovação: '+name,'success',{label:'Analisar cadastro',onClick:()=>openPendingApproval(profile.id)});if(typeof Notification!=='undefined'&&Notification.permission==='granted'){try{const alert=new Notification('GOATi Manager · Cadastro pendente',{body:name+' solicitou acesso à plataforma.',icon:'/assets/goati-192.png',tag:'goati-cadastro-'+profile.id});alert.onclick=()=>{window.focus();openPendingApproval(profile.id);alert.close();};}catch(error){console.warn('Notificação do navegador indisponível:',error);}}}
function rememberPendingProfiles(profiles){if(!isAdmin())return;const pending=profiles.filter(p=>p.status==='pendente');if(!state.pendingUsersInitialized){pending.forEach(p=>state.seenPendingUsers.add(p.id));state.pendingUsersInitialized=true;return;}const newcomers=pending.filter(p=>!state.seenPendingUsers.has(p.id));pending.forEach(p=>state.seenPendingUsers.add(p.id));newcomers.forEach(notifyPendingUser);}
function initials(n){return String(n||'TI').split(/\s+/).slice(0,2).map(s=>s[0]||'').join('').toUpperCase();}
const pageHero=(eyebrow,title,desc,actions='')=>`<div class="page-hero"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${desc}</p></div><div class="page-actions">${actions}</div></div>`;
function renderShell(){
 document.documentElement.dataset.theme=state.theme;
 const label=navs.find(n=>n.key===state.view)?.name||'Visão geral';
 const pending=state.queue.filter(q=>q.owner===userId()).length;
 const approvals=pendingProfiles().length;
 app.innerHTML=`${state.mobile?'<div class="mobile-scrim" data-action="close-mobile"></div>':''}<div class="app-shell">
 <aside class="sidebar ${state.mobile?'mobile-open':''}" aria-label="Menu principal"><div class="brand"><div class="brand-icon"><img src="/assets/goati-mark.png" alt="" /></div><div class="brand-copy"><b class="brand-wordmark">GOAT<span class="brand-i">i</span></b><span class="brand-manager">MANAGER</span></div></div>
 <div class="nav-label">Área de trabalho</div><nav class="nav">${navs.slice(0,5).map(navItem).join('')}</nav>
 ${canManage()||canViewInventory()?`<div class="nav-label" style="margin-top:14px">Administração</div><nav class="nav">${navs.slice(5,9).map(navItem).join('')}</nav>`:''}
 <div class="sb-bottom"><button data-action="go" data-view="config">${icon('settings',17)} Preferências</button><div class="sb-profile"><div class="avatar">${esc(initials(state.profile?.full_name))}</div><div><b>${esc(state.profile?.full_name||'Usuário')}</b><small>${isAdmin()?'Administrador de TI':isManager()?'Gestão':'Colaborador'}</small></div></div><button data-action="logout">${icon('logout',17)} Sair da conta</button></div></aside>
 <div class="main-wrap"><header class="topbar"><div style="display:flex;align-items:center;gap:10px"><button class="icon-btn mobile-toggle" data-action="mobile" aria-label="Abrir menu">${icon('menu')}</button><div class="crumb">Workspace <span>/</span> <strong>${esc(label)}</strong></div></div><div class="top-actions"><span class="connection" title="A disponibilidade real é verificada ao sincronizar"> <span class="status-dot ${navigator.onLine?'':'offline'}"></span>${navigator.onLine?'Online':'Offline'}${pending?' · '+pending+' pendente(s)':''}</span><button class="icon-btn" data-action="theme" title="Alternar tema" aria-label="Alternar tema">${icon(state.theme==='dark'?'sun':'moon')}</button><button class="icon-btn" data-action="notifications" title="Permitir notificações" aria-label="Permitir notificações">${icon('bell')}</button>${isAdmin()&&approvals?`<button class="pending-top-button" data-action="review-pending" title="${approvals} cadastro(s) aguardando aprovação">${icon('users',16)}<span>${approvals}</span></button>`:''}</div></header>
 <main class="content" id="main-content">${badgeMode()}${offlineWarn()}${isAdmin()&&approvals?`<div class="pending-users-banner" role="status">${icon('users',21)}<div><strong>${approvals} ${approvals===1?'cadastro aguardando':'cadastros aguardando'} aprovação</strong><p>Analise os novos colaboradores antes de liberar o acesso.</p></div><button class="btn primary small" data-action="review-pending">Analisar cadastro${approvals===1?'':'s'}</button></div>`:''}${renderPage()}<div class="footer-note">GOATi MANAGER · Help Desk e Inventário · v1.4.0 • ${demo?'Demonstração local':'Ambiente conectado'}</div></main></div></div>${state.modal?renderModal():''}`;
}
function renderPage(){switch(state.view){case 'dashboard':return dashboard();case 'chamados':return ticketsPage();case 'inventario':return canViewInventory()?inventoryPage():unauthorized();case 'atividades':return canManage()?activitiesPage():unauthorized();case 'relatorios':return canManage()?reportsPage():unauthorized();case 'ajuda':return helpPage();case 'tutorial':return tutorialPage();case 'avaliacoes':return reviewsPage();case 'usuarios':return isAdmin()?usersPage():unauthorized();case 'config':return settingsPage();default:return dashboard();}}
const unauthorized=()=>'<div class="panel panel-pad"><h2>Você não tem permissão para acessar esta área.</h2></div>';
function metric(label,value,ico,footer){return `<div class="metric"><div class="metric-head"><span>${label}</span><span class="metric-icon">${icon(ico,19)}</span></div><strong>${esc(value)}</strong><div class="metric-foot">${footer}</div></div>`;}
function statusBars(tickets){return Object.entries(statusNames).map(([code,label])=>{const count=tickets.filter(t=>t.status===code).length;return `<div class="mini-bar"><label>${label}</label><div class="mini-bar-track"><span style="width:${tickets.length?count/tickets.length*100:0}%"></span></div><strong>${count}</strong></div>`;}).join('');}
function pendingReviewTickets(){
 if(!state.user||!isActive()||canManage())return [];
 return ticketsSorted(state.data.tickets.filter(t=>t.requester_id===userId()&&t.status==='resolvido'&&!state.data.reviews.some(r=>r.ticket_id===t.id)));
}
function showReviewPromptIfNeeded(){
 if(state.modal||!state.user||!isActive()||canManage())return false;
 const pending=pendingReviewTickets().find(t=>!state.reviewPromptShown.has(t.id));
 if(!pending)return false;
 state.reviewPromptShown.add(pending.id);
 state.modal={type:'rate',id:pending.id};
 renderShell();return true;
}
function dashboard(){const tickets=ownTickets(),resolved=tickets.filter(t=>t.status==='resolvido').length,open=tickets.filter(t=>t.status==='aberto').length,active=tickets.filter(t=>t.status==='andamento'||t.status==='aguardando').length;const reviews=state.data.reviews.filter(r=>tickets.some(t=>t.id===r.ticket_id));const avg=reviews.length?(reviews.reduce((a,b)=>a+Number(b.rating),0)/reviews.length).toFixed(1).replace('.',','):'—';
 return `${pageHero('Central de operações',isAdmin()?'Visão geral do TI':isManager()?'Visão gerencial':'Olá, '+esc((state.profile?.full_name||'colaborador').split(' ')[0]),isAdmin()?'Todos os atendimentos, organizados em um único lugar.':'Acompanhe suas solicitações e encontre ajuda rapidamente.',`<button class="btn primary" data-action="new-ticket">${icon('plus',16)} Novo chamado</button>`)}
 ${!canManage()&&pendingReviewTickets().length?`<section class="review-reminder" role="status"><div class="review-reminder-icon">${icon('star',25)}</div><div><strong>Como foi seu atendimento?</strong><p>${pendingReviewTickets().length===1?'Você tem um chamado resolvido aguardando avaliação.':'Você tem '+pendingReviewTickets().length+' chamados resolvidos aguardando avaliação.'} Sua opinião ajuda a melhorar o suporte.</p><button class="btn primary small" data-action="rate" data-id="${esc(pendingReviewTickets()[0].id)}">Avaliar agora</button> <button class="btn small outline" data-action="go" data-view="avaliacoes">Ver avaliações pendentes</button></div></section>`:''}
 <div class="cards">${metric(canManage()?'Total de chamados':'Meus chamados',tickets.length,'ticket','Registros visíveis para seu perfil')}${metric('Abertos',open,'bell','Aguardando atendimento')}${metric('Em acompanhamento',active,'clock','Em andamento ou aguardando')}${metric('Resolvidos',resolved,'check','Atendimentos concluídos')}</div>
 ${canManage()?`<div class="cols-2"><section class="panel"><div class="panel-head"><div><h2>Fila de atendimento</h2><small>Últimas solicitações recebidas</small></div><button data-action="go" data-view="chamados" class="btn small outline">Ver todos ${icon('arrow',14)}</button></div>${ticketsSorted(tickets).slice(0,5).map(ticketRow).join('')||empty('Nenhum chamado por enquanto.','As solicitações aparecerão aqui.')}</section><div class="stack"><section class="panel panel-pad"><h2>Distribuição dos chamados</h2><p class="muted text-xs mt-2">Por situação atual</p><div class="mt-3">${statusBars(tickets)}</div></section><section class="action-panel"><div><h3>Precisa registrar seu trabalho?</h3><p>Organize atividades e comprove os atendimentos realizados.</p></div><button class="btn" data-action="go" data-view="atividades">Abrir diário ${icon('arrow',15)}</button></section></div></div>`:
 `<div class="cols-2"><section class="panel"><div class="panel-head"><div><h2>Meus chamados recentes</h2><small>Acompanhe seus pedidos de suporte</small></div><button class="btn small outline" data-action="go" data-view="chamados">Ver todos ${icon('arrow',15)}</button></div>${ticketsSorted(tickets).slice(0,5).map(ticketRow).join('')||empty('Nenhum chamado ainda.','Abra sua primeira solicitação de suporte.')}</section><section class="panel panel-pad"><h2>Como podemos ajudar?</h2><p class="muted text-xs mt-2">Escolha uma opção para continuar.</p><div class="stack mt-3"><button class="quick-card" data-action="new-ticket">${icon('plus',21)}<strong>Abrir um chamado</strong><small>Descreva um problema para o TI.</small></button><button class="quick-card" data-action="go" data-view="ajuda">${icon('book',21)}<strong>Resolver um problema simples</strong><small>Veja orientações passo a passo.</small></button></div></section></div>`}
 <section class="panel panel-pad mt-3"><div class="panel-head" style="padding:0 0 17px;margin-bottom:18px"><h2>Acesso rápido</h2><small>As ações mais usadas</small></div><div class="quick-actions"><button class="quick-card" data-action="new-ticket">${icon('ticket',23)}<strong>Novo chamado</strong><small>Peça ajuda ao setor de TI</small></button><button class="quick-card" data-action="go" data-view="ajuda">${icon('book',23)}<strong>Central de ajuda</strong><small>Soluções rápidas para o dia a dia</small></button><button class="quick-card" data-action="go" data-view="tutorial">${icon('info',23)}<strong>Como usar</strong><small>Conheça o aplicativo</small></button></div></section>`;
}
function ticketsSorted(arr){return [...arr].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));}
function ticketRow(t){return `<div class="list-row ticket-clickable" tabindex="0" data-action="ticket" data-id="${esc(t.id)}" aria-label="Abrir chamado ${esc(t.number||t.id)}: ${esc(t.title)}"><div class="row-main"><button class="linkrow" data-action="ticket" data-id="${esc(t.id)}">${esc(t.title)}</button><small>#${esc(t.number||String(t.id).slice(0,6))} · ${esc(t.sector||'Sem setor')} · ${dateShort(t.created_at)}</small></div>${chip(t.status)}</div>`;}
function empty(title,desc){return `<div class="blank">${icon('inbox',29)}<strong>${esc(title)}</strong><span>${esc(desc)}</span></div>`;}
function searchbar(placeholder){return `<div class="search-wrap">${icon('search',16)}<input class="input" id="page-search" placeholder="${esc(placeholder)}" value="${esc(state.search)}" aria-label="Pesquisar"></div>`;}
function ticketsPage(){const queues=state.queue.filter(q=>q.owner===userId()).map(q=>({...q.payload,id:q.id,number:'Pendente',status:'pendente'}));const t=ticketsSorted([...ownTickets(),...queues]);const filtered=t.filter(x=>{const text=[x.title,x.description,x.requester_name,x.sector,x.number].join(' ').toLowerCase();return text.includes(state.search.toLowerCase())&&(state.filter==='all'||x.status===state.filter);});return `${pageHero('Atendimento',canManage()?'Central de chamados':'Meus chamados',canManage()?'Gerencie solicitações, prioridades e o histórico de suporte.':'Consulte suas solicitações e acompanhe o andamento de cada uma.',`<button class="btn primary" data-action="new-ticket">${icon('plus',16)} Novo chamado</button>`)}
 <div class="toolbar">${searchbar('Buscar por chamado, setor ou solicitante...')}<select class="select" id="filter-status" aria-label="Filtrar por status"><option value="all">Todos os status</option>${Object.entries({...statusNames,pendente:'Pendente de envio'}).map(([v,n])=>`<option value="${v}" ${state.filter===v?'selected':''}>${n}</option>`).join('')}</select><button class="btn outline" data-action="refresh">${icon('refresh',16)} Atualizar</button>${isAdmin()?`<button class="btn outline" data-action="select-visible-tickets" ${filtered.every(x=>state.selectedTicketIds.has(x.id))||!filtered.length?'disabled':''}>Marcar exibidos</button><button class="btn danger" data-action="delete-selected-tickets" ${!state.selectedTicketIds.size?'disabled':''}>Excluir selecionados (${state.selectedTicketIds.size})</button>`:''}</div>
 <div class="panel table-wrap"><table class="data-table"><thead><tr>${isAdmin()?'<th><span class="sr-only">Selecionar</span></th>':''}<th>Chamado</th>${canManage()?'<th>Solicitante</th>':''}<th>Categoria</th><th>Prioridade</th><th>Status</th>${canManage()?'<th>Tempo TI</th>':''}<th>Data</th></tr></thead><tbody>${filtered.map(t=>`<tr class="ticket-clickable" tabindex="0" data-action="ticket" data-id="${esc(t.id)}" aria-label="Abrir chamado ${esc(t.number||t.id)}: ${esc(t.title)}">${isAdmin()?`<td>${t.status!=='pendente'?`<input type="checkbox" aria-label="Selecionar chamado ${esc(t.number||t.id)}" data-action="select-ticket" data-id="${esc(t.id)}" ${state.selectedTicketIds.has(t.id)?'checked':''}>`:''}</td>`:''}<td><button class="linkrow" data-action="ticket" data-id="${esc(t.id)}" style="background:none;border:none;color:var(--text);text-align:left;cursor:pointer"><strong>#${esc(t.number||'...')} · ${esc(t.title)}</strong><div class="cell-secondary">${esc(t.description).slice(0,65)}${t.description?.length>65?'…':''}</div></button></td>${canManage()?`<td>${esc(t.requester_name)}</td>`:''}<td>${esc(t.category)}</td><td>${chip(t.urgency)}</td><td>${chip(t.status)}</td>${canManage()?`<td class="cell-secondary" data-live-ticket-time="${esc(t.id)}">${formatDuration(ticketTotalSeconds(t.id))}</td>`:''}<td class="cell-secondary">${dateShort(t.created_at)}</td></tr>`).join('')}</tbody></table>${filtered.length?'':empty('Nada encontrado.','Tente outro filtro ou abra um chamado.')}</div>`;}
function inventoryMenu(){
 const editable=canEditInventory();
 return `<details class="inventory-menu"><summary class="btn outline">${icon('menu',17)} Mais opções</summary><div class="inventory-menu-items">
  <button type="button" data-action="report" data-report="inventario">${icon('download',16)} Baixar inventário em PDF</button>
  ${editable?`<button type="button" data-action="new-asset" ${state.inventoryMigrationMissing?'disabled':''}>${icon('plus',16)} Cadastrar com patrimônio</button>
  <button type="button" data-action="inventory-labels" ${!state.data.assets.length?'disabled':''}>${icon('printer',16)} Imprimir etiquetas</button>
  <button type="button" data-action="import" ${state.inventoryMigrationMissing?'disabled':''}>${icon('upload',16)} Importar patrimônios CSV</button>`:''}
  <div class="inventory-menu-divider"></div>
  <button type="button" data-action="inventory-tab" data-tab="movements">${icon('refresh',16)} Movimentações</button>
  <button type="button" data-action="inventory-tab" data-tab="maintenance">${icon('settings',16)} Manutenções</button>
 </div></details>`;
}
function inventoryHistoryPage(){
 const movements=state.inventoryTab==='movements';
 const rows=movements?state.data.movements:state.data.maintenance;
 return `<div class="inventory-history-head"><button class="btn outline small" data-action="inventory-tab" data-tab="all">Todos os itens</button><h2>${movements?'Movimentações':'Manutenções'}</h2></div>
 <div class="toolbar">${canEditInventory()?`<button class="btn primary" data-action="${movements?'new-movement':'new-maintenance'}">${icon('plus',16)} ${movements?'Registrar movimentação':'Registrar manutenção'}</button>`:''}<button class="btn outline" data-action="report" data-report="${movements?'movimentacoes':'manutencoes'}">${icon('download',16)} Baixar PDF</button></div>
 <div class="panel table-wrap"><table class="data-table"><thead><tr>${movements?'<th>Data</th><th>Equipamento</th><th>Origem</th><th>Destino</th><th>Observações</th>':'<th>Data</th><th>Patrimônio</th><th>Manutenção</th><th>Responsável</th><th>Situação</th>'}</tr></thead><tbody>${rows.map(x=>{
  const asset=state.data.assets.find(a=>a.id===x.asset_id);
  const item=`<button class="linkrow" data-action="asset-detail" data-id="${esc(x.asset_id)}">${esc(asset?.tag||'—')}</button>`;
  return movements?`<tr><td>${dateShort(x.movement_date+'T12:00:00')}</td><td>${item}</td><td>${esc(x.from_owner||x.from_sector||'—')}</td><td>${esc(x.to_owner||x.to_sector||'—')}</td><td>${esc(x.notes||'—')}</td></tr>`:
   `<tr><td>${dateShort(x.opened_at+'T12:00:00')}</td><td>${item}</td><td><strong>${esc(x.title)}</strong><div class="cell-secondary">${esc(x.action_taken)}</div></td><td>${esc(x.technician||'—')}</td><td>${chip(x.status)}</td></tr>`;
 }).join('')}</tbody></table>${rows.length?'':empty(movements?'Nenhuma movimentação registrada.':'Nenhuma manutenção registrada.','O histórico aparecerá aqui.')}</div>`;
}
function inventoryPage(){
 const overview=buildInventoryOverview(state.data.assets,state.data.stock_items,{category:state.inventoryCategory,search:state.search});
 const editable=canEditInventory();
 const actions=`${editable?`<button class="btn primary" data-action="new-stock-item" ${state.stockMigrationMissing?'disabled':''}>${icon('plus',17)} Adicionar item</button>`:''}${inventoryMenu()}`;
 const header=`<header class="inventory-header"><div><h1>Inventário de TI</h1><p>Todos os itens, organizados por categoria.</p></div><div class="inventory-header-actions">${actions}</div></header>`;
 if(['movements','maintenance'].includes(state.inventoryTab))return `<section class="inventory-page">${header}${inventoryHistoryPage()}</section>`;
 const category=INVENTORY_CATEGORIES.find(type=>type.key===state.inventoryCategory);
 const categories=overview.groups.filter(group=>group.core||group.items.length||group.key===state.inventoryCategory);
 const visibleRecords=overview.visibleItems.length;
 const body=visibleRecords?`<div class="inventory-table-wrap"><table class="inventory-table"><thead><tr><th scope="col">Item</th><th scope="col" class="inventory-quantity">Quantidade</th><th scope="col" class="inventory-location">Localização</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead>
 ${overview.visibleGroups.map(group=>`<tbody>${state.inventoryCategory==='all'?`<tr class="inventory-group-heading"><th scope="rowgroup" colspan="4"><span>${esc(group.label)}</span><small>${shortNum(group.quantity)} un.</small></th></tr>`:''}
 ${group.items.map(item=>`<tr><td><strong class="inventory-item-name">${esc(item.name)}</strong>${item.tag?`<span class="inventory-item-meta">${esc(item.tag)}</span>`:''}<span class="inventory-mobile-location">${esc(item.location||'Sem localização')}</span></td><td class="inventory-quantity"><strong>${shortNum(item.quantity)}</strong><span> un.</span></td><td class="inventory-location">${esc(item.location||'—')}</td><td class="inventory-row-action">${item.source==='asset'?`<button class="inventory-item-action" data-action="asset-detail" data-id="${esc(item.id)}" aria-label="Ver detalhes de ${esc(item.name)}">Detalhes</button>`:editable?`<button class="inventory-item-action" data-action="edit-stock-item" data-id="${esc(item.id)}" aria-label="Editar ${esc(item.name)}">Editar</button>`:''}</td></tr>`).join('')}</tbody>`).join('')}</table></div>`:
 `<div class="inventory-empty">${icon('package',32)}<h3>${state.search?'Nenhum item encontrado':category?'Nenhum item nesta categoria':'Seu inventário começa aqui'}</h3><p>${state.search?'Tente outro nome, marca ou localização.':category?'Os itens cadastrados nesta categoria aparecerão aqui.':'Adicione os equipamentos e materiais para organizar suas quantidades.'}</p>${editable&&!state.search?'<button class="btn outline" data-action="new-stock-item" '+(state.stockMigrationMissing?'disabled':'')+'>Adicionar item</button>':''}</div>`;
 return `<section class="inventory-page">${header}
 <div class="inventory-total"><strong>${shortNum(overview.totalQuantity)}</strong><span>unidades no inventário</span><small>${shortNum(overview.totalRecords)} ${overview.totalRecords===1?'registro':'registros'}</small></div>
 ${state.stockMigrationMissing?'<div class="offline-notice">O estoque por quantidade está temporariamente indisponível. Os patrimônios continuam visíveis.</div>':''}
 ${state.inventoryMigrationMissing?'<div class="offline-notice">O cadastro de patrimônios está temporariamente indisponível.</div>':''}
 <div class="inventory-layout"><nav class="inventory-categories" aria-label="Categorias do inventário"><span class="inventory-category-label">Categorias</span>
 <button class="inventory-category ${state.inventoryCategory==='all'?'active':''}" data-action="inventory-category" data-category="all" aria-pressed="${state.inventoryCategory==='all'}">${icon('package',18)}<span>Todos os itens</span><b>${shortNum(overview.totalQuantity)}</b></button>
 ${categories.map(group=>`<button class="inventory-category ${state.inventoryCategory===group.key?'active':''}" data-action="inventory-category" data-category="${group.key}" aria-pressed="${state.inventoryCategory===group.key}">${icon(group.icon,18)}<span>${esc(group.label)}</span><b>${shortNum(group.quantity)}</b></button>`).join('')}</nav>
 <div class="inventory-list panel"><div class="inventory-list-head"><div><h2>${esc(category?.label||'Todos os itens')}</h2><p>${shortNum(overview.visibleQuantity)} ${overview.visibleQuantity===1?'unidade':'unidades'}${state.search?' encontradas':''}</p></div><div class="inventory-search">${searchbar('Buscar item, marca ou localização...')}</div></div>${body}</div></div></section>`;
}
function activitiesPage(){const activities=[...state.data.activities].sort((a,b)=>String(b.date).localeCompare(String(a.date))).filter(a=>[a.title,a.category,a.sector,a.description].join(' ').toLowerCase().includes(state.search.toLowerCase()));const minutes=state.data.activities.reduce((sum,a)=>sum+Number(a.minutes||0),0);return `${pageHero('Rotina do suporte','Diário de atividades','Registre manutenções, apoio aos setores e trabalhos além dos chamados.',isAdmin()?`<button class="btn primary" data-action="new-activity">${icon('plus',16)} Nova atividade</button>`:'')}
 <div class="cards">${metric('Atividades',state.data.activities.length,'activity','Todos os registros')}${metric('Horas registradas',(minutes/60).toFixed(1).replace('.',',')+' h','clock','Soma de tempo informado')}${metric('Concluídas',state.data.activities.filter(a=>a.status==='Concluída').length,'check','Trabalhos finalizados')}${metric('Pendentes',state.data.activities.filter(a=>a.status!=='Concluída').length,'bell','Atividades em aberto')}</div>
 <div class="toolbar">${searchbar('Pesquisar atividades...')}<button class="btn outline" data-action="report" data-report="atividades">${icon('download',15)} Relatório PDF</button></div><div class="panel table-wrap"><table class="data-table"><thead><tr><th>Data</th><th>Atividade</th><th>Setor</th><th>Tempo</th><th>Status</th></tr></thead><tbody>${activities.map(a=>`<tr><td>${dateShort(a.date+'T12:00:00')}</td><td><strong>${esc(a.title)}</strong><div class="cell-secondary">${esc(a.description||a.category).slice(0,100)}</div></td><td>${esc(a.sector||'—')}</td><td>${esc(a.minutes||0)} min</td><td>${chip(a.status)}</td></tr>`).join('')}</tbody></table>${activities.length?'':empty('Nenhuma atividade registrada.','Registre suas tarefas no diário de TI.')}</div>`;}
function periodWindow(){const day=new Date();let from,to=new Date(day);if(state.period==='diario'){from=new Date(day.getFullYear(),day.getMonth(),day.getDate());to=new Date(day.getFullYear(),day.getMonth(),day.getDate()+1);}else if(state.period==='semanal'){const diff=(day.getDay()+6)%7;from=new Date(day.getFullYear(),day.getMonth(),day.getDate()-diff);to=new Date(from);to.setDate(to.getDate()+7);}else if(state.period==='mensal'){from=new Date(day.getFullYear(),day.getMonth(),1);to=new Date(day.getFullYear(),day.getMonth()+1,1);}else{from=new Date((state.rangeFrom||today())+'T00:00:00');to=new Date((state.rangeTo||today())+'T00:00:00');to.setDate(to.getDate()+1);}return [from,to];}
function periodFilter(rows,prop='created_at'){const [a,b]=periodWindow();return rows.filter(item=>{const raw=item[prop]||'';const dt=/^\d{4}-\d{2}-\d{2}$/.test(raw)?new Date(raw+'T12:00:00'):new Date(raw||0);return dt>=a&&dt<b;});}
function reportsPage(){return `${pageHero('Gestão e indicadores','Central de relatórios','Gere PDFs reais com informações consolidadas para a gestão.')}
 <section class="panel panel-pad mb-3"><div class="form-grid"><div class="field"><label>Período</label><select class="select" id="report-period"><option value="diario" ${state.period==='diario'?'selected':''}>Diário (hoje)</option><option value="semanal" ${state.period==='semanal'?'selected':''}>Semanal (semana atual)</option><option value="mensal" ${state.period==='mensal'?'selected':''}>Mensal (mês atual)</option><option value="personalizado" ${state.period==='personalizado'?'selected':''}>Período personalizado</option></select></div><div class="field"><label>Relatórios</label><div class="muted text-sm" style="padding:10px">Baixe um relatório abaixo.</div></div>${state.period==='personalizado'?`${field('from','Data inicial','date',state.rangeFrom||today())}${field('to','Data final','date',state.rangeTo||today())}`:''}</div></section>
 <div class="report-list">
 ${[['chamados','Chamados e atendimentos','Quantidade, status, prioridade e histórico de solicitações.'],['atividades','Atividades de TI','Trabalhos realizados, setor e tempo registrado.'],['avaliacoes','Avaliações de atendimento','Satisfação e comentários associados aos chamados.'],['inventario','Inventário completo','Equipamentos, materiais e patrimônios com todas as quantidades.']].map(([type,title,desc])=>`<div class="report-card">${icon(type==='inventario'?'package':'file',25)}<div><b>${title}</b><small>${desc}</small></div><button class="btn primary small" data-action="report" data-report="${type}">${icon('download',15)} Baixar PDF</button></div>`).join('')}
 </div><div class="panel panel-pad mt-3"><h3>Como funcionam os PDFs?</h3><p class="muted text-sm mt-2">Os relatórios são gerados diretamente dos registros disponíveis, com data da emissão e filtros por período. As informações são apenas as que seu perfil tem permissão para consultar.</p></div>`;}
function helpPage(){
 const articles=resolveHelpArticles(state.data?.guides,isAdmin());
 const q=String(state.search||'').trim().toLocaleLowerCase('pt-BR');
 const group=state.filter||'all';
 const filtered=articles.filter(g=>(group==='all'||g.category===group)&&[g.title,g.summary,g.category,...g.steps].join(' ').toLocaleLowerCase('pt-BR').includes(q));
 const groups=[['Computadores','Computadores','monitor'],['Internet','Rede e Internet','wifi'],['Impressoras','Impressoras','printer'],['Áudio','Áudio e Headset','headphones'],['Sistemas','Acessos e Sistemas','lock'],['Periféricos','Periféricos','mouse']];
 const defined=new Set(groups.map(g=>g[0]));
 for(const g of articles){if(!defined.has(g.category)){groups.push([g.category,g.category,g.icon||'book']);defined.add(g.category);}}
 const counts=groups.map(([id,label,ico])=>({id,label,ico,n:articles.filter(a=>a.category===id).length})).filter(g=>g.n>0);
 const chosen=filtered.slice(0,3);
 const guideButton=g=>`<button type="button" class="help-article" data-action="guide" data-id="${esc(g.id)}"><span class="help-article-icon">${icon(g.icon||'book',19)}</span><span class="help-article-body"><b>${esc(g.title)}</b><small>${esc(g.summary)}</small></span>${icon('chevron',18)}</button>`;
 return `<div class="help-page">
 <section class="help-hero" aria-labelledby="help-heading">
  <div class="help-hero-copy"><div class="help-kicker">${icon('book',17)} Base de conhecimento</div><h1 id="help-heading">Central de Ajuda</h1><p>Tutoriais e soluções simples para resolver problemas de TI no seu dia a dia.</p>
   <label class="help-search" for="page-search">${icon('search',22)}<input id="page-search" type="search" autocomplete="off" placeholder="Busque um problema, tutorial ou palavra-chave..." value="${esc(state.search||'')}" aria-label="Pesquisar tutoriais"/><span class="help-shortcut" aria-hidden="true">Ctrl + K</span></label>
  </div><img class="help-hero-mascot" src="/assets/goati-mascot.png" alt="Mascote GOATi, um bode com óculos e camisa polo, pronto para ajudar"/>
 </section>
 <div class="help-workspace"><div class="help-main-col">
  <section class="help-section"><div class="help-section-head"><div><h2>${icon('package',22)} Categorias de tutoriais</h2><p>Escolha uma área para encontrar o passo a passo.</p></div>${isAdmin()?`<button class="btn outline small" data-action="new-guide">${icon('plus',15)} Novo tutorial</button>`:''}</div>
   <div class="help-category-grid"><button class="help-category ${group==='all'?'selected':''}" data-action="help-category" data-category="all" aria-pressed="${group==='all'}"><span class="help-category-symbol">${icon('grid',22)}</span><b>Todos</b><small>${articles.length} tutoriais</small></button>
    ${counts.map(c=>`<button class="help-category ${group===c.id?'selected':''}" data-action="help-category" data-category="${esc(c.id)}" aria-pressed="${group===c.id}"><span class="help-category-symbol">${icon(c.ico,22)}</span><b>${esc(c.label)}</b><small>${c.n} ${c.n===1?'tutorial':'tutoriais'}</small></button>`).join('')}
   </div>
  </section>
  ${!q&&group==='all'?`<section class="help-section"><div class="help-section-head"><div><h2>${icon('star',22)} Tutoriais em destaque</h2><p>Encontre rapidamente as respostas para dúvidas comuns.</p></div><button class="help-text-button" data-action="help-all">Ver todos ${icon('arrow',16)}</button></div>
  <div class="help-feature-grid">${[articles.find(x=>x.id==='ajuda-08'),articles.find(x=>x.id==='ajuda-02'),articles.find(x=>x.id==='ajuda-04')].filter(Boolean).map((g,i)=>`<button type="button" class="help-feature help-feature-${i+1}" data-action="guide" data-id="${esc(g.id)}"><span class="help-feature-type">${esc(g.category)}</span><strong>${esc(g.title)}</strong><small>${esc(g.summary)}</small><img src="/assets/goati-mascot.png" alt="" loading="lazy"/><span class="help-feature-arrow">${icon('arrow',17)}</span></button>`).join('')}</div>
 </section>`:''}
 <section class="help-section help-directory" id="help-directory"><div class="help-section-head"><div><h2>${icon('book',22)} ${q?'Resultados da busca':group==='all'?'Todos os tutoriais':esc(group)}</h2><p>${filtered.length} ${filtered.length===1?'guia encontrado':'guias encontrados'}${q?' para “'+esc(state.search)+'”':''}.</p></div>${(q||group!=='all')?`<button class="help-text-button" data-action="help-reset">Limpar filtros ${icon('refresh',15)}</button>`:''}</div>
 <div class="help-article-list">${filtered.map(guideButton).join('')||`<div class="help-empty">${icon('search',27)}<h3>Nenhum tutorial encontrado</h3><p>Tente outra busca ou abra um chamado para o TI.</p><button class="btn primary" data-action="new-ticket">Abrir chamado</button></div>`}</div>
 </section>
 </div><aside class="help-side" aria-label="Atalhos da Central de Ajuda">
  <section class="help-aside-panel help-aside-cta"><div class="help-aside-text"><span>${icon('headphones',25)}</span><h3>Precisa de ajuda?</h3><p>Não encontrou o que precisa? Envie um chamado para nossa equipe de TI.</p><button class="btn primary" data-action="new-ticket">${icon('ticket',17)} Abrir chamado ${icon('arrow',15)}</button></div><img src="/assets/goati-mascot.png" alt="" loading="lazy"/></section>
  <section class="help-aside-panel"><h3>${icon('arrow',18)} Guias rápidos</h3><div class="help-quick-links"><button data-action="guide" data-id="ajuda-08">Como abrir um chamado ${icon('chevron',15)}</button><button data-action="guide" data-id="ajuda-09">Acompanhar e avaliar um chamado ${icon('chevron',15)}</button><button data-action="go" data-view="tutorial">Como usar o GOATi Manager ${icon('chevron',15)}</button><button data-action="guide" data-id="ajuda-10">O que fazer sem internet ${icon('chevron',15)}</button></div></section>
  <section class="help-aside-panel help-tip"><h3>${icon('info',21)} Dica do GOATi</h3><div><img src="/assets/goati-mascot.png" alt="" loading="lazy"/><p>Antes de chamar o TI, confira se os cabos estão conectados e se o equipamento está ligado. Nunca abra o gabinete por conta própria.</p></div></section>
 </aside></div></div>`;
}
function tutorialPage(){const arr=[['1','Entre na sua conta','Cadastre-se com nome, e-mail e setor. O acesso é automático; confirme o e-mail caso o servidor solicitar.'],['2','Encontre as opções principais','Na tela inicial, escolha Novo chamado, Meus chamados ou Central de ajuda.'],['3','Descreva seu problema','Escreva o que está acontecendo, quando começou e o impacto no seu trabalho. Nunca envie senhas.'],['4','Acompanhe a solicitação','Na aba Chamados, consulte o andamento e responda às mensagens do suporte.'],['5','Avalie após a solução','Quando o chamado estiver resolvido, dê sua nota e confirme se funcionou.'],['6','Use a Central de Ajuda','Confira os guias para problemas simples, como um cabo desconectado.'],['7','Instale como aplicativo','No navegador compatível, use a opção Instalar aplicativo. Ele terá um ícone próprio.'],['8','Se a internet cair','Se você já utilizou o aplicativo neste dispositivo, poderá salvar um chamado como pendente. O envio só ocorre após a reconexão.']];return `<div class="tutorial-mascot-hero"><div><div class="eyebrow">Primeiros passos</div><h1>Como usar o aplicativo</h1><p>Aprenda a solicitar suporte, acompanhar chamados e avaliar atendimentos.</p></div><img src="/assets/goati-mascot.png" alt="GOATi, seu guia de suporte"/></div>
 <div class="cols-2"><section class="panel panel-pad"><div class="eyebrow">Passo a passo</div><h2>Do primeiro acesso à avaliação</h2><div class="mt-3">${arr.map(([n,title,desc])=>`<div class="guide-step"><span class="step-number">${n}</span><div><h3>${title}</h3><p class="muted text-sm" style="margin-top:5px">${desc}</p></div></div>`).join('')}</div></section><div class="stack"><section class="panel panel-pad"><div class="guide-icon">${icon('shield',26)}</div><h3 class="mt-3">Cuidados de segurança</h3><p class="muted text-sm mt-2">Não compartilhe senhas, códigos de autenticação ou dados sensíveis em chamados. Não altere BIOS, antivírus ou políticas da empresa por conta própria.</p></section><section class="action-panel"><div><h3>Já sabe o que precisa?</h3><p>Abrir um chamado leva apenas alguns passos.</p></div><button class="btn" data-action="new-ticket">Abrir chamado ${icon('arrow',15)}</button></section></div></div>`;}
function reviewsPage(){const available=state.data.tickets.filter(t=>t.requester_id===userId() && t.status==='resolvido'&&!state.data.reviews.some(r=>r.ticket_id===t.id));const reviews=canManage()?state.data.reviews:state.data.reviews.filter(r=>r.author_id===userId());const avg=reviews.length?(reviews.reduce((sum,r)=>sum+Number(r.rating),0)/reviews.length).toFixed(1).replace('.',','):'—';return `${pageHero('Qualidade do atendimento','Avaliações','A opinião dos colaboradores ajuda a melhorar continuamente o suporte.')}
 <div class="cards">${metric('Avaliações',reviews.length,'star','Total visível')}${metric('Nota média',avg+' / 5','star','Satisfação declarada')}${metric('Problemas resolvidos',reviews.filter(r=>r.resolved).length,'check','Confirmados pelo solicitante')}${metric('Necessita acompanhamento',reviews.filter(r=>!r.resolved).length,'bell','Resolução não confirmada')}</div>
 ${!canManage()&&available.length?`<section class="panel mb-3"><div class="panel-head"><h2>Aguardando sua avaliação</h2></div>${available.map(t=>`<div class="list-row"><div class="row-main"><strong>#${esc(t.number)} · ${esc(t.title)}</strong><small>${dateShort(t.resolved_at||t.updated_at)}</small></div><button class="btn primary small" data-action="rate" data-id="${esc(t.id)}">Avaliar</button></div>`).join('')}</section>`:''}
 <section class="panel"><div class="panel-head"><h2>Avaliações registradas</h2></div>${reviews.map(r=>{const t=state.data.tickets.find(t=>t.id===r.ticket_id);return `<div class="list-row"><div class="row-main"><strong>★ ${esc(r.rating)} / 5 · ${esc(t?.title||'Chamado')}</strong><small>${esc(r.comment||'Sem comentário')} · ${dateShort(r.created_at)}</small></div>${chip(r.resolved?'good':'aberto')}</div>`;}).join('')||empty('Ainda não há avaliações.','As avaliações aparecerão após o fechamento dos chamados.')}</section>`;}
function usersPage(){const rows=[...state.data.profiles].sort((a,b)=>(a.status==='pendente'?0:1)-(b.status==='pendente'?0:1)||new Date(b.created_at)-new Date(a.created_at));return `${pageHero('Administração','Usuários e permissões','Bloqueie, reative ou exclua contas e configure os perfis de acesso da empresa.')}
 <section class="panel"><div class="panel-head"><h2>Contas cadastradas</h2><small>${rows.filter(x=>x.status==='pendente').length} aguardando aprovação</small></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Colaborador</th><th>Setor</th><th>Perfil</th><th>Situação</th><th>Ações</th></tr></thead><tbody>${rows.map(u=>`<tr class="${u.status==='pendente'?'user-pending-row':''}"><td><strong>${esc(u.full_name)}</strong><div class="cell-secondary">${esc(u.email)}</div></td><td>${esc(u.sector)}</td><td>${chip(u.role)}</td><td>${chip(u.status)}</td><td>${u.id===userId()?'<small>Você</small>':`<button class="btn ${u.status==='pendente'?'primary':'outline'} small" data-action="edit-user" data-id="${esc(u.id)}">${u.status==='pendente'?'Regularizar conta':'Gerenciar conta'}</button>`}</td></tr>`).join('')}</tbody></table></div></section>`;}
function settingsPage(){return `${pageHero('Preferências','Configurações','Ajuste o aplicativo e acompanhe a conexão com o servidor.')}
 <div class="cols-2"><div class="stack"><section class="panel panel-pad"><h2>Aparência</h2><p class="muted text-sm mt-2">Personalize o tema. A escolha fica salva neste navegador.</p><div class="toolbar mt-3"><button data-action="theme-light" class="btn ${state.theme==='light'?'primary':'outline'}">${icon('sun',16)} Modo claro</button><button data-action="theme-dark" class="btn ${state.theme==='dark'?'primary':'outline'}">${icon('moon',16)} Modo escuro</button></div></section><section class="panel panel-pad"><h2>Notificações de suporte e cadastros</h2><p class="muted text-sm mt-2">Com o aplicativo aberto e conexão ativa, administradores recebem alertas de novos chamados e novos cadastros pendentes. A aprovação é sempre manual.</p><div class="toolbar mt-3"><button class="btn outline" data-action="notifications">${icon('bell',16)} Solicitar permissão</button><span class="muted text-xs">Permissão: ${esc(state.noticePermission)}</span></div><p class="muted text-xs">Notificações com o navegador fechado exigem uma infraestrutura Web Push adicional e não estão ativadas nesta versão.</p></section></div>
 <div class="stack"><section class="panel panel-pad"><h2>Instalação como aplicativo</h2><p class="muted text-sm mt-2">Use o botão abaixo quando seu navegador oferecer a instalação da PWA.</p><button class="btn primary mt-3" data-action="install">${icon('download',16)} Instalar no Windows</button><p class="muted text-xs mt-2">O aplicativo deve ser servido via HTTPS ou localhost. Abrir o HTML diretamente não ativa o modo offline.</p></section><section class="panel panel-pad"><h2>Sincronização</h2><p class="muted text-sm mt-2">Chamados pendentes neste dispositivo: <b>${state.queue.filter(q=>q.owner===userId()).length}</b>.</p><button class="btn outline mt-3" data-action="sync">${icon('refresh',16)} Sincronizar agora</button><p class="muted text-xs mt-2">${demo?'No modo demonstração, os registros ficam neste navegador e não são enviados à empresa.':'Os chamados pendentes só são enviados quando houver conexão e sessão válida.'}</p></section></div></div>`;}

function ticketTimeEntries(ticketId){return (Array.isArray(state.data.timeEntries)?state.data.timeEntries:[]).filter(e=>e.ticket_id===ticketId);}
function durationSeconds(e){const a=Date.parse(e.started_at),b=e.ended_at?Date.parse(e.ended_at):Date.now();return Number.isFinite(a)&&Number.isFinite(b)?Math.max(0,Math.floor((b-a)/1000)):0;}
function ticketTotalSeconds(id){return ticketTimeEntries(id).reduce((s,e)=>s+durationSeconds(e),0);}
function formatDuration(v){const n=Math.max(0,Math.floor(Number(v)||0));return [Math.floor(n/3600),Math.floor(n%3600/60),n%60].map(x=>String(x).padStart(2,'0')).join(':');}
function updateTimerDisplays(){document.querySelectorAll('[data-live-ticket-time]').forEach(el=>{if(el.dataset.liveTicketTime)el.textContent=formatDuration(ticketTotalSeconds(el.dataset.liveTicketTime));});}
let timerDisplayStarted=false;
function startTimerDisplay(){if(!timerDisplayStarted){timerDisplayStarted=true;setInterval(updateTimerDisplays,1000);}}
function ticketTimerPanel(t){
 if(state.timerMigrationMissing&&!demo)return '<section class="panel panel-pad mt-3"><h3>Tempo de atendimento</h3><p class="muted text-sm">Ative a migração SQL no Supabase para utilizar o cronômetro.</p></section>';
 const entries=ticketTimeEntries(t.id),running=entries.find(e=>e.technician_id===userId()&&!e.ended_at),hasTime=entries.some(e=>e.technician_id===userId()),resolved=t.status==='resolvido';
 const buttons=isAdmin()?`<div class="timer-controls">${running?`<button class="btn outline" data-action="ticket-timer" data-operation="pause" data-id="${esc(t.id)}">Pausar</button><button class="btn primary" data-action="ticket-timer" data-operation="finish" data-id="${esc(t.id)}">Finalizar atendimento</button>`:resolved?'<p class="muted text-xs">Reabra o chamado para iniciar novo atendimento.</p>':`<button class="btn primary" data-action="ticket-timer" data-operation="start" data-id="${esc(t.id)}">${hasTime?'Retomar atendimento':'Iniciar atendimento'}</button>${hasTime?`<button class="btn outline" data-action="ticket-timer" data-operation="finish" data-id="${esc(t.id)}">Finalizar atendimento</button>`:''}`}</div>`:'';
 return `<section class="panel panel-pad mt-3 timer-panel"><div class="panel-head"><h3>Tempo de atendimento</h3>${entries.some(e=>!e.ended_at)?'<span class="chip andamento">Em contagem</span>':''}</div><strong class="timer-clock" data-live-ticket-time="${esc(t.id)}">${formatDuration(ticketTotalSeconds(t.id))}</strong>
 ${buttons}${entries.length?`<div class="timer-sessions">${[...entries].sort((a,b)=>Date.parse(b.started_at)-Date.parse(a.started_at)).slice(0,12).map(e=>{const p=state.data.profiles.find(p=>p.id===e.technician_id);return `<div><small>${esc(p?.full_name||'Equipe de TI')} · ${dateLong(e.started_at)}</small><span>${formatDuration(durationSeconds(e))}${e.ended_at?'':' · Em andamento'}</span></div>`;}).join('')}</div>`:'<p class="muted text-xs mt-2">Nenhum tempo registrado.</p>'}
 <p class="muted text-xs mt-2">O Supabase guarda cada sessão. Fechar o navegador não pausa a contagem.</p></section>`;
}

function renderModal(){const m=state.modal;let title='',description='',body='',wide=false;
 if(m.type==='new-ticket'){title='Novo chamado';description='Conte o que aconteceu. Não inclua senhas ou códigos de acesso.';body=`<form id="form-ticket" class="form-grid">${field('title','Título do problema','text','', 'required minlength="5" maxlength="140" placeholder="Ex.: Meu computador não liga"')}${selection('category','Categoria',cats)}${selection('urgency','Impacto percebido',['baixa','media','alta','critica'],'media')}${selection('sector','Setor',sectors,state.profile?.sector||'') }<div class="span-2">${textarea('description','Descrição detalhada','',10)}</div><div class="span-2"><p class="muted text-xs">O impacto ajuda o TI a organizar a fila, mas a prioridade final pode ser ajustada pelo administrador. Se estiver offline, o chamado ficará pendente neste dispositivo.</p></div><div class="form-actions span-2"><button type="button" class="btn outline" data-action="close-modal">Cancelar</button><button class="btn primary" type="submit">${icon('check',16)} Enviar chamado</button></div></form>`;}
 if(m.type==='ticket'){const t=getTicket(m.id);if(!t)return '';title=`Chamado #${esc(t.number||'Pendente')}`;description=t.title;wide=true;const isPending=t.status==='pendente';const messages=state.data.messages.filter(x=>x.ticket_id===t.id).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));const reviewed=state.data.reviews.some(r=>r.ticket_id===t.id);body=`<div class="detail-grid"><div><small>Solicitante</small><b>${esc(t.requester_name)}</b></div><div><small>Setor</small><b>${esc(t.sector)}</b></div><div><small>Prioridade</small>${chip(t.urgency)}</div><div><small>Status</small>${chip(t.status)}</div><div><small>Categoria</small><b>${esc(t.category)}</b></div><div><small>Aberto em</small><b>${dateShort(t.created_at)}</b></div></div><h3>Descrição</h3><div class="detail-desc mt-2">${esc(t.description)}</div>
 ${isPending?'<div class="offline-notice mt-3">Este chamado está salvo somente neste computador e ainda não chegou à fila do TI. Ele será enviado quando a conexão voltar.</div>':''}
 ${canManage()&&!isPending?ticketTimerPanel(t):''}
 ${!isPending&&canViewInventory()?`<section class="panel panel-pad mt-3"><h3>Patrimônio relacionado</h3>${t.asset_id?(()=>{const a=state.data.assets.find(a=>a.id===t.asset_id);return a?`<button class="btn outline small mt-2" data-action="asset-detail" data-id="${esc(a.id)}">${esc(a.tag)} · ${esc(a.category)} · ${esc(a.model)}</button>`:'';})():''}
  ${canEditInventory()?`<form id="form-ticket-asset" data-id="${esc(t.id)}" class="toolbar mt-2"><select class="select" name="asset_id"><option value="">Sem patrimônio</option>${state.data.assets.filter(a=>a.status!=='Baixado'||a.id===t.asset_id).map(a=>`<option value="${esc(a.id)}" ${a.id===t.asset_id?'selected':''}>${esc(a.tag)} · ${esc(a.category)} · ${esc(a.model)}</option>`).join('')}</select><button class="btn primary small" type="submit">Associar</button></form>`:''}</section>`:''}

 ${canManage()&&state.data.reviews.some(r=>r.ticket_id===t.id)?(()=>{const r=state.data.reviews.find(r=>r.ticket_id===t.id);return `<section class="panel panel-pad mt-3"><h3>Avaliação do usuário</h3><p class="muted text-sm mt-2">${esc('★'.repeat(Number(r.rating)||0))} · Nota ${esc(r.rating)}/5 · ${r.resolved?'Problema resolvido':'Solicitação reaberta'}</p><p class="mt-2">${esc(r.comment||'Sem comentário')}</p></section>`;})():''}
 ${isAdmin()&&!isPending?`<form id="form-status" data-id="${esc(t.id)}" class="form-grid mt-3"><div class="span-2"><h3>Gerenciar atendimento</h3></div>${selection('status','Situação',Object.keys(statusNames),t.status)}${selection('urgency','Prioridade',Object.keys(urgencyNames),t.urgency)}<div class="form-actions span-2"><button class="btn primary" type="submit">Salvar alterações</button></div></form>`:''}
 <div class="separator"></div><h3>Histórico de mensagens</h3><div class="timeline mt-3">${messages.filter(msg=>isAdmin()||!msg.internal).map(msg=>`<div class="msg"><strong>${esc(msg.author_name||'Usuário')}</strong><small>${dateLong(msg.created_at)}</small><p>${esc(msg.body)}</p>${msg.internal?'<small>Nota interna</small>':''}</div>`).join('')||'<p class="muted text-sm">Nenhuma mensagem registrada.</p>'}</div>
 ${!isPending&&!isManager()?`<form id="form-message" data-id="${esc(t.id)}"><div class="field">${textarea('body','Adicionar mensagem')}</div>${isAdmin()?'<label class="text-xs muted"><input type="checkbox" name="internal"> Nota interna, visível apenas à equipe autorizada</label>':''}<div class="form-actions"><button class="btn primary" type="submit">Enviar mensagem</button></div></form>`:''}
 ${!isPending&&!isAdmin()&&t.status==='resolvido'&&!reviewed?`<div class="separator"></div><button class="btn primary" data-action="rate" data-id="${esc(t.id)}">${icon('star',16)} Avaliar atendimento</button>`:''}
  ${isAdmin()&&!isPending?`<div class="separator"></div><button class="btn danger" data-action="ask-delete-ticket" data-id="${esc(t.id)}">Excluir chamado permanentemente</button>`:''}`;}
 if(m.type==='delete-tickets'){
   const ids=[...new Set(m.ids||[])].filter(id=>state.data.tickets.some(t=>t.id===id));
   if(!isAdmin()||!ids.length)return '';
   title=ids.length===1?'Excluir chamado':'Excluir chamados selecionados';
   description='A exclusão é definitiva e fica registrada na auditoria.';
   body=`<form id="form-delete-tickets" class="stack"><div class="auth-note"><strong>Atenção:</strong> ${ids.length} chamado(s) serão removidos do banco, incluindo mensagens, histórico de eventos e avaliações vinculadas. Não é possível desfazer essa ação.</div><div class="ticket-delete-preview">${ids.slice(0,8).map(id=>{const t=state.data.tickets.find(t=>t.id===id);return `<div>#${esc(t.number)} · ${esc(t.title)}</div>`;}).join('')}${ids.length>8?`<div>E mais ${ids.length-8} chamado(s)...</div>`:''}</div><div class="field"><label for="confirm-delete-tickets">Digite EXCLUIR para confirmar</label><input class="input" id="confirm-delete-tickets" name="confirmation" type="text" placeholder="EXCLUIR" pattern="EXCLUIR" autocomplete="off" required></div><div class="form-actions"><button type="button" class="btn outline" data-action="close-modal">Cancelar</button><button type="submit" class="btn danger">Excluir ${ids.length} chamado(s) definitivamente</button></div></form>`;
  }
 if(m.type==='asset'){
  if(!canEditInventory())return '';
  const a=state.data.assets.find(a=>a.id===m.id)||{};
  title=m.id?'Editar patrimônio':'Cadastrar equipamento';description='Código GL automático e permanente gerado pelo banco.';wide=true;
  body=`<form id="form-asset" data-id="${esc(m.id||'')}" class="form-grid">
   <div class="span-2 asset-tag-display">${m.id?`<strong>${esc(a.tag)}</strong>${a.legacy_tag?`<small>Anterior: ${esc(a.legacy_tag)}</small>`:''}`:'<strong>GL — gerado automaticamente no cadastro</strong>'}<small>O número é permanente e não poderá ser reutilizado.</small></div>
   ${selection('category','Categoria',assetCats,a.category||'')}
   ${field('brand','Marca / fabricante','text',a.brand||'')}
   ${field('model','Modelo','text',a.model||'')}
   ${field('serial','Número de série','text',a.serial||'')}
   ${field('owner','Colaborador responsável','text',a.owner||'')}
   ${selection('sector','Setor',sectors,a.sector||'')}
   ${field('location','Localização física','text',a.location||'')}
   ${selection('status','Situação',['Disponível','Em uso','Em manutenção','Armazenado','Baixado'],a.status||'Em uso')}
   ${selection('condition','Conservação',['Novo','Bom','Regular','Ruim','Defeituoso'],a.condition||'Bom')}
   ${field('acquired_on','Data de aquisição','date',a.acquired_on||'')}
   ${field('warranty_until','Garantia até','date',a.warranty_until||'')}
   ${field('last_checked_on','Última conferência física','date',a.last_checked_on||'')}
   ${field('last_assigned_on','Data da atribuição','date',a.last_assigned_on||'')}
   ${field('imei','IMEI (se celular)','text',a.imei||'')}
   ${field('line','Linha (se aplicável)','text',a.line||'')}
   <div class="span-2">${textarea('notes','Observações',a.notes||'')}</div>
   <p class="span-2 muted text-xs">Patrimônios novos representam um equipamento por etiqueta. Lotes antigos permanecem registrados até conferência. Não informe PIN ou senhas.</p>
   <div class="form-actions span-2"><button class="btn outline" type="button" data-action="close-modal">Cancelar</button><button class="btn primary" type="submit">Salvar equipamento</button></div>
  </form>`;
 }
 if(m.type==='movement'){
 title='Movimentar patrimônio';description='A alteração de responsável e setor ficará registrada no histórico.';
 const options=state.data.assets.map(a=>`<option value="${esc(a.id)}">${esc(a.tag)} · ${esc(a.model||a.category)}</option>`).join('');
 body=`<form id="form-movement" class="form-grid"><div class="field span-2"><label>Equipamento</label><select class="select" name="asset_id" required><option value="">Selecione o patrimônio</option>${options}</select></div>${field('movement_date','Data','date',today(),'required')}${field('from_owner','Responsável anterior','text')}${field('from_sector','Setor anterior','text')}${field('to_owner','Novo responsável','text','','required')}${selection('to_sector','Setor de destino',sectors,'')}${field('new_location','Nova localização','text')}<div class="span-2">${textarea('notes','Motivo / observações')}</div><div class="form-actions span-2"><button type="button" class="btn outline" data-action="close-modal">Cancelar</button><button class="btn primary" type="submit">Registrar transferência</button></div></form>`;
 }
 if(m.type==='maintenance'){
 title='Registrar manutenção';description='Associe o atendimento ao equipamento do inventário.';
 const options=state.data.assets.map(a=>`<option value="${esc(a.id)}">${esc(a.tag)} · ${esc(a.model||a.category)}</option>`).join('');
 body=`<form id="form-maintenance" class="form-grid"><div class="field span-2"><label>Patrimônio</label><select class="select" name="asset_id" required><option value="">Selecione</option>${options}</select></div>${field('opened_at','Data','date',today(),'required')}${field('title','Problema / procedimento','text','','required')}${field('technician','Responsável técnico','text',state.profile?.full_name||'')}${selection('status','Situação',['Em andamento','Concluída','Pendente'],'Concluída')}<div class="span-2">${textarea('action_taken','O que foi realizado?')}</div><div class="form-actions span-2"><button type="button" class="btn outline" data-action="close-modal">Cancelar</button><button class="btn primary" type="submit">Registrar manutenção</button></div></form>`;
 }
 if(m.type==='activity'){title='Registrar atividade de TI';description='Use esta opção para atividades não necessariamente vinculadas a um chamado.';body=`<form id="form-activity" class="form-grid">${field('date','Data','date',today(),'required')}${field('title','Atividade','text','','required minlength="3"')}${selection('category','Categoria',['Suporte','Manutenção','Inventário','Redes','Segurança','Sistemas','Projetos','Outros'])}${selection('sector','Setor',sectors,'TI')}${field('minutes','Duração (minutos)','number','30','required min="0" max="1440"')}${selection('status','Situação',['Concluída','Em andamento','Pendente'],'Concluída')}<div class="span-2">${textarea('description','Procedimento realizado')}</div><div class="form-actions span-2"><button type="button" class="btn outline" data-action="close-modal">Cancelar</button><button type="submit" class="btn primary">Salvar atividade</button></div></form>`;}
 if(m.type==='guide'){const g=resolveHelpArticles(state.data.guides,isAdmin()).find(x=>x.id===m.id);title=g?g.title:'Novo tutorial';description=g?g.summary:'Adicione um guia para dúvidas frequentes dos colaboradores.';body=g?`<div class="help-guide-intro"><div><div class="eyebrow">${esc(g.category)}</div><h3>Vamos resolver juntos!</h3><p>Confira cada etapa com calma. Se não funcionar, abra um chamado e o TI continuará de onde você parou.</p></div><img src="/assets/goati-mascot.png" alt="Mascote GOATi com óculos e polo"/></div><div>${(g.steps||[]).map((s,i)=>`<div class="guide-step"><span class="step-number">${i+1}</span><div>${esc(s)}</div></div>`).join('')}</div><div class="separator"></div><p class="muted text-sm mb-3">Conseguiu resolver seu problema?</p><div class="toolbar"><button class="btn outline" data-action="guide-solved">${icon('check',16)} Sim, resolveu</button><button class="btn primary" data-action="guide-ticket" data-title="${esc(g.title)}">${icon('ticket',16)} Não, abrir chamado</button></div>`:
 `<form id="form-guide" class="form-grid">${field('title','Título','text','','required')}${field('category','Categoria','text','','required')}${field('summary','Resumo','text','','required')}<div class="span-2">${textarea('steps','Passos (uma instrução por linha)','',10)}</div><div class="form-actions span-2"><button type="button" class="btn outline" data-action="close-modal">Cancelar</button><button class="btn primary" type="submit">Publicar tutorial</button></div></form>`;}
 if(m.type==='rate'){const t=getTicket(m.id);title='Avaliar atendimento';description='Sua opinião nos ajuda a melhorar o suporte.';body=`<form id="form-rate" data-id="${esc(m.id)}" class="stack"><div class="field"><label>Como você avalia o atendimento?</label><div class="review-stars" role="radiogroup" aria-label="Nota de atendimento">${[1,2,3,4,5].map(n=>`<label class="review-star-choice"><input type="radio" name="rating" value="${n}" required><span aria-hidden="true">${'★'.repeat(n)}</span><small>${n} de 5</small></label>`).join('')}</div></div><div class="field"><label>O problema foi realmente resolvido?</label><select class="select" name="resolved" required><option value="true">Sim, está funcionando</option><option value="false">Não, ainda preciso de ajuda</option></select></div>${textarea('comment','Comentário (opcional)')}<div class="form-actions"><button type="button" class="btn outline" data-action="close-modal">Cancelar</button><button type="submit" class="btn primary">Enviar avaliação</button></div></form>`;}
 if(m.type==='user'){const u=state.data.profiles.find(u=>u.id===m.id);title='Acesso do colaborador';description=u?.full_name||'';body=`<form id="form-user" data-id="${esc(m.id)}" class="stack"><div class="field"><label>Perfil</label><select class="select" name="role">${[['funcionario','Funcionário'],['gestao','Gestão'],['admin','Administrador']].map(([v,n])=>`<option value="${v}" ${v===u.role?'selected':''}>${n}</option>`).join('')}</select></div><div class="field"><label>Situação da conta</label><select class="select" name="status">${[['pendente','Pendente de aprovação'],['ativo','Ativo'],['bloqueado','Bloqueado']].map(([v,n])=>`<option value="${v}" ${v===u.status?'selected':''}>${n}</option>`).join('')}</select></div>${Object.prototype.hasOwnProperty.call(u,'can_manage_inventory')?`<label class="asset-permission"><input type="checkbox" name="can_manage_inventory" ${u.can_manage_inventory?'checked':''}> Autorizar este colaborador a administrar o inventário de TI (sem acesso a outros módulos restritos)</label>`:'<p class="muted text-xs">A permissão de TI aparecerá após aplicar a migração patrimonial GL.</p>'}<p class="muted text-xs">O bloqueio corta o acesso aos dados corporativos, inclusive com a sessão ainda aberta. Não compartilhe credenciais.</p><div class="form-actions"><button class="btn outline" type="button" data-action="close-modal">Cancelar</button><button class="btn primary" type="submit">Salvar permissões</button></div></form>${u&&u.id!==userId()&&u.role!=='admin'?`<div class="separator"></div><button class="btn danger" data-action="ask-delete-user" data-id="${esc(u.id)}">Excluir conta do colaborador</button><p class="muted text-xs mt-2">Exclusão definitiva somente para contas sem histórico de atendimento. Caso tenha histórico, use Bloqueado.</p>`:''}`;}
 if(m.type==='delete-user'){
  if(!isAdmin())return '';
  const u=state.data.profiles.find(p=>p.id===m.id);
  if(!u||u.id===userId()||u.role==='admin')return '';
  title='Excluir usuário permanentemente';
  description=u.full_name||'Colaborador';
  body=`<form id="form-delete-user" data-id="${esc(u.id)}" class="stack"><div class="auth-note"><strong>Atenção:</strong> a conta será excluída também da autenticação do Supabase e não poderá mais entrar. A ação é irreversível. Se houver chamados, mensagens, avaliações ou atendimentos vinculados, a exclusão será recusada para preservar o histórico; nesse caso, bloqueie a conta.</div><p><strong>${esc(u.full_name)}</strong> · ${esc(u.email)}</p><div class="field"><label for="delete-user-confirm">Digite EXCLUIR para confirmar</label><input class="input" id="delete-user-confirm" name="confirmation" type="text" autocomplete="off" pattern="EXCLUIR" placeholder="EXCLUIR" required></div><div class="form-actions"><button class="btn outline" type="button" data-action="close-modal">Cancelar</button><button class="btn danger" type="submit">Excluir esta conta</button></div></form>`;
 }
 if(m.type==='stock-item'){
  if(!canEditInventory()||state.stockMigrationMissing)return '';
  const item=state.data.stock_items.find(item=>item.id===m.id);
  if(m.id&&!item)return '';
  title=item?'Editar item':'Adicionar item';
  description='Informe o item e a quantidade disponível.';
  const category=INVENTORY_CATEGORIES.find(type=>type.key===state.inventoryCategory);
  const suggestedName=category?.prefix?category.prefix+' ':'';
  body=`<form id="form-stock-item" data-id="${esc(item?.id||'')}" class="stack">
   ${field('name','Nome do item','text',item?.name??suggestedName,'required maxlength="120" placeholder="Ex.: Teclado HP, Mouse HP ou Cabo HDMI"')}
   ${field('quantity','Quantidade','number',item?.quantity??1,'required min="0" max="2147483647" step="1"')}
   ${field('location','Localização (opcional)','text',item?.location??'Estoque de TI','maxlength="120"')}
   <div class="form-actions"><button class="btn outline" type="button" data-action="close-modal">Cancelar</button><button class="btn primary" type="submit">Salvar item</button></div>
  </form>`;
 }
 if(m.type==='asset-detail'){
  if(!canViewInventory())return '';
  const a=state.data.assets.find(a=>a.id===m.id);if(!a)return '';
  title='Patrimônio '+a.tag;description=[a.category,a.brand,a.model].filter(Boolean).join(' · ');wide=true;
  const events=state.data.assetEvents.filter(x=>x.asset_id===a.id).slice(0,40);
  const linked=ownTickets().filter(t=>t.asset_id===a.id);
  const qr=(()=>{try{return qrSvg(a.tag,175);}catch(e){return '<p class="muted text-xs">Não foi possível gerar o QR Code neste navegador.</p>';}})();
  body=`<div class="asset-detail-top"><div class="asset-detail-qr">${qr}<strong>${esc(a.tag)}</strong></div><div class="stack"><div class="detail-grid"><div><small>Categoria</small><b>${esc(a.category)}</b></div><div><small>Marca e modelo</small><b>${esc([a.brand,a.model].filter(Boolean).join(' ')||'—')}</b></div><div><small>Número de série</small><b>${esc(a.serial||'—')}</b></div><div><small>Situação</small>${chip(a.status)}</div><div><small>Responsável</small><b>${esc(a.owner||'—')}</b></div><div><small>Setor</small><b>${esc(a.sector||'—')}</b></div><div><small>Localização</small><b>${esc(a.location||'—')}</b></div><div><small>Conservação</small><b>${esc(a.condition||'—')}</b></div><div><small>Data de aquisição</small><b>${esc(a.acquired_on||'—')}</b></div><div><small>Garantia até</small><b>${esc(a.warranty_until||'—')}</b></div><div><small>Última conferência</small><b>${esc(a.last_checked_on||'—')}</b></div><div><small>Unidades</small><b>${esc(a.quantity||1)}</b></div></div>
  ${a.legacy_tag?`<p class="muted text-xs">Etiqueta anterior: ${esc(a.legacy_tag)}</p>`:''}
  <p class="muted text-xs">${esc(a.notes||'Sem observações.')}</p>
  <div class="toolbar">${canEditInventory()?`<button class="btn primary small" data-action="asset-label" data-id="${esc(a.id)}">${icon('printer',16)} Gerar etiqueta PDF</button><button class="btn outline small" data-action="edit-asset" data-id="${esc(a.id)}">Editar</button>`:''}<button class="btn outline small" data-action="copy-asset-link" data-id="${esc(a.id)}">Copiar link do QR</button></div>
  </div></div>
  <div class="separator"></div><h3>Chamados relacionados (${linked.length})</h3>
  <div class="stack mt-2">${linked.map(t=>`<button class="btn outline asset-related-ticket" data-action="ticket" data-id="${esc(t.id)}">#${esc(t.number)} · ${esc(t.title)} · ${esc(t.status)}</button>`).join('')||'<p class="muted text-xs">Nenhum chamado visível associado a este patrimônio.</p>'}</div>
  <div class="separator"></div><h3>Movimentações e manutenções</h3>
  <div class="stack mt-2">${state.data.movements.filter(x=>x.asset_id===a.id).map(x=>`<div class="asset-history-entry"><strong>Movimentação · ${esc(x.to_sector||x.to_owner||'—')}</strong><small>${esc(x.movement_date)} · ${esc(x.notes||'Sem observações')}</small></div>`).join('')}${state.data.maintenance.filter(x=>x.asset_id===a.id).map(x=>`<div class="asset-history-entry"><strong>Manutenção · ${esc(x.title)}</strong><small>${esc(x.opened_at)} · ${esc(x.status)}</small></div>`).join('')||(!state.data.movements.some(x=>x.asset_id===a.id)?'<p class="muted text-xs">Nenhum movimento ou manutenção.</p>':'')}</div>
  <div class="separator"></div><h3>Auditoria patrimonial</h3>
  <div class="stack mt-2">${events.map(ev=>`<div class="asset-history-entry"><strong>${esc(ev.event_type)}</strong><small>${dateLong(ev.created_at)} · ${esc(state.data.profiles.find(p=>p.id===ev.actor_id)?.full_name||'Equipe autorizada')}</small></div>`).join('')||'<p class="muted text-xs">Nenhum evento adicional registrado nesta versão.</p>'}</div>`;
 }

 if(m.type==='labels-range'){
  if(!canEditInventory())return '';
  title='Etiquetas por número GL';
  description='Escolha os códigos exatos que deseja imprimir. Nenhum patrimônio será alterado.';
  body='<form id="form-labels-range" class="stack"><div class="form-grid">'
   +field('gl_from','Do patrimônio GL','text','','required placeholder="Ex.: 21 ou GL-000021"')
   +field('gl_to','Até o patrimônio GL (opcional)','text','','placeholder="Ex.: 30 ou GL-000030"')
   +'</div><p class="muted text-xs">Para imprimir apenas uma etiqueta, deixe o segundo campo vazio. O intervalo inclui somente patrimônios já cadastrados; confira a prévia antes de exportar o PDF.</p>'
   +'<div class="form-actions"><button class="btn outline" type="button" data-action="close-modal">Cancelar</button><button class="btn primary" type="submit">Conferir etiquetas</button></div></form>';
 }
 if(m.type==='inventory-labels'){
  if(!canEditInventory())return '';
  title='Etiquetas de patrimônio';description='Escolha os patrimônios que deseja imprimir.';wide=true;
  const assets=[...state.data.assets].sort((a,b)=>a.tag.localeCompare(b.tag));
  body=`<div class="toolbar"><button class="btn primary" data-action="labels-selected" ${!state.selectedAssetIds.size?'disabled':''}>Imprimir selecionados (${state.selectedAssetIds.size})</button><button class="btn outline" data-action="labels-visible" ${!assets.length?'disabled':''}>Imprimir todos</button><button class="btn outline" data-action="labels-range">Por número GL</button><button class="btn outline" data-action="clear-selected-assets" ${!state.selectedAssetIds.size?'disabled':''}>Limpar seleção</button></div>
   <div class="table-wrap"><table class="data-table"><thead><tr><th><label class="asset-select-all"><input type="checkbox" data-action="select-all-assets" aria-label="Selecionar todos os patrimônios exibidos" ${assets.length&&assets.every(a=>state.selectedAssetIds.has(a.id))?'checked':''} ${!assets.length?'disabled':''}> Todos</label></th><th>Patrimônio</th><th>Item</th></tr></thead><tbody>${assets.map(a=>`<tr class="asset-clickable inventory-label-row" data-id="${esc(a.id)}"><td><input type="checkbox" data-action="select-asset" data-id="${esc(a.id)}" aria-label="Selecionar patrimônio ${esc(a.tag)}" ${state.selectedAssetIds.has(a.id)?'checked':''}></td><td>${esc(a.tag)}</td><td>${esc([a.category,a.brand,a.model].filter(Boolean).join(' '))}</td></tr>`).join('')}</tbody></table></div>`;
 }
 if(m.type==='labels'){
  if(!canEditInventory())return '';
  const assets=[...new Set(m.ids||[])].map(id=>state.data.assets.find(a=>a.id===id)).filter(Boolean);if(!assets.length)return '';
  title=assets.length===1?'Etiqueta patrimonial':'Etiquetas em lote';
  description=assets.length+' etiqueta(s) · impressão em papel A4';wide=true;
  const preview=(()=>{try{return qrSvg(assets[0].tag,142);}catch{return '<p>QR indisponível</p>';}})();
  body=`<form id="form-labels" class="stack"><div class="asset-label-preview"><div>${preview}</div><div><strong>${esc(assets[0].tag)}</strong><p>Proprietária: ${esc(ASSET_OWNER_NAME)}</p><small>${esc(assets[0].category)} · ${esc(assets[0].brand)} ${esc(assets[0].model)}</small></div></div>${assets.length>1?`<p class="muted text-xs">Este é um exemplo. O PDF terá todas as ${assets.length} etiquetas selecionadas.</p>`:''}
  <label class="field">Tamanho da etiqueta<select class="select" name="label_size">${LABEL_SIZES.map(x=>`<option value="${esc(x.key)}" ${x.key==='60x30'?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>
  ${m.rangeDescription?`<p class="muted text-xs">Intervalo solicitado: <strong>${esc(m.rangeDescription)}</strong>. ${m.rangeMissing?`${m.rangeMissing} número(s) desse intervalo não estão cadastrados e serão ignorados.`:'Todos os números do intervalo estão cadastrados.'}</p>`:''}
  <p class="muted text-xs">Patrimônios incluídos: ${esc(assets.map(a=>a.tag).slice(0,25).join(', '))}${assets.length>25?'…':''}</p>
  <p class="muted text-xs">O PDF será gerado em folha A4. Imprima em escala real (100%) para manter as dimensões. A reimpressão não altera o patrimônio.</p>
  <div class="form-actions"><button class="btn outline" type="button" data-action="close-modal">Cancelar</button><button class="btn primary" type="submit">${icon('download',16)} Exportar etiquetas PDF</button></div></form>`;
 }
 if(m.type==='import-preview'){
  if(!canEditInventory()||!state.importPreview)return '';
  const p=state.importPreview;title='Conferir importação';description='Nenhum registro foi salvo ainda.';wide=true;
  body=`<div class="stack"><p><strong>${p.expanded}</strong> equipamento(s) de <strong>${p.rows}</strong> linha(s). <strong>${p.errors.length}</strong> erro(s) encontrados.</p>
  ${p.errors.length?`<section class="offline-notice"><strong>Corrija o CSV antes de importar.</strong><div class="stack mt-2">${p.errors.slice(0,20).map(e=>`<small>Linha ${e.line}: ${esc(e.message)}</small>`).join('')}</div>${p.errors.length>20?'<small>Há outros erros; revise o arquivo completo.</small>':''}</section>`:''}
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Linha</th><th>Categoria</th><th>Marca/Modelo</th><th>Série</th><th>Quantidade</th></tr></thead><tbody>${p.preview.slice(0,15).map(item=>`<tr><td>${item.line}</td><td>${esc(item.category)}</td><td>${esc(item.brand)} ${esc(item.model)}</td><td>${esc(item.serial||'—')}</td><td>${item.quantity}</td></tr>`).join('')}</tbody></table></div>
  <p class="muted text-xs">Todas as etiquetas GL serão geradas pelo banco em uma única operação. Se alguma linha falhar, nenhuma será cadastrada.</p>
  <div class="form-actions"><button type="button" class="btn outline" data-action="close-modal">Cancelar</button><button class="btn primary" data-action="confirm-import" ${p.errors.length||!p.items.length?'disabled':''}>Confirmar importação (${p.items.length})</button></div></div>`;
 }
 if(m.type==='import'){title='Importar inventário';description='Aceita CSV exportado das abas Equipamentos, Celulares ou Cabos da planilha da organização.';body=`<form id="form-import" class="stack"><div class="field"><label>Origem dos dados</label><select class="select" name="kind"><option value="Equipamentos">Equipamentos</option><option value="Celulares">Celulares</option><option value="Cabos">Cabos</option></select></div><div class="field"><label>Arquivo .csv</label><input class="input" type="file" name="file" accept=".csv,text/csv" required><span class="hint">No Excel, abra a aba desejada e use Arquivo → Salvar como → CSV UTF-8.</span></div><p class="muted text-xs">Os patrimônios GL são gerados automaticamente. A próxima etapa mostra uma prévia e erros, sem gravar registros.</p><div class="form-actions"><button class="btn outline" type="button" data-action="close-modal">Cancelar</button><button class="btn primary" type="submit">Validar e visualizar</button></div></form>`;}
 return `<div class="modal-bg" data-action="close-backdrop"><section class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header class="modal-head"><div><h2>${title}</h2><p>${description}</p></div><button class="icon-btn" data-action="close-modal" aria-label="Fechar">${icon('close',18)}</button></header><div class="modal-body">${body}</div></section></div>`;
}
function authPage(){document.documentElement.dataset.theme=state.theme;let heading='Bem-vindo de volta',sub='Acesse sua central de operações e suporte.';
 if(state.authView==='signup'){heading='Criar sua conta';sub='Cadastre-se para acessar a central de suporte.';}
 if(state.authView==='forgot'){heading='Recuperar senha';sub='Enviaremos um link para redefinir sua senha.';}
 if(state.authView==='reset'){heading='Definir nova senha';sub='Escolha uma nova senha para sua conta.';}
 app.innerHTML=`<div class="auth-page"><div class="auth-showcase"><div class="auth-showcase-inner"><div class="brand"><div class="brand-icon"><img src="/assets/goati-mark.png" alt="" /></div><div class="brand-copy"><b class="brand-wordmark">GOAT<span class="brand-i">i</span></b><span class="brand-manager">MANAGER</span></div></div><div class="eyebrow">Suporte inteligente</div><h1>Seu trabalho flui.<br><span class="auth-accent">O suporte acompanha.</span></h1><p>Chamados, inventário, relatórios e conhecimento organizados em uma plataforma de suporte para equipes.</p><div class="auth-mini"><span>${icon('shield',17)} Acesso controlado</span><span>${icon('cloud',17)} Pronto para offline</span></div></div></div><div class="auth-content"><div class="auth-box"><div class="auth-logo"><span class="brand-icon" style="width:45px;height:45px"><img src="/assets/goati-mark.png" alt="" /></span> <span class="auth-wordmark">GOAT<span class="brand-i">i</span><small>MANAGER</small></span></div><div class="eyebrow">${demo?'Ambiente de demonstração':'Portal corporativo'}</div><h2>${heading}</h2><p>${sub}</p>
 ${demo?`<div class="auth-note"><b>Prévia local — sem servidor conectado.</b><br>Escolha um perfil para testar as telas. Não existem senhas nem contas reais neste modo; os dados ficam apenas neste navegador.</div><div class="auth-demo-buttons"><button class="btn primary" data-action="demo-login" data-role="admin">${icon('shield',17)} Entrar como TI</button><button class="btn outline" data-action="demo-login" data-role="funcionario">${icon('users',17)} Funcionário</button><button class="btn outline" data-action="demo-login" data-role="gestao">${icon('file',17)} Gestão</button></div><p class="muted text-xs mt-3">Para cadastros, login por senha e notificações entre computadores, configure o projeto Supabase em <b>config.js</b>.</p>`:
 state.authView==='reset'?`<form id="form-reset" class="auth-fields">${field('password','Nova senha','password','','required minlength="8" autocomplete="new-password"')}${field('confirm','Confirme a senha','password','','required minlength="8" autocomplete="new-password"')}<button class="btn primary w-full" type="submit">Alterar senha</button></form>`:
 state.authView==='forgot'?`<form id="form-forgot" class="auth-fields">${field('email','E-mail cadastrado','email',state.authEmail,'required autocomplete="email"')}<button class="btn primary w-full" type="submit">Enviar link de recuperação</button></form><div class="auth-switch"><button class="auth-link" data-action="auth-view" data-view="login">Voltar ao login</button></div>`:
 `<form id="${state.authView==='signup'?'form-signup':'form-login'}" class="auth-fields">
 ${state.authView==='signup'?`${field('name','Nome completo','text','','required minlength="3"')}${selection('sector','Setor',sectors,'')}`:''}
 ${field('email','E-mail','email',state.authEmail,'required autocomplete="email"')}${field('password','Senha','password','','required minlength="8" autocomplete="'+(state.authView==='signup'?'new-password':'current-password')+'"')}
 ${state.authView==='signup'?field('confirm','Confirme a senha','password','','required minlength="8" autocomplete="new-password"'):''}
 <button class="btn primary w-full" type="submit">${state.authView==='signup'?'Criar conta':'Entrar na central'} ${icon('arrow',16)}</button></form>
 ${state.authView==='login'&&state.authLoginFailed?`<div class="auth-login-help" role="alert"><strong>Não foi possível entrar com esses dados.</strong><p>Confira sua senha. Se este for seu primeiro acesso, crie uma conta. Se já tiver conta, recupere sua senha.</p><div class="auth-login-help-actions"><button class="btn primary" type="button" data-action="auth-view" data-view="signup">Criar minha conta</button><button class="btn outline" type="button" data-action="auth-view" data-view="forgot">Recuperar senha</button><button class="auth-link" type="button" data-action="auth-retry">Tentar novamente</button></div></div>`:''}
 ${state.authView==='login'?'<div class="text-right mt-2"><button class="auth-link" data-action="auth-view" data-view="forgot">Esqueci minha senha</button></div>':''}
 <div class="auth-switch">${state.authView==='login'?'Ainda não tem acesso? <button class="auth-link" data-action="auth-view" data-view="signup">Criar conta</button>':'Já tem cadastro? <button class="auth-link" data-action="auth-view" data-view="login">Fazer login</button>'}</div>
 <div class="auth-note">${icon('lock',15)} Novas contas são liberadas automaticamente. Se o Supabase exigir confirmação de e-mail, confirme antes de entrar. Não compartilhe senhas.</div>`}
 </div></div></div>`;
}
async function init(){
 document.documentElement.dataset.theme=state.theme;
 window.addEventListener('online',async()=>{if(state.user&&configured){toast('Conexão restaurada. Sincronizando chamados...', 'success');await flushQueue();await refreshCloud();}else if(state.user)renderShell();});
 window.addEventListener('offline',()=>{if(state.user)renderShell();toast('Sem conexão. Seus novos chamados poderão ser salvos neste computador.');});
 window.addEventListener('focus',()=>{if(state.user&&!canManage())pollEmployeeReviews();});
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.installPrompt=e;});
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.modal){state.modal=null;renderShell();showReviewPromptIfNeeded();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&state.user&&state.view==='ajuda'&&!state.modal){e.preventDefault();document.getElementById('page-search')?.focus();}});
 if('serviceWorker' in navigator && location.protocol!=='file:')navigator.serviceWorker.register('/sw.js').catch(()=>{});
 if(configured){
  const recovering=await cloud.recoveryFromURL();
  if(recovering){state.authView='reset';authPage();return;}
  if(cloud.session){
   try{await loadAccount();return;}
   catch(e){const cached=JSON.parse(localStorage.getItem('goat-ti-offline-profile')||'null');if(!navigator.onLine&&cached&&cached.id===cloud.userId&&cached.status==='ativo'){state.profile=cached;state.user={id:cached.id};state.role=cached.role;state.queue=await storage.queueList();state.data={timeEntries:[],assetEvents:[],stock_items:[],tickets:[],assets:[],movements:[],maintenance:[],activities:[],reviews:[],messages:[],profiles:[],guides:[]};renderShell();return;}toast('Sessão indisponível. Entre novamente.','error');}
  }
 }
 if(state.assetDeepLink)state.authView='login';
 authPage();
}
async function startDemo(role){const box=await storage.get('demo-data');state.data=normalizeData(box?.value);await storage.put('demo-data',state.data);state.role=role;state.user={id:role==='admin'?'demo-admin':role==='gestao'?'demo-manager':'demo-func'};state.profile=state.data.profiles.find(p=>p.id===state.user.id);state.queue=[];state.seenPendingUsers.clear();state.pendingUsersInitialized=false;state.view='dashboard';state.search='';state.filter='all';rememberPendingProfiles(state.data.profiles);startTimerDisplay();renderShell();openDeepLinkedAsset();showReviewPromptIfNeeded();}
async function loadAccount(){const profile=await cloud.profile();if(!profile)throw new Error('Perfil ainda não foi criado.');state.profile=profile;state.role=profile.role;state.user={id:profile.id};localStorage.setItem('goat-ti-offline-profile',JSON.stringify(profile));if(profile.status!=='ativo'){renderPending();return;}state.queue=await storage.queueList();state.seenPendingUsers.clear();state.pendingUsersInitialized=false;await refreshCloud();startPolling();startTimerDisplay();await flushQueue();openDeepLinkedAsset();showReviewPromptIfNeeded();}
function renderPending(){app.innerHTML=`<div class="auth-page"><div class="auth-showcase"><div class="auth-showcase-inner"><h1>Seu acesso está <span class="auth-accent">${esc(state.profile.status==='bloqueado'?'bloqueado':'pendente de regularização')}.</span></h1><p>Seu cadastro não está ativo. Entre em contato com a equipe de TI para verificar a situação.</p></div></div><div class="auth-content"><div class="auth-box"><div class="auth-logo">GOATi Manager</div><h2>${state.profile.status==='bloqueado'?'Acesso bloqueado':'Cadastro pendente'}</h2><p>Entre em contato com a equipe de TI da organização, se necessário.</p><button class="btn outline" data-action="logout">Sair da conta</button></div></div></div>`;}
async function refreshCloud(){if(!configured||!state.user||state.profile.status!=='ativo')return;
 const [tickets,assets,movements,maintenance,activities,reviews,messages,profiles,cloudGuides,timeEntries,assetEvents,stock_items]=await Promise.all([
  cloud.listAll('tickets',{params:{order:'created_at.desc',limit:'1000'}}),
  canViewInventory()?cloud.listAll('assets',{params:{order:'tag.asc',limit:'3000'}}):Promise.resolve([]),
  canViewInventory()?cloud.listAll('asset_movements',{params:{order:'created_at.desc',limit:'2000'}}):Promise.resolve([]),
  canViewInventory()?cloud.listAll('asset_maintenance',{params:{order:'created_at.desc',limit:'2000'}}):Promise.resolve([]),
  canManage()?cloud.listAll('activities',{params:{order:'date.desc',limit:'1000'}}):Promise.resolve([]),
  cloud.listAll('reviews',{params:{order:'created_at.desc',limit:'1000'}}),
  cloud.listAll('ticket_messages',{params:{order:'created_at.asc',limit:'2000'}}),
  canManage()?cloud.listAll('profiles',{params:{order:'created_at.desc',limit:'1000'}}):Promise.resolve([state.profile]),
  cloud.listAll('guides',{params:{order:'created_at.desc',limit:'500'}}),
  canManage()?cloud.listAll('ticket_time_entries',{params:{order:'started_at.desc',limit:'5000'}}).then(rows=>{state.timerMigrationMissing=false;return rows;}).catch(e=>{if(/PGRST205|schema cache|Could not find the table|42P01|relation.*does not exist/i.test(e.message)){state.timerMigrationMissing=true;return [];}throw e;}):Promise.resolve([]),
  canViewInventory()?cloud.listAll('asset_events',{params:{order:'created_at.desc',limit:'5000'}}).then(rows=>{state.inventoryMigrationMissing=false;return rows;}).catch(e=>{if(/PGRST205|schema cache|Could not find the table|42P01|relation.*does not exist/i.test(e.message)){state.inventoryMigrationMissing=true;return [];}throw e;}):Promise.resolve([]),
  canViewInventory()?cloud.listAll('stock_items',{params:{order:'id.asc'}}).then(rows=>{
   state.stockMigrationMissing=false;return rows;
  }).catch(error=>{
   if(!/PGRST205|schema cache|Could not find the table|42P01|relation.*does not exist/i.test(error.message))throw error;
   state.stockMigrationMissing=true;return [];
  }):Promise.resolve([])
 ]);
 const groups={tickets,assets,movements,maintenance,activities,reviews,messages,profiles,guides:cloudGuides,timeEntries,assetEvents,stock_items};state.data=Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,Array.isArray(v)?v:[]]));state.selectedTicketIds=new Set([...state.selectedTicketIds].filter(id=>state.data.tickets.some(t=>t.id===id)));state.selectedAssetIds=new Set([...state.selectedAssetIds].filter(id=>state.data.assets.some(a=>a.id===id)));state.queue=await storage.queueList();rememberPendingProfiles(profiles);
 if(!state.lastNotified.size)tickets.forEach(t=>state.lastNotified.add(t.id));
 renderShell();}
async function checkEmployeeReviewUpdates(){
 if(!configured||!state.user||canManage()||!isActive()||!navigator.onLine)return;
 const uid=userId();
 const [profile,tickets,reviews]=await Promise.all([
  cloud.profile(),
  cloud.list('tickets',{params:{requester_id:'eq.'+uid,order:'created_at.desc',limit:'1000'}}),
  cloud.list('reviews',{params:{author_id:'eq.'+uid,order:'created_at.desc',limit:'1000'}})
 ]);
 if(!state.user||userId()!==uid||canManage())return;
 if(!profile||profile.status!=='ativo'){
  state.profile=profile||{...state.profile,status:'bloqueado'};
  state.data={timeEntries:[],assetEvents:[],stock_items:[],tickets:[],assets:[],movements:[],maintenance:[],activities:[],reviews:[],messages:[],profiles:[],guides:[]};
  renderPending();return;
 }
 const updated=tickets.some(t=>state.data.tickets.find(old=>old.id===t.id)?.status!==t.status)
  ||tickets.length!==state.data.tickets.length||reviews.length!==state.data.reviews.length;
 state.data.tickets=tickets;state.data.reviews=reviews;
 if(!state.modal&&showReviewPromptIfNeeded())return;
 if(updated&&!state.modal&&['dashboard','chamados','avaliacoes'].includes(state.view))renderShell();
}
let employeeReviewCheckRunning=false;
async function pollEmployeeReviews(){
 if(employeeReviewCheckRunning)return;
 employeeReviewCheckRunning=true;
 try{await checkEmployeeReviewUpdates();}catch(error){console.warn('Verificação de avaliações:',error.message);}
 finally{employeeReviewCheckRunning=false;}
}
let pollingStarted=false;
function startPolling(){if(pollingStarted||!configured)return;pollingStarted=true;setInterval(async()=>{
 if(!state.user||!isAdmin()||!navigator.onLine)return;
 const currentUser=userId();
 try{
  const [tickets,profiles]=await Promise.all([
   cloud.list('tickets',{params:{select:'id,title,requester_name,created_at',order:'created_at.desc',limit:'30'}}),
   cloud.list('profiles',{params:{select:'id,full_name,email,status,created_at',order:'created_at.desc',limit:'1000'}})
  ]);
  if(!isAdmin()||userId()!==currentUser)return;
  const ticketNew=tickets.filter(t=>!state.lastNotified.has(t.id));
  tickets.forEach(t=>state.lastNotified.add(t.id));
  const profileChanged=profiles.length!==state.data.profiles.length||profiles.some(p=>{const old=state.data.profiles.find(a=>a.id===p.id);return !old||old.status!==p.status||old.full_name!==p.full_name;});
  rememberPendingProfiles(profiles);
  for(const ticket of ticketNew){toast('Novo chamado: '+ticket.title,'success');if(typeof Notification!=='undefined'&&Notification.permission==='granted'){try{new Notification('GOATi Manager · Novo chamado',{body:ticket.requester_name+': '+ticket.title,icon:'/assets/goati-192.png'});}catch{}}}
  if(ticketNew.length||profileChanged)await refreshCloud();
 }catch(error){console.warn('Não foi possível verificar novos chamados e cadastros:',error);}
},23000);setInterval(pollEmployeeReviews,6000);}
async function persist(){if(demo)await storage.put('demo-data',state.data);}
async function createRecord(table,record){if(demo){state.data[table].unshift(record);await persist();return record;}return cloud.insert(({messages:'ticket_messages',movements:'asset_movements',maintenance:'asset_maintenance'})[table]||table,record);}
async function patchRecord(table,id,changes){if(demo){const r=state.data[table].find(r=>r.id===id);if(r)Object.assign(r,changes);await persist();return r;}return cloud.update(table,id,changes);}
async function reload(){if(configured&&navigator.onLine)await refreshCloud();else renderShell();}
async function flushQueue(){if(!configured||!navigator.onLine||!userId())return;const queued=(await storage.queueList()).filter(q=>q.owner===userId());let sent=0;
 for(const item of queued){try{await cloud.insert('tickets',item.payload);await storage.queueDelete(item.id);sent++;}catch(e){
   // Caso o servidor tenha recebido antes da interrupção, reconciliar por id.
   if(/duplicate key|conflict|409/i.test(e.message)){try{const seen=await cloud.list('tickets',{params:{id:'eq.'+item.id}});if(seen.length){await storage.queueDelete(item.id);sent++;continue;}}catch{}}
   console.warn('Fila offline pendente:',e.message);break;
 }}
 state.queue=await storage.queueList();if(sent)toast(`${sent} chamado(s) sincronizado(s) com sucesso.`, 'success');if(sent)await refreshCloud();else if(state.user)renderShell();}
async function submitTicket(data){
 const title=data.get('title')?.trim(),description=data.get('description')?.trim();
 if(!title||title.length<5||!description||description.length<10){toast('Preencha título e descrição com mais detalhes.','error');return;}
 const newTicket={id:makeId(),requester_id:userId(),requester_name:state.profile?.full_name,sector:data.get('sector'),title,description,category:data.get('category'),urgency:data.get('urgency')||'media',status:'aberto',created_at:now(),updated_at:now()};
 if(demo){newTicket.number=Math.max(0,...state.data.tickets.map(t=>Number(t.number)||0))+1;await createRecord('tickets',newTicket);toast('Chamado registrado neste navegador (demonstração).','success');}
 else if(!navigator.onLine){await storage.queueAdd({id:newTicket.id,owner:userId(),payload:newTicket,created_at:newTicket.created_at});state.queue=await storage.queueList();toast('Chamado salvo offline. Ainda não chegou ao TI!','success');}
 else{try{await createRecord('tickets',newTicket);toast('Chamado enviado ao TI!','success');}catch(e){
  if(/fetch|network|tempo de conexão|failed|offline/i.test(e.message)){await storage.queueAdd({id:newTicket.id,owner:userId(),payload:newTicket,created_at:newTicket.created_at});state.queue=await storage.queueList();toast('Sem resposta do servidor. Chamado salvo como pendente.','success');}
  else throw e;
 }}
 state.modal=null;state.view='chamados';await reload();}
function report(kind){if(!canManage()&&!(canViewInventory()&&['inventario','movimentacoes','manutencoes'].includes(kind)))return;const ts=periodFilter(state.data.tickets,'created_at'),acts=periodFilter(state.data.activities,'date'),revs=periodFilter(state.data.reviews,'created_at');let title,headers,rows,metrics=[],details=[];
 const interval=state.period==='diario'?'Diário':state.period==='semanal'?'Semanal':state.period==='mensal'?'Mensal':'Período personalizado';
 if(kind==='chamados'){title=`Relatório ${interval} de Chamados`;headers=['Nº','Data','Solicitante','Setor','Situação','Tempo TI','Título'];rows=ts.map(t=>[t.number||'',dateShort(t.created_at),t.requester_name,t.sector,statusNames[t.status]||t.status,formatDuration(ticketTotalSeconds(t.id)),t.title]);metrics=[['Tempo de TI',formatDuration(ts.reduce((s,t)=>s+ticketTotalSeconds(t.id),0))],['Total de chamados',ts.length],['Resolvidos',ts.filter(t=>t.status==='resolvido').length],['Em andamento',ts.filter(t=>t.status==='andamento').length],['Abertos',ts.filter(t=>t.status==='aberto').length]];}
 else if(kind==='atividades'){title=`Relatório ${interval} de Atividades`;headers=['Data','Atividade','Categoria','Setor','Duração'];rows=acts.map(a=>[dateShort(a.date+'T12:00:00'),a.title,a.category,a.sector,(a.minutes||0)+' min']);metrics=[['Atividades',acts.length],['Horas registradas',(acts.reduce((sum,a)=>sum+Number(a.minutes||0),0)/60).toFixed(1)+' h']];}
 else if(kind==='avaliacoes'){title=`Avaliações ${interval}`;headers=['Chamado','Data','Nota','Resolvido?','Comentário'];rows=revs.map(r=>{const t=state.data.tickets.find(t=>t.id===r.ticket_id);return [t?.number||'',dateShort(r.created_at),r.rating+'/5',r.resolved?'Sim':'Não',r.comment||'—'];});metrics=[['Avaliações',revs.length],['Média',revs.length?(revs.reduce((s,r)=>s+Number(r.rating),0)/revs.length).toFixed(2):'—']];}
 else if(kind==='movimentacoes'){title='Histórico de Movimentações';headers=['Data','Patrimônio','Origem','Destino','Observações'];rows=state.data.movements.map(x=>[dateShort(x.movement_date+'T12:00:00'),state.data.assets.find(a=>a.id===x.asset_id)?.tag||'',x.from_owner||x.from_sector,x.to_owner||x.to_sector,x.notes]);metrics=[['Transferências registradas',rows.length]];}
 else if(kind==='manutencoes'){title='Histórico de Manutenções';headers=['Data','Patrimônio','Atividade','Técnico','Status'];rows=state.data.maintenance.map(x=>[dateShort(x.opened_at+'T12:00:00'),state.data.assets.find(a=>a.id===x.asset_id)?.tag||'',x.title,x.technician,x.status]);metrics=[['Registros de manutenção',rows.length]];}
 else if(kind==='inventario'){const overview=buildInventoryOverview(state.data.assets,state.data.stock_items);title='Inventário Completo';headers=['Categoria','Item','Quantidade','Localização','Patrimônio'];rows=overview.items.map(item=>[INVENTORY_CATEGORIES.find(type=>type.key===item.category).label,item.name,item.quantity,item.location||'—',item.tag||'—']);metrics=[['Unidades',overview.totalQuantity],['Registros',overview.totalRecords]];
 details=state.data.assets.map(a=>({title:a.tag+' · '+a.category,lines:[
 'Marca: '+(a.brand||'—')+'  |  Modelo: '+(a.model||'—'),
 'Nº de série: '+(a.serial||'—')+'  |  Quantidade: '+(a.quantity||1),
 'Setor: '+(a.sector||'—')+'  |  Responsável: '+(a.owner||'—'),
 'Localização: '+(a.location||'—')+'  |  Situação: '+(a.status||'—'),
 'Conservação: '+(a.condition||'—'),
 a.category==='Celular'?'IMEI: '+(a.imei||'—')+'  |  Nº da linha: '+(a.line||'—'):'',
 'Movimentações registradas: '+state.data.movements.filter(x=>x.asset_id===a.id).length,
 'Manutenções registradas: '+state.data.maintenance.filter(x=>x.asset_id===a.id).length,
 'Observações: '+(a.notes||'—')
 ].filter(Boolean)}));} 
 else return;
 downloadPDF({title,subtitle:'GOATi Manager  |  Emitido em '+dateLong(now()),headers,rows,metrics,details,filename:`GOATi_${kind}_${today()}.pdf`});toast('Relatório PDF gerado.','success');}
function formData(form){return new FormData(form);}
async function importData(form){
 if(!canEditInventory())throw new Error('Sem permissão para importar.');
 requireInventoryReady();
 const fd=formData(form),kind=fd.get('kind'),file=fd.get('file');
 if(!(file instanceof File)||!file.size)throw new Error('Selecione um arquivo CSV.');
 if(file.size>2_000_000)throw new Error('CSV muito grande (limite 2 MB).');
 const parsed=parseCSV((await file.text()).replace(/^\ufeff/,''));
 const headIndex=parsed.findIndex(r=>r.some(c=>/tag de patrim[oô]nio|tag do patrim[oô]nio|c[oó]digo \/ tag|categoria|modelo|n[uú]mero de s[eé]rie|setor|fabricante|marca/i.test(c)));
 if(headIndex<0)throw new Error('Cabeçalho de equipamentos não identificado.');
 state.importPreview=prepareAssetImport(parsed.slice(headIndex),kind,state.data.assets);
 state.modal={type:'import-preview'};renderShell();
}
async function handleAction(el,event){const act=el.dataset.action;
 if(act==='close-backdrop'){if(event.target!==el)return;state.modal=null;renderShell();showReviewPromptIfNeeded();return;}
 if(act==='close-modal'){state.modal=null;renderShell();showReviewPromptIfNeeded();return;}
 if(act==='mobile'){state.mobile=!state.mobile;renderShell();return;}
 if(act==='close-mobile'){state.mobile=false;renderShell();return;}
 if(act==='help-category'){state.filter=el.dataset.category||'all';renderShell();return;}
 if(act==='help-reset'){state.filter='all';state.search='';renderShell();return;}
 if(act==='help-all'){state.filter='all';state.search='';renderShell();document.getElementById('help-directory')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
 if(act==='go'){const v=el.dataset.view;if(!navs.some(n=>n.key===v))return;const n=navs.find(n=>n.key===v);if(n.admin&&!isAdmin()||n.manager&&!canManage()||n.inventory&&!canViewInventory())return;state.view=v;state.search='';state.filter='all';state.mobile=false;state.modal=null;renderShell();window.scrollTo(0,0);return;}
 if(act==='review-pending'&&isAdmin()){openPendingApproval();return;}
 if(act==='new-ticket'){state.modal={type:'new-ticket'};renderShell();return;}
 if(act==='ticket'){state.modal={type:'ticket',id:el.dataset.id};renderShell();return;}
 if(act==='ticket-timer'&&isAdmin()){
  if(!demo&&!navigator.onLine)throw new Error('Conecte-se à internet para registrar o tempo.');
  const t=getTicket(el.dataset.id),op=el.dataset.operation;
  if(!t||t.status==='pendente'||!['start','pause','finish'].includes(op))throw new Error('Chamado ou operação inválida.');
  if(state.timerMigrationMissing&&!demo)throw new Error('Execute a migração SQL de controle de tempo no Supabase.');
  if(demo){
   const entries=state.data.timeEntries||(state.data.timeEntries=[]),active=entries.find(e=>e.technician_id===userId()&&!e.ended_at);
   if(op==='start'){
    if(t.status==='resolvido')throw new Error('Reabra o chamado antes de iniciar outro atendimento.');
    if(active)throw new Error('Pause o atendimento ativo antes de iniciar outro.');
    entries.push({id:makeId(),ticket_id:t.id,technician_id:userId(),started_at:now(),ended_at:null});
    if(t.status==='aberto')t.status='andamento';
   }else{
    if(op==='pause'&&(!active||active.ticket_id!==t.id))throw new Error('Nenhum cronômetro ativo para pausar.');
    if(active&&active.ticket_id===t.id)active.ended_at=now();
    if(op==='finish'){t.status='resolvido';t.resolved_at=now();}
   }
   await persist();
  }else await cloud.timerAction(t.id,op);
  await reload();state.modal={type:'ticket',id:t.id};renderShell();
  toast(op==='start'?'Contagem iniciada.':op==='pause'?'Atendimento pausado.':'Atendimento finalizado e chamado resolvido.','success');return;
 }
 if(act==='select-ticket'&&isAdmin()){const id=el.dataset.id;if(!state.data.tickets.some(t=>t.id===id))return;if(el.checked)state.selectedTicketIds.add(id);else state.selectedTicketIds.delete(id);renderShell();return;}
 if(act==='select-visible-tickets'&&isAdmin()){document.querySelectorAll('input[data-action="select-ticket"]').forEach(input=>{if(state.data.tickets.some(t=>t.id===input.dataset.id))state.selectedTicketIds.add(input.dataset.id);});renderShell();return;}
 if(act==='delete-selected-tickets'&&isAdmin()){const ids=[...state.selectedTicketIds].filter(id=>state.data.tickets.some(t=>t.id===id));if(!ids.length){toast('Selecione pelo menos um chamado.','error');return;}state.modal={type:'delete-tickets',ids};renderShell();return;}
 if(act==='ask-delete-ticket'&&isAdmin()){const id=el.dataset.id;if(!state.data.tickets.some(t=>t.id===id))return;state.modal={type:'delete-tickets',ids:[id]};renderShell();return;}
 if((act==='new-stock-item'||act==='edit-stock-item')&&canEditInventory()&&!state.stockMigrationMissing){
  state.modal={type:'stock-item',id:el.dataset.id};renderShell();return;
 }
 if(act==='inventory-category'&&canViewInventory()){
  if(el.dataset.category!=='all'&&!INVENTORY_CATEGORIES.some(type=>type.key===el.dataset.category))return;
  state.inventoryCategory=el.dataset.category;renderShell();return;
 }
 if(act==='inventory-labels'&&canEditInventory()){state.modal={type:'inventory-labels'};renderShell();return;}
 if(act==='new-asset'&&canEditInventory()){requireInventoryReady();state.modal={type:'asset'};renderShell();return;}
 if(act==='asset-detail'&&canViewInventory()){
  if(!state.data.assets.some(a=>a.id===el.dataset.id))return;
  state.modal={type:'asset-detail',id:el.dataset.id};renderShell();return;
 }
 if(act==='select-asset'&&canEditInventory()){
  if(!state.data.assets.some(a=>a.id===el.dataset.id))return;
  if(el.checked)state.selectedAssetIds.add(el.dataset.id);else state.selectedAssetIds.delete(el.dataset.id);
  renderShell();return;
 }

 if(act==='select-all-assets'&&canEditInventory()){
  const ids=[...document.querySelectorAll('tr.asset-clickable[data-id]')].map(tr=>tr.dataset.id);
  if(!ids.length)return;
  const allSelected=ids.every(id=>state.selectedAssetIds.has(id));
  ids.forEach(id=>{if(allSelected)state.selectedAssetIds.delete(id);else state.selectedAssetIds.add(id);});
  renderShell();return;
 }
 if(act==='clear-selected-assets'&&canEditInventory()){
  state.selectedAssetIds.clear();renderShell();return;
 }
 if(act==='labels-range'&&canEditInventory()){
  requireInventoryReady();
  state.modal={type:'labels-range'};renderShell();return;
 }
 if(act==='labels-visible'&&canEditInventory()){
  requireInventoryReady();
  const ids=[...document.querySelectorAll('tr.asset-clickable[data-id]')].map(tr=>tr.dataset.id);
  if(!ids.length)return;
  state.modal={type:'labels',ids};renderShell();return;
 }
 if(act==='labels-selected'&&canEditInventory()){
  requireInventoryReady();
  const ids=[...state.selectedAssetIds].filter(id=>state.data.assets.some(a=>a.id===id));
  if(!ids.length)throw new Error('Selecione patrimônios para imprimir.');
  state.modal={type:'labels',ids};renderShell();return;
 }
 if(act==='asset-label'&&canEditInventory()){
  requireInventoryReady();
  state.modal={type:'labels',ids:[el.dataset.id]};renderShell();return;
 }
 if(act==='copy-asset-link'&&canViewInventory()){
  const a=state.data.assets.find(x=>x.id===el.dataset.id);if(!a)return;
  await navigator.clipboard.writeText(qrTarget(a.tag));toast('Link da ficha copiado.','success');return;
 }
 if(act==='confirm-import'&&canEditInventory()){
  requireInventoryReady();
  if(!demo&&!navigator.onLine)throw new Error('A importação requer internet.');
  const preview=state.importPreview;
  if(state.modal?.type!=='import-preview'||!preview||!preview.items.length||preview.errors.length)throw new Error('Revise o arquivo CSV antes de importar.');
  const batch=preview.items.map(x=>({...x,id:makeId()}));
  if(demo){
   const items=[...state.data.assets];for(const asset of batch){asset.tag=getNextDemoAssetTag(items);items.push(asset);}
   state.data.assets=items;await persist();
  }else await cloud.insert('assets',batch); // POST em lote: transação única no PostgreSQL.
  const count=batch.length;state.importPreview=null;state.modal=null;
  await reload();toast(count+' patrimônio(s) importado(s) com código GL.','success');return;
 }
 if(act==='inventory-tab'&&canViewInventory()){state.inventoryTab=['movements','maintenance'].includes(el.dataset.tab)?el.dataset.tab:'all';state.search='';state.filter='all';renderShell();return;}
 if(act==='new-movement'&&canEditInventory()){requireInventoryReady();state.modal={type:'movement'};renderShell();return;}
 if(act==='new-maintenance'&&canEditInventory()){requireInventoryReady();state.modal={type:'maintenance'};renderShell();return;}
 if(act==='edit-asset'&&canEditInventory()){requireInventoryReady();state.modal={type:'asset',id:el.dataset.id};renderShell();return;}
 if(act==='new-activity'&&isAdmin()){state.modal={type:'activity'};renderShell();return;}
 if(act==='guide'){state.modal={type:'guide',id:el.dataset.id};renderShell();return;}
 if(act==='new-guide'&&isAdmin()){state.modal={type:'guide'};renderShell();return;}
 if(act==='guide-solved'){state.modal=null;renderShell();toast('Ótimo! Você resolveu o problema.','success');return;}
 if(act==='guide-ticket'){const title=el.dataset.title;state.modal={type:'new-ticket'};renderShell();const input=document.querySelector('[name=title]');if(input)input.value='Dificuldade: '+title;return;}
 if(act==='rate'){state.modal={type:'rate',id:el.dataset.id};renderShell();return;}
 if(act==='edit-user'&&isAdmin()){state.modal={type:'user',id:el.dataset.id};renderShell();return;}
 if(act==='ask-delete-user'&&isAdmin()){const p=state.data.profiles.find(x=>x.id===el.dataset.id);if(!p||p.id===userId()||p.role==='admin')throw new Error('Não é permitido excluir esta conta.');state.modal={type:'delete-user',id:p.id};renderShell();return;}
 if(act==='import'&&canEditInventory()){requireInventoryReady();state.importPreview=null;state.modal={type:'import'};renderShell();return;}
 if(act==='report'){report(el.dataset.report);return;}
 if(act==='refresh'){await reload();toast('Dados atualizados.','success');return;}
 if(act==='sync'){if(demo)toast('Demonstração local: nenhum envio ao servidor.');else if(!navigator.onLine)toast('Sem internet. Tente novamente após reconectar.','error');else await flushQueue();return;}
 if(act==='theme'||act==='theme-light'||act==='theme-dark'){state.theme=act==='theme-light'?'light':act==='theme-dark'?'dark':state.theme==='dark'?'light':'dark';localStorage.setItem('goat-ti-theme',state.theme);state.user?renderShell():authPage();return;}
 if(act==='notifications'){
  if(!('Notification'in window)){toast('O navegador não oferece notificações nativas neste dispositivo.','error');return;}
  if(!isSecureContext){toast('Para notificações, use HTTPS ou localhost.','error');return;}
  const permission=await Notification.requestPermission();state.noticePermission=permission;toast(permission==='granted'?'Notificações autorizadas.':'Notificações não autorizadas.');renderShell();return;
 }
 if(act==='install'){if(state.installPrompt){await state.installPrompt.prompt();state.installPrompt=null;}else toast('No Chrome/Edge, use o menu do navegador → Instalar aplicativo, quando disponível.');return;}
 if(act==='demo-login'){await startDemo(el.dataset.role);return;}
 if(act==='auth-view'){state.authEmail=document.getElementById('f-email')?.value.trim()||state.authEmail;state.authView=el.dataset.view;state.authLoginFailed=false;authPage();return;}
 if(act==='auth-retry'){state.authLoginFailed=false;authPage();document.getElementById('f-password')?.focus();return;}
 if(act==='logout'){if(configured)await cloud.signout();state.user=null;state.profile=null;state.role=null;state.data={timeEntries:[],assetEvents:[],stock_items:[],tickets:[],assets:[],movements:[],maintenance:[],activities:[],reviews:[],messages:[],profiles:[],guides:[]};state.queue=[];state.selectedTicketIds.clear();state.selectedAssetIds.clear();state.importPreview=null;state.reviewPromptShown.clear();state.seenPendingUsers.clear();state.pendingUsersInitialized=false;state.modal=null;state.authView='signup';state.authEmail='';state.authLoginFailed=false;state.lastNotified.clear();authPage();return;}
}
function isLoginCredentialFailure(error){return /invalid login credentials|invalid credentials|email not confirmed|invalid grant|invalid_grant/i.test(String(error?.message||''));}
async function handleSubmit(form){const fd=formData(form);
 if(form.id==='form-delete-tickets'){
  if(!isAdmin())throw new Error('Apenas administradores podem excluir chamados.');
  if(String(fd.get('confirmation')||'')!=='EXCLUIR')throw new Error('Digite EXCLUIR para confirmar.');
  if(!demo&&!navigator.onLine)throw new Error('Conecte-se à internet para excluir chamados do Supabase.');
  const ids=[...new Set(state.modal?.type==='delete-tickets'?state.modal.ids:[])];
  if(!ids.length||!ids.every(id=>state.data.tickets.some(t=>t.id===id)))throw new Error('A seleção mudou. Atualize a lista e tente novamente.');
  let removed=0;
  try{
   for(const id of ids){
    if(demo){state.data.tickets=state.data.tickets.filter(t=>t.id!==id);state.data.messages=state.data.messages.filter(m=>m.ticket_id!==id);state.data.reviews=state.data.reviews.filter(r=>r.ticket_id!==id);state.data.timeEntries=state.data.timeEntries.filter(e=>e.ticket_id!==id);}
    else await cloud.deleteTicket(id);
    state.lastNotified.delete(id);state.selectedTicketIds.delete(id);removed++;
   }
   if(demo)await persist();
  }catch(error){state.modal=null;await reload();if(removed)toast(`${removed} chamado(s) removido(s) antes do erro. Confira a lista.`, 'error');throw error;}
  state.modal=null;await reload();toast(`${removed} chamado(s) excluído(s) permanentemente.`, 'success');return;
 }
 if(form.id==='form-login'){
  const email=String(fd.get('email')).trim();state.authEmail=email;state.authLoginFailed=false;
  try{await cloud.login(email,String(fd.get('password')));}
  catch(error){
   if(!isLoginCredentialFailure(error))throw error;
   state.authLoginFailed=true;authPage();return;
  }
  await loadAccount();state.authEmail='';toast('Bem-vindo à central!','success');return;
 }
 if(form.id==='form-signup'){
  if(fd.get('password')!==fd.get('confirm'))throw new Error('As senhas não conferem.');
  const email=String(fd.get('email')).trim(),password=String(fd.get('password'));
  await cloud.signup({name:String(fd.get('name')).trim(),email,sector:String(fd.get('sector')),password});
  state.authEmail=email;state.authLoginFailed=false;
  if(!cloud.session){
   try{await cloud.login(email,password);}
   catch(error){
    if(!isLoginCredentialFailure(error))throw error;
    state.authView='login';authPage();toast('Cadastro registrado. Se a confirmação de e-mail estiver ativada no Supabase, confirme o e-mail e entre com sua senha.','success');return;
   }
  }
  await loadAccount();state.authEmail='';toast('Conta criada! Seu acesso já está liberado.','success');return;
 }
 if(form.id==='form-forgot'){await cloud.recover(String(fd.get('email')).trim());toast('Se o e-mail estiver cadastrado, você receberá um link de recuperação.','success');state.authView='login';authPage();return;}
 if(form.id==='form-reset'){if(fd.get('password')!==fd.get('confirm'))throw new Error('As senhas não conferem.');await cloud.changePassword(String(fd.get('password')));await cloud.signout();state.authView='login';authPage();toast('Senha alterada. Entre com sua nova senha.','success');return;}
 if(form.id==='form-ticket'){await submitTicket(fd);return;}
 if(form.id==='form-stock-item'){
  if(!canEditInventory()||state.stockMigrationMissing)throw new Error('O estoque por quantidade está indisponível.');
  const id=form.dataset.id;
  const existing=state.data.stock_items.find(item=>item.id===id);
  if(id&&!existing)throw new Error('Item de estoque não encontrado.');
  const name=String(fd.get('name')||'').trim();
  const location=String(fd.get('location')||'').trim();
  const rawQuantity=String(fd.get('quantity')||'').trim();
  const quantity=Number(rawQuantity);
  if(!name||name.length>120||location.length>120)throw new Error('Informe um nome e use até 120 caracteres por campo de texto.');
  if(!rawQuantity||!Number.isInteger(quantity)||quantity<0||quantity>2147483647)throw new Error('Informe uma quantidade inteira válida.');
  const sameText=(a,b)=>a.toLocaleLowerCase('pt-BR')===b.toLocaleLowerCase('pt-BR');
  const duplicateMessage='Já existe um item com esse nome nessa localização. Edite a quantidade do item existente.';
  if(state.data.stock_items.some(item=>item.id!==id&&sameText(item.name,name)&&sameText(item.location,location)))throw new Error(duplicateMessage);
  const changes={name,location,quantity};
  try{
   if(existing){
    const revision=existing.revision??0;
    const saved=demo
     ?await patchRecord('stock_items',id,changes)
     :await cloud.update('stock_items',id,{...changes,revision:revision+1},{revision:'eq.'+revision});
    if(!saved){
     state.modal=null;
     await reload();
     throw new Error('O item mudou desde a última consulta. Confira a quantidade atual e tente novamente.');
    }
    state.data.stock_items=state.data.stock_items.map(item=>item.id===id?saved:item);
   }else{
    const saved=await createRecord('stock_items',{id:makeId(),...changes});
    if(!demo)state.data.stock_items.unshift(saved);
   }
  }catch(error){
   if(error.message.includes('stock_items_name_location_key'))throw new Error(duplicateMessage);
   throw error;
  }
  state.modal=null;state.search='';renderShell();
  toast(existing?'Item de estoque atualizado.':'Item de estoque cadastrado.','success');return;
 }
 if(form.id==='form-asset'){
  if(!canEditInventory())throw new Error('Você não pode cadastrar ou editar patrimônios.');
  requireInventoryReady();
  if(!demo&&!navigator.onLine)throw new Error('Conecte-se à internet para alterar o inventário.');
  const existing=state.data.assets.find(a=>a.id===form.dataset.id);
  if(form.dataset.id&&!existing)throw new Error('Patrimônio não encontrado.');
  const serial=String(fd.get('serial')||'').trim();
  if(serial&&state.data.assets.some(a=>a.id!==existing?.id&&String(a.serial||'').trim().toLowerCase()===serial.toLowerCase()))throw new Error('Número de série já cadastrado.');
  const record={id:existing?.id||makeId(),quantity:existing?.quantity||1};
  for(const key of ['category','brand','model','serial','owner','sector','location','status','condition','imei','line','notes'])record[key]=String(fd.get(key)||'').trim();
  for(const key of ['acquired_on','warranty_until','last_checked_on','last_assigned_on'])record[key]=String(fd.get(key)||'')||null;
  if(demo&&!existing)record.tag=getNextDemoAssetTag(state.data.assets);
  if(existing)await patchRecord('assets',record.id,record);else await createRecord('assets',record);
  await reload();
  state.modal={type:'asset-detail',id:record.id};renderShell();
  toast(existing?'Patrimônio atualizado.':'Patrimônio cadastrado com etiqueta GL.','success');return;
 }

 if(form.id==='form-labels-range'){
  if(!canEditInventory())throw new Error('Sem permissão para imprimir etiquetas.');
  requireInventoryReady();
  const selection=assetsForGlRange(state.data.assets,fd.get('gl_from'),fd.get('gl_to'));
  state.modal={type:'labels',ids:selection.assets.map(asset=>asset.id),
   rangeDescription:selection.from===selection.to?selection.from:selection.from+' até '+selection.to,
   rangeMissing:selection.missing};
  renderShell();return;
 }
 if(form.id==='form-labels'){
  if(!canEditInventory())throw new Error('Sem permissão para imprimir etiquetas.');
  requireInventoryReady();
  const assets=[...new Set(state.modal?.type==='labels'?state.modal.ids:[])].map(id=>state.data.assets.find(a=>a.id===id)).filter(Boolean);
  const summary=downloadAssetLabels(assets,String(fd.get('label_size')||'60x30'));
  state.modal=null;renderShell();toast(summary.labels+' etiqueta(s) exportada(s) em '+summary.pages+' página(s).','success');return;
 }
 if(form.id==='form-ticket-asset'){
  if(!canEditInventory())throw new Error('Sem permissão para associar patrimônios.');
  requireInventoryReady();
  const ticket=getTicket(form.dataset.id),id=String(fd.get('asset_id')||'')||null;
  if(!ticket)throw new Error('Chamado não encontrado.');
  if(id&&!state.data.assets.some(a=>a.id===id&&a.status!=='Baixado'))throw new Error('Patrimônio não encontrado ou baixado.');
  if(demo){ticket.asset_id=id;await persist();}
  else await cloud.linkTicketAsset(ticket.id,id);
  await reload();state.modal={type:'ticket',id:ticket.id};renderShell();
  toast('Patrimônio vinculado ao chamado.','success');return;
 }
 if(form.id==='form-movement'&&canEditInventory()){
  requireInventoryReady();
  if(!navigator.onLine&&!demo)throw new Error('Conecte-se à internet para registrar movimentações.');
  const asset=state.data.assets.find(a=>a.id===fd.get('asset_id'));if(!asset)throw new Error('Selecione um patrimônio válido.');
  const rec={id:makeId(),asset_id:asset.id};for(const key of ['movement_date','from_sector','to_sector','from_owner','to_owner','new_location','notes'])rec[key]=String(fd.get(key)||'');
  if(!rec.from_sector)rec.from_sector=asset.sector||'';if(!rec.from_owner)rec.from_owner=asset.owner||'';
  await createRecord('movements',rec);
  if(demo){Object.assign(asset,{sector:rec.to_sector||asset.sector,owner:rec.to_owner||asset.owner,location:rec.new_location||asset.location});await persist();}
  state.modal=null;await reload();toast('Movimentação registrada.','success');return;
 }
 if(form.id==='form-maintenance'&&canEditInventory()){
  requireInventoryReady();
  if(!navigator.onLine&&!demo)throw new Error('Conecte-se à internet para registrar manutenções.');
  const rec={id:makeId(),asset_id:String(fd.get('asset_id'))};for(const key of ['opened_at','title','technician','status','action_taken'])rec[key]=String(fd.get(key)||'');
  await createRecord('maintenance',rec);state.modal=null;await reload();toast('Manutenção registrada.','success');return;
 }
 if(form.id==='form-activity'&&isAdmin()){
  if(!navigator.onLine&&!demo)throw new Error('Para registrar atividades no servidor, conecte-se à internet.');
  const rec={id:makeId()};for(const key of ['date','title','category','sector','description','status'])rec[key]=String(fd.get(key)||'');rec.minutes=Number(fd.get('minutes'))||0;
  await createRecord('activities',rec);state.modal=null;toast('Atividade registrada.','success');await reload();return;
 }
 if(form.id==='form-status'&&isAdmin()){
  if(!navigator.onLine&&!demo)throw new Error('Conecte-se à internet para atualizar um chamado.');
  const t=getTicket(form.dataset.id),status=fd.get('status'),update={status,urgency:fd.get('urgency'),resolved_at:status==='resolvido'?now():null};
  await patchRecord('tickets',t.id,update);if(demo&&status==='resolvido'){for(const e of state.data.timeEntries||[])if(e.ticket_id===t.id&&!e.ended_at)e.ended_at=now();await persist();}state.modal=null;await reload();toast('Chamado atualizado.','success');return;
 }
 if(form.id==='form-message'){
  if(!navigator.onLine&&!demo)throw new Error('As mensagens exigem conexão ao servidor.');
  const body=String(fd.get('body')||'').trim();if(!body)throw new Error('Digite sua mensagem.');
  await createRecord('messages',{id:makeId(),ticket_id:form.dataset.id,author_id:userId(),author_name:state.profile?.full_name||'Colaborador',body,internal:fd.get('internal')==='on',created_at:now()});await reload();state.modal={type:'ticket',id:form.dataset.id};renderShell();toast('Mensagem enviada.','success');return;
 }
 if(form.id==='form-rate'){
  if(!navigator.onLine&&!demo)throw new Error('Conecte-se à internet para avaliar o atendimento.');
  const t=getTicket(form.dataset.id);if(!t||t.requester_id!==userId()||t.status!=='resolvido')throw new Error('Este chamado não pode ser avaliado.');
  const rec={id:makeId(),ticket_id:t.id,author_id:userId(),rating:Number(fd.get('rating')),resolved:fd.get('resolved')==='true',comment:String(fd.get('comment')||''),created_at:now()};
  if(!rec.rating)throw new Error('Selecione uma nota.');await createRecord('reviews',rec);
  if(demo&&!rec.resolved){t.status='aberto';t.resolved_at=null;await persist();}
  state.modal=null;await reload();toast(rec.resolved?'Avaliação registrada. Obrigado!':'Avaliação registrada. O chamado foi reaberto.','success');return;
 }
 if(form.id==='form-delete-user'){
  if(!isAdmin())throw new Error('Somente administradores podem excluir usuários.');
  if(String(fd.get('confirmation')||'')!=='EXCLUIR')throw new Error('Digite EXCLUIR para confirmar a exclusão.');
  if(!demo&&!navigator.onLine)throw new Error('Conecte-se à internet para excluir usuários.');
  const id=form.dataset.id;
  if(state.modal?.type!=='delete-user'||state.modal.id!==id)throw new Error('Confirmação de exclusão inválida.');
  const p=state.data.profiles.find(x=>x.id===id);
  if(!p||p.id===userId()||p.role==='admin')throw new Error('Conta protegida ou inexistente.');
  if(demo){
   const hasRecords=state.data.tickets.some(t=>t.requester_id===id)||state.data.messages.some(m=>m.author_id===id)||state.data.reviews.some(r=>r.author_id===id)||(state.data.timeEntries||[]).some(t=>t.technician_id===id);
   if(hasRecords)throw new Error('Este usuário possui histórico de atendimento. Bloqueie a conta para preservar os dados.');
   state.data.profiles=state.data.profiles.filter(x=>x.id!==id);await persist();
  }else await cloud.deleteUser(id);
  state.modal=null;await reload();toast('Conta excluída da autenticação e dos usuários.','success');return;
 }
 if(form.id==='form-user'&&isAdmin()){
  if(!navigator.onLine&&!demo)throw new Error('Conecte-se à internet para alterar permissões.');
  if(form.dataset.id===userId())throw new Error('Você não pode alterar seu próprio perfil nesta tela.');
  const current=state.data.profiles.find(p=>p.id===form.dataset.id),changes={role:fd.get('role'),status:fd.get('status')};if(current&&Object.prototype.hasOwnProperty.call(current,'can_manage_inventory'))changes.can_manage_inventory=fd.get('can_manage_inventory')==='on';await patchRecord('profiles',form.dataset.id,changes);state.modal=null;await reload();toast('Permissões atualizadas.','success');return;
 }
 if(form.id==='form-guide'&&isAdmin()){
  if(!navigator.onLine&&!demo)throw new Error('Conecte-se à internet para publicar tutoriais.');
  const steps=String(fd.get('steps')||'').split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
  if(!steps.length)throw new Error('Inclua pelo menos um passo.');
  await createRecord('guides',{id:makeId(),title:String(fd.get('title')).trim(),category:String(fd.get('category')).trim(),summary:String(fd.get('summary')).trim(),steps,active:true});state.modal=null;await reload();toast('Tutorial publicado.','success');return;
 }
 if(form.id==='form-import'&&canEditInventory()){if(!navigator.onLine&&!demo)throw new Error('Conecte-se à internet para importar o inventário.');await importData(form);return;}
}
app.addEventListener('click',async(e)=>{const el=e.target.closest('[data-action]');if(!el)return;
 try{await handleAction(el,e);}catch(err){console.error(err);toast(err.message||'Erro ao executar a ação.','error');}
});
app.addEventListener('keydown',async(e)=>{const row=e.target.closest('.ticket-clickable[data-action="ticket"],.asset-clickable[data-action="asset-detail"]');if(e.target!==row||!['Enter',' '].includes(e.key))return;e.preventDefault();try{await handleAction(row,e);}catch(err){console.error(err);toast(err.message||'Erro ao abrir chamado.','error');}});
app.addEventListener('submit',async(e)=>{const form=e.target.closest('form');if(!form)return;e.preventDefault();const submit=form.querySelector('[type="submit"]');if(submit){submit.disabled=true;submit.dataset.old=submit.textContent;submit.textContent='Processando...';}try{await handleSubmit(form);}catch(err){console.error(err);toast(err.message||'Ocorreu um problema.','error');}finally{if(submit&&submit.isConnected){submit.disabled=false;submit.textContent=submit.dataset.old||'Enviar';}}});
app.addEventListener('change',(e)=>{if(e.target.id==='filter-status'){state.filter=e.target.value;renderShell();}if(e.target.dataset.assetFilter){state.assetFilters[e.target.dataset.assetFilter]=e.target.value;renderShell();}if(e.target.id==='report-period'){state.period=e.target.value;renderShell();}if(e.target.name==='from'||e.target.id==='f-from'){state.rangeFrom=e.target.value;}if(e.target.name==='to'||e.target.id==='f-to'){state.rangeTo=e.target.value;}});
app.addEventListener('input',(e)=>{if(e.target.id==='f-email')state.authEmail=e.target.value;if(e.target.id==='page-search'){const pos=e.target.selectionStart;state.search=e.target.value;renderShell();const search=document.getElementById('page-search');if(search){search.focus();try{search.setSelectionRange(pos,pos);}catch{}}}});
init().catch(err=>{console.error(err);app.innerHTML='<div class="boot"><h2>Não foi possível iniciar o aplicativo.</h2><p>Atualize a página ou tente novamente.</p></div>';});
