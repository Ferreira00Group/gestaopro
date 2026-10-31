// ============ RELACIONAMENTO, CAIXA DIÁRIO E PREVISÃO (v5.45) ============
// Tudo calculado em cima das vendas já registradas (nada novo para cadastrar):
//  • Segmentos de cliente: VIP, Frequente, Inativo, "Recompra próxima"
//  • Ranking de clientes (faturamento, lucro estimado, nº de compras, última compra)
//  • Próxima compra prevista = última compra + intervalo médio entre compras (mín. 2 compras)
//  • WhatsApp de relacionamento (registra uma atividade concluída no CRM)
//  • Caixa diário (aba em Relatórios) e Previsão de vendas (aba em Relatórios)

let relFiltro='todos';
let relOrdem='fat';

const REL_DIA=86400000;
function relDias(a,b){ // diferença em dias entre duas datas YYYY-MM-DD (b - a)
  const pa=a.split('-'), pb=b.split('-');
  return Math.round((Date.UTC(+pb[0],+pb[1]-1,+pb[2])-Date.UTC(+pa[0],+pa[1]-1,+pa[2]))/REL_DIA);
}
function relSomaDias(data,n){
  const p=data.split('-'); const d=new Date(Date.UTC(+p[0],+p[1]-1,+p[2])+n*REL_DIA);
  return d.toISOString().slice(0,10);
}
function relVendasValidas(){ return state.vendas.filter(v=>v.tipo!=='orcamento'&&v.data); }
function relLucroVenda(v){
  const custo=(v.itens||[]).reduce((s,it)=>s+(it.qtd||0)*(it.custoFichaUn||0),0);
  return (v.total||0)-custo;
}

// Calcula métricas e segmentos de todos os clientes ativos
function relCalcClientes(){
  const hoje=today(), ini12=relSomaDias(hoje,-365);
  const porCli={};
  relVendasValidas().forEach(v=>{ (porCli[v.clienteId]=porCli[v.clienteId]||[]).push(v); });
  const lista=state.clientes.filter(c=>estaAtivo(c)).map(c=>{
    const vs=(porCli[c.id]||[]).slice().sort((a,b)=>a.data.localeCompare(b.data));
    const datas=[...new Set(vs.map(v=>v.data))];
    const fat12=vs.filter(v=>v.data>=ini12).reduce((s,v)=>s+(v.total||0),0);
    const fat=vs.reduce((s,v)=>s+(v.total||0),0);
    const lucro=vs.reduce((s,v)=>s+relLucroVenda(v),0);
    const ultima=datas.length?datas[datas.length-1]:'';
    let intervalo=0;
    if(datas.length>=2) intervalo=Math.max(1,Math.round(relDias(datas[0],ultima)/(datas.length-1)));
    const diasSem=ultima?relDias(ultima,hoje):null;
    const proxima=(ultima&&intervalo)?relSomaDias(ultima,intervalo):'';
    return {c,compras:datas.length,fat,fat12,lucro,ultima,intervalo,diasSem,proxima,seg:{}};
  });
  // VIP: top 10% por faturamento dos últimos 12 meses (mínimo 1, só quem comprou no período)
  const comFat=lista.filter(x=>x.fat12>0).sort((a,b)=>b.fat12-a.fat12);
  const nVip=comFat.length?Math.max(1,Math.ceil(comFat.length*0.1)):0;
  comFat.slice(0,nVip).forEach(x=>x.seg.vip=true);
  lista.forEach(x=>{
    if(!x.ultima) return;
    // Inativo: passou de 2× o intervalo habitual (mínimo 60 dias); quem comprou 1 vez só: 90 dias
    const limite=x.intervalo?Math.max(60,x.intervalo*2):90;
    if(x.diasSem>limite) x.seg.inativo=true;
    // Frequente: 3+ compras, intervalo médio ≤ 30 dias, ainda ativo
    if(!x.seg.inativo&&x.compras>=3&&x.intervalo&&x.intervalo<=30) x.seg.frequente=true;
    // Recompra próxima: previsão vencida ou nos próximos 7 dias (e não inativo)
    if(!x.seg.inativo&&x.proxima&&x.proxima<=relSomaDias(hoje,7)) x.seg.recompra=true;
  });
  return lista;
}

function relWhats(clienteId){ crmAbrirEnvio(clienteId); }

// ── Aba "Clientes" do CRM ──
let relTag='';
function relSetFiltro(v){ relFiltro=v; renderCRM(); }
function relSetOrdem(v){ relOrdem=v; renderCRM(); }
function relSetTag(v){ relTag=v; renderCRM(); }
function relSetSeg(v){ relSegId=v?parseInt(v):null; relCritTemp=null; if(v){ relFiltro='todos'; relTag=''; } renderCRM(); }
function relLimparCrit(){ relSegId=null; relCritTemp=null; renderCRM(); }
function relSalvarCritTemp(){ segAbrir(null,relCritTemp); }
// "+ Segmento": já abre preenchido com o filtro e a tag que estão na tela
function relNovoSegmento(){ segAbrir(null,{segs:relFiltro!=='todos'?[relFiltro]:[],tags:relTag?[relTag]:[]}); }
function relHtmlClientes(){
  let lista=relCalcClientes();
  const cont={vip:0,frequente:0,inativo:0,recompra:0};
  lista.forEach(x=>Object.keys(cont).forEach(k=>{ if(x.seg[k]) cont[k]++; }));
  const todos=lista;
  const segsSalvos=state.crmSegmentos||[];
  if(relSegId&&!segsSalvos.some(s=>s.id==relSegId)) relSegId=null;
  const segSel=relSegId?segsSalvos.find(s=>s.id==relSegId):null;
  const critAtiva=segSel?segNormaliza(segSel.crit):(relCritTemp?segNormaliza(relCritTemp):null);
  const tags=typeof c360TodasTags==='function'?c360TodasTags():[];
  if(relTag&&!tags.includes(relTag)) relTag='';
  if(critAtiva) lista=lista.filter(x=>segCasa(x,critAtiva));
  else {
    if(relFiltro!=='todos') lista=lista.filter(x=>x.seg[relFiltro]);
    else lista=lista.filter(x=>x.compras>0||(x.c.tags||[]).length);
    if(relTag) lista=lista.filter(x=>(x.c.tags||[]).includes(relTag));
  }
  const ord={fat:(a,b)=>b.fat12-a.fat12||b.fat-a.fat, lucro:(a,b)=>b.lucro-a.lucro, compras:(a,b)=>b.compras-a.compras,
    ultima:(a,b)=>(b.ultima||'').localeCompare(a.ultima||''), proxima:(a,b)=>(a.proxima||'9999').localeCompare(b.proxima||'9999')};
  lista.sort(ord[relOrdem]||ord.fat);
  const opt=(v,t,sel)=>`<option value="${escapeHtml(v)}"${sel===v?' selected':''}>${escapeHtml(t)}</option>`;
  const selFiltro=`<select class="filter" style="max-width:none" onchange="relSetFiltro(this.value)">
      ${opt('todos','Todos que já compraram',relFiltro)}${opt('vip','VIP ('+cont.vip+')',relFiltro)}${opt('frequente','Frequentes ('+cont.frequente+')',relFiltro)}
      ${opt('inativo','Inativos ('+cont.inativo+')',relFiltro)}${opt('recompra','Recompra próxima ('+cont.recompra+')',relFiltro)}</select>`;
  const selTag=tags.length?`<select class="filter" style="max-width:none" onchange="relSetTag(this.value)">${opt('','Todas as tags',relTag)}${tags.map(t=>opt(t,'#'+t,relTag)).join('')}</select>`:'';
  const selOrdem=`<select class="filter" style="max-width:none" onchange="relSetOrdem(this.value)">
      ${opt('fat','Ordem: faturamento 12m',relOrdem)}${opt('lucro','Ordem: lucro estimado',relOrdem)}${opt('compras','Ordem: nº de compras',relOrdem)}
      ${opt('ultima','Ordem: última compra',relOrdem)}${opt('proxima','Ordem: próxima compra',relOrdem)}</select>`;
  const segAtual=relSegId?String(relSegId):'';
  const selSeg=`<select class="filter" style="max-width:none" onchange="relSetSeg(this.value)">${opt('','Segmento salvo: nenhum',segAtual)}${segsSalvos.map(sg=>opt(String(sg.id),sg.nome+' ('+todos.filter(x=>segCasa(x,segNormaliza(sg.crit))).length+')',segAtual)).join('')}</select>`;
  const barraSeg=`<div class="crm-toolbar">${selSeg}<button class="btn btn-outline btn-sm" onclick="relNovoSegmento()"><i data-lucide="plus" class="ic"></i> Segmento</button></div>`;
  const banner=critAtiva?`<div class="crm-item" style="margin-bottom:10px"><div class="crm-item-main"><strong>${segSel?escapeHtml(segSel.nome):'Filtro do insight'}</strong> <span class="crm-chip">${lista.length} cliente(s)</span>
      <div class="crm-card-sub">${escapeHtml(segDescreve(critAtiva))}</div></div>
      <div class="actions-cell">${segSel?`<button class="btn btn-outline btn-sm" onclick="segAbrir(${segSel.id})">Editar</button>`:`<button class="btn btn-primary btn-sm" onclick="relSalvarCritTemp()">Salvar</button>`}
      <button class="btn btn-outline btn-sm" onclick="relLimparCrit()">Limpar</button></div></div>`:'';
  const filtros=barraSeg+banner+`<div class="search-bar">${critAtiva?'':selFiltro+selTag}${selOrdem}</div>
    <div class="crm-resumo"><span><strong>${cont.vip}</strong> VIP</span><span><strong>${cont.frequente}</strong> frequentes</span><span><strong>${cont.inativo}</strong> inativos</span><span><strong>${cont.recompra}</strong> recompra próxima</span></div>`;
  if(!lista.length) return filtros+'<div class="crm-vazio" style="padding:30px">Nenhum cliente neste filtro.</div>';
  const hoje=today();
  return filtros+'<div class="crm-lista">'+lista.slice(0,100).map((x,i)=>{
    const b=(x.seg.vip?'<span class="badge badge-yellow">VIP</span> ':'')+(x.seg.frequente?'<span class="badge badge-green">Frequente</span> ':'')+(x.seg.inativo?'<span class="badge badge-red">Inativo</span> ':'')+(x.seg.recompra?'<span class="badge badge-blue">Recompra próxima</span> ':'');
    const tg=(x.c.tags||[]).map(t=>`<span class="crm-chip">${escapeHtml(t)}</span>`).join(' ');
    let prox='';
    if(x.proxima){ const atras=x.proxima<hoje; prox=`<span class="${atras&&!x.seg.inativo?'crm-atraso':''}">Próxima prevista: ${fmtDate(x.proxima)}${atras?' ('+relDias(x.proxima,hoje)+'d de atraso)':''}</span>`; }
    return `<div class="crm-item"><div class="crm-item-main"><strong class="crm-link" onclick="abrirCliente360(${x.c.id})">${i+1}. ${escapeHtml(x.c.nome)}</strong> ${b}${tg}
      <div class="crm-card-sub">12m: <strong>${fmt(x.fat12)}</strong> · Lucro est.: ${fmt(x.lucro)} · ${x.compras} compra(s)${x.intervalo?' · a cada '+x.intervalo+'d':''}</div>
      <div class="crm-card-sub">Última: ${x.ultima?fmtDate(x.ultima)+' ('+x.diasSem+'d)':'—'}${prox?' · '+prox:''}</div></div>
      <div class="actions-cell">${x.c.tel?`<button class="btn btn-whatsapp btn-sm" title="WhatsApp" onclick="crmAbrirEnvio(${x.c.id})"><i data-lucide="message-circle" class="ic"></i></button>`:''}
      <button class="btn btn-outline btn-sm" onclick="abrirCliente360(${x.c.id})">Ficha</button></div></div>`;
  }).join('')+'</div>'+(lista.length>100?`<div class="crm-vazio">Mostrando os 100 primeiros de ${lista.length}</div>`:'');
}

// ── CAIXA DIÁRIO (Relatórios) ──
function relRenderCaixa(){
  const el=document.getElementById('rel-tab-caixa-conteudo'); if(!el) return;
  const inp=document.getElementById('caixa-dia'); if(!inp.value) inp.value=today();
  const dia=inp.value;
  const fin=state.financeiro||[];
  const anterior=fin.filter(f=>f.data<dia).reduce((s,f)=>s+(f.tipo==='entrada'?f.valor:-f.valor),0);
  const movs=fin.filter(f=>f.data===dia);
  const ent=movs.filter(f=>f.tipo==='entrada').reduce((s,f)=>s+f.valor,0);
  const sai=movs.filter(f=>f.tipo==='saida').reduce((s,f)=>s+f.valor,0);
  const final=anterior+ent-sai;
  const card=(l,v,c)=>`<div class="stat-card ${c||''}"><div class="label">${l}</div><div class="value">${v}</div></div>`;
  el.innerHTML=`<div class="cards-grid cards-grid-4" style="margin-bottom:14px">
    ${card('Saldo anterior',fmt(anterior))}${card('Entradas',fmt(ent),'green')}${card('Saídas',fmt(sai),'red')}${card('Saldo do dia',fmt(final),final>=0?'green':'red')}</div>
    <div class="table-card"><div class="table-scroll"><table><thead><tr><th>Tipo</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>
    ${movs.length?movs.slice().sort((a,b)=>(b.id||0)-(a.id||0)).map(f=>`<tr><td data-label="Tipo"><span class="badge ${f.tipo==='entrada'?'badge-green':'badge-red'}">${f.tipo==='entrada'?'Entrada':'Saída'}</span></td><td data-label="Descrição">${escapeHtml(f.desc||'')}</td><td data-label="Valor" style="font-weight:600;color:var(--${f.tipo==='entrada'?'green':'red'})">${f.tipo==='entrada'?'+':'−'} ${fmt(f.valor)}</td></tr>`).join('')
      :'<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:24px">Nenhum lançamento neste dia</td></tr>'}
    </tbody></table></div></div>`;
}
function relCaixaDia(delta){
  const inp=document.getElementById('caixa-dia'); inp.value=relSomaDias(inp.value||today(),delta); relRenderCaixa();
}

// ── PREVISÃO DE VENDAS (Relatórios) ──
function relRenderPrevisao(){
  const el=document.getElementById('rel-tab-previsao-conteudo'); if(!el) return;
  const hoje=today(), mesAtual=hoje.slice(0,7);
  const meses=getUltimosMeses(7); // 6 anteriores + atual
  const fat={}; relVendasValidas().forEach(v=>{ const m=v.data.slice(0,7); fat[m]=(fat[m]||0)+(v.total||0); });
  const hist=meses.slice(0,-1).map(m=>({m,v:fat[m]||0}));
  const comDados=hist.filter(h=>h.v>0);
  const realizado=fat[mesAtual]||0;
  const [ano,mes]=mesAtual.split('-').map(Number);
  const diasMes=new Date(ano,mes,0).getDate(), diaAtual=parseInt(hoje.slice(8,10));
  const projLinear=diaAtual>0?realizado/diaAtual*diasMes:realizado;
  const ult3=hist.slice(-3), pesos=[1,2,3];
  const somaPesos=ult3.reduce((s,_,i)=>s+pesos[i],0);
  const proxMes=ult3.length&&comDados.length>=2?ult3.reduce((s,h,i)=>s+h.v*pesos[i],0)/somaPesos:null;
  const meta=(state.metas&&state.metas[mesAtual])||0;
  const nomeMes=m=>{ const [a,n]=m.split('-'); return ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][+n-1]+'/'+a.slice(2); };
  const max=Math.max(1,projLinear,...hist.map(h=>h.v),realizado);
  const barras=hist.map(h=>`<div class="crm-barra"><span>${nomeMes(h.m)}</span><div><i style="width:${Math.round(h.v/max*100)}%;background:var(--primary)"></i></div><strong>${fmt(h.v)}</strong></div>`).join('')
    +`<div class="crm-barra"><span>${nomeMes(mesAtual)} (atual)</span><div><i style="width:${Math.round(realizado/max*100)}%;background:var(--green)"></i></div><strong>${fmt(realizado)}</strong></div>`
    +`<div class="crm-barra"><span>Projeção do mês</span><div><i style="width:${Math.round(projLinear/max*100)}%;background:var(--yellow);opacity:.6"></i></div><strong>${fmt(projLinear)}</strong></div>`;
  const card=(l,v,s,c)=>`<div class="stat-card ${c||''}"><div class="label">${l}</div><div class="value">${v}</div><div class="sub">${s||''}</div></div>`;
  const pctMeta=meta>0?Math.round(projLinear/meta*100):null;
  el.innerHTML=`<div class="cards-grid cards-grid-4" style="margin-bottom:14px">
    ${card('Realizado no mês',fmt(realizado),'dia '+diaAtual+' de '+diasMes,'green')}
    ${card('Projeção do mês',fmt(projLinear),'ritmo atual mantido')}
    ${card('Meta do mês',meta>0?fmt(meta):'—',pctMeta===null?'defina a meta no Dashboard':'projeção = '+pctMeta+'% da meta',pctMeta!==null&&pctMeta<100?'red':'')}
    ${card('Próximo mês (estimativa)',proxMes===null?'—':fmt(proxMes),proxMes===null?'precisa de 2+ meses de vendas':'média ponderada dos últimos 3 meses')}</div>
    <div class="table-card" style="padding:14px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);margin-bottom:10px">Faturamento mensal (vendas, sem orçamentos)</div>${barras}
    <div style="margin-top:10px;font-size:11.5px;color:var(--muted)">É uma estimativa simples sobre o histórico; não considera sazonalidade nem pedidos já combinados.</div></div>`;
}

// ============ SEGMENTOS SALVOS E COMBINÁVEIS (v5.48.1) ============
// state.crmSegmentos [{id,nome,crit,criadoEm}]
// crit: {segs:['vip'|'frequente'|'inativo'|'recompra'], tags:[], modo:'todos'|'qualquer',
//        semCompraMin, semCompraMax (dias desde a última compra), fat12Min, comprasMin, comprasMax,
//        devedor:''|'sim'|'nao', comTel:bool}
// Regra: segmentos + tags combinam conforme "modo" (todos = E, qualquer = OU); os demais critérios sempre valem juntos (E).
// segCasa() é a única regra de filtro — usada pela aba Clientes, pelos insights e (próxima etapa) por automações e fila de envio.
const SEG_BASE=[['vip','VIP'],['frequente','Frequente'],['inativo','Inativo'],['recompra','Recompra próxima']];
const SEG_NUM=['semCompraMin','semCompraMax','fat12Min','comprasMin','comprasMax'];
let relSegId=null;     // segmento salvo selecionado na aba Clientes
let relCritTemp=null;  // filtro temporário vindo de um insight (ainda não salvo)
let segEditId=null;

function segCritVazio(){ return {segs:[],tags:[],modo:'todos',semCompraMin:null,semCompraMax:null,fat12Min:null,comprasMin:null,comprasMax:null,devedor:'',comTel:false}; }
function segNormaliza(k){ const b={...segCritVazio(),...(k||{})}; b.segs=Array.isArray(b.segs)?b.segs:[]; b.tags=Array.isArray(b.tags)?b.tags:[]; return b; }
function segTemCriterio(k){ k=segNormaliza(k); return !!(k.segs.length||k.tags.length||SEG_NUM.some(f=>k[f]!=null)||k.devedor||k.comTel); }
function segCasa(x,k){
  k=segNormaliza(k);
  const grupo=k.segs.map(s=>!!x.seg[s]).concat(k.tags.map(t=>(x.c.tags||[]).includes(t)));
  if(grupo.length&&!(k.modo==='qualquer'?grupo.some(Boolean):grupo.every(Boolean))) return false;
  if(k.semCompraMin!=null&&!(x.diasSem!=null&&x.diasSem>=k.semCompraMin)) return false;
  if(k.semCompraMax!=null&&!(x.diasSem!=null&&x.diasSem<=k.semCompraMax)) return false;
  if(k.fat12Min!=null&&!(x.fat12>=k.fat12Min)) return false;
  if(k.comprasMin!=null&&!(x.compras>=k.comprasMin)) return false;
  if(k.comprasMax!=null&&!(x.compras<=k.comprasMax)) return false;
  if(k.comTel&&!String(x.c.tel||'').replace(/\D/g,'')) return false;
  if(k.devedor){ const dev=getSaldoCliente(x.c.id)>0.01; if((k.devedor==='sim')!==dev) return false; }
  return true;
}
function segClientes(k,lista){ return (lista||relCalcClientes()).filter(x=>segCasa(x,k)); }
function segDescreve(k){
  k=segNormaliza(k); const p=[];
  const g=k.segs.map(s=>(SEG_BASE.find(b=>b[0]===s)||[0,s])[1]).concat(k.tags.map(t=>'#'+t));
  if(g.length) p.push(g.join(k.modo==='qualquer'?' ou ':' + '));
  if(k.semCompraMin!=null&&k.semCompraMax!=null) p.push('última compra há '+k.semCompraMin+' a '+k.semCompraMax+' dias');
  else if(k.semCompraMin!=null) p.push('sem comprar há '+k.semCompraMin+'+ dias');
  else if(k.semCompraMax!=null) p.push('comprou há até '+k.semCompraMax+' dias');
  if(k.fat12Min!=null) p.push('12m ≥ '+fmt(k.fat12Min));
  if(k.comprasMin!=null&&k.comprasMax!=null&&k.comprasMin===k.comprasMax) p.push(k.comprasMin+' compra(s)');
  else { if(k.comprasMin!=null) p.push('≥ '+k.comprasMin+' compras'); if(k.comprasMax!=null) p.push('≤ '+k.comprasMax+' compras'); }
  if(k.devedor) p.push(k.devedor==='sim'?'com saldo devedor':'sem saldo devedor');
  if(k.comTel) p.push('com telefone');
  return p.join(' · ')||'Sem critérios';
}

// ── Modal de criar/editar segmento (criado no primeiro uso) ──
function segModais(){
  if(document.getElementById('modal-crm-seg')) return;
  const chk=(cls,v,t)=>`<label style="display:flex;align-items:center;gap:6px;font-size:13px"><input type="checkbox" class="${cls}" value="${escapeHtml(v)}"> ${escapeHtml(t)}</label>`;
  const num=(id,ph)=>`<input class="form-control" id="${id}" type="number" min="0" step="any" inputmode="decimal" placeholder="${ph}">`;
  const w=document.createElement('div');
  w.innerHTML=`
<div class="modal-overlay" id="modal-crm-seg"><div class="modal">
  <div class="modal-header"><h3 id="seg-titulo">Novo segmento</h3><button class="modal-close" onclick="closeModal('modal-crm-seg')"><i data-lucide="x" class="ic"></i></button></div>
  <div class="modal-body" oninput="segPrevia()" onchange="segPrevia()">
    <div class="form-group"><label>Nome do segmento</label><input class="form-control" id="seg-nome" maxlength="30" placeholder="Ex: VIP sumidos"></div>
    <div class="form-group"><label>Segmentos</label><div style="display:flex;flex-wrap:wrap;gap:6px 16px">${SEG_BASE.map(b=>chk('seg-chk-seg',b[0],b[1])).join('')}</div></div>
    <div class="form-group"><label>Tags</label><div id="seg-tags" style="display:flex;flex-wrap:wrap;gap:6px 16px"></div></div>
    <div class="form-group"><label>Segmentos e tags marcados</label><select class="form-control" id="seg-modo"><option value="todos">O cliente precisa ter todos (E)</option><option value="qualquer">Basta ter um deles (OU)</option></select></div>
    <div style="font-size:11.5px;color:var(--muted);margin:-4px 0 10px">Os filtros abaixo sempre valem juntos com o que está acima.</div>
    <div class="form-group"><label>Dias desde a última compra</label><div style="display:flex;gap:8px">${num('seg-semmin','de (mín.)')}${num('seg-semmax','até (máx.)')}</div></div>
    <div class="form-group"><label>Faturamento 12 meses (mínimo, R$)</label>${num('seg-fat','Ex: 500')}</div>
    <div class="form-group"><label>Número de compras</label><div style="display:flex;gap:8px">${num('seg-cmin','mínimo')}${num('seg-cmax','máximo')}</div></div>
    <div class="form-group"><label>Saldo devedor</label><select class="form-control" id="seg-dev"><option value="">Tanto faz</option><option value="sim">Com saldo devedor</option><option value="nao">Sem saldo devedor</option></select></div>
    <div class="form-group">${chk('','1','Só clientes com telefone').replace('<input type="checkbox" class="" value="1">','<input type="checkbox" id="seg-tel">')}</div>
    <div class="crm-item" style="margin-bottom:10px"><div class="crm-item-main" id="seg-previa"></div></div>
    <div class="modal-footer">
      <button class="btn btn-outline" id="seg-del" style="margin-right:auto;display:none" onclick="segExcluir()">Excluir</button>
      <button class="btn btn-outline" onclick="closeModal('modal-crm-seg')">Cancelar</button>
      <button class="btn btn-primary" onclick="segSalvar()">Salvar</button>
    </div>
  </div>
</div></div>`;
  while(w.firstChild) document.body.appendChild(w.firstChild);
  const m=document.getElementById('modal-crm-seg');
  m.addEventListener('click',e=>{ if(e.target===m) m.classList.remove('open'); });
}
function segLerForm(){
  const num=id=>{ const v=document.getElementById(id).value.trim().replace(',','.'); if(v==='') return null; const n=parseFloat(v); return (isNaN(n)||n<0)?null:n; };
  const marc=sel=>[...document.querySelectorAll(sel+':checked')].map(e=>e.value);
  return {segs:marc('.seg-chk-seg'),tags:marc('.seg-chk-tag'),modo:document.getElementById('seg-modo').value==='qualquer'?'qualquer':'todos',
    semCompraMin:num('seg-semmin'),semCompraMax:num('seg-semmax'),fat12Min:num('seg-fat'),comprasMin:num('seg-cmin'),comprasMax:num('seg-cmax'),
    devedor:document.getElementById('seg-dev').value,comTel:document.getElementById('seg-tel').checked};
}
function segPrevia(){
  const el=document.getElementById('seg-previa'); if(!el) return;
  const k=segLerForm();
  if(!segTemCriterio(k)){ el.innerHTML='<span class="crm-card-sub">Escolha pelo menos um critério.</span>'; return; }
  const xs=segClientes(k);
  el.innerHTML=`<strong>${xs.length} cliente(s)</strong>${xs.length?`<div class="crm-card-sub">${escapeHtml(insNomes(xs))}</div>`:''}`;
}
function segAbrir(id,critInicial){
  crmGaranteEstado(); segModais();
  segEditId=id||null;
  const sg=id?state.crmSegmentos.find(s=>s.id==id):null;
  const k=segNormaliza(sg?sg.crit:critInicial);
  document.getElementById('seg-titulo').textContent=sg?'Editar segmento':'Novo segmento';
  document.getElementById('seg-nome').value=sg?sg.nome:'';
  const tags=[...new Set([...(typeof c360TodasTags==='function'?c360TodasTags():[]),...k.tags])];
  document.getElementById('seg-tags').innerHTML=tags.length?tags.map(t=>`<label style="display:flex;align-items:center;gap:6px;font-size:13px"><input type="checkbox" class="seg-chk-tag" value="${escapeHtml(t)}"> #${escapeHtml(t)}</label>`).join(''):'<span class="crm-card-sub">Nenhuma tag cadastrada ainda</span>';
  document.querySelectorAll('.seg-chk-seg').forEach(e=>{ e.checked=k.segs.includes(e.value); });
  document.querySelectorAll('.seg-chk-tag').forEach(e=>{ e.checked=k.tags.includes(e.value); });
  document.getElementById('seg-modo').value=k.modo;
  const v=x=>x==null?'':String(x);
  document.getElementById('seg-semmin').value=v(k.semCompraMin); document.getElementById('seg-semmax').value=v(k.semCompraMax);
  document.getElementById('seg-fat').value=v(k.fat12Min);
  document.getElementById('seg-cmin').value=v(k.comprasMin); document.getElementById('seg-cmax').value=v(k.comprasMax);
  document.getElementById('seg-dev').value=k.devedor||''; document.getElementById('seg-tel').checked=!!k.comTel;
  document.getElementById('seg-del').style.display=sg?'inline-flex':'none';
  segPrevia();
  document.getElementById('modal-crm-seg').classList.add('open');
}
function segSalvar(){
  const nome=document.getElementById('seg-nome').value.trim().slice(0,30);
  const crit=segLerForm();
  if(!nome){ showToast('Dê um nome ao segmento','red'); return; }
  if(!segTemCriterio(crit)){ showToast('Escolha pelo menos um critério','red'); return; }
  if(state.crmSegmentos.some(s=>s.id!=segEditId&&s.nome.toLowerCase()===nome.toLowerCase())){ showToast('Já existe um segmento com esse nome','red'); return; }
  let sg;
  if(segEditId){ sg=state.crmSegmentos.find(s=>s.id==segEditId); if(sg){ sg.nome=nome; sg.crit=crit; } }
  if(!sg){ sg={id:nextId('crmSegmentos'),nome,crit,criadoEm:today()}; state.crmSegmentos.push(sg); }
  relSegId=sg.id; relCritTemp=null; relFiltro='todos'; relTag=''; state.crm_tab='clientes';
  marcarAlterado(); closeModal('modal-crm-seg'); renderCRM(); showToast('Segmento salvo','green');
}
function segExcluir(){
  const id=segEditId; if(!id) return;
  confirmarAcao('Excluir este segmento? Os clientes não são afetados.',()=>{
    state.crmSegmentos=state.crmSegmentos.filter(s=>s.id!==id);
    if(relSegId==id) relSegId=null;
    marcarAlterado(); closeModal('modal-crm-seg'); renderCRM(); showToast('Segmento excluído','green');
  });
}

// ============ INSIGHTS AUTOMÁTICOS (v5.48.1) ============
// Calculados na hora (nada é gravado): cada insight de clientes carrega um "crit" — o mesmo formato dos segmentos —,
// então "Ver clientes" abre a lista já filtrada e dá para salvá-la como segmento com um toque.
const INS_VIP_DIAS=45, INS_POSVENDA_MIN=15, INS_POSVENDA_MAX=45, INS_LEAD_DIAS=7, INS_NEG_DIAS=14;
let _insCache=[];
function insPl(n,s,p){ return n+' '+(n===1?s:p); }
function insNomes(xs){ const n=xs.slice(0,3).map(x=>String(x.c.nome||'').split(' ')[0]).filter(Boolean); return n.join(', ')+(xs.length>3?' e mais '+(xs.length-3):''); }
function insCalcular(){
  const hoje=today(), todos=relCalcClientes(), out=[];
  const soma=(xs,f)=>xs.reduce((s,x)=>s+f(x),0);
  const cli=(id,ic,cor,crit,texto,extra)=>{
    const xs=segClientes(crit,todos); if(!xs.length) return;
    out.push({id,ic,cor,crit,acao:{tipo:'clientes',rotulo:'Ver clientes'},texto:texto(xs.length),sub:[extra?extra(xs):'',insNomes(xs)].filter(Boolean).join(' · ')});
  };
  cli('vip-parado','crown','var(--red)',{segs:['vip'],semCompraMin:INS_VIP_DIAS},n=>`${n} VIP sem comprar há ${INS_VIP_DIAS}+ dias`,xs=>'12m: '+fmt(soma(xs,x=>x.fat12)));
  cli('recompra','repeat','var(--green)',{segs:['recompra']},n=>`${insPl(n,'cliente','clientes')} com recompra prevista até 7 dias`);
  cli('inativos','user-x','var(--yellow)',{segs:['inativo']},n=>`${insPl(n,'cliente inativo','clientes inativos')}`,xs=>fmt(soma(xs,x=>x.fat12))+' faturados em 12m');
  cli('devedores','banknote','var(--red)',{devedor:'sim'},n=>`${insPl(n,'cliente','clientes')} com saldo devedor`,xs=>fmt(soma(xs,x=>getSaldoCliente(x.c.id)))+' a receber');
  cli('posvenda','heart-handshake','var(--primary)',{comprasMin:1,comprasMax:1,semCompraMin:INS_POSVENDA_MIN,semCompraMax:INS_POSVENDA_MAX},n=>`${insPl(n,'cliente','clientes')} com 1 compra há ${INS_POSVENDA_MIN}–${INS_POSVENDA_MAX} dias: hora do pós-venda`);
  const leads=(state.crmLeads||[]).filter(l=>l.status==='novo'&&l.criadoEm&&relDias(l.criadoEm,hoje)>=INS_LEAD_DIAS);
  if(leads.length) out.push({id:'leads-parados',ic:'user-plus',cor:'var(--yellow)',acao:{tipo:'leads',rotulo:'Ver leads'},
    texto:`${insPl(leads.length,'lead novo','leads novos')} há ${INS_LEAD_DIAS}+ dias sem contato`,sub:leads.slice(0,3).map(l=>String(l.nome||'').split(' ')[0]).join(', ')+(leads.length>3?' e mais '+(leads.length-3):'')});
  // usa o histórico de etapas (v5.48); linhas "aprox" (reconstruídas) não servem para medir tempo parado
  const parados=(state.crmNegocios||[]).filter(n=>{
    if(crmFechada(n.etapa)) return false;
    const h=Array.isArray(n.historico)?n.historico[n.historico.length-1]:null;
    return h&&!h.aprox&&h.data&&relDias(h.data,hoje)>=INS_NEG_DIAS;
  });
  if(parados.length) out.push({id:'neg-parados',ic:'hourglass',cor:'var(--yellow)',acao:{tipo:'funil',rotulo:'Ver funil'},
    texto:`${insPl(parados.length,'negócio parado','negócios parados')} na mesma etapa há ${INS_NEG_DIAS}+ dias`,sub:fmt(soma(parados,n=>n.valor||0))+' em aberto'});
  return out;
}
function crmHtmlInsights(){
  _insCache=insCalcular();
  if(!_insCache.length) return '<div class="crm-vazio" style="padding:30px">Nada pedindo atenção agora — nenhum insight no momento.</div>';
  return '<div class="crm-card-sub" style="margin-bottom:10px">Calculado na hora com suas vendas, leads e negócios. Toque para ver a lista.</div><div class="crm-lista">'
    +_insCache.map((i,k)=>`<div class="crm-item"><div style="color:${i.cor};flex:none"><i data-lucide="${i.ic}" class="ic"></i></div>
      <div class="crm-item-main"><strong>${escapeHtml(i.texto)}</strong>${i.sub?`<div class="crm-card-sub">${escapeHtml(i.sub)}</div>`:''}</div>
      <div class="actions-cell"><button class="btn btn-outline btn-sm" onclick="insAbrir(${k})">${i.acao.rotulo}</button></div></div>`).join('')+'</div>';
}
function insAbrir(k){
  const i=_insCache[k]; if(!i) return;
  if(i.acao.tipo==='clientes'){ relCritTemp=i.crit; relSegId=null; relFiltro='todos'; relTag=''; state.crm_tab='clientes'; }
  else state.crm_tab=i.acao.tipo;
  renderCRM();
}
