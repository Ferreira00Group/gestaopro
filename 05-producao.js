// ============ PRODUÇÃO ============
function renderProducao(){
  const tb=document.getElementById('producao-table');
  const prods=[...state.producoes].sort((a,b)=>b.data.localeCompare(a.data));
  if(prods.length===0){tb.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">Nenhuma produção registrada</td></tr>';}
  else{tb.innerHTML=prods.map(p=>{
    const diasVal=p.validade?Math.ceil((new Date(p.validade)-new Date(today()))/86400000):null;
    let validadeHtml='<span style="color:var(--muted);font-size:12px">—</span>';
    if(p.validade){
      let cor='var(--green)',icon='✓';
      if(diasVal<0){cor='var(--red)';icon='⚠️ Vencido';}
      else if(diasVal<=15){cor='var(--yellow)';icon='⏳';}
      validadeHtml=`<span style="color:${cor};font-weight:600;font-size:12px">${icon} ${fmtDate(p.validade)}${diasVal>=0?` (${diasVal}d)`:''}</span>`;
    }
    return `<tr>
    <td data-label="Data">${fmtDate(p.data)}</td>
    <td data-label="Produto"><strong>${getNomeCompletoItem(p.produtoId,p.varianteId)}</strong></td>
    <td data-label="Qtd">${p.qtd} un.</td>
    <td data-label="Custo"><strong style="color:var(--yellow)">${fmt(p.custo)}</strong></td>
    <td data-label="MP Consumida" class="td-block" style="font-size:12px;color:var(--muted)">${(p.consumo||[]).map(c=>{const info=nomeUnidadeItemFicha(c.tipo||'mp',c.mpId);return `${info.nome}: ${c.qtdConsumida}${info.unidade}`;}).join(' · ')}</td>
    <td data-label="Validade">${validadeHtml}</td>
    <td><button class="icon-btn del" onclick="excluirProducao(${p.id})" title="Excluir">🗑️</button></td>
  </tr>`;}).join('');}
  const totalProd=state.producoes.reduce((s,p)=>s+p.custo,0);
  const vencendoEm15=state.producoes.filter(p=>p.validade&&Math.ceil((new Date(p.validade)-new Date(today()))/86400000)<=15&&Math.ceil((new Date(p.validade)-new Date(today()))/86400000)>=0).length;
  const vencidos=state.producoes.filter(p=>p.validade&&new Date(p.validade)<new Date(today())).length;
  document.getElementById('prod-stats').innerHTML=`
    <div class="stat-card yellow"><div class="label">Custo Total</div><div class="value">${fmt(totalProd)}</div><div class="sub">todos os lotes</div></div>
    <div class="stat-card blue"><div class="label">Lotes</div><div class="value">${state.producoes.length}</div><div class="sub">registrados</div></div>
    <div class="stat-card ${vencidos>0?'red':vencendoEm15>0?'yellow':''}"><div class="label">Validade</div><div class="value" style="color:${vencidos>0?'var(--red)':vencendoEm15>0?'var(--yellow)':'var(--navy)'}">${vencidos>0?vencidos+' vencido(s)':vencendoEm15+' a vencer'}</div><div class="sub">em até 15 dias</div></div>
  `;
}
function excluirProducao(id){
  confirmarAcao('Excluir este registro de produção?',()=>{
    state.producoes=state.producoes.filter(p=>p.id!==id);
    marcarAlterado();salvarDados();
    showToast('Produção excluída','green');renderProducao();
  });
}
function populateProducaoModal(){
  const ps=document.getElementById('prod-produto');
  ps.innerHTML='<option value="">Selecione...</option>'+state.produtos.map(p=>`<option value="${p.id}">${p.nome}</option>`).join('');
  document.getElementById('prod-qtd').value=1;
  document.getElementById('prod-validade').value='';
  document.getElementById('prod-variante-wrap').style.display='none';
  document.getElementById('prod-ficha-preview').innerHTML='';
  document.getElementById('prod-custo-preview').style.display='none';
}
function atualizarVariantesProducao(){
  const prodId=parseInt(document.getElementById('prod-produto').value);
  const wrap=document.getElementById('prod-variante-wrap');
  const sel=document.getElementById('prod-variante');
  const p=getProduto(prodId);
  if(p&&p.variantes&&p.variantes.length>0){
    sel.innerHTML='<option value="">Padrão (sem variante)</option>'+p.variantes.map(v=>`<option value="${v.id}">${v.nome} (est: ${v.estoque})</option>`).join('');
    wrap.style.display='block';
  } else {
    sel.innerHTML='<option value="">Padrão (sem variante)</option>';
    wrap.style.display='none';
  }
}
function mostrarFicha(){
  const prodId=parseInt(document.getElementById('prod-produto').value);
  const varianteId=parseInt(document.getElementById('prod-variante').value)||null;
  const qtd=parseInt(document.getElementById('prod-qtd').value)||1;
  const ficha=getFichaProdutoVariante(prodId,varianteId);
  const pv=document.getElementById('prod-ficha-preview');
  const cv=document.getElementById('prod-custo-preview');
  if(!prodId||!ficha||ficha.length===0){pv.innerHTML=prodId?'<p style="color:var(--muted);font-size:12.5px;margin-top:8px">Este produto ainda não tem ficha técnica cadastrada.</p>':'';cv.style.display='none';return;}
  let custo=0;
  const html=ficha.map(f=>{
    const tipo=f.tipo||'mp';
    const {nome,unidade,disponivel}=nomeUnidadeItemFicha(tipo,f.mpId);
    const qtdNec=f.qtd*qtd;
    custo+=qtdNec*custoItemFicha(tipo,f.mpId);
    const ok=disponivel>=qtdNec;
    return`<div class="recipe-item">
      <span class="mat">${tipo==='semi'?'🧪 ':''}${nome}</span>
      <span style="font-weight:600;color:${ok?'var(--green)':'var(--red)'}">${qtdNec.toFixed(2)} ${unidade}</span>
      <span class="unit">${ok?'✓':'⚠️ insuficiente'}</span>
    </div>`;
  }).join('');
  pv.innerHTML=`<div style="background:#F8F9FA;border-radius:8px;padding:12px;margin-top:8px"><div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:8px">INGREDIENTES</div>${html}</div>`;
  cv.style.display='block';
  document.getElementById('prod-custo-val').textContent=fmt(custo);
}
function registrarProducao(){
  const prodId=parseInt(document.getElementById('prod-produto').value);
  const varianteId=parseInt(document.getElementById('prod-variante').value)||null;
  const qtd=parseInt(document.getElementById('prod-qtd').value);
  const validade=document.getElementById('prod-validade').value||null;
  if(!prodId||!qtd){showToast('Selecione produto e quantidade','red');return;}
  const ficha=getFichaProdutoVariante(prodId,varianteId);
  if(!ficha||ficha.length===0){showToast('Cadastre a ficha técnica primeiro','red');return;}
  let custo=0;const consumo=[];
  for(const f of ficha){
    const tipo=f.tipo||'mp';
    const qtdNec=f.qtd*qtd;
    if(tipo==='semi'){
      const s=getSemiacabado(f.mpId);
      if(s.estoque<qtdNec){showToast(`Semiacabado insuficiente: ${s.nome}`,'red');return;}
    } else {
      const mp=state.materias.find(m=>m.id===f.mpId);
      if(!mp||mp.qtd<qtdNec){showToast(`MP insuficiente: ${mp?mp.nome:'?'}`,'red');return;}
    }
  }
  for(const f of ficha){
    const tipo=f.tipo||'mp';
    const qtdNec=f.qtd*qtd;
    custo+=qtdNec*custoItemFicha(tipo,f.mpId);
    if(tipo==='semi'){
      getSemiacabado(f.mpId).estoque-=qtdNec;
    } else {
      state.materias.find(m=>m.id===f.mpId).qtd-=qtdNec;
    }
    consumo.push({tipo,mpId:f.mpId,qtdConsumida:qtdNec});
  }
  state.producoes.push({id:nextId('producoes'),produtoId:prodId,varianteId,qtd,custo,data:today(),consumo,validade});
  ajustarEstoque(prodId,varianteId,qtd);
  state.financeiro.push({id:nextId('financeiro'),tipo:'saida',desc:`Produção ${getNomeCompletoItem(prodId,varianteId)} — ${qtd} un.`,valor:custo,data:today()});
  marcarAlterado();
  showToast(`Produção registrada! +${qtd} no estoque`,'green');
  closeModal('modal-producao');renderProducao();renderEstoque();renderAlertaEstoquePage();
}

// ============ FICHA TÉCNICA ============
function populateFichaModal(){
  const ps=document.getElementById('ficha-produto');
  const optsProdutos=state.produtos.map(p=>`<option value="p_${p.id}">${p.nome}</option>`).join('');
  const optsSemi=(state.semiacabados||[]).map(s=>`<option value="s_${s.id}">🧪 ${s.nome}</option>`).join('');
  let html='<option value="">Selecione...</option>';
  html+='<option value="__new_p">➕ Criar novo Produto Acabado</option>';
  html+='<option value="__new_s">➕ Criar novo Semiacabado</option>';
  html+=optsProdutos?`<optgroup label="Produtos Acabados">${optsProdutos}</optgroup>`:'';
  html+=optsSemi?`<optgroup label="Semiacabados">${optsSemi}</optgroup>`:'';
  ps.innerHTML=html;
  document.getElementById('ficha-novo-item-form').style.display='none';
  document.getElementById('ficha-variante-wrap').style.display='none';
  document.getElementById('ficha-itens').innerHTML='';
}
function onFichaProdutoChange(){
  const raw=document.getElementById('ficha-produto').value;
  const form=document.getElementById('ficha-novo-item-form');
  if(raw==='__new_p'||raw==='__new_s'){
    document.getElementById('ficha-novo-item-label').textContent=raw==='__new_p'?'Nome do novo Produto Acabado':'Nome do novo Semiacabado';
    document.getElementById('ficha-novo-item-nome').value='';
    form.dataset.tipo=raw==='__new_p'?'p':'s';
    form.style.display='block';
    document.getElementById('ficha-variante-wrap').style.display='none';
    document.getElementById('ficha-itens').innerHTML='';
    document.getElementById('ficha-novo-item-nome').focus();
    return;
  }
  form.style.display='none';
  atualizarVariantesFicha();carregarFicha();
}
function cancelarNovoItemFicha(){
  document.getElementById('ficha-novo-item-form').style.display='none';
  document.getElementById('ficha-produto').value='';
  document.getElementById('ficha-itens').innerHTML='';
}
function criarNovoItemFicha(){
  const tipo=document.getElementById('ficha-novo-item-form').dataset.tipo;
  const nome=document.getElementById('ficha-novo-item-nome').value.trim();
  if(!nome){showToast('Informe o nome','red');return;}
  let novoId;
  if(tipo==='p'){
    novoId=nextId('produtos');
    state.produtos.push({id:novoId,nome,sku:'',categoria:'',preco:0,estoque:0,minimo:0,variantes:[]});
    showToast('Produto criado! Agora monte a ficha técnica.','green');
  } else {
    novoId=nextId('semiacabados');
    if(!state.semiacabados)state.semiacabados=[];
    state.semiacabados.push({id:novoId,nome,unidade:'un',estoque:0,minimo:0,mps:[]});
    showToast('Semiacabado criado! Agora monte a ficha técnica.','green');
  }
  marcarAlterado();
  populateFichaModal();
  document.getElementById('ficha-produto').value=`${tipo}_${novoId}`;
  document.getElementById('ficha-novo-item-form').style.display='none';
  atualizarVariantesFicha();carregarFicha();
}
function fichaTipoESelId(){
  const raw=document.getElementById('ficha-produto').value;
  if(!raw||raw==='__new_p'||raw==='__new_s')return{tipo:null,id:null};
  const[tipo,id]=raw.split('_');
  return{tipo,id:parseInt(id)};
}
function atualizarVariantesFicha(){
  const{tipo,id}=fichaTipoESelId();
  const wrap=document.getElementById('ficha-variante-wrap');
  const sel=document.getElementById('ficha-variante');
  const p=tipo==='p'?getProduto(id):null;
  if(p&&p.variantes&&p.variantes.length>0){
    sel.innerHTML='<option value="">Padrão (usa ficha base do produto)</option>'+p.variantes.map(v=>`<option value="${v.id}">${v.nome}</option>`).join('');
    wrap.style.display='block';
  } else {
    sel.innerHTML='<option value="">Padrão (usa ficha base do produto)</option>';
    wrap.style.display='none';
  }
}
function fichaKeyAtual(){
  const{tipo,id:prodId}=fichaTipoESelId();
  const varianteId=tipo==='p'?(parseInt(document.getElementById('ficha-variante').value)||null):null;
  return {tipo,prodId,varianteId,key:varianteId?`${prodId}-${varianteId}`:null};
}
function carregarFicha(){
  const {tipo,prodId,key}=fichaKeyAtual();
  if(!tipo){renderFichaItens([]);return;}
  const ficha=tipo==='s'?(getSemiacabado(prodId).mps||[]):(key?(state.fichasVariante[key]||[]):(state.fichas[prodId]||[]));
  renderFichaItens(ficha);
}
// Monta as opções de ingrediente disponíveis: matérias-primas do estoque + semiacabados já cadastrados
// (exclui o próprio semiacabado que está sendo editado, para evitar auto-referência)
function opcoesIngredientesFicha(){
  const {tipo,prodId}=fichaKeyAtual();
  const optsMp=state.materias.map(m=>`<option value="mp_${m.id}">${m.nome} (${m.unidade})</option>`).join('');
  const semis=(state.semiacabados||[]).filter(s=>!(tipo==='s'&&s.id===prodId));
  const optsSemi=semis.map(s=>`<option value="semi_${s.id}">🧪 ${s.nome} (${s.unidade})</option>`).join('');
  let html='';
  html+=optsMp?`<optgroup label="Matérias-Primas">${optsMp}</optgroup>`:'';
  html+=optsSemi?`<optgroup label="Semiacabados">${optsSemi}</optgroup>`:'';
  return html;
}
function renderFichaItens(ficha){
  const el=document.getElementById('ficha-itens');
  if(ficha.length===0){el.innerHTML='<p style="color:var(--muted);font-size:13px;margin-top:8px">Nenhum item na ficha.</p>';return;}
  const opts=opcoesIngredientesFicha();
  el.innerHTML=`<div style="background:#F8F9FA;border-radius:8px;padding:12px;margin-top:8px">
    ${ficha.map((f,i)=>{
      const valorAtual=`${f.tipo||'mp'}_${f.mpId}`;
      return `<div class="recipe-item">
      <select class="form-control" id="ficha-mp-${i}" style="flex:1;padding:6px 10px">${opts.replace(`value="${valorAtual}"`,`value="${valorAtual}" selected`)}</select>
      <input id="ficha-qtd-${i}" type="number" step="0.001" value="${f.qtd}" placeholder="Qtd/unidade" style="width:100px;padding:6px;border:1.5px solid var(--border);border-radius:6px;font-size:13px">
      <button class="icon-btn del" onclick="removeFichaItem(${i})">✕</button>
    </div>`;}).join('')}
  </div>`;
  el._ficha=ficha;
}
function primeiroIngredienteDisponivel(){
  if(state.materias[0])return{tipo:'mp',mpId:state.materias[0].id};
  const {tipo,prodId}=fichaKeyAtual();
  const semi=(state.semiacabados||[]).find(s=>!(tipo==='s'&&s.id===prodId));
  if(semi)return{tipo:'semi',mpId:semi.id};
  return{tipo:'mp',mpId:1};
}
function adicionarItemFicha(){
  const {tipo,prodId,key}=fichaKeyAtual();
  if(!tipo){showToast('Selecione o produto primeiro','red');return;}
  const novoItem={...primeiroIngredienteDisponivel(),qtd:0.1};
  if(tipo==='s'){
    const s=getSemiacabado(prodId);
    s.mps=s.mps||[];
    s.mps.push(novoItem);
    renderFichaItens(s.mps);
    return;
  }
  const ficha=key?(state.fichasVariante[key]||[]):(state.fichas[prodId]||[]);
  ficha.push(novoItem);
  if(key)state.fichasVariante[key]=ficha;else state.fichas[prodId]=ficha;
  renderFichaItens(ficha);
}
function removeFichaItem(i){
  const {tipo,prodId,key}=fichaKeyAtual();
  if(tipo==='s'){
    const s=getSemiacabado(prodId);
    (s.mps||[]).splice(i,1);
    renderFichaItens(s.mps||[]);
    return;
  }
  const ficha=key?state.fichasVariante[key]:state.fichas[prodId];
  ficha.splice(i,1);
  renderFichaItens(ficha);
}
function lerItensFichaDoForm(qtdItens){
  return Array.from({length:qtdItens},(_,i)=>{
    const raw=document.getElementById(`ficha-mp-${i}`).value;
    const[tipo,id]=raw.split('_');
    return{tipo,mpId:parseInt(id),qtd:parseFloat(document.getElementById(`ficha-qtd-${i}`).value)||0};
  });
}
function salvarFicha(){
  const {tipo,prodId,key}=fichaKeyAtual();
  if(!tipo){showToast('Selecione o produto','red');return;}
  if(tipo==='s'){
    const s=getSemiacabado(prodId);
    const ficha=s.mps||[];
    s.mps=lerItensFichaDoForm(ficha.length);
    marcarAlterado();
    showToast('Ficha técnica salva!','green');closeModal('modal-ficha');
    return;
  }
  const ficha=key?(state.fichasVariante[key]||[]):(state.fichas[prodId]||[]);
  const nova=lerItensFichaDoForm(ficha.length);
  if(key)state.fichasVariante[key]=nova;else state.fichas[prodId]=nova;
  marcarAlterado();
  showToast('Ficha técnica salva!','green');closeModal('modal-ficha');
}
// Custo de um ingrediente (matéria-prima direta, ou semiacabado calculado recursivamente pela própria ficha dele)
function custoItemFicha(tipo,itemId,visitados=new Set()){
  if(tipo==='semi'){
    if(visitados.has(itemId))return 0; // evita loop em caso de referência circular
    visitados.add(itemId);
    const s=getSemiacabado(itemId);
    return (s.mps||[]).reduce((sum,m)=>sum+m.qtd*custoItemFicha(m.tipo||'mp',m.mpId,visitados),0);
  }
  return getMateria(itemId).custo;
}
function nomeUnidadeItemFicha(tipo,itemId){
  if(tipo==='semi'){const s=getSemiacabado(itemId);return{nome:s.nome,unidade:s.unidade,disponivel:s.estoque};}
  const m=getMateria(itemId);return{nome:m.nome,unidade:m.unidade,disponivel:m.qtd};
}

