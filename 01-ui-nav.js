// ============ DASHBOARD TABS (economiza espaço: alterna blocos em vez de empilhar) ============
function dashTabSwitch(group,tab,btn){
  const container=btn.closest('.table-card,.chart-card');
  container.querySelectorAll('.tab-mini').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  container.querySelectorAll('.dash-tab-content[data-group="'+group+'"]').forEach(el=>{
    el.style.display=(el.dataset.tab===tab)?'':'none';
  });
  setTimeout(()=>{
    if(chartDash&&typeof chartDash.resize==='function')chartDash.resize();
    if(chart30Dias&&typeof chart30Dias.resize==='function')chart30Dias.resize();
  },50);
}

// ============ CHARTS ============
let chartDash=null, chartFin=null, chartRel=null, chartHistPreco=null, chart30Dias=null;

function renderChart30Dias(){
  destroyChart(chart30Dias);
  if(!chartJsDisponivel())return;
  const hoje=today();
  const dias=[];
  for(let i=29;i>=0;i--){
    const d=new Date(hoje+'T00:00:00');
    d.setDate(d.getDate()-i);
    dias.push(d.toISOString().slice(0,10));
  }
  const valoresPorDia=dias.map(d=>state.vendas.filter(v=>v.tipo!=='orcamento'&&v.data===d).reduce((s,v)=>s+v.total,0));
  const labels=dias.map(d=>{const[,mo,day]=d.split('-');return`${day}/${mo}`});

  const ctx=document.getElementById('chart-vendas-30d');
  if(!ctx)return;
  chart30Dias=new Chart(ctx,{
    type:'line',
    data:{labels,datasets:[{
      label:'Vendas',data:valoresPorDia,
      borderColor:'#2980B9',backgroundColor:'rgba(41,128,185,0.1)',
      fill:true,tension:.35,pointRadius:2,pointHoverRadius:5,
      pointBackgroundColor:'#2980B9',borderWidth:2
    }]},
    options:{
      responsive:true,maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{display:false},
        tooltip:{backgroundColor:'#1E2D40',padding:12,cornerRadius:10,callbacks:{title:c=>`📅 ${c[0].label}`,label:c=>` ${fmt(c.parsed.y)}`}}
      },
      scales:{
        y:{ticks:{callback:v=>fmt(v),font:{size:10}},grid:{color:'#F0F2F5'}},
        x:{grid:{display:false},ticks:{font:{size:9},maxRotation:0,autoSkip:true,maxTicksLimit:8}}
      }
    }
  });
}
function destroyChart(c){if(c){try{c.destroy();}catch(e){}}}
function chartJsDisponivel(){
  if(typeof Chart==='undefined'){
    console.warn('[GestãoPRO] Chart.js não carregou (CDN bloqueado/offline) — gráfico não será exibido.');
    return false;
  }
  return true;
}

function renderChartDash(){
  destroyChart(chartDash);
  if(!chartJsDisponivel())return;
  let meses=getUltimosMeses(6);
  const nomeMes=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  // 1. Remover meses zerados do início (sem movimento algum)
  const entradas=meses.map(m=>state.financeiro.filter(f=>f.tipo==='entrada'&&f.data.startsWith(m)).reduce((s,f)=>s+f.valor,0));
  const saidas=meses.map(m=>state.financeiro.filter(f=>f.tipo==='saida'&&f.data.startsWith(m)).reduce((s,f)=>s+f.valor,0));
  const lucro=entradas.map((e,i)=>e-saidas[i]);

  // Encontrar primeiro índice com algum movimento
  let inicio=0;
  for(let i=0;i<meses.length-1;i++){
    if(entradas[i]===0&&saidas[i]===0) inicio=i+1; else break;
  }
  const mesesFiltrados=meses.slice(inicio);
  const entradasF=entradas.slice(inicio);
  const saidasF=saidas.slice(inicio);
  const lucroF=lucro.slice(inicio);
  const labels=mesesFiltrados.map(m=>{const[y,mo]=m.split('-');return`${nomeMes[parseInt(mo)-1]}/${y.slice(2)}`});

  const ctx=document.getElementById('chart-dash');
  if(!ctx)return;

  // 2. Cores consistentes e claras: verde para entradas, vermelho para saídas, linha azul para lucro
  // 3. Escala separada para a linha de lucro (yAxisID) para não distorcer as barras
  chartDash=new Chart(ctx,{
    type:'bar',
    data:{labels,datasets:[
      {
        label:'Entradas',data:entradasF,
        backgroundColor:'rgba(39,174,96,0.85)',
        borderColor:'rgba(39,174,96,1)',
        borderWidth:1,borderRadius:6,borderSkipped:false,order:2,
        yAxisID:'y'
      },
      {
        label:'Saídas',data:saidasF,
        backgroundColor:'rgba(231,76,60,0.85)',
        borderColor:'rgba(231,76,60,1)',
        borderWidth:1,borderRadius:6,borderSkipped:false,order:2,
        yAxisID:'y'
      },
      {
        label:'Lucro',data:lucroF,type:'line',
        borderColor:'#1565C0',
        backgroundColor:'rgba(21,101,192,0.08)',
        fill:true,tension:.4,
        pointRadius:5,pointBackgroundColor:'#1565C0',
        pointBorderColor:'#fff',pointBorderWidth:2,
        borderWidth:2.5,order:1,
        yAxisID:'y2'
      },
    ]},
    options:{
      responsive:true,maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{
          display:true,
          position:'top',
          labels:{
            usePointStyle:true,pointStyle:'circle',
            font:{size:11},padding:16,
            color:'#555'
          }
        },
        tooltip:{
          backgroundColor:'#1E2D40',padding:12,cornerRadius:10,
          callbacks:{
            title:c=>`📅 ${c[0].label}`,
            label:c=>` ${c.dataset.label}: ${fmt(c.parsed.y)}`
          }
        }
      },
      scales:{
        y:{
          position:'left',
          ticks:{callback:v=>fmt(v),font:{size:10}},
          grid:{color:'#F0F2F5'},
          title:{display:true,text:'Entradas / Saídas',font:{size:10},color:'#888'}
        },
        y2:{
          position:'right',
          ticks:{callback:v=>fmt(v),font:{size:10}},
          grid:{drawOnChartArea:false},
          title:{display:true,text:'Lucro',font:{size:10},color:'#1565C0'}
        },
        x:{grid:{display:false},ticks:{font:{size:10}}}
      }
    }
  });

  // KPIs abaixo do gráfico (mês atual)
  const kpiEl=document.getElementById('dash-chart-kpis');
  if(kpiEl){
    const e=entradasF[entradasF.length-1]||0;
    const s=saidasF[saidasF.length-1]||0;
    const l=lucroF[lucroF.length-1]||0;
    const cor=l>=0?'var(--green)':'var(--red)';
    kpiEl.innerHTML=`
      <div style="background:#EAFAF1;border-radius:8px;padding:7px 12px;font-size:12px"><span style="color:var(--muted)">Entradas</span><br><strong style="color:var(--green)">${fmt(e)}</strong></div>
      <div style="background:#FDECEA;border-radius:8px;padding:7px 12px;font-size:12px"><span style="color:var(--muted)">Saídas</span><br><strong style="color:var(--red)">${fmt(s)}</strong></div>
      <div style="background:#EBF5FB;border-radius:8px;padding:7px 12px;font-size:12px"><span style="color:var(--muted)">Lucro mês</span><br><strong style="color:${cor}">${fmt(l)}</strong></div>`;
  }
}
let chartDespCat=null, chartDespVs=null;

function showFinTab(tab,btn){
  ['movimentacoes','despesas','fechamento'].forEach(t=>{
    const el=document.getElementById('fin-tab-'+t);
    if(el) el.style.display=t===tab?'block':'none';
  });
  document.querySelectorAll('#page-financeiro .tab').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  if(tab==='despesas') renderDespesasCategoria();
  if(tab==='fechamento') renderFechamentoHistorico();
}

function renderDespesasCategoria(){
  const mesEl=document.getElementById('desp-mes');
  if(!mesEl) return;
  if(!mesEl.value) mesEl.value=today().slice(0,7);
  const mes=mesEl.value;

  // CATEGORIAS: compras de MP, custos fixos (cadastrados), outros lançamentos de saída
  const comprasMes=state.compras.filter(c=>c.data.startsWith(mes));
  const finSaidas=state.financeiro.filter(f=>f.tipo==='saida'&&f.data.startsWith(mes));
  const finEntradas=state.financeiro.filter(f=>f.tipo==='entrada'&&f.data.startsWith(mes));
  const vendasMes=state.vendas.filter(v=>v.data.startsWith(mes));

  const totalMP=comprasMes.reduce((s,c)=>s+c.total,0);
  const totalCF=(state.custosFixos||[]).reduce((s,c)=>s+(c.valor||0),0);
  const totalOutros=finSaidas.reduce((s,f)=>s+f.valor,0);
  const totalEntradas=finEntradas.reduce((s,f)=>s+f.valor,0);
  const totalVendas=vendasMes.reduce((s,v)=>s+v.total,0);

  const totalDespesas=totalMP+totalCF+totalOutros;

  // PIZZA CHART
  if(chartDespCat){chartDespCat.destroy();chartDespCat=null;}
  if(chartDespVs){chartDespVs.destroy();chartDespVs=null;}
  if(!chartJsDisponivel())return;

  const ctx1=document.getElementById('chart-despesas-cat');
  if(ctx1&&totalDespesas>0){
    chartDespCat=new Chart(ctx1,{
      type:'doughnut',
      data:{
        labels:['Matéria-Prima','Custos Fixos','Outras Saídas'],
        datasets:[{data:[totalMP,totalCF,totalOutros],backgroundColor:['#E74C3C','#F39C12','#8E44AD'],borderWidth:3,borderColor:'#fff',hoverOffset:8}]
      },
      options:{responsive:true,maintainAspectRatio:false,cutout:'65%',
        plugins:{
          legend:{display:false},
          tooltip:{backgroundColor:'#1E2D40',padding:12,cornerRadius:10,
            callbacks:{label:c=>`  ${c.label}: ${fmt(c.parsed)} (${totalDespesas>0?(c.parsed/totalDespesas*100).toFixed(1)+'%':'—'})`}}
        }
      }
    });
    // legenda customizada abaixo
    const legEl=ctx1.parentElement;
    const legRows=[['#E74C3C','Matéria-Prima',totalMP],['#F39C12','Custos Fixos',totalCF],['#8E44AD','Outras Saídas',totalOutros]];
    let legHtml='<div style="margin-top:10px;display:flex;flex-direction:column;gap:5px">';
    legRows.forEach(([cor,nome,val])=>{
      const pct=totalDespesas>0?(val/totalDespesas*100).toFixed(1):0;
      legHtml+=`<div style="display:flex;align-items:center;gap:8px">
        <div style="width:10px;height:10px;border-radius:2px;background:${cor};flex-shrink:0"></div>
        <span style="font-size:12px;flex:1;color:var(--text)">${nome}</span>
        <strong style="font-size:12px">${fmt(val)} <span style="color:var(--muted);font-weight:400;font-size:11px">${pct}%</span></strong>
      </div>`;
    });
    legHtml+='</div>';
    // remove legenda anterior se existir
    const oldLeg=legEl.querySelector('.desp-leg');
    if(oldLeg)oldLeg.remove();
    const div=document.createElement('div');div.className='desp-leg';div.innerHTML=legHtml;
    legEl.appendChild(div);
  } else if(ctx1){ctx1.parentElement.innerHTML='<div style="text-align:center;padding:30px;color:var(--muted);font-size:13px">Sem despesas registradas neste mês</div>';}

  const ctx2=document.getElementById('chart-despesas-vs');
  if(ctx2){
    chartDespVs=new Chart(ctx2,{
      type:'bar',
      data:{
        labels:['Receita','Despesas','Saldo'],
        datasets:[{
          data:[totalVendas+totalEntradas, totalDespesas, (totalVendas+totalEntradas)-totalDespesas],
          backgroundColor:['rgba(39,174,96,.8)','rgba(231,76,60,.8)',(totalVendas+totalEntradas-totalDespesas)>=0?'rgba(41,128,185,.8)':'rgba(231,76,60,.8)'],
          borderRadius:10,borderSkipped:false,borderWidth:0
        }]
      },
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{
          legend:{display:false},
          tooltip:{backgroundColor:'#1E2D40',padding:12,cornerRadius:10,
            callbacks:{label:c=>` ${fmt(c.parsed.y)}`}}
        },
        scales:{y:{ticks:{callback:v=>fmt(v),font:{size:10}},grid:{color:'#F0F2F5'}},x:{grid:{display:false},ticks:{font:{size:11,weight:'600'}}}}
      }
    });
  }

  // DETALHES TABLE
  const el=document.getElementById('desp-detalhes');
  if(!el) return;

  const [y,m]=mes.split('-');
  const nomes=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  el.innerHTML=`
    <div class="cards-grid cards-grid-4" style="margin-bottom:16px">
      <div class="stat-card red"><div class="label">Total Despesas</div><div class="value">${fmt(totalDespesas)}</div><div class="sub">${nomes[parseInt(m)-1]}</div></div>
      <div class="stat-card red"><div class="label">Matéria-Prima</div><div class="value">${fmt(totalMP)}</div><div class="sub">${totalDespesas>0?(totalMP/totalDespesas*100).toFixed(0)+'% do total':''}</div></div>
      <div class="stat-card yellow"><div class="label">Custos Fixos</div><div class="value">${fmt(totalCF)}</div><div class="sub">${totalDespesas>0?(totalCF/totalDespesas*100).toFixed(0)+'% do total':''}</div></div>
      <div class="stat-card"><div class="label">Outras Saídas</div><div class="value">${fmt(totalOutros)}</div><div class="sub">${finSaidas.length} lançamento(s)</div></div>
    </div>
    ${finSaidas.length>0?`
    <div class="table-card">
      <div style="padding:14px 20px;border-bottom:1px solid var(--border)"><strong>📋 Saídas Registradas — ${nomes[parseInt(m)-1]}</strong></div>
      <div class="table-scroll"><table>
        <thead><tr><th>Data</th><th>Descrição</th><th>Valor</th><th>% do Total</th></tr></thead>
        <tbody>
          ${[...finSaidas].sort((a,b)=>b.valor-a.valor).map(f=>`<tr>
            <td>${fmtDate(f.data)}</td>
            <td>${f.desc}</td>
            <td style="color:var(--red);font-weight:700">${fmt(f.valor)}</td>
            <td><div style="display:flex;align-items:center;gap:8px">
              <div style="flex:1;height:6px;background:#F0F2F5;border-radius:3px;overflow:hidden"><div style="height:100%;background:var(--red);width:${totalDespesas>0?(f.valor/totalDespesas*100).toFixed(0)+'%':'0%'}"></div></div>
              <span style="font-size:12px;color:var(--muted);min-width:36px">${totalDespesas>0?(f.valor/totalDespesas*100).toFixed(1)+'%':'—'}</span>
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`:''}
  `;
}

// ============ FECHAMENTO MENSAL ============
function gerarFechamento(){
  const mes=document.getElementById('fech-mes').value;
  if(!mes){showToast('Selecione o mês','red');return;}
  const snap=calcularSnapshotMes(mes);
  renderSnapshotFechamento(snap, document.getElementById('fech-resultado'), true);
  document.getElementById('fech-resultado').style.display='block';
}

function calcularSnapshotMes(mes){
  const vendas=state.vendas.filter(v=>v.data.startsWith(mes));
  const compras=state.compras.filter(c=>c.data.startsWith(mes));
  const finEntradas=state.financeiro.filter(f=>f.tipo==='entrada'&&f.data.startsWith(mes));
  const finSaidas=state.financeiro.filter(f=>f.tipo==='saida'&&f.data.startsWith(mes));
  const pagamentos=state.pagamentos.filter(p=>p.data.startsWith(mes));

  const receita=vendas.reduce((s,v)=>s+v.total,0);
  const custoMP=compras.reduce((s,c)=>s+c.total,0);
  const custosFixos=(state.custosFixos||[]).reduce((s,c)=>s+(c.valor||0),0);
  const outrasSaidas=finSaidas.reduce((s,f)=>s+f.valor,0);
  const entradasExtras=finEntradas.reduce((s,f)=>s+f.valor,0);
  const recebimentosFiado=pagamentos.reduce((s,p)=>s+p.valor,0);
  const lucroBruto=receita-custoMP;
  const lucroLiquido=lucroBruto-custosFixos-outrasSaidas+entradasExtras;
  const margemLiq=receita>0?(lucroLiquido/receita*100):0;

  // inadimplência no momento do fechamento
  const hoje=today();
  const inadimplentesValor=state.vendas.filter(v=>v.status!=='pago'&&v.vencimento&&v.vencimento<=mes+'-31').reduce((s,v)=>s+v.total,0);

  return {mes,receita,custoMP,custosFixos,outrasSaidas,entradasExtras,recebimentosFiado,lucroBruto,lucroLiquido,margemLiq,inadimplentesValor,vendasCount:vendas.length,comprasCount:compras.length};
}

function renderSnapshotFechamento(snap, el, mostrarComparativo){
  const [y,m]=snap.mes.split('-');
  const nomes=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const label=nomes[parseInt(m)-1]+' / '+y;

  // Mês anterior para comparativo
  const mesAnt=new Date(parseInt(y),parseInt(m)-2,1);
  const mesAntStr=`${mesAnt.getFullYear()}-${String(mesAnt.getMonth()+1).padStart(2,'0')}`;
  const snapAnt=mostrarComparativo?calcularSnapshotMes(mesAntStr):null;

  const varPct=(atual,ant)=>{
    if(!ant||ant===0) return '';
    const v=((atual-ant)/Math.abs(ant)*100);
    const cor=v>=0?'var(--green)':'var(--red)';
    return `<span style="font-size:11px;color:${cor};margin-left:6px">${v>=0?'▲ +':'▼ '}${Math.abs(v).toFixed(1)}%</span>`;
  };

  el.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <h3 style="font-size:16px;font-weight:800">📅 Fechamento — ${label}</h3>
      ${snap.lucroLiquido>=0?'<span class="badge badge-green" style="font-size:13px;padding:6px 14px">✅ Lucro</span>':'<span class="badge badge-red" style="font-size:13px;padding:6px 14px">⚠️ Prejuízo</span>'}
    </div>
    <div class="cards-grid cards-grid-4" style="margin-bottom:16px">
      <div class="stat-card green"><div class="label">Receita Bruta</div><div class="value">${fmt(snap.receita)}${snapAnt?varPct(snap.receita,snapAnt.receita):''}</div><div class="sub">${snap.vendasCount} vendas</div></div>
      <div class="stat-card red"><div class="label">Total Despesas</div><div class="value">${fmt(snap.custoMP+snap.custosFixos+snap.outrasSaidas)}</div><div class="sub">MP + fixos + outros</div></div>
      <div class="stat-card ${snap.lucroLiquido>=0?'green':'red'}"><div class="label">Lucro Líquido</div><div class="value">${fmt(snap.lucroLiquido)}${snapAnt?varPct(snap.lucroLiquido,snapAnt.lucroLiquido):''}</div><div class="sub">Margem ${snap.margemLiq.toFixed(1)}%</div></div>
      <div class="stat-card yellow"><div class="label">Inadimplência</div><div class="value">${fmt(snap.inadimplentesValor)}</div><div class="sub">fiado em aberto</div></div>
    </div>
    <div class="table-card" style="margin-bottom:${mostrarComparativo?'16px':'0'}">
      <div style="padding:14px 20px;border-bottom:1px solid var(--border)"><strong>Detalhamento</strong>${snapAnt?`<span style="font-size:12px;color:var(--muted);margin-left:10px">vs ${nomes[mesAnt.getMonth()]} (anterior)</span>`:''}</div>
      <div style="padding:0">
        ${[
          {l:'(+) Receita de Vendas',v:snap.receita,va:snapAnt?.receita,bold:true,cor:'var(--green)'},
          {l:'(+) Entradas Extras',v:snap.entradasExtras,va:snapAnt?.entradasExtras,cor:'var(--green)'},
          {l:'(−) Custo de MP',v:snap.custoMP,va:snapAnt?.custoMP,cor:snap.custoMP>0?'var(--red)':'var(--muted)'},
          {l:'(−) Custos Fixos',v:snap.custosFixos,va:snapAnt?.custosFixos,cor:snap.custosFixos>0?'var(--red)':'var(--muted)'},
          {l:'(−) Outras Saídas',v:snap.outrasSaidas,va:snapAnt?.outrasSaidas,cor:snap.outrasSaidas>0?'var(--red)':'var(--muted)'},
          {l:'= Lucro Líquido',v:snap.lucroLiquido,va:snapAnt?.lucroLiquido,bold:true,cor:snap.lucroLiquido>=0?'var(--green)':'var(--red)',sep:true,grande:true},
          {l:'Recebimentos Fiado (caixa)',v:snap.recebimentosFiado,va:snapAnt?.recebimentosFiado,cor:'var(--blue)'},
        ].map(row=>`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:${row.grande?'12px':'9px'} 20px;${row.sep?'border-top:2px solid var(--border);':''}background:${row.grande?(snap.lucroLiquido>=0?'#EAFAF1':'#FDEDEC'):'transparent'}">
            <span style="font-size:13px;font-weight:${row.bold?'700':'400'};color:${row.bold?'var(--text)':'var(--muted)'}">${row.l}</span>
            <div style="text-align:right">
              <span style="font-size:${row.grande?'15px':'13px'};font-weight:${row.bold?'800':'500'};color:${row.cor}">${fmt(Math.abs(row.v))}</span>
              ${row.va!=null?`<span style="font-size:11px;color:var(--muted);margin-left:8px">${fmt(row.va)}</span>`:''}
              ${row.va!=null?varPct(row.v,row.va):''}
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

function salvarSnapshotFechamento(){
  const mes=document.getElementById('fech-mes').value;
  if(!mes){showToast('Selecione o mês e gere o fechamento primeiro','red');return;}
  if(!state.fechamentos) state.fechamentos=[];
  const snap=calcularSnapshotMes(mes);
  snap.savedAt=new Date().toISOString();
  state.fechamentos=state.fechamentos.filter(f=>f.mes!==mes);
  state.fechamentos.push(snap);
  marcarAlterado();
  showToast('Snapshot salvo!','green');
  renderFechamentoHistorico();
}

function renderFechamentoHistorico(){
  const el=document.getElementById('fech-historico');
  if(!el) return;
  const fechamentos=(state.fechamentos||[]).sort((a,b)=>b.mes.localeCompare(a.mes));
  if(fechamentos.length===0){
    el.innerHTML='<div class="detail-panel" style="text-align:center;color:var(--muted);font-size:13px">Nenhum snapshot salvo ainda. Gere um fechamento e clique em "Salvar Snapshot" para guardar o histórico.</div>';
    return;
  }
  el.innerHTML='<h3 style="font-size:15px;font-weight:700;margin-bottom:12px">📚 Histórico de Fechamentos</h3>'+
    fechamentos.map(snap=>{
      const wrapper=document.createElement('div');
      wrapper.className='detail-panel';wrapper.style.marginBottom='16px';
      renderSnapshotFechamento(snap,wrapper,false);
      return wrapper.outerHTML;
    }).join('');
  // since we can't use outerHTML on a freshly created element with innerHTML, render directly
  el.innerHTML='<h3 style="font-size:15px;font-weight:700;margin-bottom:12px">📚 Histórico de Fechamentos</h3>';
  fechamentos.forEach(snap=>{
    const div=document.createElement('div');
    div.className='detail-panel';div.style.marginBottom='16px';
    renderSnapshotFechamento(snap,div,false);
    el.appendChild(div);
  });
}

function renderChartFinanceiro(){
  destroyChart(chartFin);
  if(!chartJsDisponivel())return;
  const meses=getUltimosMeses(6);
  const nomeMes=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const labels=meses.map(m=>{const[y,mo]=m.split('-');return`${nomeMes[parseInt(mo)-1]}/${y.slice(2)}`});
  const entradas=meses.map(m=>state.financeiro.filter(f=>f.tipo==='entrada'&&f.data.startsWith(m)).reduce((s,f)=>s+f.valor,0));
  const saidas=meses.map(m=>state.financeiro.filter(f=>f.tipo==='saida'&&f.data.startsWith(m)).reduce((s,f)=>s+f.valor,0));
  const saldo=entradas.map((e,i)=>e-saidas[i]);
  const ctx=document.getElementById('chart-financeiro');
  if(!ctx)return;
  chartFin=new Chart(ctx,{
    type:'line',
    data:{labels,datasets:[
      {label:'Entradas',data:entradas,borderColor:'#27AE60',backgroundColor:'rgba(39,174,96,.12)',
        tension:.4,fill:true,pointRadius:6,pointBackgroundColor:'#27AE60',pointBorderColor:'#fff',pointBorderWidth:2,borderWidth:2.5},
      {label:'Saídas',data:saidas,borderColor:'#E74C3C',backgroundColor:'rgba(231,76,60,.07)',
        tension:.4,fill:true,pointRadius:6,pointBackgroundColor:'#E74C3C',pointBorderColor:'#fff',pointBorderWidth:2,borderWidth:2.5},
      {label:'Saldo',data:saldo,borderColor:'#2980B9',
        backgroundColor:function(ctx){
          const g=ctx.chart.ctx.createLinearGradient(0,0,0,240);
          g.addColorStop(0,'rgba(41,128,185,.22)');g.addColorStop(1,'rgba(41,128,185,.02)');return g;
        },
        tension:.4,fill:true,pointRadius:6,pointBackgroundColor:'#2980B9',pointBorderColor:'#fff',pointBorderWidth:2,borderWidth:2.5},
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{
        legend:{display:false},
        tooltip:{
          backgroundColor:'#1E2D40',padding:12,cornerRadius:10,
          callbacks:{
            title:ctx=>`📅 ${ctx[0].label}`,
            label:ctx=>` ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`
          }
        }
      },
      scales:{
        y:{ticks:{callback:v=>fmt(v),font:{size:10}},grid:{color:'#F0F2F5'}},
        x:{grid:{display:false},ticks:{font:{size:10}}}
      }
    }
  });
}

// ============ NAV ============
function toggleSidebar(){
  const sb=document.getElementById('sidebar');
  const bd=document.getElementById('sidebar-backdrop');
  const hb=document.getElementById('hamburger');
  const open=sb.classList.toggle('open');
  bd.classList.toggle('open',open);
  hb.classList.toggle('open',open);
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-backdrop').classList.remove('open');
  document.getElementById('hamburger').classList.remove('open');
}
function goto(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('nav a').forEach(a=>a.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  const navLink=document.querySelector(`nav a[data-page="${page}"]`);
  if(navLink) navLink.classList.add('active');
  closeSidebar();
  render(page);
  requestAnimationFrame(ajustarStickyTabela);
}
function ajustarStickyTabela(){
  const ph=document.querySelector('.page.active .page-header');
  const top=108+(ph?ph.offsetHeight:64);
  document.documentElement.style.setProperty('--sticky-table-top',top+'px');
}
let _stickyResizeTimer=null;
window.addEventListener('resize',()=>{
  clearTimeout(_stickyResizeTimer);
  _stickyResizeTimer=setTimeout(ajustarStickyTabela,150);
});
function gotoFornecedores(){
  goto('estoque');
  const btn=document.querySelector('#page-estoque .tabs .tab:nth-child(4)');
  if(btn) showEstoqueTab('fornecedores',btn);
}
function imprimirPagina(){
  // atualiza data de impressão
  const pg=document.querySelector('.page.active');
  const pageName=pg?pg.id.replace('page-',''):'';
  const el=document.getElementById('print-date-'+pageName);
  if(el) el.textContent='Gerado em: '+new Date().toLocaleString('pt-BR');
  try{
    window.print();
  }catch(e){
    showToast('Não foi possível abrir a impressão. Tente abrir este arquivo no Chrome.','erro');
  }
}
const OPCOES_IMPRESSAO=[
  {page:'dashboard',label:'Dashboard',icon:'🏠'},
  {page:'clientes',label:'Clientes',icon:'👥'},
  {page:'vendas',label:'Vendas / Pedidos',icon:'🛍️'},
  {page:'receber',label:'Contas a Receber',icon:'📥'},
  {page:'producao',label:'Produção',icon:'🧪'},
  {page:'estoque',label:'Estoque',icon:'📦'},
  {page:'planejamento',label:'Planejamento',icon:'🧮'},
  {page:'precificacao',label:'Precificação',icon:'🏷️'},
  {page:'financeiro',label:'Financeiro',icon:'💰'},
  {page:'relatorio',label:'Relatórios',icon:'📊'},
];
function abrirEscolhaImpressao(){
  const wrap=document.getElementById('lista-opcoes-impressao');
  wrap.innerHTML=OPCOES_IMPRESSAO.map(o=>
    `<button class="btn btn-outline" style="justify-content:flex-start" onclick="imprimirEscolha('${o.page}')">${o.icon}&nbsp; ${o.label}</button>`
  ).join('');
  openModal('modal-imprimir');
}
function imprimirEscolha(page){
  closeModal('modal-imprimir');
  goto(page);
  setTimeout(imprimirPagina,150);
}

// ============ MODALS ============
function openModal(id){
  if(id==='modal-producao')populateProducaoModal();
  if(id==='modal-ficha')populateFichaModal();
  if(id==='modal-semiacabado'){populateSemiacabadoModal();}
  if(id==='modal-materia'){clearMateria();}
  if(id==='modal-fornecedor'){clearFornecedorForm();}
  if(id==='modal-cliente'){clearClienteForm();}
  if(id==='modal-lancamento'){
    document.getElementById('lanc-data').value=today();
    document.getElementById('lanc-edit-id').value='';
    document.getElementById('modal-lanc-title').textContent='Novo Lançamento';
  }
  if(id==='modal-custos-fixos')openModalCustosFixos();
  if(id==='modal-canais')openModalCanais();
  if(id!=='modal-custos-fixos'&&id!=='modal-canais')
    document.getElementById(id).classList.add('open');
}
function closeModal(id){
  document.getElementById(id).classList.remove('open');
  if(id==='modal-cliente'){clearClienteForm();}
  if(id==='modal-venda'){clearVendaForm();}
}
document.querySelectorAll('.modal-overlay').forEach(m=>{
  m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')});
});

// ── Confirmação genérica (substitui confirm() nativo, mais confiável no mobile) ──
function confirmarAcao(texto,callback){
  document.getElementById('modal-confirmar-texto').textContent=texto;
  const btnOk=document.getElementById('modal-confirmar-btn-ok');
  const novoBtn=btnOk.cloneNode(true); // remove listeners antigos
  btnOk.parentNode.replaceChild(novoBtn,btnOk);
  novoBtn.addEventListener('click',()=>{
    closeModal('modal-confirmar');
    callback();
  });
  document.getElementById('modal-confirmar').classList.add('open');
}

// ============ RENDER DISPATCHER ============
function render(page){
  if(typeof atualizarAlertBells==='function') atualizarAlertBells();
  if(page==='dashboard'){renderDashboard();renderChartDash();renderChart30Dias();}
  if(page==='clientes')renderClientes();
  if(page==='vendas')renderVendas();
  if(page==='receber')renderReceber();
  if(page==='producao')renderProducao();
  if(page==='estoque'){
    renderAlertaEstoquePage();
    if(state.estoque_tab==='fornecedores'){renderFornecedores();renderHistoricoCompras();renderHistoricoPreco();}
    else renderEstoque();
  }
  if(page==='planejamento')renderPlanejamento();
  if(page==='precificacao'){renderPrecVisaoGeral();renderSimulador();}
  if(page==='financeiro'){
    const hj=today().slice(0,7);
    const dm=document.getElementById('desp-mes');if(dm&&!dm.value)dm.value=hj;
    const fm=document.getElementById('fech-mes');if(fm&&!fm.value)fm.value=hj;
    renderFinanceiro();setTimeout(renderChartFinanceiro,50);
    renderFechamentoHistorico();
  }
  if(page==='relatorio')initRelatorio();
}

