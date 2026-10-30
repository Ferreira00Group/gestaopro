// ============ APROVAR ORÇAMENTOS EM LOTE (v5.43) ============
// Tela com os orçamentos em RASCUNHO. Marca vários e aprova de uma vez.
// Cada aprovação usa a MESMA regra da individual: aplicarAprovacaoOrcamento() (04-vendas.js) —
// só muda statusOrc para 'aprovado'; não mexe em estoque nem em financeiro (isso só acontece
// quando o orçamento aprovado é convertido em venda).
// Ordem: recém-importados (origem 'importacao') no topo; dentro de cada grupo, os mais novos primeiro.

let aprovarLoteSel = new Set();

function orcamentosRascunho(){
  const lista = state.vendas.filter(v=>v.tipo==='orcamento' && v.statusOrc!=='aprovado');
  const imp = (v)=>v.origem==='importacao' ? 1 : 0;
  return lista.sort((a,b)=>imp(b)-imp(a) || b.id-a.id);
}

function aprovarLoteResumo(){
  const marcados = orcamentosRascunho().filter(v=>aprovarLoteSel.has(v.id));
  return {qtd:marcados.length, total:round2(marcados.reduce((s,v)=>s+(v.total||0),0)), ids:marcados.map(v=>v.id)};
}

function aprovarLoteAtualizarBarra(){
  const barra = document.getElementById('orcaprov-barra');
  if(!barra) return;
  const rascunhos = orcamentosRascunho();
  if(rascunhos.length===0){ barra.innerHTML=''; return; }
  const r = aprovarLoteResumo();
  barra.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <div style="font-size:13px"><strong>${r.qtd}</strong> marcado${r.qtd!==1?'s':''} · total <strong>${fmt(r.total)}</strong></div>
      <button class="btn btn-green" ${r.qtd===0?'disabled style="opacity:.5"':''} onclick="aprovarLoteConfirmar()"><i data-lucide="check-check" class="ic"></i> Aprovar ${r.qtd}</button>
    </div>`;
  const todos = document.getElementById('orcaprov-todos');
  if(todos) todos.checked = rascunhos.length>0 && r.qtd===rascunhos.length;
  if(typeof lucide!=='undefined') lucide.createIcons();
}

function aprovarLoteToggle(id, marcado){
  if(marcado) aprovarLoteSel.add(id); else aprovarLoteSel.delete(id);
  aprovarLoteAtualizarBarra();
}
function aprovarLoteTodos(marcado){
  orcamentosRascunho().forEach(v=>{ if(marcado) aprovarLoteSel.add(v.id); else aprovarLoteSel.delete(v.id); });
  document.querySelectorAll('.orcaprov-check').forEach(cb=>{ cb.checked = marcado; });
  aprovarLoteAtualizarBarra();
}
function aprovarLoteSoImportados(){
  const imp = orcamentosRascunho().filter(v=>v.origem==='importacao');
  aprovarLoteSel = new Set(imp.map(v=>v.id));
  document.querySelectorAll('.orcaprov-check').forEach(cb=>{ cb.checked = aprovarLoteSel.has(parseInt(cb.dataset.id)); });
  aprovarLoteAtualizarBarra();
}

function aprovarLoteCardHtml(v){
  const cli = (getCliente(v.clienteId)||{}).nome || '—';
  const itens = (v.itens||[]).map(it=>escapeHtml(nomeItemVenda(it))+' ×'+it.qtd).join(', ') || 'Sem itens';
  const marcado = aprovarLoteSel.has(v.id);
  return `<label style="display:flex;gap:12px;align-items:flex-start;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:8px;cursor:pointer">
    <input type="checkbox" class="orcaprov-check" data-id="${v.id}" ${marcado?'checked':''} onchange="aprovarLoteToggle(${v.id},this.checked)" style="width:20px;height:20px;margin:2px 0 0;flex-shrink:0;cursor:pointer">
    <div style="min-width:0;flex:1">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">
        <div style="font-weight:700;font-size:14px;min-width:0">${escapeHtml(cli)}</div>
        <div style="font-weight:800;white-space:nowrap">${fmt(v.total)}</div>
      </div>
      <div style="font-size:11px;color:var(--muted);margin:2px 0">OR${String(v.id).padStart(4,'0')} · ${fmtDate(v.data)}</div>
      <div style="font-size:12.5px;color:var(--muted)">${itens}</div>
      ${v.obs?`<div style="font-size:12px;color:var(--muted);font-style:italic;margin-top:2px">${escapeHtml(v.obs)}</div>`:''}
    </div>
  </label>`;
}

function renderAprovarLote(){
  const el = document.getElementById('orcaprov-lista');
  if(!el) return;
  const rascunhos = orcamentosRascunho();
  // descarta marcações de orçamentos que não são mais rascunho (aprovados, excluídos, convertidos)
  const ids = new Set(rascunhos.map(v=>v.id));
  aprovarLoteSel = new Set([...aprovarLoteSel].filter(id=>ids.has(id)));
  if(rascunhos.length===0){
    el.innerHTML = `<div style="text-align:center;padding:60px 20px"><h3 style="color:var(--green)">Nenhum orçamento em rascunho</h3>
      <p style="color:var(--muted);margin-top:8px">Tudo aprovado por aqui.</p></div>`;
    aprovarLoteAtualizarBarra();
    return;
  }
  const imp = rascunhos.filter(v=>v.origem==='importacao');
  const outros = rascunhos.filter(v=>v.origem!=='importacao');
  const titulo = (txt, n)=>`<h3 style="margin:14px 0 8px;font-size:14px">${txt} <span style="color:var(--muted);font-weight:500">(${n})</span></h3>`;
  el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;font-size:13px">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="orcaprov-todos" style="width:18px;height:18px;margin:0" onchange="aprovarLoteTodos(this.checked)"> Selecionar todos (${rascunhos.length})</label>
      ${imp.length?`<button class="btn btn-outline btn-sm" onclick="aprovarLoteSoImportados()">Marcar só os importados</button>`:''}
    </div>
    ${imp.length?titulo('📥 Recém-importados',imp.length)+imp.map(aprovarLoteCardHtml).join(''):''}
    ${outros.length?titulo('Outros rascunhos',outros.length)+outros.map(aprovarLoteCardHtml).join(''):''}`;
  aprovarLoteAtualizarBarra();
}

function aprovarLoteConfirmar(){
  const r = aprovarLoteResumo();
  if(r.qtd===0){ showToast('Marque ao menos um orçamento','red'); return; }
  confirmarAcao('Aprovar '+r.qtd+' orçamento'+(r.qtd!==1?'s':'')+' no total de '+fmt(r.total)+'?', aprovarLoteExecutar);
}
function aprovarLoteExecutar(){
  const r = aprovarLoteResumo();
  let aprovados = 0;
  r.ids.forEach(id=>{
    const o = state.vendas.find(v=>v.id===id);
    if(aplicarAprovacaoOrcamento(o)) aprovados++;
  });
  aprovarLoteSel = new Set();
  if(aprovados>0) marcarAlterado();
  showToast(aprovados+' orçamento'+(aprovados!==1?'s':'')+' aprovado'+(aprovados!==1?'s':'')+' ✓','green');
  renderAprovarLote();
  if(typeof renderDashboard==='function') renderDashboard();
}
