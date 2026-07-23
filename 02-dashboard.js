// ============ DASHBOARD ============
function renderTrend(elId,atual,anterior,legenda){
  const el=document.getElementById(elId);
  if(!el)return;
  if(!anterior||anterior===0){el.innerHTML='';return;}
  const diff=((atual-anterior)/anterior)*100;
  const arrow=diff>0.5?'▲':diff<-0.5?'▼':'▬';
  const cls=diff>0.5?'up':diff<-0.5?'down':'flat';
  el.innerHTML=`<span class="trend ${cls}">${arrow} ${Math.abs(diff).toFixed(0)}%</span> ${legenda||''}`;
}
function renderDashboard(){
  const d=document.getElementById('dash-date');
  d.textContent=new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const devedores=state.clientes.map(c=>({...c,saldo:getSaldoCliente(c.id)})).filter(c=>c.saldo>0).sort((a,b)=>b.saldo-a.saldo);
  const totalFiado=devedores.reduce((s,c)=>s+c.saldo,0);
  document.getElementById('dash-total-fiado').textContent=fmt(totalFiado);
  document.getElementById('dash-fiado-count').textContent=devedores.length+' clientes devendo';
  const hoje=today();
  const ontem=new Date(Date.now()-86400000).toISOString().split('T')[0];
  const recHoje=state.pagamentos.filter(p=>p.data===hoje).reduce((s,p)=>s+p.valor,0);
  const recOntem=state.pagamentos.filter(p=>p.data===ontem).reduce((s,p)=>s+p.valor,0);
  document.getElementById('dash-recebido').textContent=fmt(recHoje);
  renderTrend('dash-trend-recebido',recHoje,recOntem,'vs ontem');
  const mesAtual=hoje.slice(0,7);
  const vendasMes=state.vendas.filter(v=>v.data.startsWith(mesAtual));
  document.getElementById('dash-vendas-mes').textContent=fmt(vendasMes.reduce((s,v)=>s+v.total,0));
  document.getElementById('dash-vendas-count').textContent=vendasMes.length+' pedidos';
  const alertas=getAlertasEstoque();
  document.getElementById('dash-estoque-baixo').textContent=alertas.total;
  // Compras do mês
  const mesAtualCompras=today().slice(0,7);
  const comprasMes=state.compras.filter(c=>c.data&&c.data.slice(0,7)===mesAtualCompras);
  const totalComprasMes=comprasMes.reduce((s,c)=>s+(c.total||0),0);
  document.getElementById('dash-compras-mes').textContent=fmt(totalComprasMes);
  document.getElementById('dash-compras-mes-sub').textContent=`${comprasMes.length} pedido${comprasMes.length!==1?'s':''}`;
  // Comparativo com mês anterior (vendas e compras)
  const [anoRef,mesRef]=mesAtual.split('-').map(Number);
  const dataMesAnt=new Date(anoRef,mesRef-2,1);
  const mesAnt=`${dataMesAnt.getFullYear()}-${String(dataMesAnt.getMonth()+1).padStart(2,'0')}`;
  const vendasMesAntTotal=state.vendas.filter(v=>v.data.startsWith(mesAnt)).reduce((s,v)=>s+v.total,0);
  const comprasMesAntTotal=state.compras.filter(c=>c.data&&c.data.slice(0,7)===mesAnt).reduce((s,c)=>s+(c.total||0),0);
  renderTrend('dash-trend-vendas-mes',vendasMes.reduce((s,v)=>s+v.total,0),vendasMesAntTotal,'vs mês ant.');
  renderTrend('dash-trend-compras-mes',totalComprasMes,comprasMesAntTotal,'vs mês ant.');
  const orcPend=state.vendas.filter(v=>v.tipo==='orcamento');
  document.getElementById('dash-orc-pendentes').textContent=orcPend.length;
  document.getElementById('dash-orc-sub').textContent=orcPend.filter(o=>o.statusOrc==='rascunho').length+' rascunho · '+orcPend.filter(o=>o.statusOrc==='aprovado').length+' aprovado';
  renderAlertasBanner();

  // Vendas Hoje
  const vendasHoje=state.vendas.filter(v=>v.tipo!=='orcamento'&&v.data===hoje);
  const vendasOntem=state.vendas.filter(v=>v.tipo!=='orcamento'&&v.data===ontem);
  document.getElementById('dash-vendas-hoje').textContent=fmt(vendasHoje.reduce((s,v)=>s+v.total,0));
  document.getElementById('dash-vendas-hoje-count').textContent=vendasHoje.length+' venda'+(vendasHoje.length!==1?'s':'')+' hoje';
  renderTrend('dash-trend-vendas-hoje',vendasHoje.reduce((s,v)=>s+v.total,0),vendasOntem.reduce((s,v)=>s+v.total,0),'vs ontem');

  // Caixa Atual (saldo acumulado de todo o financeiro: entradas - saídas, desde o início)
  const caixaAtual=state.financeiro.reduce((s,f)=>s+(f.tipo==='entrada'?f.valor:-f.valor),0);
  document.getElementById('dash-caixa-atual').textContent=fmt(Math.abs(caixaAtual));
  document.getElementById('dash-caixa-sub').textContent=caixaAtual>=0?'dinheiro disponível':'⚠️ caixa negativo';

  // Contas Vencidas e Vencem Hoje
  const vendasEmAberto=state.vendas.filter(v=>v.tipo!=='orcamento'&&v.status!=='pago'&&v.vencimento);
  const vencidas=vendasEmAberto.filter(v=>v.vencimento<hoje);
  const vencemHojeArr=vendasEmAberto.filter(v=>v.vencimento===hoje);
  document.getElementById('dash-contas-vencidas').textContent=vencidas.length;
  document.getElementById('dash-contas-vencidas-sub').textContent=vencidas.length===1?'1 parcela atrasada':vencidas.length+' parcelas atrasadas';
  document.getElementById('dash-vencem-hoje').textContent=vencemHojeArr.length;
  document.getElementById('dash-vencem-hoje-sub').textContent=vencemHojeArr.length===1?'1 cobrança':vencemHojeArr.length+' cobranças';

  // Ticket Médio (mês)
  const ticketMedio=vendasMes.length?vendasMes.reduce((s,v)=>s+v.total,0)/vendasMes.length:0;
  document.getElementById('dash-ticket-medio').textContent=fmt(ticketMedio);

  // Top 5 clientes que mais devem (reaproveita "devedores", já ordenado por saldo desc)
  const tbTopDev=document.getElementById('dash-top-devedores');
  if(devedores.length===0){
    tbTopDev.innerHTML='<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:20px">Nenhum cliente devendo 🎉</td></tr>';
  } else {
    tbTopDev.innerHTML=devedores.slice(0,5).map(c=>`<tr>
      <td><strong>${c.nome}</strong></td>
      <td class="debt-amount">${fmt(c.saldo)}</td>
      <td>${c.tel?`<button class="btn btn-whatsapp btn-sm" onclick="cobrarWhatsapp(${c.id})">📲</button>`:'—'}</td>
    </tr>`).join('');
  }

  // Produtos mais vendidos no mês
  const prodMap={};
  vendasMes.filter(v=>v.tipo!=='orcamento').forEach(v=>{
    (v.itens||[]).forEach(it=>{
      const key=it.produtoId+'_'+(it.varianteId||0);
      if(!prodMap[key]) prodMap[key]={nome:getNomeCompletoItem(it.produtoId,it.varianteId),qtd:0,valor:0};
      prodMap[key].qtd+=it.qtd;
      prodMap[key].valor+=(it.total!=null?it.total:it.qtd*(it.preco||0));
    });
  });
  const topProdutos=Object.values(prodMap).sort((a,b)=>b.valor-a.valor).slice(0,5);
  const tbTopProd=document.getElementById('dash-top-produtos');
  if(topProdutos.length===0){
    tbTopProd.innerHTML='<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:20px">Sem vendas este mês</td></tr>';
  } else {
    tbTopProd.innerHTML=topProdutos.map(p=>`<tr>
      <td><strong>${p.nome}</strong></td>
      <td>${p.qtd}</td>
      <td>${fmt(p.valor)}</td>
    </tr>`).join('');
  }

  // META DE VENDAS
  renderMetaVendas(vendasMes.reduce((s,v)=>s+v.total,0));
  // Cobranças vencidas + vencendo em breve (até 3 dias)
  const alertasVenc=state.vendas
    .filter(v=>v.vencimento && v.status!=='pago')
    .filter(v=>{const d=diasParaVencimento(v.vencimento,hoje);return d<=3;})
    .sort((a,b)=>a.vencimento.localeCompare(b.vencimento));
  const vistosD=new Set();
  const alertasUnicos=alertasVenc.filter(v=>{if(vistosD.has(v.clienteId))return false;vistosD.add(v.clienteId);return true;});
  const tb=document.getElementById('dash-devedores');
  if(alertasUnicos.length===0){
    tb.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px">Nenhuma cobrança vencida 🎉</td></tr>';
  } else {
    tb.innerHTML=alertasUnicos.slice(0,6).map(v=>{
      const c=getCliente(v.clienteId);
      const saldo=getSaldoCliente(v.clienteId);
      const dias=diasParaVencimento(v.vencimento,hoje);
      const statusVenc=dias<0?`${Math.abs(dias)}d atraso`:dias===0?'Hoje':dias===1?'Amanhã':`Em ${dias}d`;
      const cor=dias<0?'var(--red)':dias<=1?'#d35400':'var(--yellow)';
      return `<tr>
        <td><strong>${c.nome}</strong></td>
        <td><span style="color:${cor};font-weight:600;font-size:12px">${fmtDate(v.vencimento)}</span><br><span style="font-size:11px;color:${cor}">${statusVenc}</span></td>
        <td class="debt-amount">${fmt(saldo>0?saldo:v.total)}</td>
        <td><button class="btn btn-whatsapp btn-sm" onclick="cobrarWhatsapp(${c.id})">📲</button></td>
      </tr>`;
    }).join('');
  }
  const hist=document.getElementById('dash-historico');
  const items=[
    ...state.vendas.map(v=>({type:'sale',data:v.data,title:'Venda — '+v.itens.map(it=>getNomeCompletoItem(it.produtoId,it.varianteId)).join(', '),sub:getCliente(v.clienteId).nome+' · '+v.itens.reduce((s,it)=>s+it.qtd,0)+' un.',val:v.total})),
    ...state.pagamentos.map(p=>({type:'pay',data:p.data,title:'Pagamento recebido',sub:getCliente(p.clienteId).nome+' · '+p.forma,val:p.valor})),
    ...state.producoes.map(p=>({type:'prod',data:p.data,title:'Produção — '+getNomeCompletoItem(p.produtoId,p.varianteId),sub:p.qtd+' unidades produzidas',val:null})),
  ].sort((a,b)=>b.data.localeCompare(a.data)).slice(0,8);
  if(items.length===0){hist.innerHTML='<div class="empty-state"><p>Sem movimentações</p></div>';}
  else{hist.innerHTML=items.map(i=>`<div class="history-item">
    <div class="history-dot h-${i.type}"></div>
    <div class="history-info"><div class="title">${i.title}</div><div class="sub">${fmtDate(i.data)} · ${i.sub}</div></div>
    ${i.val!==null?`<div class="history-amount ${i.val>0?'pos':'neg'}">${i.val>0?'+':''}${fmt(Math.abs(i.val))}</div>`:''}
  </div>`).join('');}
}

// ============ META DE VENDAS ============
function salvarMeta(){
  const val=parseFloat(document.getElementById('dash-meta-input').value)||0;
  const mesAtual=today().slice(0,7);
  if(!state.metas) state.metas={};
  state.metas[mesAtual]=val;
  marcarAlterado();
  const vendasMes=state.vendas.filter(v=>v.data.startsWith(mesAtual));
  renderMetaVendas(vendasMes.reduce((s,v)=>s+v.total,0));
}
function renderMetaVendas(realizado){
  const mesAtual=today().slice(0,7);
  if(!state.metas) state.metas={};
  const meta=state.metas[mesAtual]||0;
  // populate input
  const inp=document.getElementById('dash-meta-input');
  if(inp&&(document.activeElement!==inp)) inp.value=meta||'';
  // periodo label
  const [y,m]=mesAtual.split('-');
  const nomes=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const elP=document.getElementById('dash-meta-periodo');
  if(elP) elP.textContent=nomes[parseInt(m)-1]+' de '+y;
  // progress
  const pct=meta>0?Math.min(100,(realizado/meta)*100):0;
  const bar=document.getElementById('dash-meta-bar');
  const lbl=document.getElementById('dash-meta-label');
  const pctEl=document.getElementById('dash-meta-pct');
  const sub=document.getElementById('dash-meta-sub');
  if(bar){
    bar.style.width=pct+'%';
    bar.style.background=pct>=100?'var(--green)':pct>=60?'var(--yellow)':'var(--blue)';
  }
  if(lbl) lbl.textContent=fmt(realizado)+' / '+(meta>0?fmt(meta):'sem meta definida');
  if(pctEl){
    pctEl.textContent=meta>0?pct.toFixed(1)+'%':'—';
    pctEl.style.color=pct>=100?'var(--green)':pct>=60?'var(--yellow)':'var(--navy)';
  }
  if(sub){
    if(meta<=0){sub.textContent='Digite uma meta acima para acompanhar o progresso';return;}
    const faltam=meta-realizado;
    if(faltam<=0){sub.textContent='✅ Meta atingida! Parabéns!';}
    else{
      const diasMes=new Date(parseInt(y),parseInt(m),0).getDate();
      const diaAtual=new Date().getDate();
      const diasRestantes=diasMes-diaAtual;
      const diario=diasRestantes>0?(faltam/diasRestantes):faltam;
      sub.textContent=`Faltam ${fmt(faltam)} · ${diasRestantes} dia(s) restantes · meta diária: ${fmt(diario)}`;
    }
  }
}

