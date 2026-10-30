// ============ PROMESSA DE PAGAMENTO + RENEGOCIAÇÃO DE DÍVIDA (v5.42) ============
// PROMESSA: cliente.promessa = {data, obs, criadaEm}. Vale só para as parcelas JÁ vencidas na
//   data em que foi anotada (venc <= criadaEm). Até a data, o cliente sai da Cobrança do dia;
//   passada a data sem pagar, volta destacado como "promessa quebrada".
// RENEGOCIAÇÃO: state.renegociacoes = [{id, clienteId, data, base, encargos, modoEnc, total,
//   parcelas:[{valor,vencimento}], obs, substituidaPor?}]. Não mexe em vendas nem em pagamentos
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
      <div style="min-width:0"><strong>${escapeHtml(l.c.nome)}</strong><div style="font-size:12px;color:var(--muted)">Prometeu até <strong>${fmtDate(l.prom.data)}</strong> · vencido ${fmt(l.vencido)}${l.prom.obs?' · '+escapeHtml(l.prom.obs):''}</div></div>
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
function renegParcelas(total, n, primeiro, intervalo){
  const cents = Math.round(total*100), base = Math.floor(cents/n);
  const out = []; let acc = 0;
  for(let i=0;i<n;i++){
    const v = (i===n-1) ? (cents-acc) : base; // a última absorve os centavos que sobram
    acc += v;
    out.push({valor:v/100, vencimento:somarDiasISO(primeiro, i*intervalo)});
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

function renegLerForm(){
  const clienteId = parseInt(document.getElementById('reneg-cliente-id').value);
  const saldo = round2(getSaldoCliente(clienteId));
  const enc = encargosCfg().ativo ? calcEncargosCliente(clienteId).total : 0;
  const radio = document.querySelector('input[name="reneg-enc"]:checked');
  const modo = (enc>0 && radio) ? radio.value : 'perdoar';
  const total = round2(saldo + (modo==='incluir' ? enc : 0));
  const n = parseInt(document.getElementById('reneg-n').value);
  const primeiro = document.getElementById('reneg-primeiro').value;
  const intervalo = parseInt(document.getElementById('reneg-intervalo').value);
  let erro = '';
  if(saldo<=0.009) erro = 'Cliente sem saldo devedor.';
  else if(!(n>=1 && n<=36)) erro = 'Informe de 1 a 36 parcelas.';
  else if(!primeiro) erro = 'Informe o primeiro vencimento.';
  else if(primeiro < today()) erro = 'O primeiro vencimento não pode ser no passado.';
  else if(!(intervalo>=1 && intervalo<=365)) erro = 'Intervalo entre parcelas: de 1 a 365 dias.';
  const parcelas = erro ? [] : renegParcelas(total, n, primeiro, intervalo);
  return {clienteId, saldo, enc, modo, total, n, primeiro, intervalo, parcelas, erro};
}
function renegAtualizar(){
  const d = renegLerForm();
  const el = document.getElementById('reneg-preview');
  if(d.erro){ el.innerHTML = '<div style="color:var(--red);font-size:12.5px">'+escapeHtml(d.erro)+'</div>'; return; }
  el.innerHTML = `<div style="font-size:13px;margin-bottom:6px">Novo total: <strong>${fmt(d.total)}</strong> em <strong>${d.n}x</strong>
      ${d.enc>0?`<span style="color:var(--muted)"> · encargos ${d.modo==='incluir'?'incluídos ('+fmt(d.enc)+')':'perdoados ('+fmt(d.enc)+')'}</span>`:''}</div>
    <div class="table-scroll"><table><thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th></tr></thead><tbody>
    ${d.parcelas.map((p,i)=>`<tr><td>${i+1}/${d.n}</td><td>${fmtDate(p.vencimento)}</td><td>${fmt(p.valor)}</td></tr>`).join('')}
    </tbody></table></div>`;
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
  const enc = encargosCfg().ativo ? calcEncargosCliente(clienteId).total : 0;
  document.getElementById('reneg-cliente-id').value = clienteId;
  document.getElementById('reneg-cliente-nome').textContent = c.nome;
  document.getElementById('reneg-saldo').textContent = fmt(saldo);
  document.getElementById('reneg-enc-wrap').style.display = enc>0 ? 'block' : 'none';
  document.getElementById('reneg-enc-valor').textContent = fmt(enc);
  document.querySelector('input[name="reneg-enc"][value="perdoar"]').checked = true;
  document.getElementById('reneg-n').value = 3;
  document.getElementById('reneg-primeiro').value = somarDiasISO(today(), 30);
  document.getElementById('reneg-intervalo').value = 30;
  document.getElementById('reneg-obs').value = '';
  document.getElementById('reneg-anteriores').innerHTML = renegAnterioresHtml(clienteId);
  renegAtualizar();
  document.getElementById('modal-reneg').classList.add('open');
  if(typeof lucide!=='undefined') lucide.createIcons();
}
function confirmarRenegociacao(){
  const d = renegLerForm();
  if(d.erro){ showToast(d.erro,'red'); return; }
  const obs = document.getElementById('reneg-obs').value.trim();
  const txt = 'Renegociar '+fmt(d.saldo)+(d.modo==='incluir'&&d.enc>0?' + '+fmt(d.enc)+' de encargos':'')+' em '+d.n+'x? O saldo atual (inclusive o que está vencido) é substituído pelas novas parcelas. Dá para desfazer depois.';
  confirmarAcao(txt, ()=>aplicarRenegociacao(d, obs));
}
function aplicarRenegociacao(d, obs){
  if(!Array.isArray(state.renegociacoes)) state.renegociacoes = [];
  const id = state.renegociacoes.reduce((m,r)=>Math.max(m,r.id),0) + 1;
  // marca as vendas que estavam em aberto (para travar edição/exclusão e mostrar o selo)
  const mapa = getMapaSituacaoFiado();
  state.vendas.filter(v=>v.clienteId==d.clienteId && v.forma==='fiado' && v.tipo!=='orcamento' && situacaoVenda(v,mapa).status!=='pago')
    .forEach(v=>{ v.renegociadaId = id; });
  // renegociação anterior ainda ativa passa a ser "substituída" (o saldo dela entra na base desta)
  state.renegociacoes.filter(r=>r.clienteId==d.clienteId && !r.substituidaPor).forEach(r=>{ r.substituidaPor = id; });
  state.renegociacoes.push({
    id, clienteId:d.clienteId, data:today(), base:d.saldo, encargos:round2(d.enc), modoEnc:d.modo,
    total:d.total, parcelas:d.parcelas, obs
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
