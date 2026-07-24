// ============ PLANEJAMENTO DE MATERIAIS (MRP simplificado) ============
// Calcula a necessidade líquida de produção e de compra a partir da demanda
// ainda não comprometida contra o estoque: os orçamentos em aberto.
// (Vendas confirmadas já exigem estoque disponível no momento do registro —
// ver validação em 04-vendas.js — então não entram como "demanda futura" aqui.)
//
// Fluxo: orçamentos → necessidade de produto acabado (líquida do estoque atual)
//        → explosão pela ficha técnica (BOM), nível a nível através de
//          semiacabados, líquida do estoque de cada semiacabado
//        → necessidade líquida de matéria-prima → sugestão de compra
//        agrupada por fornecedor, que alimenta o modal de Compra já existente.
//
// Limitações conhecidas (documentadas de propósito, não escondidas):
// - Não considera lead time de fornecedor nem agenda de capacidade produtiva
//   (isso seria MRP II / APS — fora do escopo deste módulo).
// - A netting de semiacabados é feita em rodadas simples (suficiente pra
//   profundidade de BOM baixa, que é o caso atual do sistema); mesma
//   estratégia de proteção contra ciclo já usada em custoItemFicha().

function togglePlanApenasAprovados(checked){
  state.planejamento_apenas_aprovados = checked;
  marcarAlterado();
  renderPlanejamento();
}

// Demanda considerada: itens de orçamentos ainda não convertidos em venda.
function getOrcamentosAbertos(){
  const apenasAprovados = !!state.planejamento_apenas_aprovados;
  return state.vendas.filter(v => v.tipo === 'orcamento' && (!apenasAprovados || v.statusOrc === 'aprovado'));
}

// Agrega a demanda por produto/variante e calcula quanto falta produzir
// (necessidade − o que já está em estoque hoje).
function calcularNecessidadeProdutos(){
  const mapa = {};
  getOrcamentosAbertos().forEach(v=>{
    (v.itens||[]).forEach(it=>{
      const key = `${it.produtoId}::${it.varianteId||''}`;
      if(!mapa[key]) mapa[key] = {produtoId: it.produtoId, varianteId: it.varianteId||null, qtdNecessaria: 0};
      mapa[key].qtdNecessaria += it.qtd;
    });
  });
  return Object.values(mapa).map(m=>{
    const disponivel = getEstoqueAtual(m.produtoId, m.varianteId);
    const faltanteProduzir = Math.max(0, m.qtdNecessaria - disponivel);
    return {...m, disponivel, faltanteProduzir};
  }).sort((a,b)=>b.faltanteProduzir-a.faltanteProduzir);
}

// Explode o que falta produzir através das fichas técnicas (BOM), somando
// matérias-primas diretamente e processando semiacabados nível a nível,
// líquidos do estoque de semiacabado já existente.
function calcularNecessidadeMaterias(produtosFaltantes){
  const necMaterias = {};   // mpId -> quantidade necessária
  const necSemiBruta = {};  // semiId -> quantidade bruta necessária (antes de descontar estoque)
  const semiExplodido = new Set();

  function acumular(ficha, multiplicador){
    (ficha||[]).forEach(f=>{
      const tipo = f.tipo || 'mp';
      const qtd = f.qtd * multiplicador;
      if(tipo === 'semi') necSemiBruta[f.mpId] = (necSemiBruta[f.mpId]||0) + qtd;
      else necMaterias[f.mpId] = (necMaterias[f.mpId]||0) + qtd;
    });
  }

  produtosFaltantes.forEach(p=>{
    if(p.faltanteProduzir <= 1e-9) return;
    acumular(getFichaProdutoVariante(p.produtoId, p.varianteId), p.faltanteProduzir);
  });

  // processa semiacabados em rodadas — cobre múltiplos níveis de BOM,
  // com proteção contra referência circular (máx. 20 rodadas)
  let mudou = true, seguranca = 0;
  while(mudou && seguranca < 20){
    mudou = false; seguranca++;
    Object.keys(necSemiBruta).forEach(idStr=>{
      const id = parseInt(idStr);
      if(semiExplodido.has(id)) return;
      semiExplodido.add(id);
      const s = getSemiacabado(id);
      const liquido = Math.max(0, necSemiBruta[id] - (s.estoque||0));
      if(liquido > 1e-9){ acumular(s.mps, liquido); mudou = true; }
    });
  }

  return Object.keys(necMaterias).map(idStr=>{
    const id = parseInt(idStr);
    const m = getMateria(id);
    const necessario = necMaterias[id];
    const disponivel = m.qtd;
    const faltante = Math.max(0, necessario - disponivel);
    return {
      materiaId: id, nome: m.nome, unidade: m.unidade,
      necessario, disponivel, faltante,
      fornecedorId: m.fornecedorId || null,
      custoEstimado: faltante * m.custo,
    };
  }).filter(l=>l.necessario > 1e-9).sort((a,b)=>b.faltante-a.faltante);
}

function agruparSugestaoPorFornecedor(linhasMaterias){
  const grupos = {};
  linhasMaterias.forEach(l=>{
    if(l.faltante <= 1e-9) return;
    const key = l.fornecedorId || 'sem';
    if(!grupos[key]) grupos[key] = [];
    grupos[key].push(l);
  });
  return grupos;
}

function renderPlanejamento(){
  const chk = document.getElementById('plan-apenas-aprovados');
  if(chk) chk.checked = !!state.planejamento_apenas_aprovados;

  const orcamentos = getOrcamentosAbertos();
  const produtosFaltantes = calcularNecessidadeProdutos();
  const materiasNecessarias = calcularNecessidadeMaterias(produtosFaltantes);

  const qtdProdutosFaltando = produtosFaltantes.filter(p=>p.faltanteProduzir>1e-9).length;
  const qtdMateriasFaltando = materiasNecessarias.filter(m=>m.faltante>1e-9).length;
  const custoTotalCompra = materiasNecessarias.reduce((s,m)=>s+m.custoEstimado,0);

  document.getElementById('plan-stats').innerHTML = `
    <div class="stat-card blue"><div class="label">Orçamentos considerados</div><div class="value">${orcamentos.length}</div><div class="sub">em aberto</div></div>
    <div class="stat-card ${qtdProdutosFaltando>0?'yellow':'green'}"><div class="label">Produtos a produzir</div><div class="value">${qtdProdutosFaltando}</div><div class="sub">abaixo da demanda</div></div>
    <div class="stat-card ${qtdMateriasFaltando>0?'red':'green'}"><div class="label">Matérias faltando</div><div class="value">${qtdMateriasFaltando}</div><div class="sub">precisam de compra</div></div>
    <div class="stat-card yellow"><div class="label">Custo estimado</div><div class="value">${fmt(custoTotalCompra)}</div><div class="sub">compra sugerida</div></div>
  `;

  const tbP = document.getElementById('plan-produtos-table');
  if(produtosFaltantes.length===0){
    tbP.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:24px">Nenhum orçamento em aberto no momento</td></tr>';
  } else {
    tbP.innerHTML = produtosFaltantes.map(p=>`<tr>
      <td data-label="Produto"><strong>${getNomeCompletoItem(p.produtoId,p.varianteId)}</strong></td>
      <td data-label="Necessário">${p.qtdNecessaria}</td>
      <td data-label="Em estoque">${p.disponivel}</td>
      <td data-label="Falta produzir"><strong style="color:${p.faltanteProduzir>0?'var(--red)':'var(--green)'}">${p.faltanteProduzir>0?p.faltanteProduzir:'✓ OK'}</strong></td>
    </tr>`).join('');
  }

  const tbM = document.getElementById('plan-materias-table');
  if(materiasNecessarias.length===0){
    tbM.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">Nenhuma matéria-prima necessária no momento</td></tr>';
  } else {
    tbM.innerHTML = materiasNecessarias.map(m=>{
      const forn = m.fornecedorId ? getFornecedor(m.fornecedorId) : null;
      return `<tr>
      <td data-label="Matéria-Prima"><strong>${m.nome}</strong></td>
      <td data-label="Necessário">${m.necessario.toFixed(2)} ${m.unidade}</td>
      <td data-label="Disponível">${m.disponivel.toFixed(2)} ${m.unidade}</td>
      <td data-label="Falta comprar"><strong style="color:${m.faltante>0?'var(--red)':'var(--green)'}">${m.faltante>0?m.faltante.toFixed(2)+' '+m.unidade:'✓ OK'}</strong></td>
      <td data-label="Fornecedor">${forn?forn.nome:'<span style="color:var(--muted)">—</span>'}</td>
      <td data-label="Custo estimado">${m.custoEstimado>0?fmt(m.custoEstimado):'—'}</td>
    </tr>`;
    }).join('');
  }

  const grupos = agruparSugestaoPorFornecedor(materiasNecessarias);
  const wrap = document.getElementById('plan-sugestoes-lista');
  const chaves = Object.keys(grupos);
  if(chaves.length===0){
    wrap.innerHTML = '<div style="text-align:center;padding:28px;color:var(--muted);font-size:13px;background:#fff;border-radius:12px;box-shadow:var(--shadow)">🎉 Nenhuma compra necessária no momento!</div>';
  } else {
    wrap.innerHTML = chaves.map(key=>{
      const itens = grupos[key];
      const forn = key!=='sem' ? getFornecedor(parseInt(key)) : null;
      const total = itens.reduce((s,i)=>s+i.custoEstimado,0);
      return `<div class="table-card" style="padding:14px 16px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <div>
          <strong>${forn?forn.nome:'Sem fornecedor cadastrado'}</strong>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">${itens.map(i=>i.nome).join(', ')}</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-weight:700;color:var(--green)">${fmt(total)}</span>
          <button class="btn btn-primary btn-sm" onclick="gerarCompraSugerida('${key}')">🛒 Gerar Compra</button>
        </div>
      </div>`;
    }).join('');
  }
}

// Abre o modal de Registrar Compra (já existente em 08-compras-fornecedores.js)
// pré-preenchido com os itens sugeridos pro fornecedor escolhido. O usuário
// ainda revisa quantidades e confirma — nada é salvo automaticamente.
function gerarCompraSugerida(key){
  const produtosFaltantes = calcularNecessidadeProdutos();
  const materiasNecessarias = calcularNecessidadeMaterias(produtosFaltantes);
  const grupos = agruparSugestaoPorFornecedor(materiasNecessarias);
  const itens = grupos[key];
  if(!itens || itens.length===0){ showToast('Nada a comprar deste fornecedor','red'); return; }
  const fornecedorId = key!=='sem' ? parseInt(key) : undefined;
  abrirRegistrarCompra(fornecedorId);
  compraItensTemp = itens.map(i=>({mpId: i.materiaId, qtd: parseFloat(i.faltante.toFixed(2)), custoUn: getMateria(i.materiaId).custo}));
  renderCompraItensLista();
  showToast('Itens da sugestão adicionados — revise as quantidades antes de salvar','green');
}
