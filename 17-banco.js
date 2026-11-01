// ============ BANCO (v5.52) ============
// Aba "Banco": contas bancárias, extrato e conciliação com Contas a Receber / Pagar / Financeiro.
//
// DADOS (state, entram no backup e no Drive):
//   state.bancoContas      [{id,nome,tipo,saldoInicial,origem,ultimaImportacao,ativo}]
//   state.bancoTransacoes  [{id,contaId,data,valor,desc,extId,origem,status,vinculo,criadoEm}]
//     valor  = positivo (entrada) ou negativo (saída)
//     origem = 'manual' | 'ofx' | 'csv' | 'openfinance'   ← o Open Finance entra aqui no futuro
//     status = 'pendente' | 'conciliado' | 'ignorado'
//     vinculo (quando conciliado) = {tipo:'financeiro'|'pagamento'|'pagamentoFornecedor', id, criado}
//       criado=true  → a conciliação criou o registro (desfazer apaga junto)
//       criado=false → ligou a algo que já existia (desfazer só solta o vínculo)
//   state.bancoAtivo       aba escondida do menu até o usuário ativar (Backup e manutenção)
//
// PREPARADO PARA O OPEN FINANCE: toda fonte de dados passa por bancoImportarTransacoes(contaId, lista, origem),
// que deduplica pelo extId. Quando o Open Finance chegar, basta chamar essa função com origem 'openfinance'.

const BANCO_TIPOS_CONTA = {corrente:'Conta corrente', poupanca:'Poupança', digital:'Conta digital', caixa:'Dinheiro (caixa)'};
const BANCO_ORIGENS = {manual:'Manual', ofx:'OFX', csv:'CSV', openfinance:'Open Finance'};

let _bkTab = 'contas';
let _bkFiltro = {conta:'', mes:'', status:'', busca:''};
let _bkLimite = 100;
let _bkImp = null;     // arquivo em análise na tela de importação
let _bkConcPre = null; // sugestão pré-selecionada ao abrir a conciliação manual

// ───────── utilidades ─────────
function bkNorm(s){ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim(); }
function bkSinal(v){ return (v<0?'−':'+')+fmt(Math.abs(v)); }
function bkDias(a,b){ return Math.abs((Date.parse(a+'T00:00:00')-Date.parse(b+'T00:00:00'))/864e5); }
function bkMesAno(ym){
  const n=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const [y,m]=ym.split('-'); return n[parseInt(m,10)-1]+'/'+y;
}
function bkIcones(){ if(typeof lucide!=='undefined') lucide.createIcons(); }

function bancoGarantirEstado(){
  if(!Array.isArray(state.bancoContas)) state.bancoContas=[];
  if(!Array.isArray(state.bancoTransacoes)) state.bancoTransacoes=[];
  if(!state.nextId) state.nextId={};
  if(!(state.nextId.bancoContas>0)) state.nextId.bancoContas=state.bancoContas.reduce((m,c)=>Math.max(m,c.id||0),0)+1;
  if(!(state.nextId.bancoTransacoes>0)) state.nextId.bancoTransacoes=state.bancoTransacoes.reduce((m,t)=>Math.max(m,t.id||0),0)+1;
}

// ───────── aba escondida no menu ─────────
function bancoAplicarFlag(){
  const on=!!(typeof state!=='undefined' && state && state.bancoAtivo);
  const nav=document.getElementById('nav-banco');
  if(nav) nav.style.display=on?'':'none';
  const lb=document.getElementById('banco-toggle-label');
  if(lb) lb.textContent=on?'Desativar aba Banco':'Ativar aba Banco';
}
function bancoAlternarAba(){
  state.bancoAtivo=!state.bancoAtivo;
  marcarAlterado();
  bancoAplicarFlag();
  if(!state.bancoAtivo){
    const pg=document.querySelector('.page.active');
    if(pg && pg.id==='page-banco') goto('dashboard');
  }
  showToast(state.bancoAtivo?'Aba Banco ativada no menu':'Aba Banco escondida do menu','green');
}
window.addEventListener('load',bancoAplicarFlag);

// ───────── contas e saldos ─────────
function bancoContasAtivas(){ return state.bancoContas.filter(c=>c.ativo!==false); }
function bancoSaldoConta(c){
  return round2((Number(c.saldoInicial)||0)+state.bancoTransacoes.filter(t=>t.contaId==c.id).reduce((s,t)=>s+(Number(t.valor)||0),0));
}
function bancoContaNome(id){ const c=state.bancoContas.find(x=>x.id==id); return c?c.nome:'—'; }
function bancoPendentes(){ return state.bancoTransacoes.filter(t=>t.status==='pendente'); }

// Se o registro ligado a uma conciliação foi apagado em outra tela (Financeiro, Receber...),
// a transação volta para "a conciliar" em vez de ficar apontando para nada.
function bancoRevalidar(){
  let mudou=false;
  state.bancoTransacoes.forEach(t=>{
    if(t.status!=='conciliado'||!t.vinculo) return;
    const v=t.vinculo; let ok=true;
    if(v.tipo==='financeiro') ok=state.financeiro.some(f=>f.id==v.id);
    else if(v.tipo==='pagamento') ok=state.pagamentos.some(p=>p.id==v.id);
    else if(v.tipo==='pagamentoFornecedor') ok=(state.pagamentosFornecedor||[]).some(p=>p.id==v.id);
    if(!ok){ t.status='pendente'; t.vinculo=null; mudou=true; }
  });
  if(mudou) marcarAlterado();
}
function bancoVinculoTexto(t){
  const v=t.vinculo; if(!v) return '';
  if(v.tipo==='financeiro'){ const f=state.financeiro.find(x=>x.id==v.id); return f?('Financeiro: '+f.desc):''; }
  if(v.tipo==='pagamento'){ const p=state.pagamentos.find(x=>x.id==v.id); return p?('Pagamento de '+getCliente(p.clienteId).nome):''; }
  if(v.tipo==='pagamentoFornecedor'){ const p=(state.pagamentosFornecedor||[]).find(x=>x.id==v.id); const f=p&&getFornecedor(p.fornecedorId); return p?('Pagamento a '+(f?f.nome:'fornecedor')):''; }
  return '';
}

// ───────── importação central (OFX, CSV, manual e, no futuro, Open Finance) ─────────
// Dá um extId único a cada linha (a mesma linha repetida no arquivo ganha #2, #3...),
// então importar o mesmo extrato duas vezes não duplica nada.
function bkChaves(linhas){
  const vistos={};
  linhas.forEach(l=>{
    const base=l.base||('h:'+l.data+'|'+round2(l.valor).toFixed(2)+'|'+bkNorm(l.desc).slice(0,60));
    vistos[base]=(vistos[base]||0)+1;
    l.extId=base+'#'+vistos[base];
  });
  return linhas;
}
function bancoImportarTransacoes(contaId,lista,origem){
  bancoGarantirEstado();
  const conta=state.bancoContas.find(c=>c.id==contaId);
  if(!conta) return {novas:0,duplicadas:0};
  const existentes=new Set(state.bancoTransacoes.filter(t=>t.contaId==contaId).map(t=>t.extId));
  if(lista.some(l=>!l.extId)) bkChaves(lista);
  let novas=0,duplicadas=0;
  lista.forEach(l=>{
    if(existentes.has(l.extId)){ duplicadas++; return; }
    state.bancoTransacoes.push({id:nextId('bancoTransacoes'),contaId:conta.id,data:l.data,valor:round2(l.valor),desc:String(l.desc||'').trim(),
      extId:l.extId,origem,status:'pendente',vinculo:null,criadoEm:today()});
    existentes.add(l.extId); novas++;
  });
  if(novas>0 && origem!=='manual'){ conta.origem=origem; conta.ultimaImportacao=today(); }
  if(novas>0) marcarAlterado();
  return {novas,duplicadas};
}

// ───────── leitura de arquivos ─────────
function bkDecodificar(buf){
  try{ return new TextDecoder('utf-8',{fatal:true}).decode(buf); }
  catch(e){ try{ return new TextDecoder('windows-1252').decode(buf); }catch(e2){ return new TextDecoder().decode(buf); } }
}
function bkNum(s){
  let t=String(s==null?'':s).trim(); if(!t) return NaN;
  let neg=false;
  if(/^\(.*\)$/.test(t)){ neg=true; t=t.slice(1,-1); }
  if(/-$/.test(t)){ neg=true; t=t.slice(0,-1); }
  t=t.replace(/R\$|\s/g,'');
  if(t.startsWith('-')){ neg=true; t=t.slice(1); } else if(t.startsWith('+')) t=t.slice(1);
  t=t.replace(/[^\d.,]/g,'');
  if(!t) return NaN;
  const p=t.lastIndexOf('.'), v=t.lastIndexOf(',');
  if(p>-1&&v>-1){ t = v>p ? t.replace(/\./g,'').replace(',','.') : t.replace(/,/g,''); }
  else if(v>-1){ t=t.replace(',','.'); }
  else if((t.match(/\./g)||[]).length>1){ t=t.replace(/\./g,''); }
  const n=parseFloat(t);
  return isNaN(n)?NaN:(neg?-n:n);
}
function bkData(s){
  s=String(s||'').trim();
  let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  let y,mo,d;
  if(m){ y=m[1]; mo=m[2]; d=m[3]; }
  else{
    m=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
    if(!m) return '';
    d=m[1].padStart(2,'0'); mo=m[2].padStart(2,'0'); y=m[3].length===2?'20'+m[3]:m[3];
  }
  if(+mo<1||+mo>12||+d<1||+d>31) return '';
  return y+'-'+mo+'-'+d;
}
function bancoParseOfx(txt){
  const blocos=txt.split(/<STMTTRN>/i).slice(1);
  if(!blocos.length) throw new Error('Não encontrei lançamentos neste arquivo OFX.');
  const tag=(b,t)=>{ const m=b.match(new RegExp('<'+t+'>([^<\\r\\n]*)','i')); return m?m[1].trim():''; };
  const limpa=s=>s.replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/\s+/g,' ').trim();
  const linhas=[];
  blocos.forEach(b=>{
    const dt=tag(b,'DTPOSTED').slice(0,8);
    const data=dt.length===8?(dt.slice(0,4)+'-'+dt.slice(4,6)+'-'+dt.slice(6,8)):'';
    const valor=bkNum(tag(b,'TRNAMT'));
    if(!data||isNaN(valor)||valor===0) return;
    const nome=limpa(tag(b,'NAME')), memo=limpa(tag(b,'MEMO'));
    const desc=(nome&&memo&&!memo.toLowerCase().startsWith(nome.toLowerCase()))?(nome+' — '+memo):(memo||nome);
    const fitid=tag(b,'FITID');
    linhas.push({data,valor:round2(valor),desc,base:fitid?('f:'+fitid+'|'+data+'|'+round2(valor).toFixed(2)):''});
  });
  if(!linhas.length) throw new Error('Nenhum lançamento válido no arquivo OFX.');
  return linhas;
}
function bkCsvLinha(l,sep){
  const out=[]; let cur='',q=false;
  for(let i=0;i<l.length;i++){
    const ch=l[i];
    if(q){ if(ch==='"'){ if(l[i+1]==='"'){cur+='"';i++;} else q=false; } else cur+=ch; }
    else if(ch==='"') q=true;
    else if(ch===sep){ out.push(cur); cur=''; }
    else cur+=ch;
  }
  out.push(cur);
  return out.map(s=>s.trim());
}
function bancoParseCsv(txt){
  const linhas=txt.replace(/^\uFEFF/,'').split(/\r\n|\n|\r/).filter(l=>l.trim());
  if(!linhas.length) throw new Error('Arquivo vazio.');
  let hi=-1,sep=';',idx=null;
  for(let i=0;i<Math.min(linhas.length,20)&&hi<0;i++){
    const l=linhas[i];
    const cont=c=>l.split(c).length-1;
    sep=[';','\t',','].reduce((a,c)=>cont(c)>cont(a)?c:a,';');
    const cel=bkCsvLinha(l,sep).map(bkNorm);
    const f=re=>cel.findIndex(c=>re.test(c));
    const iData=f(/^(data|date|dt)\b/), iVal=f(/^(valor|amount|montante|value)\b/);
    const iCred=f(/^(credito|entrada)/), iDeb=f(/^(debito|saida)/);
    if(iData>-1&&(iVal>-1||iCred>-1||iDeb>-1)){
      let iDesc=cel.findIndex((c,k)=>k!==iData&&/(descri|historico|lancamento|memo|detalhe|estabelecimento|identificador)/.test(c));
      if(iDesc<0) iDesc=cel.findIndex((c,k)=>k!==iData&&k!==iVal&&k!==iCred&&k!==iDeb&&c);
      idx={iData,iVal,iCred,iDeb,iDesc,iTipo:f(/^(tipo|natureza|d\/c)\b/)}; hi=i;
    }
  }
  if(hi<0) throw new Error('Não achei as colunas Data e Valor na primeira linha do CSV.');
  const out=[];
  for(let i=hi+1;i<linhas.length;i++){
    const c=bkCsvLinha(linhas[i],sep);
    const data=bkData(c[idx.iData]); if(!data) continue;
    let v;
    if(idx.iVal>-1){
      v=bkNum(c[idx.iVal]);
      if(idx.iTipo>-1&&v>0&&/^(d|deb|saida)/.test(bkNorm(c[idx.iTipo]))) v=-v;
    } else {
      const cr=bkNum(c[idx.iCred]), de=bkNum(c[idx.iDeb]);
      v=(isNaN(cr)?0:Math.abs(cr))-(isNaN(de)?0:Math.abs(de));
    }
    if(isNaN(v)||v===0) continue;
    out.push({data,valor:round2(v),desc:idx.iDesc>-1?(c[idx.iDesc]||''):'',base:''});
  }
  if(!out.length) throw new Error('Nenhum lançamento válido encontrado no CSV.');
  return out;
}

// ───────── sugestões de conciliação ─────────
const BK_STOP=new Set(['de','da','das','do','dos','e','ltda','me','epp','sa','eireli','comercio','distribuidora','cia']);
function bkHits(descNorm,nome){
  const palavras=new Set(descNorm.split(/[^a-z0-9]+/));
  return bkNorm(nome).split(' ').filter(w=>w.length>=3&&!BK_STOP.has(w)&&palavras.has(w)).length;
}
function bancoCtx(){
  const finUsados=new Set(), pag=new Set(), pf=new Set();
  state.bancoTransacoes.forEach(t=>{
    if(t.status!=='conciliado'||!t.vinculo) return;
    const v=t.vinculo;
    if(v.tipo==='financeiro') finUsados.add(Number(v.id));
    if(v.tipo==='pagamento') pag.add(Number(v.id));
    if(v.tipo==='pagamentoFornecedor') pf.add(Number(v.id));
  });
  state.financeiro.forEach(f=>{
    if(f.pagamentoId&&pag.has(Number(f.pagamentoId))) finUsados.add(f.id);
    if(f.pagamentoFornecedorId&&pf.has(Number(f.pagamentoFornecedorId))) finUsados.add(f.id);
  });
  return {finUsados,saldoCli:{},saldoForn:{}};
}
function bkSaldoCli(ctx,id){ if(!(id in ctx.saldoCli)) ctx.saldoCli[id]=round2(getSaldoCliente(id)); return ctx.saldoCli[id]; }
function bkSaldoForn(ctx,id){ if(!(id in ctx.saldoForn)) ctx.saldoForn[id]=round2(getSaldoFornecedor(id)); return ctx.saldoForn[id]; }
const BK_RANK={alta:0,media:1,baixa:2};

function bancoSugerir(t,ctx){
  const out=[]; const entrada=t.valor>0; const v=round2(Math.abs(t.valor)); const tipo=entrada?'entrada':'saida';
  state.financeiro.forEach(f=>{
    if(f.tipo!==tipo||ctx.finUsados.has(f.id)) return;
    if(Math.abs(round2(f.valor)-v)>0.009) return;
    const d=bkDias(f.data,t.data); if(d>5) return;
    out.push({tipo:'financeiro',id:f.id,forca:d<=1?'alta':'media',ordem:d,titulo:'Lançamento do Financeiro',
      detalhe:`${f.desc} · ${fmtDate(f.data)} · ${fmt(f.valor)}`,motivo:d<=1?'Valor e data batem':'Valor bate, data próxima'});
  });
  const desc=bkNorm(t.desc);
  const lista=entrada?state.clientes.filter(estaAtivo):state.fornecedores.filter(f=>f.status!=='inativo');
  const exatos=[];
  lista.forEach(p=>{
    const saldo=entrada?bkSaldoCli(ctx,p.id):bkSaldoForn(ctx,p.id);
    if(saldo<v-0.009) return;
    const hits=bkHits(desc,p.nome), igual=Math.abs(saldo-v)<=0.009;
    if(hits===0){ if(igual) exatos.push(p); return; }
    const forca=(igual||hits>=2)?'alta':'media';
    out.push({tipo:entrada?'cliente':'fornecedor',id:p.id,forca,ordem:igual?0:1,
      titulo:(entrada?'Pagamento de ':'Pagamento a ')+p.nome,
      detalhe:(entrada?'Saldo devedor ':'Saldo em aberto ')+fmt(saldo),
      motivo:igual?'Nome e saldo batem':'Nome parecido'});
  });
  if(exatos.length===1){
    const p=exatos[0];
    out.push({tipo:entrada?'cliente':'fornecedor',id:p.id,forca:'baixa',ordem:2,
      titulo:(entrada?'Pagamento de ':'Pagamento a ')+p.nome,
      detalhe:(entrada?'Saldo devedor ':'Saldo em aberto ')+fmt(entrada?bkSaldoCli(ctx,p.id):bkSaldoForn(ctx,p.id)),
      motivo:'Só o saldo bate'});
  }
  return out.sort((a,b)=>BK_RANK[a.forca]-BK_RANK[b.forca]||a.ordem-b.ordem);
}

// ───────── ações de conciliação ─────────
function bkTxPendente(txId){
  const t=state.bancoTransacoes.find(x=>x.id==txId);
  if(!t||t.status!=='pendente'){ showToast('Essa transação não está mais pendente','red'); return null; }
  return t;
}
function bkPosAcao(msg){
  marcarAlterado();
  if(msg) showToast(msg,'green');
  const pg=document.querySelector('.page.active');
  if(pg && pg.id==='page-banco') renderBanco();
  if(typeof atualizarAlertBells==='function') atualizarAlertBells();
}
function bancoConciliarFinanceiro(txId,lancId){
  const t=bkTxPendente(txId); if(!t) return false;
  const f=state.financeiro.find(x=>x.id==lancId);
  if(!f){ showToast('Lançamento não encontrado','red'); return false; }
  if(f.tipo!==(t.valor>0?'entrada':'saida')){ showToast('O tipo do lançamento não combina com a transação','red'); return false; }
  t.status='conciliado'; t.vinculo={tipo:'financeiro',id:f.id,criado:false};
  bkPosAcao('Conciliado com o Financeiro'); return true;
}
function bancoConciliarCliente(txId,clienteId){
  const t=bkTxPendente(txId); if(!t) return false;
  if(t.valor<=0){ showToast('Só entradas podem virar pagamento de cliente','red'); return false; }
  const c=state.clientes.find(x=>x.id==clienteId);
  if(!c){ showToast('Escolha um cliente','red'); return false; }
  const v=round2(t.valor), saldo=round2(getSaldoCliente(c.id));
  if(v>saldo+0.009){ showToast(`O valor (${fmt(v)}) é maior que o saldo devedor (${fmt(saldo)}). Use "receita avulsa" para o excedente.`,'red'); return false; }
  const pagId=nextId('pagamentos');
  state.pagamentos.push({id:pagId,clienteId:c.id,valor:v,forma:/pix/i.test(t.desc)?'PIX':'Transferência',obs:'Conciliação bancária',data:t.data,bancoTxId:t.id});
  state.financeiro.push({id:nextId('financeiro'),tipo:'entrada',desc:`Pagamento fiado — ${c.nome}`,valor:v,data:t.data,pagamentoId:pagId});
  t.status='conciliado'; t.vinculo={tipo:'pagamento',id:pagId,criado:true};
  bkPosAcao('Pagamento de '+c.nome+' registrado'); return true;
}
function bancoConciliarFornecedor(txId,fornecedorId){
  const t=bkTxPendente(txId); if(!t) return false;
  if(t.valor>=0){ showToast('Só saídas podem virar pagamento a fornecedor','red'); return false; }
  const f=getFornecedor(fornecedorId);
  if(!f){ showToast('Escolha um fornecedor','red'); return false; }
  const v=round2(Math.abs(t.valor)), saldo=round2(getSaldoFornecedor(f.id));
  if(v>saldo+0.009){ showToast(`O valor (${fmt(v)}) é maior que o saldo em aberto (${fmt(saldo)}). Use "despesa avulsa" para o excedente.`,'red'); return false; }
  const pagId=nextId('pagamentosFornecedor');
  if(!Array.isArray(state.pagamentosFornecedor)) state.pagamentosFornecedor=[];
  state.pagamentosFornecedor.push({id:pagId,fornecedorId:f.id,valor:v,forma:/pix/i.test(t.desc)?'PIX':'Boleto',obs:'Conciliação bancária',data:t.data,bancoTxId:t.id});
  state.financeiro.push({id:nextId('financeiro'),tipo:'saida',desc:`Pagamento a fornecedor — ${f.nome}`,valor:v,data:t.data,pagamentoFornecedorId:pagId});
  t.status='conciliado'; t.vinculo={tipo:'pagamentoFornecedor',id:pagId,criado:true};
  bkPosAcao('Pagamento a '+f.nome+' registrado'); return true;
}
function bancoConciliarAvulso(txId,categoria){
  const t=bkTxPendente(txId); if(!t) return false;
  const entrada=t.valor>0, cat=String(categoria||'').trim();
  const id=nextId('financeiro');
  state.financeiro.push({id,tipo:entrada?'entrada':'saida',desc:t.desc||(entrada?'Entrada bancária':'Saída bancária'),
    valor:round2(Math.abs(t.valor)),data:t.data,...((!entrada&&cat)?{categoria:cat}:{}),bancoTxId:t.id});
  t.status='conciliado'; t.vinculo={tipo:'financeiro',id,criado:true};
  bkPosAcao(entrada?'Receita lançada no Financeiro':'Despesa lançada no Financeiro'); return true;
}
function bancoAplicarSug(txId,tipo,id){
  if(tipo==='financeiro') return bancoConciliarFinanceiro(txId,id);
  if(tipo==='cliente') return bancoConciliarCliente(txId,id);
  if(tipo==='fornecedor') return bancoConciliarFornecedor(txId,id);
}
function bancoIgnorar(txId){
  const t=bkTxPendente(txId); if(!t) return;
  t.status='ignorado'; t.vinculo=null;
  bkPosAcao('Transação ignorada');
}
function bancoDesfazer(txId){
  const t=state.bancoTransacoes.find(x=>x.id==txId); if(!t) return;
  const criado=t.status==='conciliado'&&t.vinculo&&t.vinculo.criado;
  const texto=criado?'Desfazer a conciliação? O registro que ela criou (pagamento ou lançamento) também será apagado.':'Voltar esta transação para "a conciliar"?';
  confirmarAcao(texto,()=>{
    const v=t.vinculo;
    if(criado&&v){
      if(v.tipo==='pagamento'){
        state.pagamentos=state.pagamentos.filter(p=>p.id!=v.id);
        state.financeiro=state.financeiro.filter(f=>f.pagamentoId!=v.id);
      } else if(v.tipo==='pagamentoFornecedor'){
        state.pagamentosFornecedor=(state.pagamentosFornecedor||[]).filter(p=>p.id!=v.id);
        state.financeiro=state.financeiro.filter(f=>f.pagamentoFornecedorId!=v.id);
      } else if(v.tipo==='financeiro'){
        state.financeiro=state.financeiro.filter(f=>f.id!=v.id);
      }
    }
    t.status='pendente'; t.vinculo=null;
    bkPosAcao('Voltou para "a conciliar"');
  });
}

// ───────── telas ─────────
function bancoTab(tab,btn){ _bkTab=tab; renderBanco(); }
function renderBanco(){
  if(typeof state==='undefined'||!state) return;
  bancoGarantirEstado();
  bancoRevalidar();
  document.querySelectorAll('#page-banco .tabs .tab').forEach(b=>b.classList.toggle('active',b.dataset.bk===_bkTab));
  const pend=bancoPendentes().length;
  const badge=document.getElementById('bk-badge');
  if(badge) badge.textContent=pend>0?(' ('+pend+')'):'';
  const el=document.getElementById('banco-conteudo'); if(!el) return;
  if(_bkTab==='contas') el.innerHTML=bancoHtmlContas();
  else if(_bkTab==='extrato'){ el.innerHTML=bancoHtmlExtratoBase(); bancoExtratoLista(); }
  else el.innerHTML=bancoHtmlConciliar();
  bkIcones();
}

function bancoHtmlContas(){
  const contas=bancoContasAtivas();
  const total=round2(contas.reduce((s,c)=>s+bancoSaldoConta(c),0));
  let h=`<div class="bk-card bk-row" style="border-color:rgba(201,162,75,.3)">
      <i data-lucide="plug-zap" style="width:22px;height:22px;color:var(--gold);flex:none"></i>
      <div class="bk-grow"><div style="font-weight:700">Open Finance</div><div class="bk-mut">Não conectado. Enquanto isso, importe o extrato em OFX ou CSV.</div></div>
      <span class="bk-chip">Em breve</span>
    </div>`;
  if(contas.length===0){
    return h+`<div style="text-align:center;padding:40px 20px">
      <h3>Cadastre sua primeira conta</h3>
      <p style="color:var(--muted);margin:8px 0 16px">Com a conta criada, você importa o extrato e concilia com Receber, Pagar e Financeiro.</p>
      <button class="btn btn-primary" onclick="bancoNovaConta()">Nova conta</button></div>`;
  }
  h+=`<div class="bk-card"><div class="bk-mut">Saldo total · ${contas.length} conta${contas.length!==1?'s':''}</div>
      <div style="font-size:24px;font-weight:800;margin-top:2px;color:${total<0?'var(--red)':'var(--text)'}">${fmt(total)}</div></div>`;
  h+=`<div class="bk-card" style="padding:4px 14px">`+contas.map(c=>{
    const saldo=bancoSaldoConta(c);
    const pend=state.bancoTransacoes.filter(t=>t.contaId==c.id&&t.status==='pendente').length;
    return `<div class="bk-tx">
      <div class="bk-av">${escapeHtml((c.nome||'?').trim().charAt(0).toUpperCase())}</div>
      <div class="bk-grow"><div style="font-weight:700">${escapeHtml(c.nome)}</div>
        <div class="bk-mut">${escapeHtml(BANCO_TIPOS_CONTA[c.tipo]||'Conta')} · <span class="bk-chip n">${escapeHtml(BANCO_ORIGENS[c.origem]||'Manual')}</span>${pend>0?` · <span class="bk-chip">${pend} a conciliar</span>`:''}</div>
        ${c.ultimaImportacao?`<div class="bk-mut">Última importação: ${fmtDate(c.ultimaImportacao)}</div>`:''}</div>
      <div style="text-align:right"><div class="bk-val" style="color:${saldo<0?'var(--red)':'var(--text)'}">${fmt(saldo)}</div>
        <div class="actions-cell" style="justify-content:flex-end;margin-top:4px">
          <button class="icon-btn edit" onclick="bancoEditarConta(${c.id})" title="Editar"><i data-lucide="pencil" class="ic"></i></button>
          <button class="icon-btn del" onclick="bancoExcluirConta(${c.id})" title="Excluir"><i data-lucide="trash-2" class="ic"></i></button></div></div>
    </div>`;}).join('')+`</div>`;
  h+=`<div class="bk-btns"><button class="btn btn-primary" onclick="bancoAbrirImportar()">Importar extrato</button>
      <button class="btn btn-outline" onclick="bancoNovaConta()">Nova conta</button></div>`;
  return h;
}

function bancoHtmlExtratoBase(){
  const contas=bancoContasAtivas();
  const meses=[...new Set(state.bancoTransacoes.map(t=>t.data.slice(0,7)))].sort().reverse();
  const sel=(v,x)=>v===x?' selected':'';
  return `<div class="bk-filtros">
      <select class="form-control" onchange="bancoFiltrar('conta',this.value)"><option value="">Todas as contas</option>${contas.map(c=>`<option value="${c.id}"${sel(String(_bkFiltro.conta),String(c.id))}>${escapeHtml(c.nome)}</option>`).join('')}</select>
      <select class="form-control" onchange="bancoFiltrar('mes',this.value)"><option value="">Todos os meses</option>${meses.map(m=>`<option value="${m}"${sel(_bkFiltro.mes,m)}>${bkMesAno(m)}</option>`).join('')}</select>
      <select class="form-control" onchange="bancoFiltrar('status',this.value)"><option value="">Todos os status</option><option value="pendente"${sel(_bkFiltro.status,'pendente')}>A conciliar</option><option value="conciliado"${sel(_bkFiltro.status,'conciliado')}>Conciliados</option><option value="ignorado"${sel(_bkFiltro.status,'ignorado')}>Ignorados</option></select>
      <input class="form-control" type="search" placeholder="Buscar na descrição" value="${escapeHtml(_bkFiltro.busca)}" oninput="bancoFiltrar('busca',this.value)">
    </div>
    <div id="bk-ext-resumo"></div>
    <div class="bk-btns" style="margin-bottom:10px"><button class="btn btn-outline btn-sm" onclick="bancoNovoLanc()">+ Lançamento manual</button><button class="btn btn-outline btn-sm" onclick="bancoAbrirImportar()">Importar extrato</button></div>
    <div id="bk-ext-lista" class="bk-card" style="padding:2px 14px"></div>`;
}
function bancoFiltrar(campo,valor){ _bkFiltro[campo]=valor; _bkLimite=100; bancoExtratoLista(); }
function bancoMaisLinhas(){ _bkLimite+=100; bancoExtratoLista(); }
function bancoTxFiltradas(){
  const b=bkNorm(_bkFiltro.busca);
  return state.bancoTransacoes.filter(t=>{
    if(_bkFiltro.conta&&String(t.contaId)!==String(_bkFiltro.conta)) return false;
    if(_bkFiltro.mes&&t.data.slice(0,7)!==_bkFiltro.mes) return false;
    if(_bkFiltro.status&&t.status!==_bkFiltro.status) return false;
    if(b&&!bkNorm(t.desc).includes(b)) return false;
    return true;
  }).sort((a,b)=>b.data.localeCompare(a.data)||b.id-a.id);
}
function bancoExtratoLista(){
  const lista=bancoTxFiltradas();
  const ent=round2(lista.filter(t=>t.valor>0).reduce((s,t)=>s+t.valor,0));
  const sai=round2(lista.filter(t=>t.valor<0).reduce((s,t)=>s+Math.abs(t.valor),0));
  const rs=document.getElementById('bk-ext-resumo');
  if(rs) rs.innerHTML=`<div class="bk-sum">
      <div><div class="bk-mut">Entradas</div><div class="bk-val bk-pos">${fmt(ent)}</div></div>
      <div><div class="bk-mut">Saídas</div><div class="bk-val bk-neg">${fmt(sai)}</div></div>
      <div><div class="bk-mut">Resultado</div><div class="bk-val ${ent-sai<0?'bk-neg':'bk-pos'}">${bkSinal(round2(ent-sai))}</div></div></div>`;
  const el=document.getElementById('bk-ext-lista'); if(!el) return;
  if(lista.length===0){
    el.innerHTML=`<div style="text-align:center;padding:30px 10px;color:var(--muted)">${state.bancoTransacoes.length===0?'Nenhum lançamento ainda. Importe um extrato ou crie um lançamento manual.':'Nada encontrado com esses filtros.'}</div>`;
    return;
  }
  const mostra=lista.slice(0,_bkLimite);
  el.innerHTML=mostra.map(bancoTxRow).join('')+(lista.length>mostra.length?`<div style="text-align:center;padding:12px"><button class="btn btn-outline btn-sm" onclick="bancoMaisLinhas()">Mostrar mais (${lista.length-mostra.length})</button></div>`:'');
  bkIcones();
}
function bancoTxRow(t){
  const ic=t.status==='conciliado'?['circle-check','var(--green)']:t.status==='ignorado'?['ban','var(--muted)']:['clock','var(--gold)'];
  const vinc=t.status==='conciliado'?bancoVinculoTexto(t):'';
  const acao=t.status==='pendente'
    ?`<button class="btn btn-outline btn-sm" onclick="bancoConcAbrir(${t.id})">Conciliar</button>`
    :`<button class="btn btn-outline btn-sm" onclick="bancoDesfazer(${t.id})">Desfazer</button>`;
  const del=(t.origem==='manual'&&t.status!=='conciliado')?`<button class="icon-btn del" onclick="bancoExcluirLanc(${t.id})" title="Excluir"><i data-lucide="trash-2" class="ic"></i></button>`:'';
  return `<div class="bk-tx">
    <i data-lucide="${ic[0]}" style="width:20px;height:20px;color:${ic[1]};flex:none"></i>
    <div class="bk-grow"><div style="font-weight:600;overflow:hidden;text-overflow:ellipsis">${escapeHtml(t.desc||'(sem descrição)')}</div>
      <div class="bk-mut">${fmtDate(t.data)} · ${escapeHtml(bancoContaNome(t.contaId))}${vinc?' · '+escapeHtml(vinc):''}</div></div>
    <div style="text-align:right"><div class="bk-val ${t.valor>0?'bk-pos':'bk-neg'}">${bkSinal(t.valor)}</div>
      <div class="actions-cell" style="justify-content:flex-end;margin-top:4px">${acao}${del}</div></div>
  </div>`;
}

function bancoHtmlConciliar(){
  const pend=bancoPendentes().sort((a,b)=>b.data.localeCompare(a.data)||b.id-a.id);
  if(pend.length===0){
    return `<div style="text-align:center;padding:50px 20px"><h3 style="color:var(--green)">Nada a conciliar</h3>
      <p style="color:var(--muted);margin-top:8px">${state.bancoTransacoes.length===0?'Importe um extrato para começar.':'Todas as transações já foram conciliadas ou ignoradas.'}</p></div>`;
  }
  const ctx=bancoCtx();
  const mostra=pend.slice(0,50);
  return mostra.map(t=>bancoCardConciliar(t,ctx)).join('')+(pend.length>mostra.length?`<div class="bk-mut" style="text-align:center;padding:8px">Mostrando ${mostra.length} de ${pend.length}. Resolva estas para ver as próximas.</div>`:'');
}
function bancoCardConciliar(t,ctx){
  const s=bancoSugerir(t,ctx).find(x=>x.forca!=='baixa');
  const entrada=t.valor>0;
  return `<div class="bk-card">
    <div class="bk-row"><i data-lucide="${entrada?'arrow-down-left':'arrow-up-right'}" style="width:20px;height:20px;color:${entrada?'var(--green)':'var(--red)'};flex:none"></i>
      <div class="bk-grow"><div style="font-weight:700">${escapeHtml(t.desc||'(sem descrição)')}</div><div class="bk-mut">${fmtDate(t.data)} · ${escapeHtml(bancoContaNome(t.contaId))}</div></div>
      <div class="bk-val ${entrada?'bk-pos':'bk-neg'}">${bkSinal(t.valor)}</div></div>
    ${s?`<div class="bk-sug"><div class="bk-mut">Sugestão</div><div style="font-weight:700">${escapeHtml(s.titulo)}</div>
        <div class="bk-mut">${escapeHtml(s.detalhe)}</div><div style="margin-top:6px"><span class="bk-chip ${s.forca==='alta'?'g':''}">${escapeHtml(s.motivo)}</span></div></div>`
      :`<div style="margin:8px 0"><span class="bk-chip n">Sem correspondência automática</span></div>`}
    <div class="bk-btns">
      ${s?`<button class="btn btn-green" onclick="bancoAplicarSug(${t.id},'${s.tipo}',${s.id})">Conciliar</button>`:''}
      <button class="btn btn-outline" onclick="bancoConcAbrir(${t.id})">${s?'Outra opção':'Resolver'}</button>
      <button class="btn btn-outline" onclick="bancoIgnorar(${t.id})">Ignorar</button>
    </div></div>`;
}

// ───────── modal: conciliação manual ─────────
function bancoConcAbrir(txId){
  const t=state.bancoTransacoes.find(x=>x.id==txId); if(!t||t.status!=='pendente') return;
  const ctx=bancoCtx();
  _bkConcPre=bancoSugerir(t,ctx)[0]||null;
  const entrada=t.valor>0;
  document.getElementById('bk-conc-id').value=t.id;
  document.getElementById('bk-conc-resumo').innerHTML=`<div class="bk-row"><div class="bk-grow"><div style="font-weight:700">${escapeHtml(t.desc||'(sem descrição)')}</div>
    <div class="bk-mut">${fmtDate(t.data)} · ${escapeHtml(bancoContaNome(t.contaId))}</div></div><div class="bk-val ${entrada?'bk-pos':'bk-neg'}">${bkSinal(t.valor)}</div></div>`;
  const opcoes=[[entrada?'cliente':'fornecedor',entrada?'Pagamento de cliente (fiado)':'Pagamento a fornecedor'],
    ['financeiro','Vincular a lançamento que já existe no Financeiro'],
    ['avulso',entrada?'Lançar como receita avulsa':'Lançar como despesa avulsa']];
  const padrao=_bkConcPre?_bkConcPre.tipo:opcoes[0][0];
  document.getElementById('bk-conc-acao').innerHTML=opcoes.map(o=>`<option value="${o[0]}"${o[0]===padrao?' selected':''}>${o[1]}</option>`).join('');
  bancoConcCampos();
  if(typeof popularCategoriasDespesaLista==='function') popularCategoriasDespesaLista();
  openModal('modal-banco-conc');
}
function bancoConcCampos(){
  const t=state.bancoTransacoes.find(x=>x.id==document.getElementById('bk-conc-id').value); if(!t) return;
  const acao=document.getElementById('bk-conc-acao').value;
  const el=document.getElementById('bk-conc-campos');
  const ctx=bancoCtx(), v=round2(Math.abs(t.valor));
  const pre=(_bkConcPre&&_bkConcPre.tipo===acao)?_bkConcPre.id:null;
  if(acao==='cliente'||acao==='fornecedor'){
    const entrada=acao==='cliente';
    const itens=(entrada?state.clientes.filter(estaAtivo):state.fornecedores.filter(f=>f.status!=='inativo'))
      .map(p=>({p,saldo:entrada?bkSaldoCli(ctx,p.id):bkSaldoForn(ctx,p.id)})).filter(x=>x.saldo>0.009)
      .sort((a,b)=>String(a.p.nome).localeCompare(String(b.p.nome),'pt-BR'));
    if(itens.length===0){ el.innerHTML=`<p style="color:var(--muted);font-size:13px">${entrada?'Nenhum cliente com saldo em aberto.':'Nenhum fornecedor com saldo em aberto.'} Use a opção de lançamento avulso.</p>`; return; }
    el.innerHTML=`<div class="form-group"><label>${entrada?'Cliente':'Fornecedor'}</label><select class="form-control" id="bk-conc-alvo">`+
      itens.map(x=>`<option value="${x.p.id}"${x.p.id==pre?' selected':''}>${escapeHtml(x.p.nome)} — ${entrada?'deve':'em aberto'} ${fmt(x.saldo)}${x.saldo<v-0.009?' (menor que o valor)':''}</option>`).join('')+
      `</select></div><div class="bk-mut">O valor não pode passar do saldo em aberto.</div>`;
  } else if(acao==='financeiro'){
    const tipo=t.valor>0?'entrada':'saida';
    const cand=state.financeiro.filter(f=>f.tipo===tipo&&!ctx.finUsados.has(f.id)&&bkDias(f.data,t.data)<=60)
      .sort((a,b)=>Math.abs(round2(a.valor)-v)-Math.abs(round2(b.valor)-v)||bkDias(a.data,t.data)-bkDias(b.data,t.data)).slice(0,40);
    if(cand.length===0){ el.innerHTML=`<p style="color:var(--muted);font-size:13px">Nenhum lançamento livre nos últimos 60 dias em torno desta data.</p>`; return; }
    el.innerHTML=`<div class="form-group"><label>Lançamento do Financeiro</label><select class="form-control" id="bk-conc-alvo">`+
      cand.map(f=>`<option value="${f.id}"${f.id==pre?' selected':''}>${fmtDate(f.data)} · ${escapeHtml(f.desc)} · ${fmt(f.valor)}${Math.abs(round2(f.valor)-v)>0.009?' (valor diferente)':''}</option>`).join('')+
      `</select></div><div class="bk-mut">Só liga os dois, sem criar nada novo, então não duplica o caixa.</div>`;
  } else {
    el.innerHTML=(t.valor<0?`<div class="form-group"><label>Categoria da despesa (opcional)</label><input class="form-control" id="bk-conc-cat" list="lanc-categoria-lista" placeholder="Ex.: Tarifas bancárias"></div>`:'')+
      `<div class="bk-mut">Cria um lançamento novo no Financeiro com esta data e este valor. Se já lançou isso por lá, prefira vincular.</div>`;
  }
}
function bancoConcConfirmar(){
  const txId=parseInt(document.getElementById('bk-conc-id').value);
  const acao=document.getElementById('bk-conc-acao').value;
  const alvoEl=document.getElementById('bk-conc-alvo');
  const alvo=alvoEl?parseInt(alvoEl.value):null;
  let ok=false;
  if(acao==='cliente') ok=bancoConciliarCliente(txId,alvo);
  else if(acao==='fornecedor') ok=bancoConciliarFornecedor(txId,alvo);
  else if(acao==='financeiro') ok=bancoConciliarFinanceiro(txId,alvo);
  else { const c=document.getElementById('bk-conc-cat'); ok=bancoConciliarAvulso(txId,c?c.value:''); }
  if(ok) closeModal('modal-banco-conc');
}

// ───────── modal: conta ─────────
function bancoNovaConta(){
  document.getElementById('bk-conta-id').value='';
  document.getElementById('bk-conta-titulo').textContent='Nova conta';
  document.getElementById('bk-conta-nome').value='';
  document.getElementById('bk-conta-tipo').value='corrente';
  document.getElementById('bk-conta-saldo').value='';
  openModal('modal-banco-conta');
}
function bancoEditarConta(id){
  const c=state.bancoContas.find(x=>x.id==id); if(!c) return;
  document.getElementById('bk-conta-id').value=c.id;
  document.getElementById('bk-conta-titulo').textContent='Editar conta';
  document.getElementById('bk-conta-nome').value=c.nome;
  document.getElementById('bk-conta-tipo').value=c.tipo||'corrente';
  document.getElementById('bk-conta-saldo').value=c.saldoInicial||'';
  openModal('modal-banco-conta');
}
function bancoSalvarConta(){
  bancoGarantirEstado();
  const nome=document.getElementById('bk-conta-nome').value.trim();
  const tipo=document.getElementById('bk-conta-tipo').value;
  const bruto=document.getElementById('bk-conta-saldo').value;
  const saldo=bruto===''?0:bkNum(bruto);
  if(!nome){ showToast('Informe o nome da conta','red'); return; }
  if(isNaN(saldo)){ showToast('Saldo inicial inválido','red'); return; }
  const id=parseInt(document.getElementById('bk-conta-id').value);
  if(id){
    const c=state.bancoContas.find(x=>x.id===id); if(!c) return;
    c.nome=nome; c.tipo=tipo; c.saldoInicial=round2(saldo);
  } else {
    state.bancoContas.push({id:nextId('bancoContas'),nome,tipo,saldoInicial:round2(saldo),origem:'manual',ultimaImportacao:null,ativo:true});
  }
  marcarAlterado(); closeModal('modal-banco-conta');
  showToast('Conta salva','green'); renderBanco();
}
function bancoExcluirConta(id){
  const c=state.bancoContas.find(x=>x.id==id); if(!c) return;
  const n=state.bancoTransacoes.filter(t=>t.contaId==id).length;
  confirmarAcao(n>0?`Excluir "${c.nome}" e os ${n} lançamento${n!==1?'s':''} do extrato? O que já foi criado no Financeiro por conciliação não é apagado.`:`Excluir a conta "${c.nome}"?`,()=>{
    state.bancoTransacoes=state.bancoTransacoes.filter(t=>t.contaId!=id);
    state.bancoContas=state.bancoContas.filter(x=>x.id!=id);
    if(String(_bkFiltro.conta)===String(id)) _bkFiltro.conta='';
    marcarAlterado(); showToast('Conta excluída','green'); renderBanco();
  });
}

// ───────── modal: lançamento manual ─────────
function bancoNovoLanc(){
  const contas=bancoContasAtivas();
  if(contas.length===0){ showToast('Cadastre uma conta primeiro','red'); bancoNovaConta(); return; }
  document.getElementById('bk-lanc-conta').innerHTML=contas.map(c=>`<option value="${c.id}"${String(c.id)===String(_bkFiltro.conta)?' selected':''}>${escapeHtml(c.nome)}</option>`).join('');
  document.getElementById('bk-lanc-data').value=today();
  document.getElementById('bk-lanc-tipo').value='entrada';
  document.getElementById('bk-lanc-valor').value='';
  document.getElementById('bk-lanc-desc').value='';
  openModal('modal-banco-lanc');
}
function bancoSalvarLanc(){
  bancoGarantirEstado();
  const contaId=parseInt(document.getElementById('bk-lanc-conta').value);
  const data=document.getElementById('bk-lanc-data').value||today();
  const tipo=document.getElementById('bk-lanc-tipo').value;
  const v=bkNum(document.getElementById('bk-lanc-valor').value);
  const desc=document.getElementById('bk-lanc-desc').value.trim();
  if(!contaId){ showToast('Escolha a conta','red'); return; }
  if(isNaN(v)||v<=0){ showToast('Informe um valor maior que zero','red'); return; }
  const id=nextId('bancoTransacoes');
  state.bancoTransacoes.push({id,contaId,data,valor:round2(tipo==='saida'?-Math.abs(v):Math.abs(v)),desc,extId:'m:'+id,origem:'manual',status:'pendente',vinculo:null,criadoEm:today()});
  marcarAlterado(); closeModal('modal-banco-lanc');
  showToast('Lançamento criado','green'); renderBanco();
}
function bancoExcluirLanc(id){
  confirmarAcao('Excluir este lançamento do extrato?',()=>{
    state.bancoTransacoes=state.bancoTransacoes.filter(t=>t.id!=id);
    marcarAlterado(); renderBanco();
  });
}

// ───────── modal: importar extrato ─────────
function bancoAbrirImportar(){
  bancoGarantirEstado();
  const contas=bancoContasAtivas();
  if(contas.length===0){ showToast('Cadastre uma conta antes de importar','red'); bancoNovaConta(); return; }
  const pref=_bkFiltro.conta||(contas.slice().sort((a,b)=>String(b.ultimaImportacao||'').localeCompare(String(a.ultimaImportacao||'')))[0].id);
  document.getElementById('bk-imp-conta').innerHTML=contas.map(c=>`<option value="${c.id}"${String(c.id)===String(pref)?' selected':''}>${escapeHtml(c.nome)}</option>`).join('');
  document.getElementById('bk-imp-arquivo').value='';
  document.getElementById('bk-imp-nome').textContent='Escolher arquivo OFX ou CSV';
  document.getElementById('bk-imp-previa').innerHTML='';
  document.getElementById('bk-imp-ok').textContent='Importar';
  _bkImp=null;
  openModal('modal-banco-importar');
}
function bancoImpArquivo(input){
  const f=input.files&&input.files[0]; if(!f) return;
  document.getElementById('bk-imp-nome').textContent=f.name;
  const previa=document.getElementById('bk-imp-previa');
  const reader=new FileReader();
  reader.onerror=()=>{ previa.innerHTML='<div class="bk-neg" style="font-size:13px">Não consegui ler o arquivo.</div>'; };
  reader.onload=()=>{
    try{
      const txt=bkDecodificar(reader.result);
      const ehOfx=/<STMTTRN>/i.test(txt)||/<OFX>/i.test(txt);
      const linhas=ehOfx?bancoParseOfx(txt):bancoParseCsv(txt);
      bkChaves(linhas);
      _bkImp={nome:f.name,origem:ehOfx?'ofx':'csv',linhas};
      bancoImpAnalisar();
    }catch(e){
      _bkImp=null;
      document.getElementById('bk-imp-ok').textContent='Importar';
      previa.innerHTML=`<div class="bk-neg" style="font-size:13px">${escapeHtml(e.message||'Arquivo não reconhecido.')}</div>`;
    }
  };
  reader.readAsArrayBuffer(f);
}
function bancoImpConta(){ if(_bkImp) bancoImpAnalisar(); }
function bancoImpAnalisar(){
  const contaId=document.getElementById('bk-imp-conta').value;
  const existentes=new Set(state.bancoTransacoes.filter(t=>String(t.contaId)===String(contaId)).map(t=>t.extId));
  const novas=_bkImp.linhas.filter(l=>!existentes.has(l.extId));
  const dup=_bkImp.linhas.length-novas.length;
  const datas=_bkImp.linhas.map(l=>l.data).sort();
  const ok=document.getElementById('bk-imp-ok');
  ok.textContent=novas.length>0?`Importar ${novas.length} lançamento${novas.length!==1?'s':''}`:'Nada novo para importar';
  document.getElementById('bk-imp-previa').innerHTML=`<div class="bk-card" style="margin-top:10px;padding:4px 14px">
    <div class="bk-mut" style="padding:8px 0 2px">${_bkImp.linhas.length} lançamento${_bkImp.linhas.length!==1?'s':''} (${fmtDate(datas[0])} a ${fmtDate(datas[datas.length-1])})${dup>0?` · ${dup} já importado${dup!==1?'s':''} (serão ignorados)`:''}</div>
    ${novas.slice(0,5).map(l=>`<div class="bk-tx"><div class="bk-grow"><div>${escapeHtml(l.desc||'(sem descrição)')}</div><div class="bk-mut">${fmtDate(l.data)}</div></div><div class="bk-val ${l.valor>0?'bk-pos':'bk-neg'}">${bkSinal(l.valor)}</div></div>`).join('')}
    ${novas.length>5?`<div class="bk-mut" style="padding:8px 0">e mais ${novas.length-5}…</div>`:''}</div>`;
}
function bancoImpConfirmar(){
  if(!_bkImp){ showToast('Escolha um arquivo primeiro','red'); return; }
  const contaId=parseInt(document.getElementById('bk-imp-conta').value);
  const r=bancoImportarTransacoes(contaId,_bkImp.linhas,_bkImp.origem);
  closeModal('modal-banco-importar');
  _bkImp=null;
  if(r.novas===0){ showToast('Nada novo: todos os lançamentos já estavam importados','red'); return; }
  showToast(`${r.novas} lançamento${r.novas!==1?'s':''} importado${r.novas!==1?'s':''}${r.duplicadas>0?` · ${r.duplicadas} repetido${r.duplicadas!==1?'s':''} ignorado${r.duplicadas!==1?'s':''}`:''}`,'green');
  _bkTab='conciliar';
  const pg=document.querySelector('.page.active');
  if(!pg||pg.id!=='page-banco') goto('banco'); else renderBanco();
}
