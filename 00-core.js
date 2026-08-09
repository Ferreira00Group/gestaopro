// ============ DEFAULT STATE ============
const DEFAULT_STATE = {
  rotas:[
    {id:1,nome:'Centro'},
    {id:2,nome:'Belmonte'},
  ],
  clientes:[
    {id:1,nome:'Maria das Dores',tel:'11987654321',end:'Rua das Flores, 12',rotaId:2},
    {id:2,nome:'João Pereira',tel:'11912345678',end:'Av. Central, 45',rotaId:1},
    {id:3,nome:'Ana Lima',tel:'11955544433',end:'Rua Verde, 8',rotaId:1},
  ],
  produtos:[
    {id:1,nome:'Lava Roupa',sku:'LR-001',categoria:'Lavanderia',preco:20.00,estoque:60,minimo:20,variantes:[]},
    {id:2,nome:'Lava Louça',sku:'LL-001',categoria:'Lavanderia',preco:20.00,estoque:0,minimo:30,variantes:[{id:1,nome:'Limão',estoque:50,sku:'LL-001-LIM'},{id:2,nome:'Maçã',estoque:35,sku:'LL-001-MAC'}]},
    {id:3,nome:'Limpa Piso',sku:'LP-001',categoria:'Limpeza Geral',preco:20.00,estoque:40,minimo:15,variantes:[]},
    {id:4,nome:'Limpa Alumínio',sku:'LA-001',categoria:'Limpeza Geral',preco:20.00,estoque:25,minimo:10,variantes:[]},
    {id:5,nome:'Desinfetante',sku:'DES-001',categoria:'Limpeza Geral',preco:10.00,estoque:0,minimo:20,variantes:[{id:1,nome:'Lavanda',estoque:30,sku:'DES-001-LAV'},{id:2,nome:'Flor do Campo',estoque:18,sku:'DES-001-FDC'}]},
    {id:6,nome:'Cera',sku:'CER-001',categoria:'Limpeza Geral',preco:10.00,estoque:0,minimo:10,variantes:[{id:1,nome:'Branca',estoque:14,sku:'CER-001-BRA'},{id:2,nome:'Vermelha',estoque:8,sku:'CER-001-VER'}]},
    {id:7,nome:'Amaciante',sku:'AMA-001',categoria:'Lavanderia',preco:20.00,estoque:35,minimo:15,variantes:[]},
    {id:8,nome:'Água Sanitária',sku:'AS-001',categoria:'Limpeza Geral',preco:10.00,estoque:40,minimo:15,variantes:[]},
  ],
  materias:[
    {id:1,nome:'Tensoativo (Lauril/Texapon)',qtd:20,unidade:'kg',custo:14.00,minimo:5,fornecedorId:1},
    {id:2,nome:'Soda Cáustica',qtd:15,unidade:'kg',custo:9.00,minimo:5,fornecedorId:1},
    {id:3,nome:'Cloro',qtd:18,unidade:'L',custo:6.50,minimo:5,fornecedorId:1},
    {id:4,nome:'Essência Lavanda',qtd:3,unidade:'L',custo:42.00,minimo:1,fornecedorId:2},
    {id:5,nome:'Essência Flor do Campo',qtd:2,unidade:'L',custo:42.00,minimo:1,fornecedorId:2},
    {id:6,nome:'Essência Limão',qtd:2.5,unidade:'L',custo:38.00,minimo:1,fornecedorId:2},
    {id:7,nome:'Essência Maçã',qtd:2,unidade:'L',custo:38.00,minimo:1,fornecedorId:2},
    {id:8,nome:'Corante Branco',qtd:1.5,unidade:'L',custo:25.00,minimo:0.5,fornecedorId:2},
    {id:9,nome:'Corante Vermelho',qtd:1,unidade:'L',custo:25.00,minimo:0.5,fornecedorId:2},
    {id:10,nome:'Cera Base (parafina/resina)',qtd:12,unidade:'kg',custo:16.00,minimo:4,fornecedorId:1},
    {id:11,nome:'Ácido (limpa alumínio)',qtd:8,unidade:'L',custo:11.00,minimo:3,fornecedorId:1},
    {id:12,nome:'Coco Amida (espessante)',qtd:6,unidade:'kg',custo:19.00,minimo:2,fornecedorId:1},
    {id:13,nome:'Embalagem 1L',qtd:300,unidade:'un',custo:0.45,minimo:50,fornecedorId:3},
    {id:14,nome:'Embalagem 500ml',qtd:200,unidade:'un',custo:0.30,minimo:50,fornecedorId:3},
  ],
  fornecedores:[
    {id:1,nome:'Distribuidora Quimicasa',contato:'Carlos Mendes',tel:'11988776655',categoria:'Tensoativos, soda, ácidos',obs:'Entrega em 2 dias úteis',status:'ativo'},
    {id:2,nome:'Essências & Cia',contato:'Patrícia Souza',tel:'11977665544',categoria:'Essências e corantes',obs:'Pedido mínimo R$200',status:'ativo'},
    {id:3,nome:'Embalagens RS',contato:'João Ferreira',tel:'11966554433',categoria:'Embalagens plásticas',obs:'',status:'ativo'},
  ],
  fichas:{
    1:[{mpId:1,qtd:0.08},{mpId:2,qtd:0.05},{mpId:13,qtd:1}],
    3:[{mpId:1,qtd:0.04},{mpId:3,qtd:0.02},{mpId:13,qtd:1}],
    4:[{mpId:11,qtd:0.15},{mpId:1,qtd:0.02},{mpId:13,qtd:1}],
    7:[{mpId:12,qtd:0.06},{mpId:4,qtd:0.01},{mpId:13,qtd:1}],
    8:[{mpId:3,qtd:0.45},{mpId:13,qtd:1}],
  },
  fichasVariante:{
    '2-1':[{mpId:1,qtd:0.06},{mpId:6,qtd:0.02},{mpId:14,qtd:1}],
    '2-2':[{mpId:1,qtd:0.06},{mpId:7,qtd:0.02},{mpId:14,qtd:1}],
    '5-1':[{mpId:1,qtd:0.03},{mpId:3,qtd:0.04},{mpId:4,qtd:0.015},{mpId:13,qtd:1}],
    '5-2':[{mpId:1,qtd:0.03},{mpId:3,qtd:0.04},{mpId:5,qtd:0.015},{mpId:13,qtd:1}],
    '6-1':[{mpId:10,qtd:0.18},{mpId:8,qtd:0.01},{mpId:14,qtd:1}],
    '6-2':[{mpId:10,qtd:0.18},{mpId:9,qtd:0.01},{mpId:14,qtd:1}],
  },
  // Quantas unidades cada ficha (chave = produtoId, ou "produtoId-varianteId") rende.
  // Ausente = 1 (as quantidades da ficha já são "por unidade", comportamento de sempre).
  fichaRendimento:{},
  vendas:[
    {id:1,clienteId:1,itens:[{produtoId:1,varianteId:null,qtd:6,preco:9.90,total:59.40}],total:59.40,forma:'fiado',status:'em_aberto',data:'2026-06-18',obs:'',tipo:'venda'},
    {id:2,clienteId:2,itens:[{produtoId:2,varianteId:1,qtd:12,preco:4.50,total:54.00}],total:54.00,forma:'fiado',status:'em_aberto',data:'2026-06-17',obs:'',tipo:'venda'},
    {id:3,clienteId:1,itens:[{produtoId:5,varianteId:2,qtd:5,preco:6.90,total:34.50}],total:34.50,forma:'fiado',status:'em_aberto',data:'2026-06-16',obs:'',tipo:'venda'},
    {id:4,clienteId:3,itens:[{produtoId:6,varianteId:1,qtd:4,preco:10.50,total:42.00}],total:42.00,forma:'pix',status:'pago',data:'2026-06-15',obs:'',tipo:'venda'},
    {id:5,clienteId:2,itens:[{produtoId:1,varianteId:null,qtd:10,preco:9.90,total:99.00},{produtoId:5,varianteId:1,qtd:6,preco:6.90,total:41.40}],total:140.40,status:'em_aberto',data:'2026-06-19',obs:'',tipo:'orcamento',statusOrc:'rascunho'},
  ],
  pagamentos:[
    {id:1,clienteId:1,valor:10,forma:'Dinheiro',obs:'parcial',data:'2026-06-19'},
  ],
  pagamentosFornecedor:[],
  producoes:[
    {id:1,produtoId:1,varianteId:null,qtd:50,custo:93.50,data:'2026-06-17',consumo:[{mpId:1,qtdConsumida:4},{mpId:2,qtdConsumida:2.5},{mpId:13,qtdConsumida:50}]},
  ],
  financeiro:[
    {id:1,tipo:'entrada',desc:'Venda Cera Branca - João',valor:42.00,data:'2026-06-19'},
    {id:2,tipo:'saida',desc:'Compra de tensoativo e embalagens',valor:145,data:'2026-06-18'},
    {id:3,tipo:'entrada',desc:'Pagamento Maria (parcial)',valor:10,data:'2026-06-19'},
  ],
  compras:[],
  baixasEstoque:[],
  entradasEstoque:[],
  semiacabados:[],
  nextId:{clientes:4,produtos:9,materias:15,vendas:6,pagamentos:2,producoes:2,financeiro:4,fornecedores:4,compras:1,baixasEstoque:1,semiacabados:1,entradasEstoque:1,rotas:3,pagamentosFornecedor:1},
  metas:{},
  fechamentos:[],
  custosFixos:[
    {id:1,nome:'Aluguel / Espaço',valor:0},
    {id:2,nome:'Energia Elétrica',valor:0},
    {id:3,nome:'Mão de obra / Salários',valor:0},
    {id:4,nome:'Embalagem / Frete',valor:0},
  ],
  canais:[
    {id:1,nome:'Varejo',desconto:0},
    {id:2,nome:'Atacado',desconto:15},
    {id:3,nome:'Revendedor',desconto:25},
  ],
  estoque_tab:'produtos',
  cliente_filter:'',
  cliente_status_filter:'',
  cliente_mostrar_arquivados:false,
  estoque_mostrar_arquivados:false,
  venda_filter:'',
  venda_tipo_filter:'',
  estoque_filter:'',
  estoque_categoria_filter:'',
  planejamento_apenas_aprovados:false,
  ultimoBackup:null,
  snoozeBackupAte:null,
  driveBackupAtivo:false,
  driveUltimaTentativa:null,
  precificacao_filter:'',
  fornecedor_filter:'',
  fornecedor_status_filter:'',
  global_search:'',
  ultimo_save:null,
  dados_alterados:false,
};

// ============ STATE com localStorage ============
let state;
const STORAGE_KEY = 'gestao_pro_v4_limpeza';

// Versão atual do schema. Incremente sempre que adicionar/remover campos do state.
// Histórico:
//   1 → estrutura original sem versionamento
//   2 → adicionado _version, fichasVariante, orcamentos, fornecedores, compras, baixasEstoque
//   3 → adicionado metas, fechamentos, custosFixos, canais
//   4 → vendas migradas para itens[], variantes nos produtos
//   5 → versionamento formal implantado
//   6 → novo modelo de venda parcelada (1 registro com parcelas[] em vez de
//       N vendas separadas). Reset único de clientes/vendas/pagamentos para evitar dados
//       inconsistentes do modelo antigo (cada parcela era uma "venda" própria).
//   7 → custo de matéria-prima passa a contar só na COMPRA, não mais na
//       Produção (evita contar o mesmo gasto 2x). Remove os lançamentos antigos de despesa
//       de "Produção" do financeiro, que duplicavam o custo já lançado na compra.
//   8 → ficha técnica ganha "Rendimento" (quantas unidades uma mistura rende),
//       pra não precisar pré-dividir as quantidades dos ingredientes na mão. Garante que
//       fichaRendimento exista e que semiacabados tenham rendimento definido (default 1 —
//       mesmo comportamento de antes, quantidades continuam "por unidade" até o usuário
//       preencher um rendimento diferente).
//   9 → lançamentos do Financeiro (state.financeiro) passam a poder carregar
//       "vendaId" e "pagamentoId", do mesmo jeito que "compraId" já existia — ligando o
//       lançamento automático à venda/pagamento que o gerou. Isso permite: (a) editar uma
//       venda e o valor do lançamento acompanhar; (b) excluir uma venda e o lançamento sumir
//       junto (antes ficava "fantasma" no Financeiro/Fluxo de Caixa); (c) excluir o lançamento
//       de um pagamento recebido e o pagamento em si ser desfeito (antes o saldo do cliente e
//       o Financeiro ficavam divergentes). Não precisa migrar nada: lançamentos antigos
//       simplesmente não têm esses campos (tratados como manuais) — não dá pra reconstruir
//       o vínculo retroativamente com segurança, então não tentamos.
//   10 → clientes e produtos ganham arquivamento (campo "ativo"). Excluir um
//        cliente/produto que já tem venda/produção vinculada agora arquiva em vez de apagar
//        (ver excluirCliente/excluirProduto). Sem migração de dados — ver comentário na
//        migração 9→10 abaixo.
//   11 → matérias-primas passam a usar custo médio ponderado (CMP) em vez de
//        "custo da última compra". Ver migração 10→11 e as funções registrarEntradaMateria/
//        registrarSaidaMateria/reverterEntradaMateria em 00-core.js.
//   12 → Contas a Pagar: state.compras ganha "formaPagamento" ('avista'|'prazo'),
//        "vencimento" e, se parcelada, "parcelado"+"parcelas[]" — mesmo modelo que state.vendas
//        já usa pro fiado do cliente. Compra "à vista" continua lançando a saída no Financeiro
//        na hora, como sempre foi; "a prazo" só lança quando o pagamento ao fornecedor é
//        registrado (novo array state.pagamentosFornecedor, mesmo papel de state.pagamentos).
//        Sem migração de dados: toda compra já existente não tem "formaPagamento", e o código
//        trata ausência/qualquer valor ≠ 'prazo' como 'avista' — o que é historicamente correto
//        (elas já geraram a saída imediata de verdade), não uma aproximação.
//   13 → (versão atual) cada item de venda (state.vendas[].itens[]) ganha "custoFichaUn": um
//        retrato do custo da ficha técnica por unidade NO MOMENTO da venda. Sem isso, o
//        ranking de produtos em Relatório recalculava a margem de vendas antigas usando a
//        ficha técnica de HOJE — se o preço de uma matéria-prima mudasse, a margem de uma
//        venda de meses atrás mudava sozinha. Sem migração de dados: vendas antigas não têm
//        esse campo, e o relatório cai de volta pro cálculo pela ficha atual nesse caso (única
//        opção quando não sabemos o custo real da época — ver 09-financeiro-relatorios.js).
const SCHEMA_VERSION = 13;

// Cada entrada descreve como migrar DA versão N para N+1.
// Recebe o objeto parsed e retorna o objeto transformado.
const MIGRATIONS = {
  // v1 → v2: garantir campos que antes podiam estar ausentes
  1: (d) => {
    d.fichasVariante = d.fichasVariante || {};
    d.orcamentos     = d.orcamentos     || [];
    d.fornecedores   = d.fornecedores   || [];
    d.compras        = d.compras        || [];
    d.baixasEstoque  = d.baixasEstoque  || [];
    return d;
  },
  // v2 → v3: campos financeiros adicionais
  2: (d) => {
    d.metas       = d.metas       || {};
    d.fechamentos = d.fechamentos || [];
    d.custosFixos = d.custosFixos || DEFAULT_STATE.custosFixos;
    d.canais      = d.canais      || DEFAULT_STATE.canais;
    return d;
  },
  // v3 → v4: migrar vendas antigas (sem itens[]) e garantir variantes nos produtos
  3: (d) => {
    d.produtos = (d.produtos || []).map(p => ({ variantes: [], ...p }));
    d.vendas   = (d.vendas   || []).map(v =>
      v.itens ? v : { ...v, itens: [{ produtoId: v.produtoId, varianteId: null, qtd: v.qtd, preco: v.preco, total: v.total }] }
    );
    return d;
  },
  // v4 → v5: versionamento formal — nada muda nos dados, só registra a versão
  4: (d) => d,
  // v5 → v6: novo modelo de parcelamento. As vendas parceladas antigas viravam N registros
  // separados em state.vendas (um por parcela), o que inflava ticket médio/contagem de vendas
  // e deixava o vencimento de cada parcela "preso" mesmo depois de pago via saldo geral.
  // Decisão combinada com o usuário: resetar clientes, vendas e pagamentos (uma única vez,
  // automaticamente nesta atualização) em vez de tentar migrar os registros antigos.
  5: (d) => {
    d.clientes   = [];
    d.vendas     = [];
    d.pagamentos = [];
    d.nextId = { ...(d.nextId||{}), clientes:1, vendas:1, pagamentos:1 };
    return d;
  },
  // v6 → v7: remove lançamentos antigos de "Produção X" no financeiro — o custo da matéria-prima
  // consumida já tinha sido lançado como despesa na hora da COMPRA (state.compras), então esses
  // lançamentos contavam o mesmo gasto uma segunda vez em DRE/Fechamento/Despesas por Origem.
  6: (d) => {
    d.financeiro = (d.financeiro || []).filter(f =>
      !(f.tipo === 'saida' && (f.categoria === 'Produção (consumo de MP)' || (f.desc || '').startsWith('Produção ')))
    );
    return d;
  },
  // v7 → v8: garante que o mapa de rendimento exista e que semiacabados tenham rendimento
  // explícito (default 1 = mesmo comportamento de sempre, sem mudar nenhum cálculo existente).
  7: (d) => {
    d.fichaRendimento = d.fichaRendimento || {};
    (d.semiacabados || []).forEach(s => { if (s.rendimento == null) s.rendimento = 1; });
    return d;
  },
  // v8 → v9: nenhuma transformação de dados — só passamos a permitir os campos opcionais
  // "vendaId"/"pagamentoId" em novos lançamentos do financeiro (ver histórico acima).
  8: (d) => d,
  // v9 → v10: nenhuma transformação de dados. Clientes e Produtos passam a poder ter um campo
  // "ativo" (true/false). Convenção igual à de fichaRendimento: campo AUSENTE = true (ativo) —
  // por isso registros antigos não precisam de migração, eles já nascem "ativos" por omissão.
  // Motivo: excluir um cliente/produto que já tem venda/produção associada apagava esse
  // histórico (ou deixava referências soltas). Agora, nesse caso, "excluir" arquiva
  // (ativo=false) em vez de remover — o registro some das listas/seletores de coisa nova,
  // mas os relatórios antigos continuam batendo, porque getCliente/getProduto continuam
  // achando o registro pelo id de qualquer forma.
  9: (d) => d,
  // v10 → v11: matérias-primas ganham "valorEstoque" (valor total em R$ do estoque atual),
  // usado como livro-razão pro custo médio ponderado (CMP) — ver comentário nas funções
  // registrarEntradaMateria/registrarSaidaMateria/reverterEntradaMateria em 00-core.js.
  // Antes, "custo" era sobrescrito pela ÚLTIMA compra a cada entrada; agora é sempre a média
  // ponderada de tudo que já entrou. Migração: reconstrói valorEstoque = qtd × custo atual
  // (é a melhor aproximação possível — não temos como saber retroativamente quanto cada
  // compra histórica contribuiu pro custo atual já sobrescrito nas versões anteriores).
  10: (d) => {
    (d.materias || []).forEach(m => {
      if (m.valorEstoque == null) m.valorEstoque = parseFloat(((m.qtd||0) * (m.custo||0)).toFixed(4));
    });
    return d;
  },
  // v11 → v12: nenhuma transformação de dados — ver comentário no histórico acima (item 12).
  // Só garante que o array exista, pra instalações antigas que carregam antes do merge com
  // DEFAULT_STATE (mesma cautela que semiacabados/rotas já tinham em carregarDados()).
  11: (d) => {
    d.pagamentosFornecedor = d.pagamentosFornecedor || [];
    return d;
  },
  // v12 → v13: nenhuma transformação de dados — ver comentário no histórico acima (item 13).
  12: (d) => d,
};

function migrarDados(parsed) {
  const fromVersion = parsed._version || 1;
  let d = parsed;
  for (let v = fromVersion; v < SCHEMA_VERSION; v++) {
    if (MIGRATIONS[v]) {
      try { d = MIGRATIONS[v](d); }
      catch(e) { console.warn(`[GestãoPRO] Falha na migração v${v}→v${v+1}:`, e); }
    }
  }
  d._version = SCHEMA_VERSION;
  return d;
}

function carregarDados(){
  try{
    const saved = localStorage.getItem(STORAGE_KEY);
    if(saved){
      const raw = JSON.parse(saved);
      const parsed = migrarDados(raw);
      // merge com defaults para garantir novas chaves futuras
      state = { ...DEFAULT_STATE, ...parsed };
      state.nextId      = { ...DEFAULT_STATE.nextId, ...parsed.nextId };
      if(!state.semiacabados) state.semiacabados=[];
      if(!state.rotas) state.rotas=[];
      if(!state.pagamentosFornecedor) state.pagamentosFornecedor=[];
      state._version    = SCHEMA_VERSION;
      showToast('Dados carregados ✓','green');
    } else {
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      state._version = SCHEMA_VERSION;
    }
  } catch(e){
    console.error('[GestãoPRO] Erro ao carregar dados, usando defaults:', e);
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    state._version = SCHEMA_VERSION;
  }
}

// ═══════════════════════════════════════════
// SISTEMA DE ATUALIZAÇÃO AUTOMÁTICA
// ═══════════════════════════════════════════
async function verificarAtualizacao(){
  const btn=document.getElementById('topbar-update');
  if(btn){btn.textContent='⏳';btn.disabled=true;}
  try{
    const resp=await fetch(UPDATE_URL+'?nocache='+Date.now());
    if(!resp.ok) throw new Error('Falha na conexão');
    const html=await resp.text();
    const match=html.match(/APP_VERSION\s*=\s*'([^']+)'/);
    if(!match) throw new Error('Versão não encontrada');
    const novaVersao=match[1];
    if(novaVersao===APP_VERSION){
      showToast('✅ Sistema já está na versão mais recente (v'+APP_VERSION+')','green');
      if(btn){btn.textContent='🔄';btn.disabled=false;}
      return;
    }
    abrirModalAtualizacao(novaVersao,html);
  }catch(e){
    showToast('❌ Erro ao verificar atualização: '+e.message,'red');
  }
  if(btn){btn.textContent='🔄';btn.disabled=false;}
}
function forcarLimpezaCache(){
  confirmarAcao('Isso limpa os arquivos guardados em cache e recarrega o app com a versão mais recente do servidor. Seus dados (vendas, clientes, estoque etc.) não são apagados — eles ficam salvos separadamente e continuam intactos. Continuar?', ()=>{
    aplicarAtualizacao();
  });
}
function abrirModalAtualizacao(novaVersao,html){
  let modal=document.getElementById('modal-update');
  if(!modal){
    modal=document.createElement('div');
    modal.id='modal-update';
    modal.className='modal-overlay';
    modal.innerHTML=`<div class="modal" style="max-width:360px">
      <div class="modal-header"><h3>🔄 Atualização Disponível</h3></div>
      <div class="modal-body">
        <p style="margin:0 0 10px">Nova versão disponível!</p>
        <div style="display:flex;justify-content:space-between;margin-bottom:18px;background:#F8F9FA;padding:12px;border-radius:8px">
          <span>Versão atual: <strong id="upd-atual"></strong></span>
          <span>→</span>
          <span>Nova: <strong id="upd-nova" style="color:var(--green)"></strong></span>
        </div>
        <p style="font-size:13px;color:var(--muted);margin:0 0 20px">✅ Seus dados serão preservados.</p>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn btn-outline" onclick="document.getElementById('modal-update').classList.remove('open')">Agora não</button>
          <button class="btn btn-primary" id="btn-aplicar-update">⬇ Atualizar agora</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(modal);
  }
  document.getElementById('upd-atual').textContent='v'+APP_VERSION;
  document.getElementById('upd-nova').textContent='v'+novaVersao;
  document.getElementById('btn-aplicar-update').onclick=()=>aplicarAtualizacao(html);
  modal.classList.add('open');
}
function aplicarAtualizacao(html){
  showToast('⬇ Aplicando atualização...','');
  // Salvar dados antes
  try{
    state._version=SCHEMA_VERSION;
    localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  }catch(e){}
  // Limpar Service Worker e caches (evita servir versão antiga guardada offline)
  const limpezas=[];
  if('serviceWorker' in navigator){
    limpezas.push(
      navigator.serviceWorker.getRegistrations().then(regs=>Promise.all(regs.map(r=>r.unregister())))
    );
  }
  if('caches' in window){
    limpezas.push(
      caches.keys().then(names=>Promise.all(names.map(n=>caches.delete(n))))
    );
  }
  Promise.all(limpezas).catch(()=>{}).finally(()=>{
    setTimeout(()=>{
      const base=location.origin+location.pathname;
      window.location.href=base+'?atualizado='+Date.now();
    },400);
  });
}
// Exibir versão no footer
document.addEventListener('DOMContentLoaded',()=>{
  const el=document.getElementById('versao-atual');
  if(el) el.textContent=APP_VERSION;
});
// ═══════════════════════════════════════════

function salvarDados(){
  try{
    state._version = SCHEMA_VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    state.dados_alterados=false;
    const btn = document.getElementById('topbar-save');
    btn.textContent = '✅';
    btn.classList.add('saved');
    btn.classList.remove('unsaved');
    setTimeout(()=>{btn.textContent='💾';btn.classList.remove('saved');},2000);
  } catch(e){
    showToast('Erro ao salvar dados','red');
  }
}

// Auto-save a cada 60s
setInterval(()=>{
  try{
    if(state){ state._version = SCHEMA_VERSION; }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch(e){}
},60000);

// Salvar automaticamente ao fechar/sair
window.addEventListener('beforeunload',()=>{
  if(state&&state.dados_alterados){
    try{
      state._version=SCHEMA_VERSION;
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
      state.dados_alterados=false;
    }catch(e){}
  }
});

// ============ HELPERS ============
const fmt=(v)=>'R$ '+parseFloat(v||0).toFixed(2).replace('.',',');
// CORREÇÃO CRÍTICA (v5.21.0): a versão anterior usava new Date().toISOString(), que é sempre em
// UTC. Brasil = UTC-3 sem DST — entre 21h00 e 23h59 no horário local, o UTC já virou o dia
// seguinte, então today() gravava a data de AMANHÃ em toda venda/pagamento/compra/produção/
// lançamento feito nesse intervalo, contaminando DRE, Fechamento Mensal, vencimentos e o
// "Vendas Hoje" do dashboard silenciosamente. Monta a data a partir dos componentes locais
// (getFullYear/getMonth/getDate), que já respeitam o fuso do dispositivo.
const today=()=>{
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const fmtDate=(d)=>{if(!d)return'';const[y,m,dd]=d.split('-');return`${dd}/${m}/${y}`};
// Escapa no PONTO DE INTERPOLAÇÃO em HTML (não na origem/getters compartilhados como
// getCliente/getProduto/getNomeCompletoItem, que também alimentam texto puro de WhatsApp —
// escapar ali corromperia a mensagem, ex: "&" virando "&amp;" visível pro cliente).
function escapeHtml(str){
  if(str==null) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
function diasParaVencimento(venc,hoje){
  // retorna número de dias: negativo = já venceu, 0 = vence hoje, positivo = vence em X dias
  const v=new Date(venc+'T00:00:00'), h=new Date(hoje+'T00:00:00');
  return Math.round((v-h)/86400000);
}
function vencBadge(venc,hoje){
  const dias=diasParaVencimento(venc,hoje);
  if(dias<0) return `<span class="badge badge-red" title="Venceu em ${fmtDate(venc)}">⚠️ ${Math.abs(dias)}d atraso</span>`;
  if(dias===0) return `<span class="badge badge-red">🔴 Vence hoje</span>`;
  if(dias===1) return `<span class="badge badge-orange">🟠 Vence amanhã</span>`;
  if(dias<=3) return `<span class="badge badge-yellow">🟡 ${dias}d p/ vencer</span>`;
  if(dias<=7) return `<span class="badge badge-yellow" style="opacity:.85">⏳ ${dias}d p/ vencer</span>`;
  return `<span style="font-size:12px;color:var(--muted)">${fmtDate(venc)}</span>`;
}
// Convenção: campo "ativo" ausente = ativo (evita precisar migrar registros antigos).
function estaAtivo(obj){return obj && obj.ativo!==false}
function getCliente(id){return state.clientes.find(c=>c.id==id)||{nome:'?',tel:''}}
function getProduto(id){return state.produtos.find(p=>p.id==id)||{nome:'?',preco:0,estoque:0}}
function getSemiacabado(id){return (state.semiacabados||[]).find(s=>s.id==id)||{nome:'?',estoque:0}}
function getMateria(id){return state.materias.find(m=>m.id==id)||{nome:'?',custo:0,unidade:'',qtd:0}}

// ============ CUSTO MÉDIO PONDERADO (CMP) DE MATÉRIA-PRIMA ============
// Antes, "custo" era sobrescrito a cada compra (= custo da ÚLTIMA compra), o que fazia o custo
// do produto (e a margem em Precificação/Simulador) pular pra cima ou pra baixo só porque um
// fornecedor cobrou diferente numa entrega específica. Agora mantemos "valorEstoque" (valor
// total em R$ do estoque atual) como livro-razão: toda ENTRADA soma quantidade e valor; toda
// SAÍDA subtrai quantidade e valor ao custo médio vigente. custo = valorEstoque / qtd, sempre.
// Isso é o método contábil de "custo médio móvel" (moving average cost), o padrão pra estoque
// fungível (você não sabe fisicamente qual litro de essência veio de qual compra).
// Convenção igual às outras migrações: mp.valorEstoque ausente = calcula on-the-fly (fallback),
// só é gravado de fato a partir da primeira entrada/saída processada por estas funções.
function valorEstoqueMateria(mp){
  return mp.valorEstoque!=null ? mp.valorEstoque : (mp.qtd||0)*(mp.custo||0);
}
// Toda ENTRADA de matéria-prima (compra, entrada manual de estoque) deve passar por aqui.
function registrarEntradaMateria(mp, qtd, custoUnitario){
  if(!mp || qtd<=0) return;
  const valorAntes=valorEstoqueMateria(mp);
  mp.valorEstoque=parseFloat((valorAntes + qtd*custoUnitario).toFixed(4));
  mp.qtd=parseFloat(((mp.qtd||0) + qtd).toFixed(4));
  mp.custo=mp.qtd>0.0001 ? parseFloat((mp.valorEstoque/mp.qtd).toFixed(4)) : custoUnitario;
}
// Toda SAÍDA de matéria-prima (consumo em produção, baixa manual) deve passar por aqui.
// Sai sempre ao custo médio ATUAL — é a própria definição do método: o custo por unidade não
// muda numa saída, só a quantidade e o valor total.
function registrarSaidaMateria(mp, qtd){
  if(!mp || qtd<=0) return;
  const custoAtual=mp.custo||0;
  mp.valorEstoque=parseFloat((valorEstoqueMateria(mp) - qtd*custoAtual).toFixed(4));
  mp.qtd=parseFloat(((mp.qtd||0) - qtd).toFixed(4));
  if(mp.qtd<=0.0001){mp.qtd=Math.max(0,mp.qtd);mp.valorEstoque=0;} // evita ficar com resto negativo/sujo por arredondamento
}
// Usado ao excluir uma compra: desfaz exatamente a entrada que ela tinha causado.
// Limitação honesta: se já houve consumo (produção/baixa) DEPOIS dessa compra, o custo médio
// resultante é uma aproximação — custo médio móvel não é perfeitamente reversível quando há
// saída no meio do caminho (a saída já "gastou" ao custo médio de então, que incluía esta
// compra). É a mesma limitação que existe em praticamente qualquer ERP com custo médio; a
// prática usual lá também é evitar excluir compras de períodos já com movimento.
function reverterEntradaMateria(mp, qtd, custoUnitario){
  if(!mp || qtd<=0) return;
  mp.valorEstoque=parseFloat((valorEstoqueMateria(mp) - qtd*custoUnitario).toFixed(4));
  mp.qtd=parseFloat(Math.max(0,(mp.qtd||0) - qtd).toFixed(4));
  mp.custo=mp.qtd>0.0001 ? parseFloat((mp.valorEstoque/mp.qtd).toFixed(4)) : 0;
  if(mp.valorEstoque<0) mp.valorEstoque=0;
}
// true se já existe produção usando esta matéria-prima registrada depois da data informada —
// usado só pra avisar o usuário que excluir uma compra antiga pode deixar o CMP aproximado.
function materiaTeveConsumoApos(materiaId,data){
  return state.producoes.some(p=>p.data>data && (p.consumo||[]).some(c=>(c.tipo||'mp')==='mp' && c.mpId===materiaId));
}
function getFornecedor(id){return state.fornecedores.find(f=>f.id==id)||null}
// Matérias-primas não ficam ordenadas em state.materias (são só empilhadas na ordem em que
// foram cadastradas). Esta função devolve a lista pronta pra exibir (lista e dropdowns),
// sem alterar a ordem/índices salvos no state.
function materiasOrdenadas(){
  return [...state.materias].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR',{sensitivity:'base'}));
}
function getVariante(produtoId,varianteId){
  if(!varianteId) return null;
  const p=getProduto(produtoId);
  return (p.variantes||[]).find(v=>v.id==varianteId)||null;
}
function getNomeCompletoItem(produtoId,varianteId){
  const p=getProduto(produtoId);if(!p)return'Produto removido';
  const v=getVariante(produtoId,varianteId);
  const tam=p.tamanho?` ${p.tamanho}`:'';
  return v?`${p.nome}${tam} — ${v.nome}`:`${p.nome}${tam}`;
}
function getEstoqueAtual(produtoId,varianteId){
  if(varianteId){const v=getVariante(produtoId,varianteId);return v?v.estoque:0;}
  return getProduto(produtoId).estoque;
}
function ajustarEstoque(produtoId,varianteId,delta){
  const p=state.produtos.find(p=>p.id==produtoId);
  if(!p)return;
  if(varianteId){
    const v=(p.variantes||[]).find(v=>v.id==varianteId);
    if(v) v.estoque+=delta;
  } else {
    p.estoque+=delta;
  }
}
function getFichaProdutoVariante(produtoId,varianteId){
  if(varianteId){
    const key=`${produtoId}-${varianteId}`;
    if(state.fichasVariante[key]) return state.fichasVariante[key];
  }
  return state.fichas[produtoId]||[];
}
// Rendimento = quantas unidades a ficha (as quantidades de ingrediente cadastradas) produz.
// Sem valor definido = 1 (quantidades já são "por unidade", comportamento de sempre).
function getRendimentoFicha(produtoId,varianteId){
  if(varianteId){
    const key=`${produtoId}-${varianteId}`;
    if(state.fichaRendimento[key]) return state.fichaRendimento[key];
  }
  return state.fichaRendimento[produtoId]||1;
}
function setRendimentoFicha(produtoId,varianteId,valor){
  const key=varianteId?`${produtoId}-${varianteId}`:produtoId;
  state.fichaRendimento[key]=valor||1;
}
function calcularCustoFicha(produtoId,varianteId,qtd=1){
  const ficha=getFichaProdutoVariante(produtoId,varianteId);
  const rendimento=getRendimentoFicha(produtoId,varianteId)||1;
  return ficha.reduce((s,f)=>s+((f.qtd/rendimento)*qtd*custoItemFicha(f.tipo||'mp',f.mpId)),0);
}
function nextId(k){return state.nextId[k]++}
function debounce(fn,delay=220){
  let t=null;
  return function(...args){clearTimeout(t);t=setTimeout(()=>fn.apply(this,args),delay);};
}
function getSaldoCliente(cId){
  const totalFiado=state.vendas.filter(v=>v.clienteId==cId&&v.forma=='fiado').reduce((s,v)=>s+v.total,0);
  const totalPago=state.pagamentos.filter(p=>p.clienteId==cId).reduce((s,p)=>s+p.valor,0);
  return Math.max(0,totalFiado-totalPago);
}

// ============ SITUAÇÃO DE PAGAMENTO (FIADO / PARCELADO) ============
// O saldo devedor é um "poço" único por cliente: os pagamentos (state.pagamentos) não ficam
// vinculados a uma venda ou parcela específica. Estas funções calculam, na hora (nunca
// gravado/cacheado), quais parcelas/vendas fiado já estão cobertas por esse total pago,
// alocando o valor pago das dívidas mais antigas (por vencimento) para as mais novas — FIFO.
// Isso resolve dois problemas do modelo antigo:
//  1) pagar um valor "quebrado" (que não bate com uma parcela exata) agora é distribuído
//     automaticamente entre as parcelas em aberto, começando pela mais antiga;
//  2) uma parcela/venda só continua aparecendo "em atraso" se, de fato, ainda não foi coberta
//     pelo total pago pelo cliente até agora.
function getUnidadesFiadoFlat(){
  const porCliente={};
  state.vendas.forEach(v=>{
    if(v.tipo==='orcamento'||v.forma!=='fiado')return;
    (porCliente[v.clienteId]=porCliente[v.clienteId]||[]).push(v);
  });
  const flat=[];
  Object.keys(porCliente).forEach(cIdStr=>{
    const cId=parseInt(cIdStr);
    const unidades=[];
    porCliente[cIdStr].forEach(v=>{
      if(v.parcelado&&Array.isArray(v.parcelas)&&v.parcelas.length>0){
        v.parcelas.forEach((p,idx)=>unidades.push({
          clienteId:cId,vendaId:v.id,parcelaIdx:idx,parcelaNum:idx+1,parcelaTotal:v.parcelas.length,
          valor:p.valor,vencimento:p.vencimento,data:v.data
        }));
      } else {
        unidades.push({
          clienteId:cId,vendaId:v.id,parcelaIdx:null,parcelaNum:null,parcelaTotal:null,
          valor:v.total,vencimento:v.vencimento,data:v.data
        });
      }
    });
    // ordena da dívida mais antiga para a mais nova (por vencimento; sem vencimento, pela data da venda)
    unidades.sort((a,b)=>(a.vencimento||a.data||'').localeCompare(b.vencimento||b.data||'')||(a.data||'').localeCompare(b.data||''));
    let saldoPago=state.pagamentos.filter(p=>p.clienteId==cId).reduce((s,p)=>s+p.valor,0);
    unidades.forEach(u=>{
      let status,valorPago;
      if(saldoPago<=0.009){ status='aberto'; valorPago=0; }
      else if(saldoPago>=u.valor-0.009){ status='pago'; valorPago=u.valor; saldoPago-=u.valor; }
      else { status='parcial'; valorPago=saldoPago; saldoPago=0; }
      u.status=status; u.valorPago=valorPago; u.valorRestante=Math.max(0,u.valor-valorPago);
      flat.push(u);
    });
  });
  return flat;
}
// Agrupa as unidades por venda (útil pra tela de Vendas: 1 linha por venda, mesmo parcelada)
function getMapaSituacaoFiado(){
  const flat=getUnidadesFiadoFlat();
  const mapa={};
  flat.forEach(u=>{
    if(!mapa[u.vendaId]) mapa[u.vendaId]={parcelas:[],statusList:[]};
    mapa[u.vendaId].parcelas.push(u);
    mapa[u.vendaId].statusList.push(u.status);
  });
  Object.keys(mapa).forEach(vid=>{
    const m=mapa[vid];
    m.parcelas.sort((a,b)=>(a.parcelaNum||0)-(b.parcelaNum||0));
    m.status = m.statusList.every(s=>s==='pago') ? 'pago' : (m.statusList.every(s=>s==='aberto') ? 'em_aberto' : 'parcial');
    const pendente = m.parcelas.find(p=>p.status!=='pago');
    m.vencimentoPendente = pendente ? pendente.vencimento : null;
    m.valorRestante = m.parcelas.reduce((s,p)=>s+p.valorRestante,0);
    m.pagas = m.statusList.filter(s=>s==='pago').length;
    m.totalParcelas = m.parcelas.length;
  });
  return mapa;
}
// Situação "efetiva" de uma venda: pra vendas não-fiado, é sempre o status gravado (pago).
// Pra fiado (simples ou parcelado), vem do cálculo FIFO acima.
function situacaoVenda(v,mapaOpcional){
  if(v.tipo==='orcamento'||v.forma!=='fiado'){
    return {status:v.status,vencimentoPendente:v.status!=='pago'?v.vencimento:null,valorRestante:0,parcelas:null,pagas:0,totalParcelas:0};
  }
  const mapa=mapaOpcional||getMapaSituacaoFiado();
  const m=mapa[v.id];
  if(!m) return {status:'pago',vencimentoPendente:null,valorRestante:0,parcelas:v.parcelado?[]:null,pagas:v.parcelado?(v.parcelas||[]).length:0,totalParcelas:v.parcelado?(v.parcelas||[]).length:0};
  return {status:m.status,vencimentoPendente:m.vencimentoPendente,valorRestante:m.valorRestante,parcelas:v.parcelado?m.parcelas:null,pagas:m.pagas,totalParcelas:m.totalParcelas};
}
// Quanto falta pagar (a partir de agora) pra que uma unidade específica (venda ou parcela)
// fique quitada, respeitando a ordem FIFO — ou seja, também quita tudo que é mais antigo que
// ela e ainda está em aberto. Usado pelas ações "marcar como pago".
function valorParaQuitarAte(clienteId,vendaId,parcelaIdx){
  const flat=getUnidadesFiadoFlat().filter(u=>u.clienteId==clienteId);
  flat.sort((a,b)=>(a.vencimento||a.data||'').localeCompare(b.vencimento||b.data||'')||(a.data||'').localeCompare(b.data||''));
  let soma=0;
  for(const u of flat){
    if(u.status!=='pago') soma+=u.valorRestante;
    if(u.vendaId===vendaId && (parcelaIdx==null?true:u.parcelaIdx===parcelaIdx)) break;
  }
  return parseFloat(soma.toFixed(2));
}

// ============ CONTAS A PAGAR (FORNECEDOR) ============
// Espelha 1:1 o motor de "fiado do cliente" acima, só que do lado do fornecedor. Mesma lógica
// de saldo único por fornecedor (não por compra), mesma alocação FIFO das dívidas mais antigas.
// Uma compra só entra aqui se formaPagamento==='prazo' — compra "à vista" (o padrão histórico,
// inclusive todo o histórico anterior a esta versão, que não tinha esse campo) já lança a saída
// no Financeiro na hora do registro, exatamente como sempre foi; não é "dívida" nenhuma.
function getSaldoFornecedor(fId){
  const totalPrazo=state.compras.filter(c=>c.fornecedorId==fId&&c.formaPagamento==='prazo').reduce((s,c)=>s+c.total,0);
  const totalPago=state.pagamentosFornecedor.filter(p=>p.fornecedorId==fId).reduce((s,p)=>s+p.valor,0);
  return Math.max(0,totalPrazo-totalPago);
}
function getUnidadesPagarFlat(){
  const porFornecedor={};
  state.compras.forEach(c=>{
    if(c.formaPagamento!=='prazo')return;
    (porFornecedor[c.fornecedorId]=porFornecedor[c.fornecedorId]||[]).push(c);
  });
  const flat=[];
  Object.keys(porFornecedor).forEach(fIdStr=>{
    const fId=parseInt(fIdStr);
    const unidades=[];
    porFornecedor[fIdStr].forEach(c=>{
      if(c.parcelado&&Array.isArray(c.parcelas)&&c.parcelas.length>0){
        c.parcelas.forEach((p,idx)=>unidades.push({
          fornecedorId:fId,compraId:c.id,parcelaIdx:idx,parcelaNum:idx+1,parcelaTotal:c.parcelas.length,
          valor:p.valor,vencimento:p.vencimento,data:c.data,materiaNome:getMateria(c.materiaId).nome
        }));
      } else {
        unidades.push({
          fornecedorId:fId,compraId:c.id,parcelaIdx:null,parcelaNum:null,parcelaTotal:null,
          valor:c.total,vencimento:c.vencimento,data:c.data,materiaNome:getMateria(c.materiaId).nome
        });
      }
    });
    unidades.sort((a,b)=>(a.vencimento||a.data||'').localeCompare(b.vencimento||b.data||'')||(a.data||'').localeCompare(b.data||''));
    let saldoPago=state.pagamentosFornecedor.filter(p=>p.fornecedorId==fId).reduce((s,p)=>s+p.valor,0);
    unidades.forEach(u=>{
      let status,valorPago;
      if(saldoPago<=0.009){ status='aberto'; valorPago=0; }
      else if(saldoPago>=u.valor-0.009){ status='pago'; valorPago=u.valor; saldoPago-=u.valor; }
      else { status='parcial'; valorPago=saldoPago; saldoPago=0; }
      u.status=status; u.valorPago=valorPago; u.valorRestante=Math.max(0,u.valor-valorPago);
      flat.push(u);
    });
  });
  return flat;
}
function getMapaSituacaoPagar(){
  const flat=getUnidadesPagarFlat();
  const mapa={};
  flat.forEach(u=>{
    if(!mapa[u.compraId]) mapa[u.compraId]={parcelas:[],statusList:[]};
    mapa[u.compraId].parcelas.push(u);
    mapa[u.compraId].statusList.push(u.status);
  });
  Object.keys(mapa).forEach(cid=>{
    const m=mapa[cid];
    m.parcelas.sort((a,b)=>(a.parcelaNum||0)-(b.parcelaNum||0));
    m.status = m.statusList.every(s=>s==='pago') ? 'pago' : (m.statusList.every(s=>s==='aberto') ? 'em_aberto' : 'parcial');
    const pendente = m.parcelas.find(p=>p.status!=='pago');
    m.vencimentoPendente = pendente ? pendente.vencimento : null;
    m.valorRestante = m.parcelas.reduce((s,p)=>s+p.valorRestante,0);
    m.pagas = m.statusList.filter(s=>s==='pago').length;
    m.totalParcelas = m.parcelas.length;
  });
  return mapa;
}
// Situação "efetiva" de uma compra: à vista é sempre 'pago' (já gerou a saída na hora). A prazo
// vem do cálculo FIFO acima.
function situacaoCompra(c,mapaOpcional){
  if(c.formaPagamento!=='prazo'){
    return {status:'pago',vencimentoPendente:null,valorRestante:0,parcelas:null,pagas:0,totalParcelas:0};
  }
  const mapa=mapaOpcional||getMapaSituacaoPagar();
  const m=mapa[c.id];
  if(!m) return {status:'pago',vencimentoPendente:null,valorRestante:0,parcelas:c.parcelado?[]:null,pagas:c.parcelado?(c.parcelas||[]).length:0,totalParcelas:c.parcelado?(c.parcelas||[]).length:0};
  return {status:m.status,vencimentoPendente:m.vencimentoPendente,valorRestante:m.valorRestante,parcelas:c.parcelado?m.parcelas:null,pagas:m.pagas,totalParcelas:m.totalParcelas};
}
function valorParaQuitarAteFornecedor(fornecedorId,compraId,parcelaIdx){
  const flat=getUnidadesPagarFlat().filter(u=>u.fornecedorId==fornecedorId);
  flat.sort((a,b)=>(a.vencimento||a.data||'').localeCompare(b.vencimento||b.data||'')||(a.data||'').localeCompare(b.data||''));
  let soma=0;
  for(const u of flat){
    if(u.status!=='pago') soma+=u.valorRestante;
    if(u.compraId===compraId && (parcelaIdx==null?true:u.parcelaIdx===parcelaIdx)) break;
  }
  return parseFloat(soma.toFixed(2));
}

function showToast(msg,type=''){
  const t=document.getElementById('toast');
  t.textContent=msg;t.className='toast '+(type||'');
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3000);
}
function getUltimosMeses(n){
  const meses=[];
  const d=new Date();
  for(let i=n-1;i>=0;i--){
    const dt=new Date(d.getFullYear(),d.getMonth()-i,1);
    meses.push(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`);
  }
  return meses;
}
function marcarAlterado(){
  state.dados_alterados=true;
}
function nomeArquivoBackup(){
  const now=new Date();
  const hora=`${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
  return `gestaopro-backup-${today()}-${hora}.json`;
}
function exportarBackup(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  const nomeArquivo=nomeArquivoBackup();
  a.download=nomeArquivo;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
  state.ultimoBackup=Date.now();
  state.snoozeBackupAte=null;
  salvarDados();
  document.getElementById('backup-exportado-nome').textContent='📄 '+nomeArquivo;
  openModal('modal-backup-exportado');
  window.open('https://github.com/Ferreira00Group/gestaopro','_blank');
}
async function compartilharBackup(){
  const nomeArquivo=nomeArquivoBackup();
  const conteudo=JSON.stringify(state,null,2);
  try{
    const file=new File([conteudo],nomeArquivo,{type:'application/json'});
    if(navigator.canShare && navigator.canShare({files:[file]})){
      await navigator.share({
        files:[file],
        title:'Backup GestãoPRO',
        text:'Backup do sistema GestãoPRO — '+fmtDate(today())
      });
      state.ultimoBackup=Date.now();
      state.snoozeBackupAte=null;
      salvarDados();
      showToast('Backup compartilhado ✓','green');
      return;
    }
  }catch(e){
    if(e.name==='AbortError')return; // usuário cancelou o compartilhamento, tudo bem
  }
  // Navegador não suporta compartilhar arquivo diretamente (ex: alguns desktops) -> baixa normalmente
  exportarBackup();
}
function importarBackup(input){
  const file=input.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=(e)=>{
    try{
      const raw=JSON.parse(e.target.result);
      confirmarAcao('Isso vai substituir todos os dados atuais pelos do backup. Continuar?',()=>{
        const parsed=migrarDados(raw);
        state={...DEFAULT_STATE,...parsed};
        state.nextId={...DEFAULT_STATE.nextId,...(parsed.nextId||{})};
        state._version=SCHEMA_VERSION;
        salvarDados();
        showToast('Backup importado ✓','green');
        const pg=document.querySelector('.page.active');
        if(pg) render(pg.id.replace('page-',''));
        renderDashboard();
      });
    }catch(err){showToast('Arquivo inválido','red');}
  };
  reader.readAsText(file);
  input.value='';
}

// ============ LEMBRETE AUTOMÁTICO DE BACKUP ============
// Não faz backup sozinho (o navegador não deixa uma página web escrever
// direto no Google Drive/e-mail sem o usuário participar), mas garante que
// ninguém esqueça: verifica há quanto tempo não se faz backup e, se passou
// do limite, oferece o compartilhamento com um toque.
const LIMIAR_DIAS_BACKUP = 3;

function diasDesde(timestamp){
  if(!timestamp) return Infinity;
  return (Date.now()-timestamp)/(1000*60*60*24);
}

function temDadosRelevantes(){
  // evita incomodar em uma instalação nova, ainda vazia
  return (state.vendas&&state.vendas.length>0) || (state.producoes&&state.producoes.length>0) || (state.clientes&&state.clientes.length>0);
}

function verificarLembreteBackup(){
  if(!temDadosRelevantes()) return;
  const lockScreen=document.getElementById('lock-screen');
  if(lockScreen && lockScreen.style.display==='flex') return; // espera desbloquear primeiro
  if(state.snoozeBackupAte && Date.now()<state.snoozeBackupAte) return;
  if(diasDesde(state.ultimoBackup) < LIMIAR_DIAS_BACKUP) return;

  const dias = state.ultimoBackup ? Math.floor(diasDesde(state.ultimoBackup)) : null;
  document.getElementById('lembrete-backup-texto').textContent = dias!==null
    ? `Já fazem ${dias} dias desde o último backup. Seus dados ficam só neste aparelho — vale a pena fazer um agora.`
    : 'Você ainda não fez nenhum backup. Seus dados ficam só neste aparelho — se ele perder ou quebrar, tudo se vai. Vale a pena fazer um agora.';
  openModal('modal-lembrete-backup');
}

function lembreteBackupAgora(){
  closeModal('modal-lembrete-backup');
  compartilharBackup();
}

function lembreteBackupDepois(){
  state.snoozeBackupAte = Date.now() + (1000*60*60*24); // pergunta de novo amanhã
  marcarAlterado();
  closeModal('modal-lembrete-backup');
}

// ============ BUSCA GLOBAL ============
function buscaGlobal(termo){
  state.global_search=termo;
  const el=document.getElementById('busca-global-resultados');
  if(!el)return;
  if(!termo||termo.trim().length<2){el.style.display='none';el.innerHTML='';return;}
  const t=termo.toLowerCase();
  const resClientes=state.clientes.filter(c=>c.nome.toLowerCase().includes(t)||(c.tel||'').includes(t)).slice(0,4);
  const resProdutos=state.produtos.filter(p=>p.nome.toLowerCase().includes(t)||(p.sku||'').toLowerCase().includes(t)||(p.categoria||'').toLowerCase().includes(t)).slice(0,4);
  const resVendas=state.vendas.filter(v=>getCliente(v.clienteId).nome.toLowerCase().includes(t)).slice(0,4);
  if(resClientes.length===0&&resProdutos.length===0&&resVendas.length===0){
    el.innerHTML='<div style="padding:14px;color:var(--muted);font-size:13px">Nenhum resultado encontrado</div>';
    el.style.display='block';return;
  }
  let html='';
  if(resClientes.length){html+=`<div class="busca-grupo-titulo">👥 Clientes</div>`+resClientes.map(c=>`<div class="busca-item" onclick="irParaCliente(${c.id})"><strong>${escapeHtml(c.nome)}</strong><span>${escapeHtml(c.tel||'')}</span></div>`).join('');}
  if(resProdutos.length){html+=`<div class="busca-grupo-titulo">📦 Produtos</div>`+resProdutos.map(p=>`<div class="busca-item" onclick="goto('estoque');fecharBuscaGlobal()"><strong>${escapeHtml(p.nome)}</strong><span>${escapeHtml(p.sku||'')} ${p.categoria?'· '+escapeHtml(p.categoria):''}</span></div>`).join('');}
  if(resVendas.length){html+=`<div class="busca-grupo-titulo">🛒 Vendas</div>`+resVendas.map(v=>`<div class="busca-item" onclick="goto('vendas');fecharBuscaGlobal()"><strong>${escapeHtml(getCliente(v.clienteId).nome)}</strong><span>${fmtDate(v.data)} · ${fmt(v.total)}</span></div>`).join('');}
  el.innerHTML=html;
  el.style.display='block';
}
function irParaCliente(id){goto('clientes');fecharBuscaGlobal();setTimeout(()=>filterClientes(getCliente(id).nome),50);document.querySelector('#page-clientes .search-input').value=getCliente(id).nome;}
function mostrarResultadosBusca(){
  const inp=document.getElementById('busca-global-input');
  if(inp&&inp.value.trim().length>=2) buscaGlobal(inp.value);
}
function limparBusca(){
  const inp=document.getElementById('busca-global-input');
  if(inp){inp.value='';inp.focus();}
  const el=document.getElementById('busca-global-resultados');
  if(el){el.style.display='none';el.innerHTML='';}
  const btn=document.getElementById('busca-bar-clear');
  if(btn) btn.style.display='none';
}
function fecharBuscaGlobal(){
  const el=document.getElementById('busca-global-resultados');
  if(el){el.style.display='none';el.innerHTML='';}
}
// Mostrar/esconder botão X conforme digita
document.addEventListener('input',(e)=>{
  if(e.target.id==='busca-global-input'){
    const btn=document.getElementById('busca-bar-clear');
    if(btn) btn.style.display=e.target.value?'block':'none';
  }
});
document.addEventListener('click',(e)=>{
  const wrap=document.getElementById('busca-bar-wrap');
  if(wrap && !wrap.contains(e.target)) fecharBuscaGlobal();
});
document.addEventListener('keydown',(e)=>{if(e.key==='Escape')fecharBuscaGlobal();});


// ============ ALERTAS DE ESTOQUE ============
function getAlertasEstoque(){
  const baixoProdutos = [];
  state.produtos.forEach(p=>{
    if(p.variantes&&p.variantes.length>0){
      p.variantes.forEach(v=>{
        if(v.estoque<=p.minimo) baixoProdutos.push({nome:`${p.nome} — ${v.nome}`,estoque:v.estoque,minimo:p.minimo});
      });
    } else if(p.estoque<=p.minimo){
      baixoProdutos.push({nome:p.nome,estoque:p.estoque,minimo:p.minimo});
    }
  });
  const baixoMaterias = state.materias.filter(m=>m.qtd<=m.minimo);
  return {baixoProdutos, baixoMaterias, total: baixoProdutos.length + baixoMaterias.length};
}
function renderAlertasBanner(){
  // Banner removido — alertas agora ficam nos ícones do topbar
  if(typeof atualizarAlertBells==='function') atualizarAlertBells();
}
function renderAlertaEstoquePage(){
  const alertas = getAlertasEstoque();
  const el = document.getElementById('alerta-estoque-banner');
  if(!el) return;
  if(alertas.total===0){el.innerHTML='';return;}
  const itens = [...alertas.baixoProdutos.map(p=>`📦 ${p.nome}: ${p.estoque} un (mín: ${p.minimo})`),
    ...alertas.baixoMaterias.map(m=>`🧂 ${m.nome}: ${m.qtd}${m.unidade} (mín: ${m.minimo}${m.unidade})`)];
  const aberto = state.alerta_estoque_aberto?true:false;
  el.innerHTML=`<div class="alert-banner danger" style="flex-direction:column;align-items:stretch;gap:0;cursor:pointer;padding:0" onclick="toggleAlertaEstoque()">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px">
      <strong>⚠️ ${alertas.total} iten(s) com estoque abaixo do mínimo</strong>
      <span style="font-size:11px;transition:transform .2s;transform:rotate(${aberto?180:0}deg)">▾</span>
    </div>
    ${aberto?`<div style="font-size:12px;font-weight:500;opacity:.85;padding:0 16px 12px">${itens.join('  ·  ')}</div>`:''}
  </div>`;
}
function toggleAlertaEstoque(){
  state.alerta_estoque_aberto = !state.alerta_estoque_aberto;
  renderAlertaEstoquePage();
}

