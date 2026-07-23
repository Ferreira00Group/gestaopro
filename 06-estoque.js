// ============ ESTOQUE ============
function showEstoqueTab(tab,btn){
  state.estoque_tab=tab;
  document.querySelectorAll('#page-estoque .tabs .tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  const isForn=tab==='fornecedores';
  document.getElementById('estoque-produtos-wrap').style.display=isForn?'none':'';
  document.getElementById('estoque-fornecedores-wrap').style.display=isForn?'':'none';
  document.getElementById('eq-actions-estoque').style.display=isForn?'none':'flex';
  document.getElementById('eq-actions-fornecedores').style.display=isForn?'flex':'none';
  if(isForn){
    renderFornecedores();renderHistoricoCompras();renderHistoricoPreco();
    return;
  }
  showEstoqueSearch(tab!=='semiacabados');
  renderEstoque();
}
function filterEstoque(v){state.estoque_filter=v.toLowerCase();renderEstoque();}
const filterEstoqueDebounced=debounce(filterEstoque);
function showEstoqueSearch(show){
  const sw=document.querySelector('#page-estoque .search-bar');
  if(sw) sw.style.display=show?'':'none';
}
function filterEstoqueCategoria(cat){state.estoque_categoria_filter=cat;renderEstoque();}
function renderCategoriaPills(){
  const wrap=document.getElementById('estoque-cat-pills');
  if(!wrap)return;
  if(state.estoque_tab!=='produtos'){wrap.style.display='none';return;}
  const cats=[...new Set(state.produtos.map(p=>p.categoria).filter(Boolean))];
  if(cats.length===0){wrap.style.display='none';return;}
  wrap.style.display='flex';
  wrap.innerHTML=`<span class="cat-pill ${!state.estoque_categoria_filter?'active':''}" onclick="filterEstoqueCategoria('')">Todas</span>`+
    cats.map(c=>`<span class="cat-pill ${state.estoque_categoria_filter===c?'active':''}" onclick="filterEstoqueCategoria('${c}')">${c}</span>`).join('');
}
function renderEstoque(){
  const head=document.getElementById('estoque-head');
  const tb=document.getElementById('estoque-table');
  renderCategoriaPills();
  if(state.estoque_tab==='produtos'){
    head.innerHTML='<tr><th>Produto</th><th>SKU</th><th>Categoria</th><th>Preço Venda</th><th>Estoque</th><th>Mínimo</th><th>Status</th><th>Ações</th></tr>';
    let list=state.produtos;
    if(state.estoque_filter)list=list.filter(p=>p.nome.toLowerCase().includes(state.estoque_filter)||(p.sku||'').toLowerCase().includes(state.estoque_filter));
    if(state.estoque_categoria_filter)list=list.filter(p=>p.categoria===state.estoque_categoria_filter);
    tb.innerHTML=list.map(p=>{
      const temVariantes=p.variantes&&p.variantes.length>0;
      const estoqueTotal=temVariantes?p.variantes.reduce((s,v)=>s+v.estoque,0):p.estoque;
      const baixo=temVariantes?p.variantes.some(v=>v.estoque<=p.minimo):p.estoque<=p.minimo;
      const variantesTxt=temVariantes?`<div style="font-size:11px;color:var(--muted);margin-top:3px">${p.variantes.map(v=>`<span class="variante-tag">${v.nome}: ${v.estoque}</span>`).join('')}</div>`:'';
      return `<tr>
      <td data-label="Produto"><strong>${p.nome}</strong>${variantesTxt}</td>
      <td data-label="SKU" style="font-size:12px;color:var(--muted)">${p.sku||'-'}</td>
      <td data-label="Categoria">${p.categoria?`<span class="cat-pill" style="cursor:default">${p.categoria}</span>`:'-'}</td>
      <td data-label="Preço Venda">${fmt(p.preco)}</td>
      <td data-label="Estoque"><strong style="color:${baixo?'var(--red)':'var(--text)'}">${estoqueTotal}</strong></td>
      <td data-label="Mínimo">${p.minimo}</td>
      <td data-label="Status"><span class="badge ${baixo?'badge-red badge-alert':'badge-green'}">${baixo?'⚠️ Baixo':'OK'}</span></td>
      <td><div class="actions-cell">
        <button class="icon-btn edit" onclick="editarProduto(${p.id})" title="Editar">✏️</button>
        <button class="icon-btn del" onclick="excluirProduto(${p.id})" title="Excluir">🗑️</button>
      </div></td>
    </tr>`;}).join('');
  } else if(state.estoque_tab==='semiacabados'){
    renderSemiacabados();
  } else {
    head.innerHTML='<tr><th>Matéria-Prima</th><th>Estoque</th><th>Unidade</th><th>Custo/un</th><th>Mínimo</th><th>Fornecedor</th><th>Status</th><th>Previsão</th><th>Ações</th></tr>';
    let list=state.materias;
    if(state.estoque_filter)list=list.filter(m=>m.nome.toLowerCase().includes(state.estoque_filter));
    tb.innerHTML=list.map(m=>{
      const prev=calcularPrevisaoConsumo(m.id);
      let prevHtml='<span style="color:var(--muted);font-size:11px">sem histórico</span>';
      if(prev.consumoDiario>0){
        const cor=prev.diasRestantes<=7?'var(--red)':prev.diasRestantes<=20?'var(--yellow)':'var(--green)';
        prevHtml=`<span style="color:${cor};font-weight:600;font-size:12px">${prev.diasRestantes}d restantes</span><div style="font-size:10px;color:var(--muted)">~${prev.consumoDiario.toFixed(2)}${m.unidade}/dia</div>`;
      }
      const forn=m.fornecedorId?getFornecedor(m.fornecedorId):null;
      return `<tr>
      <td data-label="Matéria-Prima"><strong>${m.nome}</strong></td>
      <td data-label="Estoque"><strong style="color:${m.qtd<=m.minimo?'var(--red)':'var(--text)'}">${m.qtd}</strong></td>
      <td data-label="Unidade">${m.unidade}</td>
      <td data-label="Custo/un">${fmt(m.custo)}</td>
      <td data-label="Mínimo">${m.minimo} ${m.unidade}</td>
      <td data-label="Fornecedor">${forn?`<span style="font-size:12px;cursor:pointer;color:var(--blue)" onclick="gotoFornecedores()">${forn.nome}</span>`:'<span style="color:var(--muted);font-size:12px">—</span>'}</td>
      <td data-label="Status"><span class="badge ${m.qtd<=m.minimo?'badge-red badge-alert':'badge-green'}">${m.qtd<=m.minimo?'⚠️ Baixo':'OK'}</span></td>
      <td data-label="Previsão">${prevHtml}</td>
      <td><div class="actions-cell">
        <button class="icon-btn edit" onclick="editarMateria(${m.id})" title="Editar">✏️</button>
        <button class="icon-btn del" onclick="excluirMateria(${m.id})" title="Excluir">🗑️</button>
      </div></td>
    </tr>`;}).join('');
  }
}
function renderSemiacabados(){
  const head=document.getElementById('estoque-head');
  const tb=document.getElementById('estoque-table');
  const searchWrap=document.querySelector('#page-estoque .search-bar');
  if(searchWrap) searchWrap.style.display='none';
  head.innerHTML='<tr><th>Nome</th><th>Estoque</th><th>Mínimo</th><th>MP Utilizadas</th><th>Status</th><th>Ações</th></tr>';
  if(!state.semiacabados||state.semiacabados.length===0){
    tb.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:32px">Nenhum semiacabado cadastrado.</td></tr>';
    return;
  }
  tb.innerHTML=(state.semiacabados||[]).map(s=>{
    const baixo=s.estoque<=s.minimo;
    const mps=(s.mps||[]).map(mp=>{
      const m=state.materias.find(x=>x.id===mp.mpId);
      return m?`<span class="variante-tag">${m.nome}: ${mp.qtd}${m.unidade}/un</span>`:'';
    }).join('');
    return `<tr>
      <td data-label="Nome"><strong>${s.nome}</strong><div style="font-size:11px;color:var(--muted)">${s.unidade}</div></td>
      <td data-label="Estoque"><strong style="color:${baixo?'var(--red)':'var(--text)'}">${s.estoque}</strong> ${s.unidade}</td>
      <td data-label="Mínimo">${s.minimo} ${s.unidade}</td>
      <td data-label="MP Utilizadas" class="td-block" style="font-size:12px">${mps||'<span style="color:var(--muted)">—</span>'}</td>
      <td data-label="Status"><span class="badge ${baixo?'badge-red badge-alert':'badge-green'}">${baixo?'⚠️ Baixo':'OK'}</span></td>
      <td><div class="actions-cell">
        <button class="icon-btn edit" onclick="editarSemiacabado(${s.id})">✏️</button>
        <button class="icon-btn del" onclick="excluirSemiacabado(${s.id})">🗑️</button>
      </div></td>
    </tr>`;
  }).join('');
}
let semiMPsTemp=[];
function adicionarSemiMP(){
  const id=Date.now();
  semiMPsTemp.push({id,mpId:'',qtd:0});
  renderSemiMPLista();
}
function renderSemiMPLista(){
  const wrap=document.getElementById('semi-mp-lista');
  if(!wrap) return;
  if(semiMPsTemp.length===0){wrap.innerHTML='<p style="color:var(--muted);font-size:12px">Nenhuma MP adicionada.</p>';return;}
  wrap.innerHTML=semiMPsTemp.map((mp,i)=>{
    const opts=state.materias.map(m=>`<option value="${m.id}" ${m.id===mp.mpId?'selected':''}>${m.nome} (${m.unidade})</option>`).join('');
    return `<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
      <select class="form-control" style="flex:2" onchange="semiMPsTemp[${i}].mpId=parseInt(this.value)">
        <option value="">Selecione MP...</option>${opts}
      </select>
      <input class="form-control" style="flex:1;max-width:80px" type="number" step="0.01" placeholder="Qtd" value="${mp.qtd||''}" onchange="semiMPsTemp[${i}].qtd=parseFloat(this.value)||0">
      <button class="icon-btn del" onclick="semiMPsTemp.splice(${i},1);renderSemiMPLista()">✕</button>
    </div>`;
  }).join('');
}
function populateSemiacabadoModal(){
  document.getElementById('semi-edit-id').value='';
  document.getElementById('semi-nome').value='';
  document.getElementById('semi-estoque').value='';
  document.getElementById('semi-minimo').value='';
  document.getElementById('semi-unidade').value='L';
  semiMPsTemp=[];
  renderSemiMPLista();
  document.getElementById('modal-semi-title').textContent='Novo Semiacabado';
}
function salvarSemiacabado(){
  const eid=document.getElementById('semi-edit-id').value;
  const nome=document.getElementById('semi-nome').value.trim();
  const unidade=document.getElementById('semi-unidade').value;
  const estoque=parseFloat(document.getElementById('semi-estoque').value)||0;
  const minimo=parseFloat(document.getElementById('semi-minimo').value)||0;
  if(!nome){showToast('Informe o nome','red');return;}
  const mps=semiMPsTemp.filter(mp=>mp.mpId&&mp.qtd>0);
  if(!state.semiacabados) state.semiacabados=[];
  if(eid){
    const s=state.semiacabados.find(s=>s.id==eid);
    s.nome=nome;s.unidade=unidade;s.estoque=estoque;s.minimo=minimo;s.mps=mps;
    showToast('Semiacabado atualizado','green');
  } else {
    state.semiacabados.push({id:nextId('semiacabados'),nome,unidade,estoque,minimo,mps});
    showToast('Semiacabado cadastrado','green');
  }
  marcarAlterado();
  closeModal('modal-semiacabado');
  renderEstoque();
}
function editarSemiacabado(id){
  const s=state.semiacabados.find(s=>s.id===id);
  if(!s) return;
  document.getElementById('semi-edit-id').value=id;
  document.getElementById('semi-nome').value=s.nome;
  document.getElementById('semi-unidade').value=s.unidade||'L';
  document.getElementById('semi-estoque').value=s.estoque||0;
  document.getElementById('semi-minimo').value=s.minimo||0;
  semiMPsTemp=(s.mps||[]).map(mp=>({...mp}));
  renderSemiMPLista();
  document.getElementById('modal-semi-title').textContent='Editar Semiacabado';
  document.getElementById('modal-semiacabado').classList.add('open');
}
function excluirSemiacabado(id){
  confirmarAcao('Excluir este semiacabado?',()=>{
    state.semiacabados=state.semiacabados.filter(s=>s.id!==id);
    marcarAlterado();salvarDados();
    showToast('Semiacabado excluído','green');renderEstoque();
  });
}

// ============ BAIXA MANUAL ESTOQUE ============
function abrirBaixaEstoque(tipo){
  document.getElementById('baixa-tipo').value = tipo || 'produto';
  document.getElementById('baixa-qtd').value = '';
  document.getElementById('baixa-obs').value = '';
  document.getElementById('baixa-preview').style.display = 'none';
  renderBaixaItens();
  document.getElementById('modal-baixa-estoque').classList.add('open');
}
function renderBaixaItens(){
  const tipo = document.getElementById('baixa-tipo').value;
  const sel = document.getElementById('baixa-item');
  if(tipo === 'produto'){
    sel.innerHTML = '<option value="">Selecione...</option>' + state.produtos.flatMap(p => {
      if(p.variantes && p.variantes.length > 0){
        return p.variantes.map(v => `<option value="p:${p.id}:${v.id}">${p.nome} — ${v.nome} (est: ${v.estoque})</option>`);
      }
      return [`<option value="p:${p.id}:">${p.nome} (est: ${p.estoque})</option>`];
    }).join('');
  } else {
    sel.innerHTML = '<option value="">Selecione...</option>' + state.materias.map(m =>
      `<option value="m:${m.id}">${m.nome} — est: ${m.qtd} ${m.unidade}</option>`
    ).join('');
  }
  document.getElementById('baixa-estoque-atual').textContent = '';
  document.getElementById('baixa-preview').style.display = 'none';
}
function atualizarEstoqueBaixa(){
  const val = document.getElementById('baixa-item').value;
  const qtd = parseFloat(document.getElementById('baixa-qtd').value) || 0;
  const prev = document.getElementById('baixa-preview');
  const info = document.getElementById('baixa-estoque-atual');
  if(!val){info.textContent='';prev.style.display='none';return;}
  let estoqueAtual = 0, nomeItem = '';
  if(val.startsWith('p:')){
    const [,pid,vid] = val.split(':');
    const p = state.produtos.find(x=>x.id===parseInt(pid));
    if(p && vid){
      const v = p.variantes.find(x=>x.id===parseInt(vid));
      estoqueAtual = v ? v.estoque : 0;
      nomeItem = `${p.nome} — ${v?v.nome:''}`;
    } else if(p){
      estoqueAtual = p.estoque;
      nomeItem = p.nome;
    }
  } else {
    const mid = parseInt(val.split(':')[1]);
    const m = state.materias.find(x=>x.id===mid);
    if(m){estoqueAtual = m.qtd; nomeItem = `${m.nome} (${m.unidade})`;}
  }
  info.textContent = `Estoque atual: ${estoqueAtual}`;
  if(qtd > 0){
    const apos = estoqueAtual - qtd;
    if(apos < 0){
      prev.innerHTML = `⚠️ Quantidade maior que o estoque atual (${estoqueAtual}). Revise.`;
      prev.style.background='#FDECEA';prev.style.borderColor='var(--red)';
    } else {
      prev.innerHTML = `Após a baixa: <strong>${estoqueAtual}</strong> → <strong style="color:${apos<=0?'var(--red)':'var(--navy)'}">${apos.toFixed(2).replace(/\.00$/,'')}</strong>`;
      prev.style.background='#FEF9E7';prev.style.borderColor='var(--yellow)';
    }
    prev.style.display = 'block';
  } else {
    prev.style.display = 'none';
  }
}
function confirmarBaixaEstoque(){
  const val = document.getElementById('baixa-item').value;
  const qtd = parseFloat(document.getElementById('baixa-qtd').value) || 0;
  const motivo = document.getElementById('baixa-motivo').value;
  const obs = document.getElementById('baixa-obs').value.trim();
  if(!val){showToast('Selecione o item','red');return;}
  if(!qtd || qtd <= 0){showToast('Informe a quantidade','red');return;}
  let nomeItem='', estoqueAtual=0;
  if(val.startsWith('p:')){
    const [,pid,vid] = val.split(':');
    const p = state.produtos.find(x=>x.id===parseInt(pid));
    if(!p){showToast('Produto não encontrado','red');return;}
    if(vid){
      const v = p.variantes.find(x=>x.id===parseInt(vid));
      if(!v){showToast('Variante não encontrada','red');return;}
      estoqueAtual = v.estoque;
      if(qtd > estoqueAtual){showToast(`Estoque insuficiente (${estoqueAtual} disponíveis)`,'red');return;}
      v.estoque -= qtd;
      nomeItem = `${p.nome} — ${v.nome}`;
    } else {
      estoqueAtual = p.estoque;
      if(qtd > estoqueAtual){showToast(`Estoque insuficiente (${estoqueAtual} disponíveis)`,'red');return;}
      p.estoque -= qtd;
      nomeItem = p.nome;
    }
  } else {
    const mid = parseInt(val.split(':')[1]);
    const m = state.materias.find(x=>x.id===mid);
    if(!m){showToast('Matéria-prima não encontrada','red');return;}
    estoqueAtual = m.qtd;
    if(qtd > estoqueAtual){showToast(`Estoque insuficiente (${estoqueAtual} ${m.unidade} disponíveis)`,'red');return;}
    m.qtd = parseFloat((m.qtd - qtd).toFixed(4));
    nomeItem = `${m.nome}`;
  }
  const motivoLabel = {quebra:'Quebra/Dano',amostra:'Amostra/Brinde',perda:'Perda/Vencimento',uso_interno:'Uso interno',outro:'Outro'}[motivo]||motivo;
  state.baixasEstoque.push({id:nextId('baixasEstoque'),item:val,nomeItem,qtd,motivo,obs,data:today()});
  marcarAlterado();
  showToast(`Baixa de ${qtd} un. de "${nomeItem}" registrada (${motivoLabel})`,'green');
  closeModal('modal-baixa-estoque');
  renderEstoque();renderAlertaEstoquePage();atualizarAlertBells();
}

// ============ ENTRADA MANUAL DE ESTOQUE ============
function abrirEntradaEstoque(tipo){
  document.getElementById('entrada-tipo').value = tipo || 'materia';
  document.getElementById('entrada-qtd').value = '';
  document.getElementById('entrada-obs').value = '';
  document.getElementById('entrada-preview').style.display = 'none';
  renderEntradaItens();
  document.getElementById('modal-entrada-estoque').classList.add('open');
}
function renderEntradaItens(){
  const tipo = document.getElementById('entrada-tipo').value;
  const sel = document.getElementById('entrada-item');
  if(tipo === 'semiacabado'){
    sel.innerHTML = '<option value="">Selecione...</option>' + (state.semiacabados||[]).map(s =>
      `<option value="s:${s.id}">${s.nome} — est: ${s.estoque} ${s.unidade}</option>`
    ).join('');
  } else {
    sel.innerHTML = '<option value="">Selecione...</option>' + state.materias.map(m =>
      `<option value="m:${m.id}">${m.nome} — est: ${m.qtd} ${m.unidade}</option>`
    ).join('');
  }
  document.getElementById('entrada-estoque-atual').textContent = '';
  document.getElementById('entrada-preview').style.display = 'none';
}
function atualizarEstoqueEntrada(){
  const val = document.getElementById('entrada-item').value;
  const qtd = parseFloat(document.getElementById('entrada-qtd').value) || 0;
  const prev = document.getElementById('entrada-preview');
  const info = document.getElementById('entrada-estoque-atual');
  if(!val){info.textContent='';prev.style.display='none';return;}
  let estoqueAtual = 0, unidade='';
  if(val.startsWith('s:')){
    const s = getSemiacabado(parseInt(val.split(':')[1]));
    estoqueAtual = s.estoque; unidade = s.unidade;
  } else {
    const m = state.materias.find(x=>x.id===parseInt(val.split(':')[1]));
    if(m){estoqueAtual = m.qtd; unidade = m.unidade;}
  }
  info.textContent = `Estoque atual: ${estoqueAtual} ${unidade}`;
  if(qtd > 0){
    const apos = estoqueAtual + qtd;
    prev.innerHTML = `Após a entrada: <strong>${estoqueAtual}</strong> → <strong style="color:var(--green)">${apos.toFixed(2).replace(/\.00$/,'')}</strong> ${unidade}`;
    prev.style.display = 'block';
  } else {
    prev.style.display = 'none';
  }
}
function confirmarEntradaEstoque(){
  const val = document.getElementById('entrada-item').value;
  const qtd = parseFloat(document.getElementById('entrada-qtd').value) || 0;
  const obs = document.getElementById('entrada-obs').value.trim();
  if(!val){showToast('Selecione o item','red');return;}
  if(!qtd || qtd <= 0){showToast('Informe a quantidade','red');return;}
  let nomeItem='';
  if(val.startsWith('s:')){
    const s = getSemiacabado(parseInt(val.split(':')[1]));
    if(!s||!s.nome||s.nome==='?'){showToast('Semiacabado não encontrado','red');return;}
    s.estoque = parseFloat((s.estoque + qtd).toFixed(4));
    nomeItem = s.nome;
  } else {
    const m = state.materias.find(x=>x.id===parseInt(val.split(':')[1]));
    if(!m){showToast('Matéria-prima não encontrada','red');return;}
    m.qtd = parseFloat((m.qtd + qtd).toFixed(4));
    nomeItem = m.nome;
  }
  state.entradasEstoque.push({id:nextId('entradasEstoque'),item:val,nomeItem,qtd,obs,data:today()});
  marcarAlterado();
  showToast(`Entrada de ${qtd} un. de "${nomeItem}" registrada`,'green');
  closeModal('modal-entrada-estoque');
  renderEstoque();renderAlertaEstoquePage();atualizarAlertBells();
}

function calcularPrevisaoConsumo(materiaId,janelaDias=30){
  const limite=new Date();limite.setDate(limite.getDate()-janelaDias);
  let totalConsumido=0;
  state.producoes.forEach(p=>{
    if(new Date(p.data)>=limite){
      (p.consumo||[]).forEach(c=>{if((c.tipo||'mp')==='mp'&&c.mpId===materiaId)totalConsumido+=c.qtdConsumida;});
    }
  });
  const consumoDiario=totalConsumido/janelaDias;
  const m=getMateria(materiaId);
  const diasRestantes=consumoDiario>0?Math.floor(m.qtd/consumoDiario):null;
  return {consumoDiario,diasRestantes};
}

