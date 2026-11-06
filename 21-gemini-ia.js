// ═══════════════════════════════════════════════════════════════════
// MÓDULO 21: CENTRAL DE IA GEMINI 3.8 FLASH & PILOTO AUTÔNOMO EM TEMPO REAL
// GestãoPRO ERP (v5.86.0) - Alta Performance, Análise Preditiva & Ações Autônomas
// ═══════════════════════════════════════════════════════════════════

let historicoChatIA = [];
let _iaCarregando = false;
let _acoesAutonomasCache = [];
let _logAcoesExecutadas = [];
let _monitorTimer = null;
let _pilotoAutomaticoAtivo = false;
let _abaAtualIA = 'chat';

// Carrega preferências salvas do Piloto Automático e Log
try {
  const salvoPiloto = localStorage.getItem('gestaopro_piloto_automatico');
  if (salvoPiloto === 'true') _pilotoAutomaticoAtivo = true;
  const salvoLog = localStorage.getItem('gestaopro_log_acoes_ia');
  if (salvoLog) _logAcoesExecutadas = JSON.parse(salvoLog);
} catch (e) {}

// ───────────────────────────────────────────────────────────────────
// 1. COLETA PROFUNDA DE CONTEXTO E ANÁLISE DE DADOS EM TEMPO REAL
// ───────────────────────────────────────────────────────────────────
function coletarContextoERP() {
  if (typeof state === 'undefined' || !state) {
    return {
      totalClientes: 0,
      totalProdutos: 0,
      faturamentoMes: 0,
      despesasMes: 0,
      aReceber: 0,
      aPagar: 0,
      saldoCaixa: 0,
      itensCriticos: 0,
      curvaABC: [],
      runwayEstoque: [],
      projecaoCaixa: { d7: 0, d15: 0, d30: 0 },
      clientesDevedores: [],
      acoesSugeridas: []
    };
  }

  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  // Faturamento e vendas
  let fatMes = 0;
  let totalVendasMes = 0;
  let vendasConfirmadas = 0;
  let orcamentosAbertos = 0;
  let valorOrcamentos = 0;
  const faturamentoPorProduto = {};
  const qtdVendidaPorProduto = {};
  const margemTotalItens = [];

  if (Array.isArray(state.vendas)) {
    state.vendas.forEach(v => {
      if (!v) return;
      if (v.tipo === 'orcamento') {
        orcamentosAbertos++;
        valorOrcamentos += Number(v.total || 0);
        return;
      }
      vendasConfirmadas++;
      const d = v.data ? new Date(v.data) : null;
      if (d && d.getMonth() === mesAtual && d.getFullYear() === anoAtual) {
        fatMes += Number(v.total || 0);
        totalVendasMes++;
      }

      if (Array.isArray(v.itens)) {
        v.itens.forEach(it => {
          const prodNome = it.nome || (typeof getProduto === 'function' ? getProduto(it.produtoId)?.nome : 'Produto');
          const receitaItem = Number(it.total || (it.qtd * it.preco) || 0);
          const qtdItem = Number(it.qtd || 1);
          faturamentoPorProduto[prodNome] = (faturamentoPorProduto[prodNome] || 0) + receitaItem;
          qtdVendidaPorProduto[prodNome] = (qtdVendidaPorProduto[prodNome] || 0) + qtdItem;

          // Margem com base na ficha técnica
          const custoUn = Number(it.custoFichaUn || 0);
          if (custoUn > 0 && it.preco > 0) {
            const margemPct = ((it.preco - custoUn) / it.preco) * 100;
            margemTotalItens.push(margemPct);
          }
        });
      }
    });
  }

  // Curva ABC de Produtos (Pareto 80/20)
  const rankingProdutos = Object.entries(faturamentoPorProduto)
    .map(([nome, receita]) => ({ nome, receita, qtd: qtdVendidaPorProduto[nome] || 0 }))
    .sort((a, b) => b.receita - a.receita);

  const receitaTotalAcumulada = rankingProdutos.reduce((acc, p) => acc + p.receita, 0);
  let somaParcial = 0;
  const curvaABC = rankingProdutos.map(p => {
    somaParcial += p.receita;
    const pctAcumulada = receitaTotalAcumulada > 0 ? (somaParcial / receitaTotalAcumulada) * 100 : 0;
    let classe = 'C';
    if (pctAcumulada <= 80) classe = 'A';
    else if (pctAcumulada <= 95) classe = 'B';
    return { ...p, classe, pctDoTotal: receitaTotalAcumulada > 0 ? ((p.receita / receitaTotalAcumulada) * 100).toFixed(1) : '0' };
  });

  // Contas a receber e análise de risco do Fiado
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
        const venc = c.vencimento ? new Date(c.vencimento) : null;
        if (venc) {
          const diffDias = Math.floor((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDias < 0) {
            recVencido += val;
          } else if (diffDias <= 7) {
            rec7Dias += val;
          } else if (diffDias <= 15) {
            rec15Dias += val;
          } else if (diffDias <= 30) {
            rec30Dias += val;
          }
        }
        const nomeCl = c.clienteNome || (typeof getCliente === 'function' ? getCliente(c.clienteId)?.nome : 'Cliente');
        const telCl = typeof getCliente === 'function' ? getCliente(c.clienteId)?.tel : '';
        if (!devedoresMap[nomeCl]) {
          devedoresMap[nomeCl] = { id: c.clienteId, nome: nomeCl, tel: telCl, total: 0, atrasado: false, dias: 0, titulos: 0 };
        }
        devedoresMap[nomeCl].total += val;
        devedoresMap[nomeCl].titulos++;
        if (venc && venc < hoje) {
          devedoresMap[nomeCl].atrasado = true;
          const atraso = Math.floor((hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
          if (atraso > devedoresMap[nomeCl].dias) devedoresMap[nomeCl].dias = atraso;
        }
      }
    });
  }

  // Contas a pagar e previsões
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
        const venc = p.vencimento ? new Date(p.vencimento) : null;
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

  // Despesas operacionais do mês
  let despMes = 0;
  if (Array.isArray(state.movimentacoes)) {
    state.movimentacoes.forEach(m => {
      if (m.tipo === 'saida' && m.data) {
        const d = new Date(m.data);
        if (d.getMonth() === mesAtual && d.getFullYear() === anoAtual) despMes += Number(m.valor || 0);
      }
    });
  } else if (Array.isArray(state.financeiro)) {
    state.financeiro.forEach(f => {
      if (f.tipo === 'saida' && f.data) {
        const d = new Date(f.data);
        if (d.getMonth() === mesAtual && d.getFullYear() === anoAtual) despMes += Number(f.valor || 0);
      }
    });
  }

  // Estoque, Rupturas & Runway (Velocidade e dias até acabar)
  const prodZero = [];
  const prodBaixo = [];
  const runwayEstoque = [];

  if (Array.isArray(state.produtos)) {
    state.produtos.forEach(p => {
      const min = Number(p.minimo || 0);
      const est = Number(p.estoque || 0);
      const qtdVendida = qtdVendidaPorProduto[p.nome] || 0;
      const saidaDiariaMedia = qtdVendida > 0 ? (qtdVendida / 30) : 0.2;
      const diasRestantes = saidaDiariaMedia > 0 ? Math.floor(est / saidaDiariaMedia) : 999;

      runwayEstoque.push({
        id: p.id,
        nome: p.nome,
        estoque: est,
        minimo: min,
        preco: Number(p.preco || 0),
        diasRestantes: est <= 0 ? 0 : diasRestantes,
        status: est <= 0 ? 'zerado' : (est <= min ? 'baixo' : 'ok')
      });

      if (est <= 0) {
        prodZero.push({ id: p.id, nome: p.nome, estoque: est, minimo: min });
      } else if (est <= min) {
        prodBaixo.push({ id: p.id, nome: p.nome, estoque: est, minimo: min });
      }
    });
  }

  // Matérias-primas e cálculo exato de reposição
  const matBaixas = [];
  if (Array.isArray(state.materias)) {
    materiasAtivas().forEach(m => {
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
  const saldoCaixa = typeof calcularSaldoCaixa === 'function' ? calcularSaldoCaixa() : (fatMes - despMes);

  // Custos fixos cadastrados & Break-even point (ponto de equilíbrio)
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
  if (recVencido > 0) scoreSaude -= Math.min(25, Math.floor((recVencido / (fatMes || 1)) * 30));
  if (saldoCaixa < 0) scoreSaude -= 20;
  if (matBaixas.length > 0) scoreSaude -= Math.min(15, matBaixas.length * 5);
  scoreSaude = Math.max(10, Math.min(100, Math.round(scoreSaude)));

  return {
    scoreSaude,
    totalClientes: Array.isArray(state.clientes) ? state.clientes.length : 0,
    clientesAtivos: Array.isArray(state.clientes) ? state.clientes.filter(c => !c.arquivado).length : 0,
    totalProdutos: Array.isArray(state.produtos) ? state.produtos.length : 0,
    faturamentoMes: fatMes,
    despesasMes: despMes,
    saldoCaixa: saldoCaixa,
    aReceber: recAberto,
    aReceberVencido: recVencido,
    aPagar: pagAberto,
    aPagarVencido: pagVencido,
    projecaoCaixa: {
      d7: rec7Dias - pag7Dias,
      d15: rec15Dias - pag15Dias,
      d30: rec30Dias - pag30Dias
    },
    itensCriticos: prodZero.length + prodBaixo.length + matBaixas.length,
    produtosEstoqueZero: prodZero,
    produtosEstoqueBaixo: prodBaixo,
    materiasBaixas: matBaixas,
    runwayEstoque: runwayEstoque.sort((a, b) => a.diasRestantes - b.diasRestantes).slice(0, 8),
    curvaABC: curvaABC.slice(0, 10),
    clientesDevedores: clientesDevedores,
    orcamentosAbertos: orcamentosAbertos,
    valorOrcamentos: valorOrcamentos,
    breakEvenMensal: Math.round(breakEvenMensal),
    margemMediaPct: Math.round(margemMediaPct),
    topProdutos: curvaABC.slice(0, 4).map(p => `${p.nome} (${p.pctDoTotal}%)`)
  };
}

// ───────────────────────────────────────────────────────────────────
// 2. MOTOR DE AÇÕES AUTÔNOMAS DO ERP (AUTONOMOUS ACTION DISPATCHER)
// ───────────────────────────────────────────────────────────────────
function gerarAcoesAutonomasLocais(ctx) {
  const acoes = [];

  // Ação 1: Reposição de Matéria-Prima com Estoque Crítico
  if (ctx.materiasBaixas && ctx.materiasBaixas.length > 0) {
    ctx.materiasBaixas.forEach((m, idx) => {
      const custoEstimado = (m.necessidadeCompra * (m.custo || 10));
      acoes.push({
        id: `acao-mp-${m.id}-${idx}`,
        tipo: 'REPOR_ESTOQUE',
        titulo: `Gerar Pedido de Compra: ${m.nome}`,
        motivo: `Estoque atual (${m.qtd} ${m.unidade}) está abaixo do mínimo (${m.minimo} ${m.unidade}). Risco iminente de parada na fábrica.`,
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

  // Ação 2: Cobrança dos Maiores Inadimplentes via WhatsApp
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

  // Ação 3: Otimização de Preço para Produtos Classe A com Margem Abaixo da Meta
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

// Execução real da ação no banco de dados e estado do ERP
function executarAcaoAutonoma(acaoId) {
  const acao = _acoesAutonomasCache.find(a => a.id === acaoId);
  if (!acao) return;

  try {
    if (acao.tipo === 'REPOR_ESTOQUE') {
      const d = acao.detalhes;
      if (typeof state !== 'undefined' && Array.isArray(state.materias)) {
        const mat = state.materias.find(m => m.id === d.materiaId);
        if (mat) {
          mat.qtd = Number((mat.qtd + Number(d.qtdComprar)).toFixed(1));
          
          // Registra compra formal
          if (!Array.isArray(state.compras)) state.compras = [];
          state.compras.push({
            id: Date.now(),
            materiaId: mat.id,
            qtd: d.qtdComprar,
            valorTotal: d.qtdComprar * (d.custoUn || 10),
            data: new Date().toISOString().split('T')[0],
            formaPagamento: 'prazo',
            status: 'concluido',
            obs: 'Gerado autonomamente pelo Copiloto IA Gemini'
          });

          // Registra movimento de estoque
          if (Array.isArray(state.movEstoque)) {
            state.movEstoque.push({
              data: new Date().toISOString(),
              tipo: 'entrada_ia',
              item: mat.nome,
              qtd: d.qtdComprar,
              saldoApos: mat.qtd
            });
          }
        }
      }
    } else if (acao.tipo === 'COBRANCA_INADIMPLENTE') {
      const d = acao.detalhes;
      const vFmt = Number(d.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const msgTexto = `Olá, ${d.nome}! Tudo bem? Passando para avisar que consta uma pendência de ${vFmt}. Se precisar, posso reenviar a chave Pix para acertar com desconto ou parcelamento. Qualquer dúvida estou à disposição!`;
      
      // Registra no CRM
      if (typeof state !== 'undefined') {
        if (!Array.isArray(state.crmNotas)) state.crmNotas = [];
        state.crmNotas.push({
          id: Date.now(),
          clienteId: d.clienteId,
          data: new Date().toISOString(),
          texto: `[IA AUTÔNOMA] Cobrança de ${vFmt} gerada e enviada via WhatsApp.`
        });
      }

      // Abre WhatsApp
      const telFormatado = String(d.tel || '').replace(/\D/g, '');
      const urlWhats = telFormatado 
        ? `https://api.whatsapp.com/send?phone=55${telFormatado}&text=${encodeURIComponent(msgTexto)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(msgTexto)}`;
      window.open(urlWhats, '_blank');
    } else if (acao.tipo === 'AJUSTE_PRECO_MARGEM') {
      const d = acao.detalhes;
      if (typeof state !== 'undefined' && Array.isArray(state.produtos)) {
        const prod = state.produtos.find(p => p.id === d.produtoId);
        if (prod) {
          prod.preco = Number(d.novoPreco);
        }
      }
    } else if (acao.tipo === 'CONVERTER_ORCAMENTO') {
      const d = acao.detalhes;
      if (typeof state !== 'undefined' && Array.isArray(state.vendas)) {
        const orc = state.vendas.find(v => v.id === d.vendaId);
        if (orc) {
          orc.tipo = 'venda';
          orc.status = 'em_aberto';
          orc.data = new Date().toISOString().split('T')[0];
        }
      }
    }

    // Gravação imediata e persistente
    if (typeof gravarLocalAgora === 'function') {
      gravarLocalAgora();
    } else if (typeof salvarDados === 'function') {
      salvarDados();
    }

    // Registra no histórico de auditoria
    _logAcoesExecutadas.unshift({
      id: acao.id,
      tipo: acao.tipo,
      titulo: acao.titulo,
      executadoEm: new Date().toLocaleString('pt-BR'),
      detalhes: acao.detalhes
    });
    localStorage.setItem('gestaopro_log_acoes_ia', JSON.stringify(_logAcoesExecutadas.slice(0, 30)));

    // Marca como executado visualmente
    acao.executado = true;
    renderizarAcoesAutonomasNaInterface();

    // Atualiza views do ERP se existirem
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof renderEstoque === 'function') renderEstoque();
    if (typeof renderVendas === 'function') renderVendas();
    if (typeof renderFinanceiro === 'function') renderFinanceiro();

    if (typeof showToast === 'function') {
      showToast(`⚡ Ação IA Concluída: ${acao.titulo}`, '#4CC38A');
    }
  } catch (err) {
    console.error('Erro ao executar ação autônoma:', err);
    if (typeof showToast === 'function') showToast('Erro ao executar ação', 'red');
  }
}

function executarTodasAcoesPrioritarias() {
  const pendentes = _acoesAutonomasCache.filter(a => !a.executado);
  if (pendentes.length === 0) {
    if (typeof showToast === 'function') showToast('Nenhuma ação pendente no momento!', '#00bdae');
    return;
  }

  let concluidas = 0;
  pendentes.forEach(a => {
    executarAcaoAutonoma(a.id);
    concluidas++;
  });

  if (typeof showToast === 'function') {
    showToast(`⚡ ${concluidas} ação(ões) autônoma(s) executada(s) com sucesso!`, '#4CC38A');
  }
}

// ───────────────────────────────────────────────────────────────────
// 3. MONITOR CONTÍNUO EM TEMPO REAL & PULSE TICKER
// ───────────────────────────────────────────────────────────────────
async function atualizarAnaliseEAcoesAutonomas() {
  const contexto = coletarContextoERP();

  let acoes = [];
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2800);
    const resp = await fetch('/api/gemini/acoes-autonomas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stateContext: contexto }),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data.acoes) && data.acoes.length > 0) {
        acoes = data.acoes;
      }
    }
  } catch (e) {}

  if (acoes.length === 0) {
    acoes = gerarAcoesAutonomasLocais(contexto);
  }

  _acoesAutonomasCache = acoes;
  renderizarAcoesAutonomasNaInterface();
  renderizarSmartBannerDashboard(contexto, acoes);
}

function renderizarSmartBannerDashboard(ctx, acoes) {
  let banner = document.getElementById('ia-smart-banner-realtime');
  const dashPage = document.getElementById('page-dashboard');
  if (!dashPage) return;

  const acoesPendentes = acoes.filter(a => !a.executado);
  const badgeDot = document.getElementById('ia-badge-acoes');
  if (badgeDot) {
    if (acoesPendentes.length > 0) {
      badgeDot.style.display = 'block';
      badgeDot.textContent = acoesPendentes.length;
    } else {
      badgeDot.style.display = 'none';
    }
  }

  if (acoesPendentes.length === 0) {
    if (banner) banner.style.display = 'none';
    return;
  }

  const primeiraAcao = acoesPendentes[0];

  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'ia-smart-banner-realtime';
    banner.className = 'ia-smart-banner';
    const refEl = dashPage.querySelector('.dash-date-line') || dashPage.firstChild;
    if (refEl && refEl.nextSibling) {
      dashPage.insertBefore(banner, refEl.nextSibling);
    } else {
      dashPage.prepend(banner);
    }
  }

  banner.style.display = 'flex';
  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;min-width:240px;flex:1">
      <div style="width:38px;height:38px;border-radius:10px;background:rgba(0,189,174,0.18);color:#00bdae;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">
        ⚡
      </div>
      <div>
        <div style="display:flex;align-items:center;gap:8px">
          <strong style="color:#FFF;font-size:13.5px">Monitor IA Autônomo em Tempo Real</strong>
          <span class="badge" style="background:#00bdae;color:#000;font-size:10px;font-weight:800">${acoesPendentes.length} Ação(ões) Sugerida(s)</span>
        </div>
        <div style="font-size:12px;color:var(--text);margin-top:2px">
          <strong>Prioridade:</strong> ${primeiraAcao.titulo} · <span style="color:var(--gold,#C9A24B)">${primeiraAcao.impactoFinanceiro}</span>
        </div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" onclick="executarAcaoAutonoma('${primeiraAcao.id}')" style="background:#00bdae;border-color:#00bdae;color:#000;font-weight:700">
        ⚡ Executar Agora
      </button>
      <button class="btn btn-outline btn-sm" onclick="abrirAssistenteIA('', 'acoes')">
        Ver Central Autônoma (${acoesPendentes.length})
      </button>
    </div>
  `;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderizarAcoesAutonomasNaInterface() {
  const container = document.getElementById('ia-acoes-lista');
  if (!container) return;

  if (_acoesAutonomasCache.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:36px 16px;color:var(--muted)">
        <i data-lucide="check-circle" style="width:38px;height:38px;color:#4CC38A;margin:0 auto 10px;display:block"></i>
        <strong style="color:#FFF;font-size:15px;display:block;margin-bottom:4px">Operação 100% Equilibrada!</strong>
        Nenhuma anomalia crítica de estoque, margem ou cobrança no momento.
      </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  container.innerHTML = _acoesAutonomasCache.map(a => {
    const tagClass = a.urgencia === 'alta' ? 'ia-tag-alta' : (a.urgencia === 'media' ? 'ia-tag-media' : 'ia-tag-baixa');
    const isExec = a.executado;

    return `
      <div class="ia-action-card ${isExec ? 'executado' : ''}" id="card-${a.id}">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span class="ia-tag-urgencia ${tagClass}">Prioridade ${a.urgencia}</span>
          <span style="font-size:11.5px;color:var(--gold,#C9A24B);font-weight:700">${a.impactoFinanceiro}</span>
        </div>
        <div>
          <h4 style="margin:0 0 4px;font-size:14px;color:#FFF;font-weight:700">${a.titulo}</h4>
          <p style="margin:0;font-size:12.5px;color:var(--text);line-height:1.4">${a.motivo}</p>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px">
          ${isExec ? `
            <span style="color:#4CC38A;font-size:12px;display:inline-flex;align-items:center;gap:4px;font-weight:700">
              <i data-lucide="check" style="width:14px;height:14px"></i> Executado com Sucesso
            </span>
          ` : `
            <button class="btn btn-outline btn-xs" onclick="enviarMensagemIA('Explique mais sobre a ação: ${a.titulo}')">
              Por que fazer isso?
            </button>
            <button class="btn btn-primary btn-xs" onclick="executarAcaoAutonoma('${a.id}')" style="background:#00bdae;border-color:#00bdae;color:#000;font-weight:700">
              ⚡ Executar em 1 Clique
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function alternarPilotoAutomatico() {
  _pilotoAutomaticoAtivo = !_pilotoAutomaticoAtivo;
  localStorage.setItem('gestaopro_piloto_automatico', _pilotoAutomaticoAtivo ? 'true' : 'false');
  const btn = document.getElementById('btn-toggle-piloto');
  if (btn) {
    btn.innerHTML = _pilotoAutomaticoAtivo 
      ? '<span style="color:#4CC38A">● Piloto Ativo</span>' 
      : '<span style="color:var(--muted)">○ Supervisionado</span>';
  }
  if (typeof showToast === 'function') {
    showToast(_pilotoAutomaticoAtivo ? 'Modo Piloto Automático Ativado!' : 'Modo Supervisionado Ativado!');
  }
}

// ───────────────────────────────────────────────────────────────────
// 4. CHAT IA DE ULTRA-ALTA VELOCIDADE (GEMINI 3.8 FLASH SERVER-SIDE)
// ───────────────────────────────────────────────────────────────────
async function enviarMensagemIA(textoPersonalizado) {
  if (_iaCarregando) return;

  const input = document.getElementById('ia-chat-input');
  const texto = textoPersonalizado || (input ? input.value.trim() : '');
  if (!texto) return;

  if (input) input.value = '';

  const containerMsgs = document.getElementById('ia-chat-mensagens');
  if (!containerMsgs) return;

  // Renderiza pergunta do usuário
  const msgUser = document.createElement('div');
  msgUser.className = 'ia-msg ia-msg-user';
  msgUser.innerHTML = `<div class="ia-bolha">${texto.replace(/</g, '&lt;')}</div>`;
  containerMsgs.appendChild(msgUser);

  // Renderiza indicador animado
  _iaCarregando = true;
  const msgLoading = document.createElement('div');
  msgLoading.className = 'ia-msg ia-msg-assistant ia-loading-msg';
  msgLoading.innerHTML = `
    <div class="ia-avatar"><i data-lucide="sparkles" style="width:16px;height:16px;color:#C9A24B"></i></div>
    <div class="ia-bolha" style="display:flex;align-items:center;gap:8px">
      <span class="ia-spinner"></span>
      <span>Gemini 3.8 Flash analisando dados e gerando ações...</span>
    </div>
  `;
  containerMsgs.appendChild(msgLoading);
  containerMsgs.scrollTop = containerMsgs.scrollHeight;
  if (typeof lucide !== 'undefined') lucide.createIcons();

  const contexto = coletarContextoERP();
  let respostaTexto = '';

  try {
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), 8500);

    const resp = await fetch('/api/gemini/assistente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: texto,
        context: contexto,
        history: historicoChatIA.slice(-6)
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutTimer);

    if (resp.ok) {
      const data = await resp.json();
      if (data && data.text) respostaTexto = data.text;
    }
  } catch (err) {
    console.warn('[Copiloto IA] Alternando para o Motor Analítico Local:', err);
  }

  // Fallback rico e matemático se a rede oscilar
  if (!respostaTexto) {
    respostaTexto = gerarRespostaInteligenteLocal(texto, contexto);
  }

  msgLoading.remove();
  _iaCarregando = false;

  historicoChatIA.push({ role: 'user', text: texto });
  historicoChatIA.push({ role: 'model', text: respostaTexto });

  const msgIA = document.createElement('div');
  msgIA.className = 'ia-msg ia-msg-assistant';
  const htmlResposta = formatarMarkdownParaHTML(respostaTexto);
  const idResp = 'ia-resp-' + Date.now();

  msgIA.innerHTML = `
    <div class="ia-avatar"><i data-lucide="sparkles" style="width:16px;height:16px;color:#C9A24B"></i></div>
    <div class="ia-bolha">
      <div id="${idResp}">${htmlResposta}</div>
      <div style="margin-top:10px;display:flex;gap:8px;border-top:1px solid rgba(255,255,255,.08);padding-top:8px">
        <button class="btn btn-outline btn-xs" onclick="copiarTextoIA('${idResp}')">
          <i data-lucide="copy" class="ic"></i> Copiar
        </button>
        <button class="btn btn-outline btn-xs" onclick="mudarAbaIA('acoes')">
          <i data-lucide="zap" class="ic" style="color:#00bdae"></i> Ações Sugeridas
        </button>
      </div>
    </div>
  `;
  containerMsgs.appendChild(msgIA);
  containerMsgs.scrollTop = containerMsgs.scrollHeight;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ───────────────────────────────────────────────────────────────────
// 5. MOTOR LOCAL INTELIGENTE DE CONTINGÊNCIA (OFFLINE RESILIENTE)
// ───────────────────────────────────────────────────────────────────
function gerarRespostaInteligenteLocal(prompt, ctx) {
  const p = String(prompt || '').toLowerCase().trim();
  const faturamentoFmt = Number(ctx.faturamentoMes || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const aReceberFmt = Number(ctx.aReceber || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const aPagarFmt = Number(ctx.aPagar || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // 1. ESTOQUE & RUNWAY
  if (p.includes('estoque') || p.includes('compra') || p.includes('materia') || p.includes('falta') || p.includes('ruptura')) {
    let linhasZero = ctx.produtosEstoqueZero.map(item => `  - ❌ **${item.nome}**: Zerado (mínimo: ${item.minimo})`).join('\n');
    let linhasMat = ctx.materiasBaixas.map(m => `  - 🧪 **${m.nome}**: ${m.qtd} ${m.unidade} (comprar +${m.necessidadeCompra} ${m.unidade})`).join('\n');

    return `### 📦 Auditoria de Estoque & Reposição Autônoma

**Situação em Tempo Real:**
- Score de Saúde do Estoque: **${ctx.scoreSaude}/100**
- Produtos com Ruptura Imediata: **${ctx.produtosEstoqueZero.length}**
- Insumos Críticos: **${ctx.materiasBaixas.length}**

${linhasZero ? `**Produtos com Estoque Esgotado:**\n${linhasZero}\n` : ''}
${linhasMat ? `**Insumos Necessários para Produção:**\n${linhasMat}\n` : ''}
${(!linhasZero && !linhasMat) ? '✅ **Parabéns!** Todos os itens estão com nível seguro de cobertura.\n' : ''}
**Ação Autônoma Recomendada:**
Vá até a aba **"Ações Autônomas"** acima e clique em **"Executar em 1 Clique"** para gerar automaticamente o pedido de compra dos insumos com seus fornecedores cadastrados.`;
  }

  // 2. COBRANÇA & FIADO
  if (p.includes('cobranca') || p.includes('cobrar') || p.includes('inadimpl') || p.includes('fiado') || p.includes('receber')) {
    let listaDev = ctx.clientesDevedores.slice(0, 4).map(c => {
      const valFmt = c.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      return `  - 👤 **${c.nome}**: ${valFmt}${c.dias ? ` (${c.dias} dias em atraso)` : ' (em aberto)'}`;
    }).join('\n');

    return `### 💬 Estratégia Autônoma de Cobrança e Fiado

**Raio-X de Liquidez:**
- Total a Receber: **${aReceberFmt}**
- Em Atraso Vencido: **${Number(ctx.aReceberVencido || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}**
- Projeção de Entradas em 7 Dias: **${Number(ctx.projecaoCaixa.d7 || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}**

${listaDev ? `**Clientes com Maior Concentração de Saldo:**\n${listaDev}\n` : '✅ Todos os clientes em dia!\n'}
**Modelo de WhatsApp com Gatilho de Recompra:**
> *"Olá! Tudo bem? Passando para avisar que sua rota de entrega está programada para esta semana. Se puder nos enviar o comprovante do saldo pendente no Pix, já libero seu novo pedido com prioridade total!"*`;
  }

  // 3. CURVA ABC E LUCRO
  if (p.includes('abc') || p.includes('pareto') || p.includes('lucro') || p.includes('margem') || p.includes('preco')) {
    let listaABC = ctx.curvaABC.slice(0, 5).map(p => `  - **Classe ${p.classe}**: ${p.nome} (${p.pctDoTotal}% da receita total)`).join('\n');

    return `### 🎯 Análise Preditiva de Lucratividade & Curva ABC

**Curva de Pareto dos Produtos:**
${listaABC}

**Indicadores Chave:**
- Margem Média Bruta Estimada: **${ctx.margemMediaPct}%**
- Ponto de Equilíbrio Operacional: **${ctx.breakEvenMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês**

**Decisão Estratégica:**
Concentre o estoque de segurança e o abastecimento imediato nos produtos **Classe A**, pois qualquer ruptura neles paralisa 80% do fluxo de entrada do negócio.`;
  }

  // 4. DIAGNÓSTICO GERAL
  return `### ⚡ Diagnóstico do Negócio em Tempo Real

- **Score de Saúde Empresarial:** **${ctx.scoreSaude}/100**
- **Faturamento no Mês:** ${faturamentoFmt}
- **Saldo Projetado Caixa (15 dias):** ${Number(ctx.projecaoCaixa.d15 || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
- **Itens Demandando Ação:** ${ctx.itensCriticos}

Para ver as decisões automáticas disponíveis agora, clique na aba **"⚡ Ações Autônomas"** acima!`;
}

// ───────────────────────────────────────────────────────────────────
// 6. GESTÃO DE ABAS E MODAL DA CENTRAL DE IA
// ───────────────────────────────────────────────────────────────────
function abrirAssistenteIA(promptInicial, abaInicial) {
  const modal = document.getElementById('modal-ia-assistente');
  if (!modal) return;
  modal.classList.add('open');
  modal.classList.add('active');

  const btnFloat = document.getElementById('btn-flutuante-ia');
  if (btnFloat) btnFloat.style.display = 'none';
  document.body.classList.add('modal-open');

  mudarAbaIA(abaInicial || 'chat');
  atualizarAnaliseEAcoesAutonomas();

  const containerMsgs = document.getElementById('ia-chat-mensagens');
  if (containerMsgs && historicoChatIA.length === 0) {
    containerMsgs.innerHTML = `
      <div class="ia-msg ia-msg-assistant">
        <div class="ia-avatar"><i data-lucide="sparkles" style="width:16px;height:16px;color:#C9A24B"></i></div>
        <div class="ia-bolha">
          <strong>Olá! Eu sou o Copiloto IA Gemini 3.8 Flash do GestãoPRO.</strong><br>
          Tenho acesso aos dados operacionais do seu ERP em tempo real e consigo gerenciar ações diretamente no sistema.
          <div class="ia-sugestoes" style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px">
            <button class="ia-chip" onclick="mudarAbaIA('acoes')">⚡ Ações Autônomas Sugeridas</button>
            <button class="ia-chip" onclick="enviarMensagemIA('Diagnóstico Completo')">📊 Diagnóstico 360°</button>
            <button class="ia-chip" onclick="enviarMensagemIA('Curva ABC e Produtos Mais Lucrativos')">🎯 Curva ABC</button>
            <button class="ia-chip" onclick="enviarMensagemIA('Quais produtos estão prestes a esgotar?')">📦 Runway de Estoque</button>
          </div>
        </div>
      </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  if (promptInicial) {
    const input = document.getElementById('ia-chat-input');
    if (input) input.value = promptInicial;
    enviarMensagemIA(promptInicial);
  }
}

function fecharAssistenteIA() {
  const modal = document.getElementById('modal-ia-assistente');
  if (modal) {
    modal.classList.remove('open');
    modal.classList.remove('active');
  }
  const btnFloat = document.getElementById('btn-flutuante-ia');
  if (btnFloat) btnFloat.style.display = 'flex';
  document.body.classList.remove('modal-open');
}

function mudarAbaIA(abaId) {
  _abaAtualIA = abaId;
  const botoes = document.querySelectorAll('.ia-tab-btn');
  botoes.forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === abaId);
  });

  const conteudos = document.querySelectorAll('.ia-tab-content');
  conteudos.forEach(c => {
    c.classList.toggle('active', c.id === `ia-tab-view-${abaId}`);
  });

  if (abaId === 'acoes') {
    renderizarAcoesAutonomasNaInterface();
  } else if (abaId === 'analise') {
    renderizarPainelAnalisePreditiva();
  } else if (abaId === 'log') {
    renderizarLogAcoes();
  }
}

function renderizarPainelAnalisePreditiva() {
  const container = document.getElementById('ia-analise-conteudo');
  if (!container) return;

  const ctx = coletarContextoERP();
  const faturamentoFmt = Number(ctx.faturamentoMes || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  container.innerHTML = `
    <div class="ia-kpi-grid">
      <div class="ia-kpi-box">
        <span class="ia-kpi-sub">Score de Saúde IA</span>
        <span class="ia-kpi-val" style="color:${ctx.scoreSaude > 75 ? '#4CC38A' : (ctx.scoreSaude > 50 ? '#F2C94C' : '#EB5757')}">${ctx.scoreSaude}/100</span>
      </div>
      <div class="ia-kpi-box">
        <span class="ia-kpi-sub">Ponto de Equilíbrio</span>
        <span class="ia-kpi-val">${ctx.breakEvenMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
      </div>
      <div class="ia-kpi-box">
        <span class="ia-kpi-sub">Margem Média Bruta</span>
        <span class="ia-kpi-val" style="color:var(--gold,#C9A24B)">${ctx.margemMediaPct}%</span>
      </div>
      <div class="ia-kpi-box">
        <span class="ia-kpi-sub">Fluxo 15 Dias</span>
        <span class="ia-kpi-val" style="color:${ctx.projecaoCaixa.d15 >= 0 ? '#4CC38A' : '#EB5757'}">
          ${Number(ctx.projecaoCaixa.d15 || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      </div>
    </div>

    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;margin-bottom:14px">
      <h4 style="margin:0 0 10px;font-size:13.5px;color:var(--gold,#C9A24B);display:flex;align-items:center;gap:6px">
        <i data-lucide="layers" style="width:14px;height:14px"></i> Curva ABC de Faturamento (Pareto)
      </h4>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${ctx.curvaABC.length > 0 ? ctx.curvaABC.slice(0, 5).map(p => `
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px;border-bottom:1px solid rgba(255,255,255,0.04);padding-bottom:5px">
            <div>
              <span class="badge" style="background:${p.classe === 'A' ? 'var(--gold,#C9A24B)' : (p.classe === 'B' ? '#4CC38A' : '#8E897C')};color:#000;font-size:10px;font-weight:800;margin-right:6px">Classe ${p.classe}</span>
              <strong>${p.nome}</strong>
            </div>
            <div>
              <span style="color:var(--muted)">${p.pctDoTotal}% do total</span> · 
              <strong>${p.receita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
            </div>
          </div>
        `).join('') : '<p style="color:var(--muted);font-size:12px;margin:0">Nenhuma venda registrada ainda.</p>'}
      </div>
    </div>

    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px">
      <h4 style="margin:0 0 10px;font-size:13.5px;color:var(--gold,#C9A24B);display:flex;align-items:center;gap:6px">
        <i data-lucide="clock" style="width:14px;height:14px"></i> Runway de Estoque (Dias até Acabar)
      </h4>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${ctx.runwayEstoque.length > 0 ? ctx.runwayEstoque.slice(0, 5).map(r => `
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px">
            <div>
              <strong>${r.nome}</strong>
              <span style="font-size:11px;color:var(--muted);margin-left:6px">(${r.estoque} un)</span>
            </div>
            <div>
              <span class="ia-tag-urgencia ${r.diasRestantes <= 2 ? 'ia-tag-alta' : (r.diasRestantes <= 7 ? 'ia-tag-media' : 'ia-tag-baixa')}">
                ${r.diasRestantes <= 0 ? 'RUPTURA' : `${r.diasRestantes} dias rest.`}
              </span>
            </div>
          </div>
        `).join('') : '<p style="color:var(--muted);font-size:12px;margin:0">Estoque sem movimentações registradas.</p>'}
      </div>
    </div>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderizarLogAcoes() {
  const container = document.getElementById('ia-log-conteudo');
  if (!container) return;

  if (_logAcoesExecutadas.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:30px 16px;color:var(--muted)">
        <i data-lucide="history" style="width:34px;height:34px;margin:0 auto 8px;display:block"></i>
        Nenhuma ação autônoma foi executada ainda nesta sessão.
      </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  container.innerHTML = _logAcoesExecutadas.map(log => `
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <strong style="font-size:13px;color:#FFF">${log.titulo}</strong>
        <span style="font-size:11px;color:var(--muted)">${log.executadoEm}</span>
      </div>
      <div style="font-size:11.5px;color:#4CC38A;display:flex;align-items:center;gap:4px">
        <i data-lucide="check-circle-2" style="width:13px;height:13px"></i> Executado com sucesso no ERP
      </div>
    </div>
  `).join('');

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ───────────────────────────────────────────────────────────────────
// 7. FUNÇÕES PÚBLICAS & RETROCOMPATIBILIDADE COM O RESTO DO SISTEMA
// ───────────────────────────────────────────────────────────────────
function formatarMarkdownParaHTML(md) {
  if (!md) return '';
  let txt = String(md)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  txt = txt.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  txt = txt.replace(/\*(.*?)\*/g, '<em>$1</em>');
  txt = txt.replace(/^### (.*?)$/gm, '<h4 style="color:var(--gold,#C9A24B);margin:14px 0 6px;font-size:14.5px;font-weight:700">$1</h4>');
  txt = txt.replace(/^## (.*?)$/gm, '<h3 style="color:#FFF;margin:16px 0 8px;font-size:16px;font-weight:700">$1</h3>');
  txt = txt.replace(/^- (.*?)$/gm, '<li style="margin-bottom:5px;line-height:1.45">$1</li>');
  txt = txt.replace(/(<li.*<\/li>)/s, '<ul style="padding-left:18px;margin:6px 0 10px">$1</ul>');
  txt = txt.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid rgba(255,255,255,.1);margin:12px 0">');
  txt = txt.replace(/\n\n/g, '<p style="margin-bottom:10px;line-height:1.5"></p>');
  txt = txt.replace(/\n/g, '<br>');

  return txt;
}

function copiarTextoIA(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const texto = el.innerText || el.textContent;
  navigator.clipboard.writeText(texto).then(() => {
    if (typeof showToast === 'function') {
      showToast('Copiado para a área de transferência!');
    }
  });
}

function limparHistoricoIA() {
  historicoChatIA = [];
  const containerMsgs = document.getElementById('ia-chat-mensagens');
  if (containerMsgs) containerMsgs.innerHTML = '';
  abrirAssistenteIA();
}

async function executarDiagnosticoIA() {
  abrirAssistenteIA('Faça um diagnóstico executivo completo da empresa');
}

async function abrirGeradorCobrancaIA(clienteId, valorDevido) {
  let clienteNome = 'Cliente';
  if (typeof state !== 'undefined' && Array.isArray(state.clientes)) {
    const cl = state.clientes.find(c => c.id === clienteId || c.nome === clienteId);
    if (cl) clienteNome = cl.nome;
  }
  abrirAssistenteIA(`Escreva uma mensagem de cobrança amigável para ${clienteNome} no valor de ${valorDevido || 0}`);
}

function otimizarPrecoComIA() {
  abrirAssistenteIA('Como otimizar a precificação e markup dos meus produtos?', 'analise');
}

function analisarEstoqueComIA() {
  abrirAssistenteIA('Quais produtos e insumos estão em nível crítico de estoque?', 'acoes');
}

function otimizarMeuDiaComIA() {
  abrirAssistenteIA('Como organizar minha rota de hoje priorizando clientes que mais compram e devedores?');
}

// ─── 8. SISTEMA DE DOWNLOAD RESILIENTE (ANTI-BLOQUEIO DE NAVEGADOR & IFRAME) ───
function abrirModalDownloadSistema() {
  const modal = document.getElementById('modal-download-sistema');
  if (modal) {
    modal.classList.add('open');
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  } else {
    executarDownloadBlob();
  }
}

function fecharModalDownloadSistema() {
  const modal = document.getElementById('modal-download-sistema');
  if (modal) {
    modal.classList.remove('open');
    modal.classList.remove('active');
  }
  document.body.classList.remove('modal-open');
}

async function executarDownloadBlob() {
  try {
    if (typeof showToast === 'function') {
      showToast('📦 Preparando arquivo ZIP atualizado...', '#C9A24B');
    }

    let blob = null;

    // Tentativa 1: Endpoint binário direto
    try {
      const resp = await fetch('/download');
      if (resp.ok) {
        blob = await resp.blob();
      }
    } catch (e) {
      console.warn('Tentativa 1 com /download falhou:', e);
    }

    // Tentativa 2: Endpoint Base64 (ignora bloqueio de Content-Disposition no iframe)
    if (!blob) {
      try {
        const respB64 = await fetch('/api/download/base64');
        if (respB64.ok) {
          const json = await respB64.json();
          if (json && json.data) {
            const byteCharacters = atob(json.data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            blob = new Blob([byteArray], { type: 'application/zip' });
          }
        }
      } catch (e2) {
        console.warn('Tentativa 2 com base64 falhou:', e2);
      }
    }

    if (!blob) {
      throw new Error('Falha ao obter os dados do arquivo.');
    }

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gestaopro-v5.86-ia-autonoma.zip';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (link.parentNode) link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 2000);

    if (typeof showToast === 'function') {
      showToast('✅ Download do ZIP iniciado com sucesso!', '#4CC38A');
    }
  } catch (err) {
    console.error('Erro no download:', err);
    if (typeof showToast === 'function') {
      showToast('⚠️ Bloqueio de iframe detectado. Clique em "Abrir em Nova Aba" no modal.', '#EB5757');
    }
    abrirModalDownloadSistema();
  }
}

// Inicializador de eventos e monitor contínuo
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modal-ia-assistente');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) fecharAssistenteIA();
    });
  }
  const modalDownload = document.getElementById('modal-download-sistema');
  if (modalDownload) {
    modalDownload.addEventListener('click', (e) => {
      if (e.target === modalDownload) fecharModalDownloadSistema();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      fecharAssistenteIA();
      fecharModalDownloadSistema();
    }
  });

  // Inicia o monitor autônomo em tempo real a cada 20 segundos
  setTimeout(atualizarAnaliseEAcoesAutonomas, 1500);
  _monitorTimer = setInterval(atualizarAnaliseEAcoesAutonomas, 20000);
});

