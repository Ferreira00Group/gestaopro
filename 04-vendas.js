// ============ VENDAS (multi-item) ============
let vendaItensTemp=[];
function formaLabel(forma){
  return forma==='fiado'?'📝 Fiado':forma==='dinheiro'?'💵 Dinheiro':forma==='pix'?'⚡ PIX':forma==='cartao'?'💳 Cartão':forma==='misto'?'🔀 Misto':forma;
}
function statusLabel(status){
  if(status==='pago')return{cls:'badge-green',txt:'Pago'};
  if(status==='parcial')return{cls:'badge-yellow',txt:'Parcial'};
  return{cls:'badge-yellow',txt:'Em aberto'};
}
let vendasSelecionadas=new Set();
function statusPedidoLabel(sp){
  if(sp==='entregue') return {cls:'badge-green',txt:'✅ Entregue'};
  return {cls:'badge-orange',txt:'⏳ Em Preparação'};
}
function renderVendas(){
  let list=state.vendas;
  if(state.venda_filter)list=list.filter(v=>getCliente(v.clienteId).nome.toLowerCase().includes(state.venda_filter)||v.itens.some(it=>getNomeCompletoItem(it.produtoId,it.varianteId).toLowerCase().includes(state.venda_filter)));
  if(state.venda_tipo_filter==='orcamento')list=list.filter(v=>v.tipo==='orcamento');
  else if(state.venda_tipo_filter==='fiado')list=list.filter(v=>v.tipo!=='orcamento'&&v.status!=='pago');
  else if(state.venda_tipo_filter==='pago')list=list.filter(v=>v.tipo!=='orcamento'&&v.status==='pago');
  else list=list.filter(v=>v.tipo!=='orcamento');
  list=[...list].sort((a,b)=>b.data.localeCompare(a.data));
  const tb=document.getElementById('vendas-table');
  const tfoot=document.getElementById('vendas-tfoot');
  if(list.length===0){
    tb.innerHTML='<tr><td colspan="10" style="text-align:center;color:var(--muted);padding:24px">Nenhuma venda encontrada</td></tr>';
    if(tfoot) tfoot.innerHTML='';
    return;
  }
  const hoje2=today();
  tb.innerHTML=list.map(v=>{
    const isOrc=v.tipo==='orcamento';
    const itensTxt=v.itens&&v.itens.length>0?v.itens.map(it=>`${getNomeCompletoItem(it.produtoId,it.varianteId)} ×${it.qtd}`).join(', '):(v.parcelaNum?`Parcela ${v.parcelaNum}/${v.parcelaTotal}`:'—');
    const formaTxt=isOrc?'—':(v.pagamentos&&v.pagamentos.length>1?v.pagamentos.map(p=>formaLabel(p.forma)+' '+fmt(p.valor)).join(' + '):(v.parcelaNum?`📝 Fiado (${v.parcelaNum}/${v.parcelaTotal})`:formaLabel(v.forma)));
    const st=statusLabel(v.status);
    const sp=statusPedidoLabel(v.statusPedido);
    const venc=v.vencimento;
    const vencHtml=isOrc?'<span style="color:var(--muted);font-size:12px">—</span>':(venc&&v.status!=='pago'
      ? vencBadge(venc,hoje2)
      : (venc?`<span style="font-size:12px;color:var(--muted)">${fmtDate(venc)}</span>`:'<span style="color:var(--muted);font-size:12px">—</span>'));
    const sel=vendasSelecionadas.has(v.id);
    const orcBadge=v.statusOrc==='aprovado'?{cls:'badge-green',txt:'✅ Aprovado'}:{cls:'badge-yellow',txt:'📝 Rascunho'};
    const statusCell=isOrc?`<span class="badge ${orcBadge.cls}">${orcBadge.txt}</span>`:`<span class="badge ${st.cls}">${st.txt}</span>`;
    const pedidoCell=isOrc?'<span style="color:var(--muted);font-size:12px">—</span>':`<span class="badge ${sp.cls}">${sp.txt}</span>`;
    const acoes=isOrc
      ? `<button class="icon-btn" onclick="exportarOrcamentoWhatsapp(${v.id})" title="Enviar Proposta">📲</button>
         <button class="icon-btn edit" onclick="editarVenda(${v.id})" title="Editar">✏️</button>
         ${v.statusOrc!=='aprovado'?`<button class="icon-btn" onclick="aprovarOrcamento(${v.id})" title="Aprovar">✅</button>`:`<button class="icon-btn" style="color:var(--green)" onclick="converterOrcamentoEmVenda(${v.id})" title="Confirmar Venda">🛒</button>`}
         <button class="icon-btn del" onclick="excluirVenda(${v.id})" title="Excluir">🗑️</button>`
      : `<button class="icon-btn" onclick="abrirRecibo(${v.id})" title="Recibo">🧾</button>
         <button class="icon-btn" onclick="duplicarVenda(${v.id})" title="Duplicar">📑</button>
         <button class="icon-btn edit" onclick="editarVenda(${v.id})" title="Editar">✏️</button>
         <button class="icon-btn del" onclick="excluirVenda(${v.id})" title="Excluir">🗑️</button>`;
    return `<tr style="${sel?'background:#EBF5FB;':''}" id="venda-row-${v.id}">
    <td><input type="checkbox" class="venda-check" data-id="${v.id}" ${sel?'checked':''} onchange="toggleSelecaoVenda(${v.id},this.checked)" style="cursor:pointer;width:15px;height:15px"></td>
    <td data-label="Código" style="font-size:11px;font-weight:700;color:var(--muted);white-space:nowrap">${isOrc?'OR':'VD'}${String(v.id).padStart(4,'0')}</td>
    <td data-label="Data">${fmtDate(v.data)}</td>
    <td data-label="Cliente"><strong>${getCliente(v.clienteId).nome}</strong></td>
    <td data-label="Itens" class="td-block" style="max-width:200px;white-space:normal">${itensTxt}</td>
    <td data-label="Total"><strong>${fmt(v.total)}</strong></td>
    <td data-label="Forma" style="font-size:12px">${formaTxt}</td>
    <td data-label="Vencimento">${vencHtml}</td>
    <td data-label="Pedido">${pedidoCell}</td>
    <td data-label="Status">${statusCell}</td>
    <td><div class="actions-cell">${acoes}</div></td>
  </tr>`;}).join('');

  // TOTALIZADOR RODAPÉ
  const listVendasOnly=list.filter(v=>v.tipo!=='orcamento');
  const totalPago=listVendasOnly.filter(v=>v.status==='pago').reduce((s,v)=>s+v.total,0);
  const totalAberto=listVendasOnly.filter(v=>v.status!=='pago').reduce((s,v)=>s+v.total,0);
  const totalGeral=list.reduce((s,v)=>s+v.total,0);
  if(tfoot) tfoot.innerHTML=`<tr style="background:#FAFBFC;border-top:2px solid var(--border)">
    <td colspan="6" style="padding:11px 14px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--muted)">
      TOTAL (${list.length} ${state.venda_tipo_filter==='orcamento'?'orçamento':'venda'}${list.length!==1?'s':''} filtrada${list.length!==1?'s':''})
    </td>
    <td style="padding:11px 14px;font-size:14px;font-weight:800;color:var(--navy)">${fmt(totalGeral)}</td>
    <td colspan="4" style="padding:11px 14px;font-size:12px;color:var(--muted)">
      <span style="color:var(--green);font-weight:600">${fmt(totalPago)} pagos</span>
      <span style="margin:0 6px;opacity:.4">·</span>
      <span style="color:var(--red);font-weight:600">${fmt(totalAberto)} em aberto</span>
    </td>
  </tr>`;

  // sync check-all state
  const allCheck=document.getElementById('vendas-check-all');
  if(allCheck) allCheck.checked=list.length>0&&list.every(v=>vendasSelecionadas.has(v.id));
  atualizarBarraLote();
}
function toggleSelecaoVenda(id,checked){
  if(checked) vendasSelecionadas.add(id);
  else vendasSelecionadas.delete(id);
  const row=document.getElementById('venda-row-'+id);
  if(row) row.style.background=checked?'#EBF5FB':'';
  // sync check-all
  const boxes=document.querySelectorAll('.venda-check');
  const allCheck=document.getElementById('vendas-check-all');
  if(allCheck) allCheck.checked=boxes.length>0&&[...boxes].every(b=>b.checked);
  atualizarBarraLote();
}
function toggleTodosVendas(checked){
  document.querySelectorAll('.venda-check').forEach(b=>{
    const id=parseInt(b.dataset.id);
    b.checked=checked;
    if(checked) vendasSelecionadas.add(id);
    else vendasSelecionadas.delete(id);
    const row=document.getElementById('venda-row-'+id);
    if(row) row.style.background=checked?'#EBF5FB':'';
  });
  atualizarBarraLote();
}
function atualizarBarraLote(){
  const bar=document.getElementById('vendas-lote-bar');
  const lbl=document.getElementById('vendas-lote-label');
  if(!bar) return;
  const n=vendasSelecionadas.size;
  if(n>0){
    bar.style.display='flex';
    const total=[...vendasSelecionadas].reduce((s,id)=>{const v=state.vendas.find(v=>v.id===id);return s+(v?v.total:0);},0);
    lbl.textContent=`${n} venda${n!==1?'s':''} selecionada${n!==1?'s':''} — Total: ${fmt(total)}`;
  } else {
    bar.style.display='none';
  }
}
function limparSelecaoVendas(){
  vendasSelecionadas.clear();
  renderVendas();
}
function marcarLotePago(){
  if(vendasSelecionadas.size===0) return;
  const ids=[...vendasSelecionadas];
  const pagas=ids.filter(id=>{const v=state.vendas.find(v=>v.id===id);return v&&v.status==='pago';});
  const aPagar=ids.length-pagas.length;
  if(aPagar===0){showToast('Todas as selecionadas já estão pagas','green');return;}
  confirmarAcao(`Marcar ${aPagar} venda${aPagar!==1?'s':''} como paga${aPagar!==1?'s':''}? Esta ação não pode ser desfeita.`,()=>{
    const hj=today();
    ids.forEach(id=>{
      const v=state.vendas.find(v=>v.id===id);
      if(!v||v.status==='pago') return;
      v.status='pago';
      // registra pagamento automático se fiado
      if(v.forma==='fiado'||v.forma==='misto'){
        const saldo=getSaldoCliente(v.clienteId);
        if(saldo>0){
          state.pagamentos.push({id:nextId('pagamentos'),clienteId:v.clienteId,valor:v.total,forma:'Lote',obs:'Marcado em lote',data:hj});
        }
      }
    });
    marcarAlterado();salvarDados();
    vendasSelecionadas.clear();
    renderVendas();renderDashboard();renderClientes();
    showToast(`${aPagar} venda${aPagar!==1?'s':''} marcada${aPagar!==1?'s':''} como paga${aPagar!==1?'s':''}!`,'green');
  });
}
function filterVendas(v){state.venda_filter=v.toLowerCase();renderVendas();}
const filterVendasDebounced=debounce(filterVendas);
function filterVendaTipo(v){state.venda_tipo_filter=v;const sel=document.getElementById('venda-tipo-filter-select');if(sel)sel.value=v;renderVendas();}

function opcoesProdutosSelect(selectedProdutoId,selectedVarianteId){
  return '<option value="">Selecione...</option>'+state.produtos.map(p=>{
    if(p.variantes&&p.variantes.length>0){
      return p.variantes.map(v=>`<option value="${p.id}::${v.id}" data-preco="${p.preco}" ${p.id==selectedProdutoId&&v.id==selectedVarianteId?'selected':''}>${p.nome} — ${v.nome} (est: ${v.estoque})</option>`).join('');
    }
    return `<option value="${p.id}::" data-preco="${p.preco}" ${p.id==selectedProdutoId&&!selectedVarianteId?'selected':''}>${p.nome} (est: ${p.estoque})</option>`;
  }).join('');
}
function criarLinhaItemVenda(item){
  item=item||{produtoId:'',varianteId:null,qtd:1,preco:0};
  const uid='vi'+Math.random().toString(36).slice(2,9);
  return {uid,...item};
}
function renderVendaItensLista(){
  const el=document.getElementById('venda-itens-lista');
  el.innerHTML=vendaItensTemp.map((it,i)=>`
    <div class="orcamento-item-linha" data-uid="${it.uid}">
      <select class="form-control" style="flex:2" onchange="atualizarItemVenda('${it.uid}','produto',this.value)">
        ${opcoesProdutosSelect(it.produtoId,it.varianteId)}
      </select>
      <input type="number" min="1" value="${it.qtd}" class="form-control" style="width:64px" oninput="atualizarItemVenda('${it.uid}','qtd',this.value)">
      <input type="number" step="0.01" value="${it.preco}" class="form-control" style="width:84px" oninput="atualizarItemVenda('${it.uid}','preco',this.value)">
      <button class="icon-btn del" onclick="removerItemVenda('${it.uid}')">✕</button>
    </div>
  `).join('');
  calcTotalVendaGeral();
}
function atualizarItemVenda(uid,campo,valor){
  const it=vendaItensTemp.find(x=>x.uid===uid);
  if(!it)return;
  if(campo==='produto'){
    const [pid,vid]=valor.split('::');
    it.produtoId=pid?parseInt(pid):'';
    it.varianteId=vid?parseInt(vid):null;
    const precoBase=getProduto(it.produtoId)?.preco||0;
    const canalId=parseInt(document.getElementById('venda-canal')?.value)||null;
    const canal=canalId?(state.canais||[]).find(c=>c.id===canalId):null;
    it.preco=canal?getPrecoCanal(precoBase,canal):precoBase;
    renderVendaItensLista();
    return;
  }
  if(campo==='qtd')it.qtd=parseInt(valor)||1;
  if(campo==='preco')it.preco=parseFloat(valor)||0;
  calcTotalVendaGeral();
}
function adicionarItemVenda(){
  vendaItensTemp.push(criarLinhaItemVenda());
  renderVendaItensLista();
}
function removerItemVenda(uid){
  vendaItensTemp=vendaItensTemp.filter(x=>x.uid!==uid);
  renderVendaItensLista();
}
function calcTotalVendaGeral(){
  const totalCheio=vendaItensTemp.reduce((s,it)=>{
    if(!it.produtoId)return s;
    const precoBase=getProduto(it.produtoId)?.preco||0;
    return s+((it.qtd||0)*precoBase);
  },0);
  const el=document.getElementById('venda-total-geral');
  if(el)el.textContent=fmt(totalCheio);
  const totalComCanal=vendaItensTemp.reduce((s,it)=>s+((it.qtd||0)*(it.preco||0)),0);
  const descontoExtra=parseFloat(document.getElementById('venda-desconto-extra')?.value)||0;
  const totalFinal=Math.max(0,totalComCanal-descontoExtra);
  const elFinal=document.getElementById('venda-total-final');
  if(elFinal)elFinal.textContent=fmt(totalFinal);
  atualizarRestantePagamentoMisto();
  return totalFinal;
}
function popularCanalVenda(){
  const sel=document.getElementById('venda-canal');
  if(!sel)return;
  const vAtual=sel.value;
  sel.innerHTML='<option value="">Preço cheio (sem canal)</option>'+(state.canais||[]).map(c=>{
    const sinal=c.desconto>0?'−':c.desconto<0?'+':'';
    return `<option value="${c.id}">${c.nome} (${sinal}${Math.abs(c.desconto||0)}%)</option>`;
  }).join('');
  sel.value=vAtual;
}
function aplicarCanalVenda(){
  const canalId=parseInt(document.getElementById('venda-canal').value)||null;
  const canal=canalId?(state.canais||[]).find(c=>c.id===canalId):null;
  vendaItensTemp.forEach(it=>{
    if(!it.produtoId)return;
    const precoBase=getProduto(it.produtoId)?.preco||0;
    it.preco=canal?getPrecoCanal(precoBase,canal):precoBase;
  });
  renderVendaItensLista();
}

// ── Pagamento misto ──
let vendaPagamentosTemp=[];
function toggleVendaPagamentoMisto(){
  const check=document.getElementById('venda-pag-misto-check');
  const wrapMisto=document.getElementById('venda-pag-misto-wrap');
  const selectUnico=document.getElementById('venda-forma');
  if(check.checked){
    selectUnico.style.display='none';
    wrapMisto.style.display='block';
    if(vendaPagamentosTemp.length===0){
      vendaPagamentosTemp=[{uid:'pg'+Date.now(),forma:'dinheiro',valor:0}];
    }
    renderPagamentosMistoLista();
  } else {
    selectUnico.style.display='block';
    wrapMisto.style.display='none';
  }
}
function renderPagamentosMistoLista(){
  const el=document.getElementById('venda-pag-misto-lista');
  el.innerHTML=vendaPagamentosTemp.map(pg=>`
    <div style="display:flex;gap:6px;margin-bottom:6px">
      <select class="form-control" style="flex:1" onchange="atualizarPagamentoMisto('${pg.uid}','forma',this.value)">
        <option value="dinheiro" ${pg.forma==='dinheiro'?'selected':''}>💵 Dinheiro</option>
        <option value="pix" ${pg.forma==='pix'?'selected':''}>⚡ PIX</option>
        <option value="cartao" ${pg.forma==='cartao'?'selected':''}>💳 Cartão</option>
        <option value="fiado" ${pg.forma==='fiado'?'selected':''}>📝 Fiado</option>
      </select>
      <input type="number" step="0.01" value="${pg.valor}" class="form-control" style="width:110px" oninput="atualizarPagamentoMisto('${pg.uid}','valor',this.value)" placeholder="0,00">
      <button class="icon-btn del" onclick="removerPagamentoMisto('${pg.uid}')">✕</button>
    </div>
  `).join('');
  atualizarRestantePagamentoMisto();
}
function atualizarPagamentoMisto(uid,campo,valor){
  const pg=vendaPagamentosTemp.find(x=>x.uid===uid);
  if(!pg)return;
  pg[campo]=campo==='valor'?(parseFloat(valor)||0):valor;
  atualizarRestantePagamentoMisto();
}
function adicionarPagamentoMisto(){
  vendaPagamentosTemp.push({uid:'pg'+Date.now()+Math.random().toString(36).slice(2,5),forma:'dinheiro',valor:0});
  renderPagamentosMistoLista();
}
function removerPagamentoMisto(uid){
  vendaPagamentosTemp=vendaPagamentosTemp.filter(x=>x.uid!==uid);
  renderPagamentosMistoLista();
}
function atualizarRestantePagamentoMisto(){
  const el=document.getElementById('venda-pag-misto-restante');
  if(!el)return;
  const total=calcTotalVendaGeralSemRecursao();
  const alocado=vendaPagamentosTemp.reduce((s,pg)=>s+(pg.valor||0),0);
  const restante=total-alocado;
  el.textContent=fmt(restante);
  el.style.color=Math.abs(restante)<0.01?'var(--green)':'var(--red)';
}
function calcTotalVendaGeralSemRecursao(){
  const total=vendaItensTemp.reduce((s,it)=>s+((it.qtd||0)*(it.preco||0)),0);
  const descontoExtra=parseFloat(document.getElementById('venda-desconto-extra')?.value)||0;
  return Math.max(0,total-descontoExtra);
}

function setVendaTipo(tipo){
  document.getElementById('venda-tipo').value=tipo;
  const btnV=document.getElementById('venda-tipo-btn-venda');
  const btnO=document.getElementById('venda-tipo-btn-orcamento');
  const camposVenda=document.getElementById('venda-campos-venda');
  const btnSalvar=document.getElementById('venda-btn-salvar');
  if(tipo==='orcamento'){
    btnV.className='btn btn-outline btn-sm';
    btnO.className='btn btn-sm';
    camposVenda.style.display='none';
    btnSalvar.textContent='💾 Salvar Orçamento';
    btnSalvar.className='btn btn-primary';
  } else {
    btnV.className='btn btn-sm';
    btnO.className='btn btn-outline btn-sm';
    camposVenda.style.display='block';
    btnSalvar.textContent='✓ Confirmar Venda';
    btnSalvar.className='btn btn-green';
  }
}
function abrirNovaVenda(){
  const cs=document.getElementById('venda-cliente');
  cs.innerHTML='<option value="">Selecione...</option>'+state.clientes.map(c=>`<option value="${c.id}">${c.nome}</option>`).join('');
  document.getElementById('venda-edit-id').value='';
  document.getElementById('venda-obs').value='';
  document.getElementById('venda-vencimento').value='';
  document.getElementById('venda-forma').value='fiado';
  document.getElementById('venda-pag-misto-check').checked=false;
  document.getElementById('venda-pag-misto-wrap').style.display='none';
  document.getElementById('venda-forma').style.display='block';
  document.getElementById('venda-parcelar-check').checked=false;
  document.getElementById('venda-parcelas-wrap').style.display='none';
  document.getElementById('venda-fiado-wrap').style.display='block';
  vendaPagamentosTemp=[];
  document.getElementById('modal-venda-title').textContent='Nova Venda';
  vendaItensTemp=[criarLinhaItemVenda()];
  renderVendaItensLista();
  popularCanalVenda();
  calcTotalVendaGeral();
  document.getElementById('venda-tipo-toggle-wrap').style.display='block';
  setVendaTipo('venda');
  document.getElementById('modal-venda').classList.add('open');
}
function duplicarVenda(id){
  const v=state.vendas.find(v=>v.id===id);
  if(!v){showToast('Venda não encontrada','red');return;}
  const cs=document.getElementById('venda-cliente');
  cs.innerHTML='<option value="">Selecione...</option>'+state.clientes.map(c=>`<option value="${c.id}">${c.nome}</option>`).join('');
  document.getElementById('venda-edit-id').value='';
  document.getElementById('modal-venda-title').textContent='Nova Venda (duplicada)';
  document.getElementById('venda-cliente').value=v.clienteId;
  document.getElementById('venda-forma').value=v.forma==='fiado'?'fiado':v.forma;
  document.getElementById('venda-obs').value=v.obs||'';
  document.getElementById('venda-pag-misto-check').checked=false;
  document.getElementById('venda-pag-misto-wrap').style.display='none';
  document.getElementById('venda-forma').style.display='block';
  vendaPagamentosTemp=[];
  vendaItensTemp=v.itens.map(it=>criarLinhaItemVenda({produtoId:it.produtoId,varianteId:it.varianteId,qtd:it.qtd,preco:it.preco}));
  renderVendaItensLista();
  popularCanalVenda();
  document.getElementById('venda-canal').value=v.canalId||'';
  document.getElementById('venda-desconto-extra').value=v.descontoExtra||'';
  calcTotalVendaGeral();
  document.getElementById('venda-tipo-toggle-wrap').style.display='block';
  setVendaTipo('venda');
  document.getElementById('modal-venda').classList.add('open');
  showToast('Venda duplicada — confira o estoque e confirme','green');
}
function clearVendaForm(){
  document.getElementById('venda-edit-id').value='';
  document.getElementById('venda-parcelar-check').checked=false;
  document.getElementById('venda-parcelas-wrap').style.display='none';
  document.getElementById('venda-num-parcelas').value=2;
  document.getElementById('venda-parcelas-lista').innerHTML='';
  popularCanalVenda();
  document.getElementById('venda-canal').value='';
  document.getElementById('venda-desconto-extra').value='';
}
function toggleParcelasVenda(){
  const checked = document.getElementById('venda-parcelar-check').checked;
  document.getElementById('venda-parcelas-wrap').style.display = checked ? 'block' : 'none';
  if(checked) gerarParcelasVenda();
}
function gerarParcelasVenda(){
  const n = parseInt(document.getElementById('venda-num-parcelas').value) || 2;
  const baseDate = document.getElementById('venda-vencimento').value || today();
  const el = document.getElementById('venda-parcelas-lista');
  if(n < 2 || n > 24){el.innerHTML='<p style="color:var(--red);font-size:12px">Entre 2 e 24 parcelas</p>';return;}
  // gera datas mensais a partir da data de vencimento
  const linhas = [];
  for(let i=0;i<n;i++){
    const d = new Date(baseDate+'T00:00:00');
    d.setMonth(d.getMonth()+i);
    const ds = d.toISOString().slice(0,10);
    linhas.push(`<div class="parcela-linha">
      <span class="parcela-num">${i+1}×</span>
      <input class="form-control" type="date" id="parcela-data-${i}" value="${ds}" style="max-width:160px;padding:7px 10px;font-size:13px">
      <span style="font-size:12px;color:var(--muted)">vencimento</span>
    </div>`);
  }
  el.innerHTML = linhas.join('');
}

function salvarVenda(){
  const eid=document.getElementById('venda-edit-id').value;
  const clienteId=parseInt(document.getElementById('venda-cliente').value);
  const obs=document.getElementById('venda-obs').value;
  const itensValidos=vendaItensTemp.filter(it=>it.produtoId&&it.qtd>0);
  if(!clienteId||itensValidos.length===0){showToast('Selecione o cliente e ao menos um item','red');return;}

  const tipo=document.getElementById('venda-tipo').value;
  const canalId=parseInt(document.getElementById('venda-canal').value)||null;
  const descontoExtra=parseFloat(document.getElementById('venda-desconto-extra').value)||0;

  if(tipo==='orcamento'){
    const itensFinalOrc=itensValidos.map(it=>({produtoId:it.produtoId,varianteId:it.varianteId||null,qtd:it.qtd,preco:it.preco,total:it.qtd*it.preco}));
    const totalOrc=Math.max(0,itensFinalOrc.reduce((s,it)=>s+it.total,0)-descontoExtra);
    if(eid){
      const o=state.vendas.find(v=>v.id==eid);
      o.clienteId=clienteId;o.itens=itensFinalOrc;o.total=totalOrc;o.obs=obs;o.canalId=canalId;o.descontoExtra=descontoExtra;
      showToast('Orçamento atualizado','green');
    } else {
      state.vendas.push({id:nextId('vendas'),clienteId,itens:itensFinalOrc,total:totalOrc,obs,canalId,descontoExtra,tipo:'orcamento',statusOrc:'rascunho',status:'em_aberto',data:today()});
      showToast('Orçamento criado','green');
    }
    marcarAlterado();
    closeModal('modal-venda');renderVendas();renderDashboard();
    return;
  }

  const pagMisto=document.getElementById('venda-pag-misto-check').checked;
  const statusPedido=document.getElementById('venda-status-pedido').value||'preparando';

  let forma, pagamentos=null;
  const total0=Math.max(0,itensValidos.reduce((s,it)=>s+(it.qtd*it.preco),0)-descontoExtra);
  if(pagMisto){
    const pagsValidos=vendaPagamentosTemp.filter(pg=>pg.valor>0);
    const alocado=pagsValidos.reduce((s,pg)=>s+pg.valor,0);
    if(pagsValidos.length===0||Math.abs(alocado-total0)>0.01){showToast(`O valor dividido (${fmt(alocado)}) precisa ser igual ao total da venda (${fmt(total0)})`,'red');return;}
    pagamentos=pagsValidos.map(pg=>({forma:pg.forma,valor:pg.valor}));
    forma=pagamentos.length===1?pagamentos[0].forma:'misto';
  } else {
    forma=document.getElementById('venda-forma').value;
  }

  // valida vencimento obrigatório para fiado
  const vencimento=document.getElementById('venda-vencimento').value||null;
  const temFiado=pagamentos?pagamentos.some(p=>p.forma==='fiado'):(forma==='fiado');
  if(temFiado&&!vencimento){showToast('Informe a data de vencimento para venda fiado','red');document.getElementById('venda-vencimento').focus();return;}

  // valida estoque (somando itens repetidos do mesmo produto/variante)
  const necessidade={};
  itensValidos.forEach(it=>{const k=`${it.produtoId}::${it.varianteId||''}`;necessidade[k]=(necessidade[k]||0)+it.qtd;});
  if(!eid){
    for(const k in necessidade){
      const [pid,vid]=k.split('::');
      const disp=getEstoqueAtual(parseInt(pid),vid?parseInt(vid):null);
      if(disp<necessidade[k]){showToast(`Estoque insuficiente: ${getNomeCompletoItem(parseInt(pid),vid?parseInt(vid):null)} (disp: ${disp})`,'red');return;}
    }
  }
  const itensFinal=itensValidos.map(it=>({produtoId:it.produtoId,varianteId:it.varianteId||null,qtd:it.qtd,preco:it.preco,total:it.qtd*it.preco}));
  const totalBruto=itensFinal.reduce((s,it)=>s+it.total,0);
  const total=Math.max(0,totalBruto-descontoExtra);
  // se tem qualquer parcela fiado (puro ou dentro do misto), considera em_aberto a parte fiada
  const valorFiado=pagamentos?(pagamentos.find(p=>p.forma==='fiado')?.valor||0):(forma==='fiado'?total:0);
  const status=valorFiado>0?(valorFiado>=total-0.01?'em_aberto':'parcial'):'pago';
  const parcelar = document.getElementById('venda-parcelar-check').checked && forma==='fiado' && !pagMisto;
  const numParcelas = parcelar ? (parseInt(document.getElementById('venda-num-parcelas').value)||2) : 1;

  if(eid){
    const v=state.vendas.find(v=>v.id==eid);
    v.itens.forEach(it=>ajustarEstoque(it.produtoId,it.varianteId,it.qtd));
    v.clienteId=clienteId;v.itens=itensFinal;v.total=total;v.forma=forma;v.pagamentos=pagamentos;v.status=status;v.obs=obs;v.vencimento=vencimento;v.statusPedido=statusPedido;v.canalId=canalId;v.descontoExtra=descontoExtra;v.tipo='venda';delete v.statusOrc;
    itensFinal.forEach(it=>ajustarEstoque(it.produtoId,it.varianteId,-it.qtd));
    showToast('Venda atualizada','green');
  } else if(parcelar && numParcelas >= 2){
    // gera uma parcela por vez, deduz estoque apenas na primeira
    const totalParcela = parseFloat((total/numParcelas).toFixed(2));
    for(let i=0;i<numParcelas;i++){
      const dataParc = document.getElementById(`parcela-data-${i}`)?.value || vencimento;
      const valParc = i===numParcelas-1 ? parseFloat((total-(totalParcela*(numParcelas-1))).toFixed(2)) : totalParcela;
      // itensFinal só vai na primeira parcela para não duplicar estoque
      const itensParc = i===0 ? itensFinal : itensFinal.map(it=>({...it,qtd:0,total:0}));
      state.vendas.push({
        id:nextId('vendas'),clienteId,
        itens: i===0 ? itensFinal : [],
        total:valParc,forma:'fiado',pagamentos:null,status:'em_aberto',
        data:today(),obs:(obs?(obs+' · '):'')+'Parcela '+(i+1)+'/'+numParcelas,
        vencimento:dataParc,parcelaDe:total,parcelaNum:i+1,parcelaTotal:numParcelas,statusPedido,canalId,descontoExtra:i===0?descontoExtra:0,tipo:'venda'
      });
    }
    itensFinal.forEach(it=>ajustarEstoque(it.produtoId,it.varianteId,-it.qtd));
    showToast(`Venda parcelada em ${numParcelas}x criada! ✓`,'green');
  } else {
    state.vendas.push({id:nextId('vendas'),clienteId,itens:itensFinal,total,forma,pagamentos,status,data:today(),obs,vencimento,statusPedido,canalId,descontoExtra,tipo:'venda'});
    itensFinal.forEach(it=>ajustarEstoque(it.produtoId,it.varianteId,-it.qtd));
    const valorNaoFiado=total-valorFiado;
    if(valorNaoFiado>0.01){
      const desc=itensFinal.map(it=>getNomeCompletoItem(it.produtoId,it.varianteId)).join(', ');
      state.financeiro.push({id:nextId('financeiro'),tipo:'entrada',desc:`Venda ${desc} - ${getCliente(clienteId).nome}${pagamentos?' (pagamento misto)':''}`,valor:valorNaoFiado,data:today()});
    }
    showToast('Venda registrada! ✓','green');
  }
  marcarAlterado();
  closeModal('modal-venda');renderVendas();renderDashboard();renderEstoque();
}
function editarVenda(id){
  const v=state.vendas.find(v=>v.id===id);
  const cs=document.getElementById('venda-cliente');
  cs.innerHTML='<option value="">Selecione...</option>'+state.clientes.map(c=>`<option value="${c.id}">${c.nome}</option>`).join('');
  document.getElementById('venda-edit-id').value=id;
  const isOrc=v.tipo==='orcamento';
  document.getElementById('modal-venda-title').textContent=isOrc?'Editar Orçamento':'Editar Venda';
  document.getElementById('venda-cliente').value=v.clienteId;
  document.getElementById('venda-obs').value=v.obs||'';
  document.getElementById('venda-vencimento').value=v.vencimento||'';
  document.getElementById('venda-status-pedido').value=v.statusPedido||'preparando';
  if(v.pagamentos&&v.pagamentos.length>0){
    document.getElementById('venda-pag-misto-check').checked=true;
    document.getElementById('venda-pag-misto-wrap').style.display='block';
    document.getElementById('venda-forma').style.display='none';
    vendaPagamentosTemp=v.pagamentos.map(pg=>({uid:'pg'+Math.random().toString(36).slice(2,9),forma:pg.forma,valor:pg.valor}));
    renderPagamentosMistoLista();
  } else {
    document.getElementById('venda-pag-misto-check').checked=false;
    document.getElementById('venda-pag-misto-wrap').style.display='none';
    document.getElementById('venda-forma').style.display='block';
    document.getElementById('venda-forma').value=v.forma||'fiado';
    vendaPagamentosTemp=[];
  }
  vendaItensTemp=v.itens.map(it=>criarLinhaItemVenda({produtoId:it.produtoId,varianteId:it.varianteId,qtd:it.qtd,preco:it.preco}));
  renderVendaItensLista();
  popularCanalVenda();
  document.getElementById('venda-canal').value=v.canalId||'';
  document.getElementById('venda-desconto-extra').value=v.descontoExtra||'';
  calcTotalVendaGeral();
  document.getElementById('venda-tipo-toggle-wrap').style.display=isOrc?'block':'none';
  setVendaTipo(isOrc?'orcamento':'venda');
  document.getElementById('modal-venda').classList.add('open');
}
function excluirVenda(id){
  confirmarAcao('Excluir esta venda? O estoque será restaurado.',()=>{
    const v=state.vendas.find(v=>v.id===id);
    v.itens.forEach(it=>ajustarEstoque(it.produtoId,it.varianteId,it.qtd));
    state.vendas=state.vendas.filter(v=>v.id!==id);
    marcarAlterado();salvarDados();
    showToast('Venda excluída','green');renderVendas();renderDashboard();renderEstoque();
  });
}

// ── Recibo de venda ──
let reciboVendaIdAtual=null;
function gerarTextoRecibo(v){
  const c=getCliente(v.clienteId);
  const linhas=v.itens.map(it=>`${getNomeCompletoItem(it.produtoId,it.varianteId)} — ${it.qtd}x ${fmt(it.preco)} = ${fmt(it.total)}`);
  const pagTxt=v.pagamentos&&v.pagamentos.length>1
    ? v.pagamentos.map(p=>`${formaLabel(p.forma)}: ${fmt(p.valor)}`).join(' | ')
    : formaLabel(v.forma);
  return {c,linhas,pagTxt};
}
function abrirRecibo(id){
  const v=state.vendas.find(v=>v.id===id);
  if(!v)return;
  reciboVendaIdAtual=id;
  const {c,linhas,pagTxt}=gerarTextoRecibo(v);
  document.getElementById('recibo-conteudo').innerHTML=`
    <div style="text-align:center;margin-bottom:10px">
      <strong style="font-size:15px">GestãoPRO</strong><br>
      <span style="font-size:11px;color:var(--muted)">Recibo de Venda</span>
    </div>
    <hr style="border:none;border-top:1px dashed var(--border);margin:10px 0">
    <div><strong>Nº:</strong> VD${String(v.id).padStart(4,'0')}</div>
    <div><strong>Cliente:</strong> ${c.nome}</div>
    <div><strong>Data:</strong> ${fmtDate(v.data)}</div>
    <hr style="border:none;border-top:1px dashed var(--border);margin:10px 0">
    ${linhas.map(l=>`<div>${l}</div>`).join('')}
    ${v.descontoExtra>0?`<div style="margin-top:6px;font-size:12px;color:var(--red)">Desconto: −${fmt(v.descontoExtra)}</div>`:''}
    <hr style="border:none;border-top:1px dashed var(--border);margin:10px 0">
    <div style="display:flex;justify-content:space-between;font-weight:800;font-size:15px"><span>TOTAL</span><span>${fmt(v.total)}</span></div>
    <div style="margin-top:6px;font-size:12px;color:var(--muted)"><strong>Pagamento:</strong> ${pagTxt}</div>
    <div style="margin-top:6px;font-size:12px;color:${v.status==='pago'?'var(--green)':'var(--red)'}"><strong>Status:</strong> ${statusLabel(v.status).txt}</div>
    <div style="margin-top:6px;font-size:12px"><strong>Pedido:</strong> ${statusPedidoLabel(v.statusPedido).txt}</div>
    ${v.obs?`<div style="margin-top:8px;font-size:12px;color:var(--muted)"><strong>Obs:</strong> ${v.obs}</div>`:''}
  `;
  document.getElementById('modal-recibo').classList.add('open');
}
function imprimirRecibo(){
  const conteudo=document.getElementById('recibo-conteudo').innerHTML;
  const w=window.open('','_blank');
  w.document.write(`<html><head><title>Recibo</title><style>body{font-family:Arial,sans-serif;max-width:380px;margin:24px auto;font-size:13px;line-height:1.6}hr{border:none;border-top:1px dashed #ccc;margin:10px 0}</style></head><body>${conteudo}</body></html>`);
  w.document.close();w.print();
}
function enviarReciboWhatsapp(){
  const v=state.vendas.find(v=>v.id===reciboVendaIdAtual);
  if(!v)return;
  const {c,linhas,pagTxt}=gerarTextoRecibo(v);
  const vencimentoLinha=v.vencimento?`\n📅 Vencimento: ${fmtDate(v.vencimento)}`:'';
  const descontoLinha=v.descontoExtra>0?`\n🏷️ Desconto: −${fmt(v.descontoExtra)}`:'';
  const pedidoTxt=(v.statusPedido&&v.statusPedido!=='indefinido')?statusPedidoLabel(v.statusPedido).txt.replace(/^\S+\s/,''):'';
  const statusPedidoLinha=pedidoTxt?`\n📦 Pedido: ${pedidoTxt}`:'';
  const msg=`🧾 *Recibo de Venda — GestãoPRO*\n\nNº: VD${String(v.id).padStart(4,'0')}\nCliente: ${c.nome}\nData: ${fmtDate(v.data)}\n\n${linhas.join('\n')}${descontoLinha}\n\n*Total: ${fmt(v.total)}*\nPagamento: ${pagTxt}${vencimentoLinha}${statusPedidoLinha}${v.obs?`\nObs: ${v.obs}`:''}\n\nObrigado pela compra! 😊`;
  const tel=(c.tel||'').replace(/\D/g,'');
  if(tel){
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`,'_blank');
  } else {
    navigator.clipboard?.writeText(msg);
    showToast('Cliente sem telefone — texto copiado para a área de transferência','green');
  }
}

// ============ ORÇAMENTO (absorvido pela Venda) ============
function abrirNovoOrcamento(){
  const cs=document.getElementById('venda-cliente');
  cs.innerHTML='<option value="">Selecione...</option>'+state.clientes.map(c=>`<option value="${c.id}">${c.nome}</option>`).join('');
  document.getElementById('venda-edit-id').value='';
  document.getElementById('venda-obs').value='';
  document.getElementById('venda-vencimento').value='';
  document.getElementById('venda-forma').value='fiado';
  document.getElementById('venda-pag-misto-check').checked=false;
  document.getElementById('venda-pag-misto-wrap').style.display='none';
  document.getElementById('venda-forma').style.display='block';
  document.getElementById('venda-parcelar-check').checked=false;
  document.getElementById('venda-parcelas-wrap').style.display='none';
  vendaPagamentosTemp=[];
  document.getElementById('modal-venda-title').textContent='Novo Orçamento';
  vendaItensTemp=[criarLinhaItemVenda()];
  renderVendaItensLista();
  popularCanalVenda();
  document.getElementById('venda-canal').value='';
  document.getElementById('venda-desconto-extra').value='';
  calcTotalVendaGeral();
  document.getElementById('venda-tipo-toggle-wrap').style.display='block';
  setVendaTipo('orcamento');
  document.getElementById('modal-venda').classList.add('open');
}
function aprovarOrcamento(id){
  const o=state.vendas.find(v=>v.id===id);
  if(!o)return;
  o.statusOrc='aprovado';
  marcarAlterado();
  showToast('Orçamento aprovado ✓','green');renderVendas();renderDashboard();
}
function converterOrcamentoEmVenda(id){
  const o=state.vendas.find(v=>v.id===id);
  if(!o){showToast('Orçamento não encontrado','red');return;}
  const necessidade={};
  o.itens.forEach(it=>{const k=`${it.produtoId}::${it.varianteId||''}`;necessidade[k]=(necessidade[k]||0)+it.qtd;});
  for(const k in necessidade){
    const [pid,vid]=k.split('::');
    const disp=getEstoqueAtual(parseInt(pid),vid?parseInt(vid):null);
    if(disp<necessidade[k]){showToast(`Estoque insuficiente: ${getNomeCompletoItem(parseInt(pid),vid?parseInt(vid):null)}`,'red');return;}
  }
  abrirConfirmacaoConverterOrcamento(o);
}
function abrirConfirmacaoConverterOrcamento(o){
  let modal=document.getElementById('modal-converter-orc');
  if(!modal){
    modal=document.createElement('div');
    modal.id='modal-converter-orc';
    modal.className='modal-overlay';
    modal.innerHTML=`<div class="modal" style="max-width:360px">
      <div class="modal-header"><h3>Confirmar Conversão</h3></div>
      <div class="modal-body">
        <p style="margin:0 0 18px">Converter este orçamento em venda?</p>
        <p style="font-size:13px;color:var(--muted);margin:0 0 20px">Você poderá escolher a forma de pagamento antes de finalizar.</p>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn btn-outline" id="btn-cancelar-converter">Cancelar</button>
          <button class="btn btn-green" id="btn-ok-converter">🛒 Confirmar</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(modal);
    document.getElementById('btn-cancelar-converter').onclick=()=>modal.classList.remove('open');
  }
  document.getElementById('btn-ok-converter').onclick=()=>{
    modal.classList.remove('open');
    editarVenda(o.id);
    setVendaTipo('venda');
    document.getElementById('venda-tipo-toggle-wrap').style.display='none';
    showToast('Escolha a forma de pagamento para finalizar a venda','green');
  };
  modal.classList.add('open');
}
function exportarOrcamentoWhatsapp(id){
  const o=state.vendas.find(v=>v.id===id);
  if(!o)return;
  const c=getCliente(o.clienteId);
  const totalCheio=o.itens.reduce((s,it)=>{
    const precoBase=getProduto(it.produtoId)?.preco||it.preco;
    return s+(it.qtd*precoBase);
  },0);
  const totalComCanal=o.itens.reduce((s,it)=>s+(it.qtd*it.preco),0);
  const descontoExtra=o.descontoExtra||0;
  const totalFinal=Math.max(0,totalComCanal-descontoExtra);
  const descontoTotal=totalCheio-totalFinal;
  const linhas=o.itens.map(it=>{
    const nome=getNomeCompletoItem(it.produtoId,it.varianteId);
    const prefixo=`${it.qtd}x ${nome} `;
    const valorTxt=fmt(it.qtd*it.preco);
    const pontos='.'.repeat(Math.max(3,28-prefixo.length));
    return `${prefixo}${pontos} ${valorTxt}`;
  }).join('\n');
  const descontoLinha=descontoTotal>0.009?`\n🏷️ *Desconto: −${fmt(descontoTotal)}*`:'';
  const msg=`📋 *Orçamento OR${String(o.id).padStart(4,'0')}*\n\nSegue o orçamento solicitado:\n\n${linhas}${descontoLinha}\n\n─────────────────\n💰 *Total: ${fmt(totalFinal)}*\n─────────────────\n\n📅 *Validade:* 24 horas\n\nQualquer dúvida estou à disposição!\n\n✅ Para aprovar responda: *APROVAR*`;
  const tel=(c.tel||'').replace(/\D/g,'');
  if(tel){
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`,'_blank');
  } else {
    navigator.clipboard?.writeText(msg);
    showToast('Cliente sem telefone — texto copiado para a área de transferência','green');
  }
}


// ============ CONTAS A RECEBER ============
function renderReceber(){
  const el=document.getElementById('receber-lista');
  const clComDivida=state.clientes.map(c=>({...c,saldo:getSaldoCliente(c.id)})).filter(c=>c.saldo>0).sort((a,b)=>b.saldo-a.saldo);
  if(clComDivida.length===0){
    el.innerHTML=`<div style="text-align:center;padding:60px 20px"><div style="font-size:50px;margin-bottom:16px">🎉</div><h3 style="color:var(--green)">Tudo em dia!</h3><p style="color:var(--muted);margin-top:8px">Nenhum cliente com saldo devedor.</p></div>`;return;
  }
  el.innerHTML=clComDivida.map(c=>{
    const vendas=state.vendas.filter(v=>v.clienteId===c.id&&v.forma==='fiado').sort((a,b)=>b.data.localeCompare(a.data));
    const pags=state.pagamentos.filter(p=>p.clienteId===c.id).sort((a,b)=>b.data.localeCompare(a.data));
    const hist=[
      ...vendas.map(v=>({tipo:'venda',data:v.data,desc:v.itens.map(it=>getNomeCompletoItem(it.produtoId,it.varianteId)+' ×'+it.qtd).join(', '),val:v.total})),
      ...pags.map(p=>({tipo:'pag',data:p.data,desc:'Pagou ('+p.forma+')',val:p.valor})),
    ].sort((a,b)=>b.data.localeCompare(a.data));
    return`<div class="client-debt-hero">
      <div><div class="name">👤 ${c.nome} <span style="font-size:12px;font-weight:400;opacity:.85">${fmtClienteNum(c.id)}</span></div><div class="phone">📞 ${c.tel}</div></div>
      <div style="text-align:right">
        <div class="amount">${fmt(c.saldo)}</div>
        <div class="amount-label">saldo devedor</div>
        <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">
          <button class="btn btn-sm" style="background:rgba(255,255,255,.2);color:#fff;border:1px solid rgba(255,255,255,.3)" onclick="cobrarWhatsapp(${c.id})">📲 WhatsApp</button>
          <button class="btn btn-sm" style="background:#fff;color:var(--red);font-weight:700" onclick="abrirPagamento(${c.id})">💰 Receber</button>
        </div>
      </div>
    </div>
    <div class="table-card" style="margin-bottom:24px">
      <div style="padding:16px 20px 8px"><strong style="font-size:13px;color:var(--muted)">HISTÓRICO</strong></div>
      <div class="table-scroll"><table><thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Valor</th></tr></thead>
      <tbody>${hist.map(h=>`<tr>
        <td>${fmtDate(h.data)}</td><td>${h.desc}</td>
        <td><span class="badge ${h.tipo==='venda'?'badge-blue':'badge-green'}">${h.tipo==='venda'?'Compra':'Pagamento'}</span></td>
        <td class="${h.tipo==='venda'?'debt-amount':'debt-zero'}">${h.tipo==='venda'?'-':'+'} ${fmt(h.val)}</td>
      </tr>`).join('')}</tbody></table></div>
    </div>`;
  }).join('');
}

// ============ PAGAMENTO ============
function abrirPagamento(clienteId){
  const c=getCliente(clienteId);
  const saldo=getSaldoCliente(clienteId);
  document.getElementById('pag-cliente-id').value=clienteId;
  document.getElementById('pag-saldo-atual').textContent=fmt(saldo);
  document.getElementById('pag-cliente-nome-label').textContent=c.nome;
  document.getElementById('pag-valor').value='';
  document.getElementById('pag-restante').value='';
  document.getElementById('modal-pagamento').classList.add('open');
}
function calcRestante(){
  const saldo=getSaldoCliente(document.getElementById('pag-cliente-id').value);
  const pago=parseFloat(document.getElementById('pag-valor').value)||0;
  document.getElementById('pag-restante').value=fmt(Math.max(0,saldo-pago));
}
function registrarPagamento(){
  const clienteId=parseInt(document.getElementById('pag-cliente-id').value);
  const valor=parseFloat(document.getElementById('pag-valor').value);
  const forma=document.getElementById('pag-forma').value;
  const obs=document.getElementById('pag-obs').value;
  const saldo=getSaldoCliente(clienteId);
  if(!valor||valor<=0){showToast('Informe o valor pago','red');return;}
  if(valor>saldo){showToast('Valor maior que o saldo devedor','red');return;}
  state.pagamentos.push({id:nextId('pagamentos'),clienteId,valor,forma,obs,data:today()});
  state.financeiro.push({id:nextId('financeiro'),tipo:'entrada',desc:`Pagamento fiado — ${getCliente(clienteId).nome}`,valor,data:today()});
  marcarAlterado();
  showToast(`Pagamento de ${fmt(valor)} registrado!`,'green');
  closeModal('modal-pagamento');
  const pg=document.querySelector('.page.active');
  if(pg) render(pg.id.replace('page-',''));
}

// ============ WHATSAPP ============
function cobrarWhatsapp(clienteId){
  const c=getCliente(clienteId);
  const saldo=getSaldoCliente(clienteId);
  const vendas=state.vendas.filter(v=>v.clienteId===clienteId&&v.forma==='fiado'&&v.status!=='pago');
  const lista=vendas.map(v=>`• ${fmtDate(v.data)} — ${v.itens.map(it=>getNomeCompletoItem(it.produtoId,it.varianteId)+' ('+it.qtd+'x)').join(', ')} = ${fmt(v.total)}`).join('\n');
  const msg=`Olá ${c.nome}! 👋\n\nPassando para lembrar do seu saldo em aberto:\n\n${lista}\n\n*Total devedor: ${fmt(saldo)}*\n\nQualquer dúvida estou à disposição! 😊`;
  const tel=c.tel.replace(/\D/g,'');
  window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`,'_blank');
}

