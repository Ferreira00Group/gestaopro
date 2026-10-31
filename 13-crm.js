// ============ CRM (v5.44; funis, itens e próxima ação v5.47) — inspirado no Zoho CRM ============
// Dados (todos dentro do state, entram em backup/Drive automaticamente):
//   state.crmFunis       [{id,nome,etapas:[{id,nome,cor,prob}]}]   (só etapas intermediárias; "ganho" 100% e "perdido" 0% são fixas)
//   state.crmLeads       [{id,nome,tel,email,origem,status,obs,criadoEm,clienteId?}]
//     status: novo | contato | qualificado | desqualificado | convertido
//   state.crmNegocios    [{id,titulo,funilId,clienteId?,leadId?,valor,itens:[{produtoId,varianteId,nome,qtd,preco}],etapa,
//                          proxAcao:{tipo,titulo,data}|null,previsao,motivoPerda,obs,criadoEm,fechadoEm?,vendaGerada?,
//                          origem,historico:[{etapa,data,aprox?}]}]   (v5.48)
//     origem: copiada da origem do lead no momento em que o negócio é criado (sobrevive à conversão do lead em cliente).
//     historico: uma linha por entrada em etapa (inclui ganho/perdido), data YYYY-MM-DD; aprox:true = reconstruído na migração.
//   state.crmAtividades  [{id,tipo,titulo,data,hora,concluida,clienteId?,leadId?,negocioId?}]
// Regras: negócio aberto sempre tem próxima ação (com data); valor ponderado = valor × probabilidade da etapa;
// com itens do catálogo, o valor é a soma dos itens e a venda gerada nasce com esses itens.
// Integração: lead convertido vira registro em state.clientes; negócio ganho abre "Nova Venda" já preenchida
// — a venda só é gravada ao confirmar. Próximas ações e atividades vencidas aparecem em "Meu dia".

const CRM_ETAPA_GANHO={id:'ganho',nome:'Ganho',cor:'#4CC38A',prob:100};
const CRM_ETAPA_PERDIDO={id:'perdido',nome:'Perdido',cor:'#E5604F',prob:0};
const CRM_CORES_ETAPA=['#8E897C','#C9A24B','#E0B95A','#7FA8D9','#B58DD9','#D98F6B'];
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
  if(!Array.isArray(state.crmFunis)||!state.crmFunis.length) state.crmFunis=crmFunisPadrao();
  ['crmFunis','crmEtapas'].forEach(k=>{ if(!(state.nextId[k]>0)) state.nextId[k]=(k==='crmFunis'?state.crmFunis.reduce((m,f)=>Math.max(m,f.id||0),0)+1:1); });
  if(!crmFunil(state.crm_funil_id)) state.crm_funil_id=state.crmFunis[0].id;
  state.crmNegocios.forEach(n=>{ if(!n.funilId) n.funilId=state.crmFunis[0].id; if(!Array.isArray(n.itens)) n.itens=[]; });
}
// v5.48 — origem do lead levada para o negócio. Depois que o lead vira cliente o negócio perde o leadId,
// então a origem é copiada na criação; se só há cliente, procura o lead que originou aquele cliente.
function crmOrigemDe(clienteId,leadId){
  let l=leadId?state.crmLeads.find(l=>l.id==leadId):null;
  if(!l&&clienteId) l=state.crmLeads.find(l=>l.clienteId==clienteId);
  return (l&&l.origem)||'';
}
// v5.48 — registra a entrada do negócio numa etapa (não duplica se já é a última do histórico).
function crmRegistraEtapa(n,etapa){
  if(!Array.isArray(n.historico)) n.historico=[];
  if(!n.historico.length&&n.etapa&&n.etapa!==etapa) n.historico.push({etapa:n.etapa,data:n.criadoEm||today(),aprox:true});
  const ult=n.historico[n.historico.length-1];
  if(ult&&ult.etapa===etapa) return;
  n.historico.push({etapa,data:today()});
}
function crmNum(v){ return Math.max(0,parseFloat(String(v==null?'':v).replace(',','.'))||0); }
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
      <div class="form-group"><label>Funil</label><select class="form-control" id="crm-neg-funil" onchange="crmNegTrocaFunil()"></select></div>
      <div class="form-group"><label>Etapa</label><select class="form-control" id="crm-neg-etapa" onchange="crmToggleMotivo()"></select></div>
    </div>
    <div class="form-group"><label>Itens do catálogo (opcional)</label>
      <select class="form-control" id="crm-neg-prod" onchange="crmNegAddItem()"></select>
      <div id="crm-neg-itens-lista"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Valor (R$)</label><input class="form-control" id="crm-neg-valor" inputmode="decimal" placeholder="0,00"><small id="crm-neg-valor-hint" style="display:none;color:var(--muted)">Soma dos itens acima</small></div>
      <div class="form-group"><label>Previsão de fechamento</label><input class="form-control" id="crm-neg-prev" type="date"></div>
    </div>
    <div class="crm-pa-box" id="crm-neg-pa-wrap">
      <label>Próxima ação <span style="color:var(--red)">(obrigatória)</span></label>
      <div class="form-row">
        <div class="form-group"><select class="form-control" id="crm-neg-pa-tipo">${opcoesTipo}</select></div>
        <div class="form-group"><input class="form-control" id="crm-neg-pa-data" type="date"></div>
      </div>
      <input class="form-control" id="crm-neg-pa-titulo" placeholder="Ex: Ligar para confirmar a proposta">
    </div>
    <div class="form-group" id="crm-neg-motivo-wrap" style="display:none"><label>Motivo da perda</label><input class="form-control" id="crm-neg-motivo" placeholder="Ex: preço, escolheu outro fornecedor"></div>
    <div class="form-group"><label>Observações</label><textarea class="form-control" id="crm-neg-obs" rows="2"></textarea></div>
    <div class="modal-footer">
      <button class="btn btn-outline" id="crm-neg-del" style="margin-right:auto;display:none" onclick="crmExcluirNegocio()">Excluir</button>
      <button class="btn btn-outline" onclick="closeModal('modal-crm-negocio')">Cancelar</button>
      <button class="btn btn-primary" onclick="crmSalvarNegocio()">Salvar</button>
    </div>
  </div>
</div></div>
<div class="modal-overlay" id="modal-crm-funis"><div class="modal">
  <div class="modal-header"><h3>Funis e etapas</h3><button class="modal-close" onclick="crmFechaFunis()"><i data-lucide="x" class="ic"></i></button></div>
  <div class="modal-body">
    <div id="crm-funis-corpo"></div>
    <div class="modal-footer">
      <button class="btn btn-outline" style="margin-right:auto" onclick="crmFunilAdd()">+ Novo funil</button>
      <button class="btn btn-primary" onclick="crmFechaFunis()">Concluir</button>
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
  document.querySelectorAll('#modal-crm-lead,#modal-crm-negocio,#modal-crm-ativ,#modal-crm-funis').forEach(m=>{
    m.addEventListener('click',e=>{ if(e.target!==m) return; if(m.id==='modal-crm-funis') crmFechaFunis(); else m.classList.remove('open'); });
  });
}

// ── Navegação interna ──
function crmTab(t){ state.crm_tab=t; renderCRM(); }
function renderCRM(){
  crmGaranteEstado(); crmModais();
  const abas=[['funil','Funil','kanban'],['clientes','Clientes','users'],['leads','Leads','user-plus'],['atividades','Atividades','calendar-check'],['painel','Painel','bar-chart-3'],['modelos','Modelos','message-square-text']];
  const pend=state.crmAtividades.filter(a=>!a.concluida&&a.data&&a.data<=today()).length;
  document.getElementById('crm-tabs').innerHTML=abas.map(([id,nome,ic])=>
    `<button class="crm-tab${state.crm_tab===id?' active':''}" onclick="crmTab('${id}')"><i data-lucide="${ic}" class="ic"></i> ${nome}${id==='atividades'&&pend?`<span class="crm-pill">${pend}</span>`:''}</button>`).join('');
  const el=document.getElementById('crm-content');
  if(state.crm_tab==='clientes') el.innerHTML=(typeof relHtmlClientes==='function')?relHtmlClientes():'';
  else if(state.crm_tab==='leads') el.innerHTML=crmHtmlLeads();
  else if(state.crm_tab==='atividades') el.innerHTML=crmHtmlAtividades();
  else if(state.crm_tab==='painel') el.innerHTML=crmHtmlPainel();
  else if(state.crm_tab==='modelos') el.innerHTML=(typeof crmHtmlModelos==='function')?crmHtmlModelos():'';
  else el.innerHTML=crmHtmlFunil();
}

// ── FUNIS E ETAPAS (v5.47) ──
function crmFunil(id){ const f=state.crmFunis||[]; return f.find(x=>x.id==id)||f[0]; }
function crmFunilAtualId(){ const f=crmFunil(state.crm_funil_id); return f?f.id:null; }
function crmEtapasFunil(funilId){ const f=crmFunil(funilId); return ((f&&f.etapas)||[]).concat([CRM_ETAPA_GANHO,CRM_ETAPA_PERDIDO]); }
function crmFechada(etapa){ return etapa==='ganho'||etapa==='perdido'; }
function crmEtapa(n){ const es=crmEtapasFunil(n.funilId); return es.find(e=>e.id===n.etapa)||es[0]; }
function crmProb(n){ const e=crmEtapa(n); return (e&&e.prob)||0; }
function crmPonderado(n){ return (n.valor||0)*crmProb(n)/100; }
function crmTemProxAcao(n){ return !!(n.proxAcao&&n.proxAcao.titulo&&n.proxAcao.data); }
function crmTelRef(o){
  if(o.clienteId){ const c=state.clientes.find(c=>c.id==o.clienteId); if(c&&c.tel) return c.tel; }
  if(o.leadId){ const l=state.crmLeads.find(l=>l.id==o.leadId); if(l&&l.tel) return l.tel; }
  return '';
}
function crmRotuloData(d,hoje){ return d<hoje?'Atrasada · '+fmtDate(d):(d===hoje?'Hoje':fmtDate(d)); }
function crmAtualizaTelas(){
  renderCRM();
  const md=document.getElementById('page-meudia');
  if(md&&md.classList.contains('active')&&typeof renderMeuDia==='function') renderMeuDia();
}
function crmTrocarFunil(v){ state.crm_funil_id=parseInt(v); renderCRM(); }
function crmFunilSeletor(){
  const fid=crmFunilAtualId();
  return `<div class="crm-toolbar"><select class="filter" style="max-width:none" onchange="crmTrocarFunil(this.value)">${state.crmFunis.map(f=>`<option value="${f.id}"${f.id==fid?' selected':''}>${escapeHtml(f.nome)}</option>`).join('')}</select>
    <button class="btn btn-outline btn-sm" onclick="crmAbrirFunis()"><i data-lucide="settings-2" class="ic"></i> Funis e etapas</button></div>`;
}

// ── FUNIL (kanban) ──
function crmHtmlFunil(){
  const fid=crmFunilAtualId();
  const etapas=crmEtapasFunil(fid);
  const nes=state.crmNegocios.filter(n=>n.funilId==fid);
  const aberto=nes.filter(n=>!crmFechada(n.etapa));
  const totalAberto=aberto.reduce((s,n)=>s+(n.valor||0),0);
  const pond=aberto.reduce((s,n)=>s+crmPonderado(n),0);
  const semAcao=aberto.filter(n=>!crmTemProxAcao(n)).length;
  const resumo=`<div class="crm-resumo"><span><strong>${aberto.length}</strong> em aberto</span><span><strong>${fmt(totalAberto)}</strong> no funil</span><span><strong>${fmt(pond)}</strong> ponderado</span>${semAcao?`<span class="crm-atraso"><strong>${semAcao}</strong> sem próxima ação</span>`:''}</div>`;
  const cols=etapas.map(e=>{
    let lista=nes.filter(n=>n.etapa===e.id);
    const qtd=lista.length, soma=lista.reduce((s,n)=>s+(n.valor||0),0);
    if(crmFechada(e.id)) lista=lista.sort((a,b)=>(b.fechadoEm||'').localeCompare(a.fechadoEm||'')).slice(0,15);
    else lista=lista.sort((a,b)=>((a.proxAcao&&a.proxAcao.data)||'0000').localeCompare((b.proxAcao&&b.proxAcao.data)||'0000'));
    return `<div class="crm-col"><div class="crm-col-head" style="border-top-color:${e.cor}"><span>${escapeHtml(e.nome)} <small>${qtd}</small></span><small>${fmt(soma)}${!crmFechada(e.id)?' · '+e.prob+'%':''}</small></div>
      <div class="crm-col-body">${lista.length?lista.map(crmCardNegocio).join(''):'<div class="crm-vazio">Vazio</div>'}</div></div>`;
  }).join('');
  return crmFunilSeletor()+resumo+`<div class="crm-board">${cols}</div>`;
}
function crmCardNegocio(n){
  const etapas=crmEtapasFunil(n.funilId);
  const idx=Math.max(0,etapas.findIndex(e=>e.id===n.etapa));
  const hoje=today();
  const fechado=crmFechada(n.etapa);
  const atrasado=n.previsao&&n.previsao<hoje&&!fechado;
  const ref=crmNomeRef(n);
  const ant=(!fechado&&idx>0)?`<button class="icon-btn" title="Etapa anterior" onclick="event.stopPropagation();crmMover(${n.id},'${etapas[idx-1].id}')"><i data-lucide="chevron-left" class="ic"></i></button>`:'<span></span>';
  const prox=!fechado?`<button class="icon-btn" title="Próxima etapa" onclick="event.stopPropagation();crmMover(${n.id},'${etapas[idx+1].id}')"><i data-lucide="chevron-right" class="ic"></i></button>`:'<span></span>';
  const venda=(n.etapa==='ganho')?`<button class="btn btn-green btn-sm" onclick="event.stopPropagation();crmGerarVenda(${n.id})">${n.vendaGerada?'Nova venda':'Gerar venda'}</button>`:'';
  let pa='';
  if(!fechado){
    if(crmTemProxAcao(n)){
      const venc=n.proxAcao.data<hoje;
      pa=`<div class="crm-prox${venc?' crm-atraso':''}"><i data-lucide="flag" class="ic ic-sm"></i> <span>${escapeHtml(n.proxAcao.titulo)}<br><small>${crmRotuloData(n.proxAcao.data,hoje)}</small></span><button class="icon-btn" title="Marcar como feita" onclick="event.stopPropagation();crmProxAcaoFeita(${n.id})"><i data-lucide="check" class="ic"></i></button></div>`;
    } else pa=`<div class="crm-prox crm-atraso"><i data-lucide="alert-triangle" class="ic ic-sm"></i> <span>Sem próxima ação</span></div>`;
  }
  const p=crmProb(n);
  const itens=(n.itens||[]).length;
  return `<div class="crm-card" onclick="crmEditarNegocio(${n.id})">
    <div class="crm-card-titulo">${escapeHtml(n.titulo)}</div>
    ${ref?`<div class="crm-card-sub">${escapeHtml(ref)}</div>`:''}
    <div class="crm-card-valor">${fmt(n.valor)}${(!fechado&&p>0&&p<100&&n.valor)?` <small>· pond. ${fmt(crmPonderado(n))}</small>`:''}</div>
    ${itens?`<div class="crm-card-sub">${itens} item(ns) do catálogo</div>`:''}
    ${n.previsao?`<div class="crm-card-sub${atrasado?' crm-atraso':''}">${atrasado?'Atrasado · ':'Previsão '}${fmtDate(n.previsao)}</div>`:''}
    ${n.etapa==='perdido'&&n.motivoPerda?`<div class="crm-card-sub">Motivo: ${escapeHtml(n.motivoPerda)}</div>`:''}
    ${pa}
    <div class="crm-card-acoes">${ant}${venda}${prox}</div>
  </div>`;
}

// ── Negócio: itens do catálogo (temporários enquanto o modal está aberto) ──
let crmNegItens=[];
function crmNegCatalogo(){ return (typeof vcEntradasCatalogo==='function')?vcEntradasCatalogo():[]; }
function crmNegPreencheCatalogo(){
  const sel=document.getElementById('crm-neg-prod');
  const es=crmNegCatalogo();
  sel.innerHTML='<option value="">+ Adicionar produto do catálogo…</option>'+es.map(e=>`<option value="${e.produtoId}:${e.varianteId||''}">${escapeHtml(e.nome)} — ${fmt(e.preco)}</option>`).join('');
}
function crmNegSomaItens(){ return crmNegItens.reduce((s,i)=>s+i.qtd*i.preco,0); }
function crmNegItensRender(){
  const el=document.getElementById('crm-neg-itens-lista');
  el.innerHTML=crmNegItens.map((it,i)=>`<div class="crm-iten"><div class="crm-iten-nome">${escapeHtml(it.nome)}</div>
    <input class="form-control" type="number" min="1" step="1" value="${it.qtd}" onchange="crmNegItemQtd(${i},this.value)" aria-label="Quantidade">
    <input class="form-control" type="number" min="0" step="0.01" value="${it.preco}" onchange="crmNegItemPreco(${i},this.value)" aria-label="Preço unitário">
    <button type="button" class="icon-btn del" title="Remover" onclick="crmNegItemRem(${i})"><i data-lucide="trash-2" class="ic"></i></button></div>`).join('');
  const v=document.getElementById('crm-neg-valor'), hint=document.getElementById('crm-neg-valor-hint');
  if(crmNegItens.length){ v.value=crmNegSomaItens().toFixed(2).replace('.',','); v.disabled=true; hint.style.display='block'; }
  else { v.disabled=false; hint.style.display='none'; }
  if(typeof lucide!=='undefined') lucide.createIcons();
}
function crmNegAddItem(){
  const sel=document.getElementById('crm-neg-prod'); const val=sel.value; if(!val) return;
  const [pid,vid]=val.split(':'); const produtoId=parseInt(pid), varianteId=vid?parseInt(vid):null;
  const ja=crmNegItens.find(i=>i.produtoId===produtoId&&(i.varianteId||null)===varianteId);
  if(ja) ja.qtd++;
  else { const e=crmNegCatalogo().find(e=>e.produtoId===produtoId&&(e.varianteId||null)===varianteId); if(!e) return;
    crmNegItens.push({produtoId,varianteId,nome:e.nome,qtd:1,preco:e.preco||0}); }
  sel.value=''; crmNegItensRender();
}
function crmNegItemQtd(i,v){ crmNegItens[i].qtd=Math.max(1,Math.floor(Number(v))||1); crmNegItensRender(); }
function crmNegItemPreco(i,v){ crmNegItens[i].preco=Math.max(0,Number(v)||0); crmNegItensRender(); }
function crmNegItemRem(i){ crmNegItens.splice(i,1); crmNegItensRender(); }

// ── Negócio: abrir/editar/salvar ──
function crmNegPreencheFunis(selId){
  document.getElementById('crm-neg-funil').innerHTML=state.crmFunis.map(f=>`<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join('');
  document.getElementById('crm-neg-funil').value=selId;
}
function crmNegPreencheEtapas(funilId,etapaSel){
  const es=crmEtapasFunil(funilId);
  const el=document.getElementById('crm-neg-etapa');
  el.innerHTML=es.map(e=>`<option value="${e.id}">${escapeHtml(e.nome)}${crmFechada(e.id)?'':' ('+e.prob+'%)'}</option>`).join('');
  el.value=es.some(e=>e.id===etapaSel)?etapaSel:es[0].id;
}
function crmNegTrocaFunil(){
  crmNegPreencheEtapas(parseInt(document.getElementById('crm-neg-funil').value),'');
  crmToggleMotivo();
}
function crmNovoNegocio(opts){
  crmGaranteEstado(); crmModais();
  opts=opts||{};
  const fid=opts.funilId||crmFunilAtualId();
  document.getElementById('crm-neg-id').value='';
  document.getElementById('crm-neg-title').textContent='Novo Negócio';
  document.getElementById('crm-neg-titulo').value='';
  crmRefSelect('crm-neg-ref',opts.clienteId||null,opts.leadId||null,false);
  crmNegPreencheFunis(fid); crmNegPreencheEtapas(fid,'');
  crmNegItens=[]; crmNegPreencheCatalogo(); crmNegItensRender();
  document.getElementById('crm-neg-valor').value='';
  document.getElementById('crm-neg-prev').value='';
  document.getElementById('crm-neg-pa-tipo').value='tarefa';
  document.getElementById('crm-neg-pa-titulo').value='';
  document.getElementById('crm-neg-pa-data').value=today();
  document.getElementById('crm-neg-motivo').value='';
  document.getElementById('crm-neg-obs').value='';
  document.getElementById('crm-neg-del').style.display='none';
  crmToggleMotivo();
  document.getElementById('modal-crm-negocio').classList.add('open');
}
function crmEditarNegocio(id){
  const n=state.crmNegocios.find(n=>n.id===id); if(!n) return;
  crmGaranteEstado(); crmModais();
  document.getElementById('crm-neg-id').value=id;
  document.getElementById('crm-neg-title').textContent='Editar Negócio';
  document.getElementById('crm-neg-titulo').value=n.titulo;
  crmRefSelect('crm-neg-ref',n.clienteId,n.leadId,false);
  crmNegPreencheFunis(n.funilId); crmNegPreencheEtapas(n.funilId,n.etapa);
  crmNegItens=(n.itens||[]).map(i=>({...i})); crmNegPreencheCatalogo(); crmNegItensRender();
  if(!crmNegItens.length) document.getElementById('crm-neg-valor').value=n.valor?String(n.valor).replace('.',','):'';
  document.getElementById('crm-neg-prev').value=n.previsao||'';
  const pa=n.proxAcao||{};
  document.getElementById('crm-neg-pa-tipo').value=pa.tipo||'tarefa';
  document.getElementById('crm-neg-pa-titulo').value=pa.titulo||'';
  document.getElementById('crm-neg-pa-data').value=pa.data||today();
  document.getElementById('crm-neg-motivo').value=n.motivoPerda||'';
  document.getElementById('crm-neg-obs').value=n.obs||'';
  document.getElementById('crm-neg-del').style.display='inline-flex';
  crmToggleMotivo();
  document.getElementById('modal-crm-negocio').classList.add('open');
}
function crmToggleMotivo(){
  const et=document.getElementById('crm-neg-etapa').value;
  document.getElementById('crm-neg-motivo-wrap').style.display=et==='perdido'?'block':'none';
  document.getElementById('crm-neg-pa-wrap').style.display=crmFechada(et)?'none':'block';
}
function crmSalvarNegocio(){
  const eid=document.getElementById('crm-neg-id').value;
  const titulo=document.getElementById('crm-neg-titulo').value.trim();
  const ref=crmLerRef('crm-neg-ref');
  if(!titulo){ showToast('Informe o título do negócio','red'); return; }
  if(!ref.clienteId&&!ref.leadId){ showToast('Escolha o cliente ou lead','red'); return; }
  const etapa=document.getElementById('crm-neg-etapa').value;
  const funilId=parseInt(document.getElementById('crm-neg-funil').value);
  let proxAcao=null;
  if(!crmFechada(etapa)){
    const pt=document.getElementById('crm-neg-pa-titulo').value.trim(), pd=document.getElementById('crm-neg-pa-data').value;
    if(!pt||!pd){ showToast('Defina a próxima ação e a data — negócio aberto precisa de uma','red'); return; }
    proxAcao={tipo:document.getElementById('crm-neg-pa-tipo').value,titulo:pt,data:pd};
  }
  const itens=crmNegItens.map(i=>({...i}));
  const valor=itens.length?Math.round(crmNegSomaItens()*100)/100:crmNum(document.getElementById('crm-neg-valor').value);
  const dados={titulo,funilId,clienteId:ref.clienteId,leadId:ref.leadId,valor,itens,proxAcao,
    previsao:document.getElementById('crm-neg-prev').value||'',obs:document.getElementById('crm-neg-obs').value.trim(),
    motivoPerda:etapa==='perdido'?document.getElementById('crm-neg-motivo').value.trim():''};
  let n;
  if(eid){
    n=state.crmNegocios.find(n=>n.id==eid);
    const refMudou=String(n.clienteId||'')!==String(ref.clienteId||'')||String(n.leadId||'')!==String(ref.leadId||'');
    Object.assign(n,dados);
    if(!n.origem||refMudou) n.origem=crmOrigemDe(n.clienteId,n.leadId);
  }
  else { n={id:nextId('crmNegocios'),criadoEm:today(),etapa:crmEtapasFunil(funilId)[0].id,origem:crmOrigemDe(ref.clienteId,ref.leadId),historico:[{etapa,data:today()}],...dados}; state.crmNegocios.push(n); }
  state.crm_funil_id=funilId;
  marcarAlterado();
  closeModal('modal-crm-negocio');
  if(etapa!==n.etapa||!eid) crmAplicarEtapa(n,etapa,true); else crmAtualizaTelas();
  showToast(eid?'Negócio atualizado':'Negócio criado','green');
}
function crmMover(id,etapa){
  const n=state.crmNegocios.find(n=>n.id===id); if(!n) return;
  if(etapa==='perdido'){ crmEditarNegocio(id); document.getElementById('crm-neg-etapa').value='perdido'; crmToggleMotivo(); return; }
  crmAplicarEtapa(n,etapa);
}
function crmAplicarEtapa(n,etapa,vindoDoModal){
  crmRegistraEtapa(n,etapa);
  n.etapa=etapa;
  if(crmFechada(etapa)){ n.fechadoEm=n.fechadoEm||today(); n.proxAcao=null; } else n.fechadoEm='';
  if(etapa!=='perdido') n.motivoPerda='';
  marcarAlterado();
  crmAtualizaTelas();
  if(etapa==='ganho'){
    if(!n.clienteId&&n.leadId) crmConverterLeadSilencioso(n.leadId);
    const nIt=(n.itens||[]).length;
    confirmarAcao('Negócio ganho! Abrir uma nova venda já preenchida com o cliente e '+(nIt?nIt+' item(ns) do catálogo':'o valor de '+fmt(n.valor))+'?',()=>crmGerarVenda(n.id));
  } else if(!crmFechada(etapa)&&!crmTemProxAcao(n)&&!vindoDoModal){
    showToast('Defina a próxima ação deste negócio','red');
    crmEditarNegocio(n.id);
  }
}
// Marca a próxima ação como feita: vira atividade concluída (aparece na ficha 360º) e pede a próxima.
function crmProxAcaoFeita(id){
  const n=state.crmNegocios.find(n=>n.id===id); if(!n||!n.proxAcao) return;
  const pa=n.proxAcao;
  state.crmAtividades.push({id:nextId('crmAtividades'),tipo:pa.tipo||'tarefa',titulo:pa.titulo,data:pa.data,hora:'',concluida:true,concluidaEm:today(),criadoEm:today(),
    clienteId:n.clienteId||null,leadId:n.leadId||null,negocioId:n.id});
  n.proxAcao=null; marcarAlterado();
  showToast('Feito! Agora defina a próxima ação','green');
  crmEditarNegocio(n.id);
}
function crmExcluirNegocio(){
  const id=parseInt(document.getElementById('crm-neg-id').value);
  confirmarAcao('Excluir este negócio?',()=>{
    state.crmNegocios=state.crmNegocios.filter(n=>n.id!==id);
    state.crmAtividades.forEach(a=>{ if(a.negocioId===id) a.negocioId=null; });
    marcarAlterado(); closeModal('modal-crm-negocio'); crmAtualizaTelas(); showToast('Negócio excluído','green');
  });
}
function crmGerarVenda(id){
  const n=state.crmNegocios.find(n=>n.id===id); if(!n) return;
  if(!n.clienteId&&n.leadId) crmConverterLeadSilencioso(n.leadId);
  if(!n.clienteId){ showToast('Negócio sem cliente — edite e escolha um cliente','red'); return; }
  goto('vendas');
  abrirNovaVenda();
  selecionarClienteVenda(n.clienteId);
  const itens=n.itens||[];
  if(itens.length){
    itens.forEach(it=>{
      const p=state.produtos.find(p=>p.id==it.produtoId);
      const okVar=!it.varianteId||(p&&(p.variantes||[]).some(v=>v.id==it.varianteId));
      if(p&&okVar) vendaItensTemp.push(criarLinhaItemVenda({produtoId:it.produtoId,varianteId:it.varianteId||null,qtd:it.qtd,preco:it.preco}));
      else vendaItensTemp.push(criarLinhaItemVenda({produtoId:null,varianteId:null,avulso:true,nome:String(it.nome||'Item').slice(0,40),qtd:it.qtd,preco:it.preco,custo:0}));
    });
  } else {
    vendaItensTemp.push(criarLinhaItemVenda({produtoId:null,varianteId:null,avulso:true,nome:String(n.titulo).slice(0,40),qtd:1,preco:n.valor||0,custo:0}));
  }
  document.getElementById('venda-obs').value='CRM: '+n.titulo;
  renderVendaItensLista();
  calcTotalVendaGeral();
  n.vendaGerada=true; marcarAlterado();
  showToast('Venda preenchida — confira e confirme','green');
}

// ── Gerenciar funis e etapas ──
function crmAbrirFunis(){ crmGaranteEstado(); crmModais(); crmFunisCorpo(); document.getElementById('modal-crm-funis').classList.add('open'); }
function crmFechaFunis(){ document.getElementById('modal-crm-funis').classList.remove('open'); crmAtualizaTelas(); }
function crmFunisCorpo(){
  const el=document.getElementById('crm-funis-corpo');
  el.innerHTML=state.crmFunis.map(f=>{
    const nNeg=state.crmNegocios.filter(n=>n.funilId==f.id).length;
    const etapas=f.etapas.map((e,i)=>`<div class="crm-etapa-row">
        <input class="form-control" value="${escapeHtml(e.nome)}" maxlength="24" onchange="crmEtapaNome(${f.id},'${e.id}',this.value)" aria-label="Nome da etapa">
        <input class="form-control crm-etapa-prob" type="number" min="1" max="99" value="${e.prob}" onchange="crmEtapaProb(${f.id},'${e.id}',this.value)" aria-label="Probabilidade em %"><span class="crm-pct">%</span>
        <button type="button" class="icon-btn" ${i===0?'disabled':''} onclick="crmEtapaMover(${f.id},'${e.id}',-1)" title="Subir">↑</button>
        <button type="button" class="icon-btn" ${i===f.etapas.length-1?'disabled':''} onclick="crmEtapaMover(${f.id},'${e.id}',1)" title="Descer">↓</button>
        <button type="button" class="icon-btn del" onclick="crmEtapaDel(${f.id},'${e.id}')" title="Excluir etapa"><i data-lucide="trash-2" class="ic"></i></button></div>`).join('');
    return `<div class="crm-funil-card">
      <div class="crm-funil-head"><input class="form-control" value="${escapeHtml(f.nome)}" maxlength="30" onchange="crmFunilNome(${f.id},this.value)" aria-label="Nome do funil">
        <button type="button" class="icon-btn del" title="Excluir funil" onclick="crmFunilDel(${f.id})"><i data-lucide="trash-2" class="ic"></i></button></div>
      <div class="crm-card-sub" style="margin-bottom:8px">${nNeg} negócio(s) · “Ganho” (100%) e “Perdido” (0%) são fixos</div>
      ${etapas}
      <button type="button" class="btn btn-outline btn-sm" onclick="crmEtapaAdd(${f.id})">+ Etapa</button></div>`;
  }).join('');
  if(typeof lucide!=='undefined') lucide.createIcons();
}
function crmFunilNome(id,v){ const f=crmFunil(id); v=String(v).trim(); if(!f||!v){ crmFunisCorpo(); return; } f.nome=v.slice(0,30); marcarAlterado(); }
function crmFunilAdd(){
  const id=nextId('crmFunis');
  state.crmFunis.push({id,nome:'Funil '+id,etapas:crmFunisPadrao()[0].etapas.map(e=>({...e}))});
  marcarAlterado(); crmFunisCorpo();
}
function crmFunilDel(id){
  if(state.crmFunis.length<=1){ showToast('Mantenha pelo menos um funil','red'); return; }
  if(state.crmNegocios.some(n=>n.funilId==id)){ showToast('Este funil ainda tem negócios — mova ou exclua antes','red'); return; }
  confirmarAcao('Excluir este funil?',()=>{
    state.crmFunis=state.crmFunis.filter(f=>f.id!==id);
    if(state.crm_funil_id==id) state.crm_funil_id=state.crmFunis[0].id;
    marcarAlterado(); crmFunisCorpo();
  });
}
function crmEtapaNome(fid,eid,v){ const e=crmFunil(fid).etapas.find(e=>e.id===eid); v=String(v).trim(); if(!e||!v){ crmFunisCorpo(); return; } e.nome=v.slice(0,24); marcarAlterado(); }
function crmEtapaProb(fid,eid,v){ const e=crmFunil(fid).etapas.find(e=>e.id===eid); if(!e) return; e.prob=Math.min(99,Math.max(1,Math.round(Number(v))||e.prob)); marcarAlterado(); crmFunisCorpo(); }
function crmEtapaAdd(fid){
  const f=crmFunil(fid); if(!f) return;
  if(f.etapas.length>=8){ showToast('Máximo de 8 etapas por funil','red'); return; }
  f.etapas.push({id:'e'+nextId('crmEtapas'),nome:'Nova etapa',cor:CRM_CORES_ETAPA[f.etapas.length%CRM_CORES_ETAPA.length],prob:50});
  marcarAlterado(); crmFunisCorpo();
}
function crmEtapaDel(fid,eid){
  const f=crmFunil(fid); if(!f) return;
  if(f.etapas.length<=1){ showToast('O funil precisa de pelo menos uma etapa','red'); return; }
  if(state.crmNegocios.some(n=>n.funilId==fid&&n.etapa===eid)){ showToast('Há negócios nesta etapa — mova antes de excluir','red'); return; }
  f.etapas=f.etapas.filter(e=>e.id!==eid); marcarAlterado(); crmFunisCorpo();
}
function crmEtapaMover(fid,eid,dir){
  const f=crmFunil(fid); if(!f) return;
  const i=f.etapas.findIndex(e=>e.id===eid), j=i+dir;
  if(i<0||j<0||j>=f.etapas.length) return;
  [f.etapas[i],f.etapas[j]]=[f.etapas[j],f.etapas[i]]; marcarAlterado(); crmFunisCorpo();
}

// ── Meu dia: follow-ups do CRM (usado por 11b-meu-dia.js) ──
function crmMeuDiaToggle(id){ crmToggleAtiv(id); crmAtualizaTelas(); }
function crmMeuDiaHtml(){
  crmGaranteEstado();
  const hoje=today();
  const ativ=state.crmAtividades.filter(a=>!a.concluida&&a.data&&a.data<=hoje).sort((a,b)=>(a.data+(a.hora||'')).localeCompare(b.data+(b.hora||'')));
  const abertos=state.crmNegocios.filter(n=>!crmFechada(n.etapa));
  const acoes=abertos.filter(n=>crmTemProxAcao(n)&&n.proxAcao.data<=hoje).sort((a,b)=>a.proxAcao.data.localeCompare(b.proxAcao.data));
  const semAcao=abertos.filter(n=>!crmTemProxAcao(n));
  const qtd=ativ.length+acoes.length+semAcao.length;
  if(!qtd) return {qtd:0,html:''};
  const zap=(o)=>{ const t=crmTelRef(o); return t?`<button class="btn btn-whatsapp btn-sm" title="WhatsApp" onclick="crmWhats('${escapeHtml(t)}')"><i data-lucide="message-circle" class="ic"></i></button>`:''; };
  const rowsAcao=acoes.map(n=>{
    const pa=n.proxAcao, ref=crmNomeRef(n), venc=pa.data<hoje;
    return `<div class="crm-item"><button class="crm-check" onclick="crmProxAcaoFeita(${n.id})" title="Marcar como feita"></button>
      <div class="crm-item-main"><strong>${escapeHtml(pa.titulo)}</strong> <span class="badge badge-gray">${CRM_TIPOS_ATIV[pa.tipo]||'Tarefa'}</span>
        <div class="crm-card-sub${venc?' crm-atraso':''}">${crmRotuloData(pa.data,hoje)} · Negócio: ${escapeHtml(n.titulo)}${ref?' · '+escapeHtml(ref):''}</div></div>
      <div class="actions-cell">${zap(n)}<button class="btn btn-outline btn-sm" onclick="crmEditarNegocio(${n.id})">Abrir</button></div></div>`;
  }).join('');
  const rowsAtiv=ativ.map(a=>{
    const ref=crmNomeRef(a), venc=a.data<hoje;
    return `<div class="crm-item"><button class="crm-check" onclick="crmMeuDiaToggle(${a.id})" title="Concluir"></button>
      <div class="crm-item-main"><strong>${escapeHtml(a.titulo)}</strong> <span class="badge badge-gray">${CRM_TIPOS_ATIV[a.tipo]||a.tipo}</span>
        <div class="crm-card-sub${venc?' crm-atraso':''}">${crmRotuloData(a.data,hoje)}${a.hora?' '+escapeHtml(a.hora):''}${ref?' · '+escapeHtml(ref):''}</div></div>
      <div class="actions-cell">${zap(a)}<button class="icon-btn edit" title="Editar" onclick="crmEditarAtividade(${a.id})"><i data-lucide="pencil" class="ic"></i></button></div></div>`;
  }).join('');
  const rowsSem=semAcao.map(n=>`<div class="crm-item"><i data-lucide="alert-triangle" class="ic crm-atraso"></i>
      <div class="crm-item-main"><strong>${escapeHtml(n.titulo)}</strong><div class="crm-card-sub crm-atraso">Negócio aberto sem próxima ação</div></div>
      <div class="actions-cell"><button class="btn btn-outline btn-sm" onclick="crmEditarNegocio(${n.id})">Definir</button></div></div>`).join('');
  return {qtd,html:`<div class="crm-meudia"><h3 class="crm-sec-titulo"><i data-lucide="handshake" class="ic ic-sm"></i> CRM · follow-ups <span>(${qtd})</span></h3><div class="crm-lista">${rowsAcao}${rowsAtiv}${rowsSem}</div></div>`};
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
  state.crmNegocios.forEach(n=>{ if(n.leadId===leadId){ if(!n.origem) n.origem=l.origem||''; n.clienteId=l.clienteId; n.leadId=null; } });
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
  marcarAlterado(); closeModal('modal-crm-ativ'); crmAtualizaTelas(); showToast(eid?'Atividade atualizada':'Atividade criada','green');
}
function crmToggleAtiv(id){
  const a=state.crmAtividades.find(a=>a.id===id); if(!a) return;
  a.concluida=!a.concluida; a.concluidaEm=a.concluida?today():'';
  marcarAlterado(); crmAtualizaTelas();
}
function crmExcluirAtividade(){
  const id=parseInt(document.getElementById('crm-ativ-id').value);
  confirmarAcao('Excluir esta atividade?',()=>{
    state.crmAtividades=state.crmAtividades.filter(a=>a.id!==id);
    marcarAlterado(); closeModal('modal-crm-ativ'); crmAtualizaTelas(); showToast('Atividade excluída','green');
  });
}

// ── PAINEL ──
function crmHtmlPainel(){
  const fid=crmFunilAtualId(), mes=today().slice(0,7);
  const etapas=crmEtapasFunil(fid);
  const ne=state.crmNegocios.filter(n=>n.funilId==fid);
  const aberto=ne.filter(n=>!crmFechada(n.etapa));
  const ganhos=ne.filter(n=>n.etapa==='ganho'), perdidos=ne.filter(n=>n.etapa==='perdido');
  const ganhosMes=ganhos.filter(n=>(n.fechadoEm||'').slice(0,7)===mes);
  const taxa=(ganhos.length+perdidos.length)>0?Math.round(ganhos.length/(ganhos.length+perdidos.length)*100):null;
  const leadsAtivos=state.crmLeads.filter(l=>l.status==='novo'||l.status==='contato'||l.status==='qualificado').length;
  const conv=state.crmLeads.filter(l=>l.status==='convertido').length;
  const atrasadas=state.crmAtividades.filter(a=>!a.concluida&&a.data&&a.data<today()).length;
  const ticket=ganhos.length?ganhos.reduce((s,n)=>s+(n.valor||0),0)/ganhos.length:0;
  const pond=aberto.reduce((s,n)=>s+crmPonderado(n),0);
  const semAcao=aberto.filter(n=>!crmTemProxAcao(n)).length;
  const card=(l,v,s,c)=>`<div class="stat-card ${c||''}"><div class="label">${l}</div><div class="value">${v}</div><div class="sub">${s||''}</div></div>`;
  const inter=etapas.filter(e=>!crmFechada(e.id));
  const maxEt=Math.max(1,...inter.map(e=>ne.filter(n=>n.etapa===e.id).reduce((s,n)=>s+(n.valor||0),0)));
  const barras=inter.map(e=>{
    const v=ne.filter(n=>n.etapa===e.id).reduce((s,n)=>s+(n.valor||0),0), q=ne.filter(n=>n.etapa===e.id).length;
    return `<div class="crm-barra"><span>${escapeHtml(e.nome)} (${q}) · ${e.prob}%</span><div><i style="width:${Math.round(v/maxEt*100)}%;background:${e.cor}"></i></div><strong>${fmt(v)}</strong></div>`;
  }).join('');
  const motivos={}; perdidos.forEach(n=>{ const m=(n.motivoPerda||'Sem motivo').trim()||'Sem motivo'; motivos[m]=(motivos[m]||0)+1; });
  const topMot=Object.entries(motivos).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([m,q])=>`<span class="badge badge-gray">${escapeHtml(m)} · ${q}</span>`).join(' ');
  return crmFunilSeletor()+`<div class="cards-grid cards-grid-4" style="margin-bottom:14px">
    ${card('No funil',fmt(aberto.reduce((s,n)=>s+(n.valor||0),0)),aberto.length+' negócio(s) em aberto')}
    ${card('Valor ponderado',fmt(pond),'valor × probabilidade da etapa')}
    ${card('Ganho no mês',fmt(ganhosMes.reduce((s,n)=>s+(n.valor||0),0)),ganhosMes.length+' negócio(s)','green')}
    ${card('Taxa de conversão',taxa===null?'—':taxa+'%',ganhos.length+' ganho(s) · '+perdidos.length+' perdido(s)')}
    ${card('Ticket médio ganho',ganhos.length?fmt(ticket):'—','')}
    ${card('Leads ativos',leadsAtivos,conv+' convertido(s) em cliente')}
    ${card('Atividades atrasadas',atrasadas,atrasadas?'precisam de atenção':'tudo em dia',atrasadas?'red':'')}
    ${card('Sem próxima ação',semAcao,semAcao?'defina uma data de retorno':'todos com próxima ação',semAcao?'red':'')}
  </div>
  <div class="table-card" style="padding:14px"><div class="label" style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);margin-bottom:10px">Valor por etapa do funil</div>${barras}
  ${topMot?`<div style="margin-top:14px;font-size:12px;color:var(--muted)">Motivos de perda: ${topMot}</div>`:''}</div>`;
}
