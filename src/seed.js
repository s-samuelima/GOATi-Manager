export const cats=['Computador / Windows','Internet e rede','E-mail corporativo','Sistema e software','Impressora','Headset e áudio','Acesso e senha','Outros'];
export const sectors=['Administrativo','Comercial','Financeiro','Jurídico','Processual','Recursos Humanos','TI'];
export const assetCats=['Computador','Notebook','Monitor','Teclado','Mouse','Headset','Impressora','Celular','Cabo','Carregador','Adaptador','Switch','Roteador','Nobreak','Outro'];
export const statusNames={aberto:'Aberto',andamento:'Em andamento',aguardando:'Aguardando usuário',resolvido:'Resolvido'};
export const urgencyNames={baixa:'Baixa',media:'Média',alta:'Alta',critica:'Crítica'};
export const guides=[
 {id:'ajuda-01',category:'Computadores',title:'Computador não liga',summary:'Confira a energia e os cabos sem abrir o gabinete.',icon:'monitor',steps:['Confira se o cabo de energia está bem encaixado na tomada e no computador.','Verifique se o filtro de linha ou nobreak está ligado, sem mexer em conexões internas.','Observe se acende alguma luz ao pressionar o botão liga/desliga.','Se não ligar, registre um chamado e informe se há alguma luz acesa.']},
 {id:'ajuda-02',category:'Internet',title:'Estou sem internet',summary:'Verificações simples de rede, sem alterar configurações.',icon:'wifi',steps:['Veja se o cabo de rede está bem conectado ao computador.','Se utiliza Wi-Fi, confira se está conectado à rede corporativa correta.','Teste abrir outro site conhecido.','Se continuar sem acesso, informe no chamado quais sites estão indisponíveis.']},
 {id:'ajuda-03',category:'Áudio',title:'Headset sem som',summary:'Verifique conectores e volume do Windows.',icon:'headphones',steps:['Confira se o conector P2 ou USB está firmemente encaixado.','Verifique o volume do computador e o botão de mudo do headset.','Clique no ícone de som e confira se o dispositivo correto está selecionado.','Se nenhuma saída de áudio aparecer, não instale drivers: abra um chamado.']},
 {id:'ajuda-04',category:'Impressoras',title:'Impressora não imprime',summary:'Cheque papel, energia e fila de impressão.',icon:'printer',steps:['Confirme se a impressora está ligada e sem luz de erro.','Verifique se há papel e se nenhuma tampa está aberta.','No programa, confira se a impressora correta foi selecionada.','Se continuar falhando, anote a mensagem de erro e abra um chamado.']},
 {id:'ajuda-05',category:'Periféricos',title:'Teclado ou mouse não funciona',summary:'Teste o cabo, pilhas e receptor.',icon:'mouse-pointer',steps:['Confira se o cabo USB está bem encaixado.','Em dispositivos sem fio, confira as pilhas e o receptor USB.','Se possível, teste uma porta USB externa disponível.','Se não funcionar, peça ajuda ao TI.']},
 {id:'ajuda-06',category:'Computadores',title:'Computador muito lento',summary:'Primeiros passos seguros antes de pedir suporte.',icon:'gauge',steps:['Salve seus arquivos e feche abas que não estiver usando.','Aguarde atualizações em execução; não desligue o computador à força.','Se possível, reinicie normalmente, após salvar o trabalho.','Se a lentidão continuar, abra um chamado informando quando começou.']},
 {id:'ajuda-07',category:'Sistemas',title:'Não consigo entrar em uma conta',summary:'Recupere acesso sem compartilhar a senha.',icon:'lock-keyhole',steps:['Confira se Caps Lock está ativado e se o e-mail foi digitado corretamente.','Utilize a opção oficial “Esqueci minha senha” do serviço.','Não compartilhe senhas ou códigos de verificação com outras pessoas.','Se a recuperação falhar, abra um chamado.']},
 {id:'ajuda-08',category:'Sistemas',title:'Como abrir um chamado',summary:'Passo a passo para solicitar suporte.',icon:'ticket',steps:['Entre com sua conta no GOATi Manager.','Clique em “Novo chamado” na página inicial.','Informe um título objetivo e descreva o que ocorreu, sem incluir senhas.','Clique em “Enviar chamado” e acompanhe em “Meus chamados”.']},
 {id:'ajuda-09',category:'Sistemas',title:'Como acompanhar ou avaliar',summary:'Veja o andamento e avalie o atendimento.',icon:'star',steps:['Abra a seção “Meus chamados”.','Escolha o chamado para ver atualizações e mensagens.','Após a resolução, acesse “Avaliar atendimento”.','Se o problema persistir, informe isso na avaliação.']},
 {id:'ajuda-10',category:'Internet',title:'Como funciona o modo offline',summary:'Chamados aguardam internet para chegar ao TI.',icon:'cloud-off',steps:['O aplicativo precisa ter sido aberto anteriormente com conexão.','Se estiver offline, preencha seu chamado normalmente.','Verifique a etiqueta “Aguardando sincronização”; o TI ainda não recebeu.','Quando voltar a conexão, mantenha o aplicativo aberto para enviar a solicitação.']}
];
const isoDays=(n)=>new Date(Date.now()-n*86400000).toISOString();
export const seed={
 guides:[],
 tickets:[
  {id:'demo-101',number:101,requester_id:'demo-func',requester_name:'Marina Costa',sector:'Comercial',category:'Headset e áudio',title:'Headset não reconhecido no Windows',description:'O Windows não mostra dispositivo de saída de áudio.',urgency:'alta',status:'aberto',created_at:isoDays(0),updated_at:isoDays(0)},
  {id:'demo-100',number:100,requester_id:'demo-func',requester_name:'Marina Costa',sector:'Comercial',category:'Internet e rede',title:'Instabilidade no acesso à internet',description:'A conexão cai durante o expediente.',urgency:'media',status:'andamento',created_at:isoDays(1),updated_at:isoDays(0)},
  {id:'demo-099',number:99,requester_id:'demo-other',requester_name:'Carlos Oliveira',sector:'Financeiro',category:'Impressora',title:'Impressora do financeiro sem resposta',description:'Impressora não imprime ao enviar arquivos.',urgency:'media',status:'aguardando',created_at:isoDays(2),updated_at:isoDays(1)},
  {id:'demo-098',number:98,requester_id:'demo-func',requester_name:'Marina Costa',sector:'Comercial',category:'Computador / Windows',title:'Computador muito lento',description:'Uso do disco estava em 100%.',urgency:'baixa',status:'resolvido',created_at:isoDays(6),updated_at:isoDays(5),resolved_at:isoDays(5)},
  {id:'demo-097',number:97,requester_id:'demo-other',requester_name:'Carlos Oliveira',sector:'Financeiro',category:'Sistema e software',title:'Atualização do Office',description:'Atualizar ferramentas de trabalho.',urgency:'baixa',status:'resolvido',created_at:isoDays(9),updated_at:isoDays(8),resolved_at:isoDays(8)}
 ],
 assets:[
  {id:'demo-pc',tag:'GOAT-TI-PC-001',category:'Computador',brand:'Dell',model:'OptiPlex 980',serial:'EXEMPLO-001',sector:'Comercial',owner:'Marina Costa',location:'Estação 03',status:'Em uso',condition:'Regular',quantity:1},
  {id:'demo-mon',tag:'GOAT-TI-MON-001',category:'Monitor',brand:'3Green',model:'1953G-LED',serial:'EXEMPLO-002',sector:'Comercial',owner:'Marina Costa',location:'Estação 03',status:'Em uso',condition:'Bom',quantity:1},
  {id:'demo-hds',tag:'GOAT-TI-HDS-001',category:'Headset',brand:'Mancer',model:'A confirmar',serial:'',sector:'Comercial',owner:'Marina Costa',location:'Estação 03',status:'Em uso',condition:'Bom',quantity:1},
  {id:'demo-cab',tag:'GOAT-TI-CAB-001',category:'Cabo',brand:'Genérico',model:'HDMI 2 m',serial:'',sector:'TI',owner:'Estoque',location:'Armário TI',status:'Disponível',condition:'Bom',quantity:8},
  {id:'demo-cel',tag:'GOAT-TI-CEL-001',category:'Celular',brand:'Samsung',model:'Galaxy A',serial:'EXEMPLO-003',imei:'',line:'',sector:'Administrativo',owner:'Estoque',location:'Armário TI',status:'Disponível',condition:'Bom',quantity:1}
 ],
 activities:[
  {id:'demo-act1',date:new Date().toISOString().slice(0,10),title:'Verificação de conectividade',category:'Redes',sector:'Comercial',minutes:40,description:'Diagnóstico de pontos de rede.',status:'Concluída'},
  {id:'demo-act2',date:new Date().toISOString().slice(0,10),title:'Conferência patrimonial',category:'Inventário',sector:'TI',minutes:70,description:'Inspeção de estações e periféricos.',status:'Em andamento'}
 ],
 reviews:[{id:'demo-rev1',ticket_id:'demo-098',author_id:'demo-func',rating:5,resolved:true,comment:'Atendimento rápido e claro.',created_at:isoDays(4)}],
 movements:[{id:'demo-move1',asset_id:'demo-mon',movement_date:new Date().toISOString().slice(0,10),from_sector:'Administrativo',to_sector:'Comercial',from_owner:'Estoque',to_owner:'Marina Costa',new_location:'Estação 03',notes:'Movimentação ilustrativa.'}],
 maintenance:[{id:'demo-maint1',asset_id:'demo-pc',opened_at:new Date().toISOString().slice(0,10),title:'Revisão preventiva',action_taken:'Inspeção visual e conferência.',status:'Concluída',technician:'Equipe TI'}],
 messages:[{id:'demo-msg1',ticket_id:'demo-100',author_id:'demo-admin',author_name:'Equipe de TI',body:'Estamos verificando a conexão da estação.',internal:false,created_at:isoDays(0)}],
 profiles:[
  {id:'demo-admin',full_name:'Administrador TI',email:'admin@example.com',sector:'TI',role:'admin',status:'ativo'},
  {id:'demo-func',full_name:'Marina Costa',email:'marina@example.com',sector:'Comercial',role:'funcionario',status:'ativo'},
  {id:'demo-other',full_name:'Carlos Oliveira',email:'carlos@example.com',sector:'Financeiro',role:'funcionario',status:'ativo'},
  {id:'demo-manager',full_name:'Gestão da empresa',email:'gestao@example.com',sector:'Administrativo',role:'gestao',status:'ativo'}
 ]
};

// Compatibilidade: dados locais de versoes anteriores podem nao conter todas as colecoes.
// Nao descartar chamados, inventario ou registros salvos pelo usuario.
export function normalizeData(saved){
 const data=structuredClone(seed);
 if(!saved||typeof saved!=='object'||Array.isArray(saved))return data;
 for(const key of Object.keys(data)){
  if(Array.isArray(saved[key]))data[key]=saved[key];
 }
 // Os perfis basicos sao essenciais para entrar na demonstracao.
 for(const profile of seed.profiles){
  if(!data.profiles.some(item=>item&&item.id===profile.id))data.profiles.push(structuredClone(profile));
 }
 return data;
}

// Safely merge built-in guides and administrator guides from older installations.
// Keep user-created guides without ever allowing undefined.filter to crash the help center.
export function resolveHelpArticles(custom,admin=false){
 const list=Array.isArray(custom)?custom:[];
 const extra=list.filter(g=>g&&typeof g==='object'&&typeof g.title==='string'&&g.title.trim()&&(admin||g.active!==false)).map(g=>({
   ...g,category:String(g.category||'Outros'),summary:String(g.summary||'Guia de autoatendimento'),
   steps:Array.isArray(g.steps)?g.steps.filter(s=>typeof s==='string'&&s.trim()):[]
 }));
 return [...guides,...extra];
}
