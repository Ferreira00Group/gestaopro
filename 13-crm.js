// ============ CRM (v5.44) — inspirado no Zoho CRM ============
// Dados (todos dentro do state, entram em backup/Drive automaticamente):
//   state.crmLeads       [{id,nome,tel,email,origem,status,obs,criadoEm,clienteId?}]
//     status: novo | contato | qualificado | desqualificado | convertido
//   state.crmNegocios    [{id,titulo,clienteId?,leadId?,valor,etapa,previsao,motivoPerda,obs,criadoEm,fechadoEm?,vendaGerada?}]
//     etapa: qualificacao | proposta | negociacao | ganho | perdido
//   state.crmAtividades  [{id,tipo,titulo,data,hora,concluida,clienteId?,leadId?,negocioId?}]
// Integração: lead convertido vira registro em state.clientes; negócio ganho abre "Nova Venda"
// já preenchida (cliente + item avulso com o valor do negócio) — a venda só é gravada ao confirmar.

const CRM_ETAPAS=[
  {id:'qualificacao',nome:'Qualificação',cor:'#8E897C'},
  {id:'proposta',nome:'Proposta',cor:'#C9A24B'},
  {id:'negociacao',nome:'Negociação',cor:'#E0B95A'},
  {id:'ganho',nome:'Ganho',cor:'#4CC38A'},
  {id:'perdido',nome:'Perdido',cor:'#E5604F'},
];
const CRM_LEAD_STATUS={novo:'Novo',contato:'Em contato',qualificado:'Qualificado',desqualificado:'Desqualificado',convertido:'Convertido'};
const CRM_ORIGENS=['Indicação','WhatsApp','Instagram','Visita','Telefone','Outro'];
const CRM_TIPOS_ATIV={tarefa:'Tarefa',ligacao:'Ligação',reuniao:'Reunião',whatsapp:'WhatsApp'};

let crmBusca='';
let crmAtivFiltro='pendentes';

function crmGaranteEstado(){
  if(!Array.isArray(state.crmLeads)) state.crmLeads=[];
  if(!Array.isArray(state.crmNegocios)) state.crmNegocios=[];
  if(!Array.isArray(state.crmAtividades)) state.crmAtividades=[];
  if(!state.nextId) state.nextId={};
  ['crmLeads','crmNegocios','crmAtividades'].forEach(k=>{ if(!(state.nextId[k]>0)) state.nextId[k]=1; });
  if(!state.crm_tab) state.crm_tab='funil';
}
function crmNum(v){ return Math.max(0,parseFloat(String(v==null?'':v).replace(',','.'))||0); }
function crmEtapa(id){ return CRM_ETAPAS.find(e=>e.id===id)||CRM_ETAPAS[0]; }
function crmNomeRef(o){
  if(o.clienteId){ const c=state.clientes.find(c=>c.id==o.clienteId); if(c) return c.nome; }
  if(o.leadId){ const l=state.crmLeads.find(l=>l.id==o.leadId); if(l) return l.nome; }
  return '';
}
function crmRefSelect(selId, clienteId, leadId, comVazio){
  const cl=state.clientes.filter(c=>estaAtivo(c)||c.id==clienteId).sort((a,b)=>a.nome.localeCompare(b.nome));
  const ld=state.crmLeads.filter(l=>l.status!=='convertido'||l.id==leadId).sort((a,b)=>a.nome.localeCompare(b.nome));
  const sel=clienteId?'c:'+clienteId:(leadId?'l:'+leadId:'');
  let h=comVazio?'<option value="">— Nenhum —</option>':'<option value="">Selecione…</option>';
  if(cl.length) h+='<optgroup label="Clientes">'+cl.map(c=>`<option value="c:${c.id}"${sel==='c:'+c.id?' selected':''}>${escapeHtml(c.nome)}</option>`).join('')+'</optgroup>';
  if(ld.length) h+='<optgroup label="Leads">'+ld.map(l=>`<option value="l:${l.id}"${sel==='l:'+l.id?' selected':''}>${escapeHtml(l.nome)}</option>`).join('')+'</optgroup>';
  document.getElementById(selId).innerHTML=h;
}
function crmLerRef(selId){
  const v=document.getElementById(selId).value||'';
  if(v.startsWith('c:')) return {clienteId:parseInt(v.slice(2)),leadId:null};
  if(v.startsWith('l:')) return {clienteId:null,leadId:parseInt(v.slice(2))};
  return {clienteId:null,leadId:null};
}
function crmWhats(tel,msg){
  let d=String(tel||'').replace(/\D/g,'');
  if(!d){ showToast('Sem telefone cadastrado','red'); return; }
  if(d.length<=11) d='55'+d;
  window.open('https://wa.me/'+d+(msg?'?text='+encodeURIComponent(msg):''),'_blank');
}

// ── Modais (criados uma vez, no primeiro uso) ──
function crmModais(){
  if(document.getElementById('modal-crm-lead')) return;
  const opcoesOrigem=CRM_ORIGENS.map(o=>`<option>${o}</option>`).join('');
  const opcoesStatus=Object.keys(CRM_LEAD_STATUS).filter(k=>k!=='convertido').map(k=>`<option value="${k}">${CRM_LEAD_STATUS[k]}</option>`).join('');
  const opcoesEtapa=CRM_ETAPAS.map(e=>`<option value="${e.id}">${e.nome}</option>`).join('');
  const opcoesTipo=Object.keys(CRM_TIPOS_ATIV).map(k=>`<option value="${k}">${CRM_TIPOS_ATIV[k]}</option>`).join('');
  const wrap=document.createElement('div');
  wrap.innerHTML=`
<div class="modal-overlay" id="modal-crm-lead"><div class="modal">
  <div class="modal-header"><h3 id="crm-lead-title">Novo Lead</h3><button class="modal-close" onclick="closeModal('modal-crm-lead')"><i data-lucide="x" class="ic"></i></button></div>
  <div class="modal-body">
    <input type="hidden" id="crm-lead-id">
    <div class="form-group"><label>Nome</label><input class="form-control" id="crm-lead-nome" placeholder="Ex: Mercadinho do Zé"></div>
    <div class="form-row">
      <div class="form-group"><label>Telefone / WhatsApp</label><input class="form-control" id="crm-lead-tel" inputmode="tel" placeholder="(11) 99999-9999"></div>
      <div class="form-group"><label>E-mail (opcional)</label><input class="form-control" id="crm-lead-email" type="email"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Origem</label><select class="form-control" id="crm-lead-origem">${opcoesOrigem}</select></div>
      <div class="form-group"><label>Status</label><select class="form-control" id="crm-lead-status">${opcoesStatus}</select></div>
    </div>
    <div class="form-group"><label>Observações</label><textarea class="form-control" id="crm-lead-obs" rows="2"></textarea></div>
    <div class="modal-footer">
      <button class="btn btn-outline" id="crm-lead-del" style="margin-right:auto;display:none" onclick="crmExcluirLead()">Excluir</button>
      <button class="btn btn-outline" onclick="closeModal('modal-crm-lead')">Cancelar</button>
      <button class="btn btn-primary" onclick="crmSalvarLead()">Salvar</button>
    </div>
  </div>
</div></div>
<div class="modal-overlay" id="modal-crm-negocio"><div class="modal">
  <div class="modal-header"><h3 id="crm-neg-title">Novo Negócio</h3><button class="modal-close" onclick="closeModal('modal-crm-negocio')"><i data-lucide="x" class="ic"></i></button></div>
  <div class="modal-body">
    <input type="hidden" id="crm-neg-id">
    <div class="form-group"><label>Título</label><input class="form-control" id="crm-neg-titulo" placeholder="Ex: Pedido mensal de limpeza"></div>
    <div class="form-group"><label>Cliente ou lead</label><select class="form-control" id="crm-neg-ref"></select></div>
    <div class="form-row">
      <div class="form-group"><label>Valor (R$)</label><input class="form-control" id="crm-neg-valor" inputmode="decimal" placeholder="0,00"></div>
      <div class="form-group"><label>Previsão de fechamento</label><input class="form-control" id="crm-neg-prev" type="date"></div>
    </div>
    <div class="form-group"><label>Etapa</label><select class="form-control" id="crm-neg-etapa" onchange="crmToggleMotivo()">${opcoesEtapa}</select></div>
    <div class="form-group" id="crm-neg-motivo-wrap" style="display:none"><label>Motivo da perda</label><input class="form-control" id="crm-neg-motivo" placeholder="Ex: preço, escolheu outro fornecedor"></div>
    <div class="form-group"><label>Observações</label><textarea class="form-control" id="crm-neg-obs" rows="2"></textarea></div>
    <div class="modal-footer">
      <button class="btn btn-outline" id="crm-neg-del" style="margin-right:auto;display:none" onclick="crmExcluirNegocio()">Excluir</button>
      <button class="btn btn-outline" onclick="closeModal('modal-crm-negocio')">Cancelar</button>
      <button class="btn btn-primary" onclick="crmSalvarNegocio()">Salvar</button>
    </div>
  </div>
</div></div>
<div class="modal-overlay" id="modal-crm-ativ"><div class="modal">
  <div class="modal-header"><h3 id="crm-ativ-title">Nova Atividade</h3><button class="modal-close" onclick="closeModal('modal-crm-ativ')"><i data-lucide="x" class="ic"></i></button></div>
  <div class="modal-body">
    <input type="hidden" id="crm-ativ-id"><input type="hidden" id="crm-ativ-negocio">
    <div class="form-row">
      <div class="form-group"><label>Tipo</label><select class="form-control" id="crm-ativ-tipo">${opcoesTipo}</select></div>
      <div class="form-group"><label>Data</label><input class="form-control" id="crm-ativ-data" type="date"></div>
    </div>
    <div class="form-group"><label>O que fazer</label><input class="form-control" id="crm-ativ-titulo" placeholder="Ex: Ligar para confirmar proposta"></div>
    <div class="form-group"><label>Hora (opcional)</label><input class="form-control" id="crm-ativ-hora" type="time"></div>
    <div class="form-group"><label>Cliente ou lead (opcional)</label><select class="form-control" id="crm-ativ-ref"></select></div>
    <div class="modal-footer">
      <button class="btn btn-outline" id="crm-ativ-del" style="margin-right:auto;display:none" onclick="crmExcluirAtividade()">Excluir</button>
      <button class="btn btn-outline" onclick="closeModal('modal-crm-ativ')">Cancelar</button>
      <button class="btn btn-primary" onclick="crmSalvarAtividade()">Salvar</button>
    </div>
  </div>
</div></div>`;
  while(wrap.firstChild) document.body.appendChild(wrap.firstChild);
  document.querySelectorAll('#modal-crm-lead,#modal-crm-negocio,#modal-crm-ativ').forEach(m=>{
    m.addEventListener('click',e=>{ if(e.target===m) m.classList.remove('open'); });
  });
}

// ── Navegação interna ──
function crmTab(t){ state.crm_tab=t; renderCRM(); }
function renderCRM(){
  crmGaranteEstado(); crmModais();
  const abas=[['funil','Funil','kanban'],['clientes','Clientes','users'],['leads','Leads','user-plus'],['atividades','Atividades','calendar-check'],['painel','Painel','bar-chart-3']];
  const pend=state.crmAtividades.filter(a=>!a.concluida&&a.data&&a.data<=today()).length;
  document.getElementById('crm-tabs').innerHTML=abas.map(([id,nome,ic])=>
    `<button class="crm-tab${state.crm_tab===id?' active':''}" onclick="crmTab('${id}')"><i data-lucide="${ic}" class="ic"></i> ${nome}${id==='atividades'&&pend?`<span class="crm-pill">${pend}</span>`:''}</button>`).join('');
  const el=document.getElementById('crm-content');
  if(state.crm_tab==='clientes') el.innerHTML=(typeof relHtmlClientes==='function')?relHtmlClientes():'';
  else if(state.crm_tab==='leads') el.innerHTML=crmHtmlLeads();
  else if(state.crm_tab==='atividades') el.innerHTML=crmHtmlAtividades();
  else if(state.crm_tab==='painel') el.innerHTML=crmHtmlPainel();
  else el.innerHTML=crmHtmlFunil();
}

// ── FUNIL (kanban) ──
function crmHtmlFunil(){
  const nes=state.crmNegocios;
  const aberto=nes.filter(n=>n.etapa!=='ganho'&&n.etapa!=='perdido');
  const totalAberto=aberto.reduce((s,n)=>s+(n.valor||0),0);
  const resumo=`<div class="crm-resumo"><span><strong>${aberto.length}</strong> em aberto</span><span><strong>${fmt(totalAberto)}</strong> no funil</span></div>`;
  const cols=CRM_ETAPAS.map(e=>{
    let lista=nes.filter(n=>n.etapa===e.id);
    if(e.id==='ganho'||e.id==='perdido') lista=lista.sort((a,b)=>(b.fechadoEm||'').localeCompare(a.fechadoEm||'')).slice(0,15);
    else lista=lista.sort((a,b)=>(a.previsao||'9999').localeCompare(b.previsao||'9999'));
    const soma=nes.filter(n=>n.etapa===e.id).reduce((s,n)=>s+(n.valor||0),0);
    return `<div class="crm-col"><div class="crm-col-head" style="border-top-color:${e.cor}"><span>${e.nome} <small>${nes.filter(n=>n.etapa===e.id).length}</small></span><small>${fmt(soma)}</small></div>
      <div class="crm-col-body">${lista.length?lista.map(crmCardNegocio).join(''):'<div class="crm-vazio">Vazio</div>'}</div></div>`;
  }).join('');
  return resumo+`<div class="crm-board">${cols}</div>`;
}
function crmCardNegocio(n){
  const idx=CRM_ETAPAS.findIndex(e=>e.id===n.etapa);
  const atrasado=n.previsao&&n.previsao<today()&&n.etapa!=='ganho'&&n.etapa!=='perdido';
  const fechado=n.etapa==='ganho'||n.etapa==='perdido';
  const ref=crmNomeRef(n);
  const ant=(!fechado&&idx>0)?`<button class="icon-btn" title="Etapa anterior" onclick="event.stopPropagation();crmMover(${n.id},'${CRM_ETAPAS[idx-1].id}')"><i data-lucide="chevron-left" class="ic"></i></button>`:'<span></span>';
  const prox=!fechado?`<button class="icon-btn" title="Próxima etapa" onclick="event.stopPropagation();crmMover(${n.id},'${CRM_ETAPAS[idx+1].id}')"><i data-lucide="chevron-right" class="ic"></i></button>`:'<span></span>';
  const venda=(n.etapa==='ganho')?`<button class="btn btn-green btn-sm" onclick="event.stopPropagation();crmGerarVenda(${n.id})">${n.vendaGerada?'Nova venda':'Gerar venda'}</button>`:'';
  return `<div class="crm-card" onclick="crmEditarNegocio(${n.id})">
    <div class="crm-card-titulo">${escapeHtml(n.titulo)}</div>
    ${ref?`<div class="crm-card-sub">${escapeHtml(ref)}</div>`:''}
    <div class="crm-card-valor">${fmt(n.valor)}</div>
    ${n.previsao?`<div class="crm-card-sub${atrasado?' crm-atraso':''}">${atrasado?'Atrasado · ':'Previsão '}${fmtDate(n.previsao)}</div>`:''}
    ${n.etapa==='perdido'&&n.motivoPerda?`<div class="crm-card-sub">Motivo: ${escapeHtml(n.motivoPerda)}</div>`:''}
    <div class="crm-card-acoes">${ant}${venda}${prox}</div>
  </div>`;
}
function crmNovoNegocio(opts){
  crmGaranteEstado(); crmModais();
  opts=opts||{};
  document.getElementById('crm-neg-id').value='';
  document.getElementById('crm-neg-title').textContent='Novo Negócio';
  document.getElementById('crm-neg-titulo').value='';
  crmRefSelect('crm-neg-ref',opts.clienteId||null,opts.leadId||null,false);
  document.getElementById('crm-neg-valor').value='';
  document.getElementById('crm-neg-prev').value='';
  document.getElementById('crm-neg-etapa').value='qualificacao';
  document.getElementById('crm-neg-motivo').value='';
  document.getElementById('crm-neg-obs').value='';
  document.getElementById('crm-neg-del').style.display='none';
  crmToggleMotivo();
  document.getElementById('modal-crm-negocio').classList.add('open');
}
function crmEditarNegocio(id){
  const n=state.crmNegocios.find(n=>n.id===id); if(!n) return;
  crmModais();
  document.getElementById('crm-neg-id').value=id;
  document.getElementById('crm-neg-title').textContent='Editar Negócio';
  document.getElementById('crm-neg-titulo').value=n.titulo;
  crmRefSelect('crm-neg-ref',n.clienteId,n.leadId,false);
  document.getElementById('crm-neg-valor').value=n.valor?String(n.valor).replace('.',','):'';
  document.getElementById('crm-neg-prev').value=n.previsao||'';
  document.getElementById('crm-neg-etapa').value=n.etapa;
  document.getElementById('crm-neg-motivo').value=n.motivoPerda||'';
  document.getElementById('crm-neg-obs').value=n.obs||'';
  document.getElementById('crm-neg-del').style.display='inline-flex';
  crmToggleMotivo();
  document.getElementById('modal-crm-negocio').classList.add('open');
}
function crmToggleMotivo(){
  document.getElementById('crm-neg-motivo-wrap').style.display=document.getElementById('crm-neg-etapa').value==='perdido'?'block':'none';
}
function crmSalvarNegocio(){
  const eid=document.getElementById('crm-neg-id').value;
  const titulo=document.getElementById('crm-neg-titulo').value.trim();
  const ref=crmLerRef('crm-neg-ref');
  if(!titulo){ showToast('Informe o título do negócio','red'); return; }
  if(!ref.clienteId&&!ref.leadId){ showToast('Escolha o cliente ou lead','red'); return; }
  const etapa=document.getElementById('crm-neg-etapa').value;
  const dados={titulo,clienteId:ref.clienteId,leadId:ref.leadId,valor:crmNum(document.getElementById('crm-neg-valor').value),
    previsao:document.getElementById('crm-neg-prev').value||'',obs:document.getElementById('crm-neg-obs').value.trim(),
    motivoPerda:etapa==='perdido'?document.getElementById('crm-neg-motivo').value.trim():''};
  let n;
  if(eid){ n=state.crmNegocios.find(n=>n.id==eid); Object.assign(n,dados); }
  else { n={id:nextId('crmNegocios'),criadoEm:today(),etapa:'qualificacao',...dados}; state.crmNegocios.push(n); }
  marcarAlterado();
  closeModal('modal-crm-negocio');
  if(etapa!==n.etapa||!eid) crmAplicarEtapa(n,etapa); else renderCRM();
  showToast(eid?'Negócio atualizado':'Negócio criado','green');
}
function crmMover(id,etapa){
  const n=state.crmNegocios.find(n=>n.id===id); if(!n) return;
  if(etapa==='perdido'){ crmEditarNegocio(id); document.getElementById('crm-neg-etapa').value='perdido'; crmToggleMotivo(); return; }
  crmAplicarEtapa(n,etapa);
}
function crmAplicarEtapa(n,etapa){
  n.etapa=etapa;
  if(etapa==='ganho'||etapa==='perdido') n.fechadoEm=n.fechadoEm||today(); else n.fechadoEm='';
  if(etapa!=='perdido') n.motivoPerda='';
  marcarAlterado();
  renderCRM();
  if(etapa==='ganho'){
    if(!n.clienteId&&n.leadId) crmConverterLeadSilencioso(n.leadId);
    confirmarAcao('Negócio ganho! Abrir uma nova venda já preenchida com o cliente e o valor de '+fmt(n.valor)+'?',()=>crmGerarVenda(n.id));
  }
}
function crmExcluirNegocio(){
  const id=parseInt(document.getElementById('crm-neg-id').value);
  confirmarAcao('Excluir este negócio?',()=>{
    state.crmNegocios=state.crmNegocios.filter(n=>n.id!==id);
    state.crmAtividades.forEach(a=>{ if(a.negocioId===id) a.negocioId=null; });
    marcarAlterado(); closeModal('modal-crm-negocio'); renderCRM(); showToast('Negócio excluído','green');
  });
}
function crmGerarVenda(id){
  const n=state.crmNegocios.find(n=>n.id===id); if(!n) return;
  if(!n.clienteId&&n.leadId) crmConverterLeadSilencioso(n.leadId);
  if(!n.clienteId){ showToast('Negócio sem cliente — edite e escolha um cliente','red'); return; }
  goto('vendas');
  abrirNovaVenda();
  selecionarClienteVenda(n.clienteId);
  vendaItensTemp.push(criarLinhaItemVenda({produtoId:null,varianteId:null,avulso:true,nome:String(n.titulo).slice(0,40),qtd:1,preco:n.valor||0,custo:0}));
  document.getElementById('venda-obs').value='CRM: '+n.titulo;
  renderVendaItensLista();
  calcTotalVendaGeral();
  n.vendaGerada=true; marcarAlterado();
  showToast('Venda preenchida — confira e confirme','green');
}

// ── LEADS ──
function crmHtmlLeads(){
  const q=normBusca(crmBusca);
  let lista=state.crmLeads.filter(l=>!q||normBusca(l.nome).includes(q)||String(l.tel||'').replace(/\D/g,'').includes(q.replace(/\D/g,'')||'\u0000')||normBusca(l.origem||'').includes(q));
  lista=lista.sort((a,b)=>{ const ra=a.status==='convertido'||a.status==='desqualificado'?1:0, rb=b.status==='convertido'||b.status==='desqualificado'?1:0; return ra-rb||b.id-a.id; });
  const busca=`<div class="search-bar"><input class="search-input" id="crm-busca" placeholder="Buscar lead por nome, telefone ou origem..." value="${escapeHtml(crmBusca)}" oninput="crmBuscar(this.value)"></div>`;
  if(!lista.length) return busca+`<div class="crm-vazio" style="padding:30px">${state.crmLeads.length?'Nenhum lead encontrado':'Nenhum lead ainda. Toque em “+ Lead” para cadastrar o primeiro.'}</div>`;
  const cor={novo:'badge-blue',contato:'badge-yellow',qualificado:'badge-green',desqualificado:'badge-gray',convertido:'badge-green'};
  return busca+`<div class="crm-lista">`+lista.map(l=>{
    const conv=l.status==='convertido';
    return `<div class="crm-item">
      <div class="crm-item-main"><strong>${escapeHtml(l.nome)}</strong> <span class="badge ${cor[l.status]||'badge-gray'}">${CRM_LEAD_STATUS[l.status]||l.status}</span>
        <div class="crm-card-sub">${[l.origem,l.tel,l.email].filter(Boolean).map(escapeHtml).join(' · ')}</div>
        ${l.obs?`<div class="crm-card-sub">${escapeHtml(l.obs)}</div>`:''}</div>
      <div class="actions-cell">
        ${l.tel?`<button class="btn btn-whatsapp btn-sm" title="WhatsApp" onclick="crmWhats(crmLead(${l.id}).tel)"><i data-lucide="message-circle" class="ic"></i></button>`:''}
        ${!conv?`<button class="btn btn-outline btn-sm" onclick="crmNovoNegocio({leadId:${l.id}})">+ Negócio</button>
        <button class="btn btn-green btn-sm" onclick="crmConverterLead(${l.id})">Virar cliente</button>`:''}
        <button class="icon-btn edit" title="Editar" onclick="crmEditarLead(${l.id})"><i data-lucide="pencil" class="ic"></i></button>
      </div></div>`;
  }).join('')+`</div>`;
}
const crmBuscar=debounce(v=>{ crmBusca=v; const el=document.getElementById('crm-content'); if(el&&state.crm_tab==='leads'){ el.innerHTML=crmHtmlLeads(); const i=document.getElementById('crm-busca'); if(i){ i.focus(); i.setSelectionRange(i.value.length,i.value.length); } } },200);
function crmLead(id){ return state.crmLeads.find(l=>l.id===id)||{}; }
function crmNovoLead(){
  crmGaranteEstado(); crmModais();
  document.getElementById('crm-lead-id').value='';
  document.getElementById('crm-lead-title').textContent='Novo Lead';
  ['nome','tel','email','obs'].forEach(k=>document.getElementById('crm-lead-'+k).value='');
  document.getElementById('crm-lead-origem').value=CRM_ORIGENS[0];
  document.getElementById('crm-lead-status').value='novo';
  document.getElementById('crm-lead-del').style.display='none';
  document.getElementById('modal-crm-lead').classList.add('open');
}
function crmEditarLead(id){
  const l=crmLead(id); if(!l.id) return;
  crmModais();
  document.getElementById('crm-lead-id').value=id;
  document.getElementById('crm-lead-title').textContent='Editar Lead';
  document.getElementById('crm-lead-nome').value=l.nome||'';
  document.getElementById('crm-lead-tel').value=l.tel||'';
  document.getElementById('crm-lead-email').value=l.email||'';
  document.getElementById('crm-lead-obs').value=l.obs||'';
  document.getElementById('crm-lead-origem').value=CRM_ORIGENS.includes(l.origem)?l.origem:'Outro';
  const st=document.getElementById('crm-lead-status');
  if(l.status==='convertido'&&!st.querySelector('option[value="convertido"]')) st.insertAdjacentHTML('beforeend','<option value="convertido">Convertido</option>');
  st.value=l.status||'novo';
  document.getElementById('crm-lead-del').style.display='inline-flex';
  document.getElementById('modal-crm-lead').classList.add('open');
}
function crmSalvarLead(){
  const eid=document.getElementById('crm-lead-id').value;
  const nome=document.getElementById('crm-lead-nome').value.trim();
  if(!nome){ showToast('Informe o nome do lead','red'); return; }
  const dados={nome,tel:document.getElementById('crm-lead-tel').value.trim(),email:document.getElementById('crm-lead-email').value.trim(),
    origem:document.getElementById('crm-lead-origem').value,status:document.getElementById('crm-lead-status').value,obs:document.getElementById('crm-lead-obs').value.trim()};
  if(eid){ Object.assign(state.crmLeads.find(l=>l.id==eid),dados); showToast('Lead atualizado','green'); }
  else { state.crmLeads.push({id:nextId('crmLeads'),criadoEm:today(),...dados}); showToast('Lead cadastrado','green'); }
  marcarAlterado(); closeModal('modal-crm-lead'); renderCRM();
}
function crmExcluirLead(){
  const id=parseInt(document.getElementById('crm-lead-id').value);
  const temNeg=state.crmNegocios.some(n=>n.leadId===id&&!n.clienteId);
  confirmarAcao(temNeg?'Este lead tem negócios vinculados — eles também serão excluídos. Continuar?':'Excluir este lead?',()=>{
    state.crmNegocios=state.crmNegocios.filter(n=>!(n.leadId===id&&!n.clienteId));
    state.crmAtividades=state.crmAtividades.filter(a=>!(a.leadId===id&&!a.clienteId));
    state.crmLeads=state.crmLeads.filter(l=>l.id!==id);
    marcarAlterado(); closeModal('modal-crm-lead'); renderCRM(); showToast('Lead excluído','green');
  });
}
// Cria o cliente a partir do lead (se já não existir) e religa negócios/atividades.
function crmConverterLeadSilencioso(leadId){
  const l=state.crmLeads.find(l=>l.id===leadId); if(!l) return null;
  if(!l.clienteId){
    const cid=nextId('clientes');
    state.clientes.push({id:cid,nome:l.nome,tel:l.tel||'',end:'',referencia:'',rotaId:null,rotaOrdem:null,ativo:true,dataCadastro:today()});
    l.clienteId=cid;
  }
  l.status='convertido';
  state.crmNegocios.forEach(n=>{ if(n.leadId===leadId){ n.clienteId=l.clienteId; n.leadId=null; } });
  state.crmAtividades.forEach(a=>{ if(a.leadId===leadId){ a.clienteId=l.clienteId; a.leadId=null; } });
  marcarAlterado();
  return l.clienteId;
}
function crmConverterLead(id){
  const l=crmLead(id); if(!l.id) return;
  confirmarAcao('Converter “'+l.nome+'” em cliente? Ele passa a aparecer em Clientes e poderá receber vendas.',()=>{
    crmConverterLeadSilencioso(id);
    renderCRM(); if(typeof renderClientes==='function') renderClientes();
    showToast('Lead convertido em cliente ✓','green');
  });
}

// ── ATIVIDADES ──
function crmFiltrarAtiv(f){ crmAtivFiltro=f; renderCRM(); }
function crmHtmlAtividades(){
  const hoje=today();
  let lista=state.crmAtividades.slice();
  if(crmAtivFiltro==='pendentes') lista=lista.filter(a=>!a.concluida);
  else if(crmAtivFiltro==='concluidas') lista=lista.filter(a=>a.concluida);
  lista.sort((a,b)=>crmAtivFiltro==='concluidas'?((b.data||'')+(b.hora||'')).localeCompare((a.data||'')+(a.hora||'')):((a.data||'9999')+(a.hora||'')).localeCompare((b.data||'9999')+(b.hora||'')));
  const filtros=`<div class="search-bar"><select class="filter" style="max-width:none" onchange="crmFiltrarAtiv(this.value)">
    <option value="pendentes"${crmAtivFiltro==='pendentes'?' selected':''}>Pendentes</option><option value="concluidas"${crmAtivFiltro==='concluidas'?' selected':''}>Concluídas</option><option value="todas"${crmAtivFiltro==='todas'?' selected':''}>Todas</option></select></div>`;
  if(!lista.length) return filtros+'<div class="crm-vazio" style="padding:30px">Nenhuma atividade aqui.</div>';
  return filtros+'<div class="crm-lista">'+lista.map(a=>{
    const atrasada=!a.concluida&&a.data&&a.data<hoje, ehHoje=!a.concluida&&a.data===hoje;
    const ref=crmNomeRef(a), neg=a.negocioId?state.crmNegocios.find(n=>n.id===a.negocioId):null;
    return `<div class="crm-item${a.concluida?' crm-feita':''}">
      <button class="crm-check${a.concluida?' on':''}" onclick="crmToggleAtiv(${a.id})" title="${a.concluida?'Reabrir':'Concluir'}">${a.concluida?'✓':''}</button>
      <div class="crm-item-main"><strong>${escapeHtml(a.titulo)}</strong> <span class="badge badge-gray">${CRM_TIPOS_ATIV[a.tipo]||a.tipo}</span>
        <div class="crm-card-sub${atrasada?' crm-atraso':''}">${a.data?(atrasada?'Atrasada · ':ehHoje?'Hoje · ':'')+fmtDate(a.data)+(a.hora?' '+escapeHtml(a.hora):''):'Sem data'}${ref?' · '+escapeHtml(ref):''}${neg?' · '+escapeHtml(neg.titulo):''}</div></div>
      <div class="actions-cell"><button class="icon-btn edit" title="Editar" onclick="crmEditarAtividade(${a.id})"><i data-lucide="pencil" class="ic"></i></button></div></div>`;
  }).join('')+'</div>';
}
function crmNovaAtividade(opts){
  crmGaranteEstado(); crmModais(); opts=opts||{};
  document.getElementById('crm-ativ-id').value='';
  document.getElementById('crm-ativ-negocio').value=opts.negocioId||'';
  document.getElementById('crm-ativ-title').textContent='Nova Atividade';
  document.getElementById('crm-ativ-tipo').value='tarefa';
  document.getElementById('crm-ativ-titulo').value='';
  document.getElementById('crm-ativ-data').value=today();
  document.getElementById('crm-ativ-hora').value='';
  crmRefSelect('crm-ativ-ref',opts.clienteId||null,opts.leadId||null,true);
  document.getElementById('crm-ativ-del').style.display='none';
  document.getElementById('modal-crm-ativ').classList.add('open');
}
function crmEditarAtividade(id){
  const a=state.crmAtividades.find(a=>a.id===id); if(!a) return;
  crmModais();
  document.getElementById('crm-ativ-id').value=id;
  document.getElementById('crm-ativ-negocio').value=a.negocioId||'';
  document.getElementById('crm-ativ-title').textContent='Editar Atividade';
  document.getElementById('crm-ativ-tipo').value=a.tipo;
  document.getElementById('crm-ativ-titulo').value=a.titulo;
  document.getElementById('crm-ativ-data').value=a.data||'';
  document.getElementById('crm-ativ-hora').value=a.hora||'';
  crmRefSelect('crm-ativ-ref',a.clienteId,a.leadId,true);
  document.getElementById('crm-ativ-del').style.display='inline-flex';
  document.getElementById('modal-crm-ativ').classList.add('open');
}
function crmSalvarAtividade(){
  const eid=document.getElementById('crm-ativ-id').value;
  const titulo=document.getElementById('crm-ativ-titulo').value.trim();
  if(!titulo){ showToast('Informe o que fazer','red'); return; }
  const ref=crmLerRef('crm-ativ-ref');
  const dados={tipo:document.getElementById('crm-ativ-tipo').value,titulo,data:document.getElementById('crm-ativ-data').value||'',
    hora:document.getElementById('crm-ativ-hora').value||'',clienteId:ref.clienteId,leadId:ref.leadId,negocioId:parseInt(document.getElementById('crm-ativ-negocio').value)||null};
  if(eid) Object.assign(state.crmAtividades.find(a=>a.id==eid),dados);
  else state.crmAtividades.push({id:nextId('crmAtividades'),concluida:false,criadoEm:today(),...dados});
  marcarAlterado(); closeModal('modal-crm-ativ'); renderCRM(); showToast(eid?'Atividade atualizada':'Atividade criada','green');
}
function crmToggleAtiv(id){
  const a=state.crmAtividades.find(a=>a.id===id); if(!a) return;
  a.concluida=!a.concluida; a.concluidaEm=a.concluida?today():'';
  marcarAlterado(); renderCRM();
}
function crmExcluirAtividade(){
  const id=parseInt(document.getElementById('crm-ativ-id').value);
  confirmarAcao('Excluir esta atividade?',()=>{
    state.crmAtividades=state.crmAtividades.filter(a=>a.id!==id);
    marcarAlterado(); closeModal('modal-crm-ativ'); renderCRM(); showToast('Atividade excluída','green');
  });
}

// ── PAINEL ──
function crmHtmlPainel(){
  const ne=state.crmNegocios, mes=today().slice(0,7);
  const aberto=ne.filter(n=>n.etapa!=='ganho'&&n.etapa!=='perdido');
  const ganhos=ne.filter(n=>n.etapa==='ganho'), perdidos=ne.filter(n=>n.etapa==='perdido');
  const ganhosMes=ganhos.filter(n=>(n.fechadoEm||'').slice(0,7)===mes);
  const taxa=(ganhos.length+perdidos.length)>0?Math.round(ganhos.length/(ganhos.length+perdidos.length)*100):null;
  const leadsAtivos=state.crmLeads.filter(l=>l.status==='novo'||l.status==='contato'||l.status==='qualificado').length;
  const conv=state.crmLeads.filter(l=>l.status==='convertido').length;
  const atrasadas=state.crmAtividades.filter(a=>!a.concluida&&a.data&&a.data<today()).length;
  const ticket=ganhos.length?ganhos.reduce((s,n)=>s+(n.valor||0),0)/ganhos.length:0;
  const card=(l,v,s,c)=>`<div class="stat-card ${c||''}"><div class="label">${l}</div><div class="value">${v}</div><div class="sub">${s||''}</div></div>`;
  const maxEt=Math.max(1,...CRM_ETAPAS.slice(0,3).map(e=>ne.filter(n=>n.etapa===e.id).reduce((s,n)=>s+(n.valor||0),0)));
  const barras=CRM_ETAPAS.slice(0,3).map(e=>{
    const v=ne.filter(n=>n.etapa===e.id).reduce((s,n)=>s+(n.valor||0),0), q=ne.filter(n=>n.etapa===e.id).length;
    return `<div class="crm-barra"><span>${e.nome} (${q})</span><div><i style="width:${Math.round(v/maxEt*100)}%;background:${e.cor}"></i></div><strong>${fmt(v)}</strong></div>`;
  }).join('');
  const motivos={}; perdidos.forEach(n=>{ const m=(n.motivoPerda||'Sem motivo').trim()||'Sem motivo'; motivos[m]=(motivos[m]||0)+1; });
  const topMot=Object.entries(motivos).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([m,q])=>`<span class="badge badge-gray">${escapeHtml(m)} · ${q}</span>`).join(' ');
  return `<div class="cards-grid cards-grid-4" style="margin-bottom:14px">
    ${card('No funil',fmt(aberto.reduce((s,n)=>s+(n.valor||0),0)),aberto.length+' negócio(s) em aberto')}
    ${card('Ganho no mês',fmt(ganhosMes.reduce((s,n)=>s+(n.valor||0),0)),ganhosMes.length+' negócio(s)','green')}
    ${card('Taxa de conversão',taxa===null?'—':taxa+'%',ganhos.length+' ganho(s) · '+perdidos.length+' perdido(s)')}
    ${card('Ticket médio ganho',ganhos.length?fmt(ticket):'—','')}
    ${card('Leads ativos',leadsAtivos,conv+' convertido(s) em cliente')}
    ${card('Atividades atrasadas',atrasadas,atrasadas?'precisam de atenção':'tudo em dia',atrasadas?'red':'')}
  </div>
  <div class="table-card" style="padding:14px"><div class="label" style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);margin-bottom:10px">Valor por etapa do funil</div>${barras}
  ${topMot?`<div style="margin-top:14px;font-size:12px;color:var(--muted)">Motivos de perda: ${topMot}</div>`:''}</div>`;
}
