// ═══════════════════════════════════════════════════════════════════
// MÓDULO 21: INTELIGÊNCIA ARTIFICIAL GEMINI PARA GESTÃOPRO (v5.82)
// Suporte Dual: Servidor Gemini API + Motor Local Inteligente (Offline/GitHub Pages)
// ═══════════════════════════════════════════════════════════════════

let historicoChatIA = [];
let _iaCarregando = false;

// Extrai um resumo estruturado dos dados reais do ERP em memória
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
      produtosEstoqueZero: [],
      produtosEstoqueBaixo: [],
      materiasBaixas: [],
      clientesDevedores: []
    };
  }

  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  // Faturamento do mês
  let fatMes = 0;
  if (Array.isArray(state.vendas)) {
    state.vendas.forEach(v => {
      if (!v || !v.data || v.tipo === 'orcamento') return;
      const d = new Date(v.data);
      if (d.getMonth() === mesAtual && d.getFullYear() === anoAtual) {
        fatMes += Number(v.total || 0);
      }
    });
  }

  // Contas a receber e clientes devedores
  let recAberto = 0;
  let recVencido = 0;
  let totalInadimplente = 0;
  let titulosVencidos = 0;
  const devedoresMap = {};

  if (Array.isArray(state.contasReceber)) {
    state.contasReceber.forEach(c => {
      if (!c.pago) {
        const val = Number(c.valor || 0);
        recAberto += val;
        const venc = c.vencimento ? new Date(c.vencimento) : null;
        const atrasado = venc && venc < hoje;
        if (atrasado) {
          recVencido += val;
          totalInadimplente += val;
          titulosVencidos++;
        }
        const nomeCl = c.clienteNome || (typeof getCliente === 'function' ? getCliente(c.clienteId)?.nome : 'Cliente');
        if (!devedoresMap[nomeCl]) {
          devedoresMap[nomeCl] = { nome: nomeCl, total: 0, atrasado: false, dias: 0 };
        }
        devedoresMap[nomeCl].total += val;
        if (atrasado) {
          devedoresMap[nomeCl].atrasado = true;
          const diffDias = Math.floor((hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDias > devedoresMap[nomeCl].dias) devedoresMap[nomeCl].dias = diffDias;
        }
      }
    });
  }

  const clientesDevedores = Object.values(devedoresMap).sort((a, b) => b.total - a.total);

  // Contas a pagar
  let pagAberto = 0;
  if (Array.isArray(state.contasPagar)) {
    state.contasPagar.forEach(p => {
      if (!p.pago) pagAberto += Number(p.valor || 0);
    });
  }

  // Despesas do mês
  let despMes = 0;
  if (Array.isArray(state.movimentacoes)) {
    state.movimentacoes.forEach(m => {
      if (m.tipo === 'saida' && m.data) {
        const d = new Date(m.data);
        if (d.getMonth() === mesAtual && d.getFullYear() === anoAtual) {
          despMes += Number(m.valor || 0);
        }
      }
    });
  } else if (Array.isArray(state.financeiro)) {
    state.financeiro.forEach(f => {
      if (f.tipo === 'saida' && f.data) {
        const d = new Date(f.data);
        if (d.getMonth() === mesAtual && d.getFullYear() === anoAtual) {
          despMes += Number(f.valor || 0);
        }
      }
    });
  }

  // Estoque crítico e itens em falta
  const prodZero = [];
  const prodBaixo = [];
  if (Array.isArray(state.produtos)) {
    state.produtos.forEach(p => {
      const min = Number(p.minimo || 0);
      const est = Number(p.estoque || 0);
      if (est <= 0) {
        prodZero.push({ nome: p.nome, estoque: est, minimo: min });
      } else if (est <= min) {
        prodBaixo.push({ nome: p.nome, estoque: est, minimo: min });
      }
    });
  }

  // Matérias-primas
  const matBaixas = [];
  if (Array.isArray(state.materias)) {
    state.materias.forEach(m => {
      const min = Number(m.minimo || 0);
      const qtd = Number(m.qtd || 0);
      if (qtd <= min) {
        matBaixas.push({ nome: m.nome, qtd: qtd, unidade: m.unidade || 'un', minimo: min });
      }
    });
  }

  // Top produtos mais vendidos
  const contagemProd = {};
  if (Array.isArray(state.vendas)) {
    state.vendas.forEach(v => {
      if (Array.isArray(v.itens)) {
        v.itens.forEach(it => {
          const nome = it.nome || 'Produto';
          contagemProd[nome] = (contagemProd[nome] || 0) + Number(it.qtd || 1);
        });
      }
    });
  }
  const topProdutos = Object.entries(contagemProd)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(p => `${p[0]} (${p[1]} un)`);

  const saldoCaixa = typeof calcularSaldoCaixa === 'function' ? calcularSaldoCaixa() : (fatMes - despMes);

  return {
    totalClientes: Array.isArray(state.clientes) ? state.clientes.length : 0,
    clientesAtivos: Array.isArray(state.clientes) ? state.clientes.filter(c => !c.arquivado).length : 0,
    totalProdutos: Array.isArray(state.produtos) ? state.produtos.length : 0,
    itensEstoqueBaixo: prodBaixo.length + prodZero.length,
    itensCriticos: prodBaixo.length + prodZero.length,
    produtosEstoqueZero: prodZero,
    produtosEstoqueBaixo: prodBaixo,
    materiasBaixas: matBaixas,
    faturamentoMes: fatMes,
    despesasMes: despMes,
    saldoCaixa: saldoCaixa,
    aReceber: recAberto,
    aReceberVencido: recVencido,
    aPagar: pagAberto,
    totalInadimplente: totalInadimplente,
    titulosVencidos: titulosVencidos,
    clientesDevedores: clientesDevedores,
    topProdutos: topProdutos
  };
}

// ─── MOTOR DE INTELIGÊNCIA LOCAL DE CONTINGÊNCIA (OFFLINE & GITHUB PAGES) ───
// Analisa perguntas com cálculos matemáticos e regras de gestão diretamente dos dados do ERP
function gerarRespostaInteligenteLocal(prompt, ctx) {
  const p = String(prompt || '').toLowerCase().trim();
  const faturamentoFmt = Number(ctx.faturamentoMes || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const aReceberFmt = Number(ctx.aReceber || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const aPagarFmt = Number(ctx.aPagar || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // 1. Perguntas sobre ESTOQUE ou COMPRAS
  if (p.includes('estoque') || p.includes('compra') || p.includes('materia') || p.includes('insumo') || p.includes('falta')) {
    let linhasZero = '';
    if (ctx.produtosEstoqueZero && ctx.produtosEstoqueZero.length > 0) {
      linhasZero = ctx.produtosEstoqueZero.map(item => `  - ❌ **${item.nome}**: Zerado (mínimo: ${item.minimo})`).join('\n');
    }

    let linhasBaixo = '';
    if (ctx.produtosEstoqueBaixo && ctx.produtosEstoqueBaixo.length > 0) {
      linhasBaixo = ctx.produtosEstoqueBaixo.map(item => `  - ⚠️ **${item.nome}**: ${item.estoque} un (mínimo: ${item.minimo})`).join('\n');
    }

    let linhasMat = '';
    if (ctx.materiasBaixas && ctx.materiasBaixas.length > 0) {
      linhasMat = ctx.materiasBaixas.map(m => `  - 🧪 **${m.nome}**: ${m.qtd} ${m.unidade} (alerta: ${m.minimo})`).join('\n');
    }

    return `### 📦 Raio-X de Estoque & Compras (GestãoPRO)

**Situação Geral da Produção & Linha:**
- Total de Produtos Cadastrados: **${ctx.totalProdutos}**
- Itens em Nível Crítico ou Zerados: **${ctx.itensEstoqueBaixo}**

${linhasZero ? `**Produtos com Estoque Esgotado:**\n${linhasZero}\n` : ''}
${linhasBaixo ? `**Produtos Próximos do Mínimo:**\n${linhasBaixo}\n` : ''}
${linhasMat ? `**Insumos e Matérias-Primas para Reposição:**\n${linhasMat}\n` : ''}
${(!linhasZero && !linhasBaixo && !linhasMat) ? '✅ **Parabéns!** Todos os seus produtos e matérias-primas estão acima do estoque mínimo de segurança.\n' : ''}
**Recomendações Práticas do Copiloto:**
1. **Prioridade de Fabricação:** Comece pelos produtos com estoque zerado que têm histórico de saída nas rotas da semana.
2. **Cotação em Lote:** Ao cotar com fornecedores, agrupe as compras para atingir o pedido mínimo com frete grátis (CIF).
3. **Prazos:** Priorize prazos de boleto em 28 a 35 dias para cobrir o ciclo financeiro das vendas a prazo.`;
  }

  // 2. Perguntas sobre COBRANÇA, INADIMPLÊNCIA, FIADO OU CLIENTES
  if (p.includes('cobranca') || p.includes('cobrar') || p.includes('inadimpl') || p.includes('fiado') || p.includes('receber') || p.includes('devedor')) {
    let listaDev = '';
    if (ctx.clientesDevedores && ctx.clientesDevedores.length > 0) {
      listaDev = ctx.clientesDevedores.slice(0, 4).map(c => {
        const valFmt = Number(c.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        return `  - 👤 **${c.nome}**: ${valFmt}${c.dias ? ` (${c.dias} dias em atraso)` : ' (em aberto)'}`;
      }).join('\n');
    }

    return `### 💬 Estratégia de Cobrança & Gestão de Fiado (GestãoPRO)

**Panorama Atual:**
- Total a Receber: **${aReceberFmt}**
- Títulos em Atraso: **${ctx.titulosVencidos} pendência(s)**

${listaDev ? `**Clientes com Saldo em Aberto:**\n${listaDev}\n` : '✅ Todos os clientes estão rigorosamente em dia!\n'}
**Modelo de WhatsApp Sugerido (Amigável & Eficaz):**
> *"Olá! Tudo bem? Passando apenas para alinhar seu pedido da semana e verificar se precisa que eu reenvie a chave Pix para acertar o saldo pendente. Qualquer dúvida estou à disposição!"*

**Dicas para Acelerar Entradas de Caixa:**
1. Faça os disparos de cobrança sempre no início da manhã (entre 08h e 10h), quando a liquidez Pix é maior.
2. Se o cliente pedir novo lote, ofereça despacho imediato mediante quitação do título anterior.`;
  }

  // 3. Perguntas sobre PREÇO, MARGEM, CUSTO OU MARKUP
  if (p.includes('preco') || p.includes('precificacao') || p.includes('margem') || p.includes('lucro') || p.includes('markup') || p.includes('calculo')) {
    return `### 🎯 Otimizador de Margem & Precificação (GestãoPRO)

**Metodologia Recomendada: Markup Divisor**
\`Preço = Custo Direto / [1 - (Despesas Fixas % + Margem Alvo %)]\`

**Exemplo Prático:**
- Se o custo de insumos é **R$ 10,00**
- Se suas despesas fixas estimadas são **15%**
- Se você quer **35%** de margem líquida:
\`Preço = 10,00 / (1 - 0,50) = R$ 20,00\` (Markup multiplicador de **2.0x**)

**Estratégias de Venda:**
1. **Preço por Volume (Atacado):** Para compras acima de 12 ou 24 unidades, trabalhe com markup de 1.7x a 1.8x.
2. **Varejo / Fracionado:** Mantenha markup entre 2.2x e 2.6x para absorver custos operacionais e embalagens.
3. Utilize a aba **Fábrica > Precificação** no menu para simular novos produtos.`;
  }

  // 4. DIAGNÓSTICO DO MÊS / SAÚDE DA EMPRESA
  if (p.includes('diagnostico') || p.includes('mes') || p.includes('saude') || p.includes('geral') || p.includes('desempenho')) {
    const lucroEstimado = (ctx.faturamentoMes - ctx.despesasMes);
    const lucroFmt = lucroEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const margemPct = ctx.faturamentoMes > 0 ? ((lucroEstimado / ctx.faturamentoMes) * 100).toFixed(1) + '%' : '0%';

    return `### 📊 Diagnóstico Executivo da Empresa (GestãoPRO)

**1. Desempenho Financeiro:**
- Faturamento do Mês: **${faturamentoFmt}**
- Despesas Operacionais: **${Number(ctx.despesasMes || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}**
- Resultado Estimado: **${lucroFmt}** (Margem: **${margemPct}**)

**2. Posição de Liquidez:**
- A Receber em Aberto: **${aReceberFmt}**
- A Pagar: **${aPagarFmt}**
- Saldo em Caixa/Bancos: **${Number(ctx.saldoCaixa || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}**

**3. Plano de Ação para os Próximos 7 Dias:**
1. **Recuperação de Recebíveis:** Priorize o contato com os ${ctx.clientesDevedores.length || 0} clientes devedores.
2. **Reposição Inteligente:** Há ${ctx.itensEstoqueBaixo} produtos ou insumos demandando produção ou cotação de compra.
3. **Produtos Estrela:** Reforce a oferta dos itens mais vendidos: *${ctx.topProdutos.join(', ') || 'Produtos de linha'}*.`;
  }

  // 5. RESPOSTA PADRÃO CONTEXTUALIZADA
  return `### 💡 Copiloto de GestãoPRO à Disposição!

Analisei sua solicitação (*"${prompt}"*) considerando a operação da sua empresa:

- **Clientes Ativos:** ${ctx.clientesAtivos} de ${ctx.totalClientes} cadastrados
- **Faturamento no Mês:** ${faturamentoFmt}
- **Contas a Receber:** ${aReceberFmt}
- **Estoque em Alerta:** ${ctx.itensEstoqueBaixo} produto(s)

**Como posso te ajudar agora?**
- Digite **"Estoque"** para ver a lista de itens críticos e sugestão de produção.
- Digite **"Cobrança"** para gerar modelos de mensagens para clientes em atraso.
- Digite **"Preço"** para simular markup e margem de contribuição.
- Digite **"Diagnóstico"** para um relatório financeiro completo do mês.`;
}

// Formata texto markdown simples para HTML seguro
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

// ─── ABERTURA E CONTROLE DO MODAL DE ASSISTENTE IA ───
function abrirAssistenteIA(promptInicial) {
  const modal = document.getElementById('modal-ia-assistente');
  if (!modal) return;
  modal.classList.add('open');
  modal.classList.add('active');

  // Esconde o botão flutuante para nunca sobrepor o input de texto no mobile
  const btnFloat = document.getElementById('btn-flutuante-ia');
  if (btnFloat) btnFloat.style.display = 'none';
  document.body.classList.add('modal-open');

  const containerMsgs = document.getElementById('ia-chat-mensagens');
  if (containerMsgs && historicoChatIA.length === 0) {
    containerMsgs.innerHTML = `
      <div class="ia-msg ia-msg-assistant">
        <div class="ia-avatar"><i data-lucide="sparkles" style="width:16px;height:16px;color:#C9A24B"></i></div>
        <div class="ia-bolha">
          <strong>Olá! Eu sou o Copiloto IA do GestãoPRO (Gemini).</strong><br>
          Tenho acesso aos dados operacionais do seu ERP em tempo real. Como posso te apoiar agora?
          <div class="ia-sugestoes" style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px">
            <button class="ia-chip" onclick="enviarMensagemIA('Diagnóstico do Mês')">📊 Diagnóstico do Mês</button>
            <button class="ia-chip" onclick="enviarMensagemIA('Estoque')">📦 Alerta de Estoque</button>
            <button class="ia-chip" onclick="enviarMensagemIA('Cobrança')">💬 Mensagem de Cobrança</button>
            <button class="ia-chip" onclick="enviarMensagemIA('Preço')">🚀 Ideias de Lucro & Preço</button>
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
  } else {
    setTimeout(() => {
      const input = document.getElementById('ia-chat-input');
      if (input) input.focus();
    }, 200);
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

// Envia mensagem no chat da IA
async function enviarMensagemIA(textoPersonalizado) {
  if (_iaCarregando) return;

  const input = document.getElementById('ia-chat-input');
  const texto = textoPersonalizado || (input ? input.value.trim() : '');
  if (!texto) return;

  if (input) input.value = '';

  const containerMsgs = document.getElementById('ia-chat-mensagens');
  if (!containerMsgs) return;

  // Renderiza mensagem do usuário
  const msgUser = document.createElement('div');
  msgUser.className = 'ia-msg ia-msg-user';
  msgUser.innerHTML = `
    <div class="ia-bolha">${texto.replace(/</g, '&lt;')}</div>
  `;
  containerMsgs.appendChild(msgUser);

  // Renderiza indicador de carregamento
  _iaCarregando = true;
  const msgLoading = document.createElement('div');
  msgLoading.className = 'ia-msg ia-msg-assistant ia-loading-msg';
  msgLoading.innerHTML = `
    <div class="ia-avatar"><i data-lucide="sparkles" style="width:16px;height:16px;color:#C9A24B"></i></div>
    <div class="ia-bolha" style="display:flex;align-items:center;gap:8px">
      <span class="ia-spinner"></span>
      <span>Gemini analisando seus dados de gestão...</span>
    </div>
  `;
  containerMsgs.appendChild(msgLoading);
  containerMsgs.scrollTop = containerMsgs.scrollHeight;
  if (typeof lucide !== 'undefined') lucide.createIcons();

  const contexto = coletarContextoERP();
  let respostaTexto = '';

  // 1. Tenta consulta ao servidor Gemini com timeout curto (3.5 segundos)
  try {
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), 3500);

    const resp = await fetch('/api/gemini/assistente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: texto,
        context: contexto,
        history: historicoChatIA
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutTimer);

    if (resp.ok) {
      const data = await resp.json();
      if (data && data.text) {
        respostaTexto = data.text;
      }
    }
  } catch (err) {
    // Modo offline ou GitHub Pages: continua para o gerador inteligente local
  }

  // 2. Se o servidor estiver indisponível ou em ambiente estático (GitHub Pages),
  // executa o motor inteligente local sem NUNCA exibir erro na tela!
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
        <button class="btn btn-outline btn-xs" onclick="copiarTextoIA('${idResp}')" title="Copiar texto da resposta">
          <i data-lucide="copy" class="ic"></i> Copiar
        </button>
      </div>
    </div>
  `;
  containerMsgs.appendChild(msgIA);
  containerMsgs.scrollTop = containerMsgs.scrollHeight;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function copiarTextoIA(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const texto = el.innerText || el.textContent;
  navigator.clipboard.writeText(texto).then(() => {
    if (typeof showToast === 'function') {
      showToast('Copiado para a área de transferência!');
    } else {
      alert('Texto copiado com sucesso!');
    }
  });
}

function limparHistoricoIA() {
  historicoChatIA = [];
  const containerMsgs = document.getElementById('ia-chat-mensagens');
  if (containerMsgs) {
    containerMsgs.innerHTML = '';
  }
  abrirAssistenteIA();
}

// ─── 2. DIAGNÓSTICO EXECUTIVO COMPLETO ───
async function executarDiagnosticoIA() {
  const modal = document.getElementById('modal-ia-diagnostico');
  if (!modal) {
    abrirAssistenteIA('Diagnóstico do Mês');
    return;
  }
  modal.classList.add('open');
  modal.classList.add('active');

  const corpo = document.getElementById('ia-diagnostico-corpo');
  if (corpo) {
    corpo.innerHTML = `
      <div style="text-align:center;padding:30px 20px">
        <div class="ia-spinner" style="width:36px;height:36px;border-width:3px;margin:0 auto 16px"></div>
        <h4 style="margin-bottom:6px">Analisando Inteligência de Negócio...</h4>
        <p style="font-size:13px;color:var(--muted)">Cruzando vendas, inadimplência, despesas e estoque.</p>
      </div>
    `;
  }

  const contexto = coletarContextoERP();
  let textoResultado = '';

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('/api/gemini/diagnostico', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumo: contexto }),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data && data.text) textoResultado = data.text;
    }
  } catch (err) {}

  if (!textoResultado) {
    textoResultado = gerarRespostaInteligenteLocal('diagnostico', contexto);
  }

  if (corpo) {
    corpo.innerHTML = `
      <div style="background:rgba(201,162,75,.08);border:1px solid rgba(201,162,75,.25);border-radius:12px;padding:16px;margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <span style="font-size:12px;text-transform:uppercase;color:var(--gold,#C9A24B);font-weight:700;letter-spacing:.8px">Diagnóstico em Tempo Real</span>
          <span class="badge" style="background:#4CC38A;color:#000;font-weight:700">GestãoPRO Inteligente</span>
        </div>
        <div id="diagnostico-conteudo">${formatarMarkdownParaHTML(textoResultado)}</div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn btn-outline" onclick="copiarTextoIA('diagnostico-conteudo')"><i data-lucide="copy" class="ic"></i> Copiar Relatório</button>
        <button class="btn btn-primary" onclick="closeModal('modal-ia-diagnostico');abrirAssistenteIA('Com base no diagnóstico executivo, qual o primeiro passo que devo tomar hoje?')"><i data-lucide="sparkles" class="ic"></i> Tirar Dúvidas com Copiloto</button>
      </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

// ─── 3. GERADOR DE MENSAGENS DE COBRANÇA INTELIGENTE ───
async function abrirGeradorCobrancaIA(clienteId, valorDevido) {
  let clienteNome = 'Cliente';
  if (typeof state !== 'undefined' && Array.isArray(state.clientes)) {
    const cl = state.clientes.find(c => c.id === clienteId || c.nome === clienteId);
    if (cl) clienteNome = cl.nome;
  }

  const modal = document.getElementById('modal-ia-cobranca');
  if (!modal) {
    abrirAssistenteIA(`Escreva uma mensagem de cobrança amigável para ${clienteNome}`);
    return;
  }
  modal.classList.add('open');
  modal.classList.add('active');

  const corpo = document.getElementById('ia-cobranca-corpo');
  const vFmt = Number(valorDevido || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (corpo) {
    corpo.innerHTML = `
      <div style="background:var(--card);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:14px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <strong style="color:var(--gold,#C9A24B);font-size:13px"><i data-lucide="message-square" style="width:14px;height:14px;display:inline"></i> Opção 1: Lembrete Cordial (WhatsApp)</strong>
          <span class="badge" style="font-size:10.5px">Amigável</span>
        </div>
        <p id="msg-cob-1" style="font-size:13px;line-height:1.45;color:var(--text);margin-bottom:10px">Olá, ${clienteNome}! Tudo bem? Passando apenas para avisar que consta uma pendência de ${vFmt}. Se precisar, posso reenviar a chave Pix para facilitar o acerto. Qualquer dúvida estou à disposição!</p>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline btn-xs" onclick="copiarTextoIA('msg-cob-1')"><i data-lucide="copy" class="ic"></i> Copiar</button>
          <button class="btn btn-primary btn-xs" onclick="abrirWhatsAppCobranca(encodeURIComponent(document.getElementById('msg-cob-1').innerText))"><i data-lucide="send" class="ic"></i> Abrir WhatsApp</button>
        </div>
      </div>

      <div style="background:var(--card);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:14px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <strong style="color:var(--gold,#C9A24B);font-size:13px"><i data-lucide="message-square" style="width:14px;height:14px;display:inline"></i> Opção 2: Comercial & Novo Pedido</strong>
          <span class="badge" style="font-size:10.5px">Recompra</span>
        </div>
        <p id="msg-cob-2" style="font-size:13px;line-height:1.45;color:var(--text);margin-bottom:10px">Olá, ${clienteNome}! Estamos organizando a rota de entregas da semana. Temos o saldo de ${vFmt} em aberto. Se acertarmos esse valor no Pix, já reservo e despacho seu novo pedido junto na rota com prioridade. O que acha?</p>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline btn-xs" onclick="copiarTextoIA('msg-cob-2')"><i data-lucide="copy" class="ic"></i> Copiar</button>
          <button class="btn btn-primary btn-xs" onclick="abrirWhatsAppCobranca(encodeURIComponent(document.getElementById('msg-cob-2').innerText))"><i data-lucide="send" class="ic"></i> Abrir WhatsApp</button>
        </div>
      </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

function abrirWhatsAppCobranca(textoCodificado) {
  window.open(`https://api.whatsapp.com/send?text=${textoCodificado}`, '_blank');
}

// ─── 4. OTIMIZADOR DE PREÇO E MARGEM ───
function otimizarPrecoComIA() {
  const prodNome = document.getElementById('calc-prod-nome')?.value || 'Produto';
  const custo = document.getElementById('calc-custo-total')?.value || 10;
  const margem = document.getElementById('calc-margem-desejada')?.value || 35;
  const precoAtual = document.getElementById('calc-preco-venda')?.value || 20;

  abrirAssistenteIA(`Preço do produto "${prodNome}": custo R$ ${custo}, margem ${margem}%, preço atual R$ ${precoAtual}`);
}

// ─── 5. OTIMIZADOR DE REPOSIÇÃO E COMPRAS ───
function analisarEstoqueComIA() {
  abrirAssistenteIA('Estoque');
}

// ─── 6. OTIMIZADOR DO "MEU DIA" ───
function otimizarMeuDiaComIA() {
  abrirAssistenteIA('Meu Dia');
}

// Inicializa listeners para fechar modal ao clicar fora ou na tecla ESC
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modal-ia-assistente');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) fecharAssistenteIA();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharAssistenteIA();
  });
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});
