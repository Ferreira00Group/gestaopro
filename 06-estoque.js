// ============ ESTOQUE ============
function showEstoqueTab(tab,btn){
  state.estoque_tab=tab;
  document.querySelectorAll('#page-estoque .tabs .tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  const isForn=tab==='fornecedores', isMov=tab==='movimentos';
  document.getElementById('estoque-produtos-wrap').style.display=(isForn||isMov)?'none':'';
  document.getElementById('estoque-mov-wrap').style.display=isMov?'':'none';
  document.getElementById('estoque-fornecedores-wrap').style.display=isForn?'':'none';
  document.getElementById('eq-actions-estoque').style.display=isForn?'none':'flex';
  document.getElementById('eq-actions-fornecedores').style.display=isForn?'flex':'none';
  if(isMov){
    renderMovEstoque();
    return;
  }
  if(isForn){
    renderFornecedores();renderHistoricoCompras();renderHistoricoPreco();
    return;
  }
  showEstoqueSearch(true);
  const btnCopiar=document.getElementById('btn-copiar-lista-estoque');
  if(btnCopiar) btnCopiar.style.display=(tab==='produtos')?'':'none';
  const chkArq=document.getElementById('estoque-mostrar-arquivados');
  if(chkArq) chkArq.style.display=(tab==='produtos')?'inline-flex':'none';
  const chkIna=document.getElementById('estoque-mostrar-inativas');
  if(chkIna) chkIna.style.display=(tab==='materias')?'inline-flex':'none';
  renderEstoque();
}
// Texto da lista de produtos ATIVOS, uma linha por item vendável (variante tem linha própria;
// produto com variantes não ganha linha do pai, pois a venda exige a variante). Usado também
// pelo "Copiar códigos p/ IA" (Importar Pedidos).
function listaProdutosTexto(){
  const linhas=[];
  state.produtos.filter(p=>estaAtivo(p)).forEach(p=>{
    const tam=p.tamanho?' '+p.tamanho:'';
    if(p.variantes&&p.variantes.length>0){
      p.variantes.forEach(v=>linhas.push(`${fmtProdutoCod(p.id,v.id)} — ${p.nome}${tam} — ${v.nome}`));
    } else {
      linhas.push(`${fmtProdutoCod(p.id)} — ${p.nome}${tam}`);
    }
  });
  return linhas.join('\n');
}
function copiarListaEstoque(){
  const txt=listaProdutosTexto();
  if(!txt){showToast('Nenhum produto ativo para copiar','red');return;}
  copiarTexto('PRODUTOS\n'+txt,''+txt.split('\n').length+' itens de estoque copiados');
}
function filterEstoque(v){state.estoque_filter=v.toLowerCase();renderEstoque();}
function estoqueBaixoLimpar(){estoqueBaixoFiltro=false;renderEstoque();}
function estoqueBaixoTrocarAba(){
  const paraMaterias=state.estoque_tab==='produtos';
  const aba=document.querySelector('#page-estoque .tabs .tab:nth-child('+(paraMaterias?3:1)+')');
  if(aba) showEstoqueTab(paraMaterias?'materias':'produtos',aba);
}
// Selo "Abaixo do mínimo" (Produtos e Matérias-Primas); avisa se a outra aba também tem itens baixos
function renderEstoqueFiltroBaixo(){
  const el=document.getElementById('estoque-filtro-baixo');
  if(!el) return;
  const tab=state.estoque_tab;
  if(!estoqueBaixoFiltro||(tab!=='produtos'&&tab!=='materias')){el.innerHTML='';return;}
  const a=getAlertasEstoque();
  const outros=tab==='produtos'?a.baixoMaterias.length:a.baixoProdutos.length;
  const nomeOutra=tab==='produtos'?'Matérias-Primas':'Produtos Acabados';
  const extra=outros>0?`<a class="filtro-ativo-link" onclick="estoqueBaixoTrocarAba()">Também há ${outros} em ${nomeOutra} →</a>`:'';
  el.innerHTML=filtroAtivoHtml('Abaixo do mínimo','estoqueBaixoLimpar()',extra);
}
const filterEstoqueDebounced=debounce(filterEstoque);
function filterEstoqueArquivados(checked){state.estoque_mostrar_arquivados=checked;renderEstoque();}
function showEstoqueSearch(show){
  const sw=document.querySelector('#page-estoque .search-bar');
  if(sw) sw.style.display=show?'':'none';
}
function filterEstoqueInativas(checked){state.estoque_mostrar_inativas=checked;renderEstoque();}
function toggleMateriaAtiva(id){
  const m=state.materias.find(x=>x.id===id);
  if(!m) return;
  if(estaAtivo(m)) m.ativo=false; else delete m.ativo;
  marcarAlterado();
  showToast(estaAtivo(m)?'Matéria-prima ativada':'Matéria-prima inativada — não conta mais como estoque baixo','green');
  renderEstoque();renderAlertaEstoquePage();atualizarAlertBells();
  if(typeof state.planejamento_apenas_aprovados!=='undefined'&&document.getElementById('page-planejamento')&&document.getElementById('page-planejamento').classList.contains('active')) renderPlanejamento();
}
// ============ STEPPER (− n +) DE ESTOQUE ============
// tipo: 'p' produto (vid = id da variante ou null) · 'm' matéria-prima · 's' semiacabado.
// Cada ajuste vira uma linha em Movimentações (origem "ajuste_rapido"). Em matéria-prima
// passa por registrarEntradaMateria/registrarSaidaMateria para manter o custo médio (CMP) coerente:
// a entrada entra ao custo médio atual (neutra) e a saída sai ao custo médio atual.
const _STP_SVG_MENOS='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"/></svg>';
const _STP_SVG_MAIS='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12M12 6v12"/></svg>';
function stepperHtml(tipo,id,vid,valor,baixo,sufixo){
  const v=parseFloat((parseFloat(valor)||0).toFixed(4));
  const txt=String(v).replace('.',',');
  const args=`'${tipo}',${id},${vid==null?'null':vid}`;
  return `<div class="stp-wrap"><div class="stepper${baixo?' low':''}">`+
    `<button type="button" class="stp-btn stp-minus" onclick="stepperClick(${args},-1)" ${v<=0?'disabled':''} aria-label="Diminuir">${_STP_SVG_MENOS}</button>`+
    `<input type="text" class="stp-val" inputmode="decimal" value="${txt}" style="width:${Math.max(3,txt.length+1)}ch" onfocus="this.select()" onkeydown="if(event.key==='Enter')this.blur()" onchange="stepperDigitado(this,${args})" aria-label="Quantidade em estoque">`+
    `<button type="button" class="stp-btn stp-plus" onclick="stepperClick(${args},1)" aria-label="Aumentar">${_STP_SVG_MAIS}</button>`+
    `</div>${sufixo?`<span class="stp-un">${escapeHtml(sufixo)}</span>`:''}</div>`;
}
function estoqueProdutoHtml(p,temVariantes,estoqueTotal,baixo){
  if(!temVariantes) return stepperHtml('p',p.id,null,p.estoque,baixo);
  return `<div class="stp-list">${p.variantes.map(v=>`<div class="stp-row"><span class="stp-lbl">${escapeHtml(v.nome)}</span>${stepperHtml('p',p.id,v.id,v.estoque,v.estoque<=p.minimo)}</div>`).join('')}<div class="stp-total">Total: <strong>${estoqueTotal}</strong></div></div>`;
}
function stepperItem(tipo,id,vid){
  if(tipo==='m'){const m=state.materias.find(x=>x.id===id);return m?{obj:m,campo:'qtd',mp:true}:null;}
  if(tipo==='s'){const s=(state.semiacabados||[]).find(x=>x.id===id);return s?{obj:s,campo:'estoque'}:null;}
  const p=state.produtos.find(x=>x.id===id);
  if(!p) return null;
  if(vid!=null){const v=(p.variantes||[]).find(x=>x.id===vid);return v?{obj:v,campo:'estoque'}:null;}
  return {obj:p,campo:'estoque'};
}
function stepperAplicar(tipo,id,vid,novo){
  const it=stepperItem(tipo,id,vid);
  if(!it) return;
  novo=Math.max(0,parseFloat(novo.toFixed(4)));
  const atual=it.obj[it.campo]||0;
  const delta=parseFloat((novo-atual).toFixed(4));
  if(delta===0){renderEstoque();return;}
  if(it.mp){
    if(delta>0) registrarEntradaMateria(it.obj,delta,it.obj.custo||0,'ajuste_rapido');
    else registrarSaidaMateria(it.obj,-delta,'ajuste_rapido');
  } else if(tipo==='s'){
    ajustarSemiacabado(it.obj,delta,'ajuste_rapido');
  } else {
    ajustarEstoque(id,vid,delta,'ajuste_rapido');
  }
  marcarAlterado();
  renderEstoque();renderAlertaEstoquePage();atualizarAlertBells();
}
function stepperClick(tipo,id,vid,delta){
  const it=stepperItem(tipo,id,vid);
  if(!it) return;
  stepperAplicar(tipo,id,vid,(it.obj[it.campo]||0)+delta);
}
function stepperDigitado(el,tipo,id,vid){
  const n=parseFloat(String(el.value).replace(',','.'));
  if(isNaN(n)||n<0){showToast('Quantidade inválida','red');renderEstoque();return;}
  stepperAplicar(tipo,id,vid,n);
}
// ============ CÓDIGOS, BUSCA E TRAVA DE DUPLICADOS (Produto / Matéria-prima / Semiacabado) ============
const fmtMateriaCod=id=>'M'+String(id).padStart(3,'0');
const fmtSemiCod=id=>'S'+String(id).padStart(3,'0');
const ITEM_TIPO={p:{rotulo:'Produto',cls:'prod'},m:{rotulo:'Matéria-prima',cls:'mp'},s:{rotulo:'Semiacabado',cls:'semi'}};
function codItem(tipo,id){return tipo==='m'?fmtMateriaCod(id):tipo==='s'?fmtSemiCod(id):fmtProdutoCod(id);}
function itensDoTipo(tipo){return tipo==='m'?(state.materias||[]):tipo==='s'?(state.semiacabados||[]):(state.produtos||[]);}
function estoqueItem(tipo,it){
  if(tipo==='p'&&it.variantes&&it.variantes.length>0) return it.variantes.reduce((s,v)=>s+(v.estoque||0),0);
  return tipo==='m'?(it.qtd||0):(it.estoque||0);
}
function unidadeItem(tipo,it){return tipo==='p'?'un':(it.unidade||'');}
const fmtNumItem=n=>String(Math.round((n||0)*100)/100).replace('.',',');
// Nome padronizado: sem espaços sobrando e com a primeira letra maiúscula (o resto fica como digitado)
function padronizarNomeItem(s){
  s=String(s||'').replace(/\s+/g,' ').trim();
  return s?s.charAt(0).toUpperCase()+s.slice(1):s;
}
// "m15", "M015", "p3-1" -> "m:15" / "p:3"
function normCodigoBusca(txt){
  const m=String(txt==null?'':txt).trim().match(/^([pms])\s*0*(\d+)(?:\s*-\s*\d+)?$/i);
  return m?m[1].toLowerCase()+':'+parseInt(m[2],10):null;
}
// Itens já cadastrados que combinam com o que a pessoa está digitando (nome sem acento/maiúscula,
// grafia parecida ou código). Inclui inativos e arquivados.
function buscarItensCadastro(tipo,termo,ignoreId){
  const t=normalizarNomeMp(termo);
  if(!t) return [];
  const cod=normCodigoBusca(termo);
  const out=[];
  itensDoTipo(tipo).forEach(it=>{
    if(ignoreId!=null&&it.id==ignoreId) return;
    const nome=normalizarNomeMp(it.nome);
    let score=0;
    if(cod&&cod===tipo+':'+it.id) score=1.5;
    else if(nome===t) score=1.2;
    else if(nome.includes(t)||(t.length>=4&&t.includes(nome))) score=1;
    else{
      // grafia parecida: compara com o nome todo, com cada palavra e com o começo do nome
      let s=similaridadeTexto(termo,it.nome);
      if(t.length>=4){
        nome.split(' ').forEach(w=>{if(w.length>=3) s=Math.max(s,similaridadeTexto(t,w));});
        s=Math.max(s,similaridadeTexto(t,nome.slice(0,t.length)));
      }
      if(s>=0.7) score=s*0.9;
    }
    if(score>0) out.push({tipo,id:it.id,it,score});
  });
  return out.sort((a,b)=>b.score-a.score).slice(0,5);
}
// Nome igual a outro item (bloqueia) ou parecido (pergunta). ignoreId = item que está sendo editado.
function checarNomeDuplicado(tipo,nome,ignoreId){
  const n=normalizarNomeMp(nome);
  let exato=null,parecido=null,melhor=0;
  itensDoTipo(tipo).forEach(it=>{
    if(ignoreId!=null&&it.id==ignoreId) return;
    const nn=normalizarNomeMp(it.nome);
    if(nn===n){exato=it;return;}
    const menor=Math.min(nn.length,n.length);
    let s=similaridadeTexto(nome,it.nome);
    if(menor>=5&&(nn.includes(n)||n.includes(nn))) s=Math.max(s,0.8);
    if(s>melhor){melhor=s;parecido=it;}
  });
  if(exato) return {tipo:'exato',item:exato};
  if(parecido&&melhor>=0.72) return {tipo:'parecido',item:parecido};
  return null;
}
// Diálogo de duas saídas. op: {exato} só "Abrir esse" | {edicao,aoOutro} "Voltar"/"Salvar assim" | {aoOutro} "Usar esse"/"É outro item"
let _similarCb=null;
function dialogSimilar(tipo,it,nomeDigitado,op){
  op=op||{};
  const info=`<b>${codItem(tipo,it.id)} · ${escapeHtml(it.nome)}</b> (estoque: ${fmtNumItem(estoqueItem(tipo,it))} ${escapeHtml(unidadeItem(tipo,it))})`;
  const titulo=document.getElementById('modal-similar-titulo'),texto=document.getElementById('modal-similar-texto');
  const bUsar=document.getElementById('modal-similar-usar'),bOutro=document.getElementById('modal-similar-outro');
  if(op.exato){
    titulo.textContent='Esse item já existe';
    texto.innerHTML=`Já existe ${info}. Quer abrir ele em vez de criar outro?`;
    bUsar.textContent='Abrir esse';bOutro.style.display='none';
  }else if(op.edicao){
    titulo.textContent='Nome parecido com outro item';
    texto.innerHTML=`Já existe ${info}, parecido com <b>${escapeHtml(nomeDigitado)}</b>. Salvar com esse nome mesmo assim?`;
    bUsar.textContent='Voltar';bOutro.textContent='Salvar assim';bOutro.style.display='';
  }else{
    titulo.textContent='Já existe um item parecido';
    texto.innerHTML=`Já existe ${info}. Você digitou <b>${escapeHtml(nomeDigitado)}</b>. É o mesmo item?`;
    bUsar.textContent='Usar esse';bOutro.textContent='É outro item';bOutro.style.display='';
  }
  _similarCb={usar:op.edicao?function(){}:()=>pickItemCadastro(tipo,it.id),outro:op.aoOutro||function(){}};
  document.getElementById('modal-similar').classList.add('open');
}
function similarEscolha(qual){
  const cb=_similarCb;
  closeModal('modal-similar');
  if(cb&&cb[qual]) cb[qual]();
}
// Valida o nome antes de salvar. Retorna true se pode salvar agora; false se bloqueou ou abriu o
// diálogo (que chama seguir() se a pessoa escolher "É outro item" / "Salvar assim").
function validarNomeCadastro(tipo,nome,ignoreId,nomeOriginal,seguir){
  if(nomeOriginal!=null&&normalizarNomeMp(nomeOriginal)===normalizarNomeMp(nome)) return true;
  const dup=checarNomeDuplicado(tipo,nome,ignoreId);
  if(!dup) return true;
  const edicao=ignoreId!=null;
  if(dup.tipo==='exato'){
    if(edicao) showToast(`Já existe ${codItem(tipo,dup.item.id)} · ${dup.item.nome} com esse nome`,'red');
    else dialogSimilar(tipo,dup.item,nome,{exato:true});
    return false;
  }
  dialogSimilar(tipo,dup.item,nome,{edicao,aoOutro:seguir});
  return false;
}
// Abre o item existente para edição (fecha o cadastro de novo item que estava aberto)
function pickItemCadastro(tipo,id){
  if(tipo==='m'){editarMateria(id);return;}
  closeModal('modal-novo-produto');
  if(tipo==='s'){closeModal('modal-semiacabado');editarSemiacabado(id);return;}
  editarProduto(id);
}
function limparSugestoes(boxId){const b=document.getElementById(boxId);if(b) b.innerHTML='';}
function renderSugestoesNome(boxId,tipo,termo){
  const box=document.getElementById(boxId);
  if(!box) return;
  const t=String(termo||'').trim();
  if(t.length<2){box.innerHTML='';return;}
  const res=buscarItensCadastro(tipo,t,null);
  if(!res.length){box.innerHTML='';return;}
  const cls=ITEM_TIPO[tipo].cls;
  box.innerHTML=`<div class="sug-lista"><div class="sug-titulo">Já existe — toque para abrir em vez de criar outro</div>${res.map(r=>{
    const it=r.it,ina=!estaAtivo(it);
    return `<div class="sug-item" onclick="pickItemCadastro('${tipo}',${it.id})"><span class="sug-cod selo-cod-${cls}">${codItem(tipo,it.id)}</span><span class="sug-nome">${escapeHtml(it.nome)}</span><span class="sug-meta">${escapeHtml(unidadeItem(tipo,it))} · ${fmtNumItem(estoqueItem(tipo,it))} em estoque${ina?(tipo==='p'?' · arquivado':' · inativo'):''}</span></div>`;
  }).join('')}</div>`;
}
document.addEventListener('input',function(e){
  const t=e.target;
  if(!t||!t.id) return;
  if(t.id==='mp-nome'){
    if(!document.getElementById('mp-edit-id').value) renderSugestoesNome('mp-sugestoes','m',t.value);
  }else if(t.id==='semi-nome'){
    if(!document.getElementById('semi-edit-id').value) renderSugestoesNome('semi-sugestoes','s',t.value);
  }else if(t.id==='np-nome'){
    renderSugestoesNome('np-sugestoes',npTipoAtual==='semiacabado'?'s':'p',t.value);
  }
});
// Estoque no cadastro: item novo = "Estoque inicial" (editável, começa em 0); item existente = "Estoque atual" só leitura
function prepararCampoEstoque(inputId,labelId,notaId,edicao,valor){
  const inp=document.getElementById(inputId),lab=document.getElementById(labelId),nota=document.getElementById(notaId);
  if(inp){inp.readOnly=!!edicao;inp.value=edicao?valor:'';inp.style.opacity=edicao?'.75':'';}
  if(lab) lab.textContent=edicao?'Estoque atual':'Estoque inicial';
  if(nota){nota.style.display='block';nota.textContent=edicao?'Só leitura. Para mudar, use + / − no cartão ou a Entrada de Estoque.':'Começa em 0. Preencha só se já houver estoque físico.';}
}
function copiarCodigoItem(cod,ev){
  if(ev) ev.stopPropagation();
  const ok=()=>showToast('Código '+cod+' copiado','green');
  const fallback=()=>{
    const ta=document.createElement('textarea');
    ta.value=cod;ta.style.position='fixed';ta.style.opacity='0';
    document.body.appendChild(ta);ta.select();
    try{document.execCommand('copy');ok();}catch(err){showToast('Não foi possível copiar','red');}
    document.body.removeChild(ta);
  };
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(cod).then(ok).catch(fallback);
  else fallback();
}

// ---- cartão de estoque (mesmo visual do card de cliente) ----
function estoqueCardHtml(o){
  const item=(par)=>`<div class="card-metric-item"><span class="card-metric-label">${par[0]}</span><span class="card-metric-val" style="display:block">${par[1]}</span></div>`;
  return `<div class="cliente-card ${o.arquivado?'arquivado':''}">
    <div class="cliente-avatar-btn"><span class="cliente-avatar"><i data-lucide="${o.icone}" class="ic"></i></span><span class="card-metric-label">${o.rotulo}</span></div>
    <div class="cliente-card-header">
      <div class="cliente-card-title-group">
        <div class="cliente-card-badges">${o.cod?`<span class="selo-duplo"><span class="badge-cartao-selo">${o.selo}</span><span class="selo-cod selo-cod-${o.tipoCls}" onclick="copiarCodigoItem('${o.cod}',event)" title="Tocar para copiar o código">${o.cod}</span></span>`:`<span class="badge-cartao-selo">${o.selo}</span>`}${o.arquivado?'<span class="badge badge-gray">Arquivado</span>':''}</div>
        <div class="cliente-card-nome">${o.nome}</div>${o.sub||''}
      </div>
      <div class="cliente-card-status-badge">${o.badge}</div>
    </div>
    <div class="cliente-card-body">
      <div class="cliente-card-col">${o.col1.map(item).join('')}</div>
      <div class="cliente-card-col">${o.col2.map(item).join('')}</div>
    </div>
    ${o.acoes?`<div class="cliente-card-actions"><div style="margin-left:auto;display:flex;gap:4px;flex-wrap:wrap">${o.acoes}</div></div>`:''}
  </div>`;
}
const estoqueVazioHtml=txt=>`<div class="cartoes-lista-vazia">${txt}</div>`;
function renderEstoque(){
  if(state.estoque_tab==='movimentos'){renderMovEstoque();return;}
  renderEstoqueFiltroBaixo();
  const head={};
  const tb=document.getElementById('estoque-table');
  if(state.estoque_tab==='produtos'){
    head.innerHTML='<tr><th>Cód.</th><th>Produto</th><th>SKU</th><th>Preço Venda</th><th>Estoque</th><th>Mínimo</th><th>Status</th><th>Ações</th></tr>';
    let list=state.produtos;
    if(!state.estoque_mostrar_arquivados)list=list.filter(p=>estaAtivo(p));
    if(state.estoque_filter){
      const f=state.estoque_filter, fCod=f.replace(/\s+/g,'');
      const buscaCod=/^p\d/.test(fCod);
      list=list.filter(p=>p.nome.toLowerCase().includes(f)||(p.sku||'').toLowerCase().includes(f)||
        (buscaCod&&(fmtProdutoCod(p.id).toLowerCase().includes(fCod)||(p.variantes||[]).some(v=>fmtProdutoCod(p.id,v.id).toLowerCase().includes(fCod)))));
    }
    if(estoqueBaixoFiltro)list=list.filter(p=>(p.variantes&&p.variantes.length>0)?p.variantes.some(v=>v.estoque<=p.minimo):p.estoque<=p.minimo);
    const chkArq=document.getElementById('estoque-mostrar-arquivados');
    if(chkArq){chkArq.style.display='inline-flex';chkArq.querySelector('input').checked=!!state.estoque_mostrar_arquivados;}
    tb.innerHTML=list.map(p=>{
      const temVariantes=p.variantes&&p.variantes.length>0;
      const estoqueTotal=temVariantes?p.variantes.reduce((s,v)=>s+v.estoque,0):p.estoque;
      const baixo=temVariantes?p.variantes.some(v=>v.estoque<=p.minimo):p.estoque<=p.minimo;
      const variantesTxt=temVariantes?`<div style="font-size:11px;color:var(--muted);margin-top:3px">${p.variantes.map(v=>`<span class="variante-tag" title="Código ${fmtProdutoCod(p.id,v.id)}">${fmtProdutoCod(p.id,v.id)} · ${escapeHtml(v.nome)}: ${v.estoque}</span>`).join('')}</div>`:'';
      const arquivado=!estaAtivo(p);
      return estoqueCardHtml({
        icone:'package',rotulo:'Produto',selo:'Produto',cod:fmtProdutoCod(p.id),tipoCls:'prod',arquivado,nome:escapeHtml(p.nome),
        sub:variantesTxt,
        badge:`<span class="badge ${baixo?'badge-red badge-alert':'badge-green'}">${baixo?'Baixo':'OK'}</span>`,
        col1:[['SKU',escapeHtml(p.sku||'-')],['Preço venda',fmt(p.preco)]],
        col2:[['Estoque',arquivado?`<strong>${estoqueTotal}</strong>`:estoqueProdutoHtml(p,temVariantes,estoqueTotal,baixo)],['Mínimo',p.minimo]],
        acoes:arquivado?`<button class="btn btn-outline btn-sm" onclick="reativarProduto(${p.id})">↩️ Reativar</button>`:`
        <button class="icon-btn edit" onclick="editarProduto(${p.id})" title="Editar"><i data-lucide="pencil" class="ic"></i></button>
        <button class="icon-btn del" onclick="excluirProduto(${p.id})" title="Excluir/Arquivar"><i data-lucide="trash-2" class="ic"></i></button>`
      });}).join('')||estoqueVazioHtml('Nenhum produto encontrado');
  } else if(state.estoque_tab==='semiacabados'){
    renderSemiacabados();
  } else {
    head.innerHTML='<tr><th>Matéria-Prima</th><th>Estoque</th><th>Unidade</th><th title="Custo médio ponderado: pondera todas as compras já feitas, não só a última">Custo Médio/un ℹ️</th><th>Mínimo</th><th>Fornecedor</th><th>Status</th><th>Previsão</th><th>Ações</th></tr>';
    let list=materiasOrdenadas();
    if(!state.estoque_mostrar_inativas)list=list.filter(m=>estaAtivo(m));
    const chkIna=document.getElementById('estoque-mostrar-inativas');
    if(chkIna){chkIna.style.display='inline-flex';chkIna.querySelector('input').checked=!!state.estoque_mostrar_inativas;}
    if(state.estoque_filter){
      const fN=normalizarNomeMp(state.estoque_filter),fCod=state.estoque_filter.replace(/\s+/g,''),buscaCod=/^m\d/.test(fCod);
      list=list.filter(m=>normalizarNomeMp(m.nome).includes(fN)||(buscaCod&&fmtMateriaCod(m.id).toLowerCase().includes(fCod)));
    }
    if(estoqueBaixoFiltro)list=list.filter(m=>estaAtivo(m)&&m.qtd<=m.minimo);
    tb.innerHTML=list.map(m=>{
      const prev=calcularPrevisaoConsumo(m.id);
      let prevHtml='<span style="color:var(--muted);font-size:11px">sem histórico</span>';
      if(prev.consumoDiario>0){
        const cor=prev.diasRestantes<=7?'var(--red)':prev.diasRestantes<=20?'var(--yellow)':'var(--green)';
        prevHtml=`<span style="color:${cor};font-weight:600;font-size:12px">${prev.diasRestantes}d restantes</span><div style="font-size:10px;color:var(--muted)">~${prev.consumoDiario.toFixed(2)}${m.unidade}/dia</div>`;
      }
      const forn=m.fornecedorId?getFornecedor(m.fornecedorId):null;
      const ativoM=estaAtivo(m);
      const baixoM=ativoM&&m.qtd<=m.minimo;
      return estoqueCardHtml({
        icone:'flask-conical',rotulo:'Matéria-prima',selo:'Matéria-prima',cod:fmtMateriaCod(m.id),tipoCls:'mp',nome:escapeHtml(m.nome),arquivado:!ativoM,
        badge:ativoM?`<span class="badge ${baixoM?'badge-red badge-alert':'badge-green'}">${baixoM?'Baixo':'OK'}</span>`:'<span class="badge badge-gray">Inativa</span>',
        col1:[['Estoque',stepperHtml('m',m.id,null,m.qtd,baixoM)],['Unidade',m.unidade],['Mínimo',m.minimo+' '+m.unidade]],
        col2:[['Custo médio/un',fmt(m.custo)],['Fornecedor',forn?`<span style="font-size:12px;cursor:pointer;color:var(--blue)" onclick="gotoFornecedores()">${escapeHtml(forn.nome)}</span>`:'<span style="color:var(--muted);font-size:12px">—</span>'],['Previsão',prevHtml]],
        acoes:`<button class="icon-btn ${ativoM?'':'mp-reativar'}" onclick="toggleMateriaAtiva(${m.id})" title="${ativoM?'Inativar (não conta como estoque baixo)':'Reativar'}"><i data-lucide="${ativoM?'power':'power-off'}" class="ic"></i></button>
        <button class="icon-btn edit" onclick="editarMateria(${m.id})" title="Editar"><i data-lucide="pencil" class="ic"></i></button>
        <button class="icon-btn del" onclick="excluirMateria(${m.id})" title="Excluir"><i data-lucide="trash-2" class="ic"></i></button>`
      });}).join('')||estoqueVazioHtml('Nenhuma matéria-prima encontrada');
  }
}
function renderSemiacabados(){
  const head={};
  const tb=document.getElementById('estoque-table');
  head.innerHTML='<tr><th>Nome</th><th>Estoque</th><th>Mínimo</th><th>MP Utilizadas</th><th>Status</th><th>Ações</th></tr>';
  if(!state.semiacabados||state.semiacabados.length===0){
    tb.innerHTML=estoqueVazioHtml('Nenhum semiacabado cadastrado.');
    return;
  }
  let listaS=state.semiacabados;
  if(state.estoque_filter){
    const fN=normalizarNomeMp(state.estoque_filter),fCod=state.estoque_filter.replace(/\s+/g,''),buscaCod=/^s\d/.test(fCod);
    listaS=listaS.filter(s=>normalizarNomeMp(s.nome).includes(fN)||(buscaCod&&fmtSemiCod(s.id).toLowerCase().includes(fCod)));
  }
  tb.innerHTML=listaS.map(s=>{
    const baixo=s.estoque<=s.minimo;
    const mps=(s.mps||[]).map(mp=>{
      const m=state.materias.find(x=>x.id===mp.mpId);
      return m?`<span class="variante-tag">${escapeHtml(m.nome)}: ${mp.qtd}${m.unidade}/un</span>`:'';
    }).join('');
    return estoqueCardHtml({
      icone:'droplets',rotulo:'Semiacabado',selo:'Semiacabado',cod:fmtSemiCod(s.id),tipoCls:'semi',nome:escapeHtml(s.nome),
      sub:`<div style="font-size:11px;color:var(--muted)">${s.unidade}</div>`,
      badge:`<span class="badge ${baixo?'badge-red badge-alert':'badge-green'}">${baixo?'Baixo':'OK'}</span>`,
      col1:[['Estoque',stepperHtml('s',s.id,null,s.estoque,baixo,s.unidade)],['Mínimo',s.minimo+' '+s.unidade]],
      col2:[['MP utilizadas',mps||'<span style="color:var(--muted)">—</span>']],
      acoes:`<button class="icon-btn edit" onclick="editarSemiacabado(${s.id})"><i data-lucide="pencil" class="ic"></i></button>
        <button class="icon-btn del" onclick="excluirSemiacabado(${s.id})"><i data-lucide="trash-2" class="ic"></i></button>`
    });
  }).join('')||estoqueVazioHtml('Nenhum semiacabado encontrado');
}
// ============ MOVIMENTAÇÕES DE ESTOQUE (histórico) ============
// Lê state.movEstoque (gravado por registrarMovEstoque em 00-core.js). Só existe a partir da v5.35.0.
const MOV_ORIGENS={
  venda:['Venda','badge-red'],
  edicao_venda:['Venda editada','badge-yellow'],
  exclusao_venda:['Venda excluída','badge-green'],
  producao:['Produção','badge-blue'],
  exclusao_producao:['Produção excluída','badge-gray'],
  compra:['Compra','badge-green'],
  estorno_compra:['Compra estornada','badge-gray'],
  entrada_manual:['Entrada manual','badge-green'],
  baixa_manual:['Baixa manual','badge-red'],
  ajuste_rapido:['Ajuste − n +','badge-yellow'],
  ajuste_cadastro:['Ajuste no cadastro','badge-yellow'],
  cadastro:['Cadastro','badge-gray'],
  outro:['Outro','badge-gray']
};
const MOV_LINHAS_MAX=300;
let movFiltro={q:'',tipo:'',origem:'',dias:'30'};
function filterMovEstoque(v){movFiltro.q=v;renderMovEstoque();}
const filterMovEstoqueDebounced=debounce(filterMovEstoque);
function filterMovTipo(v){movFiltro.tipo=v;renderMovEstoque();}
function filterMovOrigem(v){movFiltro.origem=v;renderMovEstoque();}
function filterMovPeriodo(v){movFiltro.dias=v;renderMovEstoque();}
function fmtMovQtd(n,un,comSinal){
  const abs=String(parseFloat(Math.abs(n).toFixed(4))).replace('.',',');
  const sinal=comSinal?(n>0?'+':n<0?'−':''):'';
  return sinal+abs+(un?' '+un:'');
}
function renderMovEstoque(){
  const tb=document.getElementById('mov-table');
  if(!tb) return;
  const selOrig=document.getElementById('mov-origem-sel');
  if(selOrig && selOrig.options.length<=1){
    selOrig.innerHTML='<option value="">Todas origens</option>'+Object.keys(MOV_ORIGENS).filter(k=>k!=='outro').map(k=>`<option value="${k}">${MOV_ORIGENS[k][0]}</option>`).join('');
  }
  let lista=Array.isArray(state.movEstoque)?state.movEstoque:[];
  if(movFiltro.dias){
    const d=new Date();d.setDate(d.getDate()-(parseInt(movFiltro.dias)-1));
    const limite=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    lista=lista.filter(m=>m.data>=limite);
  }
  if(movFiltro.tipo) lista=lista.filter(m=>m.tipo===movFiltro.tipo);
  if(movFiltro.origem) lista=lista.filter(m=>m.origem===movFiltro.origem);
  const q=normBusca(movFiltro.q);
  if(q) lista=lista.filter(m=>normBusca(m.nome).includes(q));
  const total=lista.length;
  const resumo=document.getElementById('mov-resumo');
  if(total===0){
    if(resumo) resumo.textContent='';
    const semNada=!(state.movEstoque&&state.movEstoque.length);
    tb.innerHTML=estoqueVazioHtml(`${semNada?'Nenhuma movimentação registrada ainda. A partir desta versão, toda venda, produção, compra, baixa, entrada e ajuste − n + aparece aqui.':'Nenhuma movimentação com esses filtros.'}`);
    return;
  }
  const mostrar=lista.slice(-MOV_LINHAS_MAX).reverse(); // mais recentes primeiro
  if(resumo) resumo.textContent=total>MOV_LINHAS_MAX?`Mostrando as ${MOV_LINHAS_MAX} mais recentes de ${total} movimentações — use os filtros para refinar.`:`${total} movimentaç${total===1?'ão':'ões'}`;
  tb.innerHTML=mostrar.map(m=>{
    const [rot,cls]=MOV_ORIGENS[m.origem]||MOV_ORIGENS.outro;
    const quando=new Date(m.ts).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
    const cor=m.delta>0?'var(--green)':'var(--red)';
    return estoqueCardHtml({
      icone:'arrow-left-right',rotulo:'Movimento',selo:quando,nome:escapeHtml(m.nome),
      badge:`<span class="badge ${cls}">${rot}</span>`,
      col1:[['Variação',`<strong style="color:${cor}">${fmtMovQtd(m.delta,m.un,true)}</strong>`]],
      col2:[['Saldo após',fmtMovQtd(m.saldo,m.un,false)]],
      acoes:''
    });
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
    const opts=materiasOrdenadas().map(m=>`<option value="${m.id}" ${m.id===mp.mpId?'selected':''}>${escapeHtml(m.nome)} (${m.unidade})</option>`).join('');
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
  prepararCampoEstoque('semi-estoque','semi-estoque-label','semi-estoque-nota',false,'');
  limparSugestoes('semi-sugestoes');
  document.getElementById('semi-minimo').value='';
  document.getElementById('semi-unidade').value='L';
  semiMPsTemp=[];
  renderSemiMPLista();
  document.getElementById('modal-semi-title').textContent='Novo Semiacabado';
}
function salvarSemiacabado(pularSimilar){
  const eid=document.getElementById('semi-edit-id').value;
  const nome=padronizarNomeItem(document.getElementById('semi-nome').value);
  const unidade=document.getElementById('semi-unidade').value;
  const estoque=parseFloat(document.getElementById('semi-estoque').value)||0;
  const minimo=parseFloat(document.getElementById('semi-minimo').value)||0;
  if(!nome){showToast('Informe o nome','red');return;}
  const sOrig=eid?(state.semiacabados||[]).find(s=>s.id==eid):null;
  if(!pularSimilar&&!validarNomeCadastro('s',nome,eid?parseInt(eid):null,sOrig?sOrig.nome:null,()=>salvarSemiacabado(true))) return;
  const mps=semiMPsTemp.filter(mp=>mp.mpId&&mp.qtd>0);
  if(!state.semiacabados) state.semiacabados=[];
  if(eid){
    const s=state.semiacabados.find(s=>s.id==eid);
    // estoque é só leitura na edição: ajustes passam pelo + / − do cartão ou pela Entrada de Estoque
    s.nome=nome;s.unidade=unidade;s.minimo=minimo;s.mps=mps;
    showToast('Semiacabado atualizado','green');
  } else {
    const novoId=nextId('semiacabados');
    state.semiacabados.push({id:novoId,nome,unidade,estoque,minimo,mps});
    registrarMovEstoque('s',novoId,null,nome,estoque,estoque,'cadastro',unidade);
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
  prepararCampoEstoque('semi-estoque','semi-estoque-label','semi-estoque-nota',true,s.estoque||0);
  limparSugestoes('semi-sugestoes');
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
        return p.variantes.map(v => `<option value="p:${p.id}:${v.id}">${escapeHtml(p.nome)} — ${escapeHtml(v.nome)} (est: ${v.estoque})</option>`);
      }
      return [`<option value="p:${p.id}:">${escapeHtml(p.nome)} (est: ${p.estoque})</option>`];
    }).join('');
  } else {
    sel.innerHTML = '<option value="">Selecione...</option>' + materiasOrdenadas().map(m =>
      `<option value="m:${m.id}">${escapeHtml(m.nome)} — est: ${m.qtd} ${m.unidade}</option>`
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
      prev.innerHTML = `Quantidade maior que o estoque atual (${estoqueAtual}). Revise.`;
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
      ajustarEstoque(p.id, v.id, -qtd, 'baixa_manual');
      nomeItem = `${p.nome} — ${v.nome}`;
    } else {
      estoqueAtual = p.estoque;
      if(qtd > estoqueAtual){showToast(`Estoque insuficiente (${estoqueAtual} disponíveis)`,'red');return;}
      ajustarEstoque(p.id, null, -qtd, 'baixa_manual');
      nomeItem = p.nome;
    }
  } else {
    const mid = parseInt(val.split(':')[1]);
    const m = state.materias.find(x=>x.id===mid);
    if(!m){showToast('Matéria-prima não encontrada','red');return;}
    estoqueAtual = m.qtd;
    if(qtd > estoqueAtual){showToast(`Estoque insuficiente (${estoqueAtual} ${m.unidade} disponíveis)`,'red');return;}
    registrarSaidaMateria(m, qtd, 'baixa_manual');
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
      `<option value="s:${s.id}">${escapeHtml(s.nome)} — est: ${s.estoque} ${s.unidade}</option>`
    ).join('');
  } else {
    sel.innerHTML = '<option value="">Selecione...</option>' + materiasOrdenadas().map(m =>
      `<option value="m:${m.id}">${escapeHtml(m.nome)} — est: ${m.qtd} ${m.unidade}</option>`
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
    ajustarSemiacabado(s, qtd, 'entrada_manual');
    nomeItem = s.nome;
  } else {
    const m = state.materias.find(x=>x.id===parseInt(val.split(':')[1]));
    if(!m){showToast('Matéria-prima não encontrada','red');return;}
    // este formulário não pergunta custo unitário, então a entrada é tratada como se custasse
    // o custo médio ATUAL — matematicamente isso não muda o CMP (é neutro), em vez de diluir
    // o custo médio pra baixo como aconteceria se somássemos quantidade sem valor
    registrarEntradaMateria(m, qtd, m.custo||0, 'entrada_manual');
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
