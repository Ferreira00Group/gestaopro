// ============ FAB COM MENU DE AÇÕES RÁPIDAS ============
function toggleFabMenu(force){
  var wrap=document.getElementById('fab-wrap');
  var backdrop=document.getElementById('fab-backdrop');
  var open = typeof force==='boolean' ? force : !wrap.classList.contains('open');
  wrap.classList.toggle('open', open);
  backdrop.classList.toggle('open', open);
}
function fabAction(tipo){
  toggleFabMenu(false);
  setTimeout(function(){
    if(tipo==='venda'){
      goto('vendas');
      setTimeout(function(){ abrirNovaVenda(); }, 80);
    } else if(tipo==='orcamento'){
      goto('vendas');
      setTimeout(function(){ abrirNovaVenda(); setVendaTipo('orcamento'); }, 80);
    } else if(tipo==='cliente'){
      openModal('modal-cliente');
    } else if(tipo==='compra'){
      abrirRegistrarCompra();
      var f=document.getElementById('fab-wrap'); if(f) f.style.display='none';
    } else if(tipo==='receber'){
      goto('receber');
    }
  }, 180);
}
// Esconde o FAB quando modal abre, mostra ao fechar
(function(){
  var _open=window.openModal,_close=window.closeModal;
  window.openModal=function(id){if(_open)_open(id);toggleFabMenu(false);var f=document.getElementById('fab-wrap');if(f)f.style.display='none';};
  window.closeModal=function(id){if(_close)_close(id);setTimeout(function(){var anyOpen=document.querySelector('.modal-overlay.open');var f=document.getElementById('fab-wrap');if(f&&!anyOpen)f.style.display='flex';},350);};
})();

// ============ NOVO CLIENTE INLINE (modal de venda) ============
function toggleNovoClienteInline(){
  var wrap=document.getElementById('novo-cliente-inline');
  var isOpen=wrap.style.display==='block';
  wrap.style.display=isOpen?'none':'block';
  if(!isOpen){
    document.getElementById('nci-nome').value='';
    document.getElementById('nci-tel').value='';
    document.getElementById('nci-end').value='';
    document.getElementById('nci-referencia').value='';
    populateRotaSelect('','nci-rota');
    setTimeout(function(){document.getElementById('nci-nome').focus();},50);
  }
}
function cancelarNovoClienteInline(){
  document.getElementById('novo-cliente-inline').style.display='none';
}
function salvarNovoClienteInline(){
  var nome=document.getElementById('nci-nome').value.trim();
  if(!nome){showToast('Informe o nome do cliente','red');document.getElementById('nci-nome').focus();return;}
  var tel=document.getElementById('nci-tel').value.trim();
  var end=document.getElementById('nci-end').value.trim();
  var referencia=document.getElementById('nci-referencia').value.trim();
  var rotaId=parseInt(document.getElementById('nci-rota').value)||null;
  // Correção: usava Date.now() como id (inconsistente com o resto do app, que usa nextId — risco
  // de colisão futura com o contador) e salvava o endereço em "endereco", campo que nenhuma
  // outra tela lê (todo o resto do sistema usa "end") — o endereço digitado aqui nunca aparecia.
  var id=nextId('clientes');
  state.clientes.push({id:id,nome:nome,tel:tel,end:end,referencia:referencia,rotaId:rotaId,ativo:true,dataCadastro:today()});
  marcarAlterado();
  salvarDados();
  renderClientes();
  // Seleciona no combobox de cliente da venda (ver selecionarClienteVenda em 04-vendas.js)
  selecionarClienteVenda(id);
  document.getElementById('novo-cliente-inline').style.display='none';
  showToast('\u2705 Cliente "'+nome+'" cadastrado e selecionado!','green');
}

// ============ NOVO FORNECEDOR INLINE (modal de compra) ============
function toggleNovoFornecedorInline(){
  var wrap=document.getElementById('novo-fornecedor-inline');
  var isOpen=wrap.style.display==='block';
  wrap.style.display=isOpen?'none':'block';
  if(!isOpen){
    document.getElementById('nfi-nome').value='';
    document.getElementById('nfi-tel').value='';
    document.getElementById('nfi-contato').value='';
    setTimeout(function(){document.getElementById('nfi-nome').focus();},50);
  }
}
function cancelarNovoFornecedorInline(){
  document.getElementById('novo-fornecedor-inline').style.display='none';
}
function salvarNovoFornecedorInline(){
  var nome=document.getElementById('nfi-nome').value.trim();
  if(!nome){showToast('Informe o nome do fornecedor','red');document.getElementById('nfi-nome').focus();return;}
  var tel=document.getElementById('nfi-tel').value.trim();
  var contato=document.getElementById('nfi-contato').value.trim();
  var id=nextId('fornecedores');
  state.fornecedores.push({id:id,nome:nome,tel:tel,contato:contato});
  salvarDados();
  renderFornecedores();
  // Atualiza os dois selects de fornecedor no modal de compra
  var opts='<option value="">Selecione...</option>'+state.fornecedores.map(function(f){return'<option value="'+f.id+'">'+escapeHtml(f.nome)+'</option>';}).join('');
  var s1=document.getElementById('compra-fornecedor');
  var s2=document.getElementById('compra-fornecedor-colar');
  if(s1){s1.innerHTML=opts;s1.value=id;}
  if(s2){s2.innerHTML=opts;s2.value=id;}
  document.getElementById('novo-fornecedor-inline').style.display='none';
  showToast('✅ Fornecedor "'+nome+'" cadastrado e selecionado!','green');
}

function toggleNovoFornecedorInlineColar(){
  var wrap=document.getElementById('novo-fornecedor-inline-colar');
  var isOpen=wrap.style.display==='block';
  wrap.style.display=isOpen?'none':'block';
  if(!isOpen){
    document.getElementById('nfi-colar-nome').value='';
    document.getElementById('nfi-colar-tel').value='';
    document.getElementById('nfi-colar-contato').value='';
    setTimeout(function(){document.getElementById('nfi-colar-nome').focus();},50);
  }
}
function cancelarNovoFornecedorInlineColar(){
  document.getElementById('novo-fornecedor-inline-colar').style.display='none';
}
function salvarNovoFornecedorInlineColar(){
  var nome=document.getElementById('nfi-colar-nome').value.trim();
  if(!nome){showToast('Informe o nome do fornecedor','red');document.getElementById('nfi-colar-nome').focus();return;}
  var tel=document.getElementById('nfi-colar-tel').value.trim();
  var contato=document.getElementById('nfi-colar-contato').value.trim();
  var id=nextId('fornecedores');
  state.fornecedores.push({id:id,nome:nome,tel:tel,contato:contato});
  salvarDados();
  renderFornecedores();
  var opts='<option value="">Selecione...</option>'+state.fornecedores.map(function(f){return'<option value="'+f.id+'">'+escapeHtml(f.nome)+'</option>';}).join('');
  var s1=document.getElementById('compra-fornecedor');
  var s2=document.getElementById('compra-fornecedor-colar');
  if(s1){s1.innerHTML=opts;}
  if(s2){s2.innerHTML=opts;s2.value=id;}
  document.getElementById('novo-fornecedor-inline-colar').style.display='none';
  showToast('✅ Fornecedor "'+nome+'" cadastrado e selecionado!','green');
}

// ============ ALERT BELLS ============
function toggleAlertDrop(id){
  const isOpen=document.getElementById(id).classList.contains('open');
  // close all first
  document.querySelectorAll('.alert-dropdown').forEach(d=>d.classList.remove('open'));
  if(!isOpen){
    if(id==='drop-estoque') renderDropEstoque();
    if(id==='drop-cobranca') renderDropCobranca();
    if(id==='drop-pagar') renderDropPagar();
    document.getElementById(id).classList.add('open');
  }
}
function closeAlertDrop(id){document.getElementById(id).classList.remove('open');}
// close on outside click
document.addEventListener('click',function(e){
  if(!e.target.closest('.alert-bell')&&!e.target.closest('.alert-dropdown')){
    document.querySelectorAll('.alert-dropdown').forEach(d=>d.classList.remove('open'));
  }
});

function renderDropEstoque(){
  // produtos abaixo do mínimo
  const baixos=[];
  state.produtos.forEach(p=>{
    if(p.variantes&&p.variantes.length>0){
      p.variantes.forEach(v=>{if(v.estoque<=p.minimo)baixos.push({nome:`${p.nome} — ${v.nome}`,estoque:v.estoque,minimo:p.minimo});});
    } else {
      if(p.estoque<=p.minimo)baixos.push({nome:p.nome,estoque:p.estoque,minimo:p.minimo});
    }
  });
  // matérias-primas abaixo do mínimo
  state.materias.forEach(m=>{if(m.qtd<=m.minimo)baixos.push({nome:`🌿 ${m.nome}`,estoque:m.qtd,minimo:m.minimo,unidade:m.unidade});});

  const body=document.getElementById('drop-estoque-body');
  if(baixos.length===0){body.innerHTML='<div class="alert-empty">✅ Todos os itens com estoque OK!</div>';return;}
  body.innerHTML=baixos.map(b=>`
    <div class="alert-item">
      <div class="alert-item-info">
        <strong>${escapeHtml(b.nome)}</strong>
        <span>Estoque: <b style="color:var(--red)">${b.estoque}${b.unidade?' '+b.unidade:''}</b> · Mínimo: ${b.minimo}${b.unidade?' '+b.unidade:''}</span>
      </div>
      <div class="alert-item-action"><span style="font-size:18px">⚠️</span></div>
    </div>`).join('');
}

function renderDropCobranca(){
  const hj=today();
  const body=document.getElementById('drop-cobranca-body');
  let html='';

  // Vencimentos próximos (até 3 dias), não vencidos ainda
  const proximosVenc=getUnidadesFiadoFlat().filter(u=>u.vencimento&&u.status!=='pago'&&diasParaVencimento(u.vencimento,hj)>=0&&diasParaVencimento(u.vencimento,hj)<=3);
  if(proximosVenc.length>0){
    html+=`<div class="busca-grupo-titulo">⏰ Vencendo em breve</div>`;
    html+=proximosVenc.map(u=>{
      const c=getCliente(u.clienteId);
      const dias=diasParaVencimento(u.vencimento,hj);
      const label=dias===0?'Hoje':dias===1?'Amanhã':`Em ${dias}d`;
      return `<div class="alert-item">
        <div class="alert-item-info">
          <strong>${escapeHtml(c.nome)}</strong>
          <span><b style="color:#d35400">${label} · ${fmtDate(u.vencimento)}</b> · ${fmt(u.valorRestante)}</span>
        </div>
        <div class="alert-item-action">
          <button class="btn btn-whatsapp btn-sm" style="font-size:11px;padding:5px 9px" onclick="closeAlertDrop('drop-cobranca');cobrarWhatsapp(${c.id})">📲</button>
        </div>
      </div>`;
    }).join('');
  }

  const devedores=state.clientes
    .map(c=>({...c,saldo:getSaldoCliente(c.id)}))
    .filter(c=>c.saldo>0.01)
    .sort((a,b)=>b.saldo-a.saldo);

  if(devedores.length>0){
    html+=`<div class="busca-grupo-titulo">💸 Saldo em aberto</div>`;
    html+=devedores.map(c=>`
      <div class="alert-item">
        <div class="alert-item-info">
          <strong>${escapeHtml(c.nome)}</strong>
          <span>Deve: <b style="color:var(--red)">${fmt(c.saldo)}</b></span>
        </div>
        <div class="alert-item-action">
          <button class="btn btn-whatsapp btn-sm" style="font-size:11px;padding:5px 9px" onclick="closeAlertDrop('drop-cobranca');cobrarWhatsapp(${c.id})">📲</button>
        </div>
      </div>`).join('');
  }

  if(!html) html='<div class="alert-empty">🎉 Nenhum cliente com saldo em aberto!</div>';
  body.innerHTML=html;
}

// Espelha renderDropCobranca do lado do fornecedor (Contas a Pagar).
function renderDropPagar(){
  const hj=today();
  const body=document.getElementById('drop-pagar-body');
  let html='';

  const proximosVenc=getUnidadesPagarFlat().filter(u=>u.vencimento&&u.status!=='pago'&&diasParaVencimento(u.vencimento,hj)>=0&&diasParaVencimento(u.vencimento,hj)<=3);
  if(proximosVenc.length>0){
    html+=`<div class="busca-grupo-titulo">⏰ Vencendo em breve</div>`;
    html+=proximosVenc.map(u=>{
      const f=getFornecedor(u.fornecedorId);
      const dias=diasParaVencimento(u.vencimento,hj);
      const label=dias===0?'Hoje':dias===1?'Amanhã':`Em ${dias}d`;
      return `<div class="alert-item">
        <div class="alert-item-info">
          <strong>${f?escapeHtml(f.nome):'?'}</strong>
          <span><b style="color:#d35400">${label} · ${fmtDate(u.vencimento)}</b> · ${fmt(u.valorRestante)}</span>
        </div>
        <div class="alert-item-action">
          <button class="btn btn-sm" style="font-size:11px;padding:5px 9px;background:#8E44AD;color:#fff" onclick="closeAlertDrop('drop-pagar');abrirPagamentoFornecedor(${u.fornecedorId})">💰</button>
        </div>
      </div>`;
    }).join('');
  }

  const devedores=state.fornecedores
    .map(f=>({...f,saldo:getSaldoFornecedor(f.id)}))
    .filter(f=>f.saldo>0.01)
    .sort((a,b)=>b.saldo-a.saldo);

  if(devedores.length>0){
    html+=`<div class="busca-grupo-titulo">💸 Saldo em aberto</div>`;
    html+=devedores.map(f=>`
      <div class="alert-item">
        <div class="alert-item-info">
          <strong>${escapeHtml(f.nome)}</strong>
          <span>Deve: <b style="color:#8E44AD">${fmt(f.saldo)}</b></span>
        </div>
        <div class="alert-item-action">
          <button class="btn btn-sm" style="font-size:11px;padding:5px 9px;background:#8E44AD;color:#fff" onclick="closeAlertDrop('drop-pagar');abrirPagamentoFornecedor(${f.id})">💰</button>
        </div>
      </div>`).join('');
  }

  if(!html) html='<div class="alert-empty">🎉 Nenhum fornecedor com saldo em aberto!</div>';
  body.innerHTML=html;
}

function atualizarAlertBells(){
  // estoque
  let temEstoqueBaixo=false;
  state.produtos.forEach(p=>{
    if(p.variantes&&p.variantes.length>0){if(p.variantes.some(v=>v.estoque<=p.minimo))temEstoqueBaixo=true;}
    else{if(p.estoque<=p.minimo)temEstoqueBaixo=true;}
  });
  state.materias.forEach(m=>{if(m.qtd<=m.minimo)temEstoqueBaixo=true;});
  const be=document.getElementById('bell-estoque');if(be)be.classList.toggle('has-alert',temEstoqueBaixo);
  const beTop=document.getElementById('topbar-bell-estoque');if(beTop)beTop.classList.toggle('has-alert',temEstoqueBaixo);

  // cobrança (a receber): devedor OU vencimento em até 3 dias
  const hj=today();
  const temDevedor=state.clientes.some(c=>getSaldoCliente(c.id)>0.01);
  const temVencProx=getUnidadesFiadoFlat().some(u=>u.vencimento&&u.status!=='pago'&&diasParaVencimento(u.vencimento,hj)<=3&&diasParaVencimento(u.vencimento,hj)>=0);
  const bc=document.getElementById('bell-cobranca');if(bc)bc.classList.toggle('has-alert',temDevedor||temVencProx);
  const bcTop=document.getElementById('topbar-bell-cobranca');if(bcTop)bcTop.classList.toggle('has-alert',temDevedor||temVencProx);

  // a pagar (fornecedor): mesmo critério, espelhado
  const temAPagar=state.fornecedores.some(f=>getSaldoFornecedor(f.id)>0.01);
  const temVencProxPagar=getUnidadesPagarFlat().some(u=>u.vencimento&&u.status!=='pago'&&diasParaVencimento(u.vencimento,hj)<=3&&diasParaVencimento(u.vencimento,hj)>=0);
  const bp=document.getElementById('bell-pagar');if(bp)bp.classList.toggle('has-alert',temAPagar||temVencProxPagar);
  const bpTop=document.getElementById('topbar-bell-pagar');if(bpTop)bpTop.classList.toggle('has-alert',temAPagar||temVencProxPagar);
}

