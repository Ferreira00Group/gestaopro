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

function relMensagem(x){
  const nome=(x.c.nome||'').split(' ')[0];
  if(x.seg.inativo) return `Olá, ${nome}! Faz um tempo que não nos falamos. Posso te ajudar com um novo pedido? Se precisar de algo, é só me chamar.`;
  if(x.seg.recompra) return `Olá, ${nome}, tudo bem? Acho que já está na hora de repor seu pedido. Quer que eu separe o de sempre?`;
  if(x.seg.vip) return `Olá, ${nome}! Passando para agradecer a parceria — você é um dos nossos melhores clientes. Qualquer novidade ou necessidade, é só falar.`;
  return `Olá, ${nome}, tudo bem? Passando para saber se ficou tudo certo com seu último pedido e se posso ajudar em algo.`;
}
function relWhats(clienteId){
  const x=relCalcClientes().find(x=>x.c.id===clienteId); if(!x) return;
  if(!x.c.tel){ showToast('Cliente sem telefone cadastrado','red'); return; }
  crmWhats(x.c.tel,relMensagem(x));
  crmGaranteEstado();
  state.crmAtividades.push({id:nextId('crmAtividades'),tipo:'whatsapp',titulo:'WhatsApp de relacionamento',data:today(),hora:'',
    concluida:true,concluidaEm:today(),criadoEm:today(),clienteId,leadId:null,negocioId:null});
  marcarAlterado();
}

// ── Aba "Clientes" do CRM ──
function relSetFiltro(v){ relFiltro=v; renderCRM(); }
function relSetOrdem(v){ relOrdem=v; renderCRM(); }
function relHtmlClientes(){
  let lista=relCalcClientes();
  const cont={vip:0,frequente:0,inativo:0,recompra:0};
  lista.forEach(x=>Object.keys(cont).forEach(k=>{ if(x.seg[k]) cont[k]++; }));
  if(relFiltro!=='todos') lista=lista.filter(x=>x.seg[relFiltro]);
  else lista=lista.filter(x=>x.compras>0);
  const ord={fat:(a,b)=>b.fat12-a.fat12||b.fat-a.fat, lucro:(a,b)=>b.lucro-a.lucro, compras:(a,b)=>b.compras-a.compras,
    ultima:(a,b)=>(b.ultima||'').localeCompare(a.ultima||''), proxima:(a,b)=>(a.proxima||'9999').localeCompare(b.proxima||'9999')};
  lista.sort(ord[relOrdem]||ord.fat);
  const opt=(v,t,sel)=>`<option value="${v}"${sel===v?' selected':''}>${t}</option>`;
  const filtros=`<div class="search-bar">
    <select class="filter" style="max-width:none" onchange="relSetFiltro(this.value)">
      ${opt('todos','Todos que já compraram',relFiltro)}${opt('vip','VIP ('+cont.vip+')',relFiltro)}${opt('frequente','Frequentes ('+cont.frequente+')',relFiltro)}
      ${opt('inativo','Inativos ('+cont.inativo+')',relFiltro)}${opt('recompra','Recompra próxima ('+cont.recompra+')',relFiltro)}</select>
    <select class="filter" style="max-width:none" onchange="relSetOrdem(this.value)">
      ${opt('fat','Ordem: faturamento 12m',relOrdem)}${opt('lucro','Ordem: lucro estimado',relOrdem)}${opt('compras','Ordem: nº de compras',relOrdem)}
      ${opt('ultima','Ordem: última compra',relOrdem)}${opt('proxima','Ordem: próxima compra',relOrdem)}</select></div>
    <div class="crm-resumo"><span><strong>${cont.vip}</strong> VIP</span><span><strong>${cont.frequente}</strong> frequentes</span><span><strong>${cont.inativo}</strong> inativos</span><span><strong>${cont.recompra}</strong> recompra próxima</span></div>`;
  if(!lista.length) return filtros+'<div class="crm-vazio" style="padding:30px">Nenhum cliente neste filtro.</div>';
  const hoje=today();
  return filtros+'<div class="crm-lista">'+lista.slice(0,100).map((x,i)=>{
    const b=(x.seg.vip?'<span class="badge badge-yellow">VIP</span> ':'')+(x.seg.frequente?'<span class="badge badge-green">Frequente</span> ':'')+(x.seg.inativo?'<span class="badge badge-red">Inativo</span> ':'')+(x.seg.recompra?'<span class="badge badge-blue">Recompra próxima</span> ':'');
    let prox='';
    if(x.proxima){ const atras=x.proxima<hoje; prox=`<span class="${atras&&!x.seg.inativo?'crm-atraso':''}">Próxima prevista: ${fmtDate(x.proxima)}${atras?' ('+relDias(x.proxima,hoje)+'d de atraso)':''}</span>`; }
    return `<div class="crm-item"><div class="crm-item-main"><strong>${i+1}. ${escapeHtml(x.c.nome)}</strong> ${b}
      <div class="crm-card-sub">12m: <strong>${fmt(x.fat12)}</strong> · Lucro est.: ${fmt(x.lucro)} · ${x.compras} compra(s)${x.intervalo?' · a cada '+x.intervalo+'d':''}</div>
      <div class="crm-card-sub">Última: ${x.ultima?fmtDate(x.ultima)+' ('+x.diasSem+'d)':'—'}${prox?' · '+prox:''}</div></div>
      <div class="actions-cell">${x.c.tel?`<button class="btn btn-whatsapp btn-sm" title="WhatsApp de relacionamento" onclick="relWhats(${x.c.id})"><i data-lucide="message-circle" class="ic"></i></button>`:''}
      <button class="btn btn-outline btn-sm" onclick="crmNovoNegocio({clienteId:${x.c.id}})">+ Negócio</button></div></div>`;
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
