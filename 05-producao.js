// ============ PRODUÇÃO ============
function renderProducao(){
  const tb=document.getElementById('producao-table');
  const prods=[...state.producoes].sort((a,b)=>b.data.localeCompare(a.data));
  if(prods.length===0){tb.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px"><div class="empty-inline"><i data-lucide="inbox"></i><span>Nenhuma produção registrada</span></div></td></tr>';}
  else{tb.innerHTML=prods.map(p=>{
    const diasVal=p.validade?Math.ceil((new Date(p.validade)-new Date(today()))/86400000):null;
    let validadeHtml='<span style="color:var(--muted);font-size:12px">—</span>';
    if(p.validade){
      let cor='var(--green)',icon='✓';
      if(diasVal<0){cor='var(--red)';icon='Vencido';}
      else if(diasVal<=15){cor='var(--yellow)';icon='⏳';}
      validadeHtml=`<span style="color:${cor};font-weight:600;font-size:12px">${icon} ${fmtDate(p.validade)}${diasVal>=0?` (${diasVal}d)`:''}</span>`;
    }
    return `<tr>
    <td data-label="Data">${fmtDate(p.data)}</td>
    <td data-label="Produto"><strong>${escapeHtml(getNomeCompletoItem(p.produtoId,p.varianteId))}</strong></td>
    <td data-label="Qtd">${p.qtd} un.</td>
    <td data-label="Custo"><strong style="color:var(--yellow)">${fmt(p.custo)}</strong></td>
    <td data-label="MP Consumida" class="td-block" style="font-size:12px;color:var(--muted)">${(p.consumo||[]).map(c=>{const info=nomeUnidadeItemFicha(c.tipo||'mp',c.mpId);return `${escapeHtml(info.nome)}: ${c.qtdConsumida}${info.unidade}`;}).join(' · ')}</td>
    <td data-label="Validade">${validadeHtml}</td>
    <td><button class="icon-btn del" onclick="excluirProducao(${p.id})" title="Excluir"><i data-lucide="trash-2" class="ic"></i></button></td>
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
  const pr=state.producoes.find(x=>x.id===id);
  if(!pr) return;
  const nome=getNomeCompletoItem(pr.produtoId,pr.varianteId);
  const atual=getEstoqueAtual(pr.produtoId,pr.varianteId);
  // Excluir um lote desfaz os dois lados dele: tira do estoque o que ele colocou e devolve ao
  // estoque o que ele consumiu (antes só apagava a linha, e o estoque ficava inflado). Se parte
  // do lote já saiu (venda/baixa), tirar tudo deixaria o estoque negativo — então bloqueia.
  if(atual<pr.qtd){
    const corpo=`Este lote colocou <strong>${pr.qtd}</strong> un. de <strong>${escapeHtml(nome)}</strong> no estoque, mas hoje só restam <strong>${atual}</strong> — o resto já saiu em venda ou baixa.<br><br>Excluir agora deixaria o estoque negativo. Só dá pra excluir um lote enquanto tudo o que ele produziu ainda está no estoque.`;
    if(typeof abrirAvisoDados==='function') abrirAvisoDados('Não dá pra excluir este lote',corpo,[{texto:'Entendi',classe:'btn-primary'}]);
    else showToast(`Não dá pra excluir: este lote colocou ${pr.qtd} un. no estoque, mas só restam ${atual}.`,'red');
    return;
  }
  const consumos=(pr.consumo||[]).map(c=>{
    const i=nomeUnidadeItemFicha(c.tipo||'mp',c.mpId);
    return `${i.nome}: ${parseFloat((c.qtdConsumida||0).toFixed(4))}${i.unidade}`;
  });
  confirmarAcao(`Excluir este lote? O estoque de "${nome}" diminui em ${pr.qtd} un.`+(consumos.length?` e o que ele consumiu volta ao estoque (${consumos.join(', ')}).`:'.'),()=>{
    const lote=state.producoes.find(x=>x.id===id);
    if(!lote) return;
    ajustarEstoque(lote.produtoId,lote.varianteId,-lote.qtd,'exclusao_producao');
    (lote.consumo||[]).forEach(c=>{
      const q=c.qtdConsumida;
      if(!(q>0)) return;
      if((c.tipo||'mp')==='semi'){
        const s=(state.semiacabados||[]).find(x=>x.id===c.mpId);
        if(s) ajustarSemiacabado(s,q,'exclusao_producao');
      } else {
        const mp=state.materias.find(m=>m.id===c.mpId);
        // volta ao custo médio ATUAL: não altera o CMP (mesma regra da entrada manual de estoque)
        if(mp) registrarEntradaMateria(mp,q,mp.custo||0,'exclusao_producao');
      }
    });
    state.producoes=state.producoes.filter(x=>x.id!==id);
    marcarAlterado();salvarDados();
    showToast('Lote excluído e estoque revertido','green');
    renderProducao();renderEstoque();renderAlertaEstoquePage();atualizarAlertBells();
  });
}
function populateProducaoModal(){
  const ps=document.getElementById('prod-produto');
  ps.innerHTML='<option value="">Selecione...</option>'+state.produtos.filter(p=>estaAtivo(p)).map(p=>`<option value="${p.id}">${escapeHtml(p.nome)}</option>`).join('');
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
    sel.innerHTML='<option value="">Padrão (sem variante)</option>'+p.variantes.map(v=>`<option value="${v.id}">${escapeHtml(v.nome)} (est: ${v.estoque})</option>`).join('');
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
  const rendimento=getRendimentoFicha(prodId,varianteId)||1;
  const pv=document.getElementById('prod-ficha-preview');
  const cv=document.getElementById('prod-custo-preview');
  if(!prodId||!ficha||ficha.length===0){pv.innerHTML=prodId?'<p style="color:var(--muted);font-size:12.5px;margin-top:8px">Este produto ainda não tem ficha técnica cadastrada.</p>':'';cv.style.display='none';return;}
  let custo=0;
  const html=ficha.map(f=>{
    const tipo=f.tipo||'mp';
    const {nome,unidade,disponivel}=nomeUnidadeItemFicha(tipo,f.mpId);
    const qtdNec=(f.qtd/rendimento)*qtd;
    custo+=qtdNec*custoItemFicha(tipo,f.mpId);
    const ok=disponivel>=qtdNec;
    return`<div class="recipe-item">
      <span class="mat">${tipo==='semi'?'🧪 ':''}${escapeHtml(nome)}</span>
      <span style="font-weight:600;color:${ok?'var(--green)':'var(--red)'}">${qtdNec.toFixed(2)} ${unidade}</span>
      <span class="unit">${ok?'✓':'insuficiente'}</span>
    </div>`;
  }).join('');
  pv.innerHTML=`<div style="background:var(--card-2);border-radius:8px;padding:12px;margin-top:8px"><div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:8px">INGREDIENTES</div>${html}</div>`;
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
  const rendimento=getRendimentoFicha(prodId,varianteId)||1;
  let custo=0;const consumo=[];
  for(const f of ficha){
    const tipo=f.tipo||'mp';
    const qtdNec=(f.qtd/rendimento)*qtd;
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
    const qtdNec=(f.qtd/rendimento)*qtd;
    custo+=qtdNec*custoItemFicha(tipo,f.mpId);
    if(tipo==='semi'){
      ajustarSemiacabado(getSemiacabado(f.mpId),-qtdNec,'producao');
    } else {
      registrarSaidaMateria(state.materias.find(m=>m.id===f.mpId), qtdNec,'producao');
    }
    consumo.push({tipo,mpId:f.mpId,qtdConsumida:qtdNec});
  }
  state.producoes.push({id:nextId('producoes'),produtoId:prodId,varianteId,qtd,custo,data:today(),consumo,validade});
  ajustarEstoque(prodId,varianteId,qtd,'producao');
  // Não lança mais uma "saída" financeira aqui: o custo da matéria-prima consumida já virou
  // despesa quando ela foi COMPRADA (state.compras/financeiro em 08-compras-fornecedores.js).
  // Lançar de novo aqui contaria o mesmo gasto duas vezes. O campo "custo" acima fica só como
  // referência histórica de quanto essa produção consumiu em matéria-prima.
  marcarAlterado();
  showToast(`Produção registrada! +${qtd} no estoque`,'green');
  closeModal('modal-producao');renderProducao();renderEstoque();renderAlertaEstoquePage();
}

// ============ FICHA TÉCNICA ============
function populateFichaModal(){
  const ps=document.getElementById('ficha-produto');
  const optsProdutos=state.produtos.map(p=>`<option value="p_${p.id}">${escapeHtml(p.nome)}</option>`).join('');
  const optsSemi=(state.semiacabados||[]).map(s=>`<option value="s_${s.id}">${escapeHtml(s.nome)}</option>`).join('');
  let html='<option value="">Selecione...</option>';
  html+='<option value="__new_p">➕ Criar novo Produto Acabado</option>';
  html+='<option value="__new_s">➕ Criar novo Semiacabado</option>';
  html+=optsProdutos?`<optgroup label="Produtos Acabados">${optsProdutos}</optgroup>`:'';
  html+=optsSemi?`<optgroup label="Semiacabados">${optsSemi}</optgroup>`:'';
  ps.innerHTML=html;
  document.getElementById('ficha-novo-item-form').style.display='none';
  document.getElementById('ficha-variante-wrap').style.display='none';
  document.getElementById('ficha-rendimento-wrap').style.display='none';
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
    document.getElementById('ficha-rendimento-wrap').style.display='none';
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
    sel.innerHTML='<option value="">Padrão (usa ficha base do produto)</option>'+p.variantes.map(v=>`<option value="${v.id}">${escapeHtml(v.nome)}</option>`).join('');
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
  const {tipo,prodId,varianteId,key}=fichaKeyAtual();
  const rendWrap=document.getElementById('ficha-rendimento-wrap');
  if(!tipo){renderFichaItens([]);rendWrap.style.display='none';return;}
  const ficha=tipo==='s'?(getSemiacabado(prodId).mps||[]):(key?(state.fichasVariante[key]||[]):(state.fichas[prodId]||[]));
  // sugestão de 250 quando a ficha ainda não tem rendimento salvo (a maioria das suas receitas
  // rende 250) — é só o valor mostrado no campo; os cálculos (custo, consumo, planejamento)
  // continuam usando 1 até você realmente clicar em "Salvar Ficha" com esse valor, pra não
  // mudar de repente o resultado de fichas antigas que ninguém configurou ainda.
  const rendimentoSalvo=tipo==='s'?getSemiacabado(prodId).rendimento:state.fichaRendimento[varianteId?key:prodId];
  document.getElementById('ficha-rendimento').value=rendimentoSalvo||250;
  rendWrap.style.display='block';
  renderFichaItens(ficha);
}
// Monta as opções de ingrediente disponíveis: matérias-primas do estoque + semiacabados já cadastrados
// (exclui o próprio semiacabado que está sendo editado, para evitar auto-referência)
function opcoesIngredientesFicha(valorSelecionado=''){
  const {tipo,prodId}=fichaKeyAtual();
  const optsMp=materiasOrdenadas().map(m=>{
    const value=`mp_${m.id}`;
    return `<option value="${value}"${valorSelecionado===value?' selected':''}>${escapeHtml(m.nome)} (${m.unidade})</option>`;
  }).join('');
  const semis=(state.semiacabados||[]).filter(s=>!(tipo==='s'&&s.id===prodId));
  const optsSemi=semis.map(s=>{
    const value=`semi_${s.id}`;
    return `<option value="${value}"${valorSelecionado===value?' selected':''}>${escapeHtml(s.nome)} (${s.unidade})</option>`;
  }).join('');
  let html=`<option value=""${valorSelecionado?'':' selected'}>Selecione o ingrediente</option>`;
  html+=optsMp?`<optgroup label="Matérias-Primas">${optsMp}</optgroup>`:'';
  html+=optsSemi?`<optgroup label="Semiacabados">${optsSemi}</optgroup>`:'';
  return html;
}
function renderFichaItens(ficha){
  const el=document.getElementById('ficha-itens');
  if(ficha.length===0){el.innerHTML='<p style="color:var(--muted);font-size:13px;margin-top:8px">Nenhum item na ficha.</p>';return;}
  el.innerHTML=`<div style="background:var(--card-2);border-radius:8px;padding:12px;margin-top:8px">
    ${ficha.map((f,i)=>{
      const valorAtual=f.tipo&&f.mpId!=null?`${f.tipo}_${f.mpId}`:'';
      return `<div class="recipe-item">
      <select class="form-control" id="ficha-mp-${i}" onchange="atualizarCustosFichaPreview()" style="flex:1;min-width:150px;padding:6px 10px">${opcoesIngredientesFicha(valorAtual)}</select>
      <input id="ficha-qtd-${i}" type="number" step="0.001" value="${f.qtd??0.1}" placeholder="Qtd" oninput="atualizarCustosFichaPreview()" style="width:88px;padding:6px;border:1.5px solid var(--border);border-radius:6px;font-size:13px">
      <button class="icon-btn del" onclick="removeFichaItem(${i})">✕</button>
      <div id="ficha-custo-linha-${i}" style="width:100%;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:11.5px;color:var(--muted);padding:0 2px 5px">
        <span>Preço: —</span><strong>Custo na mistura: —</strong>
      </div>
    </div>`;}).join('')}
  </div>
  <div id="ficha-custo-resumo" style="margin-top:10px;background:rgba(212,169,75,.08);border:1px solid var(--gold);border-radius:10px;padding:12px">
    <div style="display:flex;justify-content:space-between;gap:10px"><span style="color:var(--muted);font-size:12px">Custo total da mistura</span><strong id="ficha-custo-total" style="color:var(--gold)">${fmt(0)}</strong></div>
    <div style="display:flex;justify-content:space-between;gap:10px;margin-top:6px"><span style="color:var(--muted);font-size:12px">Custo por unidade produzida</span><strong id="ficha-custo-unidade">${fmt(0)}</strong></div>
  </div>`;
  el._ficha=ficha;
  atualizarCustosFichaPreview();
}
function atualizarCustosFichaPreview(){
  const el=document.getElementById('ficha-itens');
  if(!el)return;
  const rendimento=Math.max(0.000001,parseFloat(document.getElementById('ficha-rendimento')?.value)||1);
  let custoMistura=0;
  const linhas=el.querySelectorAll('[id^="ficha-mp-"]');
  linhas.forEach(sel=>{
    const i=sel.id.replace('ficha-mp-','');
    const raw=sel.value||'';
    const[tipo,idRaw]=raw?raw.split('_'):['',''];
    const qtd=parseFloat(document.getElementById(`ficha-qtd-${i}`)?.value)||0;
    const linha=document.getElementById(`ficha-custo-linha-${i}`);
    if(!linha)return;
    if(!tipo||!idRaw){
      linha.innerHTML='<span>Selecione um ingrediente para consultar o preço</span><strong>Custo: —</strong>';
      return;
    }
    const id=parseInt(idRaw,10);
    const unitario=custoItemFicha(tipo,id);
    const custoLinha=qtd*unitario;
    custoMistura+=custoLinha;
    const info=nomeUnidadeItemFicha(tipo,id);
    linha.innerHTML=`<span>Preço: ${fmt(unitario)} / ${escapeHtml(info.unidade||'un')}</span><strong style="color:var(--gold)">Custo na mistura: ${fmt(custoLinha)}</strong>`;
  });
  const total=document.getElementById('ficha-custo-total');
  const porUnidade=document.getElementById('ficha-custo-unidade');
  if(total)total.textContent=fmt(custoMistura);
  if(porUnidade)porUnidade.textContent=fmt(custoMistura/rendimento);
}
function salvarItensFichaNoEstado(tipo,prodId,key,ficha){
  if(tipo==='s')getSemiacabado(prodId).mps=ficha;
  else if(key)state.fichasVariante[key]=ficha;
  else state.fichas[prodId]=ficha;
}
function adicionarItemFicha(){
  const {tipo,prodId,key}=fichaKeyAtual();
  if(!tipo){showToast('Selecione o produto primeiro','red');return;}
  // Captura primeiro o que está na tela: adicionar uma linha não pode descartar
  // alterações ainda não salvas nos outros ingredientes.
  const fichaAtual=tipo==='s'?(getSemiacabado(prodId).mps||[]):(key?(state.fichasVariante[key]||[]):(state.fichas[prodId]||[]));
  const ficha=lerItensFichaDoForm(fichaAtual.length);
  ficha.push({tipo:'',mpId:null,qtd:0.1});
  salvarItensFichaNoEstado(tipo,prodId,key,ficha);
  renderFichaItens(ficha);
}
function removeFichaItem(i){
  const {tipo,prodId,key}=fichaKeyAtual();
  const fichaAtual=tipo==='s'?(getSemiacabado(prodId).mps||[]):(key?(state.fichasVariante[key]||[]):(state.fichas[prodId]||[]));
  const ficha=lerItensFichaDoForm(fichaAtual.length);
  ficha.splice(i,1);
  salvarItensFichaNoEstado(tipo,prodId,key,ficha);
  renderFichaItens(ficha);
}
function lerItensFichaDoForm(qtdItens){
  return Array.from({length:qtdItens},(_,i)=>{
    const raw=document.getElementById(`ficha-mp-${i}`)?.value||'';
    const[tipo,id]=raw?raw.split('_'):['',null];
    return{tipo,mpId:id===null?null:parseInt(id,10),qtd:parseFloat(document.getElementById(`ficha-qtd-${i}`)?.value)||0};
  });
}
function salvarFicha(){
  const {tipo,prodId,varianteId,key}=fichaKeyAtual();
  if(!tipo){showToast('Selecione o produto','red');return;}
  const rendimento=parseFloat(document.getElementById('ficha-rendimento').value)||1;
  const fichaAtual=tipo==='s'?(getSemiacabado(prodId).mps||[]):(key?(state.fichasVariante[key]||[]):(state.fichas[prodId]||[]));
  const nova=lerItensFichaDoForm(fichaAtual.length);
  if(nova.some(item=>!item.tipo||item.mpId==null||!Number.isFinite(item.mpId))){
    showToast('Selecione um ingrediente em todas as linhas antes de salvar','red');return;
  }
  if(tipo==='s'){
    const s=getSemiacabado(prodId);
    s.mps=nova;
    s.rendimento=rendimento;
    marcarAlterado();
    showToast('Ficha técnica salva!','green');closeModal('modal-ficha');
    return;
  }
  if(key)state.fichasVariante[key]=nova;else state.fichas[prodId]=nova;
  setRendimentoFicha(prodId,varianteId,rendimento);
  marcarAlterado();
  showToast('Ficha técnica salva!','green');closeModal('modal-ficha');
}
// Custo de um ingrediente (matéria-prima direta, ou semiacabado calculado recursivamente pela própria ficha dele)
function custoItemFicha(tipo,itemId,visitados=new Set()){
  if(tipo==='semi'){
    if(visitados.has(itemId))return 0; // evita loop em caso de referência circular
    visitados.add(itemId);
    const s=getSemiacabado(itemId);
    const rendS=s.rendimento||1;
    return (s.mps||[]).reduce((sum,m)=>sum+(m.qtd/rendS)*custoItemFicha(m.tipo||'mp',m.mpId,visitados),0);
  }
  return getMateria(itemId).custo;
}
function nomeUnidadeItemFicha(tipo,itemId){
  if(tipo==='semi'){const s=getSemiacabado(itemId);return{nome:s.nome,unidade:s.unidade,disponivel:s.estoque};}
  const m=getMateria(itemId);return{nome:m.nome,unidade:m.unidade,disponivel:m.qtd};
}

