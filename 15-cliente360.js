// ============ CLIENTE 360º, NOTAS, TAGS E MODELOS DE MENSAGEM (v5.46) ============
// Dados:
//   state.clientes[i].tags   ['VIP','Atacado',...]            (no próprio cliente)
//   state.crmNotas           [{id,clienteId,texto,data,criadoEm}]
//   state.crmModelos         [{id,nome,seg,texto}]  seg: '' | inativo | recompra | vip | posvenda | cobranca
// Variáveis nos modelos: {nome} {nome_completo} {ultima_compra} {proxima_compra} {saldo}

let c360Id=null;
let c360Limite=40;
let c360Modelo=null; // id do modelo em edição

const C360_SEGS={'':'Geral',inativo:'Cliente inativo',recompra:'Recompra próxima',vip:'VIP',posvenda:'Pós-venda',cobranca:'Cobrança'};

function c360Garante(){
  crmGaranteEstado();
  if(!Array.isArray(state.crmNotas)) state.crmNotas=[];
  if(!Array.isArray(state.crmModelos)) state.crmModelos=crmModelosSemente();
  ['crmNotas','crmModelos'].forEach(k=>{ if(!(state.nextId[k]>0)) state.nextId[k]=state[k].reduce((m,x)=>Math.max(m,x.id||0),0)+1; });
}
function c360Refrescar(){
  const m=document.getElementById('modal-c360');
  if(m&&m.classList.contains('open')) c360Render();
  const pg=document.getElementById('page-crm');
  if(pg&&pg.classList.contains('active')) renderCRM();
}

// ── Modais (criados no primeiro uso) ──
function c360Modais(){
  if(document.getElementById('modal-c360')) return;
  const segs=Object.keys(C360_SEGS).map(k=>`<option value="${k}">${C360_SEGS[k]}</option>`).join('');
  const w=document.createElement('div');
  w.innerHTML=`
<div class="modal-overlay" id="modal-c360"><div class="modal">
  <div class="modal-header"><h3 id="c360-titulo">Cliente</h3><button class="modal-close" onclick="closeModal('modal-c360')"><i data-lucide="x" class="ic"></i></button></div>
  <div class="modal-body" id="c360-corpo"></div>
</div></div>
<div class="modal-overlay" id="modal-crm-envio"><div class="modal">
  <div class="modal-header"><h3>Enviar WhatsApp</h3><button class="modal-close" onclick="closeModal('modal-crm-envio')"><i data-lucide="x" class="ic"></i></button></div>
  <div class="modal-body">
    <input type="hidden" id="envio-cliente">
    <div class="form-group"><label>Modelo</label><select class="form-control" id="envio-modelo" onchange="crmEnvioAplicarModelo()"></select></div>
    <div class="form-group"><label>Mensagem (pode editar antes de enviar)</label><textarea class="form-control" id="envio-texto" rows="6"></textarea></div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-crm-envio')">Cancelar</button>
      <button class="btn btn-whatsapp" onclick="crmEnvioConfirmar()">Abrir WhatsApp</button>
    </div>
  </div>
</div></div>
<div class="modal-overlay" id="modal-crm-modelo"><div class="modal">
  <div class="modal-header"><h3 id="modelo-titulo">Novo modelo</h3><button class="modal-close" onclick="closeModal('modal-crm-modelo')"><i data-lucide="x" class="ic"></i></button></div>
  <div class="modal-body">
    <div class="form-group"><label>Nome do modelo</label><input class="form-control" id="modelo-nome" placeholder="Ex: Reativação gentil"></div>
    <div class="form-group"><label>Usar quando</label><select class="form-control" id="modelo-seg">${segs}</select></div>
    <div class="form-group"><label>Texto</label><textarea class="form-control" id="modelo-texto" rows="6"></textarea>
      <div style="font-size:11.5px;color:var(--muted);margin-top:4px">Variáveis: {nome} {nome_completo} {ultima_compra} {proxima_compra} {saldo}</div></div>
    <div class="modal-footer">
      <button class="btn btn-outline" id="modelo-del" style="margin-right:auto;display:none" onclick="crmExcluirModelo()">Excluir</button>
      <button class="btn btn-outline" onclick="closeModal('modal-crm-modelo')">Cancelar</button>
      <button class="btn btn-primary" onclick="crmSalvarModelo()">Salvar</button>
    </div>
  </div>
</div></div>`;
  while(w.firstChild) document.body.appendChild(w.firstChild);
  document.querySelectorAll('#modal-c360,#modal-crm-envio,#modal-crm-modelo').forEach(m=>{
    m.addEventListener('click',e=>{ if(e.target===m) m.classList.remove('open'); });
  });
}

// ── Tags ──
function c360Tags(c){ return Array.isArray(c.tags)?c.tags:[]; }
function c360TodasTags(){
  const s=new Set(); state.clientes.forEach(c=>c360Tags(c).forEach(t=>s.add(t)));
  return [...s].sort((a,b)=>a.localeCompare(b));
}
function c360AddTag(){
  const inp=document.getElementById('c360-tag-input'); if(!inp) return;
  const t=String(inp.value||'').trim().replace(/\s+/g,' ').slice(0,24);
  if(!t) return;
  const c=state.clientes.find(c=>c.id===c360Id); if(!c) return;
  c.tags=c360Tags(c);
  if(!c.tags.some(x=>x.toLowerCase()===t.toLowerCase())) c.tags.push(t);
  marcarAlterado(); c360Refrescar();
}
function c360RemTag(i){
  const c=state.clientes.find(c=>c.id===c360Id); if(!c) return;
  c.tags=c360Tags(c).filter((_,k)=>k!==i);
  marcarAlterado(); c360Refrescar();
}

// ── Notas ──
function c360AddNota(){
  const ta=document.getElementById('c360-nota-texto'); if(!ta) return;
  const texto=ta.value.trim();
  if(!texto){ showToast('Escreva a nota','red'); return; }
  c360Garante();
  state.crmNotas.push({id:nextId('crmNotas'),clienteId:c360Id,texto:texto.slice(0,1000),data:today(),criadoEm:Date.now()});
  marcarAlterado(); showToast('Nota adicionada','green'); c360Refrescar();
}
function c360DelNota(id){
  confirmarAcao('Excluir esta nota?',()=>{
    state.crmNotas=state.crmNotas.filter(n=>n.id!==id);
    marcarAlterado(); c360Refrescar();
  });
}

// ── Ficha 360º ──
function abrirCliente360(id){
  const c=state.clientes.find(c=>c.id===id); if(!c){ showToast('Cliente não encontrado','red'); return; }
  c360Garante(); c360Modais();
  c360Id=id; c360Limite=40;
  c360Render();
  document.getElementById('modal-c360').classList.add('open');
}
function c360Acao(fn){ closeModal('modal-c360'); fn(); }
function c360VerMais(){ c360Limite+=40; c360Render(); }

function c360Linha(c){
  const ev=[];
  state.vendas.filter(v=>v.clienteId===c.id&&v.data).forEach(v=>{
    const nomes=(v.itens||[]).slice(0,3).map(it=>typeof nomeItemVenda==='function'?nomeItemVenda(it):'item').join(', ')+((v.itens||[]).length>3?'…':'');
    if(v.tipo==='orcamento') ev.push({d:v.data,o:v.id,ic:'file-text',t:'Orçamento '+fmt(v.total),s:nomes+(v.statusOrc==='aprovado'?' · aprovado':' · rascunho')});
    else ev.push({d:v.data,o:v.id,ic:'shopping-cart',t:'Venda '+fmt(v.total),s:nomes+' · '+formaLabel(v.forma||'')+(v.status==='pago'?' · pago':' · em aberto')});
  });
  state.pagamentos.filter(p=>p.clienteId===c.id&&p.data).forEach(p=>ev.push({d:p.data,o:p.id,ic:'banknote',t:'Pagamento recebido '+fmt(p.valor),s:p.forma||'',cor:'var(--green)'}));
  state.crmNegocios.filter(n=>n.clienteId===c.id).forEach(n=>{
    ev.push({d:n.criadoEm||'',o:n.id,ic:'handshake',t:'Negócio: '+n.titulo,s:fmt(n.valor)});
    if(n.fechadoEm) ev.push({d:n.fechadoEm,o:n.id+0.5,ic:n.etapa==='ganho'?'trophy':'x-circle',t:(n.etapa==='ganho'?'Negócio ganho: ':'Negócio perdido: ')+n.titulo,s:n.etapa==='perdido'&&n.motivoPerda?'Motivo: '+n.motivoPerda:fmt(n.valor),cor:n.etapa==='ganho'?'var(--green)':'var(--red)'});
  });
  state.crmAtividades.filter(a=>a.clienteId===c.id&&a.data).forEach(a=>ev.push({d:a.data,o:a.id,ic:a.tipo==='whatsapp'?'message-circle':'calendar-check',t:a.titulo+(a.concluida?'':' (pendente)'),s:CRM_TIPOS_ATIV[a.tipo]||''}));
  state.crmNotas.filter(n=>n.clienteId===c.id).forEach(n=>ev.push({d:n.data||'',o:n.id,ic:'sticky-note',t:n.texto,s:'Nota',nota:n.id}));
  return ev.filter(e=>e.d).sort((a,b)=>b.d.localeCompare(a.d)||b.o-a.o);
}

function c360Render(){
  const c=state.clientes.find(c=>c.id===c360Id); if(!c) return;
  const x=relCalcClientes().find(x=>x.c.id===c.id)||{compras:0,fat:0,fat12:0,lucro:0,ultima:'',intervalo:0,diasSem:null,proxima:'',seg:{}};
  const saldo=getSaldoCliente(c.id);
  const ticket=x.compras?x.fat/x.compras:0;
  document.getElementById('c360-titulo').textContent=c.nome;
  const rota=(typeof getRota==='function'&&c.rotaId)?getRota(c.rotaId):null;
  const badges=(x.seg.vip?'<span class="badge badge-yellow">VIP</span> ':'')+(x.seg.frequente?'<span class="badge badge-green">Frequente</span> ':'')+(x.seg.inativo?'<span class="badge badge-red">Inativo</span> ':'')+(x.seg.recompra?'<span class="badge badge-blue">Recompra próxima</span> ':'')+(!estaAtivo(c)?'<span class="badge badge-gray">Arquivado</span> ':'');
  const tags=c360Tags(c);
  const sugestoes=c360TodasTags().filter(t=>!tags.includes(t));
  const kpi=(l,v,cor)=>`<div class="c360-kpi"><span>${l}</span><strong${cor?` style="color:var(--${cor})"`:''}>${v}</strong></div>`;
  const linha=c360Linha(c), mostra=linha.slice(0,c360Limite);
  document.getElementById('c360-corpo').innerHTML=`
    <div class="crm-card-sub" style="margin:0 0 6px">${[c.tel,c.end,rota?rota.nome:''].filter(Boolean).map(escapeHtml).join(' · ')||'Sem contato cadastrado'}</div>
    <div style="margin-bottom:10px">${badges}</div>
    <div class="c360-kpis">
      ${kpi('Saldo devedor',saldo>0?fmt(saldo):'Em dia',saldo>0?'red':'green')}
      ${kpi('Faturamento 12m',fmt(x.fat12))}
      ${kpi('Compras',x.compras)}
      ${kpi('Ticket médio',x.compras?fmt(ticket):'—')}
      ${kpi('Última compra',x.ultima?fmtDate(x.ultima)+' ('+x.diasSem+'d)':'—')}
      ${kpi('Próxima prevista',x.proxima?fmtDate(x.proxima):'—')}
    </div>
    <div class="c360-acoes">
      ${c.tel?`<button class="btn btn-whatsapp btn-sm" onclick="c360Acao(()=>crmAbrirEnvio(${c.id}))">WhatsApp</button>`:''}
      <button class="btn btn-outline btn-sm" onclick="c360Acao(()=>crmNovoNegocio({clienteId:${c.id}}))">+ Negócio</button>
      <button class="btn btn-outline btn-sm" onclick="c360Acao(()=>crmNovaAtividade({clienteId:${c.id}}))">+ Atividade</button>
      <button class="btn btn-outline btn-sm" onclick="c360Acao(()=>abrirExtrato(${c.id}))">Extrato</button>
      <button class="btn btn-outline btn-sm" onclick="c360Acao(()=>editarCliente(${c.id}))">Editar</button>
    </div>
    <div class="c360-secao">Tags</div>
    <div class="c360-tags">${tags.map((t,i)=>`<span class="crm-chip">${escapeHtml(t)}<button onclick="c360RemTag(${i})" title="Remover">×</button></span>`).join('')||'<span class="crm-card-sub">Nenhuma tag</span>'}</div>
    <div style="display:flex;gap:8px;margin-top:8px"><input class="form-control" id="c360-tag-input" list="c360-tags-list" maxlength="24" placeholder="Nova tag (ex: Atacado)" onkeydown="if(event.key==='Enter'){event.preventDefault();c360AddTag()}">
      <button class="btn btn-outline btn-sm" onclick="c360AddTag()">Adicionar</button></div>
    <datalist id="c360-tags-list">${sugestoes.map(t=>`<option value="${escapeHtml(t)}">`).join('')}</datalist>
    <div class="c360-secao">Nova nota</div>
    <textarea class="form-control" id="c360-nota-texto" rows="2" maxlength="1000" placeholder="Ex: prefere entrega pela manhã; pagou com Pix no último pedido"></textarea>
    <div style="margin-top:6px;text-align:right"><button class="btn btn-primary btn-sm" onclick="c360AddNota()">Salvar nota</button></div>
    <div class="c360-secao">Linha do tempo</div>
    ${mostra.length?`<div class="c360-tl">${mostra.map(e=>`<div class="c360-ev"><div class="c360-ic"${e.cor?` style="color:${e.cor}"`:''}><i data-lucide="${e.ic}" class="ic"></i></div>
      <div class="c360-ev-txt"><div>${escapeHtml(e.t)}</div><div class="crm-card-sub">${fmtDate(e.d)}${e.s?' · '+escapeHtml(e.s):''}</div></div>
      ${e.nota?`<button class="icon-btn del" title="Excluir nota" onclick="c360DelNota(${e.nota})"><i data-lucide="trash-2" class="ic"></i></button>`:''}</div>`).join('')}</div>`
      :'<div class="crm-vazio">Sem histórico ainda.</div>'}
    ${linha.length>c360Limite?`<div style="text-align:center;margin-top:8px"><button class="btn btn-outline btn-sm" onclick="c360VerMais()">Ver mais (${linha.length-c360Limite})</button></div>`:''}`;
}

// ── Modelos de mensagem ──
function c360Preencher(texto,x){
  const nome=String(x.c.nome||'');
  const mapa={nome:nome.split(' ')[0],nome_completo:nome,ultima_compra:x.ultima?fmtDate(x.ultima):'',
    proxima_compra:x.proxima?fmtDate(x.proxima):'',saldo:fmt(getSaldoCliente(x.c.id))};
  return String(texto||'').replace(/\{(\w+)\}/g,(m,k)=>Object.prototype.hasOwnProperty.call(mapa,k)?mapa[k]:m);
}
function c360SegPrincipal(x){
  if(x.seg.inativo) return 'inativo';
  if(x.seg.recompra) return 'recompra';
  if(x.seg.vip) return 'vip';
  return 'posvenda';
}
let _envioX=null;
function crmAbrirEnvio(clienteId){
  c360Garante(); c360Modais();
  const x=relCalcClientes().find(x=>x.c.id===clienteId); if(!x) return;
  if(!x.c.tel){ showToast('Cliente sem telefone cadastrado','red'); return; }
  if(!state.crmModelos.length){ showToast('Nenhum modelo cadastrado — crie um em CRM › Modelos','red'); return; }
  _envioX=x;
  document.getElementById('envio-cliente').value=clienteId;
  const seg=c360SegPrincipal(x);
  const padrao=state.crmModelos.find(m=>m.seg===seg)||state.crmModelos.find(m=>!m.seg)||state.crmModelos[0];
  document.getElementById('envio-modelo').innerHTML=state.crmModelos.map(m=>`<option value="${m.id}"${m.id===padrao.id?' selected':''}>${escapeHtml(m.nome)}</option>`).join('');
  crmEnvioAplicarModelo();
  document.getElementById('modal-crm-envio').classList.add('open');
}
function crmEnvioAplicarModelo(){
  const m=state.crmModelos.find(m=>m.id==document.getElementById('envio-modelo').value);
  if(m&&_envioX) document.getElementById('envio-texto').value=c360Preencher(m.texto,_envioX);
}
function crmEnvioConfirmar(){
  const x=_envioX; if(!x) return;
  const texto=document.getElementById('envio-texto').value.trim();
  if(!texto){ showToast('Mensagem vazia','red'); return; }
  const m=state.crmModelos.find(m=>m.id==document.getElementById('envio-modelo').value);
  crmWhats(x.c.tel,texto);
  state.crmAtividades.push({id:nextId('crmAtividades'),tipo:'whatsapp',titulo:'WhatsApp: '+(m?m.nome:'mensagem'),data:today(),hora:'',
    concluida:true,concluidaEm:today(),criadoEm:today(),clienteId:x.c.id,leadId:null,negocioId:null});
  marcarAlterado(); closeModal('modal-crm-envio'); c360Refrescar();
}

function crmHtmlModelos(){
  c360Garante();
  const topo=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
    <button class="btn btn-primary btn-sm" onclick="crmNovoModelo()">+ Modelo</button>
    <button class="btn btn-outline btn-sm" onclick="crmRestaurarModelos()">Restaurar modelos padrão</button></div>`;
  if(!state.crmModelos.length) return topo+'<div class="crm-vazio" style="padding:30px">Nenhum modelo. Crie um ou restaure os padrões.</div>';
  return topo+'<div class="crm-lista">'+state.crmModelos.map(m=>`<div class="crm-item"><div class="crm-item-main"><strong>${escapeHtml(m.nome)}</strong> <span class="badge badge-gray">${C360_SEGS[m.seg||'']||'Geral'}</span>
    <div class="crm-card-sub" style="white-space:pre-line">${escapeHtml(m.texto)}</div></div>
    <div class="actions-cell"><button class="icon-btn edit" title="Editar" onclick="crmEditarModelo(${m.id})"><i data-lucide="pencil" class="ic"></i></button></div></div>`).join('')+'</div>';
}
function crmNovoModelo(){
  c360Garante(); c360Modais(); c360Modelo=null;
  document.getElementById('modelo-titulo').textContent='Novo modelo';
  document.getElementById('modelo-nome').value=''; document.getElementById('modelo-seg').value=''; document.getElementById('modelo-texto').value='Olá, {nome}! ';
  document.getElementById('modelo-del').style.display='none';
  document.getElementById('modal-crm-modelo').classList.add('open');
}
function crmEditarModelo(id){
  const m=state.crmModelos.find(m=>m.id===id); if(!m) return;
  c360Modais(); c360Modelo=id;
  document.getElementById('modelo-titulo').textContent='Editar modelo';
  document.getElementById('modelo-nome').value=m.nome; document.getElementById('modelo-seg').value=m.seg||''; document.getElementById('modelo-texto').value=m.texto;
  document.getElementById('modelo-del').style.display='inline-flex';
  document.getElementById('modal-crm-modelo').classList.add('open');
}
function crmSalvarModelo(){
  const nome=document.getElementById('modelo-nome').value.trim().slice(0,40);
  const texto=document.getElementById('modelo-texto').value.trim().slice(0,800);
  if(!nome||!texto){ showToast('Informe nome e texto do modelo','red'); return; }
  const seg=document.getElementById('modelo-seg').value;
  if(c360Modelo){ Object.assign(state.crmModelos.find(m=>m.id===c360Modelo),{nome,texto,seg}); }
  else state.crmModelos.push({id:nextId('crmModelos'),nome,seg,texto});
  marcarAlterado(); closeModal('modal-crm-modelo'); renderCRM(); showToast('Modelo salvo','green');
}
function crmExcluirModelo(){
  const id=c360Modelo;
  confirmarAcao('Excluir este modelo?',()=>{
    state.crmModelos=state.crmModelos.filter(m=>m.id!==id);
    marcarAlterado(); closeModal('modal-crm-modelo'); renderCRM(); showToast('Modelo excluído','green');
  });
}
function crmRestaurarModelos(){
  confirmarAcao('Adicionar de volta os modelos padrão que estiverem faltando? Seus modelos atuais não são alterados.',()=>{
    let n=0;
    crmModelosPadrao().forEach(p=>{
      if(!state.crmModelos.some(m=>m.nome===p.nome)){ state.crmModelos.push({...p,id:nextId('crmModelos')}); n++; }
    });
    marcarAlterado(); renderCRM(); showToast(n?n+' modelo(s) restaurado(s)':'Todos os padrões já existem','green');
  });
}
