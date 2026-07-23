// ============ FINANCEIRO ============
function renderFinanceiro(){
  const mesEl=document.getElementById('fin-filtro-mes');
  if(!mesEl.value) mesEl.value=today().slice(0,7);
  const mes=mesEl.value;
  const tipoFiltro=document.getElementById('fin-filtro-tipo').value;
  const movMes=state.financeiro.filter(f=>f.data.startsWith(mes));
  const entradas=movMes.filter(f=>f.tipo==='entrada').reduce((s,f)=>s+f.valor,0);
  const saidas=movMes.filter(f=>f.tipo==='saida').reduce((s,f)=>s+f.valor,0);
  const saldo=entradas-saidas;
  document.getElementById('fin-entradas').textContent=fmt(entradas);
  document.getElementById('fin-saidas').textContent=fmt(saidas);
  document.getElementById('fin-saldo').textContent=fmt(Math.abs(saldo));
  document.getElementById('fin-saldo').style.color=saldo>=0?'var(--green)':'var(--red)';
  document.getElementById('fin-saldo-sub').textContent=saldo>=0?'Positivo ✓':'Negativo ⚠️';
  const max=Math.max(entradas,saidas,1);
  document.getElementById('fin-bar-in').style.width=(entradas/max*100)+'%';
  document.getElementById('fin-bar-out').style.width=(saidas/max*100)+'%';
  let list=[...state.financeiro].sort((a,b)=>b.data.localeCompare(a.data));
  if(tipoFiltro) list=list.filter(f=>f.tipo===tipoFiltro);
  list=list.filter(f=>f.data.startsWith(mes));
  const tb=document.getElementById('fin-table');
  if(list.length===0){tb.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:24px">Nenhuma movimentação neste período</td></tr>';return;}
  tb.innerHTML=list.map(f=>`<tr>
    <td data-label="Data">${fmtDate(f.data)}</td>
    <td data-label="Descrição">${f.desc}</td>
    <td data-label="Tipo"><span class="badge ${f.tipo==='entrada'?'badge-green':'badge-red'}">${f.tipo==='entrada'?'📥 Entrada':'📤 Saída'}</span></td>
    <td data-label="Valor" class="${f.tipo==='entrada'?'':'debt-amount'}" style="${f.tipo==='entrada'?'color:var(--green);font-weight:700':''}">${f.tipo==='entrada'?'+':'-'} ${fmt(f.valor)}</td>
    <td><div class="actions-cell">
      <button class="icon-btn edit" onclick="editarLancamento(${f.id})" title="Editar">✏️</button>
      <button class="icon-btn del" onclick="excluirLancamento(${f.id})" title="Excluir">🗑️</button>
    </div></td>
  </tr>`).join('');
}
function salvarLancamento(){
  const eid=document.getElementById('lanc-edit-id').value;
  const tipo=document.getElementById('lanc-tipo').value;
  const desc=document.getElementById('lanc-desc').value.trim();
  const valor=parseFloat(document.getElementById('lanc-valor').value);
  const data=document.getElementById('lanc-data').value||today();
  if(!desc||!valor){showToast('Preencha todos os campos','red');return;}
  if(eid){
    const f=state.financeiro.find(f=>f.id==eid);
    f.tipo=tipo;f.desc=desc;f.valor=valor;f.data=data;
    showToast('Lançamento atualizado','green');
  } else {
    state.financeiro.push({id:nextId('financeiro'),tipo,desc,valor,data});
    showToast('Lançamento registrado','green');
  }
  closeModal('modal-lancamento');marcarAlterado();renderFinanceiro();setTimeout(renderChartFinanceiro,50);
}
function editarLancamento(id){
  const f=state.financeiro.find(f=>f.id===id);
  document.getElementById('lanc-edit-id').value=id;
  document.getElementById('modal-lanc-title').textContent='Editar Lançamento';
  document.getElementById('lanc-tipo').value=f.tipo;
  document.getElementById('lanc-desc').value=f.desc;
  document.getElementById('lanc-valor').value=f.valor;
  document.getElementById('lanc-data').value=f.data;
  document.getElementById('modal-lancamento').classList.add('open');
}
function excluirLancamento(id){
  confirmarAcao('Excluir este lançamento?',()=>{
    state.financeiro=state.financeiro.filter(f=>f.id!==id);
    marcarAlterado();salvarDados();
    showToast('Lançamento excluído','green');renderFinanceiro();setTimeout(renderChartFinanceiro,50);
  });
}

// ============ RELATÓRIO POR PERÍODO ============
function showRelTab(tab,btn){
  ['periodo','dre','fluxo','inadimplencia'].forEach(t=>{
    const el=document.getElementById('rel-tab-'+t);
    if(el) el.style.display=t===tab?'block':'none';
  });
  document.querySelectorAll('#page-relatorio .tab').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
}

function initRelatorio(){
  const hoje=today();
  const primeiroDia=hoje.slice(0,8)+'01';
  if(!document.getElementById('rel-inicio').value) document.getElementById('rel-inicio').value=primeiroDia;
  if(!document.getElementById('rel-fim').value) document.getElementById('rel-fim').value=hoje;
  if(!document.getElementById('dre-mes').value) document.getElementById('dre-mes').value=hoje.slice(0,7);
}

function gerarRelatorio(){
  const inicio=document.getElementById('rel-inicio').value;
  const fim=document.getElementById('rel-fim').value;
  if(!inicio||!fim){showToast('Selecione o período','red');return;}
  if(inicio>fim){showToast('Data início deve ser anterior à data fim','red');return;}
  document.getElementById('relatorio-resultado').style.display='block';
  const vendasPeriodo=state.vendas.filter(v=>v.data>=inicio&&v.data<=fim);
  const finPeriodo=state.financeiro.filter(f=>f.data>=inicio&&f.data<=fim);
  const pagPeriodo=state.pagamentos.filter(p=>p.data>=inicio&&p.data<=fim);
  const receita=vendasPeriodo.reduce((s,v)=>s+v.total,0);
  const despesas=finPeriodo.filter(f=>f.tipo==='saida').reduce((s,f)=>s+f.valor,0);
  const recebimentos=pagPeriodo.reduce((s,p)=>s+p.valor,0);
  const lucro=receita-despesas;
  document.getElementById('rel-receita').textContent=fmt(receita);
  document.getElementById('rel-vendas-count').textContent=vendasPeriodo.length+' vendas';
  document.getElementById('rel-despesas').textContent=fmt(despesas);
  document.getElementById('rel-saidas-count').textContent=finPeriodo.filter(f=>f.tipo==='saida').length+' saídas';
  document.getElementById('rel-recebimentos').textContent=fmt(recebimentos);
  document.getElementById('rel-pag-count').textContent=pagPeriodo.length+' pagamentos';
  document.getElementById('rel-lucro').textContent=fmt(Math.abs(lucro));
  document.getElementById('rel-lucro').style.color=lucro>=0?'var(--green)':'var(--red)';
  document.getElementById('rel-lucro-sub').textContent=lucro>=0?'Lucro ✓':'Prejuízo ⚠️';
  const tvs=document.getElementById('rel-vendas-table');
  if(vendasPeriodo.length===0) tvs.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:16px">Nenhuma venda no período</td></tr>';
  else tvs.innerHTML=[...vendasPeriodo].sort((a,b)=>b.data.localeCompare(a.data)).map(v=>`<tr>
    <td data-label="Data">${fmtDate(v.data)}</td>
    <td data-label="Cliente">${getCliente(v.clienteId).nome}</td>
    <td data-label="Itens" class="td-block">${v.itens.map(it=>getNomeCompletoItem(it.produtoId,it.varianteId)+' ×'+it.qtd).join(', ')}</td>
    <td data-label="Total"><strong>${fmt(v.total)}</strong></td>
    <td data-label="Forma">${v.forma==='fiado'?'📝 Fiado':v.forma==='dinheiro'?'💵 Dinheiro':v.forma==='pix'?'⚡ PIX':'💳 Cartão'}</td>
  </tr>`).join('');
  const tff=document.getElementById('rel-fin-table');
  if(finPeriodo.length===0) tff.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:16px">Nenhuma movimentação no período</td></tr>';
  else tff.innerHTML=[...finPeriodo].sort((a,b)=>b.data.localeCompare(a.data)).map(f=>`<tr>
    <td data-label="Data">${fmtDate(f.data)}</td><td data-label="Descrição">${f.desc}</td>
    <td data-label="Tipo"><span class="badge ${f.tipo==='entrada'?'badge-green':'badge-red'}">${f.tipo==='entrada'?'📥 Entrada':'📤 Saída'}</span></td>
    <td data-label="Valor" class="${f.tipo==='entrada'?'':'debt-amount'}" style="${f.tipo==='entrada'?'color:var(--green);font-weight:700':''}">${f.tipo==='entrada'?'+':'-'} ${fmt(f.valor)}</td>
  </tr>`).join('');
  destroyChart(chartRel);
  if(!chartJsDisponivel())return;
  const prodMap={};
  vendasPeriodo.forEach(v=>v.itens.forEach(it=>{const n=getNomeCompletoItem(it.produtoId,it.varianteId);prodMap[n]=(prodMap[n]||0)+it.total;}));
  const sortedEntries=Object.entries(prodMap).sort((a,b)=>b[1]-a[1]);
  const labels=sortedEntries.map(e=>e[0]);const values=sortedEntries.map(e=>e[1]);
  const colors=['rgba(41,128,185,.85)','rgba(39,174,96,.85)','rgba(243,156,18,.85)','rgba(142,68,173,.85)','rgba(231,76,60,.85)','rgba(26,188,156,.85)'];
  const ctx=document.getElementById('chart-relatorio-produtos');
  if(ctx&&labels.length>0){
    chartRel=new Chart(ctx,{
      type:'bar',
      data:{labels,datasets:[{data:values,backgroundColor:colors.slice(0,labels.length).concat(Array(Math.max(0,labels.length-colors.length)).fill('rgba(127,140,141,.7)')),borderRadius:8,borderSkipped:false}]},
      options:{
        indexAxis:'y',
        responsive:true,maintainAspectRatio:false,
        plugins:{
          legend:{display:false},
          tooltip:{backgroundColor:'#1E2D40',padding:12,cornerRadius:10,callbacks:{label:c=>` ${fmt(c.parsed.x)}`}}
        },
        scales:{
          x:{ticks:{callback:v=>fmt(v),font:{size:10}},grid:{color:'#F0F2F5'}},
          y:{grid:{display:false},ticks:{font:{size:11,weight:'600'}}}
        }
      }
    });
    // altura dinâmica conforme número de produtos
    ctx.parentElement.style.height=Math.max(180,labels.length*44)+'px';
  } else if(ctx){ctx.parentElement.innerHTML='<div class="empty-state"><div class="icon">📊</div><p>Sem vendas no período</p></div>';}
  const rankMap={};
  vendasPeriodo.forEach(v=>v.itens.forEach(it=>{const n=getNomeCompletoItem(it.produtoId,it.varianteId);if(!rankMap[n])rankMap[n]={qtd:0,valor:0,produtoId:it.produtoId,varianteId:it.varianteId};rankMap[n].qtd+=it.qtd;rankMap[n].valor+=it.total;}));
  const ranking=Object.entries(rankMap).sort((a,b)=>b[1].valor-a[1].valor);
  const elRank=document.getElementById('rel-ranking-produtos');
  if(elRank){if(ranking.length===0)elRank.innerHTML='<p style="color:var(--muted);font-size:13px;padding:10px 0">Sem dados no período</p>';
  else elRank.innerHTML=ranking.map(([nome,d],i)=>{const custo=calcularCustoFicha(d.produtoId,d.varianteId,d.qtd);const lucro=d.valor-custo;return`<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)"><div><strong style="font-size:13px">${i+1}. ${nome}</strong><div style="font-size:11.5px;color:var(--muted)">${d.qtd} un. vendidas · custo ficha ${fmt(custo)}</div></div><div style="text-align:right"><div style="font-weight:700;color:var(--navy)">${fmt(d.valor)}</div><div style="font-size:11px;color:${lucro>=0?'var(--green)':'var(--red)'}">lucro ${fmt(lucro)}</div></div></div>`;}).join('');}
  const volMap={};vendasPeriodo.forEach(v=>{volMap[v.clienteId]=(volMap[v.clienteId]||0)+v.total;});
  const volRanking=Object.entries(volMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const elVol=document.getElementById('rel-clientes-volume');
  if(elVol){if(volRanking.length===0)elVol.innerHTML='<p style="color:var(--muted);font-size:13px;padding:10px 0">Sem dados no período</p>';
  else elVol.innerHTML=volRanking.map(([cid,total],i)=>{const c=getCliente(parseInt(cid));const saldo=getSaldoCliente(parseInt(cid));return`<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)"><div><strong style="font-size:13px">${i+1}. ${c.nome}</strong>${saldo>0?`<div style="font-size:11px;color:var(--red)">deve ${fmt(saldo)}</div>`:''}</div><div style="font-weight:700;color:var(--navy)">${fmt(total)}</div></div>`;}).join('');}
}

// ============ DRE ============
function gerarDRE(){
  const mes=document.getElementById('dre-mes').value;
  if(!mes){showToast('Selecione o mês','red');return;}
  const [y,m]=mes.split('-');
  const nomes=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const label=nomes[parseInt(m)-1]+' / '+y;

  const vendas=state.vendas.filter(v=>v.data.startsWith(mes));
  const fin=state.financeiro.filter(f=>f.data.startsWith(mes));
  const comprasMes=state.compras.filter(c=>c.data.startsWith(mes));

  // RECEITA BRUTA = total de vendas do mês
  const receitaBruta=vendas.reduce((s,v)=>s+v.total,0);

  // CUSTO DE MP = soma das compras de matéria-prima do mês
  const custoMP=comprasMes.reduce((s,c)=>s+c.total,0);

  // CUSTOS FIXOS cadastrados
  const totalCF=(state.custosFixos||[]).reduce((s,c)=>s+(c.valor||0),0);

  // OUTRAS DESPESAS = saídas no financeiro excluindo as que têm tag "MP"
  const outrasDespesas=fin.filter(f=>f.tipo==='saida').reduce((s,f)=>s+f.valor,0);

  // ENTRADAS EXTRAS (lançamentos de entrada que não são vendas)
  const entradasExtras=fin.filter(f=>f.tipo==='entrada').reduce((s,f)=>s+f.valor,0);

  const lucroBruto=receitaBruta-custoMP;
  const ebitda=lucroBruto-totalCF;
  const lucroLiquido=ebitda-outrasDespesas+entradasExtras;

  const margemBruta=receitaBruta>0?(lucroBruto/receitaBruta*100):0;
  const margemLiq=receitaBruta>0?(lucroLiquido/receitaBruta*100):0;

  // mês anterior para comparação
  const mesAnterior=new Date(parseInt(y),parseInt(m)-2,1);
  const maStr=`${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth()+1).padStart(2,'0')}`;
  const vendasMA=state.vendas.filter(v=>v.data.startsWith(maStr)).reduce((s,v)=>s+v.total,0);
  const varReceita=vendasMA>0?((receitaBruta-vendasMA)/vendasMA*100):null;

  const linhasDRE=[
    {label:'(+) Receita Bruta',valor:receitaBruta,bold:true,cor:'var(--green)',indent:0},
    {label:'(−) Custo de Matéria-Prima',valor:-custoMP,bold:false,cor:custoMP>0?'var(--red)':'var(--muted)',indent:1},
    {label:'= Lucro Bruto',valor:lucroBruto,bold:true,cor:lucroBruto>=0?'var(--navy)':'var(--red)',indent:0,sep:true},
    {label:'(−) Custos Fixos (cadastrados)',valor:-totalCF,bold:false,cor:totalCF>0?'var(--red)':'var(--muted)',indent:1},
    {label:'= EBITDA',valor:ebitda,bold:true,cor:ebitda>=0?'var(--navy)':'var(--red)',indent:0,sep:true},
    {label:'(−) Outras Despesas',valor:-outrasDespesas,bold:false,cor:outrasDespesas>0?'var(--red)':'var(--muted)',indent:1},
    {label:'(+) Entradas Extras',valor:entradasExtras,bold:false,cor:entradasExtras>0?'var(--green)':'var(--muted)',indent:1},
    {label:'= Lucro Líquido',valor:lucroLiquido,bold:true,cor:lucroLiquido>=0?'var(--green)':'var(--red)',indent:0,sep:true,grande:true},
  ];

  const el=document.getElementById('dre-resultado');
  el.style.display='block';
  el.innerHTML=`
    <div class="cards-grid cards-grid-4" style="margin-bottom:20px">
      <div class="stat-card green"><div class="label">Receita Bruta</div><div class="value">${fmt(receitaBruta)}</div><div class="sub">${vendas.length} venda(s)${varReceita!==null?` · ${varReceita>=0?'+':''}${varReceita.toFixed(1)}% vs mês ant.`:''}</div></div>
      <div class="stat-card ${lucroBruto>=0?'blue':'red'}"><div class="label">Lucro Bruto</div><div class="value">${fmt(lucroBruto)}</div><div class="sub">Margem ${margemBruta.toFixed(1)}%</div></div>
      <div class="stat-card ${lucroLiquido>=0?'green':'red'}"><div class="label">Lucro Líquido</div><div class="value">${fmt(lucroLiquido)}</div><div class="sub">Margem líq. ${margemLiq.toFixed(1)}%</div></div>
      <div class="stat-card ${lucroLiquido>=0?'':'red'}"><div class="label">Resultado</div><div class="value" style="font-size:22px">${lucroLiquido>=0?'✅':'⚠️'}</div><div class="sub">${lucroLiquido>=0?'Negócio saudável':'Atenção: prejuízo'}</div></div>
    </div>
    <div class="table-card" style="margin-bottom:20px">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <strong style="font-size:15px">📈 DRE — ${label}</strong>
        <span style="font-size:12px;color:var(--muted)">Demonstrativo de Resultado do Exercício</span>
      </div>
      <div style="padding:8px 0">
        ${linhasDRE.map(l=>`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:${l.grande?'14px':'10px'} 24px;${l.sep?'border-top:2px solid var(--border);margin-top:4px;':''}background:${l.grande?(l.valor>=0?'#EAFAF1':'#FDEDEC'):'transparent'}">
            <span style="font-size:${l.grande?'14px':'13px'};font-weight:${l.bold?'700':'400'};color:${l.bold?'var(--text)':'var(--muted)'};padding-left:${l.indent*16}px">${l.label}</span>
            <span style="font-size:${l.grande?'16px':'13px'};font-weight:${l.bold?'800':'500'};color:${l.cor}">${l.valor>=0?'':''} ${fmt(Math.abs(l.valor))}</span>
          </div>`).join('')}
      </div>
    </div>
    <div class="detail-panel" style="font-size:12px;color:var(--muted)">
      <strong style="color:var(--text)">ℹ️ Como interpretar</strong><br>
      <strong>Receita Bruta</strong> = total de vendas registradas no mês. <strong>Custo de MP</strong> = compras de matéria-prima registradas. <strong>Custos Fixos</strong> = valores cadastrados em Precificação → Custos Fixos. <strong>Outras Despesas</strong> = lançamentos de saída no Financeiro. <strong>Entradas Extras</strong> = lançamentos de entrada no Financeiro (exceto vendas).
    </div>`;
}

// ============ FLUXO DE CAIXA ============
function gerarFluxo(){
  const saldoInicial=parseFloat(document.getElementById('fluxo-saldo-inicial').value)||0;
  const dias=parseInt(document.getElementById('fluxo-dias').value)||30;
  const hoje=today();
  const eventos=[];

  // Entradas: vendas fiado com vencimento futuro ainda não pagas
  state.vendas.filter(v=>v.vencimento&&v.vencimento>=hoje&&v.status!=='pago').forEach(v=>{
    const c=getCliente(v.clienteId);
    eventos.push({data:v.vencimento,tipo:'entrada',descricao:`Recebimento fiado — ${c.nome}`,valor:v.total,fonte:'fiado'});
  });

  // Saídas: lançamentos futuros de saída no financeiro
  state.financeiro.filter(f=>f.tipo==='saida'&&f.data>=hoje).forEach(f=>{
    eventos.push({data:f.data,tipo:'saida',descricao:f.desc||'Despesa',valor:f.valor,fonte:'financeiro'});
  });

  // Também entradas futuras no financeiro
  state.financeiro.filter(f=>f.tipo==='entrada'&&f.data>=hoje).forEach(f=>{
    eventos.push({data:f.data,tipo:'entrada',descricao:f.desc||'Entrada',valor:f.valor,fonte:'financeiro'});
  });

  // Montar dias
  const diasArr=[];
  for(let i=0;i<dias;i++){
    const d=new Date();d.setDate(d.getDate()+i);
    const ds=d.toISOString().slice(0,10);
    diasArr.push(ds);
  }

  // Calcular saldo dia a dia
  let saldoAcum=saldoInicial;
  const linhas=diasArr.map(dia=>{
    const evDia=eventos.filter(e=>e.data===dia);
    const entradas=evDia.filter(e=>e.tipo==='entrada').reduce((s,e)=>s+e.valor,0);
    const saidas=evDia.filter(e=>e.tipo==='saida').reduce((s,e)=>s+e.valor,0);
    saldoAcum+=entradas-saidas;
    return{dia,entradas,saidas,saldo:saldoAcum,eventos:evDia};
  });

  const totalEntradas=linhas.reduce((s,l)=>s+l.entradas,0);
  const totalSaidas=linhas.reduce((s,l)=>s+l.saidas,0);
  const saldoFinal=linhas[linhas.length-1].saldo;
  const diasNegativo=linhas.filter(l=>l.saldo<0).length;

  const el=document.getElementById('fluxo-resultado');
  el.style.display='block';

  // chart data — apenas dias com movimento ou saldo interessante, agrupado por semana se >30
  const chartLabels=linhas.filter((_,i)=>dias<=30||(i%2===0)).map(l=>fmtDate(l.dia).slice(0,5));
  const chartSaldos=linhas.filter((_,i)=>dias<=30||(i%2===0)).map(l=>l.saldo);

  el.innerHTML=`
    <div class="cards-grid cards-grid-4" style="margin-bottom:20px">
      <div class="stat-card"><div class="label">Saldo Atual</div><div class="value">${fmt(saldoInicial)}</div><div class="sub">informado</div></div>
      <div class="stat-card green"><div class="label">Entradas Projetadas</div><div class="value">${fmt(totalEntradas)}</div><div class="sub">próx. ${dias} dias</div></div>
      <div class="stat-card red"><div class="label">Saídas Projetadas</div><div class="value">${fmt(totalSaidas)}</div><div class="sub">próx. ${dias} dias</div></div>
      <div class="stat-card ${saldoFinal>=0?'green':'red'}"><div class="label">Saldo Final</div><div class="value">${fmt(saldoFinal)}</div><div class="sub">${diasNegativo>0?`⚠️ ${diasNegativo} dia(s) negativo(s)`:'✅ Sem dias negativos'}</div></div>
    </div>
    ${diasNegativo>0?`<div class="alert-banner danger" style="margin-bottom:16px">⚠️ Em ${diasNegativo} dia(s) o saldo fica negativo. Considere adiantar cobranças ou adiar despesas.</div>`:''}
    <div class="chart-card" style="margin-bottom:20px">
      <h3>💸 Saldo Projetado — Próximos ${dias} dias</h3>
      <div class="chart-wrap"><canvas id="chart-fluxo"></canvas></div>
    </div>
    <div class="table-card">
      <div style="padding:14px 20px;border-bottom:1px solid var(--border)"><strong>📋 Eventos Projetados</strong></div>
      <div class="table-scroll"><table>
        <thead><tr><th>Data</th><th>Descrição</th><th>Entradas</th><th>Saídas</th><th>Saldo do Dia</th></tr></thead>
        <tbody>
          ${linhas.filter(l=>l.entradas>0||l.saidas>0).map(l=>`
            <tr>
              <td>${fmtDate(l.dia)}</td>
              <td style="font-size:12px">${l.eventos.map(e=>`${e.tipo==='entrada'?'📥':'📤'} ${e.descricao}`).join('<br>')}</td>
              <td style="color:var(--green);font-weight:600">${l.entradas>0?fmt(l.entradas):'—'}</td>
              <td style="color:var(--red);font-weight:600">${l.saidas>0?fmt(l.saidas):'—'}</td>
              <td style="font-weight:700;color:${l.saldo>=0?'var(--navy)':'var(--red)'}">${fmt(l.saldo)}</td>
            </tr>`).join('')}
          ${linhas.filter(l=>l.entradas>0||l.saidas>0).length===0?'<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:20px">Nenhum evento projetado no período. Cadastre vendas fiado com vencimento ou lançamentos futuros.</td></tr>':''}
        </tbody>
      </table></div>
    </div>`;

  // Render chart
  setTimeout(()=>{
    const ctx=document.getElementById('chart-fluxo');
    if(!ctx) return;
    if(!chartJsDisponivel())return;
    new Chart(ctx,{
      type:'line',
      data:{labels:chartLabels,datasets:[
        {label:'Saldo (R$)',data:chartSaldos,borderColor:'#2980B9',backgroundColor:chartSaldos.map(v=>v>=0?'rgba(41,128,185,.1)':'rgba(231,76,60,.1)'),tension:.3,fill:true,pointRadius:3},
        {label:'Zero',data:chartLabels.map(()=>0),borderColor:'rgba(231,76,60,.4)',borderDash:[4,4],pointRadius:0,borderWidth:1}
      ]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:v=>`Saldo: ${fmt(v.parsed.y)}`}}},scales:{y:{ticks:{callback:v=>fmt(v)},grid:{color:'#F0F2F5'}},x:{grid:{display:false}}}}
    });
  },50);
}

// ============ INADIMPLÊNCIA ============
function gerarInadimplencia(){
  const diasAtraso=parseInt(document.getElementById('inadimp-dias').value)||0;
  const hoje=today();
  const hojeDate=new Date(hoje);

  // Clientes com fiado vencido
  const clientesMap={};
  state.vendas.filter(v=>v.status!=='pago'&&v.vencimento&&v.vencimento<hoje).forEach(v=>{
    const vencDate=new Date(v.vencimento);
    const diffDias=Math.floor((hojeDate-vencDate)/(1000*60*60*24));
    if(diffDias<diasAtraso) return;
    if(!clientesMap[v.clienteId]) clientesMap[v.clienteId]={vendas:[],totalAberto:0,maiorAtraso:0};
    clientesMap[v.clienteId].vendas.push({...v,diasAtraso:diffDias});
    clientesMap[v.clienteId].totalAberto+=v.total;
    clientesMap[v.clienteId].maiorAtraso=Math.max(clientesMap[v.clienteId].maiorAtraso,diffDias);
  });

  const lista=Object.entries(clientesMap).map(([cid,d])=>({
    cliente:getCliente(parseInt(cid)),
    ...d,
    ultimoPagamento:(state.pagamentos.filter(p=>p.clienteId===parseInt(cid)).sort((a,b)=>b.data.localeCompare(a.data))[0]||null)
  })).sort((a,b)=>b.totalAberto-a.totalAberto);

  const totalInadimplente=lista.reduce((s,l)=>s+l.totalAberto,0);

  const el=document.getElementById('inadimp-resultado');
  el.style.display='block';

  if(lista.length===0){
    el.innerHTML=`<div class="empty-state" style="background:#fff;border-radius:12px;box-shadow:var(--shadow);padding:40px"><div class="icon">✅</div><p>Nenhuma inadimplência encontrada com os filtros selecionados.</p></div>`;
    return;
  }

  el.innerHTML=`
    <div class="cards-grid cards-grid-3" style="margin-bottom:20px">
      <div class="stat-card red"><div class="label">Total em Atraso</div><div class="value">${fmt(totalInadimplente)}</div><div class="sub">${lista.length} cliente(s)</div></div>
      <div class="stat-card yellow"><div class="label">Ticket Médio em Aberto</div><div class="value">${fmt(totalInadimplente/lista.length)}</div><div class="sub">por cliente inadimplente</div></div>
      <div class="stat-card"><div class="label">Maior Atraso</div><div class="value">${Math.max(...lista.map(l=>l.maiorAtraso))} dias</div><div class="sub">${lista.sort((a,b)=>b.maiorAtraso-a.maiorAtraso)[0]?.cliente?.nome||''}</div></div>
    </div>
    <div class="table-card">
      <div style="padding:14px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <strong>⚠️ Relatório de Inadimplência${diasAtraso>0?` — vencido há +${diasAtraso} dias`:''}</strong>
        <span style="font-size:12px;color:var(--muted)">Gerado em ${fmtDate(hoje)}</span>
      </div>
      <div class="table-scroll"><table>
        <thead><tr><th>Cliente</th><th>Telefone</th><th>Vendas em aberto</th><th>Total Devido</th><th>Maior Atraso</th><th>Último Pagto</th><th>Ação</th></tr></thead>
        <tbody>
          ${lista.map(l=>`<tr>
            <td><strong>${l.cliente.nome}</strong></td>
            <td style="font-size:12px">${l.cliente.tel||'—'}</td>
            <td style="font-size:12px">${l.vendas.map(v=>`${fmtDate(v.vencimento)} · ${fmt(v.total)} (${v.diasAtraso}d)`).join('<br>')}</td>
            <td><strong style="color:var(--red)">${fmt(l.totalAberto)}</strong></td>
            <td><span class="badge ${l.maiorAtraso>30?'badge-red':'badge-yellow'}">${l.maiorAtraso} dias</span></td>
            <td style="font-size:12px">${l.ultimoPagamento?fmtDate(l.ultimoPagamento.data)+' · '+fmt(l.ultimoPagamento.valor):'<span style="color:var(--muted)">Nunca</span>'}</td>
            <td>${l.cliente.tel?`<a href="https://wa.me/55${l.cliente.tel.replace(/\D/g,'')}" target="_blank" class="btn btn-whatsapp btn-sm" style="font-size:11px;padding:4px 10px">WhatsApp</a>`:'—'}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot><tr style="background:#FAFBFC;border-top:2px solid var(--border)">
          <td colspan="3" style="padding:10px 14px;font-size:12px;font-weight:700;color:var(--muted)">TOTAL INADIMPLENTE</td>
          <td style="padding:10px 14px;font-size:14px;font-weight:800;color:var(--red)">${fmt(totalInadimplente)}</td>
          <td colspan="3"></td>
        </tr></tfoot>
      </table></div>
    </div>`;
}

// ============ HISTÓRICO DE PREÇO ============
function renderHistoricoPreco(){
  const selMP=document.getElementById('hist-preco-mp-filter');
  if(!selMP) return;
  // populate select with MPs that have at least 1 purchase
  const mpIds=[...new Set(state.compras.map(c=>c.materiaId))];
  const atualVal=selMP.value;
  selMP.innerHTML='<option value="">Selecione a matéria-prima...</option>'+
    mpIds.map(mid=>{const m=getMateria(mid);return`<option value="${mid}" ${atualVal==mid?'selected':''}>${m.nome}</option>`;}).join('');
  if(!selMP.value&&atualVal) selMP.value=atualVal;

  const mpId=parseInt(selMP.value)||null;
  const wrap=document.getElementById('hist-preco-wrap');
  const empty=document.getElementById('hist-preco-empty');
  if(!mpId){wrap.style.display='none';empty.style.display='none';return;}

  const mp=getMateria(mpId);
  const compras=state.compras.filter(c=>c.materiaId===mpId).sort((a,b)=>a.data.localeCompare(b.data));

  if(compras.length===0){wrap.style.display='none';empty.style.display='block';return;}
  wrap.style.display='block';empty.style.display='none';

  // CHART
  destroyChart(chartHistPreco);
  if(!chartJsDisponivel())return;
  const labels=compras.map(c=>fmtDate(c.data));
  const precos=compras.map(c=>c.custoUn);
  const precoMedio=precos.reduce((a,b)=>a+b,0)/precos.length;
  const mediaArr=precos.map(()=>precoMedio);
  const ctx=document.getElementById('chart-hist-preco');
  document.getElementById('hist-preco-chart-titulo').textContent=`📈 Evolução do custo/un — ${mp.nome} (${mp.unidade})`;
  chartHistPreco=new Chart(ctx,{
    type:'line',
    data:{labels,datasets:[
      {label:`Custo/un`,data:precos,borderColor:'#2980B9',
        backgroundColor:function(c){const g=c.chart.ctx.createLinearGradient(0,0,0,240);g.addColorStop(0,'rgba(41,128,185,.2)');g.addColorStop(1,'rgba(41,128,185,.02)');return g;},
        tension:.3,fill:true,pointRadius:6,pointBackgroundColor:precos.map((p,i)=>p===Math.min(...precos)?'#27AE60':p===Math.max(...precos)?'#E74C3C':'#2980B9'),
        pointBorderColor:'#fff',pointBorderWidth:2,borderWidth:2.5},
      {label:'Média',data:mediaArr,borderColor:'rgba(243,156,18,.7)',backgroundColor:'transparent',
        borderDash:[5,4],pointRadius:0,borderWidth:1.5,tension:0},
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{
        legend:{display:false},
        tooltip:{backgroundColor:'#1E2D40',padding:12,cornerRadius:10,
          callbacks:{
            title:ctx=>ctx[0].label,
            label:ctx=>{
              if(ctx.datasetIndex===1)return` Média: R$ ${precoMedio.toFixed(2).replace('.',',')}/${mp.unidade}`;
              return` Custo: R$ ${parseFloat(ctx.raw).toFixed(2).replace('.',',')}/${mp.unidade}`;
            }
          }
        }
      },
      scales:{y:{ticks:{callback:v=>'R$ '+v.toFixed(2).replace('.',','),font:{size:10}},grid:{color:'#F0F2F5'}},x:{grid:{display:false},ticks:{font:{size:10}}}}
    }
  });

  // STATS
  const precoMin=Math.min(...precos);
  const precoMax=Math.max(...precos);
  const precoAtual=precos[precos.length-1];
  const precoInicial=precos[0];
  const varTotal=precoInicial>0?((precoAtual-precoInicial)/precoInicial*100):0;
  const corVar=varTotal>10?'red':varTotal>0?'yellow':'green';
  const corAtual=precoAtual>precoMin*1.15?'red':'green';
  document.getElementById('hist-preco-stats').innerHTML=`
    <div class="stat-card ${corAtual}"><div class="label">Preço Atual</div><div class="value">${fmt(precoAtual)}</div><div class="sub">por ${mp.unidade}</div></div>
    <div class="stat-card green"><div class="label">Menor Preço</div><div class="value">${fmt(precoMin)}</div><div class="sub">registrado</div></div>
    <div class="stat-card red"><div class="label">Maior Preço</div><div class="value">${fmt(precoMax)}</div><div class="sub">registrado</div></div>
    <div class="stat-card ${corVar}"><div class="label">Var. Total</div><div class="value">${varTotal>=0?'+':''}${varTotal.toFixed(1)}%</div><div class="sub">1ª até última compra</div></div>
  `;

  // TABLE
  const tb=document.getElementById('hist-preco-table');
  tb.innerHTML=compras.map((c,i)=>{
    const forn=getFornecedor(c.fornecedorId);
    const prev=i>0?compras[i-1].custoUn:null;
    const varPct=prev!==null&&prev>0?((c.custoUn-prev)/prev*100):null;
    let varHtml='<span style="color:var(--muted);font-size:12px">—</span>';
    if(varPct!==null){
      const cor=varPct>5?'var(--red)':varPct>0?'#d35400':varPct<0?'var(--green)':'var(--muted)';
      const sinal=varPct>0?'▲ +':'▼ ';
      varHtml=`<span style="color:${cor};font-weight:700;font-size:13px">${sinal}${varPct.toFixed(1)}%</span>`;
    }
    return`<tr>
      <td data-label="Data">${fmtDate(c.data)}</td>
      <td data-label="Fornecedor"><strong>${forn?forn.nome:'—'}</strong></td>
      <td data-label="Qtd">${c.qtd} ${mp.unidade}</td>
      <td data-label="Custo/un"><strong style="color:var(--navy)">${fmt(c.custoUn)}/${mp.unidade}</strong></td>
      <td data-label="Total">${fmt(c.total)}</td>
      <td data-label="Var. anterior">${varHtml}</td>
    </tr>`;
  }).reverse().join('');// mostra mais recentes primeiro
}

