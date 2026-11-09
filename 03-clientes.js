// ============ CLIENTES ============
function fmtClienteNum(id){return '#'+String(id).padStart(3,'0')}
// Texto da lista de clientes ATIVOS (#código — nome). Usado também pelo "Copiar códigos p/ IA".
function listaClientesTexto(){
  return state.clientes.filter(c=>estaAtivo(c)).map(c=>`${fmtClienteNum(c.id)} — ${c.nome}`).join('\n');
}
function copiarListaClientes(){
  const ativos=state.clientes.filter(c=>estaAtivo(c));
  if(!ativos.length){showToast('Nenhum cliente ativo para copiar','red');return;}
  // #código — nome — rota (sem o sufixo quando o cliente não tem rota)
  const txt=ativos.map(c=>{
    const rota=c.rotaId?getRota(c.rotaId):null;
    return `${fmtClienteNum(c.id)} — ${c.nome}`+(rota&&rota.nome?` — ${rota.nome}`:'');
  }).join('\n');
  copiarTexto('CLIENTES\n'+txt,ativos.length+' clientes copiados');
}
// ---- Cartão do cliente (v5.88.1): UMA função para abrir o card isolado em qualquer tela ----
// _clienteFoco = {id, num}: enquanto existir, a tela Clientes mostra só esse card (filtros ignorados).
let _clienteFoco = null;
function clienteFocoLimpar(){ _clienteFoco = null; }
function abrirCartaoCliente(id){
  const c = (state.clientes || []).find(x => x.id == id);
  if(!c){ showToast('Cliente não encontrado','red'); return; }
  const num = typeof cartoesDoCliente === 'function' ? cartoesDoCliente(c.id) : (c.cartaoNum != null ? c.cartaoNum : null);
  try{ if(typeof fecharBuscaGlobal === 'function') fecharBuscaGlobal(); }catch(e){}
  try{ if(document.getElementById('modal-c360')) closeModal('modal-c360'); }catch(e){}
  goto('clientes');            // limpa filtros e foco antigo
  _clienteFoco = { id: c.id, num: num };
  renderClientes();
  window.scrollTo({ top: 0 });
  setTimeout(() => {
    const el = document.getElementById('cliente-card-' + c.id);
    if(el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 80);
}
function clienteFocoSair(){ _clienteFoco = null; renderClientes(); }
function renderClientes(){
  if(typeof dashAtualizarContadorClientes==='function') dashAtualizarContadorClientes();
  let list = state.clientes;
  let focoBarra = '';
  if(_clienteFoco){
    // seleciona pelo número do cartão (não pelo nome); sem cartão, pelo id do cliente
    let cf = null;
    if(_clienteFoco.num != null && typeof cartoesClienteDe === 'function') cf = cartoesClienteDe(_clienteFoco.num);
    if(!cf) cf = state.clientes.find(x => x.id === _clienteFoco.id);
    list = cf ? [cf] : [];
    const rotulo = _clienteFoco.num != null ? 'Cartão nº ' + cartoesNum(_clienteFoco.num) : 'Cliente ' + fmtClienteNum(_clienteFoco.id);
    focoBarra = `<div class="cliente-foco-barra"><span>${rotulo}</span> · <a onclick="clienteFocoSair()">Ver todos os clientes</a></div>`;
  } else {
  if(!state.cliente_mostrar_arquivados) list = list.filter(c => estaAtivo(c));
  if(state.cliente_filter) list = list.filter(c => clienteCombinaBusca(c, state.cliente_filter));
  if(state.cliente_status_filter === 'devendo') list = list.filter(c => getSaldoCliente(c.id) > 0);
  if(state.cliente_status_filter === 'em-dia') list = list.filter(c => getSaldoCliente(c.id) === 0);
  if(state.cliente_status_filter === 'vencidos' || state.cliente_status_filter === 'vence-hoje'){
    // mesma regra dos cards do painel: parcela em aberto vencida (antes de hoje) ou vencendo hoje
    const hojeF = today(), soHoje = state.cliente_status_filter === 'vence-hoje';
    const idsF = new Set(getUnidadesFiadoFlat()
      .filter(u => u.status !== 'pago' && u.vencimento && (soHoje ? u.vencimento === hojeF : u.vencimento < hojeF))
      .map(u => String(u.clienteId)));
    list = list.filter(c => idsF.has(String(c.id)));
  }
  if(state.cliente_rota_filter === 'none') list = list.filter(c => !c.rotaId);
  else if(state.cliente_rota_filter) list = list.filter(c => String(c.rotaId || '') === String(state.cliente_rota_filter));
  }
  
  populateRotaFiltro();
  const chkArq = document.getElementById('clientes-mostrar-arquivados');
  if(chkArq) chkArq.checked = !!state.cliente_mostrar_arquivados;

  const cardsContainer = document.getElementById('clientes-cards-container') || document.getElementById('clientes-table');
  if(!cardsContainer) return;

  if(list.length === 0){
    cardsContainer.innerHTML = focoBarra + '<div style="grid-column:1/-1;text-align:center;color:var(--muted);padding:40px 16px;background:var(--card);border:1px dashed var(--border);border-radius:12px">Nenhum cliente encontrado</div>';
    return;
  }

  // Renderiza em cards modernos, calculando métricas uma única vez por cliente
  cardsContainer.innerHTML = focoBarra + list.map(c => {
    const saldo = getSaldoCliente(c.id);
    const rota = c.rotaId ? getRota(c.rotaId) : null;
    const vendasCliente = (state.vendas || []).filter(v => v.clienteId === c.id);
    const numCompras = vendasCliente.length;
    const ultimaCompra = numCompras > 0 ? [...vendasCliente].sort((a,b) => (b.data||'').localeCompare(a.data||''))[0] : null;
    const totalGasto = numCompras > 0 ? vendasCliente.reduce((s, v) => s + (v.total || 0), 0) : 0;
    const ticketMedio = numCompras > 0 ? (totalGasto / numCompras) : 0;

    let freqTxt = '—';
    if(numCompras >= 2){
      const datas = vendasCliente.filter(v => v.data).map(v => new Date(v.data)).sort((a,b) => a - b);
      if(datas.length >= 2){
        const diffTotal = (datas[datas.length - 1] - datas[0]) / (1000 * 60 * 60 * 24);
        const freq = Math.round(diffTotal / (datas.length - 1));
        freqTxt = `a cada ${freq}d`;
      }
    } else if(numCompras === 1){
      freqTxt = '1 compra';
    }

    const nCartao = typeof cartoesDoCliente === 'function' ? cartoesDoCliente(c.id) : c.cartaoNum;
    const scoreObj = typeof calcularScoreCliente === 'function' ? calcularScoreCliente(c, vendasCliente, saldo) : null;
    const scoreBadge = scoreObj ? creditoScoreBadgeHtml(scoreObj) : '';
    const arquivado = !estaAtivo(c);

    return `
    <div class="cliente-card ${arquivado ? 'arquivado' : ''} ${_clienteFoco ? 'cliente-card-foco' : ''}" id="cliente-card-${c.id}">
      <button type="button" class="cliente-avatar-btn" onclick="abrirCliente360(${c.id})" title="Abrir ficha 360º de ${escapeHtml(c.nome)}" aria-label="Abrir perfil de ${escapeHtml(c.nome)}">
        <span class="cliente-avatar"><i data-lucide="user" class="ic"></i></span>
        <span class="card-metric-label">Perfil</span>
      </button>
      <div class="cliente-card-header">
        <div class="cliente-card-title-group">
          <div class="cliente-card-badges">
            ${nCartao != null 
              ? `<span class="badge-cartao-selo" style="cursor:pointer" title="Abrir este cartão na tela Cartões" onclick="event.stopPropagation();cartoesIrPara(${nCartao})"><i data-lucide="credit-card" class="ic ic-sm"></i> #${cartoesNum(nCartao)}</span>` 
              : `<span class="badge-cartao-sem" title="Sem cartão vinculado">Sem cartão</span>`}
            ${arquivado ? `<span class="badge badge-gray">Arquivado</span>` : ''}
          </div>
          <div class="cliente-card-nome" onclick="abrirCartaoCliente(${c.id})" title="Abrir o cartão de ${escapeHtml(c.nome)}">
            ${escapeHtml(c.nome)}
          </div>
        </div>
        <div class="cliente-card-status-badge">
          ${scoreObj ? `<span class="badge-score badge-score-${scoreObj.ehNovo ? 'amarelo' : scoreObj.classe}" title="${scoreObj.ehNovo ? 'Cliente novo: menos de 3 compras registradas' : 'Score ' + scoreObj.score + '/100 · ' + scoreObj.rotulo}">Score <span class="score-num">${scoreObj.score}</span></span>` : ''}
          ${saldo > 0 
            ? `<span class="badge badge-red badge-pulse">Devendo ${fmt(saldo)}</span>` 
            : `<span class="badge badge-green">Em dia ✓</span>`}
        </div>
      </div>

      <div class="cliente-card-body">
        <div class="cliente-card-col">
          <div class="card-metric-item">
            <span class="card-metric-label">Telefone</span>
            <span class="card-metric-val">
              ${c.tel ? `<a href="tel:${escapeHtml(c.tel)}" style="color:inherit;text-decoration:none">${escapeHtml(c.tel)}</a>` : '<span style="color:var(--muted)">—</span>'}
            </span>
          </div>
          <div class="card-metric-item">
            <span class="card-metric-label">Rota</span>
            <span class="card-metric-val">
              ${rota ? `<i data-lucide="map-pin" class="ic ic-sm" style="color:var(--gold)"></i> ${escapeHtml(rota.nome)}` : '<span style="color:var(--muted)">Sem rota</span>'}
            </span>
          </div>
          <div class="card-metric-item">
            <span class="card-metric-label">Saldo</span>
            <strong class="card-metric-val ${saldo > 0 ? 'saldo-positivo' : 'saldo-zero'}">
              ${saldo > 0 ? fmt(saldo) : 'R$ 0,00'}
            </strong>
          </div>
        </div>

        <div class="cliente-card-col">
          <div class="card-metric-item">
            <span class="card-metric-label">Última compra</span>
            <span class="card-metric-val">${ultimaCompra ? fmtDate(ultimaCompra.data) : '<span style="color:var(--muted)">—</span>'}</span>
          </div>
          <div class="card-metric-item">
            <span class="card-metric-label">Ticket médio</span>
            <span class="card-metric-val">${ticketMedio > 0 ? fmt(ticketMedio) : '<span style="color:var(--muted)">—</span>'}${numCompras > 0 ? ` <span style="font-size:10.5px;color:var(--muted)">(${numCompras})</span>` : ''}</span>
          </div>
          <div class="card-metric-item">
            <span class="card-metric-label">Frequência</span>
            <span class="card-metric-val" style="color:var(--muted)">${freqTxt}</span>
          </div>
        </div>
      </div>

      <div class="cliente-card-actions">
        <button class="btn btn-sm" style="background:linear-gradient(135deg,#F6B52A,#C98C14);color:#000;font-weight:800;border:none;box-shadow:0 2px 6px rgba(201,140,20,.3)" onclick="iniciarAtendimentoMes(${c.id})" title="Atendimento Mensal de Rota (Receber + Novo Pedido)"><i data-lucide="zap" class="ic"></i> Atendimento</button>
        <button class="btn btn-outline btn-sm" onclick="cartoesNovaVendaPara(${c.id})" title="Nova Venda"><i data-lucide="shopping-cart" class="ic"></i> Venda</button>
        ${saldo > 0 
          ? `<button class="btn btn-green btn-sm" onclick="abrirPagamento(${c.id})" title="Receber pagamento"><i data-lucide="banknote" class="ic"></i> Receber</button>` 
          : `<button class="btn btn-outline btn-sm" onclick="abrirExtrato(${c.id})" title="Extrato financeiro"><i data-lucide="file-text" class="ic"></i> Extrato</button>`}
        ${(saldo > 0.009 && !arquivado) ? `<button class="btn btn-outline btn-sm" onclick="abrirRenegociar(${c.id})" title="Renegociar dívida"><i data-lucide="refresh-cw" class="ic"></i> Renegociar</button>` : ''}
        ${c.tel ? `<button class="btn btn-whatsapp btn-sm" onclick="cobrarWhatsapp(${c.id})" title="Enviar WhatsApp"><i data-lucide="message-circle" class="ic"></i></button>` : ''}
        ${arquivado
          ? `<button class="btn btn-outline btn-sm" onclick="reativarCliente(${c.id})" style="margin-left:auto">↩️ Reativar</button>`
          : `<div style="margin-left:auto;display:flex;gap:4px">
              <button class="icon-btn edit" onclick="editarCliente(${c.id})" title="Editar"><i data-lucide="pencil" class="ic"></i></button>
              <button class="icon-btn del" onclick="excluirCliente(${c.id})" title="Excluir/Arquivar"><i data-lucide="trash-2" class="ic"></i></button>
            </div>`}
      </div>
    </div>`;
  }).join('');

  if(window.lucide && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
}
function populateRotaFiltro(){
  const sel=document.getElementById('clientes-rota-filter');
  if(!sel)return;
  const atual=sel.value;
  sel.innerHTML='<option value="">Todas as rotas</option>'+state.rotas.map(r=>`<option value="${r.id}">${escapeHtml(r.nome)}</option>`).join('')+'<option value="none">Sem rota</option>';
  sel.value=atual;
}
function filterClienteArquivados(checked){state.cliente_mostrar_arquivados=checked;renderClientes();}
// Ao abrir Clientes pelo menu, a lista começa completa (sem busca/filtro de uma visita anterior)
function limparFiltrosClientes(){
  _clienteFoco=null;
  state.cliente_filter='';state.cliente_status_filter='';state.cliente_rota_filter='';
  ['cliente-busca-input','cliente-status-filter','clientes-rota-filter'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
}
function filterClientes(v){state.cliente_filter=v.toLowerCase();renderClientes();}
const filterClientesDebounced=debounce(filterClientes);
function filterClienteStatus(v){state.cliente_status_filter=v;renderClientes();}
function filterClienteRota(v){state.cliente_rota_filter=v;renderClientes();}
// ============ ROTAS ============
function populateRotaSelect(selectedId,targetId='cliente-rota'){
  const sel=document.getElementById(targetId);
  if(!sel)return;
  sel.innerHTML='<option value="">Sem rota</option>'+state.rotas.map(r=>`<option value="${r.id}">${escapeHtml(r.nome)}</option>`).join('');
  sel.value=selectedId||'';
}
function getRota(id){return state.rotas.find(r=>r.id==id)||null}
function abrirGerenciarRotas(){
  document.getElementById('rota-nova-nome').value='';
  renderListaRotas();
  document.getElementById('modal-rotas').classList.add('open');
}
function renderListaRotas(){
  const el=document.getElementById('lista-rotas');
  if(state.rotas.length===0){el.innerHTML='<p style="color:var(--muted);font-size:13px">Nenhuma rota cadastrada.</p>';return;}
  el.innerHTML=state.rotas.map(r=>{
    const qtd=state.clientes.filter(c=>c.rotaId===r.id).length;
    return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
      <input class="form-control" style="flex:1" value="${escapeHtml(r.nome)}" onchange="renomearRota(${r.id},this.value)">
      <span style="font-size:11px;color:var(--muted);white-space:nowrap">${qtd} cliente${qtd!==1?'s':''}</span>
      <button class="icon-btn del" onclick="excluirRota(${r.id})" title="Excluir rota"><i data-lucide="trash-2" class="ic"></i></button>
    </div>`;
  }).join('');
}
function adicionarRota(){
  const nome=document.getElementById('rota-nova-nome').value.trim();
  if(!nome){showToast('Informe o nome da rota','red');return;}
  if(state.rotas.some(r=>r.nome.toLowerCase()===nome.toLowerCase())){showToast('Já existe uma rota com esse nome','red');return;}
  const nova={id:nextId('rotas'),nome};
  state.rotas.push(nova);
  marcarAlterado();salvarDados();
  document.getElementById('rota-nova-nome').value='';
  renderListaRotas();
  populateRotaSelect(document.getElementById('cliente-rota').value);
  renderClientes();
  showToast('Rota adicionada ✓','green');
}
function renomearRota(id,nome){
  nome=nome.trim();
  if(!nome){showToast('Nome inválido','red');renderListaRotas();return;}
  const r=state.rotas.find(r=>r.id===id);
  if(r)r.nome=nome;
  marcarAlterado();salvarDados();
  renderListaRotas();
  populateRotaSelect(document.getElementById('cliente-rota').value);
  renderClientes();
}
function excluirRota(id){
  confirmarAcao('Excluir esta rota? Os clientes vinculados ficarão sem rota.',()=>{
    state.rotas=state.rotas.filter(r=>r.id!==id);
    state.clientes.forEach(c=>{if(c.rotaId===id){c.rotaId=null;c.rotaOrdem=null;}});
    marcarAlterado();salvarDados();
    renderListaRotas();
    populateRotaSelect(document.getElementById('cliente-rota').value);
    renderClientes();
    showToast('Rota excluída','green');
  });
}
// ---- Localização no mapa (v5.51) ----
// Aceita: "lat, lng", link longo do Google Maps (@lat,lng | !3dlat!4dlng | /place/lat,lng | ?q=lat,lng).
// Link curto (maps.app.goo.gl) não dá pra ler sem internet: fica salvo só como link.
function parseLocMapa(txt){
  const t=String(txt||'').trim(); if(!t) return null;
  const ok=(a,b)=>{a=parseFloat(a);b=parseFloat(b);return (isFinite(a)&&isFinite(b)&&Math.abs(a)<=90&&Math.abs(b)<=180)?{lat:a,lng:b}:null;};
  let dec=t; try{dec=decodeURIComponent(t);}catch(e){}
  let m;
  if((m=dec.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/))) return ok(m[1],m[2]);
  if((m=dec.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/))) return ok(m[1],m[2]);
  if((m=dec.match(/\/place\/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/))) return ok(m[1],m[2]);
  if((m=dec.match(/[?&](?:q|ll|query|destination)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/))) return ok(m[1],m[2]);
  if((m=dec.match(/^\s*(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/))) return ok(m[1],m[2]);
  return null;
}
function clienteTemPin(c){return c&&typeof c.lat==='number'&&typeof c.lng==='number';}
function clienteLocAqui(){
  if(!navigator.geolocation){showToast('Este aparelho não oferece GPS ao navegador','red');return;}
  showToast('Pegando localização… aguarde','');
  navigator.geolocation.getCurrentPosition(p=>{
    document.getElementById('cliente-loc').value=p.coords.latitude.toFixed(6)+', '+p.coords.longitude.toFixed(6);
    showToast('Localização capturada (±'+Math.round(p.coords.accuracy)+' m). Toque em Salvar Cliente','green');
  },e=>{
    showToast(e.code===1?'Permissão de localização negada no navegador':'Não consegui o GPS agora. Tente em local aberto','red');
  },{enableHighAccuracy:true,timeout:25000,maximumAge:0});
}
function clienteLocAbrir(){
  const t=document.getElementById('cliente-loc').value.trim();
  const p=parseLocMapa(t);
  if(p) window.open('https://www.google.com/maps/search/?api=1&query='+p.lat+','+p.lng,'_blank');
  else if(/^https?:\/\//i.test(t)) window.open(t,'_blank');
  else showToast('Sem localização preenchida','red');
}
function clearClienteForm(){
  ['cliente-edit-id','cliente-nome','cliente-tel','cliente-end','cliente-referencia','cliente-loc','cliente-rota-ordem'].forEach(id=>document.getElementById(id).value='');
  populateRotaSelect('');
  if(typeof creditoFormCliente==='function') creditoFormCliente(null);
  document.getElementById('modal-cliente-title').textContent='Novo Cliente';
}
function salvarCliente(){
  const eid=document.getElementById('cliente-edit-id').value;
  const nome=document.getElementById('cliente-nome').value.trim();
  const tel=document.getElementById('cliente-tel').value.trim();
  const end=document.getElementById('cliente-end').value.trim();
  const referencia=document.getElementById('cliente-referencia').value.trim();
  const locTxt=document.getElementById('cliente-loc').value.trim();
  const locP=parseLocMapa(locTxt);
  const locLink=(locTxt&&!locP)?locTxt:'';
  const lat=locP?locP.lat:null, lng=locP?locP.lng:null;
  const rotaId=parseInt(document.getElementById('cliente-rota').value)||null;
  const ordemTxt=parseInt(document.getElementById('cliente-rota-ordem').value);
  const rotaOrdem=(rotaId&&ordemTxt>0)?ordemTxt:null;
  if(!nome){showToast('Informe o nome do cliente','red');return;}
  const cred=(typeof creditoLerFormCliente==='function')?creditoLerFormCliente():null;
  if(cred&&cred.erro){showToast(cred.erro,'red');return;}
  if(eid){
    const c=state.clientes.find(c=>c.id==eid);
    c.nome=nome;c.tel=tel;c.end=end;c.referencia=referencia;c.rotaId=rotaId;c.rotaOrdem=rotaOrdem;c.lat=lat;c.lng=lng;c.locLink=locLink;
    if(cred){c.nivelCredito=cred.nivel;c.limiteCredito=cred.limite;}
    showToast('Cliente atualizado','green');
  } else {
    const st=(typeof cartoesState==='function')?cartoesState():null;
    let nCartao=_cartaoPendente;
    if(nCartao==null&&st){ nCartao=cartoesMenorLivre(st); }
    const novoCli={
      id:nextId('clientes'),
      nome,tel,end,referencia,lat,lng,locLink,rotaId,rotaOrdem,
      ativo:true,
      dataCadastro:today(),
      cartaoNum:nCartao,
      cartoesAntigos:[],
      ...(cred?{nivelCredito:cred.nivel,limiteCredito:cred.limite}:{})
    };
    state.clientes.push(novoCli);
    if(nCartao!=null&&st&&st.vinculos) st.vinculos[nCartao]=novoCli.id;
    _cartaoPendente=null;
    showToast('Cliente cadastrado (Cartão #'+cartoesNum(nCartao)+')','green');
  }
  if(locLink) showToast('Link curto salvo: abre no mapa, mas não entra na otimização. Cole o link longo, as coordenadas ou use o GPS','red');
  marcarAlterado();
  if(typeof creditoRevalidarExcecoes==='function'&&creditoRevalidarExcecoes()) marcarAlterado();
  closeModal('modal-cliente');renderClientes();renderDashboard();
}

// ── Importação em lote de clientes ──
function abrirImportarClientes(){
  document.getElementById('importar-clientes-texto').value='';
  document.getElementById('importar-clientes-preview').innerHTML='';
  document.getElementById('importar-clientes-btn').disabled=true;
  document.getElementById('importar-clientes-btn').textContent='Importar 0 clientes';
  document.getElementById('modal-importar-clientes').classList.add('open');
}
function parseLinhaCliente(linha){
  // aceita separador por vírgula ou TAB
  const partes=linha.includes('\t')?linha.split('\t'):linha.split(',');
  const nome=(partes[0]||'').trim();
  const tel=(partes[1]||'').trim();
  const end=(partes[2]||'').trim();
  const rota=(partes[3]||'').trim();
  return {nome,tel,end,rota};
}
function prevImportarClientes(){
  const texto=document.getElementById('importar-clientes-texto').value;
  const linhas=texto.split('\n').map(l=>l.trim()).filter(l=>l.length>0);
  const itens=linhas.map(parseLinhaCliente).filter(it=>it.nome);
  const btn=document.getElementById('importar-clientes-btn');
  const prev=document.getElementById('importar-clientes-preview');
  if(itens.length===0){
    btn.disabled=true;btn.textContent='Importar 0 clientes';
    prev.innerHTML='';
    return;
  }
  btn.disabled=false;
  btn.textContent=`Importar ${itens.length} cliente${itens.length>1?'s':''}`;
  prev.innerHTML=`
    <div style="font-size:11px;color:var(--muted);letter-spacing:.5px;margin:10px 0 6px">PRÉ-VISUALIZAÇÃO</div>
    <div style="max-height:180px;overflow-y:auto;border:1px solid var(--border);border-radius:8px">
      ${itens.map(it=>`<div style="display:flex;justify-content:space-between;gap:8px;padding:7px 10px;border-bottom:1px solid var(--border);font-size:12.5px">
        <strong>${escapeHtml(it.nome)}</strong>
        <span style="color:var(--muted)">${escapeHtml(it.tel||'sem telefone')}${it.end?' · '+escapeHtml(it.end):''}${it.rota?' · <i data-lucide="map-pin" class="ic ic-sm"></i> '+escapeHtml(it.rota):''}</span>
      </div>`).join('')}
    </div>`;
}
function confirmarImportarClientes(){
  const texto=document.getElementById('importar-clientes-texto').value;
  const linhas=texto.split('\n').map(l=>l.trim()).filter(l=>l.length>0);
  const itens=linhas.map(parseLinhaCliente).filter(it=>it.nome);
  if(itens.length===0){showToast('Nenhum cliente válido encontrado','red');return;}
  itens.forEach(it=>{
    let rotaId=null;
    if(it.rota){
      let r=state.rotas.find(r=>r.nome.toLowerCase()===it.rota.toLowerCase());
      if(!r){r={id:nextId('rotas'),nome:it.rota};state.rotas.push(r);}
      rotaId=r.id;
    }
    state.clientes.push({id:nextId('clientes'),nome:it.nome,tel:it.tel,end:it.end,rotaId,dataCadastro:today()});
  });
  marcarAlterado();
  showToast(`${itens.length} cliente${itens.length>1?'s':''} importado${itens.length>1?'s':''} ✓`,'green');
  closeModal('modal-importar-clientes');renderClientes();renderDashboard();
}

function editarCliente(id){
  const c=state.clientes.find(c=>c.id===id);
  document.getElementById('cliente-edit-id').value=id;
  document.getElementById('cliente-nome').value=c.nome;
  document.getElementById('cliente-tel').value=c.tel;
  document.getElementById('cliente-end').value=c.end||'';
  document.getElementById('cliente-referencia').value=c.referencia||'';
  document.getElementById('cliente-loc').value=clienteTemPin(c)?(c.lat+', '+c.lng):(c.locLink||'');
  populateRotaSelect(c.rotaId||'');
  document.getElementById('cliente-rota-ordem').value=c.rotaOrdem||'';
  if(typeof creditoFormCliente==='function') creditoFormCliente(c);
  document.getElementById('modal-cliente-title').textContent=`Editar Cliente ${fmtClienteNum(c.id)}`;
  document.getElementById('modal-cliente').classList.add('open');
}
// Exclusão "inteligente": se o cliente já tem venda ou pagamento registrado, apagar de
// verdade destruiria esse histórico dos relatórios (DRE, ticket médio, etc. de meses já
// fechados mudariam retroativamente). Nesse caso arquivamos (ativo=false) em vez de remover:
// ele some das listas e seletores de venda nova, mas o histórico continua intacto e
// getCliente() continua resolvendo o nome normalmente em qualquer relatório antigo.
// Só é removido de verdade quando não há nenhuma venda/pagamento vinculado — aí sim é seguro.
function excluirCliente(id){
  const c=state.clientes.find(c=>c.id===id);
  if(!c) return;
  const temHistorico=state.vendas.some(v=>v.clienteId===id)||state.pagamentos.some(p=>p.clienteId===id)||(state.renegociacoes||[]).some(r=>r.clienteId===id);
  if(temHistorico){
    confirmarAcao('Este cliente já tem vendas ou pagamentos registrados — excluir de verdade apagaria esse histórico dos relatórios. Em vez disso ele será arquivado: o cartão é liberado na hora para outro cliente e o histórico fica salvo. Continuar?',()=>{
      c.ativo=false;
      if(c.cartaoNum!=null){
        c.cartoesAntigos=Array.isArray(c.cartoesAntigos)?c.cartoesAntigos:[];
        if(!c.cartoesAntigos.includes(c.cartaoNum)) c.cartoesAntigos.push(c.cartaoNum);
        if(state.cartoes&&state.cartoes.vinculos) delete state.cartoes.vinculos[c.cartaoNum];
        c.cartaoNum=null;
      }
      marcarAlterado();salvarDados();
      showToast('Cliente arquivado e cartão liberado ✓','green');renderClientes();renderDashboard();
      if(typeof renderCartoes==='function') renderCartoes();
    });
    return;
  }
  confirmarAcao('Excluir este cliente? Ele não tem nenhuma venda ou pagamento registrado.',()=>{
    if(c.cartaoNum!=null&&state.cartoes&&state.cartoes.vinculos) delete state.cartoes.vinculos[c.cartaoNum];
    state.clientes=state.clientes.filter(c=>c.id!==id);
    marcarAlterado();salvarDados();
    showToast('Cliente excluído e cartão liberado','green');renderClientes();renderDashboard();
    if(typeof renderCartoes==='function') renderCartoes();
  });
}
function reativarCliente(id){
  const c=state.clientes.find(c=>c.id===id);
  if(!c) return;
  c.ativo=true;
  let aviso=null;
  const st=typeof cartoesState==='function'?cartoesState():null;
  if(st){
    const ant=c.cartoesAntigos||[], ult=ant.length?ant[ant.length-1]:null;
    if(ult!=null&&ult<=st.total&&st.vinculos[ult]==null){
      st.vinculos[ult]=id;
      c.cartaoNum=ult;
      aviso={n:ult,igual:true};
    } else {
      const n=cartoesMenorLivre(st);
      st.vinculos[n]=id;
      c.cartaoNum=n;
      aviso={n,igual:false,ult};
    }
  }
  marcarAlterado();salvarDados();
  if(aviso&&aviso.igual){
    showToast('Cliente reativado · Cartão nº '+cartoesNum(aviso.n)+' mantido ✓','green');
  } else if(aviso){
    confirmarAcao('Cliente reativado com Novo Cartão nº '+cartoesNum(aviso.n)+(aviso.ult!=null?' (o '+cartoesNum(aviso.ult)+' já foi para outro cliente)':'')+'. Deseja imprimir o novo cartão agora?',()=>cartoesImprimir(aviso.n,aviso.n));
  } else {
    showToast('Cliente reativado ✓','green');
  }
  renderClientes();
  if(typeof renderCartoes==='function') renderCartoes();
}

