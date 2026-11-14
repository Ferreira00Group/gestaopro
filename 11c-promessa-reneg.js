// ============ PROMESSA DE PAGAMENTO + RENEGOCIAÇÃO DE DÍVIDA (v5.42) ============
// PROMESSA: cliente.promessa = {data, obs, criadaEm}. Vale só para as parcelas JÁ vencidas na
//   data em que foi anotada (venc <= criadaEm). Até a data, o cliente sai da Cobrança do dia;
//   passada a data sem pagar, volta destacado como "promessa quebrada".
// RENEGOCIAÇÃO: state.renegociacoes = [{id, clienteId, data, base, encargos, modoEnc, jurosAto?, total,
//   parcelas:[{valor,vencimento}], vendasIds, obs, substituidaPor?}]. Só as compras escolhidas entram (v.renegociadaId). Não mexe em vendas nem em pagamentos
//   (nada entra no caixa/faturamento). O motor do fiado (00-core.js) trata "base" como baixa das
//   dívidas antigas e cria as parcelas novas como unidades de cobrança (vendaId 'R<id>').

function somarDiasISO(iso, dias){
  const [y,m,d] = String(iso).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m-1, d + dias));
  return dt.getUTCFullYear()+'-'+String(dt.getUTCMonth()+1).padStart(2,'0')+'-'+String(dt.getUTCDate()).padStart(2,'0');
}
function renegRerender(){
  const pg = document.querySelector('.page.active');
  if(pg) render(pg.id.replace('page-',''));
}

// ───────── Promessa de pagamento ─────────
// unidades = parcelas vencidas/abertas do cliente (opcional; se omitido, calcula)
function promessaEstado(clienteId, hoje, unidades){
  const c = state.clientes.find(x=>x.id==clienteId);
  if(!c || !c.promessa || !c.promessa.data) return null;
  const pr = c.promessa;
  const venc = (unidades || getUnidadesFiadoFlat().filter(u=>u.clienteId==clienteId))
    .filter(u=>u.status!=='pago' && u.vencimento && u.vencimento<=hoje);
  const limite = pr.criadaEm || pr.data;
  const cobertas = venc.filter(u=>u.vencimento<=limite).length;
  if(cobertas===0) return null; // nada do que foi prometido continua em aberto
  const novas = venc.length - cobertas;
  if(pr.data>=hoje) return {estado:'ativa', data:pr.data, obs:pr.obs||'', cobreTudo:novas===0};
  return {estado:'quebrada', data:pr.data, obs:pr.obs||'', cobreTudo:false};
}
function cobrancaPromBadge(prom){
  if(!prom) return '';
  if(prom.estado==='quebrada') return ' <span class="badge badge-red">⚠️ Promessa quebrada · '+fmtDate(prom.data)+'</span>';
  return ' <span class="badge badge-yellow">🤝 Promessa · '+fmtDate(prom.data)+'</span>';
}
function promessaHtmlReceber(clienteId){
  const prom = promessaEstado(clienteId, today());
  if(!prom) return '';
  const obs = prom.obs ? ' — '+escapeHtml(prom.obs) : '';
  return prom.estado==='ativa'
    ? '<div style="font-size:12px;margin-top:6px;opacity:.95">🤝 Prometeu pagar até '+fmtDate(prom.data)+obs+'</div>'
    : '<div style="font-size:12px;margin-top:6px;font-weight:700">⚠️ Promessa de '+fmtDate(prom.data)+' não cumprida'+obs+'</div>';
}
function cobrancaPrometidosHtml(lista){
  if(!lista || !lista.length) return '';
  const linhas = lista.map(l=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 0;border-top:1px dashed var(--border);flex-wrap:wrap">
      <div style="min-width:0"><strong class="nome-cartao-link" onclick="abrirCartaoCliente(${l.c.id})">${escapeHtml(l.c.nome)}</strong><div style="font-size:12px;color:var(--muted)">Prometeu até <strong>${fmtDate(l.prom.data)}</strong> · vencido ${fmt(l.vencido)}${l.prom.obs?' · '+escapeHtml(l.prom.obs):''}</div></div>
      <div style="display:flex;gap:6px"><button class="btn btn-green btn-sm" onclick="abrirPagamento(${l.id})" title="Receber"><i data-lucide="banknote" class="ic"></i></button><button class="btn btn-outline btn-sm" onclick="abrirPromessa(${l.id})" title="Editar promessa"><i data-lucide="handshake" class="ic"></i></button></div>
    </div>`).join('');
  return `<details style="margin-top:14px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:10px 14px">
    <summary style="cursor:pointer;font-weight:700;font-size:13px">🤝 Prometeram pagar (${lista.length}) — fora da lista até a data</summary>${linhas}</details>`;
}
function abrirPromessa(clienteId){
  const c = getCliente(clienteId); if(!c) return;
  const hoje = today();
  const venc = getUnidadesFiadoFlat().filter(u=>u.clienteId==clienteId && u.status!=='pago' && u.vencimento && u.vencimento<=hoje);
  if(venc.length===0){ showToast('Este cliente não tem parcela vencida — a promessa só vale para dívida em atraso','red'); return; }
  const total = round2(venc.reduce((s,u)=>s+u.valorRestante,0));
  const maisAntiga = venc.reduce((m,u)=>u.vencimento<m?u.vencimento:m, venc[0].vencimento);
  document.getElementById('prom-cliente-id').value = clienteId;
  document.getElementById('prom-cliente-nome').textContent = c.nome;
  document.getElementById('prom-info').textContent = 'Vencido: '+fmt(total)+' · desde '+fmtDate(maisAntiga);
  document.getElementById('prom-data').value = (c.promessa && c.promessa.data) || '';
  document.getElementById('prom-obs').value = (c.promessa && c.promessa.obs) || '';
  document.getElementById('prom-btn-remover').style.display = c.promessa ? '' : 'none';
  document.getElementById('modal-promessa').classList.add('open');
}
function promessaAtalho(dias){
  document.getElementById('prom-data').value = somarDiasISO(today(), dias);
}
function salvarPromessa(){
  const clienteId = parseInt(document.getElementById('prom-cliente-id').value);
  const c = state.clientes.find(x=>x.id==clienteId); if(!c) return;
  const data = document.getElementById('prom-data').value;
  const obs = document.getElementById('prom-obs').value.trim();
  if(!data){ showToast('Informe até que dia o cliente prometeu pagar','red'); return; }
  if(data < today()){ showToast('A data da promessa deve ser hoje ou uma data futura','red'); return; }
  c.promessa = {data, obs, criadaEm: today()};
  marcarAlterado();
  closeModal('modal-promessa');
  showToast('Promessa anotada para '+fmtDate(data),'green');
  renegRerender();
}
function removerPromessa(){
  const clienteId = parseInt(document.getElementById('prom-cliente-id').value);
  const c = state.clientes.find(x=>x.id==clienteId); if(!c) return;
  delete c.promessa;
  marcarAlterado();
  closeModal('modal-promessa');
  showToast('Promessa removida','green');
  renegRerender();
}

// ───────── Renegociação ─────────
function pad2(n){ return String(n).padStart(2,'0'); }
// Soma meses mantendo o dia (31/01 + 1 mês = 28 ou 29/02 — nunca pula para março)
function addMesesISO(iso, meses){
  const [y,m,d] = String(iso).split('-').map(Number);
  const t = (m-1)+meses, ny = y+Math.floor(t/12), nm = ((t%12)+12)%12;
  const ult = new Date(Date.UTC(ny, nm+1, 0)).getUTCDate();
  return ny+'-'+pad2(nm+1)+'-'+pad2(Math.min(d, ult));
}
// Divide o total em parcelas iguais, uma para cada data informada (a última absorve os centavos)
function renegParcelas(total, datas){
  const n = datas.length, cents = Math.round(total*100), base = Math.floor(cents/n);
  const out = []; let acc = 0;
  for(let i=0;i<n;i++){
    const v = (i===n-1) ? (cents-acc) : base;
    acc += v;
    out.push({valor:v/100, vencimento:datas[i]});
  }
  return out;
}
function vendaRenegociada(id){
  const v = state.vendas.find(x=>x.id==id);
  return !!(v && v.renegociadaId && (state.renegociacoes||[]).some(r=>r.id===v.renegociadaId));
}
function renegLinhasCobranca(clienteId){
  const us = getUnidadesFiadoFlat().filter(u=>u.clienteId==clienteId && u.renegociacaoId && u.status!=='pago')
    .sort((a,b)=>(a.vencimento||'').localeCompare(b.vencimento||''));
  if(!us.length) return '';
  return '\n'+us.map(u=>'• Parcela '+u.parcelaNum+'/'+u.parcelaTotal+' (renegociação) — venc. '+fmtDate(u.vencimento)+' = '+fmt(u.valorRestante)).join('\n');
}

// Compras (e renegociações ativas) do cliente que ainda têm valor em aberto e podem entrar na renegociação
let renegItens = [];
function renegMontarItens(clienteId){
  const mapa = getMapaSituacaoFiado(), hoje = today(), itens = [];
  state.vendas.filter(v=>v.clienteId==clienteId && v.forma==='fiado' && v.tipo!=='orcamento' && !vendaRenegociada(v.id)).forEach(v=>{
    const m = mapa[v.id]; if(!m) return;
    const rest = round2(m.valorRestante||0); if(rest<=0.009) return;
    const total = round2(m.parcelas.reduce((s,p)=>s+p.valor,0));
    itens.push({chave:'v'+v.id, tipo:'venda', id:v.id, restante:rest, total, venc:m.vencimentoPendente||v.vencimento||'', data:v.data,
      desc:(v.itens||[]).map(it=>nomeItemVenda(it)+' ('+it.qtd+'x)').join(', ')||'Venda'});
  });
  (state.renegociacoes||[]).filter(r=>r.clienteId==clienteId && !r.substituidaPor).forEach(r=>{
    const m = mapa['R'+r.id]; if(!m) return;
    const rest = round2(m.valorRestante||0); if(rest<=0.009) return;
    const abertas = m.parcelas.filter(p=>p.status!=='pago').length;
    itens.push({chave:'r'+r.id, tipo:'reneg', id:r.id, restante:rest, total:round2(r.total), venc:m.vencimentoPendente||'', data:r.data,
      desc:'Renegociação de '+fmtDate(r.data)+' — '+abertas+' parcela'+(abertas>1?'s':'')+' em aberto'});
  });
  itens.sort((a,b)=>(a.venc||a.data||'').localeCompare(b.venc||b.data||''));
  itens.forEach(it=>{ it.vencida = !!it.venc && it.venc<hoje; });
  return itens;
}
function renegItensHtml(){
  const hoje = today();
  const algumaVencida = renegItens.some(it=>it.vencida);
  return renegItens.map(it=>{
    let st = !it.venc ? 'sem vencimento' : (it.venc<hoje ? 'venceu em '+fmtDate(it.venc) : (it.venc===hoje ? 'vence hoje' : 'vence em '+fmtDate(it.venc)));
    if(it.restante < it.total-0.009) st += ' · já pago '+fmt(round2(it.total-it.restante));
    const chk = (!algumaVencida || it.vencida) ? 'checked' : '';
    return `<label style="display:flex;gap:8px;align-items:flex-start;padding:8px 0;border-bottom:1px dashed var(--border);cursor:pointer">
      <input type="checkbox" id="reneg-it-${it.chave}" ${chk} style="width:auto;margin:3px 0 0" onchange="renegAtualizar()">
      <span style="flex:1;font-size:13px">${it.tipo==='venda'?fmtDate(it.data)+' · ':''}${escapeHtml(it.desc)}<br><small style="color:${it.vencida?'var(--red)':'var(--muted)'}">${escapeHtml(st)}</small></span>
      <strong style="font-size:13px">${fmt(it.restante)}</strong></label>`;
  }).join('');
}
function renegSelecionados(){
  return renegItens.filter(it=>{ const el=document.getElementById('reneg-it-'+it.chave); return el && el.checked; });
}
function renegSelecionarTudo(){
  renegItens.forEach(it=>{ const el=document.getElementById('reneg-it-'+it.chave); if(el) el.checked=true; });
  renegAtualizar();
}
// Encargos de atraso só das compras selecionadas
function renegEncargosSel(clienteId, sel){
  const cfg = encargosCfg(), r = {total:0, multa:0, juros:0};
  if(!cfg.ativo || !sel.length) return r;
  const ids = new Set(sel.map(it=>it.tipo==='venda' ? it.id : 'R'+it.id));
  getUnidadesFiadoFlat().filter(u=>u.clienteId==clienteId && ids.has(u.vendaId)).forEach(u=>{
    const e = encargoDaUnidade(u, today(), cfg);
    if(e){ r.multa += e.multa; r.juros += e.juros; }
  });
  r.multa = round2(r.multa); r.juros = round2(r.juros); r.total = round2(r.multa + r.juros);
  return r;
}
function renegLerForm(){
  const clienteId = parseInt(document.getElementById('reneg-cliente-id').value);
  const sel = renegSelecionados();
  const base = round2(sel.reduce((s,it)=>s+it.restante, 0));
  const encObj = renegEncargosSel(clienteId, sel), enc = encObj.total;
  const radio = document.querySelector('input[name="reneg-enc"]:checked');
  const modo = (enc>0 && radio) ? radio.value : 'perdoar';
  const baseJuros = round2(base + (modo==='incluir' ? enc : 0));
  const tipoJ = document.getElementById('reneg-juros-tipo').value;
  const valJ = Math.max(0, parseFloat(document.getElementById('reneg-juros-valor').value)||0);
  const jurosAto = round2(tipoJ==='pct' ? baseJuros*valJ/100 : valJ);
  const total = round2(baseJuros + jurosAto);
  const n = parseInt(document.getElementById('reneg-n').value);
  const nOk = Number.isInteger(n) && n>=1 && n<=36;
  const datas = [];
  if(nOk) for(let i=0;i<n;i++){ const el = document.getElementById('reneg-data-'+i); datas.push(el ? el.value : ''); }
  let erro = '';
  if(!sel.length) erro = 'Selecione ao menos uma compra para renegociar.';
  else if(base<=0.009) erro = 'Nada em aberto nas compras selecionadas.';
  else if(!nOk) erro = 'Informe de 1 a 36 parcelas.';
  else if(datas.some(d=>!d)) erro = 'Informe a data de vencimento de todas as parcelas.';
  else if(datas.some(d=>d < today())) erro = 'As datas de vencimento não podem ser anteriores a hoje.';
  const parcelas = erro ? [] : renegParcelas(total, datas);
  return {clienteId, sel, base, enc, encMulta:encObj.multa, encJuros:encObj.juros, modo, jurosAto, total, n, datas, parcelas, erro};
}
// Gera as datas mensais (editáveis) a partir do 1º vencimento e do nº de parcelas
function renegRegen(){
  const el = document.getElementById('reneg-datas');
  const n = parseInt(document.getElementById('reneg-n').value);
  const primeiro = document.getElementById('reneg-primeiro').value;
  if(!(Number.isInteger(n) && n>=1 && n<=36)){ el.innerHTML = ''; renegAtualizar(); return; }
  let h = '';
  for(let i=0;i<n;i++){
    const ds = primeiro ? addMesesISO(primeiro, i) : '';
    h += `<div class="parcela-linha">
      <span class="parcela-num">${i+1}×</span>
      <input class="form-control" type="date" id="reneg-data-${i}" value="${ds}" onchange="renegAtualizar()" oninput="renegAtualizar()" style="max-width:160px;padding:7px 10px;font-size:13px">
      <span style="font-size:12px;color:var(--muted)">vencimento</span>
      <strong id="reneg-val-${i}" style="margin-left:auto;font-size:13px"></strong>
    </div>`;
  }
  el.innerHTML = h;
  renegAtualizar();
}
function renegAtualizar(){
  const d = renegLerForm();
  const el = document.getElementById('reneg-preview');
  const saldoTotal = round2(getSaldoCliente(d.clienteId));
  document.getElementById('reneg-sel-total').innerHTML = 'Selecionado: <strong>'+fmt(d.base)+'</strong>'+(saldoTotal>d.base+0.009?' <span style="color:var(--muted)">de '+fmt(saldoTotal)+' em aberto — o restante não muda</span>':'');
  document.getElementById('reneg-enc-wrap').style.display = d.enc>0 ? 'block' : 'none';
  document.getElementById('reneg-enc-valor').textContent = fmt(d.enc);
  for(let i=0;i<36;i++){
    const sp = document.getElementById('reneg-val-'+i); if(!sp) break;
    sp.textContent = d.parcelas[i] ? fmt(d.parcelas[i].valor) : '';
  }
  if(d.erro){ el.innerHTML = '<div style="color:var(--red);font-size:12.5px">'+escapeHtml(d.erro)+'</div>'; return; }
  const vals = d.parcelas.map(p=>p.valor), igual = vals.every(v=>Math.abs(v-vals[0])<0.0101);
  el.innerHTML = `<div class="parcelas-resumo">
      <div class="lin"><span>Valor das compras</span><span>${fmt(d.base)}</span></div>
      ${d.enc>0?`<div class="lin"><span>Encargos de atraso</span><span>${d.modo==='incluir'?'+'+fmt(d.enc)+' (incluídos)':fmt(d.enc)+' (perdoados)'}</span></div>`:''}
      <div class="lin"><span>Juros no ato</span><span>${d.jurosAto>0?'+':''}${fmt(d.jurosAto)}</span></div>
      <div class="lin tot"><span>Total a receber</span><span>${fmt(d.total)}</span></div>
      <div style="margin-top:4px;font-size:12px;color:var(--muted)">${d.n} parcela${d.n>1?'s':''}${igual?' de '+fmt(vals[0]):''} · a última absorve os centavos.</div>
    </div>`;
}
function renegAnterioresHtml(clienteId){
  const ativas = (state.renegociacoes||[]).filter(r=>r.clienteId==clienteId && !r.substituidaPor);
  if(!ativas.length) return '';
  return `<div style="margin-top:16px"><strong style="font-size:12px;color:var(--muted)">RENEGOCIAÇÕES ANTERIORES</strong>
    ${ativas.map(r=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-top:1px dashed var(--border);font-size:12.5px">
      <div>${fmtDate(r.data)} · ${fmt(r.total)} em ${r.parcelas.length}x${r.modoEnc==='incluir'?' · com encargos':(r.encargos>0?' · encargos perdoados':'')}</div>
      <button class="btn btn-outline btn-sm" onclick="desfazerRenegociacao(${r.id})">Desfazer</button></div>`).join('')}</div>`;
}
function abrirRenegociar(clienteId){
  const c = getCliente(clienteId); if(!c) return;
  const saldo = round2(getSaldoCliente(clienteId));
  if(saldo<=0.009){ showToast('Cliente sem saldo devedor','red'); return; }
  renegItens = renegMontarItens(clienteId);
  if(!renegItens.length){ showToast('Nenhuma compra em aberto para renegociar','red'); return; }
  document.getElementById('reneg-cliente-id').value = clienteId;
  document.getElementById('reneg-cliente-nome').textContent = c.nome;
  document.getElementById('reneg-saldo').textContent = fmt(saldo);
  document.getElementById('reneg-itens').innerHTML = renegItensHtml();
  document.querySelector('input[name="reneg-enc"][value="perdoar"]').checked = true;
  document.getElementById('reneg-n').value = 1;
  document.getElementById('reneg-primeiro').value = somarDiasISO(today(), 30);
  document.getElementById('reneg-juros-tipo').value = 'pct';
  document.getElementById('reneg-juros-valor').value = '';
  document.getElementById('reneg-obs').value = '';
  document.getElementById('reneg-anteriores').innerHTML = renegAnterioresHtml(clienteId);
  renegRegen();
  document.getElementById('modal-reneg').classList.add('open');
  if(typeof lucide!=='undefined') lucide.createIcons();
}
function confirmarRenegociacao(){
  const d = renegLerForm();
  if(d.erro){ showToast(d.erro,'red'); return; }
  const obs = document.getElementById('reneg-obs').value.trim();
  const txt = 'Renegociar '+fmt(d.base)+' ('+d.sel.length+' compra'+(d.sel.length>1?'s':'')+')'+(d.modo==='incluir'&&d.enc>0?' + '+fmt(d.enc)+' de encargos':'')+(d.jurosAto>0?' + '+fmt(d.jurosAto)+' de juros':'')+' em '+d.n+'x? Só as compras selecionadas são substituídas pelas novas parcelas; o resto do saldo não muda. Dá para desfazer depois.';
  confirmarAcao(txt, ()=>aplicarRenegociacao(d, obs));
}
function aplicarRenegociacao(d, obs){
  if(!Array.isArray(state.renegociacoes)) state.renegociacoes = [];
  const id = state.renegociacoes.reduce((m,r)=>Math.max(m,r.id),0) + 1;
  // marca só as compras escolhidas (para travar edição/exclusão e mostrar o selo)
  const vendasIds = d.sel.filter(it=>it.tipo==='venda').map(it=>it.id);
  state.vendas.forEach(v=>{ if(vendasIds.includes(v.id)) v.renegociadaId = id; });
  // renegociações anteriores escolhidas passam a ser "substituídas" (o saldo delas entra na base desta)
  const renegsIds = d.sel.filter(it=>it.tipo==='reneg').map(it=>it.id);
  state.renegociacoes.forEach(r=>{ if(renegsIds.includes(r.id)) r.substituidaPor = id; });
  state.renegociacoes.push({
    id, clienteId:d.clienteId, data:today(), base:d.base, encargos:round2(d.enc), modoEnc:d.modo,
    ...(d.jurosAto>0?{jurosAto:d.jurosAto}:{}), total:d.total, parcelas:d.parcelas, vendasIds, obs
  });
  const c = state.clientes.find(x=>x.id==d.clienteId);
  if(c) delete c.promessa; // a promessa antiga não vale mais
  marcarAlterado();
  closeModal('modal-reneg');
  showToast('Dívida renegociada em '+d.n+'x de ~'+fmt(d.parcelas[0].valor),'green');
  renegRerender();
}
function desfazerRenegociacao(id){
  const r = (state.renegociacoes||[]).find(x=>x.id===id); if(!r) return;
  confirmarAcao('Desfazer a renegociação de '+fmtDate(r.data)+' ('+fmt(r.total)+' em '+r.parcelas.length+'x)? A dívida volta a ser a original; pagamentos feitos depois continuam valendo.', ()=>{
    state.renegociacoes = state.renegociacoes.filter(x=>x.id!==id);
    state.renegociacoes.forEach(x=>{ if(x.substituidaPor===id) delete x.substituidaPor; });
    state.vendas.forEach(v=>{ if(v.renegociadaId===id) delete v.renegociadaId; });
    marcarAlterado();
    showToast('Renegociação desfeita','green');
    renegRerender();
    if(getSaldoCliente(r.clienteId)>0.009) abrirRenegociar(r.clienteId); else closeModal('modal-reneg');
  });
}
