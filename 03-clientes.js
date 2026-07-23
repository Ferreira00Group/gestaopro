// ============ CLIENTES ============
function fmtClienteNum(id){return '#'+String(id).padStart(3,'0')}
function renderClientes(){
  let list=state.clientes;
  if(state.cliente_filter)list=list.filter(c=>c.nome.toLowerCase().includes(state.cliente_filter)||c.tel.includes(state.cliente_filter)||fmtClienteNum(c.id).toLowerCase().includes(state.cliente_filter));
  if(state.cliente_status_filter==='devendo')list=list.filter(c=>getSaldoCliente(c.id)>0);
  if(state.cliente_status_filter==='em-dia')list=list.filter(c=>getSaldoCliente(c.id)===0);
  if(state.cliente_rota_filter==='none')list=list.filter(c=>!c.rotaId);
  else if(state.cliente_rota_filter)list=list.filter(c=>String(c.rotaId||'')===String(state.cliente_rota_filter));
  populateRotaFiltro();
  const tb=document.getElementById('clientes-table');
  if(list.length===0){tb.innerHTML='<tr><td colspan="10" style="text-align:center;color:var(--muted);padding:24px">Nenhum cliente encontrado</td></tr>';return;}
  tb.innerHTML=list.map(c=>{
    const saldo=getSaldoCliente(c.id);
    const rota=getRota(c.rotaId);
    const vendasCliente=state.vendas.filter(v=>v.clienteId===c.id);
    const ultimaCompra=vendasCliente.sort((a,b)=>b.data.localeCompare(a.data))[0];
    const ticketMedio=vendasCliente.length>0?(vendasCliente.reduce((s,v)=>s+v.total,0)/vendasCliente.length):0;
    // frequência: intervalo médio entre compras em dias
    let freqTxt='—';
    if(vendasCliente.length>=2){
      const datas=vendasCliente.map(v=>new Date(v.data)).sort((a,b)=>a-b);
      const diffTotal=(datas[datas.length-1]-datas[0])/(1000*60*60*24);
      const freq=Math.round(diffTotal/(datas.length-1));
      freqTxt=`a cada ${freq}d`;
    } else if(vendasCliente.length===1){freqTxt='1 compra';}
    return`<tr>
      <td data-label="Nº"><span style="font-family:monospace;color:var(--muted);font-weight:600">${fmtClienteNum(c.id)}</span></td>
      <td data-label="Nome"><strong>${c.nome}</strong><br><span style="font-size:11px;color:var(--muted)">${c.end||''}</span></td>
      <td data-label="Telefone">${c.tel}</td>
      <td data-label="Rota">${rota?`<span class="badge badge-blue">🗺️ ${rota.nome}</span>`:'<span style="color:var(--muted);font-size:12px">—</span>'}</td>
      <td data-label="Saldo" class="${saldo>0?'debt-amount debt-pulse':'debt-zero'}">${saldo>0?fmt(saldo):'Em dia ✓'}</td>
      <td data-label="Última Compra">${ultimaCompra?fmtDate(ultimaCompra.data):'-'}</td>
      <td data-label="Ticket Médio" style="font-size:13px"><strong>${ticketMedio>0?fmt(ticketMedio):'—'}</strong>${vendasCliente.length>0?`<div style="font-size:11px;color:var(--muted)">${vendasCliente.length} compra(s)</div>`:''}</td>
      <td data-label="Frequência" style="font-size:12px;color:var(--muted)">${freqTxt}</td>
      <td data-label="Status"><span class="badge ${saldo>0?'badge-red':'badge-green'}">${saldo>0?'Devendo':'Em dia'}</span></td>
      <td><div class="actions-cell">
        ${saldo>0?`<button class="btn btn-whatsapp btn-sm" onclick="cobrarWhatsapp(${c.id})">📲</button>`:''}
        ${saldo>0?`<button class="btn btn-green btn-sm" onclick="abrirPagamento(${c.id})">💰</button>`:''}
        <button class="icon-btn edit" onclick="editarCliente(${c.id})" title="Editar">✏️</button>
        <button class="icon-btn del" onclick="excluirCliente(${c.id})" title="Excluir">🗑️</button>
      </div></td>
    </tr>`;
  }).join('');
}
function populateRotaFiltro(){
  const sel=document.getElementById('clientes-rota-filter');
  if(!sel)return;
  const atual=sel.value;
  sel.innerHTML='<option value="">Todas as rotas</option>'+state.rotas.map(r=>`<option value="${r.id}">${r.nome}</option>`).join('')+'<option value="none">Sem rota</option>';
  sel.value=atual;
}
function filterClientes(v){state.cliente_filter=v.toLowerCase();renderClientes();}
const filterClientesDebounced=debounce(filterClientes);
function filterClienteStatus(v){state.cliente_status_filter=v;renderClientes();}
function filterClienteRota(v){state.cliente_rota_filter=v;renderClientes();}
// ============ ROTAS ============
function populateRotaSelect(selectedId){
  const sel=document.getElementById('cliente-rota');
  if(!sel)return;
  sel.innerHTML='<option value="">Sem rota</option>'+state.rotas.map(r=>`<option value="${r.id}">${r.nome}</option>`).join('');
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
      <input class="form-control" style="flex:1" value="${r.nome}" onchange="renomearRota(${r.id},this.value)">
      <span style="font-size:11px;color:var(--muted);white-space:nowrap">${qtd} cliente${qtd!==1?'s':''}</span>
      <button class="icon-btn del" onclick="excluirRota(${r.id})" title="Excluir rota">🗑️</button>
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
    state.clientes.forEach(c=>{if(c.rotaId===id)c.rotaId=null;});
    marcarAlterado();salvarDados();
    renderListaRotas();
    populateRotaSelect(document.getElementById('cliente-rota').value);
    renderClientes();
    showToast('Rota excluída','green');
  });
}
function clearClienteForm(){
  ['cliente-edit-id','cliente-nome','cliente-tel','cliente-end'].forEach(id=>document.getElementById(id).value='');
  populateRotaSelect('');
  document.getElementById('modal-cliente-title').textContent='Novo Cliente';
}
function salvarCliente(){
  const eid=document.getElementById('cliente-edit-id').value;
  const nome=document.getElementById('cliente-nome').value.trim();
  const tel=document.getElementById('cliente-tel').value.trim();
  const end=document.getElementById('cliente-end').value.trim();
  const rotaId=parseInt(document.getElementById('cliente-rota').value)||null;
  if(!nome){showToast('Informe o nome do cliente','red');return;}
  if(eid){
    const c=state.clientes.find(c=>c.id==eid);
    c.nome=nome;c.tel=tel;c.end=end;c.rotaId=rotaId;
    showToast('Cliente atualizado','green');
  } else {
    state.clientes.push({id:nextId('clientes'),nome,tel,end,rotaId});
    showToast('Cliente cadastrado','green');
  }
  marcarAlterado();
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
        <strong>${it.nome}</strong>
        <span style="color:var(--muted)">${it.tel||'sem telefone'}${it.end?' · '+it.end:''}${it.rota?' · 🗺️ '+it.rota:''}</span>
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
    state.clientes.push({id:nextId('clientes'),nome:it.nome,tel:it.tel,end:it.end,rotaId});
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
  populateRotaSelect(c.rotaId||'');
  document.getElementById('modal-cliente-title').textContent=`Editar Cliente ${fmtClienteNum(c.id)}`;
  document.getElementById('modal-cliente').classList.add('open');
}
function excluirCliente(id){
  confirmarAcao('Excluir este cliente? As vendas e pagamentos também serão removidos.',()=>{
    state.clientes=state.clientes.filter(c=>c.id!==id);
    state.vendas=state.vendas.filter(v=>v.clienteId!==id);
    state.pagamentos=state.pagamentos.filter(p=>p.clienteId!==id);
    marcarAlterado();salvarDados();
    showToast('Cliente excluído','green');renderClientes();renderDashboard();
  });
}

