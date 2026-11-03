// ═══════════════════════════════════════════════════════════════════
// MÓDULO 22: MODO FOCO, PREFERÊNCIAS DE NOTIFICAÇÕES, PDV BALCÃO E EXPEDIÇÃO (v5.84.0)
// GestãoPRO — Operação Intensiva e Alta Produtividade
// ═══════════════════════════════════════════════════════════════════

// ─── 1. MODO FOCO (VISUALIZAÇÃO IMERSIVA & ALTA CONCENTRAÇÃO) ───
function isModoFocoAtivo() {
  return document.body.classList.contains('modo-foco');
}

function toggleModoFoco(forcar) {
  const ativo = typeof forcar === 'boolean' ? forcar : !isModoFocoAtivo();
  if (ativo) {
    document.body.classList.add('modo-foco');
    localStorage.setItem('gp_modo_foco', 'true');
    if (typeof showToast === 'function') {
      showToast('Modo Foco Ativado: Barra lateral e distrações recolhidas.', 'gold');
    }
  } else {
    document.body.classList.remove('modo-foco');
    localStorage.setItem('gp_modo_foco', 'false');
    if (typeof showToast === 'function') {
      showToast('Modo Foco Desativado: Visualização padrão restaurada.');
    }
  }
  atualizarBotoesModoFoco();
}

function atualizarBotoesModoFoco() {
  const btn = document.getElementById('btn-topbar-foco');
  const sair = document.getElementById('btn-sair-foco');
  const ativo = isModoFocoAtivo();
  if (btn) {
    btn.classList.toggle('ativo', ativo);
    btn.setAttribute('title', ativo ? 'Desativar Modo Foco (Alt+F)' : 'Ativar Modo Foco (Alt+F)');
  }
  if (sair) {
    sair.style.display = ativo ? 'inline-flex' : 'none';
  }
}

// ─── 2. PREFERÊNCIAS DE NOTIFICAÇÕES (PUSH & ALERTAS) ───
function getConfigNotificacoes() {
  if (typeof state === 'undefined' || !state) {
    return { estoqueBaixo: true, vencimentosHoje: true, contasPagar: true };
  }
  if (!state.configNotificacoes) {
    state.configNotificacoes = {
      estoqueBaixo: true,
      vencimentosHoje: true,
      contasPagar: true,
      permissaoPedida: false
    };
  }
  return state.configNotificacoes;
}

function abrirConfigNotificacoes() {
  const cfg = getConfigNotificacoes();
  const chkEstoque = document.getElementById('notif-chk-estoque');
  const chkVenc = document.getElementById('notif-chk-venc');
  const chkPagar = document.getElementById('notif-chk-pagar');
  const statusPerm = document.getElementById('notif-status-permissao');

  if (chkEstoque) chkEstoque.checked = cfg.estoqueBaixo !== false;
  if (chkVenc) chkVenc.checked = cfg.vencimentosHoje !== false;
  if (chkPagar) chkPagar.checked = cfg.contasPagar !== false;

  if (statusPerm) {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        statusPerm.innerHTML = '<span style="color:#4CC38A;font-weight:700">✓ Notificações do Navegador Autorizadas</span>';
      } else if (Notification.permission === 'denied') {
        statusPerm.innerHTML = '<span style="color:#E5604F;font-weight:700">✕ Bloqueadas pelo Navegador (clique no cadeado da barra de endereço para liberar)</span>';
      } else {
        statusPerm.innerHTML = '<span style="color:#E3C16F;font-weight:700">⚠️ Permissão ainda não solicitada</span>';
      }
    } else {
      statusPerm.innerHTML = '<span style="color:var(--muted)">Notificações push não suportadas neste navegador.</span>';
    }
  }

  if (typeof openModal === 'function') {
    openModal('modal-config-notificacoes');
  } else {
    const m = document.getElementById('modal-config-notificacoes');
    if (m) m.classList.add('open');
  }
}

function salvarConfigNotificacoes() {
  const cfg = getConfigNotificacoes();
  const chkEstoque = document.getElementById('notif-chk-estoque');
  const chkVenc = document.getElementById('notif-chk-venc');
  const chkPagar = document.getElementById('notif-chk-pagar');

  cfg.estoqueBaixo = chkEstoque ? chkEstoque.checked : true;
  cfg.vencimentosHoje = chkVenc ? chkVenc.checked : true;
  cfg.contasPagar = chkPagar ? chkPagar.checked : true;

  if (typeof marcarAlterado === 'function') marcarAlterado();
  if (typeof salvarDados === 'function') salvarDados();
  if (typeof closeModal === 'function') closeModal('modal-config-notificacoes');

  if (typeof showToast === 'function') {
    showToast('Preferências de notificações salvas ✓', 'green');
  }
}

async function solicitarPermissaoPush() {
  if (!('Notification' in window)) {
    if (typeof showToast === 'function') showToast('Navegador não suporta notificações', 'red');
    return;
  }
  try {
    const res = await Notification.requestPermission();
    abrirConfigNotificacoes(); // atualiza status na tela
    if (res === 'granted') {
      if (typeof showToast === 'function') showToast('Notificações autorizadas com sucesso!', 'green');
      dispararNotificacaoNavegador('GestãoPRO Alertas Ativados', 'Você receberá avisos de estoque, contas a pagar e vencimentos do dia.');
    } else {
      if (typeof showToast === 'function') showToast('Permissão não concedida pelo navegador', 'red');
    }
  } catch (e) {
    console.warn('Erro permissao notif:', e);
  }
}

function dispararNotificacaoNavegador(titulo, corpo, icone = 'logo-topbar.png') {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(titulo, {
        body: corpo,
        icon: icone,
        badge: 'logo-topbar.png'
      });
    } catch (e) {
      console.warn('Erro ao disparar Notification:', e);
    }
  }
}

function testarNotificacaoPush() {
  const cfg = getConfigNotificacoes();
  let resumo = [];
  if (cfg.estoqueBaixo) resumo.push('📦 Estoque Baixo');
  if (cfg.vencimentosHoje) resumo.push('📅 Vencimentos Hoje');
  if (cfg.contasPagar) resumo.push('💸 Contas a Pagar');

  const texto = 'Teste de alerta: Suas notificações estão ativas para: ' + (resumo.join(', ') || 'Nenhum canal ativo');
  dispararNotificacaoNavegador('GestãoPRO — Alerta Teste', texto);
  if (typeof showToast === 'function') {
    showToast('Notificação de teste enviada! ✓', 'green');
  }
}

function verificarAlertasNotificacoes() {
  if (typeof state === 'undefined' || !state) return;
  const cfg = getConfigNotificacoes();
  const hoje = new Date().toISOString().slice(0, 10);

  // 1. Estoque Baixo
  if (cfg.estoqueBaixo && Array.isArray(state.produtos)) {
    const criticos = state.produtos.filter(p => !p.arquivado && Number(p.estoque || 0) <= Number(p.minimo || 0));
    if (criticos.length > 0) {
      const p1 = criticos[0];
      dispararNotificacaoNavegador(
        '⚠️ Alerta de Estoque Baixo',
        `${criticos.length} produto(s) abaixo do mínimo. Exemplo: ${p1.nome} (${p1.estoque} un restante).`
      );
    }
  }

  // 2. Vencimentos Hoje (Clientes / Contas a Receber)
  if (cfg.vencimentosHoje && Array.isArray(state.contasReceber)) {
    const vencendoHoje = state.contasReceber.filter(c => !c.pago && c.vencimento && c.vencimento.slice(0, 10) === hoje);
    if (vencendoHoje.length > 0) {
      const totalVenc = vencendoHoje.reduce((s, c) => s + Number(c.valor || 0), 0);
      dispararNotificacaoNavegador(
        '📅 Contas a Receber Vencendo Hoje',
        `${vencendoHoje.length} título(s) vencendo hoje, totalizando R$ ${totalVenc.toFixed(2)}.`
      );
    }
  }

  // 3. Contas a Pagar Hoje
  if (cfg.contasPagar && Array.isArray(state.contasPagar)) {
    const pagarHoje = state.contasPagar.filter(p => !p.pago && p.vencimento && p.vencimento.slice(0, 10) === hoje);
    if (pagarHoje.length > 0) {
      const totalPagar = pagarHoje.reduce((s, p) => s + Number(p.valor || 0), 0);
      dispararNotificacaoNavegador(
        '💸 Contas a Pagar Vencendo Hoje',
        `${pagarHoje.length} despesa(s) ou fornecedor(es) para pagar hoje (R$ ${totalPagar.toFixed(2)}).`
      );
    }
  }
}

// ─── 3. SUGESTÃO 1: MODO PDV / CAIXA BALCÃO RÁPIDO ───
let _pdvCesta = [];
let _pdvClienteId = null;

function abrirPDVRapido() {
  _pdvCesta = [];
  _pdvClienteId = null;
  const inputBusca = document.getElementById('pdv-busca-item');
  if (inputBusca) inputBusca.value = '';
  const inputRecebido = document.getElementById('pdv-valor-recebido');
  if (inputRecebido) inputRecebido.value = '';

  popularClientesPDV();
  renderizarGradeProdutosPDV();
  renderizarCestaPDV();

  if (typeof openModal === 'function') {
    openModal('modal-pdv-rapido');
  } else {
    const m = document.getElementById('modal-pdv-rapido');
    if (m) m.classList.add('open');
  }

  setTimeout(() => {
    if (inputBusca) inputBusca.focus();
  }, 250);
}

function popularClientesPDV() {
  const sel = document.getElementById('pdv-cliente-select');
  if (!sel || typeof state === 'undefined' || !Array.isArray(state.clientes)) return;
  let opts = '<option value="">Consumidor Final (Balcão)</option>';
  state.clientes.filter(c => !c.arquivado).forEach(c => {
    opts += `<option value="${c.id}">${c.nome}</option>`;
  });
  sel.innerHTML = opts;
}

function renderizarGradeProdutosPDV(termo = '') {
  const container = document.getElementById('pdv-produtos-grid');
  if (!container || typeof state === 'undefined' || !Array.isArray(state.produtos)) return;

  const t = String(termo || '').trim().toLowerCase();
  const prods = state.produtos.filter(p => {
    if (p.arquivado) return false;
    if (!t) return true;
    return (p.nome + ' ' + (p.codigo || '')).toLowerCase().includes(t);
  });

  if (prods.length === 0) {
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--muted)">Nenhum produto encontrado.</div>';
    return;
  }

  container.innerHTML = prods.slice(0, 18).map(p => {
    const preco = Number(p.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const est = Number(p.estoque || 0);
    const semEstoque = est <= 0;
    return `
      <div class="pdv-card-prod" onclick="adicionarItemPDV(${p.id})" style="${semEstoque ? 'opacity:.6;' : ''}">
        <div style="font-size:12.5px;font-weight:700;color:var(--text);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.nome}</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong style="color:var(--gold,#C9A24B);font-size:13.5px">${preco}</strong>
          <span style="font-size:10.5px;color:${semEstoque ? '#E5604F' : 'var(--muted)'}">${est} un</span>
        </div>
      </div>
    `;
  }).join('');
}

function adicionarItemPDV(produtoId) {
  const p = (state.produtos || []).find(x => x.id === produtoId);
  if (!p) return;
  const itemExistente = _pdvCesta.find(it => it.produtoId === produtoId);
  if (itemExistente) {
    itemExistente.qtd += 1;
  } else {
    _pdvCesta.push({
      produtoId: p.id,
      nome: p.nome,
      preco: Number(p.preco || 0),
      qtd: 1
    });
  }
  renderizarCestaPDV();
}

function alterarQtdPDV(index, delta) {
  if (!_pdvCesta[index]) return;
  _pdvCesta[index].qtd += delta;
  if (_pdvCesta[index].qtd <= 0) {
    _pdvCesta.splice(index, 1);
  }
  renderizarCestaPDV();
}

function calcularTotalPDV() {
  return _pdvCesta.reduce((s, it) => s + (it.preco * it.qtd), 0);
}

function renderizarCestaPDV() {
  const container = document.getElementById('pdv-cesta-itens');
  const totalEl = document.getElementById('pdv-total-val');
  const trocoEl = document.getElementById('pdv-troco-val');
  const inputRecebido = document.getElementById('pdv-valor-recebido');

  const total = calcularTotalPDV();
  if (totalEl) totalEl.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (container) {
    if (_pdvCesta.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted)">Cesta vazia. Toque em um produto ao lado para adicionar.</div>';
    } else {
      container.innerHTML = _pdvCesta.map((it, idx) => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)">
          <div style="min-width:0;flex:1;padding-right:8px">
            <div style="font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${it.nome}</div>
            <div style="font-size:11px;color:var(--muted)">${it.qtd}x R$ ${it.preco.toFixed(2)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <button type="button" class="btn btn-outline btn-xs" onclick="alterarQtdPDV(${idx}, -1)">-</button>
            <span style="font-size:13px;font-weight:700;width:24px;text-align:center">${it.qtd}</span>
            <button type="button" class="btn btn-outline btn-xs" onclick="alterarQtdPDV(${idx}, 1)">+</button>
            <strong style="font-size:13px;min-width:65px;text-align:right">R$ ${(it.qtd * it.preco).toFixed(2)}</strong>
          </div>
        </div>
      `).join('');
    }
  }

  // Calcula troco
  if (inputRecebido && trocoEl) {
    const recebido = parseFloat(inputRecebido.value) || 0;
    const troco = recebido > total ? recebido - total : 0;
    trocoEl.textContent = troco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}

function finalizarVendaPDV(formaPagamento) {
  if (_pdvCesta.length === 0) {
    if (typeof showToast === 'function') showToast('Adicione ao menos um item na cesta', 'red');
    return;
  }

  const total = calcularTotalPDV();
  const selCl = document.getElementById('pdv-cliente-select');
  const clienteId = selCl && selCl.value ? parseInt(selCl.value) : null;
  const clienteNome = clienteId && typeof getCliente === 'function' ? (getCliente(clienteId)?.nome || 'Cliente') : 'Consumidor Final';

  // Cria a venda no state
  if (typeof state !== 'undefined' && Array.isArray(state.vendas)) {
    const novaVenda = {
      id: Date.now(),
      data: new Date().toISOString(),
      clienteId: clienteId,
      clienteNome: clienteNome,
      total: total,
      tipo: 'venda',
      formaPagamento: formaPagamento,
      itens: _pdvCesta.map(it => ({
        produtoId: it.produtoId,
        nome: it.nome,
        preco: it.preco,
        qtd: it.qtd,
        total: it.preco * it.qtd
      })),
      entregue: true,
      origem: 'PDV Balcão'
    };

    state.vendas.unshift(novaVenda);

    // Baixa estoque dos produtos
    if (Array.isArray(state.produtos)) {
      _pdvCesta.forEach(it => {
        const prod = state.produtos.find(p => p.id === it.produtoId);
        if (prod) {
          prod.estoque = Math.max(0, Number(prod.estoque || 0) - it.qtd);
        }
      });
    }

    // Lança entrada no caixa se pago na hora (Dinheiro, Pix, Cartão)
    if (formaPagamento !== 'Fiado' && Array.isArray(state.financeiro)) {
      state.financeiro.unshift({
        id: Date.now() + 1,
        data: new Date().toISOString().slice(0, 10),
        descricao: `Venda PDV #${novaVenda.id} - ${clienteNome}`,
        valor: total,
        tipo: 'entrada',
        categoria: 'Vendas Balcão'
      });
    }

    // Se fiado, lança em contas a receber
    if (formaPagamento === 'Fiado' && Array.isArray(state.contasReceber)) {
      const venc = new Date();
      venc.setDate(venc.getDate() + 30);
      state.contasReceber.unshift({
        id: Date.now() + 2,
        vendaId: novaVenda.id,
        clienteId: clienteId,
        clienteNome: clienteNome,
        valor: total,
        vencimento: venc.toISOString().slice(0, 10),
        pago: false
      });
    }

    if (typeof marcarAlterado === 'function') marcarAlterado();
    if (typeof salvarDados === 'function') salvarDados();
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof renderVendasLista === 'function') renderVendasLista();
    if (typeof renderEstoque === 'function') renderEstoque();
  }

  if (typeof showToast === 'function') {
    showToast(`Venda de R$ ${total.toFixed(2)} finalizada com sucesso! (${formaPagamento})`, 'green');
  }

  _pdvCesta = [];
  renderizarCestaPDV();
  const inputRecebido = document.getElementById('pdv-valor-recebido');
  if (inputRecebido) inputRecebido.value = '';

  if (typeof closeModal === 'function') closeModal('modal-pdv-rapido');
}

// ─── 4. SUGESTÃO 2: FILA DE SEPARAÇÃO E EXPEDIÇÃO (PICKING) ───
let _pickingConferidos = {};

function abrirFilaSeparacao() {
  renderizarFilaSeparacao();
  if (typeof openModal === 'function') {
    openModal('modal-fila-separacao');
  } else {
    const m = document.getElementById('modal-fila-separacao');
    if (m) m.classList.add('open');
  }
}

function renderizarFilaSeparacao() {
  const container = document.getElementById('fila-separacao-lista');
  if (!container || typeof state === 'undefined' || !Array.isArray(state.vendas)) return;

  // Filtra vendas do tipo 'venda' que ainda não foram marcadas como entregues
  const pendentes = state.vendas.filter(v => v.tipo !== 'orcamento' && !v.entregue && Array.isArray(v.itens) && v.itens.length > 0);

  if (pendentes.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px 20px;color:var(--muted)">
        <div style="font-size:36px;margin-bottom:10px">📦</div>
        <h4 style="color:#FFF;margin-bottom:6px">Tudo Expedido!</h4>
        <p style="font-size:13px">Nenhum pedido pendente de separação ou conferência no momento.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = pendentes.map(v => {
    const totalFmt = Number(v.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const cl = typeof getCliente === 'function' ? getCliente(v.clienteId) : null;
    const endereco = cl ? (cl.endereco || cl.bairro || 'Sem endereço cadastrado') : 'Venda Avulsa';
    const totalItens = v.itens.reduce((s, it) => s + (it.qtd || 1), 0);
    const conferidosCount = (v.itens || []).filter(it => _pickingConferidos[`${v.id}-${it.produtoId || it.nome}`]).length;
    const completo = conferidosCount === v.itens.length;

    return `
      <div class="picking-card" style="background:var(--card);border:1px solid ${completo ? 'rgba(76,195,138,.4)' : 'rgba(255,255,255,.08)'};border-radius:12px;padding:14px;margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div>
            <h4 style="margin:0 0 4px;font-size:15px;color:#FFF">Pedido #${v.id} · ${v.clienteNome || 'Cliente'}</h4>
            <div style="font-size:11.5px;color:var(--muted)">📍 ${endereco} · <strong>${totalFmt}</strong></div>
          </div>
          <span class="badge" style="background:${completo ? '#4CC38A' : 'var(--gold,#C9A24B)'};color:#000;font-weight:700">
            ${conferidosCount} / ${v.itens.length} conferidos
          </span>
        </div>

        <div style="background:rgba(0,0,0,.25);border-radius:8px;padding:10px;margin:10px 0">
          <div style="font-size:11.5px;font-weight:700;color:var(--gold,#C9A24B);margin-bottom:8px">Checklist de Itens no Fardo/Caixa:</div>
          ${v.itens.map(it => {
            const key = `${v.id}-${it.produtoId || it.nome}`;
            const isChecked = !!_pickingConferidos[key];
            return `
              <label style="display:flex;align-items:center;gap:10px;padding:5px 0;cursor:pointer;font-size:13px;color:${isChecked ? 'var(--muted)' : 'var(--text)'};text-decoration:${isChecked ? 'line-through' : 'none'}">
                <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleCheckItemPicking('${key}', ${v.id})" style="width:16px;height:16px;accent-color:var(--gold,#C9A24B)">
                <span><strong>${it.qtd}x</strong> ${it.nome}</span>
              </label>
            `;
          }).join('')}
        </div>

        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px">
          <button type="button" class="btn btn-outline btn-xs" onclick="imprimirRomaneioPedido(${v.id})">
            <i data-lucide="printer" class="ic"></i> Imprimir Romaneio
          </button>
          <button type="button" class="btn ${completo ? 'btn-green' : 'btn-primary'} btn-xs" onclick="marcarPedidoExpedido(${v.id})">
            <i data-lucide="check" class="ic"></i> ${completo ? 'Liberar Rota / Expedido ✓' : 'Marcar como Separado'}
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function toggleCheckItemPicking(key, vendaId) {
  _pickingConferidos[key] = !_pickingConferidos[key];
  renderizarFilaSeparacao();
}

function marcarPedidoExpedido(vendaId) {
  if (typeof state === 'undefined' || !Array.isArray(state.vendas)) return;
  const v = state.vendas.find(x => x.id === vendaId);
  if (!v) return;

  v.entregue = true;
  v.dataExpedicao = new Date().toISOString();

  if (typeof marcarAlterado === 'function') marcarAlterado();
  if (typeof salvarDados === 'function') salvarDados();
  if (typeof renderDashboard === 'function') renderDashboard();

  if (typeof showToast === 'function') {
    showToast(`Pedido #${vendaId} despachado com sucesso!`, 'green');
  }

  renderizarFilaSeparacao();
}

function imprimirRomaneioPedido(vendaId) {
  const v = (state.vendas || []).find(x => x.id === vendaId);
  if (!v) return;
  const janela = window.open('', '_blank');
  if (!janela) return;
  janela.document.write(`
    <html>
      <head>
        <title>Romaneio de Entrega - Pedido #${v.id}</title>
        <style>
          body { font-family: monospace; padding: 20px; font-size: 13px; }
          h2 { margin: 0 0 10px; }
          hr { border-top: 1px dashed #000; }
          .item { display: flex; justify-content: space-between; margin: 4px 0; }
        </style>
      </head>
      <body>
        <h2>GestãoPRO — Romaneio de Carga</h2>
        <p><strong>Pedido #${v.id}</strong> · Data: ${new Date(v.data).toLocaleString('pt-BR')}</p>
        <p><strong>Cliente:</strong> ${v.clienteNome || 'Consumidor'}</p>
        <hr>
        <h3>ITENS PARA CONFERÊNCIA:</h3>
        ${(v.itens || []).map(it => `<div class="item"><span>[  ] ${it.qtd}x ${it.nome}</span></div>`).join('')}
        <hr>
        <p><strong>Total do Pedido:</strong> R$ ${Number(v.total || 0).toFixed(2)}</p>
        <p>Assinatura do Recebedor: ____________________________</p>
      </body>
    </html>
  `);
  janela.document.close();
  janela.print();
}

// ─── INICIALIZAÇÃO DE LISTENERS GLOBAIS ───
document.addEventListener('DOMContentLoaded', () => {
  // Restaura preferência de Modo Foco salva
  const focoSalvo = localStorage.getItem('gp_modo_foco') === 'true';
  if (focoSalvo) {
    document.body.classList.add('modo-foco');
  }
  atualizarBotoesModoFoco();

  // Atalho de teclado Alt+F para Modo Foco
  document.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      toggleModoFoco();
    }
  });

  // Checagem periódica suave de alertas e notificações
  setTimeout(() => {
    verificarAlertasNotificacoes();
  }, 4000);
});
