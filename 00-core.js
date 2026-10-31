// Modelos de mensagem do CRM (v5.46). "seg" liga o modelo ao segmento de cliente em que ele é sugerido.
function crmModelosPadrao(){
  return [
    {nome:'Reativação',seg:'inativo',texto:'Olá, {nome}! Faz um tempo que não nos falamos (sua última compra foi em {ultima_compra}). Posso te ajudar com um novo pedido?'},
    {nome:'Recompra',seg:'recompra',texto:'Olá, {nome}, tudo bem? Pelo seu ritmo de compras, já deve estar na hora de repor. Quer que eu separe o pedido de sempre?'},
    {nome:'Agradecimento VIP',seg:'vip',texto:'Olá, {nome}! Passando para agradecer a parceria — você é um dos nossos melhores clientes. Qualquer necessidade, é só falar.'},
    {nome:'Pós-venda',seg:'posvenda',texto:'Olá, {nome}, tudo bem? Passando para saber se ficou tudo certo com seu último pedido e se posso ajudar em algo.'},
    {nome:'Cobrança amigável',seg:'cobranca',texto:'Olá, {nome}, tudo bem? Só um lembrete do saldo em aberto de {saldo}. Se já pagou, desconsidere. Qualquer dúvida, me chame.'},
  ];
}
function crmModelosSemente(){ return crmModelosPadrao().map((m,i)=>({...m,id:i+1})); }

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
  pix:{chave:'',tipo:'celular',nome:'',cidade:''},
  encargos:{ativo:false,multa:5,juros:3,carencia:0,pixComEncargos:false},
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
  movEstoque:[],
  semiacabados:[],
  renegociacoes:[],
  nextId:{clientes:4,produtos:9,materias:15,vendas:6,pagamentos:2,producoes:2,financeiro:4,fornecedores:4,compras:1,baixasEstoque:1,semiacabados:1,entradasEstoque:1,rotas:3,pagamentosFornecedor:1,movEstoque:1,crmLeads:1,crmNegocios:1,crmAtividades:1,crmNotas:1,crmModelos:6},
  crmNotas:[],
  crmModelos:crmModelosSemente(),
  crmLeads:[],
  crmNegocios:[],
  crmAtividades:[],
  crm_tab:'funil',
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

// ═══ PROTEÇÃO DE DADOS (v5.33.2) ═══
// Chaves extras no localStorage, FORA do state (por isso não entram em backup nem no Drive):
//  - SNAPSHOT_KEY: cópia do estado imediatamente ANTES de uma ação em lote (hoje: importar/
//    restaurar backup). Uma vaga só, sempre a mais recente. Alimenta "↩️ Restaurar estado anterior".
//  - RECUPERACAO_KEY_<timestamp>: texto bruto dos dados salvos quando NÃO puderam ser lidos
//    (JSON quebrado / formato inválido). Antes, o app caía nos dados de exemplo em silêncio e
//    o autosave de 60s sobrescrevia o original. Guarda as 2 cópias mais recentes.
const SNAPSHOT_KEY = STORAGE_KEY + '_snapshot_anterior';
const RECUPERACAO_KEY = STORAGE_KEY + '_recuperacao';
let _bloquearGravacao = false;   // true só se a cópia de recuperação NÃO coube no aparelho
let _estadoNaoConfiavel = false; // true quando o state atual são dados de exemplo por falha de leitura
let _gravacaoTimer = null;
let _avisouFalhaGravacao = false;

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
//   14 → novo array state.movEstoque: histórico de TODA movimentação de estoque
//        (venda, produção, compra, baixa/entrada manual, ajuste rápido − n +, cadastro), com
//        data/hora, variação e saldo após. Só passa a existir daqui pra frente: não dá pra
//        reconstruir o que aconteceu antes. Item avulso de venda ganha custo opcional, gravado
//        em "custoFichaUn" (mesmo campo dos produtos), pra margem dele não aparecer como 100%.
//   13 →  cada item de venda (state.vendas[].itens[]) ganha "custoFichaUn": um
//        retrato do custo da ficha técnica por unidade NO MOMENTO da venda. Sem isso, o
//        ranking de produtos em Relatório recalculava a margem de vendas antigas usando a
//        ficha técnica de HOJE — se o preço de uma matéria-prima mudasse, a margem de uma
//        venda de meses atrás mudava sozinha. Sem migração de dados: vendas antigas não têm
//        esse campo, e o relatório cai de volta pro cálculo pela ficha atual nesse caso (única
//        opção quando não sabemos o custo real da época — ver 09-financeiro-relatorios.js).//   15 → state.pix (Pix do celular: chave, tipo, nome, cidade) — v5.36. Chave digitada pelo
//        usuário, fica só no aparelho e no backup.
//   16 → state.encargos (multa/juros de atraso, desligado por padrão) — v5.37.
//   17 → CRM: state.crmLeads / crmNegocios / crmAtividades (+ nextId) — v5.44.
//   18 → (versão atual) CRM: state.crmNotas, state.crmModelos (modelos de mensagem, com 5 padrões) e tags nos clientes — v5.46.
const SCHEMA_VERSION = 18;

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
  // v13 → v14: cria o histórico de movimentação de estoque (vazio — não há como reconstruir o passado)
  13: (d) => {
    d.movEstoque = d.movEstoque || [];
    d.nextId = { ...(d.nextId||{}) };
    if(!(d.nextId.movEstoque>0)) d.nextId.movEstoque = 1;
    return d;
  },
  // v14 → v15: Pix do celular (v5.36)
  14: (d) => {
    d.pix = { chave:'', tipo:'celular', nome:'', cidade:'', ...(d.pix||{}) };
    return d;
  },
  // v15 → v16: encargos de atraso (v5.37) — nascem DESLIGADOS, carência 0
  15: (d) => {
    d.encargos = { ativo:false, multa:5, juros:3, carencia:0, pixComEncargos:false, ...(d.encargos||{}) };
    return d;
  },
  // v16 → v17: CRM (v5.44) — listas vazias e contadores de id
  16: (d) => {
    d.crmLeads = d.crmLeads || [];
    d.crmNegocios = d.crmNegocios || [];
    d.crmAtividades = d.crmAtividades || [];
    d.nextId = { ...(d.nextId||{}) };
    ['crmLeads','crmNegocios','crmAtividades'].forEach(k=>{ if(!(d.nextId[k]>0)) d.nextId[k]=1; });
    return d;
  },
  // v17 → v18: notas e modelos de mensagem do CRM (v5.46)
  17: (d) => {
    d.crmNotas = d.crmNotas || [];
    if(!Array.isArray(d.crmModelos)) d.crmModelos = crmModelosSemente();
    d.nextId = { ...(d.nextId||{}) };
    if(!(d.nextId.crmNotas>0)) d.nextId.crmNotas = 1;
    if(!(d.nextId.crmModelos>0)) d.nextId.crmModelos = d.crmModelos.reduce((m,x)=>Math.max(m,x.id||0),0)+1;
    return d;
  },
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

// Smoke-test de shape, não um validador de schema completo — pega "arquivo errado"/JSON de
// outra coisa/corrupção ANTES de mexer no state. Campo ausente é OK (merge com DEFAULT_STATE
// já cobre isso, mesma lógica de todas as migrações); campo PRESENTE com tipo errado é o sinal
// real de arquivo malformado (ex: alguém editou o JSON na mão e trocou um array por objeto).
const CAMPOS_BACKUP_ESPERADOS={clientes:'array',produtos:'array',vendas:'array',materias:'array',
  financeiro:'array',compras:'array',fornecedores:'array',pagamentos:'array',producoes:'array',movEstoque:'array',
  fichas:'object',nextId:'object',crmLeads:'array',crmNegocios:'array',crmAtividades:'array',crmNotas:'array',crmModelos:'array'};
function validarShapeBackup(obj){
  if(!obj||typeof obj!=='object'||Array.isArray(obj)) return false;
  for(const campo in CAMPOS_BACKUP_ESPERADOS){
    if(!(campo in obj)) continue;
    const tipo=CAMPOS_BACKUP_ESPERADOS[campo], valor=obj[campo];
    if(tipo==='array' && !Array.isArray(valor)) return false;
    if(tipo==='object' && (typeof valor!=='object'||Array.isArray(valor)||valor===null)) return false;
  }
  return true;
}

// Filtros e buscas das telas são temporários. Antes eles voltavam do armazenamento com a caixa de busca
// vazia e a lista ficava filtrada "no escuro" (ex.: Clientes mostrando só um nome).
function limparFiltrosDeTela(s){ Object.keys(s).forEach(k=>{ if(/_filter$/.test(k)) s[k]=''; }); return s; }
// Busca tolerante: ignora maiúsculas, acentos e a pontuação do telefone
function normBusca(s){ return String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }
function clienteCombinaBusca(c,q){
  const t=normBusca(q); if(!t) return true;
  if(normBusca(c.nome).includes(t)) return true;
  if(typeof fmtClienteNum==='function' && normBusca(fmtClienteNum(c.id)).includes(t.replace(/^#/,''))) return true;
  const d=String(q).replace(/\D/g,'');
  return d.length>=2 && String(c.tel||'').replace(/\D/g,'').includes(d);
}
function carregarDados(){
  let saved = null, carregouOk = false;
  try{
    saved = localStorage.getItem(STORAGE_KEY);
    if(saved){
      const raw = JSON.parse(saved);
      if(!validarShapeBackup(raw)) throw new Error('Formato de dados salvos inválido');
      const parsed = migrarDados(raw);
      // merge com defaults para garantir novas chaves futuras
      state = { ...DEFAULT_STATE, ...parsed };
      limparFiltrosDeTela(state);
      state.nextId      = { ...DEFAULT_STATE.nextId, ...parsed.nextId };
      if(!state.semiacabados) state.semiacabados=[];
      if(!state.rotas) state.rotas=[];
      if(!Array.isArray(state.renegociacoes)) state.renegociacoes=[];
      if(!state.pagamentosFornecedor) state.pagamentosFornecedor=[];
      if(!Array.isArray(state.movEstoque)) state.movEstoque=[];
      ['crmLeads','crmNegocios','crmAtividades'].forEach(k=>{ if(!Array.isArray(state[k])) state[k]=[]; });
      if(!Array.isArray(state.crmNotas)) state.crmNotas=[]; if(!Array.isArray(state.crmModelos)) state.crmModelos=crmModelosSemente();
      // a aba "Movimentações" não é restaurada ao reabrir o app (a tela volta em Produtos Acabados)
      if(state.estoque_tab==='movimentos') state.estoque_tab='produtos';
      state._version    = SCHEMA_VERSION;
      carregouOk = true;
    } else {
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      state._version = SCHEMA_VERSION;
    }
  } catch(e){
    console.error('[GestãoPRO] Erro ao carregar dados, usando defaults:', e);
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    state._version = SCHEMA_VERSION;
    // Havia dados salvos e não deu pra ler: guarda uma cópia ANTES de qualquer autosave
    // sobrescrever o original com os dados de exemplo.
    if(saved) protegerDadosIlegiveis(saved, e);
  }
  // fora do try: um erro só do toast não pode mais derrubar dados que foram lidos com sucesso
  if(carregouOk){ try{ showToast('Dados carregados ✓','green'); }catch(e){} }
  atualizarLinksProtecao();
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
      showToast('Sistema já está na versão mais recente (v'+APP_VERSION+')','green');
      if(btn){btn.textContent='🔄';btn.disabled=false;}
      return;
    }
    abrirModalAtualizacao(novaVersao,html);
  }catch(e){
    showToast('Erro ao verificar atualização: '+e.message,'red');
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
      <div class="modal-header"><h3>Atualização Disponível</h3></div>
      <div class="modal-body">
        <p style="margin:0 0 10px">Nova versão disponível!</p>
        <div style="display:flex;justify-content:space-between;margin-bottom:18px;background:var(--card-2);padding:12px;border-radius:8px">
          <span>Versão atual: <strong id="upd-atual"></strong></span>
          <span>→</span>
          <span>Nova: <strong id="upd-nova" style="color:var(--green)"></strong></span>
        </div>
        <p style="font-size:13px;color:var(--muted);margin:0 0 20px">Seus dados serão preservados.</p>
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
  if(_bloquearGravacao){
    showToast('Gravação pausada: não consegui ler seus dados antigos. Importe um backup ou baixe a cópia.','red');
    return;
  }
  try{
    state._version = SCHEMA_VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    state.dados_alterados=false;
    const btn = document.getElementById('topbar-save');
    btn.classList.add('saved');
    btn.classList.remove('unsaved');
    setTimeout(()=>{btn.classList.remove('saved');},2000);
  } catch(e){
    showToast('Erro ao salvar dados','red');
  }
}

// ── Gravação silenciosa (sem animação do botão 💾) ──
// Todo ponto do app que só chama marcarAlterado() (salvar venda, registrar pagamento, produção,
// baixa/entrada de estoque, excluir compra...) passa a gravar em ~0,4s por aqui. Antes, essas
// ações só ficavam em memória até o autosave de 60s ou o beforeunload — que no celular é
// pouco confiável — então fechar o app logo após uma venda podia perdê-la.
function gravarLocalAgora(){
  clearTimeout(_gravacaoTimer); _gravacaoTimer = null;
  if(!state || _bloquearGravacao) return false;
  const eraAlterado = state.dados_alterados;
  try{
    state._version = SCHEMA_VERSION;
    state.dados_alterados = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  }catch(e){
    state.dados_alterados = eraAlterado;
    console.warn('[GestãoPRO] Falha ao gravar no localStorage:', e);
    if(!_avisouFalhaGravacao){
      _avisouFalhaGravacao = true;
      try{ showToast('Não consegui salvar neste aparelho (sem espaço?). Faça um backup agora.','red'); }catch(_){}
    }
    return false;
  }
}
function agendarGravacao(){
  if(_gravacaoTimer) return; // já há uma gravação marcada: ela leva tudo que mudar até lá
  _gravacaoTimer = setTimeout(gravarLocalAgora, 400);
}

// Auto-save a cada 60s (rede de segurança)
setInterval(()=>{ if(state) gravarLocalAgora(); },60000);

// Salvar ao sair OU ao ir pra segundo plano (no celular, "pagehide"/"visibilitychange" são
// os eventos confiáveis; "beforeunload" muitas vezes nem dispara)
window.addEventListener('beforeunload',()=>{ if(state&&state.dados_alterados) gravarLocalAgora(); });
window.addEventListener('pagehide',()=>{ if(state&&state.dados_alterados) gravarLocalAgora(); });
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden' && state && state.dados_alterados) gravarLocalAgora();
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
  if(dias<0) return `<span class="badge badge-red" title="Venceu em ${fmtDate(venc)}">${Math.abs(dias)}d atraso</span>`;
  if(dias===0) return `<span class="badge badge-red">Vence hoje</span>`;
  if(dias===1) return `<span class="badge badge-orange">Vence amanhã</span>`;
  if(dias<=3) return `<span class="badge badge-yellow">${dias}d p/ vencer</span>`;
  if(dias<=7) return `<span class="badge badge-yellow" style="opacity:.85">${dias}d p/ vencer</span>`;
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
function registrarEntradaMateria(mp, qtd, custoUnitario, origem){
  if(!mp || qtd<=0) return;
  const valorAntes=valorEstoqueMateria(mp);
  mp.valorEstoque=parseFloat((valorAntes + qtd*custoUnitario).toFixed(4));
  mp.qtd=parseFloat(((mp.qtd||0) + qtd).toFixed(4));
  mp.custo=mp.qtd>0.0001 ? parseFloat((mp.valorEstoque/mp.qtd).toFixed(4)) : custoUnitario;
  registrarMovEstoque('m',mp.id,null,mp.nome,qtd,mp.qtd,origem,mp.unidade);
}
// Toda SAÍDA de matéria-prima (consumo em produção, baixa manual) deve passar por aqui.
// Sai sempre ao custo médio ATUAL — é a própria definição do método: o custo por unidade não
// muda numa saída, só a quantidade e o valor total.
function registrarSaidaMateria(mp, qtd, origem){
  if(!mp || qtd<=0) return;
  const qtdAntes=mp.qtd||0;
  const custoAtual=mp.custo||0;
  mp.valorEstoque=parseFloat((valorEstoqueMateria(mp) - qtd*custoAtual).toFixed(4));
  mp.qtd=parseFloat(((mp.qtd||0) - qtd).toFixed(4));
  if(mp.qtd<=0.0001){mp.qtd=Math.max(0,mp.qtd);mp.valorEstoque=0;} // evita ficar com resto negativo/sujo por arredondamento
  registrarMovEstoque('m',mp.id,null,mp.nome,mp.qtd-qtdAntes,mp.qtd,origem,mp.unidade);
}
// Usado ao excluir uma compra: desfaz exatamente a entrada que ela tinha causado.
// Limitação honesta: se já houve consumo (produção/baixa) DEPOIS dessa compra, o custo médio
// resultante é uma aproximação — custo médio móvel não é perfeitamente reversível quando há
// saída no meio do caminho (a saída já "gastou" ao custo médio de então, que incluía esta
// compra). É a mesma limitação que existe em praticamente qualquer ERP com custo médio; a
// prática usual lá também é evitar excluir compras de períodos já com movimento.
function reverterEntradaMateria(mp, qtd, custoUnitario, origem){
  if(!mp || qtd<=0) return;
  const qtdAntes=mp.qtd||0;
  mp.valorEstoque=parseFloat((valorEstoqueMateria(mp) - qtd*custoUnitario).toFixed(4));
  mp.qtd=parseFloat(Math.max(0,(mp.qtd||0) - qtd).toFixed(4));
  mp.custo=mp.qtd>0.0001 ? parseFloat((mp.valorEstoque/mp.qtd).toFixed(4)) : 0;
  if(mp.valorEstoque<0) mp.valorEstoque=0;
  registrarMovEstoque('m',mp.id,null,mp.nome,mp.qtd-qtdAntes,mp.qtd,origem||'estorno_compra',mp.unidade);
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
function ajustarEstoque(produtoId,varianteId,delta,origem){
  const p=state.produtos.find(p=>p.id==produtoId);
  if(!p)return; // item avulso de venda (sem produto) cai aqui: não mexe em estoque nem registra
  if(varianteId){
    const v=(p.variantes||[]).find(v=>v.id==varianteId);
    if(v){
      v.estoque+=delta;
      registrarMovEstoque('p',p.id,v.id,getNomeCompletoItem(p.id,v.id),delta,v.estoque,origem);
    }
  } else {
    p.estoque+=delta;
    registrarMovEstoque('p',p.id,null,getNomeCompletoItem(p.id,null),delta,p.estoque,origem);
  }
}
// Semiacabado: mesma ideia do ajustarEstoque (um lugar só para mexer no estoque, que já registra o histórico)
function ajustarSemiacabado(s,delta,origem){
  if(!s||!delta) return;
  s.estoque=parseFloat(((s.estoque||0)+delta).toFixed(4));
  registrarMovEstoque('s',s.id,null,s.nome,delta,s.estoque,origem,s.unidade);
}
// ═══ HISTÓRICO DE MOVIMENTAÇÃO DE ESTOQUE (v5.35.0) ═══
// Cada linha: quando, qual item, quanto variou (+/−), saldo depois e de onde veio ("origem").
// tipo: 'p' produto acabado (varId = variante) · 's' semiacabado · 'm' matéria-prima.
// O nome é gravado junto: se o item for renomeado/excluído depois, o histórico continua legível.
// Guarda só as últimas MOV_ESTOQUE_MAX linhas pra não encher o armazenamento do aparelho.
const MOV_ESTOQUE_MAX = 5000;
function registrarMovEstoque(tipo,itemId,varId,nome,delta,saldo,origem,unidade){
  delta=parseFloat((Number(delta)||0).toFixed(4));
  if(!delta) return;
  if(!Array.isArray(state.movEstoque)) state.movEstoque=[];
  if(!(state.nextId.movEstoque>0)) state.nextId.movEstoque=1;
  const agora=Date.now();
  state.movEstoque.push({id:nextId('movEstoque'),ts:agora,data:today(),tipo,itemId,varId:varId||null,
    nome:nome||'?',delta,saldo:parseFloat((Number(saldo)||0).toFixed(4)),origem:origem||'outro',...(unidade?{un:unidade}:{})});
  if(state.movEstoque.length>MOV_ESTOQUE_MAX) state.movEstoque.splice(0,state.movEstoque.length-MOV_ESTOQUE_MAX);
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
  // Renegociação (v5.42): a dívida antiga (base) é baixada e entra a nova (total = base ± encargos)
  const rn=(state.renegociacoes||[]).filter(r=>r.clienteId==cId);
  if(rn.length){
    const novaDivida=rn.reduce((s,r)=>s+r.total,0), baixa=rn.reduce((s,r)=>s+r.base,0);
    return Math.max(0,Math.round((totalFiado+novaDivida-totalPago-baixa)*100)/100);
  }
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
  // cliente só com renegociação (sem venda fiado) também precisa gerar unidades
  (state.renegociacoes||[]).forEach(r=>{ if(!porCliente[r.clienteId]) porCliente[r.clienteId]=[]; });
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
    // pagamentos + baixa das renegociações (a baixa quita as unidades ANTIGAS; as parcelas novas vêm depois)
    let saldoPago=state.pagamentos.filter(p=>p.clienteId==cId).reduce((s,p)=>s+p.valor,0)
      +(state.renegociacoes||[]).filter(r=>r.clienteId==cId).reduce((s,r)=>s+r.base,0);
    unidades.forEach(u=>{
      let status,valorPago;
      if(saldoPago<=0.009){ status='aberto'; valorPago=0; }
      else if(saldoPago>=u.valor-0.009){ status='pago'; valorPago=u.valor; saldoPago-=u.valor; }
      else { status='parcial'; valorPago=saldoPago; saldoPago=0; }
      u.status=status; u.valorPago=valorPago; u.valorRestante=Math.max(0,u.valor-valorPago);
      flat.push(u);
    });
    // Parcelas das renegociações (v5.42): renegociações já substituídas por outra consomem
    // pagamento primeiro (ficam ocultas); depois as ativas, por vencimento.
    const ru=[];
    (state.renegociacoes||[]).filter(r=>r.clienteId==cId).forEach(r=>(r.parcelas||[]).forEach((pc,i)=>ru.push({
      clienteId:cId,vendaId:'R'+r.id,parcelaIdx:i,parcelaNum:i+1,parcelaTotal:r.parcelas.length,
      valor:pc.valor,vencimento:pc.vencimento,data:r.data,renegociacaoId:r.id,_sub:!!r.substituidaPor
    })));
    ru.sort((a,b)=>(a._sub?0:1)-(b._sub?0:1)||(a.vencimento||'').localeCompare(b.vencimento||''));
    ru.forEach(u=>{
      let status,valorPago;
      if(saldoPago<=0.009){ status='aberto'; valorPago=0; }
      else if(saldoPago>=u.valor-0.009){ status='pago'; valorPago=u.valor; saldoPago-=u.valor; }
      else { status='parcial'; valorPago=saldoPago; saldoPago=0; }
      u.status=status; u.valorPago=valorPago; u.valorRestante=Math.max(0,u.valor-valorPago);
      if(!u._sub) flat.push(u);
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

let _toastTimer=null;
function showToast(msg,type=''){
  const t=document.getElementById('toast');
  t.textContent=msg;t.className='toast '+(type||'');
  t.classList.add('show');
  clearTimeout(_toastTimer); // aviso novo não some junto com o timer do anterior
  _toastTimer=setTimeout(()=>t.classList.remove('show'),type==='red'?5000:3000);
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
  agendarGravacao();
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
  document.getElementById('backup-exportado-nome').textContent=''+nomeArquivo;
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
      if(!validarShapeBackup(raw)){showToast('Arquivo não parece ser um backup do GestãoPRO (formato inesperado)','red');return;}
      confirmarAcao('Isso vai substituir todos os dados atuais pelos do backup. Antes, o app guarda uma cópia do estado atual — dá pra desfazer em ⚙️ Backup e manutenção → ↩️ Restaurar estado anterior. Continuar?',()=>{
        const aplicar=(comSnapshot)=>{
          aplicarDadosNoState(raw);
          salvarDados();
          rerenderAposTrocaDeDados();
          atualizarLinksProtecao();
          if(comSnapshot){
            abrirAvisoDados('Backup importado',
              'Seus dados foram substituídos pelos do backup.<br><br>Se foi engano, abra ⚙️ Backup e manutenção e toque em <strong>↩️ Restaurar estado anterior</strong> para voltar ao que você tinha antes.',
              [{texto:'Entendi',classe:'btn-primary'}]);
          } else {
            showToast('Backup importado ✓','green');
          }
        };
        const r=criarSnapshot('Antes de importar backup');
        if(r===false){
          // não coube no aparelho: deixa a pessoa decidir, em vez de seguir sem rede de proteção
          confirmarAcao('Não consegui guardar uma cópia do estado atual (sem espaço no aparelho). Se continuar, NÃO dá pra desfazer. Se puder, cancele e exporte um backup do estado atual antes. Continuar mesmo assim?',()=>aplicar(false));
          return;
        }
        aplicar(r===true);
      });
    }catch(err){showToast('Arquivo inválido','red');}
  };
  reader.readAsText(file);
  input.value='';
}

// ============ PROTEÇÃO DE DADOS: snapshot, restauração e recuperação (v5.33.2) ============
// Troca o state inteiro por dados vindos de fora (backup importado ou snapshot) — mesma
// lógica que importarBackup já tinha, agora num lugar só.
function aplicarDadosNoState(raw){
  const parsed=migrarDados(raw);
  state={...DEFAULT_STATE,...parsed};
  limparFiltrosDeTela(state);
  state.nextId={...DEFAULT_STATE.nextId,...(parsed.nextId||{})};
  if(!Array.isArray(state.movEstoque)) state.movEstoque=[];
  ['crmLeads','crmNegocios','crmAtividades'].forEach(k=>{ if(!Array.isArray(state[k])) state[k]=[]; });
      if(!Array.isArray(state.crmNotas)) state.crmNotas=[]; if(!Array.isArray(state.crmModelos)) state.crmModelos=crmModelosSemente();
  if(state.estoque_tab==='movimentos') state.estoque_tab='produtos';
  state._version=SCHEMA_VERSION;
  _bloquearGravacao=false;
  _estadoNaoConfiavel=false;
}
function rerenderAposTrocaDeDados(){
  const pg=document.querySelector('.page.active');
  if(pg) render(pg.id.replace('page-',''));
  renderDashboard();
  renderClientes();
  renderEstoque();
  atualizarAlertBells();
}

// Guarda uma cópia do estado ATUAL antes de uma ação em lote. Retorna:
//  true  → guardou
//  false → não coube no aparelho (quem chamou decide se segue sem rede)
//  null  → pulou: o state atual são dados de exemplo por falha de leitura, e gravar isso por
//          cima de um snapshot bom seria pior do que não gravar
function criarSnapshot(motivo){
  if(_estadoNaoConfiavel) return null;
  try{
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({em:Date.now(), motivo, dados:state}));
    atualizarLinksProtecao();
    return true;
  }catch(e){
    console.warn('[GestãoPRO] Não foi possível guardar o snapshot:', e);
    return false;
  }
}

function restaurarEstadoAnterior(){
  let snap=null;
  try{ snap=JSON.parse(localStorage.getItem(SNAPSHOT_KEY)||'null'); }catch(e){}
  if(!snap || !snap.dados || !validarShapeBackup(snap.dados)){
    showToast('Não há um estado anterior guardado','red');
    return;
  }
  const quando=new Date(snap.em).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  confirmarAcao(`Voltar ao estado de ${quando} (${snap.motivo||'ação em lote'})? Tudo o que você lançou depois disso será desfeito. Antes, o app guarda o estado de agora — dá pra voltar atrás de novo.`,()=>{
    if(!_estadoNaoConfiavel){
      // troca: o estado de agora vira o novo "anterior" (assim a restauração também é desfazível)
      try{
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({em:Date.now(), motivo:'Antes de restaurar o estado anterior', dados:state}));
      }catch(e){
        showToast('Sem espaço para guardar o estado atual. Exporte um backup antes de restaurar.','red');
        return;
      }
    }
    aplicarDadosNoState(snap.dados);
    salvarDados();
    rerenderAposTrocaDeDados();
    atualizarLinksProtecao();
    showToast('Estado anterior restaurado ✓','green');
  });
}

// Dados salvos ilegíveis: guarda o texto bruto numa chave à parte (mantém as 2 últimas).
function protegerDadosIlegiveis(bruto, erro){
  _estadoNaoConfiavel=true;
  let guardou=false;
  try{
    const agora=Date.now();
    localStorage.setItem(RECUPERACAO_KEY+'_'+agora, JSON.stringify({em:agora, erro:String((erro&&erro.message)||erro), bruto}));
    guardou=true;
    const todas=Object.keys(localStorage).filter(k=>k.startsWith(RECUPERACAO_KEY+'_')).sort();
    todas.slice(0,Math.max(0,todas.length-2)).forEach(k=>localStorage.removeItem(k));
  }catch(e){
    console.warn('[GestãoPRO] Não foi possível guardar a cópia de recuperação:', e);
  }
  // Se a cópia não coube, o original ainda é a única cópia: NÃO deixa o autosave sobrescrever.
  if(!guardou) _bloquearGravacao=true;
  setTimeout(()=>abrirAvisoDadosIlegiveis(guardou),600);
}
function abrirAvisoDadosIlegiveis(guardou){
  if(guardou){
    abrirAvisoDados('Dados não puderam ser lidos',
      'Não consegui ler os dados salvos neste aparelho, então o app abriu com <strong>dados de exemplo</strong>. Guardei uma cópia do que estava salvo para nada se perder.<br><br><strong>Não comece a lançar vendas ainda.</strong> Se você tem um backup, use ⚙️ Backup e manutenção → Importar backup. Se não, baixe a cópia abaixo e guarde o arquivo.',
      [{texto:'⬇ Baixar cópia',classe:'btn-primary',acao:baixarCopiaRecuperacao},{texto:'Fechar',classe:'btn-outline'}]);
  } else {
    abrirAvisoDados('Dados não puderam ser lidos',
      'Não consegui ler os dados salvos neste aparelho e <strong>também não consegui guardar uma cópia</strong> (sem espaço). Por segurança, a gravação está <strong>pausada</strong> para não apagar o que ainda está salvo.<br><br>Importe um backup em ⚙️ Backup e manutenção → Importar backup. Ou escolha "Continuar com dados vazios" (isso descarta os dados ilegíveis).',
      [{texto:'Continuar com dados vazios',classe:'btn-outline',acao:()=>{_bloquearGravacao=false;}},{texto:'Fechar (manter pausado)',classe:'btn-primary'}]);
  }
}
function baixarCopiaRecuperacao(){
  try{
    const chaves=Object.keys(localStorage).filter(k=>k.startsWith(RECUPERACAO_KEY+'_')).sort();
    if(!chaves.length){showToast('Nenhuma cópia de recuperação guardada','red');return;}
    const rec=JSON.parse(localStorage.getItem(chaves[chaves.length-1]));
    baixarTextoComoArquivo(rec.bruto,`gestaopro-dados-recuperados-${today()}.json`);
  }catch(e){
    showToast('Não consegui baixar a cópia de recuperação','red');
  }
}
function baixarTextoComoArquivo(texto,nome){
  const blob=new Blob([texto],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=nome;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

// Mostra/esconde os links do rodapé conforme existe snapshot / cópia de recuperação.
function atualizarLinksProtecao(){
  const a=document.getElementById('link-restaurar-anterior');
  const b=document.getElementById('link-baixar-recuperacao');
  let temSnap=false, temRec=false;
  try{
    const chaves=Object.keys(localStorage);
    temSnap=chaves.includes(SNAPSHOT_KEY);
    temRec=chaves.some(k=>k.startsWith(RECUPERACAO_KEY+'_'));
  }catch(e){}
  if(a) a.style.display=temSnap?'':'none';
  if(b) b.style.display=temRec?'':'none';
}

// Aviso genérico (diferente do toast, que some em 3s): só fecha quando a pessoa toca num botão.
function abrirAvisoDados(titulo,corpoHtml,botoes){
  let modal=document.getElementById('modal-aviso-dados');
  if(!modal){
    modal=document.createElement('div');
    modal.id='modal-aviso-dados';
    modal.className='modal-overlay';
    document.body.appendChild(modal);
  }
  modal.innerHTML=`<div class="modal" style="max-width:380px">
    <div class="modal-header"><h3>${titulo}</h3></div>
    <div class="modal-body">
      <div style="font-size:14px;line-height:1.5;margin-bottom:18px">${corpoHtml}</div>
      <div class="aviso-dados-botoes" style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap"></div>
    </div>
  </div>`;
  const wrap=modal.querySelector('.aviso-dados-botoes');
  (botoes||[]).forEach(b=>{
    const el=document.createElement('button');
    el.className='btn '+(b.classe||'btn-outline');
    el.textContent=b.texto;
    el.onclick=()=>{ modal.classList.remove('open'); if(b.acao) b.acao(); };
    wrap.appendChild(el);
  });
  modal.classList.add('open');
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

// ============ CÓDIGOS DE PRODUTO / CLIENTE + COPIAR (v5.33.0) ============
// O código é CALCULADO a partir do id (nada é gravado), então produto antigo já ganha código.
//   Produto sem variante: P001   |   Variante: P002-1
//   Cliente: #040 (fmtClienteNum, em 03-clientes.js)
function fmtProdutoCod(pid,vid){
  return 'P'+String(pid).padStart(3,'0')+(vid?'-'+vid:'');
}
// "p002-1" -> {produtoId:2, varianteId:1} | "P003" -> {produtoId:3, varianteId:null} | inválido -> null
function parseCodigoProduto(txt){
  const m=String(txt==null?'':txt).trim().match(/^p\s*0*(\d+)(?:\s*-\s*(\d+))?$/i);
  if(!m) return null;
  const produtoId=parseInt(m[1],10);
  if(!(produtoId>0)) return null;
  const varianteId=m[2]!=null?parseInt(m[2],10):null;
  if(m[2]!=null && !(varianteId>0)) return null;
  return {produtoId, varianteId};
}
// "#040" ou "40" -> 40 | inválido -> null
function parseCodigoCliente(txt){
  const m=String(txt==null?'':txt).trim().match(/^#?\s*0*(\d+)$/);
  if(!m) return null;
  const n=parseInt(m[1],10);
  return n>0?n:null;
}
// Copia texto pro clipboard, com fallback (execCommand) pra navegador antigo / contexto sem HTTPS.
function copiarTexto(txt,msgOk){
  const ok=()=>{if(typeof showToast==='function')showToast(msgOk||'Copiado!','green');};
  const falha=()=>{if(typeof showToast==='function')showToast('Não foi possível copiar','red');};
  const fallback=()=>{
    try{
      const ta=document.createElement('textarea');
      ta.value=txt;ta.setAttribute('readonly','');
      ta.style.cssText='position:fixed;top:0;left:0;opacity:0;pointer-events:none';
      document.body.appendChild(ta);
      ta.focus();ta.select();ta.setSelectionRange(0,ta.value.length);
      const r=document.execCommand('copy');
      document.body.removeChild(ta);
      r?ok():falha();
      return r;
    }catch(e){falha();return false;}
  };
  if(navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext){
    return navigator.clipboard.writeText(txt).then(ok).catch(fallback);
  }
  return fallback();
}

// ============ BUSCA GLOBAL ============
function buscaGlobal(termo){
  state.global_search=termo;
  const el=document.getElementById('busca-global-resultados');
  if(!el)return;
  if(!termo||termo.trim().length<2){el.style.display='none';el.innerHTML='';return;}
  const t=termo.toLowerCase();
  const resClientes=state.clientes.filter(c=>clienteCombinaBusca(c,termo)).slice(0,8);
  const tCod=t.replace(/\s+/g,'');
  const resProdutos=state.produtos.filter(p=>p.nome.toLowerCase().includes(t)||(p.sku||'').toLowerCase().includes(t)||(p.categoria||'').toLowerCase().includes(t)||
    (/^p\d/.test(tCod)&&(fmtProdutoCod(p.id).toLowerCase().includes(tCod)||(p.variantes||[]).some(v=>fmtProdutoCod(p.id,v.id).toLowerCase().includes(tCod))))).slice(0,4);
  const resVendas=state.vendas.filter(v=>normBusca(getCliente(v.clienteId).nome).includes(normBusca(termo))).slice(0,4);
  if(resClientes.length===0&&resProdutos.length===0&&resVendas.length===0){
    el.innerHTML='<div style="padding:14px;color:var(--muted);font-size:13px">Nenhum resultado encontrado</div>';
    el.style.display='block';return;
  }
  let html='';
  if(resClientes.length){html+=`<div class="busca-grupo-titulo">Clientes</div>`+resClientes.map(c=>`<div class="busca-item" onclick="irParaCliente(${c.id})"><strong>${escapeHtml(c.nome)}</strong><span>${escapeHtml(c.tel||'')}</span></div>`).join('');}
  if(resProdutos.length){html+=`<div class="busca-grupo-titulo">Produtos</div>`+resProdutos.map(p=>`<div class="busca-item" onclick="goto('estoque');fecharBuscaGlobal()"><strong>${escapeHtml(p.nome)}</strong><span><b style="font-family:monospace">${fmtProdutoCod(p.id)}</b> ${escapeHtml(p.sku||'')} ${p.categoria?'· '+escapeHtml(p.categoria):''}</span></div>`).join('');}
  if(resVendas.length){html+=`<div class="busca-grupo-titulo">Vendas</div>`+resVendas.map(v=>`<div class="busca-item" onclick="goto('vendas');fecharBuscaGlobal()"><strong>${escapeHtml(getCliente(v.clienteId).nome)}</strong><span>${fmtDate(v.data)} · ${fmt(v.total)}</span></div>`).join('');}
  el.innerHTML=html;
  el.style.display='block';
}
function irParaCliente(id){
  const c=getCliente(id);
  goto('clientes');fecharBuscaGlobal();
  if(!estaAtivo(c)) state.cliente_mostrar_arquivados=true; // cliente arquivado também precisa aparecer na lista
  const inp=document.getElementById('cliente-busca-input'); if(inp) inp.value=c.nome;
  setTimeout(()=>filterClientes(c.nome),50);
}
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
  const itens = [...alertas.baixoProdutos.map(p=>`${escapeHtml(p.nome)}: ${p.estoque} un (mín: ${p.minimo})`),
    ...alertas.baixoMaterias.map(m=>`${escapeHtml(m.nome)}: ${m.qtd}${m.unidade} (mín: ${m.minimo}${m.unidade})`)];
  const aberto = state.alerta_estoque_aberto?true:false;
  el.innerHTML=`<div class="alert-banner danger" style="flex-direction:column;align-items:stretch;gap:0;cursor:pointer;padding:0" onclick="toggleAlertaEstoque()">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px">
      <strong><i data-lucide="triangle-alert" class="ic ic-sm"></i> ${alertas.total} iten(s) com estoque abaixo do mínimo</strong>
      <span style="font-size:11px;transition:transform .2s;transform:rotate(${aberto?180:0}deg)">▾</span>
    </div>
    ${aberto?`<div style="font-size:12px;font-weight:500;opacity:.85;padding:0 16px 12px">${itens.join('  ·  ')}</div>`:''}
  </div>`;
}
function toggleAlertaEstoque(){
  state.alerta_estoque_aberto = !state.alerta_estoque_aberto;
  renderAlertaEstoquePage();
}

