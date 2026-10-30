// ============ VENDAS (multi-item) ============
let vendaItensTemp=[];
// Item avulso (v5.34.6): valor digitado na calculadora, sem produto cadastrado. Fica em
// itens[] com produtoId:null, avulso:true e nome. Não baixa estoque. Custo opcional (v5.35.0):
// se informado, entra no cálculo de margem do Relatório; senão fica 0 (margem 100%).
function nomeItemVenda(it){
  if(it&&it.avulso) return String(it.nome||'').trim()||'Item avulso';
  return getNomeCompletoItem(it.produtoId,it.varianteId);
}
function itemVendaGravar(it,comCusto){
  const base={produtoId:it.avulso?null:it.produtoId,varianteId:it.avulso?null:(it.varianteId||null),qtd:it.qtd,preco:it.preco,total:it.qtd*it.preco};
  if(it.avulso){base.avulso=true;base.nome=nomeItemVenda(it);}
  // Avulso não tem ficha técnica: o custo é o que o usuário informou (opcional, 0 = não informado).
  // Mesmo no orçamento (comCusto=false) guarda o custo informado, pra não perder ao converter em venda.
  if(it.avulso){
    const c=Math.max(0,Number(it.custo)||0);
    if(comCusto||c>0) base.custoFichaUn=c;
  } else if(comCusto) base.custoFichaUn=calcularCustoFicha(it.produtoId,it.varianteId,1);
  return base;
}
function formaLabel(forma){
  return forma==='fiado'?'Fiado':forma==='dinheiro'?'Dinheiro':forma==='pix'?'PIX':forma==='cartao'?'Cartão':forma==='misto'?'Misto':forma;
}
function statusLabel(status){
  if(status==='pago')return{cls:'badge-green',txt:'Pago'};
  if(status==='parcial')return{cls:'badge-yellow',txt:'Parcial'};
  return{cls:'badge-yellow',txt:'Em aberto'};
}
let vendasSelecionadas=new Set();
let vendasExpandidas=new Set();
function statusPedidoLabel(sp){
  if(sp==='entregue') return {cls:'badge-green',txt:'Entregue'};
  return {cls:'badge-orange',txt:'Em Preparação'};
}
function toggleExpandirParcelas(id){
  if(vendasExpandidas.has(id)) vendasExpandidas.delete(id);
  else vendasExpandidas.add(id);
  renderVendas();
}
// Linha de detalhe de uma parcela (usada dentro da venda parcelada expandida)
function renderLinhaParcela(v,p,hoje2){
  const vencHtml = p.status==='pago'
    ? `<span style="font-size:12px;color:var(--green)">✓ ${fmtDate(p.vencimento)}</span>`
    : vencBadge(p.vencimento,hoje2);
  const stLabel = p.status==='pago' ? {cls:'badge-green',txt:'Pago'} : p.status==='parcial' ? {cls:'badge-yellow',txt:'Parcial'} : {cls:'badge-yellow',txt:'Em aberto'};
  const valorTxt = p.status==='parcial'
    ? `${fmt(p.valorPago)} de ${fmt(p.valor)}`
    : fmt(p.valor);
  return `<div class="parcela-linha" style="padding:7px 0">
    <span class="parcela-num">${p.parcelaNum}/${p.parcelaTotal}</span>
    <span style="flex:1;font-size:12px">${vencHtml}</span>
    <span style="font-size:12px;font-weight:600">${valorTxt}</span>
    <span class="badge ${stLabel.cls}" style="font-size:10px">${stLabel.txt}</span>
  </div>`;
}
function renderVendas(){
  let list=state.vendas;
  const mapaFiado=getMapaSituacaoFiado();
  const sitCache=new Map();
  const sitDe=(v)=>{ if(!sitCache.has(v.id)) sitCache.set(v.id,situacaoVenda(v,mapaFiado)); return sitCache.get(v.id); };
  if(state.venda_filter)list=list.filter(v=>getCliente(v.clienteId).nome.toLowerCase().includes(state.venda_filter)||v.itens.some(it=>nomeItemVenda(it).toLowerCase().includes(state.venda_filter)));
  if(state.venda_tipo_filter==='orcamento')list=list.filter(v=>v.tipo==='orcamento');
  else if(state.venda_tipo_filter==='fiado')list=list.filter(v=>v.tipo!=='orcamento'&&sitDe(v).status!=='pago');
  else if(state.venda_tipo_filter==='pago')list=list.filter(v=>v.tipo!=='orcamento'&&sitDe(v).status==='pago');
  else list=list.filter(v=>v.tipo!=='orcamento');
  list=[...list].sort((a,b)=>b.data.localeCompare(a.data));
  const tb=document.getElementById('vendas-table');
  const tfoot=document.getElementById('vendas-tfoot');
  if(list.length===0){
    tb.innerHTML='<tr><td colspan="10" style="text-align:center;color:var(--muted);padding:24px"><div class="empty-inline"><i data-lucide="inbox"></i><span>Nenhuma venda encontrada</span></div></td></tr>';
    if(tfoot) tfoot.innerHTML='';
    return;
  }
  const hoje2=today();
  tb.innerHTML=list.map(v=>{
    const isOrc=v.tipo==='orcamento';
    const sit=isOrc?null:sitDe(v);
    const itensTxt=v.itens&&v.itens.length>0?`<div style="display:flex;flex-direction:column;gap:4px">${v.itens.map(it=>
      `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nomeItemVenda(it)}</span>
        <span class="qtd-pill">${String(it.qtd).padStart(2,'0')} L</span>
      </div>`
    ).join('')}</div>`:'—';
    const expandido=vendasExpandidas.has(v.id);
    const formaTxt=isOrc?'—':(v.parcelado
      ? `Fiado parcelado <button class="icon-btn" style="width:auto;height:auto;padding:1px 6px;font-size:11px;vertical-align:middle" onclick="toggleExpandirParcelas(${v.id})">${sit.pagas}/${sit.totalParcelas} pagas ${expandido?'▾':'▸'}</button>`
      : (v.pagamentos&&v.pagamentos.length>1?v.pagamentos.map(p=>formaLabel(p.forma)+' '+fmt(p.valor)).join(' + '):formaLabel(v.forma)));
    const st=isOrc?null:statusLabel(sit.status);
    const sp=statusPedidoLabel(v.statusPedido);
    const vencHtml=isOrc?'<span style="color:var(--muted);font-size:12px">—</span>':(sit.vencimentoPendente
      ? vencBadge(sit.vencimentoPendente,hoje2)
      : (sit.status==='pago'?'<span style="font-size:12px;color:var(--green)">✓ Pago</span>':'<span style="color:var(--muted);font-size:12px">—</span>'));
    const sel=vendasSelecionadas.has(v.id);
    const orcBadge=v.statusOrc==='aprovado'?{cls:'badge-green',txt:'Aprovado'}:{cls:'badge-yellow',txt:'Rascunho'};
    const seloImp=(isOrc&&v.origem==='importacao')?' <span class="badge badge-blue" title="Importado por Importar Pedidos"><i data-lucide="download" class="ic ic-sm"></i></span>':'';
    const statusCell=isOrc?`<span class="badge ${orcBadge.cls}">${orcBadge.txt}</span>${seloImp}`:`<span class="badge ${st.cls}">${st.txt}</span>${(v.renegociadaId&&typeof vendaRenegociada==='function'&&vendaRenegociada(v.id))?' <span class="badge badge-orange" title="Dívida renegociada">🔁 Renegociada</span>':''}`;
    const pedidoCell=isOrc?'<span style="color:var(--muted);font-size:12px">—</span>':`<span class="badge ${sp.cls}">${sp.txt}</span>`;
    const acoes=isOrc
      ? `<button class="icon-btn" onclick="exportarOrcamentoWhatsapp(${v.id})" title="Enviar Proposta"><i data-lucide="send" class="ic"></i></button>
         <button class="icon-btn edit" onclick="editarVenda(${v.id})" title="Editar"><i data-lucide="pencil" class="ic"></i></button>
         ${v.statusOrc!=='aprovado'?`<button class="icon-btn" onclick="aprovarOrcamento(${v.id})" title="Aprovar"><i data-lucide="check" class="ic"></i></button>`:`<button class="icon-btn" style="color:var(--green)" onclick="converterOrcamentoEmVenda(${v.id})" title="Confirmar Venda"><i data-lucide="shopping-cart" class="ic"></i></button>`}
         <button class="icon-btn del" onclick="excluirVenda(${v.id})" title="Excluir"><i data-lucide="trash-2" class="ic"></i></button>`
      : `<button class="icon-btn" onclick="abrirRecibo(${v.id})" title="Recibo"><i data-lucide="receipt" class="ic"></i></button>
         <button class="icon-btn" onclick="duplicarVenda(${v.id})" title="Duplicar"><i data-lucide="copy" class="ic"></i></button>
         <button class="icon-btn edit" onclick="editarVenda(${v.id})" title="Editar"><i data-lucide="pencil" class="ic"></i></button>
         <button class="icon-btn del" onclick="excluirVenda(${v.id})" title="Excluir"><i data-lucide="trash-2" class="ic"></i></button>`;
    const linhaPrincipal=`<tr style="${sel?'background:var(--gold-soft);':''}" id="venda-row-${v.id}">
    <td><input type="checkbox" class="venda-check" data-id="${v.id}" ${sel?'checked':''} onchange="toggleSelecaoVenda(${v.id},this.checked)" style="cursor:pointer;width:15px;height:15px"></td>
    <td data-label="Código" style="font-size:11px;font-weight:700;color:var(--muted);white-space:nowrap">${isOrc?'OR':'VD'}${String(v.id).padStart(4,'0')}</td>
    <td data-label="Data">${fmtDate(v.data)}</td>
    <td data-label="Cliente"><strong style="cursor:pointer;color:var(--blue)" onclick="gotoCliente(${v.clienteId})">${escapeHtml(getCliente(v.clienteId).nome)}</strong></td>
    <td data-label="Itens" class="td-block" style="max-width:200px;white-space:normal">${itensTxt}</td>
    <td data-label="Total"><strong>${fmt(v.total)}</strong></td>
    <td data-label="Forma" style="font-size:12px">${formaTxt}</td>
    <td data-label="Vencimento">${vencHtml}</td>
    <td data-label="Pedido">${pedidoCell}</td>
    <td data-label="Status">${statusCell}</td>
    <td><div class="actions-cell">${acoes}</div></td>
  </tr>`;
    if(!isOrc && v.parcelado && expandido && sit.parcelas){
      const detalhe=`<tr id="venda-row-${v.id}-detalhe"><td></td><td colspan="10" style="padding:2px 14px 12px 14px;background:var(--card-2)">
        <div class="parcelas-wrap">${sit.parcelas.map(p=>renderLinhaParcela(v,p,hoje2)).join('')}</div>
      </td></tr>`;
      return linhaPrincipal+detalhe;
    }
    return linhaPrincipal;
  }).join('');

  // TOTALIZADOR RODAPÉ
  const listVendasOnly=list.filter(v=>v.tipo!=='orcamento');
  const totalPago=listVendasOnly.filter(v=>sitDe(v).status==='pago').reduce((s,v)=>s+v.total,0);
  const totalAberto=listVendasOnly.filter(v=>sitDe(v).status!=='pago').reduce((s,v)=>s+v.total,0);
  const totalGeral=list.reduce((s,v)=>s+v.total,0);
  if(tfoot) tfoot.innerHTML=`<tr style="background:var(--card-2);border-top:2px solid var(--border)">
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
  const mapaFiado=getMapaSituacaoFiado();
  const pendentes=ids.map(id=>state.vendas.find(v=>v.id===id)).filter(v=>v&&situacaoVenda(v,mapaFiado).status!=='pago');
  if(pendentes.length===0){showToast('Todas as selecionadas já estão pagas','green');return;}
  confirmarAcao(`Marcar ${pendentes.length} venda${pendentes.length!==1?'s':''} como paga${pendentes.length!==1?'s':''}? O saldo devedor é único por cliente, então isso também quita qualquer dívida mais antiga em aberto do mesmo cliente. Esta ação não pode ser desfeita.`,()=>{
    const hj=today();
    // agrupa as pendentes por cliente e paga, de cada cliente, até a mais recente selecionada
    // (isso já cobre automaticamente qualquer outra selecionada — ou mais antiga — do mesmo cliente, via FIFO)
    const porCliente={};
    pendentes.forEach(v=>{ if(v.forma!=='fiado') return; (porCliente[v.clienteId]=porCliente[v.clienteId]||[]).push(v); });
    Object.keys(porCliente).forEach(cIdStr=>{
      const cId=parseInt(cIdStr);
      const vendasCli=porCliente[cIdStr];
      let alvo=vendasCli[0], vencAlvo=alvo.parcelado?alvo.parcelas[alvo.parcelas.length-1].vencimento:alvo.vencimento;
      vendasCli.forEach(v=>{
        const venc=v.parcelado?v.parcelas[v.parcelas.length-1].vencimento:v.vencimento;
        if((venc||'')>(vencAlvo||'')){vencAlvo=venc;alvo=v;}
      });
      const parcelaIdxAlvo = alvo.parcelado ? alvo.parcelas.length-1 : null;
      const valor=valorParaQuitarAte(cId,alvo.id,parcelaIdxAlvo);
      if(valor>0.009){
        const pagId=nextId('pagamentos');
        state.pagamentos.push({id:pagId,clienteId:cId,valor,forma:'Lote',obs:'Marcado em lote',data:hj});
        state.financeiro.push({id:nextId('financeiro'),tipo:'entrada',desc:`Pagamento fiado (lote) — ${getCliente(cId).nome}`,valor,data:hj,pagamentoId:pagId});
      }
    });
    marcarAlterado();salvarDados();
    vendasSelecionadas.clear();
    renderVendas();renderDashboard();renderClientes();
    showToast(`${pendentes.length} venda${pendentes.length!==1?'s':''} marcada${pendentes.length!==1?'s':''} como paga${pendentes.length!==1?'s':''}!`,'green');
  });
}
function filterVendas(v){state.venda_filter=v.toLowerCase();renderVendas();}
const filterVendasDebounced=debounce(filterVendas);
function filterVendaTipo(v){state.venda_tipo_filter=v;const sel=document.getElementById('venda-tipo-filter-select');if(sel)sel.value=v;renderVendas();}

// ============ COMBOBOX BUSCÁVEL DE CLIENTE (venda/orçamento) ============
// Antes era um <select> nativo — com poucos clientes funciona, mas com uma base grande fica
// ruim de navegar. Agora é um campo de texto que filtra por nome, telefone ou número (#001) em
// tempo real, com os resultados aparecendo numa lista pra tocar e selecionar (mesmo padrão
// visual da busca global do topo do app). Por baixo continua existindo um input oculto
// #venda-cliente guardando só o id — por isso NADA no resto do código precisou mudar (toda
// leitura/escrita de "venda-cliente".value continua funcionando igual).
// Só ativos entram na busca (não faz sentido lançar venda nova pra cliente arquivado), mas o
// cliente já selecionado numa venda existente aparece mesmo arquivado — senão editar essa
// venda perderia a referência.
function clientesParaComboVenda(termo,selectedId){
  const t=(termo||'').toLowerCase().trim();
  let lista=state.clientes.filter(c=>estaAtivo(c)||c.id===selectedId);
  if(t) lista=lista.filter(c=>c.nome.toLowerCase().includes(t)||(c.tel||'').includes(t)||fmtClienteNum(c.id).toLowerCase().includes(t));
  return lista;
}
function selecionarClienteVenda(id){
  document.getElementById('venda-cliente').value=id||'';
  const inp=document.getElementById('venda-cliente-busca');
  if(inp) inp.value=id?getCliente(id).nome:'';
  fecharClienteResultados();
}
function renderClienteComboResultados(termo){
  const el=document.getElementById('venda-cliente-resultados');
  if(!el) return;
  const selectedId=parseInt(document.getElementById('venda-cliente').value)||null;
  const listaCompleta=clientesParaComboVenda(termo,selectedId);
  const lista=listaCompleta.slice(0,8);
  if(lista.length===0){
    el.innerHTML='<div class="busca-item" style="cursor:default;color:var(--muted)">Nenhum cliente encontrado</div>';
  } else {
    el.innerHTML=lista.map(c=>{
      const rota=getRota(c.rotaId);
      const arq=!estaAtivo(c)?' <span style="color:var(--muted);font-weight:400">(arquivado)</span>':'';
      return `<div class="busca-item" onclick="selecionarClienteVenda(${c.id})"><strong>${escapeHtml(c.nome)}${arq}</strong><span>${escapeHtml(c.tel||'sem telefone')}${rota?' · <i data-lucide="map-pin" class="ic ic-sm"></i> '+escapeHtml(rota.nome):''}</span></div>`;
    }).join('');
    if(listaCompleta.length>8) el.innerHTML+=`<div style="padding:8px 14px;font-size:11px;color:var(--muted)">+${listaCompleta.length-8} outro(s) — refine a busca</div>`;
  }
  el.style.display='block';
}
function fecharClienteResultados(){
  const el=document.getElementById('venda-cliente-resultados');
  if(el) el.style.display='none';
}
document.addEventListener('click',(e)=>{
  const wrap=document.getElementById('venda-cliente-combo-wrap');
  if(wrap && !wrap.contains(e.target)) fecharClienteResultados();
});
document.addEventListener('keydown',(e)=>{if(e.key==='Escape')fecharClienteResultados();});

// Produtos arquivados não aparecem pra quem tá adicionando um item novo (não vendemos mais
// aquilo), mas se o item já existente referencia um produto arquivado, ele continua aparecendo
// nessa linha específica (marcado) — senão o <select> ficaria sem opção correspondente e a
// venda perderia essa referência ao ser salva de novo.
function opcoesProdutosSelect(selectedProdutoId,selectedVarianteId){
  const lista=state.produtos.filter(p=>estaAtivo(p)||p.id==selectedProdutoId);
  return '<option value="">Selecione...</option>'+lista.map(p=>{
    const tagArq=!estaAtivo(p)?' (arquivado)':'';
    if(p.variantes&&p.variantes.length>0){
      return p.variantes.map(v=>`<option value="${p.id}::${v.id}" data-preco="${p.preco}" ${p.id==selectedProdutoId&&v.id==selectedVarianteId?'selected':''}>${fmtProdutoCod(p.id,v.id)} · ${escapeHtml(p.nome)}${tagArq} — ${escapeHtml(v.nome)} (est: ${v.estoque})</option>`).join('');
    }
    return `<option value="${p.id}::" data-preco="${p.preco}" ${p.id==selectedProdutoId&&!selectedVarianteId?'selected':''}>${fmtProdutoCod(p.id)} · ${escapeHtml(p.nome)}${tagArq} (est: ${p.estoque})</option>`;
  }).join('');
}
function criarLinhaItemVenda(item){
  item=item||{produtoId:'',varianteId:null,qtd:1,preco:0};
  const uid='vi'+Math.random().toString(36).slice(2,9);
  return {uid,...item};
}
// Quantidade: lista suspensa de 1 a 10 + opção "Livre" pra digitar qualquer valor.
// it.qtdLivre guarda a escolha explícita do usuário; sem ela, deduz do próprio
// qtd (assim itens antigos com qtd fora de 1-10 já abrem direto no modo livre).
function itemVendaUsaQtdLivre(it){
  if(typeof it.qtdLivre==='boolean') return it.qtdLivre;
  return !(Number.isInteger(it.qtd)&&it.qtd>=1&&it.qtd<=10);
}
function opcoesQtdSelect(it){
  const livre=itemVendaUsaQtdLivre(it);
  let opts='';
  for(let i=1;i<=10;i++){
    opts+=`<option value="${i}" ${!livre&&it.qtd===i?'selected':''}>${i}</option>`;
  }
  opts+=`<option value="livre" ${livre?'selected':''}>Livre</option>`;
  return opts;
}
function renderQtdItemVenda(it){
  const livre=itemVendaUsaQtdLivre(it);
  return `<span style="display:flex;gap:4px;align-items:center">
        <select class="form-control" style="width:72px;padding-left:10px" onchange="atualizarItemVenda('${it.uid}','qtdSelect',this.value)">${opcoesQtdSelect(it)}</select>
        ${livre?`<input type="number" min="1" value="${it.qtd}" class="form-control" style="width:52px" oninput="atualizarItemVenda('${it.uid}','qtd',this.value)">`:''}
      </span>`;
}
// ============ CATÁLOGO DE VENDA + AVULSO (v5.34.6) ============
// A lista de itens da venda virou um catálogo: tocar no + soma 1, o stepper ajusta a quantidade
// (ou toque no número para digitar). O botão "Avulso" abre a calculadora para valores sem cadastro.
const _VC_MENOS='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"/></svg>';
const _VC_MAIS='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12M12 6v12"/></svg>';
let vendaCatBusca='';
function vendaResetCampos(){
  vendaCatBusca='';
  const b=document.getElementById('venda-cat-busca'); if(b) b.value='';
  const jt=document.getElementById('venda-juros-tipo'); if(jt) jt.value='pct';
  const jv=document.getElementById('venda-juros-valor'); if(jv) jv.value='';
}
function vcBuscar(v){vendaCatBusca=String(v||'').trim().toLowerCase();renderVendaItensLista();}
function vcItemCatalogo(produtoId,varianteId){
  return vendaItensTemp.find(it=>!it.avulso&&it.produtoId==produtoId&&(it.varianteId||null)==(varianteId||null));
}
function vcItemPorChave(key){
  const [t,a,b]=key.split(':');
  if(t==='a') return vendaItensTemp.find(x=>x.uid===a);
  return vcItemCatalogo(parseInt(a),b?parseInt(b):null);
}
function vcPrecoCatalogo(produtoId){
  const base=getProduto(produtoId)?.preco||0;
  const canalId=parseInt(document.getElementById('venda-canal')?.value)||null;
  const canal=canalId?(state.canais||[]).find(c=>c.id===canalId):null;
  return canal?getPrecoCanal(base,canal):base;
}
function vcEntradasCatalogo(){
  const out=[];
  state.produtos.forEach(p=>{
    const ativo=estaAtivo(p);
    if(!ativo&&!vendaItensTemp.some(it=>!it.avulso&&it.produtoId==p.id)) return;
    const tag=ativo?'':' (arquivado)';
    if(p.variantes&&p.variantes.length>0){
      p.variantes.forEach(v=>out.push({produtoId:p.id,varianteId:v.id,nome:getNomeCompletoItem(p.id,v.id)+tag,cod:fmtProdutoCod(p.id,v.id),preco:p.preco,estoque:v.estoque}));
    } else {
      out.push({produtoId:p.id,varianteId:null,nome:getNomeCompletoItem(p.id,null)+tag,cod:fmtProdutoCod(p.id),preco:p.preco,estoque:p.estoque});
    }
  });
  return out;
}
function vcStepper(key,qtd,alerta){
  const txt=String(qtd);
  return `<div class="stepper${alerta?' low':''}">`+
    `<button type="button" class="stp-btn stp-minus" onclick="vcAjustar('${key}',-1)" aria-label="Diminuir">${_VC_MENOS}</button>`+
    `<input type="text" class="stp-val" inputmode="numeric" value="${txt}" style="width:${Math.max(3,txt.length+1)}ch" onfocus="this.select()" onkeydown="if(event.key==='Enter')this.blur()" onchange="vcDigitado('${key}',this.value)" aria-label="Quantidade">`+
    `<button type="button" class="stp-btn stp-plus" onclick="vcAjustar('${key}',1)" aria-label="Aumentar">${_VC_MAIS}</button>`+
    `</div>`;
}
function renderVendaItensLista(){
  const el=document.getElementById('venda-itens-lista');
  if(!el) return;
  const editando=!!document.getElementById('venda-edit-id')?.value;
  const verEstoque=!editando&&document.getElementById('venda-tipo')?.value!=='orcamento';
  let html='';
  vendaItensTemp.filter(it=>it.avulso).forEach(it=>{
    const key='a:'+it.uid;
    html+=`<div class="vc-row sel">
      <div class="vc-info"><p class="vc-nome">${escapeHtml(nomeItemVenda(it))}<span class="vc-tag">avulso</span></p></div>
      ${vcStepper(key,it.qtd,false)}
      <label class="vc-preco">Preço un. <input type="number" step="0.01" min="0" class="form-control" value="${it.preco}" oninput="vcPreco('${key}',this.value)"></label>
      <label class="vc-preco">Custo un. <input type="number" step="0.01" min="0" class="form-control" value="${it.custo||''}" placeholder="opcional" oninput="vcCustoAvulso('${key}',this.value)"></label>
    </div>`;
  });
  const termo=vendaCatBusca;
  const lista=vcEntradasCatalogo().filter(e=>!termo||(e.nome+' '+e.cod).toLowerCase().includes(termo));
  lista.forEach(e=>{
    const key=`p:${e.produtoId}:${e.varianteId||''}`;
    const it=vcItemCatalogo(e.produtoId,e.varianteId);
    const falta=!!it&&verEstoque&&it.qtd>e.estoque;
    html+=`<div class="vc-row${it?' sel':''}">
      <div class="vc-info"><p class="vc-nome">${escapeHtml(e.nome)}</p>
        <p class="vc-sub">${escapeHtml(e.cod)} · ${fmt(e.preco)} · est: ${e.estoque}${falta?' · <span class="aviso">estoque insuficiente</span>':''}</p></div>
      ${it?vcStepper(key,it.qtd,falta):`<button type="button" class="stp-btn stp-plus vc-add" onclick="vcAjustar('${key}',1)" aria-label="Adicionar">${_VC_MAIS}</button>`}
      ${it?`<label class="vc-preco">Preço un. <input type="number" step="0.01" min="0" class="form-control" value="${it.preco}" oninput="vcPreco('${key}',this.value)"></label>`:''}
    </div>`;
  });
  if(!html) html='<div class="vc-vazio">'+(termo?'Nenhum item encontrado':'Nenhum produto cadastrado')+'</div>';
  el.innerHTML=html;
  const n=vendaItensTemp.filter(it=>(it.produtoId||it.avulso)&&it.qtd>0).reduce((s,it)=>s+it.qtd,0);
  const rs=document.getElementById('venda-itens-resumo');
  if(rs) rs.textContent=n>0?`${n} ${n===1?'unidade selecionada':'unidades selecionadas'}`:'Toque em + para adicionar itens';
  calcTotalVendaGeral();
}
function vcDefinir(key,qtd){
  qtd=Math.floor(Number(qtd));
  if(isNaN(qtd)) qtd=0;
  qtd=Math.max(0,Math.min(qtd,99999));
  const [t,a,b]=key.split(':');
  const it=vcItemPorChave(key);
  if(qtd<=0){
    if(it) vendaItensTemp=vendaItensTemp.filter(x=>x!==it);
  } else if(it){
    it.qtd=qtd;
  } else if(t==='p'){
    const produtoId=parseInt(a),varianteId=b?parseInt(b):null;
    vendaItensTemp.push(criarLinhaItemVenda({produtoId,varianteId,qtd,preco:vcPrecoCatalogo(produtoId)}));
  }
  renderVendaItensLista();
}
function vcAjustar(key,delta){
  const it=vcItemPorChave(key);
  vcDefinir(key,(it?it.qtd:0)+delta);
}
function vcDigitado(key,valor){
  const n=parseInt(String(valor).replace(/\D/g,''),10);
  vcDefinir(key,isNaN(n)?0:n);
}
function vcPreco(key,valor){
  const it=vcItemPorChave(key);
  if(!it) return;
  it.preco=Math.max(0,parseFloat(valor)||0);
  calcTotalVendaGeral();
}
function vcCustoAvulso(key,valor){
  const it=vcItemPorChave(key);
  if(!it||!it.avulso) return;
  it.custo=Math.max(0,parseFloat(String(valor).replace(',','.'))||0);
}
// ── Calculadora (valor avulso) ──
let avulsoCents=0,avulsoQtd=1;
function avulsoDesenhar(){
  const d=document.getElementById('avulso-display'); if(d) d.textContent=fmt(avulsoCents/100);
  const q=document.getElementById('avulso-qtd'); if(q) q.textContent=avulsoQtd;
}
function abrirAvulso(){
  avulsoCents=0;avulsoQtd=1;
  const d=document.getElementById('avulso-desc'); if(d) d.value='';
  const c=document.getElementById('avulso-custo'); if(c) c.value='';
  avulsoDesenhar();
  document.getElementById('modal-avulso').classList.add('open');
}
function avulsoDigito(n){
  if(avulsoCents>9999999) return;
  avulsoCents=avulsoCents*10+n;
  avulsoDesenhar();
}
function avulsoApagar(){avulsoCents=Math.floor(avulsoCents/10);avulsoDesenhar();}
function avulsoQtdAjustar(d){avulsoQtd=Math.max(1,Math.min(9999,avulsoQtd+d));avulsoDesenhar();}
function avulsoAdicionar(){
  if(avulsoCents<=0){showToast('Digite um valor','red');return;}
  const nome=String(document.getElementById('avulso-desc').value||'').trim().slice(0,40)||'Item avulso';
  const custo=Math.max(0,parseFloat(String(document.getElementById('avulso-custo')?.value||'').replace(',','.'))||0);
  vendaItensTemp.push(criarLinhaItemVenda({produtoId:null,varianteId:null,avulso:true,nome,qtd:avulsoQtd,preco:avulsoCents/100,custo}));
  renderVendaItensLista();
  showToast(`${fmt(avulsoCents/100)} ×${avulsoQtd} adicionado à venda`,'green');
  avulsoCents=0;avulsoQtd=1;
  document.getElementById('avulso-desc').value='';
  const cEl=document.getElementById('avulso-custo'); if(cEl) cEl.value='';
  avulsoDesenhar();
}
function calcTotalVendaGeral(){
  const totalCheio=vendaItensTemp.reduce((s,it)=>{
    if(it.avulso) return s+((it.qtd||0)*(it.preco||0));
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
  atualizarInfoEntrada();
  atualizarResumoParcelas();
  return totalFinal;
}
// ── Juros no ato (parcelamento) ──
function calcJurosAto(base){
  const tipo=document.getElementById('venda-juros-tipo')?.value||'pct';
  const val=Math.max(0,parseFloat(document.getElementById('venda-juros-valor')?.value)||0);
  return parseFloat((tipo==='pct'?base*val/100:val).toFixed(2));
}
function atualizarResumoParcelas(){
  const wrap=document.getElementById('venda-parcelas-wrap');
  const el=document.getElementById('venda-parcelas-resumo');
  if(!wrap||!el||wrap.style.display==='none') return;
  const n=Math.min(24,Math.max(2,parseInt(document.getElementById('venda-num-parcelas').value)||2));
  const base=calcTotalVendaGeralSemRecursao();
  const juros=calcJurosAto(base);
  const total=parseFloat((base+juros).toFixed(2));
  const parcela=parseFloat((total/n).toFixed(2));
  el.innerHTML=`<div class="lin"><span>Valor original</span><span>${fmt(base)}</span></div>
    <div class="lin"><span>Juros no ato</span><span>${juros>0?'+':''}${fmt(juros)}</span></div>
    <div class="lin tot"><span>Total a receber</span><span>${fmt(total)}</span></div>
    <div style="margin-top:4px;font-size:12px;color:var(--muted)">${n} parcelas de ${fmt(parcela)} · somado ao total na hora da venda. Use condições permitidas pela lei.</div>`;
}
function popularCanalVenda(){
  const sel=document.getElementById('venda-canal');
  if(!sel)return;
  const vAtual=sel.value;
  sel.innerHTML='<option value="">Preço cheio (sem canal)</option>'+(state.canais||[]).map(c=>{
    const sinal=c.desconto>0?'−':c.desconto<0?'+':'';
    return `<option value="${c.id}">${escapeHtml(c.nome)} (${sinal}${Math.abs(c.desconto||0)}%)</option>`;
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
  // "Dividir em mais de uma forma" e o atalho de Entrada não convivem (são dois jeitos
  // diferentes de fazer a mesma coisa) — zera a entrada ao trocar pra não deixar valor
  // esquecido influenciando silenciosamente se o usuário voltar atrás.
  document.getElementById('venda-entrada-valor').value='';
  toggleVendaEntradaShortcut();
}
// ============ ATALHO "ENTRADA" NA VENDA FIADO ============
// Só aparece com forma=fiado e fora do modo misto. É puramente um atalho de UI: em
// salvarVenda(), a venda é criada 100% fiado exatamente como sempre foi, e a entrada vira um
// pagamento registrado logo em seguida (mesmo mecanismo de registrarPagamento em Contas a
// Receber — ver comentário lá dentro). Optei por isso (em vez de meter a entrada dentro de um
// pagamentos[] misto na própria venda) porque todo o motor de fiado deste app é indexado por
// v.forma==='fiado' (getUnidadesFiadoFlat, marcarLotePago, etc.); uma venda com forma:'misto'
// escaparia inteira desse motor mesmo tendo uma perna fiado dentro do pagamentos[] — ficaria
// invisível em Contas a Receber, no sino de cobrança e no "marcar como pago" em lote.
function toggleVendaEntradaShortcut(){
  const forma=document.getElementById('venda-forma').value;
  const misto=document.getElementById('venda-pag-misto-check').checked;
  const wrap=document.getElementById('venda-entrada-wrap');
  if(wrap) wrap.style.display=(forma==='fiado'&&!misto)?'block':'none';
}
// Esconde "Parcelar" quando há entrada: as duas coisas juntas (entrada + parcelamento do
// restante) não são suportadas nesta versão.
function atualizarInfoEntrada(){
  const entrada=parseFloat(document.getElementById('venda-entrada-valor').value)||0;
  const parcelarRow=document.getElementById('venda-parcelar-check').closest('span');
  if(parcelarRow) parcelarRow.style.display=entrada>0.009?'none':'flex';
  if(entrada>0.009 && document.getElementById('venda-parcelar-check').checked){
    document.getElementById('venda-parcelar-check').checked=false;
    toggleParcelasVenda();
  }
  const el=document.getElementById('venda-entrada-restante-info');
  if(!el) return;
  if(entrada<=0){el.style.display='none';return;}
  const total=calcTotalVendaGeralSemRecursao();
  const restante=parseFloat((total-entrada).toFixed(2));
  el.style.display='block';
  if(restante>0.009){el.textContent=`Fica ${fmt(restante)} fiado`;el.style.color='var(--muted)';}
  else if(restante>=-0.009){el.textContent='Entrada cobre o total — nada fica fiado';el.style.color='var(--green)';}
  else{el.textContent=`Entrada maior que o total (${fmt(total)})`;el.style.color='var(--red)';}
}
function renderPagamentosMistoLista(){
  const el=document.getElementById('venda-pag-misto-lista');
  el.innerHTML=vendaPagamentosTemp.map(pg=>`
    <div style="display:flex;gap:6px;margin-bottom:6px">
      <select class="form-control" style="flex:1" onchange="atualizarPagamentoMisto('${pg.uid}','forma',this.value)">
        <option value="dinheiro" ${pg.forma==='dinheiro'?'selected':''}>Dinheiro</option>
        <option value="pix" ${pg.forma==='pix'?'selected':''}>PIX</option>
        <option value="cartao" ${pg.forma==='cartao'?'selected':''}>Cartão</option>
        <option value="fiado" ${pg.forma==='fiado'?'selected':''}>Fiado</option>
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
    btnSalvar.textContent='Salvar Orçamento';
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
  selecionarClienteVenda(null);
  document.getElementById('venda-edit-id').value='';
  document.getElementById('venda-obs').value='';
  document.getElementById('venda-data').value=today();
  document.getElementById('venda-vencimento').value='';
  document.getElementById('venda-forma').value='fiado';
  document.getElementById('venda-pag-misto-check').checked=false;
  document.getElementById('venda-pag-misto-wrap').style.display='none';
  document.getElementById('venda-forma').style.display='block';
  document.getElementById('venda-parcelar-check').checked=false;
  document.getElementById('venda-parcelas-wrap').style.display='none';
  document.getElementById('venda-fiado-wrap').style.display='block';
  document.getElementById('venda-parcelado-edit-note').style.display='none';
  { const parcelarRow=document.getElementById('venda-parcelar-check').closest('span'); if(parcelarRow) parcelarRow.style.display='flex'; }
  document.getElementById('venda-entrada-valor').value='';
  document.getElementById('venda-entrada-forma').value='dinheiro';
  toggleVendaEntradaShortcut();
  vendaPagamentosTemp=[];
  document.getElementById('modal-venda-title').textContent='Nova Venda';
  vendaItensTemp=[];
  vendaResetCampos();
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
  document.getElementById('venda-edit-id').value='';
  document.getElementById('venda-data').value=today();
  document.getElementById('modal-venda-title').textContent='Nova Venda (duplicada)';
  selecionarClienteVenda(v.clienteId);
  document.getElementById('venda-forma').value=v.forma==='fiado'?'fiado':v.forma;
  document.getElementById('venda-obs').value=v.obs||'';
  document.getElementById('venda-pag-misto-check').checked=false;
  document.getElementById('venda-pag-misto-wrap').style.display='none';
  document.getElementById('venda-forma').style.display='block';
  document.getElementById('venda-entrada-valor').value='';
  document.getElementById('venda-entrada-forma').value='dinheiro';
  toggleVendaEntradaShortcut();
  vendaPagamentosTemp=[];
  vendaItensTemp=v.itens.map(it=>criarLinhaItemVenda({produtoId:it.produtoId,varianteId:it.varianteId,qtd:it.qtd,preco:it.preco,avulso:!!it.avulso,nome:it.nome||'',custo:it.avulso?(it.custoFichaUn||0):0}));
  vendaResetCampos();
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
  vendaResetCampos();
  document.getElementById('venda-parcelado-edit-note').style.display='none';
  { const parcelarRow=document.getElementById('venda-parcelar-check').closest('span'); if(parcelarRow) parcelarRow.style.display='flex'; }
  popularCanalVenda();
  document.getElementById('venda-canal').value='';
  document.getElementById('venda-desconto-extra').value='';
  document.getElementById('venda-entrada-valor').value='';
  document.getElementById('venda-entrada-forma').value='dinheiro';
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
  if(n < 2 || n > 24){el.innerHTML='<p style="color:var(--red);font-size:12px">Entre 2 e 24 parcelas</p>';atualizarResumoParcelas();return;}
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
  atualizarResumoParcelas();
}

// ============ RECONCILIAÇÃO VENDA ↔ FINANCEIRO ============
// Toda venda com parte não-fiado gera UM lançamento de entrada no Financeiro, marcado com
// vendaId (mesmo padrão que state.compras já usa via compraId). Esta função é o único lugar
// que cria/atualiza/remove esse lançamento, então criar, editar (mudar total/forma/data) e
// excluir uma venda sempre mantêm os dois lados em sincronia — antes, editar ou excluir uma
// venda deixava o valor antigo "preso" no Financeiro (e no Fluxo de Caixa/DRE).
// Vendas 100% fiado (valorNaoFiado ≤ 0) não têm — e não devem ter — lançamento nenhum.
function sincronizarFinanceiroVenda(vendaId, valorNaoFiado, data, desc){
  const existente=state.financeiro.find(f=>f.vendaId===vendaId);
  if(valorNaoFiado>0.01){
    if(existente){
      existente.valor=valorNaoFiado;existente.data=data;existente.desc=desc;
    } else {
      state.financeiro.push({id:nextId('financeiro'),tipo:'entrada',desc,valor:valorNaoFiado,data,vendaId});
    }
  } else if(existente){
    state.financeiro=state.financeiro.filter(f=>f.vendaId!==vendaId);
  }
}
// ============ ESTOQUE × VENDA/ORÇAMENTO (v5.33.1) ============
// Regra: ORÇAMENTO nunca baixa estoque; só VENDA baixa. Por isso:
//  - excluir orçamento NÃO devolve estoque (antes devolvia e inflava o saldo);
//  - converter orçamento em venda BAIXA o estoque (antes devolvia e baixava de novo = saldo líquido 0);
//  - editar venda só exige estoque pelo AUMENTO de quantidade (antes nem checava e podia negativar).
function somarNecessidadeItens(itens){
  const n={};
  (itens||[]).forEach(it=>{if(it.avulso||!it.produtoId)return;const k=`${it.produtoId}::${it.varianteId||''}`;n[k]=(n[k]||0)+it.qtd;});
  return n;
}
// Devolve ao estoque o que a venda baixou. Orçamento não baixou nada, então não devolve.
function devolverEstoqueVenda(v,origem){
  if(!v||v.tipo==='orcamento') return;
  (v.itens||[]).forEach(it=>ajustarEstoque(it.produtoId,it.varianteId,it.qtd,origem||'exclusao_venda'));
}
// Primeira falta de estoque (ou null). Se está editando uma VENDA, o que ela já baixou não conta de novo.
function checarEstoqueVenda(itens,vendaAnterior){
  const nec=somarNecessidadeItens(itens);
  const ja=(vendaAnterior&&vendaAnterior.tipo!=='orcamento')?somarNecessidadeItens(vendaAnterior.itens):{};
  for(const k in nec){
    const extra=nec[k]-(ja[k]||0);
    if(extra<=0) continue;
    const [pid,vid]=k.split('::');
    const produtoId=parseInt(pid), varianteId=vid?parseInt(vid):null;
    const disp=getEstoqueAtual(produtoId,varianteId);
    if(disp<extra) return {produtoId,varianteId,disp,extra};
  }
  return null;
}
function salvarVenda(){
  const eid=document.getElementById('venda-edit-id').value;
  if(eid&&typeof vendaRenegociada==='function'&&vendaRenegociada(parseInt(eid))){showToast('Esta venda entrou numa renegociação. Desfaça a renegociação para editá-la.','red');return;}
  const clienteId=parseInt(document.getElementById('venda-cliente').value);
  const obs=document.getElementById('venda-obs').value;
  const dataVenda=document.getElementById('venda-data').value||today();
  const itensValidos=vendaItensTemp.filter(it=>(it.produtoId||it.avulso)&&it.qtd>0);
  if(!clienteId||itensValidos.length===0){showToast('Selecione o cliente e ao menos um item','red');return;}

  const tipo=document.getElementById('venda-tipo').value;
  const canalId=parseInt(document.getElementById('venda-canal').value)||null;
  const descontoExtra=parseFloat(document.getElementById('venda-desconto-extra').value)||0;

  if(tipo==='orcamento'){
    const itensFinalOrc=itensValidos.map(it=>itemVendaGravar(it,false));
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
  const entradaValor=parseFloat(document.getElementById('venda-entrada-valor').value)||0;
  if(!pagMisto && document.getElementById('venda-forma').value==='fiado' && entradaValor>total0+0.01){
    showToast(`Entrada (${fmt(entradaValor)}) maior que o total da venda (${fmt(total0)})`,'red');
    return;
  }
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

  // valida estoque (somando itens repetidos do mesmo produto/variante). Na edição de uma venda só
  // conta o aumento de quantidade; na conversão de orçamento conta tudo (orçamento não baixou nada).
  const vendaAnterior=eid?state.vendas.find(v=>v.id==eid):null;
  const falta=checarEstoqueVenda(itensValidos,vendaAnterior);
  if(falta){showToast(`Estoque insuficiente: ${getNomeCompletoItem(falta.produtoId,falta.varianteId)} (disp: ${falta.disp}, precisa de mais ${falta.extra})`,'red');return;}
  // Grava um "retrato" do custo da ficha técnica no momento da venda (custoFichaUn = custo por
  // unidade agora). Sem isso, o Relatório recalculava a margem de vendas antigas usando a
  // ficha técnica de HOJE — se o preço de uma matéria-prima subisse, a margem de uma venda de
  // meses atrás mudava sozinha toda vez que o relatório fosse reaberto. Vendas antigas (antes
  // desta versão) não têm esse campo; nesse caso o relatório volta a recalcular pela ficha
  // atual como fallback (ver getCustoVendaItem em 09-financeiro-relatorios.js).
  const itensFinal=itensValidos.map(it=>itemVendaGravar(it,true));
  const totalBruto=itensFinal.reduce((s,it)=>s+it.total,0);
  const jurosPrev=(vendaAnterior&&vendaAnterior.jurosAto)||0; // venda parcelada com juros no ato: o juros fica fixo na edição
  const total=Math.max(0,totalBruto-descontoExtra)+jurosPrev;
  // se tem qualquer parcela fiado (puro ou dentro do misto), considera em_aberto a parte fiada
  const valorFiado=pagamentos?(pagamentos.find(p=>p.forma==='fiado')?.valor||0):(forma==='fiado'?total:0);
  const status=valorFiado>0?(valorFiado>=total-0.01?'em_aberto':'parcial'):'pago';
  const parcelar = document.getElementById('venda-parcelar-check').checked && forma==='fiado' && !pagMisto;
  const numParcelas = parcelar ? (parseInt(document.getElementById('venda-num-parcelas').value)||2) : 1;

  if(eid){
    const v=state.vendas.find(v=>v.id==eid);
    if(v.parcelado && forma!=='fiado'){showToast('Uma venda parcelada precisa continuar como Fiado','red');return;}
    // edição de venda devolve e baixa de novo (rótulo "edicao_venda"); conversão de orçamento só baixa ("venda")
    const origemBaixa=(vendaAnterior&&vendaAnterior.tipo!=='orcamento')?'edicao_venda':'venda';
    devolverEstoqueVenda(v,'edicao_venda'); // orçamento (conversão) não devolve: nunca baixou
    v.clienteId=clienteId;v.itens=itensFinal;v.total=total;v.forma=forma;v.pagamentos=pagamentos;v.obs=obs;v.data=dataVenda;v.statusPedido=statusPedido;v.canalId=canalId;v.descontoExtra=descontoExtra;v.tipo='venda';delete v.statusOrc;
    state.pagamentos.forEach(p=>{if(p.entradaVendaId===v.id)p.clienteId=clienteId;}); // entrada acompanha o cliente da venda
    if(v.parcelado && Array.isArray(v.parcelas) && v.parcelas.length>0){
      // mantém as mesmas datas de vencimento já definidas, só redistribui o novo total entre elas
      const n=v.parcelas.length;
      const valorParcela=parseFloat((total/n).toFixed(2));
      v.parcelas=v.parcelas.map((p,i)=>({vencimento:p.vencimento,valor:i===n-1?parseFloat((total-(valorParcela*(n-1))).toFixed(2)):valorParcela}));
      v.vencimento=v.parcelas[0].vencimento;
    } else {
      v.vencimento=vencimento;
    }
    v.status=status; // baseline; para fiado a situação real é sempre recalculada (getMapaSituacaoFiado)
    itensFinal.forEach(it=>ajustarEstoque(it.produtoId,it.varianteId,-it.qtd,origemBaixa));
    const valorNaoFiadoEdit=total-valorFiado;
    const descEdit=itensFinal.map(it=>nomeItemVenda(it)).join(', ');
    sincronizarFinanceiroVenda(v.id,valorNaoFiadoEdit,dataVenda,`Venda ${descEdit} - ${getCliente(clienteId).nome}${pagamentos?' (pagamento misto)':''}`);
    showToast('Venda atualizada','green');
  } else if(parcelar && numParcelas >= 2){
    // uma única venda, com o cronograma de parcelas guardado dentro dela (não gera mais
    // um registro por parcela — isso é o que inflava ticket médio e contagem de vendas)
    const jurosAto=calcJurosAto(total);
    const totalComJuros=parseFloat((total+jurosAto).toFixed(2));
    const totalParcela = parseFloat((totalComJuros/numParcelas).toFixed(2));
    const parcelas=[];
    for(let i=0;i<numParcelas;i++){
      const dataParc = document.getElementById(`parcela-data-${i}`)?.value || vencimento;
      const valParc = i===numParcelas-1 ? parseFloat((totalComJuros-(totalParcela*(numParcelas-1))).toFixed(2)) : totalParcela;
      parcelas.push({vencimento:dataParc,valor:valParc});
    }
    state.vendas.push({
      id:nextId('vendas'),clienteId,itens:itensFinal,total:totalComJuros,...(jurosAto>0?{jurosAto}:{}),forma:'fiado',pagamentos:null,status:'em_aberto',
      data:dataVenda,obs,vencimento:parcelas[0].vencimento,statusPedido,canalId,descontoExtra,tipo:'venda',
      parcelado:true,parcelas
    });
    itensFinal.forEach(it=>ajustarEstoque(it.produtoId,it.varianteId,-it.qtd,'venda'));
    showToast(`Venda parcelada em ${numParcelas}x criada! ✓`,'green');
  } else {
    const novoVendaId=nextId('vendas');
    state.vendas.push({id:novoVendaId,clienteId,itens:itensFinal,total,forma,pagamentos,status,data:dataVenda,obs,vencimento,statusPedido,canalId,descontoExtra,tipo:'venda'});
    itensFinal.forEach(it=>ajustarEstoque(it.produtoId,it.varianteId,-it.qtd,'venda'));
    const valorNaoFiado=total-valorFiado;
    const desc=itensFinal.map(it=>nomeItemVenda(it)).join(', ');
    sincronizarFinanceiroVenda(novoVendaId,valorNaoFiado,dataVenda,`Venda ${desc} - ${getCliente(clienteId).nome}${pagamentos?' (pagamento misto)':''}`);
    // Atalho "Entrada": registra um pagamento normal (mesmo mecanismo de registrarPagamento em
    // Contas a Receber), na data da venda. Segue a mesma regra FIFO de todo pagamento deste
    // sistema — se o cliente já tinha outra dívida em aberto mais antiga, é ela que abate
    // primeiro (ver getUnidadesFiadoFlat em 00-core.js); não é um abatimento amarrado só a
    // esta venda específica, porque nenhum pagamento neste app funciona assim.
    if(forma==='fiado' && entradaValor>0.009 && entradaValor<=total+0.01){
      const pagId=nextId('pagamentos');
      const entradaForma=document.getElementById('venda-entrada-forma').value;
      // entradaVendaId liga este pagamento à venda que o gerou: se a venda for excluída, a entrada
      // sai junto (pagamento + lançamento no Financeiro). Fica no PAGAMENTO — e não como vendaId no
      // lançamento — porque sincronizarFinanceiroVenda() procura lançamentos por vendaId e confundiria
      // a entrada com a parte não-fiado da venda.
      state.pagamentos.push({id:pagId,clienteId,valor:entradaValor,forma:entradaForma,obs:'Entrada na venda',data:dataVenda,entradaVendaId:novoVendaId});
      state.financeiro.push({id:nextId('financeiro'),tipo:'entrada',desc:`Entrada recebida — ${getCliente(clienteId).nome}`,valor:entradaValor,data:dataVenda,pagamentoId:pagId});
    }
    showToast('Venda registrada! ✓','green');
  }
  marcarAlterado();
  closeModal('modal-venda');renderVendas();renderDashboard();renderEstoque();
}
function editarVenda(id){
  const v=state.vendas.find(v=>v.id===id);
  document.getElementById('venda-edit-id').value=id;
  const isOrc=v.tipo==='orcamento';
  document.getElementById('modal-venda-title').textContent=isOrc?'Editar Orçamento':'Editar Venda';
  selecionarClienteVenda(v.clienteId);
  document.getElementById('venda-obs').value=v.obs||'';
  document.getElementById('venda-data').value=v.data||today();
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
  document.getElementById('venda-entrada-valor').value='';
  document.getElementById('venda-entrada-forma').value='dinheiro';
  toggleVendaEntradaShortcut();
  vendaItensTemp=v.itens.map(it=>criarLinhaItemVenda({produtoId:it.produtoId,varianteId:it.varianteId,qtd:it.qtd,preco:it.preco,avulso:!!it.avulso,nome:it.nome||'',custo:it.avulso?(it.custoFichaUn||0):0}));
  vendaResetCampos();
  renderVendaItensLista();
  popularCanalVenda();
  document.getElementById('venda-canal').value=v.canalId||'';
  document.getElementById('venda-desconto-extra').value=v.descontoExtra||'';
  calcTotalVendaGeral();
  // vendas já parceladas: não é possível reabrir o assistente de parcelamento (isso criaria
  // um novo cronograma do zero); em vez disso mostramos uma nota explicando o comportamento.
  const parcelarRow=document.getElementById('venda-parcelar-check').closest('span');
  document.getElementById('venda-parcelas-wrap').style.display='none';
  document.getElementById('venda-parcelar-check').checked=false;
  if(v.parcelado){
    if(parcelarRow) parcelarRow.style.display='none';
    document.getElementById('venda-parcelado-edit-note').style.display='block';
  } else {
    if(parcelarRow) parcelarRow.style.display='flex';
    document.getElementById('venda-parcelado-edit-note').style.display='none';
  }
  document.getElementById('venda-tipo-toggle-wrap').style.display=isOrc?'block':'none';
  setVendaTipo(isOrc?'orcamento':'venda');
  document.getElementById('modal-venda').classList.add('open');
}
function excluirVenda(id){
  const alvo=state.vendas.find(v=>v.id===id);
  if(!alvo) return;
  if(typeof vendaRenegociada==='function'&&vendaRenegociada(id)){showToast('Esta venda entrou numa renegociação. Desfaça a renegociação para excluí-la.','red');return;}
  const ehOrc=alvo.tipo==='orcamento';
  // Entradas registradas junto com esta venda (atalho "Entrada" em venda fiado) fazem parte do
  // dinheiro dela: saem junto — o pagamento e o lançamento no Financeiro. Antes ficavam órfãs:
  // o dinheiro continuava no Financeiro e o crédito abatia outra dívida do cliente.
  const entradas=ehOrc?[]:state.pagamentos.filter(p=>p.entradaVendaId===id);
  const idsEntradas=entradas.map(p=>p.id);
  let texto=ehOrc?'Excluir este orçamento? O estoque não é alterado (orçamento não baixa estoque).':'Excluir esta venda? O estoque será restaurado.';
  if(entradas.length){
    texto+=` A entrada de ${fmt(entradas.reduce((s,p)=>s+p.valor,0))} registrada junto com esta venda também será removida do Financeiro.`;
  }
  if(!ehOrc && alvo.forma==='fiado'){
    // Pagamentos não ficam presos a uma venda (saldo único por cliente, FIFO). Se, sem esta venda,
    // o cliente tiver pago mais que o fiado que sobra, o excedente continua valendo e abate a
    // próxima venda fiado dele — avisa em vez de deixar isso acontecer em silêncio.
    const fiadoRestante=state.vendas.filter(x=>x.id!==id&&x.clienteId==alvo.clienteId&&x.forma=='fiado').reduce((s,x)=>s+x.total,0);
    const pago=state.pagamentos.filter(p=>p.clienteId==alvo.clienteId&&!idsEntradas.includes(p.id)).reduce((s,p)=>s+p.valor,0);
    const excedente=parseFloat((pago-fiadoRestante).toFixed(2));
    if(excedente>0.009){
      texto+=` Atenção: sem esta venda, ${getCliente(alvo.clienteId).nome} fica com ${fmt(excedente)} pago a mais do que deve. Esse valor não some: abate a próxima venda fiado dele (ou estorne o pagamento em Financeiro).`;
    }
    // Entradas gravadas ANTES do vínculo existir: não dá pra saber com certeza de qual venda são.
    const antigas=state.pagamentos.filter(p=>p.clienteId==alvo.clienteId&&p.obs==='Entrada na venda'&&!p.entradaVendaId&&p.data===alvo.data);
    if(antigas.length){
      texto+=` Há também uma entrada de ${fmt(antigas.reduce((s,p)=>s+p.valor,0))} deste cliente em ${fmtDate(alvo.data)}, registrada antes desta correção, que NÃO sai junto. Se for desta venda, exclua-a depois em Financeiro.`;
    }
  }
  confirmarAcao(texto,()=>{
    const v=state.vendas.find(v=>v.id===id);
    if(!v) return;
    devolverEstoqueVenda(v);
    state.vendas=state.vendas.filter(v=>v.id!==id);
    // remove também o lançamento de entrada gerado pela parte não-fiado desta venda
    // (sem isso, ficava uma entrada "fantasma" pra sempre no Financeiro/Fluxo de Caixa)
    state.financeiro=state.financeiro.filter(f=>f.vendaId!==id);
    if(idsEntradas.length){
      state.pagamentos=state.pagamentos.filter(p=>!idsEntradas.includes(p.id));
      state.financeiro=state.financeiro.filter(f=>!(f.pagamentoId&&idsEntradas.includes(f.pagamentoId)));
    }
    marcarAlterado();salvarDados();
    showToast(ehOrc?'Orçamento excluído':'Venda excluída','green');renderVendas();renderDashboard();renderEstoque();renderFinanceiro();renderClientes();
  });
}

// ── Recibo de venda ──
let reciboVendaIdAtual=null;
function gerarTextoRecibo(v){
  const c=getCliente(v.clienteId);
  const linhas=v.itens.map(it=>`${nomeItemVenda(it)} — ${it.qtd}x ${fmt(it.preco)} = ${fmt(it.total)}`);
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
  const sit=situacaoVenda(v);
  const parcelasTxt=(v.parcelado&&sit.parcelas)?sit.parcelas.map(p=>
    `<div>Parcela ${p.parcelaNum}/${p.parcelaTotal} — ${fmtDate(p.vencimento)} — ${fmt(p.valor)} ${p.status==='pago'?'✓ paga':p.status==='parcial'?`(pago ${fmt(p.valorPago)})`:'em aberto'}</div>`
  ).join('') : '';
  document.getElementById('recibo-conteudo').innerHTML=`
    <div style="text-align:center;margin-bottom:10px">
      <strong style="font-size:15px">GestãoPRO</strong><br>
      <span style="font-size:11px;color:var(--muted)">Recibo de Venda</span>
    </div>
    <hr style="border:none;border-top:1px dashed var(--border);margin:10px 0">
    <div><strong>Nº:</strong> VD${String(v.id).padStart(4,'0')}</div>
    <div><strong>Cliente:</strong> ${escapeHtml(c.nome)}</div>
    <div><strong>Data:</strong> ${fmtDate(v.data)}</div>
    <hr style="border:none;border-top:1px dashed var(--border);margin:10px 0">
    ${linhas.map(l=>`<div>${l}</div>`).join('')}
    ${v.descontoExtra>0?`<div style="margin-top:6px;font-size:12px;color:var(--red)">Desconto: −${fmt(v.descontoExtra)}</div>`:''}
    ${v.jurosAto>0?`<div style="margin-top:6px;font-size:12px;color:var(--muted)">Juros no ato: +${fmt(v.jurosAto)}</div>`:''}
    <hr style="border:none;border-top:1px dashed var(--border);margin:10px 0">
    <div style="display:flex;justify-content:space-between;font-weight:800;font-size:15px"><span>TOTAL</span><span>${fmt(v.total)}</span></div>
    <div style="margin-top:6px;font-size:12px;color:var(--muted)"><strong>Pagamento:</strong> ${pagTxt}</div>
    <div style="margin-top:6px;font-size:12px;color:${sit.status==='pago'?'var(--green)':'var(--red)'}"><strong>Status:</strong> ${statusLabel(sit.status).txt}</div>
    ${parcelasTxt?`<div style="margin-top:6px;font-size:12px">${parcelasTxt}</div>`:''}
    <div style="margin-top:6px;font-size:12px"><strong>Pedido:</strong> ${statusPedidoLabel(v.statusPedido).txt}</div>
    ${v.obs?`<div style="margin-top:8px;font-size:12px;color:var(--muted)"><strong>Obs:</strong> ${escapeHtml(v.obs)}</div>`:''}
    ${reciboPixHtml(v,sit)}
  `;
  document.getElementById('modal-recibo').classList.add('open');
}
function imprimirRecibo(){
  const tmp=document.createElement('div');tmp.innerHTML=document.getElementById('recibo-conteudo').innerHTML;
  tmp.querySelectorAll('[data-noprint]').forEach(e=>e.remove());
  const conteudo=tmp.innerHTML;
  const w=window.open('','_blank');
  w.document.write(`<html><head><title>Recibo</title><style>:root{--text:#111;--muted:#666;--border:#ccc;--red:#c0392b;--green:#1e8449}body{font-family:Arial,sans-serif;max-width:380px;margin:24px auto;font-size:13px;line-height:1.6}hr{border:none;border-top:1px dashed #ccc;margin:10px 0}</style></head><body>${conteudo}</body></html>`);
  w.document.close();w.print();
}
function enviarReciboWhatsapp(){
  const v=state.vendas.find(v=>v.id===reciboVendaIdAtual);
  if(!v)return;
  const {c,linhas,pagTxt}=gerarTextoRecibo(v);
  const sit=situacaoVenda(v);
  const vencimentoLinha=sit.vencimentoPendente?`\n📅 Vencimento: ${fmtDate(sit.vencimentoPendente)}${v.parcelado?` (parcela ${(sit.parcelas.find(p=>p.status!=='pago')||{}).parcelaNum||''}/${sit.totalParcelas})`:''}`:'';
  const descontoLinha=v.descontoExtra>0?`\n🏷️ Desconto: −${fmt(v.descontoExtra)}`:'';
  const jurosLinha=v.jurosAto>0?`\n💲 Juros no ato: +${fmt(v.jurosAto)}`:'';
  const pedidoTxt=(v.statusPedido&&v.statusPedido!=='indefinido')?statusPedidoLabel(v.statusPedido).txt.replace(/^\S+\s/,''):'';
  const statusPedidoLinha=pedidoTxt?`\n📦 Pedido: ${pedidoTxt}`:'';
  const msg=`🧾 *Recibo de Venda — GestãoPRO*\n\nNº: VD${String(v.id).padStart(4,'0')}\nCliente: ${c.nome}\nData: ${fmtDate(v.data)}\n\n${linhas.join('\n')}${descontoLinha}${jurosLinha}\n\n*Total: ${fmt(v.total)}*\nPagamento: ${pagTxt}${vencimentoLinha}${statusPedidoLinha}${v.obs?`\nObs: ${v.obs}`:''}${(()=>{const d=pixDadosRecibo(v,sit);return d?'\n\n'+d.texto:'';})()}\n\nObrigado pela compra! 😊`;
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
  selecionarClienteVenda(null);
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
  vendaItensTemp=[];
  vendaResetCampos();
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
  o.itens.forEach(it=>{if(it.avulso||!it.produtoId)return;const k=`${it.produtoId}::${it.varianteId||''}`;necessidade[k]=(necessidade[k]||0)+it.qtd;});
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
          <button class="btn btn-green" id="btn-ok-converter">Confirmar</button>
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
    const nome=nomeItemVenda(it);
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
      ...vendas.map(v=>({tipo:'venda',data:v.data,desc:v.itens.map(it=>nomeItemVenda(it)+' ×'+it.qtd).join(', '),val:v.total})),
      ...pags.map(p=>({tipo:'pag',data:p.data,desc:'Pagou ('+p.forma+')',val:p.valor})),
      ...(state.renegociacoes||[]).filter(r=>r.clienteId===c.id).map(r=>({tipo:'reneg',data:r.data,desc:'Renegociação: '+r.parcelas.length+'x',val:r.total})),
    ].sort((a,b)=>b.data.localeCompare(a.data));
    return`<div class="client-debt-hero">
      <div><div class="name"><i data-lucide="user" class="ic ic-sm"></i> ${escapeHtml(c.nome)} <span style="font-size:12px;font-weight:400;opacity:.85">${fmtClienteNum(c.id)}</span></div>${c.tel?`<div class="phone"><i data-lucide="phone" class="ic ic-sm"></i> ${escapeHtml(c.tel)}</div>`:''}${(c.end||c.referencia)?`<div style="font-size:12px;opacity:.85;margin-top:2px"><i data-lucide="map-pin" class="ic ic-sm"></i> ${escapeHtml(c.end||'')}${c.end&&c.referencia?' · ':''}${escapeHtml(c.referencia||'')}</div>`:''}</div>
      <div style="text-align:right">
        <div class="amount">${fmt(c.saldo)}</div>
        <div class="amount-label">saldo devedor</div>
        ${typeof promessaHtmlReceber==='function'?promessaHtmlReceber(c.id):''}
        ${(()=>{const e=calcEncargosCliente(c.id);return e.total>0?`<div style="font-size:12px;margin-top:6px;opacity:.9">Encargos de atraso: ${fmt(e.total)}</div>`:'';})()}
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;justify-content:flex-end">
          <button class="btn btn-outline btn-sm" onclick="abrirExtrato(${c.id})"><i data-lucide="file-text" class="ic"></i> Extrato</button>
          <button class="btn btn-outline btn-sm" onclick="cobrarWhatsapp(${c.id})"><i data-lucide="message-circle" class="ic"></i> WhatsApp</button>
          <button class="btn btn-outline btn-sm" onclick="abrirPromessa(${c.id})"><i data-lucide="handshake" class="ic"></i> Promessa</button>
          <button class="btn btn-outline btn-sm" onclick="abrirRenegociar(${c.id})"><i data-lucide="refresh-cw" class="ic"></i> Renegociar</button>
          <button class="btn btn-primary btn-sm" onclick="abrirPagamento(${c.id})"><i data-lucide="banknote" class="ic"></i> Receber</button>
        </div>
      </div>
    </div>
    <div class="table-card" style="margin-bottom:24px">
      <div style="padding:16px 20px 8px"><strong style="font-size:13px;color:var(--muted)">HISTÓRICO</strong></div>
      <div class="table-scroll"><table><thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Valor</th></tr></thead>
      <tbody>${hist.map(h=>`<tr>
        <td>${fmtDate(h.data)}</td><td>${escapeHtml(h.desc)}</td>
        <td><span class="badge ${h.tipo==='venda'?'badge-blue':h.tipo==='reneg'?'badge-orange':'badge-green'}">${h.tipo==='venda'?'Compra':h.tipo==='reneg'?'Renegociação':'Pagamento'}</span></td>
        <td class="${h.tipo==='venda'?'debt-amount':h.tipo==='reneg'?'':'debt-zero'}">${h.tipo==='venda'?'-':h.tipo==='reneg'?'↻':'+'} ${fmt(h.val)}</td>
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
  document.getElementById('pag-data').value=today();
  const encAtivo=encargosCfg().ativo, enc=calcEncargosCliente(clienteId);
  document.getElementById('pag-encargo-wrap').style.display=encAtivo?'block':'none';
  document.getElementById('pag-encargo').value=(encAtivo&&enc.total>0)?enc.total.toFixed(2):'';
  document.getElementById('pag-encargo-info').textContent=(encAtivo&&enc.total>0)?`Calculado: multa ${fmt(enc.multa)} + juros ${fmt(enc.juros)}. Pode editar ou zerar.`:'Sem encargos calculados para este cliente.';
  document.getElementById('modal-pagamento').classList.add('open');
}
// "Receber tudo": preenche o saldo todo (principal) e o encargo calculado, se estiver ligado
function receberTudo(){
  const id=document.getElementById('pag-cliente-id').value;
  const saldo=getSaldoCliente(id);
  if(saldo<=0.009) return;
  document.getElementById('pag-valor').value=saldo.toFixed(2);
  calcRestante();
  const wrap=document.getElementById('pag-encargo-wrap');
  if(wrap&&wrap.style.display!=='none'){
    const enc=calcEncargosCliente(id).total;
    document.getElementById('pag-encargo').value=enc>0?enc.toFixed(2):'';
  }
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
  const data=document.getElementById('pag-data').value||today();
  const saldo=getSaldoCliente(clienteId);
  if(!valor||valor<=0){showToast('Informe o valor pago','red');return;}
  if(valor>saldo){showToast('Valor maior que o saldo devedor','red');return;}
  const encWrap=document.getElementById('pag-encargo-wrap');
  const encCobrado=(encWrap&&encWrap.style.display!=='none')?round2(parseFloat(document.getElementById('pag-encargo').value)||0):0;
  if(encCobrado<0){showToast('Juros/multa não pode ser negativo','red');return;}
  const pagId=nextId('pagamentos');
  // O pagamento reduz o saldo só pelo principal (valor). O encargo é guardado à parte.
  state.pagamentos.push({id:pagId,clienteId,valor,forma,obs,data,...(encCobrado>0?{encargo:encCobrado}:{})});
  // pagamentoId liga este lançamento ao pagamento acima — se o lançamento for excluído no
  // Financeiro, o pagamento é desfeito junto (ver excluirLancamento em 09-financeiro-relatorios.js),
  // senão o saldo devedor do cliente ficaria divergente do Financeiro
  state.financeiro.push({id:nextId('financeiro'),tipo:'entrada',desc:`Pagamento fiado — ${getCliente(clienteId).nome}`,valor,data,pagamentoId:pagId});
  if(encCobrado>0) state.financeiro.push({id:nextId('financeiro'),tipo:'entrada',desc:`Juros/multa de atraso — ${getCliente(clienteId).nome}`,valor:encCobrado,data,pagamentoId:pagId,encargo:true});
  marcarAlterado();
  showToast(`Pagamento de ${fmt(valor)} registrado!${encCobrado>0?' + '+fmt(encCobrado)+' de encargos':''}`,'green');
  closeModal('modal-pagamento');
  const pg=document.querySelector('.page.active');
  if(pg) render(pg.id.replace('page-',''));
  // oferece enviar o comprovante por WhatsApp (v5.38)
  const infoComp={clienteId,valor,encargo:encCobrado,forma,data,saldoRestante:getSaldoCliente(clienteId)};
  setTimeout(()=>perguntarComprovante(infoComp),250);
}

// ============ WHATSAPP ============
function cobrarWhatsapp(clienteId){
  const c=getCliente(clienteId);
  const saldo=getSaldoCliente(clienteId);
  const mapaFiado=getMapaSituacaoFiado();
  const vendas=state.vendas.filter(v=>v.clienteId===clienteId&&v.forma==='fiado'&&situacaoVenda(v,mapaFiado).status!=='pago');
  const lista=vendas.map(v=>`• ${fmtDate(v.data)} — ${v.itens.map(it=>nomeItemVenda(it)+' ('+it.qtd+'x)').join(', ')} = ${fmt(v.total)}`).join('\n')+(typeof renegLinhasCobranca==='function'?renegLinhasCobranca(clienteId):'');
  const enderecoLinha=(c.end||c.referencia)?`\n📍 ${c.end||''}${c.end&&c.referencia?' — ':''}${c.referencia||''}`:'';
  const enc=calcEncargosCliente(clienteId);
  const encTxt=enc.total>0?`\n\n⚠️ *Encargos de atraso:* ${fmt(enc.total)}\n(multa ${fmt(enc.multa)} + juros ${fmt(enc.juros)})\n*Total com encargos: ${fmt(saldo+enc.total)}*`:'';
  const msg=`Olá ${c.nome}! 👋\n\nPassando para lembrar do seu saldo em aberto:${enderecoLinha}\n\n${lista}\n\n*Total devedor: ${fmt(saldo)}*${encTxt}${pixBlocoCobranca(clienteId)}\n\nQualquer dúvida estou à disposição! 😊`;
  const tel=c.tel.replace(/\D/g,'');
  window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`,'_blank');
  registrarCobranca(clienteId); // guarda a data da última cobrança (v5.38)
}

// ============ IMPORTAR PEDIDOS — leitura + preview (v5.33.0, etapa 3) ============
// Formato de cada linha:  CLIENTE, PRODUTO:QTD; PRODUTO:QTD, OBSERVAÇÃO
// Nesta etapa NADA é gravado: só interpreta, valida e mostra o preview.
// A etapa 4 usa impPedSelecionadas() pra criar os orçamentos rascunho.
let impPed={linhas:[],checks:{},novos:{},novoKeys:[]};

function impPedNormNome(s){return String(s||'').replace(/\s+/g,' ').trim().toLowerCase();}

// Interpreta UMA linha de texto e valida contra o cadastro. Não altera o state.
function impPedAnalisarLinha(raw,n){
  const L={n,raw,erros:[],avisos:[],cliente:null,itens:[],obs:'',total:0,sig:'',dupAberto:null,dupLote:false,key:''};
  let txt=raw.replace(/^\s*(?:[-*•]|\d+[.)])\s+/,'').trim();
  const campos=txt.includes('\t')?txt.split('\t'):txt.split(',');
  const campoCli=(campos[0]||'').trim();
  const campoItens=(campos[1]||'').trim();
  let obs=campos.slice(2).join(', ').trim();
  if(obs==='?'){obs='';L.avisos.push('Observação veio como "?" e foi ignorada');}
  L.obs=obs;

  // ── Cliente ──
  if(!campoCli||campoCli==='?'){
    L.erros.push('Faltou o cliente ("?" ou vazio)');
  } else if(/^#\s*\d+(?:\s*[—–-].*)?$/.test(campoCli)||/^\d+$/.test(campoCli)){
    const id=parseCodigoCliente(campoCli.replace(/^(#\s*\d+)\s*[—–-].*$/,'$1'));
    const cli=id?state.clientes.find(c=>c.id===id):null;
    if(!cli) L.erros.push(`Cliente ${fmtClienteNum(id||0)} não existe`);
    else if(!estaAtivo(cli)) L.erros.push(`Cliente ${fmtClienteNum(cli.id)} (${cli.nome}) está arquivado`);
    else L.cliente={tipo:'id',id:cli.id,nome:cli.nome,via:'codigo'};
  } else {
    const nk=impPedNormNome(campoCli);
    const iguais=state.clientes.filter(c=>estaAtivo(c)&&impPedNormNome(c.nome)===nk);
    if(iguais.length===1){
      L.cliente={tipo:'id',id:iguais[0].id,nome:iguais[0].nome,via:'nome'};
    } else if(iguais.length>1){
      L.erros.push(`Nome ambíguo: "${campoCli}" existe ${iguais.length}x. Use o código: ${iguais.map(c=>fmtClienteNum(c.id)).join(' ou ')}`);
    } else {
      const arq=state.clientes.some(c=>!estaAtivo(c)&&impPedNormNome(c.nome)===nk);
      L.cliente={tipo:'novo',id:null,nome:campoCli.replace(/\s+/g,' ').trim(),key:nk,via:'novo',arquivadoIgual:arq};
    }
  }

  // ── Itens ──
  if(!campoItens||campoItens==='?'){
    L.erros.push('Faltaram os itens ("?" ou vazio)');
  } else {
    const mapa=new Map(); // produto+variante -> item (soma repetidos)
    campoItens.split(';').map(s=>s.trim()).filter(Boolean).forEach(parte=>{
      if(parte==='?'||/\?/.test(parte)){L.erros.push(`Item incompleto: "${parte}"`);return;}
      let cod,qtdTxt;
      if(parte.includes(':')){const i=parte.indexOf(':');cod=parte.slice(0,i).trim();qtdTxt=parte.slice(i+1).trim();}
      else{const m=parte.match(/^(\S+)\s*[x×]\s*(\S+)$/i);if(m){cod=m[1];qtdTxt=m[2];}else{cod=parte;qtdTxt='';}}
      if(!/^\d+$/.test(qtdTxt)||parseInt(qtdTxt,10)<=0||parseInt(qtdTxt,10)>9999){
        L.erros.push(`Quantidade inválida em "${parte}"`);return;
      }
      const qtd=parseInt(qtdTxt,10);
      const pc=parseCodigoProduto(cod);
      if(!pc){L.erros.push(`Código de produto inválido: "${cod}"`);return;}
      const p=state.produtos.find(p=>p.id===pc.produtoId);
      if(!p){L.erros.push(`Produto ${fmtProdutoCod(pc.produtoId)} não existe`);return;}
      if(!estaAtivo(p)){L.erros.push(`Produto ${fmtProdutoCod(p.id)} (${p.nome}) está arquivado`);return;}
      const temVar=p.variantes&&p.variantes.length>0;
      let vid=null;
      if(temVar){
        if(!pc.varianteId){
          L.erros.push(`${fmtProdutoCod(p.id)} tem variantes: use ${p.variantes.map(v=>`${fmtProdutoCod(p.id,v.id)} (${v.nome})`).join(' ou ')}`);return;
        }
        const v=p.variantes.find(v=>v.id===pc.varianteId);
        if(!v){L.erros.push(`Variante ${fmtProdutoCod(p.id,pc.varianteId)} não existe`);return;}
        vid=v.id;
      } else if(pc.varianteId){
        L.erros.push(`${fmtProdutoCod(p.id)} (${p.nome}) não tem variantes, use ${fmtProdutoCod(p.id)}`);return;
      }
      const k=p.id+'::'+(vid||'');
      if(mapa.has(k)){mapa.get(k).qtd+=qtd;L.avisos.push(`${fmtProdutoCod(p.id,vid)} repetido na linha: quantidades somadas`);}
      else mapa.set(k,{produtoId:p.id,varianteId:vid,qtd,preco:p.preco});
    });
    L.itens=[...mapa.values()].map(it=>{
      it.total=it.qtd*it.preco;
      it.cod=fmtProdutoCod(it.produtoId,it.varianteId);
      it.nome=nomeItemVenda(it);
      it.estoque=getEstoqueAtual(it.produtoId,it.varianteId);
      if(it.qtd>it.estoque) L.avisos.push(`Estoque menor que a qtd: ${it.nome} (pedido ${it.qtd}, disponível ${it.estoque}). Orçamento não abate estoque`);
      return it;
    });
    L.total=L.itens.reduce((s,it)=>s+it.total,0);
    if(L.itens.length===0&&L.erros.length===0) L.erros.push('Nenhum item válido na linha');
  }

  // assinatura (cliente + itens) pra detectar repetição
  if(L.cliente&&L.itens.length&&L.erros.length===0){
    const cKey=L.cliente.tipo==='id'?'id:'+L.cliente.id:'novo:'+L.cliente.key;
    L.sig=cKey+'|'+L.itens.map(it=>`${it.produtoId}-${it.varianteId||0}:${it.qtd}`).sort().join(',');
    if(L.cliente.tipo==='id'){
      const igual=state.vendas.find(v=>v.tipo==='orcamento'&&v.clienteId===L.cliente.id&&
        v.itens.map(it=>`${it.produtoId}-${it.varianteId||0}:${it.qtd}`).sort().join(',')===L.sig.split('|')[1]);
      if(igual) L.dupAberto=igual;
    }
  }
  return L;
}

function impPedLerTexto(){
  const el=document.getElementById('importar-pedidos-texto');
  const linhas=[];
  (el?el.value:'').split('\n').forEach((l,i)=>{
    const t=l.trim();
    if(!t||t.startsWith('```'))return;
    linhas.push({raw:t,n:i+1});
  });
  return linhas;
}

// chave estável da linha (texto + nº da ocorrência) pra preservar checkbox ao re-renderizar
function impPedChaveLinha(raw,contagem){
  const k=impPedNormNome(raw);
  contagem[k]=(contagem[k]||0)+1;
  return k+'#'+contagem[k];
}

function impPedLinhaImportavel(L){
  if(L.erros.length) return false;
  if(L.cliente&&L.cliente.tipo==='novo'){const nv=impPed.novos[L.cliente.key];if(nv&&nv.cadastrar===false)return false;}
  return true;
}
function impPedLinhaMarcada(L){
  if(!impPedLinhaImportavel(L)) return false;
  if(Object.prototype.hasOwnProperty.call(impPed.checks,L.key)) return !!impPed.checks[L.key];
  return !(L.dupAberto||L.dupLote); // repetidas vêm desmarcadas
}
// Linhas marcadas e válidas, prontas pra gravar (usado pela etapa 4).
function impPedSelecionadas(){return impPed.linhas.filter(impPedLinhaMarcada);}

function abrirImportarPedidos(){
  impPed={linhas:[],checks:{},novos:{},novoKeys:[]};
  document.getElementById('importar-pedidos-texto').value='';
  prevImportarPedidos();
  openModal('modal-importar-pedidos');
}

function prevImportarPedidos(){
  const base=impPedLerTexto();
  const cont={};
  const sigs={};
  impPed.linhas=base.map(b=>{
    const L=impPedAnalisarLinha(b.raw,b.n);
    L.key=impPedChaveLinha(b.raw,cont);
    if(L.sig){
      if(sigs[L.sig]){L.dupLote=true;L.avisos.push(`Repetida no lote (igual à linha ${sigs[L.sig]})`);}
      else sigs[L.sig]=L.n;
    }
    if(L.dupAberto) L.avisos.push(`Já existe orçamento aberto igual (${fmtDate(L.dupAberto.data)}, ${fmt(L.dupAberto.total)})`);
    return L;
  });
  // clientes novos (1 cadastro por nome, mesmo em várias linhas)
  impPed.novoKeys=[];
  impPed.linhas.forEach(L=>{
    if(L.cliente&&L.cliente.tipo==='novo'&&!impPed.novoKeys.includes(L.cliente.key)){
      impPed.novoKeys.push(L.cliente.key);
      if(!impPed.novos[L.cliente.key]) impPed.novos[L.cliente.key]={cadastrar:true,tel:'',rotaId:''};
    }
  });
  impPedRenderPreview();
}

function impPedRenderPreview(){
  const prev=document.getElementById('importar-pedidos-preview');
  if(!prev)return;
  const linhas=impPed.linhas;
  if(linhas.length===0){prev.innerHTML='';impPedAtualizarResumo();return;}
  const mostrouNovo={};
  const rotasOpts=(sel)=>'<option value="">Sem rota</option>'+state.rotas.map(r=>`<option value="${r.id}" ${String(sel)===String(r.id)?'selected':''}>${escapeHtml(r.nome)}</option>`).join('');
  const cards=linhas.map((L,i)=>{
    const ok=L.erros.length===0;
    const nv=(L.cliente&&L.cliente.tipo==='novo')?impPed.novos[L.cliente.key]:null;
    const naoCadastrar=nv&&nv.cadastrar===false;
    const importavel=impPedLinhaImportavel(L);
    const marcada=impPedLinhaMarcada(L);
    const icone=!ok?'❌':(naoCadastrar?'🚫':((L.dupAberto||L.dupLote)?'⚠️':(L.cliente.tipo==='novo'?'🆕':'✅')));
    let cliTxt='';
    if(L.cliente){
      cliTxt=L.cliente.tipo==='id'
        ?`<strong>${escapeHtml(L.cliente.nome)}</strong> <span style="color:var(--muted)">${fmtClienteNum(L.cliente.id)}${L.cliente.via==='nome'?' · casado por nome':''}</span>`
        :`<strong>${escapeHtml(L.cliente.nome)}</strong> <span class="badge badge-blue" style="font-size:10.5px">🆕 novo</span>`;
    } else cliTxt='<span style="color:var(--muted)">(cliente não identificado)</span>';
    const itensTxt=L.itens.length?L.itens.map(it=>`${it.qtd}× ${escapeHtml(it.nome)} <span style="color:var(--muted)">(${escapeHtml(it.cod)})</span>`).join('<br>'):'';
    const erros=L.erros.map(e=>`<div style="color:var(--red);font-size:12px">${escapeHtml(e)}</div>`).join('');
    const avisos=L.avisos.map(a=>`<div style="color:var(--gold-2);font-size:12px">${escapeHtml(a)}</div>`).join('');
    let novoBox='';
    if(L.cliente&&L.cliente.tipo==='novo'&&ok){
      if(!mostrouNovo[L.cliente.key]){
        mostrouNovo[L.cliente.key]=true;
        const idx=impPed.novoKeys.indexOf(L.cliente.key);
        novoBox=`<div style="margin-top:6px;padding:8px;background:var(--gold-soft);border-radius:8px;font-size:12px">
          <label style="display:flex;align-items:center;gap:6px;font-weight:600;cursor:pointer"><input type="checkbox" ${nv.cadastrar?'checked':''} onchange="impPedNovoToggle(${idx},this.checked)" style="width:auto;margin:0"> Cadastrar como novo cliente</label>
          ${L.cliente.arquivadoIgual?'<div style="color:var(--gold-2);margin-top:4px">Existe um cliente arquivado com esse nome. Reative-o em Clientes se for o mesmo.</div>':''}
          ${nv.cadastrar?`<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
            <input class="form-control" placeholder="Telefone (opcional)" value="${escapeHtml(nv.tel)}" oninput="impPedNovoCampo(${idx},'tel',this.value)" style="flex:1;min-width:130px;font-size:12.5px;padding:6px 8px">
            <select class="form-control" onchange="impPedNovoCampo(${idx},'rotaId',this.value)" style="flex:1;min-width:110px;font-size:12.5px;padding:6px 8px">${rotasOpts(nv.rotaId)}</select>
          </div>`:''}
        </div>`;
      } else {
        novoBox=`<div style="margin-top:4px;font-size:12px;color:var(--muted)">🆕 Mesmo cliente novo de outra linha: cadastrado uma vez só.</div>`;
      }
    }
    return `<div style="padding:9px 10px;border-bottom:1px solid var(--border);${(!importavel)?'background:var(--card-2);':''}">
      <div style="display:flex;gap:8px;align-items:flex-start">
        <input type="checkbox" id="impped-chk-${i}" ${marcada?'checked':''} ${importavel?'':'disabled'} onchange="impPedToggle(${i},this.checked)" style="width:auto;margin:4px 0 0 0">
        <div style="flex:1;min-width:0">
          <div style="font-size:11px;color:var(--muted)">${icone} Linha ${L.n}</div>
          <div style="font-size:13px">${cliTxt}</div>
          ${ok?`<div style="font-size:12.5px;margin-top:3px">${itensTxt}</div>
          <div style="font-size:12.5px;margin-top:3px"><strong>Total ${fmt(L.total)}</strong>${L.obs?` · 📝 ${escapeHtml(L.obs)}`:''}</div>`
          :`<div style="font-size:11.5px;color:var(--muted);margin:3px 0;word-break:break-word">${escapeHtml(L.raw)}</div>`}
          ${erros}${avisos}${novoBox}
        </div>
      </div>
    </div>`;
  }).join('');
  prev.innerHTML=`
    <div style="font-size:11px;color:var(--muted);letter-spacing:.5px;margin:10px 0 6px">PRÉ-VISUALIZAÇÃO</div>
    <div id="importar-pedidos-resumo" style="font-size:12.5px;margin-bottom:6px"></div>
    <div style="max-height:340px;overflow-y:auto;border:1px solid var(--border);border-radius:8px">${cards}</div>
    <div id="importar-pedidos-aviso-plan" style="font-size:11.5px;color:var(--muted);margin-top:8px"></div>`;
  impPedAtualizarResumo();
}

function impPedToggle(i,checked){
  const L=impPed.linhas[i];if(!L)return;
  impPed.checks[L.key]=!!checked;
  impPedAtualizarResumo();
}
function impPedNovoToggle(idx,checked){
  const k=impPed.novoKeys[idx];if(!k||!impPed.novos[k])return;
  impPed.novos[k].cadastrar=!!checked;
  impPedRenderPreview();
}
function impPedNovoCampo(idx,campo,valor){
  const k=impPed.novoKeys[idx];if(!k||!impPed.novos[k])return;
  impPed.novos[k][campo]=valor;
}
function impPedAtualizarResumo(){
  const btn=document.getElementById('importar-pedidos-btn');
  const linhas=impPed.linhas;
  const sel=impPedSelecionadas();
  const erros=linhas.filter(L=>L.erros.length).length;
  const avisos=linhas.filter(L=>!L.erros.length&&(L.dupAberto||L.dupLote)).length;
  const total=sel.reduce((s,L)=>s+L.total,0);
  if(btn){
    btn.disabled=sel.length===0;
    btn.textContent=`Importar ${sel.length} pedido${sel.length!==1?'s':''}`;
  }
  const r=document.getElementById('importar-pedidos-resumo');
  if(r) r.innerHTML=`✅ <strong>${sel.length}</strong> selecionado${sel.length!==1?'s':''} (${fmt(total)})${erros?` · ❌ ${erros} com erro`:''}${avisos?` · ⚠️ ${avisos} repetido${avisos!==1?'s':''} (desmarcado${avisos!==1?'s':''})`:''}`;
  const a=document.getElementById('importar-pedidos-aviso-plan');
  if(a) a.innerHTML=sel.length?'Rascunhos importados entram na conta do <strong>Planejamento de Materiais</strong> (como qualquer orçamento). Lá, marque <em>"só aprovados"</em> se não quiser contá-los.':'';
}

// Grava os orçamentos RASCUNHO das linhas marcadas. Não mexe em estoque, financeiro nem fiado:
// isso só roda quando o orçamento for aprovado e confirmado como venda.
function confirmarImportarPedidos(){
  const sel=impPedSelecionadas();
  if(sel.length===0){showToast('Nenhum pedido selecionado','red');return;}
  // 1) clientes novos: cadastra UMA vez por nome, mesmo com várias linhas
  const novosCriados={};   // key -> id
  let qtdNovos=0;
  sel.forEach(L=>{
    if(L.cliente.tipo!=='novo'||novosCriados[L.cliente.key])return;
    const nv=impPed.novos[L.cliente.key]||{};
    const id=nextId('clientes');
    state.clientes.push({id,nome:L.cliente.nome,tel:(nv.tel||'').trim(),end:'',referencia:'',rotaId:nv.rotaId?parseInt(nv.rotaId,10):null,ativo:true,dataCadastro:today()});
    novosCriados[L.cliente.key]=id;qtdNovos++;
  });
  // 2) orçamentos rascunho (preço do cadastro, sem canal; "fiado/pix" fica só na observação)
  const hoje=today();
  sel.forEach(L=>{
    const clienteId=L.cliente.tipo==='id'?L.cliente.id:novosCriados[L.cliente.key];
    const itens=L.itens.map(it=>({produtoId:it.produtoId,varianteId:it.varianteId||null,qtd:it.qtd,preco:it.preco,total:it.qtd*it.preco}));
    const total=itens.reduce((s,it)=>s+it.total,0);
    state.vendas.push({id:nextId('vendas'),clienteId,itens,total,obs:L.obs||'',canalId:null,descontoExtra:0,tipo:'orcamento',statusOrc:'rascunho',status:'em_aberto',data:hoje,origem:'importacao'});
  });
  marcarAlterado();
  showToast(`${sel.length} orçamento${sel.length!==1?'s':''} importado${sel.length!==1?'s':''}${qtdNovos?` · ${qtdNovos} cliente${qtdNovos!==1?'s':''} novo${qtdNovos!==1?'s':''}`:''} ✓`,'green');
  closeModal('modal-importar-pedidos');
  impPed={linhas:[],checks:{},novos:{},novoKeys:[]};
  // abre Vendas já em Orçamentos, sem busca de texto que esconda os importados
  state.venda_filter='';
  const bv=document.querySelector('#page-vendas .search-input');if(bv)bv.value='';
  goto('vendas');
  filterVendaTipo('orcamento');
  if(qtdNovos&&typeof renderClientes==='function')renderClientes();
  renderDashboard();
}
// Copia instruções de formato + clientes + produtos de uma vez, pra colar no chat da IA.
function copiarCodigosParaIA(){
  const cli=listaClientesTexto(), prod=listaProdutosTexto();
  const txt='Converta cada pedido em UMA linha, sem explicações:\n'+
    'CLIENTE, PRODUTO:QTD; PRODUTO:QTD, OBSERVAÇÃO\n'+
    '- CLIENTE: código com # (ex: #040). Se não estiver na lista, escreva só o nome.\n'+
    '- PRODUTO: só códigos da lista. Nunca invente.\n'+
    '- Se faltar informação, escreva "?" em vez de adivinhar.\n\n'+
    'CLIENTES\n'+(cli||'(nenhum)')+'\n\nPRODUTOS\n'+(prod||'(nenhum)');
  copiarTexto(txt,'Instruções + códigos copiados. Cole no chat da IA');
}
const prevImportarPedidosDebounced=debounce(prevImportarPedidos);
