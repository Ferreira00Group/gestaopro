// ═══════════════════════════════════════════════════════════════════
// MÓDULO 21: INTELIGÊNCIA ARTIFICIAL GEMINI PARA GESTÃOPRO (v5.81)
// ═══════════════════════════════════════════════════════════════════

let historicoChatIA = [];
let _iaCarregando = false;

// Extrai um resumo estruturado dos dados reais do ERP
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
      itensCriticos: 0
    };
  }

  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  // Faturamento do mês
  let fatMes = 0;
  if (Array.isArray(state.vendas)) {
    state.vendas.forEach(v => {
      if (!v || !v.data) return;
      const d = new Date(v.data);
      if (d.getMonth() === mesAtual && d.getFullYear() === anoAtual) {
        fatMes += Number(v.total || 0);
      }
    });
  }

  // Contas a receber
  let recAberto = 0;
  let recVencido = 0;
  let totalInadimplente = 0;
  let titulosVencidos = 0;

  if (Array.isArray(state.contasReceber)) {
    state.contasReceber.forEach(c => {
      if (!c.pago) {
        const val = Number(c.valor || 0);
        recAberto += val;
        if (c.vencimento && new Date(c.vencimento) < hoje) {
          recVencido += val;
          totalInadimplente += val;
          titulosVencidos++;
        }
      }
    });
  }

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
  }

  // Estoque crítico
  let itensBaixo = 0;
  if (Array.isArray(state.produtos)) {
    state.produtos.forEach(p => {
      const min = Number(p.minimo || 0);
      const est = Number(p.estoque || 0);
      if (est <= min) itensBaixo++;
    });
  }

  // Top produtos
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
    itensEstoqueBaixo: itensBaixo,
    itensCriticos: itensBaixo,
    faturamentoMes: fatMes,
    despesasMes: despMes,
    saldoCaixa: saldoCaixa,
    aReceber: recAberto,
    aReceberVencido: recVencido,
    aPagar: pagAberto,
    totalInadimplente: totalInadimplente,
    titulosVencidos: titulosVencidos,
    topProdutos: topProdutos
  };
}

// Formata texto markdown simples para HTML seguro
function formatarMarkdownParaHTML(md) {
  if (!md) return '';
  let txt = String(md)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Negrito **texto**
  txt = txt.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Itálico *texto*
  txt = txt.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Títulos ###
  txt = txt.replace(/^### (.*?)$/gm, '<h4 style="color:var(--gold,#C9A24B);margin:14px 0 6px;font-size:14.5px;font-weight:700">$1</h4>');
  txt = txt.replace(/^## (.*?)$/gm, '<h3 style="color:#FFF;margin:16px 0 8px;font-size:16px;font-weight:700">$1</h3>');
  // Marcadores de lista
  txt = txt.replace(/^- (.*?)$/gm, '<li style="margin-bottom:5px;line-height:1.45">$1</li>');
  txt = txt.replace(/(<li.*<\/li>)/s, '<ul style="padding-left:18px;margin:6px 0 10px">$1</ul>');
  // Linhas separadoras
  txt = txt.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid rgba(255,255,255,.1);margin:12px 0">');
  // Quebras de linha normais
  txt = txt.replace(/\n\n/g, '<p style="margin-bottom:10px;line-height:1.5"></p>');
  txt = txt.replace(/\n/g, '<br>');

  return txt;
}

// ─── ABERTURA E CONTROLE DO MODAL DE ASSISTENTE IA ───
function abrirAssistenteIA(promptInicial) {
  const modal = document.getElementById('modal-ia-assistente');
  if (!modal) return;
  modal.classList.add('active');

  const containerMsgs = document.getElementById('ia-chat-mensagens');
  if (containerMsgs && historicoChatIA.length === 0) {
    containerMsgs.innerHTML = `
      <div class="ia-msg ia-msg-assistant">
        <div class="ia-avatar"><i data-lucide="sparkles" style="width:16px;height:16px;color:#C9A24B"></i></div>
        <div class="ia-bolha">
          <strong>Olá! Eu sou o Copiloto IA do GestãoPRO (Gemini).</strong><br>
          Tenho acesso aos dados operacionais do seu ERP em tempo real. Como posso te apoiar agora?
          <div class="ia-sugestoes" style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px">
            <button class="ia-chip" onclick="enviarMensagemIA('Faça um diagnóstico executivo completo da empresa neste mês')">📊 Diagnóstico do Mês</button>
            <button class="ia-chip" onclick="enviarMensagemIA('Quais produtos estão com estoque crítico e precisam ser repostos?')">📦 Alerta de Estoque</button>
            <button class="ia-chip" onclick="enviarMensagemIA('Como posso cobrar clientes em atraso de forma cordial sem perder a venda?')">💬 Mensagem de Cobrança</button>
            <button class="ia-chip" onclick="enviarMensagemIA('Dicas práticas para aumentar o ticket médio e lucro líquido da empresa')">🚀 Ideias de Lucro</button>
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
  if (modal) modal.classList.remove('active');
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

  try {
    const resp = await fetch('/api/gemini/assistente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: texto,
        context: contexto,
        history: historicoChatIA
      })
    });

    const data = await resp.json();
    msgLoading.remove();

    const respostaTexto = data.text || 'Não consegui obter uma resposta no momento. Tente novamente.';
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
  } catch (err) {
    msgLoading.remove();
    const msgErro = document.createElement('div');
    msgErro.className = 'ia-msg ia-msg-assistant';
    msgErro.innerHTML = `
      <div class="ia-avatar" style="background:rgba(235,87,87,.2);color:#EB5757"><i data-lucide="alert-triangle" style="width:16px;height:16px"></i></div>
      <div class="ia-bolha" style="border:1px solid rgba(235,87,87,.3)">
        <strong>Erro ao processar com Gemini:</strong> Verifique sua conexão ou configuração do servidor.
      </div>
    `;
    containerMsgs.appendChild(msgErro);
  } finally {
    _iaCarregando = false;
    containerMsgs.scrollTop = containerMsgs.scrollHeight;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
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
    abrirAssistenteIA('Faça um diagnóstico executivo completo da empresa com foco em fluxo de caixa, estoque e rentabilidade');
    return;
  }
  modal.classList.add('active');

  const corpo = document.getElementById('ia-diagnostico-corpo');
  if (corpo) {
    corpo.innerHTML = `
      <div style="text-align:center;padding:40px 20px">
        <div class="ia-spinner" style="width:36px;height:36px;border-width:3px;margin:0 auto 16px"></div>
        <h4 style="margin-bottom:6px">Analisando Inteligência de Negócio...</h4>
        <p style="font-size:13px;color:var(--muted)">O Gemini está cruzando vendas, inadimplência, despesas e estoque para gerar seu relatório executivo.</p>
      </div>
    `;
  }

  const contexto = coletarContextoERP();

  try {
    const res = await fetch('/api/gemini/diagnostico', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumo: contexto })
    });
    const data = await res.json();
    if (corpo) {
      corpo.innerHTML = `
        <div style="background:rgba(201,162,75,.08);border:1px solid rgba(201,162,75,.25);border-radius:12px;padding:16px;margin-bottom:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <span style="font-size:12px;text-transform:uppercase;color:var(--gold,#C9A24B);font-weight:700;letter-spacing:.8px">Diagnóstico em Tempo Real</span>
            <span class="badge" style="background:#4CC38A;color:#000;font-weight:700">Modelo: Gemini 3.8 Flash</span>
          </div>
          <div id="diagnostico-conteudo">${formatarMarkdownParaHTML(data.text)}</div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn btn-outline" onclick="copiarTextoIA('diagnostico-conteudo')"><i data-lucide="copy" class="ic"></i> Copiar Relatório</button>
          <button class="btn btn-primary" onclick="closeModal('modal-ia-diagnostico');abrirAssistenteIA('Com base no diagnóstico executivo, qual o primeiro passo que devo tomar hoje?')"><i data-lucide="sparkles" class="ic"></i> Tirar Dúvidas com Copiloto</button>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  } catch (err) {
    if (corpo) {
      corpo.innerHTML = `
        <div class="alert alert-danger" style="padding:16px">
          <strong>Falha ao gerar diagnóstico com IA:</strong> Tente novamente em instantes.
        </div>
      `;
    }
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
    abrirAssistenteIA(`Escreva 3 mensagens de cobrança para o cliente ${clienteNome} que deve R$ ${valorDevido || 0}`);
    return;
  }
  modal.classList.add('active');

  const corpo = document.getElementById('ia-cobranca-corpo');
  if (corpo) {
    corpo.innerHTML = `
      <div style="text-align:center;padding:30px">
        <div class="ia-spinner" style="margin:0 auto 14px"></div>
        <p style="font-size:13px;color:var(--muted)">Criando mensagens persuasivas e amigáveis para ${clienteNome}...</p>
      </div>
    `;
  }

  try {
    const res = await fetch('/api/gemini/cobranca', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clienteNome: clienteNome,
        valor: valorDevido || 0,
        diasAtraso: 7,
        tom: 'cordial e comercial'
      })
    });
    const data = await res.json();
    if (corpo) {
      if (data.mensagens && Array.isArray(data.mensagens)) {
        corpo.innerHTML = data.mensagens.map((m, idx) => `
          <div style="background:var(--card);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:14px;margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <strong style="color:var(--gold,#C9A24B);font-size:13px"><i data-lucide="message-square" style="width:14px;height:14px;display:inline"></i> ${m.titulo}</strong>
              <span class="badge" style="font-size:10.5px">${m.tipo}</span>
            </div>
            <p id="msg-cobranca-${idx}" style="font-size:13px;line-height:1.45;color:var(--text);margin-bottom:10px;white-space:pre-wrap">${m.texto}</p>
            <div style="display:flex;gap:8px">
              <button class="btn btn-outline btn-xs" onclick="copiarTextoIA('msg-cobranca-${idx}')"><i data-lucide="copy" class="ic"></i> Copiar Mensagem</button>
              <button class="btn btn-primary btn-xs" onclick="abrirWhatsAppCobranca('${encodeURIComponent(m.texto)}')"><i data-lucide="send" class="ic"></i> Abrir no WhatsApp</button>
            </div>
          </div>
        `).join('');
      } else {
        corpo.innerHTML = `
          <div style="background:var(--card);padding:14px;border-radius:10px">
            <div id="cobranca-texto-livre">${formatarMarkdownParaHTML(data.text || '')}</div>
            <button class="btn btn-outline btn-sm" style="margin-top:10px" onclick="copiarTextoIA('cobranca-texto-livre')"><i data-lucide="copy" class="ic"></i> Copiar</button>
          </div>
        `;
      }
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  } catch (e) {
    if (corpo) corpo.innerHTML = `<div class="alert alert-danger">Erro ao gerar mensagens de cobrança.</div>`;
  }
}

function abrirWhatsAppCobranca(textoCodificado) {
  window.open(`https://api.whatsapp.com/send?text=${textoCodificado}`, '_blank');
}

// ─── 4. OTIMIZADOR DE PREÇO E MARGEM ───
async function otimizarPrecoComIA() {
  const prodNome = document.getElementById('calc-prod-nome')?.value || 'Produto';
  const custo = document.getElementById('calc-custo-total')?.value || 10;
  const margem = document.getElementById('calc-margem-desejada')?.value || 35;
  const precoAtual = document.getElementById('calc-preco-venda')?.value || 20;

  abrirAssistenteIA(`Como especialista financeiro, avalie a precificação do produto "${prodNome}". Custo direto: R$ ${custo}, Margem pretendida: ${margem}%, Preço praticado atual: R$ ${precoAtual}. Me dê o markup ideal e estratégias de venda para atacado e varejo.`);
}

// ─── 5. OTIMIZADOR DE REPOSIÇÃO E COMPRAS ───
async function analisarEstoqueComIA() {
  const contexto = coletarContextoERP();
  let itensLista = [];
  if (typeof state !== 'undefined' && Array.isArray(state.produtos)) {
    itensLista = state.produtos
      .filter(p => Number(p.estoque || 0) <= Number(p.minimo || 0))
      .map(p => ({ nome: p.nome, estoque: p.estoque, minimo: p.minimo, preco: p.preco }));
  }

  let materiasLista = [];
  if (typeof state !== 'undefined' && Array.isArray(state.materias)) {
    materiasLista = state.materias
      .filter(m => Number(m.qtd || 0) <= Number(m.minimo || 0))
      .map(m => ({ nome: m.nome, qtd: m.qtd, unidade: m.unidade, custo: m.custo, minimo: m.minimo }));
  }

  abrirAssistenteIA(`Analise a situação de estoque da empresa e monte uma sugestão de compras e ordem de fabricação para os itens em alerta:
Produtos Acabados Abaixo do Mínimo: ${JSON.stringify(itensLista)}
Matérias-Primas Críticas: ${JSON.stringify(materiasLista)}`);
}

// ─── 6. OTIMIZADOR DO "MEU DIA" ───
async function otimizarMeuDiaComIA() {
  const contexto = coletarContextoERP();
  abrirAssistenteIA(`Ajude a planejar e otimizar meu dia de trabalho hoje no GestãoPRO:
- Contas a receber pendentes: R$ ${contexto.aReceber} (${contexto.titulosVencidos} vencidas)
- Itens em estoque crítico: ${contexto.itensCriticos}
- Faturamento acumulado no mês: R$ ${contexto.faturamentoMes}
Crie um roteiro operacional de alto rendimento para o dia (cobranças, visitas, expedição e fechamento).`);
}

// Inicializa atalhos e botões rápidos na UI
document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});
