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
  nextId:{clientes:4,produtos:9,materias:15,vendas:6,pagamentos:2,producoes:2,financeiro:4,fornecedores:4,compras:1,baixasEstoque:1,semiacabados:1,entradasEstoque:1,rotas:3},
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
  venda_filter:'',
  venda_tipo_filter:'',
  estoque_filter:'',
  estoque_categoria_filter:'',
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
//   5 → (versão atual) versionamento formal implantado
const SCHEMA_VERSION = 5;

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
const today=()=>new Date().toISOString().split('T')[0];
const fmtDate=(d)=>{if(!d)return'';const[y,m,dd]=d.split('-');return`${dd}/${m}/${y}`};
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
function getCliente(id){return state.clientes.find(c=>c.id==id)||{nome:'?',tel:''}}
function getProduto(id){return state.produtos.find(p=>p.id==id)||{nome:'?',preco:0,estoque:0}}
function getSemiacabado(id){return (state.semiacabados||[]).find(s=>s.id==id)||{nome:'?',estoque:0}}
function getMateria(id){return state.materias.find(m=>m.id==id)||{nome:'?',custo:0,unidade:'',qtd:0}}
function getFornecedor(id){return state.fornecedores.find(f=>f.id==id)||null}
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
function calcularCustoFicha(produtoId,varianteId,qtd=1){
  const ficha=getFichaProdutoVariante(produtoId,varianteId);
  return ficha.reduce((s,f)=>s+(f.qtd*qtd*custoItemFicha(f.tipo||'mp',f.mpId)),0);
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
function exportarBackup(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  const now=new Date();
  const hora=`${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
  const nomeArquivo=`gestaopro-backup-${today()}-${hora}.json`;
  a.download=nomeArquivo;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
  document.getElementById('backup-exportado-nome').textContent='📄 '+nomeArquivo;
  openModal('modal-backup-exportado');
  window.open('https://github.com/Ferreira00Group/gestaopro','_blank');
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
  if(resClientes.length){html+=`<div class="busca-grupo-titulo">👥 Clientes</div>`+resClientes.map(c=>`<div class="busca-item" onclick="irParaCliente(${c.id})"><strong>${c.nome}</strong><span>${c.tel||''}</span></div>`).join('');}
  if(resProdutos.length){html+=`<div class="busca-grupo-titulo">📦 Produtos</div>`+resProdutos.map(p=>`<div class="busca-item" onclick="goto('estoque');fecharBuscaGlobal()"><strong>${p.nome}</strong><span>${p.sku||''} ${p.categoria?'· '+p.categoria:''}</span></div>`).join('');}
  if(resVendas.length){html+=`<div class="busca-grupo-titulo">🛒 Vendas</div>`+resVendas.map(v=>`<div class="busca-item" onclick="goto('vendas');fecharBuscaGlobal()"><strong>${getCliente(v.clienteId).nome}</strong><span>${fmtDate(v.data)} · ${fmt(v.total)}</span></div>`).join('');}
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

