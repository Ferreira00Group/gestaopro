// ═══════════════════════════════════════════════════════════════════
// MÓDULO 21: ANÁLISE DE DADOS (100% OFFLINE & LOCAL)
// GestãoPRO ERP — Painel Preditivo, Gerador de Pacotes para IA Externa,
// Validador de Importação, Gestão de Resultados com Auditoria e Atalhos
// ═══════════════════════════════════════════════════════════════════

let _subAbaAnaliseAtual = 'painel';
let _filtroPeriodo = 'mes_atual';
let _filtroFoco = 'geral';
let _anonimizarClientes = false;
let _analiseHistoricoIdx = 0;
let _acoesAutonomasCache = [];
let _logAcoesExecutadas = [];

// Carrega preferências e histórico
try {
  const salvoLog = localStorage.getItem('gestaopro_log_acoes_ia');
  if (salvoLog) _logAcoesExecutadas = JSON.parse(salvoLog);
} catch (e) {}

// ───────────────────────────────────────────────────────────────────
// 1. HISTÓRICO DE ANÁLISES & GESTÃO DE ESTADO NO LOCALSTORAGE
// ───────────────────────────────────────────────────────────────────
function obterHistoricoAnalises() {
  try {
    const raw = localStorage.getItem('gestaopro_historico_analises_ia');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function salvarHistoricoAnalises(arr) {
  try {
    const limitado = (arr || []).slice(0, 12);
    localStorage.setItem('gestaopro_historico_analises_ia', JSON.stringify(limitado));
    atualizarSelosAnaliseDados();
    renderAvisoAnaliseDashboard();
  } catch (e) {
    console.warn('Erro ao salvar histórico de análises:', e);
  }
}

function obterAnaliseAtiva() {
  const hist = obterHistoricoAnalises();
  if (hist.length === 0) return null;
  const idx = Math.min(Math.max(0, _analiseHistoricoIdx), hist.length - 1);
  return hist[idx] || hist[0];
}

// Coleta todos os IDs que já foram marcados como Feito ou Ignorado
function obterIdsJaResolvidos() {
  const hist = obterHistoricoAnalises();
  const resolvidosSet = new Set();
  hist.forEach(an => {
    if (an && an.resolvidos && typeof an.resolvidos === 'object') {
      Object.entries(an.resolvidos).forEach(([id, status]) => {
        if (status === 'feito' || status === 'ignorado') {
          resolvidosSet.add(id);
        }
      });
    }
  });
  return Array.from(resolvidosSet);
}

// ───────────────────────────────────────────────────────────────────
// 2. COLETA DE CONTEXTO E CÁLCULO ANALÍTICO MULTI-PERÍODO (100% LOCAL)
// ───────────────────────────────────────────────────────────────────
function coletarContextoERP(periodo = 'mes_atual') {
  if (typeof state === 'undefined' || !state) {
    return {
      scoreSaude: 100,
      faturamentoMes: 0,
      despesasMes: 0,
      saldoCaixa: 0,
      aReceber: 0,
      aReceberVencido: 0,
      aPagar: 0,
      aPagarVencido: 0,
      margemMediaPct: 0,
      breakEvenMensal: 0,
      projecaoCaixa: { d7: 0, d15: 0, d30: 0 },
      curvaABC: [],
      runwayEstoque: [],
      produtosParados: [],
      produtosEstoqueZero: [],
      produtosEstoqueBaixo: [],
      materiasBaixas: [],
      clientesDevedores: [],
      orcamentosAbertos: 0,
      valorOrcamentos: 0,
      serieMensal: []
    };
  }

  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth();

  // Define limite de corte por período
  let mesesRetroativos = 1;
  if (periodo === '3_meses') mesesRetroativos = 3;
  if (periodo === '12_meses') mesesRetroativos = 12;

  const dataCorte = new Date(anoAtual, mesAtual - (mesesRetroativos - 1), 1);

  // Vendas e Faturamento
  let fatTotalPeriodo = 0;
  let fatMesAtual = 0;
  let orcamentosAbertos = 0;
  let valorOrcamentos = 0;
  const faturamentoPorProduto = {};
  const qtdVendidaPorProduto = {};
  const margemTotalItens = [];
  const vendasPorMesMap = {};

  if (Array.isArray(state.vendas)) {
    state.vendas.forEach(v => {
      if (!v) return;
      if (v.tipo === 'orcamento') {
        orcamentosAbertos++;
        valorOrcamentos += Number(v.total || 0);
        return;
      }
      const d = v.data ? new Date(v.data + 'T00:00:00') : null;
      if (d) {
        const chaveMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        vendasPorMesMap[chaveMes] = (vendasPorMesMap[chaveMes] || 0) + Number(v.total || 0);

        if (d.getMonth() === mesAtual && d.getFullYear() === anoAtual) {
          fatMesAtual += Number(v.total || 0);
        }

        if (d >= dataCorte) {
          fatTotalPeriodo += Number(v.total || 0);

          if (Array.isArray(v.itens)) {
            v.itens.forEach(it => {
              // Item avulso (valor digitado, sem produto cadastrado — ex.: "Saldo Anterior") não é produto:
              // fica fora da Curva ABC e do giro de estoque (mesma regra do relatório detalhado).
              if (!(it.avulso || it.produtoId == null)) {
                const prodNome = it.nome || (typeof getProduto === 'function' ? getProduto(it.produtoId)?.nome : 'Produto');
                const recItem = Number(it.total || (it.qtd * it.preco) || 0);
                const qtdItem = Number(it.qtd || 1);
                faturamentoPorProduto[prodNome] = (faturamentoPorProduto[prodNome] || 0) + recItem;
                qtdVendidaPorProduto[prodNome] = (qtdVendidaPorProduto[prodNome] || 0) + qtdItem;
              }

              const custoUn = Number(it.custoFichaUn || 0);
              if (custoUn > 0 && it.preco > 0) {
                const margemPct = ((it.preco - custoUn) / it.preco) * 100;
                margemTotalItens.push(margemPct);
              }
            });
          }
        }
      }
    });
  }

  // Despesas
  let despesasTotalPeriodo = 0;
  let despesasMesAtual = 0;
  const despesasPorMesMap = {};

  const somarDespesa = (dStr, valor) => {
    if (!dStr) return;
    const d = new Date(dStr + (dStr.length === 10 ? 'T00:00:00' : ''));
    const chaveMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    despesasPorMesMap[chaveMes] = (despesasPorMesMap[chaveMes] || 0) + Number(valor || 0);

    if (d.getMonth() === mesAtual && d.getFullYear() === anoAtual) {
      despesasMesAtual += Number(valor || 0);
    }
    if (d >= dataCorte) {
      despesasTotalPeriodo += Number(valor || 0);
    }
  };

  if (Array.isArray(state.movimentacoes)) {
    state.movimentacoes.forEach(m => {
      if (m.tipo === 'saida' && m.data) somarDespesa(m.data, m.valor);
    });
  } else if (Array.isArray(state.financeiro)) {
    state.financeiro.forEach(f => {
      if (f.tipo === 'saida' && f.data) somarDespesa(f.data, f.valor);
    });
  }

  // Série Mensal do período
  const serieMensal = [];
  for (let i = mesesRetroativos - 1; i >= 0; i--) {
    const dAux = new Date(anoAtual, mesAtual - i, 1);
    const chave = `${dAux.getFullYear()}-${String(dAux.getMonth() + 1).padStart(2, '0')}`;
    const fat = vendasPorMesMap[chave] || 0;
    const desp = despesasPorMesMap[chave] || 0;
    serieMensal.push({
      mes: chave,
      faturamento: Number(fat.toFixed(2)),
      despesas: Number(desp.toFixed(2)),
      resultado: Number((fat - desp).toFixed(2))
    });
  }

  // Curva ABC Completa
  const rankingProdutos = Object.entries(faturamentoPorProduto)
    .map(([nome, receita]) => ({ nome, receita, qtd: qtdVendidaPorProduto[nome] || 0 }))
    .sort((a, b) => b.receita - a.receita);

  const receitaAcumulada = rankingProdutos.reduce((acc, p) => acc + p.receita, 0);
  let somaParcial = 0;
  const curvaABC = rankingProdutos.map(p => {
    // Pareto clássico: a classe vem do acumulado ANTES do item; o item que cruza 80%/95% fica na classe de cima.
    const pctAntes = receitaAcumulada > 0 ? (somaParcial / receitaAcumulada) * 100 : 0;
    somaParcial += p.receita;
    let classe = 'C';
    if (pctAntes < 80) classe = 'A';
    else if (pctAntes < 95) classe = 'B';
    return {
      nome: p.nome,
      receita: Number(p.receita.toFixed(2)),
      qtd: p.qtd,
      classe,
      pctDoTotal: receitaAcumulada > 0 ? ((p.receita / receitaAcumulada) * 100).toFixed(1) : '0'
    };
  });

  // Contas a Receber
  let recAberto = 0;
  let recVencido = 0;
  let rec7Dias = 0;
  let rec15Dias = 0;
  let rec30Dias = 0;
  const devedoresMap = {};

  if (Array.isArray(state.contasReceber)) {
    state.contasReceber.forEach(c => {
      if (!c.pago) {
        const val = Number(c.valor || 0);
        recAberto += val;
        const venc = c.vencimento ? new Date(c.vencimento + 'T00:00:00') : null;
        if (venc) {
          const diffDias = Math.floor((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDias < 0) {
            recVencido += val;
          } else if (diffDias <= 7) rec7Dias += val;
          else if (diffDias <= 15) rec15Dias += val;
          else if (diffDias <= 30) rec30Dias += val;
        }

        const nomeCl = c.clienteNome || (typeof getCliente === 'function' ? getCliente(c.clienteId)?.nome : 'Cliente');
        const telCl = typeof getCliente === 'function' ? getCliente(c.clienteId)?.tel : '';
        const endCl = typeof getCliente === 'function' ? getCliente(c.clienteId)?.endereco : '';
        const idCl = c.clienteId || nomeCl;

        if (!devedoresMap[idCl]) {
          devedoresMap[idCl] = {
            id: idCl,
            nome: nomeCl,
            tel: telCl || '',
            endereco: endCl || '',
            total: 0,
            atrasado: false,
            dias: 0,
            titulos: 0
          };
        }
        devedoresMap[idCl].total += val;
        devedoresMap[idCl].titulos++;
        if (venc && venc < hoje) {
          devedoresMap[idCl].atrasado = true;
          const atraso = Math.floor((hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
          if (atraso > devedoresMap[idCl].dias) devedoresMap[idCl].dias = atraso;
        }
      }
    });
  }

  // Contas a Pagar
  let pagAberto = 0;
  let pagVencido = 0;
  let pag7Dias = 0;
  let pag15Dias = 0;
  let pag30Dias = 0;

  if (Array.isArray(state.contasPagar)) {
    state.contasPagar.forEach(p => {
      if (!p.pago) {
        const val = Number(p.valor || 0);
        pagAberto += val;
        const venc = p.vencimento ? new Date(p.vencimento + 'T00:00:00') : null;
        if (venc) {
          const diffDias = Math.floor((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDias < 0) pagVencido += val;
          else if (diffDias <= 7) pag7Dias += val;
          else if (diffDias <= 15) pag15Dias += val;
          else if (diffDias <= 30) pag30Dias += val;
        }
      }
    });
  }

  // Estoque, Ruptura e Produtos Parados
  const prodZero = [];
  const prodBaixo = [];
  const runwayEstoque = [];
  const produtosParados = [];

  if (Array.isArray(state.produtos)) {
    state.produtos.forEach(p => {
      const min = Number(p.minimo || 0);
      const temVariantes = Array.isArray(p.variantes) && p.variantes.length > 0;
      // Produtos com variantes não usam p.estoque: o saldo real está em cada variante.
      // Somar as variantes evita classificar o produto-pai como zerado por um campo vazio.
      const estoqueTotal = temVariantes
        ? p.variantes.reduce((s, v) => s + Math.max(0, Number(v.estoque || 0)), 0)
        : Math.max(0, Number(p.estoque || 0));
      const qtdVendida = Number(qtdVendidaPorProduto[p.nome] || 0);
      const divisorDias = mesesRetroativos * 30;
      const giroDiario = qtdVendida > 0 ? (qtdVendida / divisorDias) : 0;
      // diasRestantes = null quando não há vendas no período (antes usava 999 e confundia com cobertura real longa)
      const semVendas = giroDiario <= 0 && estoqueTotal > 0;
      const diasRestantes = estoqueTotal <= 0 ? 0 : (giroDiario > 0 ? Math.floor(estoqueTotal / giroDiario) : null);

      runwayEstoque.push({
        id: p.id,
        nome: p.nome,
        estoque: estoqueTotal,
        minimo: min,
        preco: Number(p.preco || 0),
        giroDiario: Number(giroDiario.toFixed(2)),
        diasRestantes,
        semVendas,
        status: estoqueTotal <= 0 ? 'zerado' : (estoqueTotal <= min ? 'baixo' : 'ok'),
        variantes: temVariantes ? p.variantes.map(v => ({
          id: v.id,
          nome: v.nome,
          estoque: Math.max(0, Number(v.estoque || 0)),
          minimo: min,
          status: Number(v.estoque || 0) <= 0 ? 'zerado' : (Number(v.estoque || 0) <= min ? 'baixo' : 'ok')
        })) : []
      });

      // Para alertas, avaliar cada variante separadamente, igual à tela de Estoque.
      // O produto-pai só é usado quando não possui variantes.
      if (temVariantes) {
        p.variantes.forEach(v => {
          const estVariante = Math.max(0, Number(v.estoque || 0));
          const item = { id: p.id, varianteId: v.id, nome: `${p.nome} — ${v.nome}`, estoque: estVariante, minimo: min };
          if (estVariante <= 0) prodZero.push(item);
          else if (estVariante <= min) prodBaixo.push(item);
        });
      } else if (estoqueTotal <= 0) {
        prodZero.push({ id: p.id, nome: p.nome, estoque: estoqueTotal, minimo: min });
      } else if (estoqueTotal <= min) {
        prodBaixo.push({ id: p.id, nome: p.nome, estoque: estoqueTotal, minimo: min });
      }

      // Produto parado: considerar o saldo real agregado das variantes.
      if (estoqueTotal > 0 && qtdVendida === 0) {
        produtosParados.push({
          id: p.id,
          nome: p.nome,
          estoque: estoqueTotal,
          preco: Number(p.preco || 0),
          valorParado: Number((estoqueTotal * (p.preco || 0)).toFixed(2))
        });
      }
    });
  }

  // Matérias-Primas
  const matBaixas = [];
  if (Array.isArray(state.materias)) {
    const ativas = typeof materiasAtivas === 'function' ? materiasAtivas() : state.materias;
    ativas.forEach(m => {
      const min = Number(m.minimo || 0);
      const qtd = Number(m.qtd || 0);
      const necessidade = Math.max(0, (min * 1.5) - qtd);
      if (qtd <= min) {
        matBaixas.push({
          id: m.id,
          nome: m.nome,
          qtd: qtd,
          unidade: m.unidade || 'un',
          minimo: min,
          custo: Number(m.custo || 0),
          necessidadeCompra: Number(necessidade.toFixed(1)),
          fornecedorId: m.fornecedorId
        });
      }
    });
  }

  const clientesDevedores = Object.values(devedoresMap).sort((a, b) => b.total - a.total);
  const saldoCaixa = typeof calcularSaldoCaixa === 'function' ? calcularSaldoCaixa() : (fatMesAtual - despesasMesAtual);

  let totalCustosFixos = 0;
  if (Array.isArray(state.custosFixos)) {
    totalCustosFixos = state.custosFixos.reduce((acc, c) => acc + Number(c.valor || 0), 0);
  }
  const margemMediaPct = margemTotalItens.length > 0
    ? (margemTotalItens.reduce((a, b) => a + b, 0) / margemTotalItens.length)
    : 35;
  const breakEvenMensal = margemMediaPct > 0 ? (totalCustosFixos / (margemMediaPct / 100)) : 0;

  // Score de Saúde Empresarial (0 a 100)
  let scoreSaude = 100;
  if (prodZero.length > 0) scoreSaude -= Math.min(25, prodZero.length * 8);
  if (recVencido > 0) scoreSaude -= Math.min(25, Math.floor((recVencido / (fatMesAtual || 1)) * 30));
  if (saldoCaixa < 0) scoreSaude -= 20;
  if (matBaixas.length > 0) scoreSaude -= Math.min(15, matBaixas.length * 5);
  scoreSaude = Math.max(10, Math.min(100, Math.round(scoreSaude)));

  return {
    scoreSaude,
    faturamentoMes: Number(fatMesAtual.toFixed(2)),
    faturamentoPeriodo: Number(fatTotalPeriodo.toFixed(2)),
    despesasMes: Number(despesasMesAtual.toFixed(2)),
    despesasPeriodo: Number(despesasTotalPeriodo.toFixed(2)),
    saldoCaixa: Number(saldoCaixa.toFixed(2)),
    aReceber: Number(recAberto.toFixed(2)),
    aReceberVencido: Number(recVencido.toFixed(2)),
    aPagar: Number(pagAberto.toFixed(2)),
    aPagarVencido: Number(pagVencido.toFixed(2)),
    margemMediaPct: Math.round(margemMediaPct),
    breakEvenMensal: Math.round(breakEvenMensal),
    projecaoCaixa: {
      d7: Number((rec7Dias - pag7Dias).toFixed(2)),
      d15: Number((rec15Dias - pag15Dias).toFixed(2)),
      d30: Number((rec30Dias - pag30Dias).toFixed(2))
    },
    serieMensal,
    curvaABC,
    runwayEstoque: runwayEstoque.sort((a, b) => (a.diasRestantes ?? Infinity) - (b.diasRestantes ?? Infinity)),
    produtosParados: produtosParados.sort((a, b) => b.valorParado - a.valorParado),
    produtosEstoqueZero: prodZero,
    produtosEstoqueBaixo: prodBaixo,
    materiasBaixas: matBaixas,
    clientesDevedores,
    orcamentosAbertos,
    valorOrcamentos: Number(valorOrcamentos.toFixed(2))
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. GERADOR DE AÇÕES LOCAIS HEURÍSTICAS DO ERP
// ───────────────────────────────────────────────────────────────────
function gerarAcoesAutonomasLocais(ctx) {
  const acoes = [];

  // Ação 1: Reposição de Matéria-Prima
  if (ctx.materiasBaixas && ctx.materiasBaixas.length > 0) {
    ctx.materiasBaixas.forEach((m, idx) => {
      const custoEstimado = (m.necessidadeCompra * (m.custo || 10));
      acoes.push({
        id: `acao-mp-${m.id}-${idx}`,
        tipo: 'REPOR_ESTOQUE',
        titulo: `Gerar Pedido de Compra: ${m.nome}`,
        motivo: `Estoque atual (${m.qtd} ${m.unidade}) abaixo do mínimo (${m.minimo} ${m.unidade}). Risco de parada na fábrica.`,
        impactoFinanceiro: `Custo est. ${custoEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (evita ruptura)`,
        urgencia: 'alta',
        detalhes: {
          materiaId: m.id,
          nome: m.nome,
          qtdComprar: m.necessidadeCompra,
          unidade: m.unidade,
          custoUn: m.custo,
          fornecedorId: m.fornecedorId
        },
        autoExecutavel: true
      });
    });
  }

  // Ação 2: Cobrança dos Maiores Inadimplentes
  if (ctx.clientesDevedores && ctx.clientesDevedores.length > 0) {
    ctx.clientesDevedores.filter(c => c.atrasado).slice(0, 3).forEach((c, idx) => {
      const valFmt = c.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      acoes.push({
        id: `acao-cob-${c.id}-${idx}`,
        tipo: 'COBRANCA_INADIMPLENTE',
        titulo: `Disparar Cobrança Amigável: ${c.nome}`,
        motivo: `Saldo pendente de ${valFmt} vencido há ${c.dias} dia(s). Recuperação de capital de giro imediato.`,
        impactoFinanceiro: `Recupera ${valFmt} em caixa`,
        urgencia: c.dias > 15 ? 'alta' : 'media',
        detalhes: {
          clienteId: c.id,
          nome: c.nome,
          valor: c.total,
          dias: c.dias,
          tel: c.tel
        },
        autoExecutavel: true
      });
    });
  }

  // Ação 3: Otimização de Preço para Produtos Classe A
  if (ctx.curvaABC && ctx.curvaABC.length > 0) {
    const prodClasseA = ctx.curvaABC.filter(p => p.classe === 'A').slice(0, 2);
    prodClasseA.forEach((p, idx) => {
      const prodOriginal = state?.produtos?.find(pr => pr.nome === p.nome);
      if (prodOriginal) {
        const precoAtual = Number(prodOriginal.preco || 0);
        const novoPrecoSugerido = Number((precoAtual * 1.05).toFixed(2));
        acoes.push({
          id: `acao-preco-${prodOriginal.id}-${idx}`,
          tipo: 'AJUSTE_PRECO_MARGEM',
          titulo: `Ajuste Fino de Markup (+5%): ${prodOriginal.nome}`,
          motivo: `Produto Classe A responsável por alta parcela da receita. Elasticidade permite reajuste de R$ ${precoAtual.toFixed(2)} para R$ ${novoPrecoSugerido.toFixed(2)}.`,
          impactoFinanceiro: `+5% de margem líquida direta no faturamento`,
          urgencia: 'baixa',
          detalhes: {
            produtoId: prodOriginal.id,
            nome: prodOriginal.nome,
            precoAtual,
            novoPreco: novoPrecoSugerido
          },
          autoExecutavel: true
        });
      }
    });
  }

  // Ação 4: Resgate de Orçamentos Abertos
  if (ctx.orcamentosAbertos > 0) {
    const orc = state?.vendas?.find(v => v.tipo === 'orcamento' && v.status === 'em_aberto');
    if (orc) {
      const clienteNome = typeof getCliente === 'function' ? getCliente(orc.clienteId)?.nome : 'Cliente';
      const valorFmt = Number(orc.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      acoes.push({
        id: `acao-orc-${orc.id}`,
        tipo: 'CONVERTER_ORCAMENTO',
        titulo: `Aprovar & Despachar Orçamento #${orc.id} (${clienteNome})`,
        motivo: `Orçamento de ${valorFmt} aguardando aprovação. Converter fecha o faturamento da semana.`,
        impactoFinanceiro: `+${valorFmt} em vendas confirmadas`,
        urgencia: 'media',
        detalhes: {
          vendaId: orc.id,
          clienteNome,
          total: orc.total
        },
        autoExecutavel: true
      });
    }
  }

  return acoes;
}

// ───────────────────────────────────────────────────────────────────
// 4. SUB-TELA 2: GERADOR DE PACOTES PARA IA EXTERNA
// ───────────────────────────────────────────────────────────────────
function construirPacoteAnalise() {
  const ctx = coletarContextoERP(_filtroPeriodo);
  const jaResolvidos = obterIdsJaResolvidos();

  // Tratamento de anonimização se ativado
  let devedoresFormatados = ctx.clientesDevedores;
  if (_anonimizarClientes) {
    devedoresFormatados = ctx.clientesDevedores.map((c, idx) => ({
      id: `cartao-${String(idx + 1).padStart(3, '0')}`,
      nome: `#Cartão ${String(idx + 1).padStart(3, '0')}`,
      total: c.total,
      atrasado: c.atrasado,
      dias: c.dias,
      titulos: c.titulos
    }));
  }

  const pacote = {
    versao_formato: 1,
    gerado_em: new Date().toISOString(),
    periodo: _filtroPeriodo,
    foco: _filtroFoco,
    anonimizado: _anonimizarClientes,
    instrucoes: "Você é um consultor analítico sênior para ERP. Interprete os indicadores e dados fornecidos SEM recalcular os números já computados. Para produtos com variantes, use o estoque total agregado e confira também o saldo de cada variante; NUNCA declare o produto-pai zerado se a soma das variantes for maior que zero. Só aponte ruptura quando o saldo total ou a variante relevante estiver realmente zerado, e identifique a variante no alerta. Não confunda ausência do campo estoque no produto-pai com estoque zero. Identifique anomalias críticas, riscos de liquidez/ruptura e alavancas de rentabilidade. Sua resposta DEVE ser estritamente no formato JSON a seguir, sem texto antes ou depois: {\"versao_formato\": 1, \"interpretado_por\": \"Claude\", \"data_analise\": \"AAAA-MM-DD\", \"resumo\": \"texto executivo sucinto\", \"alertas\": [{\"id\": \"alt-1\", \"titulo\": \"...\", \"motivo\": \"...\", \"urgencia\": \"alta|media|baixa\", \"impacto\": \"...\", \"acao\": {\"tipo\": \"repor_estoque|cobrar_cliente|abrir_produto|nenhuma\", \"ref\": \"id opcional\"}}], \"oportunidades\": [{\"id\": \"op-1\", \"titulo\": \"...\", \"motivo\": \"...\", \"urgencia\": \"alta|media|baixa\", \"impacto\": \"...\", \"acao\": {\"tipo\": \"repor_estoque|cobrar_cliente|abrir_produto|nenhuma\", \"ref\": \"id opcional\"}}], \"acoes\": [{\"id\": \"ac-1\", \"titulo\": \"...\", \"motivo\": \"...\", \"urgencia\": \"alta|media|baixa\", \"impacto\": \"...\", \"acao\": {\"tipo\": \"repor_estoque|cobrar_cliente|abrir_produto|nenhuma\", \"ref\": \"id opcional\"}}]}",
    indicadores: {
      faturamento: ctx.faturamentoMes,
      faturamento_periodo: ctx.faturamentoPeriodo,
      despesas: ctx.despesasMes,
      despesas_periodo: ctx.despesasPeriodo,
      saldo_caixa: ctx.saldoCaixa,
      a_receber: ctx.aReceber,
      a_receber_vencido: ctx.aReceberVencido,
      a_pagar: ctx.aPagar,
      a_pagar_vencido: ctx.aPagarVencido,
      margem_media_pct: ctx.margemMediaPct,
      ponto_equilibrio: ctx.breakEvenMensal,
      score_saude: ctx.scoreSaude,
      projecao_caixa_7d: ctx.projecaoCaixa.d7,
      projecao_caixa_15d: ctx.projecaoCaixa.d15,
      projecao_caixa_30d: ctx.projecaoCaixa.d30
    },
    serie_mensal: ctx.serieMensal,
    curva_abc: ctx.curvaABC,
    runway_estoque: ctx.runwayEstoque,
    produtos_parados: ctx.produtosParados,
    devedores_e_atrasos: devedoresFormatados,
    orcamentos_abertos: {
      quantidade: ctx.orcamentosAbertos,
      valor_total: ctx.valorOrcamentos
    },
    ja_resolvido: jaResolvidos
  };

  return pacote;
}

function atualizarPreviewPacote() {
  const elPre = document.getElementById('analise-pacote-preview');
  const elTam = document.getElementById('analise-pacote-tamanho');
  if (!elPre) return;

  const pacote = construirPacoteAnalise();
  const jsonStr = JSON.stringify(pacote, null, 2);
  elPre.value = jsonStr;

  const bytes = new Blob([jsonStr]).size;
  const kb = (bytes / 1024).toFixed(1);
  if (elTam) {
    elTam.textContent = `Tamanho: ${kb} KB (${jsonStr.length.toLocaleString('pt-BR')} caracteres)`;
  }
}

function copiarPacoteJSON() {
  const elPre = document.getElementById('analise-pacote-preview');
  if (!elPre) return;
  const jsonStr = elPre.value;
  navigator.clipboard.writeText(jsonStr).then(() => {
    if (typeof showToast === 'function') {
      showToast('📋 Pacote JSON copiado para a área de transferência!', '#4CC38A');
    }
  }).catch(() => {
    elPre.select();
    document.execCommand('copy');
    if (typeof showToast === 'function') {
      showToast('📋 Copiado!', '#4CC38A');
    }
  });
}

function exportarPacoteJSON() {
  const elPre = document.getElementById('analise-pacote-preview');
  if (!elPre) return;
  const jsonStr = elPre.value;
  const dataHoje = new Date().toISOString().slice(0, 10);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gestaopro-pacote-analise-${dataHoje}.json`;
  a.click();
  URL.revokeObjectURL(url);
  if (typeof showToast === 'function') {
    showToast('💾 Arquivo JSON exportado com sucesso!', '#4CC38A');
  }
}

// ───────────────────────────────────────────────────────────────────
// 5. SUB-TELA 3: IMPORTAÇÃO E VALIDAÇÃO ESTRITA DE ESQUEMA
// ───────────────────────────────────────────────────────────────────
function validarEsquemaAnalise(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { valido: false, erro: 'O conteúdo informado deve ser um objeto JSON válido.' };
  }

  if (obj.versao_formato !== 1) {
    return { valido: false, erro: "O campo 'versao_formato' deve ser exatamente igual a 1." };
  }

  if (typeof obj.interpretado_por !== 'string' || !obj.interpretado_por.trim()) {
    return { valido: false, erro: "O campo 'interpretado_por' é obrigatório (ex: 'Claude')." };
  }

  if (typeof obj.data_analise !== 'string' || !obj.data_analise.trim()) {
    return { valido: false, erro: "O campo 'data_analise' é obrigatório (ex: '2026-11-06')." };
  }

  if (typeof obj.resumo !== 'string' || !obj.resumo.trim()) {
    return { valido: false, erro: "O campo 'resumo' com texto executivo sucinto é obrigatório." };
  }

  const validarListaItens = (lista, nomeCampo) => {
    if (!Array.isArray(lista)) {
      return `O campo '${nomeCampo}' deve ser uma lista (array).`;
    }
    for (let i = 0; i < lista.length; i++) {
      const it = lista[i];
      if (!it || typeof it !== 'object') {
        return `Item #${i + 1} de '${nomeCampo}' inválido.`;
      }
      if (!it.id || typeof it.id !== 'string') {
        return `Item #${i + 1} de '${nomeCampo}' deve conter um 'id' em formato string.`;
      }
      if (!it.titulo || typeof it.titulo !== 'string') {
        return `Item #${i + 1} de '${nomeCampo}' deve conter um 'titulo'.`;
      }
      if (!it.motivo || typeof it.motivo !== 'string') {
        return `Item #${i + 1} de '${nomeCampo}' deve conter um 'motivo' detalhado.`;
      }
      if (!['alta', 'media', 'baixa'].includes(String(it.urgencia || '').toLowerCase())) {
        return `Item #${i + 1} de '${nomeCampo}' deve ter urgencia 'alta', 'media' ou 'baixa'.`;
      }
    }
    return null;
  };

  const errAlertas = validarListaItens(obj.alertas, 'alertas');
  if (errAlertas) return { valido: false, erro: errAlertas };

  const errOportunidades = validarListaItens(obj.oportunidades, 'oportunidades');
  if (errOportunidades) return { valido: false, erro: errOportunidades };

  const errAcoes = validarListaItens(obj.acoes, 'acoes');
  if (errAcoes) return { valido: false, erro: errAcoes };

  return { valido: true };
}

function processarImportacaoJSON() {
  const txtEl = document.getElementById('analise-import-textarea');
  const errEl = document.getElementById('analise-import-erro');
  if (!txtEl || !errEl) return;

  const raw = txtEl.value.trim();
  if (!raw) {
    errEl.textContent = 'Por favor, cole o JSON fornecido pela IA.';
    errEl.style.display = 'block';
    return;
  }

  let parsed = null;
  try {
    // Extrai JSON mesmo se vier envelopado em ```json ```
    let clean = raw;
    if (clean.includes('```')) {
      const match = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match && match[1]) clean = match[1];
    }
    parsed = JSON.parse(clean);
  } catch (e) {
    errEl.textContent = 'Erro de sintaxe JSON: verifique se não faltam aspas ou chaves no texto colado.';
    errEl.style.display = 'block';
    return;
  }

  const validacao = validarEsquemaAnalise(parsed);
  if (!validacao.valido) {
    errEl.textContent = `Falha de validação: ${validacao.erro}`;
    errEl.style.display = 'block';
    return;
  }

  errEl.style.display = 'none';

  // Salva no histórico das últimas 12 análises
  const historico = obterHistoricoAnalises();
  const novaAnalise = {
    ...parsed,
    criado_em: new Date().toISOString(),
    resolvidos: {} // { [cardId]: 'feito' | 'ignorado' }
  };

  historico.unshift(novaAnalise);
  salvarHistoricoAnalises(historico);

  txtEl.value = '';
  _analiseHistoricoIdx = 0;

  if (typeof showToast === 'function') {
    showToast(`✅ Análise importada com sucesso (${parsed.interpretado_por})!`, '#4CC38A');
  }

  mudarSubAbaAnalise('resultados');
}

// ───────────────────────────────────────────────────────────────────
// 6. SUB-TELA 4: RESULTADOS, COMPARATIVO E AUDITORIA
// ───────────────────────────────────────────────────────────────────
function marcarCardAnalise(cardId, status) {
  const hist = obterHistoricoAnalises();
  if (hist.length === 0) return;
  const an = hist[_analiseHistoricoIdx] || hist[0];
  if (!an) return;

  if (!an.resolvidos) an.resolvidos = {};
  if (an.resolvidos[cardId] === status) {
    delete an.resolvidos[cardId]; // Alterna
  } else {
    an.resolvidos[cardId] = status;
  }

  salvarHistoricoAnalises(hist);
  renderSubAbaResultados();
}

function executarAcaoCard(tipoAcao, ref) {
  if (tipoAcao === 'repor_estoque') {
    if (typeof goto === 'function') goto('estoque');
    if (typeof showToast === 'function') showToast('📦 Redirecionando para Estoque & Reposição...', '#C9A24B');
  } else if (tipoAcao === 'cobrar_cliente') {
    if (typeof goto === 'function') goto('receber');
    if (typeof showToast === 'function') showToast('💬 Redirecionando para Contas a Receber...', '#00bdae');
  } else if (tipoAcao === 'abrir_produto') {
    if (typeof goto === 'function') goto('precificacao');
    if (typeof showToast === 'function') showToast('🏷️ Redirecionando para Precificação...', '#C9A24B');
  } else {
    if (typeof showToast === 'function') showToast('Nenhuma ação automática vinculada.', '#8E897C');
  }
}

function selecionarAnaliseHistorico(idx) {
  _analiseHistoricoIdx = idx;
  renderSubAbaResultados();
}

function excluirAnaliseHistorico(idx) {
  if (!confirm('Deseja realmente excluir esta análise do histórico?')) return;
  const hist = obterHistoricoAnalises();
  hist.splice(idx, 1);
  salvarHistoricoAnalises(hist);
  _analiseHistoricoIdx = 0;
  renderSubAbaResultados();
}

// ───────────────────────────────────────────────────────────────────
// 7. RENDERIZADOR DAS 4 SUB-TELAS
// ───────────────────────────────────────────────────────────────────
function mudarSubAbaAnalise(abaId) {
  _subAbaAnaliseAtual = abaId;

  document.querySelectorAll('.analise-subtab-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-subtab') === abaId);
  });

  const cPainel = document.getElementById('analise-view-painel');
  const cGerar = document.getElementById('analise-view-gerar');
  const cImportar = document.getElementById('analise-view-importar');
  const cResultados = document.getElementById('analise-view-resultados');

  if (cPainel) cPainel.style.display = abaId === 'painel' ? 'block' : 'none';
  if (cGerar) cGerar.style.display = abaId === 'gerar' ? 'block' : 'none';
  if (cImportar) cImportar.style.display = abaId === 'importar' ? 'block' : 'none';
  if (cResultados) cResultados.style.display = abaId === 'resultados' ? 'block' : 'none';

  if (abaId === 'painel') renderSubAbaPainel();
  if (abaId === 'gerar') {
    atualizarPreviewPacote();
  }
  if (abaId === 'resultados') renderSubAbaResultados();

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderAnaliseDados() {
  mudarSubAbaAnalise(_subAbaAnaliseAtual);
  atualizarSelosAnaliseDados();
}

// Sub-aba 1: Painel
function renderSubAbaPainel() {
  const container = document.getElementById('analise-painel-conteudo');
  if (!container) return;

  const ctx = coletarContextoERP('mes_atual');
  const faturamentoFmt = ctx.faturamentoMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const corScore = ctx.scoreSaude > 75 ? '#4CC38A' : (ctx.scoreSaude > 50 ? '#F2C94C' : '#EB5757');

  container.innerHTML = `
    <!-- KPIS EXECUTIVOS LOCAIS -->
    <div class="ia-kpi-grid">
      <div class="ia-kpi-box">
        <span class="ia-kpi-sub">Score de Saúde Operacional</span>
        <span class="ia-kpi-val" style="color:${corScore}">${ctx.scoreSaude}/100</span>
      </div>
      <div class="ia-kpi-box">
        <span class="ia-kpi-sub">Ponto de Equilíbrio (Mês)</span>
        <span class="ia-kpi-val">${ctx.breakEvenMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
      </div>
      <div class="ia-kpi-box">
        <span class="ia-kpi-sub">Margem Média Bruta</span>
        <span class="ia-kpi-val" style="color:var(--gold,#C9A24B)">${ctx.margemMediaPct}%</span>
      </div>
      <div class="ia-kpi-box">
        <span class="ia-kpi-sub">Fluxo Projetado (15 Dias)</span>
        <span class="ia-kpi-val" style="color:${ctx.projecaoCaixa.d15 >= 0 ? '#4CC38A' : '#EB5757'}">
          ${ctx.projecaoCaixa.d15.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      </div>
    </div>

    <!-- PROJEÇÃO DE CAIXA LÍQUIDO -->
    <div class="table-card" style="margin-bottom:14px;padding:14px">
      <h4 style="margin:0 0 10px;font-size:13.5px;color:var(--gold,#C9A24B);display:flex;align-items:center;gap:6px">
        <i data-lucide="calendar" style="width:16px;height:16px"></i> Projeção de Liquidez (Entradas Previstas − Saídas Agendadas)
      </h4>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:8px">
        <div style="background:rgba(255,255,255,0.02);padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.06)">
          <div style="font-size:11px;color:var(--muted)">Próximos 7 dias</div>
          <strong style="font-size:15px;color:${ctx.projecaoCaixa.d7 >= 0 ? '#4CC38A' : '#EB5757'}">${ctx.projecaoCaixa.d7.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
        </div>
        <div style="background:rgba(255,255,255,0.02);padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.06)">
          <div style="font-size:11px;color:var(--muted)">Próximos 15 dias</div>
          <strong style="font-size:15px;color:${ctx.projecaoCaixa.d15 >= 0 ? '#4CC38A' : '#EB5757'}">${ctx.projecaoCaixa.d15.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
        </div>
        <div style="background:rgba(255,255,255,0.02);padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.06)">
          <div style="font-size:11px;color:var(--muted)">Próximos 30 dias</div>
          <strong style="font-size:15px;color:${ctx.projecaoCaixa.d30 >= 0 ? '#4CC38A' : '#EB5757'}">${ctx.projecaoCaixa.d30.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
        </div>
      </div>
    </div>

    <!-- CURVA ABC COMPLETA -->
    <div class="table-card" style="margin-bottom:14px;padding:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <h4 style="margin:0;font-size:13.5px;color:var(--gold,#C9A24B);display:flex;align-items:center;gap:6px">
          <i data-lucide="layers" style="width:16px;height:16px"></i> Resumo da Curva ABC (Pareto 80/15/5)
        </h4>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span style="font-size:11px;color:var(--muted)">${ctx.curvaABC.length} produtos classificados</span>
          <button type="button" class="btn btn-outline btn-sm" onclick="abrirCurvaABCDetalhada()">Ver análise detalhada</button>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${ctx.curvaABC.length > 0 ? ctx.curvaABC.map(p => `
          <div class="ia-linha-resumo">
            <div class="ia-linha-info">
              <div style="display:flex;align-items:center;gap:8px">
                <span class="badge" style="background:${p.classe === 'A' ? 'var(--gold,#C9A24B)' : (p.classe === 'B' ? '#4CC38A' : '#8E897C')};color:#000;font-size:10px;font-weight:800;padding:2px 7px;white-space:nowrap">Classe ${p.classe}</span>
                <strong>${p.nome}</strong>
              </div>
              <span class="ia-linha-sub">${p.qtd} un ${Number(p.qtd) === 1 ? 'vendida' : 'vendidas'} · ${String(p.pctDoTotal).replace('.', ',')}% da receita</span>
            </div>
            <strong class="ia-linha-valor">${p.receita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
          </div>
        `).join('') : '<p style="color:var(--muted);font-size:12px;margin:0">Nenhuma venda registrada.</p>'}
      </div>
    </div>

    <!-- RUNWAY DE ESTOQUE COMPLETO -->
    <div class="table-card" style="padding:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <h4 style="margin:0;font-size:13.5px;color:var(--gold,#C9A24B);display:flex;align-items:center;gap:6px">
          <i data-lucide="package-search" style="width:16px;height:16px"></i> Runway de Cobertura de Estoque (Dias até Ruptura)
        </h4>
        <span style="font-size:11px;color:var(--muted)">Ordenado pelos mais críticos · azul: mais de 180 dias (excesso)</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${ctx.runwayEstoque.length > 0 ? ctx.runwayEstoque.map(r => {
          const LIMITE_EXCESSO_DIAS = 180; // cobertura acima disso = capital parado
          let tagClasse, tagTexto;
          if (r.semVendas) { tagClasse = 'ia-tag-baixa'; tagTexto = 'Sem vendas'; }
          else if (r.diasRestantes <= 0) { tagClasse = 'ia-tag-alta'; tagTexto = 'RUPTURA IMEDIATA'; }
          else if (r.diasRestantes > LIMITE_EXCESSO_DIAS) { tagClasse = 'ia-tag-excesso'; tagTexto = `${r.diasRestantes.toLocaleString('pt-BR')} dias · excesso`; }
          else { tagClasse = r.diasRestantes <= 7 ? 'ia-tag-media' : 'ia-tag-baixa'; tagTexto = `${r.diasRestantes} dias restantes`; }
          return `
          <div class="ia-linha-resumo">
            <div class="ia-linha-info">
              <strong>${r.nome}</strong>
              <span class="ia-linha-sub">Estoque: ${r.estoque} un (Mín: ${r.minimo}) · Giro: ${Number(r.giroDiario).toLocaleString('pt-BR')}/dia</span>
            </div>
            <span class="ia-tag-urgencia ${tagClasse}">${tagTexto}</span>
          </div>`;
        }).join('') : '<p style="color:var(--muted);font-size:12px;margin:0">Nenhum produto cadastrado.</p>'}
      </div>
    </div>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Sub-aba 4: Resultados
function renderSubAbaResultados() {
  const container = document.getElementById('analise-resultados-conteudo');
  if (!container) return;

  const hist = obterHistoricoAnalises();
  if (hist.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:48px 16px;background:var(--card);border:1px dashed var(--border);border-radius:14px">
        <i data-lucide="file-question" style="width:42px;height:42px;color:var(--gold,#C9A24B);margin:0 auto 12px;display:block"></i>
        <h3 style="margin:0 0 6px;color:#FFF;font-size:16px">Nenhuma Análise Importada Ainda</h3>
        <p style="margin:0 0 16px;font-size:13px;color:var(--muted);max-width:440px;margin-left:auto;margin-right:auto">
          Gere um pacote na aba <strong>"Gerar Pacote"</strong>, envie para a IA da sua preferência (ex: Claude) e cole o resultado na aba <strong>"Importar"</strong>.
        </p>
        <button class="btn btn-primary" onclick="mudarSubAbaAnalise('gerar')">
          <i data-lucide="package" class="ic"></i> Ir para Gerar Pacote
        </button>
      </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  const anAtual = hist[_analiseHistoricoIdx] || hist[0];
  const anAnterior = hist[_analiseHistoricoIdx + 1] || null;

  // Checa data (> 30 dias = desatualizada)
  const dtAnalise = new Date(anAtual.data_analise + 'T00:00:00');
  const agora = new Date();
  const diffDias = Math.floor((agora.getTime() - dtAnalise.getTime()) / (1000 * 60 * 60 * 24));
  const desatualizada = diffDias > 30;

  const dtFmt = dtAnalise.toLocaleDateString('pt-BR');

  // Conta pendências
  const resolvidos = anAtual.resolvidos || {};
  const todosItens = [...(anAtual.alertas || []), ...(anAtual.oportunidades || []), ...(anAtual.acoes || [])];
  const pendentesCount = todosItens.filter(it => !resolvidos[it.id]).length;

  // Renderiza um card
  const renderItemCard = (it) => {
    const status = resolvidos[it.id] || 'pendente';
    const tagClass = it.urgencia === 'alta' ? 'ia-tag-alta' : (it.urgencia === 'media' ? 'ia-tag-media' : 'ia-tag-baixa');
    const isFeito = status === 'feito';
    const isIgnorado = status === 'ignorado';

    let acaoBtnHtml = '';
    if (it.acao && it.acao.tipo && it.acao.tipo !== 'nenhuma') {
      let labelAcao = 'Ir para Tela';
      let iconAcao = 'external-link';
      if (it.acao.tipo === 'repor_estoque') { labelAcao = 'Comprar / Estoque'; iconAcao = 'package'; }
      if (it.acao.tipo === 'cobrar_cliente') { labelAcao = 'Cobrança / Clientes'; iconAcao = 'message-circle'; }
      if (it.acao.tipo === 'abrir_produto') { labelAcao = 'Ver Precificação'; iconAcao = 'tag'; }

      acaoBtnHtml = `
        <button class="btn btn-outline btn-xs" onclick="executarAcaoCard('${it.acao.tipo}', '${it.acao.ref || ''}')" style="border-color:var(--gold,#C9A24B);color:var(--gold,#C9A24B)">
          <i data-lucide="${iconAcao}" style="width:13px;height:13px"></i> ${labelAcao}
        </button>
      `;
    }

    return `
      <div class="analise-card ${isFeito ? 'card-feito' : ''} ${isIgnorado ? 'card-ignorado' : ''}">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <span class="ia-tag-urgencia ${tagClass}">Urgência ${it.urgencia}</span>
          ${it.impacto ? `<span style="font-size:11.5px;color:var(--gold,#C9A24B);font-weight:700">${it.impacto}</span>` : ''}
        </div>
        <div>
          <h4 style="margin:4px 0;font-size:14px;color:#FFF;font-weight:700">${it.titulo}</h4>
          <p style="margin:0;font-size:12.5px;color:var(--text);line-height:1.45">${it.motivo}</p>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;flex-wrap:wrap;gap:8px">
          <div style="display:flex;gap:6px">
            ${acaoBtnHtml}
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-xs ${isFeito ? 'btn-green' : 'btn-outline'}" onclick="marcarCardAnalise('${it.id}', 'feito')">
              <i data-lucide="check" style="width:12px;height:12px"></i> ${isFeito ? 'Feito' : 'Marcar Feito'}
            </button>
            <button class="btn btn-xs ${isIgnorado ? 'btn-red' : 'btn-outline'}" onclick="marcarCardAnalise('${it.id}', 'ignorado')">
              <i data-lucide="x" style="width:12px;height:12px"></i> ${isIgnorado ? 'Ignorado' : 'Ignorar'}
            </button>
          </div>
        </div>
      </div>
    `;
  };

  // Comparação com a análise anterior (se houver)
  let blocoComparativo = '';
  if (anAnterior) {
    const alertasAnteriores = (anAnterior.alertas || []).map(a => a.id);
    const alertasAtuais = (anAtual.alertas || []).map(a => a.id);
    const alertasPersistentes = alertasAtuais.filter(id => alertasAnteriores.includes(id));
    const alertasResolvidos = alertasAnteriores.filter(id => !alertasAtuais.includes(id));

    blocoComparativo = `
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;margin-bottom:16px">
        <h4 style="margin:0 0 8px;font-size:13.5px;color:var(--gold,#C9A24B);display:flex;align-items:center;gap:6px">
          <i data-lucide="git-compare" style="width:15px;height:15px"></i> Comparativo com Análise Anterior (${new Date(anAnterior.data_analise + 'T00:00:00').toLocaleDateString('pt-BR')})
        </h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12.5px">
          <div style="background:rgba(76,195,138,0.08);border:1px solid rgba(76,195,138,0.25);border-radius:8px;padding:10px">
            <strong style="color:#4CC38A;display:block;margin-bottom:2px">✓ Alertas Superados / Resolvidos: ${alertasResolvidos.length}</strong>
            <span style="color:var(--muted);font-size:11px">Itens anteriores que não se repetiram nesta análise.</span>
          </div>
          <div style="background:rgba(235,87,87,0.08);border:1px solid rgba(235,87,87,0.25);border-radius:8px;padding:10px">
            <strong style="color:#EB5757;display:block;margin-bottom:2px">⚠️ Alertas Persistentes: ${alertasPersistentes.length}</strong>
            <span style="color:var(--muted);font-size:11px">Gargalos que demandam atenção contínua.</span>
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <!-- HEADER DA ANÁLISE SELECIONADA -->
    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px">
        <div>
          <div style="display:flex;align-items:center;gap:8px">
            <h3 style="margin:0;font-size:16px;color:#FFF">Diagnóstico Executivo: ${dtFmt}</h3>
            <span class="badge" style="background:var(--gold,#C9A24B);color:#000;font-size:10px;font-weight:800;padding:2px 8px">${anAtual.interpretado_por}</span>
            ${desatualizada ? `
              <span class="badge" style="background:#EB5757;color:#FFF;font-size:10px;font-weight:800;padding:2px 8px">⚠️ Desatualizada (> 30 dias)</span>
            ` : `
              <span class="badge" style="background:#4CC38A;color:#000;font-size:10px;font-weight:800;padding:2px 8px">✅ Recente</span>
            `}
          </div>
          <span style="font-size:12px;color:var(--muted);margin-top:2px;display:block">
            ${pendentesCount > 0 ? `<strong style="color:var(--gold,#C9A24B)">${pendentesCount} item(ns) pendente(s)</strong> de ação` : '<strong style="color:#4CC38A">Todos os itens foram concluídos!</strong>'}
          </span>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-xs" onclick="mudarSubAbaAnalise('gerar')">
            <i data-lucide="plus" style="width:13px;height:13px"></i> Nova Análise
          </button>
        </div>
      </div>

      <!-- RESUMO EXECUTIVO -->
      <div style="background:rgba(201,162,75,0.08);border:1px solid rgba(201,162,75,0.3);border-radius:10px;padding:12px 14px;font-size:13px;line-height:1.5;color:var(--text)">
        <strong style="color:var(--gold,#C9A24B);display:block;margin-bottom:4px">Resumo da Interpretação:</strong>
        ${anAtual.resumo}
      </div>
    </div>

    <!-- COMPARATIVO SE DISPONÍVEL -->
    ${blocoComparativo}

    <!-- SEÇÃO: ALERTAS CRÍTICOS -->
    <div style="margin-bottom:18px">
      <h4 style="font-size:14px;color:#FFF;margin:0 0 8px;display:flex;align-items:center;gap:6px">
        <i data-lucide="alert-triangle" style="width:16px;height:16px;color:#EB5757"></i> Alertas Críticos (${(anAtual.alertas || []).length})
      </h4>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${(anAtual.alertas && anAtual.alertas.length > 0) ? anAtual.alertas.map(renderItemCard).join('') : '<p style="color:var(--muted);font-size:12px">Nenhum alerta crítico apontado.</p>'}
      </div>
    </div>

    <!-- SEÇÃO: OPORTUNIDADES -->
    <div style="margin-bottom:18px">
      <h4 style="font-size:14px;color:#FFF;margin:0 0 8px;display:flex;align-items:center;gap:6px">
        <i data-lucide="sparkles" style="width:16px;height:16px;color:var(--gold,#C9A24B)"></i> Oportunidades Identificadas (${(anAtual.oportunidades || []).length})
      </h4>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${(anAtual.oportunidades && anAtual.oportunidades.length > 0) ? anAtual.oportunidades.map(renderItemCard).join('') : '<p style="color:var(--muted);font-size:12px">Nenhuma oportunidade específica apontada.</p>'}
      </div>
    </div>

    <!-- SEÇÃO: AÇÕES PRIORITÁRIAS -->
    <div style="margin-bottom:24px">
      <h4 style="font-size:14px;color:#FFF;margin:0 0 8px;display:flex;align-items:center;gap:6px">
        <i data-lucide="zap" style="width:16px;height:16px;color:#00bdae"></i> Ações Recomendadas (${(anAtual.acoes || []).length})
      </h4>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${(anAtual.acoes && anAtual.acoes.length > 0) ? anAtual.acoes.map(renderItemCard).join('') : '<p style="color:var(--muted);font-size:12px">Nenhuma ação imediata cadastrada.</p>'}
      </div>
    </div>

    <!-- HISTÓRICO DE ANÁLISES ANTERIORES -->
    <div class="table-card" style="padding:14px">
      <h4 style="margin:0 0 10px;font-size:13.5px;color:#FFF;display:flex;align-items:center;gap:6px">
        <i data-lucide="history" style="width:15px;height:15px"></i> Histórico de Análises Salvas (${hist.length}/12)
      </h4>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${hist.map((item, idx) => {
          const isAtivo = idx === _analiseHistoricoIdx;
          const dt = new Date(item.data_analise + 'T00:00:00').toLocaleDateString('pt-BR');
          const itensTotal = (item.alertas?.length || 0) + (item.oportunidades?.length || 0) + (item.acoes?.length || 0);
          return `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-radius:8px;background:${isAtivo ? 'rgba(201,162,75,0.12)' : 'rgba(255,255,255,0.02)'};border:1px solid ${isAtivo ? 'rgba(201,162,75,0.4)' : 'rgba(255,255,255,0.06)'}">
              <div style="cursor:pointer;flex:1;min-width:0" onclick="selecionarAnaliseHistorico(${idx})">
                <strong style="color:${isAtivo ? 'var(--gold,#C9A24B)' : '#FFF'};font-size:13px">${dt}</strong>
                <span style="font-size:11px;color:var(--muted);margin-left:6px">(${item.interpretado_por}) · ${itensTotal} itens</span>
                <p style="margin:2px 0 0;font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.resumo}</p>
              </div>
              <div style="display:flex;gap:6px;margin-left:10px">
                ${!isAtivo ? `<button class="btn btn-outline btn-xs" onclick="selecionarAnaliseHistorico(${idx})">Visualizar</button>` : '<span class="badge" style="background:var(--gold,#C9A24B);color:#000;font-size:10px;font-weight:800">Em exibição</span>'}
                <button class="btn btn-outline btn-xs" onclick="excluirAnaliseHistorico(${idx})" style="color:var(--red,#EB5757);border-color:rgba(235,87,87,0.3)"><i data-lucide="trash-2" style="width:12px;height:12px"></i></button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ───────────────────────────────────────────────────────────────────
// 8. ATALHOS COPILOTO IA & SELOS DE ALERTA PENDENTE
// ───────────────────────────────────────────────────────────────────
function abrirAtalhoCopilotoIA(focoPreDefinido) {
  if (typeof goto === 'function') goto('analisedados');

  if (focoPreDefinido) {
    _filtroFoco = focoPreDefinido;
    const selFoco = document.getElementById('analise-filtro-foco');
    if (selFoco) selFoco.value = focoPreDefinido;
    mudarSubAbaAnalise('gerar');
    return;
  }

  const hist = obterHistoricoAnalises();
  if (hist.length === 0) {
    mudarSubAbaAnalise('gerar');
    return;
  }

  const anMaisRecente = hist[0];
  const resolvidos = anMaisRecente.resolvidos || {};
  const todosItens = [...(anMaisRecente.alertas || []), ...(anMaisRecente.oportunidades || []), ...(anMaisRecente.acoes || [])];
  const pendentes = todosItens.filter(it => !resolvidos[it.id]);

  if (pendentes.length > 0) {
    _analiseHistoricoIdx = 0;
    mudarSubAbaAnalise('resultados');
  } else {
    mudarSubAbaAnalise('painel');
  }
}

// Retrocompatibilidade para atalhos existentes no ERP
function abrirAssistenteIA(prompt, aba) {
  if (aba === 'analise' || aba === 'painel') {
    if (typeof goto === 'function') goto('analisedados');
    mudarSubAbaAnalise('painel');
    return;
  }
  if (aba === 'acoes' || aba === 'resultados') {
    if (typeof goto === 'function') goto('analisedados');
    mudarSubAbaAnalise('resultados');
    return;
  }
  abrirAtalhoCopilotoIA();
}

function fecharAssistenteIA() {
  // Mantida por segurança
}

function otimizarPrecoComIA() {
  abrirAtalhoCopilotoIA('precos');
}

function analisarEstoqueComIA() {
  abrirAtalhoCopilotoIA('estoque');
}

function otimizarMeuDiaComIA() {
  abrirAtalhoCopilotoIA('geral');
}

function abrirGeradorCobrancaIA() {
  abrirAtalhoCopilotoIA('clientes');
}

function executarDiagnosticoIA() {
  abrirAtalhoCopilotoIA('geral');
}

function atualizarSelosAnaliseDados() {
  const hist = obterHistoricoAnalises();
  let pendentesCount = 0;
  if (hist.length > 0) {
    const an = hist[0];
    const resolvidos = an.resolvidos || {};
    const todos = [...(an.alertas || []), ...(an.oportunidades || []), ...(an.acoes || [])];
    pendentesCount = todos.filter(it => !resolvidos[it.id]).length;
  }

  const badges = [
    document.getElementById('nav-badge-analisedados'),
    document.getElementById('nav-badge-copiloto'),
    document.getElementById('ia-badge-flutuante')
  ];

  badges.forEach(b => {
    if (b) {
      if (pendentesCount > 0) {
        b.style.display = 'inline-block';
        b.textContent = pendentesCount;
      } else {
        b.style.display = 'none';
      }
    }
  });

  renderAvisoAnaliseDashboard();
}

function renderAvisoAnaliseDashboard() {
  const elAviso = document.getElementById('dash-aviso-analise');
  if (!elAviso) return;

  const hist = obterHistoricoAnalises();
  if (hist.length === 0) {
    elAviso.style.display = 'none';
    return;
  }

  const an = hist[0];
  const resolvidos = an.resolvidos || {};
  const todos = [...(an.alertas || []), ...(an.oportunidades || []), ...(an.acoes || [])];
  const pendentesCount = todos.filter(it => !resolvidos[it.id]).length;

  if (pendentesCount === 0) {
    elAviso.style.display = 'none';
    return;
  }

  const dt = new Date(an.data_analise + 'T00:00:00');
  const diaMes = `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;

  elAviso.style.display = 'flex';
  elAviso.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px">
      <i data-lucide="bell-ring" style="width:15px;height:15px;color:var(--gold,#C9A24B)"></i>
      <span style="color:#FFF"><strong>${pendentesCount} alerta(s) pendente(s)</strong> da análise de ${diaMes}</span>
    </div>
    <span style="color:var(--gold,#C9A24B);font-weight:700;display:flex;align-items:center;gap:4px">
      Ver resultados <i data-lucide="arrow-right" style="width:13px;height:13px"></i>
    </span>
  `;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Inicializador de eventos no DOM
document.addEventListener('DOMContentLoaded', () => {
  atualizarSelosAnaliseDados();
  renderAvisoAnaliseDashboard();
});
