// ============ MEU DIA POR ROTA (v5.40) ============
// Tela só de leitura: junta, por rota, as ENTREGAS pendentes e as COBRANÇAS vencidas.
// Não grava nada novo — os botões reaproveitam abrirPagamento() e cobrarWhatsapp().
// Uma "parada" = um cliente (mesmo com várias vendas).

// Pedidos antigos criados antes do controle de entrega não têm statusPedido e apareceriam como
// "Em preparação" para sempre. Por isso só entram pedidos dos últimos N dias.
const MEUDIA_DIAS_ENTREGA = 30;
let meuDiaRota = ''; // '' = todas as rotas | 'none' = sem rota | id da rota

function meuDiaDataLimite(hoje, dias){
  const [y,m,d] = String(hoje).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m-1, d - dias));
  return dt.getUTCFullYear()+'-'+String(dt.getUTCMonth()+1).padStart(2,'0')+'-'+String(dt.getUTCDate()).padStart(2,'0');
}

// Monta todas as paradas do dia (sem filtro de rota). Chama o motor FIFO UMA vez.
function getParadasDoDia(){
  const hoje = today();
  const limite = meuDiaDataLimite(hoje, MEUDIA_DIAS_ENTREGA);
  const cfgEnc = encargosCfg();
  const mapaFiado = getMapaSituacaoFiado();
  const paradas = {};
  const get = (clienteId)=>{
    const c = state.clientes.find(x=>x.id==clienteId);
    if(!c) return null;
    return paradas[clienteId] || (paradas[clienteId] = {
      id:c.id, c, rotaId:c.rotaId||null, entregas:[], vencido:0, venc:null, enc:0, us:[]
    });
  };

  // Cobrança: fiado vencido ou vencendo hoje (mesma regra da "Cobrança do dia")
  getUnidadesFiadoFlat().forEach(u=>{
    if(u.status==='pago' || !u.vencimento || u.vencimento>hoje) return;
    const p = get(u.clienteId); if(!p) return;
    p.vencido += u.valorRestante;
    p.us.push(u);
    if(!p.venc || u.vencimento<p.venc) p.venc = u.vencimento;
    const e = encargoDaUnidade(u, hoje, cfgEnc);
    if(e) p.enc += e.total;
  });

  // Entregas: vendas (não orçamento) ainda não entregues, dentro da janela
  state.vendas.forEach(v=>{
    if(v.tipo==='orcamento' || v.statusPedido==='entregue') return;
    if((v.data||'') < limite) return;
    const p = get(v.clienteId); if(!p) return;
    const sit = situacaoVenda(v, mapaFiado);
    p.entregas.push({v, sit});
  });

  return Object.values(paradas)
    .filter(p=>p.entregas.length>0 || p.vencido>0.009)
    .map(p=>({
      ...p,
      vencido: round2(p.vencido),
      enc: round2(p.enc),
      dias: p.venc ? diasEntre(p.venc, hoje) : 0,
      saldo: getSaldoCliente(p.id)
    }));
}

function meuDiaOrdenar(lista){
  return lista.sort((a,b)=>{
    const oa = (a.c.rotaOrdem!=null ? a.c.rotaOrdem : 9999), ob = (b.c.rotaOrdem!=null ? b.c.rotaOrdem : 9999);
    return oa-ob || String(a.c.nome).localeCompare(String(b.c.nome),'pt-BR');
  });
}

function meuDiaSelecionarRota(v){ meuDiaRota = v; renderMeuDia(); }

function meuDiaCobrar(clienteId){ cobrarWhatsapp(clienteId); renderMeuDia(); }

function meuDiaEntregaHtml(e){
  const v = e.v;
  const itens = (v.itens||[]).map(it=>escapeHtml(nomeItemVenda(it))+' ×'+it.qtd).join(', ') || 'Venda';
  const num = 'VD'+String(v.id).padStart(4,'0');
  let pag;
  if(v.forma==='fiado'){
    pag = e.sit.status==='pago' ? '<span class="badge badge-green">Fiado pago</span>' : '<span class="badge badge-yellow">Fiado</span>';
  } else {
    pag = '<span class="badge badge-green">Pago · '+escapeHtml(formaLabel(v.forma))+'</span>';
  }
  return `<div style="padding:6px 0;border-top:1px dashed var(--border);font-size:12.5px">
    <div><strong>${num}</strong> · ${fmtDate(v.data)} · <strong>${fmt(v.total)}</strong> ${pag}</div>
    <div style="color:var(--muted)">${itens}</div>
    ${v.obs?`<div style="color:var(--muted);font-style:italic">${escapeHtml(v.obs)}</div>`:''}
  </div>`;
}

function meuDiaParadaHtml(p, n){
  const hoje = today();
  const uc = textoUltimaCobranca(p.c, hoje);
  const temEntrega = p.entregas.length>0;
  const temCobr = p.vencido>0.009;
  const end = [p.c.end, p.c.referencia].filter(Boolean).join(' — ');
  const corVenc = p.dias>0 ? 'var(--red)' : '#d35400';
  const selos = [];
  if(temEntrega) selos.push(`<span class="badge badge-orange">📦 ${p.entregas.length} entrega${p.entregas.length>1?'s':''}</span>`);
  if(temCobr) selos.push(`<span class="badge badge-red">💰 Cobrar ${fmt(p.vencido)}${p.dias>0?' · '+p.dias+'d':' · hoje'}</span>`);
  const prom = (typeof promessaEstado==='function') ? promessaEstado(p.id, hoje, p.us) : null;
  if(prom) selos.push(prom.estado==='ativa'
    ? `<span class="badge badge-yellow">🤝 Prometeu ${fmtDate(prom.data)}</span>`
    : `<span class="badge badge-red">⚠️ Promessa quebrada ${fmtDate(prom.data)}</span>`);
  if(!estaAtivo(p.c)) selos.push('<span class="badge badge-gray">Arquivado</span>');
  if(uc.hoje) selos.push('<span class="badge badge-green">Cobrado hoje</span>');
  if(!p.c.end) selos.push('<span class="badge badge-gray">⚠️ sem endereço</span>');
  const tel = (p.c.tel||'').trim();
  return `<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
      <div style="min-width:0">
        <div style="font-weight:700;font-size:15px"><span style="color:var(--muted);font-weight:600">${n}.</span> ${escapeHtml(p.c.nome)} <span style="font-size:11px;color:var(--muted);font-weight:500">${fmtClienteNum(p.id)}</span></div>
        ${end?`<div style="font-size:12px;color:var(--muted)">📍 ${escapeHtml(end)}</div>`:''}
        ${tel?`<div style="font-size:12px;color:var(--muted)">${escapeHtml(tel)}</div>`:''}
      </div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0">${selos.join('')}</div>
    ${p.entregas.map(meuDiaEntregaHtml).join('')}
    ${temCobr?`<div style="padding:6px 0;border-top:1px dashed var(--border);font-size:12.5px">
      Vencido desde <span style="color:${corVenc};font-weight:600">${fmtDate(p.venc)}</span>
      · saldo total do cliente <strong>${fmt(p.saldo)}</strong>
      ${p.enc>0?`<div style="color:var(--muted)">+ ${fmt(p.enc)} de encargos (informativo)</div>`:''}
      <div style="color:var(--muted)">Última cobrança: ${uc.txt}</div>
    </div>`:''}
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
      ${p.saldo>0.009?`<button class="btn btn-green btn-sm" onclick="abrirPagamento(${p.id})"><i data-lucide="banknote" class="ic"></i> Receber</button>`:''}
      ${tel&&p.saldo>0.009?`<button class="btn btn-whatsapp btn-sm" onclick="meuDiaCobrar(${p.id})"><i data-lucide="message-circle" class="ic"></i> Cobrar</button>`:''}
    </div>
  </div>`;
}

function renderMeuDia(){
  const el = document.getElementById('meudia-lista');
  if(!el) return;
  const hoje = today();
  const dt = document.getElementById('meudia-data');
  if(dt) dt.textContent = fmtDate(hoje);

  // seletor de rota (mantém a escolha mesmo se a rota foi excluída)
  const selEl = document.getElementById('meudia-rota');
  if(selEl){
    if(meuDiaRota && meuDiaRota!=='none' && !getRota(meuDiaRota)) meuDiaRota = '';
    selEl.innerHTML = '<option value="">Todas as rotas</option>'
      + state.rotas.map(r=>`<option value="${r.id}">${escapeHtml(r.nome)}</option>`).join('')
      + '<option value="none">Sem rota</option>';
    selEl.value = meuDiaRota;
  }

  let todas = getParadasDoDia();
  if(meuDiaRota==='none') todas = todas.filter(p=>!p.rotaId);
  else if(meuDiaRota) todas = todas.filter(p=>String(p.rotaId||'')===String(meuDiaRota));

  const totEntregas = todas.reduce((s,p)=>s+p.entregas.length,0);
  const totCobrar = round2(todas.reduce((s,p)=>s+p.vencido,0));
  const resumo = `<div style="font-size:13px;margin-bottom:12px"><strong>${todas.length}</strong> parada(s) · <strong>${totEntregas}</strong> entrega(s) · a cobrar <strong style="color:var(--red)">${fmt(totCobrar)}</strong></div>`;

  if(todas.length===0){
    el.innerHTML = `<div style="text-align:center;padding:60px 20px"><h3 style="color:var(--green)">Nada para hoje${meuDiaRota?' nesta rota':''}</h3>
      <p style="color:var(--muted);margin-top:8px">Sem entregas pendentes (últimos ${MEUDIA_DIAS_ENTREGA} dias) nem fiado vencido.</p></div>`;
    return;
  }

  // agrupa por rota, na ordem em que as rotas foram cadastradas; "Sem rota" por último
  const grupos = state.rotas.map(r=>({nome:r.nome, itens:todas.filter(p=>String(p.rotaId||'')===String(r.id))}));
  grupos.push({nome:'Sem rota', itens:todas.filter(p=>!p.rotaId || !getRota(p.rotaId))});
  const vistos = new Set();
  const html = grupos.filter(g=>g.itens.length).map(g=>{
    const itens = meuDiaOrdenar(g.itens.filter(p=>!vistos.has(p.id)));
    itens.forEach(p=>vistos.add(p.id));
    if(!itens.length) return '';
    return `<h3 style="margin:14px 0 8px;font-size:14px"><i data-lucide="map-pin" class="ic ic-sm"></i> ${escapeHtml(g.nome)} <span style="color:var(--muted);font-weight:500">(${itens.length})</span></h3>`
      + itens.map((p,i)=>meuDiaParadaHtml(p,i+1)).join('');
  }).join('');
  el.innerHTML = resumo + html;
  if(typeof lucide!=='undefined') lucide.createIcons();
}
